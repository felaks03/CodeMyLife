import { app, BrowserWindow, ipcMain, Menu, Tray, dialog } from 'electron';
import * as path from 'path';
import { SessionStore } from './session-store';
import { BlockingScheduler } from './scheduler';
import { api } from './api-client';
import { buildCalendar, commitmentStats } from '../shared/schedule';
import { BlockingState, Commitment } from '../shared/types';

const sessionStore = new SessionStore();
let mainWindow: BrowserWindow | null = null;
let tray: Tray | null = null;
let quitting = false;

const scheduler = new BlockingScheduler(
  () => sessionStore.session?.token ?? null,
  (state) => {
    mainWindow?.webContents.send('blocking:state', state);
    updateTray(state);
  }
);

function assetPath(file: string): string {
  return path.join(__dirname, '../../assets', file);
}

function requireToken(): string {
  const token = sessionStore.session?.token;
  if (!token) {
    throw new Error('No hay sesion iniciada.');
  }
  return token;
}

function showMainWindow(): void {
  if (!mainWindow) {
    createMainWindow();
    return;
  }
  if (mainWindow.isMinimized()) mainWindow.restore();
  mainWindow.show();
  mainWindow.focus();
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
  scheduler.stop();
  app.quit();
}

function createTray(): void {
  tray = new Tray(assetPath('tray.png'));
  tray.on('click', showMainWindow);
  updateTray(scheduler.getState());
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

  ipcMain.handle('auth:login', async (_event, email: string, password: string) => {
    const result = await api.login(email, password);
    await sessionStore.save(result);
    await scheduler.refresh();
    return result.user;
  });

  ipcMain.handle('auth:register', async (_event, email: string, name: string, password: string) => {
    const result = await api.register(email, name, password);
    await sessionStore.save(result);
    await scheduler.refresh();
    return result.user;
  });

  ipcMain.handle('auth:logout', async () => {
    if (scheduler.getState().enforcing) {
      throw new Error('No puedes cerrar sesion mientras un bloqueo esta activo.');
    }
    await sessionStore.clear();
    await scheduler.refresh();
  });

  ipcMain.handle('commitments:list', () => api.listCommitments(requireToken()));

  ipcMain.handle('commitments:overview', async () => {
    const commitments = await api.listCommitments(requireToken());
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

  ipcMain.handle('commitments:create', async (_event, payload: Omit<Commitment, '_id' | 'status'>) => {
    const created = await api.createCommitment(requireToken(), payload);
    await scheduler.refresh();
    return created;
  });

  ipcMain.handle('commitments:cancel', async (_event, id: string) => {
    const cancelled = await api.cancelCommitment(requireToken(), id);
    await scheduler.refresh();
    return cancelled;
  });

  ipcMain.handle('blocking:state', (): BlockingState => scheduler.getState());

  ipcMain.handle('app:quit', () => void requestQuit());
}

if (!app.requestSingleInstanceLock()) {
  app.quit();
} else {
  app.on('second-instance', showMainWindow);

  app.whenReady().then(async () => {
    await sessionStore.load();
    registerIpcHandlers();
    createMainWindow();
    createTray();
    await scheduler.start();

    app.on('activate', () => {
      if (BrowserWindow.getAllWindows().length === 0) {
        createMainWindow();
      }
    });
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
