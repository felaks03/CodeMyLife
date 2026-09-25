import { app } from 'electron';
import { promises as fs } from 'fs';
import * as path from 'path';
import { timeAuthority } from './time-authority';
import { writeJsonAtomic } from './atomic-storage';
import {
  DAILY_FOCUS_TASKS,
  DailyFocusProgress,
  DailyFocusTask,
  activeDailyFocusTaskId,
  canStartDailyFocusTask,
  normalizeDailyFocusProgress,
  serializeDateKey,
  tickDailyFocusProgress,
  isDailyFocusWindow,
  tasksForFocusWindow,
  visibleDailyFocusTasks
} from '../shared/daily-focus';

export type DailyFocusStoreState = DailyFocusProgress[];
let pendingOperation = Promise.resolve();

function serialized<T>(operation: () => Promise<T>): Promise<T> {
  const next = pendingOperation.then(operation, operation);
  pendingOperation = next.then(() => undefined, () => undefined);
  return next;
}

function storeFile(): string {
  return path.join(app.getPath('userData'), 'daily-focus.json');
}

function skipFile(): string {
  return path.join(app.getPath('userData'), 'daily-focus-skip.json');
}

function seedState(dayKey: string): DailyFocusProgress[] {
  return visibleDailyFocusTasks(timeAuthority.now()).map((task: DailyFocusTask) => ({
    taskId: task.id,
    completed: false,
    startedAt: null,
    elapsedMs: 0,
    dayKey
  }));
}

function currentDayKey(date = timeAuthority.now()): string {
  return serializeDateKey(date);
}

async function readState(): Promise<DailyFocusStoreState> {
  try {
    const content = await fs.readFile(storeFile(), 'utf8');
    const raw = JSON.parse(content.replace(/^\uFEFF/, '')) as Partial<DailyFocusProgress>[] | null;
    if (!Array.isArray(raw)) return seedState(currentDayKey());
    return normalizeDailyFocusProgress(raw, currentDayKey(), timeAuthority.now());
  } catch {
    return seedState(currentDayKey());
  }
}

async function writeState(progress: DailyFocusStoreState): Promise<void> {
  await writeJsonAtomic(storeFile(), progress);
}

export const dailyFocusStore = {
  async isSkippedForToday(): Promise<boolean> {
    try {
      const raw = JSON.parse(await fs.readFile(skipFile(), 'utf8')) as { dayKey?: string };
      return raw.dayKey === currentDayKey();
    } catch {
      return false;
    }
  },

  async skipForToday(): Promise<void> {
    if (app.isPackaged) throw new Error('El salto de desarrollo no esta disponible en la version instalada.');
    await writeJsonAtomic(skipFile(), { dayKey: currentDayKey() });
  },

  async get(): Promise<DailyFocusStoreState> {
    return readState();
  },

  async replace(progress: DailyFocusStoreState): Promise<void> {
    await serialized(() => writeState(progress));
  },

  async startTask(taskId: string): Promise<DailyFocusStoreState> {
    return serialized(async () => {
      const now = timeAuthority.now();
      if (!isDailyFocusWindow(now)) {
        throw new Error('Las tareas solo se pueden iniciar de 08:00 a 15:00 o de 18:00 a 20:00.');
      }
      const progress = await readState();
      const item = progress.find((entry) => entry.taskId === taskId);
      if (!item) throw new Error('Tarea no encontrada.');
      if (!tasksForFocusWindow(now).some((task) => task.id === taskId)) {
        throw new Error('Esta tarea no pertenece al bloqueo activo.');
      }
      if (item.completed) throw new Error('Esta tarea ya está completada.');
      if (!canStartDailyFocusTask(taskId, progress)) {
        const activeTaskId = activeDailyFocusTaskId(progress);
        throw new Error(activeTaskId ? 'Ya hay otra tarea en curso.' : 'No puedes iniciar esta tarea ahora.');
      }
      item.startedAt = timeAuthority.now().toISOString();
      await writeState(progress);
      return progress;
    });
  },

  async completeTask(taskId: string): Promise<DailyFocusStoreState> {
    return serialized(async () => {
      const now = timeAuthority.now();
      if (!isDailyFocusWindow(now)) {
        throw new Error('Las tareas solo se pueden completar de 08:00 a 15:00 o de 18:00 a 20:00.');
      }
      const progress = await readState();
      const task = DAILY_FOCUS_TASKS.find((candidate) => candidate.id === taskId);
      const item = progress.find((entry) => entry.taskId === taskId);
      if (!task || !item) throw new Error('Tarea no encontrada.');
      if (!tasksForFocusWindow(now).some((candidate) => candidate.id === taskId)) {
        throw new Error('Esta tarea no pertenece al bloqueo activo.');
      }
      if (item.completed) throw new Error('Esta tarea ya está completada.');
      const elapsedMs = Math.max(0, Number(item.elapsedMs ?? 0));
      const requiredMs = task.durationMinutes * 60 * 1000;
      if (elapsedMs < requiredMs) {
        throw new Error(`Falta tiempo para completar ${task.name}.`);
      }
      item.completed = true;
      item.startedAt = null;
      await writeState(progress);
      return progress;
    });
  },

  async tick(): Promise<DailyFocusStoreState> {
    return serialized(async () => {
      const progress = await readState();
      const now = timeAuthority.nowMs();
      const next = tickDailyFocusProgress(progress, now);
      await writeState(next);
      return next;
    });
  }
};
