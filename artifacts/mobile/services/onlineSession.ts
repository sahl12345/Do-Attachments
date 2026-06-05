import { supabase } from "@/lib/supabase";

export interface OnlinePlayer {
  id: string;
  name: string;
  isHost: boolean;
}

export interface OnlineRound {
  id: string;
  scores: Record<string, number>;
  timestamp: number;
  recordedBy?: string;
}

export interface PendingRound {
  round: OnlineRound;
  approvals: string[];
  rejections: string[];
  expiresAt: number;
}

export interface OnlineSessionData {
  code: string;
  gameId: string;
  players: OnlinePlayer[];
  rounds: OnlineRound[];
  targetScore: number;
  antiCheat?: boolean;
  antiCheatTimeout?: number;
  pendingRound?: PendingRound | null;
  createdAt: number;
  startedAt?: number;
  completedAt?: number;
  winnerId?: string;
}

const TABLE = "online_sessions";
const TIMEOUT_MS = 30000;

interface DbRow {
  code: string;
  game_id: string;
  players: OnlinePlayer[];
  rounds: OnlineRound[];
  pending_round: PendingRound | null;
  target_score: number;
  anti_cheat: boolean | null;
  anti_cheat_timeout: number | null;
  created_at: number;
  started_at: number | null;
  completed_at: number | null;
  winner_id: string | null;
}

function withTimeout<T>(promise: PromiseLike<T>, ms = TIMEOUT_MS): Promise<T> {
  return Promise.race([
    Promise.resolve(promise),
    new Promise<T>((_, reject) =>
      setTimeout(() => reject(new Error("انتهت مهلة الاتصال بالخادم")), ms)
    ),
  ]);
}

function toSession(row: DbRow): OnlineSessionData {
  return {
    code: row.code,
    gameId: row.game_id,
    players: row.players ?? [],
    rounds: row.rounds ?? [],
    pendingRound: row.pending_round,
    targetScore: row.target_score,
    antiCheat: row.anti_cheat ?? undefined,
    antiCheatTimeout: row.anti_cheat_timeout ?? undefined,
    createdAt: row.created_at,
    startedAt: row.started_at ?? undefined,
    completedAt: row.completed_at ?? undefined,
    winnerId: row.winner_id ?? undefined,
  };
}

function generateCode(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).substring(2, 7);
}

async function getRow(code: string): Promise<DbRow> {
  const { data, error } = await withTimeout(
    supabase.from(TABLE).select("*").eq("code", code).single()
  );
  if (error || !data) throw new Error(error?.message ?? "الجلسة غير موجودة");
  return data as DbRow;
}

export async function createOnlineSession(
  gameId: string,
  targetScore: number,
  hostName: string,
  antiCheat?: boolean,
  antiCheatTimeout?: number
): Promise<{ code: string; hostPlayerId: string }> {
  const code = generateCode();
  const hostPlayerId = generateId();

  const { error } = await withTimeout(
    supabase.from(TABLE).insert({
      code,
      game_id: gameId,
      players: [{ id: hostPlayerId, name: hostName, isHost: true }],
      rounds: [],
      target_score: targetScore,
      anti_cheat: antiCheat ?? false,
      anti_cheat_timeout: antiCheatTimeout ?? 10,
      created_at: Date.now(),
    })
  );

  if (error) throw new Error(error.message);
  return { code, hostPlayerId };
}

export async function getOnlineSession(
  code: string
): Promise<OnlineSessionData> {
  return toSession(await getRow(code));
}

export async function joinOnlineSession(
  code: string,
  name: string
): Promise<{ playerId: string; session: OnlineSessionData }> {
  const row = await getRow(code);
  if (row.started_at) throw new Error("الجلسة بدأت بالفعل");
  if (row.players.length >= 6) throw new Error("الجلسة ممتلئة");

  const playerId = generateId();
  const newPlayers: OnlinePlayer[] = [
    ...row.players,
    { id: playerId, name, isHost: false },
  ];

  const { data, error } = await withTimeout(
    supabase
      .from(TABLE)
      .update({ players: newPlayers })
      .eq("code", code)
      .select()
      .single()
  );

  if (error || !data) throw new Error(error?.message ?? "فشل الانضمام");
  return { playerId, session: toSession(data as DbRow) };
}

