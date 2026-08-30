import { createContext, useContext, useEffect, useState, useCallback, ReactNode } from 'react';
import { api } from '../utils/api';
import { getToken, setToken } from '../utils/token';

type AuthUser = { id: string; email: string; role?: string } | null;

type AuthContextValue = {
  status: 'loading' | 'authed' | 'unauthed';
  user: AuthUser;
  authEnabled: boolean;
  login: (email: string, password: string) => Promise<{ ok: boolean; message?: string }>;
  register: (email: string, password: string, inviteCode: string) => Promise<{ ok: boolean; message?: string }>;
  logout: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState<'loading' | 'authed' | 'unauthed'>('loading');
  const [user, setUser] = useState<AuthUser>(null);
  const [authEnabled, setAuthEnabled] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        // 檢查登入是否啟用
        const st = await api.authStatus().catch(() => null);
        const enabled = st?.data?.enabled ?? true;
        setAuthEnabled(enabled);

        // 若已登入，驗證 token
        const token = await getToken();
        if (token) {
          const me = await api.me().catch(() => null);
          if (me?.success && me.data) {
            setUser(me.data);
            setStatus('authed');
            return;
          }
          // token 失效
          await setToken(null);
        }
        setStatus(enabled ? 'unauthed' : 'authed');
      } catch {
        setStatus('unauthed');
      }
    })();
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    try {
      const res = await api.login(email, password);
      if (res.success && res.data) {
        await setToken(res.data.token);
        setUser(res.data.user);
        setStatus('authed');
        return { ok: true };
      }
      return { ok: false };
    } catch (e: any) {
      return { ok: false, message: e?.message || '登入失敗' };
    }
  }, []);

  const register = useCallback(async (email: string, password: string, inviteCode: string) => {
    try {
      const res = await api.register(email, password, inviteCode);
      if (res.success && res.data) {
        await setToken(res.data.token);
        setUser(res.data.user);
        setStatus('authed');
        return { ok: true };
      }
      return { ok: false };
    } catch (e: any) {
      return { ok: false, message: e?.message || '註冊失敗' };
    }
  }, []);

  const logout = useCallback(async () => {
    await setToken(null);
    setUser(null);
    setStatus('unauthed');
  }, []);

  return (
    <AuthContext.Provider value={{ status, user, authEnabled, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth 需在 AuthProvider 內使用');
  return ctx;
}
