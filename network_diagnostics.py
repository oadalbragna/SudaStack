#!/usr/bin/env python3
"""
network_diagnostics.py
======================
Comprehensive Network & Connectivity Diagnostics Utility.

Performs multi-layered diagnostics using `socket`, `ssl`, `urllib`, and `requests` (if installed)
to pinpoint why an environment receives '403 Forbidden' errors, detect outgoing firewall blocks,
verify proxy environment variables, and inspect SSL/TLS handshakes and certificates.

Usage:
    python3 network_diagnostics.py
    python3 network_diagnostics.py --url https://api.telegram.org
    python3 network_diagnostics.py --url https://sudafile.iqra4you.com --timeout 10
    python3 network_diagnostics.py --json
"""

import sys
import os
import socket
import ssl
import json
import time
import errno
import argparse
from urllib.parse import urlparse
import urllib.request
import urllib.error
import urllib.response
import http.client

# Graceful requests fallback
try:
    import requests
    REQUESTS_AVAILABLE = True
except ImportError:
    requests = None
    REQUESTS_AVAILABLE = False


# ANSI styling helpers
class TerminalStyler:
    RESET = "\033[0m"
    BOLD = "\033[1m"
    DIM = "\033[2m"
    RED = "\033[91m"
    GREEN = "\033[92m"
    YELLOW = "\033[93m"
    BLUE = "\033[94m"
    MAGENTA = "\033[95m"
    CYAN = "\033[96m"
    WHITE = "\033[97m"
    BG_RED = "\033[41m"
    BG_GREEN = "\033[42m"
    BG_YELLOW = "\033[43m"

    @classmethod
    def enabled(cls):
        return sys.stdout.isatty() or os.environ.get("FORCE_COLOR") == "1"

    @classmethod
    def colorize(cls, text: str, color: str) -> str:
        if cls.enabled():
            return f"{color}{text}{cls.RESET}"
        return text

    @classmethod
    def ok(cls, msg: str) -> str:
        return cls.colorize(f"[PASS] {msg}", cls.GREEN)

    @classmethod
    def warn(cls, msg: str) -> str:
        return cls.colorize(f"[WARN] {msg}", cls.YELLOW)

    @classmethod
    def fail(cls, msg: str) -> str:
        return cls.colorize(f"[FAIL] {msg}", cls.RED)

    @classmethod
    def info(cls, msg: str) -> str:
        return cls.colorize(f"[INFO] {msg}", cls.CYAN)

    @classmethod
    def header(cls, msg: str) -> str:
        divider = "=" * 68
        return f"\n{cls.colorize(divider, cls.BLUE)}\n{cls.colorize(f'  {msg.upper()}', cls.BOLD + cls.CYAN)}\n{cls.colorize(divider, cls.BLUE)}"


