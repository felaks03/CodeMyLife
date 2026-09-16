import test from 'node:test';
import assert from 'node:assert/strict';
import {
  ANTI_EVASION_UNLOCK_DELAY_MS,
  ANTI_EVASION_UNLOCK_GRACE_MS,
  AntiEvasionState,
  beginUnlockDelay,
  canDisableBlocking,
  isUnlockWindowExpired
} from '../src/main/anti-evasion-store';

function state(unlockAvailableAt: string | null): AntiEvasionState {
  return {
    enabled: true,
    unlockRequestedAt: null,
    unlockAvailableAt,
    attempts: []
  };
}

test('el modo antievasion usa cinco horas de retardo y cinco minutos de gracia', () => {
  assert.equal(ANTI_EVASION_UNLOCK_DELAY_MS, 5 * 60 * 60 * 1000);
  assert.equal(ANTI_EVASION_UNLOCK_GRACE_MS, 5 * 60 * 1000);
});

test('no permite desactivar antes de que termine el retardo', () => {
  const unlockAt = '2026-09-16T15:00:00.000Z';

  assert.equal(canDisableBlocking(state(unlockAt), new Date('2026-09-16T14:59:59.000Z')), false);
});

test('permite desactivar durante los cinco minutos de gracia', () => {
  const unlockAt = '2026-09-16T15:00:00.000Z';

  assert.equal(canDisableBlocking(state(unlockAt), new Date('2026-09-16T15:00:00.000Z')), true);
  assert.equal(canDisableBlocking(state(unlockAt), new Date('2026-09-16T15:05:00.000Z')), true);
});

test('caduca la posibilidad de desactivar despues de la ventana de gracia', () => {
  const unlockAt = '2026-09-16T15:00:00.000Z';
  const afterGrace = new Date('2026-09-16T15:05:01.000Z');

  assert.equal(canDisableBlocking(state(unlockAt), afterGrace), false);
  assert.equal(isUnlockWindowExpired(state(unlockAt), afterGrace), true);
});

test('reinicia el retardo cuando la ventana de gracia anterior ha caducado', () => {
  const expiredState: AntiEvasionState = {
    enabled: true,
    unlockRequestedAt: '2026-09-16T09:00:00.000Z',
    unlockAvailableAt: '2026-09-16T14:00:00.000Z',
    attempts: [{ requestedAt: '2026-09-16T09:00:00.000Z', reason: 'old' }]
  };
  const now = new Date('2026-09-16T14:05:01.000Z');
  const next = beginUnlockDelay(expiredState, now, 'retry');

  assert.equal(next.unlockRequestedAt, '2026-09-16T14:05:01.000Z');
  assert.equal(next.unlockAvailableAt, '2026-09-16T19:05:01.000Z');
  assert.deepEqual(next.attempts.map((attempt) => attempt.reason), ['old', 'retry']);
});

test('conserva el primer retardo cuando aun no ha caducado', () => {
  const currentState: AntiEvasionState = {
    enabled: true,
    unlockRequestedAt: '2026-09-16T09:00:00.000Z',
    unlockAvailableAt: '2026-09-16T14:00:00.000Z',
    attempts: []
  };
  const next = beginUnlockDelay(currentState, new Date('2026-09-16T12:00:00.000Z'), 'second-click');

  assert.equal(next.unlockRequestedAt, '2026-09-16T09:00:00.000Z');
  assert.equal(next.unlockAvailableAt, '2026-09-16T14:00:00.000Z');
  assert.equal(next.attempts.at(-1)?.reason, 'second-click');
});