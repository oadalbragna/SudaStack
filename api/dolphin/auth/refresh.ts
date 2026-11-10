import type { Request, Response } from 'express';
import { refreshDolphinCookie, getDolphinAuthTelemetry } from '../../../src/server/dolphinAuthManager';

export const maxDuration = 30;
export const dynamic = 'force-dynamic';

export default async function authRefreshHandler(req: Request, res: Response) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, x-api-key, Accept');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const force = (req.body as any)?.force !== false;
  const result = await refreshDolphinCookie(force);
  return res.json({
    success: result.isValid,
    refreshed: result,
    telemetry: getDolphinAuthTelemetry(),
  });
}
