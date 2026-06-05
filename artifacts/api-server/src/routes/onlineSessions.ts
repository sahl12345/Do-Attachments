import { createClient } from "@supabase/supabase-js";
import { Router, type IRouter } from "express";

const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL;
const SUPABASE_KEY = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

if (!SUPABASE_URL || !SUPABASE_KEY) {
  throw new Error(
    "EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_ANON_KEY must be set."
  );
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

const TABLE = "online_sessions";

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

interface DbRow {
  code: string;
  game_id: string;
  players: OnlinePlayer[];
  rounds: OnlineRound[];
  pending_round: PendingRound | null;
  target_score: number;
  anti_cheat: boolean;
  anti_cheat_timeout: number;
  created_at: number;
  started_at: number | null;
  completed_at: number | null;
  winner_id: string | null;
}

function toApi(row: DbRow) {
  return {
    code: row.code,
    gameId: row.game_id,
    players: row.players,
    rounds: row.rounds,
    pendingRound: row.pending_round,
    targetScore: row.target_score,
    antiCheat: row.anti_cheat,
    antiCheatTimeout: row.anti_cheat_timeout,
    createdAt: row.created_at,
    startedAt: row.started_at,
    completedAt: row.completed_at,
    winnerId: row.winner_id,
  };
}

function generateCode(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).substring(2, 7);
}

async function getSession(code: string): Promise<DbRow | null> {
  const { data, error } = await supabase
    .from(TABLE)
    .select("*")
    .eq("code", code)
    .single();
  if (error || !data) return null;
  return data as DbRow;
}

const router: IRouter = Router();

// POST /api/online — Create session
router.post("/online", async (req, res) => {
  const { gameId, targetScore, hostName, antiCheat, antiCheatTimeout } =
    req.body as {
      gameId: string;
      targetScore: number;
      hostName: string;
      antiCheat?: boolean;
      antiCheatTimeout?: number;
    };

  if (!gameId || !hostName) {
    res.status(400).json({ error: "gameId and hostName required" });
    return;
  }

  const code = generateCode();
  const hostId = generateId();

  const { error } = await supabase.from(TABLE).insert({
    code,
    game_id: gameId,
    players: [{ id: hostId, name: hostName, isHost: true }],
    rounds: [],
    target_score: targetScore ?? 41,
    anti_cheat: antiCheat ?? false,
    anti_cheat_timeout: antiCheatTimeout ?? 10,
    created_at: Date.now(),
  });

  if (error) {
    res.status(500).json({ error: error.message });
    return;
  }

  res.json({ code, hostPlayerId: hostId });
});

// GET /api/online/:code — Get session
router.get("/online/:code", async (req, res) => {
  const session = await getSession(req.params.code);
  if (!session) {
    res.status(404).json({ error: "Session not found" });
    return;
  }
  res.json(toApi(session));
});

// POST /api/online/:code/join — Join session
router.post("/online/:code/join", async (req, res) => {
  const session = await getSession(req.params.code);
  if (!session) {
    res.status(404).json({ error: "Session not found" });
    return;
  }
  if (session.started_at) {
    res.status(400).json({ error: "Session already started" });
    return;
  }
  if (session.players.length >= 6) {
    res.status(400).json({ error: "Session is full" });
    return;
  }

  const { name } = req.body as { name: string };
  if (!name) {
    res.status(400).json({ error: "name required" });
    return;
  }

  const playerId = generateId();
  const newPlayers: OnlinePlayer[] = [
    ...session.players,
    { id: playerId, name, isHost: false },
  ];

  const { data, error } = await supabase
    .from(TABLE)
    .update({ players: newPlayers })
    .eq("code", req.params.code)
    .select()
    .single();

  if (error || !data) {
    res.status(500).json({ error: error?.message ?? "Update failed" });
    return;
  }

  res.json({ playerId, session: toApi(data as DbRow) });
});

// POST /api/online/:code/start — Start session (host only)
router.post("/online/:code/start", async (req, res) => {
  const session = await getSession(req.params.code);
  if (!session) {
    res.status(404).json({ error: "Session not found" });
    return;
  }

  const { hostPlayerId } = req.body as { hostPlayerId: string };
  const host = session.players.find((p) => p.id === hostPlayerId && p.isHost);
  if (!host) {
    res.status(403).json({ error: "Not authorized" });
    return;
  }
  if (session.players.length < 2) {
    res.status(400).json({ error: "Need at least 2 players" });
    return;
  }

  const { data, error } = await supabase
    .from(TABLE)
    .update({ started_at: Date.now() })
    .eq("code", req.params.code)
    .select()
    .single();

  if (error || !data) {
    res.status(500).json({ error: error?.message ?? "Update failed" });
    return;
  }

  res.json(toApi(data as DbRow));
});

