import { execFile } from 'node:child_process';
import { stat } from 'node:fs/promises';
import { delimiter, dirname, resolve } from 'node:path';

export interface CommandInvocation {
  readonly arguments: readonly string[];
  readonly executable: string;
}

export interface CommandResult {
  readonly stderr: string;
  readonly stdout: string;
}

export interface RunCommandOptions {
  readonly cwd: string;
  readonly label: string;
  readonly timeoutMs: number;
}

export class CommandExecutionError extends Error {
  public readonly exitCode: number | null;
  public readonly kind: 'exit' | 'start' | 'timeout';

  public constructor(message: string, kind: 'exit' | 'start' | 'timeout', exitCode: number | null) {
    super(message);
    this.name = 'CommandExecutionError';
    this.kind = kind;
    this.exitCode = exitCode;
  }
}

export function platformExecutable(name: string): string {
  return process.platform === 'win32' ? `${name}.exe` : name;
}

export async function runCommand(
  invocation: CommandInvocation,
  options: RunCommandOptions,
): Promise<CommandResult> {
  if (!Number.isSafeInteger(options.timeoutMs) || options.timeoutMs <= 0) {
    throw new Error('Command timeout must be a positive integer.');
  }

  return new Promise<CommandResult>((resolvePromise, rejectPromise) => {
    execFile(
      invocation.executable,
      [...invocation.arguments],
      {
        cwd: options.cwd,
        encoding: 'utf8',
        maxBuffer: 4 * 1024 * 1024,
        timeout: options.timeoutMs,
        windowsHide: true,
      },
      (error, stdout, stderr) => {
        if (error === null) {
          resolvePromise({ stderr, stdout });
          return;
        }
        if (error.killed) {
          rejectPromise(
            new CommandExecutionError(
              `${options.label} timed out after ${String(options.timeoutMs)} ms.`,
              'timeout',
              null,
            ),
          );
          return;
        }
        if (typeof error.code === 'number') {
          rejectPromise(
            new CommandExecutionError(
              `${options.label} failed with exit code ${String(error.code)}.`,
              'exit',
              error.code,
            ),
          );
          return;
        }

        rejectPromise(
          new CommandExecutionError(`${options.label} could not be started.`, 'start', null),
        );
      },
    );
  });
}

async function isRegularFile(absolutePath: string): Promise<boolean> {
  try {
    return (await stat(absolutePath)).isFile();
  } catch {
    return false;
  }
}

export async function corepackInvocation(
  argumentsList: readonly string[],
): Promise<CommandInvocation> {
  if (process.platform !== 'win32') {
    return { arguments: argumentsList, executable: 'corepack' };
  }

  const pathValue = process.env['PATH'] ?? process.env['Path'] ?? '';
  const searchDirectories = new Set([dirname(process.execPath), ...pathValue.split(delimiter)]);

  for (const directory of searchDirectories) {
    if (!directory) {
      continue;
    }
    const entryPoint = resolve(directory, 'node_modules', 'corepack', 'dist', 'corepack.js');
    if (await isRegularFile(entryPoint)) {
      return {
        arguments: [entryPoint, ...argumentsList],
        executable: process.execPath,
      };
    }
  }

  throw new CommandExecutionError('Corepack could not be started.', 'start', null);
}
