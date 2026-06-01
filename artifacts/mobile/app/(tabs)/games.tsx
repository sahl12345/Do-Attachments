import { Feather } from "@expo/vector-icons";
import React, { useState } from "react";
import {
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { GameCard } from "@/components/GameCard";
import { Fonts } from "@/constants/fonts";
import { GAMES, GameDef } from "@/constants/games";
import { useColors } from "@/hooks/useColors";

function DifficultyDots({ difficulty, color }: { difficulty: number; color: string }) {
  return (
    <View style={{ flexDirection: "row", gap: 4 }}>
      {Array.from({ length: 5 }, (_, i) => (
        <View
          key={i}
          style={{
            width: 8,
            height: 8,
            borderRadius: 4,
            backgroundColor: i < difficulty ? color : "rgba(255,255,255,0.15)",
          }}
        />
      ))}
    </View>
  );
}

export default function GamesScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const [selectedGame, setSelectedGame] = useState<GameDef | null>(null);
  const webTop = Platform.OS === "web" ? 67 : 0;

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[
          styles.content,
          {
            paddingTop: insets.top + webTop + 16,
            paddingBottom:
              insets.bottom + 100 + (Platform.OS === "web" ? 34 : 0),
          },
        ]}
      >
        <Text style={[styles.title, { color: colors.text }]}>الألعاب</Text>
        <Text style={[styles.subtitle, { color: colors.textMuted }]}>
          {GAMES.length} لعبة متاحة — اضغط لتشوف القواعد
        </Text>

        {GAMES.map((game) => (
          <GameCard
            key={game.id}
            game={game}
            onPress={() => setSelectedGame(game)}
          />
        ))}
      </ScrollView>

      <Modal
        visible={!!selectedGame}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setSelectedGame(null)}
      >
        {selectedGame && (
          <View
            style={[styles.modal, { backgroundColor: colors.surfaceHigh }]}
          >
            <View style={styles.modalHeader}>
              <TouchableOpacity
                onPress={() => setSelectedGame(null)}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                <Feather name="x" size={24} color={colors.textMuted} />
              </TouchableOpacity>
              <Text style={[styles.modalTitle, { color: colors.gold }]}>
                {selectedGame.name}
              </Text>
            </View>

            <ScrollView
              showsVerticalScrollIndicator={false}
              contentContainerStyle={styles.modalContent}
            >
              <View style={styles.infoGrid}>
                <InfoItem
                  label="اللاعبين"
                  value={selectedGame.playerLabel}
                  colors={colors}
                />
                <InfoItem
                  label="نظام النقاط"
                  value={selectedGame.scoringType}
                  colors={colors}
                />
                <InfoItem
                  label="نوع اللعبة"
                  value={selectedGame.isTeam ? "فريقين" : "فردي"}
                  colors={colors}
                />
                <InfoItem
                  label="الفائز"
                  value={
                    selectedGame.lowerIsBetter
                      ? "أقل نقاط"
                      : "أعلى نقاط"
                  }
                  colors={colors}
                />
              </View>

              <View
                style={[
                  styles.infoBox,
                  { backgroundColor: colors.surface },
                ]}
              >
                <Text style={[styles.infoBoxTitle, { color: colors.gold }]}>
                  الهدف
                </Text>
                <Text style={[styles.infoBoxText, { color: colors.text }]}>
                  {selectedGame.description}
                </Text>
                {selectedGame.defaultTarget > 0 && (
                  <Text style={[styles.targetText, { color: colors.textMuted }]}>
                    النقاط الافتراضية للفوز:{" "}
                    <Text style={{ color: colors.gold, fontFamily: Fonts.mono }}>
                      {selectedGame.defaultTarget}
                    </Text>
                  </Text>
                )}
                {selectedGame.eliminationScore && (
                  <Text style={[styles.targetText, { color: colors.red }]}>
                    نقطة الإقصاء: {selectedGame.eliminationScore}
                  </Text>
                )}
              </View>

              <View style={styles.diffRow}>
                <DifficultyDots
                  difficulty={selectedGame.difficulty}
                  color={colors.gold}
                />
                <Text style={[styles.diffLabel, { color: colors.textMuted }]}>
                  الصعوبة
                </Text>
              </View>
            </ScrollView>
          </View>
        )}
      </Modal>
    </View>
  );
}

function InfoItem({
  label,
  value,
  colors,
}: {
  label: string;
  value: string;
  colors: ReturnType<typeof useColors>;
}) {
  return (
    <View
      style={[infoStyles.item, { backgroundColor: colors.surface }]}
    >
      <Text style={[infoStyles.value, { color: colors.text }]}>{value}</Text>
      <Text style={[infoStyles.label, { color: colors.textMuted }]}>
        {label}
      </Text>
    </View>
  );
}

const infoStyles = StyleSheet.create({
  item: {
    borderRadius: 14,
    padding: 14,
    alignItems: "center",
    flex: 1,
    minWidth: "45%",
    gap: 4,
  },
  label: {
    fontFamily: "Tajawal_400Regular",
    fontSize: 12,
    textAlign: "center",
  },
  value: {
    fontFamily: "Cairo_700Bold",
    fontSize: 15,
    textAlign: "center",
  },
});

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { paddingHorizontal: 16 },
  title: {
    fontFamily: Fonts.heading,
    fontSize: 28,
    textAlign: "right",
    marginBottom: 4,
  },
  subtitle: {
    fontFamily: Fonts.body,
    fontSize: 14,
    textAlign: "right",
    marginBottom: 16,
  },
  modal: {
    flex: 1,
    paddingTop: 20,
  },
  modalHeader: {
    flexDirection: "row-reverse",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingBottom: 16,
  },
  modalTitle: {
    fontFamily: Fonts.heading,
    fontSize: 22,
    textAlign: "right",
  },
  modalContent: {
    padding: 20,
    gap: 16,
  },
  infoGrid: {
    flexDirection: "row-reverse",
    flexWrap: "wrap",
    gap: 10,
  },
  infoBox: {
    borderRadius: 16,
    padding: 16,
    gap: 8,
  },
  infoBoxTitle: {
    fontFamily: Fonts.heading,
    fontSize: 16,
    textAlign: "right",
  },
  infoBoxText: {
    fontFamily: Fonts.body,
    fontSize: 15,
    textAlign: "right",
    lineHeight: 24,
  },
  targetText: {
    fontFamily: Fonts.body,
    fontSize: 14,
    textAlign: "right",
    marginTop: 4,
  },
  diffRow: {
    flexDirection: "row-reverse",
    alignItems: "center",
    gap: 12,
  },
  diffLabel: {
    fontFamily: Fonts.body,
    fontSize: 14,
  },
});
