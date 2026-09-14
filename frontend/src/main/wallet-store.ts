import { app } from 'electron';
import { promises as fs } from 'fs';
import * as path from 'path';
import { randomUUID } from 'crypto';
import { canPurchase, consolidatePurchaseSeconds, isPurchaseAvailable, periodKey, remainingSecondsAfterPause, SHOP_ITEMS, TASKS } from '../shared/shop';
import { ShopItem, TaskDefinition, WalletPurchase, WalletState } from '../shared/types';
import { guestStore } from './guest-store';
import { isDailyFocusWindow } from '../shared/daily-focus';
import { timeAuthority } from './time-authority';
import { writeJsonAtomic } from './atomic-storage';

const INITIAL_COINS = 0;

function walletFile(): string {
  return path.join(app.getPath('userData'), 'wallet.json');
}

function emptyWallet(): WalletState {
  return { coins: INITIAL_COINS, earnedCoins: 0, spentCoins: 0, completions: [], purchases: [] };
}

function normalizePurchase(item: Partial<WalletPurchase>): WalletPurchase | null {
  if (
    typeof item.itemId !== 'string' ||
    typeof item.coins !== 'number' ||
    !Number.isFinite(item.coins) ||
    item.coins < 0 ||
    typeof item.purchasedAt !== 'string'
  ) return null;

  return {
    id: typeof item.id === 'string' ? item.id : `${item.itemId}-${item.purchasedAt}`,
    itemId: item.itemId,
    coins: item.coins,
    purchasedAt: item.purchasedAt,
    ...(typeof item.startedAt === 'string' ? { startedAt: item.startedAt } : {}),
    ...(typeof item.remainingSeconds === 'number' && Number.isFinite(item.remainingSeconds)
      ? { remainingSeconds: Math.max(0, item.remainingSeconds) } : {}),
    ...(typeof item.usedAt === 'string' ? { usedAt: item.usedAt } : {}),
    ...(typeof item.unlockUntil === 'string' ? { unlockUntil: item.unlockUntil } : {})
  };
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
      ? raw.purchases.map((item) => normalizePurchase(item as Partial<WalletPurchase>)).filter((item): item is WalletPurchase => item !== null)
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
  await writeJsonAtomic(walletFile(), wallet);
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
      if (!isDailyFocusWindow(timeAuthority.now())) {
        throw new Error('Las tareas solo se pueden completar durante el bloqueo diario, de 08:00 a 15:00.');
      }
      const task = TASKS.find((candidate) => candidate.id === taskId);
      if (!task) throw new Error('Tarea no encontrada.');
      const wallet = await readWallet();
      const key = periodKey(task);
      if (wallet.completions.some((completion) => completion.taskId === taskId && completion.periodKey === key)) {
        throw new Error('Esta tarea ya esta completada en este periodo.');
      }
      wallet.coins += task.rewardCoins;
      wallet.earnedCoins += task.rewardCoins;
      wallet.completions.push({ taskId, periodKey: key, completedAt: timeAuthority.now().toISOString() });
      await writeWallet(wallet);
      return wallet;
    });
  },

  purchase(itemId: string): Promise<WalletState> {
    return serialized(async () => {
      const item = SHOP_ITEMS.find((candidate) => candidate.id === itemId);
      if (!item) throw new Error('Recompensa no encontrada.');
      const wallet = await readWallet();
      if (!canPurchase(wallet.coins, item)) throw new Error('No tienes suficientes monedas.');
      const now = timeAuthority.now();
      wallet.coins -= item.costCoins;
      wallet.spentCoins += item.costCoins;
      const unconsumed = wallet.purchases
        .filter((entry) => entry.itemId === itemId && !entry.usedAt)
        .sort((left, right) => left.purchasedAt.localeCompare(right.purchasedAt));
      const canonical = unconsumed[0] ?? {
        id: randomUUID(),
        itemId,
        coins: 0,
        purchasedAt: now.toISOString()
      };
      const commitments = itemId === 'games-time' ? await guestStore.list() : [];
      const games = commitments.find((commitment) =>
        commitment.scriptId === item.targetScriptId &&
        commitment.status === 'active' &&
        new Date(commitment.startsAt) <= now &&
        new Date(commitment.endsAt) >= now
      );
      const activeSeconds = games?.unlockUntil && new Date(games.unlockUntil) > now
        ? Math.ceil((new Date(games.unlockUntil).getTime() - now.getTime()) / 1000)
        : 0;
      const sessionWasActive = activeSeconds > 0 || unconsumed.some((entry) => Boolean(entry.startedAt));
      const pendingSeconds = unconsumed
        .filter((entry) => entry !== canonical && !entry.startedAt)
        .reduce((total, entry) => total + Number(entry.remainingSeconds ?? item.durationMinutes * 60), 0);
      const canonicalSeconds = activeSeconds > 0
        ? activeSeconds
        : Number(canonical.remainingSeconds ?? 0);
      const totalSeconds = consolidatePurchaseSeconds(canonicalSeconds, pendingSeconds, item.durationMinutes);
      canonical.coins += item.costCoins;
      canonical.remainingSeconds = totalSeconds;
      if (games && sessionWasActive) {
        const recheckNow = timeAuthority.now();
        if (games.status !== 'active' || new Date(games.endsAt) < recheckNow) {
          throw new Error('El bloqueo expiro durante la compra. Intenta de nuevo.');
        }
        canonical.startedAt = now.toISOString();
        canonical.unlockUntil = new Date(now.getTime() + totalSeconds * 1000).toISOString();
        games.unlockUntil = canonical.unlockUntil;
      } else {
        canonical.startedAt = undefined;
        canonical.unlockUntil = undefined;
      }
      for (const entry of unconsumed) {
        if (entry !== canonical) entry.usedAt = now.toISOString();
      }
      if (!wallet.purchases.includes(canonical)) wallet.purchases.push(canonical);
      if (games && sessionWasActive) await guestStore.replace(commitments);
      await writeWallet(wallet);
      return wallet;
    });
  },

  useItem(purchaseId: string): Promise<WalletState> {
    return serialized(async () => {
      const wallet = await readWallet();
      const purchase = wallet.purchases.find((entry) => entry.id === purchaseId && isPurchaseAvailable(entry));
      if (!purchase) throw new Error('Este objeto no esta disponible.');
      const item = SHOP_ITEMS.find((candidate) => candidate.id === purchase.itemId);
      if (!item) throw new Error('Recompensa no encontrada.');
      if (wallet.purchases.some((entry) => entry.id !== purchaseId && entry.startedAt && !entry.usedAt)) {
        throw new Error('Ya hay otro tiempo de uso en curso.');
      }

      const now = timeAuthority.now();
      if (item.id === 'instagram-time') {
        const instagramCommitments = await guestStore.list();
        const instagramActive = instagramCommitments.some((commitment) =>
          commitment.scriptId === item.targetScriptId &&
          commitment.status === 'active' &&
          new Date(commitment.startsAt) <= now &&
          new Date(commitment.endsAt) >= now
        );
        if (!instagramActive) throw new Error('Activa primero el bloqueo de Instagram.');
        const remainingSeconds = Math.max(0, Math.floor(purchase.remainingSeconds ?? item.durationMinutes * 60));
        if (remainingSeconds <= 0) throw new Error('Este objeto no tiene tiempo disponible.');
        purchase.startedAt = now.toISOString();
        purchase.remainingSeconds = remainingSeconds;
        await writeWallet(wallet);
        return wallet;
      }

      const commitments = await guestStore.list();
      const games = commitments.find((commitment) =>
        commitment.scriptId === item.targetScriptId &&
        commitment.status === 'active' &&
        new Date(commitment.startsAt) <= now &&
        new Date(commitment.endsAt) >= now
      );
      if (!games) throw new Error('Activa primero el bloqueo de videojuegos.');

      const remainingSeconds = Math.max(0, Math.floor(purchase.remainingSeconds ?? item.durationMinutes * 60));
      if (remainingSeconds <= 0) throw new Error('Este objeto ya no tiene tiempo disponible.');
      const unlockUntil = new Date(now.getTime() + remainingSeconds * 1000).toISOString();
      const previousCommitments = commitments.map((commitment) => ({ ...commitment }));
      const previousWallet = { ...wallet, completions: [...wallet.completions], purchases: [...wallet.purchases] };
      games.unlockUntil = unlockUntil;
      purchase.startedAt = now.toISOString();
      purchase.remainingSeconds = remainingSeconds;
      purchase.unlockUntil = unlockUntil;
      try {
        await guestStore.replace(commitments);
        await writeWallet(wallet);
      } catch (error) {
        await guestStore.replace(previousCommitments);
        await writeWallet(previousWallet);
        throw error;
      }
      return wallet;
    });
  },

  pauseItem(purchaseId: string): Promise<WalletState> {
    return serialized(async () => {
      const wallet = await readWallet();
      const purchase = wallet.purchases.find((entry) => entry.id === purchaseId && entry.startedAt && !entry.usedAt);
      if (!purchase) throw new Error('Este objeto no esta en curso.');
      const item = SHOP_ITEMS.find((candidate) => candidate.id === purchase.itemId);
      if (!item) throw new Error('Recompensa no encontrada.');
      const now = timeAuthority.now();
      if (item.id === 'instagram-time') {
        const remainingSeconds = remainingSecondsAfterPause(
          Number(purchase.remainingSeconds ?? item.durationMinutes * 60),
          purchase.startedAt!,
          now
        );
        purchase.startedAt = undefined;
        purchase.remainingSeconds = remainingSeconds;
        if (remainingSeconds <= 0) purchase.usedAt = now.toISOString();
        await writeWallet(wallet);
        return wallet;
      }
      const remainingSeconds = remainingSecondsAfterPause(
        Number(purchase.remainingSeconds ?? item.durationMinutes * 60),
        purchase.startedAt!,
        now
      );
      const commitments = await guestStore.list();
      const games = commitments.find((commitment) => commitment.scriptId === item.targetScriptId && commitment.status === 'active');
      if (games && new Date(games.endsAt) < now) {
        throw new Error('El bloqueo expiro durante la pausa. Intenta de nuevo.');
      }
      const previousCommitments = commitments.map((commitment) => ({ ...commitment }));
      const previousWallet = { ...wallet, completions: [...wallet.completions], purchases: [...wallet.purchases] };
      purchase.startedAt = undefined;
      purchase.remainingSeconds = remainingSeconds;
      purchase.unlockUntil = undefined;
      if (remainingSeconds <= 0) purchase.usedAt = now.toISOString();
      if (games) games.unlockUntil = undefined;
      try {
        await guestStore.replace(commitments);
        await writeWallet(wallet);
      } catch (error) {
        await guestStore.replace(previousCommitments);
        await writeWallet(previousWallet);
        throw error;
      }
      return wallet;
    });
  },

  pauseActiveSessions(): Promise<WalletState> {
    return serialized(async () => {
      const wallet = await readWallet();
      const now = timeAuthority.now();
      let changed = false;
      const pausedItemIds = new Set<string>();
      for (const purchase of wallet.purchases) {
        if (!purchase.startedAt || purchase.usedAt) continue;
        const item = SHOP_ITEMS.find((candidate) => candidate.id === purchase.itemId);
        if (!item) continue;
        const remainingSeconds = remainingSecondsAfterPause(
          Number(purchase.remainingSeconds ?? item.durationMinutes * 60),
          purchase.startedAt,
          now
        );
        purchase.startedAt = undefined;
        purchase.unlockUntil = undefined;
        purchase.remainingSeconds = remainingSeconds;
        if (remainingSeconds <= 0) purchase.usedAt = now.toISOString();
        changed = true;
        pausedItemIds.add(item.id);
      }
      if (changed) await writeWallet(wallet);
      const commitments = await guestStore.list();
      let commitmentsChanged = false;
      for (const commitment of commitments) {
        if (pausedItemIds.has(commitment.scriptId) && commitment.unlockUntil) {
          commitment.unlockUntil = undefined;
          commitmentsChanged = true;
        }
      }
      if (commitmentsChanged) await guestStore.replace(commitments);
      return wallet;
    });
  }
};
