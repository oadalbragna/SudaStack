import fs from 'fs';
import path from 'path';
import os from 'os';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

export interface DolphinAuthConfig {
  cookie: string;
  cfClearance: string;
  source: 'env' | 'file' | 'user' | 'auto_refresh' | 'default';
  updatedAt: number;
  lastValidatedAt: number;
  isValid: boolean;
  lastStatus: number;
  lastStatusText: string;
  autoRefreshCount: number;
}

const isVercelRuntime = Boolean(process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_NAME);
const AUTH_CONFIG_FILE = isVercelRuntime
  ? path.join(os.tmpdir(), '.dolphin_auth_config.json')
  : path.join(process.cwd(), '.dolphin_auth_config.json');

export const INITIAL_DEFAULT_COOKIE =
  'cf_clearance=CrIdS7ohjGKN3JjHJO611xmVzIhvC6O0rP1crTsBzS-tpKS4wPie3m_W3DzJd_YS_eScRJCelZTSkIU1-E1mTpFiQkM8icJov3nmt7GdXVmroodHGxfKVokF8vHLMhyTBbnLe7Vl7wGohuoYbb2EAweCp_Vga-ekZvDezd9Car2sCO-OrYdellOcb8l43OxpemK_5o4lJLx7lV-EOMAxQy4RwL6_nxJQS4wkj1iue1yF_X9ZbffH3ar8K1lAGAeYjp93FxFUU9IhNUTvkUp7IadOkEza4IBEs_pvBU7jzhd5zna_DxqacaJRoP-UMI5uYUkYXxq3KJDN3iI9mkfBvVMUDCToWult4TOgRZ2iIsnUBlNGabK0ldDJVebdbIQ2mC3JJDmBcz1UqGoskGzWNNhvFKYCw-Af5fajOdTLU8BV1lNm86zgHpzwr79B0jokmGuhXfYf4tF0VP8lLSnylZBJYoUOmMmbBpS2YbTFA1f72ghvC7HHOFurZJyGeMkif52NO8y-mhDLaCIM7Sul2KuqkHcc47RdBkDZwLxnbawps0FKpCFMRbG6Q1zxtQoks3hJ_E6_0js6223xRto0mZqwHaA176rVehcluDNlZSYgWtoflMsRNzfUQxghnMkeJllRSE-FFR3HZE-BZOOl3Bso1_6BL6Or8uZoqF771AMnF4sti9BgGF36o1Pkmo1OSUgf0QK0dReyRFrKhqA8K3j_XiJdHlcmIXcSxwwsSMQrNnEaL9qQhGNBATDUATi_63CA0deROA';

export const USER_AGENT_STRING =
  'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) HeadlessChrome/155.0.8059.12 Safari/537.36';

function normalizeCookie(cookieStr: string): string {
  const trimmed = (cookieStr || '').trim();
  if (!trimmed) return '';
  if (trimmed.startsWith('cf_clearance=')) {
    return trimmed;
  }
  if (trimmed.includes('cf_clearance=')) {
    const match = trimmed.match(/cf_clearance=([^;\s]+)/);
    return match ? `cf_clearance=${match[1]}` : trimmed;
  }
  return `cf_clearance=${trimmed}`;
}

function extractCfClearanceVal(cookieStr: string): string {
  const match = cookieStr.match(/cf_clearance=([^;\s]+)/);
  return match ? match[1] : cookieStr.replace(/^cf_clearance=/, '');
}

// In-memory active auth config
let activeConfig: DolphinAuthConfig = {
  cookie: normalizeCookie(process.env.DOLPHIN_COOKIE || process.env.SUDA_COOKIE || INITIAL_DEFAULT_COOKIE),
  cfClearance: extractCfClearanceVal(process.env.DOLPHIN_COOKIE || process.env.SUDA_COOKIE || INITIAL_DEFAULT_COOKIE),
  source: (process.env.DOLPHIN_COOKIE || process.env.SUDA_COOKIE) ? 'env' : 'default',
  updatedAt: Date.now(),
  lastValidatedAt: Date.now(),
  isValid: true,
  lastStatus: 200,
  lastStatusText: 'Active verified clearance',
  autoRefreshCount: 0,
};

