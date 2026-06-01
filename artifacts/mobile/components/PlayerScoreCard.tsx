import React, { useEffect, useRef } from "react";
import { Animated, StyleSheet, Text, View } from "react-native";

import { Fonts } from "@/constants/fonts";
import { useColors } from "@/hooks/useColors";

interface Props {
  name: string;
  score: number;
  lastDelta?: number;
  isWinner?: boolean;
  isEliminated?: boolean;
  teamLabel?: string;
}

export function PlayerScoreCard({
  name,
  score,
  lastDelta,
  isWinner,
  isEliminated,
  teamLabel,
}: Props) {
  const colors = useColors();
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const prevScore = useRef(score);

  useEffect(() => {
    if (prevScore.current !== score) {
      prevScore.current = score;
      Animated.sequence([
        Animated.spring(scaleAnim, {
          toValue: 1.08,
          useNativeDriver: true,
          speed: 200,
          bounciness: 15,
        }),
        Animated.spring(scaleAnim, {
          toValue: 1,
          useNativeDriver: true,
          speed: 200,
          bounciness: 10,
        }),
      ]).start();
    }
  }, [score, scaleAnim]);

  const scoreColor = isWinner
    ? colors.gold
    : isEliminated
    ? colors.textDim
    : colors.text;

  const deltaColor =
    lastDelta === undefined
      ? colors.textDim
      : lastDelta >= 0
      ? colors.success
      : colors.red;

  return (
    <Animated.View
      style={[
        styles.card,
        {
          backgroundColor: isWinner
            ? `${colors.gold}22`
            : isEliminated
            ? colors.surfaceRaised
            : colors.surface,
          borderColor: isWinner ? colors.gold : colors.border,
          borderWidth: isWinner ? 1.5 : 1,
          transform: [{ scale: scaleAnim }],
          opacity: isEliminated ? 0.5 : 1,
        },
      ]}
    >
      {teamLabel && (
        <Text style={[styles.teamLabel, { color: colors.textDim }]}>
          {teamLabel}
        </Text>
      )}
      <Text
        style={[styles.name, { color: isEliminated ? colors.textDim : colors.textMuted }]}
        numberOfLines={1}
      >
        {name}
      </Text>
      <Text style={[styles.score, { color: scoreColor }]}>
        {isEliminated ? "خارج" : score.toLocaleString("ar-SA")}
      </Text>
      {lastDelta !== undefined && !isEliminated && (
        <Text style={[styles.delta, { color: deltaColor }]}>
          {lastDelta >= 0 ? `+${lastDelta}` : `${lastDelta}`}
        </Text>
      )}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 16,
    padding: 16,
    alignItems: "center",
    justifyContent: "center",
    minHeight: 100,
    flex: 1,
    margin: 4,
  },
  teamLabel: {
    fontFamily: "Tajawal_400Regular",
    fontSize: 10,
    marginBottom: 2,
    textAlign: "center",
  },
  name: {
    fontFamily: "Tajawal_400Regular",
    fontSize: 14,
    textAlign: "center",
    marginBottom: 6,
  },
  score: {
    fontFamily: "IBMPlexMono_400Regular",
    fontSize: 36,
    fontWeight: "400" as const,
    textAlign: "center",
  },
  delta: {
    fontFamily: "IBMPlexMono_400Regular",
    fontSize: 13,
    marginTop: 4,
    textAlign: "center",
  },
});
