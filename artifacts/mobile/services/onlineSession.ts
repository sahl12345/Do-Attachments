const getBase = () => {
  const domain =
    typeof process !== "undefined" ? process.env.EXPO_PUBLIC_DOMAIN : undefined;
  if (domain) return `https://${domain}/api/online`;
  return "/api/online";
};

export interface OnlinePlayer {
  id: string;
  name: string;
  isHost: boolean;
}

export interface OnlineRound {
  id: string;
  scores: Record<string, number>;
  timestamp: number;
}

export interface OnlineSessionData {
  code: string;
  gameId: string;
  players: OnlinePlayer[];
  rounds: OnlineRound[];
  targetScore: number;
  createdAt: number;
  startedAt?: number;
  completedAt?: number;
  winnerId?: string;
}

async function post<T>(path: string, body: unknown): Promise<T> {
  const res = await fetch(`${getBase()}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: "Network error" }));
    throw new Error((err as { error: string }).error ?? "Request failed");
  }
  return res.json() as Promise<T>;
}

async function get<T>(path: string): Promise<T> {
  const res = await fetch(`${getBase()}${path}`);
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: "Network error" }));
    throw new Error((err as { error: string }).error ?? "Request failed");
  }
  return res.json() as Promise<T>;
}

export async function createOnlineSession(
  gameId: string,
  targetScore: number,
  hostName: string
): Promise<{ code: string; hostPlayerId: string }> {
  return post("", { gameId, targetScore, hostName });
}

export async function getOnlineSession(
  code: string
): Promise<OnlineSessionData> {
  return get(`/${code}`);
}

export async function joinOnlineSession(
  code: string,
  name: string
): Promise<{ playerId: string; session: OnlineSessionData }> {
  return post(`/${code}/join`, { name });
}

export async function startOnlineSession(
  code: string,
  hostPlayerId: string
): Promise<OnlineSessionData> {
  return post(`/${code}/start`, { hostPlayerId });
}

export async function addOnlineRound(
  code: string,
  hostPlayerId: string,
  scores: Record<string, number>
): Promise<OnlineSessionData> {
  return post(`/${code}/round`, { hostPlayerId, scores });
}

export async function undoOnlineRound(
  code: string,
  hostPlayerId: string
): Promise<OnlineSessionData> {
  return post(`/${code}/undo`, { hostPlayerId });
}

export async function completeOnlineSession(
  code: string,
  hostPlayerId: string,
  winnerId: string
): Promise<OnlineSessionData> {
  return post(`/${code}/complete`, { hostPlayerId, winnerId });
}
