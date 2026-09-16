import { test } from 'node:test';
import assert from 'node:assert/strict';
import { DesktopAppGuard } from '../src/main/desktop-app-guard';

test('el guard no cierra procesos protegidos pero mantiene los bloqueos', async () => {
  const calls: { file: string; args: string[] }[] = [];
  const guard = new DesktopAppGuard(async (file, args) => {
    calls.push({ file, args });
    return {};
  });

  await guard.setBlocked(['TradingView.exe', 'steam.exe'], true, ['TradingView.exe']);
  guard.stop();

  assert.equal(calls.some((call) => call.file === 'taskkill.exe' && call.args.includes('TradingView.exe')), false);
  assert.equal(calls.some((call) => call.file === 'taskkill.exe' && call.args.includes('steam.exe')), true);
  assert.equal(calls.some((call) => call.file === 'powershell.exe' && call.args.join(' ').includes('tradingview.exe')), true);
});