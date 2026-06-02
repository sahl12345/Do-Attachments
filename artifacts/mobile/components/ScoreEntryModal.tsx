import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import React, { useEffect, useRef, useState } from "react";
import {
  Animated,
  Dimensions,
  KeyboardAvoidingView,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  TouchableWithoutFeedback,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { Fonts } from "@/constants/fonts";
import { Player } from "@/contexts/AppContext";
import { useColors } from "@/hooks/useColors";

const { height: SCREEN_HEIGHT } = Dimensions.get("window");

interface Props {
  visible: boolean;
  players: Player[];
  roundNumber: number;
  gameId?: string;
  onClose: () => void;
  onSubmit: (scores: Record<string, number>) => void;
}

// ─── Tarneeb Score Entry ─────────────────────────────────────────────────────
function TarneebEntry({
  players,
  onSubmit,
  onClose,
}: {
  players: Player[];
  onSubmit: (s: Record<string, number>) => void;
  onClose: () => void;
}) {
  const colors = useColors();
  const [biddingTeam, setBiddingTeam] = useState<0 | 1>(0);
  const [bid, setBid] = useState(7);
  const [biddingTricks, setBiddingTricks] = useState(7);
  const [kabout, setKabout] = useState(false);

  const teamA = [players[0], players[2]].filter(Boolean);
  const teamB = [players[1], players[3]].filter(Boolean);
  const teamAName = teamA.map((p) => p.name).join(" / ");
  const teamBName = teamB.map((p) => p.name).join(" / ");

  const otherTricks = 13 - biddingTricks;
  const biddingScore = kabout
    ? bid === 13 ? 26 : 16
    : biddingTricks >= bid ? biddingTricks : -bid;
  const otherScore = kabout ? 0 : otherTricks;

  const teamAScore = biddingTeam === 0 ? biddingScore : otherScore;
  const teamBScore = biddingTeam === 1 ? biddingScore : otherScore;

  const handleConfirm = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    const scores: Record<string, number> = {};
    teamA.forEach((p) => { scores[p.id] = teamAScore; });
    teamB.forEach((p) => { scores[p.id] = teamBScore; });
    onSubmit(scores);
  };

  const adjustBid = (d: number) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setBid((v) => Math.max(6, Math.min(13, v + d)));
  };
  const adjustTricks = (d: number) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setBiddingTricks((v) => Math.max(0, Math.min(13, v + d)));
  };

  return (
    <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
      <Text style={[tarStyles.label, { color: colors.textMuted }]}>الفريق المزايد</Text>
      <View style={tarStyles.teamRow}>
        {[0, 1].map((t) => {
          const isSelected = biddingTeam === t;
          const label = t === 0 ? teamAName : teamBName;
          return (
            <TouchableOpacity
              key={t}
              onPress={() => { Haptics.selectionAsync(); setBiddingTeam(t as 0 | 1); }}
              style={[
                tarStyles.teamBtn,
                isSelected
                  ? { backgroundColor: colors.gold }
                  : { backgroundColor: colors.surfaceRaised, borderColor: colors.border, borderWidth: 1 },
              ]}
            >
              <Text
                numberOfLines={1}
                style={[tarStyles.teamBtnText, { color: isSelected ? colors.background : colors.textMuted }]}
              >
                {label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      <View style={[tarStyles.divider, { backgroundColor: colors.border }]} />

      {!kabout && (
        <>
          <Text style={[tarStyles.label, { color: colors.textMuted }]}>المزايدة</Text>
          <View style={tarStyles.stepRow}>
            <TouchableOpacity onPress={() => adjustBid(-1)} style={[tarStyles.stepBtn, { backgroundColor: `${colors.red}33` }]}>
              <Feather name="minus" size={18} color={colors.red} />
            </TouchableOpacity>
            <View style={[tarStyles.valueBox, { backgroundColor: colors.surfaceRaised }]}>
              <Text style={[tarStyles.valueText, { color: colors.gold, fontFamily: Fonts.mono }]}>{bid}</Text>
            </View>
            <TouchableOpacity onPress={() => adjustBid(1)} style={[tarStyles.stepBtn, { backgroundColor: `${colors.success}33` }]}>
              <Feather name="plus" size={18} color={colors.success} />
            </TouchableOpacity>
          </View>

          <Text style={[tarStyles.label, { color: colors.textMuted }]}>لطشات الفريق المزايد</Text>
          <View style={tarStyles.stepRow}>
            <TouchableOpacity onPress={() => adjustTricks(-1)} style={[tarStyles.stepBtn, { backgroundColor: `${colors.red}33` }]}>
              <Feather name="minus" size={18} color={colors.red} />
            </TouchableOpacity>
            <View style={[tarStyles.valueBox, { backgroundColor: colors.surfaceRaised }]}>
              <Text style={[tarStyles.valueText, { color: colors.text, fontFamily: Fonts.mono }]}>{biddingTricks}</Text>
              <Text style={[tarStyles.subText, { color: colors.textDim }]}>الثاني: {otherTricks}</Text>
            </View>
            <TouchableOpacity onPress={() => adjustTricks(1)} style={[tarStyles.stepBtn, { backgroundColor: `${colors.success}33` }]}>
              <Feather name="plus" size={18} color={colors.success} />
            </TouchableOpacity>
          </View>
        </>
      )}

      <TouchableOpacity
        onPress={() => { Haptics.selectionAsync(); setKabout((v) => !v); }}
        style={[
          tarStyles.kaboutBtn,
          kabout
            ? { backgroundColor: `${colors.gold}22`, borderColor: colors.gold }
            : { backgroundColor: colors.surfaceRaised, borderColor: colors.border },
        ]}
      >
        <Text style={[tarStyles.kaboutText, { color: kabout ? colors.gold : colors.textMuted }]}>
          ♛  كبوت {kabout ? "✓" : ""}
        </Text>
      </TouchableOpacity>
      {kabout && (
        <Text style={[tarStyles.hint, { color: colors.textDim }]}>
          بمزايدة ١٣: +٢٦  |  بدون مزايدة: +١٦
        </Text>
      )}

      <View style={[tarStyles.divider, { backgroundColor: colors.border }]} />

      <View style={[tarStyles.preview, { backgroundColor: colors.surface }]}>
        <Text style={[tarStyles.previewTitle, { color: colors.textMuted }]}>النتيجة المحسوبة</Text>
        {[
          { name: teamAName, score: teamAScore },
          { name: teamBName, score: teamBScore },
        ].map(({ name, score }, i) => (
          <View key={i} style={tarStyles.previewRow}>
            <Text style={[tarStyles.previewScore, { color: score < 0 ? colors.red : colors.success, fontFamily: Fonts.mono }]}>
              {score >= 0 ? `+${score}` : `${score}`}
            </Text>
            <Text style={[tarStyles.previewName, { color: colors.text }]} numberOfLines={1}>{name}</Text>
          </View>
        ))}
      </View>

      <View style={tarStyles.actions}>
        <TouchableOpacity onPress={onClose} style={[tarStyles.cancelBtn, { borderColor: colors.borderStrong }]}>
          <Text style={[tarStyles.cancelText, { color: colors.textMuted }]}>إلغاء</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={handleConfirm} style={[tarStyles.confirmBtn, { backgroundColor: colors.gold }]}>
          <Text style={[tarStyles.confirmText, { color: colors.background }]}>تأكيد</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

// ─── Terkis Contract Entry ───────────────────────────────────────────────────
const CONTRACTS = [
  { id: "ltosh", label: "لطوش", pts: -15 },
  { id: "dinary", label: "ديناري", pts: -30 },
  { id: "banat", label: "بنات", pts: -30 },
  { id: "sheikh", label: "شيخ كبة", pts: -30 },
  { id: "terkis", label: "تركس الكل", pts: -105 },
];

function TerkisEntry({
  players,
  onSubmit,
  onClose,
}: {
  players: Player[];
  onSubmit: (s: Record<string, number>) => void;
  onClose: () => void;
}) {
  const colors = useColors();
  const [chosen, setChosen] = useState<Record<string, string | null>>(
    () => Object.fromEntries(players.map((p) => [p.id, null]))
  );

  const toggle = (pid: string, cid: string) => {
    Haptics.selectionAsync();
    setChosen((prev) => ({ ...prev, [pid]: prev[pid] === cid ? null : cid }));
  };

  const handleConfirm = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    const scores: Record<string, number> = {};
    players.forEach((p) => {
      const c = CONTRACTS.find((x) => x.id === chosen[p.id]);
      scores[p.id] = c ? c.pts : 0;
    });
    onSubmit(scores);
  };

  return (
    <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
      <Text style={[tarStyles.label, { color: colors.textMuted }]}>اختر العقد المأخوذ لكل لاعب</Text>
      {players.map((player) => (
        <View key={player.id} style={terkisStyles.section}>
          <Text style={[terkisStyles.name, { color: colors.text }]}>{player.name}</Text>
          <View style={terkisStyles.row}>
            {CONTRACTS.map((c) => {
              const sel = chosen[player.id] === c.id;
              return (
                <TouchableOpacity
                  key={c.id}
                  onPress={() => toggle(player.id, c.id)}
                  style={[
                    terkisStyles.btn,
                    sel
                      ? { backgroundColor: `${colors.red}33`, borderColor: colors.red }
                      : { backgroundColor: colors.surfaceRaised, borderColor: colors.border },
                  ]}
                >
                  <Text style={[terkisStyles.label, { color: sel ? colors.red : colors.textMuted }]}>{c.label}</Text>
                  <Text style={[terkisStyles.pts, { color: sel ? colors.red : colors.textDim, fontFamily: Fonts.mono }]}>{c.pts}</Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>
      ))}
      <View style={tarStyles.actions}>
        <TouchableOpacity onPress={onClose} style={[tarStyles.cancelBtn, { borderColor: colors.borderStrong }]}>
          <Text style={[tarStyles.cancelText, { color: colors.textMuted }]}>إلغاء</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={handleConfirm} style={[tarStyles.confirmBtn, { backgroundColor: colors.gold }]}>
          <Text style={[tarStyles.confirmText, { color: colors.background }]}>تأكيد</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

// ─── Generic Entry ────────────────────────────────────────────────────────────
function GenericEntry({
  players,
  onSubmit,
  onClose,
}: {
  players: Player[];
  onSubmit: (s: Record<string, number>) => void;
  onClose: () => void;
}) {
  const colors = useColors();
  const [inputs, setInputs] = useState<Record<string, string>>(() =>
    Object.fromEntries(players.map((p) => [p.id, ""]))
  );

  const adjust = (pid: string, delta: number) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setInputs((prev) => {
      const cur = parseInt(prev[pid] ?? "0", 10) || 0;
      return { ...prev, [pid]: String(cur + delta) };
    });
  };

  const handleSubmit = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    const scores: Record<string, number> = {};
    players.forEach((p) => {
      scores[p.id] = parseInt(inputs[p.id]?.trim() ?? "0", 10) || 0;
    });
    onSubmit(scores);
  };

  return (
    <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined}>
      <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
        {players.map((player) => (
          <View key={player.id} style={[genStyles.row, { borderBottomColor: colors.border }]}>
            <View style={genStyles.stepper}>
              <TouchableOpacity onPress={() => adjust(player.id, -5)} style={[genStyles.stepBtn, { backgroundColor: `${colors.red}33` }]}>
                <Feather name="minus" size={16} color={colors.red} />
              </TouchableOpacity>
              <TextInput
                style={[genStyles.input, { color: colors.text, backgroundColor: colors.surface, fontFamily: Fonts.mono }]}
                value={inputs[player.id] ?? ""}
                onChangeText={(v) => setInputs((prev) => ({ ...prev, [player.id]: v }))}
                keyboardType="numbers-and-punctuation"
                textAlign="center"
                returnKeyType="done"
                placeholderTextColor={colors.textDim}
                placeholder="0"
              />
              <TouchableOpacity onPress={() => adjust(player.id, 5)} style={[genStyles.stepBtn, { backgroundColor: `${colors.success}33` }]}>
                <Feather name="plus" size={16} color={colors.success} />
              </TouchableOpacity>
            </View>
            <Text style={[genStyles.name, { color: colors.text }]}>{player.name}</Text>
          </View>
        ))}
      </ScrollView>
      <View style={genStyles.actions}>
        <TouchableOpacity onPress={onClose} style={[genStyles.cancelBtn, { borderColor: colors.borderStrong }]}>
          <Text style={[genStyles.cancelText, { color: colors.textMuted }]}>إلغاء</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={handleSubmit} style={[genStyles.confirmBtn, { backgroundColor: colors.gold }]}>
          <Text style={[genStyles.confirmText, { color: colors.background }]}>تأكيد</Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

// ─── Shell ────────────────────────────────────────────────────────────────────
export function ScoreEntryModal({
  visible,
  players,
  roundNumber,
  gameId,
  onClose,
  onSubmit,
}: Props) {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const slideAnim = useRef(new Animated.Value(SCREEN_HEIGHT)).current;

  useEffect(() => {
    if (visible) {
      Animated.spring(slideAnim, {
        toValue: 0,
        useNativeDriver: true,
        damping: 20,
        stiffness: 200,
      }).start();
    } else {
      Animated.timing(slideAnim, {
        toValue: SCREEN_HEIGHT,
        duration: 250,
        useNativeDriver: true,
      }).start();
    }
  }, [visible, slideAnim]);

  const isTarneeb = gameId === "tarneeb" || gameId === "tarneeb_sy";
  const isTerkis = gameId === "terkis" || gameId === "terkis_team" || gameId === "terkis_complex";

  const gameLabel: Record<string, string> = {
    tarneeb: "طرنيب عادي",
    tarneeb_sy: "طرنيب سوري",
    terkis: "تركس فردي",
    terkis_team: "تركس شراكة",
    terkis_complex: "تركس كومبلكس",
    "400": "٤٠٠",
    hand: "هاند / كنكان",
    baloot: "بلوت",
    basra: "بصرة",
    leekha: "ليخة",
    domino: "دومينو",
    jackaroo: "جاكارو",
    jackaroo_cx: "جاكارو كومبلكس",
    harreega: "حريقة",
    nthaleh: "نذالة",
  };

  const title = `جولة ${roundNumber}${gameId ? ` — ${gameLabel[gameId] ?? ""}` : ""}`;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      statusBarTranslucent
      onRequestClose={onClose}
    >
      <TouchableWithoutFeedback onPress={onClose}>
        <View style={shellStyles.overlay} />
      </TouchableWithoutFeedback>

      <Animated.View
        style={[
          shellStyles.sheet,
          {
            backgroundColor: colors.surfaceHigh,
            paddingBottom: insets.bottom + 16,
            transform: [{ translateY: slideAnim }],
          },
        ]}
      >
        <View style={[shellStyles.handle, { backgroundColor: colors.textDim }]} />
        <Text style={[shellStyles.title, { color: colors.text }]}>{title}</Text>

        {isTarneeb ? (
          <TarneebEntry players={players} onSubmit={onSubmit} onClose={onClose} />
        ) : isTerkis ? (
          <TerkisEntry players={players} onSubmit={onSubmit} onClose={onClose} />
        ) : (
          <GenericEntry players={players} onSubmit={onSubmit} onClose={onClose} />
        )}
      </Animated.View>
    </Modal>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const tarStyles = StyleSheet.create({
  label: { fontFamily: Fonts.body, fontSize: 13, textAlign: "right", marginBottom: 8, marginTop: 4 },
  teamRow: { flexDirection: "row-reverse", gap: 10, marginBottom: 8 },
  teamBtn: { flex: 1, paddingVertical: 12, paddingHorizontal: 8, borderRadius: 12, alignItems: "center" },
  teamBtnText: { fontFamily: Fonts.body, fontSize: 13, textAlign: "center" },
  divider: { height: 1, marginVertical: 12 },
  stepRow: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 16, marginBottom: 14 },
  stepBtn: { width: 44, height: 44, borderRadius: 12, alignItems: "center", justifyContent: "center" },
  valueBox: { minWidth: 80, paddingHorizontal: 16, paddingVertical: 8, borderRadius: 14, alignItems: "center" },
  valueText: { fontSize: 28 },
  subText: { fontFamily: Fonts.body, fontSize: 12, marginTop: 2 },
  kaboutBtn: { alignSelf: "center", paddingHorizontal: 24, paddingVertical: 10, borderRadius: 20, borderWidth: 1.5, marginBottom: 6 },
  kaboutText: { fontFamily: Fonts.heading, fontSize: 15 },
  hint: { fontFamily: Fonts.body, fontSize: 12, textAlign: "center", marginBottom: 8 },
  preview: { borderRadius: 14, padding: 14, gap: 10, marginBottom: 12 },
  previewTitle: { fontFamily: Fonts.body, fontSize: 12, textAlign: "right", marginBottom: 2 },
  previewRow: { flexDirection: "row-reverse", justifyContent: "space-between", alignItems: "center" },
  previewName: { fontFamily: Fonts.body, fontSize: 15, flex: 1, textAlign: "right" },
  previewScore: { fontSize: 20 },
  actions: { flexDirection: "row", gap: 12, marginTop: 8 },
  cancelBtn: { flex: 1, height: 52, borderRadius: 14, alignItems: "center", justifyContent: "center", borderWidth: 1 },
  cancelText: { fontFamily: Fonts.heading, fontSize: 16 },
  confirmBtn: { flex: 2, height: 52, borderRadius: 14, alignItems: "center", justifyContent: "center" },
  confirmText: { fontFamily: Fonts.heading, fontSize: 16 },
});

const terkisStyles = StyleSheet.create({
  section: { marginBottom: 16 },
  name: { fontFamily: Fonts.heading, fontSize: 15, textAlign: "right", marginBottom: 8 },
  row: { flexDirection: "row-reverse", flexWrap: "wrap", gap: 6 },
  btn: { flexDirection: "row-reverse", alignItems: "center", gap: 4, paddingHorizontal: 10, paddingVertical: 8, borderRadius: 20, borderWidth: 1.5 },
  label: { fontFamily: Fonts.body, fontSize: 13 },
  pts: { fontSize: 13 },
});

const genStyles = StyleSheet.create({
  row: { flexDirection: "row-reverse", alignItems: "center", justifyContent: "space-between", paddingVertical: 14, borderBottomWidth: 1 },
  name: { fontFamily: "Tajawal_400Regular", fontSize: 16, textAlign: "right", flex: 1, marginLeft: 8 },
  stepper: { flexDirection: "row", alignItems: "center", gap: 6 },
  stepBtn: { width: 36, height: 36, borderRadius: 10, alignItems: "center", justifyContent: "center" },
  input: { width: 70, height: 40, borderRadius: 10, fontSize: 16 },
  actions: { flexDirection: "row", gap: 12, marginTop: 20 },
  cancelBtn: { flex: 1, height: 52, borderRadius: 14, alignItems: "center", justifyContent: "center", borderWidth: 1 },
  cancelText: { fontFamily: "Cairo_700Bold", fontSize: 16 },
  confirmBtn: { flex: 2, height: 52, borderRadius: 14, alignItems: "center", justifyContent: "center" },
  confirmText: { fontFamily: "Cairo_700Bold", fontSize: 16 },
});

const shellStyles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.6)" },
  sheet: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20,
    maxHeight: SCREEN_HEIGHT * 0.92,
  },
  handle: { width: 40, height: 4, borderRadius: 2, alignSelf: "center", marginBottom: 16 },
  title: { fontFamily: "Cairo_700Bold", fontSize: 18, textAlign: "center", marginBottom: 16 },
});
