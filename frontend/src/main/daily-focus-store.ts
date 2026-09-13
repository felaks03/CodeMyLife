import { app } from 'electron';
import { promises as fs } from 'fs';
import * as path from 'path';
import {
  DAILY_FOCUS_TASKS,
  DailyFocusProgress,
  DailyFocusTask,
  normalizeDailyFocusProgress,
  serializeDateKey
} from '../shared/daily-focus';

export type DailyFocusStoreState = DailyFocusProgress[];

function storeFile(): string {
  return path.join(app.getPath('userData'), 'daily-focus.json');
}

function seedState(dayKey: string): DailyFocusProgress[] {
  return DAILY_FOCUS_TASKS.map((task: DailyFocusTask) => ({
    taskId: task.id,
    completed: false,
    startedAt: null,
    elapsedMs: 0,
    dayKey
  }));
}

function currentDayKey(date = new Date()): string {
  return serializeDateKey(date);
}

async function readState(): Promise<DailyFocusStoreState> {
  try {
    const raw = JSON.parse(await fs.readFile(storeFile(), 'utf8')) as Partial<DailyFocusProgress>[] | null;
    if (!Array.isArray(raw)) return seedState(currentDayKey());
    return normalizeDailyFocusProgress(raw, currentDayKey());
  } catch {
    return seedState(currentDayKey());
  }
}

async function writeState(progress: DailyFocusStoreState): Promise<void> {
  await fs.writeFile(storeFile(), JSON.stringify(progress), 'utf8');
}

export const dailyFocusStore = {
  async get(): Promise<DailyFocusStoreState> {
    return readState();
  },

  async startTask(taskId: string): Promise<DailyFocusStoreState> {
    const progress = await readState();
    const item = progress.find((entry) => entry.taskId === taskId);
    if (!item) throw new Error('Tarea no encontrada.');
    if (item.completed) throw new Error('Esta tarea ya está completada.');
    if (!item.startedAt) {
      item.startedAt = new Date().toISOString();
    }
    await writeState(progress);
    return progress;
  },

  async completeTask(taskId: string): Promise<DailyFocusStoreState> {
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
    const now = Date.now();
    for (const task of progress) {
      if (!task.startedAt || task.completed) continue;
      const startedAt = new Date(task.startedAt).getTime();
      if (Number.isNaN(startedAt)) continue;
      task.elapsedMs = Math.max(0, (task.elapsedMs ?? 0) + (now - startedAt));
      task.startedAt = new Date().toISOString();
    }
    await writeState(progress);
    return progress;
  }
};
