import { ShopItem, TaskDefinition, WalletPurchase } from './types';

export const TASKS: TaskDefinition[] = [
  {
    id: 'run3k',
    name: 'Run 3k',
    description: 'Completa la carrera de 3 km.',
    rewardCoins: 12,
    frequency: 'daily'
  },
  {
    id: 'breakfast',
    name: 'Desayunar',
    description: 'Haz un desayuno completo antes del mediodía.',
    rewardCoins: 8,
    frequency: 'daily'
  },
  {
    id: 'cold-shower',
    name: 'Cold shower',
    description: 'Toma la ducha fría.',
    rewardCoins: 7,
    frequency: 'daily'
  },
  {
    id: 'gym',
    name: 'Gym',
    description: 'Haz tu entrenamiento del día.',
    rewardCoins: 20,
    frequency: 'daily'
  },
  {
    id: 'backtesting',
    name: 'Backtesting',
    description: 'Revisa la estrategia y el backtesting.',
    rewardCoins: 15,
    frequency: 'daily'
  }
];

export const SHOP_ITEMS: ShopItem[] = [
  {
    id: 'games-time',
    name: 'Tiempo de videojuegos',
    description: 'Desbloquea Steam y Minecraft Launcher durante 20 minutos.',
    costCoins: 20,
    durationMinutes: 20,
    targetScriptId: 'builtin-games'
  },
  {
    id: 'instagram-time',
    name: 'Tiempo de Instagram',
    description: 'Añade 5 minutos extra de Instagram cuando se agote el tiempo gratuito diario.',
    costCoins: 5,
    durationMinutes: 5,
    targetScriptId: 'builtin-instagram'
  }
];

export function periodKey(task: TaskDefinition, date = new Date()): string {
  if (task.frequency === 'weekly') {
    const first = new Date(date.getFullYear(), 0, 1);
    const week = Math.ceil((((date.getTime() - first.getTime()) / 86400000) + first.getDay() + 1) / 7);
    return `${date.getFullYear()}-W${week}`;
  }
  return date.toISOString().slice(0, 10);
}

export function canPurchase(walletCoins: number, item: ShopItem): boolean {
  return walletCoins >= item.costCoins;
}

export function isPurchaseAvailable(purchase: WalletPurchase): boolean {
  return !purchase.usedAt;
}

export function extendUnlockUntil(currentUnlock: string | undefined, now: Date, durationMinutes: number): string {
  const current = currentUnlock ? new Date(currentUnlock) : now;
  const base = current > now ? current : now;
  return new Date(base.getTime() + durationMinutes * 60000).toISOString();
}

export function remainingSecondsAfterPause(totalSeconds: number, startedAt: string, now: Date): number {
  const startedMs = new Date(startedAt).getTime();
  if (!Number.isFinite(startedMs)) return Math.max(0, Math.floor(totalSeconds));
  const elapsed = Math.max(0, Math.floor((now.getTime() - startedMs) / 1000));
  return Math.max(0, Math.floor(totalSeconds) - elapsed);
}

export function addPurchasedSeconds(currentSeconds: number | undefined, durationMinutes: number): number {
  return Math.max(0, Math.floor(currentSeconds ?? 0)) + durationMinutes * 60;
}

export function activeRemainingSeconds(
  storedSeconds: number | undefined,
  startedAt: string | undefined,
  now: Date,
  unlockUntil?: string
): number {
  const storedRemaining = startedAt
    ? remainingSecondsAfterPause(Number(storedSeconds ?? 0), startedAt, now)
    : Math.max(0, Math.floor(Number(storedSeconds ?? 0)));
  const unlockRemaining = unlockUntil
    ? Math.max(0, Math.ceil((new Date(unlockUntil).getTime() - now.getTime()) / 1000))
    : 0;
  return Math.max(storedRemaining, unlockRemaining);
}

export function consolidatePurchaseSeconds(
  activeSeconds: number,
  pendingSeconds: number,
  durationMinutes: number
): number {
  return Math.max(0, Math.floor(activeSeconds)) + Math.max(0, Math.floor(pendingSeconds)) + durationMinutes * 60;
}