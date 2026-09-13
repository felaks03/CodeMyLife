// Bridges main and renderer processes with a minimal, explicit API surface.
import { contextBridge, ipcRenderer } from 'electron';
import { AuthUser, BlockingState, Commitment, NewCommitment, Script, ShopItem, TaskDefinition, WalletState } from '../shared/types';

interface Overview {
  commitments: Commitment[];
  stats: { total: number; running: number; completed: number; streak: number };
  calendar: { date: string; scheduled: boolean }[];
}

contextBridge.exposeInMainWorld('codeMyLife', {
  getSession: (): Promise<AuthUser | null> => ipcRenderer.invoke('session:get'),
  getOverview: (): Promise<Overview> => ipcRenderer.invoke('commitments:overview'),
  createCommitment: (payload: NewCommitment): Promise<Commitment> =>
    ipcRenderer.invoke('commitments:create', payload),
  cancelCommitment: (id: string): Promise<Commitment> =>
    ipcRenderer.invoke('commitments:cancel', id),
  cancelTestLocks: (): Promise<number> => ipcRenderer.invoke('commitments:cancel-test-locks'),
  openDailyFocusPreview: (): Promise<void> => ipcRenderer.invoke('daily-focus-preview:open'),
  closeDailyFocusPreview: (): Promise<void> => ipcRenderer.invoke('daily-focus-preview:close'),
  listScripts: (): Promise<Script[]> => ipcRenderer.invoke('scripts:list'),
  startInstagramUsage: (): Promise<void> => ipcRenderer.invoke('instagram:start-usage'),
  pauseInstagramUsage: (): Promise<void> => ipcRenderer.invoke('instagram:pause-usage'),
  onInstagramPaused: (callback: () => void): void => {
    ipcRenderer.on('instagram:paused', () => callback());
  },
  onInstagramError: (callback: (message: string) => void): void => {
    ipcRenderer.on('instagram:error', (_event, message: string) => callback(message));
  },
  getBlockingState: (): Promise<BlockingState> => ipcRenderer.invoke('blocking:state'),
  onBlockingState: (callback: (state: BlockingState) => void): void => {
    ipcRenderer.on('blocking:state', (_event, state: BlockingState) => callback(state));
  },
  getWallet: (): Promise<WalletState> => ipcRenderer.invoke('wallet:get'),
  listTasks: (): Promise<TaskDefinition[]> => ipcRenderer.invoke('wallet:tasks'),
  listShop: (): Promise<ShopItem[]> => ipcRenderer.invoke('wallet:shop'),
  completeTask: (taskId: string): Promise<WalletState> => ipcRenderer.invoke('wallet:complete-task', taskId),
  purchaseShopItem: (itemId: string): Promise<WalletState> => ipcRenderer.invoke('wallet:purchase', itemId)
});
