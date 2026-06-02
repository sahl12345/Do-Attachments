import * as Linking from "expo-linking";
import * as WebBrowser from "expo-web-browser";
import { Platform } from "react-native";

import { supabase } from "@/lib/supabase";
import { Session } from "@/contexts/AppContext";

// Must be called once at startup to allow WebBrowser to complete auth on iOS
WebBrowser.maybeCompleteAuthSession();

// ── Google OAuth ───────────────────────────────────────────────────────────────

export async function signInWithGoogle() {
  if (Platform.OS !== "web") {
    // Native (Expo Go or standalone):
    // 1. Get the OAuth URL from Supabase without auto-redirecting
    // 2. Open it in a browser session via expo-web-browser
    // 3. Parse the returned tokens and set the Supabase session
    const redirectTo = Linking.createURL("auth/callback");

    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo,
        queryParams: { access_type: "offline", prompt: "select_account" },
        skipBrowserRedirect: true,
      },
    });

    if (error) throw error;
    if (!data.url) throw new Error("ما رجع رابط من Supabase");

    const result = await WebBrowser.openAuthSessionAsync(data.url, redirectTo);

    if (result.type === "success") {
      await _handleOAuthCallback(result.url);
    } else if (result.type === "cancel") {
      throw new Error("ألغيت تسجيل الدخول");
    }
    return;
  }

  // Web: standard redirect — page navigates to Google then comes back to /auth/callback
  const redirectTo = `${window.location.origin}/auth/callback`;
  const { error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: {
      redirectTo,
      queryParams: { access_type: "offline", prompt: "select_account" },
    },
  });
  if (error) throw error;
}

// Handle the OAuth callback URL — supports both PKCE (code in query) and
// implicit flow (access_token in fragment). PKCE is preferred and default.
async function _handleOAuthCallback(url: string) {
  // 1. PKCE: Supabase returns ?code=... — pass the full URL and let the client
  //    use the stored code_verifier to exchange for a session.
  const queryStr = url.split("?")[1]?.split("#")[0] ?? "";
  const queryParams = new URLSearchParams(queryStr);
  const code = queryParams.get("code");

  if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(url);
    if (error) throw error;
    return;
  }

  // 2. Implicit fallback: tokens in URL fragment (#access_token=...&refresh_token=...)
  //    Note: iOS may strip the fragment, which is why PKCE is preferred.
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

  throw new Error("ما لقيت tokens بالـ callback URL: " + url.slice(0, 100));
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