class NetworkDiagnostics:
    BROWSER_USER_AGENT = (
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 "
        "(KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36"
    )
    DEFAULT_TEST_TARGETS = [
        "https://www.google.com",
        "https://cloudflare.com",
        "https://api.github.com",
        "https://httpbin.org/get",
    ]
    EGRESS_PORTS_TO_CHECK = [
        ("DNS (UDP/TCP)", "1.1.1.1", 53),
        ("HTTP", "1.1.1.1", 80),
        ("HTTPS", "1.1.1.1", 443),
        ("Alt-HTTP", "portquiz.net", 8080),
        ("Alt-HTTPS", "portquiz.net", 8443),
    ]

    def __init__(self, target_url: str = None, timeout: float = 8.0, verbose: bool = False):
        self.target_url = target_url or "https://api.telegram.org"
        self.timeout = timeout
        self.verbose = verbose
        self.results = {
            "timestamp": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
            "python_version": sys.version.split()[0],
            "platform": sys.platform,
            "requests_installed": REQUESTS_AVAILABLE,
            "target_url": self.target_url,
            "proxy_environment": {},
            "public_ip_info": {},
            "egress_firewall": {},
            "dns_checks": {},
            "tls_checks": {},
            "http_diagnostics": {},
            "root_cause_analysis": [],
            "actionable_recommendations": [],
        }

    # -------------------------------------------------------------------------
    # 1. Environment & Proxy Detection
    # -------------------------------------------------------------------------
    def check_proxy_environment(self) -> dict:
        print(TerminalStyler.header("1. Proxy & Environment Configuration"))
        env_vars = [
            "HTTP_PROXY", "http_proxy",
            "HTTPS_PROXY", "https_proxy",
            "ALL_PROXY", "all_proxy",
            "NO_PROXY", "no_proxy",
        ]
        found_proxies = {}
        for var in env_vars:
            val = os.environ.get(var)
            if val:
                # Mask credentials if present
                parsed = urlparse(val)
                if parsed.password:
                    masked = val.replace(f":{parsed.password}@", ":******@")
                else:
                    masked = val
                found_proxies[var] = masked
                print(f"  • {var}: {TerminalStyler.colorize(masked, TerminalStyler.YELLOW)}")

        urllib_proxies = urllib.request.getproxies()
        self.results["proxy_environment"] = {
            "env_vars": found_proxies,
            "urllib_detected": urllib_proxies,
        }

        if not found_proxies and not urllib_proxies:
            print(f"  {TerminalStyler.ok('No system or environment proxies configured (Direct Connection)')}")
        else:
            print(f"  {TerminalStyler.warn('Active proxies detected — outgoing requests may be routed via intermediate gateway')}")

        # Try to resolve default route / local outbound IP
        try:
            with socket.socket(socket.AF_INET, socket.SOCK_DGRAM) as s:
                s.settimeout(2.0)
                # Doesn't send packets, just asks OS for outbound routing table interface
                s.connect(("8.8.8.8", 80))
                local_ip = s.getsockname()[0]
                self.results["proxy_environment"]["local_outbound_ip"] = local_ip
                print(f"  • Local Outbound IP: {TerminalStyler.colorize(local_ip, TerminalStyler.CYAN)}")
        except Exception as e:
            self.results["proxy_environment"]["local_outbound_ip_error"] = str(e)

        return self.results["proxy_environment"]

    # -------------------------------------------------------------------------
    # 2. Outgoing Firewall & Port Egress Audit (Socket Level)
    # -------------------------------------------------------------------------
    def check_egress_firewall(self) -> dict:
        print(TerminalStyler.header("2. Outbound Firewall & Port Reachability (TCP)"))
        parsed_target = urlparse(self.target_url)
        target_host = parsed_target.hostname or "google.com"
        target_port = parsed_target.port or (443 if parsed_target.scheme == "https" else 80)

        # Include custom target port
        ports_to_test = list(self.EGRESS_PORTS_TO_CHECK)
        ports_to_test.append((f"Target ({target_host})", target_host, target_port))

        egress_results = {}
        for label, host, port in ports_to_test:
            res = self._test_tcp_connection(host, port)
            egress_results[f"{label} ({host}:{port})"] = res
            status_text = f"{label:20} -> {host}:{port:<5} | "
            if res["connected"]:
                latency_str = f"{res['latency_ms']}ms"
                print(f"  {TerminalStyler.ok(status_text + latency_str)}")
            else:
                err_summary = f"{res.get('error_type')}: {res.get('error')}"
                print(f"  {TerminalStyler.fail(status_text + err_summary)}")

        self.results["egress_firewall"] = egress_results
        return egress_results

    def _test_tcp_connection(self, host: str, port: int) -> dict:
        start_time = time.time()
        result = {"connected": False, "latency_ms": None, "error": None, "error_type": None}
        sock = None
        try:
            sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
            sock.settimeout(self.timeout)
            sock.connect((host, port))
            latency = round((time.time() - start_time) * 1000, 2)
            result["connected"] = True
            result["latency_ms"] = latency
        except socket.timeout:
            result["error_type"] = "TIMEOUT (Likely Firewall DROP)"
            result["error"] = f"Connection timed out after {self.timeout}s"
        except socket.error as err:
            err_code = err.errno if hasattr(err, 'errno') else None
            if err_code == errno.ECONNREFUSED:
                result["error_type"] = "CONNECTION_REFUSED"
                result["error"] = "Target host actively rejected connection (Port closed or firewall REJECT)"
            elif err_code in (errno.ENETUNREACH, errno.EHOSTUNREACH):
                result["error_type"] = "NETWORK_UNREACHABLE"
                result["error"] = "No route to host / network interface down"
            elif err_code in (errno.EACCES, errno.EPERM):
                result["error_type"] = "PERMISSION_DENIED"
                result["error"] = "Local system firewall/iptables or security policy blocked outbound socket"
            else:
                result["error_type"] = f"SOCKET_ERROR_{err_code or 'UNKNOWN'}"
                result["error"] = str(err)
        except Exception as e:
            result["error_type"] = "GENERAL_ERROR"
            result["error"] = str(e)
        finally:
            if sock:
                sock.close()
        return result

    # -------------------------------------------------------------------------
    # 3. DNS Resolution Audit (`socket.getaddrinfo`)
    # -------------------------------------------------------------------------
    def check_dns_resolution(self) -> dict:
        print(TerminalStyler.header("3. DNS Resolution Audit"))
        parsed_target = urlparse(self.target_url)
        target_host = parsed_target.hostname or "api.telegram.org"

        hosts_to_test = [
            "google.com",
            "cloudflare.com",
            "api.github.com",
            target_host,
        ]
        # Remove duplicates preserving order
        hosts_to_test = list(dict.fromkeys(hosts_to_test))

        dns_results = {}
        for host in hosts_to_test:
            start_time = time.time()
            try:
                addr_info = socket.getaddrinfo(host, None, socket.AF_UNSPEC, socket.SOCK_STREAM)
                ips = sorted(list(set(item[4][0] for item in addr_info)))
                elapsed_ms = round((time.time() - start_time) * 1000, 2)
                dns_results[host] = {
                    "resolved": True,
                    "ips": ips,
                    "latency_ms": elapsed_ms,
                }
                print(f"  {TerminalStyler.ok(f'{host:<24} -> {ips[:2]} ({elapsed_ms}ms)')}")
            except socket.gaierror as e:
                dns_results[host] = {
                    "resolved": False,
                    "error": str(e),
                }
                print(f"  {TerminalStyler.fail(f'{host:<24} -> DNS Resolution Failed: {e}')}")

        self.results["dns_checks"] = dns_results
        return dns_results

    # -------------------------------------------------------------------------
    # 4. SSL / TLS Handshake & Certificate Verification (`ssl` + `socket`)
    # -------------------------------------------------------------------------
    def check_tls_handshake(self) -> dict:
        print(TerminalStyler.header("4. SSL/TLS Handshake & Certificate Inspection"))
        parsed = urlparse(self.target_url)
        host = parsed.hostname or "api.telegram.org"
        port = parsed.port or (443 if parsed.scheme == "https" else 80)

        if parsed.scheme != "https" and port != 443:
            print(f"  {TerminalStyler.info(f'Skipping TLS check for non-HTTPS target {self.target_url}')}")
            return {}

        tls_data = {"verified": False, "details": {}, "errors": []}
        start_time = time.time()

        # Step A: Strict verified handshake
        context = ssl.create_default_context()
        try:
            with socket.create_connection((host, port), timeout=self.timeout) as sock:
                with context.wrap_socket(sock, server_hostname=host) as ssock:
                    elapsed_ms = round((time.time() - start_time) * 1000, 2)
                    tls_version = ssock.version()
                    cipher = ssock.cipher()
                    cert = ssock.getpeercert()

                    subject = dict(x[0] for x in cert.get("subject", []))
                    issuer = dict(x[0] for x in cert.get("issuer", []))
                    sans = [x[1] for x in cert.get("subjectAltName", []) if x[0] == "DNS"]

                    tls_data["verified"] = True
                    tls_data["details"] = {
                        "tls_version": tls_version,
                        "cipher": cipher,
                        "subject": subject,
                        "issuer": issuer,
                        "valid_to": cert.get("notAfter"),
                        "sans_count": len(sans),
                        "handshake_latency_ms": elapsed_ms,
                    }

                    print(f"  {TerminalStyler.ok(f'TLS Handshake Succeeded ({elapsed_ms}ms)')}")
                    print(f"  • Protocol: {TerminalStyler.colorize(tls_version, TerminalStyler.CYAN)}")
                    print(f"  • Cipher:   {TerminalStyler.colorize(cipher[0] if cipher else 'Unknown', TerminalStyler.CYAN)}")
                    print(f"  • Issuer:   {TerminalStyler.colorize(issuer.get('organizationName', issuer.get('commonName', 'Unknown')), TerminalStyler.CYAN)}")
                    print(f"  • Subject:  {TerminalStyler.colorize(subject.get('commonName', 'Unknown'), TerminalStyler.CYAN)}")
                    print(f"  • Expiry:   {TerminalStyler.colorize(cert.get('notAfter', 'Unknown'), TerminalStyler.CYAN)}")

                    # Check for suspicious corporate interception root CA
                    issuer_str = " ".join(str(v) for v in issuer.values()).lower()
                    mitm_keywords = ["zscaler", "fortinet", "palo alto", "bluecoat", "sophos", "cisco umbrella", "barracuda"]
                    for kw in mitm_keywords:
                        if kw in issuer_str:
                            warn_msg = f"Corporate MITM SSL Interception Detected ({kw.title()}) in certificate chain!"
                            print(f"  {TerminalStyler.warn(warn_msg)}")
                            tls_data["mitm_detected"] = kw
                            self.results["root_cause_analysis"].append({
                                "issue": "SSL_MITM_INTERCEPTION",
                                "detail": f"Intermediate proxy certificate identified from {kw.title()}. Many APIs block intercepted TLS fingerprints.",
                            })

        except ssl.SSLCertVerificationError as e:
            tls_data["errors"].append(f"SSLCertVerificationError: {e}")
            print(f"  {TerminalStyler.fail(f'SSL Certificate Verification FAILED: {e}')}")
            self.results["root_cause_analysis"].append({
                "issue": "CERTIFICATE_VERIFICATION_FAILED",
                "detail": f"SSL verification error: {e}. Can be caused by self-signed proxy CA, expired cert, or missing CA root bundle.",
            })

            # Step B: Test with unverified context to distinguish connection drop from cert rejection
            try:
                unverified_context = ssl._create_unverified_context()
                with socket.create_connection((host, port), timeout=self.timeout) as sock:
                    with unverified_context.wrap_socket(sock, server_hostname=host) as ssock:
                        print(f"  {TerminalStyler.warn('Handshake succeeded WITHOUT verification: The network is functional, but the certificate authority is untrusted.')}")
                        tls_data["unverified_handshake_succeeded"] = True
            except Exception as unv_e:
                print(f"  {TerminalStyler.fail(f'Handshake failed even without certificate validation: {unv_e}')}")
                tls_data["unverified_handshake_error"] = str(unv_e)

        except Exception as e:
            tls_data["errors"].append(str(e))
            print(f"  {TerminalStyler.fail(f'TLS Connection Error: {e}')}")

        self.results["tls_checks"] = tls_data
        return tls_data

    # -------------------------------------------------------------------------
    # 5. Public IP & ASN Detection (Detect Cloud / Data Center Blacklisting)
    # -------------------------------------------------------------------------
    def check_public_ip(self) -> dict:
        print(TerminalStyler.header("5. Public IP & Cloud Host Detection"))
        ip_endpoints = [
            ("https://api.ipify.org?format=json", "json", "ip"),
            ("https://icanhazip.com", "text", None),
            ("https://httpbin.org/ip", "json", "origin"),
        ]

        public_ip = None
        for endpoint, kind, key in ip_endpoints:
            try:
                req = urllib.request.Request(endpoint, headers={"User-Agent": self.BROWSER_USER_AGENT})
                with urllib.request.urlopen(req, timeout=5.0) as resp:
                    raw = resp.read().decode("utf-8", errors="ignore").strip()
                    if kind == "json":
                        data = json.loads(raw)
                        public_ip = data.get(key)
                    else:
                        public_ip = raw
                    if public_ip:
                        break
            except Exception:
                continue

        if public_ip:
            self.results["public_ip_info"]["ip"] = public_ip
            print(f"  • Egress Public IP: {TerminalStyler.colorize(public_ip, TerminalStyler.BOLD + TerminalStyler.CYAN)}")
            # Try to query IP geolocation/organization via ip-api or ipapi (non-critical)
            try:
                geo_req = urllib.request.Request(
                    f"http://ip-api.com/json/{public_ip}?fields=status,country,regionName,city,isp,org,as,hosting",
                    headers={"User-Agent": self.BROWSER_USER_AGENT}
                )
                with urllib.request.urlopen(geo_req, timeout=4.0) as resp:
                    geo_data = json.loads(resp.read().decode())
                    if geo_data.get("status") == "success":
                        self.results["public_ip_info"]["geo"] = geo_data
                        print(f"  • ISP / Org:     {TerminalStyler.colorize(geo_data.get('isp', 'Unknown'), TerminalStyler.CYAN)}")
                        print(f"  • ASN:           {TerminalStyler.colorize(geo_data.get('as', 'Unknown'), TerminalStyler.CYAN)}")
                        city = geo_data.get('city', '')
                        country = geo_data.get('country', '')
                        loc_str = f"{city}, {country}".strip(", ")
                        print(f"  • Location:      {TerminalStyler.colorize(loc_str, TerminalStyler.CYAN)}")
                        is_hosting = geo_data.get("hosting", False)
                        if is_hosting:
                            print(f"  • Datacenter/Cloud IP: {TerminalStyler.warn('YES (Hosting/Datacenter IP)')}")
                            print(f"    {TerminalStyler.colorize('Note: Cloud platforms (GCP, AWS, Azure, DigitalOcean) frequently trigger 403 Forbidden on WAFs (Cloudflare/Akamai).', TerminalStyler.YELLOW)}")
                        else:
                            print(f"  • Datacenter/Cloud IP: {TerminalStyler.ok('No (Residential/Commercial IP)')}")
            except Exception:
                pass
        else:
            print(f"  {TerminalStyler.warn('Unable to query public IP service (outgoing requests may be blocked or filtered)')}")

        return self.results["public_ip_info"]

    # -------------------------------------------------------------------------
    # 6. Deep HTTP Diagnostics & '403 Forbidden' Root Cause Analysis
    # -------------------------------------------------------------------------
    def check_http_layer(self) -> dict:
        print(TerminalStyler.header("6. HTTP Request Diagnostics & 403 Root Cause Analysis"))
        target = self.target_url
        print(f"Testing Target: {TerminalStyler.colorize(target, TerminalStyler.BOLD + TerminalStyler.CYAN)}\n")

        test_scenarios = [
            ("urllib_default_ua", "Python-urllib default User-Agent", None),
            ("urllib_browser_ua", "Modern Chrome Browser User-Agent", self.BROWSER_USER_AGENT),
            ("urllib_custom_bot_ua", "Explicit Bot Header User-Agent", "Mozilla/5.0 (compatible; NetworkDiag/1.0; +https://github.com)"),
        ]

        if REQUESTS_AVAILABLE:
            test_scenarios.append(("requests_default_ua", "requests default User-Agent", None))
            test_scenarios.append(("requests_browser_ua", "requests Chrome User-Agent", self.BROWSER_USER_AGENT))

        http_results = {}
        for scenario_id, desc, ua in test_scenarios:
            if scenario_id.startswith("requests"):
                res = self._execute_requests_test(target, ua)
            else:
                res = self._execute_urllib_test(target, ua)

            http_results[scenario_id] = res
            status_code = res.get("status_code")
            reason = res.get("reason", "")
            duration = res.get("duration_ms", 0)

            label = f"[{desc}]"
            if status_code == 200 or (status_code and 200 <= status_code < 400):
                print(f"  {TerminalStyler.ok(f'{label:<40} -> Status {status_code} {reason} ({duration}ms)')}")
            elif status_code == 403:
                print(f"  {TerminalStyler.fail(f'{label:<40} -> Status 403 FORBIDDEN ({duration}ms)')}")
                self._analyze_403_response(res, desc, ua)
            elif status_code:
                print(f"  {TerminalStyler.warn(f'{label:<40} -> Status {status_code} {reason} ({duration}ms)')}")
            else:
                err_text = str(res.get("error"))
                print(f"  {TerminalStyler.fail(f'{label:<40} -> Error: {err_text}')}")

        self.results["http_diagnostics"] = http_results

        # Compare default vs browser UA
        def_res = http_results.get("urllib_default_ua", {})
        brow_res = http_results.get("urllib_browser_ua", {})
        if def_res.get("status_code") == 403 and brow_res.get("status_code") == 200:
            print(f"\n  {TerminalStyler.colorize('CRITICAL FINDING: User-Agent Specific 403 Block!', TerminalStyler.BG_RED + TerminalStyler.WHITE)}")
            print(f"  {TerminalStyler.colorize('The server specifically blocks Python default User-Agents, but accepts Browser User-Agents.', TerminalStyler.GREEN)}")
            self.results["root_cause_analysis"].append({
                "issue": "USER_AGENT_BLOCK",
                "detail": "Target returns 403 on standard Python-urllib/requests headers, but permits Chrome/Firefox User-Agents.",
            })

        return http_results

    def _execute_urllib_test(self, url: str, user_agent: str = None) -> dict:
        headers = {}
        if user_agent:
            headers["User-Agent"] = user_agent
        headers["Accept"] = "*/*"

        req = urllib.request.Request(url, headers=headers)
        start_time = time.time()
        res = {
            "client": "urllib",
            "url": url,
            "user_agent": user_agent or "Python-urllib default",
            "status_code": None,
            "headers": {},
            "body_excerpt": "",
            "duration_ms": 0,
            "error": None,
        }

        try:
            with urllib.request.urlopen(req, timeout=self.timeout) as response:
                res["duration_ms"] = round((time.time() - start_time) * 1000, 2)
                res["status_code"] = response.getcode()
                res["reason"] = response.msg if hasattr(response, "msg") else "OK"
                res["headers"] = dict(response.headers)
                body = response.read(2048).decode("utf-8", errors="ignore")
                res["body_excerpt"] = body
        except urllib.error.HTTPError as http_err:
            res["duration_ms"] = round((time.time() - start_time) * 1000, 2)
            res["status_code"] = http_err.code
            res["reason"] = http_err.reason
            res["headers"] = dict(http_err.headers) if hasattr(http_err, "headers") else {}
            try:
                res["body_excerpt"] = http_err.read(2048).decode("utf-8", errors="ignore")
            except Exception:
                res["body_excerpt"] = ""
            res["error"] = str(http_err)
        except Exception as err:
            res["duration_ms"] = round((time.time() - start_time) * 1000, 2)
            res["error"] = str(err)

        return res

    def _execute_requests_test(self, url: str, user_agent: str = None) -> dict:
        if not REQUESTS_AVAILABLE:
            return {"error": "requests library not installed"}

        headers = {}
        if user_agent:
            headers["User-Agent"] = user_agent

        start_time = time.time()
        res = {
            "client": "requests",
            "url": url,
            "user_agent": user_agent or "python-requests default",
            "status_code": None,
            "headers": {},
            "body_excerpt": "",
            "duration_ms": 0,
            "error": None,
        }

        try:
            resp = requests.get(url, headers=headers, timeout=self.timeout, allow_redirects=True)
            res["duration_ms"] = round((time.time() - start_time) * 1000, 2)
            res["status_code"] = resp.status_code
            res["reason"] = resp.reason
            res["headers"] = dict(resp.headers)
            res["body_excerpt"] = resp.text[:2048]
        except requests.exceptions.RequestException as req_err:
            res["duration_ms"] = round((time.time() - start_time) * 1000, 2)
            if hasattr(req_err, "response") and req_err.response is not None:
                res["status_code"] = req_err.response.status_code
                res["reason"] = req_err.response.reason
                res["headers"] = dict(req_err.response.headers)
                res["body_excerpt"] = req_err.response.text[:2048]
            res["error"] = str(req_err)

        return res

    # -------------------------------------------------------------------------
    # 7. 403 Response Deep Heuristics
    # -------------------------------------------------------------------------
    def _analyze_403_response(self, response_data: dict, test_desc: str, ua: str):
        headers = {k.lower(): v for k, v in response_data.get("headers", {}).items()}
        body = response_data.get("body_excerpt", "")
        body_lower = body.lower()

        server = headers.get("server", "").lower()
        cf_ray = headers.get("cf-ray")
        amz_cf_id = headers.get("x-amz-cf-id")
        via = headers.get("via", "")
        content_type = headers.get("content-type", "")

        signatures_found = []

        # 1. Cloudflare WAF Block
        if cf_ray or "cloudflare" in server or "cloudflare" in body_lower or "cf-error-details" in body_lower:
            ray_info = f" (CF-Ray: {cf_ray})" if cf_ray else ""
            signatures_found.append(f"Cloudflare WAF / Bot Management Protection{ray_info}")
            self.results["root_cause_analysis"].append({
                "issue": "CLOUDFLARE_WAF_BLOCK",
                "detail": f"Cloudflare intercepted the request with 403 Forbidden{ray_info}. Common reasons: IP reputation/datacenter block, default Python UA, or missing Turnstile/JS challenge solve.",
            })

        # 2. Amazon CloudFront WAF Block
        if amz_cf_id or "cloudfront" in server or "cloudfront" in body_lower or "403 ERROR: The request could not be satisfied" in body:
            signatures_found.append("Amazon CloudFront Distribution / AWS WAF Block")
            self.results["root_cause_analysis"].append({
                "issue": "CLOUDFRONT_WAF_BLOCK",
                "detail": "Amazon CloudFront distribution or AWS WAF rule denied request. Often triggered by missing Host/Accept headers or data center IP range.",
            })

        # 3. Akamai Edge Block
        if "akamai" in server or "akamaighost" in server or "reference #" in body_lower:
            signatures_found.append("Akamai Ghost / Edge Firewall Block")
            self.results["root_cause_analysis"].append({
                "issue": "AKAMAI_WAF_BLOCK",
                "detail": "Akamai Edge server blocked the connection based on bot score or IP reputation.",
            })

        # 4. Corporate Forward Proxy / Gateway (e.g. Squid, BlueCoat, Zscaler)
        if via or "squid" in server or "access denied" in body_lower and ("proxy" in body_lower or "policy" in body_lower):
            signatures_found.append(f"Corporate Forward Proxy Filter ({via or server})")
            self.results["root_cause_analysis"].append({
                "issue": "CORPORATE_PROXY_FILTER",
                "detail": "An egress forward proxy actively denied the connection. Check company firewall / URL category rules.",
            })

        # 5. Missing / Blocked User-Agent
        if "user-agent" in body_lower or "bot" in body_lower or "crawler" in body_lower or "forbidden" in body_lower and not ua:
            signatures_found.append("User-Agent Header Blacklist / Filter")

        # 6. Telegram Bot API specific blocks
        if "api.telegram.org" in response_data.get("url", ""):
            if "bot" in response_data.get("url", "") and "unauthorized" not in body_lower:
                signatures_found.append("Telegram API Server Geoblock or Rate Limiting")

        print(f"     └─ 403 Fingerprint Analysis:")
        if signatures_found:
            for sig in signatures_found:
                print(f"        • Identified Signature: {TerminalStyler.colorize(sig, TerminalStyler.YELLOW)}")
        else:
            print(f"        • Server: {server or 'Not Specified'} | Content-Type: {content_type}")

        if body and self.verbose:
            snippet = body.strip().replace("\n", " ")[:200]
            print(f"        • Body Snippet: {TerminalStyler.colorize(snippet, TerminalStyler.DIM)}")

    # -------------------------------------------------------------------------
    # 8. Synthesis, Diagnosis Summary & Actionable Recommendations
    # -------------------------------------------------------------------------
    def generate_synthesis(self):
        print(TerminalStyler.header("7. Diagnostic Summary & Resolution Guide"))

        # Deduplicate issues
        seen = set()
        unique_issues = []
        for item in self.results["root_cause_analysis"]:
            key = item["issue"]
            if key not in seen:
                seen.add(key)
                unique_issues.append(item)

        recs = []
        if not unique_issues:
            # Check if any 403 was detected
            any_403 = any(
                res.get("status_code") == 403 for res in self.results.get("http_diagnostics", {}).values()
            )
            if any_403:
                print(f"  {TerminalStyler.warn('HTTP 403 was returned, but no specific CDN or WAF signature matched.')}")
                recs.append("Verify if the API endpoint requires an API Key, Bearer Token, or specific query parameters.")
                recs.append("Inspect if the server requires specific HTTP headers (e.g. Origin, Referer, Accept-Language).")
            else:
                print(f"  {TerminalStyler.ok('No 403 Forbidden errors observed during current test run.')}")
        else:
            print(f"  {TerminalStyler.colorize(f'Detected {len(unique_issues)} Critical Network/WAF Issues:', TerminalStyler.BOLD + TerminalStyler.RED)}")
            for idx, issue in enumerate(unique_issues, 1):
                print(f"    {idx}. {TerminalStyler.colorize(issue['issue'], TerminalStyler.BOLD)}: {issue['detail']}")

        # Formulate specific recommendations
        if any(i["issue"] == "USER_AGENT_BLOCK" for i in unique_issues):
            recs.append("Pass a realistic browser User-Agent in requests/urllib headers:")
            recs.append("  headers = {'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 ...'}")

        if any(i["issue"] in ("CLOUDFLARE_WAF_BLOCK", "AKAMAI_WAF_BLOCK", "CLOUDFRONT_WAF_BLOCK") for i in unique_issues):
            recs.append("Target is behind Cloudflare/WAF. Egress IP is likely identified as a Data Center / Cloud Run range.")
            recs.append("  - Use a proxy/VPN with residential IP or official API reverse-proxy endpoint.")
            recs.append("  - For Python telegram bots: configure a local MTProto proxy or Telegram bot webhook gateway.")

        if any(i["issue"] == "CERTIFICATE_VERIFICATION_FAILED" for i in unique_issues):
            recs.append("Install and update CA certificates: install `certifi` package or export `REQUESTS_CA_BUNDLE`.")

        if any(i["issue"] == "CORPORATE_PROXY_FILTER" for i in unique_issues):
            recs.append("Check corporate proxy environment variables (`HTTP_PROXY`, `HTTPS_PROXY`). Add target host to `NO_PROXY` if internal.")

        # Check egress firewall
        egress = self.results.get("egress_firewall", {})
        blocked_ports = [k for k, v in egress.items() if not v.get("connected")]
        if blocked_ports:
            print(f"\n  {TerminalStyler.colorize('Blocked Outbound TCP Ports:', TerminalStyler.YELLOW)}")
            for bp in blocked_ports:
                print(f"    • {bp}: {egress[bp].get('error_type')}")
            recs.append("Outbound traffic is restricted on one or more ports. Verify container/VPC security groups and egress firewall rules.")

        if recs:
            print(f"\n  {TerminalStyler.colorize('Recommended Actions:', TerminalStyler.BOLD + TerminalStyler.GREEN)}")
            for r in recs:
                print(f"    ➜ {r}")

        self.results["actionable_recommendations"] = recs

    def run_all(self) -> dict:
        self.check_proxy_environment()
        self.check_egress_firewall()
        self.check_dns_resolution()
        self.check_tls_handshake()
        self.check_public_ip()
        self.check_http_layer()
        self.generate_synthesis()
        return self.results


def main():
    parser = argparse.ArgumentParser(
        description="Robust Network Diagnostics & 403 Forbidden Root-Cause Detector"
    )
    parser.add_argument(
        "--url", "-u",
        default="https://api.telegram.org",
        help="Target URL to diagnose (default: https://api.telegram.org)"
    )
    parser.add_argument(
        "--timeout", "-t",
        type=float,
        default=8.0,
        help="Socket and HTTP timeout in seconds (default: 8.0)"
    )
    parser.add_argument(
        "--verbose", "-v",
        action="store_true",
        help="Print verbose response headers and body excerpts"
    )
    parser.add_argument(
        "--json",
        action="store_true",
        help="Output raw diagnostic data in JSON format"
    )

    args = parser.parse_args()

    # If --json is requested, silence standard prints and only dump JSON at the end
    if args.json:
        # Redirect stdout temporarily
        import io
        real_stdout = sys.stdout
        sys.stdout = io.StringIO()

    diagnostics = NetworkDiagnostics(
        target_url=args.url,
        timeout=args.timeout,
        verbose=args.verbose,
    )
    results = diagnostics.run_all()

    if args.json:
        sys.stdout = real_stdout
        print(json.dumps(results, indent=2))


if __name__ == "__main__":
    main()
