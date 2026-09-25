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
  tasksForFocusWindow,
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
    { taskId: 'reading', completed: false }
  ]);

    assert.equal(isDailyFocusBlocked(now, state), true);
    assert.equal(DAILY_FOCUS_TASKS.length, 11);
    assert.deepEqual(dailyFocusTaskIds(), ['run3k', 'breakfast', 'brush-my-teeth', 'cold-shower', 'gym', 'reading', 'meditate', 'make-my-bed', 'chess', 'backtesting', 'stare-at-wall']);
  assert.deepEqual(
    DAILY_FOCUS_TASKS.map((task) => task.name),
    ['Run 3k', 'Breakfast', 'Brush My Teeth', 'Cold Shower', 'Gym', 'Reading', 'Meditate', 'Make My Bed', 'Chess', 'Backtesting 5 Trades', 'Stare at the Wall']
  );
  assert.equal(DAILY_FOCUS_TASKS.some((task) => /Desayunar|Leer|Meditar|Mirar/i.test(task.name)), false);
});

test('las tareas usan las duraciones diarias acordadas', () => {
  assert.deepEqual(
    DAILY_FOCUS_TASKS.map((task) => [task.id, task.durationMinutes]),
    [
      ['run3k', 20],
      ['breakfast', 15],
        ['brush-my-teeth', 3],
        ['cold-shower', 10],
        ['gym', 60],
        ['reading', 20],
        ['meditate', 15],
        ['make-my-bed', 2],
        ['chess', 60],
        ['backtesting', 60],
        ['stare-at-wall', 15]
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
    { taskId: 'reading', completed: false, startedAt: null, elapsedMs: 0 }
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
      ['run3k', 15],
      ['breakfast', 10],
        ['brush-my-teeth', 5],
        ['cold-shower', 10],
        ['gym', 60],
        ['reading', 20],
        ['meditate', 15],
        ['make-my-bed', 5],
        ['chess', 30],
        ['backtesting', 50],
        ['stare-at-wall', 15]
    ]
  );
  });

test('el bloqueo diario tiene ventana de mañana y de tarde', () => {
  assert.equal(isDailyFocusWindow(new Date('2026-09-25T07:59:00')), false);
  assert.equal(isDailyFocusWindow(new Date('2026-09-25T08:00:00')), true);
  assert.equal(isDailyFocusWindow(new Date('2026-09-25T14:59:00')), true);
  assert.equal(isDailyFocusWindow(new Date('2026-09-25T15:00:00')), false);
  assert.equal(isDailyFocusWindow(new Date('2026-09-25T17:59:00')), false);
  assert.equal(isDailyFocusWindow(new Date('2026-09-25T18:00:00')), true);
  assert.equal(isDailyFocusWindow(new Date('2026-09-25T19:59:00')), true);
  assert.equal(isDailyFocusWindow(new Date('2026-09-25T20:00:00')), false);
});

test('la mañana excluye Gym y la tarde solo contiene Gym', () => {
  const morning = tasksForFocusWindow(new Date('2026-09-25T09:00:00'));
  const evening = tasksForFocusWindow(new Date('2026-09-25T18:00:00'));
  assert.equal(morning.some((task) => task.id === 'gym'), false);
  assert.equal(morning.some((task) => task.id === 'brush-my-teeth'), true);
  assert.deepEqual(evening.map((task) => task.id), ['gym']);
  assert.deepEqual(tasksForFocusWindow(new Date('2026-09-26T18:00:00')), []);
});

test('cada ventana termina al completar sus tareas', () => {
  const morningProgress = DAILY_FOCUS_TASKS.map((task) => ({
    taskId: task.id,
    completed: task.id !== 'gym',
    elapsedMs: task.durationMinutes * 60 * 1000,
    startedAt: null
  }));
  const eveningProgress = DAILY_FOCUS_TASKS.map((task) => ({
    taskId: task.id,
    completed: task.id === 'gym',
    elapsedMs: task.durationMinutes * 60 * 1000,
    startedAt: null
  }));

  assert.equal(isDailyFocusBlocked(new Date('2026-09-25T09:00:00'), morningProgress), false);
  assert.equal(isDailyFocusBlocked(new Date('2026-09-25T18:00:00'), eveningProgress), false);
});

test('las tareas completadas ayer no aparecen completadas hoy', () => {
  const yesterday = '2026-09-15';
  const today = '2026-09-16';
  const normalized = normalizeDailyFocusProgress(
    DAILY_FOCUS_TASKS.map((task) => ({
      taskId: task.id,
      completed: true,
      startedAt: '2026-09-15T09:00:00.000Z',
      elapsedMs: task.durationMinutes * 60 * 1000,
      dayKey: yesterday
    })),
    today,
    new Date('2026-09-16T09:00:00')
  );

  assert.equal(normalized.every((task) => task.completed === false), true);
  assert.equal(normalized.every((task) => task.startedAt === null), true);
  assert.equal(normalized.every((task) => task.elapsedMs === 0), true);
  assert.equal(normalized.every((task) => task.dayKey === today), true);
});

test('el progreso del mismo dia se conserva', () => {
  const today = '2026-09-16';
  const normalized = normalizeDailyFocusProgress(
    [
      { taskId: 'run3k', completed: true, startedAt: null, elapsedMs: 20 * 60 * 1000, dayKey: today },
      { taskId: 'breakfast', completed: false, startedAt: '2026-09-16T09:00:00.000Z', elapsedMs: 30000, dayKey: today }
    ],
    today,
    new Date('2026-09-16T09:10:00')
  );

  assert.equal(normalized.find((task) => task.taskId === 'run3k')?.completed, true);
  assert.equal(normalized.find((task) => task.taskId === 'breakfast')?.startedAt, '2026-09-16T09:00:00.000Z');
  assert.equal(normalized.find((task) => task.taskId === 'breakfast')?.elapsedMs, 30000);
});

test('el bloqueo diario vuelve a activarse tras reset de dia', () => {
  const yesterday = '2026-09-15';
  const today = '2026-09-16';
  const now = new Date('2026-09-16T11:00:00');
  const normalized = normalizeDailyFocusProgress(
    DAILY_FOCUS_TASKS.map((task) => ({ taskId: task.id, completed: true, dayKey: yesterday })),
    today,
    now
  );

  assert.equal(isDailyFocusBlocked(now, normalized), true);
});

test('datos legacy sin dayKey se resetean', () => {
  const today = '2026-09-16';
  const normalized = normalizeDailyFocusProgress(
    [{ taskId: 'run3k', completed: true, startedAt: '2026-09-15T09:00:00.000Z', elapsedMs: 20 * 60 * 1000 }],
    today,
    new Date('2026-09-16T09:00:00')
  );

  assert.equal(normalized.find((task) => task.taskId === 'run3k')?.completed, false);
  assert.equal(normalized.find((task) => task.taskId === 'run3k')?.startedAt, null);
  assert.equal(normalized.find((task) => task.taskId === 'run3k')?.elapsedMs, 0);
});
