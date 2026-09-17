import { app, BrowserWindow, ipcMain, Menu, Tray, dialog, powerMonitor, screen, Display, Rectangle } from 'electron';
import * as path from 'path';
import { promises as fs, watch } from 'fs';
import { SessionStore } from './session-store';
import { BlockingScheduler } from './scheduler';
import { guestStore } from './guest-store';
import { INSTAGRAM_DOMAINS, YOUTUBE_DOMAINS } from '../shared/builtin-scripts';
import { buildCalendar, commitmentStats } from '../shared/schedule';
import { BlockingState, Commitment, NewCommitment, NewScript } from '../shared/types';
import { walletStore } from './wallet-store';
import { dailyFocusStore } from './daily-focus-store';
import { visibleDailyFocusTasks } from '../shared/daily-focus';
import { timeAuthority } from './time-authority';
import { autoUpdater } from 'electron-updater';
import { isYoutubeShortsUrl } from '../shared/youtube-shorts';
import { ensureYoutubeShortsBrowserPolicy } from './browser-policy';
import { youtubeShortsWindowGuard } from './youtube-shorts-window-guard';
import {
  disableWatchdogUntilManualLaunch,
  enableWatchdogAfterManualLaunch,
  ensureWatchdogTask,
  isSilentLaunch,
  isWatchdogDisabled
} from './watchdog-task';
import { antiEvasionStore } from './anti-evasion-store';

const UPDATE_CHECK_INTERVAL_MS = 24 * 60 * 60 * 1000;
let updateCheckInProgress = false;
let updaterStarted = false;

if (app.isPackaged) {
  app.setPath('userData', path.join(app.getPath('appData'), 'CodeMyLife'));
}

async function migrateLegacyUserData(): Promise<void> {
  if (!app.isPackaged) return;
  const legacyDirectory = path.join(app.getPath('appData'), 'codemylife-frontend');
  const productionDirectory = app.getPath('userData');
  await fs.mkdir(productionDirectory, { recursive: true });
  for (const fileName of ['wallet.json', 'guest-commitments.json', 'guest-scripts.json', 'commitments-cache.json']) {
    const legacyFile = path.join(legacyDirectory, fileName);
    const productionFile = path.join(productionDirectory, fileName);
    try {
      await fs.access(productionFile);
    } catch {
      try {
        await fs.copyFile(legacyFile, productionFile);
      } catch {
        // There may be no legacy file to migrate.
      }
    }
  }
}

const sessionStore = new SessionStore();
let mainWindow: BrowserWindow | null = null;
let tray: Tray | null = null;
let instagramWindow: BrowserWindow | null = null;
let youtubeWindow: BrowserWindow | null = null;
const sleepLockWindows = new Map<number, BrowserWindow>();
let quitInProgress = false;
const dailyFocusLockWindows = new Map<number, BrowserWindow>();
let dailyFocusLockComputerAllowed = false;
let quitting = false;

Menu.setApplicationMenu(null);

async function loadCommitments(): Promise<Commitment[] | null> {
  return guestStore.list();
}

const scheduler = new BlockingScheduler(loadCommitments, (state) => {
  mainWindow?.webContents.send('blocking:state', state);
  updateTray(state);
  syncSleepLockWindow(state.lockScreenActive === true);
  syncDailyFocusLockWindow(state.dailyFocusActive === true);
});

ipcMain.handle('daily-focus:allow-computer', () => {
  if (dailyFocusLockWindows.size === 0) return;
  dailyFocusLockComputerAllowed = true;
  for (const window of dailyFocusLockWindows.values()) {
    if (window.isDestroyed()) continue;
    window.setKiosk(false);
    window.setFullScreen(false);
    window.setAlwaysOnTop(false);
    window.setSkipTaskbar(false);
    window.setResizable(true);
    window.setSize(760, 700);
    window.center();
    window.show();
    window.focus();
  }
});

function assetPath(file: string): string {
  return path.join(__dirname, '../../assets', file);
}

