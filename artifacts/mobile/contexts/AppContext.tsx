import AsyncStorage from "@react-native-async-storage/async-storage";
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";

import { supabase, SupabaseUser } from "@/lib/supabase";
import {
  deleteSessionRemote,
  fetchProfile,
  fetchSessions,
  upsertProfile,
  upsertSession,
} from "@/services/auth";

export interface Player {
  id: string;
  name: string;
}

export interface Round {
  id: string;
  scores: Record<string, number>;
  timestamp: number;
}

export interface Session {
  id: string;
  gameId: string;
  players: Player[];
  rounds: Round[];
  targetScore: number;
  createdAt: number;
  completedAt?: number;
  winnerId?: string;
}

interface AppContextType {
  sessions: Session[];
  user: SupabaseUser | null;
  userName: string;
  isLoading: boolean;
  addSession: (session: Session) => void;
  updateSession: (id: string, updates: Partial<Session>) => void;
  deleteSession: (id: string) => void;
  updateUserName: (name: string) => Promise<void>;
  signOut: () => Promise<void>;
  refreshSessions: () => Promise<void>;
}

const AppContext = createContext<AppContextType>({
  sessions: [],
  user: null,
  userName: "",
  isLoading: true,
  addSession: () => {},
  updateSession: () => {},
  deleteSession: () => {},
  updateUserName: async () => {},
  signOut: async () => {},
  refreshSessions: async () => {},
});

const SESSIONS_KEY = "@tasheedeh_sessions_v2";

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [sessions, setSessions] = useState<Session[]>([]);
  const [user, setUser] = useState<SupabaseUser | null>(null);
  const [userName, setUserName] = useState("");
  const [isLoading, setIsLoading] = useState(true);

  const loadUserData = useCallback(async (u: SupabaseUser) => {
    try {
      const [{ data: profile }, remoteSessions] = await Promise.all([
        fetchProfile(u.id),
        fetchSessions(u.id),
      ]);

      if (profile?.name) {
        setUserName(profile.name);
      } else {
        // Auto-populate name from Google OAuth metadata
        const googleName =
          u.user_metadata?.full_name ||
          u.user_metadata?.name ||
          u.user_metadata?.given_name ||
          "";
        if (googleName) {
          setUserName(googleName);
          await upsertProfile(u.id, googleName);
        }
      }

      if (remoteSessions.length > 0) {
        setSessions(remoteSessions);
        await AsyncStorage.setItem(
          SESSIONS_KEY,
          JSON.stringify(remoteSessions)
        );
      } else {
        const cached = await AsyncStorage.getItem(SESSIONS_KEY);
        if (cached) setSessions(JSON.parse(cached));
      }
    } catch (_) {
      const cached = await AsyncStorage.getItem(SESSIONS_KEY);
      if (cached) setSessions(JSON.parse(cached));
    }
  }, []);

  useEffect(() => {
    let mounted = true;

    const init = async () => {
      try {
        const {
          data: { session },
        } = await supabase.auth.getSession();
        if (!mounted) return;
        const u = session?.user ?? null;
        setUser(u);
        if (u) {
          await loadUserData(u);
        }
      } catch (e) {
        console.warn("Supabase getSession error:", e);
      } finally {
        if (mounted) setIsLoading(false);
      }
    };

    init();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (!mounted) return;
      const u = session?.user ?? null;
      setUser(u);

      if (event === "SIGNED_IN" || event === "TOKEN_REFRESHED") {
        if (u) await loadUserData(u);
      } else if (event === "SIGNED_OUT") {
        setSessions([]);
        setUserName("");
        await AsyncStorage.removeItem(SESSIONS_KEY);
      }
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, [loadUserData]);

  const refreshSessions = useCallback(async () => {
    if (!user) return;
    const remote = await fetchSessions(user.id);
    setSessions(remote);
    await AsyncStorage.setItem(SESSIONS_KEY, JSON.stringify(remote));
  }, [user]);

  const addSession = useCallback(
    (session: Session) => {
      setSessions((prev) => {
        const next = [session, ...prev];
        AsyncStorage.setItem(SESSIONS_KEY, JSON.stringify(next));
        return next;
      });
      if (user) upsertSession(user.id, session);
    },
    [user]
  );

  const updateSession = useCallback(
    (id: string, updates: Partial<Session>) => {
      setSessions((prev) => {
        const next = prev.map((s) => (s.id === id ? { ...s, ...updates } : s));
        AsyncStorage.setItem(SESSIONS_KEY, JSON.stringify(next));
        const updated = next.find((s) => s.id === id);
        if (user && updated) upsertSession(user.id, updated);
        return next;
      });
    },
    [user]
  );

  const deleteSession = useCallback(
    (id: string) => {
      setSessions((prev) => {
        const next = prev.filter((s) => s.id !== id);
        AsyncStorage.setItem(SESSIONS_KEY, JSON.stringify(next));
        return next;
      });
      if (user) deleteSessionRemote(id);
    },
    [user]
  );

  const updateUserName = useCallback(
    async (name: string) => {
      setUserName(name);
      if (user) await upsertProfile(user.id, name);
    },
    [user]
  );

  const handleSignOut = useCallback(async () => {
    await supabase.auth.signOut();
  }, []);

  return (
    <AppContext.Provider
      value={{
        sessions,
        user,
        userName,
        isLoading,
        addSession,
        updateSession,
        deleteSession,
        updateUserName,
        signOut: handleSignOut,
        refreshSessions,
      }}
    >
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  return useContext(AppContext);
}

export function getTotalScore(session: Session, playerId: string): number {
  return session.rounds.reduce((sum, r) => sum + (r.scores[playerId] ?? 0), 0);
}

export function getTeamScore(
  session: Session,
  teamIndices: number[]
): number {
  return teamIndices.reduce((sum, i) => {
    const p = session.players[i];
    if (!p) return sum;
    return sum + getTotalScore(session, p.id);
  }, 0);
}

export function generateId(): string {
  return Date.now().toString() + Math.random().toString(36).substring(2, 9);
}
