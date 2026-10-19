import { RuntimeProcess } from '../types';

interface ProjectRuntimeInternal {
  id: string;
  name: string;
  status: 'stopped' | 'running' | 'cancelling' | 'error';
  activeRunId: string | null;
  lastHeartbeat: number;
  pendingCommandCount: number;
  pollingEnabled: boolean;
  telegramToken?: string;
  pollingTimer?: any;
}

// In-memory active processes
const activeProcesses = new Map<string, RuntimeProcess>();
// Map of runId -> AbortController
const abortControllers = new Map<string, AbortController>();
// Map of runId -> spawned ChildProcess / kill handle
const childProcessHandles = new Map<string, any>();
// Idempotency cache (commandId -> timestamp & result)
const idempotencyCache = new Map<string, { timestamp: number; result: any }>();
// Project runtimes
const runtimes = new Map<string, ProjectRuntimeInternal>();

// Clean expired idempotency entries every minute
setInterval(() => {
  const now = Date.now();
  for (const [id, entry] of idempotencyCache.entries()) {
    if (now - entry.timestamp > 60000) {
      idempotencyCache.delete(id);
    }
  }
}, 30000);

export function getOrCreateRuntime(projectId: string, name?: string): ProjectRuntimeInternal {
  let rt = runtimes.get(projectId);
  if (!rt) {
    rt = {
      id: projectId,
      name: name || projectId,
      status: 'stopped',
      activeRunId: null,
      lastHeartbeat: Date.now(),
      pendingCommandCount: 0,
      pollingEnabled: false,
    };
    runtimes.set(projectId, rt);
  }
  rt.lastHeartbeat = Date.now();
  return rt;
}

export function getAllActiveProcesses(): RuntimeProcess[] {
  return Array.from(activeProcesses.values());
}

export function getProcessesForProject(projectId: string): RuntimeProcess[] {
  return Array.from(activeProcesses.values()).filter((p) => p.projectId === projectId);
}

export function registerProcess(
  runId: string,
  projectId: string,
  type: 'python' | 'shell' | 'polling',
  command: string,
  sessionId?: string
): { process: RuntimeProcess; controller: AbortController } {
  const controller = new AbortController();
  abortControllers.set(runId, controller);

  const proc: RuntimeProcess = {
    runId,
    projectId,
    sessionId,
    type,
    status: 'running',
    startedAt: Date.now(),
    abortToken: `abort-${runId}-${Date.now()}`,
    command,
  };

  activeProcesses.set(runId, proc);

  const rt = getOrCreateRuntime(projectId);
  rt.status = 'running';
  rt.activeRunId = runId;
  rt.pendingCommandCount = (rt.pendingCommandCount || 0) + 1;

  return { process: proc, controller };
}

export function attachChildProcess(runId: string, child: any) {
  childProcessHandles.set(runId, child);
}

export function completeProcess(runId: string, exitCode: number = 0) {
  const proc = activeProcesses.get(runId);
  if (proc) {
    proc.status = exitCode === 0 ? 'stopped' : 'failed';
    proc.stoppedAt = Date.now();
    proc.exitCode = exitCode;
    activeProcesses.set(runId, proc);

    const rt = runtimes.get(proc.projectId);
    if (rt) {
      if (rt.activeRunId === runId) {
        rt.activeRunId = null;
        rt.status = 'stopped';
      }
      rt.pendingCommandCount = Math.max(0, (rt.pendingCommandCount || 1) - 1);
    }
  }

  abortControllers.delete(runId);
  childProcessHandles.delete(runId);
}

export function cancelProcess(runId: string): boolean {
  const proc = activeProcesses.get(runId);
  if (proc) {
    proc.status = 'cancelling';
  }

  // 1. Signal AbortController
  const controller = abortControllers.get(runId);
  if (controller) {
    controller.abort();
    abortControllers.delete(runId);
  }

  // 2. Kill spawned OS child process if present (Immediate <= 2s)
  const child = childProcessHandles.get(runId);
  if (child) {
    try {
      child.kill('SIGTERM');
      setTimeout(() => {
        try {
          child.kill('SIGKILL');
        } catch {}
      }, 1000);
    } catch {}
    childProcessHandles.delete(runId);
  }

  if (proc) {
    proc.status = 'stopped';
    proc.stoppedAt = Date.now();
    proc.exitCode = 130;
    activeProcesses.set(runId, proc);

    const rt = runtimes.get(proc.projectId);
    if (rt && rt.activeRunId === runId) {
      rt.activeRunId = null;
      rt.status = 'stopped';
    }
  }

  return true;
}

export function checkIdempotency(commandId: string): any | null {
  const entry = idempotencyCache.get(commandId);
  if (entry && Date.now() - entry.timestamp <= 60000) {
    return entry.result;
  }
  return null;
}

export function saveIdempotency(commandId: string, result: any) {
  idempotencyCache.set(commandId, {
    timestamp: Date.now(),
    result,
  });
}

/**
 * Server-Authoritative Background Telegram Polling (Always-On single-threaded loop)
 */
export function startServerTelegramPolling(
  projectId: string,
  token: string,
  onEvent?: (text: string) => void
) {
  const rt = getOrCreateRuntime(projectId);
  rt.pollingEnabled = true;
  rt.telegramToken = token;

  if (rt.pollingTimer) {
    clearInterval(rt.pollingTimer);
  }

  let offset = 0;
  const pollTask = async () => {
    if (!rt.pollingEnabled) return;
    try {
      const res = await fetch(`https://api.telegram.org/bot${token}/getUpdates?offset=${offset}&timeout=5`);
      if (res.ok) {
        const data: any = await res.json();
        if (data.ok && Array.isArray(data.result) && data.result.length > 0) {
          for (const upd of data.result) {
            offset = upd.update_id + 1;
            const msgText = upd.message?.text || JSON.stringify(upd);
            const user = upd.message?.from?.username || upd.message?.from?.first_name || 'User';
            const logStr = `📩 [Telegram Update] From @${user}: ${msgText}`;
            if (onEvent) onEvent(logStr);
          }
        }
      }
    } catch {
      // transient network wait
    }
  };

  rt.pollingTimer = setInterval(pollTask, 20000); // 20s interval rule
  pollTask();
}

export function stopServerTelegramPolling(projectId: string) {
  const rt = runtimes.get(projectId);
  if (rt) {
    rt.pollingEnabled = false;
    if (rt.pollingTimer) {
      clearInterval(rt.pollingTimer);
      rt.pollingTimer = null;
    }
  }
}
