// Bridges main and renderer processes with a minimal, explicit API surface.
import { contextBridge, ipcRenderer } from 'electron';
import { AuthUser, BlockingState, Commitment } from '../shared/types';

type NewCommitment = Omit<Commitment, '_id' | 'status'>;

interface Overview {
  commitments: Commitment[];
  stats: { total: number; running: number; completed: number; streak: number };
  calendar: { date: string; scheduled: boolean }[];
}

contextBridge.exposeInMainWorld('codeMyLife', {
  getSession: (): Promise<AuthUser | null> => ipcRenderer.invoke('session:get'),
  login: (email: string, password: string): Promise<AuthUser> =>
    ipcRenderer.invoke('auth:login', email, password),
  register: (email: string, name: string, password: string): Promise<AuthUser> =>
    ipcRenderer.invoke('auth:register', email, name, password),
  logout: (): Promise<void> => ipcRenderer.invoke('auth:logout'),
  getOverview: (): Promise<Overview> => ipcRenderer.invoke('commitments:overview'),
  createCommitment: (payload: NewCommitment): Promise<Commitment> =>
    ipcRenderer.invoke('commitments:create', payload),
  cancelCommitment: (id: string): Promise<Commitment> =>
    ipcRenderer.invoke('commitments:cancel', id),
  getBlockingState: (): Promise<BlockingState> => ipcRenderer.invoke('blocking:state'),
  onBlockingState: (callback: (state: BlockingState) => void): void => {
    ipcRenderer.on('blocking:state', (_event, state: BlockingState) => callback(state));
  }
});
