import { app } from 'electron';
import { execFile } from 'child_process';
import { promises as fs } from 'fs';
import * as path from 'path';
import { promisify } from 'util';

const execFileAsync = promisify(execFile);

export const WATCHDOG_TASK_NAME = 'CodeMyLife Watchdog';
export const WATCHDOG_DISABLED_FILE = 'watchdog-disabled.json';

export function isSilentLaunch(commandLine = process.argv): boolean {
  return commandLine.some((argument) => ['--silent', '--background', '--watchdog'].includes(argument));
}

export function createWatchdogTaskArgs(executablePath: string): string[] {
  return [
    '/Create',
    '/SC',
    'MINUTE',
    '/MO',
    '5',
    '/TN',
    WATCHDOG_TASK_NAME,
    '/TR',
    `"${executablePath}" --silent`,
    '/RL',
    'HIGHEST',
    '/F'
  ];
}

export function deleteWatchdogTaskArgs(): string[] {
  return ['/Delete', '/TN', WATCHDOG_TASK_NAME, '/F'];
}

export async function ensureWatchdogTask(executablePath: string): Promise<void> {
  if (!app.isPackaged) return;
  await execFileAsync('schtasks.exe', createWatchdogTaskArgs(executablePath));
  await allowWatchdogOnBattery().catch(() => undefined);
}

async function allowWatchdogOnBattery(): Promise<void> {
  const command = [
    `$task = Get-ScheduledTask -TaskName '${WATCHDOG_TASK_NAME}'`,
    '$task.Settings.DisallowStartIfOnBatteries = $false',
    '$task.Settings.StopIfGoingOnBatteries = $false',
    'Set-ScheduledTask -InputObject $task | Out-Null'
  ].join('; ');
  await execFileAsync('powershell.exe', ['-NoProfile', '-NonInteractive', '-ExecutionPolicy', 'Bypass', '-Command', command]);
}

export async function removeWatchdogTask(): Promise<void> {
  try {
    await execFileAsync('schtasks.exe', deleteWatchdogTaskArgs());
  } catch {
    // The task may not exist yet.
  }
}

export async function disableWatchdogUntilManualLaunch(): Promise<void> {
  await fs.mkdir(app.getPath('userData'), { recursive: true });
  await fs.writeFile(disabledFile(), JSON.stringify({ disabledAt: new Date().toISOString() }), 'utf8');
}

export async function enableWatchdogAfterManualLaunch(): Promise<void> {
  try {
    await fs.unlink(disabledFile());
  } catch {
    // Already enabled.
  }
}

export async function isWatchdogDisabled(): Promise<boolean> {
  try {
    await fs.access(disabledFile());
    return true;
  } catch {
    return false;
  }
}

function disabledFile(): string {
  return path.join(app.getPath('userData'), WATCHDOG_DISABLED_FILE);
}