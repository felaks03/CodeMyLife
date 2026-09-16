import { execFile } from 'child_process';
import { promisify } from 'util';

const execFileAsync = promisify(execFile);
const CHECK_INTERVAL_MS = 2_000;

export const YOUTUBE_SHORTS_BROWSER_PROCESSES = ['chrome', 'msedge', 'brave', 'firefox', 'opera'];
export const YOUTUBE_SHORTS_WINDOW_TITLE_PATTERN = '(?i)(^|\\b)shorts(\\b|\\s).*youtube|youtube.*(^|\\b)shorts(\\b|\\s)';

export function youtubeShortsWindowGuardCommand(processNames = YOUTUBE_SHORTS_BROWSER_PROCESSES): string {
  const names = processNames.map((name) => `'${name}'`).join(',');
  return [
    'Get-Process -ErrorAction SilentlyContinue',
    `| Where-Object { @(${names}) -contains $_.ProcessName -and $_.MainWindowTitle -match '${YOUTUBE_SHORTS_WINDOW_TITLE_PATTERN}' }`,
    '| Stop-Process -Force -ErrorAction SilentlyContinue'
  ].join(' ');
}

class YoutubeShortsWindowGuard {
  private timer: NodeJS.Timeout | null = null;

  start(): void {
    if (this.timer) return;
    void this.closeShortsWindows();
    this.timer = setInterval(() => void this.closeShortsWindows(), CHECK_INTERVAL_MS);
  }

  stop(): void {
    if (!this.timer) return;
    clearInterval(this.timer);
    this.timer = null;
  }

  private async closeShortsWindows(): Promise<void> {
    try {
      await execFileAsync('powershell.exe', [
        '-NoProfile',
        '-NonInteractive',
        '-ExecutionPolicy',
        'Bypass',
        '-Command',
        youtubeShortsWindowGuardCommand()
      ]);
    } catch {
      // Best-effort fallback; browser URL policies remain the primary mechanism.
    }
  }
}

export const youtubeShortsWindowGuard = new YoutubeShortsWindowGuard();