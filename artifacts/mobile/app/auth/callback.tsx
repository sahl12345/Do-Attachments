import { useRouter } from "expo-router";
import React, { useEffect } from "react";
import { ActivityIndicator, StyleSheet, Text, View } from "react-native";

import { supabase } from "@/lib/supabase";

export default function AuthCallback() {
  const router = useRouter();

  useEffect(() => {
    // detectSessionInUrl:true (on web) makes Supabase auto-parse the hash tokens.
    // We listen for the SIGNED_IN event, then navigate home.
    const { data: listener } = supabase.auth.onAuthStateChange((event, session) => {
      if ((event === "SIGNED_IN" || event === "TOKEN_REFRESHED") && session) {
        router.replace("/(tabs)");
      }
    });

    // Belt-and-suspenders: if session is already present, navigate immediately
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) {
        router.replace("/(tabs)");
      }
    });

    return () => {
      listener.subscription.unsubscribe();
    };
  }, [router]);

  return (
    <View style={styles.container}>
      <ActivityIndicator size="large" color="#F5C842" />
      <Text style={styles.text}>جاري تسجيل الدخول…</Text>
      <Text style={styles.subText}>لحظة وحدة يا بطل 🃏</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#0D0D1A",
    alignItems: "center",
    justifyContent: "center",
    gap: 16,
  },
  text: {
    color: "#E8E8F0",
    fontSize: 18,
    fontFamily: "Cairo_700Bold",
    textAlign: "center",
  },
  subText: {
    color: "#A0A0B0",
    fontSize: 14,
    fontFamily: "Tajawal_400Regular",
    textAlign: "center",
  },
});
