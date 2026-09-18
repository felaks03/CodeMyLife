import { test } from 'node:test';
import assert from 'node:assert/strict';
import { GAME_FREE_WINDOWS, isGameFreeTime } from '../src/shared/game-free-time';

function at(dateIso: string): Date {
  return new Date(dateIso);
}

test('el viernes queda libre de 17:00 a 19:00', () => {
  assert.equal(isGameFreeTime(at('2026-09-18T16:59:00')), false);
  assert.equal(isGameFreeTime(at('2026-09-18T17:00:00')), true);
  assert.equal(isGameFreeTime(at('2026-09-18T18:59:00')), true);
  assert.equal(isGameFreeTime(at('2026-09-18T19:00:00')), false);
});

test('el sabado y el domingo quedan libres de 16:00 a 19:00', () => {
  assert.equal(isGameFreeTime(at('2026-09-19T15:59:00')), false);
  assert.equal(isGameFreeTime(at('2026-09-19T16:00:00')), true);
  assert.equal(isGameFreeTime(at('2026-09-19T18:59:00')), true);
  assert.equal(isGameFreeTime(at('2026-09-19T19:00:00')), false);

  assert.equal(isGameFreeTime(at('2026-09-20T16:30:00')), true);
  assert.equal(isGameFreeTime(at('2026-09-20T19:00:00')), false);
});

test('los dias de lunes a jueves no tienen ventana libre', () => {
  assert.equal(isGameFreeTime(at('2026-09-14T17:30:00')), false);
  assert.equal(isGameFreeTime(at('2026-09-17T18:00:00')), false);
});

test('la ventana libre define exactamente viernes 2h y fin de semana 3h', () => {
  assert.deepEqual(GAME_FREE_WINDOWS, [
    { day: 5, startTime: '17:00', endTime: '19:00' },
    { day: 6, startTime: '16:00', endTime: '19:00' },
    { day: 0, startTime: '16:00', endTime: '19:00' }
  ]);
});
