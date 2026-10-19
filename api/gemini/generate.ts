import type { Request, Response } from 'express';
import proxyChatHandler from '../proxy-chat';

export default async function handler(req: Request, res: Response) {
  // Directly route all requests to the primary api/ model
  return proxyChatHandler(req, res);
}
