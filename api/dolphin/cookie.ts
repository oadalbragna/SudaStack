import type { Request, Response } from 'express';
import { saveDolphinCookie, getDolphinAuthTelemetry } from '../../src/server/dolphinAuthManager';

export const dynamic = 'force-dynamic';

export default async function cookieHandler(req: Request, res: Response) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, x-api-key, Accept');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const { cookie } = (req.body as any) || {};
  if (!cookie) {
    return res.status(400).json({ error: 'cookie is required' });
  }

  const updated = saveDolphinCookie(cookie, 'user');
  return res.json({
    success: true,
    updated,
    telemetry: getDolphinAuthTelemetry(),
  });
}
