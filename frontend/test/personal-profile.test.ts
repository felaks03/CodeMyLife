import { test } from 'node:test';
import assert from 'node:assert/strict';
import { BUILTIN_SCRIPTS, INSTAGRAM_DOMAINS } from '../src/shared/builtin-scripts';
import { commitmentStats, domainsToBlock, isCommitmentEnforcedNow, shouldShowLockScreen } from '../src/shared/schedule';
import { Commitment, Script } from '../src/shared/types';

const DEFAULT_LOCK_CONFIG = Object.freeze({
  days: [0, 1, 2, 3, 4, 5, 6],
  startTime: '09:00',
  endTime: '18:00'
});

function commitment(script: Script, overrides: Partial<Commitment> = {}): Commitment {
  const config = script.schedule ?? DEFAULT_LOCK_CONFIG;
  return {
    _id: `lock-${script._id}`,
    scriptId: script._id,
    scriptName: script.name,
    name: `${script.name} - Weekly lock`,
    blockedDomains: script.blockedDomains,
    days: [...config.days],
    startTime: config.startTime,
    endTime: config.endTime,
    startsAt: '2026-09-07T00:00:00.000Z',
    endsAt: '2026-09-13T23:59:59.999Z',
    status: 'active',
    ...overrides
  };
}

const mondayAt = (time: string) => new Date(`2026-09-07T${time}:00`);
const fridayAt = (time: string) => new Date(`2026-09-11T${time}:00`);
const sundayAt = (time: string) => new Date(`2026-09-13T${time}:00`);
const saturdayAt = (time: string) => new Date(`2026-09-05T${time}:00`);

test('el perfil personal incluye todos los scripts integrados', () => {
  assert.ok(BUILTIN_SCRIPTS.length > 0);
  assert.ok(BUILTIN_SCRIPTS.every((script) => script._id.startsWith('builtin-')));
  assert.ok(BUILTIN_SCRIPTS.filter((script) => !script.showLockScreen).every((script) => script.blockedDomains.length > 0));
});

test('las redes sociales estan separadas entre Instagram y el resto', () => {
  const instagram = BUILTIN_SCRIPTS.find((script) => script._id === 'builtin-instagram');
  const rest = BUILTIN_SCRIPTS.find((script) => script._id === 'builtin-social-rest');

  assert.ok(instagram);
  assert.ok(rest);
  assert.deepEqual(instagram.blockedDomains, INSTAGRAM_DOMAINS);
  assert.equal(instagram.blockingMode, 'daily-limit');
  assert.equal(instagram.dailyLimitMinutes, 15);
  assert.deepEqual(rest.blockedDomains, ['tiktok.com', 'x.com', 'twitter.com']);
  assert.equal(rest.blockingMode, 'always');
});

test('el resto de redes permanece bloqueado fuera de cualquier horario', () => {
  const rest = BUILTIN_SCRIPTS.find((script) => script._id === 'builtin-social-rest')!;
  const lock = commitment(rest, {
    startsAt: '2026-01-01T00:00:00.000Z',
    endsAt: '2026-12-31T23:59:59.000Z',
    days: [],
    startTime: '23:59',
    endTime: '00:01',
    alwaysBlocked: true
  });

  assert.equal(isCommitmentEnforcedNow(lock, sundayAt('03:00')), true);
});

test('Lock week crea una configuracion para cada script', () => {
  const locks = BUILTIN_SCRIPTS.map((script) => commitment(script));

  assert.equal(locks.length, BUILTIN_SCRIPTS.length);
  assert.deepEqual(
    locks.map((lock) => lock.scriptId),
    BUILTIN_SCRIPTS.map((script) => script._id)
  );
});

test('el bloqueo de YouTube solo funciona de lunes a viernes', () => {
  const youtube = commitment(BUILTIN_SCRIPTS.find((script) => script._id === 'builtin-youtube')!);

  assert.deepEqual(youtube.days, [1, 2, 3, 4, 5]);
  assert.equal(isCommitmentEnforcedNow(youtube, fridayAt('15:30')), true);
  assert.equal(isCommitmentEnforcedNow(youtube, sundayAt('15:30')), false);
});

test('el bloqueo de YouTube respeta el horario de 15 a 17', () => {
  const lock = commitment(BUILTIN_SCRIPTS.find((script) => script._id === 'builtin-youtube')!);

  assert.equal(lock.startTime, '15:00');
  assert.equal(lock.endTime, '17:00');
  assert.equal(isCommitmentEnforcedNow(lock, fridayAt('14:59')), false);
  assert.equal(isCommitmentEnforcedNow(lock, fridayAt('17:00')), false);
});

test('los dominios de todos los scripts se combinan sin duplicados', () => {
  const locks = BUILTIN_SCRIPTS.map((script) => commitment(script));
  const expected = [...new Set(BUILTIN_SCRIPTS.flatMap((script) => script.blockedDomains))].sort();

  assert.deepEqual(domainsToBlock(locks, fridayAt('16:00')), expected);
});

test('un script ya bloqueado esta semana no se vuelve a contar como nuevo', () => {
  const existing = commitment(BUILTIN_SCRIPTS[0]);
  const existingScriptIds = new Set([existing.scriptId]);
  const scriptsToLock = BUILTIN_SCRIPTS.filter((script) => !existingScriptIds.has(script._id));

  assert.equal(scriptsToLock.includes(BUILTIN_SCRIPTS[0]), false);
  assert.equal(scriptsToLock.length, BUILTIN_SCRIPTS.length - 1);
});

test('las estadisticas cuentan el conjunto global de bloqueos', () => {
  const locks = BUILTIN_SCRIPTS.map((script) => commitment(script));
  const stats = commitmentStats(locks, mondayAt('12:00'));

  assert.equal(stats.total, BUILTIN_SCRIPTS.length);
  assert.equal(stats.running, BUILTIN_SCRIPTS.length);
  assert.equal(stats.completed, 0);
});

test('el bloqueo de dormir se activa de medianoche a las ocho', () => {
  const sleep = {
    ...commitment(BUILTIN_SCRIPTS[0]),
    showLockScreen: true,
    days: [0, 1, 2, 3, 4, 5, 6],
    startTime: '00:00',
    endTime: '08:00',
    startsAt: '2026-01-01T00:00:00.000Z',
    endsAt: '2026-12-31T23:59:59.000Z'
  };

  assert.equal(isCommitmentEnforcedNow(sleep, saturdayAt('00:00')), true);
  assert.equal(isCommitmentEnforcedNow(sleep, saturdayAt('07:59')), true);
  assert.equal(isCommitmentEnforcedNow(sleep, saturdayAt('08:00')), false);
  assert.equal(isCommitmentEnforcedNow(sleep, saturdayAt('23:00')), false);
});

test('la pantalla de dormir solo aparece si el script la solicita', () => {
  const regular = commitment(BUILTIN_SCRIPTS[0]);
  const sleep = {
    ...regular,
    showLockScreen: true,
    days: [0, 1, 2, 3, 4, 5, 6],
    startTime: '00:00',
    endTime: '08:00',
    startsAt: '2026-01-01T00:00:00.000Z',
    endsAt: '2026-12-31T23:59:59.000Z'
  };

  assert.equal(shouldShowLockScreen([regular], saturdayAt('04:00')), false);
  assert.equal(shouldShowLockScreen([sleep], saturdayAt('04:00')), true);
  assert.equal(shouldShowLockScreen([sleep], saturdayAt('08:00')), false);
});
