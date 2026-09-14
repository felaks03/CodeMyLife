import test from 'node:test';
import assert from 'node:assert/strict';
import {
  DAILY_FOCUS_TASKS,
  activeDailyFocusTaskId,
  canStartDailyFocusTask,
  dailyFocusTaskIds,
  isDailyFocusWindow,
  isDailyFocusBlocked,
  minutesUntilFocusCutoff,
  progressForDay,
  tickDailyFocusProgress
} from '../src/shared/daily-focus';
import { normalizeDailyFocusProgress } from '../src/shared/daily-focus';

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

test('las tareas usan las duraciones diarias acordadas', () => {
  assert.deepEqual(
    DAILY_FOCUS_TASKS.map((task) => [task.id, task.durationMinutes]),
    [
      ['run3k', 20],
      ['breakfast', 15],
      ['cold-shower', 10],
      ['gym', 60],
      ['backtesting', 60]
    ]
  );
});

test('la cuenta atrás hasta el corte se calcula en minutos', () => {
  const now = new Date('2026-09-13T13:00:00');
  assert.equal(minutesUntilFocusCutoff(now), 120);
});

test('solo puede haber una tarea activa y el temporizador acumula el tiempo', () => {
  const byDay = progressForDay('2026-09-13', [
    { taskId: 'run3k', completed: false, startedAt: null, elapsedMs: 0 },
    { taskId: 'breakfast', completed: false, startedAt: '2026-09-13T09:00:00.000Z', elapsedMs: 30000 },
    { taskId: 'cold-shower', completed: false, startedAt: null, elapsedMs: 0 },
    { taskId: 'gym', completed: false, startedAt: null, elapsedMs: 0 },
    { taskId: 'backtesting', completed: false, startedAt: null, elapsedMs: 0 }
  ]);

  assert.equal(activeDailyFocusTaskId(byDay), 'breakfast');
  assert.equal(canStartDailyFocusTask('run3k', byDay), false);

  const ticked = tickDailyFocusProgress(byDay, new Date('2026-09-13T09:02:00.000Z').getTime());
  assert.equal(ticked[1].elapsedMs, 150000);
  assert.equal(ticked[1].startedAt, '2026-09-13T09:02:00.000Z');
});

test('el gimnasio no bloquea el foco durante el fin de semana', () => {
  const saturday = new Date('2026-09-05T09:00:00');
  const normalized = normalizeDailyFocusProgress(undefined, '2026-09-05', saturday);
  assert.equal(normalized.some((task) => task.taskId === 'gym'), false);
});

test('las tareas usan los premios de monedas acordados', () => {
  assert.deepEqual(
    DAILY_FOCUS_TASKS.map((task) => [task.id, task.rewardCoins]),
    [
      ['run3k', 30],
      ['breakfast', 15],
      ['cold-shower', 20],
      ['gym', 75],
      ['backtesting', 100]
    ]
  );
});
