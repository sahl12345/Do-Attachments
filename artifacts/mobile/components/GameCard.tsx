import { Feather } from "@expo/vector-icons";
import React from "react";
import {
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

import { Fonts } from "@/constants/fonts";
import { GameDef } from "@/constants/games";
import { useColors } from "@/hooks/useColors";

interface Props {
  game: GameDef;
  onPress?: () => void;
  selected?: boolean;
  compact?: boolean;
}

export function GameCard({ game, onPress, selected, compact }: Props) {
  const colors = useColors();

  const dots = Array.from({ length: 5 }, (_, i) => i < game.difficulty);

  return (
    <TouchableOpacity
      activeOpacity={0.7}
      onPress={onPress}
      style={[
        styles.card,
        {
          backgroundColor: selected ? colors.surfaceHigh : colors.surface,
          borderColor: selected ? colors.gold : colors.border,
          borderWidth: selected ? 1.5 : 1,
        },
        compact && styles.compact,
      ]}
    >
      <View style={styles.row}>
        <View style={styles.right}>
          <Text
            style={[
              styles.name,
              { color: selected ? colors.gold : colors.text },
            ]}
          >
            {game.name}
          </Text>
          {!compact && (
            <Text style={[styles.description, { color: colors.textMuted }]}>
              {game.description}
            </Text>
          )}
          <View style={styles.meta}>
            <View style={styles.dots}>
              {dots.map((filled, i) => (
                <View
                  key={i}
                  style={[
                    styles.dot,
                    { backgroundColor: filled ? colors.gold : colors.textDim },
                  ]}
                />
              ))}
            </View>
            <Text style={[styles.scoring, { color: colors.textMuted }]}>
              {game.scoringType}
            </Text>
          </View>
        </View>
        <View style={styles.left}>
          <View
            style={[
              styles.badge,
              { backgroundColor: colors.surfaceRaised },
            ]}
          >
            <Text style={[styles.badgeText, { color: colors.textMuted }]}>
              {game.playerLabel}
            </Text>
          </View>
          {selected && (
            <Feather name="check-circle" size={20} color={colors.gold} />
          )}
        </View>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 16,
    padding: 16,
    marginVertical: 6,
  },
  compact: {
    padding: 12,
    marginVertical: 4,
  },
  row: {
    flexDirection: "row-reverse",
    justifyContent: "space-between",
    alignItems: "flex-start",
  },
  right: {
    flex: 1,
    alignItems: "flex-end",
  },
  left: {
    alignItems: "flex-end",
    gap: 8,
    marginRight: 0,
    marginLeft: 12,
  },
  name: {
    fontFamily: Fonts.heading,
    fontSize: 17,
    textAlign: "right",
  },
  description: {
    fontFamily: Fonts.body,
    fontSize: 13,
    textAlign: "right",
    marginTop: 4,
    lineHeight: 20,
  },
  meta: {
    flexDirection: "row-reverse",
    alignItems: "center",
    gap: 10,
    marginTop: 8,
  },
  dots: {
    flexDirection: "row",
    gap: 4,
  },
  dot: {
    width: 7,
    height: 7,
    borderRadius: 4,
  },
  scoring: {
    fontFamily: Fonts.body,
    fontSize: 12,
  },
  badge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
  },
  badgeText: {
    fontFamily: Fonts.body,
    fontSize: 12,
  },
});
