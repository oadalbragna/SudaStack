import type { Request, Response } from 'express';
import {
  getValidDolphinCookie,
  refreshDolphinCookie,
  getDolphinHeaders,
  getDolphinAuthTelemetry,
} from '../src/server/dolphinAuthManager';

export const maxDuration = 30;
export const dynamic = 'force-dynamic';

export default async function templatesHandler(req: Request, res: Response) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, x-api-key, Accept');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    let cookie = await getValidDolphinCookie((req.headers['cookie'] as string) || (req.headers['x-cookie'] as string));
    let r = await fetch('https://chat.dphn.ai/api/templates', {
      headers: getDolphinHeaders(cookie),
    });

    if (r.status === 403 || !r.ok) {
      const refreshed = await refreshDolphinCookie(true);
      if (refreshed.isValid && refreshed.cookie !== cookie) {
        cookie = refreshed.cookie;
        r = await fetch('https://chat.dphn.ai/api/templates', {
          headers: getDolphinHeaders(cookie),
        });
      }
    }

    if (r.ok) {
      const text = await r.text();
      if (!text.includes('<!DOCTYPE html>') && !text.includes('Just a moment')) {
        const data = JSON.parse(text);
        return res.json(data);
      }
    }
  } catch (err: any) {
    console.warn('Vercel templates handler error:', err?.message);
  }

  return res.json({
    data: [
      { name: 'logical', label: 'Logical' },
      { name: 'creative', label: 'Creative' },
      { name: 'summary', label: 'Summarize' },
      { name: 'code-beginner', label: 'Code Beginner' },
      { name: 'code-advanced', label: 'Code Advanced' },
    ],
    authTelemetry: getDolphinAuthTelemetry(),
  });
}
