import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { useRouter } from "expo-router";
import React from "react";
import {
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { SessionCard } from "@/components/SessionCard";
import { Fonts } from "@/constants/fonts";
import { useApp } from "@/contexts/AppContext";
import { useColors } from "@/hooks/useColors";

export default function HomeScreen() {
  const colors = useColors();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { sessions, profile, deleteSession } = useApp();

  const recentSessions = sessions.slice(0, 5);
  const activeSessions = sessions.filter((s) => !s.completedAt);
  const webTop = Platform.OS === "web" ? 67 : 0;

  const handleNewSession = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    router.push("/session/new");
  };

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: colors.background }]}
      contentContainerStyle={[
        styles.content,
        {
          paddingTop: insets.top + webTop + 16,
          paddingBottom:
            insets.bottom + 100 + (Platform.OS === "web" ? 34 : 0),
        },
      ]}
      showsVerticalScrollIndicator={false}
    >
      <View style={styles.greeting}>
        <Text style={[styles.greetingText, { color: colors.textMuted }]}>
          أهلاً
        </Text>
        <Text style={[styles.greetingName, { color: colors.text }]}>
          {profile.name} 👋
        </Text>
      </View>

      {activeSessions.length > 0 && (
        <View
          style={[
            styles.activeBanner,
            { backgroundColor: `${colors.gold}22`, borderColor: `${colors.gold}44` },
          ]}
        >
          <View style={styles.activeBannerRow}>
            <Feather name="zap" size={16} color={colors.gold} />
            <Text style={[styles.activeBannerText, { color: colors.gold }]}>
              عندك {activeSessions.length} جلسة جارية
            </Text>
          </View>
          <TouchableOpacity
            onPress={() => router.push(`/session/${activeSessions[0].id}`)}
          >
            <Text style={[styles.activeBannerLink, { color: colors.gold }]}>
              ارجعلها
            </Text>
          </TouchableOpacity>
        </View>
      )}

      <TouchableOpacity
        onPress={handleNewSession}
        activeOpacity={0.85}
        style={[styles.primaryBtn, { backgroundColor: colors.gold }]}
      >
        <Feather name="plus" size={22} color={colors.background} />
        <Text style={[styles.primaryBtnText, { color: colors.background }]}>
          جلسة جديدة
        </Text>
      </TouchableOpacity>

      <TouchableOpacity
        activeOpacity={0.7}
        style={[
          styles.secondaryBtn,
          {
            backgroundColor: colors.surface,
            borderColor: colors.borderStrong,
          },
        ]}
      >
        <Feather name="users" size={20} color={colors.textMuted} />
        <Text style={[styles.secondaryBtnText, { color: colors.textMuted }]}>
          انضم بكود
        </Text>
      </TouchableOpacity>

      <View style={styles.section}>
        <Text style={[styles.sectionTitle, { color: colors.text }]}>
          الجلسات الأخيرة
        </Text>

        {recentSessions.length === 0 ? (
          <View style={[styles.empty, { backgroundColor: colors.surface }]}>
            <Feather name="inbox" size={32} color={colors.textDim} />
            <Text style={[styles.emptyText, { color: colors.textDim }]}>
              ما في جلسات بعد — ابدأ الأولى!
            </Text>
          </View>
        ) : (
          recentSessions.map((session) => (
            <SessionCard
              key={session.id}
              session={session}
              onPress={() => router.push(`/session/${session.id}`)}
              onDelete={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                deleteSession(session.id);
              }}
            />
          ))
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    paddingHorizontal: 16,
  },
  greeting: {
    alignItems: "flex-end",
    marginBottom: 24,
  },
  greetingText: {
    fontFamily: Fonts.body,
    fontSize: 14,
    textAlign: "right",
  },
  greetingName: {
    fontFamily: Fonts.heading,
    fontSize: 26,
    textAlign: "right",
  },
  activeBanner: {
    borderRadius: 14,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 12,
    flexDirection: "row-reverse",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  activeBannerRow: {
    flexDirection: "row-reverse",
    alignItems: "center",
    gap: 8,
  },
  activeBannerText: {
    fontFamily: Fonts.bodyBold,
    fontSize: 14,
  },
  activeBannerLink: {
    fontFamily: Fonts.heading,
    fontSize: 14,
    textDecorationLine: "underline",
  },
  primaryBtn: {
    flexDirection: "row-reverse",
    alignItems: "center",
    justifyContent: "center",
    height: 56,
    borderRadius: 14,
    gap: 10,
    marginBottom: 12,
  },
  primaryBtnText: {
    fontFamily: Fonts.heading,
    fontSize: 18,
  },
  secondaryBtn: {
    flexDirection: "row-reverse",
    alignItems: "center",
    justifyContent: "center",
    height: 56,
    borderRadius: 14,
    borderWidth: 1,
    gap: 10,
    marginBottom: 32,
  },
  secondaryBtnText: {
    fontFamily: Fonts.heading,
    fontSize: 17,
  },
  section: {},
  sectionTitle: {
    fontFamily: Fonts.heading,
    fontSize: 20,
    textAlign: "right",
    marginBottom: 12,
  },
  empty: {
    borderRadius: 16,
    padding: 32,
    alignItems: "center",
    gap: 12,
  },
  emptyText: {
    fontFamily: Fonts.body,
    fontSize: 15,
    textAlign: "center",
  },
});