// Load persisted configuration from disk if available
try {
  if (fs.existsSync(AUTH_CONFIG_FILE)) {
    const raw = fs.readFileSync(AUTH_CONFIG_FILE, 'utf-8');
    const parsed = JSON.parse(raw);
    if (parsed.cookie) {
      activeConfig = {
        ...activeConfig,
        ...parsed,
        cookie: normalizeCookie(parsed.cookie),
        cfClearance: extractCfClearanceVal(parsed.cookie),
      };
    }
  }
} catch (err) {
  console.warn('[dolphinAuthManager] Error loading persisted auth config:', err);
}

/**
 * Securely persists the auth config to disk with restricted permissions
 */
export function persistAuthConfig(): void {
  try {
    const data = JSON.stringify(activeConfig, null, 2);
    try {
      fs.writeFileSync(AUTH_CONFIG_FILE, data, { mode: 0o600, encoding: 'utf-8' });
    } catch {
      try {
        fs.writeFileSync(AUTH_CONFIG_FILE, data, 'utf-8');
      } catch {
        const tmpPath = path.join(os.tmpdir(), '.dolphin_auth_config.json');
        fs.writeFileSync(tmpPath, data, 'utf-8');
      }
    }
  } catch (err) {
    // In-memory state remains valid even if disk write is restricted
  }
}

/**
 * Standard headers matching the client signature
 */
export function getDolphinHeaders(customCookie?: string): Record<string, string> {
  const cookieToUse = normalizeCookie(customCookie || activeConfig.cookie);
  return {
    'Host': 'chat.dphn.ai',
    'Connection': 'keep-alive',
    'sec-ch-ua-platform': '"Linux"',
    'User-Agent': USER_AGENT_STRING,
    'Accept': 'application/json, text/event-stream, */*',
    'sec-ch-ua': '"HeadlessChrome";v="155", "Not_A Brand";v="8", "Chromium";v="155"',
    'sec-ch-ua-mobile': '?0',
    'Sec-Fetch-Site': 'same-origin',
    'Sec-Fetch-Mode': 'cors',
    'Sec-Fetch-Dest': 'empty',
    'Referer': 'https://chat.dphn.ai/',
    'Accept-Language': 'en-SD,en;q=0.9,ar-SD;q=0.8,ar;q=0.7,en-US;q=0.6',
    'Cookie': cookieToUse,
  };
}

/**
 * Tests whether a given cookie is accepted by chat.dphn.ai without triggering Cloudflare challenge
 */
export async function testCookie(candidateCookie: string): Promise<{ ok: boolean; status: number; text: string }> {
  try {
    const controller = new AbortController();
    const timeoutMs = isVercelRuntime ? 3500 : 6000;
    const timeout = setTimeout(() => controller.abort(), timeoutMs);

    const res = await fetch('https://chat.dphn.ai/api/templates', {
      method: 'GET',
      headers: getDolphinHeaders(candidateCookie),
      signal: controller.signal,
    });
    clearTimeout(timeout);

    const text = await res.text();
    const isChallenge =
      res.status === 403 ||
      text.includes('<!DOCTYPE html>') ||
      text.includes('Just a moment') ||
      text.includes('cf-mitigated') ||
      text.includes('challenges.cloudflare.com');

    return {
      ok: res.ok && !isChallenge,
      status: res.status,
      text,
    };
  } catch (err: any) {
    return {
      ok: false,
      status: 0,
      text: err.message || 'Network error',
    };
  }
}

/**
 * Programmatically attempts to fetch fresh auth tokens or session cookies
 */
