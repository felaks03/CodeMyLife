import test from 'node:test';
import assert from 'node:assert/strict';
import { createCommitmentSchema } from '../src/routes/commitment.routes';

const validPayload = {
  scriptId: '507f1f77bcf86cd799439011',
  name: 'YouTube full-day lock',
  customDomains: [],
  days: [1, 2, 3, 4, 5, 6],
  startTime: '00:00',
  endTime: '24:00',
  startsAt: '2026-09-16T00:00:00.000Z',
  endsAt: '2026-09-23T23:59:59.999Z'
};

test('acepta 24:00 como hora final de un bloqueo de dia completo', () => {
  const parsed = createCommitmentSchema.safeParse(validPayload);

  assert.equal(parsed.success, true);
});

test('rechaza 24:00 como hora inicial', () => {
  const parsed = createCommitmentSchema.safeParse({
    ...validPayload,
    startTime: '24:00'
  });

  assert.equal(parsed.success, false);
});

test('rechaza horas finales posteriores a 24:00', () => {
  const parsed = createCommitmentSchema.safeParse({
    ...validPayload,
    endTime: '24:01'
  });

  assert.equal(parsed.success, false);
});