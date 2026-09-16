import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  isCommitmentEnforcedNow,
  domainsToBlock,
  buildCalendar,
  currentStreak,
  commitmentStats
} from '../src/shared/schedule';
import { buildManagedBlock, renderHostsFile, sanitizeDomains, stripManagedBlock } from '../src/shared/hosts-file';
import { Commitment } from '../src/shared/types';
import { BUILTIN_SCRIPTS } from '../src/shared/builtin-scripts';

function commitment(overrides: Partial<Commitment> = {}): Commitment {
  return {
    _id: '1',
    scriptId: 'domain-block',
    scriptName: 'Bloqueo de YouTube',
    name: 'Bloqueo de YouTube',
    blockedDomains: ['youtube.com'],
    days: [1, 2, 3, 4, 5],
    startTime: '09:00',
    endTime: '18:00',
    startsAt: '2026-01-01T00:00:00.000Z',
    endsAt: '2026-12-31T23:59:59.000Z',
    status: 'active',
    ...overrides
  };
}

// 2026-09-07 is a Monday.
const mondayAt = (time: string) => new Date(`2026-09-07T${time}:00`);
const tuesdayAt = (time: string) => new Date(`2026-09-08T${time}:00`);
const fridayAt = (time: string) => new Date(`2026-09-11T${time}:00`);
const saturdayAt = (time: string) => new Date(`2026-09-05T${time}:00`);
const sundayAt = (time: string) => new Date(`2026-09-06T${time}:00`);

test('bloquea dentro de la franja horaria en un dia seleccionado', () => {
  assert.equal(isCommitmentEnforcedNow(commitment(), mondayAt('10:30')), true);
});

test('no bloquea antes de la hora de inicio', () => {
  assert.equal(isCommitmentEnforcedNow(commitment(), mondayAt('08:59')), false);
});

test('no bloquea en el minuto de fin', () => {
  assert.equal(isCommitmentEnforcedNow(commitment(), mondayAt('18:00')), false);
});

test('no bloquea en un dia no seleccionado', () => {
  assert.equal(isCommitmentEnforcedNow(commitment(), saturdayAt('10:30')), false);
});

test('no bloquea fuera del periodo del compromiso', () => {
  const past = commitment({ endsAt: '2026-01-31T23:59:59.000Z' });
  assert.equal(isCommitmentEnforcedNow(past, mondayAt('10:30')), false);
});

test('no bloquea compromisos cancelados', () => {
  assert.equal(isCommitmentEnforcedNow(commitment({ status: 'cancelled' }), mondayAt('10:30')), false);
});

test('combina dominios de varios compromisos sin duplicados', () => {
  const domains = domainsToBlock(
    [
      commitment({ _id: '1', blockedDomains: ['youtube.com', 'youtu.be'] }),
      commitment({ _id: '2', blockedDomains: ['youtube.com', 'tiktok.com'] }),
      commitment({ _id: '3', blockedDomains: ['instagram.com'], days: [0] })
    ],
    mondayAt('10:30')
  );
  assert.deepEqual(domains, ['tiktok.com', 'youtu.be', 'youtube.com']);
});

test('YouTube se bloquea todos los dias durante todo el dia', () => {
  const youtube = commitment({
    scriptId: 'builtin-youtube',
    blockedDomains: ['youtube.com', 'youtu.be'],
    days: [0, 1, 2, 3, 4, 5, 6],
    startTime: '00:00',
    endTime: '24:00'
  });

  assert.equal(isCommitmentEnforcedNow(youtube, mondayAt('00:00')), true);
  assert.equal(isCommitmentEnforcedNow(youtube, fridayAt('23:59')), true);
  assert.equal(isCommitmentEnforcedNow(youtube, saturdayAt('12:00')), true);
  assert.equal(isCommitmentEnforcedNow(youtube, sundayAt('12:00')), true);
  assert.deepEqual(domainsToBlock([youtube], saturdayAt('12:00')), ['youtu.be', 'youtube.com']);
  assert.deepEqual(domainsToBlock([youtube], sundayAt('12:00')), ['youtu.be', 'youtube.com']);
});

