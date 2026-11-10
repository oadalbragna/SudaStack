import type { Request, Response } from 'express';
import { getDolphinAuthTelemetry } from '../../../src/server/dolphinAuthManager';

export const dynamic = 'force-dynamic';

export default async function authStatusHandler(req: Request, res: Response) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, x-api-key, Accept');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  return res.json({
    success: true,
    telemetry: getDolphinAuthTelemetry(),
  });
}
