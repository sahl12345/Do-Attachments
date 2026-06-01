import AsyncStorage from "@react-native-async-storage/async-storage";
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";

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

export interface UserProfile {
  name: string;
  hasSeenOnboarding: boolean;
}

interface AppContextType {
  sessions: Session[];
  profile: UserProfile;
  isLoading: boolean;
  addSession: (session: Session) => void;
  updateSession: (id: string, updates: Partial<Session>) => void;
  deleteSession: (id: string) => void;
  setProfile: (profile: UserProfile) => void;
}

const defaultProfile: UserProfile = {
  name: "",
  hasSeenOnboarding: false,
};

const AppContext = createContext<AppContextType>({
  sessions: [],
  profile: defaultProfile,
  isLoading: true,
  addSession: () => {},
  updateSession: () => {},
  deleteSession: () => {},
  setProfile: () => {},
});

const SESSIONS_KEY = "@tasheedeh_sessions";
const PROFILE_KEY = "@tasheedeh_profile";

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [sessions, setSessions] = useState<Session[]>([]);
  const [profile, setProfileState] = useState<UserProfile>(defaultProfile);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        const [sessionsRaw, profileRaw] = await Promise.all([
          AsyncStorage.getItem(SESSIONS_KEY),
          AsyncStorage.getItem(PROFILE_KEY),
        ]);
        if (sessionsRaw) setSessions(JSON.parse(sessionsRaw));
        if (profileRaw) setProfileState(JSON.parse(profileRaw));
      } catch (_e) {
      } finally {
        setIsLoading(false);
      }
    };
    load();
  }, []);

  const saveSessions = useCallback(async (next: Session[]) => {
    await AsyncStorage.setItem(SESSIONS_KEY, JSON.stringify(next));
  }, []);

  const addSession = useCallback(
    (session: Session) => {
      setSessions((prev) => {
        const next = [session, ...prev];
        saveSessions(next);
        return next;
      });
    },
    [saveSessions]
  );

  const updateSession = useCallback(
    (id: string, updates: Partial<Session>) => {
      setSessions((prev) => {
        const next = prev.map((s) =>
          s.id === id ? { ...s, ...updates } : s
        );
        saveSessions(next);
        return next;
      });
    },
    [saveSessions]
  );

  const deleteSession = useCallback(
    (id: string) => {
      setSessions((prev) => {
        const next = prev.filter((s) => s.id !== id);
        saveSessions(next);
        return next;
      });
    },
    [saveSessions]
  );

  const setProfile = useCallback(async (p: UserProfile) => {
    setProfileState(p);
    await AsyncStorage.setItem(PROFILE_KEY, JSON.stringify(p));
  }, []);

  return (
    <AppContext.Provider
      value={{
        sessions,
        profile,
        isLoading,
        addSession,
        updateSession,
        deleteSession,
        setProfile,
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
