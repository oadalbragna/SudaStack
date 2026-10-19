# SudaStack Cloudflare Workers Proxy Shim (Cloudflare Proxy & Runtime Network Layer)
import builtins as _bi
import sys as _sys
import os as _os
import json as _json

_CLOUDFLARE_PROXY_HOST = "sudastack-proxy.iqra4you.com"
_TELEGRAM_API_HOST = "api.telegram.org"

print("🌐 [SudaStack Cloudflare Proxy]: تم تفعيل البروكسي الداخلي السحابي عبر Cloudflare (sudastack-proxy.iqra4you.com) لجميع اتصالات البوت وطلبات API...")

def _route_telegram_url(url: str):
    """Rewrite api.telegram.org to sudastack-proxy.iqra4you.com with fallback tracking."""
    if isinstance(url, str) and _TELEGRAM_API_HOST in url:
        proxied_url = url.replace(_TELEGRAM_API_HOST, _CLOUDFLARE_PROXY_HOST)
        return proxied_url, True
    return url, False

# ----------------- 1. Patch requests (Session, get, post, request) -----------------
try:
    import requests as _req
    _orig_session_request = _req.Session.request

    def _patched_session_request(self, method, url, *args, **kwargs):
        proxied_url, is_telegram = _route_telegram_url(str(url))
        if is_telegram:
            headers = kwargs.get('headers') or {}
            if not isinstance(headers, dict):
                try:
                    headers = dict(headers)
                except Exception:
                    headers = {}
            orig_headers = dict(headers)
            headers['CF-Proxy-Route'] = 'true'
            headers['X-SudaStack-Target'] = _TELEGRAM_API_HOST
            kwargs['headers'] = headers
            print(f"⚡ [Cloudflare Proxy Requests]: توجيه الطلب سحابياً عبر {_CLOUDFLARE_PROXY_HOST} -> {url}")
            try:
                res = _orig_session_request(self, method, proxied_url, *args, **kwargs)
                if res.status_code < 500:
                    print(f"✅ [Cloudflare Proxy Requests]: استجابة ناجحة ({res.status_code}) عبر {_CLOUDFLARE_PROXY_HOST}")
                    return res
                print(f"⚠️ [Cloudflare Proxy Requests]: استجابة غير متوقعة ({res.status_code})، جاري التبديل للاتصال المباشر (Fallback)...")
            except Exception as proxy_err:
                print(f"⚠️ [Cloudflare Proxy Fallback]: تعذر الاتصال بالبروكسي ({proxy_err})، الانتقال التلقائي للاتصال المباشر...")
            
            # Direct Connection Fallback
            kwargs['headers'] = orig_headers
            return _orig_session_request(self, method, url, *args, **kwargs)

        return _orig_session_request(self, method, url, *args, **kwargs)

    _req.Session.request = _patched_session_request
    _req.request = _req.sessions.Session().request
    _req.get = lambda url, **kwargs: _req.Session().get(url, **kwargs)
    _req.post = lambda url, data=None, json=None, **kwargs: _req.Session().post(url, data=data, json=json, **kwargs)
except Exception:
    pass

