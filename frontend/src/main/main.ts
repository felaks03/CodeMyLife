import { app, BrowserWindow, ipcMain, Menu, Tray, dialog } from 'electron';
import * as path from 'path';
import { watch } from 'fs';
import { SessionStore } from './session-store';
import { BlockingScheduler } from './scheduler';
import { guestStore } from './guest-store';
import { INSTAGRAM_DOMAINS } from '../shared/builtin-scripts';
import { buildCalendar, commitmentStats } from '../shared/schedule';
import { BlockingState, Commitment, NewCommitment, NewScript } from '../shared/types';
import { walletStore } from './wallet-store';

const sessionStore = new SessionStore();
let mainWindow: BrowserWindow | null = null;
let tray: Tray | null = null;
let instagramWindow: BrowserWindow | null = null;
let sleepLockWindow: BrowserWindow | null = null;
let dailyFocusPreviewWindow: BrowserWindow | null = null;
let dailyFocusPreviewTimer: ReturnType<typeof setTimeout> | null = null;
let quitting = false;

Menu.setApplicationMenu(null);

async function loadCommitments(): Promise<Commitment[] | null> {
  return guestStore.list();
}

const scheduler = new BlockingScheduler(loadCommitments, (state) => {
  mainWindow?.webContents.send('blocking:state', state);
  updateTray(state);
  syncSleepLockWindow(state.lockScreenActive === true);
});

ipcMain.handle('commitments:cancel-test-locks', async () => {
  const cancelled = await guestStore.cancelTestLocks();
  await scheduler.refresh();
  return cancelled;
});

ipcMain.handle('daily-focus-preview:open', () => {
  if (dailyFocusPreviewWindow && !dailyFocusPreviewWindow.isDestroyed()) {
    dailyFocusPreviewWindow.show();
    dailyFocusPreviewWindow.focus();
    return;
  }

  createDailyFocusPreviewWindow();
});

ipcMain.handle('daily-focus-preview:close', () => {
  closeDailyFocusPreviewWindow();
});

function assetPath(file: string): string {
  return path.join(__dirname, '../../assets', file);
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

function notifyInstagramPaused(): void {
  scheduler.setTemporarilyAllowed(INSTAGRAM_DOMAINS, false).catch(() => undefined);
  mainWindow?.webContents.send('instagram:paused');
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

  instagramWindow.webContents.on('will-navigate', (event, url) => {
    if (!isInstagramUrl(url)) event.preventDefault();
  });
  instagramWindow.webContents.on('did-fail-load', (_event, errorCode, errorDescription) => {
    mainWindow?.webContents.send('instagram:error', `${errorDescription} (${errorCode})`);
  });
  instagramWindow.webContents.setWindowOpenHandler(({ url }) => ({
    action: isInstagramUrl(url) ? 'allow' : 'deny'
  }));
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
      { label: 'Salir', click: () => void requestQuit() }
    ])
  );
}

function syncSleepLockWindow(active: boolean): void {
  if (active) {
    if (!sleepLockWindow || sleepLockWindow.isDestroyed()) createSleepLockWindow();
    return;
  }
  if (sleepLockWindow && !sleepLockWindow.isDestroyed()) sleepLockWindow.destroy();
  sleepLockWindow = null;
}

