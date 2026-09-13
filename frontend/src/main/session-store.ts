import { app, safeStorage } from 'electron';
import { promises as fs } from 'fs';
import * as path from 'path';
import { AuthUser } from '../shared/types';

export interface StoredSession {
  token: string | null;
  user: AuthUser;
  guest: boolean;
}

function sessionFile(): string {
  return path.join(app.getPath('userData'), 'session.bin');
}

export class SessionStore {
  private current: StoredSession | null = null;

  async load(): Promise<StoredSession | null> {
    try {
      const raw = await fs.readFile(sessionFile());
      const json = safeStorage.isEncryptionAvailable()
        ? safeStorage.decryptString(raw)
        : raw.toString('utf8');
      this.current = JSON.parse(json) as StoredSession;
    } catch {
      this.current = null;
    }
    return this.current;
  }

  async save(session: StoredSession): Promise<void> {
    const json = JSON.stringify(session);
    const payload = safeStorage.isEncryptionAvailable()
      ? safeStorage.encryptString(json)
      : Buffer.from(json, 'utf8');
    await fs.writeFile(sessionFile(), payload, { mode: 0o600 });
    this.current = session;
  }

  async clear(): Promise<void> {
    this.current = null;
    await fs.rm(sessionFile(), { force: true });
  }

  get session(): StoredSession | null {
    return this.current;
  }
}
