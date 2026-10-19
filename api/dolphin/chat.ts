import type { Request, Response } from 'express';
import handler from '../proxy-chat';

export default async function dolphinChatHandler(req: Request, res: Response) {
  return handler(req, res);
}
