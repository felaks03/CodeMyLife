import { ShopItem, TaskDefinition, WalletPurchase } from './types';

export const TASKS: TaskDefinition[] = [
  {
    id: 'run3k',
    name: 'Run 3k',
    description: 'Run 3 km.',
    rewardCoins: 15,
    frequency: 'daily'
  },
  {
    id: 'breakfast',
    name: 'Breakfast',
    description: 'Eat a complete breakfast before noon.',
    rewardCoins: 10,
    frequency: 'daily'
  },
  {
    id: 'cold-shower',
    name: 'Cold Shower',
    description: 'Take a cold shower.',
    rewardCoins: 10,
    frequency: 'daily'
  },
  {
    id: 'gym',
    name: 'Gym',
    description: 'Strength training.',
    rewardCoins: 60,
    frequency: 'daily'
  },
  {
    id: 'reading',
    name: 'Reading',
    description: 'Read for 20 minutes.',
    rewardCoins: 20,
    frequency: 'daily'
  },
  {
    id: 'meditate',
    name: 'Meditate',
    description: 'Meditate for 15 minutes.',
    rewardCoins: 15,
    frequency: 'daily'
  },
  {
    id: 'make-my-bed',
    name: 'Make My Bed',
    description: 'Make your bed in 2 minutes.',
    rewardCoins: 5,
    frequency: 'daily'
  },
  {
    id: 'chess',
    name: 'Chess',
    description: 'Use the whole computer for 1 hour while playing chess.',
    rewardCoins: 30,
    frequency: 'daily'
  },
  {
    id: 'backtesting',
    name: 'Backtesting',
    description: 'Use the whole computer for 1 hour while testing a strategy.',
    rewardCoins: 50,
    frequency: 'daily'
  },
  {
    id: 'stare-at-wall',
    name: 'Stare at the Wall',
    description: 'Stare at the wall for 15 minutes.',
    rewardCoins: 15,
    frequency: 'daily'
  }
];

export const SHOP_ITEMS: ShopItem[] = [
  {
    id: 'games-time',
    name: 'Tiempo de videojuegos',
    description: 'Desbloquea Steam y Minecraft Launcher durante 10 minutos.',
    costCoins: 5,
    durationMinutes: 10,
    targetScriptId: 'builtin-games'
  },
  {
    id: 'instagram-time',
    name: 'Tiempo de Instagram',
    description: 'Añade 1 minuto extra de Instagram cuando se agote el tiempo gratuito diario.',
    costCoins: 5,
    durationMinutes: 1,
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
  return !purchase.usedAt && Number(purchase.remainingSeconds ?? 1) > 0;
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