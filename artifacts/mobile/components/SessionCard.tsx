import { Feather } from "@expo/vector-icons";
import React from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";

import { Fonts } from "@/constants/fonts";
import { getGameById } from "@/constants/games";
import { Session, getTotalScore } from "@/contexts/AppContext";
import { useColors } from "@/hooks/useColors";

interface Props {
  session: Session;
  onPress?: () => void;
  onDelete?: () => void;
}

function formatDate(ts: number): string {
  const d = new Date(ts);
  return d.toLocaleDateString("ar-SA", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export function SessionCard({ session, onPress, onDelete }: Props) {
  const colors = useColors();
  const game = getGameById(session.gameId);
  const isComplete = !!session.completedAt;

  const winner = session.winnerId
    ? session.players.find((p) => p.id === session.winnerId)
    : null;

  const scores = session.players.map((p) => ({
    name: p.name,
    score: getTotalScore(session, p.id),
  }));

  return (
    <TouchableOpacity
      activeOpacity={0.8}
      onPress={onPress}
      style={[
        styles.card,
        {
          backgroundColor: colors.surface,
          borderColor: isComplete ? colors.border : `${colors.gold}40`,
          borderWidth: 1,
        },
      ]}
    >
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          {!isComplete && (
            <View
              style={[
                styles.liveBadge,
                { backgroundColor: `${colors.red}33` },
              ]}
            >
              <View
                style={[styles.liveDot, { backgroundColor: colors.red }]}
              />
              <Text style={[styles.liveText, { color: colors.red }]}>
                جارية
              </Text>
            </View>
          )}
          {onDelete && (
            <TouchableOpacity
              onPress={onDelete}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <Feather name="trash-2" size={16} color={colors.textDim} />
            </TouchableOpacity>
          )}
        </View>
        <View style={styles.headerRight}>
          <Text style={[styles.gameName, { color: colors.gold }]}>
            {game?.name ?? "لعبة"}
          </Text>
          <Text style={[styles.date, { color: colors.textMuted }]}>
            {formatDate(session.createdAt)}
          </Text>
        </View>
      </View>

      <View style={styles.scores}>
        {scores.map((s, i) => (
          <View key={i} style={styles.scoreRow}>
            <Text
              style={[
                styles.scoreNum,
                {
                  color:
                    winner?.name === s.name ? colors.gold : colors.textMuted,
                  fontFamily: Fonts.mono,
                },
              ]}
            >
              {s.score.toLocaleString("ar-SA")}
            </Text>
            <Text
              style={[
                styles.playerName,
                { color: winner?.name === s.name ? colors.text : colors.textMuted },
              ]}
            >
              {s.name}
              {winner?.name === s.name ? " 🏆" : ""}
            </Text>
          </View>
        ))}
      </View>

      <View
        style={[styles.footer, { borderTopColor: colors.border }]}
      >
        <Text style={[styles.rounds, { color: colors.textDim }]}>
          {session.rounds.length} جولة
        </Text>
        <Feather name="chevron-left" size={16} color={colors.textDim} />
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 16,
    marginVertical: 6,
    overflow: "hidden",
  },
  header: {
    flexDirection: "row-reverse",
    justifyContent: "space-between",
    alignItems: "flex-start",
    padding: 16,
    paddingBottom: 12,
  },
  headerRight: {
    alignItems: "flex-end",
  },
  headerLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  gameName: {
    fontFamily: "Cairo_700Bold",
    fontSize: 16,
  },
  date: {
    fontFamily: "Tajawal_400Regular",
    fontSize: 12,
    marginTop: 2,
  },
  liveBadge: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
    gap: 4,
  },
  liveDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  liveText: {
    fontFamily: "Tajawal_400Regular",
    fontSize: 11,
  },
  scores: {
    paddingHorizontal: 16,
    paddingBottom: 12,
    gap: 6,
  },
  scoreRow: {
    flexDirection: "row-reverse",
    justifyContent: "space-between",
    alignItems: "center",
  },
  playerName: {
    fontFamily: "Tajawal_400Regular",
    fontSize: 14,
    textAlign: "right",
  },
  scoreNum: {
    fontSize: 15,
  },
  footer: {
    flexDirection: "row-reverse",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderTopWidth: 1,
  },
  rounds: {
    fontFamily: "Tajawal_400Regular",
    fontSize: 12,
  },
});
