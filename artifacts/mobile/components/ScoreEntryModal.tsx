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

// ─── Shared helpers ───────────────────────────────────────────────────────────
function Stepper({
  value,
  onChange,
  min = 0,
  max = 99,
  colors,
}: {
  value: number;
  onChange: (v: number) => void;
  min?: number;
  max?: number;
  colors: any;
}) {
  return (
    <View style={stepperStyles.row}>
      <TouchableOpacity
        onPress={() => {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          onChange(Math.max(min, value - 1));
        }}
        style={[stepperStyles.btn, { backgroundColor: `${colors.red}33` }]}
      >
        <Feather name="minus" size={16} color={colors.red} />
      </TouchableOpacity>
      <View style={[stepperStyles.val, { backgroundColor: colors.surfaceRaised }]}>
        <Text style={[stepperStyles.valText, { color: colors.text, fontFamily: Fonts.mono }]}>
          {value}
        </Text>
      </View>
      <TouchableOpacity
        onPress={() => {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          onChange(Math.min(max, value + 1));
        }}
        style={[stepperStyles.btn, { backgroundColor: `${colors.success}33` }]}
      >
        <Feather name="plus" size={16} color={colors.success} />
      </TouchableOpacity>
    </View>
  );
}

const stepperStyles = StyleSheet.create({
  row: { flexDirection: "row", alignItems: "center", gap: 8 },
  btn: { width: 36, height: 36, borderRadius: 10, alignItems: "center", justifyContent: "center" },
  val: { minWidth: 56, height: 36, borderRadius: 10, alignItems: "center", justifyContent: "center", paddingHorizontal: 8 },
  valText: { fontSize: 18 },
});

// ─── Actions row ─────────────────────────────────────────────────────────────
function Actions({ onClose, onConfirm, colors, disabled = false }: { onClose: () => void; onConfirm: () => void; colors: any; disabled?: boolean }) {
  return (
    <View style={actStyles.row}>
      <TouchableOpacity onPress={onClose} style={[actStyles.cancel, { borderColor: colors.borderStrong }]}>
        <Text style={[actStyles.cancelText, { color: colors.textMuted }]}>إلغاء</Text>
      </TouchableOpacity>
      <TouchableOpacity
        onPress={onConfirm}
        disabled={disabled}
        style={[actStyles.confirm, { backgroundColor: disabled ? colors.surfaceRaised : colors.gold }]}
      >
        <Text style={[actStyles.confirmText, { color: disabled ? colors.textDim : colors.background }]}>تأكيد</Text>
      </TouchableOpacity>
    </View>
  );
}
const actStyles = StyleSheet.create({
  row: { flexDirection: "row", gap: 12, marginTop: 12 },
  cancel: { flex: 1, height: 52, borderRadius: 14, alignItems: "center", justifyContent: "center", borderWidth: 1 },
  cancelText: { fontFamily: Fonts.heading, fontSize: 16 },
  confirm: { flex: 2, height: 52, borderRadius: 14, alignItems: "center", justifyContent: "center" },
  confirmText: { fontFamily: Fonts.heading, fontSize: 16 },
});

