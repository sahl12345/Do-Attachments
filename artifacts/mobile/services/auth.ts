import * as WebBrowser from "expo-web-browser";
import { Platform } from "react-native";

import { supabase } from "@/lib/supabase";
import { Session } from "@/contexts/AppContext";

// Required on iOS to complete browser auth sessions
WebBrowser.maybeCompleteAuthSession();

// ─────────────────────────────────────────────────────────────────────────────
// Architecture:
//   NATIVE  → redirectTo = "mobile://auth/callback"
//             ASWebAuthenticationSession intercepts custom scheme immediately
//             (never navigates to a page — closes the browser automatically)
//   WEB     → redirectTo = "https://do-attachments.replit.app/auth/callback"
//             Browser navigates to the deployed /auth/callback page which
//             reads the session via detectSessionInUrl + exchangeCodeForSession
// ─────────────────────────────────────────────────────────────────────────────

const WEB_REDIRECT = "https://do-attachments.replit.app/auth/callback";
const NATIVE_REDIRECT = "mobile://auth/callback";

// ── Google OAuth ───────────────────────────────────────────────────────────────

export async function signInWithGoogle() {
  if (Platform.OS !== "web") {
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: NATIVE_REDIRECT,
        queryParams: { access_type: "offline", prompt: "select_account" },
        skipBrowserRedirect: true,
      },
    });

    if (error) throw error;
    if (!data.url) throw new Error("ما رجع رابط من Supabase");

    // Pass "mobile://" as the prefix — ASWebAuthenticationSession intercepts
    // the redirect to mobile://... before any page is loaded
    const result = await WebBrowser.openAuthSessionAsync(
      data.url,
      NATIVE_REDIRECT
    );

    if (result.type === "success") {
      await _handleNativeCallback(result.url);
    } else if (result.type === "cancel") {
      throw new Error("ألغيت تسجيل الدخول");
    }
    return;
  }

  // Web: page navigates to Google then back to /auth/callback
  const { error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: {
      redirectTo: WEB_REDIRECT,
      queryParams: { access_type: "offline", prompt: "select_account" },
    },
  });
  if (error) throw error;
}

// Parse the native callback URL and set the Supabase session.
// Supabase PKCE sends: mobile://auth/callback?code=...
async function _handleNativeCallback(url: string) {
  // PKCE: extract code from query params
  const queryStr = url.split("?")[1]?.split("#")[0] ?? "";
  const code = new URLSearchParams(queryStr).get("code");

  if (code) {
    // Pass the full URL — Supabase extracts the code and uses the stored verifier
    const { error } = await supabase.auth.exchangeCodeForSession(url);
    if (error) throw error;
    return;
  }

  // Implicit flow fallback: tokens in URL fragment
  const fragment = url.split("#")[1] ?? "";
  const fragParams = new URLSearchParams(fragment);
  const accessToken = fragParams.get("access_token");
  const refreshToken = fragParams.get("refresh_token");

  if (accessToken && refreshToken) {
    const { error } = await supabase.auth.setSession({ access_token: accessToken, refresh_token: refreshToken });
    if (error) throw error;
    return;
  }

  throw new Error("ما لقيت tokens في: " + url.slice(0, 120));
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
    { id: session.id, user_id: userId, data: session, updated_at: new Date().toISOString() },
    { onConflict: "id" }
  );
}

export async function deleteSessionRemote(sessionId: string) {
  return supabase.from("game_sessions").delete().eq("id", sessionId);
}
