import type { Request, Response } from 'express';

export default function handler(req: Request, res: Response) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', '*');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  return res.json({
    name: 'SudaStack AI Workspace',
    privacyPolicy: 'https://sudastack.iqra4you.com/privacy',
    dataUsage: 'Data is strictly used to generate, architect, and store web applications requested by the user.',
    terms: 'Free and open universal developer platform on Cloudflare.',
    contact: 'sudastack.iqra4you.com'
  });
}
