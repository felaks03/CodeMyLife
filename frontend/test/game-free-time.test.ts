import { test } from 'node:test';
import assert from 'node:assert/strict';
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
