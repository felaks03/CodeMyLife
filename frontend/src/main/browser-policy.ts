import { execFile } from 'child_process';
import { promisify } from 'util';

const execFileAsync = promisify(execFile);

export const YOUTUBE_SHORTS_POLICY_PATTERNS = [
  '*://youtube.com/shorts*',
  '*://www.youtube.com/shorts*',
  '*://m.youtube.com/shorts*'
];

export const YOUTUBE_SHORTS_POLICY_KEYS = [
  'HKLM\\Software\\Policies\\Google\\Chrome\\URLBlocklist',
  'HKLM\\Software\\Policies\\Microsoft\\Edge\\URLBlocklist',
  'HKCU\\Software\\Policies\\Google\\Chrome\\URLBlocklist',
  'HKCU\\Software\\Policies\\Microsoft\\Edge\\URLBlocklist'
];

export function youtubeShortsPolicyAddArgs(key: string, index: number, pattern: string): string[] {
  return ['ADD', key, '/v', String(9000 + index), '/t', 'REG_SZ', '/d', pattern, '/f'];
}

export function youtubeShortsPolicyDeleteArgs(key: string, index: number): string[] {
  return ['DELETE', key, '/v', String(9000 + index), '/f'];
}

export async function ensureYoutubeShortsBrowserPolicy(): Promise<void> {
  let applied = 0;
  let lastError: unknown;
  for (const key of YOUTUBE_SHORTS_POLICY_KEYS) {
    for (const [index, pattern] of YOUTUBE_SHORTS_POLICY_PATTERNS.entries()) {
      try {
        await execFileAsync('reg.exe', youtubeShortsPolicyAddArgs(key, index + 1, pattern));
        applied += 1;
      } catch (error) {
        lastError = error;
      }
    }
  }
  if (applied === 0) throw lastError instanceof Error ? lastError : new Error('No se pudo registrar la politica de YouTube Shorts.');
}

export async function removeYoutubeShortsBrowserPolicy(): Promise<void> {
  for (const key of YOUTUBE_SHORTS_POLICY_KEYS) {
    for (let index = 1; index <= YOUTUBE_SHORTS_POLICY_PATTERNS.length; index++) {
      try {
        await execFileAsync('reg.exe', youtubeShortsPolicyDeleteArgs(key, index));
      } catch {
        // Policy value may not exist.
      }
    }
  }
}