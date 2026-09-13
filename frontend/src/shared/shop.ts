import { ShopItem, TaskDefinition } from './types';

export const TASKS: TaskDefinition[] = [
  {
    id: 'gym',
    name: 'Ir al gimnasio',
    description: 'Completa tu entrenamiento del dia.',
    rewardCoins: 10,
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