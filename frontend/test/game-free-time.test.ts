import { test } from 'node:test';
import assert from 'node:assert/strict';
import { BUILTIN_SCRIPTS } from '../src/shared/builtin-scripts';
import { isCommitmentEnforcedNow, nextExecutableStart, nextSleepStart } from '../src/shared/schedule';
import { GAME_FREE_WINDOWS, isGameFreeTime } from '../src/shared/game-free-time';

function at(dateIso: string): Date {
  return new Date(dateIso);
}

test('el viernes queda libre desde las 17:00 hasta las 00:00', () => {
  assert.equal(isGameFreeTime(at('2026-09-18T16:59:00')), false);
  assert.equal(isGameFreeTime(at('2026-09-18T17:00:00')), true);
  assert.equal(isGameFreeTime(at('2026-09-18T23:59:00')), true);
  assert.equal(isGameFreeTime(at('2026-09-19T00:00:00')), true);
});

test('el sabado y el domingo quedan libres todo el dia', () => {
  assert.equal(isGameFreeTime(at('2026-09-19T00:00:00')), true);
  assert.equal(isGameFreeTime(at('2026-09-19T12:00:00')), true);
  assert.equal(isGameFreeTime(at('2026-09-19T23:59:00')), true);

  assert.equal(isGameFreeTime(at('2026-09-20T00:00:00')), true);
  assert.equal(isGameFreeTime(at('2026-09-20T12:00:00')), true);
  assert.equal(isGameFreeTime(at('2026-09-20T23:59:00')), true);
});

test('los dias de lunes a jueves no tienen ventana libre', () => {
  assert.equal(isGameFreeTime(at('2026-09-14T17:30:00')), false);
  assert.equal(isGameFreeTime(at('2026-09-17T18:00:00')), false);
});

test('la ventana libre define exactamente viernes desde 17:00 y fin de semana todo el dia', () => {
  assert.deepEqual(GAME_FREE_WINDOWS, [
    { day: 5, startTime: '17:00', endTime: '24:00' },
    { day: 6, startTime: '00:00', endTime: '24:00' },
    { day: 0, startTime: '00:00', endTime: '24:00' }
  ]);
});

test('el bloqueo de dormir no aplica los viernes ni los sabados', () => {
  const sleepScript = BUILTIN_SCRIPTS.find((script) => script._id === 'builtin-sleep');
  assert.ok(sleepScript);
  assert.deepEqual(sleepScript!.schedule?.days, [0, 1, 2, 3, 4]);

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

  assert.equal(isCommitmentEnforcedNow(commitment, new Date('2026-09-18T01:00:00')), false);
  assert.equal(isCommitmentEnforcedNow(commitment, new Date('2026-09-19T01:00:00')), false);
  assert.equal(isCommitmentEnforcedNow(commitment, new Date('2026-09-20T01:00:00')), true);
});

test('calcula el siguiente inicio de bloqueo de sueño y de tareas', () => {
  const now = new Date(2026, 8, 17, 18, 0, 0);
  const sleepStart = nextSleepStart(now);
  assert.ok(sleepStart);
  assert.equal(sleepStart!.getDay(), 0);
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

test('no muestra el bloqueo de dormir en viernes ni sabado', () => {
  assert.equal(nextSleepStart(new Date(2026, 8, 18, 12, 0, 0)), null);
  assert.equal(nextSleepStart(new Date(2026, 8, 19, 12, 0, 0)), null);
  assert.ok(nextSleepStart(new Date(2026, 8, 20, 12, 0, 0)));
});
