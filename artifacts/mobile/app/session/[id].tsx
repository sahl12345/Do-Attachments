import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { useKeepAwake } from "expo-keep-awake";
import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Alert,
  Animated,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { ConfettiBurst } from "@/components/ConfettiBurst";
import { PlayerScoreCard } from "@/components/PlayerScoreCard";
import { ScoreEntryModal } from "@/components/ScoreEntryModal";
import { Fonts } from "@/constants/fonts";
import { getGameById } from "@/constants/games";
import {
  Round,
  Session,
  generateId,
  getTotalScore,
  useApp,
} from "@/contexts/AppContext";
import {
  OnlineSessionData,
  addOnlineRound,
  completeOnlineSession,
  getOnlineSession,
  startOnlineSession,
  undoOnlineRound,
} from "@/services/onlineSession";
import { useColors } from "@/hooks/useColors";

// ─── helpers ────────────────────────────────────────────────────────────────

function getOnlineTotalScore(session: OnlineSessionData, playerId: string) {
  return session.rounds.reduce((s, r) => s + (r.scores[playerId] ?? 0), 0);
}

function checkOnlineWinner(session: OnlineSessionData): string | null {
  const game = getGameById(session.gameId);
  if (!game || game.defaultTarget === 0) return null;
  if (game.lowerIsBetter) {
    const elim = session.players.find(
      (p) =>
        getOnlineTotalScore(session, p.id) >=
        (game.eliminationScore ?? game.defaultTarget)
    );
    return elim?.id ?? null;
  }
  const winner = session.players.find(
    (p) => getOnlineTotalScore(session, p.id) >= session.targetScore
  );
  return winner?.id ?? null;
}


// ─── Levantine win phrases ────────────────────────────────────────────────────
const WIN_PHRASES = [
  "لطش يا زلمة 👑",
  "هالمرة جت لك يا بطل 😎",
  "ملك اللطش! يا شيخ يا أسطورة",
  "فزت والباقي يبكوا 🏆",
  "يا سلام يا قاتل ♛",
  "هالشهر أنت الـ GOAT 👑",
  "الله يبارك فيك يا بطل",
];

// ─── Code display boxes ──────────────────────────────────────────────────────
function CodeDisplay({ code, colors }: { code: string; colors: any }) {
  return (
    <View style={codeStyles.row}>
      {code.split("").map((d, i) => (
        <View
          key={i}
          style={[codeStyles.box, { backgroundColor: colors.surfaceRaised, borderColor: colors.gold }]}
        >
          <Text style={[codeStyles.digit, { color: colors.gold }]}>{d}</Text>
        </View>
      ))}
    </View>
  );
}

const codeStyles = StyleSheet.create({
  row: { flexDirection: "row", gap: 8, justifyContent: "center" },
  box: {
    width: 46,
    height: 58,
    borderRadius: 12,
    borderWidth: 1.5,
    alignItems: "center",
    justifyContent: "center",
  },
  digit: { fontFamily: "IBMPlexMono_400Regular", fontSize: 26 },
});

