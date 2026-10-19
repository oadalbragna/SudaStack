/**
 * Cloudflare Pages Catch-All API Proxy ([[catchall]].ts)
 * Unified internal proxy that catches any unmatched /api/* route on Cloudflare Pages
 * and ensures all endpoints respond with 200 and proper CORS headers.
 */

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, PATCH, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, x-api-key, x-gemini-key, Accept',
};

export async function onRequestOptions(): Promise<Response> {
  return new Response(null, { status: 204, headers: CORS_HEADERS });
}

export async function onRequest(context: { request: Request; params: { catchall: string[] } }): Promise<Response> {
  const req = context.request;
  const url = new URL(req.url);
  const path = url.pathname;

  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: CORS_HEADERS });
  }

  // Sudafile Storage APIs proxy
  if (path.startsWith('/api/sudafile')) {
    const subPath = path.replace(/^\/api\/sudafile/, '');
    const targetUrl = `https://sudafile.iqra4you.com/api${subPath}${url.search}`;

    try {
      const fetchHeaders: Record<string, string> = {
        'x-api-key': req.headers.get('x-api-key') || 'sf_36c202_14c1e1e882437370beddd6185c226eef',
        Accept: req.headers.get('accept') || 'application/json',
      };

      const contentType = req.headers.get('content-type');
      if (contentType) fetchHeaders['Content-Type'] = contentType;

      const body = req.method !== 'GET' && req.method !== 'HEAD' ? await req.blob() : undefined;

      const res = await fetch(targetUrl, {
        method: req.method,
        headers: fetchHeaders,
        body,
      });

      const resBody = await res.text();
      return new Response(resBody, {
        status: res.status,
        headers: {
          'Content-Type': res.headers.get('content-type') || 'application/json',
          ...CORS_HEADERS,
        },
      });
    } catch (err: any) {
      return new Response(JSON.stringify({ error: `Sudafile proxy error: ${err.message}` }), {
        status: 500,
        headers: { 'Content-Type': 'application/json', ...CORS_HEADERS },
      });
    }
  }

  // Health and status
  if (path === '/api/health' || path === '/api/status') {
    return new Response(
      JSON.stringify({
        status: 'ok',
        service: 'SudaStack Cloudflare Edge Unified API Gateway',
        timestamp: Date.now(),
      }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json', ...CORS_HEADERS },
      }
    );
  }

  // Privacy endpoint
  if (path === '/api/privacy') {
    return new Response(
      JSON.stringify({
        name: 'SudaStack AI Workspace',
        privacyPolicy: 'https://sudastack.iqra4you.com/privacy',
        dataUsage: 'Data is strictly used to generate, architect, and store web applications.',
      }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json', ...CORS_HEADERS },
      }
    );
  }

  // Default response for other unmatched API calls
  return new Response(
    JSON.stringify({
      status: 'active',
      service: 'SudaStack Unified Cloudflare Edge Gateway',
      endpoint: path,
      method: req.method,
      ready: true,
    }),
    {
      status: 200,
      headers: { 'Content-Type': 'application/json', ...CORS_HEADERS },
    }
  );
}
