import { AuthUser, Commitment, NewCommitment, NewScript, Script } from '../shared/types';

const API_BASE_URL = process.env.CODEMYLIFE_API_URL ?? 'http://127.0.0.1:3000';

export class ApiError extends Error {}

async function request<T>(pathname: string, options: RequestInit = {}, token?: string): Promise<T> {
  const headers = new Headers(options.headers);
  headers.set('Content-Type', 'application/json');
  if (token) {
    headers.set('Authorization', `Bearer ${token}`);
  }

  const response = await fetch(`${API_BASE_URL}${pathname}`, { ...options, headers });
  const body = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new ApiError((body as { error?: string }).error ?? `Request failed (${response.status})`);
  }
  return body as T;
}

export interface AuthResponse {
  token: string;
  user: AuthUser;
}

export const api = {
  register: (email: string, name: string, password: string) =>
    request<AuthResponse>('/api/auth/register', {
      method: 'POST',
      body: JSON.stringify({ email, name, password })
    }),

  login: (email: string, password: string) =>
    request<AuthResponse>('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password })
    }),

  listCommitments: (token: string) => request<Commitment[]>('/api/commitments', {}, token),

  activeCommitments: (token: string) => request<Commitment[]>('/api/commitments/active', {}, token),

  createCommitment: (token: string, payload: NewCommitment) =>
    request<Commitment>('/api/commitments', { method: 'POST', body: JSON.stringify(payload) }, token),

  cancelCommitment: (token: string, id: string) =>
    request<Commitment>(`/api/commitments/${encodeURIComponent(id)}`, { method: 'DELETE' }, token),

  searchScripts: (token: string, query: string) =>
    request<Script[]>(`/api/scripts?q=${encodeURIComponent(query)}`, {}, token),

  createScript: (token: string, payload: NewScript) =>
    request<Script>('/api/scripts', { method: 'POST', body: JSON.stringify(payload) }, token)
};
