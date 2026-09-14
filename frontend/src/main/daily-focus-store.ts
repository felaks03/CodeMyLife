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
  visibleDailyFocusTasks
} from '../shared/daily-focus';

export type DailyFocusStoreState = DailyFocusProgress[];

function storeFile(): string {
  return path.join(app.getPath('userData'), 'daily-focus.json');
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
    const raw = JSON.parse(await fs.readFile(storeFile(), 'utf8')) as Partial<DailyFocusProgress>[] | null;
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
  async get(): Promise<DailyFocusStoreState> {
    return readState();
  },

  async replace(progress: DailyFocusStoreState): Promise<void> {
    await writeState(progress);
  },

  async startTask(taskId: string): Promise<DailyFocusStoreState> {
    if (!isDailyFocusWindow(timeAuthority.now())) {
      throw new Error('Las tareas solo se pueden iniciar durante el bloqueo diario, de 08:00 a 15:00.');
    }
    const progress = await readState();
    const item = progress.find((entry) => entry.taskId === taskId);
    if (!item) throw new Error('Tarea no encontrada.');
    if (item.completed) throw new Error('Esta tarea ya está completada.');
    if (!canStartDailyFocusTask(taskId, progress)) {
      const activeTaskId = activeDailyFocusTaskId(progress);
      throw new Error(activeTaskId ? 'Ya hay otra tarea en curso.' : 'No puedes iniciar esta tarea ahora.');
    }
    item.startedAt = timeAuthority.now().toISOString();
    await writeState(progress);
    return progress;
  },

  async completeTask(taskId: string): Promise<DailyFocusStoreState> {
    if (!isDailyFocusWindow(timeAuthority.now())) {
      throw new Error('Las tareas solo se pueden completar durante el bloqueo diario, de 08:00 a 15:00.');
    }
    const progress = await readState();
    const task = DAILY_FOCUS_TASKS.find((candidate) => candidate.id === taskId);
    const item = progress.find((entry) => entry.taskId === taskId);
    if (!task || !item) throw new Error('Tarea no encontrada.');
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
  },

  async tick(): Promise<DailyFocusStoreState> {
    const progress = await readState();
    const now = timeAuthority.nowMs();
    const next = tickDailyFocusProgress(progress, now);
    await writeState(next);
    return next;
  }
};
