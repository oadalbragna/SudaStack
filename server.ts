import 'dotenv/config';
delete process.env.PYTHONHOME;
delete process.env.PYTHONPATH;
import express from 'express';
import path from 'path';
import fs from 'fs';
import proxyChatHandler from './api/proxy-chat';
import chatAndCreateHandler from './api/telegram-storage/chat-and-create';
import geminiGenerateHandler from './api/gemini/generate';
import {
  executeCurlCommand,
  executePythonCode,
  installPythonPackages,
  scrapeAndAnalyzeUrl,
  performWebSearch,
  executeTerminalCommand,
  getSystemHealthTelemetry,
  exploreAndActOnUrl,
  uploadAndExtractZip,
  getUserFolders,
} from './src/server/toolsEngine';
import {
  getSudafileConfig,
  updateSudafileConfig,
  testSudafileConnection,
  listSudalistFiles,
  uploadToSudafile,
  deleteFromSudafile,
  backupPackagesToSudafile,
  downloadAndExtractPackageFromSudafile,
  packageAndUploadModuleToSudafile,
  resolveMissingPythonModule,
} from './src/server/sudafileManager';
import {
  registerProcess,
  completeProcess,
  cancelProcess as cancelRuntimeProcess,
  checkIdempotency,
  saveIdempotency,
  getAllActiveProcesses,
  getOrCreateRuntime,
  startServerTelegramPolling,
  stopServerTelegramPolling,
} from './src/server/projectRuntimeManager';


const ROOT_DIR = process.cwd();

const app = express();
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

// Global CORS and Preflight handler for browser fetch requests
app.use((req, res, next) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, x-api-key, x-gemini-key, Accept');
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }
  next();
});

// Real AI chat proxy and platform creator endpoints
app.all('/api/proxy', async (req, res) => {
  const body = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : req.body || {};
  if (body.type || body.code !== undefined || (body.command !== undefined && !body.messages && !body.prompt)) {
    const type = body.type || 'python';
    const rawCmd = (body.command || body.code || '').trim();
    try {
      const result = await executePythonCode(rawCmd, false, false, body.stdin);
      return res.json(result);
    } catch (err: any) {
      return res.json({ success: false, error: err.message, exitCode: 1 });
    }
  }
  return proxyChatHandler(req, res);
});
app.all(['/api/proxy-chat', '/api/dolphin/chat', '/api/chat', '/proxy-chat'], (req, res) => proxyChatHandler(req, res));
app.all('/api/telegram-storage/chat-and-create', (req, res) => chatAndCreateHandler(req, res));
app.all('/api/gemini/generate', (req, res) => geminiGenerateHandler(req, res));

// Health check endpoint for Auto-Verify Proxy & Monitoring
app.all(['/health', '/api/health', '/status', '/api/status'], (_req, res) => {
  res.json({
    status: 'ok',
    service: 'SudaStack Cloudflare Proxy & Backend',
    port: process.env.PORT || 3000,
    timestamp: Date.now(),
  });
});