export async function startOnlineSession(
  code: string,
  _hostPlayerId: string
): Promise<OnlineSessionData> {
  const { data, error } = await withTimeout(
    supabase
      .from(TABLE)
      .update({ started_at: Date.now() })
      .eq("code", code)
      .select()
      .single()
  );

  if (error || !data) throw new Error(error?.message ?? "فشل بدء الجلسة");
  return toSession(data as DbRow);
}

export async function addOnlineRound(
  code: string,
  playerId: string,
  scores: Record<string, number>
): Promise<OnlineSessionData> {
  const row = await getRow(code);

  const round: OnlineRound = {
    id: generateId(),
    scores,
    timestamp: Date.now(),
    recordedBy: playerId,
  };

  if (row.anti_cheat) {
    const timeoutMs = (row.anti_cheat_timeout ?? 10) * 1000;
    const pending: PendingRound = {
      round,
      approvals: [],
      rejections: [],
      expiresAt: Date.now() + timeoutMs,
    };
    const { data, error } = await withTimeout(
      supabase
        .from(TABLE)
        .update({ pending_round: pending })
        .eq("code", code)
        .select()
        .single()
    );
    if (error || !data) throw new Error(error?.message ?? "فشل تسجيل الجولة");
    return toSession(data as DbRow);
  }

  const { data, error } = await withTimeout(
    supabase
      .from(TABLE)
      .update({ rounds: [...row.rounds, round] })
      .eq("code", code)
      .select()
      .single()
  );

  if (error || !data) throw new Error(error?.message ?? "فشل تسجيل الجولة");
  return toSession(data as DbRow);
}

export async function undoOnlineRound(
  code: string,
  _hostPlayerId: string
): Promise<OnlineSessionData> {
  const row = await getRow(code);

  const { data, error } = await withTimeout(
    supabase
      .from(TABLE)
      .update({
        rounds: row.rounds.slice(0, -1),
        completed_at: null,
        winner_id: null,
      })
      .eq("code", code)
      .select()
      .single()
  );

  if (error || !data) throw new Error(error?.message ?? "فشل التراجع");
  return toSession(data as DbRow);
}

export async function completeOnlineSession(
  code: string,
  _playerId: string,
  winnerId: string
): Promise<OnlineSessionData> {
  const { data, error } = await withTimeout(
    supabase
      .from(TABLE)
      .update({ completed_at: Date.now(), winner_id: winnerId })
      .eq("code", code)
      .select()
      .single()
  );

  if (error || !data) throw new Error(error?.message ?? "فشل إنهاء الجلسة");
  return toSession(data as DbRow);
}

export async function voteOnlineRound(
  code: string,
  playerId: string,
  vote: "approve" | "reject"
): Promise<OnlineSessionData & { voteResult?: "approved" | "rejected" | "pending" }> {
  const row = await getRow(code);
  const pending = row.pending_round;
  if (!pending) throw new Error("لا توجد جولة معلقة");

  const majority = Math.ceil(row.players.length / 2);

  const approvals = pending.approvals.includes(playerId)
    ? pending.approvals
    : vote === "approve"
    ? [...pending.approvals, playerId]
    : pending.approvals;

  const rejections = pending.rejections.includes(playerId)
    ? pending.rejections
    : vote === "reject"
    ? [...pending.rejections, playerId]
    : pending.rejections;

  const isExpired = Date.now() >= pending.expiresAt;

  if (approvals.length >= majority || isExpired) {
    const { data, error } = await withTimeout(
      supabase
        .from(TABLE)
        .update({ rounds: [...row.rounds, pending.round], pending_round: null })
        .eq("code", code)
        .select()
        .single()
    );
    if (error || !data) throw new Error(error?.message ?? "فشل التصويت");
    return { ...toSession(data as DbRow), voteResult: "approved" };
  }

  if (rejections.length >= majority) {
    const { data, error } = await withTimeout(
      supabase
        .from(TABLE)
        .update({ pending_round: null })
        .eq("code", code)
        .select()
        .single()
    );
    if (error || !data) throw new Error(error?.message ?? "فشل التصويت");
    return { ...toSession(data as DbRow), voteResult: "rejected" };
  }

  const updatedPending: PendingRound = { ...pending, approvals, rejections };
  const { data, error } = await withTimeout(
    supabase
      .from(TABLE)
      .update({ pending_round: updatedPending })
      .eq("code", code)
      .select()
      .single()
  );
  if (error || !data) throw new Error(error?.message ?? "فشل التصويت");
  return { ...toSession(data as DbRow), voteResult: "pending" };
}
