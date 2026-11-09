/**
 * SudaStack Project Runtime Manager
 * Central process, idempotency, and runtime polling manager for server-side tool execution
 */

const activeProcesses = new Map<string, any>();
const idempotencyStore = new Map<string, any>();
const activePollers = new Map<string, any>();

export function registerProcess(
  runId: string,
  projectName: string,
  type: string,
  command: string,
  sessionId?: string
): void {
  activeProcesses.set(runId, {
    runId,
    projectName,
    type,
    command,
    sessionId,
    status: 'running',
    startedAt: Date.now(),
  });
}

export function completeProcess(processId: string, exitCode?: number): void {
  if (activeProcesses.has(processId)) {
    const proc = activeProcesses.get(processId);
    activeProcesses.set(processId, { ...proc, status: 'completed', exitCode });
    setTimeout(() => activeProcesses.delete(processId), 60000); // retain for 1 min
  }
}

export function cancelProcess(processId: string): boolean {
  if (activeProcesses.has(processId)) {
    const proc = activeProcesses.get(processId);
    if (proc && typeof proc.kill === 'function') {
      try {
        proc.kill();
      } catch {}
    }
    activeProcesses.delete(processId);
    return true;
  }
  return false;
}

export function checkIdempotency(key: string): any | null {
  const item = idempotencyStore.get(key);
  if (item && Date.now() - item.timestamp < 10000) {
    return item.result;
  }
  return null;
}

export function saveIdempotency(key: string, result: any): void {
  idempotencyStore.set(key, { result, timestamp: Date.now() });
}

export function getAllActiveProcesses(): any[] {
  return Array.from(activeProcesses.values());
}

export function getOrCreateRuntime(projectId: string): any {
  return {
    projectId,
    status: 'active',
    uptime: '0m',
  };
}

export function startServerTelegramPolling(projectId: string, token: string): void {
  const cleanToken = (token || '').trim();
  if (!cleanToken || activePollers.has(projectId)) return;
  const intervalId = setInterval(() => {
    // Background server polling stub
  }, 3000);
  activePollers.set(projectId, intervalId);
}

export function stopServerTelegramPolling(projectId: string): void {
  if (projectId) {
    if (activePollers.has(projectId)) {
      clearInterval(activePollers.get(projectId));
      activePollers.delete(projectId);
    }
  } else {
    activePollers.forEach((id) => clearInterval(id));
    activePollers.clear();
  }
}