function setupAutoUpdater(): void {
  if (!app.isPackaged) return;
  if (updaterStarted) return;
  updaterStarted = true;

  const reportUpdateError = (error: unknown): void => {
    const message = error instanceof Error ? error.message : String(error);
    console.error('[CodeMyLife] Update error:', message);
    if (/404|releases\.atom|double check that your authentication token/i.test(message)) {
      mainWindow?.webContents.send('update:not-available');
      return;
    }
    mainWindow?.webContents.send('update:error', message);
  };

  autoUpdater.autoDownload = true;
  autoUpdater.autoInstallOnAppQuit = true;
  autoUpdater.on('checking-for-update', () => mainWindow?.webContents.send('update:checking'));
  autoUpdater.on('update-available', (info) => mainWindow?.webContents.send('update:available', info.version));
  autoUpdater.on('update-not-available', () => mainWindow?.webContents.send('update:not-available'));
  autoUpdater.on('download-progress', (progress) => mainWindow?.webContents.send('update:download-progress', progress.percent));
  autoUpdater.on('update-downloaded', (info) => {
    mainWindow?.webContents.send('update:downloaded', info.version);
    setTimeout(() => autoUpdater.quitAndInstall(false, true), 2000);
  });
  autoUpdater.on('error', (error) => {
    reportUpdateError(error);
  });

  void checkForUpdates(reportUpdateError);
  setInterval(() => {
    void checkForUpdates(reportUpdateError);
  }, UPDATE_CHECK_INTERVAL_MS);
}

async function checkForUpdates(reportError: (error: unknown) => void): Promise<void> {
  if (updateCheckInProgress) return;
  updateCheckInProgress = true;
  try {
    await autoUpdater.checkForUpdates();
  } catch (error) {
    reportError(error);
  } finally {
    updateCheckInProgress = false;
  }
}

function formatUnlockTime(date: Date): string {
  return date.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });
}

function showMainWindow(): void {
  if (!mainWindow) {
    createMainWindow();
    return;
  }
  if (mainWindow.isMinimized()) mainWindow.restore();
  mainWindow.show();
  mainWindow.focus();
  mainWindow.setAlwaysOnTop(true);
  mainWindow.setAlwaysOnTop(false);
}

function isInstagramUrl(value: string): boolean {
  try {
    const hostname = new URL(value).hostname.toLowerCase();
    return hostname === 'instagram.com' || hostname.endsWith('.instagram.com');
  } catch {
    return false;
  }
}

function isYoutubeUrl(value: string): boolean {
  try {
    const hostname = new URL(value).hostname.toLowerCase();
    return hostname === 'youtube.com' || hostname.endsWith('.youtube.com') || hostname === 'youtu.be' || hostname.endsWith('.youtu.be');
  } catch {
    return false;
  }
}

function notifyYoutubeShortsBlocked(url: string): void {
  mainWindow?.webContents.send('blocking:youtube-shorts', url);
}

function blockYoutubeShortsNavigation(window: BrowserWindow): void {
  window.webContents.on('will-navigate', (event, url) => {
    if (!isYoutubeShortsUrl(url)) return;
    event.preventDefault();
    notifyYoutubeShortsBlocked(url);
  });
  window.webContents.setWindowOpenHandler(({ url }) => {
    if (isYoutubeShortsUrl(url)) {
      notifyYoutubeShortsBlocked(url);
      return { action: 'deny' };
    }
    return { action: 'allow' };
  });
}

function notifyInstagramPaused(): void {
  scheduler.setTemporarilyAllowed(INSTAGRAM_DOMAINS, false).catch(() => undefined);
  mainWindow?.webContents.send('instagram:paused');
}

function notifyYoutubePaused(): void {
  scheduler.setTemporarilyAllowed(YOUTUBE_DOMAINS, false, 'builtin-youtube').catch(() => undefined);
  mainWindow?.webContents.send('youtube:paused');
}

