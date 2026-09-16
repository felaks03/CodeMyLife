import { test } from 'node:test';
import assert from 'node:assert/strict';
import { filterTradingDomains, isTradingAccessWindow, isTradingDomain, TRADING_ALLOWED_PROCESSES } from '../src/shared/trading-access';

test('la ventana de trading cubre de 08:00 a 15:00', () => {
  assert.equal(isTradingAccessWindow(new Date('2026-09-16T07:59:00')), false);
  assert.equal(isTradingAccessWindow(new Date('2026-09-16T08:00:00')), true);
  assert.equal(isTradingAccessWindow(new Date('2026-09-16T14:59:00')), true);
  assert.equal(isTradingAccessWindow(new Date('2026-09-16T15:00:00')), false);
});

test('los dominios de trading se reconocen por raiz y subdominio', () => {
  assert.equal(isTradingDomain('tradingview.com'), true);
  assert.equal(isTradingDomain('www.tradingview.com'), true);
  assert.equal(isTradingDomain('live.tradovate.com'), true);
  assert.equal(isTradingDomain('youtube.com'), false);
  assert.equal(isTradingDomain('fake-tradingview.com'), false);
});

test('el filtro libera trading durante tareas y mantiene el resto bloqueado', () => {
  const domains = ['youtube.com', 'tradingview.com', 'live.tradovate.com', 'instagram.com'];
  assert.deepEqual(filterTradingDomains(domains, new Date('2026-09-16T10:00:00')), ['youtube.com', 'instagram.com']);
  assert.deepEqual(filterTradingDomains(domains, new Date('2026-09-16T15:00:00')), domains);
});

test('la allowlist de procesos de trading vive separada de juegos', () => {
  assert.ok(TRADING_ALLOWED_PROCESSES.includes('TradingView.exe'));
  assert.ok(TRADING_ALLOWED_PROCESSES.some((processName) => processName.toLowerCase().includes('tradovate')));
});