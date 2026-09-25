import { createContext, ReactNode, useContext, useEffect, useState, useCallback } from "react";
import { api, clearToken, getToken, saveToken } from "@/src/api";

type User = {
  id: string; email: string; name: string;
  role?: string; user_type?: string; qualification?: string; year?: string; country?: string; goal?: string;
  is_admin?: boolean; ai_name?: string; ai_tone?: "warm" | "funny" | "strict" | "neutral";
  onboarded?: boolean;
};

type AuthCtx = {
  user: User | null;
  loading: boolean;
  signup: (email: string, password: string, name: string) => Promise<void>;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  refresh: () => Promise<void>;
  saveOnboarding: (d: any) => Promise<void>;
};

const Ctx = createContext<AuthCtx | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    const t = await getToken();
    if (!t) { setUser(null); setLoading(false); return; }
    try {
      const { user } = await api.me();
      setUser(user);
    } catch {
      await clearToken();
      setUser(null);
    } finally { setLoading(false); }
  }, []);

  useEffect(() => { refresh(); }, [refresh]);

  // Check the reply before touching SecureStore, which rejects anything that isn't a string.
  const startSession = async (r: any) => {
    if (typeof r?.access_token !== "string" || !r.access_token || !r.user) {
      throw new Error("The server did not return a valid session. Please try again.");
    }
    await saveToken(r.access_token);
    setUser(r.user);
  };
  const signup = async (email: string, password: string, name: string) => {
    await startSession(await api.signup(email, password, name));
  };
  const login = async (email: string, password: string) => {
    await startSession(await api.login(email, password));
  };
  const logout = async () => { await clearToken(); setUser(null); };
  const saveOnboarding = async (d: any) => {
    const r = await api.saveOnboarding(d);
    setUser(r.user);
  };

  return <Ctx.Provider value={{ user, loading, signup, login, logout, refresh, saveOnboarding }}>{children}</Ctx.Provider>;
}

export function useAuth() {
  const c = useContext(Ctx);
  if (!c) throw new Error("useAuth outside AuthProvider");
  return c;
}
