import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { useRouter } from "expo-router";
import React, { useState } from "react";
import {
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { KeyboardAwareScrollViewCompat } from "@/components/KeyboardAwareScrollViewCompat";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { GameCard } from "@/components/GameCard";
import { Fonts } from "@/constants/fonts";
import { GAMES, GameDef } from "@/constants/games";
import { Session, generateId, useApp } from "@/contexts/AppContext";
import { useColors } from "@/hooks/useColors";

const STEP_LABELS = ["اختار اللعبة", "أضف اللاعبين", "اعدادات الجلسة"];

export default function NewSessionScreen() {
  const colors = useColors();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { addSession } = useApp();

  const [step, setStep] = useState(0);
  const [selectedGame, setSelectedGame] = useState<GameDef | null>(null);
  const [players, setPlayers] = useState<string[]>(["", "", "", ""]);
  const [targetScore, setTargetScore] = useState<number>(0);
  const webTop = Platform.OS === "web" ? 67 : 0;

  const canNext = (): boolean => {
    if (step === 0) return !!selectedGame;
    if (step === 1) {
      const minPlayers = selectedGame?.minPlayers ?? 2;
      return players.filter((p) => p.trim().length > 0).length >= minPlayers;
    }
    return true;
  };

  const handleSelectGame = (game: GameDef) => {
    Haptics.selectionAsync();
    setSelectedGame(game);
    const count = Math.max(game.minPlayers, 2);
    setPlayers(Array.from({ length: count }, (_, i) => players[i] ?? ""));
    setTargetScore(game.defaultTarget);
  };

  const addPlayer = () => {
    if (!selectedGame || players.length >= selectedGame.maxPlayers) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setPlayers((prev) => [...prev, ""]);
  };

  const removePlayer = (i: number) => {
    const min = selectedGame?.minPlayers ?? 2;
    if (players.length <= min) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setPlayers((prev) => prev.filter((_, idx) => idx !== i));
  };

  const handleNext = () => {
    if (!canNext()) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setStep((s) => s + 1);
  };

  const handleBack = () => {
    if (step === 0) {
      router.back();
    } else {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      setStep((s) => s - 1);
    }
  };

  const handleStart = () => {
    if (!selectedGame) return;
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    const validPlayers = players
      .filter((n, i) => i < selectedGame.maxPlayers)
      .map((n, i) => ({
        id: generateId(),
        name: n.trim() || `لاعب ${i + 1}`,
      }));

    const session: Session = {
      id: generateId(),
      gameId: selectedGame.id,
      players: validPlayers,
      rounds: [],
      targetScore: targetScore || selectedGame.defaultTarget,
      createdAt: Date.now(),
    };
    addSession(session);
    router.replace(`/session/${session.id}`);
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View
        style={[
          styles.header,
          { paddingTop: insets.top + webTop + 8 },
        ]}
      >
        <TouchableOpacity
          onPress={handleBack}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Feather name="arrow-right" size={24} color={colors.text} />
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Text style={[styles.stepLabel, { color: colors.text }]}>
            {STEP_LABELS[step]}
          </Text>
          <View style={styles.stepDots}>
            {STEP_LABELS.map((_, i) => (
              <View
                key={i}
                style={[
                  styles.stepDot,
                  {
                    backgroundColor: i <= step ? colors.gold : colors.textDim,
                    width: i === step ? 20 : 8,
                  },
                ]}
              />
            ))}
          </View>
        </View>
        <View style={{ width: 24 }} />
      </View>

      <View style={{ flex: 1 }}>
        {step === 0 && (
          <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={[styles.stepContent, { paddingBottom: 120 }]}
          >
            {GAMES.map((game) => (
              <GameCard
                key={game.id}
                game={game}
                selected={selectedGame?.id === game.id}
                onPress={() => handleSelectGame(game)}
              />
            ))}
          </ScrollView>
        )}

        {step === 1 && (
          <KeyboardAwareScrollViewCompat
            showsVerticalScrollIndicator={false}
            contentContainerStyle={[styles.stepContent, { paddingBottom: 120 }]}
            keyboardShouldPersistTaps="handled"
          >
            {players.map((name, i) => (
              <View key={i} style={styles.playerInputRow}>
                <TouchableOpacity
                  onPress={() => removePlayer(i)}
                  style={[
                    styles.removeBtn,
                    {
                      backgroundColor: `${colors.red}22`,
                      opacity:
                        players.length <= (selectedGame?.minPlayers ?? 2)
                          ? 0.3
                          : 1,
                    },
                  ]}
                >
                  <Feather name="minus" size={16} color={colors.red} />
                </TouchableOpacity>
                <TextInput
                  style={[
                    styles.playerInput,
                    {
                      backgroundColor: colors.surface,
                      color: colors.text,
                      borderColor: name.trim() ? colors.gold : colors.border,
                      fontFamily: Fonts.heading,
                    },
                  ]}
                  value={name}
                  onChangeText={(v) => {
                    const next = [...players];
                    next[i] = v;
                    setPlayers(next);
                  }}
                  placeholder={`لاعب ${i + 1}`}
                  placeholderTextColor={colors.textDim}
                  textAlign="right"
                  returnKeyType="next"
                />
                <View
                  style={[
                    styles.playerNum,
                    { backgroundColor: colors.surfaceRaised },
                  ]}
                >
                  <Text
                    style={[
                      styles.playerNumText,
                      { color: colors.textMuted, fontFamily: Fonts.mono },
                    ]}
                  >
                    {i + 1}
                  </Text>
                </View>
              </View>
            ))}

            {selectedGame && players.length < selectedGame.maxPlayers && (
              <TouchableOpacity
                onPress={addPlayer}
                style={[
                  styles.addPlayerBtn,
                  { borderColor: colors.borderStrong },
                ]}
              >
                <Feather name="user-plus" size={18} color={colors.textMuted} />
                <Text
                  style={[styles.addPlayerText, { color: colors.textMuted }]}
                >
                  أضف لاعب
                </Text>
              </TouchableOpacity>
            )}
          </KeyboardAwareScrollViewCompat>
        )}

        {step === 2 && (
          <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={[styles.stepContent, { paddingBottom: 120 }]}
          >
            {selectedGame && (
              <View
                style={[
                  styles.gameSummary,
                  { backgroundColor: colors.surface },
                ]}
              >
                <Text
                  style={[styles.gameSummaryTitle, { color: colors.gold }]}
                >
                  {selectedGame.name}
                </Text>
                <Text
                  style={[
                    styles.gameSummaryPlayers,
                    { color: colors.textMuted },
                  ]}
                >
                  {players.filter((p) => p.trim()).length > 0
                    ? players.filter((p) => p.trim()).length
                    : selectedGame.minPlayers}{" "}
                  لاعبين — {selectedGame.isTeam ? "فريقين" : "فردي"}
                </Text>
                <View style={styles.playerChips}>
                  {players
                    .filter((p) => p.trim())
                    .map((name, i) => (
                      <View
                        key={i}
                        style={[
                          styles.chip,
                          { backgroundColor: colors.surfaceRaised },
                        ]}
                      >
                        <Text
                          style={[
                            styles.chipText,
                            { color: colors.textMuted },
                          ]}
                        >
                          {name}
                        </Text>
                      </View>
                    ))}
                </View>
              </View>
            )}

            <View style={styles.settingBlock}>
              <Text style={[styles.settingLabel, { color: colors.text }]}>
                نقاط الفوز
              </Text>
              <Text style={[styles.settingDesc, { color: colors.textMuted }]}>
                أول لاعب يوصل هذا الرقم يفوز
              </Text>
              <View style={styles.targetRow}>
                {[
                  selectedGame?.defaultTarget ?? 41,
                  (selectedGame?.defaultTarget ?? 41) + 10,
                  (selectedGame?.defaultTarget ?? 41) + 20,
                ].map((val) => (
                  <TouchableOpacity
                    key={val}
                    onPress={() => {
                      setTargetScore(val);
                      Haptics.selectionAsync();
                    }}
                    style={[
                      styles.targetBtn,
                      {
                        backgroundColor:
                          targetScore === val
                            ? colors.gold
                            : colors.surface,
                        borderColor:
                          targetScore === val ? colors.gold : colors.border,
                      },
                    ]}
                  >
                    <Text
                      style={[
                        styles.targetBtnText,
                        {
                          color:
                            targetScore === val
                              ? colors.background
                              : colors.textMuted,
                          fontFamily: Fonts.mono,
                        },
                      ]}
                    >
                      {val}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          </ScrollView>
        )}
      </View>

      <View
        style={[
          styles.footer,
          {
            paddingBottom: insets.bottom + (Platform.OS === "web" ? 34 : 8),
            backgroundColor: colors.background,
            borderTopColor: colors.border,
          },
        ]}
      >
        {step < 2 ? (
          <TouchableOpacity
            onPress={handleNext}
            disabled={!canNext()}
            style={[
              styles.nextBtn,
              {
                backgroundColor: canNext()
                  ? colors.gold
                  : colors.surfaceRaised,
              },
            ]}
          >
            <Text
              style={[
                styles.nextBtnText,
                {
                  color: canNext() ? colors.background : colors.textDim,
                },
              ]}
            >
              التالي
            </Text>
            <Feather
              name="arrow-left"
              size={20}
              color={canNext() ? colors.background : colors.textDim}
            />
          </TouchableOpacity>
        ) : (
          <TouchableOpacity
            onPress={handleStart}
            style={[styles.nextBtn, { backgroundColor: colors.gold }]}
          >
            <Feather name="play" size={20} color={colors.background} />
            <Text style={[styles.nextBtnText, { color: colors.background }]}>
              ابدأ الجلسة
            </Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: "row-reverse",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingBottom: 12,
  },
  headerCenter: {
    alignItems: "center",
    gap: 6,
  },
  stepLabel: {
    fontFamily: Fonts.heading,
    fontSize: 18,
    textAlign: "center",
  },
  stepDots: {
    flexDirection: "row",
    gap: 5,
  },
  stepDot: {
    height: 7,
    borderRadius: 4,
  },
  stepContent: {
    paddingHorizontal: 16,
    paddingTop: 8,
  },
  playerInputRow: {
    flexDirection: "row-reverse",
    alignItems: "center",
    gap: 8,
    marginBottom: 10,
  },
  playerNum: {
    width: 32,
    height: 32,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  playerNumText: {
    fontSize: 14,
  },
  playerInput: {
    flex: 1,
    height: 52,
    borderRadius: 14,
    paddingHorizontal: 14,
    fontSize: 16,
    borderWidth: 1.5,
  },
  removeBtn: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  addPlayerBtn: {
    flexDirection: "row-reverse",
    alignItems: "center",
    justifyContent: "center",
    height: 52,
    borderRadius: 14,
    borderWidth: 1.5,
    borderStyle: "dashed",
    gap: 8,
    marginTop: 4,
  },
  addPlayerText: {
    fontFamily: Fonts.body,
    fontSize: 15,
  },
  gameSummary: {
    borderRadius: 16,
    padding: 16,
    alignItems: "center",
    marginBottom: 24,
    gap: 8,
  },
  gameSummaryTitle: {
    fontFamily: Fonts.heading,
    fontSize: 20,
    textAlign: "center",
  },
  gameSummaryPlayers: {
    fontFamily: Fonts.body,
    fontSize: 14,
    textAlign: "center",
  },
  playerChips: {
    flexDirection: "row-reverse",
    flexWrap: "wrap",
    gap: 6,
    justifyContent: "center",
    marginTop: 4,
  },
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 20,
  },
  chipText: {
    fontFamily: Fonts.body,
    fontSize: 13,
  },
  settingBlock: {
    gap: 10,
  },
  settingLabel: {
    fontFamily: Fonts.heading,
    fontSize: 18,
    textAlign: "right",
  },
  settingDesc: {
    fontFamily: Fonts.body,
    fontSize: 13,
    textAlign: "right",
  },
  targetRow: {
    flexDirection: "row-reverse",
    gap: 10,
    marginTop: 8,
  },
  targetBtn: {
    flex: 1,
    height: 52,
    borderRadius: 14,
    borderWidth: 1.5,
    alignItems: "center",
    justifyContent: "center",
  },
  targetBtnText: {
    fontSize: 18,
  },
  footer: {
    paddingHorizontal: 16,
    paddingTop: 12,
    borderTopWidth: 1,
  },
  nextBtn: {
    flexDirection: "row-reverse",
    height: 56,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
  },
  nextBtnText: {
    fontFamily: Fonts.heading,
    fontSize: 18,
  },
});
