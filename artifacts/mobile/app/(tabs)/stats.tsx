import { Feather } from "@expo/vector-icons";
import React, { useMemo, useState } from "react";
import {
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { CountUpText } from "@/components/CountUpText";
import { Fonts } from "@/constants/fonts";
import { GAMES, getGameById } from "@/constants/games";
import { getTotalScore, useApp } from "@/contexts/AppContext";
import { useColors } from "@/hooks/useColors";

interface PlayerStat {
  name: string;
  sessions: number;
  wins: number;
  totalRounds: number;
  winRate: number;
  favGame: string;
  totalScore: number;
}

export default function StatsScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { sessions } = useApp();
  const webTop = Platform.OS === "web" ? 67 : 0;
  const [expandedPlayer, setExpandedPlayer] = useState<string | null>(null);

  const completed = useMemo(() => sessions.filter((s) => s.completedAt), [sessions]);

  const overview = useMemo(() => {
    const totalRounds = sessions.reduce((s, x) => s + x.rounds.length, 0);
    const gameCounts: Record<string, number> = {};
    sessions.forEach((s) => {
      gameCounts[s.gameId] = (gameCounts[s.gameId] ?? 0) + 1;
    });
    const topGameId = Object.entries(gameCounts).sort((a, b) => b[1] - a[1])[0]?.[0];
    return {
      total: sessions.length,
      done: completed.length,
      rounds: totalRounds,
      topGame: topGameId ? getGameById(topGameId)?.name ?? "—" : "—",
    };
  }, [sessions, completed]);

  const playerStats = useMemo((): PlayerStat[] => {
    const map: Record<string, PlayerStat> = {};

    sessions.forEach((s) => {
      s.players.forEach((p) => {
        if (!map[p.name]) {
          map[p.name] = {
            name: p.name,
            sessions: 0,
            wins: 0,
            totalRounds: 0,
            winRate: 0,
            favGame: "—",
            totalScore: 0,
          };
        }
        const stat = map[p.name];
        stat.sessions += 1;
        stat.totalRounds += s.rounds.length;
        stat.totalScore += getTotalScore(s, p.id);
        if (s.completedAt && s.winnerId === p.id) stat.wins += 1;
      });
    });

    const gamePlayed: Record<string, Record<string, number>> = {};
    sessions.forEach((s) => {
      s.players.forEach((p) => {
        if (!gamePlayed[p.name]) gamePlayed[p.name] = {};
        gamePlayed[p.name][s.gameId] = (gamePlayed[p.name][s.gameId] ?? 0) + 1;
      });
    });

    return Object.values(map)
      .map((stat) => {
        const gCounts = gamePlayed[stat.name] ?? {};
        const topGameId = Object.entries(gCounts).sort((a, b) => b[1] - a[1])[0]?.[0];
        const favGame = topGameId ? getGameById(topGameId)?.name ?? "—" : "—";
        const winRate = stat.sessions > 0 ? Math.round((stat.wins / stat.sessions) * 100) : 0;
        return { ...stat, favGame, winRate };
      })
      .sort((a, b) => b.wins - a.wins || b.sessions - a.sessions);
  }, [sessions]);

  const gameSummary = useMemo(() => {
    const gMap: Record<string, { count: number; wins: Record<string, number> }> = {};
    sessions.forEach((s) => {
      if (!gMap[s.gameId]) gMap[s.gameId] = { count: 0, wins: {} };
      gMap[s.gameId].count += 1;
      if (s.completedAt && s.winnerId) {
        const winner = s.players.find((p) => p.id === s.winnerId);
        if (winner) {
          gMap[s.gameId].wins[winner.name] = (gMap[s.gameId].wins[winner.name] ?? 0) + 1;
        }
      }
    });
    return Object.entries(gMap)
      .sort((a, b) => b[1].count - a[1].count)
      .map(([gameId, data]) => {
        const game = getGameById(gameId);
        const topWinnerEntry = Object.entries(data.wins).sort((a, b) => b[1] - a[1])[0];
        return {
          gameId,
          name: game?.name ?? gameId,
          count: data.count,
          topWinner: topWinnerEntry?.[0] ?? null,
          topWins: topWinnerEntry?.[1] ?? 0,
        };
      });
  }, [sessions]);

  if (sessions.length === 0) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={[styles.emptyBox, { marginTop: insets.top + webTop + 60 }]}>
          <Text style={styles.emptyIcon}>📊</Text>
          <Text style={[styles.emptyTitle, { color: colors.text }]}>لا إحصاءات بعد</Text>
          <Text style={[styles.emptyHint, { color: colors.textMuted }]}>
            ابدأ جلسات مع الشلة وشوف مين الأقوى
          </Text>
        </View>
      </View>
    );
  }

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

      {/* ── Overview grid ── */}
      <View style={styles.grid}>
        {[
          { label: "إجمالي الجلسات", value: overview.total, icon: "calendar", color: colors.gold },
          { label: "جلسات منتهية", value: overview.done, icon: "check-circle", color: colors.success },
          { label: "إجمالي الجولات", value: overview.rounds, icon: "refresh-cw", color: colors.textMuted },
          { label: "اللعبة المفضلة", value: overview.topGame, icon: "award", color: colors.gold },
        ].map((card, i) => (
          <View key={i} style={[styles.overviewCard, { backgroundColor: colors.surface }]}>
            <Feather name={card.icon as any} size={20} color={card.color} />
            {typeof card.value === "number" ? (
              <CountUpText
                value={card.value}
                style={[styles.overviewValue, { color: colors.text }]}
                duration={800}
              />
            ) : (
              <Text style={[styles.overviewValue, { color: colors.text }]} numberOfLines={1}>
                {card.value}
              </Text>
            )}
            <Text style={[styles.overviewLabel, { color: colors.textMuted }]}>{card.label}</Text>
          </View>
        ))}
      </View>

      {/* ── Player leaderboard ── */}
      <Text style={[styles.sectionTitle, { color: colors.text }]}>🏆 ترتيب الشلة</Text>
      {playerStats.map((p, i) => (
        <View key={p.name}>
          <TouchableOpacity
            activeOpacity={0.85}
            onPress={() => setExpandedPlayer(expandedPlayer === p.name ? null : p.name)}
            style={[
              styles.playerRow,
              {
                backgroundColor: i === 0 ? `${colors.gold}18` : colors.surface,
                borderColor: i === 0 ? `${colors.gold}55` : colors.border,
              },
            ]}
          >
            <View style={styles.playerRowLeft}>
              <Feather
                name={expandedPlayer === p.name ? "chevron-up" : "chevron-down"}
                size={14}
                color={colors.textDim}
              />
              <View style={styles.winBadge}>
                <CountUpText
                  value={p.wins}
                  style={[
                    styles.winsText,
                    { color: i === 0 ? colors.gold : colors.textMuted },
                  ]}
                />
                <Text style={[styles.winsLabel, { color: colors.textDim }]}>فوز</Text>
              </View>
            </View>
            <View style={styles.playerRowCenter}>
              <Text style={[styles.playerName, { color: i === 0 ? colors.text : colors.textMuted }]}>
                {p.name}
              </Text>
              {i === 0 && p.wins > 0 && (
                <Text style={[styles.champBadge, { color: colors.gold }]}>بطل الشلة ♛</Text>
              )}
            </View>
            <View style={[styles.rankCircle, { backgroundColor: i === 0 ? colors.gold : colors.surfaceRaised }]}>
              <Text style={[styles.rankNum, { color: i === 0 ? colors.background : colors.textDim }]}>
                #{i + 1}
              </Text>
            </View>
          </TouchableOpacity>

          {expandedPlayer === p.name && (
            <View style={[styles.expandedBox, { backgroundColor: colors.surfaceRaised, borderColor: colors.border }]}>
              <View style={styles.statRow}>
                {[
                  { label: "الجلسات", value: p.sessions },
                  { label: "نسبة الفوز", value: `${p.winRate}%` },
                  { label: "الجولات", value: p.totalRounds },
                ].map((s, idx) => (
                  <View key={idx} style={styles.miniStatBox}>
                    <Text style={[styles.miniStatValue, { color: colors.gold }]}>{s.value}</Text>
                    <Text style={[styles.miniStatLabel, { color: colors.textDim }]}>{s.label}</Text>
                  </View>
                ))}
              </View>
              <View style={[styles.favGameRow, { borderTopColor: colors.border }]}>
                <Text style={[styles.favGameLabel, { color: colors.textDim }]}>اللعبة المفضلة</Text>
                <Text style={[styles.favGameName, { color: colors.text }]}>{p.favGame}</Text>
              </View>
            </View>
          )}
        </View>
      ))}

      {/* ── Per-game summary ── */}
      {gameSummary.length > 0 && (
        <>
          <Text style={[styles.sectionTitle, { color: colors.text, marginTop: 24 }]}>
            🎴 إحصاء الألعاب
          </Text>
          {gameSummary.map((g) => (
            <View
              key={g.gameId}
              style={[styles.gameRow, { backgroundColor: colors.surface, borderColor: colors.border }]}
            >
              <View style={styles.gameRowRight}>
                <Text style={[styles.gameName, { color: colors.text }]}>{g.name}</Text>
                {g.topWinner && (
                  <Text style={[styles.gameTopWinner, { color: colors.textMuted }]}>
                    أفضل لاعب: {g.topWinner} ({g.topWins} {g.topWins === 1 ? "فوز" : "انتصارات"})
                  </Text>
                )}
              </View>
              <View style={[styles.gameCount, { backgroundColor: colors.surfaceRaised }]}>
                <Text style={[styles.gameCountNum, { color: colors.gold, fontFamily: Fonts.mono }]}>
                  {g.count}
                </Text>
                <Text style={[styles.gameCountLabel, { color: colors.textDim }]}>مرة</Text>
              </View>
            </View>
          ))}
        </>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { paddingHorizontal: 16 },
  title: { fontFamily: Fonts.heading, fontSize: 28, textAlign: "right", marginBottom: 20 },
  sectionTitle: { fontFamily: Fonts.heading, fontSize: 20, textAlign: "right", marginBottom: 12 },

  // empty
  emptyBox: { alignItems: "center", paddingHorizontal: 32, gap: 12 },
  emptyIcon: { fontSize: 48 },
  emptyTitle: { fontFamily: Fonts.heading, fontSize: 22, textAlign: "center" },
  emptyHint: { fontFamily: Fonts.body, fontSize: 15, textAlign: "center", lineHeight: 24 },

  // overview
  grid: { flexDirection: "row-reverse", flexWrap: "wrap", gap: 10, marginBottom: 28 },
  overviewCard: {
    borderRadius: 16,
    padding: 16,
    alignItems: "center",
    gap: 8,
    width: "47%",
  },
  overviewValue: { fontFamily: Fonts.mono, fontSize: 20, textAlign: "center" },
  overviewLabel: { fontFamily: Fonts.body, fontSize: 12, textAlign: "center" },

  // player leaderboard
  playerRow: {
    flexDirection: "row-reverse",
    alignItems: "center",
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
    marginBottom: 6,
    gap: 10,
  },
  playerRowLeft: { flexDirection: "row", alignItems: "center", gap: 8 },
  playerRowCenter: { flex: 1, alignItems: "flex-end", gap: 2 },
  playerName: { fontFamily: Fonts.heading, fontSize: 16, textAlign: "right" },
  champBadge: { fontFamily: Fonts.body, fontSize: 11 },
  winBadge: { alignItems: "center" },
  winsText: { fontFamily: Fonts.mono, fontSize: 18 },
  winsLabel: { fontFamily: Fonts.body, fontSize: 10 },
  rankCircle: {
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: "center",
    justifyContent: "center",
  },
  rankNum: { fontFamily: Fonts.mono, fontSize: 12 },

  // expanded player stats
  expandedBox: {
    marginTop: -4,
    marginBottom: 6,
    borderRadius: 12,
    borderWidth: 1,
    padding: 14,
    gap: 10,
  },
  statRow: { flexDirection: "row-reverse", justifyContent: "space-around" },
  miniStatBox: { alignItems: "center", gap: 4 },
  miniStatValue: { fontFamily: Fonts.mono, fontSize: 18 },
  miniStatLabel: { fontFamily: Fonts.body, fontSize: 12 },
  favGameRow: { flexDirection: "row-reverse", justifyContent: "space-between", paddingTop: 10, borderTopWidth: 1 },
  favGameLabel: { fontFamily: Fonts.body, fontSize: 13 },
  favGameName: { fontFamily: Fonts.body, fontSize: 13 },

  // per-game summary
  gameRow: {
    flexDirection: "row-reverse",
    alignItems: "center",
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 6,
    gap: 12,
  },
  gameRowRight: { flex: 1, gap: 3 },
  gameName: { fontFamily: Fonts.heading, fontSize: 15, textAlign: "right" },
  gameTopWinner: { fontFamily: Fonts.body, fontSize: 12, textAlign: "right" },
  gameCount: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 10, alignItems: "center" },
  gameCountNum: { fontSize: 18 },
  gameCountLabel: { fontFamily: Fonts.body, fontSize: 10 },
});
