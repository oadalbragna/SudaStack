/**
 * SudaStack IdempotencyLayer
 * Prevents duplicate executions by hashing (sessionId + command + 5s time bucket)
 * and rejecting or reusing recent identical executions.
 */

interface CachedExecution {
  executionId: string;
  result: any;
  timestamp: number;
}

class IdempotencyLayerService {
  private cache = new Map<string, CachedExecution>();
  private WINDOW_MS = 5000; // 5 seconds deduplication window

  public generateId(sessionId: string, command: string): string {
    const bucket = Math.floor(Date.now() / this.WINDOW_MS);
    const raw = `${sessionId}:${command.trim():bucket}`;
    let hash = 0;
    for (let i = 0; i < raw.length; i++) {
      const char = raw.charCodeAt(i);
      hash = (hash << 5) - hash + char;
      hash |= 0;
    }
    return `exec_${Math.abs(hash)}_${bucket}`;
  }

  public checkAndRegister(executionId: string): boolean {
    const now = Date.now();
    // Clean expired entries
    for (const [id, item] of this.cache.entries()) {
      if (now - item.timestamp > this.WINDOW_MS * 2) {
        this.cache.delete(id);
      }
    }

    if (this.cache.has(executionId)) {
      return false; // Already executed recently (duplicate)
    }
    return true;
  }

  public cacheResult(executionId: string, result: any): void {
    this.cache.set(executionId, {
      executionId,
      result,
      timestamp: Date.now(),
    });
  }

  public getCached(executionId: string): any | null {
    const item = this.cache.get(executionId);
    if (item && Date.now() - item.timestamp <= this.WINDOW_MS) {
      return item.result;
    }
    return null;
  }
}

export const idempotencyLayer = new IdempotencyLayerService();
