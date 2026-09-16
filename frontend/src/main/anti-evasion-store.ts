import { app } from 'electron';
import { promises as fs } from 'fs';
import * as path from 'path';
import { writeJsonAtomic } from './atomic-storage';

export const ANTI_EVASION_UNLOCK_DELAY_MS = 30 * 60 * 1000;

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
  return Date.parse(state.unlockAvailableAt) <= now.getTime();
}

export function beginUnlockDelay(state: AntiEvasionState, now: Date, reason: string): AntiEvasionState {
  const requestedAt = now.toISOString();
  const unlockAvailableAt = new Date(now.getTime() + ANTI_EVASION_UNLOCK_DELAY_MS).toISOString();
  return {
    ...state,
    unlockRequestedAt: state.unlockRequestedAt ?? requestedAt,
    unlockAvailableAt: state.unlockAvailableAt ?? unlockAvailableAt,
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
}

function isAttempt(value: unknown): value is AntiEvasionAttempt {
  const attempt = value as Partial<AntiEvasionAttempt>;
  return typeof attempt?.requestedAt === 'string' && typeof attempt.reason === 'string';
}

export const antiEvasionStore = new AntiEvasionStore();