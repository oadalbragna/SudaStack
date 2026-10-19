/**
 * SudaStack Command Dispatcher (Single Unified Execution Pipeline)
 * Replaces scattered fallbacks with an idempotent, stateful, and cancellable execution pipeline.
 */

import { DispatchCommandOptions, DispatchCommandResult } from '../types';
import { getTerminalRunnerUrl } from './terminalRunnerConfig';
import { executeEdgeNetworkCommand } from './virtualTerminal';

// Active in-flight AbortControllers mapped by runId
const activeAbortControllers = new Map<string, AbortController>();

// 60-second idempotency cache for deduplication
interface CachedExecution {
  timestamp: number;
  promise: Promise<DispatchCommandResult>;
}
const recentCommandIdCache = new Map<string, CachedExecution>();

function cleanExpiredCommandIds() {
  const now = Date.now();
  for (const [id, item] of recentCommandIdCache.entries()) {
    if (now - item.timestamp > 60000) {
      recentCommandIdCache.delete(id);
    }
  }
}

/**
 * Generate a cryptographically strong UUID or fallback
 */
export function generateUUID(): string {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return 'uuid-' + Date.now() + '-' + Math.random().toString(36).substring(2, 9);
}

/**
 * Cancel an active running process immediately across the pipeline
 */
export async function cancelProcess(runId: string, projectId?: string): Promise<boolean> {
  // 1. Abort locally
  const localController = activeAbortControllers.get(runId);
  if (localController) {
    localController.abort();
    activeAbortControllers.delete(runId);
  }

  // 2. Send abort signal to Cloudflare Durable Object / Backend
  try {
    const endpoint = projectId
      ? `/api/runtime/${encodeURIComponent(projectId)}/cancel`
      : '/api/runtime/cancel';

    await fetch(getTerminalRunnerUrl(endpoint), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ runId, projectId }),
      signal: AbortSignal.timeout(2000), // Enforce <= 2s timeout
    });
    return true;
  } catch (err) {
    console.warn('[commandDispatcher] Cancel signal error:', err);
    return !!localController;
  }
}

/**
 * Dispatch command to the stateful runtime with Idempotency & Abort support
 */