# ----------------- 2. Patch httpx (Client, AsyncClient) -----------------
try:
    import httpx as _httpx
    if hasattr(_httpx, 'Client'):
        _orig_httpx_client_request = _httpx.Client.request

        def _patched_httpx_client_request(self, method, url, *args, **kwargs):
            url_str = str(url)
            proxied_url, is_telegram = _route_telegram_url(url_str)
            if is_telegram:
                headers = kwargs.get('headers') or {}
                if not isinstance(headers, dict):
                    try:
                        headers = dict(headers)
                    except Exception:
                        headers = {}
                orig_headers = dict(headers)
                headers['CF-Proxy-Route'] = 'true'
                headers['X-SudaStack-Target'] = _TELEGRAM_API_HOST
                kwargs['headers'] = headers
                print(f"⚡ [Cloudflare Proxy HTTPX]: توجيه سحابي عبر {_CLOUDFLARE_PROXY_HOST} -> {url_str}")
                try:
                    res = _orig_httpx_client_request(self, method, proxied_url, *args, **kwargs)
                    if res.status_code < 500:
                        print(f"✅ [Cloudflare Proxy HTTPX]: استجابة ناجحة ({res.status_code})")
                        return res
                    print(f"⚠️ [Cloudflare Proxy HTTPX]: رمز استجابة {res.status_code}، جاري التبديل للاتصال المباشر...")
                except Exception as proxy_err:
                    print(f"⚠️ [Cloudflare Proxy HTTPX Fallback]: {proxy_err} -> الانتقال للاتصال المباشر...")
                
                kwargs['headers'] = orig_headers
                return _orig_httpx_client_request(self, method, url, *args, **kwargs)

            return _orig_httpx_client_request(self, method, url, *args, **kwargs)

        _httpx.Client.request = _patched_httpx_client_request

    if hasattr(_httpx, 'AsyncClient'):
        _orig_httpx_async_request = _httpx.AsyncClient.request

        async def _patched_httpx_async_request(self, method, url, *args, **kwargs):
            url_str = str(url)
            proxied_url, is_telegram = _route_telegram_url(url_str)
            if is_telegram:
                headers = kwargs.get('headers') or {}
                try:
                    headers = dict(headers)
                except Exception:
                    headers = {}
                orig_headers = dict(headers)
                headers['CF-Proxy-Route'] = 'true'
                headers['X-SudaStack-Target'] = _TELEGRAM_API_HOST
                kwargs['headers'] = headers
                print(f"⚡ [Cloudflare Proxy Async HTTPX]: توجيه سحابي عبر {_CLOUDFLARE_PROXY_HOST} -> {url_str}")
                try:
                    res = await _orig_httpx_async_request(self, method, proxied_url, *args, **kwargs)
                    if res.status_code < 500:
                        return res
                except Exception as proxy_err:
                    print(f"⚠️ [Cloudflare Proxy Async HTTPX Fallback]: {proxy_err} -> الانتقال للاتصال المباشر...")

                kwargs['headers'] = orig_headers
                return await _orig_httpx_async_request(self, method, url, *args, **kwargs)

            return await _orig_httpx_async_request(self, method, url, *args, **kwargs)

        _httpx.AsyncClient.request = _patched_httpx_async_request
except Exception:
    pass

# ----------------- 3. Patch urllib.request (urlopen) -----------------
try:
    import urllib.request as _urllib_req
    _orig_urlopen = _urllib_req.urlopen

    def _patched_urlopen(url, data=None, timeout=30, *args, **kwargs):
        url_str = getattr(url, 'full_url', str(url))
        proxied_url, is_telegram = _route_telegram_url(url_str)

        if is_telegram:
            print(f"⚡ [Cloudflare Proxy URLLIB]: توجيه سحابي عبر {_CLOUDFLARE_PROXY_HOST} -> {url_str}")
            cf_headers = {
                'CF-Proxy-Route': 'true',
                'X-SudaStack-Target': _TELEGRAM_API_HOST,
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36'
            }
            try:
                cf_req = _urllib_req.Request(proxied_url, data=data, headers=cf_headers)
                res = _orig_urlopen(cf_req, timeout=timeout, *args, **kwargs)
                print(f"✅ [Cloudflare Proxy URLLIB]: استجابة ناجحة من {_CLOUDFLARE_PROXY_HOST}")
                return res
            except _urllib_req.HTTPError as http_err:
                if http_err.code < 500:
                    return http_err
                print(f"⚠️ [Cloudflare Proxy URLLIB]: حالة HTTP {http_err.code}، جاري الاتصال المباشر...")
            except Exception as proxy_err:
                print(f"⚠️ [Cloudflare Proxy URLLIB Fallback]: {proxy_err} -> الاتصال المباشر...")

        # Direct connection fallback / non-telegram requests
        if isinstance(url, str):
            req = _urllib_req.Request(url, data=data, headers={
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
                'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8'
            })
            return _orig_urlopen(req, timeout=timeout, *args, **kwargs)
        return _orig_urlopen(url, data=data, timeout=timeout, *args, **kwargs)

    _urllib_req.urlopen = _patched_urlopen
