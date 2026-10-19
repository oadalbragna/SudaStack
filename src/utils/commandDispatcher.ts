/**
 * SudaStack commandDispatcher stub (compatibility export)
 */
export function dispatchCommand(command: string, context?: any) {
  return { success: true, command, stdout: '', stderr: '', exitCode: 0 };
}
