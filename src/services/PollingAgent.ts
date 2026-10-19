/**
 * SudaStack PollingAgent
 * Dedicated Telegram polling service that operates completely independently of script execution lifecycle.
 * Prevents UI freezes and duplicate polling, storing offset in localStorage.
 */

import { eventBus } from './EventBus';

interface PollingJob {
  token: string;
  intervalId: any;
  offset: number;
  isActive: boolean;
}

class PollingAgentService {
  private jobs = new Map<string, PollingJob>();

  public startPolling(token: string): void {
    const cleanToken = (token || '').trim();
    if (!cleanToken || this.jobs.has(cleanToken)) return;

    const storageKey = `sudastack_telegram_offset_${cleanToken}`;
    let savedOffset = 0;
    try {
      const stored = localStorage.getItem(storageKey);
      if (stored) savedOffset = parseInt(stored, 10) || 0;
    } catch {}

    const job: PollingJob = {
      token: cleanToken,
      offset: savedOffset,
      isActive: true,
      intervalId: null,
    };

    const pollFn = async () => {
      if (!job.isActive) return;
      try {
        let res: Response | null = null;
        try {
          res = await fetch(`https://sudastack-proxy.iqra4you.com/bot${cleanToken}/getUpdates?offset=${job.offset}&timeout=2`, {
            headers: {
              Accept: 'application/json',
              'CF-Proxy-Route': 'true',
              'X-SudaStack-Target': 'api.telegram.org',
            },
          });
          if (!res.ok && res.status >= 500) res = null;
        } catch {
          res = null;
        }

        if (!res) {
          res = await fetch(`https://api.telegram.org/bot${cleanToken}/getUpdates?offset=${job.offset}&timeout=2`, {
            headers: { Accept: 'application/json' },
          });
        }

        if (res && res.ok) {
          const data = await res.json();
          if (data.ok && Array.isArray(data.result) && data.result.length > 0) {
            for (const update of data.result) {
              job.offset = update.update_id + 1;
              try {
                localStorage.setItem(storageKey, job.offset.toString());
              } catch {}
              eventBus.emit('telegram:update', update);
              eventBus.emit('process:output', {
                command: 'telegram:poll',
                stdout: `[Telegram Update #${update.update_id}]: Message received successfully.`,
              });
            }
          }
        }
      } catch {
        // Transient network retry
      }
    };

    job.intervalId = setInterval(pollFn, 2000);
    this.jobs.set(cleanToken, job);
    eventBus.emit('polling:resumed', { token: cleanToken });
  }

  public stopPolling(token?: string): void {
    if (token) {
      const cleanToken = token.trim();
      const job = this.jobs.get(cleanToken);
      if (job) {
        job.isActive = false;
        if (job.intervalId) clearInterval(job.intervalId);
        this.jobs.delete(cleanToken);
        eventBus.emit('polling:paused', { token: cleanToken });
      }
    } else {
      for (const [t, job] of this.jobs.entries()) {
        job.isActive = false;
        if (job.intervalId) clearInterval(job.intervalId);
        eventBus.emit('polling:paused', { token: t });
      }
      this.jobs.clear();
    }
  }

  public isPolling(token: string): boolean {
    return this.jobs.has(token.trim());
  }
}

export const pollingAgent = new PollingAgentService();
