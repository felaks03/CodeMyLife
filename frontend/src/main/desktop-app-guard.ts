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
  }
}