// ─── TARNEEB ENTRY ────────────────────────────────────────────────────────────
function TarneebEntry({ players, onSubmit, onClose }: { players: Player[]; onSubmit: (s: Record<string, number>) => void; onClose: () => void }) {
  const colors = useColors();
  const [biddingTeam, setBiddingTeam] = useState<0 | 1>(0);
  const [bid, setBid] = useState(7);
  const [tricks, setTricks] = useState(7);
  const [kabout, setKabout] = useState(false);

  const teamA = [players[0], players[2]].filter(Boolean);
  const teamB = [players[1], players[3]].filter(Boolean);

  const otherTricks = 13 - tricks;
  const biddingScore = kabout
    ? bid === 13 ? 26 : 16
    : tricks >= bid ? tricks : -bid;
  const otherScore = kabout ? 0 : otherTricks;
  const aScore = biddingTeam === 0 ? biddingScore : otherScore;
  const bScore = biddingTeam === 1 ? biddingScore : otherScore;

  const confirm = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    const s: Record<string, number> = {};
    teamA.forEach((p) => { s[p.id] = aScore; });
    teamB.forEach((p) => { s[p.id] = bScore; });
    onSubmit(s);
  };

  return (
    <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
      <Text style={[s.label, { color: colors.textMuted }]}>الفريق المزايد</Text>
      <View style={s.teamRow}>
        {[teamA, teamB].map((team, t) => (
          <TouchableOpacity
            key={t}
            onPress={() => { Haptics.selectionAsync(); setBiddingTeam(t as 0 | 1); }}
            style={[s.teamBtn, biddingTeam === t
              ? { backgroundColor: colors.gold }
              : { backgroundColor: colors.surfaceRaised, borderColor: colors.border, borderWidth: 1 }]}
          >
            <Text numberOfLines={1} style={[s.teamBtnText, { color: biddingTeam === t ? colors.background : colors.textMuted }]}>
              {team.map((p) => p.name).join(" / ")}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <View style={[s.divider, { backgroundColor: colors.border }]} />

      {!kabout && (
        <>
          <Text style={[s.label, { color: colors.textMuted }]}>المزايدة</Text>
          <View style={s.centered}>
            <Stepper value={bid} onChange={setBid} min={6} max={13} colors={colors} />
          </View>

          <Text style={[s.label, { color: colors.textMuted }]}>لطشات الفريق المزايد</Text>
          <View style={s.centered}>
            <Stepper value={tricks} onChange={setTricks} min={0} max={13} colors={colors} />
            <Text style={[s.subHint, { color: colors.textDim }]}>الفريق الثاني: {otherTricks} لطشة</Text>
          </View>
        </>
      )}

      <TouchableOpacity
        onPress={() => { Haptics.selectionAsync(); setKabout((v) => !v); }}
        style={[s.toggleBtn, kabout
          ? { backgroundColor: `${colors.gold}22`, borderColor: colors.gold }
          : { backgroundColor: colors.surfaceRaised, borderColor: colors.border }]}
      >
        <Text style={[s.toggleText, { color: kabout ? colors.gold : colors.textMuted }]}>
          ♛  كبوت {kabout ? "✓" : ""}
        </Text>
      </TouchableOpacity>
      {kabout && (
        <Text style={[s.hint, { color: colors.textDim }]}>بمزايدة ١٣: +٢٦  |  بدون مزايدة: +١٦  |  الخصم: ٠</Text>
      )}

      <View style={[s.preview, { backgroundColor: colors.surface }]}>
        <Text style={[s.previewTitle, { color: colors.textMuted }]}>النتيجة</Text>
        {[{ name: teamA.map((p) => p.name).join(" / "), score: aScore }, { name: teamB.map((p) => p.name).join(" / "), score: bScore }]
          .map(({ name, score }, i) => (
          <View key={i} style={s.previewRow}>
            <Text style={[s.previewScore, { color: score < 0 ? colors.red : colors.success, fontFamily: Fonts.mono }]}>
              {score >= 0 ? `+${score}` : `${score}`}
            </Text>
            <Text style={[s.previewName, { color: colors.text }]} numberOfLines={1}>{name}</Text>
          </View>
        ))}
      </View>

      <Actions onClose={onClose} onConfirm={confirm} colors={colors} />
    </ScrollView>
  );
}

// ─── TERKIS ENTRY (corrected scoring per spec) ────────────────────────────────
const TERKIS_CONTRACTS = [
  { id: "ltosh",   label: "لطوش",      type: "count", unit: "لطشة",    penaltyPer: -15, max: 13 },
  { id: "dinary",  label: "ديناري",    type: "count", unit: "ديناريه",  penaltyPer: -10, max: 13 },
  { id: "banat",   label: "بنات",      type: "count", unit: "بنت",     penaltyPer: -25, max: 4  },
  { id: "sheikh",  label: "شيخ الكبة", type: "radio", unit: null,      penaltyPer: -75, max: 1  },
  { id: "terkis",  label: "تركس",      type: "bonus", unit: null,      penaltyPer: 0,   max: 1  },
] as const;

const TERKIS_BONUS_VALUES = [200, 150, 100, 50];

function TerkisEntry({ players, onSubmit, onClose }: { players: Player[]; onSubmit: (s: Record<string, number>) => void; onClose: () => void }) {
  const colors = useColors();
  const [contract, setContract] = useState<string>("ltosh");
  const [counts, setCounts] = useState<Record<string, number>>(
    () => Object.fromEntries(players.map((p) => [p.id, 0]))
  );
  const [radioPlayer, setRadioPlayer] = useState<string | null>(null);
  const [terkisPosition, setTerkisPosition] = useState(1);

  const def = TERKIS_CONTRACTS.find((c) => c.id === contract)!;

  const handleContractChange = (id: string) => {
    Haptics.selectionAsync();
    setContract(id);
    setCounts(Object.fromEntries(players.map((p) => [p.id, 0])));
    setRadioPlayer(null);
  };

  const calcScores = (): Record<string, number> => {
    const s: Record<string, number> = {};
    if (def.type === "count") {
      players.forEach((p) => { s[p.id] = (counts[p.id] ?? 0) * def.penaltyPer; });
    } else if (def.type === "radio") {
      players.forEach((p) => { s[p.id] = p.id === radioPlayer ? def.penaltyPer : 0; });
    } else if (def.type === "bonus") {
      const bonus = TERKIS_BONUS_VALUES[Math.min(terkisPosition - 1, TERKIS_BONUS_VALUES.length - 1)];
      players.forEach((p) => { s[p.id] = p.id === radioPlayer ? bonus : 0; });
    }
    return s;
  };

  const isValid = def.type === "count" || !!radioPlayer;
  const scores = calcScores();

  const confirm = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    onSubmit(scores);
  };

  return (
    <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
      <Text style={[s.label, { color: colors.textMuted }]}>نوع العقد</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 12 }}>
        <View style={{ flexDirection: "row-reverse", gap: 8, paddingHorizontal: 2 }}>
          {TERKIS_CONTRACTS.map((c) => (
            <TouchableOpacity
              key={c.id}
              onPress={() => handleContractChange(c.id)}
              style={[tkStyles.contractBtn,
                contract === c.id
                  ? { backgroundColor: colors.gold }
                  : { backgroundColor: colors.surfaceRaised, borderColor: colors.border, borderWidth: 1 }]}
            >
              <Text style={[tkStyles.contractLabel, { color: contract === c.id ? colors.background : colors.textMuted }]}>
                {c.label}
              </Text>
              {c.type === "count" && (
                <Text style={[tkStyles.contractPts, { color: contract === c.id ? colors.background : colors.textDim }]}>
                  {c.penaltyPer}/{"unit" in c ? c.unit : ""}
                </Text>
              )}
              {c.type === "radio" && (
                <Text style={[tkStyles.contractPts, { color: contract === c.id ? colors.background : colors.textDim }]}>
                  {c.penaltyPer}
                </Text>
              )}
              {c.type === "bonus" && (
                <Text style={[tkStyles.contractPts, { color: contract === c.id ? colors.background : colors.textDim }]}>
                  +{TERKIS_BONUS_VALUES[0]}
                </Text>
              )}
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>

      <View style={[s.divider, { backgroundColor: colors.border }]} />

      {def.type === "count" && (
        <>
          <Text style={[s.label, { color: colors.textMuted }]}>
            كم {def.unit} أخذ كل لاعب؟ ({def.penaltyPer} للواحدة)
          </Text>
          {players.map((p) => (
            <View key={p.id} style={tkStyles.playerRow}>
              <Stepper
                value={counts[p.id] ?? 0}
                onChange={(v) => setCounts((prev) => ({ ...prev, [p.id]: v }))}
                min={0}
                max={def.max}
                colors={colors}
              />
              <View style={tkStyles.playerInfo}>
                <Text style={[tkStyles.playerName, { color: colors.text }]}>{p.name}</Text>
                <Text style={[tkStyles.playerScore, { color: (counts[p.id] ?? 0) === 0 ? colors.textDim : colors.red, fontFamily: Fonts.mono }]}>
                  {(counts[p.id] ?? 0) === 0 ? "٠" : `${(counts[p.id] ?? 0) * def.penaltyPer}`}
                </Text>
              </View>
            </View>
          ))}
        </>
      )}

      {(def.type === "radio" || def.type === "bonus") && (
        <>
          <Text style={[s.label, { color: colors.textMuted }]}>
            {def.id === "sheikh" ? "من أخذ شيخ الكبة؟" : "من أخذ التركس؟"}
          </Text>
          <View style={{ gap: 8 }}>
            {players.map((p) => (
              <TouchableOpacity
                key={p.id}
                onPress={() => { Haptics.selectionAsync(); setRadioPlayer(radioPlayer === p.id ? null : p.id); }}
                style={[tkStyles.radioBtn,
                  radioPlayer === p.id
                    ? { backgroundColor: def.id === "terkis" ? `${colors.gold}22` : `${colors.red}22`, borderColor: def.id === "terkis" ? colors.gold : colors.red }
                    : { backgroundColor: colors.surfaceRaised, borderColor: colors.border }]}
              >
                <Text style={[tkStyles.playerName, {
                  color: radioPlayer === p.id
                    ? def.id === "terkis" ? colors.gold : colors.red
                    : colors.text
                }]}>
                  {p.name}
                </Text>
                {radioPlayer === p.id && (
                  <Text style={[tkStyles.playerScore, { fontFamily: Fonts.mono, color: def.id === "terkis" ? colors.gold : colors.red }]}>
                    {def.id === "terkis"
                      ? `+${TERKIS_BONUS_VALUES[Math.min(terkisPosition - 1, TERKIS_BONUS_VALUES.length - 1)]}`
                      : `${def.penaltyPer}`}
                  </Text>
                )}
              </TouchableOpacity>
            ))}
            <TouchableOpacity
              onPress={() => { Haptics.selectionAsync(); setRadioPlayer(null); }}
              style={[tkStyles.radioBtn,
                !radioPlayer
                  ? { backgroundColor: colors.surface, borderColor: colors.borderStrong }
                  : { backgroundColor: colors.surfaceRaised, borderColor: colors.border }]}
            >
              <Text style={[tkStyles.playerName, { color: !radioPlayer ? colors.text : colors.textDim }]}>
                ما أخذها أحد
              </Text>
            </TouchableOpacity>
          </View>

          {def.id === "terkis" && radioPlayer && (
            <>
              <Text style={[s.label, { color: colors.textMuted, marginTop: 12 }]}>
                هذه المرة رقم؟ (للتركس في هذه الجلسة)
              </Text>
              <View style={{ flexDirection: "row-reverse", gap: 8 }}>
                {[1, 2, 3, 4].map((pos) => (
                  <TouchableOpacity
                    key={pos}
                    onPress={() => { Haptics.selectionAsync(); setTerkisPosition(pos); }}
                    style={[tkStyles.posBtn,
                      terkisPosition === pos
                        ? { backgroundColor: colors.gold }
                        : { backgroundColor: colors.surfaceRaised, borderColor: colors.border, borderWidth: 1 }]}
                  >
                    <Text style={[tkStyles.posBtnText, { color: terkisPosition === pos ? colors.background : colors.textMuted }]}>
                      {pos === 1 ? "١" : pos === 2 ? "٢" : pos === 3 ? "٣" : "٤+"}
                    </Text>
                    <Text style={[tkStyles.posBtnVal, { color: terkisPosition === pos ? colors.background : colors.textDim, fontFamily: Fonts.mono }]}>
                      +{TERKIS_BONUS_VALUES[Math.min(pos - 1, 3)]}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </>
          )}
        </>
      )}

      <View style={[s.preview, { backgroundColor: colors.surface, marginTop: 16 }]}>
        <Text style={[s.previewTitle, { color: colors.textMuted }]}>النتيجة</Text>
        {players.map((p) => (
          <View key={p.id} style={s.previewRow}>
            <Text style={[s.previewScore, {
              color: (scores[p.id] ?? 0) > 0 ? colors.gold : (scores[p.id] ?? 0) < 0 ? colors.red : colors.textDim,
              fontFamily: Fonts.mono
            }]}>
              {(scores[p.id] ?? 0) > 0 ? `+${scores[p.id]}` : `${scores[p.id] ?? 0}`}
            </Text>
            <Text style={[s.previewName, { color: colors.text }]} numberOfLines={1}>{p.name}</Text>
          </View>
        ))}
      </View>

      <Actions onClose={onClose} onConfirm={confirm} colors={colors} />
    </ScrollView>
  );
}

const tkStyles = StyleSheet.create({
  contractBtn: { paddingHorizontal: 14, paddingVertical: 10, borderRadius: 20, alignItems: "center", minWidth: 70 },
  contractLabel: { fontFamily: Fonts.heading, fontSize: 14 },
  contractPts: { fontFamily: Fonts.mono, fontSize: 11, marginTop: 2 },
  playerRow: { flexDirection: "row-reverse", alignItems: "center", justifyContent: "space-between", marginBottom: 12, gap: 8 },
  playerInfo: { flex: 1, alignItems: "flex-end" },
  playerName: { fontFamily: Fonts.body, fontSize: 15, textAlign: "right" },
  playerScore: { fontSize: 18, textAlign: "right", marginTop: 2 },
  radioBtn: { flexDirection: "row-reverse", justifyContent: "space-between", alignItems: "center", padding: 14, borderRadius: 14, borderWidth: 1.5 },
  posBtn: { flex: 1, paddingVertical: 10, borderRadius: 14, alignItems: "center" },
  posBtnText: { fontFamily: Fonts.heading, fontSize: 16 },
  posBtnVal: { fontSize: 12, marginTop: 2 },
});

// ─── HAND/KONKAN ENTRY ────────────────────────────────────────────────────────
function HandEntry({ players, onSubmit, onClose }: { players: Player[]; onSubmit: (s: Record<string, number>) => void; onClose: () => void }) {
  const colors = useColors();
  const [winner, setWinner] = useState<string | null>(null);
  const [isHand, setIsHand] = useState(false);
  const [noCards, setNoCards] = useState<Record<string, boolean>>(
    () => Object.fromEntries(players.map((p) => [p.id, false]))
  );
  const [remaining, setRemaining] = useState<Record<string, number>>(
    () => Object.fromEntries(players.map((p) => [p.id, 0]))
  );

  const calcScores = (): Record<string, number> => {
    const mult = isHand ? 2 : 1;
    const s: Record<string, number> = {};
    players.forEach((p) => {
      if (p.id === winner) {
        s[p.id] = isHand ? -60 : -30;
      } else {
        if (noCards[p.id]) {
          s[p.id] = 100 * mult;
        } else {
          s[p.id] = (remaining[p.id] ?? 0) * mult;
        }
      }
    });
    return s;
  };

  const scores = calcScores();
  const isValid = !!winner;

  const confirm = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    onSubmit(scores);
  };

  return (
    <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
      <Text style={[s.label, { color: colors.textMuted }]}>مين فتح؟ (خلّص يده أول)</Text>
      <View style={{ gap: 8, marginBottom: 12 }}>
        {players.map((p) => (
          <TouchableOpacity
            key={p.id}
            onPress={() => { Haptics.selectionAsync(); setWinner(winner === p.id ? null : p.id); }}
            style={[handStyles.winnerBtn,
              winner === p.id
                ? { backgroundColor: `${colors.gold}22`, borderColor: colors.gold }
                : { backgroundColor: colors.surfaceRaised, borderColor: colors.border }]}
          >
            <Text style={[tkStyles.playerScore, { fontFamily: Fonts.mono, color: winner === p.id ? colors.gold : colors.textDim }]}>
              {winner === p.id ? (isHand ? "-60" : "-30") : ""}
            </Text>
            <Text style={[tkStyles.playerName, { color: winner === p.id ? colors.gold : colors.text }]}>
              {p.name}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <TouchableOpacity
        onPress={() => { Haptics.selectionAsync(); setIsHand((v) => !v); }}
        style={[s.toggleBtn, isHand
          ? { backgroundColor: `${colors.gold}22`, borderColor: colors.gold }
          : { backgroundColor: colors.surfaceRaised, borderColor: colors.border }]}
      >
        <Text style={[s.toggleText, { color: isHand ? colors.gold : colors.textMuted }]}>
          هاند 🃏 — فتح كل الأوراق دفعة وحدة {isHand ? "✓" : ""}
        </Text>
      </TouchableOpacity>
      {isHand && (
        <Text style={[s.hint, { color: colors.textDim }]}>الفائز: -60  |  العقوبات تتضاعف</Text>
      )}

      <View style={[s.divider, { backgroundColor: colors.border }]} />

      {winner && (
        <>
          <Text style={[s.label, { color: colors.textMuted }]}>الخاسرون — قيمة الأوراق المتبقية</Text>
          {players.filter((p) => p.id !== winner).map((p) => (
            <View key={p.id} style={handStyles.loserRow}>
              <View style={{ flex: 1, gap: 6 }}>
                <Text style={[tkStyles.playerName, { color: colors.text }]}>{p.name}</Text>
                <TouchableOpacity
                  onPress={() => { Haptics.selectionAsync(); setNoCards((prev) => ({ ...prev, [p.id]: !prev[p.id] })); }}
                  style={[handStyles.noCardsBtn,
                    noCards[p.id]
                      ? { backgroundColor: `${colors.red}22`, borderColor: colors.red }
                      : { backgroundColor: colors.surfaceRaised, borderColor: colors.border }]}
                >
                  <Text style={[handStyles.noCardsText, { color: noCards[p.id] ? colors.red : colors.textDim }]}>
                    ما لعب أوراقاً (+{100 * (isHand ? 2 : 1)})
                  </Text>
                </TouchableOpacity>
              </View>
              {!noCards[p.id] && (
                <View style={{ alignItems: "center", gap: 4 }}>
                  <Stepper
                    value={remaining[p.id] ?? 0}
                    onChange={(v) => setRemaining((prev) => ({ ...prev, [p.id]: v }))}
                    min={0}
                    max={150}
                    colors={colors}
                  />
                  {isHand && (
                    <Text style={[s.hint, { color: colors.textDim, marginTop: 2 }]}>
                      ×٢ = {(remaining[p.id] ?? 0) * 2}
                    </Text>
                  )}
                </View>
              )}
            </View>
          ))}
        </>
      )}

      <View style={[s.preview, { backgroundColor: colors.surface, marginTop: 12 }]}>
        <Text style={[s.previewTitle, { color: colors.textMuted }]}>النتيجة</Text>
        {players.map((p) => (
          <View key={p.id} style={s.previewRow}>
            <Text style={[s.previewScore, {
              color: (scores[p.id] ?? 0) < 0 ? colors.success : (scores[p.id] ?? 0) > 50 ? colors.red : colors.textMuted,
              fontFamily: Fonts.mono
            }]}>
              {(scores[p.id] ?? 0) >= 0 ? `+${scores[p.id] ?? 0}` : `${scores[p.id]}`}
            </Text>
            <Text style={[s.previewName, { color: colors.text }]} numberOfLines={1}>{p.name}</Text>
          </View>
        ))}
      </View>

      <Actions onClose={onClose} onConfirm={confirm} colors={colors} disabled={!isValid} />
    </ScrollView>
  );
}

const handStyles = StyleSheet.create({
  winnerBtn: { flexDirection: "row-reverse", justifyContent: "space-between", alignItems: "center", padding: 14, borderRadius: 14, borderWidth: 1.5 },
  loserRow: { flexDirection: "row-reverse", justifyContent: "space-between", alignItems: "center", marginBottom: 14, gap: 10 },
  noCardsBtn: { flexDirection: "row-reverse", alignItems: "center", paddingHorizontal: 10, paddingVertical: 6, borderRadius: 10, borderWidth: 1 },
  noCardsText: { fontFamily: Fonts.body, fontSize: 12 },
});

// ─── GENERIC ENTRY ────────────────────────────────────────────────────────────
function GenericEntry({ players, onSubmit, onClose }: { players: Player[]; onSubmit: (s: Record<string, number>) => void; onClose: () => void }) {
  const colors = useColors();
  const [inputs, setInputs] = useState<Record<string, string>>(
    () => Object.fromEntries(players.map((p) => [p.id, ""]))
  );

  const confirm = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    const res: Record<string, number> = {};
    players.forEach((p) => { res[p.id] = parseInt(inputs[p.id]?.trim() ?? "0", 10) || 0; });
    onSubmit(res);
  };

  return (
    <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined}>
      <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
        {players.map((p) => (
          <View key={p.id} style={[genStyles.row, { borderBottomColor: colors.border }]}>
            <View style={genStyles.stepper}>
              <TouchableOpacity onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                setInputs((prev) => ({ ...prev, [p.id]: String((parseInt(prev[p.id] ?? "0", 10) || 0) - 5) }));
              }} style={[genStyles.stepBtn, { backgroundColor: `${colors.red}33` }]}>
                <Feather name="minus" size={16} color={colors.red} />
              </TouchableOpacity>
              <TextInput
                style={[genStyles.input, { color: colors.text, backgroundColor: colors.surface, fontFamily: Fonts.mono }]}
                value={inputs[p.id] ?? ""}
                onChangeText={(v) => setInputs((prev) => ({ ...prev, [p.id]: v }))}
                keyboardType="numbers-and-punctuation"
                textAlign="center"
                returnKeyType="done"
                placeholderTextColor={colors.textDim}
                placeholder="0"
              />
              <TouchableOpacity onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                setInputs((prev) => ({ ...prev, [p.id]: String((parseInt(prev[p.id] ?? "0", 10) || 0) + 5) }));
              }} style={[genStyles.stepBtn, { backgroundColor: `${colors.success}33` }]}>
                <Feather name="plus" size={16} color={colors.success} />
              </TouchableOpacity>
            </View>
            <Text style={[genStyles.name, { color: colors.text }]}>{p.name}</Text>
          </View>
        ))}
      </ScrollView>
      <Actions onClose={onClose} onConfirm={confirm} colors={colors} />
    </KeyboardAvoidingView>
  );
}

const genStyles = StyleSheet.create({
  row: { flexDirection: "row-reverse", alignItems: "center", justifyContent: "space-between", paddingVertical: 14, borderBottomWidth: 1 },
  name: { fontFamily: Fonts.body, fontSize: 16, textAlign: "right", flex: 1, marginLeft: 8 },
  stepper: { flexDirection: "row", alignItems: "center", gap: 6 },
  stepBtn: { width: 36, height: 36, borderRadius: 10, alignItems: "center", justifyContent: "center" },
  input: { width: 70, height: 40, borderRadius: 10, fontSize: 16 },
});

// ─── SHARED STYLES ────────────────────────────────────────────────────────────
const s = StyleSheet.create({
  label: { fontFamily: Fonts.body, fontSize: 13, textAlign: "right", marginBottom: 8, marginTop: 4 },
  subHint: { fontFamily: Fonts.body, fontSize: 12, marginTop: 6 },
  hint: { fontFamily: Fonts.body, fontSize: 12, textAlign: "center", marginBottom: 6 },
  teamRow: { flexDirection: "row-reverse", gap: 10, marginBottom: 8 },
  teamBtn: { flex: 1, paddingVertical: 12, paddingHorizontal: 8, borderRadius: 12, alignItems: "center" },
  teamBtnText: { fontFamily: Fonts.body, fontSize: 13, textAlign: "center" },
  divider: { height: 1, marginVertical: 12 },
  centered: { alignItems: "center", marginBottom: 14, gap: 6 },
  toggleBtn: { alignSelf: "center", paddingHorizontal: 24, paddingVertical: 10, borderRadius: 20, borderWidth: 1.5, marginBottom: 6 },
  toggleText: { fontFamily: Fonts.heading, fontSize: 15 },
  preview: { borderRadius: 14, padding: 14, gap: 10, marginTop: 8 },
  previewTitle: { fontFamily: Fonts.body, fontSize: 12, textAlign: "right", marginBottom: 2 },
  previewRow: { flexDirection: "row-reverse", justifyContent: "space-between", alignItems: "center" },
  previewName: { fontFamily: Fonts.body, fontSize: 15, flex: 1, textAlign: "right" },
  previewScore: { fontSize: 20 },
});

// ─── SHELL ────────────────────────────────────────────────────────────────────
export function ScoreEntryModal({ visible, players, roundNumber, gameId, onClose, onSubmit }: Props) {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const slideAnim = useRef(new Animated.Value(SCREEN_HEIGHT)).current;

  useEffect(() => {
    if (visible) {
      Animated.spring(slideAnim, { toValue: 0, useNativeDriver: true, damping: 20, stiffness: 200 }).start();
    } else {
      Animated.timing(slideAnim, { toValue: SCREEN_HEIGHT, duration: 250, useNativeDriver: true }).start();
    }
  }, [visible, slideAnim]);

  const isTarneeb = gameId === "tarneeb" || gameId === "tarneeb_sy";
  const isTerkis = gameId === "terkis" || gameId === "terkis_team" || gameId === "terkis_complex";
  const isHand = gameId === "hand";

  const GAME_LABELS: Record<string, string> = {
    tarneeb: "طرنيب عادي", tarneeb_sy: "طرنيب سوري",
    terkis: "تركس فردي", terkis_team: "تركس شراكة", terkis_complex: "تركس كومبلكس",
    "400": "٤٠٠", hand: "هاند / كنكان", baloot: "بلوت", basra: "بصرة",
    leekha: "ليخة", domino: "دومينو", jackaroo: "جاكارو", jackaroo_cx: "جاكارو كومبلكس",
    harreega: "حريقة", nthaleh: "نذالة",
  };

  const title = `جولة ${roundNumber}${gameId ? ` — ${GAME_LABELS[gameId] ?? ""}` : ""}`;

  return (
    <Modal visible={visible} transparent animationType="none" statusBarTranslucent onRequestClose={onClose}>
      <TouchableWithoutFeedback onPress={onClose}>
        <View style={shellStyles.overlay} />
      </TouchableWithoutFeedback>

      <Animated.View style={[shellStyles.sheet, {
        backgroundColor: colors.surfaceHigh,
        paddingBottom: insets.bottom + 16,
        transform: [{ translateY: slideAnim }],
      }]}>
        <View style={[shellStyles.handle, { backgroundColor: colors.textDim }]} />
        <Text style={[shellStyles.title, { color: colors.text }]}>{title}</Text>

        {isTarneeb ? (
          <TarneebEntry players={players} onSubmit={onSubmit} onClose={onClose} />
        ) : isTerkis ? (
          <TerkisEntry players={players} onSubmit={onSubmit} onClose={onClose} />
        ) : isHand ? (
          <HandEntry players={players} onSubmit={onSubmit} onClose={onClose} />
        ) : (
          <GenericEntry players={players} onSubmit={onSubmit} onClose={onClose} />
        )}
      </Animated.View>
    </Modal>
  );
}

const shellStyles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.6)" },
  sheet: {
    position: "absolute", bottom: 0, left: 0, right: 0,
    borderTopLeftRadius: 24, borderTopRightRadius: 24,
    padding: 20, maxHeight: SCREEN_HEIGHT * 0.92,
  },
  handle: { width: 40, height: 4, borderRadius: 2, alignSelf: "center", marginBottom: 16 },
  title: { fontFamily: Fonts.heading, fontSize: 18, textAlign: "center", marginBottom: 16 },
});
