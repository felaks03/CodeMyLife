import { execFile } from 'child_process';
import { promisify } from 'util';

const execFileAsync = promisify(execFile);
const RULE_NAME = 'CodeMyLife - Chrome blocked during Instagram';

export class BrowserGuard {
  async blockChrome(): Promise<void> {
    await this.runPowerShell(`
      $paths = @(
        "$env:ProgramFiles\\Google\\Chrome\\Application\\chrome.exe",
        "$env:ProgramFiles(x86)\\Google\\Chrome\\Application\\chrome.exe",
        "$env:LOCALAPPDATA\\Google\\Chrome\\Application\\chrome.exe"
      ) | Where-Object { Test-Path $_ };
      Remove-NetFirewallRule -DisplayName '${RULE_NAME}' -ErrorAction SilentlyContinue;
      foreach ($path in $paths) {
        New-NetFirewallRule -DisplayName '${RULE_NAME}' -Direction Outbound -Action Block -Program $path -Profile Any -ErrorAction Stop | Out-Null;
      }
    `);
  }

  async unblockChrome(): Promise<void> {
    try {
      await this.runPowerShell(`Remove-NetFirewallRule -DisplayName '${RULE_NAME}' -ErrorAction SilentlyContinue`);
    } catch {
      // Cleanup is best-effort during shutdown.
    }
  }

  private async runPowerShell(command: string): Promise<void> {
    try {
      await execFileAsync('powershell.exe', [
        '-NoProfile',
        '-NonInteractive',
        '-ExecutionPolicy',
        'Bypass',
        '-Command',
        command
      ]);
    } catch {
      throw new Error('CodeMyLife necesita permisos de administrador para bloquear Chrome durante el uso de Instagram. Ejecuta run.cmd y acepta UAC.');
    }
  }
}