async function openInstagramBrowser(): Promise<void> {
  if (instagramWindow && !instagramWindow.isDestroyed()) {
    instagramWindow.show();
    instagramWindow.focus();
    return;
  }

  instagramWindow = new BrowserWindow({
    width: 1100,
    height: 760,
    title: 'Instagram - CodeMyLife',
    show: true,
    backgroundColor: '#101418',
    parent: mainWindow ?? undefined,
    webPreferences: {
      partition: 'persist:codemylife-instagram',
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true
    }
  });

  blockYoutubeShortsNavigation(instagramWindow);

  instagramWindow.webContents.on('will-navigate', (event, url) => {
    if (isYoutubeShortsUrl(url)) return;
    if (!isInstagramUrl(url)) event.preventDefault();
  });
  instagramWindow.webContents.on('did-fail-load', (_event, errorCode, errorDescription) => {
    mainWindow?.webContents.send('instagram:error', `${errorDescription} (${errorCode})`);
  });
  instagramWindow.webContents.setWindowOpenHandler(({ url }) => {
    if (isYoutubeShortsUrl(url)) {
      notifyYoutubeShortsBlocked(url);
      return { action: 'deny' };
    }
    return { action: isInstagramUrl(url) ? 'allow' : 'deny' };
  });
  instagramWindow.once('ready-to-show', () => {
    instagramWindow?.show();
    instagramWindow?.focus();
  });
  instagramWindow.show();
  instagramWindow.focus();
  instagramWindow.on('minimize', notifyInstagramPaused);
  instagramWindow.on('closed', () => {
    instagramWindow = null;
    notifyInstagramPaused();
  });
}

async function openYoutubeBrowser(): Promise<void> {
  if (youtubeWindow && !youtubeWindow.isDestroyed()) {
    youtubeWindow.show();
    youtubeWindow.focus();
    return;
  }

  youtubeWindow = new BrowserWindow({
    width: 1200,
    height: 780,
    title: 'YouTube - CodeMyLife',
    show: true,
    backgroundColor: '#101418',
    parent: mainWindow ?? undefined,
    webPreferences: {
      partition: 'persist:codemylife-youtube',
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true
    }
  });

  blockYoutubeShortsNavigation(youtubeWindow);

  youtubeWindow.webContents.on('will-navigate', (event, url) => {
    if (isYoutubeShortsUrl(url)) return;
    if (!isYoutubeUrl(url)) event.preventDefault();
  });
  youtubeWindow.webContents.on('did-fail-load', (_event, errorCode, errorDescription) => {
    mainWindow?.webContents.send('youtube:error', `${errorDescription} (${errorCode})`);
  });
  youtubeWindow.webContents.setWindowOpenHandler(({ url }) => {
    if (isYoutubeShortsUrl(url)) {
      notifyYoutubeShortsBlocked(url);
      return { action: 'deny' };
    }
    return { action: isYoutubeUrl(url) ? 'allow' : 'deny' };
  });
  youtubeWindow.once('ready-to-show', () => {
    youtubeWindow?.show();
    youtubeWindow?.focus();
  });
  youtubeWindow.show();
  youtubeWindow.focus();
  youtubeWindow.on('minimize', notifyYoutubePaused);
  youtubeWindow.on('closed', () => {
    youtubeWindow = null;
    notifyYoutubePaused();
  });
}

function updateTray(state: BlockingState): void {
  if (!tray) return;

  const status = state.enforcing
    ? `Bloqueo activo: ${state.blockedDomains.join(', ')}`
    : 'Sin bloqueo activo';

  tray.setToolTip(`CodeMyLife - ${status}`);
  tray.setContextMenu(
    Menu.buildFromTemplate([
      { label: status, enabled: false },
      { type: 'separator' },
      { label: 'Abrir CodeMyLife', click: showMainWindow },
      { label: 'Ocultar', click: () => mainWindow?.hide() },
      { label: 'Salir y desactivar bloqueos', click: () => void requestQuit() }
    ])
  );
}

function syncSleepLockWindow(active: boolean): void {
  const displays = screen.getAllDisplays();
  const displayIds = new Set(displays.map((display) => display.id));
  for (const [displayId, window] of sleepLockWindows) {
    if (!displayIds.has(displayId) || window.isDestroyed()) {
      if (!window.isDestroyed()) window.destroy();
      sleepLockWindows.delete(displayId);
    }
  }
  if (active) {
    for (const display of displays) {
      if (!sleepLockWindows.has(display.id)) createSleepLockWindow(display);
    }
    return;
  }
  destroySleepLockWindows();
}

function destroySleepLockWindows(): void {
  for (const window of sleepLockWindows.values()) {
    if (!window.isDestroyed()) window.destroy();
  }
  sleepLockWindows.clear();
}

