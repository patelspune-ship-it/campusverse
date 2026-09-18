import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { setUnauthorizedHandler } from "../api/client";
import { clearSession, login, restoreSession, saveSession } from "../services/auth";
import { registerForPushNotifications } from "../services/notifications";
import { resetMyDivisionCache } from "../hooks/useMyDivision";
import type { CampusVerseUser } from "../types/api";
type SessionContextValue = { token: string | null; user: CampusVerseUser | null; isRestoring: boolean; signIn: (userId: string, password: string) => Promise<CampusVerseUser>; signOut: () => Promise<void> };
const SessionContext = createContext<SessionContextValue | null>(null);
export function SessionProvider({ children }: { children: React.ReactNode }) {
  const [token, setToken] = useState<string | null>(null); const [user, setUser] = useState<CampusVerseUser | null>(null); const [isRestoring, setIsRestoring] = useState(true);
  useEffect(() => { restoreSession().then((session) => { if (session) { setToken(session.token); setUser(session.user); registerForPushNotifications().catch(() => {}); } }).finally(() => setIsRestoring(false)); }, []);
  useEffect(() => { setUnauthorizedHandler(() => { setToken(null); setUser(null); }); return () => setUnauthorizedHandler(null); }, []);
  const value = useMemo(() => ({ token, user, isRestoring, signIn: async (userId: string, password: string) => { const session = await login(userId.trim(), password); await saveSession(session.token, session.user); setToken(session.token); setUser(session.user); resetMyDivisionCache(); registerForPushNotifications().catch(() => {}); return session.user; }, signOut: async () => { await clearSession(); setToken(null); setUser(null); resetMyDivisionCache(); } }), [token, user, isRestoring]);
  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>;
}
export function useSession() { const context = useContext(SessionContext); if (!context) throw new Error("useSession must be used inside SessionProvider"); return context; }
