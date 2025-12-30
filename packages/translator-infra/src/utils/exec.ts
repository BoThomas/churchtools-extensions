import { exec as execCallback } from 'node:child_process';
import { promisify } from 'node:util';

const execAsync = promisify(execCallback);

export interface ExecResult {
  stdout: string;
  stderr: string;
}

export async function exec(command: string): Promise<ExecResult> {
  try {
    const { stdout, stderr } = await execAsync(command, {
      maxBuffer: 10 * 1024 * 1024,
    });
    return { stdout: stdout.trim(), stderr: stderr.trim() };
  } catch (error) {
    const err = error as Error & { stdout?: string; stderr?: string };
    throw new Error(err.stderr || err.message);
  }
}

export async function execJson<T>(command: string): Promise<T> {
  const { stdout } = await exec(command);
  return JSON.parse(stdout) as T;
}
