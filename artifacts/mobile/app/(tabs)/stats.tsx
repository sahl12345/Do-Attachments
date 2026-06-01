import { Feather } from "@expo/vector-icons";
import React, { useMemo } from "react";
import {
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { Fonts } from "@/constants/fonts";
import { getGameById } from "@/constants/games";
import { getTotalScore, useApp } from "@/contexts/AppContext";
import { useColors } from "@/hooks/useColors";

interface StatCard {
  label: string;
  value: string | number;
  icon: string;
  color: string;
}

export default function StatsScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { sessions } = useApp();
  const webTop = Platform.OS === "web" ? 67 : 0;

  const stats = useMemo(() => {
    const completed = sessions.filter((s) => s.completedAt);
    const totalSessions = sessions.length;
    const completedCount = completed.length;

    const gameCounts: Record<string, number> = {};
    sessions.forEach((s) => {
      gameCounts[s.gameId] = (gameCounts[s.gameId] ?? 0) + 1;
    });
    const topGameId = Object.entries(gameCounts).sort((a, b) => b[1] - a[1])[0]?.[0];
    const topGame = topGameId ? getGameById(topGameId) : null;

    const winCounts: Record<string, number> = {};
    completed.forEach((s) => {
      if (s.winnerId) {
        winCounts[s.winnerId] = (winCounts[s.winnerId] ?? 0) + 1;
      }
    });
    const topWinnerId = Object.entries(winCounts).sort((a, b) => b[1] - a[1])[0]?.[0];
    const topWinner = sessions
      .flatMap((s) => s.players)
      .find((p) => p.id === topWinnerId);

    const totalRounds = sessions.reduce((sum, s) => sum + s.rounds.length, 0);

    return {
      totalSessions,
      completedCount,
      topGame,
      topWinner,
      totalRounds,
      winCounts,
    };
  }, [sessions]);

  const statCards: StatCard[] = [
    {
      label: "إجمالي الجلسات",
      value: stats.totalSessions,
      icon: "calendar",
      color: colors.gold,
    },
    {
      label: "جلسات منتهية",
      value: stats.completedCount,
      icon: "check-circle",
      color: colors.success,
    },
    {
      label: "إجمالي الجولات",
      value: stats.totalRounds,
      icon: "refresh-cw",
      color: colors.textMuted,
    },
    {
      label: "أكثر لعبة",
      value: stats.topGame?.name ?? "—",
      icon: "award",
      color: colors.gold,
    },
  ];

  const playerWins = useMemo(() => {
    const winMap: Record<string, { name: string; wins: number }> = {};
    sessions
      .filter((s) => s.completedAt && s.winnerId)
      .forEach((s) => {
        const winner = s.players.find((p) => p.id === s.winnerId);
        if (!winner) return;
        if (!winMap[winner.name]) {
          winMap[winner.name] = { name: winner.name, wins: 0 };
        }
        winMap[winner.name].wins += 1;
      });
    return Object.values(winMap).sort((a, b) => b.wins - a.wins).slice(0, 5);
  }, [sessions]);

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: colors.background }]}
      contentContainerStyle={[
        styles.content,
        {
          paddingTop: insets.top + webTop + 16,
          paddingBottom: insets.bottom + 100 + (Platform.OS === "web" ? 34 : 0),
        },
      ]}
      showsVerticalScrollIndicator={false}
    >
      <Text style={[styles.title, { color: colors.text }]}>الإحصاءات</Text>

      <View style={styles.grid}>
        {statCards.map((card, i) => (
          <View
            key={i}
            style={[
              styles.statCard,
              { backgroundColor: colors.surface },
            ]}
          >
            <Feather name={card.icon as any} size={22} color={card.color} />
            <Text
              style={[
                styles.statValue,
                { color: colors.text, fontFamily: Fonts.mono },
              ]}
              numberOfLines={1}
            >
              {card.value}
            </Text>
            <Text style={[styles.statLabel, { color: colors.textMuted }]}>
              {card.label}
            </Text>
          </View>
        ))}
      </View>

      {playerWins.length > 0 && (
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>
            ترتيب الانتصارات
          </Text>
          {playerWins.map((p, i) => (
            <View
              key={i}
              style={[
                styles.rankRow,
                { backgroundColor: colors.surface, borderColor: colors.border },
              ]}
            >
              <Text
                style={[
                  styles.rankWins,
                  { color: i === 0 ? colors.gold : colors.textMuted, fontFamily: Fonts.mono },
                ]}
              >
                {p.wins} انتصار
              </Text>
              <View style={styles.rankNameRow}>
                {i === 0 && (
                  <Feather name="award" size={14} color={colors.gold} />
                )}
                <Text
                  style={[
                    styles.rankName,
                    { color: i === 0 ? colors.text : colors.textMuted },
                  ]}
                >
                  {p.name}
                </Text>
                <Text
                  style={[
                    styles.rankNum,
                    {
                      color: colors.textDim,
                      backgroundColor: colors.surfaceRaised,
                    },
                  ]}
                >
                  #{i + 1}
                </Text>
              </View>
            </View>
          ))}
        </View>
      )}

      {sessions.length === 0 && (
        <View style={[styles.empty, { backgroundColor: colors.surface }]}>
          <Feather name="bar-chart-2" size={36} color={colors.textDim} />
          <Text style={[styles.emptyText, { color: colors.textDim }]}>
            ابدأ جلسات لتظهر الإحصاءات
          </Text>
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { paddingHorizontal: 16 },
  title: {
    fontFamily: Fonts.heading,
    fontSize: 28,
    textAlign: "right",
    marginBottom: 20,
  },
  grid: {
    flexDirection: "row-reverse",
    flexWrap: "wrap",
    gap: 10,
    marginBottom: 24,
  },
  statCard: {
    borderRadius: 16,
    padding: 16,
    alignItems: "center",
    gap: 8,
    width: "47%",
  },
  statValue: {
    fontSize: 20,
    textAlign: "center",
  },
  statLabel: {
    fontFamily: Fonts.body,
    fontSize: 12,
    textAlign: "center",
  },
  section: { marginBottom: 24 },
  sectionTitle: {
    fontFamily: Fonts.heading,
    fontSize: 20,
    textAlign: "right",
    marginBottom: 12,
  },
  rankRow: {
    flexDirection: "row-reverse",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 6,
  },
  rankNameRow: {
    flexDirection: "row-reverse",
    alignItems: "center",
    gap: 6,
  },
  rankName: {
    fontFamily: Fonts.body,
    fontSize: 15,
    textAlign: "right",
  },
  rankNum: {
    fontFamily: Fonts.mono,
    fontSize: 12,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
  },
  rankWins: {
    fontSize: 14,
  },
  empty: {
    borderRadius: 16,
    padding: 40,
    alignItems: "center",
    gap: 12,
  },
  emptyText: {
    fontFamily: Fonts.body,
    fontSize: 15,
    textAlign: "center",
  },
});