export async function dispatchCommand(
  options: DispatchCommandOptions,
  onFilesUpdate?: (files: any[]) => void
): Promise<DispatchCommandResult> {
  cleanExpiredCommandIds();

  const commandId = options.commandId || generateUUID();
  const runId = options.runId || generateUUID();
  const cleanCmd = (options.command || '').trim();

  // Check 60-second Idempotency cache: prevent duplicate executions
  const cached = recentCommandIdCache.get(commandId);
  if (cached && Date.now() - cached.timestamp <= 60000) {
    return cached.promise;
  }

  // Handle clear immediately
  if (cleanCmd === 'clear' || cleanCmd === 'cls') {
    return {
      commandId,
      runId,
      stdout: '[__CLEAR__]',
      stderr: '',
      exitCode: 0,
      timeMs: 1,
      cwd: options.cwd,
    };
  }

  // 1. Browser Network Commands (curl, wget, dig, host, speedtest)
  const isNetworkCmd = /^(?:curl|wget|dig|host|speedtest)\b/i.test(cleanCmd);
  if (isNetworkCmd) {
    const netRes = await executeEdgeNetworkCommand(cleanCmd);
    if (netRes) {
      return {
        commandId,
        runId,
        stdout: netRes.stdout,
        stderr: netRes.stderr,
        exitCode: netRes.exitCode,
        timeMs: netRes.executionTimeMs,
        cwd: options.cwd,
      };
    }
  }

  // Setup AbortController for cancelability
  const controller = new AbortController();
  activeAbortControllers.set(runId, controller);
  if (options.signal) {
    options.signal.addEventListener('abort', () => controller.abort());
  }

  const execPromise = (async (): Promise<DispatchCommandResult> => {
    const startTime = Date.now();
    const projName = options.projectName || 'domain_to_ip_bot';
    const projFiles = options.files || [];

    try {
      // 2. Primary Route: Stateful Cloudflare DO / Edge Runtime
      const targetUrl = options.projectName
        ? getTerminalRunnerUrl(`/api/runtime/${encodeURIComponent(projName)}/dispatch`)
        : getTerminalRunnerUrl('/api/tools/execute');

      const response = await fetch(targetUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'terminal',
          commandId,
          runId,
          sessionId: options.sessionId,
          command: cleanCmd,
          projectName: projName,
          files: projFiles,
          stdin: options.stdin,
          cwd: options.cwd,
        }),
        signal: controller.signal,
      });

      if (response.ok) {
        const text = await response.text();
        if (text && text.trim().startsWith('{')) {
          try {
            const data = JSON.parse(text);

            if (Array.isArray(data.filesUpdated) && onFilesUpdate) {
              onFilesUpdate(data.filesUpdated);
            }

            return {
              commandId,
              runId,
              stdout: data.stdout || '',
              stderr: data.stderr || '',
              exitCode: data.exitCode ?? (data.success ? 0 : 1),
              timeMs: data.executionTimeMs || Date.now() - startTime,
              cwd: data.cwd !== undefined ? data.cwd : options.cwd,
              filesUpdated: data.filesUpdated,
              cancelled: !!data.cancelled,
            };
          } catch {
            // Fall through
          }
        }
      }

      // If /api/runtime was not directly responding, try fallback to /api/tools/execute
      const fallbackRes = await fetch(getTerminalRunnerUrl('/api/tools/execute'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'terminal',
          commandId,
          runId,
          sessionId: options.sessionId,
          command: cleanCmd,
          projectName: projName,
          files: projFiles,
          stdin: options.stdin,
          cwd: options.cwd,
        }),
        signal: controller.signal,
      });

      if (fallbackRes.ok) {
        const fallbackText = await fallbackRes.text();
        if (fallbackText && fallbackText.trim().startsWith('{')) {
          const fallbackData = JSON.parse(fallbackText);
          if (Array.isArray(fallbackData.filesUpdated) && onFilesUpdate) {
            onFilesUpdate(fallbackData.filesUpdated);
          }
          return {
            commandId,
            runId,
            stdout: fallbackData.stdout || '',
            stderr: fallbackData.stderr || '',
            exitCode: fallbackData.exitCode ?? 0,
            timeMs: fallbackData.executionTimeMs || Date.now() - startTime,
            cwd: fallbackData.cwd !== undefined ? fallbackData.cwd : options.cwd,
            filesUpdated: fallbackData.filesUpdated,
          };
        }
      }
    } catch (err: any) {
      if (err.name === 'AbortError' || controller.signal.aborted) {
        return {
          commandId,
          runId,
          stdout: '',
          stderr: '🛑 تم إلغاء العملية فوراً بواسطة إشارة الإيقاف (Process aborted by user)',
          exitCode: 130,
          timeMs: Date.now() - startTime,
          cwd: options.cwd,
          cancelled: true,
        };
      }
    } finally {
      activeAbortControllers.delete(runId);
    }

    // 3. Read-Only Demo Fallback (Offline): Local Virtual Terminal for display only
    const { executeVirtualTerminalCommand } = await import('./virtualTerminal');
    const virtualRes = await executeVirtualTerminalCommand(
      cleanCmd,
      projName,
      projFiles,
      options.cwd,
      options.stdin
    );
    if (virtualRes.filesUpdated && onFilesUpdate) {
      onFilesUpdate(virtualRes.filesUpdated);
    }

    return {
      commandId,
      runId,
      stdout: virtualRes.stdout,
      stderr: virtualRes.stderr,
      exitCode: virtualRes.exitCode,
      timeMs: virtualRes.executionTimeMs,
      cwd: virtualRes.cwd !== undefined ? virtualRes.cwd : options.cwd,
      filesUpdated: virtualRes.filesUpdated,
    };
  })();

  recentCommandIdCache.set(commandId, { timestamp: Date.now(), promise: execPromise });
  return execPromise;
}