function createSleepLockWindow(): void {
  sleepLockWindow = new BrowserWindow({
    fullscreen: true,
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

  sleepLockWindow.setAlwaysOnTop(true, 'screen-saver');
  sleepLockWindow.loadFile(path.join(__dirname, '../../src/renderer/lock-screen.html'));
  sleepLockWindow.once('ready-to-show', () => {
    sleepLockWindow?.show();
    sleepLockWindow?.focus();
  });
  sleepLockWindow.on('blur', () => {
    if (sleepLockWindow && !sleepLockWindow.isDestroyed()) {
      sleepLockWindow.show();
      sleepLockWindow.focus();
    }
  });
  sleepLockWindow.on('close', (event) => {
    if (!quitting) event.preventDefault();
  });
  sleepLockWindow.on('closed', () => {
    sleepLockWindow = null;
  });
}

function closeDailyFocusPreviewWindow(): void {
  if (dailyFocusPreviewTimer) clearTimeout(dailyFocusPreviewTimer);
  dailyFocusPreviewTimer = null;
  if (dailyFocusPreviewWindow && !dailyFocusPreviewWindow.isDestroyed()) {
    dailyFocusPreviewWindow.destroy();
  }
  dailyFocusPreviewWindow = null;
}

function createDailyFocusPreviewWindow(): void {
  dailyFocusPreviewWindow = new BrowserWindow({
    fullscreen: true,
    frame: false,
    show: false,
    alwaysOnTop: true,
    skipTaskbar: true,
    closable: false,
    minimizable: false,
    maximizable: false,
    resizable: false,
    kiosk: true,
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
      preload: path.join(__dirname, '../preload/preload.js')
    }
  });

  dailyFocusPreviewWindow.setAlwaysOnTop(true, 'screen-saver');
  dailyFocusPreviewWindow.loadFile(path.join(__dirname, '../../src/renderer/daily-focus-preview.html'));
  dailyFocusPreviewWindow.once('ready-to-show', () => {
    dailyFocusPreviewWindow?.show();
    dailyFocusPreviewWindow?.focus();
  });
  dailyFocusPreviewWindow.on('blur', () => {
    if (dailyFocusPreviewWindow && !dailyFocusPreviewWindow.isDestroyed()) {
      dailyFocusPreviewWindow.show();
      dailyFocusPreviewWindow.focus();
    }
  });
  dailyFocusPreviewWindow.on('close', (event) => {
    if (!quitting) event.preventDefault();
  });
  dailyFocusPreviewWindow.on('closed', () => {
    if (dailyFocusPreviewTimer) clearTimeout(dailyFocusPreviewTimer);
    dailyFocusPreviewTimer = null;
    dailyFocusPreviewWindow = null;
  });

  dailyFocusPreviewTimer = setTimeout(closeDailyFocusPreviewWindow, 30_000);
}

async function requestQuit(): Promise<void> {
  if (scheduler.getState().enforcing) {
    const { response } = await dialog.showMessageBox({
      type: 'warning',
      title: 'CodeMyLife',
      message: 'Tienes un bloqueo activo.',
      detail:
        'Si cierras la aplicacion el bloqueo dejara de aplicarse. Un compromiso solo termina cuando acaba su horario.',
      buttons: ['Seguir con el compromiso', 'Cerrar de todos modos'],
      defaultId: 0,
      cancelId: 0
    });

    if (response !== 1) return;
  }

  quitting = true;
  sleepLockWindow?.destroy();
  sleepLockWindow = null;
  await scheduler.stop();
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
  setupDevReloader(mainWindow);

  // Cerrar la ventana solo la oculta: el bloqueo debe seguir aplicandose.
  mainWindow.on('close', (event) => {
    if (!quitting) {
      event.preventDefault();
      mainWindow?.hide();
    }
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

function registerIpcHandlers(): void {
  ipcMain.handle('session:get', () => sessionStore.session?.user ?? null);

  ipcMain.handle('commitments:overview', async () => {
    const commitments = await guestStore.list();
    const now = new Date();
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
    showMainWindow();
  });

  app.whenReady().then(async () => {
    await sessionStore.load();
    await ensurePersonalProfile();
    registerIpcHandlers();
    createMainWindow();
    createTray();
    await scheduler.start();

    app.on('activate', () => {
      if (BrowserWindow.getAllWindows().length === 0) {
        createMainWindow();
      }
    });
  }).catch((error) => {
    console.error('[CodeMyLife] Error fatal durante el arranque:', error);
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
    void requestQuit();
  }
});
