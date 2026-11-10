import type { Request, Response } from 'express';
import handler from './proxy-chat';

export const maxDuration = 60;
export const dynamic = 'force-dynamic';

export default async function proxyHandler(req: Request, res: Response) {
  return handler(req, res);
}
