import { test } from 'node:test';
import assert from 'node:assert/strict';
import { BUILTIN_SCRIPTS } from '../src/shared/builtin-scripts';
import { isCommitmentEnforcedNow, nextExecutableStart, nextSleepStart } from '../src/shared/schedule';
import { GAME_FREE_WINDOWS, isGameBlockingDay, isGameFreeTime, isYoutubeFreeTime } from '../src/shared/game-free-time';

function at(dateIso: string): Date {
  return new Date(dateIso);
}

test('los videojuegos no tienen ventana libre por defecto', () => {
  assert.equal(isGameFreeTime(at('2026-09-18T16:59:00')), false);
  assert.equal(isGameFreeTime(at('2026-09-18T17:00:00')), false);
  assert.equal(isGameFreeTime(at('2026-09-19T12:00:00')), false);
  assert.equal(isGameFreeTime(at('2026-09-20T23:59:00')), false);
});

test('la ventana libre queda vacia', () => {
  assert.deepEqual(GAME_FREE_WINDOWS, []);
});

test('el bloqueo de videojuegos solo se aplica de lunes a viernes', () => {
  assert.equal(isGameBlockingDay(at('2026-09-25T12:00:00')), true);
  assert.equal(isGameBlockingDay(at('2026-09-26T12:00:00')), false);
  assert.equal(isGameBlockingDay(at('2026-09-27T12:00:00')), false);
});

test('YouTube queda libre desde el viernes a las 17 hasta el domingo a las 17', () => {
  assert.equal(isYoutubeFreeTime(at('2026-09-25T16:59:00')), false);
  assert.equal(isYoutubeFreeTime(at('2026-09-25T17:00:00')), true);
  assert.equal(isYoutubeFreeTime(at('2026-09-26T12:00:00')), true);
  assert.equal(isYoutubeFreeTime(at('2026-09-27T16:59:00')), true);
  assert.equal(isYoutubeFreeTime(at('2026-09-27T17:00:00')), false);
  assert.equal(isYoutubeFreeTime(at('2026-09-28T09:00:00')), false);
});

test('el bloqueo de dormir aplica todos los dias', () => {
  const sleepScript = BUILTIN_SCRIPTS.find((script) => script._id === 'builtin-sleep');
  assert.ok(sleepScript);
  assert.deepEqual(sleepScript!.schedule?.days, [0, 1, 2, 3, 4, 5, 6]);

  const commitment = {
    _id: 'sleep-commitment',
    scriptId: 'builtin-sleep',
    scriptName: 'Bloqueo de dormir',
    name: 'Bloqueo de dormir',
    blockedDomains: [],
    days: sleepScript!.schedule!.days,
    startTime: '00:00',
    endTime: '08:00',
    startsAt: '2026-09-01T00:00:00Z',
    endsAt: '2026-12-31T23:59:59Z',
    status: 'active' as const,
    showLockScreen: true
  };

  assert.equal(isCommitmentEnforcedNow(commitment, new Date('2026-09-18T01:00:00')), true);
  assert.equal(isCommitmentEnforcedNow(commitment, new Date('2026-09-19T01:00:00')), true);
  assert.equal(isCommitmentEnforcedNow(commitment, new Date('2026-09-20T01:00:00')), true);
});

test('calcula el siguiente inicio de bloqueo de sueño y de tareas', () => {
  const now = new Date(2026, 8, 17, 18, 0, 0);
  const sleepStart = nextSleepStart(now);
  assert.ok(sleepStart);
  assert.equal(sleepStart!.getDay(), 5);
  assert.equal(sleepStart!.getHours(), 0);

  const tasks = [{
    _id: 'task-1',
    scriptId: 'builtin-youtube',
    scriptName: 'Bloqueo de YouTube',
    name: 'YouTube',
    blockedDomains: ['youtube.com'],
    days: [1, 2, 3, 4, 5, 6, 0],
    startTime: '09:00',
    endTime: '18:00',
    startsAt: '2026-09-01T00:00:00Z',
    endsAt: '2026-12-31T23:59:59Z',
    status: 'active' as const
  }];

  const nextTaskStart = nextExecutableStart(tasks, now);
  assert.ok(nextTaskStart);
  assert.equal(nextTaskStart!.getDay(), 5);
  assert.equal(nextTaskStart!.getHours(), 9);
});

test('el bloqueo de dormir se reprograma cada noche', () => {
  assert.ok(nextSleepStart(new Date(2026, 8, 18, 12, 0, 0)));
  assert.ok(nextSleepStart(new Date(2026, 8, 19, 12, 0, 0)));
  assert.ok(nextSleepStart(new Date(2026, 8, 20, 12, 0, 0)));
  assert.ok(nextSleepStart(new Date(2026, 8, 21, 12, 0, 0)));
});

test('un compromiso antiguo de dormir no puede forzar bloqueo permanente', () => {
  const sleepCommitment = {
    _id: 'old-sleep-commitment',
    scriptId: 'builtin-sleep',
    scriptName: 'Bloqueo de dormir',
    name: 'Bloqueo de dormir',
    blockedDomains: [],
    days: [0, 1, 2, 3, 4],
    startTime: '00:00',
    endTime: '08:00',
    startsAt: '2026-09-01T00:00:00Z',
    endsAt: '2026-12-31T23:59:59Z',
    alwaysBlocked: true,
    status: 'active' as const,
    showLockScreen: true
  };

  assert.equal(isCommitmentEnforcedNow(sleepCommitment, new Date('2026-09-19T01:00:00')), false);
});
