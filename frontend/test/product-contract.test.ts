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
  assert.match(renderer, /data-youtube-timer/);
  assert.match(renderer, /inventory-video-timer/);
  assert.match(styles, /grid-template-columns: minmax\(0, 1fr\) 52px 116px/);
});

test('YouTube tiene uso diario manual de media hora', () => {
  const renderer = read('src/renderer/renderer.js');
  const preload = read('src/preload/preload.ts');
  const main = read('src/main/main.ts');
  const scripts = read('src/shared/builtin-scripts.ts');
  assert.match(scripts, /YOUTUBE_DOMAINS = \['youtube\.com', 'youtu\.be'\]/);
  assert.match(renderer, /youtube-usage-/);
  assert.match(renderer, /30 \* 60/);
  assert.match(renderer, /startYoutubeTimer/);
  assert.match(renderer, /youtubeAction\.textContent = i18n\.t\('useYoutube'\)/);
  assert.match(preload, /youtube:start-usage/);
  assert.match(preload, /youtube:pause-usage/);
  assert.match(main, /scheduler\.setTemporarilyAllowed\(YOUTUBE_DOMAINS, true, 'builtin-youtube'\)/);
  assert.match(main, /openYoutubeBrowser/);
});

test('los videojuegos quedan libres por defecto viernes tarde y el fin de semana', () => {
  const scheduler = read('src/main/scheduler.ts');
  const scripts = read('src/shared/builtin-scripts.ts');
  assert.match(scheduler, /import { isGameFreeTime } from '\.\.\/shared\/game-free-time';/);
  assert.match(scheduler, /const gamesActive = !isGameFreeTime\(now\) && this\.commitments\.some\(/);
  assert.match(scripts, /viernes de 17:00 a 19:00 y el fin de semana de 16:00 a 19:00/);
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
  assert.match(main, /dailyFocusLockWindows\.set\(display\.id, lockWindow\)/);
  assert.match(main, /lockWindow\.setKiosk\(true\)/);
  assert.doesNotMatch(main, /daily-focus:allow-computer/);
  assert.match(main, /closeAllowedOverlayWindows\(\)/);
  assert.match(main, /display-added/);
  assert.match(main, /display-removed/);
  assert.match(main, /display-metrics-changed/);
});

test('Backtesting permite usar el ordenador y al completarse vuelve a bloquear', () => {
  const main = read('src/main/main.ts');
  assert.match(main, /if \(taskId === 'backtesting'\) setDailyFocusComputerAllowed\(true\)/);
  assert.match(main, /if \(taskId === 'backtesting'\) setDailyFocusComputerAllowed\(false\)/);
  assert.match(main, /function applyDailyFocusPanelMode[\s\S]*setKiosk\(false\)/);
  assert.match(main, /function applyDailyFocusKioskMode[\s\S]*setKiosk\(true\)/);
});

test('el bloqueo de dormir crea una ventana por monitor', () => {
  const main = read('src/main/main.ts');
  assert.match(main, /sleepLockWindows = new Map/);
  assert.match(main, /const displays = screen\.getAllDisplays\(\)/);
  assert.match(main, /sleepLockWindows\.set\(display\.id, sleepLockWindow\)/);
  assert.match(main, /destroySleepLockWindows\(\)/);
});

test('la pantalla de tareas ofrece TradingView, Tradovate y Notion sobre el bloqueo', () => {
  const html = read('src/renderer/daily-focus-lock.html');
  const lockRenderer = read('src/renderer/daily-focus-lock.js');
  const preload = read('src/preload/preload.ts');
  const main = read('src/main/main.ts');
  const trading = read('src/shared/trading-access.ts');
  assert.match(html, /open-tradingview/);
  assert.match(html, /open-tradovate/);
  assert.match(html, /open-notion/);
  assert.match(html, /tradingview\.svg/);
  assert.match(html, /tradovate\.svg/);
  assert.match(html, /notion\.svg/);
  assert.match(html, /class="app-launch-button"/);
  assert.match(lockRenderer, /openTradingView/);
  assert.match(lockRenderer, /openTradovate/);
  assert.match(lockRenderer, /openNotion/);
  assert.match(preload, /tradingview:open/);
  assert.match(preload, /tradovate:open/);
  assert.match(preload, /notion:open/);
  assert.match(main, /function isTradingUrl/);
  assert.match(main, /function isNotionUrl/);
  assert.match(main, /setAlwaysOnTop\(true, 'screen-saver'\)/);
  assert.match(main, /setWindowOpenHandler/);
  assert.match(main, /isTradingUrl\(nextUrl\) \? 'allow' : 'deny'/);
  assert.match(main, /will-redirect/);
  assert.match(main, /hasAllowedOverlayWindowOpen/);
  assert.match(main, /refocusDailyFocusWindows/);
  assert.match(trading, /TRADING_ALLOWED_DOMAINS/);
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
  assert.match(workflow, /electron-builder --win --publish never/);
  assert.match(workflow, /softprops\/action-gh-release@v2/);
  assert.match(workflow, /latest\.yml/);
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

test('ocultar desde la bandeja conserva los bloqueos y salir los desactiva', () => {
  const main = read('src/main/main.ts');
  assert.match(main, /label: 'Ocultar', click: \(\) => mainWindow\?\.hide\(\)/);
  assert.match(main, /label: 'Salir y desactivar bloqueos', click: \(\) => void requestQuit\(\)/);
  assert.match(main, /scheduler\.stop\(\)/);
});

test('la salida protegida no se ejecuta dos veces y tiene timeout', () => {
  const main = read('src/main/main.ts');
  assert.match(main, /let quitInProgress = false/);
  assert.match(main, /if \(quitInProgress\) return/);
  assert.match(main, /Promise\.race\(\[/);
  assert.match(main, /setTimeout\(resolve, 5000\)/);
});

test('el watchdog relanza la app en modo silencioso cada cinco minutos', () => {
  const main = read('src/main/main.ts');
  const watchdog = read('src/main/watchdog-task.ts');
  const packageJson = JSON.parse(read('package.json')) as { build?: { nsis?: { include?: string } } };
  const nsis = read('installer/setup.nsh');
  assert.match(watchdog, /WATCHDOG_TASK_NAME = 'CodeMyLife Watchdog'/);
  assert.match(watchdog, /'\/SC'[\s\S]*'MINUTE'[\s\S]*'\/MO'[\s\S]*'5'/);
  assert.match(watchdog, /`"\$\{executablePath\}" --silent`/);
  assert.match(watchdog, /'\/RL'[\s\S]*'HIGHEST'/);
  assert.match(watchdog, /DisallowStartIfOnBatteries = \$false/);
  assert.match(watchdog, /StopIfGoingOnBatteries = \$false/);
  assert.equal(packageJson.build?.nsis?.include, 'installer/setup.nsh');
  assert.match(read('package.json'), /"artifactName": "\$\{productName\}-Setup-\$\{version\}\.\$\{ext\}"/);
  assert.match(nsis, /customUnInstall/);
  assert.match(nsis, /schtasks\.exe \/Delete \/TN "CodeMyLife Watchdog" \/F/);
  assert.match(main, /isSilentLaunch\(commandLine\)\) return/);
  assert.match(main, /if \(silent\) setupAutoUpdater\(\)/);
  assert.match(main, /ensureWatchdogTask\(process\.execPath\)/);
});

test('salir explicitamente desactiva el relanzamiento silencioso hasta el inicio manual', () => {
  const main = read('src/main/main.ts');
  const watchdog = read('src/main/watchdog-task.ts');
  assert.match(main, /async function requestQuit\(disableWatchdog = true\)/);
  assert.match(main, /if \(disableWatchdog\) await disableWatchdogUntilManualLaunch\(\)/);
  assert.match(main, /if \(silent && await isWatchdogDisabled\(\)\) \{[\s\S]*app\.exit\(0\)/);
  assert.match(main, /if \(!silent\) await enableWatchdogAfterManualLaunch\(\)/);
  assert.match(main, /void requestQuit\(false\)/);
  assert.match(watchdog, /WATCHDOG_DISABLED_FILE = 'watchdog-disabled\.json'/);
});

test('el modo antievasion retrasa la desactivacion de bloqueos activos', () => {
  const main = read('src/main/main.ts');
  const store = read('src/main/anti-evasion-store.ts');
  assert.match(store, /ANTI_EVASION_UNLOCK_DELAY_MS = 5 \* 60 \* 60 \* 1000/);
  assert.match(store, /ANTI_EVASION_UNLOCK_GRACE_MS = 5 \* 60 \* 1000/);
  assert.match(store, /ANTI_EVASION_UNINSTALL_GUARD_FILE = 'anti-evasion-uninstall\.json'/);
  assert.match(store, /anti-evasion\.json/);
  assert.match(store, /process\.env\.ProgramData/);
  assert.match(store, /writeJsonAtomic/);
  assert.match(store, /enabled: true/);
  assert.match(store, /now\.getTime\(\) <= unlockAvailableMs \+ ANTI_EVASION_UNLOCK_GRACE_MS/);
  assert.match(store, /isUnlockWindowExpired/);
  assert.match(store, /attempts: \[\.\.\.state\.attempts\.slice\(-49\), \{ requestedAt, reason \}\]/);
  assert.match(main, /antiEvasionStore\.load\(\)/);
  assert.match(main, /if \(!antiEvasionStore\.canDisable\(now\)\)/);
  assert.match(main, /antiEvasionStore\.requestUnlock\(now, 'exit-with-active-blocking'\)/);
  assert.match(main, /Para desactivar los bloqueos espera hasta/);
  assert.match(main, /El retardo de seguridad ya ha terminado/);
});

test('el desinstalador normal respeta el temporizador antievasion sin bloquear actualizaciones', () => {
  const nsis = read('installer/setup.nsh');
  assert.match(nsis, /customUnInit/);
  assert.match(nsis, /\$\{ifNot\} \$\{isUpdated\}/);
  assert.match(nsis, /anti-evasion-uninstall\.json/);
  assert.match(nsis, /DateTimeOffset/);
  assert.match(nsis, /5 minutes after unlockAvailableAt/);
  assert.match(nsis, /Abort/);
  assert.match(nsis, /customUnInstall[\s\S]*EncodedCommand/);
});

test('el updater comprueba al iniciar y una vez al dia', () => {
  const main = read('src/main/main.ts');
  assert.match(main, /const UPDATE_CHECK_INTERVAL_MS = 24 \* 60 \* 60 \* 1000/);
  assert.match(main, /autoUpdater\.checkForUpdates\(\)/);
  assert.match(main, /setInterval\(\(\) => \{[\s\S]*UPDATE_CHECK_INTERVAL_MS/);
});

test('la UI permite buscar actualizaciones manualmente', () => {
  const html = read('src/renderer/index.html');
  const renderer = read('src/renderer/renderer.js');
  const preload = read('src/preload/preload.ts');
  const main = read('src/main/main.ts');
  assert.match(html, /id="check-for-updates"/);
  assert.match(html, /class="version-control"[\s\S]*id="app-version"[\s\S]*id="check-for-updates"/);
  const styles = read('src/renderer/styles.css');
  assert.match(styles, /\.version-control:hover \.update-button/);
  assert.match(styles, /\.version-control \{[\s\S]*position: fixed[\s\S]*right: 14px/);
  assert.match(styles, /\.version-control \.update-button \{[\s\S]*position: absolute/);
  assert.match(renderer, /checkForUpdates\(\)/);
  assert.match(preload, /app:check-for-updates/);
  assert.match(main, /ipcMain\.handle\('app:check-for-updates'/);
  assert.match(main, /mainWindow\?\.webContents\.send\('update:checking'/);
  assert.match(main, /let updateCheckInProgress = false/);
  assert.match(main, /if \(updateCheckInProgress\) return/);
  assert.match(main, /update:not-available/);
});

test('YouTube se bloquea por hosts todos los dias y mantiene capa de Shorts', () => {
  const shorts = read('src/shared/youtube-shorts.ts');
  const builtinScripts = read('src/shared/builtin-scripts.ts');
  const backendCommitments = read('../backend/src/routes/commitment.routes.ts');
  const main = read('src/main/main.ts');
  const preload = read('src/preload/preload.ts');
  const renderer = read('src/renderer/renderer.js');
  const browserPolicy = read('src/main/browser-policy.ts');
  const nsis = read('installer/setup.nsh');
  assert.match(builtinScripts, /_id: 'builtin-youtube'[\s\S]*days: \[0, 1, 2, 3, 4, 5, 6\]/);
  assert.match(builtinScripts, /_id: 'builtin-youtube'[\s\S]*startTime: '00:00'[\s\S]*endTime: '24:00'/);
  assert.match(builtinScripts, /YOUTUBE_DOMAINS = \['youtube\.com', 'youtu\.be'\]/);
  assert.match(builtinScripts, /_id: 'builtin-youtube'[\s\S]*blockedDomains: YOUTUBE_DOMAINS/);
  assert.match(backendCommitments, /END_TIME_PATTERN[\s\S]*24:00/);
  assert.match(shorts, /isYoutubeShortsUrl/);
  assert.match(shorts, /\/\^\\\/shorts/);
  assert.match(main, /blocking:youtube-shorts/);
  assert.match(main, /ensureYoutubeShortsBrowserPolicy\(\)/);
  assert.match(main, /blocking:youtube-shorts-policy-error/);
  assert.match(main, /event\.preventDefault\(\)/);
  assert.match(preload, /onYoutubeShortsBlocked/);
  assert.match(preload, /onYoutubeShortsPolicyError/);
  assert.match(renderer, /YouTube Shorts esta bloqueado permanentemente/);
  assert.match(renderer, /No se pudo activar el bloqueo de YouTube Shorts en Chrome\/Edge/);
  assert.match(browserPolicy, /URLBlocklist/);
  assert.match(browserPolicy, /\*:\/\/www\.youtube\.com\/shorts\*/);
  assert.match(nsis, /Google\\Chrome\\URLBlocklist \/v 9001/);
  assert.match(nsis, /Microsoft\\Edge\\URLBlocklist \/v 9003/);
});

test('el scheduler invalida excepciones temporales al refrescar compromisos', () => {
  const scheduler = read('src/main/scheduler.ts');
  assert.match(scheduler, /temporarilyAllowedDomains\.clear\(\)/);
});

test('la release compila antes de publicar y el updater instala automaticamente', () => {
  const workflow = read('../.github/workflows/release.yml');
  const main = read('src/main/main.ts');
  const renderer = read('src/renderer/renderer.js');
  assert.match(workflow, /name: Build[\s\S]*run: npm run build[\s\S]*name: Publish Windows release/);
  assert.match(workflow, /name: Verify updater assets[\s\S]*Missing latest\.yml/);
  assert.match(main, /update:downloaded/);
  assert.match(main, /autoUpdater\.quitAndInstall\(false, true\)/);
  assert.match(main, /did-finish-load.*setupAutoUpdater/);
  assert.match(renderer, /Actualizacion.*instalara automaticamente/);
});

test('el salto del foco diario no esta expuesto en la interfaz', () => {
  const main = read('src/main/main.ts');
  const store = read('src/main/daily-focus-store.ts');
  const html = read('src/renderer/index.html');
  assert.match(main, /app:is-development/);
  assert.match(store, /if \(app\.isPackaged\) throw/);
  assert.doesNotMatch(html, /skip-daily-focus|Saltar bloqueo diario/);
  assert.doesNotMatch(read('src/renderer/daily-focus-lock.html'), /skip-daily-focus|Saltar bloqueo diario/);
  assert.doesNotMatch(read('src/renderer/daily-focus-lock.js'), /skipDailyFocusToday|skip-daily-focus/);
  assert.doesNotMatch(read('src/preload/preload.ts'), /skipDailyFocusToday|daily-focus:skip-today/);
  assert.doesNotMatch(main, /function registerIpcHandlers[\s\S]*daily-focus:skip-today/);
});

test('la pantalla de foco diario muestra las monedas de cada tarea', () => {
  const lockRenderer = read('src/renderer/daily-focus-lock.js');
  const styles = read('src/renderer/daily-focus-lock.css');
  assert.match(lockRenderer, /task\.rewardCoins/);
  assert.match(lockRenderer, /focus-reward/);
  assert.match(styles, /\.focus-reward/);
});

test('completar tareas de foco refresca el saldo visible', () => {
  const main = read('src/main/main.ts');
  const preload = read('src/preload/preload.ts');
  const renderer = read('src/renderer/renderer.js');
  assert.match(main, /function notifyWalletUpdated/);
  assert.match(main, /wallet:updated/);
  assert.match(main, /const wallet = await walletStore\.completeTask\(taskId\)/);
  assert.match(preload, /onWalletUpdated/);
  assert.match(renderer, /onWalletUpdated/);
  assert.match(renderer, /wallet = nextWallet;\s*renderEconomy\(\)/);
});

test('la UI muestra la version runtime en una esquina fija', () => {
  const main = read('src/main/main.ts');
  const preload = read('src/preload/preload.ts');
  const html = read('src/renderer/index.html');
  const renderer = read('src/renderer/renderer.js');
  const styles = read('src/renderer/styles.css');
  assert.match(main, /app:getAppVersion|app:version/);
  assert.match(preload, /getAppVersion/);
  assert.match(html, /app-version/);
  assert.match(renderer, /getAppVersion/);
  assert.match(styles, /\.app-version/);
  assert.match(styles, /position: fixed/);
});

test('la build empaquetada migra datos del directorio legacy antes de cargar la sesion', () => {
  const main = read('src/main/main.ts');
  assert.match(main, /codemylife-frontend/);
  assert.match(main, /migrateLegacyUserData/);
  assert.match(main, /wallet\.json/);
  assert.match(main, /copyFile/);
});

test('completar foco diario conecta progreso y recompensa de wallet', () => {
  const main = read('src/main/main.ts');
  assert.match(main, /dailyFocusStore\.completeTask\(taskId\)/);
  assert.match(main, /walletStore\.completeTask\(taskId\)/);
  assert.match(main, /dailyFocusStore\.replace\(previousProgress\)/);
});

test('comprar videojuegos no activa un objeto pausado', () => {
  const wallet = read('src/main/wallet-store.ts');
  assert.match(wallet, /const sessionWasActive = activeSeconds > 0 \|\| unconsumed\.some/);
  assert.match(wallet, /if \(games && sessionWasActive\)/);
});
