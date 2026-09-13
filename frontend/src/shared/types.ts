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
}
