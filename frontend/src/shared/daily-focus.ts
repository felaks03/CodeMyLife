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
}

export const DAILY_FOCUS_TASKS: DailyFocusTask[] = [
  {
    id: 'run3k',
    name: 'Run 3k',
    description: 'Correr 3 km.',
    durationMinutes: 45,
    rewardCoins: 12,
    enabled: true
  },
  {
    id: 'breakfast',
    name: 'Desayunar',
    description: 'Desayuno completo antes del mediodía.',
    durationMinutes: 20,
    rewardCoins: 8,
    enabled: true
  },
  {
    id: 'cold-shower',
    name: 'Cold shower',
    description: 'Ducha fría.',
    durationMinutes: 5,
    rewardCoins: 7,
    enabled: true
  },
  {
    id: 'gym',
    name: 'Gym',
    description: 'Entrenamiento de fuerza.',
    durationMinutes: 120,
    rewardCoins: 20,
    enabled: true
  },
  {
    id: 'backtesting',
    name: 'Backtesting',
    description: 'Analizar estrategia y revisar resultados.',
    durationMinutes: 60,
    rewardCoins: 15,
    enabled: true
  }
];

export function dailyFocusTaskIds(): string[] {
  return DAILY_FOCUS_TASKS.map((task) => task.id);
}

export function isDailyFocusWindow(date: Date): boolean {
  const minutes = date.getHours() * 60 + date.getMinutes();
  return minutes >= 8 * 60 && minutes < 15 * 60;
}

export type DailyFocusState = { taskId: string; completed: boolean; startedAt?: string | null; elapsedMs?: number }[];

export function progressForDay(dayKey: string, items: DailyFocusState): DailyFocusState {
  return items.map((item) => ({
    taskId: item.taskId,
    completed: Boolean(item.completed),
    startedAt: item.startedAt ?? null,
    elapsedMs: Number(item.elapsedMs ?? 0)
  }));
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
