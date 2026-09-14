export interface DailyFocusTask {
  id: string;
  name: string;
  description: string;
  durationMinutes: number;
  rewardCoins: number;
  enabled?: boolean;
}

export interface DailyFocusProgress {
  taskId: string;
  completed: boolean;
  startedAt?: string | null;
  elapsedMs?: number;
  dayKey?: string;
}

export const DAILY_FOCUS_TASKS: DailyFocusTask[] = [
  {
    id: 'run3k',
    name: 'Run 3k',
    description: 'Correr 3 km.',
    durationMinutes: 20,
    rewardCoins: 30,
    enabled: true
  },
  {
    id: 'breakfast',
    name: 'Desayunar',
    description: 'Desayuno completo antes del mediodía.',
    durationMinutes: 15,
    rewardCoins: 15,
    enabled: true
  },
  {
    id: 'cold-shower',
    name: 'Cold shower',
    description: 'Ducha fría.',
    durationMinutes: 15,
    rewardCoins: 20,
    enabled: true
  },
  {
    id: 'gym',
    name: 'Gym',
    description: 'Entrenamiento de fuerza.',
    durationMinutes: 90,
    rewardCoins: 75,
    enabled: true
  },
  {
    id: 'backtesting',
    name: 'Backtesting',
    description: 'Analizar estrategia y revisar resultados.',
    durationMinutes: 60,
    rewardCoins: 100,
    enabled: true
  }
];

export function serializeDateKey(date: Date): string {
  return date.toISOString().slice(0, 10);
}

export function dailyFocusTaskIds(): string[] {
  return DAILY_FOCUS_TASKS.map((task) => task.id);
}

export function isGymEnabledForDate(date: Date): boolean {
  return date.getDay() !== 0 && date.getDay() !== 6;
}

export function visibleDailyFocusTasks(date: Date): DailyFocusTask[] {
  return DAILY_FOCUS_TASKS.filter((task) => task.id !== 'gym' || isGymEnabledForDate(date));
}

export function isDailyFocusWindow(date: Date): boolean {
  const minutes = date.getHours() * 60 + date.getMinutes();
  return minutes >= 8 * 60 && minutes < 15 * 60;
}

export type DailyFocusState = { taskId: string; completed: boolean; startedAt?: string | null; elapsedMs?: number; dayKey?: string }[];

export function progressForDay(dayKey: string, items: DailyFocusState): DailyFocusState {
  return items.map((item) => ({
    taskId: item.taskId,
    completed: Boolean(item.completed),
    startedAt: item.startedAt ?? null,
    elapsedMs: Number(item.elapsedMs ?? 0),
    dayKey
  }));
}

export function normalizeDailyFocusProgress(
  raw: Partial<DailyFocusProgress>[] | undefined,
  todayKey: string,
  referenceDate = new Date()
): DailyFocusState {
  const tasks = visibleDailyFocusTasks(referenceDate);
  const defaults: DailyFocusState = tasks.map((task) => ({
    taskId: task.id,
    completed: false,
    startedAt: null as string | null,
    elapsedMs: 0,
    dayKey: todayKey
  }));

  const byId = new Map(defaults.map((item) => [item.taskId, item]));
  if (!Array.isArray(raw)) return defaults;

  for (const item of raw) {
    if (!item || typeof item.taskId !== 'string') continue;
    const target = byId.get(item.taskId);
    if (!target) continue;
    target.completed = Boolean(item.completed);
    target.startedAt = item.startedAt ?? null;
    target.elapsedMs = Number.isFinite(Number(item.elapsedMs)) ? Math.max(0, Number(item.elapsedMs)) : 0;
    target.dayKey = todayKey;
  }

  return [...byId.values()];
}

export function activeDailyFocusTaskId(progress: DailyFocusState): string | null {
  const active = progress.find((task) => task.startedAt && !task.completed);
  return active ? active.taskId : null;
}

export function canStartDailyFocusTask(taskId: string, progress: DailyFocusState): boolean {
  const activeTaskId = activeDailyFocusTaskId(progress);
  if (activeTaskId && activeTaskId !== taskId) return false;
  const task = progress.find((item) => item.taskId === taskId);
  if (!task || task.completed) return false;
  return !task.startedAt;
}

export function tickDailyFocusProgress(progress: DailyFocusState, nowMs: number): DailyFocusState {
  return progress.map((task) => {
    if (!task.startedAt || task.completed) return { ...task };
    const startedAt = new Date(task.startedAt).getTime();
    if (Number.isNaN(startedAt)) return { ...task };
    const previousElapsed = Number(task.elapsedMs ?? 0);
    const nextElapsed = Math.max(0, previousElapsed + (nowMs - startedAt));
    return {
      ...task,
      elapsedMs: nextElapsed,
      startedAt: new Date(nowMs).toISOString()
    };
  });
}

export function isDailyFocusBlocked(date: Date, progress: DailyFocusState): boolean {
  if (!isDailyFocusWindow(date)) return false;
  return !progress.every((task) => task.completed === true);
}

export function minutesUntilFocusCutoff(date: Date): number {
  const cutoff = new Date(date);
  cutoff.setHours(15, 0, 0, 0);
  const diff = cutoff.getTime() - date.getTime();
  return Math.max(0, Math.ceil(diff / 60000));
}