test('el bloqueo de videojuegos no aporta dominios de YouTube', () => {
  const games = commitment({ scriptId: 'builtin-games', blockedDomains: [], alwaysBlocked: true });
  assert.deepEqual(domainsToBlock([games], mondayAt('10:30')), []);
});

test('todos los bloqueos web activos aportan sus dominios y videojuegos ninguno', () => {
  const commitments = BUILTIN_SCRIPTS.map((script) => commitment({
    _id: script._id,
    scriptId: script._id,
    scriptName: script.name,
    blockedDomains: script.blockedDomains,
    alwaysBlocked: script.blockingMode === 'always' || script.blockingMode === 'daily-limit',
    days: script.schedule?.days ?? [0, 1, 2, 3, 4, 5, 6],
    startTime: script.schedule?.startTime ?? '00:00',
    endTime: script.schedule?.endTime ?? '23:59'
  }));
  const expected = [...new Set(BUILTIN_SCRIPTS.flatMap((script) => script.blockedDomains))].sort();
  const actual = domainsToBlock(commitments, fridayAt('16:00'));

  assert.deepEqual(actual, expected);
  assert.equal(actual.includes('steam.exe'), false);
  assert.equal(actual.includes('youtube.com'), true);
  assert.equal(actual.includes('instagram.com'), true);
});

test('hosts genera aliases para todos los dominios bloqueables', () => {
  const domains = [...new Set(BUILTIN_SCRIPTS.flatMap((script) => script.blockedDomains))];
  const block = buildManagedBlock(domains);

  for (const domain of domains) {
    assert.ok(block.includes(`127.0.0.1 ${domain}`));
    assert.ok(block.includes(`::1 ${domain}`));
  }
  assert.equal(block.includes('127.0.0.1 steam.exe'), false);
  assert.equal(block.includes('127.0.0.1 unrelated.example'), false);
});

test('descarta dominios con formato invalido', () => {
  assert.deepEqual(sanitizeDomains([' YouTube.com ', 'no-es-un-dominio', '', 'youtube.com']), [
    'youtube.com'
  ]);
});

test('anade el bloque gestionado sin tocar el contenido original', () => {
  const original = '127.0.0.1 localhost\r\n10.0.0.1 intranet\r\n';
  const result = renderHostsFile(original, ['youtube.com']);

  assert.ok(result.startsWith('127.0.0.1 localhost\r\n10.0.0.1 intranet'));
  assert.ok(result.includes('127.0.0.1 youtube.com'));
  assert.ok(result.includes('127.0.0.1 www.youtube.com'));
});

test('preserva entradas manuales al reemplazar el bloque gestionado', () => {
  const original = '127.0.0.1 localhost\r\n10.0.0.1 intranet\r\n# comentario manual\r\n';
  const result = renderHostsFile(original, ['youtube.com']);
  assert.ok(result.includes('10.0.0.1 intranet'));
  assert.ok(result.includes('# comentario manual'));
});

test('quitar el bloqueo restaura exactamente el archivo original', () => {
  const original = '127.0.0.1 localhost\r\n10.0.0.1 intranet\r\n';
  const blocked = renderHostsFile(original, ['youtube.com']);

  assert.equal(renderHostsFile(blocked, []), original);
});

test('no duplica el bloque al aplicarlo dos veces', () => {
  const original = '127.0.0.1 localhost\r\n';
  const once = renderHostsFile(original, ['youtube.com']);
  const twice = renderHostsFile(once, ['youtube.com']);

  assert.equal(once, twice);
});

test('deja intacto un archivo sin bloque gestionado', () => {
  const original = '127.0.0.1 localhost\r\n';
  assert.equal(stripManagedBlock(original), original);
});

test('genera aliases comunes para cada dominio bloqueado', () => {
  const block = buildManagedBlock(['example.com']);

  assert.ok(block.includes('127.0.0.1 example.com'));
  assert.ok(block.includes('127.0.0.1 www.example.com'));
  assert.ok(block.includes('127.0.0.1 api.example.com'));
  assert.ok(block.includes('127.0.0.1 cdn.example.com'));
  assert.ok(block.includes('::1 media.example.com'));
});

