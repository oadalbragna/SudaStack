import { SudaDbOptions, SudaDbActionType } from '../types';

export interface SudaDbConfig {
  baseUrl: string;
  apiKey: string;
  projectId: string;
  proxyEndpoint: string;
  useProxy: boolean;
}

// Default Configuration for SudaStack / SudaFile DB
export const DEFAULT_SUDA_DB_CONFIG: SudaDbConfig = {
  baseUrl: 'https://sudafile.iqra4you.com/api/db/sudaStack/data/projects/prj_94ca0257f3fe',
  apiKey: 'sf_94ca02_485daf0de4739224122e747d735506d9',
  projectId: 'prj_94ca0257f3fe',
  proxyEndpoint: '/api/db/action',
  useProxy: false,
};

let currentConfig: SudaDbConfig = { ...DEFAULT_SUDA_DB_CONFIG };
let proxyVerifiedState = false;
let proxyCheckPromiseState: Promise<boolean> | null = null;

/**
 * Auto-Verify Proxy (التحقق التلقائي والاتصال الفوري):
 * Checks Cloudflare proxy /health endpoint at startup. If reachable, enables proxy routing.
 * If unreachable, falls back to direct connection instantly to ensure zero downtime.
 */
export async function autoVerifyProxyHealth(): Promise<boolean> {
  if (proxyVerifiedState) return true;
  if (proxyCheckPromiseState) return proxyCheckPromiseState;

  proxyCheckPromiseState = (async () => {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 4000);
      const res = await fetch('https://sudastack.iqra4you.com/health', {
        method: 'GET',
        signal: controller.signal,
      });
      clearTimeout(timeoutId);
      if (res.ok || res.status < 500) {
        proxyVerifiedState = true;
        currentConfig.useProxy = true;
        console.log('[Auto-Verify Proxy] Cloudflare proxy sudastack.iqra4you.com verified successfully.');
        return true;
      }
    } catch (err) {
      console.warn('[Auto-Verify Proxy] Cloud proxy unreachable, activating Direct Connection Fallback:', err);
    }
    // Direct Connection Fallback
    currentConfig.useProxy = false;
    return false;
  })();

  return proxyCheckPromiseState;
}

if (typeof window !== 'undefined') {
  autoVerifyProxyHealth().catch(() => {});
}

/**
 * Configure or switch the Database provider dynamically without changing any business logic.
 */
export function configureSudaDb(newConfig: Partial<SudaDbConfig>) {
  currentConfig = { ...currentConfig, ...newConfig };
}

export function getSudaDbConfig(): SudaDbConfig {
  return { ...currentConfig };
}

/**
 * Build target URL for a given relative or absolute path.
 */
function buildTargetUrl(path = '', config: SudaDbConfig = currentConfig): string {
  const cleanBase = config.baseUrl.replace(/\/+$/, '');
  const cleanPath = path.replace(/^\/+/, '');
  return cleanPath ? `${cleanBase}/${cleanPath}` : cleanBase;
}

/**
 * Single Unified Database Function (الدالة الموحدة لجميع عمليات قواعد البيانات)
 *
 * Supports:
 * - GET: Read data node
 * - PATCH: Atomic patch without overwriting others
 * - POST: Push new item
 * - DELETE: Remove data node
 * - STREAM: Real-time SSE live updates
 */