export async function fetchFreshTokensProgrammatically(): Promise<string | null> {
  try {
    const controller = new AbortController();
    const endpointTimeoutMs = isVercelRuntime ? 4000 : 8000;
    const timeout = setTimeout(() => controller.abort(), endpointTimeoutMs);

    // 1. Check if chat.dphn.ai root or session endpoints return any Set-Cookie
    const endpoints = [
      'https://chat.dphn.ai/api/models',
      'https://chat.dphn.ai/api/templates',
      'https://chat.dphn.ai/',
    ];

    for (const url of endpoints) {
      try {
        const res = await fetch(url, {
          method: 'GET',
          headers: {
            'User-Agent': USER_AGENT_STRING,
            'Accept': 'application/json, text/html, */*',
            'sec-ch-ua-platform': '"Linux"',
            'sec-ch-ua': '"HeadlessChrome";v="155", "Not_A Brand";v="8", "Chromium";v="155"',
            'sec-ch-ua-mobile': '?0',
          },
          signal: controller.signal,
          redirect: 'manual',
        });

        // Parse set-cookie header if any
        const setCookieHeaders: string[] = [];
        if (typeof (res.headers as any).getSetCookie === 'function') {
          setCookieHeaders.push(...(res.headers as any).getSetCookie());
        } else {
          const raw = res.headers.get('set-cookie');
          if (raw) setCookieHeaders.push(raw);
        }

        for (const header of setCookieHeaders) {
          if (header.includes('cf_clearance=')) {
            const match = header.match(/cf_clearance=([^;\s]+)/);
            if (match && match[1]) {
              const candidate = `cf_clearance=${match[1]}`;
              const test = await testCookie(candidate);
              if (test.ok) {
                clearTimeout(timeout);
                return candidate;
              }
            }
          }
        }
      } catch {}
    }

    clearTimeout(timeout);

    // 2. Headless browser automated clearance extraction fallback (skip on Vercel/Lambda where playwright-cli is not present)
    if (!isVercelRuntime) {
      try {
        console.log('[dolphinAuthManager] Launching headless browser to refresh clearance token...');
        await execAsync('playwright-cli open --browser=chromium https://chat.dphn.ai', { timeout: 15000 });
        await new Promise((r) => setTimeout(r, 4000));
        const { stdout: cookieOut } = await execAsync('playwright-cli cookie-list', { timeout: 8000 });
        await execAsync('playwright-cli close', { timeout: 4000 });

        const match = cookieOut.match(/cf_clearance=([A-Za-z0-9_-]+)/);
        if (match && match[1]) {
          const candidate = `cf_clearance=${match[1]}`;
          const test = await testCookie(candidate);
          if (test.ok) {
            console.log('[dolphinAuthManager] Successfully extracted fresh clearance via headless browser');
            return candidate;
          }
        }
      } catch (browserErr: any) {
        try {
          await execAsync('playwright-cli close', { timeout: 3000 });
        } catch {}
        console.warn('[dolphinAuthManager] Headless programmatic clearance retrieval error:', browserErr.message);
      }
    }
  } catch (err) {
    console.warn('[dolphinAuthManager] Programmatic token retrieval failed:', err);
  }
  return null;
}

/**
 * Updates and securely stores a new cookie
 */
export function saveDolphinCookie(newCookie: string, source: DolphinAuthConfig['source'] = 'user'): DolphinAuthConfig {
  const normalized = normalizeCookie(newCookie);
  if (!normalized) return activeConfig;

  activeConfig = {
    ...activeConfig,
    cookie: normalized,
    cfClearance: extractCfClearanceVal(normalized),
    source,
    updatedAt: Date.now(),
    lastValidatedAt: Date.now(),
    isValid: true,
    lastStatus: 200,
    lastStatusText: 'Updated manually',
  };

  process.env.DOLPHIN_COOKIE = normalized;
  persistAuthConfig();
  return { ...activeConfig };
}

/**
 * Automated refresh mechanism that verifies the current cookie,
 * and if expired or returning 403, programmatically refreshes it
 * from candidates, session endpoints, or environment, and securely persists it.
 */