function createSleepLockWindow(display: Display): void {
  const sleepLockWindow = new BrowserWindow({
    x: display.bounds.x,
    y: display.bounds.y,
    width: display.bounds.width,
    height: display.bounds.height,
    frame: false,
    show: false,
    alwaysOnTop: true,
    skipTaskbar: true,
    closable: false,
    minimizable: false,
    resizable: false,
    kiosk: true,
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true
    }
  });

  sleepLockWindows.set(display.id, sleepLockWindow);
  sleepLockWindow.setAlwaysOnTop(true, 'screen-saver');
  sleepLockWindow.loadFile(path.join(__dirname, '../../src/renderer/lock-screen.html'));
  sleepLockWindow.once('ready-to-show', () => {
    if (!sleepLockWindow.isDestroyed()) {
      sleepLockWindow.show();
      sleepLockWindow.focus();
    }
  });
  sleepLockWindow.on('blur', () => {
    if (!sleepLockWindow.isDestroyed()) {
      sleepLockWindow.show();
      sleepLockWindow.focus();
    }
  });
  sleepLockWindow.on('close', (event) => {
    if (!quitting) event.preventDefault();
  });
  sleepLockWindow.on('closed', () => {
    if (sleepLockWindows.get(display.id) === sleepLockWindow) {
      sleepLockWindows.delete(display.id);
    }
  });
}

function syncDailyFocusLockWindow(active: boolean): void {
  const displays = screen.getAllDisplays();
  const displayIds = new Set(displays.map((display) => display.id));
  for (const [displayId, window] of dailyFocusLockWindows) {
    if (!displayIds.has(displayId) || window.isDestroyed()) {
      if (!window.isDestroyed()) window.destroy();
      dailyFocusLockWindows.delete(displayId);
    }
  }
  if (!active) {
    destroyDailyFocusLockWindows();
    return;
  }
  const computerAllowed = isDailyFocusComputerAllowed();
  for (const display of displays) {
    const lockWindow = dailyFocusLockWindows.get(display.id);
    if (lockWindow && !lockWindow.isDestroyed()) {
      applyDailyFocusLockMode(lockWindow, display, computerAllowed);
    } else {
      createDailyFocusLockWindow(display, computerAllowed);
    }
  }
}

function isDailyFocusComputerAllowed(): boolean {
  return dailyFocusLockComputerAllowed;
}

function dailyFocusPanelBounds(display: Display): Rectangle {
  return {
    x: display.bounds.x + Math.max(0, Math.floor((display.bounds.width - 760) / 2)),
    y: display.bounds.y + Math.max(0, Math.floor((display.bounds.height - 700) / 2)),
    width: 760,
    height: 700
  };
}

function applyDailyFocusLockMode(lockWindow: BrowserWindow, display: Display, computerAllowed: boolean): void {
  if (computerAllowed) {
    lockWindow.setKiosk(false);
    lockWindow.setFullScreen(false);
    lockWindow.setAlwaysOnTop(false);
    lockWindow.setSkipTaskbar(false);
    lockWindow.setResizable(true);
    lockWindow.setBounds(dailyFocusPanelBounds(display));
    return;
  }
  lockWindow.setResizable(false);
  lockWindow.setSkipTaskbar(true);
  lockWindow.setAlwaysOnTop(true, 'screen-saver');
  lockWindow.setBounds(display.bounds);
  lockWindow.setFullScreen(true);
  lockWindow.setKiosk(true);
}

function destroyDailyFocusLockWindows(): void {
  for (const window of dailyFocusLockWindows.values()) {
    if (!window.isDestroyed()) window.destroy();
  }
  dailyFocusLockWindows.clear();
  dailyFocusLockComputerAllowed = false;
}

