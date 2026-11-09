import { DispatchCommandOptions, DispatchCommandResult } from '../types';

export async function dispatchCommand(
  optionsOrCommand: string | DispatchCommandOptions,
  contextOrOnFilesUpdated?: any
): Promise<DispatchCommandResult> {
  let options: DispatchCommandOptions;
  let onFilesUpdated: ((files: any[]) => void) | undefined;

  if (typeof optionsOrCommand === 'string') {
    options = {
      command: optionsOrCommand,
      projectName: contextOrOnFilesUpdated?.projectName || 'default',
      sessionId: contextOrOnFilesUpdated?.sessionId,
      signal: contextOrOnFilesUpdated?.signal,
    };
    onFilesUpdated = contextOrOnFilesUpdated?.onFilesUpdated;
  } else {
    options = optionsOrCommand;
    onFilesUpdated = contextOrOnFilesUpdated;
  }

  const startTime = Date.now();
  const runId = options.runId || `run_${Date.now()}`;
  const commandId = options.commandId || `cmd_${Date.now()}`;

  try {
    const res = await fetch('/api/runtime/dispatch', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        commandId,
        runId,
        command: options.command,
        stdin: options.stdin,
        cwd: options.cwd,
        files: options.files,
        sessionId: options.sessionId,
        projectName: options.projectName,
      }),
      signal: options.signal,
    });

    const data = await res.json();
    const timeMs = Date.now() - startTime;

    if (data.filesUpdated && onFilesUpdated) {
      onFilesUpdated(data.filesUpdated);
    }

    return {
      commandId: data.commandId || commandId,
      runId: data.runId || runId,
      stdout: data.stdout || '',
      stderr: data.stderr || '',
      exitCode: data.exitCode ?? (data.success ? 0 : 1),
      timeMs: data.executionTimeMs || timeMs,
      filesUpdated: data.filesUpdated,
      cwd: data.cwd,
    };
  } catch (err: any) {
    if (err.name === 'AbortError') {
      return {
        commandId,
        runId,
        stdout: '',
        stderr: 'Process cancelled by user',
        exitCode: 130,
        timeMs: Date.now() - startTime,
        cancelled: true,
      };
    }
    return {
      commandId,
      runId,
      stdout: '',
      stderr: err.message || 'Execution error',
      exitCode: 1,
      timeMs: Date.now() - startTime,
    };
  }
}

export async function cancelProcess(runId: string, projectName?: string): Promise<boolean> {
  try {
    const res = await fetch(`/api/runtime/cancel`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ runId, projectName }),
    });
    const data = await res.json();
    return data.success ?? true;
  } catch {
    return true;
  }
}

export function generateUUID(): string {
  return 'uuid_' + Math.random().toString(36).substring(2, 9);
}
