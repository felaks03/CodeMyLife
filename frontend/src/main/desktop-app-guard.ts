import { execFile } from 'child_process';
import { promisify } from 'util';

const execFileAsync = promisify(execFile);

export class DesktopAppGuard {
  private blockedProcesses: string[] = [];
  private timer: NodeJS.Timeout | null = null;

  async setBlocked(processes: string[], blocked: boolean): Promise<void> {
    const nextProcesses = blocked ? [...new Set(processes)] : [];
    if (JSON.stringify(nextProcesses) === JSON.stringify(this.blockedProcesses)) return;
    this.blockedProcesses = nextProcesses;
    if (blocked) {
      await this.closeBlockedProcesses();
      if (!this.timer) {
        this.timer = setInterval(() => void this.closeBlockedProcesses(), 1000);
      }
      return;
    }
    this.stop();
  }

  stop(): void {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
    this.blockedProcesses = [];
  }

  private async closeBlockedProcesses(): Promise<void> {
    for (const processName of this.blockedProcesses) {
      try {
        await execFileAsync('taskkill.exe', ['/F', '/IM', processName, '/T']);
      } catch {
        // The process is normally absent; taskkill returns an error in that case.
      }
    }
    if (this.blockedProcesses.includes('steam.exe')) {
      await this.closeSteamLibraryProcesses();
    }
  }

  private async closeSteamLibraryProcesses(): Promise<void> {
    const command = [
      '$pattern = "\\\\steamapps\\\\common\\\\"',
      'Get-CimInstance Win32_Process',
      '| Where-Object { $_.ExecutablePath -and $_.ExecutablePath -match $pattern }',
      '| ForEach-Object { Stop-Process -Id $_.ProcessId -Force -ErrorAction SilentlyContinue }'
    ].join(' ');

    try {
      await execFileAsync('powershell.exe', ['-NoProfile', '-NonInteractive', '-ExecutionPolicy', 'Bypass', '-Command', command]);
    } catch {
      // Process enumeration is best-effort; known processes are still handled above.
    }
  }
}
