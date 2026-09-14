import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'fs';
import { resolve } from 'path';

const root = resolve(__dirname, '..', '..');
const read = (file: string) => readFileSync(resolve(root, file), 'utf8');

test('la UI no expone previews ni bloqueos de prueba', () => {
  const html = read('src/renderer/index.html');
  const renderer = read('src/renderer/renderer.js');
  assert.equal(/preview-daily-focus|test-lock|exit-test-lock|Vista previa|Bloqueo de prueba/.test(html + renderer), false);
});

test('el inventario usa filas de tiempo con layout comun', () => {
  const renderer = read('src/renderer/renderer.js');
  const styles = read('src/renderer/styles.css');
  assert.match(renderer, /inventory-time-row/);
  assert.match(renderer, /inventory-instagram-timer/);
  assert.match(renderer, /inventory-video-timer/);
  assert.match(styles, /grid-template-columns: minmax\(0, 1fr\) 52px 116px/);
});

test('las notificaciones tienen estados success y error fijos', () => {
  const renderer = read('src/renderer/renderer.js');
  const styles = read('src/renderer/styles.css');
  assert.match(renderer, /showNotice\(message, type = 'error'\)/);
  assert.match(styles, /\.banner\.success/);
  assert.match(styles, /\.banner\.error/);
  assert.match(styles, /position: fixed/);
});

test('el bloqueo diario se reconcilia por pantalla', () => {
  const main = read('src/main/main.ts');
  assert.match(main, /screen\.getAllDisplays\(\)/);
  assert.match(main, /dailyFocusLockWindows = new Map/);
  assert.match(main, /display-added/);
  assert.match(main, /display-removed/);
  assert.match(main, /display-metrics-changed/);
});

test('el updater solo se configura para builds empaquetadas', () => {
  const main = read('src/main/main.ts');
  const packageJson = JSON.parse(read('package.json')) as { dependencies?: Record<string, string>; build?: { publish?: { provider?: string; owner?: string; repo?: string } } };
  assert.match(main, /if \(!app\.isPackaged\) return/);
  assert.equal(packageJson.dependencies?.['electron-updater'], '^6.8.9');
  assert.deepEqual(packageJson.build?.publish, { provider: 'github', owner: 'felaks03', repo: 'CodeMyLife', releaseType: 'release' });
});

test('el workflow publica tags de release en GitHub', () => {
  const workflow = read('../.github/workflows/release.yml');
  assert.match(workflow, /tags:/);
  assert.match(workflow, /'v\*'/);
  assert.match(workflow, /electron-builder --win --publish always/);
  assert.match(workflow, /GH_TOKEN/);
});

test('newversion valida y publica patch minor o major', () => {
  const script = read('../newversion.cmd');
  assert.match(script, /patch/);
  assert.match(script, /minor/);
  assert.match(script, /major/);
  assert.match(script, /npm\.cmd test/);
  assert.match(script, /npm\.cmd run build/);
  assert.match(script, /git\.exe tag/);
  assert.match(script, /git\.exe push origin main --follow-tags/);
});

test('persistencia y rollback estan conectados en las operaciones de wallet', () => {
  const walletStore = read('src/main/wallet-store.ts');
  assert.match(walletStore, /writeJsonAtomic/);
  assert.match(walletStore, /previousWallet/);
  assert.match(walletStore, /previousCommitments/);
  assert.match(walletStore, /guestStore\.replace\(previousCommitments\)/);
});

test('el cierre y apagado pausan sesiones activas', () => {
  const main = read('src/main/main.ts');
  assert.match(main, /pauseActiveSessions/);
  assert.match(main, /powerMonitor\.on\('shutdown'/);
  assert.match(main, /app:pause-timers/);
});

test('el scheduler invalida excepciones temporales al refrescar compromisos', () => {
  const scheduler = read('src/main/scheduler.ts');
  assert.match(scheduler, /temporarilyAllowedDomains\.clear\(\)/);
});
