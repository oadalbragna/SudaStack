/**
 * Cloudflare Pages Function for /api/db/action
 * Proxies database operations to the primary SudaFile database at sudafile.iqra4you.com
 */

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PATCH, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, x-api-key, Accept',
};

export async function onRequestOptions(): Promise<Response> {
  return new Response(null, {
    status: 204,
    headers: CORS_HEADERS,
  });
}

export async function onRequest(context: { request: Request }): Promise<Response> {
  const req = context.request;

  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: CORS_HEADERS });
  }

  try {
    let body: any = {};
    if (req.method !== 'GET' && req.method !== 'HEAD') {
      try {
        body = await req.json();
      } catch {
        body = {};
      }
    }

    const { action = (req.method === 'GET' ? 'get' : req.method === 'DELETE' ? 'delete' : req.method === 'PATCH' ? 'patch' : 'get'), path = '', data, apiKey = 'sf_94ca02_485daf0de4739224122e747d735506d9' } = body;
    const baseUrl = 'https://sudafile.iqra4you.com/api/db/sudaStack/data/projects/prj_94ca0257f3fe';
    const cleanPath = (path || '').replace(/^\/+/, '');
    const targetUrl = cleanPath ? `${baseUrl}/${cleanPath}` : baseUrl;

    let method = 'GET';
    if (action === 'patch') method = 'PATCH';
    else if (action === 'post') method = 'POST';
    else if (action === 'delete') method = 'DELETE';
    else if (req.method === 'GET') method = 'GET';
    else if (req.method === 'DELETE') method = 'DELETE';
    else if (req.method === 'PATCH') method = 'PATCH';
    else if (req.method === 'POST' && data !== undefined) method = 'POST';

    const headers: Record<string, string> = {
      'x-api-key': req.headers.get('x-api-key') || apiKey,
      Accept: 'application/json',
    };

    const fetchOptions: RequestInit = { method, headers };
    if (data !== undefined && (method === 'PATCH' || method === 'POST')) {
      headers['Content-Type'] = 'application/json';
      fetchOptions.body = JSON.stringify(data);
    }

    const upstreamRes = await fetch(targetUrl, fetchOptions);
    const text = await upstreamRes.text();

    return new Response(text, {
      status: upstreamRes.status,
      headers: {
        'Content-Type': 'application/json',
        ...CORS_HEADERS,
      },
    });
  } catch (err: any) {
    return new Response(
      JSON.stringify({ error: `Database edge proxy error: ${err.message}` }),
      {
        status: 500,
        headers: {
          'Content-Type': 'application/json',
          ...CORS_HEADERS,
        },
      }
    );
  }
}
