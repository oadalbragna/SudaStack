/** Resolve relative or configured runner endpoint for Cloudflare Pages, Express backend, or remote VPS. */
export function getTerminalRunnerUrl(endpoint = '/api/tools/execute'): string {
  const customUrl =
    (typeof window !== 'undefined' &&
      (localStorage.getItem('sudastack_terminal_runner_url') ||
        (import.meta as any).env?.VITE_TERMINAL_API_URL)) ||
    '';
  if (customUrl && customUrl.trim()) {
    const cleanBase = customUrl.trim().replace(/\/+$/, '');
    const cleanEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
    return `${cleanBase}${cleanEndpoint}`;
  }
  // Always return relative endpoint path to ensure correct routing on same-origin (e.g. https://sudastack.iqra4you.com/api/tools/execute)
  if (!endpoint.startsWith('/')) {
    return `/${endpoint}`;
  }
  return endpoint;
}
