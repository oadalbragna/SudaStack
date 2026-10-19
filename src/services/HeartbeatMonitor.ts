/**
 * SudaStack HeartbeatMonitor
 * Monitors active processes every 2 seconds. If a process stops sending heartbeats
 * for over 10 seconds, it is flagged as stuck and force-killed.
 */

import { processRegistry } from './ProcessRegistry';
import { eventBus } from './EventBus';

class HeartbeatMonitorService {
  private intervalId: any = null;
  private CHECK_INTERVAL_MS = 2000;
  private STUCK_THRESHOLD_MS = 10000;

  public start(): void {
    if (this.intervalId) return;
    this.intervalId = setInterval(() => {
      const now = Date.now();
      const running = processRegistry.getRunning();
      for (const proc of running) {
        if (now - proc.lastHeartbeat > this.STUCK_THRESHOLD_MS) {
          console.warn(`[HeartbeatMonitor] Process ${proc.processId} (${proc.command}) is stuck! Force killing...`);
          processRegistry.kill(proc.processId, 'stuck');
          eventBus.emit('process:stuck', proc);
        }
      }
    }, this.CHECK_INTERVAL_MS);
  }

  public stop(): void {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
  }
}

export const heartbeatMonitor = new HeartbeatMonitorService();
// Automatically start monitoring
if (typeof window !== 'undefined') {
  heartbeatMonitor.start();
}
