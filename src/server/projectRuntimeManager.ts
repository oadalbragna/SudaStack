/**
 * SudaStack Project Runtime Manager
 * Central process & idempotency manager for server-side tool execution
 */

const activeProcesses = new Map<string, any>();
const idempotencyStore = new Map<string, any>();

export function registerProcess(processMeta: any): void {
  if (processMeta && processMeta.id) {
    activeProcesses.set(processMeta.id, processMeta);
  }
}

export function completeProcess(processId: string, result?: any): void {
  if (activeProcesses.has(processId)) {
    const proc = activeProcesses.get(processId);
    activeProcesses.set(processId, { ...proc, status: 'completed', result });
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
