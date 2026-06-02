import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { useRouter } from "expo-router";
import React, { useState } from "react";
import {
  ActivityIndicator,
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
import { createOnlineSession } from "@/services/onlineSession";
import { useColors } from "@/hooks/useColors";

type SessionMode = "local" | "online";

// local steps: mode(0) → game(1) → players(2) → settings(3)
// online steps: mode(0) → game(1) → host-name(2) → settings(3)
const LOCAL_STEP_LABELS = ["كيف تلعبون؟", "اختار اللعبة", "أضف اللاعبين", "اعدادات الجلسة"];
const ONLINE_STEP_LABELS = ["كيف تلعبون؟", "اختار اللعبة", "اسمك", "اعدادات الجلسة"];

export default function NewSessionScreen() {
  const colors = useColors();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { addSession, userName } = useApp();

  const [step, setStep] = useState(0);
  const [mode, setMode] = useState<SessionMode | null>(null);
  const [selectedGame, setSelectedGame] = useState<GameDef | null>(null);
  const [players, setPlayers] = useState<string[]>(["", "", "", ""]);
  const [hostName, setHostName] = useState(userName ?? "");
  const [targetScore, setTargetScore] = useState<number>(0);
  const [antiCheat, setAntiCheat] = useState(false);
  const [debtEnabled, setDebtEnabled] = useState(false);
  const [debtPerPoint, setDebtPerPoint] = useState("0.10");
  const [creatingOnline, setCreatingOnline] = useState(false);
  const webTop = Platform.OS === "web" ? 67 : 0;

  const labels = mode === "online" ? ONLINE_STEP_LABELS : LOCAL_STEP_LABELS;

  const canNext = (): boolean => {
    if (step === 0) return !!mode;
    if (step === 1) return !!selectedGame;
    if (step === 2) {
      if (mode === "online") return hostName.trim().length > 0;
      return (
        players.filter((p) => p.trim().length > 0).length >=
        (selectedGame?.minPlayers ?? 2)
      );
    }
    return true;
  };

  const handleSelectMode = (m: SessionMode) => {
    Haptics.selectionAsync();
    setMode(m);
    setStep(1);
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
    } else if (step === 1) {
      setMode(null);
      setStep(0);
    } else {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      setStep((s) => s - 1);
    }
  };

  const handleStartLocal = () => {
    if (!selectedGame) return;
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    const validPlayers = players
      .filter((_, i) => i < selectedGame.maxPlayers)
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
      antiCheat: antiCheat || undefined,
      debtPerPoint: debtEnabled ? parseFloat(debtPerPoint) || 0.1 : undefined,
    };
    addSession(session);
    router.replace(`/session/${session.id}`);
  };

  const handleStartOnline = async () => {
    if (!selectedGame || !hostName.trim()) return;
    setCreatingOnline(true);
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      const { code, hostPlayerId } = await createOnlineSession(
        selectedGame.id,
        targetScore || selectedGame.defaultTarget,
        hostName.trim()
      );
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      router.replace({
        pathname: "/session/[id]",
        params: { id: code, hostKey: hostPlayerId },
      });
    } catch (_e) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    } finally {
      setCreatingOnline(false);
    }
  };

  const isLastStep = step === 3;
  const handleConfirm = () => {
    if (mode === "local") handleStartLocal();
    else handleStartOnline();
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { paddingTop: insets.top + webTop + 8 }]}>
        <TouchableOpacity
          onPress={handleBack}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Feather name="arrow-right" size={24} color={colors.text} />
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Text style={[styles.stepLabel, { color: colors.text }]}>
            {labels[step]}
          </Text>
          {step > 0 && (
            <View style={styles.stepDots}>
              {[1, 2, 3].map((s) => (
                <View
                  key={s}
                  style={[
                    styles.stepDot,
                    {
                      backgroundColor: s <= step ? colors.gold : colors.textDim,
                      width: s === step ? 20 : 8,
                    },
                  ]}
                />
              ))}
            </View>
          )}
        </View>
        <View style={{ width: 24 }} />
      </View>

      <View style={{ flex: 1 }}>
        {/* Step 0: Mode selection */}
        {step === 0 && (
          <View style={styles.modeContainer}>
            <Text style={[styles.modeHint, { color: colors.textMuted }]}>
              اختار طريقة اللعب
            </Text>
            <TouchableOpacity
              onPress={() => handleSelectMode("local")}
              activeOpacity={0.8}
              style={[
                styles.modeCard,
                { backgroundColor: colors.surface, borderColor: colors.border },
              ]}
            >
              <View
                style={[
                  styles.modeIcon,
                  { backgroundColor: `${colors.gold}22` },
                ]}
              >
                <Feather name="smartphone" size={28} color={colors.gold} />
              </View>
              <View style={styles.modeText}>
                <Text style={[styles.modeTitle, { color: colors.text }]}>
                  جلسة محلية
                </Text>
                <Text style={[styles.modeDesc, { color: colors.textMuted }]}>
                  واحد يدخل الأسماء من تلفونه والكل يشوف
                </Text>
              </View>
              <Feather name="chevron-left" size={20} color={colors.textDim} />
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => handleSelectMode("online")}
              activeOpacity={0.8}
              style={[
                styles.modeCard,
                {
                  backgroundColor: colors.surfaceHigh,
                  borderColor: `${colors.gold}44`,
                },
              ]}
            >
              <View
                style={[
                  styles.modeIcon,
                  { backgroundColor: `${colors.gold}33` },
                ]}
              >
                <Feather name="wifi" size={28} color={colors.gold} />
              </View>
              <View style={styles.modeText}>
                <View style={styles.modeTitleRow}>
                  <View
                    style={[
                      styles.newBadge,
                      { backgroundColor: colors.gold },
                    ]}
                  >
                    <Text
                      style={[styles.newBadgeText, { color: colors.background }]}
                    >
                      جديد
                    </Text>
                  </View>
                  <Text style={[styles.modeTitle, { color: colors.gold }]}>
                    جلسة مشتركة
                  </Text>
                </View>
                <Text style={[styles.modeDesc, { color: colors.textMuted }]}>
                  كل لاعب ينضم من تلفونه بكود رقمي
                </Text>
              </View>
              <Feather name="chevron-left" size={20} color={colors.gold} />
            </TouchableOpacity>
          </View>
        )}

        {/* Step 1: Game selection */}
        {step === 1 && (
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

        {/* Step 2a: Player names (local) */}
        {step === 2 && mode === "local" && (
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
                style={[styles.addPlayerBtn, { borderColor: colors.borderStrong }]}
              >
                <Feather name="user-plus" size={18} color={colors.textMuted} />
                <Text style={[styles.addPlayerText, { color: colors.textMuted }]}>
                  أضف لاعب
                </Text>
              </TouchableOpacity>
            )}
          </KeyboardAwareScrollViewCompat>
        )}

        {/* Step 2b: Host name (online) */}
        {step === 2 && mode === "online" && (
          <KeyboardAwareScrollViewCompat
            showsVerticalScrollIndicator={false}
            contentContainerStyle={[styles.stepContent, { paddingBottom: 120 }]}
            keyboardShouldPersistTaps="handled"
          >
            <View
              style={[styles.onlineInfo, { backgroundColor: colors.surface }]}
            >
              <Feather name="wifi" size={20} color={colors.gold} />
              <Text style={[styles.onlineInfoText, { color: colors.textMuted }]}>
                سيُنشئ لك الأب كوداً رقمياً لمشاركته مع أصحابك
              </Text>
            </View>
            <Text style={[styles.fieldLabel, { color: colors.textMuted }]}>
              اسمك أنت (المضيف)
            </Text>
            <TextInput
              style={[
                styles.playerInput,
                {
                  backgroundColor: colors.surface,
                  color: colors.text,
                  borderColor: hostName.trim() ? colors.gold : colors.border,
                  fontFamily: Fonts.heading,
                  fontSize: 18,
                },
              ]}
              value={hostName}
              onChangeText={setHostName}
              placeholder="اسمك"
              placeholderTextColor={colors.textDim}
              textAlign="right"
              returnKeyType="next"
              autoFocus
            />
            <Text style={[styles.fieldHint, { color: colors.textDim }]}>
              باقي اللاعبين ينضمون بكود الجلسة من تلفوناتهم
            </Text>
          </KeyboardAwareScrollViewCompat>
        )}

        {/* Step 3: Settings */}
        {step === 3 && (
          <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={[styles.stepContent, { paddingBottom: 120 }]}
          >
            {selectedGame && (
              <View
                style={[styles.gameSummary, { backgroundColor: colors.surface }]}
              >
                <Text style={[styles.gameSummaryTitle, { color: colors.gold }]}>
                  {selectedGame.name}
                </Text>
                <Text
                  style={[styles.gameSummaryPlayers, { color: colors.textMuted }]}
                >
                  {mode === "online"
                    ? `مشتركة — ${hostName} مضيف`
                    : `${players.filter((p) => p.trim()).length} لاعبين — ${
                        selectedGame.isTeam ? "فريقين" : "فردي"
                      }`}
                </Text>
                {mode === "local" && (
                  <View style={styles.playerChips}>
                    {players
                      .filter((p) => p.trim())
                      .map((n, i) => (
                        <View
                          key={i}
                          style={[
                            styles.chip,
                            { backgroundColor: colors.surfaceRaised },
                          ]}
                        >
                          <Text
                            style={[styles.chipText, { color: colors.textMuted }]}
                          >
                            {n}
                          </Text>
                        </View>
                      ))}
                  </View>
                )}
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
                          targetScore === val ? colors.gold : colors.surface,
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

            {/* Anti-cheat toggle */}
            <View style={[styles.toggleBlock, { backgroundColor: colors.surface }]}>
              <View style={styles.toggleRow}>
                <TouchableOpacity
                  onPress={() => {
                    setAntiCheat((v) => !v);
                    Haptics.selectionAsync();
                  }}
                  style={[
                    styles.toggleSwitch,
                    { backgroundColor: antiCheat ? colors.gold : colors.border },
                  ]}
                >
                  <View
                    style={[
                      styles.toggleThumb,
                      {
                        backgroundColor: colors.background,
                        transform: [{ translateX: antiCheat ? 20 : 2 }],
                      },
                    ]}
                  />
                </TouchableOpacity>
                <View style={styles.toggleText}>
                  <Text style={[styles.toggleLabel, { color: colors.text }]}>
                    👀 مانع الغش
                  </Text>
                  <Text style={[styles.toggleDesc, { color: colors.textMuted }]}>
                    تأكيد كل جولة قبل تسجيلها
                  </Text>
                </View>
              </View>
            </View>

            {/* Debt tracker toggle */}
            <View style={[styles.toggleBlock, { backgroundColor: colors.surface }]}>
              <View style={styles.toggleRow}>
                <TouchableOpacity
                  onPress={() => {
                    setDebtEnabled((v) => !v);
                    Haptics.selectionAsync();
                  }}
                  style={[
                    styles.toggleSwitch,
                    { backgroundColor: debtEnabled ? colors.gold : colors.border },
                  ]}
                >
                  <View
                    style={[
                      styles.toggleThumb,
                      {
                        backgroundColor: colors.background,
                        transform: [{ translateX: debtEnabled ? 20 : 2 }],
                      },
                    ]}
                  />
                </TouchableOpacity>
                <View style={styles.toggleText}>
                  <Text style={[styles.toggleLabel, { color: colors.text }]}>
                    💸 حساب الديون
                  </Text>
                  <Text style={[styles.toggleDesc, { color: colors.textMuted }]}>
                    احسب مين يدفع لمين بالنهاية
                  </Text>
                </View>
              </View>
              {debtEnabled && (
                <View style={[styles.debtRow, { borderTopColor: colors.border }]}>
                  <Text style={[styles.debtLabel, { color: colors.textMuted }]}>
                    قيمة كل نقطة (دينار)
                  </Text>
                  <TextInput
                    style={[
                      styles.debtInput,
                      {
                        backgroundColor: colors.surfaceRaised,
                        color: colors.text,
                        borderColor: colors.gold,
                        fontFamily: Fonts.mono,
                      },
                    ]}
                    value={debtPerPoint}
                    onChangeText={setDebtPerPoint}
                    keyboardType="decimal-pad"
                    textAlign="center"
                    selectTextOnFocus
                  />
                </View>
              )}
            </View>
          </ScrollView>
        )}
      </View>

      {step > 0 && (
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
          {!isLastStep ? (
            <TouchableOpacity
              onPress={handleNext}
              disabled={!canNext()}
              style={[
                styles.nextBtn,
                { backgroundColor: canNext() ? colors.gold : colors.surfaceRaised },
              ]}
            >
              <Text
                style={[
                  styles.nextBtnText,
                  { color: canNext() ? colors.background : colors.textDim },
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
              onPress={handleConfirm}
              disabled={creatingOnline}
              style={[styles.nextBtn, { backgroundColor: colors.gold }]}
            >
              {creatingOnline ? (
                <ActivityIndicator color={colors.background} />
              ) : (
                <>
                  <Feather
                    name={mode === "online" ? "wifi" : "play"}
                    size={20}
                    color={colors.background}
                  />
                  <Text style={[styles.nextBtnText, { color: colors.background }]}>
                    {mode === "online" ? "أنشئ الجلسة" : "ابدأ الجلسة"}
                  </Text>
                </>
              )}
            </TouchableOpacity>
          )}
        </View>
      )}
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
  headerCenter: { alignItems: "center", gap: 6 },
  stepLabel: { fontFamily: Fonts.heading, fontSize: 18, textAlign: "center" },
  stepDots: { flexDirection: "row", gap: 5 },
  stepDot: { height: 7, borderRadius: 4 },
  modeContainer: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 16,
    gap: 14,
  },
  modeHint: {
    fontFamily: Fonts.body,
    fontSize: 15,
    textAlign: "center",
    marginBottom: 8,
  },
  modeCard: {
    borderRadius: 20,
    borderWidth: 1.5,
    padding: 20,
    flexDirection: "row-reverse",
    alignItems: "center",
    gap: 14,
  },
  modeIcon: {
    width: 56,
    height: 56,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  modeText: { flex: 1, alignItems: "flex-end", gap: 4 },
  modeTitleRow: { flexDirection: "row-reverse", alignItems: "center", gap: 8 },
  modeTitle: { fontFamily: Fonts.heading, fontSize: 18 },
  modeDesc: { fontFamily: Fonts.body, fontSize: 13, textAlign: "right" },
  newBadge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 10 },
  newBadgeText: { fontFamily: Fonts.body, fontSize: 10 },
  stepContent: { paddingHorizontal: 16, paddingTop: 8 },
  onlineInfo: {
    flexDirection: "row-reverse",
    alignItems: "center",
    gap: 10,
    padding: 14,
    borderRadius: 14,
    marginBottom: 20,
  },
  onlineInfoText: {
    fontFamily: Fonts.body,
    fontSize: 14,
    textAlign: "right",
    flex: 1,
    lineHeight: 22,
  },
  fieldLabel: {
    fontFamily: Fonts.heading,
    fontSize: 16,
    textAlign: "right",
    marginBottom: 8,
  },
  fieldHint: {
    fontFamily: Fonts.body,
    fontSize: 13,
    textAlign: "right",
    marginTop: 8,
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
  playerNumText: { fontSize: 14 },
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
  addPlayerText: { fontFamily: Fonts.body, fontSize: 15 },
  gameSummary: {
    borderRadius: 16,
    padding: 16,
    alignItems: "center",
    marginBottom: 24,
    gap: 8,
  },
  gameSummaryTitle: { fontFamily: Fonts.heading, fontSize: 20 },
  gameSummaryPlayers: { fontFamily: Fonts.body, fontSize: 14 },
  playerChips: {
    flexDirection: "row-reverse",
    flexWrap: "wrap",
    gap: 6,
    justifyContent: "center",
    marginTop: 4,
  },
  chip: { paddingHorizontal: 12, paddingVertical: 5, borderRadius: 20 },
  chipText: { fontFamily: Fonts.body, fontSize: 13 },
  settingBlock: { gap: 10 },
  settingLabel: { fontFamily: Fonts.heading, fontSize: 18, textAlign: "right" },
  settingDesc: { fontFamily: Fonts.body, fontSize: 13, textAlign: "right" },
  toggleBlock: { borderRadius: 16, overflow: "hidden" },
  toggleRow: { flexDirection: "row-reverse", alignItems: "center", gap: 14, padding: 16 },
  toggleSwitch: { width: 44, height: 26, borderRadius: 13, justifyContent: "center" },
  toggleThumb: { width: 20, height: 20, borderRadius: 10 },
  toggleText: { flex: 1, gap: 2 },
  toggleLabel: { fontFamily: Fonts.heading, fontSize: 16, textAlign: "right" },
  toggleDesc: { fontFamily: Fonts.body, fontSize: 12, textAlign: "right" },
  debtRow: { flexDirection: "row-reverse", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 16, paddingVertical: 14, borderTopWidth: 1 },
  debtLabel: { fontFamily: Fonts.body, fontSize: 14 },
  debtInput: { width: 80, height: 40, borderRadius: 10, borderWidth: 1.5, fontSize: 16, textAlign: "center" },
  targetRow: { flexDirection: "row-reverse", gap: 10, marginTop: 8 },
  targetBtn: {
    flex: 1,
    height: 52,
    borderRadius: 14,
    borderWidth: 1.5,
    alignItems: "center",
    justifyContent: "center",
  },
  targetBtnText: { fontSize: 18 },
  footer: { paddingHorizontal: 16, paddingTop: 12, borderTopWidth: 1 },
  nextBtn: {
    flexDirection: "row-reverse",
    height: 56,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
  },
  nextBtnText: { fontFamily: Fonts.heading, fontSize: 18 },
});
