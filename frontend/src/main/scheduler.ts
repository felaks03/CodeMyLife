import { app, Notification } from 'electron';
import { promises as fs } from 'fs';
import * as path from 'path';
import { HostsBlocker } from './blocker';
import { domainsToBlock } from '../shared/schedule';
import { BlockingState, Commitment } from '../shared/types';

const CHECK_INTERVAL_MS = 30_000;

export type CommitmentsProvider = () => Promise<Commitment[] | null>;

function cacheFile(): string {
  return path.join(app.getPath('userData'), 'commitments-cache.json');
}

export class BlockingScheduler {
  private readonly blocker = new HostsBlocker();
  private timer: NodeJS.Timeout | null = null;
  private commitments: Commitment[] = [];
  private state: BlockingState = {
    enforcing: false,
    blockedDomains: [],
    hasAdminRights: true,
    lastError: null
  };

  constructor(
    private readonly getCommitments: CommitmentsProvider,
    private readonly onStateChange: (state: BlockingState) => void
  ) {}

  async start(): Promise<void> {
    this.commitments = await this.readCache();
    await this.tick();
    this.timer = setInterval(() => void this.tick(), CHECK_INTERVAL_MS);
  }

  stop(): void {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
  }

  getState(): BlockingState {
    return this.state;
  }

  async refresh(): Promise<void> {
    await this.syncFromServer();
    await this.tick();
  }

  private async tick(): Promise<void> {
    await this.syncFromServer();

    const domains = domainsToBlock(this.commitments, new Date());
    const wasEnforcing = this.state.enforcing;

    try {
      await this.blocker.apply(domains);
      this.state = {
        enforcing: domains.length > 0,
        blockedDomains: domains,
        hasAdminRights: true,
        lastError: null
      };
    } catch (error) {
      const hasAdminRights = await this.blocker.canWrite();
      this.state = {
        enforcing: false,
        blockedDomains: domains,
        hasAdminRights,
        lastError: hasAdminRights ? (error as Error).message : 'Se requieren permisos de administrador para aplicar el bloqueo.'
      };
    }

    if (this.state.enforcing !== wasEnforcing) {
      this.notify(this.state.enforcing);
    }
    this.onStateChange(this.state);
  }

  private notify(enforcing: boolean): void {
    if (!Notification.isSupported()) return;
    new Notification({
      title: 'CodeMyLife',
      body: enforcing ? 'Un bloqueo acaba de empezar.' : 'El bloqueo ha terminado.'
    }).show();
  }

  private async syncFromServer(): Promise<void> {
    try {
      const commitments = await this.getCommitments();
      if (commitments) {
        this.commitments = commitments;
        await this.writeCache(commitments);
      }
    } catch {
      // Offline: keep enforcing the cached commitments.
    }
  }

  private async readCache(): Promise<Commitment[]> {
    try {
      return JSON.parse(await fs.readFile(cacheFile(), 'utf8')) as Commitment[];
    } catch {
      return [];
    }
  }

  private async writeCache(commitments: Commitment[]): Promise<void> {
    await fs.writeFile(cacheFile(), JSON.stringify(commitments), 'utf8');
  }
}
