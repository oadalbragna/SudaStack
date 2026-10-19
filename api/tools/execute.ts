import type { Request, Response } from 'express';

delete process.env.PYTHONHOME;
delete process.env.PYTHONPATH;
import {
  executeCurlCommand,
  executePythonCode,
  installPythonPackages,
  performWebSearch,
  scrapeAndAnalyzeUrl,
  executeTerminalCommand,
  exploreAndActOnUrl,
} from '../../src/server/toolsEngine';

export default async function handler(req: Request, res: Response) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method === 'GET') {
    return res.json({
      status: 'active',
      service: 'SudaStack Native Command & Web Exploration Execution Engine',
      supported: ['curl', 'python', 'web-search', 'search', 'web-explore', 'explore', 'web-scrape', 'bash', 'terminal'],
    });
  }

  try {
    let body = req.body;
    if (typeof body === 'string') {
      try {
        body = JSON.parse(body);
      } catch {}
    }
    const { type, command, code, cwd, sessionId, url, query, q, action, actionTarget, projectName, files, stdin } = body || {};

    if (!type || (!command && !code && !url && !query && !q)) {
      return res.status(400).json({ error: 'Missing type or command/code/query parameter' });
    }

    if (type === 'curl') {
      const result = await executeCurlCommand(command || code || '');
      return res.json(result);
    } else if (type === 'python') {
      const result = await executePythonCode(code || command || '', false, false, stdin);
      return res.json(result);
    } else if (type === 'pip' || type === 'pip-install') {
      const rawCmd = command || code || '';
      const rawPkgString = rawCmd.replace(/^[ \t]*(?:!|%)?(?:python3?\s+-m\s+)?pip(?:3)?\s+install\s+/i, '');
      const pkgs = rawPkgString.split(/\s+/).filter(Boolean);
      const startTime = Date.now();
      const resInstall = await installPythonPackages(pkgs);
      return res.json({
        success: resInstall.success,
        type: 'pip',
        command: rawCmd || `pip install ${pkgs.join(' ')}`,
        stdout: resInstall.output,
        stderr: resInstall.success ? '' : resInstall.output,
        exitCode: resInstall.success ? 0 : 1,
        executionTimeMs: Date.now() - startTime,
      });
    } else if (type === 'web-search' || type === 'search') {
      const searchQuery = query || q || command || code || '';
      const result = await performWebSearch(searchQuery);
      return res.json({
        success: result.success,
        type: 'web-search',
        command: searchQuery,
        stdout: result.stdout,
        stderr: result.error || '',
        exitCode: result.success ? 0 : 1,
        executionTimeMs: result.executionTimeMs,
        metadata: {
          resultsCount: result.results.length,
          results: result.results,
        },
      });
    } else if (type === 'web-explore' || type === 'explore' || type === 'browse' || type === 'web-action') {
      const target = url || command || code || '';
      const result = await exploreAndActOnUrl(target, action || actionTarget);
      return res.json(result);
    } else if (type === 'web-scrape') {
      const targetUrl = url || command || code || '';
      const result = await scrapeAndAnalyzeUrl(targetUrl);
      return res.json(result);
    } else if (type === 'bash' || type === 'terminal' || type === 'shell') {
      const result = await executeTerminalCommand(command || code || '', cwd, sessionId, projectName, files, stdin);
      return res.json(result);
    } else {
      return res.status(400).json({ error: `Unsupported tool execution type: ${type}` });
    }
  } catch (err: any) {
    return res.status(500).json({ error: `Command execution failed: ${err.message}` });
  }
}

