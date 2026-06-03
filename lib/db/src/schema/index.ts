import {
  bigint,
  boolean,
  integer,
  jsonb,
  pgTable,
  text,
} from "drizzle-orm/pg-core";

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
  approvals: string[];   // player IDs that approved
  rejections: string[];  // player IDs that rejected
  expiresAt: number;     // auto-approve timestamp
}

export const onlineSessionsTable = pgTable("online_sessions", {
  code: text("code").primaryKey(),
  gameId: text("game_id").notNull(),
  players: jsonb("players").$type<OnlinePlayer[]>().notNull().default([]),
  rounds: jsonb("rounds").$type<OnlineRound[]>().notNull().default([]),
  pendingRound: jsonb("pending_round").$type<PendingRound | null>().default(null),
  targetScore: integer("target_score").notNull().default(41),
  antiCheat: boolean("anti_cheat").default(false),
  antiCheatTimeout: integer("anti_cheat_timeout").default(10),
  createdAt: bigint("created_at", { mode: "number" }).notNull(),
  startedAt: bigint("started_at", { mode: "number" }),
  completedAt: bigint("completed_at", { mode: "number" }),
  winnerId: text("winner_id"),
});

export type OnlineSessionRow = typeof onlineSessionsTable.$inferSelect;