// POST /api/online/:code/round — Add round (any player)
router.post("/online/:code/round", async (req, res) => {
  const session = await getSession(req.params.code);
  if (!session) {
    res.status(404).json({ error: "Session not found" });
    return;
  }

  const { playerId, scores } = req.body as {
    playerId: string;
    scores: Record<string, number>;
  };

  if (!session.players.some((p) => p.id === playerId)) {
    res.status(403).json({ error: "Not a player in this session" });
    return;
  }

  const round: OnlineRound = {
    id: generateId(),
    scores,
    timestamp: Date.now(),
    recordedBy: playerId,
  };

  if (session.anti_cheat) {
    const timeoutMs = (session.anti_cheat_timeout ?? 10) * 1000;
    const pending: PendingRound = {
      round,
      approvals: [],
      rejections: [],
      expiresAt: Date.now() + timeoutMs,
    };
    const { data, error } = await supabase
      .from(TABLE)
      .update({ pending_round: pending })
      .eq("code", req.params.code)
      .select()
      .single();

    if (error || !data) {
      res.status(500).json({ error: error?.message ?? "Update failed" });
      return;
    }
    res.json(toApi(data as DbRow));
    return;
  }

  const { data, error } = await supabase
    .from(TABLE)
    .update({ rounds: [...session.rounds, round] })
    .eq("code", req.params.code)
    .select()
    .single();

  if (error || !data) {
    res.status(500).json({ error: error?.message ?? "Update failed" });
    return;
  }

  res.json(toApi(data as DbRow));
});

// POST /api/online/:code/vote — Cast vote on pending round
router.post("/online/:code/vote", async (req, res) => {
  const session = await getSession(req.params.code);
  if (!session) {
    res.status(404).json({ error: "Session not found" });
    return;
  }

  const { playerId, vote } = req.body as {
    playerId: string;
    vote: "approve" | "reject";
  };

  if (!session.players.some((p) => p.id === playerId)) {
    res.status(403).json({ error: "Not a player in this session" });
    return;
  }

  const pending = session.pending_round;
  if (!pending) {
    res.status(400).json({ error: "No pending round" });
    return;
  }

  const majority = Math.ceil(session.players.length / 2);
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
    const { data, error } = await supabase
      .from(TABLE)
      .update({ rounds: [...session.rounds, pending.round], pending_round: null })
      .eq("code", req.params.code)
      .select()
      .single();
    if (error || !data) {
      res.status(500).json({ error: error?.message ?? "Update failed" });
      return;
    }
    res.json({ ...toApi(data as DbRow), voteResult: "approved" });
    return;
  }

  if (rejections.length >= majority) {
    const { data, error } = await supabase
      .from(TABLE)
      .update({ pending_round: null })
      .eq("code", req.params.code)
      .select()
      .single();
    if (error || !data) {
      res.status(500).json({ error: error?.message ?? "Update failed" });
      return;
    }
    res.json({ ...toApi(data as DbRow), voteResult: "rejected" });
    return;
  }

  const updatedPending: PendingRound = { ...pending, approvals, rejections };
  const { data, error } = await supabase
    .from(TABLE)
    .update({ pending_round: updatedPending })
    .eq("code", req.params.code)
    .select()
    .single();
  if (error || !data) {
    res.status(500).json({ error: error?.message ?? "Update failed" });
    return;
  }
  res.json({ ...toApi(data as DbRow), voteResult: "pending" });
});

// POST /api/online/:code/undo — Undo last round (host only)
router.post("/online/:code/undo", async (req, res) => {
  const session = await getSession(req.params.code);
  if (!session) {
    res.status(404).json({ error: "Session not found" });
    return;
  }

  const { hostPlayerId } = req.body as { hostPlayerId: string };
  const host = session.players.find((p) => p.id === hostPlayerId && p.isHost);
  if (!host) {
    res.status(403).json({ error: "Not authorized" });
    return;
  }

  const { data, error } = await supabase
    .from(TABLE)
    .update({
      rounds: session.rounds.slice(0, -1),
      completed_at: null,
      winner_id: null,
    })
    .eq("code", req.params.code)
    .select()
    .single();

  if (error || !data) {
    res.status(500).json({ error: error?.message ?? "Update failed" });
    return;
  }

  res.json(toApi(data as DbRow));
});

// POST /api/online/:code/complete — Mark complete
router.post("/online/:code/complete", async (req, res) => {
  const session = await getSession(req.params.code);
  if (!session) {
    res.status(404).json({ error: "Session not found" });
    return;
  }

  const { playerId, winnerId } = req.body as {
    playerId: string;
    winnerId: string;
  };

  if (!session.players.some((p) => p.id === playerId)) {
    res.status(403).json({ error: "Not authorized" });
    return;
  }

  const { data, error } = await supabase
    .from(TABLE)
    .update({ completed_at: Date.now(), winner_id: winnerId })
    .eq("code", req.params.code)
    .select()
    .single();

  if (error || !data) {
    res.status(500).json({ error: error?.message ?? "Update failed" });
    return;
  }

  res.json(toApi(data as DbRow));
});

export default router;
