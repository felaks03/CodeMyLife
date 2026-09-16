import { execFile } from 'child_process';
import { promisify } from 'util';

const execFileAsync = promisify(execFile);
type ExecFileAsync = (file: string, args: string[]) => Promise<unknown>;

export class DesktopAppGuard {
  private blockedProcesses: string[] = [];
  private protectedProcesses = new Set<string>();
  private timer: NodeJS.Timeout | null = null;

  constructor(private readonly runProcess: ExecFileAsync = execFileAsync) {}

  async setBlocked(processes: string[], blocked: boolean, protectedProcesses: string[] = []): Promise<void> {
    const nextProcesses = blocked ? [...new Set(processes)] : [];
    const nextProtectedProcesses = new Set(protectedProcesses.map((processName) => processName.toLowerCase()));
    if (
      JSON.stringify(nextProcesses) === JSON.stringify(this.blockedProcesses) &&
      this.sameProtectedProcesses(nextProtectedProcesses)
    ) return;
    this.blockedProcesses = nextProcesses;
    this.protectedProcesses = nextProtectedProcesses;
    if (blocked) {
      await this.closeBlockedProcesses();
      if (!this.timer) {
        this.timer = setInterval(() => void this.closeBlockedProcesses(), 1000);
      }
      return;
    }
    this.stop();
  }

  private sameProtectedProcesses(nextProcesses: Set<string>): boolean {
    if (nextProcesses.size !== this.protectedProcesses.size) return false;
    for (const processName of nextProcesses) {
      if (!this.protectedProcesses.has(processName)) return false;
    }
    return true;
  }

  stop(): void {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
    this.blockedProcesses = [];
    this.protectedProcesses.clear();
  }

  private async closeBlockedProcesses(): Promise<void> {
    for (const processName of this.blockedProcesses) {
      if (this.protectedProcesses.has(processName.toLowerCase())) continue;
      try {
        await this.runProcess('taskkill.exe', ['/F', '/IM', processName, '/T']);
      } catch {
        // The process is normally absent; taskkill returns an error in that case.
      }
    }
    if (this.blockedProcesses.includes('steam.exe')) {
      await this.closeSteamLibraryProcesses();
    }
  }

  private async closeSteamLibraryProcesses(): Promise<void> {
    const protectedNames = [...this.protectedProcesses].map((processName) => `'${processName.replace(/'/g, "''")}'`).join(', ');
    const protectedFilter = protectedNames
      ? `-and -not (@(${protectedNames}) -contains $_.Name.ToLowerInvariant())`
      : '';
    const command = [
      '$pattern = "\\\\steamapps\\\\common\\\\"',
      'Get-CimInstance Win32_Process',
      `| Where-Object { $_.ExecutablePath -and $_.ExecutablePath -match $pattern ${protectedFilter} }`,
      '| ForEach-Object { Stop-Process -Id $_.ProcessId -Force -ErrorAction SilentlyContinue }'
    ].join(' ');

    try {
      await this.runProcess('powershell.exe', ['-NoProfile', '-NonInteractive', '-ExecutionPolicy', 'Bypass', '-Command', command]);
    } catch {
      // Process enumeration is best-effort; known processes are still handled above.
    }
  }
}
