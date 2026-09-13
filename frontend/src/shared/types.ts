export interface Commitment {
  _id: string;
  scriptId: string;
  scriptName: string;
  name: string;
  blockedDomains: string[];
  days: number[];
  startTime: string;
  endTime: string;
  startsAt: string;
  endsAt: string;
  alwaysBlocked?: boolean;
  showLockScreen?: boolean;
  unlockUntil?: string;
  status: 'active' | 'completed' | 'cancelled';
}

export interface Script {
  _id: string;
  authorName: string;
  name: string;
  description: string;
  category: string;
  blockedDomains: string[];
  allowCustomDomains: boolean;
  usageCount: number;
  blockingMode?: 'scheduled' | 'always' | 'daily-limit';
  dailyLimitMinutes?: number;
  showLockScreen?: boolean;
  unlockable?: boolean;
  blockedProcesses?: string[];
  schedule?: {
    days: number[];
    startTime: string;
    endTime: string;
  };
}

export interface NewCommitment {
  scriptId: string;
  name: string;
  customDomains: string[];
  days: number[];
  startTime: string;
  endTime: string;
  startsAt: string;
  endsAt: string;
  alwaysBlocked?: boolean;
  showLockScreen?: boolean;
  unlockUntil?: string;
}

export interface NewScript {
  name: string;
  description: string;
  category: string;
  blockedDomains: string[];
  allowCustomDomains: boolean;
}

export interface AuthUser {
  id: string;
  email: string;
  name: string;
}

export interface BlockingState {
  enforcing: boolean;
  blockedDomains: string[];
  hasAdminRights: boolean;
  lastError: string | null;
  lockScreenActive?: boolean;
}

export interface TaskDefinition {
  id: string;
  name: string;
  description: string;
  rewardCoins: number;
  frequency: 'daily' | 'weekly';
}

export interface TaskCompletion {
  taskId: string;
  periodKey: string;
  completedAt: string;
}

export interface ShopItem {
  id: string;
  name: string;
  description: string;
  costCoins: number;
  durationMinutes: number;
  targetScriptId: string;
}

export interface WalletState {
  coins: number;
  earnedCoins: number;
  spentCoins: number;
  completions: TaskCompletion[];
  purchases: { itemId: string; coins: number; purchasedAt: string; unlockUntil: string }[];
}
