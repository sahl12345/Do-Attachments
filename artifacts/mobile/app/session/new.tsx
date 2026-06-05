import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useEffect, useState } from "react";
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
import { GameRules, Session, generateId, useApp } from "@/contexts/AppContext";
import { createOnlineSession } from "@/services/onlineSession";
import { useColors } from "@/hooks/useColors";

type SessionMode = "local" | "online";

// local (non-team) steps: mode(0) → game(1) → players(2) → settings(3)
// local (team) steps:     mode(0) → game(1) → players(2) → teams(3) → settings(4)
// online steps:           mode(0) → game(1) → host-name(2) → settings(3)
const LOCAL_STEP_LABELS = ["كيف تلعبون؟", "اختار اللعبة", "أضف اللاعبين", "اعدادات الجلسة"];
const LOCAL_TEAM_STEP_LABELS = ["كيف تلعبون؟", "اختار اللعبة", "أضف اللاعبين", "اختار الفرق", "اعدادات الجلسة"];
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
  // teamAssignment[i] = 0 → team A, 1 → team B (for team games)
  const [teamAssignment, setTeamAssignment] = useState<number[]>([0, 0, 1, 1]);
  const [hostName, setHostName] = useState(userName ?? "");
  const [targetScore, setTargetScore] = useState<number>(0);
  const [antiCheat, setAntiCheat] = useState(true);
  const [gameRules, setGameRules] = useState<GameRules>({});
  const setRule = <K extends keyof GameRules>(key: K, val: GameRules[K]) =>
    setGameRules((prev) => ({ ...prev, [key]: val }));
  const [creatingOnline, setCreatingOnline] = useState(false);
  const [onlineError, setOnlineError] = useState<string | null>(null);

  const webTop = Platform.OS === "web" ? 67 : 0;
  const { gameId: preselectedGameId } = useLocalSearchParams<{ gameId?: string }>();

  // Auto-select game + skip to players step when launched via "العب هلق"
  useEffect(() => {
    if (!preselectedGameId) return;
    const game = GAMES.find((g) => g.id === preselectedGameId);
    if (!game) return;
    setMode("local");
    setSelectedGame(game);
    setTargetScore(game.defaultTarget);
    const count = Math.max(game.minPlayers, 2);
    setPlayers(Array.from({ length: count }, (_, i) => players[i] ?? ""));
    const half = Math.ceil(count / 2);
    setTeamAssignment(Array.from({ length: count }, (_, i) => (i < half ? 0 : 1)));
    setStep(2); // jump directly to players step
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [preselectedGameId]);

  const isTeamLocalGame = mode === "local" && selectedGame?.isTeam === true;
  const settingsStep = isTeamLocalGame ? 4 : 3;
  const labels = mode === "online" ? ONLINE_STEP_LABELS : isTeamLocalGame ? LOCAL_TEAM_STEP_LABELS : LOCAL_STEP_LABELS;

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
    // team assignment step
    if (step === 3 && isTeamLocalGame) {
      const filledPlayers = players.filter((p) => p.trim().length > 0);
      const aCount = filledPlayers.filter((_, i) => teamAssignment[i] === 0).length;
      const bCount = filledPlayers.filter((_, i) => teamAssignment[i] === 1).length;
      return aCount >= 1 && bCount >= 1;
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
    // reset team assignment: first half → team A, second half → team B
    const half = Math.ceil(count / 2);
    setTeamAssignment(Array.from({ length: count }, (_, i) => (i < half ? 0 : 1)));
    // apply game-specific rule defaults
    const defaults: GameRules = {};
    if (game.id === "hand" || game.id === "hand_sy") defaults.maxRounds = 5;
    if (game.defaultRounds) defaults.maxRounds = game.defaultRounds;
    setGameRules(defaults);
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

    let rawPlayers = players
      .filter((_, i) => i < selectedGame.maxPlayers)
      .map((n, i) => ({ name: n.trim() || `لاعب ${i + 1}`, origIdx: i }));

    // For team games, reorder so teamA at [0,2,...] and teamB at [1,3,...]
    // ScoreEntryModal reads teamA = [players[0], players[2]], teamB = [players[1], players[3]]
    if (selectedGame.isTeam) {
      const teamA = rawPlayers.filter((_, i) => (teamAssignment[rawPlayers[i]?.origIdx ?? i] ?? 0) === 0);
      const teamB = rawPlayers.filter((_, i) => (teamAssignment[rawPlayers[i]?.origIdx ?? i] ?? 0) === 1);
      const maxLen = Math.max(teamA.length, teamB.length);
      rawPlayers = [];
      for (let i = 0; i < maxLen; i++) {
        if (teamA[i]) rawPlayers.push(teamA[i]);
        if (teamB[i]) rawPlayers.push(teamB[i]);
      }
    }

    const validPlayers = rawPlayers.map((p) => ({
      id: generateId(),
      name: p.name,
    }));

    const cleanRules: GameRules = {};
    if (gameRules.minBid !== undefined) cleanRules.minBid = gameRules.minBid;
    if (gameRules.penaltyOnFail !== undefined) cleanRules.penaltyOnFail = gameRules.penaltyOnFail;
    if (gameRules.doubleBid) cleanRules.doubleBid = gameRules.doubleBid;
    if (gameRules.maxRounds) cleanRules.maxRounds = gameRules.maxRounds;
    const session: Session = {
      id: generateId(),
      gameId: selectedGame.id,
      players: validPlayers,
      rounds: [],
      targetScore: targetScore || selectedGame.defaultTarget,
      createdAt: Date.now(),
      antiCheat: antiCheat || undefined,
      rules: Object.keys(cleanRules).length > 0 ? cleanRules : undefined,
    };
    addSession(session);
    router.replace(`/session/${session.id}`);
  };

  const handleStartOnline = async () => {
    if (!selectedGame || !hostName.trim()) return;
    setOnlineError(null);
    setCreatingOnline(true);
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      const { code, hostPlayerId } = await createOnlineSession(
        selectedGame.id,
        targetScore || selectedGame.defaultTarget,
        hostName.trim(),
        antiCheat || undefined,
        undefined
      );
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      router.replace({
        pathname: "/session/[id]",
        params: { id: code, hostKey: hostPlayerId },
      });
    } catch (e) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      const msg = e instanceof Error ? e.message : "حدث خطأ غير متوقع";
      console.error("[handleStartOnline]", e);
      setOnlineError(msg);
    } finally {
      setCreatingOnline(false);
    }
  };

  const isLastStep = step === settingsStep;
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
              {Array.from({ length: settingsStep }, (_, i) => i + 1).map((s) => (
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
              اسمك أنت (صاحب الجلسة)
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

        {/* Step 3: Team Assignment (team games only) */}
        {step === 3 && isTeamLocalGame && (
          <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={[styles.stepContent, { paddingBottom: 120 }]}
          >
            <Text style={[styles.fieldLabel, { color: colors.textMuted, marginBottom: 4 }]}>
              اختار مين مع مين
            </Text>
            <Text style={[styles.fieldHint, { color: colors.textDim, marginBottom: 20 }]}>
              اضغط على اسم اللاعب عشان تغير فريقه
            </Text>

            {/* Team columns */}
            <View style={{ flexDirection: "row-reverse", gap: 12, marginBottom: 24 }}>
              {[0, 1].map((teamIdx) => {
                const teamColor = teamIdx === 0 ? colors.gold : "#7C9FF7";
                const teamLabel = teamIdx === 0 ? "فريق أ ♠" : "فريق ب ♥";
                const memberNames = players
                  .map((n, i) => ({ name: n.trim() || `لاعب ${i + 1}`, idx: i }))
                  .filter((_, arrIdx) => {
                    const origIdx = arrIdx;
                    return (teamAssignment[origIdx] ?? 0) === teamIdx;
                  });
                return (
                  <View
                    key={teamIdx}
                    style={[
                      styles.teamCol,
                      { backgroundColor: colors.surface, borderColor: `${teamColor}44` },
                    ]}
                  >
                    <View style={[styles.teamColHeader, { backgroundColor: `${teamColor}22` }]}>
                      <Text style={[styles.teamColTitle, { color: teamColor }]}>{teamLabel}</Text>
                      <Text style={[styles.teamColCount, { color: colors.textDim }]}>
                        {memberNames.length} لاعبين
                      </Text>
                    </View>
                    {memberNames.length === 0 ? (
                      <Text style={[styles.teamEmptyHint, { color: colors.textDim }]}>
                        لا يوجد لاعبين
                      </Text>
                    ) : (
                      memberNames.map(({ name }) => (
                        <View
                          key={name}
                          style={[styles.teamMemberChip, { backgroundColor: `${teamColor}15` }]}
                        >
                          <Text style={[styles.teamMemberName, { color: colors.text }]}>
                            {name}
                          </Text>
                        </View>
                      ))
                    )}
                  </View>
                );
              })}
            </View>

            {/* Player toggle list */}
            <Text style={[styles.fieldLabel, { color: colors.textMuted, marginBottom: 10 }]}>
              اضغط للتبديل
            </Text>
            {players.map((name, i) => {
              const filled = name.trim() || `لاعب ${i + 1}`;
              const currentTeam = teamAssignment[i] ?? 0;
              const teamColor = currentTeam === 0 ? colors.gold : "#7C9FF7";
              const teamLabel = currentTeam === 0 ? "فريق أ ♠" : "فريق ب ♥";
              return (
                <TouchableOpacity
                  key={i}
                  onPress={() => {
                    Haptics.selectionAsync();
                    setTeamAssignment((prev) => {
                      const next = [...prev];
                      next[i] = prev[i] === 0 ? 1 : 0;
                      return next;
                    });
                  }}
                  style={[
                    styles.playerTeamRow,
                    {
                      backgroundColor: colors.surface,
                      borderColor: `${teamColor}55`,
                    },
                  ]}
                >
                  <View style={[styles.teamBadge, { backgroundColor: `${teamColor}22`, borderColor: teamColor }]}>
                    <Text style={[styles.teamBadgeText, { color: teamColor }]}>{teamLabel}</Text>
                  </View>
                  <Text style={[styles.playerTeamName, { color: colors.text }]}>{filled}</Text>
                  <Feather name="refresh-cw" size={14} color={colors.textDim} />
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        )}

        {/* Step 3/4: Settings */}
        {step === settingsStep && (
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
                {selectedGame?.lowerIsBetter
                  ? "تنتهي اللعبة بعد ٥ جولات — الأقل نقاطاً يفوز"
                  : "أول فريق/لاعب يوصل هذا الرقم يفوز"}
              </Text>
              {!selectedGame?.lowerIsBetter && (
                <View style={styles.targetRow}>
                  {(
                    (selectedGame?.id === "tarneeb" || selectedGame?.id === "tarneeb_sy")
                      ? [31, 41, 61]
                      : [
                          selectedGame?.defaultTarget ?? 41,
                          (selectedGame?.defaultTarget ?? 41) + 10,
                          (selectedGame?.defaultTarget ?? 41) + 20,
                        ]
                  ).map((val) => (
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
              )}
            </View>

            {/* ─── Game Rules ─────────────────────────────── */}
            {mode === "local" && selectedGame && (
              <View style={styles.settingBlock}>
                <Text style={[styles.settingLabel, { color: colors.text }]}>⚙️ قواعد اللعبة</Text>

                {/* Hand-specific rules */}
                {(selectedGame.id === "hand" || selectedGame.id === "hand_sy") && (
                  <View style={[styles.rulesCard, { backgroundColor: colors.surface }]}>
                    {/* Info: 5 rounds fixed */}
                    <View style={[styles.ruleRow, { borderBottomWidth: 1, borderBottomColor: colors.border }]}>
                      <View style={styles.ruleLeft}>
                        <Text style={[styles.ruleLabel, { color: colors.text }]}>عدد الجولات</Text>
                        <Text style={[styles.ruleDesc, { color: colors.textDim }]}>
                          {selectedGame.id === "hand" ? "الهاند ٥ جولات ثابتة — الأقل نقاطاً يفوز" : "الهاند السعودي ٥ جولات — أول نزال = ٥١+ نقطة"}
                        </Text>
                      </View>
                      <Text style={[styles.ruleStepBtnText, { color: colors.gold, fontFamily: Fonts.mono, fontSize: 20 }]}>٥</Text>
                    </View>

                    {/* Joker/A values info */}
                    <View style={styles.ruleRow}>
                      <View style={styles.ruleLeft}>
                        <Text style={[styles.ruleLabel, { color: colors.text }]}>قيمة الأوراق</Text>
                        <Text style={[styles.ruleDesc, { color: colors.textDim }]}>
                          {selectedGame.id === "hand_sy"
                            ? "جوكر: ١٥  |  A: ١١  |  ما نزّل: +١٠٠  |  نزال أول: أعلى من المنزل الأخير +١"
                            : "جوكر: ١٥  |  A: ١١  |  ما نزّل: +١٠٠  |  نزال أول: ٥١+ نقطة"}
                        </Text>
                      </View>
                    </View>
                  </View>
                )}

                {/* Tarneeb-specific rules */}
                {(selectedGame.id === "tarneeb" || selectedGame.id === "tarneeb_sy") && (
                  <View style={[styles.rulesCard, { backgroundColor: colors.surface }]}>
                    {/* Min bid */}
                    <View style={[styles.ruleRow, { borderBottomWidth: 1, borderBottomColor: colors.border }]}>
                      <View style={styles.ruleLeft}>
                        <Text style={[styles.ruleLabel, { color: colors.text }]}>أقل مزايدة مسموح</Text>
                        <Text style={[styles.ruleDesc, { color: colors.textDim }]}>
                          الحد الأدنى للمزايدة (الآن: {gameRules.minBid ?? 7})
                        </Text>
                      </View>
                      <View style={styles.ruleStepperRow}>
                        {[5, 6, 7, 8, 9].map((v) => (
                          <TouchableOpacity
                            key={v}
                            onPress={() => { setRule("minBid", v); Haptics.selectionAsync(); }}
                            style={[
                              styles.ruleStepBtn,
                              {
                                backgroundColor: (gameRules.minBid ?? 7) === v ? colors.gold : colors.surfaceRaised,
                                borderColor: (gameRules.minBid ?? 7) === v ? colors.gold : colors.border,
                              },
                            ]}
                          >
                            <Text style={[styles.ruleStepBtnText, { color: (gameRules.minBid ?? 7) === v ? colors.background : colors.textMuted }]}>
                              {v}
                            </Text>
                          </TouchableOpacity>
                        ))}
                      </View>
                    </View>

                    {/* Penalty on fail */}
                    <TouchableOpacity
                      onPress={() => { setRule("penaltyOnFail", !(gameRules.penaltyOnFail ?? true)); Haptics.selectionAsync(); }}
                      style={[styles.ruleRow, { borderBottomWidth: 1, borderBottomColor: colors.border }]}
                    >
                      <View style={styles.ruleLeft}>
                        <Text style={[styles.ruleLabel, { color: colors.text }]}>عقوبة الفشل</Text>
                        <Text style={[styles.ruleDesc, { color: colors.textDim }]}>
                          {(gameRules.penaltyOnFail ?? true) ? "تُخصم قيمة المزايدة عند الفشل" : "لا تُخصم نقاط عند الفشل"}
                        </Text>
                      </View>
                      <View style={[styles.toggleSwitch, { backgroundColor: (gameRules.penaltyOnFail ?? true) ? colors.gold : colors.border }]}>
                        <View style={[styles.toggleThumb, {
                          backgroundColor: colors.background,
                          alignSelf: (gameRules.penaltyOnFail ?? true) ? "flex-end" : "flex-start",
                        }]} />
                      </View>
                    </TouchableOpacity>

                    {/* Double bid */}
                    <TouchableOpacity
                      onPress={() => { setRule("doubleBid", !gameRules.doubleBid); Haptics.selectionAsync(); }}
                      style={styles.ruleRow}
                    >
                      <View style={styles.ruleLeft}>
                        <Text style={[styles.ruleLabel, { color: colors.text }]}>نقطة مضاعفة</Text>
                        <Text style={[styles.ruleDesc, { color: colors.textDim }]}>
                          {gameRules.doubleBid ? "ضعف النقاط عند تحقيق المزايدة بالضبط ✓" : "لا تضاعف"}
                        </Text>
                      </View>
                      <View style={[styles.toggleSwitch, { backgroundColor: gameRules.doubleBid ? colors.gold : colors.border }]}>
                        <View style={[styles.toggleThumb, {
                          backgroundColor: colors.background,
                          alignSelf: gameRules.doubleBid ? "flex-end" : "flex-start",
                        }]} />
                      </View>
                    </TouchableOpacity>
                  </View>
                )}

                {/* Max rounds — all games */}
                <View style={[styles.rulesCard, { backgroundColor: colors.surface }]}>
                  <View style={styles.ruleRow}>
                    <View style={styles.ruleLeft}>
                      <Text style={[styles.ruleLabel, { color: colors.text }]}>حد الجولات</Text>
                      <Text style={[styles.ruleDesc, { color: colors.textDim }]}>
                        تنتهي اللعبة بعد عدد معين من الجولات
                      </Text>
                    </View>
                    <View style={styles.ruleStepperRow}>
                      {[0, 5, 10, 15, 20].map((v) => (
                        <TouchableOpacity
                          key={v}
                          onPress={() => { setRule("maxRounds", v); Haptics.selectionAsync(); }}
                          style={[
                            styles.ruleStepBtn,
                            {
                              backgroundColor: (gameRules.maxRounds ?? 0) === v ? colors.gold : colors.surfaceRaised,
                              borderColor: (gameRules.maxRounds ?? 0) === v ? colors.gold : colors.border,
                            },
                          ]}
                        >
                          <Text style={[styles.ruleStepBtnText, { color: (gameRules.maxRounds ?? 0) === v ? colors.background : colors.textMuted }]}>
                            {v === 0 ? "∞" : v}
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  </View>
                </View>
              </View>
            )}

            {/* Objection system toggle */}
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
                    🚨 نظام الاعتراض
                  </Text>
                  <Text style={[styles.toggleDesc, { color: colors.textMuted }]}>
                    زر اعتراض خفيف — أي لاعب يضغطه لو حس في غش
                  </Text>
                </View>
              </View>
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
          {onlineError && (
            <View style={styles.errorBanner}>
              <Feather name="alert-circle" size={14} color="#FF6B6B" />
              <Text style={styles.errorBannerText}>{onlineError}</Text>
            </View>
          )}
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
  acTimeoutRow: { flexDirection: "row-reverse", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 16, paddingVertical: 12, borderTopWidth: 1 },
  acTimeoutLabel: { fontFamily: Fonts.body, fontSize: 13 },
  // Game rules section
  rulesCard: { borderRadius: 16, overflow: "hidden", marginTop: 8 },
  ruleRow: { flexDirection: "row-reverse", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 16, paddingVertical: 14, gap: 10 },
  ruleLeft: { flex: 1, gap: 3 },
  ruleLabel: { fontFamily: Fonts.heading, fontSize: 15, textAlign: "right" },
  ruleDesc: { fontFamily: Fonts.body, fontSize: 12, textAlign: "right" },
  ruleStepperRow: { flexDirection: "row", gap: 5 },
  ruleStepBtn: { width: 34, height: 34, borderRadius: 9, borderWidth: 1.5, alignItems: "center", justifyContent: "center" },
  ruleStepBtnText: { fontFamily: Fonts.mono, fontSize: 13 },
  // Team assignment step
  teamCol: { flex: 1, borderRadius: 16, borderWidth: 1.5, overflow: "hidden" },
  teamColHeader: { paddingVertical: 10, paddingHorizontal: 12, alignItems: "center", gap: 2 },
  teamColTitle: { fontFamily: Fonts.heading, fontSize: 16, textAlign: "center" },
  teamColCount: { fontFamily: Fonts.body, fontSize: 11, textAlign: "center" },
  teamEmptyHint: { fontFamily: Fonts.body, fontSize: 12, textAlign: "center", paddingVertical: 14 },
  teamMemberChip: { marginHorizontal: 8, marginBottom: 6, borderRadius: 10, paddingVertical: 8, paddingHorizontal: 10, alignItems: "center" },
  teamMemberName: { fontFamily: Fonts.heading, fontSize: 14, textAlign: "center" },
  playerTeamRow: { flexDirection: "row-reverse", alignItems: "center", borderRadius: 14, borderWidth: 1.5, paddingHorizontal: 14, paddingVertical: 12, marginBottom: 8, gap: 10 },
  playerTeamName: { fontFamily: Fonts.heading, fontSize: 16, flex: 1, textAlign: "right" },
  teamBadge: { borderRadius: 8, borderWidth: 1, paddingHorizontal: 8, paddingVertical: 4 },
  teamBadgeText: { fontFamily: Fonts.body, fontSize: 12 },
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
  errorBanner: {
    flexDirection: "row-reverse",
    alignItems: "center",
    gap: 6,
    backgroundColor: "rgba(255,107,107,0.12)",
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: "rgba(255,107,107,0.3)",
  },
  errorBannerText: {
    fontFamily: Fonts.body,
    fontSize: 13,
    color: "#FF6B6B",
    flex: 1,
    textAlign: "right",
  },
});
