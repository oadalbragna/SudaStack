import type { Request, Response } from 'express';
import { scrapeAndAnalyzeUrl } from '../../src/server/toolsEngine';

export default async function handler(req: Request, res: Response) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method === 'GET') {
    const url = req.query.url as string;
    if (url) {
      const result = await scrapeAndAnalyzeUrl(url);
      return res.json(result);
    }
    return res.json({
      status: 'active',
      service: 'SudaStack Web Scraping & Content Extraction Engine',
    });
  }

  try {
    let body = req.body;
    if (typeof body === 'string') {
      try {
        body = JSON.parse(body);
      } catch {}
    }
    const { url } = body || {};
    if (!url) {
      return res.status(400).json({ error: 'URL is required' });
    }

    const result = await scrapeAndAnalyzeUrl(url);
    return res.json(result);
  } catch (err: any) {
    return res.status(500).json({ error: `Failed to scrape website: ${err.message}` });
  }
}
