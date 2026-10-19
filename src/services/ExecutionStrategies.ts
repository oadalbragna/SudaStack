/**
 * SudaStack ExecutionStrategies
 * Implements the Strategy Pattern for routing commands:
 * - BrowserNetworkStrategy (curl, dig, speedtest)
 * - CloudPythonStrategy (Vercel / server execution)
 * - VirtualShellStrategy (Python WebAssembly / Virtual file system shell)
 */

import { executeVirtualTerminalCommand, executeEdgeNetworkCommand } from '../utils/virtualTerminal';
import { runTerminalCommandUniversal } from '../utils/virtualTerminal';
import { processRegistry } from './ProcessRegistry';
import { idempotencyLayer } from './IdempotencyLayer';
import { eventBus } from './EventBus';

export interface ExecutionContext {
  sessionId: string;
  projectName: string;
  files: any[];
  cwd?: string;
  stdin?: string;
}

export interface ExecutionResult {
  stdout: string;
  stderr: string;
  exitCode: number;
  executionTimeMs: number;
  cwd?: string;
  filesUpdated?: any[];
}

export interface ExecutionStrategy {
  canHandle(command: string, context: ExecutionContext): boolean;
  execute(command: string, context: ExecutionContext, signal: AbortSignal): Promise<ExecutionResult>;
  supportsCancellation: boolean;
}

class BrowserNetworkStrategy implements ExecutionStrategy {
  canHandle(command: string): boolean {
    const lower = command.trim().toLowerCase();
    return lower.startsWith('curl ') || lower.startsWith('wget ') || lower.startsWith('dig ') || lower.startsWith('speedtest');
  }

  async execute(command: string, _context: ExecutionContext, signal: AbortSignal): Promise<ExecutionResult> {
    if (signal.aborted) throw new DOMException('Aborted', 'AbortError');
    const startTime = Date.now();
    const res = await executeEdgeNetworkCommand(command);
    if (!res) {
      return {
        stdout: '',
        stderr: 'Network command failed',
        exitCode: 1,
        executionTimeMs: Date.now() - startTime,
      };
    }
    return {
      stdout: res.stdout,
      stderr: res.stderr,
      exitCode: res.exitCode,
      executionTimeMs: res.executionTimeMs,
    };
  }

  supportsCancellation = true;
}

class VirtualShellStrategy implements ExecutionStrategy {
  canHandle(_command: string, _context: ExecutionContext): boolean {
    return true; // Default fallback for all shell & Python commands
  }

  async execute(command: string, context: ExecutionContext, signal: AbortSignal): Promise<ExecutionResult> {
    const startTime = Date.now();
    if (signal.aborted) throw new DOMException('Aborted', 'AbortError');

    // Run via universal virtual terminal / server runner
    const result = await runTerminalCommandUniversal(
      command,
      { name: context.projectName, files: context.files },
      undefined,
      context.stdin,
      context.cwd
    );

    if (signal.aborted) throw new DOMException('Aborted', 'AbortError');

    return {
      stdout: result.stdout,
      stderr: result.stderr,
      exitCode: result.exitCode,
      executionTimeMs: result.timeMs || Date.now() - startTime,
      cwd: result.cwd,
    };
  }

  supportsCancellation = true;
}

class ExecutionRouterService {
  private strategies: ExecutionStrategy[] = [
    new BrowserNetworkStrategy(),
    new VirtualShellStrategy(),
  ];

  public async executeCommand(
    sessionId: string,
    command: string,
    context: ExecutionContext,
    onFilesUpdate?: (files: any[]) => void
  ): Promise<ExecutionResult> {
    const executionId = idempotencyLayer.generateId(sessionId, command);

    // 1. Check idempotency layer (prevent duplicate executions within 5s window)
    const cached = idempotencyLayer.getCached(executionId);
    if (cached) {
      console.log(`[IdempotencyLayer] Duplicate execution blocked for command: "${command}"`);
      return cached;
    }

    if (!idempotencyLayer.checkAndRegister(executionId)) {
      return {
        stdout: '',
        stderr: 'Command execution blocked by IdempotencyLayer (duplicate request).',
        exitCode: 0,
        executionTimeMs: 1,
      };
    }

    const processId = `proc_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
    const abortController = new AbortController();

    // Register in ProcessRegistry
    processRegistry.register({
      processId,
      sessionId,
      executionId,
      command,
      startedAt: Date.now(),
      status: 'running',
      abortController,
    });

    eventBus.emit('process:started', { processId, sessionId, command });

    let strategy = this.strategies.find((s) => s.canHandle(command, context));
    if (!strategy) strategy = new VirtualShellStrategy();

    const startTime = Date.now();
    try {
      const result = await strategy.execute(command, context, abortController.signal);
      processRegistry.updateStatus(processId, 'completed');
      idempotencyLayer.cacheResult(executionId, result);
      return result;
    } catch (err: any) {
      const isAborted = err?.name === 'AbortError' || abortController.signal.aborted;
      const exitCode = isAborted ? 130 : 1;
      const stderr = isAborted ? 'Process cancelled by user.' : (err?.message || 'Execution error');
      processRegistry.updateStatus(processId, isAborted ? 'killed' : 'failed');

      const errorResult: ExecutionResult = {
        stdout: '',
        stderr,
        exitCode,
        executionTimeMs: Date.now() - startTime,
      };
      return errorResult;
    }
  }
}

export const executionRouter = new ExecutionRouterService();
