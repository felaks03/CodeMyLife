import { app } from 'electron';
import { promises as fs } from 'fs';
import * as path from 'path';
import { randomUUID } from 'crypto';
import { Commitment, NewCommitment } from '../shared/types';
import { BUILTIN_SCRIPTS, searchBuiltinScripts } from '../shared/builtin-scripts';

// Almacena los compromisos del modo invitado solo en este dispositivo, sin backend.
function storeFile(): string {
  return path.join(app.getPath('userData'), 'guest-commitments.json');
}

async function readAll(): Promise<Commitment[]> {
  try {
    return JSON.parse(await fs.readFile(storeFile(), 'utf8')) as Commitment[];
  } catch {
    return [];
  }
}

async function writeAll(commitments: Commitment[]): Promise<void> {
  await fs.writeFile(storeFile(), JSON.stringify(commitments), 'utf8');
}

export const guestStore = {
  list: (): Promise<Commitment[]> => readAll(),

  searchScripts: (query: string) => searchBuiltinScripts(query),

  async create(payload: NewCommitment): Promise<Commitment> {
    if (new Date(payload.endsAt) <= new Date(payload.startsAt)) {
      throw new Error('endsAt debe ser posterior a startsAt.');
    }
    if (payload.endTime <= payload.startTime) {
      throw new Error('endTime debe ser posterior a startTime.');
    }

    const script = BUILTIN_SCRIPTS.find((s) => s._id === payload.scriptId);
    if (!script) {
      throw new Error('Script no encontrado.');
    }

    const customDomains = script.allowCustomDomains
      ? (payload.customDomains ?? []).map((domain) => domain.toLowerCase())
      : [];
    const blockedDomains = [...new Set([...script.blockedDomains, ...customDomains])];

    const commitments = await readAll();
    const commitment: Commitment = {
      _id: randomUUID(),
      scriptId: script._id,
      scriptName: script.name,
      name: payload.name,
      blockedDomains,
      days: [...new Set(payload.days)].sort(),
      startTime: payload.startTime,
      endTime: payload.endTime,
      startsAt: payload.startsAt,
      endsAt: payload.endsAt,
      status: 'active'
    };

    commitments.push(commitment);
    await writeAll(commitments);
    return commitment;
  },

  async cancel(id: string): Promise<Commitment> {
    const commitments = await readAll();
    const commitment = commitments.find((c) => c._id === id);
    if (!commitment) {
      throw new Error('Compromiso no encontrado.');
    }

    const now = new Date();
    const isRunning =
      commitment.status === 'active' && new Date(commitment.startsAt) <= now && new Date(commitment.endsAt) >= now;
    if (isRunning) {
      throw new Error('Un compromiso activo no se puede cancelar.');
    }

    commitment.status = 'cancelled';
    await writeAll(commitments);
    return commitment;
  }
};
