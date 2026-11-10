import type { Request, Response } from 'express';
import proxyChatHandler from '../proxy-chat';

export const maxDuration = 60;
export const dynamic = 'force-dynamic';

export default async function sudaChatHandler(req: Request, res: Response) {
  return proxyChatHandler(req, res);
}
