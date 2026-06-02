import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import React, { useMemo, useState } from "react";
import {
  Alert,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { Fonts } from "@/constants/fonts";
import { useApp } from "@/contexts/AppContext";
import { useColors } from "@/hooks/useColors";

// ── Rank system ───────────────────────────────────────────────────────────────

function getRank(totalSessions: number, winRate: number) {
  if (totalSessions >= 61) {
    if (winRate >= 0.5) return { emoji: "👑", label: "شيخ الجلسة", color: "#FFD700" };
    return { emoji: "💎", label: "أسطورة", color: "#B9F2FF" };
  }
  if (totalSessions >= 31) return { emoji: "🥇", label: "محترف", color: "#FFD700" };
  if (totalSessions >= 11) return { emoji: "🥈", label: "لاعب", color: "#C0C0C0" };
  return { emoji: "🥉", label: "مبتدئ", color: "#CD7F32" };
}

function getTitle(totalSessions: number, wins: number, winRate: number) {
  if (totalSessions >= 10 && winRate >= 0.8) return "💀 يا وحش";
  if (totalSessions >= 10 && winRate >= 0.6) return "👑 ملك اللطش";
  if (totalSessions >= 20 && winRate <= 0.2) return "😂 ملك الخسارة";
  if (totalSessions >= 30 && wins >= 15) return "🐐 الـ GOAT";
  if (totalSessions >= 5 && winRate < 0.3) return "💸 خسران بس بشرف";
  return null;
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function ProfileScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { userName, updateUserName, signOut, user, sessions } = useApp();
  const [name, setName] = useState(userName);
  const [editing, setEditing] = useState(false);
  const webTop = Platform.OS === "web" ? 67 : 0;

  const completed = useMemo(() => sessions.filter((s) => s.completedAt), [sessions]);

  const { totalSessions, totalWins, winRate, rank, title, gangStats } = useMemo(() => {
    const ts = sessions.length;
    const wins = completed.filter((s) =>
      s.players.some((p) => p.name === userName && p.id === s.winnerId)
    ).length;
    const wr = ts > 0 ? wins / ts : 0;

    // Gang W/L stats vs each opponent
    const gangMap: Record<string, { played: number; iWon: number; theyWon: number }> = {};
    completed.forEach((s) => {
      const me = s.players.find((p) => p.name === userName);
      if (!me) return;
      const iWon = s.winnerId === me.id;
      s.players.forEach((p) => {
        if (p.name === userName) return;
        if (!gangMap[p.name]) gangMap[p.name] = { played: 0, iWon: 0, theyWon: 0 };
        gangMap[p.name].played++;
        if (iWon) gangMap[p.name].iWon++;
        else gangMap[p.name].theyWon++;
      });
    });

    const gang = Object.entries(gangMap)
      .map(([n, v]) => ({ name: n, ...v }))
      .sort((a, b) => b.played - a.played)
      .slice(0, 8);

    return {
      totalSessions: ts,
      totalWins: wins,
      winRate: wr,
      rank: getRank(ts, wr),
      title: getTitle(ts, wins, wr),
      gangStats: gang,
    };
  }, [sessions, completed, userName]);

  const handleSave = async () => {
    if (!name.trim()) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    await updateUserName(name.trim());
    setEditing(false);
  };

  const handleSignOut = () => {
    Alert.alert("تسجيل الخروج", "متأكد إنك تبي تخرج؟", [
      { text: "إلغاء", style: "cancel" },
      {
        text: "خروج",
        style: "destructive",
        onPress: () => {
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
          signOut();
        },
      },
    ]);
  };

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: colors.background }]}
      contentContainerStyle={[
        styles.content,
        { paddingTop: insets.top + webTop + 16, paddingBottom: insets.bottom + 100 + (Platform.OS === "web" ? 34 : 0) },
      ]}
      showsVerticalScrollIndicator={false}
    >
      <Text style={[styles.title, { color: colors.text }]}>ملفك</Text>

      {/* Profile card */}
      <View style={[styles.profileCard, { backgroundColor: colors.surface }]}>
        <View style={[styles.avatarWrap, { backgroundColor: colors.surfaceRaised }]}>
          <Text style={styles.rankEmoji}>{rank.emoji}</Text>
        </View>

        {editing ? (
          <View style={styles.editRow}>
            <TouchableOpacity onPress={handleSave} style={[styles.saveBtn, { backgroundColor: colors.gold }]}>
              <Feather name="check" size={18} color={colors.background} />
            </TouchableOpacity>
            <TextInput
              style={[styles.nameInput, { color: colors.text, backgroundColor: colors.surfaceRaised, fontFamily: Fonts.heading, borderColor: colors.gold }]}
              value={name}
              onChangeText={setName}
              textAlign="right"
              autoFocus
              onSubmitEditing={handleSave}
              returnKeyType="done"
            />
          </View>
        ) : (
          <TouchableOpacity
            onPress={() => { setName(userName); setEditing(true); }}
            style={styles.nameRow}
          >
            <Feather name="edit-2" size={16} color={colors.textDim} />
            <Text style={[styles.profileName, { color: colors.text }]}>{userName || "بدون اسم"}</Text>
          </TouchableOpacity>
        )}

        {/* Rank badge */}
        <View style={[styles.rankBadge, { backgroundColor: `${rank.color}22`, borderColor: `${rank.color}55` }]}>
          <Text style={[styles.rankLabel, { color: rank.color }]}>{rank.label}</Text>
        </View>

        {/* Title */}
        {title && (
          <Text style={[styles.titleBadge, { color: colors.textMuted }]}>{title}</Text>
        )}

        {user?.email ? (
          <Text style={[styles.emailText, { color: colors.textDim }]}>{user.email}</Text>
        ) : null}
      </View>

      {/* Stats row */}
      <View style={styles.statsRow}>
        <View style={[styles.miniStat, { backgroundColor: colors.surface }]}>
          <Text style={[styles.miniStatVal, { color: colors.gold, fontFamily: Fonts.mono }]}>{totalSessions}</Text>
          <Text style={[styles.miniStatLabel, { color: colors.textMuted }]}>جلسة</Text>
        </View>
        <View style={[styles.miniStat, { backgroundColor: colors.surface }]}>
          <Text style={[styles.miniStatVal, { color: colors.gold, fontFamily: Fonts.mono }]}>{totalWins}</Text>
          <Text style={[styles.miniStatLabel, { color: colors.textMuted }]}>انتصار</Text>
        </View>
        <View style={[styles.miniStat, { backgroundColor: colors.surface }]}>
          <Text style={[styles.miniStatVal, { color: colors.gold, fontFamily: Fonts.mono }]}>
            {totalSessions > 0 ? Math.round(winRate * 100) : 0}%
          </Text>
          <Text style={[styles.miniStatLabel, { color: colors.textMuted }]}>نسبة فوز</Text>
        </View>
      </View>

      {/* Rank progress */}
      {totalSessions > 0 && (
        <View style={[styles.rankProgress, { backgroundColor: colors.surface }]}>
          <View style={styles.rankProgressHeader}>
            <Text style={[styles.rankProgressLabel, { color: colors.textMuted }]}>
              {totalSessions < 11 ? `${11 - totalSessions} جلسة لـ 🥈 لاعب` :
               totalSessions < 31 ? `${31 - totalSessions} جلسة لـ 🥇 محترف` :
               totalSessions < 61 ? `${61 - totalSessions} جلسة لـ 💎 أسطورة` :
               "وصلت أعلى مستوى 🎉"}
            </Text>
            <Text style={[styles.rankProgressTitle, { color: rank.color }]}>{rank.emoji} {rank.label}</Text>
          </View>
          <View style={[styles.progressBar, { backgroundColor: colors.border }]}>
            <View style={[styles.progressFill, {
              backgroundColor: rank.color,
              width: `${Math.min(100, totalSessions < 11 ? (totalSessions / 11) * 100 :
                totalSessions < 31 ? ((totalSessions - 11) / 20) * 100 :
                totalSessions < 61 ? ((totalSessions - 31) / 30) * 100 : 100)}%`
            }]} />
          </View>
        </View>
      )}

      {/* Gang stats */}
      {gangStats.length > 0 && (
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>الشلة 👥</Text>
          <View style={[styles.gangCard, { backgroundColor: colors.surface }]}>
            {gangStats.map((g, i) => {
              const iAhead = g.iWon > g.theyWon;
              const tied = g.iWon === g.theyWon;
              return (
                <View key={g.name}>
                  {i > 0 && <View style={[styles.divider, { backgroundColor: colors.border }]} />}
                  <View style={styles.gangRow}>
                    <View style={styles.gangRight}>
                      <Text style={[styles.gangName, { color: colors.text }]}>{g.name}</Text>
                      <Text style={[styles.gangSub, { color: colors.textDim }]}>
                        {g.played} جلسة معاً
                      </Text>
                    </View>
                    <View style={styles.gangLeft}>
                      <View style={[styles.gangScore, { backgroundColor: iAhead ? `${colors.gold}22` : tied ? `${colors.border}` : `${colors.red}22` }]}>
                        <Text style={[styles.gangW, { color: iAhead ? colors.gold : tied ? colors.textMuted : colors.red }]}>
                          {g.iWon}W - {g.theyWon}L
                        </Text>
                      </View>
                      {!tied && (
                        <Text style={[styles.gangVerdict, { color: iAhead ? colors.gold : colors.red }]}>
                          {iAhead ? "أنت متقدم 😎" : "ثأر منه 😤"}
                        </Text>
                      )}
                    </View>
                  </View>
                </View>
              );
            })}
          </View>
        </View>
      )}

      {/* Settings */}
      <View style={styles.section}>
        <Text style={[styles.sectionTitle, { color: colors.text }]}>الإعدادات</Text>
        <View style={[styles.settingsCard, { backgroundColor: colors.surface }]}>
          <View style={settingStyles.row}>
            <Text style={[settingStyles.value, { color: colors.textMuted }]}>1.0.0</Text>
            <View style={settingStyles.left}>
              <Feather name="info" size={18} color={colors.textMuted} />
              <Text style={[settingStyles.label, { color: colors.text }]}>الإصدار</Text>
            </View>
          </View>
          <View style={[styles.divider, { backgroundColor: colors.border }]} />
          <View style={settingStyles.row}>
            <Text style={[settingStyles.value, { color: colors.textMuted }]}>دائماً</Text>
            <View style={settingStyles.left}>
              <Feather name="moon" size={18} color={colors.textMuted} />
              <Text style={[settingStyles.label, { color: colors.text }]}>الوضع الليلي</Text>
            </View>
          </View>
        </View>

        <TouchableOpacity
          onPress={handleSignOut}
          style={[styles.dangerBtn, { borderColor: `${colors.gold}44`, backgroundColor: `${colors.gold}11` }]}
        >
          <Text style={[styles.dangerText, { color: colors.gold }]}>تسجيل الخروج</Text>
          <Feather name="log-out" size={18} color={colors.gold} />
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const settingStyles = StyleSheet.create({
  row: { flexDirection: "row-reverse", justifyContent: "space-between", alignItems: "center", paddingVertical: 14, paddingHorizontal: 16 },
  left: { flexDirection: "row-reverse", alignItems: "center", gap: 10 },
  label: { fontFamily: "Tajawal_400Regular", fontSize: 15, textAlign: "right" },
  value: { fontFamily: "Tajawal_400Regular", fontSize: 14 },
});

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { paddingHorizontal: 16 },
  title: { fontFamily: Fonts.heading, fontSize: 28, textAlign: "right", marginBottom: 20 },
  profileCard: { borderRadius: 20, padding: 24, alignItems: "center", gap: 10, marginBottom: 16 },
  avatarWrap: { width: 88, height: 88, borderRadius: 44, alignItems: "center", justifyContent: "center", marginBottom: 4 },
  rankEmoji: { fontSize: 40 },
  nameRow: { flexDirection: "row-reverse", alignItems: "center", gap: 8 },
  profileName: { fontFamily: Fonts.heading, fontSize: 22, textAlign: "center" },
  editRow: { flexDirection: "row-reverse", alignItems: "center", gap: 8, width: "100%" },
  nameInput: { flex: 1, height: 48, borderRadius: 12, paddingHorizontal: 14, fontSize: 16, borderWidth: 1.5 },
  saveBtn: { width: 44, height: 44, borderRadius: 12, alignItems: "center", justifyContent: "center" },
  rankBadge: { paddingHorizontal: 14, paddingVertical: 5, borderRadius: 20, borderWidth: 1 },
  rankLabel: { fontFamily: Fonts.heading, fontSize: 14 },
  titleBadge: { fontFamily: Fonts.body, fontSize: 13 },
  emailText: { fontFamily: "IBMPlexMono_400Regular", fontSize: 12, letterSpacing: 0.3 },
  statsRow: { flexDirection: "row-reverse", gap: 10, marginBottom: 14 },
  miniStat: { flex: 1, borderRadius: 16, padding: 14, alignItems: "center", gap: 4 },
  miniStatVal: { fontSize: 24, textAlign: "center" },
  miniStatLabel: { fontFamily: Fonts.body, fontSize: 12 },
  rankProgress: { borderRadius: 16, padding: 16, marginBottom: 20, gap: 10 },
  rankProgressHeader: { flexDirection: "row-reverse", justifyContent: "space-between", alignItems: "center" },
  rankProgressTitle: { fontFamily: Fonts.heading, fontSize: 14 },
  rankProgressLabel: { fontFamily: Fonts.body, fontSize: 13 },
  progressBar: { height: 6, borderRadius: 3, overflow: "hidden" },
  progressFill: { height: "100%", borderRadius: 3 },
  section: { gap: 10, marginBottom: 20 },
  sectionTitle: { fontFamily: Fonts.heading, fontSize: 20, textAlign: "right" },
  gangCard: { borderRadius: 16, overflow: "hidden" },
  gangRow: { flexDirection: "row-reverse", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 16, paddingVertical: 14 },
  gangRight: { gap: 2, flex: 1 },
  gangLeft: { alignItems: "flex-end", gap: 4 },
  gangName: { fontFamily: Fonts.heading, fontSize: 16, textAlign: "right" },
  gangSub: { fontFamily: Fonts.body, fontSize: 12 },
  gangScore: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 10 },
  gangW: { fontFamily: Fonts.mono, fontSize: 13 },
  gangVerdict: { fontFamily: Fonts.body, fontSize: 11 },
  divider: { height: 1, marginHorizontal: 16 },
  settingsCard: { borderRadius: 16, overflow: "hidden" },
  dangerBtn: { flexDirection: "row-reverse", alignItems: "center", justifyContent: "center", gap: 10, height: 52, borderRadius: 14, borderWidth: 1, marginTop: 4 },
  dangerText: { fontFamily: Fonts.heading, fontSize: 15 },
});
