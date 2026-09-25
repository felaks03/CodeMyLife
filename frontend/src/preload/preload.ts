// Bridges main and renderer processes with a minimal, explicit API surface.
import { contextBridge, ipcRenderer } from 'electron';
import { AuthUser, BlockingState, Commitment, NewCommitment, Script, ShopItem, TaskDefinition, WalletState } from '../shared/types';
import { DailyFocusState, DailyFocusTask } from '../shared/daily-focus';

interface Overview {
  commitments: Commitment[];
  stats: { total: number; running: number; completed: number; streak: number };
  calendar: { date: string; scheduled: boolean }[];
}

interface DailyFocusData {
  tasks: DailyFocusTask[];
  progress: DailyFocusState;
}

contextBridge.exposeInMainWorld('codeMyLife', {
  onUpdateAvailable: (callback: (version: string) => void): void => {
    ipcRenderer.on('update:available', (_event, version: string) => callback(version));
  },
  onUpdateChecking: (callback: () => void): void => {
    ipcRenderer.on('update:checking', () => callback());
  },
  onUpdateNotAvailable: (callback: () => void): void => {
    ipcRenderer.on('update:not-available', () => callback());
  },
  onUpdateDownloaded: (callback: (version: string) => void): void => {
    ipcRenderer.on('update:downloaded', (_event, version: string) => callback(version));
  },
  onUpdateError: (callback: (message: string) => void): void => {
    ipcRenderer.on('update:error', (_event, message: string) => callback(message));
  },
  getSession: (): Promise<AuthUser | null> => ipcRenderer.invoke('session:get'),
  getAppVersion: (): Promise<string> => ipcRenderer.invoke('app:version'),
  checkForUpdates: (): Promise<void> => ipcRenderer.invoke('app:check-for-updates'),
  getTrustedTime: (): Promise<string> => ipcRenderer.invoke('time:now'),
  getOverview: (): Promise<Overview> => ipcRenderer.invoke('commitments:overview'),
  createCommitment: (payload: NewCommitment): Promise<Commitment> =>
    ipcRenderer.invoke('commitments:create', payload),
  cancelCommitment: (id: string): Promise<Commitment> =>
    ipcRenderer.invoke('commitments:cancel', id),
  openTradingView: (): Promise<void> => ipcRenderer.invoke('tradingview:open'),
  openTradovate: (): Promise<void> => ipcRenderer.invoke('tradovate:open'),
  openNotion: (): Promise<void> => ipcRenderer.invoke('notion:open'),
  openSpotify: (): Promise<void> => ipcRenderer.invoke('spotify:open'),
  isDevelopment: (): Promise<boolean> => ipcRenderer.invoke('app:is-development'),
  listScripts: (): Promise<Script[]> => ipcRenderer.invoke('scripts:list'),
  startInstagramUsage: (): Promise<void> => ipcRenderer.invoke('instagram:start-usage'),
  pauseInstagramUsage: (): Promise<void> => ipcRenderer.invoke('instagram:pause-usage'),
  startYoutubeUsage: (): Promise<void> => ipcRenderer.invoke('youtube:start-usage'),
  pauseYoutubeUsage: (): Promise<void> => ipcRenderer.invoke('youtube:pause-usage'),
  onInstagramPaused: (callback: () => void): void => {
    ipcRenderer.on('instagram:paused', () => callback());
  },
  onYoutubePaused: (callback: () => void): void => {
    ipcRenderer.on('youtube:paused', () => callback());
  },
  onInstagramError: (callback: (message: string) => void): void => {
    ipcRenderer.on('instagram:error', (_event, message: string) => callback(message));
  },
  onYoutubeError: (callback: (message: string) => void): void => {
    ipcRenderer.on('youtube:error', (_event, message: string) => callback(message));
  },
  getBlockingState: (): Promise<BlockingState> => ipcRenderer.invoke('blocking:state'),
  onBlockingState: (callback: (state: BlockingState) => void): void => {
    ipcRenderer.on('blocking:state', (_event, state: BlockingState) => callback(state));
  },
  onYoutubeShortsBlocked: (callback: (url: string) => void): void => {
    ipcRenderer.on('blocking:youtube-shorts', (_event, url: string) => callback(url));
  },
  onYoutubeShortsPolicyError: (callback: () => void): void => {
    ipcRenderer.on('blocking:youtube-shorts-policy-error', () => callback());
  },
  getWallet: (): Promise<WalletState> => ipcRenderer.invoke('wallet:get'),
  onWalletUpdated: (callback: (wallet: WalletState) => void): void => {
    ipcRenderer.on('wallet:updated', (_event, wallet: WalletState) => callback(wallet));
  },
  listTasks: (): Promise<TaskDefinition[]> => ipcRenderer.invoke('wallet:tasks'),
  listShop: (): Promise<ShopItem[]> => ipcRenderer.invoke('wallet:shop'),
  completeTask: (taskId: string): Promise<WalletState> => ipcRenderer.invoke('wallet:complete-task', taskId),
  purchaseShopItem: (itemId: string): Promise<WalletState> => ipcRenderer.invoke('wallet:purchase', itemId),
  useShopItem: (purchaseId: string): Promise<WalletState> => ipcRenderer.invoke('wallet:use-item', purchaseId),
  pauseShopItem: (purchaseId: string): Promise<WalletState> => ipcRenderer.invoke('wallet:pause-item', purchaseId)
  ,onPauseTimers: (callback: () => void): void => {
    ipcRenderer.on('app:pause-timers', () => callback());
  }
  ,getDailyFocus: (): Promise<DailyFocusData> => ipcRenderer.invoke('daily-focus:get')
  ,pauseDailyFocus: (): Promise<number> => ipcRenderer.invoke('daily-focus:pause')
  ,startDailyFocusTask: (taskId: string): Promise<DailyFocusState> => ipcRenderer.invoke('daily-focus:start', taskId)
  ,completeDailyFocusTask: (taskId: string): Promise<DailyFocusState> => ipcRenderer.invoke('daily-focus:complete', taskId)
  ,tickDailyFocus: (): Promise<DailyFocusState> => ipcRenderer.invoke('daily-focus:tick')
});