function createDailyFocusLockWindow(display: Display, computerAllowed = false): void {
  const panelBounds = dailyFocusPanelBounds(display);
  const lockWindow = new BrowserWindow({
    x: computerAllowed ? panelBounds.x : display.bounds.x,
    y: computerAllowed ? panelBounds.y : display.bounds.y,
    width: computerAllowed ? panelBounds.width : display.bounds.width,
    height: computerAllowed ? panelBounds.height : display.bounds.height,
    frame: false,
    show: false,
    alwaysOnTop: !computerAllowed,
    skipTaskbar: !computerAllowed,
    closable: false,
    minimizable: false,
    maximizable: false,
    resizable: computerAllowed,
    kiosk: !computerAllowed,
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
      preload: path.join(__dirname, '../preload/preload.js')
    }
  });
  dailyFocusLockWindows.set(display.id, lockWindow);
  applyDailyFocusLockMode(lockWindow, display, computerAllowed);
  lockWindow.loadFile(path.join(__dirname, '../../src/renderer/daily-focus-lock.html'));
  lockWindow.once('ready-to-show', () => {
    if (!lockWindow.isDestroyed()) {
      lockWindow.show();
      lockWindow.focus();
    }
  });
  lockWindow.on('blur', () => {
    if (!isDailyFocusComputerAllowed() && !lockWindow.isDestroyed()) {
      lockWindow.show();
      lockWindow.focus();
    }
  });
  lockWindow.on('close', (event) => {
    if (!quitting) event.preventDefault();
  });
  lockWindow.on('closed', () => {
    if (dailyFocusLockWindows.get(display.id) === lockWindow) {
      dailyFocusLockWindows.delete(display.id);
    }
  });
}

async function requestQuit(disableWatchdog = true): Promise<void> {
  if (quitInProgress) return;
  quitInProgress = true;

  if (scheduler.getState().enforcing && disableWatchdog) {
    const now = timeAuthority.now();
    if (!antiEvasionStore.canDisable(now)) {
      const state = await antiEvasionStore.requestUnlock(now, 'exit-with-active-blocking');
      const unlockAvailableAt = new Date(state.unlockAvailableAt ?? now.toISOString());
      await dialog.showMessageBox({
        type: 'warning',
        title: 'CodeMyLife',
        message: 'Los bloqueos siguen activos.',
        detail: `Para desactivar los bloqueos espera hasta las ${formatUnlockTime(unlockAvailableAt)} y vuelve a intentarlo.`,
        buttons: ['Mantener bloqueos'],
        defaultId: 0,
        cancelId: 0
      });
      quitInProgress = false;
      return;
    }

    const { response } = await dialog.showMessageBox({
      type: 'warning',
      title: 'CodeMyLife',
      message: 'Tienes un bloqueo activo.',
      detail:
        'El retardo de seguridad ya ha terminado. Si continuas, CodeMyLife desactivara los bloqueos y no se relanzara hasta que lo abras manualmente.',
      buttons: ['Seguir con el compromiso', 'Desactivar bloqueos'],
      defaultId: 0,
      cancelId: 0
    });

    if (response !== 1) {
      quitInProgress = false;
      return;
    }
  }

  quitting = true;
  await antiEvasionStore.resetUnlock();
  if (disableWatchdog) await disableWatchdogUntilManualLaunch();
  mainWindow?.webContents.send('app:pause-timers');
  await walletStore.pauseActiveSessions();
  destroySleepLockWindows();
  destroyDailyFocusLockWindows();
  let timeout: NodeJS.Timeout | null = null;
  const stopTimeout = new Promise<void>((resolve) => {
    timeout = setTimeout(resolve, 5000);
  });
  const stopScheduler = scheduler.stop().catch((error) => {
    console.error('[CodeMyLife] No se pudo completar la limpieza al salir:', error);
  });
  await Promise.race([
    stopScheduler,
    stopTimeout
  ]);
  if (timeout) clearTimeout(timeout);
  app.quit();
}

function createTray(): void {
  tray = new Tray(assetPath('tray.png'));
  tray.on('click', showMainWindow);
  updateTray(scheduler.getState());
}

function setupDevReloader(win: BrowserWindow): void {
  if (app.isPackaged) return;

  let debounceTimer: NodeJS.Timeout | null = null;
  const triggerReload = () => {
    if (debounceTimer) clearTimeout(debounceTimer);
    debounceTimer = setTimeout(() => {
      if (!win.isDestroyed()) {
        win.webContents.reload();
      }
    }, 200);
  };

  const watchTargets = [
    path.join(__dirname, '../../src/renderer'),
    path.join(__dirname, '..') // dist folder
  ];

  for (const target of watchTargets) {
    try {
      watch(target, { recursive: true }, triggerReload);
    } catch {
      // Ignorar si no se puede observar
    }
  }
}

