import { app } from 'electron';
import { promises as fs } from 'fs';
import * as path from 'path';
import { randomUUID } from 'crypto';
import { Commitment, NewCommitment, Script, NewScript } from '../shared/types';
import { BUILTIN_SCRIPTS, searchBuiltinScripts } from '../shared/builtin-scripts';
import { timeAuthority } from './time-authority';
import { writeJsonAtomic } from './atomic-storage';

// Almacena los compromisos del modo invitado solo en este dispositivo, sin backend.
function commitmentsFile(): string {
  return path.join(app.getPath('userData'), 'guest-commitments.json');
}

function scriptsFile(): string {
  return path.join(app.getPath('userData'), 'guest-scripts.json');
}

async function readCommitments(): Promise<Commitment[]> {
  try {
    const commitments = JSON.parse(await fs.readFile(commitmentsFile(), 'utf8')) as Commitment[];
    const now = timeAuthority.nowMs();
    let changed = false;
    for (const commitment of commitments) {
      if (commitment.status === 'active' && new Date(commitment.endsAt).getTime() < now) {
        commitment.status = 'completed';
        changed = true;
      }
    }
    if (changed) await writeCommitments(commitments);
    return commitments;
  } catch {
    return [];
  }
}

async function writeCommitments(commitments: Commitment[]): Promise<void> {
  await writeJsonAtomic(commitmentsFile(), commitments);
}

async function readScripts(): Promise<Script[]> {
  try {
    return JSON.parse(await fs.readFile(scriptsFile(), 'utf8')) as Script[];
  } catch {
    return [];
  }
}

async function writeScripts(scripts: Script[]): Promise<void> {
  await writeJsonAtomic(scriptsFile(), scripts);
}

export const guestStore = {
  list: (): Promise<Commitment[]> => readCommitments(),

  searchScripts: async (query: string) => {
    const builtin = searchBuiltinScripts(query);
    const published = await readScripts();
    return [...builtin, ...published];
  },

  async createScript(payload: NewScript): Promise<Script> {
    const scripts = await readScripts();
    const script: Script = {
      _id: `guest-${randomUUID()}`,
      authorName: 'Perfil de Prueba',
      name: payload.name,
      description: payload.description,
      category: payload.category,
      blockedDomains: payload.blockedDomains.map((d) => d.toLowerCase()),
      allowCustomDomains: payload.allowCustomDomains ?? false,
      usageCount: 0
    };

    scripts.push(script);
    await writeScripts(scripts);
    return script;
  },

  async create(payload: NewCommitment): Promise<Commitment> {
    if (new Date(payload.endsAt) <= new Date(payload.startsAt)) {
      throw new Error('endsAt debe ser posterior a startsAt.');
    }
    if (payload.endTime <= payload.startTime) {
      throw new Error('endTime debe ser posterior a startTime.');
    }

    // Buscar en builtin + guest scripts
    const allScripts = [...BUILTIN_SCRIPTS, ...(await readScripts())];
    const script = allScripts.find((s) => s._id === payload.scriptId);
    if (!script) {
      throw new Error('Script no encontrado.');
    }

    const customDomains = script.allowCustomDomains
      ? (payload.customDomains ?? []).map((domain) => domain.toLowerCase())
      : [];
    const blockedDomains = [...new Set([...script.blockedDomains, ...customDomains])];

    const commitments = await readCommitments();
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
      alwaysBlocked: payload.alwaysBlocked || script.blockingMode === 'always',
      showLockScreen: payload.showLockScreen || script.showLockScreen === true,
      unlockUntil: payload.unlockUntil,
      status: 'active'
    };

    commitments.push(commitment);
    await writeCommitments(commitments);
    return commitment;
  },

  async cancel(id: string): Promise<Commitment> {
    const commitments = await readCommitments();
    const commitment = commitments.find((c) => c._id === id);
    if (!commitment) {
      throw new Error('Compromiso no encontrado.');
    }

    const now = timeAuthority.now();
    const isRunning =
      commitment.status === 'active' && new Date(commitment.startsAt) <= now && new Date(commitment.endsAt) >= now;
    if (isRunning) {
      throw new Error('Un compromiso activo no se puede cancelar.');
    }

    commitment.status = 'cancelled';
    await writeCommitments(commitments);
    return commitment;
  },

  async replace(commitments: Commitment[]): Promise<void> {
    await writeCommitments(commitments);
  }
};
