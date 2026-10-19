/**
 * SudaStack commandDispatcher stub & exports
 */
export function dispatchCommand(command: string, context?: any) {
  return { success: true, command, stdout: '', stderr: '', exitCode: 0, timeMs: 1 };
}

export function cancelProcess(processId: string) {
  return true;
}

export function generateUUID(): string {
  return 'uuid_' + Math.random().toString(36).substring(2, 9);
}
