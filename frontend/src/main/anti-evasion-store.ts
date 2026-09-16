import { app } from 'electron';
import { promises as fs } from 'fs';
import * as path from 'path';
import { writeJsonAtomic } from './atomic-storage';

export const ANTI_EVASION_UNLOCK_DELAY_MS = 5 * 60 * 60 * 1000;
export const ANTI_EVASION_UNLOCK_GRACE_MS = 5 * 60 * 1000;
export const ANTI_EVASION_UNINSTALL_GUARD_FILE = 'anti-evasion-uninstall.json';

export interface AntiEvasionAttempt {
  requestedAt: string;
  reason: string;
}

export interface AntiEvasionState {
  enabled: boolean;
  unlockRequestedAt: string | null;
  unlockAvailableAt: string | null;
  attempts: AntiEvasionAttempt[];
}

function defaultState(): AntiEvasionState {
  return {
    enabled: true,
    unlockRequestedAt: null,
    unlockAvailableAt: null,
    attempts: []
  };
}

export function canDisableBlocking(state: AntiEvasionState, now: Date): boolean {
  if (!state.enabled) return true;
  if (!state.unlockAvailableAt) return false;
  const unlockAvailableMs = Date.parse(state.unlockAvailableAt);
  if (!Number.isFinite(unlockAvailableMs)) return false;
  return unlockAvailableMs <= now.getTime() && now.getTime() <= unlockAvailableMs + ANTI_EVASION_UNLOCK_GRACE_MS;
}

export function isUnlockWindowExpired(state: AntiEvasionState, now: Date): boolean {
  if (!state.unlockAvailableAt) return false;
  const unlockAvailableMs = Date.parse(state.unlockAvailableAt);
  if (!Number.isFinite(unlockAvailableMs)) return true;
  return now.getTime() > unlockAvailableMs + ANTI_EVASION_UNLOCK_GRACE_MS;
}

export function beginUnlockDelay(state: AntiEvasionState, now: Date, reason: string): AntiEvasionState {
  const requestedAt = now.toISOString();
  const unlockAvailableAt = new Date(now.getTime() + ANTI_EVASION_UNLOCK_DELAY_MS).toISOString();
  const resetExpiredWindow = isUnlockWindowExpired(state, now);
  return {
    ...state,
    unlockRequestedAt: resetExpiredWindow ? requestedAt : state.unlockRequestedAt ?? requestedAt,
    unlockAvailableAt: resetExpiredWindow ? unlockAvailableAt : state.unlockAvailableAt ?? unlockAvailableAt,
    attempts: [...state.attempts.slice(-49), { requestedAt, reason }]
  };
}

class AntiEvasionStore {
  private state: AntiEvasionState = defaultState();

  async load(): Promise<void> {
    try {
      const parsed = JSON.parse(await fs.readFile(this.file(), 'utf8')) as Partial<AntiEvasionState>;
      this.state = {
        enabled: parsed.enabled !== false,
        unlockRequestedAt: typeof parsed.unlockRequestedAt === 'string' ? parsed.unlockRequestedAt : null,
        unlockAvailableAt: typeof parsed.unlockAvailableAt === 'string' ? parsed.unlockAvailableAt : null,
        attempts: Array.isArray(parsed.attempts) ? parsed.attempts.filter(isAttempt).slice(-50) : []
      };
    } catch {
      this.state = defaultState();
    }
    await this.writeUninstallGuard().catch(() => undefined);
  }

  get(): AntiEvasionState {
    return this.state;
  }

  canDisable(now: Date): boolean {
    return canDisableBlocking(this.state, now);
  }

  async requestUnlock(now: Date, reason: string): Promise<AntiEvasionState> {
    this.state = beginUnlockDelay(this.state, now, reason);
    await this.save();
    await this.writeUninstallGuard().catch(() => undefined);
    return this.state;
  }

  async resetUnlock(): Promise<void> {
    this.state = {
      ...this.state,
      unlockRequestedAt: null,
      unlockAvailableAt: null
    };
    await this.save();
  }

  private async save(): Promise<void> {
    await fs.mkdir(app.getPath('userData'), { recursive: true });
    await writeJsonAtomic(this.file(), this.state);
  }

  private file(): string {
    return path.join(app.getPath('userData'), 'anti-evasion.json');
  }

  private async writeUninstallGuard(): Promise<void> {
    if (!app.isPackaged) return;
    const directory = path.join(process.env.ProgramData ?? app.getPath('appData'), 'CodeMyLife');
    await fs.mkdir(directory, { recursive: true });
    await writeJsonAtomic(path.join(directory, ANTI_EVASION_UNINSTALL_GUARD_FILE), {
      enabled: this.state.enabled,
      unlockAvailableAt: this.state.unlockAvailableAt
    });
  }
}

function isAttempt(value: unknown): value is AntiEvasionAttempt {
  const attempt = value as Partial<AntiEvasionAttempt>;
  return typeof attempt?.requestedAt === 'string' && typeof attempt.reason === 'string';
}

export const antiEvasionStore = new AntiEvasionStore();