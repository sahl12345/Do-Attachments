import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useEffect, useMemo, useRef, useState } from "react";
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
import { useColors } from "@/hooks/useColors";

export default function SessionScreen() {
  const colors = useColors();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { sessions, updateSession } = useApp();
  const [showScoreModal, setShowScoreModal] = useState(false);
  const [showWinner, setShowWinner] = useState(false);
  const winnerAnim = useRef(new Animated.Value(0)).current;
  const webTop = Platform.OS === "web" ? 67 : 0;

  const session = sessions.find((s) => s.id === id);
  const game = session ? getGameById(session.gameId) : null;

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

  const playerScores = useMemo(() => {
    if (!session) return [];
    return session.players.map((p) => {
      const total = getTotalScore(session, p.id);
      const lastRound = session.rounds[session.rounds.length - 1];
      const lastDelta = lastRound ? (lastRound.scores[p.id] ?? 0) : undefined;
      return { player: p, total, lastDelta };
    });
  }, [session]);

  const getWinnerId = (s: Session): string | null => {
    if (!game || game.defaultTarget === 0) return null;
    if (game.lowerIsBetter) {
      const elim = s.players.find(
        (p) => getTotalScore(s, p.id) >= (game.eliminationScore ?? game.defaultTarget)
      );
      if (elim) return elim.id;
    } else {
      const winner = s.players.find(
        (p) => getTotalScore(s, p.id) >= game.defaultTarget
      );
      if (winner) return winner.id;
    }
    return null;
  };

  const handleAddRound = (scores: Record<string, number>) => {
    if (!session) return;
    setShowScoreModal(false);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    const round: Round = {
      id: generateId(),
      scores,
      timestamp: Date.now(),
    };

    const updatedRounds = [...session.rounds, round];
    const updatedSession: Session = { ...session, rounds: updatedRounds };

    const winnerId = getWinnerId(updatedSession);
    if (winnerId) {
      updateSession(session.id, {
        ...updatedSession,
        winnerId,
        completedAt: Date.now(),
      });
      setTimeout(() => setShowWinner(true), 300);
    } else {
      updateSession(session.id, updatedSession);
    }
  };

  const handleUndoRound = () => {
    if (!session || session.rounds.length === 0) return;
    Alert.alert("تراجع عن الجولة الأخيرة", "هل تريد حذف الجولة الأخيرة؟", [
      { text: "إلغاء", style: "cancel" },
      {
        text: "تراجع",
        style: "destructive",
        onPress: () => {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
          const newRounds = session.rounds.slice(0, -1);
          updateSession(session.id, {
            rounds: newRounds,
            completedAt: undefined,
            winnerId: undefined,
          });
          setShowWinner(false);
        },
      },
    ]);
  };

  if (!session || !game) {
    return (
      <View
        style={[styles.center, { backgroundColor: colors.background }]}
      >
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

  const winnerPlayer = session.winnerId
    ? session.players.find((p) => p.id === session.winnerId)
    : null;

  const isFourPlayer = session.players.length === 4;
  const isTwoPlayer = session.players.length === 2;

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View
        style={[
          styles.header,
          { paddingTop: insets.top + webTop + 8 },
        ]}
      >
        <View style={styles.headerActions}>
          {session.rounds.length > 0 && !session.completedAt && (
            <TouchableOpacity
              onPress={handleUndoRound}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <Feather name="rotate-ccw" size={20} color={colors.textMuted} />
            </TouchableOpacity>
          )}
        </View>

        <View style={styles.headerCenter}>
          <Text style={[styles.gameName, { color: colors.gold }]}>
            {game.name}
          </Text>
          <Text style={[styles.roundLabel, { color: colors.textMuted }]}>
            {session.completedAt
              ? "انتهت"
              : `جولة ${session.rounds.length + 1}`}
          </Text>
        </View>

        <TouchableOpacity
          onPress={() => router.back()}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Feather name="arrow-right" size={24} color={colors.text} />
        </TouchableOpacity>
      </View>

      {game.defaultTarget > 0 && (
        <View
          style={[
            styles.targetBar,
            { backgroundColor: colors.surface },
          ]}
        >
          <Text style={[styles.targetText, { color: colors.textMuted }]}>
            الهدف:{" "}
            <Text
              style={{ color: colors.gold, fontFamily: Fonts.mono }}
            >
              {session.targetScore}
            </Text>
          </Text>
          <Text style={[styles.targetText, { color: colors.textMuted }]}>
            {game.lowerIsBetter ? "أقل نقاط يفوز" : "أعلى نقاط يفوز"}
          </Text>
        </View>
      )}

      <ScrollView
        contentContainerStyle={[
          styles.scoresContainer,
          {
            paddingBottom: insets.bottom + 120 + (Platform.OS === "web" ? 34 : 0),
          },
        ]}
        showsVerticalScrollIndicator={false}
      >
        {isFourPlayer ? (
          <>
            <View style={styles.scoreRow}>
              {[playerScores[0], playerScores[1]].map((ps) =>
                ps ? (
                  <PlayerScoreCard
                    key={ps.player.id}
                    name={ps.player.name}
                    score={ps.total}
                    lastDelta={
                      session.rounds.length > 0 ? ps.lastDelta : undefined
                    }
                    isWinner={session.winnerId === ps.player.id}
                    teamLabel={game.isTeam ? "الفريق أ" : undefined}
                  />
                ) : null
              )}
            </View>
            <View style={styles.scoreRow}>
              {[playerScores[2], playerScores[3]].map((ps) =>
                ps ? (
                  <PlayerScoreCard
                    key={ps.player.id}
                    name={ps.player.name}
                    score={ps.total}
                    lastDelta={
                      session.rounds.length > 0 ? ps.lastDelta : undefined
                    }
                    isWinner={session.winnerId === ps.player.id}
                    teamLabel={game.isTeam ? "الفريق ب" : undefined}
                  />
                ) : null
              )}
            </View>
          </>
        ) : (
          <View style={isTwoPlayer ? styles.scoreRow : styles.scoreCol}>
            {playerScores.map((ps) => (
              <PlayerScoreCard
                key={ps.player.id}
                name={ps.player.name}
                score={ps.total}
                lastDelta={
                  session.rounds.length > 0 ? ps.lastDelta : undefined
                }
                isWinner={session.winnerId === ps.player.id}
                isEliminated={
                  game.eliminationScore
                    ? ps.total >= game.eliminationScore
                    : false
                }
              />
            ))}
          </View>
        )}

        {session.rounds.length > 0 && (
          <View style={styles.roundsSection}>
            <Text style={[styles.roundsTitle, { color: colors.textMuted }]}>
              سجل الجولات
            </Text>
            {[...session.rounds].reverse().map((round, i) => (
              <View
                key={round.id}
                style={[
                  styles.roundRow,
                  { backgroundColor: colors.surface },
                ]}
              >
                <Text
                  style={[
                    styles.roundNum,
                    {
                      color: colors.textDim,
                      fontFamily: Fonts.mono,
                    },
                  ]}
                >
                  #{session.rounds.length - i}
                </Text>
                <View style={styles.roundScores}>
                  {session.players.map((p) => (
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

      {!session.completedAt && (
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
        players={session.players}
        roundNumber={session.rounds.length + 1}
        onClose={() => setShowScoreModal(false)}
        onSubmit={handleAddRound}
      />

      <Modal
        visible={showWinner}
        animationType="none"
        transparent
        statusBarTranslucent
      >
        <View style={styles.winnerOverlay}>
          <Animated.View
            style={[
              styles.winnerCard,
              {
                backgroundColor: colors.surfaceHigh,
                borderColor: colors.gold,
                transform: [
                  {
                    scale: winnerAnim.interpolate({
                      inputRange: [0, 1],
                      outputRange: [0.5, 1],
                    }),
                  },
                ],
                opacity: winnerAnim,
              },
            ]}
          >
            <Text style={[styles.winnerCrown, { color: colors.gold }]}>
              ★
            </Text>
            <Text style={[styles.winnerTitle, { color: colors.gold }]}>
              {winnerPlayer?.name ?? "الفائز"}
            </Text>
            <Text style={[styles.winnerSub, { color: colors.textMuted }]}>
              فاز بعد {session.rounds.length} جولة
            </Text>
            <TouchableOpacity
              onPress={() => {
                setShowWinner(false);
                router.back();
              }}
              style={[styles.winnerBtn, { backgroundColor: colors.gold }]}
            >
              <Text style={[styles.winnerBtnText, { color: colors.background }]}>
                الرئيسية
              </Text>
            </TouchableOpacity>
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
  errorText: {
    fontFamily: "Tajawal_400Regular",
    fontSize: 18,
    textAlign: "center",
  },
  backBtn: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 12,
  },
  backBtnText: {
    fontFamily: "Cairo_700Bold",
    fontSize: 16,
  },
  header: {
    flexDirection: "row-reverse",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingBottom: 12,
  },
  headerCenter: {
    alignItems: "center",
    gap: 4,
  },
  headerActions: {
    width: 44,
    alignItems: "flex-start",
  },
  gameName: {
    fontFamily: Fonts.heading,
    fontSize: 20,
  },
  roundLabel: {
    fontFamily: Fonts.body,
    fontSize: 13,
  },
  targetBar: {
    flexDirection: "row-reverse",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 8,
    marginHorizontal: 16,
    borderRadius: 10,
    marginBottom: 8,
  },
  targetText: {
    fontFamily: Fonts.body,
    fontSize: 13,
  },
  scoresContainer: {
    paddingHorizontal: 12,
    paddingTop: 8,
  },
  scoreRow: {
    flexDirection: "row",
    gap: 0,
    marginBottom: 0,
  },
  scoreCol: {
    gap: 0,
  },
  roundsSection: {
    marginTop: 20,
    gap: 6,
  },
  roundsTitle: {
    fontFamily: Fonts.body,
    fontSize: 13,
    textAlign: "right",
    marginBottom: 4,
  },
  roundRow: {
    flexDirection: "row-reverse",
    alignItems: "center",
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    gap: 12,
  },
  roundNum: {
    fontSize: 12,
    width: 24,
    textAlign: "center",
  },
  roundScores: {
    flex: 1,
    flexDirection: "row-reverse",
    gap: 12,
    flexWrap: "wrap",
  },
  roundScoreItem: {
    alignItems: "center",
    gap: 2,
  },
  roundDelta: {
    fontSize: 13,
  },
  roundPlayerName: {
    fontFamily: "Tajawal_400Regular",
    fontSize: 10,
    maxWidth: 50,
    textAlign: "center",
  },
  footer: {
    paddingHorizontal: 16,
    paddingTop: 12,
    borderTopWidth: 1,
  },
  addRoundBtn: {
    flexDirection: "row-reverse",
    height: 56,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
  },
  addRoundText: {
    fontFamily: Fonts.heading,
    fontSize: 18,
  },
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
  winnerCrown: {
    fontSize: 56,
    textAlign: "center",
  },
  winnerTitle: {
    fontFamily: Fonts.heading,
    fontSize: 32,
    textAlign: "center",
  },
  winnerSub: {
    fontFamily: Fonts.body,
    fontSize: 16,
    textAlign: "center",
  },
  winnerBtn: {
    paddingHorizontal: 40,
    paddingVertical: 14,
    borderRadius: 14,
    marginTop: 8,
  },
  winnerBtnText: {
    fontFamily: Fonts.heading,
    fontSize: 17,
  },
});