// ─── Main screen ─────────────────────────────────────────────────────────────
export default function SessionScreen() {
  const colors = useColors();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { id, hostKey, playerId } = useLocalSearchParams<{
    id: string;
    hostKey?: string;
    playerId?: string;
  }>();
  const { sessions, updateSession } = useApp();

  const isOnline = !!(hostKey || playerId);
  const isHost = !!hostKey;
  const code = isOnline ? id : undefined;

  // Mandatory: keep screen awake during active session
  useKeepAwake();

  const [showScoreModal, setShowScoreModal] = useState(false);
  const [showWinner, setShowWinner] = useState(false);
  const [onlineSession, setOnlineSession] = useState<OnlineSessionData | null>(null);
  const [startingOnline, setStartingOnline] = useState(false);
  const winnerAnim = useRef(new Animated.Value(0)).current;
  const webTop = Platform.OS === "web" ? 67 : 0;

  // AC flash overlay
  const acFlashAnim = useRef(new Animated.Value(0)).current;
  const [acFlashColor, setAcFlashColor] = useState<"green" | "red">("green");
  // Objection system
  const [showObjectionModal, setShowObjectionModal] = useState(false);
  const [objectorName, setObjectorName] = useState<string | null>(null);
  const [objectionBanner, setObjectionBanner] = useState<string | null>(null);
  const objectionTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Debt tracker
  const [paidSet, setPaidSet] = useState<Set<string>>(new Set());

  // ── local session ──────────────────────────────────────────────────────────
  const localSession = !isOnline ? sessions.find((s) => s.id === id) : undefined;
  const localGame = localSession ? getGameById(localSession.gameId) : null;


  useEffect(() => {
    if (showWinner) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      Animated.spring(winnerAnim, {
        toValue: 1,
        useNativeDriver: true,
        damping: 12,
        stiffness: 180,
      }).start();
    }
  }, [showWinner, winnerAnim]);

  // ── LOCAL GAME LOGIC ───────────────────────────────────────────────────────
  const playerScores = useMemo(() => {
    if (!localSession) return [];
    return localSession.players.map((p) => ({
      player: p,
      total: getTotalScore(localSession, p.id),
      lastDelta: localSession.rounds.length > 0
        ? (localSession.rounds[localSession.rounds.length - 1].scores[p.id] ?? 0)
        : undefined,
    }));
  }, [localSession]);

  const getLocalWinnerId = (s: Session): string | null => {
    if (!localGame || localGame.defaultTarget === 0) return null;
    const maxRounds = s.rules?.maxRounds ?? 0;
    // maxRounds end: find best scorer
    if (maxRounds > 0 && s.rounds.length >= maxRounds) {
      const scored = s.players.map((p) => ({ id: p.id, total: getTotalScore(s, p.id) }));
      if (localGame.lowerIsBetter) {
        return scored.reduce((a, b) => a.total <= b.total ? a : b).id;
      }
      return scored.reduce((a, b) => a.total >= b.total ? a : b).id;
    }
    if (localGame.lowerIsBetter) {
      const elim = s.players.find(
        (p) => getTotalScore(s, p.id) >= (localGame.eliminationScore ?? s.targetScore)
      );
      return elim?.id ?? null;
    }
    const winner = s.players.find(
      (p) => getTotalScore(s, p.id) >= s.targetScore
    );
    return winner?.id ?? null;
  };

  const _commitLocalRound = useCallback((scores: Record<string, number>) => {
    if (!localSession) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    const round: Round = { id: generateId(), scores, timestamp: Date.now() };
    const updatedRounds = [...localSession.rounds, round];
    const updatedSession: Session = { ...localSession, rounds: updatedRounds };
    const winnerId = getLocalWinnerId(updatedSession);
    if (winnerId) {
      updateSession(localSession.id, { ...updatedSession, winnerId, completedAt: Date.now() });
      setTimeout(() => setShowWinner(true), 300);
    } else {
      updateSession(localSession.id, updatedSession);
    }
  }, [localSession, updateSession, getLocalWinnerId]);

  const doAcFlash = useCallback(() => {
    setAcFlashColor("green");
    Animated.sequence([
      Animated.timing(acFlashAnim, { toValue: 1, duration: 120, useNativeDriver: true }),
      Animated.timing(acFlashAnim, { toValue: 0, duration: 500, useNativeDriver: true }),
    ]).start();
  }, [acFlashAnim]);

  const handleObjection = useCallback((roundLabel: string) => {
    const name = objectorName ?? "لاعب";
    const msg = `⚠️ ${name} اعترض على ${roundLabel}`;
    setObjectionBanner(msg);
    setShowObjectionModal(false);
    setObjectorName(null);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
    if (objectionTimerRef.current) clearTimeout(objectionTimerRef.current);
    objectionTimerRef.current = setTimeout(() => setObjectionBanner(null), 6000);
  }, [objectorName]);

  const handleAddLocalRound = (scores: Record<string, number>) => {
    if (!localSession) return;
    setShowScoreModal(false);
    doAcFlash();
    _commitLocalRound(scores);
  };

  const handleUndoLocal = () => {
    if (!localSession || localSession.rounds.length === 0) return;
    Alert.alert("تراجع عن الجولة الأخيرة", "هل تريد حذف الجولة الأخيرة؟", [
      { text: "إلغاء", style: "cancel" },
      {
        text: "تراجع",
        style: "destructive",
        onPress: () => {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
          updateSession(localSession.id, {
            rounds: localSession.rounds.slice(0, -1),
            completedAt: undefined,
            winnerId: undefined,
          });
          setShowWinner(false);
        },
      },
    ]);
  };

  // ── ONLINE GAME LOGIC ──────────────────────────────────────────────────────
  const handleStartOnline = async () => {
    if (!code || !hostKey) return;
    setStartingOnline(true);
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      const data = await startOnlineSession(code, hostKey);
      setOnlineSession(data);
    } catch (_e) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    } finally {
      setStartingOnline(false);
    }
  };

  // Current player ID — either host key or joined player id
  const myOnlinePlayerId = hostKey ?? playerId;

  // ── online polling ──────────────────────────────────────────────────────────
  const syncOnline = useCallback(async () => {
    if (!code) return;
    try {
      const data = await getOnlineSession(code);
      setOnlineSession((prev) => {
        if (!prev?.completedAt && data.completedAt && data.winnerId) {
          setTimeout(() => setShowWinner(true), 300);
        }
        return data;
      });
    } catch (_e) {}
  }, [code]);

  useEffect(() => {
    if (!isOnline) return;
    syncOnline();
    const interval = setInterval(syncOnline, 2000);
    return () => clearInterval(interval);
  }, [isOnline, syncOnline]);


  const handleAddOnlineRound = async (scores: Record<string, number>) => {
    if (!code || !myOnlinePlayerId || !onlineSession) return;
    setShowScoreModal(false);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    try {
      const data = await addOnlineRound(code, myOnlinePlayerId, scores);
      const winnerId = checkOnlineWinner(data);
      if (winnerId) {
        const completed = await completeOnlineSession(code, myOnlinePlayerId, winnerId);
        setOnlineSession(completed);
        setTimeout(() => setShowWinner(true), 300);
      } else {
        setOnlineSession(data);
      }
    } catch (_e) {}
  };

  const handleUndoOnline = () => {
    if (!code || !hostKey || !onlineSession || onlineSession.rounds.length === 0) return;
    Alert.alert("تراجع عن الجولة الأخيرة", "هل تريد حذف الجولة الأخيرة؟", [
      { text: "إلغاء", style: "cancel" },
      {
        text: "تراجع",
        style: "destructive",
        onPress: async () => {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
          try {
            const data = await undoOnlineRound(code, hostKey);
            setOnlineSession(data);
            setShowWinner(false);
          } catch (_e) {}
        },
      },
    ]);
  };

  // ── RENDER ─────────────────────────────────────────────────────────────────

  // Error: session not found
  if (!isOnline && !localSession) {
    return (
      <View style={[styles.center, { backgroundColor: colors.background }]}>
        <Text style={[styles.errorText, { color: colors.textMuted }]}>
          ما لقينا الجلسة
        </Text>
        <TouchableOpacity
          onPress={() => router.back()}
          style={[styles.backBtn, { backgroundColor: colors.surface }]}
        >
          <Text style={[styles.backBtnText, { color: colors.text }]}>ارجع</Text>
        </TouchableOpacity>
      </View>
    );
  }

  // ── ONLINE: LOBBY / WAITING ─────────────────────────────────────────────
  if (isOnline && (!onlineSession?.startedAt)) {
    const sessionCode = code ?? "";
    const players = onlineSession?.players ?? [];
    const gameName = onlineSession ? getGameById(onlineSession.gameId)?.name : "...";
    const myPlayer = players.find((p) => p.id === playerId);
    const canStart = isHost && players.length >= 2;

    return (
      <View
        style={[
          styles.container,
          { backgroundColor: colors.background },
        ]}
      >
        <View style={[styles.header, { paddingTop: insets.top + webTop + 8 }]}>
          <View style={{ width: 24 }} />
          <Text style={[styles.gameName, { color: colors.gold }]}>
            {gameName ?? "جلسة مشتركة"}
          </Text>
          <TouchableOpacity
            onPress={() => router.back()}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Feather name="arrow-right" size={24} color={colors.text} />
          </TouchableOpacity>
        </View>

        <ScrollView
          contentContainerStyle={[
            styles.lobbyContent,
            {
              paddingBottom: insets.bottom + 120 + (Platform.OS === "web" ? 34 : 0),
            },
          ]}
          showsVerticalScrollIndicator={false}
        >
          {isHost ? (
            <>
              <Text style={[styles.lobbyTitle, { color: colors.text }]}>
                شارك الكود مع أصحابك
              </Text>
              <CodeDisplay code={sessionCode} colors={colors} />
              <Text style={[styles.lobbyHint, { color: colors.textMuted }]}>
                الكل يضغط "انضم بكود" من الرئيسية ويدخل الأرقام هذه
              </Text>
            </>
          ) : (
            <View
              style={[
                styles.waitingBox,
                { backgroundColor: colors.surface },
              ]}
            >
              <Feather name="loader" size={28} color={colors.gold} />
              <Text style={[styles.waitingText, { color: colors.text }]}>
                انتظر لحظة على صاحب الجلسة يبدأ…
              </Text>
              {myPlayer && (
                <Text style={[styles.waitingName, { color: colors.textMuted }]}>
                  أنت: {myPlayer.name}
                </Text>
              )}
            </View>
          )}

          <View style={[styles.playersBox, { backgroundColor: colors.surface }]}>
            <Text style={[styles.playersBoxTitle, { color: colors.textMuted }]}>
              اللاعبين ({players.length})
            </Text>
            {players.length === 0 ? (
              <Text style={[styles.noPlayersText, { color: colors.textDim }]}>
                انتظر اتصال اللاعبين...
              </Text>
            ) : (
              players.map((p) => (
                <View key={p.id} style={styles.playerRow}>
                  <View style={styles.playerRowLeft}>
                    {p.isHost && (
                      <View
                        style={[
                          styles.hostBadge,
                          { backgroundColor: `${colors.gold}33` },
                        ]}
                      >
                        <Text
                          style={[styles.hostBadgeText, { color: colors.gold }]}
                        >
                          مضيف
                        </Text>
                      </View>
                    )}
                    {p.id === playerId && (
                      <Feather name="user" size={14} color={colors.textDim} />
                    )}
                  </View>
                  <Text style={[styles.playerRowName, { color: colors.text }]}>
                    {p.name}
                  </Text>
                </View>
              ))
            )}
          </View>
        </ScrollView>

        {isHost && (
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
            <TouchableOpacity
              onPress={handleStartOnline}
              disabled={!canStart || startingOnline}
              style={[
                styles.startBtn,
                {
                  backgroundColor: canStart ? colors.gold : colors.surfaceRaised,
                },
              ]}
            >
              <Feather
                name="play"
                size={20}
                color={canStart ? colors.background : colors.textDim}
              />
              <Text
                style={[
                  styles.startBtnText,
                  { color: canStart ? colors.background : colors.textDim },
                ]}
              >
                {players.length < 2
                  ? "انتظر لاعبين (٢ على الأقل)"
                  : "ابدأ الجلسة"}
              </Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
    );
  }

  // ── SESSION PLAYING (local or online started) ─────────────────────────────

  const session = isOnline ? onlineSession : localSession;
  const game = session ? getGameById(session.gameId) : null;
  const sessionPlayers = session?.players ?? [];
  const sessionRounds = session?.rounds ?? [];
  const sessionWinnerId = session?.completedAt ? session.winnerId : undefined;

  const scoredPlayers = sessionPlayers.map((p) => {
    const total = isOnline
      ? getOnlineTotalScore(onlineSession!, p.id)
      : getTotalScore(localSession!, p.id);
    const lastRound = sessionRounds[sessionRounds.length - 1];
    const lastDelta = lastRound ? (lastRound.scores[p.id] ?? 0) : undefined;
    return { player: p, total, lastDelta };
  });

  const winnerPlayer = sessionWinnerId
    ? sessionPlayers.find((p) => p.id === sessionWinnerId)
    : null;

  // Any player in the online session can record rounds
  const canAddRound = isOnline
    ? !!onlineSession && onlineSession.players.some((p) => p.id === myOnlinePlayerId)
    : true;
  const isComplete = !!(session?.completedAt);
  const isFourPlayer = sessionPlayers.length === 4;
  const isTwoPlayer = sessionPlayers.length === 2;

  const handleAddRound = (scores: Record<string, number>) => {
    if (isOnline) handleAddOnlineRound(scores);
    else handleAddLocalRound(scores);
  };

  const handleUndo = () => {
    if (isOnline) handleUndoOnline();
    else handleUndoLocal();
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { paddingTop: insets.top + webTop + 8 }]}>
        <View style={styles.headerActions}>
          {sessionRounds.length > 0 && !isComplete && canAddRound && (
            <TouchableOpacity
              onPress={handleUndo}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <Feather name="rotate-ccw" size={20} color={colors.textMuted} />
            </TouchableOpacity>
          )}
          {!isComplete && (session?.antiCheat ?? true) && sessionRounds.length > 0 && (
            <TouchableOpacity
              onPress={() => {
                setShowObjectionModal(true);
                setObjectorName(null);
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
              }}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              style={[styles.objectionBtn, { backgroundColor: `${colors.red}20`, borderColor: `${colors.red}44` }]}
            >
              <Text style={styles.objectionBtnText}>🚨</Text>
            </TouchableOpacity>
          )}
        </View>

        <View style={styles.headerCenter}>
          <Text style={[styles.gameName, { color: colors.gold }]}>
            {game?.name ?? "جلسة"}
          </Text>
          <View style={styles.headerMeta}>
            {isOnline && (
              <View
                style={[
                  styles.onlineBadge,
                  { backgroundColor: `${colors.gold}22` },
                ]}
              >
                <Feather name="wifi" size={11} color={colors.gold} />
                <Text style={[styles.onlineBadgeText, { color: colors.gold }]}>
                  {code}
                </Text>
              </View>
            )}
            <Text style={[styles.roundLabel, { color: colors.textMuted }]}>
              {isComplete ? "انتهت" : `جولة ${sessionRounds.length + 1}`}
            </Text>
          </View>
        </View>

        <TouchableOpacity
          onPress={() => router.back()}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Feather name="arrow-right" size={24} color={colors.text} />
        </TouchableOpacity>
      </View>

      {game && game.defaultTarget > 0 && (
        <View style={[styles.targetBar, { backgroundColor: colors.surface }]}>
          <Text style={[styles.targetText, { color: colors.textMuted }]}>
            الهدف:{" "}
            <Text style={{ color: colors.gold, fontFamily: Fonts.mono }}>
              {session?.targetScore ?? game.defaultTarget}
            </Text>
          </Text>
          <Text style={[styles.targetText, { color: colors.textMuted }]}>
            {game.lowerIsBetter ? "أقل نقاط يفوز" : "أعلى نقاط يفوز"}
          </Text>
        </View>
      )}

      {isOnline && !isComplete && (
        <View
          style={[
            styles.watcherBanner,
            { backgroundColor: `${colors.gold}15`, borderColor: `${colors.gold}30` },
          ]}
        >
          <Feather name="wifi" size={14} color={colors.gold} />
          <Text style={[styles.watcherText, { color: colors.gold }]}>
            {isHost ? "أنت صاحب الجلسة 👑" : "أي لاعب يقدر يسجّل الجولة"}
          </Text>
        </View>
      )}

      {objectionBanner && (
        <View style={[styles.objectionBannerBox, { backgroundColor: `${colors.red}20`, borderColor: `${colors.red}55` }]}>
          <Text style={[styles.objectionBannerText, { color: colors.red }]}>{objectionBanner}</Text>
        </View>
      )}

      {/* AC flash overlay */}
      <Animated.View
        style={[
          styles.acFlashOverlay,
          {
            backgroundColor: acFlashColor === "green" ? colors.success : colors.red,
            opacity: acFlashAnim,
          },
        ]}
      />

      <ScrollView
        contentContainerStyle={[
          styles.scoresContainer,
          {
            paddingBottom:
              insets.bottom + 120 + (Platform.OS === "web" ? 34 : 0),
          },
        ]}
        showsVerticalScrollIndicator={false}
      >
        {isFourPlayer ? (
          <>
            <View style={styles.scoreRow}>
              {[scoredPlayers[0], scoredPlayers[1]].map(
                (ps, idx) =>
                  ps && (
                    <PlayerScoreCard
                      key={ps.player.id}
                      name={ps.player.name}
                      score={ps.total}
                      lastDelta={sessionRounds.length > 0 ? ps.lastDelta : undefined}
                      isWinner={sessionWinnerId === ps.player.id}
                      teamLabel={game?.isTeam ? (idx === 0 ? "فريق أ ♠" : "فريق ب ♥") : undefined}
                    />
                  )
              )}
            </View>
            <View style={styles.scoreRow}>
              {[scoredPlayers[2], scoredPlayers[3]].map(
                (ps, idx) =>
                  ps && (
                    <PlayerScoreCard
                      key={ps.player.id}
                      name={ps.player.name}
                      score={ps.total}
                      lastDelta={sessionRounds.length > 0 ? ps.lastDelta : undefined}
                      isWinner={sessionWinnerId === ps.player.id}
                      teamLabel={game?.isTeam ? (idx === 0 ? "فريق أ ♠" : "فريق ب ♥") : undefined}
                    />
                  )
              )}
            </View>
          </>
        ) : (
          <View style={isTwoPlayer ? styles.scoreRow : styles.scoreCol}>
            {scoredPlayers.map((ps) => (
              <PlayerScoreCard
                key={ps.player.id}
                name={ps.player.name}
                score={ps.total}
                lastDelta={sessionRounds.length > 0 ? ps.lastDelta : undefined}
                isWinner={sessionWinnerId === ps.player.id}
                isEliminated={
                  game?.eliminationScore
                    ? ps.total >= game.eliminationScore
                    : false
                }
              />
            ))}
          </View>
        )}

        {sessionRounds.length > 0 && (
          <View style={styles.roundsSection}>
            <Text style={[styles.roundsTitle, { color: colors.textMuted }]}>
              سجل الجولات
            </Text>
            {[...sessionRounds].reverse().map((round, i) => (
              <View
                key={round.id}
                style={[styles.roundRow, { backgroundColor: colors.surface }]}
              >
                <Text
                  style={[
                    styles.roundNum,
                    { color: colors.textDim, fontFamily: Fonts.mono },
                  ]}
                >
                  #{sessionRounds.length - i}
                </Text>
                <View style={styles.roundScores}>
                  {sessionPlayers.map((p) => (
                    <View key={p.id} style={styles.roundScoreItem}>
                      <Text
                        style={[
                          styles.roundDelta,
                          {
                            color:
                              (round.scores[p.id] ?? 0) >= 0
                                ? colors.success
                                : colors.red,
                            fontFamily: Fonts.mono,
                          },
                        ]}
                      >
                        {(round.scores[p.id] ?? 0) >= 0
                          ? `+${round.scores[p.id] ?? 0}`
                          : `${round.scores[p.id] ?? 0}`}
                      </Text>
                      <Text
                        style={[
                          styles.roundPlayerName,
                          { color: colors.textDim },
                        ]}
                        numberOfLines={1}
                      >
                        {p.name}
                      </Text>
                    </View>
                  ))}
                </View>
              </View>
            ))}
          </View>
        )}
      </ScrollView>

      {!isComplete && canAddRound && (
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
          <TouchableOpacity
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              setShowScoreModal(true);
            }}
            style={[styles.addRoundBtn, { backgroundColor: colors.gold }]}
          >
            <Feather name="plus" size={22} color={colors.background} />
            <Text style={[styles.addRoundText, { color: colors.background }]}>
              إضافة جولة
            </Text>
          </TouchableOpacity>
        </View>
      )}

      <ScoreEntryModal
        visible={showScoreModal}
        players={sessionPlayers as { id: string; name: string }[]}
        roundNumber={sessionRounds.length + 1}
        gameId={session?.gameId}
        rules={localSession?.rules}
        onClose={() => setShowScoreModal(false)}
        onSubmit={handleAddRound}
      />

      {/* Objection modal */}
      <Modal visible={showObjectionModal} animationType="fade" transparent statusBarTranslucent>
        <View style={styles.acOverlay}>
          <View style={[styles.acCard, { backgroundColor: colors.surfaceHigh, borderColor: `${colors.red}88` }]}>
            <Text style={styles.acEmoji}>🚨</Text>
            <Text style={[styles.acTitle, { color: colors.text }]}>اعتراض</Text>

            {!objectorName ? (
              <>
                <Text style={[styles.acMsg, { color: colors.textMuted }]}>مين بيعترض؟</Text>
                <View style={styles.acScores}>
                  {sessionPlayers.map((p) => (
                    <TouchableOpacity
                      key={p.id}
                      onPress={() => { setObjectorName(p.name); Haptics.selectionAsync(); }}
                      style={[styles.acBtn, { backgroundColor: colors.surface, borderColor: colors.borderStrong, width: "100%" }]}
                    >
                      <Text style={[styles.acBtnText, { color: colors.text }]}>{p.name}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </>
            ) : (
              <>
                <Text style={[styles.acMsg, { color: colors.textMuted }]}>على أي جولة؟</Text>
                <View style={styles.acBtns}>
                  {sessionRounds.length >= 1 && (
                    <TouchableOpacity
                      onPress={() => handleObjection(`الجولة ${sessionRounds.length}`)}
                      style={[styles.acBtn, { flex: 1, backgroundColor: `${colors.red}22`, borderColor: `${colors.red}55` }]}
                    >
                      <Text style={[styles.acBtnText, { color: colors.red }]}>آخر جولة</Text>
                      <Text style={[styles.acBtnCount, { color: colors.red }]}>#{sessionRounds.length}</Text>
                    </TouchableOpacity>
                  )}
                  {sessionRounds.length >= 2 && (
                    <TouchableOpacity
                      onPress={() => handleObjection(`الجولة ${sessionRounds.length - 1}`)}
                      style={[styles.acBtn, { flex: 1, backgroundColor: `${colors.red}22`, borderColor: `${colors.red}55` }]}
                    >
                      <Text style={[styles.acBtnText, { color: colors.red }]}>قبلها</Text>
                      <Text style={[styles.acBtnCount, { color: colors.red }]}>#{sessionRounds.length - 1}</Text>
                    </TouchableOpacity>
                  )}
                </View>
              </>
            )}

            <TouchableOpacity
              onPress={() => { setShowObjectionModal(false); setObjectorName(null); }}
              style={[styles.acBtn, { backgroundColor: colors.surface, borderColor: colors.border, width: "100%", marginTop: 4 }]}
            >
              <Text style={[styles.acBtnText, { color: colors.textMuted }]}>إلغاء</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      <Modal visible={showWinner} animationType="none" transparent statusBarTranslucent>
        <View style={styles.winnerOverlay}>
          <ConfettiBurst active={showWinner} />
          <Animated.View
            style={[styles.winnerCard, {
              backgroundColor: colors.surfaceHigh,
              borderColor: colors.gold,
              transform: [{ scale: winnerAnim.interpolate({ inputRange: [0, 1], outputRange: [0.5, 1] }) }],
              opacity: winnerAnim,
            }]}
          >
            <Text style={styles.winnerEmoji}>♛</Text>
            <Text style={[styles.winnerName, { color: colors.gold }]}>
              {winnerPlayer?.name ?? "الفائز"}
            </Text>
            <Text style={[styles.winnerMsg, { color: colors.gold }]}>
              {WIN_PHRASES[sessionRounds.length % WIN_PHRASES.length]}
            </Text>
            <View style={[styles.winnerStats, { backgroundColor: colors.surface }]}>
              <View style={styles.winnerStatItem}>
                <Text style={[styles.winnerStatVal, { color: colors.text, fontFamily: "IBMPlexMono_400Regular" }]}>
                  {sessionRounds.length}
                </Text>
                <Text style={[styles.winnerStatLabel, { color: colors.textMuted }]}>جولة</Text>
              </View>
              <View style={[styles.winnerStatDivider, { backgroundColor: colors.border }]} />
              <View style={styles.winnerStatItem}>
                <Text style={[styles.winnerStatVal, { color: colors.gold, fontFamily: "IBMPlexMono_400Regular" }]}>
                  {scoredPlayers.find((p) => p.player.id === sessionWinnerId)?.total ?? 0}
                </Text>
                <Text style={[styles.winnerStatLabel, { color: colors.textMuted }]}>نقطة</Text>
              </View>
            </View>

            {/* Debt summary — local sessions only */}
            {localSession?.debtPerPoint && localSession.debtPerPoint > 0 && sessionWinnerId && (
              <View style={[styles.debtSection, { backgroundColor: colors.surface }]}>
                <Text style={[styles.debtTitle, { color: colors.textMuted }]}>💸 الحسابات</Text>
                {scoredPlayers
                  .filter((p) => p.player.id !== sessionWinnerId)
                  .map((p) => {
                    const winnerTotal = scoredPlayers.find((x) => x.player.id === sessionWinnerId)?.total ?? 0;
                    const diff = Math.abs(winnerTotal - p.total);
                    const amount = (diff * (localSession.debtPerPoint ?? 0)).toFixed(2);
                    const paid = paidSet.has(p.player.id);
                    return (
                      <TouchableOpacity
                        key={p.player.id}
                        onPress={() => {
                          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                          setPaidSet((prev) => {
                            const next = new Set(prev);
                            if (next.has(p.player.id)) next.delete(p.player.id);
                            else next.add(p.player.id);
                            return next;
                          });
                        }}
                        style={[styles.debtRow, { opacity: paid ? 0.5 : 1 }]}
                      >
                        <Text style={[styles.debtPaid, { color: paid ? colors.gold : colors.textDim }]}>
                          {paid ? "✅ تم" : "اضغط"}
                        </Text>
                        <Text style={[styles.debtText, { color: paid ? colors.textDim : colors.text }]}>
                          <Text style={{ color: colors.red }}>{p.player.name}</Text>
                          {" يدفع "}
                          <Text style={{ color: colors.gold, fontFamily: "IBMPlexMono_400Regular" }}>{amount}</Text>
                          {" دينار لـ "}
                          <Text style={{ color: colors.gold }}>{winnerPlayer?.name}</Text>
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
              </View>
            )}

            <View style={styles.winnerBtns}>
              <TouchableOpacity
                onPress={() => setShowWinner(false)}
                style={[styles.winnerSecBtn, { borderColor: colors.borderStrong }]}
              >
                <Text style={[styles.winnerSecText, { color: colors.textMuted }]}>ابقَ هنا</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => { setShowWinner(false); router.replace("/(tabs)"); }}
                style={[styles.winnerPrimaryBtn, { backgroundColor: colors.gold }]}
              >
                <Text style={[styles.winnerPrimaryText, { color: colors.background }]}>🃏 جلسة جديدة</Text>
              </TouchableOpacity>
            </View>
          </Animated.View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 16,
  },
  errorText: { fontFamily: "Tajawal_400Regular", fontSize: 18, textAlign: "center" },
  backBtn: { paddingHorizontal: 24, paddingVertical: 12, borderRadius: 12 },
  backBtnText: { fontFamily: "Cairo_700Bold", fontSize: 16 },
  header: {
    flexDirection: "row-reverse",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingBottom: 12,
  },
  headerCenter: { alignItems: "center", gap: 4 },
  headerActions: { width: 44, alignItems: "flex-start" },
  headerMeta: { flexDirection: "row-reverse", alignItems: "center", gap: 6 },
  gameName: { fontFamily: Fonts.heading, fontSize: 20 },
  roundLabel: { fontFamily: Fonts.body, fontSize: 13 },
  onlineBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
  },
  onlineBadgeText: { fontFamily: Fonts.mono, fontSize: 12 },
  targetBar: {
    flexDirection: "row-reverse",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 8,
    marginHorizontal: 16,
    borderRadius: 10,
    marginBottom: 8,
  },
  targetText: { fontFamily: Fonts.body, fontSize: 13 },
  watcherBanner: {
    flexDirection: "row-reverse",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 8,
    marginHorizontal: 16,
    borderRadius: 10,
    borderWidth: 1,
    marginBottom: 8,
  },
  watcherText: { fontFamily: Fonts.body, fontSize: 12, textAlign: "right" },
  // LOBBY
  lobbyContent: { paddingHorizontal: 24, paddingTop: 16, gap: 20 },
  lobbyTitle: { fontFamily: Fonts.heading, fontSize: 22, textAlign: "center" },
  lobbyHint: {
    fontFamily: Fonts.body,
    fontSize: 14,
    textAlign: "center",
    lineHeight: 22,
  },
  waitingBox: {
    borderRadius: 20,
    padding: 28,
    alignItems: "center",
    gap: 12,
  },
  waitingText: { fontFamily: Fonts.heading, fontSize: 18, textAlign: "center" },
  waitingName: { fontFamily: Fonts.body, fontSize: 14, textAlign: "center" },
  playersBox: { borderRadius: 16, padding: 16, gap: 10 },
  playersBoxTitle: { fontFamily: Fonts.body, fontSize: 13, textAlign: "right" },
  noPlayersText: { fontFamily: Fonts.body, fontSize: 14, textAlign: "center", paddingVertical: 8 },
  playerRow: {
    flexDirection: "row-reverse",
    alignItems: "center",
    justifyContent: "space-between",
  },
  playerRowLeft: { flexDirection: "row", alignItems: "center", gap: 6 },
  playerRowName: { fontFamily: Fonts.body, fontSize: 15, textAlign: "right" },
  hostBadge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 10 },
  hostBadgeText: { fontFamily: Fonts.body, fontSize: 11 },
  startBtn: {
    flexDirection: "row-reverse",
    height: 56,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
  },
  startBtnText: { fontFamily: Fonts.heading, fontSize: 17 },
  // GAME
  scoresContainer: { paddingHorizontal: 12, paddingTop: 8 },
  scoreRow: { flexDirection: "row" },
  scoreCol: {},
  roundsSection: { marginTop: 20, gap: 6 },
  roundsTitle: { fontFamily: Fonts.body, fontSize: 13, textAlign: "right", marginBottom: 4 },
  roundRow: {
    flexDirection: "row-reverse",
    alignItems: "center",
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    gap: 12,
  },
  roundNum: { fontSize: 12, width: 24, textAlign: "center" },
  roundScores: {
    flex: 1,
    flexDirection: "row-reverse",
    gap: 12,
    flexWrap: "wrap",
  },
  roundScoreItem: { alignItems: "center", gap: 2 },
  roundDelta: { fontSize: 13 },
  roundPlayerName: { fontFamily: "Tajawal_400Regular", fontSize: 10, maxWidth: 50, textAlign: "center" },
  footer: { paddingHorizontal: 16, paddingTop: 12, borderTopWidth: 1 },
  addRoundBtn: {
    flexDirection: "row-reverse",
    height: 56,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
  },
  addRoundText: { fontFamily: Fonts.heading, fontSize: 18 },
  // Anti-cheat modal
  acOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.88)", alignItems: "center", justifyContent: "center", padding: 32 },
  acCard: { borderRadius: 24, borderWidth: 2, padding: 28, alignItems: "center", gap: 14, width: "100%", maxWidth: 320 },
  acEmoji: { fontSize: 44, textAlign: "center" },
  acTitle: { fontFamily: Fonts.heading, fontSize: 22, textAlign: "center" },
  acMsg: { fontFamily: Fonts.body, fontSize: 15, textAlign: "center", lineHeight: 22 },
  acScores: { width: "100%", gap: 8 },
  acScoreRow: { flexDirection: "row-reverse", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 14, paddingVertical: 10, borderRadius: 12 },
  acScore: { fontSize: 20 },
  acPlayerName: { fontFamily: Fonts.heading, fontSize: 16 },
  acCountdown: { borderRadius: 50, width: 72, height: 72, alignItems: "center", justifyContent: "center", borderWidth: 2, gap: 2 },
  acCountdownNum: { fontSize: 26 },
  acCountdownLabel: { fontFamily: Fonts.body, fontSize: 10, textAlign: "center" },
  acVoteTally: { flexDirection: "row", borderRadius: 14, borderWidth: 1, overflow: "hidden", width: "100%" },
  acVoteCount: { flex: 1, alignItems: "center", paddingVertical: 10, gap: 4 },
  acVoteNum: { fontFamily: Fonts.heading, fontSize: 24 },
  acVoteLabel: { fontFamily: Fonts.body, fontSize: 11 },
  acVoteDivider: { width: 1 },
  acBtns: { flexDirection: "row", gap: 10, width: "100%" },
  acBtn: { flex: 1, paddingVertical: 13, borderRadius: 14, alignItems: "center", borderWidth: 1, gap: 2 },
  acBtnText: { fontFamily: Fonts.heading, fontSize: 15 },
  acBtnCount: { fontFamily: Fonts.body, fontSize: 11 },
  acFlashOverlay: { ...StyleSheet.absoluteFillObject, zIndex: 10, pointerEvents: "none" } as const,
  objectionBtn: { padding: 5, borderRadius: 10, borderWidth: 1, marginTop: 4 },
  objectionBtnText: { fontSize: 14 },
  objectionBannerBox: { marginHorizontal: 16, marginBottom: 8, borderRadius: 10, borderWidth: 1, paddingHorizontal: 14, paddingVertical: 10 },
  objectionBannerText: { fontFamily: "Cairo_700Bold", fontSize: 14, textAlign: "center" },
  // Debt tracker in winner
  debtSection: { width: "100%", borderRadius: 16, padding: 14, gap: 10 },
  debtTitle: { fontFamily: Fonts.body, fontSize: 13, textAlign: "center" },
  debtRow: { flexDirection: "row-reverse", alignItems: "center", justifyContent: "space-between", gap: 8 },
  debtText: { fontFamily: Fonts.body, fontSize: 13, textAlign: "right", flex: 1, lineHeight: 20 },
  debtPaid: { fontFamily: Fonts.body, fontSize: 11 },
  winnerOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.85)",
    alignItems: "center",
    justifyContent: "center",
    padding: 32,
  },
  winnerCard: {
    borderRadius: 24,
    borderWidth: 2,
    padding: 32,
    alignItems: "center",
    gap: 12,
    width: "100%",
    maxWidth: 340,
  },
  winnerEmoji: { fontSize: 52, textAlign: "center" },
  winnerName: { fontFamily: Fonts.heading, fontSize: 32, textAlign: "center" },
  winnerMsg: { fontFamily: Fonts.body, fontSize: 15, textAlign: "center", lineHeight: 22 },
  winnerStats: { flexDirection: "row", borderRadius: 16, overflow: "hidden", marginTop: 4 },
  winnerStatItem: { flex: 1, paddingVertical: 14, alignItems: "center", gap: 4 },
  winnerStatVal: { fontSize: 24 },
  winnerStatLabel: { fontFamily: Fonts.body, fontSize: 12 },
  winnerStatDivider: { width: 1 },
  winnerBtns: { flexDirection: "row", gap: 10, marginTop: 8, width: "100%" },
  winnerPrimaryBtn: { flex: 2, paddingVertical: 14, borderRadius: 14, alignItems: "center", justifyContent: "center" },
  winnerPrimaryText: { fontFamily: Fonts.heading, fontSize: 17 },
  winnerSecBtn: { flex: 1, paddingVertical: 14, borderRadius: 14, alignItems: "center", justifyContent: "center", borderWidth: 1 },
  winnerSecText: { fontFamily: Fonts.heading, fontSize: 15 },
});
