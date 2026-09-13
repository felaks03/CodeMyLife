import { ShopItem, TaskDefinition } from './types';

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
    description: 'Desbloquea Steam y Minecraft Launcher durante una hora.',
    costCoins: 20,
    durationMinutes: 60,
    targetScriptId: 'builtin-games'
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