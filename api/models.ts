import type { Request, Response } from 'express';
import {
  getValidDolphinCookie,
  refreshDolphinCookie,
  getDolphinHeaders,
  getDolphinAuthTelemetry,
} from '../src/server/dolphinAuthManager';

export const maxDuration = 30;
export const dynamic = 'force-dynamic';

export default async function modelsHandler(req: Request, res: Response) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, x-api-key, Accept');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    let cookie = await getValidDolphinCookie((req.headers['cookie'] as string) || (req.headers['x-cookie'] as string));
    let r = await fetch('https://chat.dphn.ai/api/models', {
      headers: getDolphinHeaders(cookie),
    });

    if (r.status === 403 || !r.ok) {
      const refreshed = await refreshDolphinCookie(true);
      if (refreshed.isValid && refreshed.cookie !== cookie) {
        cookie = refreshed.cookie;
        r = await fetch('https://chat.dphn.ai/api/models', {
          headers: getDolphinHeaders(cookie),
        });
      }
    }

    if (r.ok) {
      const text = await r.text();
      if (!text.includes('<!DOCTYPE html>') && !text.includes('Just a moment')) {
        const rawData = JSON.parse(text);
        const modelsList = Array.isArray(rawData?.data) ? rawData.data : [];
        const sanitizedModels = modelsList.map((m: any) => ({
          ...m,
          label:
            m.id === 'dolphinserver:24B'
              ? 'SudaMode V1.0'
              : m.id.includes('6b')
              ? 'SudaMode Mini'
              : (m.label || '').replace(/dolphin/gi, 'SudaMode').trim() || 'SudaMode V1.0',
          isPrimary: m.id === 'dolphinserver:24B',
        }));
        return res.json({ data: sanitizedModels });
      }
    }
  } catch (err: any) {
    console.warn('Vercel models handler error:', err?.message);
  }

  return res.json({
    data: [
      { id: 'dolphinserver:24B', label: 'SudaMode V1.0', isPrimary: true, vision: false },
      { id: 'dolphinserver2:6b', label: 'SudaMode Mini', isPrimary: false, vision: false },
    ],
    authTelemetry: getDolphinAuthTelemetry(),
  });
}
