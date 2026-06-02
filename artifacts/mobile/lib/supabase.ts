import AsyncStorage from "@react-native-async-storage/async-storage";
import { createClient } from "@supabase/supabase-js";
import { Platform } from "react-native";

const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL!;
const SUPABASE_ANON_KEY = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY!;

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    storage: AsyncStorage as any,
    autoRefreshToken: true,
    persistSession: true,
    // On web: parse the OAuth tokens from the URL hash after Google redirect
    detectSessionInUrl: Platform.OS === "web",
  },
});

export type SupabaseSession = Awaited<
  ReturnType<typeof supabase.auth.getSession>
>["data"]["session"];
export type SupabaseUser = NonNullable<SupabaseSession>["user"];
