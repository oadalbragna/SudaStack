/**
 * Cloudflare Pages Function for Telegram Webhook
 * Path: /api/telegram-webhook
 * 
 * Supports:
 * - Receiving incoming POST updates from Telegram servers
 * - Checking webhook info & setting webhook via GET queries
 */

export async function onRequestOptions(): Promise<Response> {
  return new Response(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization, x-api-key',
    },
  });
}

export async function onRequestGet(context: { request: Request }): Promise<Response> {
  const url = new URL(context.request.url);
  const action = url.searchParams.get('action');
  const token = url.searchParams.get('token');

  const corsHeaders = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
  };

  if (!token) {
    return new Response(
      JSON.stringify({
        status: 'active',
        service: 'SudaStack Cloudflare Telegram Webhook Gateway',
        instructions: 'Pass ?action=info&token=<BOT_TOKEN> or ?action=set&token=<BOT_TOKEN>&url=<WEBHOOK_URL>',
      }),
      { status: 200, headers: corsHeaders }
    );
  }

  async function callTelegramApi(pathAndQuery: string): Promise<Response> {
    const proxyUrl = `https://sudastack-proxy.iqra4you.com/bot${token}/${pathAndQuery}`;
    const directUrl = `https://api.telegram.org/bot${token}/${pathAndQuery}`;
    try {
      const res = await fetch(proxyUrl, {
        headers: {
          'CF-Proxy-Route': 'true',
          'X-SudaStack-Target': 'api.telegram.org',
          Accept: 'application/json',
        },
      });
      if (res.ok || res.status < 500) {
        return res;
      }
    } catch (err) {
      console.warn('[Telegram Webhook Proxy Fallback]:', err);
    }
    return fetch(directUrl, { headers: { Accept: 'application/json' } });
  }

  try {
    if (action === 'info') {
      const res = await callTelegramApi('getWebhookInfo');
      const data = await res.json();
      return new Response(JSON.stringify(data), { headers: corsHeaders });
    }

    if (action === 'set') {
      const targetUrl = url.searchParams.get('url') || `${url.origin}/api/telegram-webhook`;
      const res = await callTelegramApi(`setWebhook?url=${encodeURIComponent(targetUrl)}`);
      const data = await res.json();
      return new Response(JSON.stringify(data), { headers: corsHeaders });
    }

    if (action === 'delete') {
      const res = await callTelegramApi('deleteWebhook');
      const data = await res.json();
      return new Response(JSON.stringify(data), { headers: corsHeaders });
    }

    return new Response(JSON.stringify({ error: 'Unknown action' }), { status: 400, headers: corsHeaders });
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message }), { status: 500, headers: corsHeaders });
  }
}

export async function onRequestPost(context: { request: Request }): Promise<Response> {
  const corsHeaders = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
  };

  try {
    const update: any = await context.request.json().catch(() => ({}));
    const message = update?.message;
    const callback = update?.callback_query;

    // Acknowledge Telegram immediately with 200 OK
    return new Response(JSON.stringify({ ok: true, received: Boolean(message || callback) }), {
      status: 200,
      headers: corsHeaders,
    });
  } catch (err: any) {
    return new Response(JSON.stringify({ ok: false, error: err.message }), {
      status: 200, // Always return 200 to Telegram so it doesn't repeatedly retry failed hooks
      headers: corsHeaders,
    });
  }
}