function createMainWindow(): void {
  mainWindow = new BrowserWindow({
    width: 1024,
    height: 720,
    backgroundColor: '#1e1e1e',
    icon: assetPath('icon.png'),
    webPreferences: {
      preload: path.join(__dirname, '../preload/preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true
    }
  });

  mainWindow.loadFile(path.join(__dirname, '../../src/renderer/index.html'));
  blockYoutubeShortsNavigation(mainWindow);
  mainWindow.webContents.once('did-finish-load', setupAutoUpdater);
  setupDevReloader(mainWindow);
  mainWindow.on('close', (event) => {
    if (!quitting) {
      event.preventDefault();
      mainWindow?.webContents.send('app:pause-timers');
      void walletStore.pauseActiveSessions();
      mainWindow?.hide();
    }
  });
  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

function registerIpcHandlers(): void {
  ipcMain.handle('session:get', () => sessionStore.session?.user ?? null);
  ipcMain.handle('app:version', () => app.getVersion());
  ipcMain.handle('app:check-for-updates', async () => {
    mainWindow?.webContents.send('update:checking');
    if (!app.isPackaged) {
      mainWindow?.webContents.send('update:not-available');
      return;
    }
    await checkForUpdates((error) => {
      const message = error instanceof Error ? error.message : String(error);
      mainWindow?.webContents.send('update:error', message);
    });
  });
  ipcMain.handle('daily-focus:skip-today', async () => {
    await dailyFocusStore.skipForToday();
    await scheduler.refresh();
  });
  ipcMain.handle('time:now', () => timeAuthority.now().toISOString());

  ipcMain.handle('commitments:overview', async () => {
    const commitments = await guestStore.list();
    const now = timeAuthority.now();
    return {
      commitments,
      stats: commitmentStats(commitments, now),
      calendar: buildCalendar(commitments, now).map((day) => ({
        date: day.date.toISOString().slice(0, 10),
        scheduled: day.scheduled
      }))
    };
  });

  ipcMain.handle('commitments:create', async (_event, payload: NewCommitment) => {
    const created = await guestStore.create(payload);
    await scheduler.refresh();
    return created;
  });

  ipcMain.handle('commitments:cancel', async (_event, id: string) => {
    const cancelled = await guestStore.cancel(id);
    await scheduler.refresh();
    return cancelled;
  });

  ipcMain.handle('scripts:list', async () => {
    return guestStore.searchScripts('');
  });

  ipcMain.handle('wallet:get', () => walletStore.get());
  ipcMain.handle('wallet:tasks', () => walletStore.tasks());
  ipcMain.handle('wallet:shop', () => walletStore.shop());
  ipcMain.handle('wallet:complete-task', (_event, taskId: string) => walletStore.completeTask(taskId));
  ipcMain.handle('wallet:purchase', async (_event, itemId: string) => {
    const wallet = await walletStore.purchase(itemId);
    await scheduler.refresh();
    return wallet;
  });
  ipcMain.handle('wallet:use-item', async (_event, purchaseId: string) => {
    const wallet = await walletStore.useItem(purchaseId);
    await scheduler.refresh();
    return wallet;
  });
  ipcMain.handle('wallet:pause-item', async (_event, purchaseId: string) => {
    const wallet = await walletStore.pauseItem(purchaseId);
    void scheduler.refresh().catch((error) => {
      mainWindow?.webContents.send('blocking:state', {
        ...scheduler.getState(),
        lastError: error instanceof Error ? error.message : 'No se pudo actualizar el bloqueo.'
      });
    });
    return wallet;
  });

  ipcMain.handle('daily-focus:get', async () => ({
    tasks: visibleDailyFocusTasks(timeAuthority.now()),
    progress: await dailyFocusStore.tick()
  }));
  ipcMain.handle('app:is-development', () => !app.isPackaged);
  ipcMain.handle('daily-focus:start', (_event, taskId: string) => dailyFocusStore.startTask(taskId));
  ipcMain.handle('daily-focus:complete', async (_event, taskId: string) => {
    const previousProgress = await dailyFocusStore.get();
    const progress = await dailyFocusStore.completeTask(taskId);
    try {
      await walletStore.completeTask(taskId);
      return progress;
    } catch (error) {
      await dailyFocusStore.replace(previousProgress);
      throw error;
    }
  });
  ipcMain.handle('daily-focus:tick', () => dailyFocusStore.tick());

  ipcMain.handle('instagram:start-usage', async () => {
    await scheduler.setTemporarilyAllowed(INSTAGRAM_DOMAINS, true);
    await openInstagramBrowser();
    if (instagramWindow && !instagramWindow.isDestroyed()) {
      try {
        await instagramWindow.loadURL('https://www.instagram.com/');
      } catch (error) {
        mainWindow?.webContents.send('instagram:error', (error as Error).message);
      }
    }
  });

  ipcMain.handle('instagram:pause-usage', async () => {
    if (instagramWindow && !instagramWindow.isDestroyed()) instagramWindow.close();
    else await scheduler.setTemporarilyAllowed(INSTAGRAM_DOMAINS, false);
  });

  ipcMain.handle('youtube:start-usage', async () => {
    await scheduler.setTemporarilyAllowed(YOUTUBE_DOMAINS, true, 'builtin-youtube');
    await openYoutubeBrowser();
    if (youtubeWindow && !youtubeWindow.isDestroyed()) {
      try {
        await youtubeWindow.loadURL('https://www.youtube.com/');
      } catch (error) {
        mainWindow?.webContents.send('youtube:error', (error as Error).message);
      }
    }
  });

  ipcMain.handle('youtube:pause-usage', async () => {
    if (youtubeWindow && !youtubeWindow.isDestroyed()) youtubeWindow.close();
    else await scheduler.setTemporarilyAllowed(YOUTUBE_DOMAINS, false, 'builtin-youtube');
  });

  ipcMain.handle('blocking:state', (): BlockingState => scheduler.getState());

  ipcMain.handle('app:quit', () => void requestQuit());
}

async function ensurePersonalProfile(): Promise<void> {
  const user = { id: 'personal', email: '', name: 'Mi perfil' };
  await sessionStore.save({ token: null, user, guest: true });
}

const hasSingleInstanceLock = app.requestSingleInstanceLock();

if (!hasSingleInstanceLock) {
  app.quit();
} else {
  app.on('second-instance', (_event, commandLine, workingDirectory) => {
    if (isSilentLaunch(commandLine)) return;
    showMainWindow();
  });

  app.whenReady().then(async () => {
    const silent = isSilentLaunch();
    if (silent && await isWatchdogDisabled()) {
      app.exit(0);
      return;
    }
    if (!silent) await enableWatchdogAfterManualLaunch();
    await timeAuthority.sync();
    await migrateLegacyUserData();
    await antiEvasionStore.load();
    await sessionStore.load();
    await ensurePersonalProfile();
    registerIpcHandlers();
    if (silent) setupAutoUpdater();
    else createMainWindow();
    createTray();
    const reconcileDisplays = () => {
      const state = scheduler.getState();
      syncSleepLockWindow(state.lockScreenActive === true);
      syncDailyFocusLockWindow(state.dailyFocusActive === true);
    };
    screen.on('display-added', reconcileDisplays);
    screen.on('display-removed', reconcileDisplays);
    screen.on('display-metrics-changed', reconcileDisplays);
    await scheduler.start();
    await ensureYoutubeShortsBrowserPolicy().catch((error) => {
      console.error('[CodeMyLife] No se pudo registrar el bloqueo de YouTube Shorts en navegador:', error);
      mainWindow?.webContents.send('blocking:youtube-shorts-policy-error');
    });
    youtubeShortsWindowGuard.start();
    await ensureWatchdogTask(process.execPath).catch((error) => {
      console.error('[CodeMyLife] No se pudo registrar el watchdog:', error);
    });

    app.on('activate', () => {
      if (BrowserWindow.getAllWindows().length === 0) {
        createMainWindow();
      }
    });
  }).catch((error) => {
    console.error('[CodeMyLife] Error fatal durante el arranque:', error);
    dialog.showErrorBox(
      'CodeMyLife no puede iniciar',
      `No se pudo verificar la hora confiable. Comprueba tu conexion a Internet y vuelve a intentarlo.\n\n${(error as Error).message}`
    );
    app.exit(1);
  });
}

// La aplicacion sigue viva en la bandeja para mantener el bloqueo.
app.on('window-all-closed', () => {
  /* noop */
});

app.on('before-quit', (event) => {
  if (!quitting) {
    event.preventDefault();
    void requestQuit(false);
  }
});

powerMonitor.on('shutdown', () => {
  mainWindow?.webContents.send('app:pause-timers');
  void walletStore.pauseActiveSessions();
});
