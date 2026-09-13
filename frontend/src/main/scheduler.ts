import { app, Notification } from 'electron';
import { promises as fs } from 'fs';
import * as path from 'path';
import { HostsBlocker } from './blocker';
import { BrowserGuard } from './browser-guard';
import { INSTAGRAM_DOMAINS } from '../shared/builtin-scripts';
import { domainsToBlock, shouldShowLockScreen } from '../shared/schedule';
import { BlockingState, Commitment } from '../shared/types';

const CHECK_INTERVAL_MS = 30_000;

export type CommitmentsProvider = () => Promise<Commitment[] | null>;

function cacheFile(): string {
  return path.join(app.getPath('userData'), 'commitments-cache.json');
}

export class BlockingScheduler {
  private readonly blocker = new HostsBlocker();
  private readonly browserGuard = new BrowserGuard();
  private timer: NodeJS.Timeout | null = null;
  private commitments: Commitment[] = [];
  private temporarilyAllowedDomains = new Set<string>();
  private manuallyBlockedDomains = new Set<string>();
  private state: BlockingState = {
    enforcing: false,
    blockedDomains: [],
    hasAdminRights: true,
    lastError: null,
    lockScreenActive: false
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
    void this.browserGuard.unblockChrome();
  }

  getState(): BlockingState {
    return this.state;
  }

  async refresh(): Promise<void> {
    await this.syncFromServer();
    await this.tick();
  }

  async setTemporarilyAllowed(domains: string[], allowed: boolean): Promise<void> {
    this.blocker.forceReconcile();
    const now = new Date();
    const instagramConfigured = this.commitments.some(
      (commitment) =>
        commitment.scriptId === 'builtin-instagram' &&
        commitment.status === 'active' &&
        new Date(commitment.startsAt) <= now &&
        new Date(commitment.endsAt) >= now
    );

    if (!instagramConfigured) {
      await this.tick();
      return;
    }

    for (const domain of domains) {
      if (allowed) {
        this.temporarilyAllowedDomains.add(domain);
        this.manuallyBlockedDomains.delete(domain);
      } else {
        this.temporarilyAllowedDomains.delete(domain);
        this.manuallyBlockedDomains.add(domain);
      }
    }
    await this.tick();
    if (allowed) {
      try {
        await this.browserGuard.blockChrome();
      } catch (error) {
      }
    } else {
      await this.browserGuard.unblockChrome();
    }
  }

  private async tick(): Promise<void> {
    await this.syncFromServer();

    const scheduledDomains = domainsToBlock(this.commitments, new Date());
    const now = new Date();
    const lockScreenActive = shouldShowLockScreen(this.commitments, now);
    const domains = [...new Set([
      ...scheduledDomains,
      ...this.manuallyBlockedDomains
    ])].filter((domain) => !this.temporarilyAllowedDomains.has(domain));
    const wasEnforcing = this.state.enforcing;

    try {
      await this.blocker.apply(domains);
      this.state = {
        enforcing: domains.length > 0,
        blockedDomains: domains,
        hasAdminRights: true,
        lastError: null,
        lockScreenActive
      };
    } catch (error) {
      const hasAdminRights = await this.blocker.canWrite();
      this.state = {
        enforcing: false,
        blockedDomains: domains,
        hasAdminRights,
        lastError: hasAdminRights ? (error as Error).message : 'Se requieren permisos de administrador para aplicar el bloqueo.',
        lockScreenActive
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