// Unified SudaFile / SudaStack Real Database Proxy (/api/db/action & /api/db/*)
app.all(['/api/db/action', '/api/db', '/api/db/*'], async (req: express.Request, res: express.Response) => {
  try {
    const body = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : req.body || {};
    let reqPath = body.path || '';
    if (!reqPath && req.path.startsWith('/api/db/') && req.path !== '/api/db/action') {
      reqPath = req.path.replace(/^\/api\/db\//, '');
    }
    const { action = (req.method === 'GET' ? 'get' : req.method === 'DELETE' ? 'delete' : req.method === 'PATCH' ? 'patch' : 'get'), data, apiKey = 'sf_94ca02_485daf0de4739224122e747d735506d9' } = body;
    const baseUrl = 'https://sudafile.iqra4you.com/api/db/sudaStack/data/projects/prj_94ca0257f3fe';
    const cleanPath = (reqPath || '').replace(/^\/+/, '');
    const targetUrl = cleanPath ? `${baseUrl}/${cleanPath}` : baseUrl;

    let method = 'GET';
    if (action === 'patch') method = 'PATCH';
    else if (action === 'post') method = 'POST';
    else if (action === 'delete') method = 'DELETE';
    else if (req.method === 'GET') method = 'GET';
    else if (req.method === 'DELETE') method = 'DELETE';
    else if (req.method === 'PATCH') method = 'PATCH';
    else if (req.method === 'POST' && data !== undefined) method = 'POST';

    const headers: Record<string, string> = {
      'x-api-key': (req.headers['x-api-key'] as string) || apiKey,
      Accept: 'application/json',
    };

    const fetchOptions: any = { method, headers };
    if (data !== undefined && (method === 'PATCH' || method === 'POST')) {
      headers['Content-Type'] = 'application/json';
      fetchOptions.body = JSON.stringify(data);
    }

    const upstreamRes = await fetch(targetUrl, fetchOptions);
    const text = await upstreamRes.text();
    let json: any = null;
    try {
      json = JSON.parse(text);
    } catch {
      json = text;
    }
    return res.status(upstreamRes.status).json(json);
  } catch (err: any) {
    return res.status(500).json({ error: `Database proxy action failed: ${err.message}` });
  }
});

// Sudafile Cloud Storage Configuration & Management Routes
app.get('/api/sudafile/config', (_req, res) => {
  return res.json(getSudafileConfig());
});

app.post('/api/sudafile/config', (req, res) => {
  try {
    const { apiKey, baseUrl, defaultFolder } = req.body || {};
    const updated = updateSudafileConfig({ apiKey, baseUrl, defaultFolder });
    return res.json({ success: true, config: updated });
  } catch (err: any) {
    return res.status(500).json({ error: `Failed to update Sudafile config: ${err.message}` });
  }
});

app.post('/api/sudafile/test', async (req, res) => {
  try {
    const { apiKey, baseUrl } = req.body || {};
    const result = await testSudafileConnection(apiKey, baseUrl);
    return res.json(result);
  } catch (err: any) {
    return res.status(500).json({ success: false, message: err.message, latencyMs: 0 });
  }
});

app.get('/api/sudafile/files', async (req, res) => {
  try {
    const customKey = req.headers['x-api-key'] as string;
    const result = await listSudalistFiles(customKey);
    return res.json(result);
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

app.post('/api/sudafile/upload', async (req, res) => {
  try {
    const { fileName, fileBase64, mimeType, folder } = req.body || {};
    if (!fileName || !fileBase64) {
      return res.status(400).json({ error: 'fileName and fileBase64 are required' });
    }
    const cleanB64 = fileBase64.replace(/^data:[^;]+;base64,/, '');
    const buffer = Buffer.from(cleanB64, 'base64');
    const customKey = req.headers['x-api-key'] as string;
    const result = await uploadToSudafile(buffer, fileName, mimeType || 'application/octet-stream', folder || 'uploads', customKey);
    return res.json(result);
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

app.delete('/api/sudafile/files/:id', async (req, res) => {
  try {
    const fileId = req.params.id;
    const customKey = req.headers['x-api-key'] as string;
    const result = await deleteFromSudafile(fileId, customKey);
    return res.json(result);
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

app.get('/api/sudafile/files/:id', (req, res) => {
  try {
    const fileId = req.params.id;
    const localFilesPath = path.join(process.cwd(), '.sudafile_local_files.json');
    if (fs.existsSync(localFilesPath)) {
      const files = JSON.parse(fs.readFileSync(localFilesPath, 'utf-8'));
      const found = files.find((f: any) => f.fileId === fileId);
      if (found && found.dataBase64) {
        const buf = Buffer.from(found.dataBase64, 'base64');
        res.setHeader('Content-Type', found.mimeType || 'application/octet-stream');
        res.setHeader('Content-Disposition', `inline; filename="${found.name || 'file'}"`);
        return res.send(buf);
      }
    }
    return res.status(404).json({ error: 'File not found in local fallback storage' });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

app.post('/api/sudafile/backup-packages', async (req, res) => {
  try {
    const { folder } = req.body || {};
    const result = await backupPackagesToSudafile(folder || 'packages');
    return res.json(result);
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

app.post('/api/sudafile/restore-package', async (req, res) => {
  try {
    const { moduleName } = req.body || {};
    if (!moduleName) return res.status(400).json({ error: 'moduleName is required' });
    const result = await downloadAndExtractPackageFromSudafile(moduleName);
    return res.json(result);
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

app.post('/api/sudafile/upload-package', async (req, res) => {
  try {
    const { moduleName, folder } = req.body || {};
    if (!moduleName) return res.status(400).json({ error: 'moduleName is required' });
    const result = await packageAndUploadModuleToSudafile(moduleName, folder || 'python_packages');
    return res.json(result);
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

app.post('/api/sudafile/resolve-module', async (req, res) => {
  try {
    const { moduleName } = req.body || {};
    if (!moduleName) return res.status(400).json({ error: 'moduleName is required' });
    const result = await resolveMissingPythonModule(moduleName, installPythonPackages);
    return res.json(result);
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// SudaStack Cloudflare ProjectRuntime Endpoints (Idempotency, Kill Switch, Persistent Polling)
app.get('/api/runtime/active-processes', (_req, res) => {
  return res.json({ success: true, processes: getAllActiveProcesses() });
});

app.post(['/api/runtime/cancel', '/api/runtime/:projectId/cancel'], (req, res) => {
  const { runId } = req.body || {};
  if (!runId) {
    return res.status(400).json({ error: 'runId is required for cancellation' });
  }
  const cancelled = cancelRuntimeProcess(runId);
  return res.json({ success: true, cancelled, runId });
});

app.get('/api/runtime/:projectId/state', (req, res) => {
  const { projectId } = req.params;
  const rt = getOrCreateRuntime(projectId);
  return res.json({ success: true, runtime: rt });
});

app.post('/api/runtime/:projectId/polling/start', (req, res) => {
  const { projectId } = req.params;
  const { token } = req.body || {};
  if (!token) return res.status(400).json({ error: 'token is required' });
  startServerTelegramPolling(projectId, token);
  return res.json({ success: true, pollingEnabled: true, projectId });
});

app.post('/api/runtime/:projectId/polling/stop', (req, res) => {
  const { projectId } = req.params;
  stopServerTelegramPolling(projectId);
  return res.json({ success: true, pollingEnabled: false, projectId });
});

app.post(['/api/runtime/:projectId/dispatch', '/api/runtime/dispatch'], async (req, res) => {
  const { projectId } = req.params;
  const body = req.body || {};
  const {
    commandId,
    runId = `run-${Date.now()}`,
    command,
    code,
    stdin,
    cwd,
    files,
    sessionId,
    projectName = projectId || 'domain_to_ip_bot',
  } = body;

  const rawCmd = (command || code || '').trim();
  if (!rawCmd) {
    return res.status(400).json({ error: 'Command or code is required' });
  }

  // Idempotency: Reject or return duplicate command executed within 60s
  if (commandId) {
    const cached = checkIdempotency(commandId);
    if (cached) {
      return res.json(cached);
    }
  }

  const isPython = /^(?:python[3]?|py)\b/i.test(rawCmd) || body.type === 'python';
  registerProcess(
    runId,
    projectName,
    isPython ? 'python' : 'shell',
    rawCmd,
    sessionId
  );

  try {
    let result: any;
    if (isPython) {
      result = await executePythonCode(rawCmd, false, false, stdin);
    } else {
      result = await executeTerminalCommand(rawCmd, cwd, sessionId, projectName, files, stdin);
    }

    const responseData = {
      success: result.success ?? (result.exitCode === 0),
      commandId: commandId || runId,
      runId,
      stdout: result.stdout || '',
      stderr: result.stderr || '',
      exitCode: result.exitCode ?? 0,
      executionTimeMs: result.executionTimeMs || 20,
      cwd: result.cwd !== undefined ? result.cwd : cwd,
      filesUpdated: (result as any).filesUpdated,
    };

    completeProcess(runId, responseData.exitCode);
    if (commandId) {
      saveIdempotency(commandId, responseData);
    }

    return res.json(responseData);
  } catch (err: any) {
    completeProcess(runId, 1);
    return res.status(500).json({
      success: false,
      commandId: commandId || runId,
      runId,
      stdout: '',
      stderr: err.message,
      exitCode: 1,
      executionTimeMs: 10,
    });
  }
});

// Native Backend Execution Engine (/api/tools/execute, /api/terminal, etc.) for cURL, Python, Web Search, and Bash/Terminal
app.all(['/api/tools/execute', '/api/terminal', '/api/terminal/*', '/terminal', '/terminal/*', '/api/tools/terminal'], async (req: express.Request, res: express.Response) => {
  if (req.method === 'GET') {
    return res.json({
      status: 'active',
      service: 'SudaStack Native Command & Terminal Execution Engine',
      supported: ['curl', 'python', 'web-search', 'search', 'bash', 'terminal'],
      description: 'Executes curl, python, web search, and terminal/bash commands directly with timeout and output capture for autonomous agent loops.',
    });
  }

  try {
    let body = req.body;
    if (typeof body === 'string') {
      try {
        body = JSON.parse(body);
      } catch {}
    }
    const { type, command, code, cwd, sessionId, persistent, background, projectName, files, stdin } = body || {};

    if (!type || (!command && !code)) {
      return res.status(400).json({ error: 'Missing type or command/code parameter' });
    }

    if (type === 'curl') {
      const result = await executeCurlCommand(command || code || '');
      return res.json(result);
    } else if (type === 'python') {
      const result = await executePythonCode(code || command || '', false, !!persistent || !!background, stdin);
      return res.json(result);
    } else if (type === 'web-search' || type === 'search') {
      const result = await performWebSearch(command || code || '');
      return res.json({
        success: result.success,
        type: 'web-search',
        command: command || code || '',
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
      const target = body?.url || command || code || '';
      const result = await exploreAndActOnUrl(target, body?.action || body?.actionTarget);
      return res.json(result);
    } else if (type === 'pip' || type === 'pip-install' || type === 'install-package') {
      const rawPkgString = command || code || (Array.isArray(body?.packages) ? body.packages.join(' ') : '');
      const pkgs = rawPkgString
        .replace(/^(?:pip3?|python3?\s+-m\s+pip)\s+install\s+/i, '')
        .split(/\s+/)
        .filter(Boolean);
      const startTime = Date.now();
      const resInstall = await installPythonPackages(pkgs);
      return res.json({
        success: resInstall.success,
        type: 'pip',
        command: `pip install ${pkgs.join(' ')}`,
        stdout: resInstall.output,
        stderr: resInstall.success ? '' : resInstall.output,
        exitCode: resInstall.success ? 0 : 1,
        executionTimeMs: Date.now() - startTime,
      });
    } else if (type === 'bash' || type === 'terminal' || type === 'shell') {
      const result = await executeTerminalCommand(command || code || '', cwd, sessionId, projectName, files, stdin);
      return res.json(result);
    } else {
      return res.status(400).json({ error: `Unsupported tool execution type: ${type}` });
    }
  } catch (err: any) {
    return res.status(500).json({ error: `Command execution failed: ${err.message}` });
  }
});

// Sandbox Zip Upload and Extraction Route
app.post('/api/sandbox/upload-zip', async (req, res) => {
  try {
    const { fileBase64, projectName, zipData } = req.body || {};
    const b64 = fileBase64 || zipData;
    if (!b64) {
      return res.status(400).json({ error: 'Missing fileBase64 or zipData' });
    }
    const buffer = Buffer.from(b64.replace(/^data:[^;]+;base64,/, ''), 'base64');
    const result = await uploadAndExtractZip(buffer, projectName || 'project');
    return res.json(result);
  } catch (err: any) {
    return res.status(500).json({ error: `Zip upload & extraction failed: ${err.message}` });
  }
});

// Get User Folders Route (Updated files vs Sandbox files)
app.get('/api/sandbox/folders', (_req, res) => {
  try {
    const folders = getUserFolders();
    return res.json(folders);
  } catch (err: any) {
    return res.status(500).json({ error: `Failed to retrieve user folders: ${err.message}` });
  }
});

// Dedicated Web Exploration & Interaction Route (/api/tools/web-explore)
app.all(['/api/tools/py_run', '/api/py_run'], async (req: express.Request, res: express.Response) => {
  if (req.method === 'GET') {
    return res.json({ status: 'active', service: 'SudaStack Python Runner' });
  }
  try {
    const body = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : req.body || {};
    const result = await executePythonCode(body.code || body.command || '', false, !!body?.persistent || !!body?.background);
    return res.json(result);
  } catch (err: any) {
    return res.status(500).json({ error: `Python execution failed: ${err.message}` });
  }
});

app.all(['/api/tools/web-explore', '/api/tools/explore'], async (req: express.Request, res: express.Response) => {
  if (req.method === 'GET') {
    const url = (req.query.url || req.query.target || req.query.q) as string;
    const action = req.query.action as string;
    if (url) {
      const result = await exploreAndActOnUrl(url, action);
      return res.json(result);
    }
    return res.json({
      status: 'active',
      service: 'SudaStack Autonomous Web Exploration & Action Engine',
      description: 'Explores platforms, extracts interactive elements and executes actions (like clicking login) in the background.',
    });
  }

  try {
    let body = req.body;
    if (typeof body === 'string') {
      try {
        body = JSON.parse(body);
      } catch {}
    }
    const target = body?.url || body?.command || body?.target || '';
    const action = body?.action || body?.actionTarget;
    if (!target) {
      return res.status(400).json({ error: 'Target URL or platform command is required' });
    }
    const result = await exploreAndActOnUrl(target, action);
    return res.json(result);
  } catch (err: any) {
    return res.status(500).json({ error: `Web exploration failed: ${err.message}` });
  }
});

// Dedicated Web Search Route (/api/tools/web-search)
app.all(['/api/tools/web-search', '/api/tools/search'], async (req: express.Request, res: express.Response) => {
  if (req.method === 'GET') {
    const query = (req.query.q || req.query.query) as string;
    if (query) {
      const result = await performWebSearch(query);
      return res.json(result);
    }
    return res.json({
      status: 'active',
      service: 'SudaStack Live Web Search Engine',
      description: 'Search the live web for real-time information, docs, and news.',
    });
  }

  try {
    let body = req.body;
    if (typeof body === 'string') {
      try {
        body = JSON.parse(body);
      } catch {}
    }
    const query = body?.q || body?.query || body?.command || '';
    if (!query) {
      return res.status(400).json({ error: 'Query is required' });
    }
    const result = await performWebSearch(query);
    return res.json(result);
  } catch (err: any) {
    return res.status(500).json({ error: `Web search failed: ${err.message}` });
  }
});

// Production System Health & Sandbox Telemetry (/api/system/health)
app.get('/api/system/health', (_req, res) => {
  const telemetry = getSystemHealthTelemetry();
  res.json(telemetry);
});

// Gemini-style Web Scraping & Content Extraction Engine (/api/tools/scrape-url)
app.all('/api/tools/scrape-url', async (req: express.Request, res: express.Response) => {
  if (req.method === 'GET') {
    const url = req.query.url as string;
    if (url) {
      const result = await scrapeAndAnalyzeUrl(url);
      return res.json(result);
    }
    return res.json({
      status: 'active',
      service: 'SudaStack Web Scraping & Content Extraction Engine',
      description: 'Extracts clean webpage content, metadata, and text like Gemini for AI analysis.',
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
});

// MCP & Discovery Endpoints
app.get('/api/mcp/stats', (_req, res) => {
  res.json({
    status: 'healthy',
    platform: 'SudaStack AI Workspace & MCP Server',
    protocolVersion: '2024-11-05',
    totalZeroTokenHits: 42,
    cachedPromptsCount: 14,
    tokensSaved: 42 * 1850,
    activeFilesCount: 4,
    tools: [
      'sudastack_list_files',
      'sudastack_get_file',
      'sudastack_save_file',
      'sudastack_delete_file',
      'sudastack_architect_platform',
      'sudastack_deploy_project',
      'sudastack_get_system_stats',
    ],
  });
});

app.all(['/api/mcp/rpc', '/api/mcp'], (req, res) => {
  if (req.method === 'GET') {
    return res.json({
      status: 'active',
      name: 'sudastack-mcp-server',
      protocolVersion: '2024-11-05',
      endpoint: '/api/mcp/rpc',
      sseEndpoint: '/api/mcp/sse',
      openApiSpec: '/api/openapi.json',
    });
  }
  const body = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : req.body || {};
  const { id = null, method } = body;
  if (method === 'initialize') {
    return res.json({
      jsonrpc: '2.0',
      id,
      result: {
        protocolVersion: '2024-11-05',
        capabilities: { tools: { listChanged: true }, resources: { listChanged: true } },
        serverInfo: { name: 'sudastack-mcp-server', version: '2.5.0' },
      },
    });
  }
  if (method === 'ping') {
    return res.json({ jsonrpc: '2.0', id, result: {} });
  }
  return res.json({ jsonrpc: '2.0', id, result: { tools: [] } });
});

app.get('/api/mcp/sse', (req, res) => {
  const host = (req.headers['x-forwarded-host'] as string) || req.headers.host || 'sudastack.iqra4you.com';
  const proto = (req.headers['x-forwarded-proto'] as string) || 'https';
  res.setHeader('Content-Type', 'text/event-stream; charset=utf-8');
  res.setHeader('Cache-Control', 'no-cache, no-transform');
  res.setHeader('Connection', 'keep-alive');
  res.write(`event: endpoint\ndata: ${proto}://${host}/api/mcp/rpc\n\n`);
  const keepAlive = setInterval(() => {
    try {
      res.write(': keep-alive\n\n');
    } catch {
      clearInterval(keepAlive);
    }
  }, 15000);
  req.on('close', () => clearInterval(keepAlive));
});

app.get('/api/privacy', (_req, res) => {
  res.json({
    name: 'SudaStack AI Workspace',
    privacyPolicy: 'https://sudastack.iqra4you.com/privacy',
    dataUsage: 'Data is strictly used to generate, architect, and store web applications requested by the user.',
  });
});

async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const viteModuleName = 'vite';
    const { createServer: createViteServer } = await import(viteModuleName);
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(ROOT_DIR, 'dist');
    if (fs.existsSync(distPath)) {
      app.use(express.static(distPath));
    }
    app.get('*', (req, res, next) => {
      if (req.path.startsWith('/api/')) return next();
      const distIndex = path.resolve(distPath, 'index.html');
      if (fs.existsSync(distIndex)) {
        return res.sendFile(distIndex);
      }
      const rootIndex = path.resolve(ROOT_DIR, 'index.html');
      if (fs.existsSync(rootIndex)) {
        return res.sendFile(rootIndex);
      }
      res.status(200).send('<!doctype html><html><head><meta charset="utf-8"><title>SudaStack</title></head><body><div id="root"></div></body></html>');
    });
  }

  const port = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;
  app.listen(port, '0.0.0.0', () => {
    console.log(`Server running on http://localhost:${port}`);
  });
}

startServer();

export default app;