except Exception:
    pass

# ----------------- 4. Telegram Conflict Resolution & Bot Fixes -----------------
try:
    import telegram.ext as _tg_ext
    if hasattr(_tg_ext, 'Application'):
        _orig_run_polling = _tg_ext.Application.run_polling
        def _patched_run_polling(self, *args, **kwargs):
            kwargs.setdefault('drop_pending_updates', True)
            print("🤖 [SudaStack Telegram Bot]: تشغيل Polling مع الحماية السحابية وتجاوز التعارضات...")
            try:
                import requests as _r
                token = getattr(self.bot, 'token', None)
                if token:
                    _r.get(f"https://{_CLOUDFLARE_PROXY_HOST}/bot{token}/deleteWebhook?drop_pending_updates=True", timeout=4)
            except Exception:
                pass

            try:
                return _orig_run_polling(self, *args, **kwargs)
            except Exception as e:
                if 'Conflict' in str(e) or 'terminated by other getUpdates' in str(e):
                    print("⚠️ [SudaStack Telegram]: تعارض getUpdates مكتشف. جاري الحذف وإعادة المحاولة...")
                    try:
                        import asyncio
                        async def _fix():
                            await self.bot.delete_webhook(drop_pending_updates=True)
                        asyncio.run(_fix())
                        return _orig_run_polling(self, *args, **kwargs)
                    except Exception as e2:
                        print(f"❌ [Telegram Fix Error]: {e2}")
                        raise e
                raise e
        _tg_ext.Application.run_polling = _patched_run_polling

    if hasattr(_tg_ext, 'Updater'):
        _orig_start_polling = _tg_ext.Updater.start_polling
        def _patched_start_polling(self, *args, **kwargs):
            kwargs.setdefault('drop_pending_updates', True)
            print("🤖 [SudaStack Telegram Updater]: تشغيل Updater مع الحماية السحابية وتجاوز التعارضات...")
            try:
                return _orig_start_polling(self, *args, **kwargs)
            except Exception as e:
                if 'Conflict' in str(e) or 'terminated by other getUpdates' in str(e):
                    print("⚠️ [SudaStack Telegram]: تعارض مكتشف في Updater. جاري التخطي...")
                    try:
                        import asyncio
                        async def _fix():
                            await self.bot.delete_webhook(drop_pending_updates=True)
                        asyncio.run(_fix())
                        return _orig_start_polling(self, *args, **kwargs)
                    except Exception as e2:
                        print(f"❌ [Telegram Fix Error]: {e2}")
                        raise e
                raise e
        _tg_ext.Updater.start_polling = _patched_start_polling
except Exception:
    pass

# ----------------- 5. Telebot URL Redirection -----------------
try:
    import telebot as _tb
    if hasattr(_tb, 'apihelper'):
        _tb.apihelper.API_URL = f"https://{_CLOUDFLARE_PROXY_HOST}/bot{{0}}/{{1}}"
        _tb.apihelper.FILE_URL = f"https://{_CLOUDFLARE_PROXY_HOST}/file/bot{{0}}/{{1}}"
except Exception:
    pass

# ----------------- 6. Robust Interactive Input -----------------
try:
    def _robust_input(prompt=""):
        try:
            if prompt:
                print(prompt, end="", flush=True)
            if _sys.stdin and not _sys.stdin.closed:
                _line = _sys.stdin.readline()
                if _line:
                    return _line.strip()
            return ""
        except Exception:
            return ""
    _bi.input = _robust_input
except Exception:
    pass
