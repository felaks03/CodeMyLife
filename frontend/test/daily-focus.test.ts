import test from 'node:test';
import assert from 'node:assert/strict';
import {
  DAILY_FOCUS_TASKS,
  dailyFocusTaskIds,
  isDailyFocusWindow,
  isDailyFocusBlocked,
  minutesUntilFocusCutoff,
  progressForDay
} from '../src/shared/daily-focus';

test('la ventana de foco arranca a las 8:00 y termina a las 15:00', () => {
  const start = new Date('2026-09-13T08:00:00');
  const end = new Date('2026-09-13T15:00:00');
  const inside = new Date('2026-09-13T11:00:00');
  const before = new Date('2026-09-13T07:59:00');
  const after = new Date('2026-09-13T15:01:00');

  assert.equal(isDailyFocusWindow(start), true);
  assert.equal(isDailyFocusWindow(end), false);
  assert.equal(isDailyFocusWindow(inside), true);
  assert.equal(isDailyFocusWindow(before), false);
  assert.equal(isDailyFocusWindow(after), false);
});

test('si no hay tareas completadas dentro de la ventana, se activa el bloqueo', () => {
  const now = new Date('2026-09-13T11:00:00');
  const state = progressForDay('2026-09-13', [
    { taskId: 'run3k', completed: false },
    { taskId: 'breakfast', completed: true },
    { taskId: 'cold-shower', completed: false },
    { taskId: 'gym', completed: false },
    { taskId: 'backtesting', completed: false }
  ]);

  assert.equal(isDailyFocusBlocked(now, state), true);
  assert.equal(DAILY_FOCUS_TASKS.length, 5);
  assert.deepEqual(dailyFocusTaskIds(), ['run3k', 'breakfast', 'cold-shower', 'gym', 'backtesting']);
});

test('la cuenta atrás hasta el corte se calcula en minutos', () => {
  const now = new Date('2026-09-13T13:00:00');
  assert.equal(minutesUntilFocusCutoff(now), 120);
});
