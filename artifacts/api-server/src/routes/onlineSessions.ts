import { eq, lt } from "drizzle-orm";
import { Router, type IRouter } from "express";
import { db, onlineSessionsTable, type OnlinePlayer, type OnlineRound, type PendingRound } from "@workspace/db";

const router: IRouter = Router();

function generateCode(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).substring(2, 7);
}

async function getSession(code: string) {
  const rows = await db
    .select()
    .from(onlineSessionsTable)
    .where(eq(onlineSessionsTable.code, code));
  return rows[0] ?? null;
}

function getPlayers(session: NonNullable<Awaited<ReturnType<typeof getSession>>>): OnlinePlayer[] {
  return session.players as OnlinePlayer[];
}

function getRounds(session: NonNullable<Awaited<ReturnType<typeof getSession>>>): OnlineRound[] {
  return session.rounds as OnlineRound[];
}

// Clean up sessions older than 24h — runs every hour
setInterval(async () => {
  const cutoff = Date.now() - 24 * 60 * 60 * 1000;
  await db
    .delete(onlineSessionsTable)
    .where(lt(onlineSessionsTable.createdAt, cutoff));
}, 60 * 60 * 1000);

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

  await db.insert(onlineSessionsTable).values({
    code,
    gameId,
    players: [{ id: hostId, name: hostName, isHost: true }],
    rounds: [],
    targetScore: targetScore ?? 41,
    antiCheat: antiCheat ?? false,
    antiCheatTimeout: antiCheatTimeout ?? 10,
    createdAt: Date.now(),
  });

  res.json({ code, hostPlayerId: hostId });
});

// GET /api/online/:code — Get session
router.get("/online/:code", async (req, res) => {
  const session = await getSession(req.params.code);
  if (!session) {
    res.status(404).json({ error: "Session not found" });
    return;
  }
  res.json(session);
});

// POST /api/online/:code/join — Join session
router.post("/online/:code/join", async (req, res) => {
  const session = await getSession(req.params.code);
  if (!session) {
    res.status(404).json({ error: "Session not found" });
    return;
  }
  if (session.startedAt) {
    res.status(400).json({ error: "Session already started" });
    return;
  }
  const players = getPlayers(session);
  if (players.length >= 6) {
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
    ...players,
    { id: playerId, name, isHost: false },
  ];

  const [updated] = await db
    .update(onlineSessionsTable)
    .set({ players: newPlayers })
    .where(eq(onlineSessionsTable.code, req.params.code))
    .returning();

  res.json({ playerId, session: updated });
});

// POST /api/online/:code/start — Start session (host only)
router.post("/online/:code/start", async (req, res) => {
  const session = await getSession(req.params.code);
  if (!session) {
    res.status(404).json({ error: "Session not found" });
    return;
  }

  const { hostPlayerId } = req.body as { hostPlayerId: string };
  const startPlayers = getPlayers(session);
  const host = startPlayers.find((p) => p.id === hostPlayerId && p.isHost);
  if (!host) {
    res.status(403).json({ error: "Not authorized" });
    return;
  }
  if (startPlayers.length < 2) {
    res.status(400).json({ error: "Need at least 2 players" });
    return;
  }

  const [updated] = await db
    .update(onlineSessionsTable)
    .set({ startedAt: Date.now() })
    .where(eq(onlineSessionsTable.code, req.params.code))
    .returning();

  res.json(updated);
});

// POST /api/online/:code/round — Add round (any player)
// If anti-cheat is enabled, stores as pendingRound instead of committing directly
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

  const roundPlayers = getPlayers(session);
  const isPlayer = roundPlayers.some((p) => p.id === playerId);
  if (!isPlayer) {
    res.status(403).json({ error: "Not a player in this session" });
    return;
  }

  const round: OnlineRound = {
    id: generateId(),
    scores,
    timestamp: Date.now(),
    recordedBy: playerId,
  };

  // Anti-cheat: store as pending, require majority vote
  if (session.antiCheat) {
    const timeoutMs = (session.antiCheatTimeout ?? 10) * 1000;
    const pending: PendingRound = {
      round,
      approvals: [],
      rejections: [],
      expiresAt: Date.now() + timeoutMs,
    };
    const [updated] = await db
      .update(onlineSessionsTable)
      .set({ pendingRound: pending })
      .where(eq(onlineSessionsTable.code, req.params.code))
      .returning();
    res.json(updated);
    return;
  }

  const [updated] = await db
    .update(onlineSessionsTable)
    .set({ rounds: [...getRounds(session), round] })
    .where(eq(onlineSessionsTable.code, req.params.code))
    .returning();

  res.json(updated);
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

  const votePlayers = getPlayers(session);
  const isPlayer = votePlayers.some((p) => p.id === playerId);
  if (!isPlayer) {
    res.status(403).json({ error: "Not a player in this session" });
    return;
  }

  const pending = session.pendingRound as PendingRound | null;
  if (!pending) {
    res.status(400).json({ error: "No pending round" });
    return;
  }

  const majority = Math.ceil(votePlayers.length / 2);
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

  // Check timeout auto-approve
  const isExpired = Date.now() >= pending.expiresAt;

  if (approvals.length >= majority || isExpired) {
    // Commit the round
    const [updated] = await db
      .update(onlineSessionsTable)
      .set({ rounds: [...getRounds(session), pending.round], pendingRound: null })
      .where(eq(onlineSessionsTable.code, req.params.code))
      .returning();
    res.json({ ...updated, voteResult: "approved" });
    return;
  }

  if (rejections.length >= majority) {
    // Reject — discard pending round
    const [updated] = await db
      .update(onlineSessionsTable)
      .set({ pendingRound: null })
      .where(eq(onlineSessionsTable.code, req.params.code))
      .returning();
    res.json({ ...updated, voteResult: "rejected" });
    return;
  }

  // Still voting — update tally
  const updatedPending: PendingRound = { ...pending, approvals, rejections };
  const [updated] = await db
    .update(onlineSessionsTable)
    .set({ pendingRound: updatedPending })
    .where(eq(onlineSessionsTable.code, req.params.code))
    .returning();
  res.json({ ...updated, voteResult: "pending" });
});

// POST /api/online/:code/undo — Undo last round (host only)
router.post("/online/:code/undo", async (req, res) => {
  const session = await getSession(req.params.code);
  if (!session) {
    res.status(404).json({ error: "Session not found" });
    return;
  }

  const { hostPlayerId } = req.body as { hostPlayerId: string };
  const undoPlayers = getPlayers(session);
  const host = undoPlayers.find((p) => p.id === hostPlayerId && p.isHost);
  if (!host) {
    res.status(403).json({ error: "Not authorized" });
    return;
  }

  const newRounds = getRounds(session).slice(0, -1);

  const [updated] = await db
    .update(onlineSessionsTable)
    .set({ rounds: newRounds, completedAt: null, winnerId: null })
    .where(eq(onlineSessionsTable.code, req.params.code))
    .returning();

  res.json(updated);
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
  const completePlayers = getPlayers(session);
  const isPlayer = completePlayers.some((p) => p.id === playerId);
  if (!isPlayer) {
    res.status(403).json({ error: "Not authorized" });
    return;
  }

  const [updated] = await db
    .update(onlineSessionsTable)
    .set({ completedAt: Date.now(), winnerId })
    .where(eq(onlineSessionsTable.code, req.params.code))
    .returning();

  res.json(updated);
});

export default router;
