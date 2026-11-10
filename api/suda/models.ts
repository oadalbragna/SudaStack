import type { Request, Response } from 'express';
import modelsHandler from '../models';

export const maxDuration = 30;
export const dynamic = 'force-dynamic';

export default async function sudaModelsHandler(req: Request, res: Response) {
  return modelsHandler(req, res);
}