export async function sudaDbAction<T = any>(options: SudaDbOptions): Promise<T> {
  const { action, path = '', data, apiKey, onMessage, onError } = options;
  const config = currentConfig;
  const effectiveApiKey = apiKey || config.apiKey;
  const targetUrl = buildTargetUrl(path, config);

  if (action === 'stream') {
    return handleStreamAction(path, onMessage, onError, effectiveApiKey, config) as unknown as T;
  }

  // Choose appropriate HTTP Method
  let method: string;
  switch (action) {
    case 'get':
      method = 'GET';
      break;
    case 'patch':
      method = 'PATCH';
      break;
    case 'post':
      method = 'POST';
      break;
    case 'delete':
      method = 'DELETE';
      break;
    default:
      throw new Error(`Unsupported database action: ${action}`);
  }

  // Attempt direct fetch first, fallback to proxy if CORS or network error occurs
  try {
    const headers: Record<string, string> = {
      'x-api-key': effectiveApiKey,
      Accept: 'application/json',
    };

    const fetchOptions: RequestInit = {
      method,
      headers,
    };

    if (data !== undefined && (method === 'PATCH' || method === 'POST')) {
      headers['Content-Type'] = 'application/json';
      fetchOptions.body = JSON.stringify(data);
    }

    const response = await fetch(targetUrl, fetchOptions);

    if (!response.ok) {
      // If server returned an error status, parse message if available
      let errorMsg = `Database request failed (${response.status}: ${response.statusText})`;
      try {
        const errorJson = await response.json();
        if (errorJson?.message || errorJson?.error) {
          errorMsg = errorJson.message || errorJson.error;
        }
      } catch {}
      throw new Error(errorMsg);
    }

    const text = await response.text();
    if (!text || text.trim() === 'null') {
      return null as unknown as T;
    }

    try {
      return JSON.parse(text) as T;
    } catch {
      return text as unknown as T;
    }
  } catch (err: any) {
    // If running in browser and direct request failed, try proxy endpoint
    const isBrowser = typeof window !== 'undefined';
    if (isBrowser) {
      try {
        const proxyRes = await fetch(config.proxyEndpoint, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action,
            path,
            data,
            apiKey: effectiveApiKey,
          }),
        });
        if (proxyRes.ok) {
          const text = await proxyRes.text();
          try {
            return JSON.parse(text) as T;
          } catch {
            return text as unknown as T;
          }
        }
      } catch (proxyErr) {
        console.warn('Proxy fallback also failed:', proxyErr);
      }
    }

    throw err;
  }
}

/**
 * Handle real-time SSE Live Stream subscription
 */
function handleStreamAction(
  path = '',
  onMessage?: (data: any) => void,
  onError?: (err: any) => void,
  apiKey = currentConfig.apiKey,
  config = currentConfig
): () => void {
  const cleanBase = config.baseUrl.replace(/\/+$/, '');
  const streamUrl = `${cleanBase}/stream?apiKey=${encodeURIComponent(apiKey)}`;

  let isClosed = false;
  let eventSource: EventSource | null = null;
  let pollInterval: any = null;

  try {
    if (typeof EventSource !== 'undefined') {
      eventSource = new EventSource(streamUrl);

      eventSource.onmessage = (event) => {
        if (isClosed) return;
        try {
          const parsed = JSON.parse(event.data);
          onMessage?.(parsed);
        } catch {
          onMessage?.(event.data);
        }
      };

      eventSource.onerror = (err) => {
        if (isClosed) return;
        onError?.(err);
      };
    }
  } catch (e) {
    onError?.(e);
  }

  // Graceful unsubscribe / cleanup function
  return () => {
    isClosed = true;
    if (eventSource) {
      eventSource.close();
      eventSource = null;
    }
    if (pollInterval) {
      clearInterval(pollInterval);
      pollInterval = null;
    }
  };
}

/**
 * Unified Database Object API (واجهة موحدة سهلة الاستخدام)
 */
export const sudaDb = {
  /**
   * Main unified runner
   */
  execute: sudaDbAction,

  /**
   * Read data node
   */
  get: <T = any>(path: string, options?: Partial<SudaDbOptions>): Promise<T> =>
    sudaDbAction<T>({ action: 'get', path, ...options }),

  /**
   * Atomic patch without overwriting other keys
   */
  patch: <T = any>(path: string, data: any, options?: Partial<SudaDbOptions>): Promise<T> =>
    sudaDbAction<T>({ action: 'patch', path, data, ...options }),

  /**
   * Push new record (POST)
   */
  post: <T = any>(path: string, data: any, options?: Partial<SudaDbOptions>): Promise<T> =>
    sudaDbAction<T>({ action: 'post', path, data, ...options }),

  /**
   * Delete data node
   */
  delete: <T = any>(path: string, options?: Partial<SudaDbOptions>): Promise<T> =>
    sudaDbAction<T>({ action: 'delete', path, ...options }),

  /**
   * Subscribe to SSE Live Stream
   */
  stream: (
    path: string,
    onMessage?: (data: any) => void,
    onError?: (err: any) => void
  ): (() => void) => {
    return handleStreamAction(path, onMessage, onError);
  },

  /**
   * Reconfigure host / key
   */
  configure: configureSudaDb,
  getConfig: getSudaDbConfig,
};

export default sudaDb;