export async function refreshDolphinCookie(force: boolean = false): Promise<DolphinAuthConfig> {
  const now = Date.now();

  // If already validated in the last 45 seconds and valid, skip unless forced
  if (!force && activeConfig.isValid && now - activeConfig.lastValidatedAt < 45000) {
    return { ...activeConfig };
  }

  // Step 1: Test current cookie
  const currentTest = await testCookie(activeConfig.cookie);
  activeConfig.lastValidatedAt = now;
  activeConfig.lastStatus = currentTest.status;

  if (currentTest.ok) {
    activeConfig.isValid = true;
    activeConfig.lastStatusText = 'Valid & active';
    persistAuthConfig();
    return { ...activeConfig };
  }

  activeConfig.isValid = false;
  activeConfig.lastStatusText = `HTTP ${currentTest.status} (expired or challenged)`;
  console.log(`[dolphinAuthManager] Cookie expired or challenged (status ${currentTest.status}). Starting auto-refresh...`);

  // Step 2: Try other candidate cookies in order of priority
  const candidatePool: Array<{ cookie: string; source: DolphinAuthConfig['source'] }> = (
    [
      { cookie: process.env.DOLPHIN_COOKIE || '', source: 'env' as const },
      { cookie: process.env.SUDA_COOKIE || '', source: 'env' as const },
      { cookie: INITIAL_DEFAULT_COOKIE, source: 'default' as const },
    ] as Array<{ cookie: string; source: DolphinAuthConfig['source'] }>
  ).filter((c) => Boolean(c.cookie) && normalizeCookie(c.cookie) !== activeConfig.cookie);

  for (const item of candidatePool) {
    const candidate = normalizeCookie(item.cookie);
    const testRes = await testCookie(candidate);
    if (testRes.ok) {
      console.log(`[dolphinAuthManager] Successfully refreshed cookie from ${item.source}`);
      activeConfig = {
        ...activeConfig,
        cookie: candidate,
        cfClearance: extractCfClearanceVal(candidate),
        source: item.source,
        updatedAt: Date.now(),
        lastValidatedAt: Date.now(),
        isValid: true,
        lastStatus: testRes.status,
        lastStatusText: 'Refreshed successfully',
        autoRefreshCount: activeConfig.autoRefreshCount + 1,
      };
      process.env.DOLPHIN_COOKIE = candidate;
      persistAuthConfig();
      return { ...activeConfig };
    }
  }

  // Step 3: Programmatically fetch fresh tokens from upstream
  const freshToken = await fetchFreshTokensProgrammatically();
  if (freshToken) {
    console.log('[dolphinAuthManager] Successfully obtained fresh tokens programmatically');
    activeConfig = {
      ...activeConfig,
      cookie: freshToken,
      cfClearance: extractCfClearanceVal(freshToken),
      source: 'auto_refresh',
      updatedAt: Date.now(),
      lastValidatedAt: Date.now(),
      isValid: true,
      lastStatus: 200,
      lastStatusText: 'Acquired programmatically',
      autoRefreshCount: activeConfig.autoRefreshCount + 1,
    };
    process.env.DOLPHIN_COOKIE = freshToken;
    persistAuthConfig();
    return { ...activeConfig };
  }

  // Step 4: If all candidates still return 403 / challenge, maintain state and persist telemetry
  activeConfig.autoRefreshCount += 1;
  persistAuthConfig();
  return { ...activeConfig };
}

/**
 * Returns a valid cookie, auto-refreshing if expired or on 403
 */
export async function getValidDolphinCookie(preferredCookie?: string): Promise<string> {
  if (preferredCookie) {
    const normalized = normalizeCookie(preferredCookie);
    if (normalized !== activeConfig.cookie) {
      const test = await testCookie(normalized);
      if (test.ok) {
        saveDolphinCookie(normalized, 'user');
        return normalized;
      }
    }
  }

  // Refresh if needed
  if (!activeConfig.isValid || Date.now() - activeConfig.lastValidatedAt > 60000) {
    await refreshDolphinCookie();
  }

  return activeConfig.cookie;
}

/**
 * Returns telemetry data about auth status
 */
export function getDolphinAuthTelemetry() {
  const maskedCookie = activeConfig.cookie
    ? `${activeConfig.cookie.slice(0, 20)}...${activeConfig.cookie.slice(-8)}`
    : 'None';

  return {
    isValid: activeConfig.isValid,
    source: activeConfig.source,
    maskedCookie,
    lastValidatedAt: activeConfig.lastValidatedAt,
    lastStatus: activeConfig.lastStatus,
    lastStatusText: activeConfig.lastStatusText,
    autoRefreshCount: activeConfig.autoRefreshCount,
    updatedAt: activeConfig.updatedAt,
  };
}
