import { app } from 'electron';
import { promises as fs } from 'fs';
import * as path from 'path';
import { canPurchase, periodKey, SHOP_ITEMS, TASKS } from '../shared/shop';
import { ShopItem, TaskDefinition, WalletState } from '../shared/types';
import { guestStore } from './guest-store';
import { isCommitmentEnforcedNow } from '../shared/schedule';

const INITIAL_COINS = 0;

function walletFile(): string {
  return path.join(app.getPath('userData'), 'wallet.json');
}

function emptyWallet(): WalletState {
  return { coins: INITIAL_COINS, earnedCoins: 0, spentCoins: 0, completions: [], purchases: [] };
}

function nonNegativeNumber(value: unknown, fallback: number): number {
  return typeof value === 'number' && Number.isFinite(value) && value >= 0 ? value : fallback;
}

function normalizeWallet(raw: Partial<WalletState>): WalletState {
  const base = emptyWallet();
  return {
    coins: nonNegativeNumber(raw.coins, base.coins),
    earnedCoins: nonNegativeNumber(raw.earnedCoins, base.earnedCoins),
    spentCoins: nonNegativeNumber(raw.spentCoins, base.spentCoins),
    completions: Array.isArray(raw.completions)
      ? raw.completions.filter((item) => typeof item?.taskId === 'string' && typeof item?.periodKey === 'string' && typeof item?.completedAt === 'string')
      : [],
    purchases: Array.isArray(raw.purchases)
      ? raw.purchases.filter((item) => typeof item?.itemId === 'string' && typeof item?.coins === 'number' && Number.isFinite(item.coins) && item.coins >= 0 && typeof item?.purchasedAt === 'string' && typeof item?.unlockUntil === 'string')
      : []
  };
}

async function readWallet(): Promise<WalletState> {
  try {
    const raw = JSON.parse(await fs.readFile(walletFile(), 'utf8')) as Partial<WalletState>;
    return normalizeWallet(raw);
  } catch {
    return emptyWallet();
  }
}

async function writeWallet(wallet: WalletState): Promise<void> {
  await fs.writeFile(walletFile(), JSON.stringify(wallet), 'utf8');
}

let operation = Promise.resolve();
function serialized<T>(action: () => Promise<T>): Promise<T> {
  const next = operation.then(action, action);
  operation = next.then(() => undefined, () => undefined);
  return next;
}

export const walletStore = {
  get: async (): Promise<WalletState> => readWallet(),
  tasks: (): TaskDefinition[] => TASKS,
  shop: (): ShopItem[] => SHOP_ITEMS,

  completeTask(taskId: string): Promise<WalletState> {
    return serialized(async () => {
      const task = TASKS.find((candidate) => candidate.id === taskId);
      if (!task) throw new Error('Tarea no encontrada.');
      const wallet = await readWallet();
      const key = periodKey(task);
      if (wallet.completions.some((completion) => completion.taskId === taskId && completion.periodKey === key)) {
        throw new Error('Esta tarea ya esta completada en este periodo.');
      }
      wallet.coins += task.rewardCoins;
      wallet.earnedCoins += task.rewardCoins;
      wallet.completions.push({ taskId, periodKey: key, completedAt: new Date().toISOString() });
      await writeWallet(wallet);
      return wallet;
    });
  },

  purchase(itemId: string): Promise<WalletState> {
    return serialized(async () => {
      const item = SHOP_ITEMS.find((candidate) => candidate.id === itemId);
      if (!item) throw new Error('Recompensa no encontrada.');
      const wallet = await readWallet();
      const previousWallet = { ...wallet, completions: [...wallet.completions], purchases: [...wallet.purchases] };
      if (!canPurchase(wallet.coins, item)) throw new Error('No tienes suficientes monedas.');
      const commitments = await guestStore.list();
      const games = commitments.find(
        (commitment) => commitment.scriptId === item.targetScriptId && isCommitmentEnforcedNow(commitment, new Date())
      );
      if (!games) throw new Error('Necesitas un bloqueo de videojuegos activo.');

      const now = new Date();
      const previousUnlock = games.unlockUntil;
      const currentUnlock = games.unlockUntil ? new Date(games.unlockUntil) : now;
      const base = currentUnlock > now ? currentUnlock : now;
      const unlockUntil = new Date(base.getTime() + item.durationMinutes * 60000).toISOString();
      games.unlockUntil = unlockUntil;
      wallet.coins -= item.costCoins;
      wallet.spentCoins += item.costCoins;
      wallet.purchases.push({ itemId, coins: item.costCoins, purchasedAt: now.toISOString(), unlockUntil });
      try {
        await guestStore.replace(commitments);
        await writeWallet(wallet);
      } catch (error) {
        games.unlockUntil = previousUnlock;
        await guestStore.replace(commitments);
        await writeWallet(previousWallet);
        throw error;
      }
      return wallet;
    });
  }
};
