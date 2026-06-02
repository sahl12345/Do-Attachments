import * as WebBrowser from "expo-web-browser";
import { Platform } from "react-native";

import { supabase } from "@/lib/supabase";
import { Session } from "@/contexts/AppContext";

// Required on iOS to allow WebBrowser to complete auth sessions
WebBrowser.maybeCompleteAuthSession();

// The deployed web URL — both web and native use this as the OAuth redirect target.
// On native, iOS converts https:// → exps:// inside ASWebAuthenticationSession,
// which we normalize back in _handleOAuthCallback.
const OAUTH_REDIRECT = "https://do-attachments.replit.app/auth/callback";

// ── Google OAuth ───────────────────────────────────────────────────────────────

export async function signInWithGoogle() {
  if (Platform.OS !== "web") {
    // 1. Get the OAuth URL from Supabase (skip auto browser redirect)
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: OAUTH_REDIRECT,
        queryParams: { access_type: "offline", prompt: "select_account" },
        skipBrowserRedirect: true,
      },
    });

    if (error) throw error;
    if (!data.url) throw new Error("ما رجع رابط من Supabase");

    // 2. Open the OAuth URL in the system browser, watching for the callback
    //    iOS will intercept https://do-attachments.replit.app and return it
    //    as exps://do-attachments.replit.app — we handle that in the callback
    const result = await WebBrowser.openAuthSessionAsync(
      data.url,
      OAUTH_REDIRECT
    );

    if (result.type === "success") {
      await _handleOAuthCallback(result.url);
    } else if (result.type === "cancel") {
      throw new Error("ألغيت تسجيل الدخول");
    }
    return;
  }

  // Web: standard redirect — page navigates to Google then back to /auth/callback
  const { error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: {
      redirectTo: OAUTH_REDIRECT,
      queryParams: { access_type: "offline", prompt: "select_account" },
    },
  });
  if (error) throw error;
}

// iOS converts https:// → exps:// inside ASWebAuthenticationSession.
// Normalize it back so Supabase can validate and exchange the code.
async function _handleOAuthCallback(rawUrl: string) {
  const url = rawUrl.replace(/^exps:\/\//, "https://");

  // PKCE flow: code in query params — pass full URL to exchangeCodeForSession
  const queryStr = url.split("?")[1]?.split("#")[0] ?? "";
  const code = new URLSearchParams(queryStr).get("code");

  if (code) {
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
    const { error } = await supabase.auth.setSession({
      access_token: accessToken,
      refresh_token: refreshToken,
    });
    if (error) throw error;
    return;
  }

  throw new Error("ما لقيت tokens بالـ callback URL: " + rawUrl.slice(0, 120));
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
