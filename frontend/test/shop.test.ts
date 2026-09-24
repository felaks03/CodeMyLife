import { test } from 'node:test';
import assert from 'node:assert/strict';
import { activeRemainingSeconds, addPurchasedSeconds, canPurchase, consolidatePurchaseSeconds, extendUnlockUntil, isPurchaseAvailable, periodKey, remainingSecondsAfterPause, SHOP_ITEMS, TASKS } from '../src/shared/shop';

test('la tienda tiene una recompensa de tiempo de videojuegos', () => {
  const games = SHOP_ITEMS.find((item) => item.id === 'games-time');
  assert.ok(games);
  assert.equal(games.targetScriptId, 'builtin-games');
  assert.ok(games.costCoins > 0);
  assert.ok(games.durationMinutes > 0);
});

test('la tienda ofrece 1 minuto extra de Instagram por 5 monedas', () => {
  const instagram = SHOP_ITEMS.find((item) => item.id === 'instagram-time');
  assert.ok(instagram);
  assert.equal(instagram.targetScriptId, 'builtin-instagram');
  assert.equal(instagram.costCoins, 5);
  assert.equal(instagram.durationMinutes, 1);
});

test('videojuegos cuesta 5 monedas y ofrece 10 minutos', () => {
  const games = SHOP_ITEMS.find((item) => item.id === 'games-time');
  assert.ok(games);
  assert.equal(games.costCoins, 5);
  assert.equal(games.durationMinutes, 10);
});

test('la lista diaria incluye las tareas del foco', () => {
  assert.equal(TASKS.length, 10);
  assert.deepEqual(
    TASKS.map((task) => task.id),
    ['run3k', 'breakfast', 'cold-shower', 'gym', 'reading', 'meditate', 'make-my-bed', 'chess', 'backtesting', 'stare-at-wall']
  );
  assert.deepEqual(
    TASKS.map((task) => [task.id, task.name, task.rewardCoins]),
    [
      ['run3k', 'Run 3k', 15],
      ['breakfast', 'Breakfast', 10],
      ['cold-shower', 'Cold Shower', 10],
      ['gym', 'Gym', 60],
      ['reading', 'Reading', 20],
      ['meditate', 'Meditate', 15],
      ['make-my-bed', 'Make My Bed', 5],
      ['chess', 'Chess', 30],
      ['backtesting', 'Backtesting', 50],
      ['stare-at-wall', 'Stare at the Wall', 15]
    ]
  );
  TASKS.forEach((task) => {
    assert.equal(task.frequency, 'daily');
    assert.ok(task.rewardCoins > 0);
  });
});

test('una compra solo es posible con saldo suficiente', () => {
  const item = SHOP_ITEMS[0];

  assert.equal(canPurchase(item.costCoins - 1, item), false);
  assert.equal(canPurchase(item.costCoins, item), true);
  assert.equal(canPurchase(item.costCoins + 10, item), true);
});

test('las tareas diarias usan la fecha como periodo', () => {
  const task = TASKS[0];

  assert.equal(periodKey(task, new Date('2026-09-13T10:00:00.000Z')), '2026-09-13');
  assert.equal(periodKey(task, new Date('2026-09-14T10:00:00.000Z')), '2026-09-14');
});

test('las definiciones de tareas y tienda tienen ids unicos', () => {
  assert.equal(new Set(TASKS.map((task) => task.id)).size, TASKS.length);
  assert.equal(new Set(SHOP_ITEMS.map((item) => item.id)).size, SHOP_ITEMS.length);
});

test('la recompensa solo apunta al bloqueo de videojuegos', () => {
  assert.equal(SHOP_ITEMS.find((item) => item.id === 'games-time')?.targetScriptId, 'builtin-games');
});

test('una compra nueva esta disponible hasta que se usa', () => {
  const purchase = { id: 'purchase-1', itemId: 'games-time', coins: 10, purchasedAt: '2026-09-14T10:00:00.000Z' };
  assert.equal(isPurchaseAvailable(purchase), true);
  assert.equal(isPurchaseAvailable({ ...purchase, usedAt: '2026-09-14T10:01:00.000Z' }), false);
  assert.equal(isPurchaseAvailable({ ...purchase, remainingSeconds: 0 }), false);
});

test('usar un objeto acumula tiempo desde ahora o desde el desbloqueo vigente', () => {
  const now = new Date('2026-09-14T10:00:00.000Z');
  assert.equal(extendUnlockUntil(undefined, now, 60), '2026-09-14T11:00:00.000Z');
  assert.equal(extendUnlockUntil('2026-09-14T10:30:00.000Z', now, 60), '2026-09-14T11:30:00.000Z');
  assert.equal(extendUnlockUntil('2026-09-14T09:30:00.000Z', now, 60), '2026-09-14T11:00:00.000Z');
});

test('pausar guarda el tiempo restante transcurrido', () => {
  assert.equal(
    remainingSecondsAfterPause(3600, '2026-09-14T10:00:00.000Z', new Date('2026-09-14T10:12:30.000Z')),
    2850
  );
});

test('cada compra anade 60 minutos al objeto acumulado', () => {
  assert.equal(addPurchasedSeconds(undefined, 60), 3600);
  assert.equal(addPurchasedSeconds(3600, 60), 7200);
  assert.equal(addPurchasedSeconds(42 * 60, 60), 102 * 60);
});

test('una compra activa conserva el mayor tiempo valido antes de acumular', () => {
  const now = new Date('2026-09-14T10:18:00.000Z');
  assert.equal(
    activeRemainingSeconds(42 * 60, '2026-09-14T10:00:00.000Z', now, '2026-09-14T11:00:00.000Z'),
    42 * 60
  );
  assert.equal(
    addPurchasedSeconds(activeRemainingSeconds(42 * 60, '2026-09-14T10:00:00.000Z', now, '2026-09-14T11:00:00.000Z'), 60),
    102 * 60
  );
});

test('la consolidacion suma tiempo activo, inventario pendiente y la nueva compra', () => {
  assert.equal(consolidatePurchaseSeconds(42 * 60, 0, 60), 102 * 60);
  assert.equal(consolidatePurchaseSeconds(0, 60 * 60, 60), 120 * 60);
  assert.equal(consolidatePurchaseSeconds(42 * 60, 60 * 60, 60), 162 * 60);
});