test('los aliases se limitan al dominio solicitado', () => {
  const block = buildManagedBlock(['example.com']);

  assert.equal(block.includes('youtube.com'), false);
  assert.equal(block.includes('instagram.com'), false);
  assert.equal(block.includes('other.example.com'), false);
});

test('no genera entradas wildcard invalidas en hosts', () => {
  const block = buildManagedBlock(['example.com']);

  assert.equal(block.includes('*.'), false);
  assert.equal(block.includes('*.example.com'), false);
});

test('el calendario cubre 28 dias terminando hoy', () => {
  const calendar = buildCalendar([commitment()], mondayAt('12:00'));

  assert.equal(calendar.length, 28);
  assert.equal(calendar[27].date.getDate(), 7);
});

test('el calendario marca solo los dias programados', () => {
  const soloLunes = commitment({ days: [1] });
  const calendar = buildCalendar([soloLunes], mondayAt('12:00'));

  assert.equal(calendar.filter((day) => day.scheduled).length, 4);
  assert.ok(calendar.every((day) => !day.scheduled || day.date.getDay() === 1));
});

test('la racha cuenta los dias programados desde el inicio del compromiso', () => {
  // Del 1 al 6 de septiembre solo hay 4 dias laborables antes del lunes 7.
  const reciente = commitment({ startsAt: '2026-09-01T00:00:00.000Z' });
  assert.equal(currentStreak([reciente], mondayAt('12:00')), 4);
});

test('la racha ignora los dias no programados sin romperse', () => {
  const soloLunes = commitment({ days: [1], startsAt: '2026-08-24T00:00:00.000Z' });
  assert.equal(currentStreak([soloLunes], mondayAt('12:00')), 2);
});

test('sin compromisos no hay racha', () => {
  assert.equal(currentStreak([], mondayAt('12:00')), 0);
});

test('las estadisticas separan compromisos en curso y cumplidos', () => {
  const stats = commitmentStats(
    [
      commitment({ _id: '1' }),
      commitment({ _id: '2', endsAt: '2026-01-31T23:59:59.000Z' }),
      commitment({ _id: '3', status: 'cancelled' })
    ],
    mondayAt('12:00')
  );

  assert.equal(stats.total, 3);
  assert.equal(stats.running, 1);
  assert.equal(stats.completed, 1);
});

test('un bloqueo permanente ignora dias y horas', () => {
  const permanent = commitment({
    alwaysBlocked: true,
    days: [],
    startTime: '23:59',
    endTime: '00:01'
  });

  assert.equal(isCommitmentEnforcedNow(permanent, mondayAt('12:00')), true);
  assert.equal(isCommitmentEnforcedNow(permanent, saturdayAt('03:00')), true);
});

test('un bloqueo permanente sigue respetando sus fechas', () => {
  const permanent = commitment({
    alwaysBlocked: true,
    startsAt: '2026-09-08T00:00:00.000Z',
    endsAt: '2026-09-12T23:59:59.000Z'
  });

  assert.equal(isCommitmentEnforcedNow(permanent, mondayAt('12:00')), false);
  assert.equal(isCommitmentEnforcedNow(permanent, tuesdayAt('12:00')), true);
  assert.equal(isCommitmentEnforcedNow(permanent, sundayAt('12:00')), false);
});

test('el limite diario de Instagram no se activa por la evaluacion de horario', () => {
  const instagram = commitment({
    scriptId: 'builtin-instagram',
    scriptName: 'Bloqueo de Instagram',
    blockedDomains: ['instagram.com'],
    alwaysBlocked: false,
    days: [1, 2, 3, 4, 5, 6, 0],
    startTime: '00:00',
    endTime: '23:59'
  });

  assert.equal(isCommitmentEnforcedNow(instagram, mondayAt('12:00')), true);
  assert.equal(isCommitmentEnforcedNow(instagram, sundayAt('12:00')), true);
});
