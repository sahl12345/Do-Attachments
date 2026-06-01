import { Router, type IRouter } from "express";

const router: IRouter = Router();

interface OnlinePlayer {
  id: string;
  name: string;
  isHost: boolean;
}

interface RoundScore {
  [playerId: string]: number;
}

interface OnlineRound {
  id: string;
  scores: RoundScore;
  timestamp: number;
}

interface OnlineSession {
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

const sessions = new Map<string, OnlineSession>();

function generateCode(): string {
  let code: string;
  do {
    code = Math.floor(100000 + Math.random() * 900000).toString();
  } while (sessions.has(code));
  return code;
}

function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).substring(2, 7);
}

// Clean up sessions older than 24 hours
setInterval(() => {
  const now = Date.now();
  for (const [code, session] of sessions.entries()) {
    if (now - session.createdAt > 24 * 60 * 60 * 1000) {
      sessions.delete(code);
    }
  }
}, 60 * 60 * 1000);

// POST /api/online - Create online session
router.post("/online", (req, res) => {
  const { gameId, targetScore, hostName } = req.body as {
    gameId: string;
    targetScore: number;
    hostName: string;
  };

  if (!gameId || !hostName) {
    res.status(400).json({ error: "gameId and hostName required" });
    return;
  }

  const code = generateCode();
  const hostId = generateId();

  const session: OnlineSession = {
    code,
    gameId,
    players: [{ id: hostId, name: hostName, isHost: true }],
    rounds: [],
    targetScore: targetScore ?? 41,
    createdAt: Date.now(),
  };

  sessions.set(code, session);

  res.json({ code, hostPlayerId: hostId });
});

// GET /api/online/:code - Get session
router.get("/online/:code", (req, res) => {
  const session = sessions.get(req.params.code);
  if (!session) {
    res.status(404).json({ error: "Session not found" });
    return;
  }
  res.json(session);
});

// POST /api/online/:code/join - Join session
router.post("/online/:code/join", (req, res) => {
  const session = sessions.get(req.params.code);
  if (!session) {
    res.status(404).json({ error: "Session not found" });
    return;
  }
  if (session.startedAt) {
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
  session.players.push({ id: playerId, name, isHost: false });
  res.json({ playerId, session });
});

// POST /api/online/:code/start - Start session (host only)
router.post("/online/:code/start", (req, res) => {
  const session = sessions.get(req.params.code);
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

  session.startedAt = Date.now();
  res.json(session);
});

// POST /api/online/:code/round - Add round (host only)
router.post("/online/:code/round", (req, res) => {
  const session = sessions.get(req.params.code);
  if (!session) {
    res.status(404).json({ error: "Session not found" });
    return;
  }

  const { hostPlayerId, scores } = req.body as {
    hostPlayerId: string;
    scores: RoundScore;
  };
  const host = session.players.find((p) => p.id === hostPlayerId && p.isHost);
  if (!host) {
    res.status(403).json({ error: "Not authorized" });
    return;
  }

  const round: OnlineRound = {
    id: generateId(),
    scores,
    timestamp: Date.now(),
  };
  session.rounds.push(round);
  res.json(session);
});

// POST /api/online/:code/undo - Undo last round (host only)
router.post("/online/:code/undo", (req, res) => {
  const session = sessions.get(req.params.code);
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

  session.rounds.pop();
  session.completedAt = undefined;
  session.winnerId = undefined;
  res.json(session);
});

// POST /api/online/:code/complete - Mark session complete (host only)
router.post("/online/:code/complete", (req, res) => {
  const session = sessions.get(req.params.code);
  if (!session) {
    res.status(404).json({ error: "Session not found" });
    return;
  }

  const { hostPlayerId, winnerId } = req.body as {
    hostPlayerId: string;
    winnerId: string;
  };
  const host = session.players.find((p) => p.id === hostPlayerId && p.isHost);
  if (!host) {
    res.status(403).json({ error: "Not authorized" });
    return;
  }

  session.completedAt = Date.now();
  session.winnerId = winnerId;
  res.json(session);
});

export default router;
