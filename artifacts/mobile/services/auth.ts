import { Platform } from "react-native";
import { supabase } from "@/lib/supabase";
import { Session } from "@/contexts/AppContext";

// ── Google OAuth ───────────────────────────────────────────────────────────────

const DEPLOYED_ORIGIN = "https://do-attachments.replit.app";

export async function signInWithGoogle() {
  // Always point to the /auth/callback route so Supabase can parse the session
  const origin =
    Platform.OS === "web" && typeof window !== "undefined"
      ? window.location.origin
      : DEPLOYED_ORIGIN;

  const redirectTo = `${origin}/auth/callback`;

  return supabase.auth.signInWithOAuth({
    provider: "google",
    options: {
      redirectTo,
      queryParams: { access_type: "offline", prompt: "select_account" },
    },
  });
}

export async function signOut() {
  return supabase.auth.signOut();
}

// ── Profile ───────────────────────────────────────────────────────────────────

export async function upsertProfile(userId: string, name: string) {
  return supabase
    .from("profiles")
    .upsert({ id: userId, name }, { onConflict: "id" });
}

export async function fetchProfile(userId: string) {
  return supabase
    .from("profiles")
    .select("name")
    .eq("id", userId)
    .maybeSingle();
}

// ── Sessions ──────────────────────────────────────────────────────────────────

export async function fetchSessions(userId: string): Promise<Session[]> {
  const { data, error } = await supabase
    .from("game_sessions")
    .select("data")
    .eq("user_id", userId)
    .order("updated_at", { ascending: false });

  if (error || !data) return [];
  return data.map((row) => row.data as Session);
}

export async function upsertSession(userId: string, session: Session) {
  return supabase.from("game_sessions").upsert(
    {
      id: session.id,
      user_id: userId,
      data: session,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "id" }
  );
}

export async function deleteSessionRemote(sessionId: string) {
  return supabase.from("game_sessions").delete().eq("id", sessionId);
}
