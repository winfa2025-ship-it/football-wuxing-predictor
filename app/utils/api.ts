import Constants from 'expo-constants';
import { Platform } from 'react-native';
import { Fixture, DailyPrediction, FengshuiAnalysis, Commentary, MatchHistory } from './types';
import { getToken } from './token';

const getDefaultUrl = () => {
  if (Platform.OS === 'web') return 'http://localhost:3001';
  const debuggerHost = Constants.expoConfig?.hostUri || Constants.expoGoConfig?.debuggerHost;
  const host = debuggerHost?.split(':')?.[0] || 'localhost';
  return `http://${host}:3001`;
};

const BASE_URL = Platform.OS === 'web' ? '' : (process.env.EXPO_PUBLIC_API_URL || getDefaultUrl());

async function request<T = any>(path: string, options: RequestInit = {}): Promise<T> {
  const token = await getToken();
  const headers: Record<string, string> = { 'Content-Type': 'application/json', ...(options.headers as Record<string, string>) };
  if (token) headers.Authorization = `Bearer ${token}`;
  const res = await fetch(`${BASE_URL}/api${path}`, { ...options, headers });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body?.error || `API error: ${res.status}`);
  }
  return res.json();
}

export const api = {
  getFixtures: () => request<{ success: boolean; data: Fixture[]; count: number }>('/fixtures'),
  getLive: () => request<{ success: boolean; data: Fixture[]; count: number }>('/live'),
  getTodayPredictions: () => request<{ success: boolean; data: DailyPrediction[]; count: number }>('/predictions/today'),
  predict: (payload: object) => request<{ success: boolean; data: any }>('/predict', { method: 'POST', body: JSON.stringify(payload) }),
  fengshui: (payload: object) => request<{ success: boolean; data: FengshuiAnalysis }>('/fengshui', { method: 'POST', body: JSON.stringify(payload) }),
  getCommentary: () => request<{ success: boolean; data: Commentary[] }>('/agents/commentary'),
  getMatchHistory: (fixtureId: number | string, query?: { home?: string; away?: string }) =>
    request<{ success: boolean; data: MatchHistory }>(`/fixtures/${fixtureId}/history${query ? `?home=${encodeURIComponent(query.home || '')}&away=${encodeURIComponent(query.away || '')}` : ''}`),
  // 認證
  register: (email: string, password: string, inviteCode: string) => request<{ success: boolean; data: { token: string; user: any } }>('/auth/register', { method: 'POST', body: JSON.stringify({ email, password, inviteCode }) }),
  login: (email: string, password: string) => request<{ success: boolean; data: { token: string; user: any } }>('/auth/login', { method: 'POST', body: JSON.stringify({ email, password }) }),
  me: () => request<{ success: boolean; data: { id: string; email: string } | null }>('/auth/me'),
  authStatus: () => request<{ success: boolean; data: { enabled: boolean; requiresInvite: boolean } }>('/auth/status'),
};

export { BASE_URL };
