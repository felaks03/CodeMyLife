export interface Commitment {
  _id: string;
  scriptId: string;
  name: string;
  blockedDomains: string[];
  days: number[];
  startTime: string;
  endTime: string;
  startsAt: string;
  endsAt: string;
  status: 'active' | 'completed' | 'cancelled';
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
