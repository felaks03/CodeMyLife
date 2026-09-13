import { test } from 'node:test';
import assert from 'node:assert/strict';
import { canPurchase, periodKey, SHOP_ITEMS, TASKS } from '../src/shared/shop';

test('la tienda tiene una recompensa de tiempo de videojuegos', () => {
  assert.equal(SHOP_ITEMS.length, 1);
  assert.equal(SHOP_ITEMS[0].id, 'games-time');
  assert.equal(SHOP_ITEMS[0].targetScriptId, 'builtin-games');
  assert.ok(SHOP_ITEMS[0].costCoins > 0);
  assert.ok(SHOP_ITEMS[0].durationMinutes > 0);
});

test('la lista diaria incluye las cinco tareas del foco', () => {
  assert.equal(TASKS.length, 5);
  assert.deepEqual(
    TASKS.map((task) => task.id),
    ['run3k', 'breakfast', 'cold-shower', 'gym', 'backtesting']
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
  assert.equal(SHOP_ITEMS.every((item) => item.targetScriptId === 'builtin-games'), true);
});