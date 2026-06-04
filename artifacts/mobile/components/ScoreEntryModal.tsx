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
import { GameRules, Player } from "@/contexts/AppContext";
import { useColors } from "@/hooks/useColors";

const { height: SCREEN_HEIGHT } = Dimensions.get("window");

interface Props {
  visible: boolean;
  players: Player[];
  roundNumber: number;
  gameId?: string;
  rules?: GameRules;
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
        <Text style={[actStyles.confirmText, { color: disabled ? colors.textDim : colors.background }]}>تمام</Text>
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
function TarneebEntry({ players, rules, onSubmit, onClose }: { players: Player[]; rules?: GameRules; onSubmit: (s: Record<string, number>) => void; onClose: () => void }) {
  const colors = useColors();
  const [biddingTeam, setBiddingTeam] = useState<0 | 1>(0);
  const minBid = rules?.minBid ?? 7;
  const [bid, setBid] = useState(minBid);
  const [tricks, setTricks] = useState(minBid);
  const [kabout, setKabout] = useState(false);

  const teamA = [players[0], players[2]].filter(Boolean);
  const teamB = [players[1], players[3]].filter(Boolean);

  const otherTricks = 13 - tricks;
  const failScore = (rules?.penaltyOnFail ?? true) ? -bid : 0;
  const successScore = (rules?.doubleBid && tricks === bid) ? bid * 2 : tricks;
  const biddingScore = kabout
    ? bid === 13 ? 26 : 16
    : tricks >= bid ? successScore : failScore;
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
          <Text style={[s.label, { color: colors.textMuted }]}>المزايدة (الحد الأدنى: {minBid})</Text>
          <View style={s.centered}>
            <Stepper value={bid} onChange={setBid} min={minBid} max={13} colors={colors} />
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

// ─── TERKIS COMPLEX ENTRY ─────────────────────────────────────────────────────
const TERKIS_FINISH_VALS = [200, 150, 100, 50];

function TerkisComplexEntry({ players, onSubmit, onClose }: { players: Player[]; onSubmit: (s: Record<string, number>) => void; onClose: () => void }) {
  const colors = useColors();
  const [king, setKing] = useState<string | null>(null);
  const [roundType, setRoundType] = useState<"complex" | "terkis">("complex");

  // COMPLEX state
  const [dinary, setDinary] = useState<Record<string, number>>(() => Object.fromEntries(players.map((p) => [p.id, 0])));
  const [banat, setBanat] = useState<Record<string, number>>(() => Object.fromEntries(players.map((p) => [p.id, 0])));
  const [ltosh, setLtosh] = useState<Record<string, number>>(() => Object.fromEntries(players.map((p) => [p.id, 0])));
  const [sheikOwner, setSheikOwner] = useState<string | null>(null);
  const [hasTadveel, setHasTadveel] = useState(false);
  const [tadveelCard, setTadveelCard] = useState<"sheik" | "bint" | null>(null);
  const [tadveelRevealer, setTadveelRevealer] = useState<string | null>(null);
  const [tadveelTaker, setTadveelTaker] = useState<string | null>(null);

  // TERKIS state
  const [terkisOrder, setTerkisOrder] = useState<string[]>([]);

  const handleRoundTypeChange = (t: "complex" | "terkis") => {
    Haptics.selectionAsync();
    setRoundType(t);
    setDinary(Object.fromEntries(players.map((p) => [p.id, 0])));
    setBanat(Object.fromEntries(players.map((p) => [p.id, 0])));
    setLtosh(Object.fromEntries(players.map((p) => [p.id, 0])));
    setSheikOwner(null);
    setHasTadveel(false);
    setTadveelCard(null);
    setTadveelRevealer(null);
    setTadveelTaker(null);
    setTerkisOrder([]);
  };

  const calcScores = (): Record<string, number> => {
    const s: Record<string, number> = {};
    players.forEach((p) => (s[p.id] = 0));
    if (roundType === "complex") {
      players.forEach((p) => {
        s[p.id] += (dinary[p.id] ?? 0) * -10;
        s[p.id] += (banat[p.id] ?? 0) * -25;
        s[p.id] += (ltosh[p.id] ?? 0) * -15;
        if (p.id === sheikOwner) s[p.id] -= 75;
      });
      if (hasTadveel && tadveelCard && tadveelRevealer && tadveelTaker) {
        const originalVal = tadveelCard === "sheik" ? 75 : 25;
        s[tadveelRevealer] = (s[tadveelRevealer] ?? 0) + originalVal;
        s[tadveelTaker] = (s[tadveelTaker] ?? 0) - originalVal;
      }
    } else {
      terkisOrder.forEach((pid, idx) => {
        s[pid] = TERKIS_FINISH_VALS[idx] ?? 50;
      });
    }
    return s;
  };

  const scores = calcScores();
  const isComplexValid = roundType !== "complex" || !hasTadveel || (!!tadveelCard && !!tadveelRevealer && !!tadveelTaker);
  const isTerkisValid = roundType !== "terkis" || terkisOrder.length === players.length;
  const isValid = isComplexValid && isTerkisValid;

  const confirm = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    onSubmit(scores);
  };

  const toggleTerkisFinisher = (pid: string) => {
    Haptics.selectionAsync();
    setTerkisOrder((prev) => prev.includes(pid) ? prev.filter((x) => x !== pid) : [...prev, pid]);
  };

  return (
    <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
      {/* المملكة الحالية */}
      <Text style={[s.label, { color: colors.textMuted }]}>المملكة الحالية — صاحبها 👑</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 12 }}>
        <View style={{ flexDirection: "row-reverse", gap: 8, paddingHorizontal: 2 }}>
          {players.map((p) => (
            <TouchableOpacity
              key={p.id}
              onPress={() => { Haptics.selectionAsync(); setKing(king === p.id ? null : p.id); }}
              style={[tkStyles.contractBtn,
                king === p.id
                  ? { backgroundColor: colors.gold }
                  : { backgroundColor: colors.surfaceRaised, borderColor: colors.border, borderWidth: 1 }]}
            >
              <Text style={[tkStyles.contractLabel, { color: king === p.id ? colors.background : colors.textMuted }]}>{p.name}</Text>
              {king === p.id && <Text style={[tkStyles.contractPts, { color: colors.background }]}>👑</Text>}
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>

      {/* نوع الطلبة */}
      <Text style={[s.label, { color: colors.textMuted }]}>الطلبة</Text>
      <View style={{ flexDirection: "row-reverse", gap: 10, marginBottom: 12 }}>
        {(["complex", "terkis"] as const).map((t) => (
          <TouchableOpacity
            key={t}
            onPress={() => handleRoundTypeChange(t)}
            style={[s.teamBtn, { flex: 1 },
              roundType === t
                ? { backgroundColor: t === "complex" ? colors.red : colors.gold }
                : { backgroundColor: colors.surfaceRaised, borderColor: colors.border, borderWidth: 1 }]}
          >
            <Text style={[s.teamBtnText, { color: roundType === t ? colors.background : colors.textMuted }]}>
              {t === "complex" ? "كومبلكس" : "تركس"}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <View style={[s.divider, { backgroundColor: colors.border }]} />

      {roundType === "complex" && (
        <>
          {/* ديناري */}
          <Text style={[s.label, { color: colors.textMuted }]}>♦ ديناري (-١٠ لكل)</Text>
          {players.map((p) => (
            <View key={`d-${p.id}`} style={tkStyles.playerRow}>
              <Stepper value={dinary[p.id] ?? 0} onChange={(v) => setDinary((prev) => ({ ...prev, [p.id]: v }))} min={0} max={13} colors={colors} />
              <View style={tkStyles.playerInfo}>
                <Text style={[tkStyles.playerName, { color: colors.text }]}>{p.name}</Text>
                <Text style={[tkStyles.playerScore, { color: (dinary[p.id] ?? 0) > 0 ? colors.red : colors.textDim, fontFamily: Fonts.mono }]}>
                  {(dinary[p.id] ?? 0) > 0 ? `${(dinary[p.id] ?? 0) * -10}` : "٠"}
                </Text>
              </View>
            </View>
          ))}

          <View style={[s.divider, { backgroundColor: colors.border }]} />

          {/* بنات */}
          <Text style={[s.label, { color: colors.textMuted }]}>Q بنت (-٢٥ لكل)</Text>
          {players.map((p) => (
            <View key={`b-${p.id}`} style={tkStyles.playerRow}>
              <Stepper value={banat[p.id] ?? 0} onChange={(v) => setBanat((prev) => ({ ...prev, [p.id]: v }))} min={0} max={4} colors={colors} />
              <View style={tkStyles.playerInfo}>
                <Text style={[tkStyles.playerName, { color: colors.text }]}>{p.name}</Text>
                <Text style={[tkStyles.playerScore, { color: (banat[p.id] ?? 0) > 0 ? colors.red : colors.textDim, fontFamily: Fonts.mono }]}>
                  {(banat[p.id] ?? 0) > 0 ? `${(banat[p.id] ?? 0) * -25}` : "٠"}
                </Text>
              </View>
            </View>
          ))}

          <View style={[s.divider, { backgroundColor: colors.border }]} />

          {/* لطشات */}
          <Text style={[s.label, { color: colors.textMuted }]}>لطشات (-١٥ لكل)</Text>
          {players.map((p) => (
            <View key={`l-${p.id}`} style={tkStyles.playerRow}>
              <Stepper value={ltosh[p.id] ?? 0} onChange={(v) => setLtosh((prev) => ({ ...prev, [p.id]: v }))} min={0} max={13} colors={colors} />
              <View style={tkStyles.playerInfo}>
                <Text style={[tkStyles.playerName, { color: colors.text }]}>{p.name}</Text>
                <Text style={[tkStyles.playerScore, { color: (ltosh[p.id] ?? 0) > 0 ? colors.red : colors.textDim, fontFamily: Fonts.mono }]}>
                  {(ltosh[p.id] ?? 0) > 0 ? `${(ltosh[p.id] ?? 0) * -15}` : "٠"}
                </Text>
              </View>
            </View>
          ))}

          <View style={[s.divider, { backgroundColor: colors.border }]} />

          {/* شيخ الكبة */}
          <Text style={[s.label, { color: colors.textMuted }]}>K♠ شيخ الكبة (-٧٥) — من أخذه؟</Text>
          <View style={{ gap: 8, marginBottom: 12 }}>
            {players.map((p) => (
              <TouchableOpacity key={`sk-${p.id}`}
                onPress={() => { Haptics.selectionAsync(); setSheikOwner(sheikOwner === p.id ? null : p.id); }}
                style={[tkStyles.radioBtn, sheikOwner === p.id ? { backgroundColor: `${colors.red}22`, borderColor: colors.red } : { backgroundColor: colors.surfaceRaised, borderColor: colors.border }]}>
                <Text style={[tkStyles.playerScore, { fontFamily: Fonts.mono, color: sheikOwner === p.id ? colors.red : colors.textDim }]}>
                  {sheikOwner === p.id ? "-75" : ""}
                </Text>
                <Text style={[tkStyles.playerName, { color: sheikOwner === p.id ? colors.red : colors.text }]}>{p.name}</Text>
              </TouchableOpacity>
            ))}
            <TouchableOpacity onPress={() => { Haptics.selectionAsync(); setSheikOwner(null); }}
              style={[tkStyles.radioBtn, !sheikOwner ? { backgroundColor: colors.surface, borderColor: colors.borderStrong } : { backgroundColor: colors.surfaceRaised, borderColor: colors.border }]}>
              <Text style={[tkStyles.playerName, { color: !sheikOwner ? colors.text : colors.textDim }]}>ما أخذه أحد</Text>
            </TouchableOpacity>
          </View>

          {/* التدبيل */}
          <View style={[s.divider, { backgroundColor: colors.border }]} />
          <TouchableOpacity
            onPress={() => { Haptics.selectionAsync(); setHasTadveel(!hasTadveel); setTadveelCard(null); setTadveelRevealer(null); setTadveelTaker(null); }}
            style={[tkStyles.radioBtn, hasTadveel ? { backgroundColor: `${colors.gold}22`, borderColor: colors.gold } : { backgroundColor: colors.surfaceRaised, borderColor: colors.border }]}
          >
            <Text style={[tkStyles.playerName, { color: hasTadveel ? colors.gold : colors.text }]}>🃏 في تدبيل؟</Text>
          </TouchableOpacity>

          {hasTadveel && (
            <View style={{ marginTop: 10, gap: 10 }}>
              <Text style={[s.subHint, { color: colors.textDim }]}>الورقة المكشوفة</Text>
              <View style={{ flexDirection: "row-reverse", gap: 10 }}>
                {([{ id: "sheik" as const, label: "K♠ شيخ (+٧٥)" }, { id: "bint" as const, label: "Q بنت (+٢٥)" }]).map(({ id, label }) => (
                  <TouchableOpacity key={id} onPress={() => { Haptics.selectionAsync(); setTadveelCard(id); }}
                    style={[s.teamBtn, { flex: 1 }, tadveelCard === id ? { backgroundColor: colors.gold } : { backgroundColor: colors.surfaceRaised, borderColor: colors.border, borderWidth: 1 }]}>
                    <Text style={[s.teamBtnText, { color: tadveelCard === id ? colors.background : colors.textMuted }]}>{label}</Text>
                  </TouchableOpacity>
                ))}
              </View>
              <Text style={[s.subHint, { color: colors.textDim }]}>المدبّل (من كشف)</Text>
              <View style={{ gap: 6 }}>
                {players.map((p) => (
                  <TouchableOpacity key={`tr-${p.id}`} onPress={() => { Haptics.selectionAsync(); setTadveelRevealer(p.id); }}
                    style={[tkStyles.radioBtn, tadveelRevealer === p.id ? { backgroundColor: `${colors.gold}22`, borderColor: colors.gold } : { backgroundColor: colors.surfaceRaised, borderColor: colors.border }]}>
                    <Text style={[tkStyles.playerName, { color: tadveelRevealer === p.id ? colors.gold : colors.text }]}>{p.name}</Text>
                  </TouchableOpacity>
                ))}
              </View>
              <Text style={[s.subHint, { color: colors.textDim }]}>من أخذ الورقة المدبّلة</Text>
              <View style={{ gap: 6 }}>
                {players.map((p) => (
                  <TouchableOpacity key={`tt-${p.id}`} onPress={() => { Haptics.selectionAsync(); setTadveelTaker(p.id); }}
                    style={[tkStyles.radioBtn, tadveelTaker === p.id ? { backgroundColor: `${colors.red}22`, borderColor: colors.red } : { backgroundColor: colors.surfaceRaised, borderColor: colors.border }]}>
                    <Text style={[tkStyles.playerName, { color: tadveelTaker === p.id ? colors.red : colors.text }]}>{p.name}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          )}
        </>
      )}

      {roundType === "terkis" && (
        <>
          <Text style={[s.label, { color: colors.textMuted }]}>اضغط على اللاعبين بترتيب من خلّص أول</Text>
          <Text style={[s.subHint, { color: colors.textDim, marginBottom: 10 }]}>١) +٢٠٠  ·  ٢) +١٥٠  ·  ٣) +١٠٠  ·  ٤) +٥٠</Text>
          <View style={{ gap: 8, marginBottom: 12 }}>
            {players.map((p) => {
              const pos = terkisOrder.indexOf(p.id);
              const isSel = pos !== -1;
              return (
                <TouchableOpacity key={p.id} onPress={() => toggleTerkisFinisher(p.id)}
                  style={[tkStyles.radioBtn, isSel ? { backgroundColor: `${colors.gold}22`, borderColor: colors.gold } : { backgroundColor: colors.surfaceRaised, borderColor: colors.border }]}>
                  <View style={{ flexDirection: "row-reverse", alignItems: "center", gap: 8 }}>
                    {isSel && (
                      <View style={{ width: 22, height: 22, borderRadius: 11, backgroundColor: colors.gold, alignItems: "center", justifyContent: "center" }}>
                        <Text style={{ color: colors.background, fontFamily: Fonts.mono, fontSize: 11 }}>{pos + 1}</Text>
                      </View>
                    )}
                    <Text style={[tkStyles.playerName, { color: isSel ? colors.gold : colors.text }]}>{p.name}</Text>
                  </View>
                  {isSel && (
                    <Text style={[tkStyles.playerScore, { fontFamily: Fonts.mono, color: colors.gold }]}>+{TERKIS_FINISH_VALS[pos]}</Text>
                  )}
                </TouchableOpacity>
              );
            })}
          </View>
          {terkisOrder.length < players.length && (
            <Text style={[s.subHint, { color: colors.textDim, textAlign: "center", marginBottom: 8 }]}>
              اضغط باقي اللاعبين بترتيب خلاصهم
            </Text>
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

      <Actions onClose={onClose} onConfirm={confirm} colors={colors} disabled={!isValid} />
    </ScrollView>
  );
}

// ─── BALOOT ENTRY ────────────────────────────────────────────────────────────
function BalootEntry({ players, onSubmit, onClose }: { players: Player[]; onSubmit: (s: Record<string, number>) => void; onClose: () => void }) {
  const colors = useColors();
  const teamA = [players[0], players[2]].filter(Boolean);
  const teamB = [players[1], players[3]].filter(Boolean);
  const teamAName = teamA.map((p) => p.name).join(" / ");
  const teamBName = teamB.map((p) => p.name).join(" / ");

  const [mode, setMode] = useState<"sun" | "hokm">("sun");
  const [biddingTeam, setBiddingTeam] = useState<0 | 1>(0);
  const [aRaw, setARaw] = useState(0);
  const [bRaw, setBRaw] = useState(0);
  const [lastTrick, setLastTrick] = useState<0 | 1 | null>(null);
  const [allTricks, setAllTricks] = useState<0 | 1 | null>(null);
  const [sraaA, setSraaA] = useState(0);
  const [sraaB, setSraaB] = useState(0);
  const [khamsinA, setKhamsinA] = useState(0);
  const [khamsinB, setKhamsinB] = useState(0);
  const [miaA, setMiaA] = useState(0);
  const [miaB, setMiaB] = useState(0);
  const [baloota, setBaloota] = useState<0 | 1 | null>(null);

  const calcScores = () => {
    const mult = mode === "sun" ? 2 : 1;
    const adjA = aRaw + (lastTrick === 0 ? 10 : 0);
    const adjB = bRaw + (lastTrick === 1 ? 10 : 0);
    let cardA: number, cardB: number;

    if (allTricks !== null) {
      cardA = allTricks === 0 ? 44 : 0;
      cardB = allTricks === 1 ? 44 : 0;
    } else {
      cardA = Math.round((adjA * mult) / 10) * 10;
      cardB = Math.round((adjB * mult) / 10) * 10;
      if (biddingTeam === 0 && cardA <= cardB) {
        cardA = 0;
        cardB = mode === "sun" ? 26 : 16;
      } else if (biddingTeam === 1 && cardB <= cardA) {
        cardB = 0;
        cardA = mode === "sun" ? 26 : 16;
      }
    }

    const projA = sraaA * 20 + khamsinA * 50 + miaA * 100 + (baloota === 0 ? 20 : 0);
    const projB = sraaB * 20 + khamsinB * 50 + miaB * 100 + (baloota === 1 ? 20 : 0);
    const failedBidder =
      allTricks === null &&
      ((biddingTeam === 0 && cardA === 0) || (biddingTeam === 1 && cardB === 0));
    return { scoreA: cardA + projA, scoreB: cardB + projB, cardA, cardB, projA, projB, failedBidder };
  };

  const { scoreA, scoreB, cardA, cardB, projA, projB, failedBidder } = calcScores();

  const confirm = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    const s: Record<string, number> = {};
    teamA.forEach((p) => { s[p.id] = scoreA; });
    teamB.forEach((p) => { s[p.id] = scoreB; });
    onSubmit(s);
  };

  const ModeBtn = ({ m, label }: { m: "sun" | "hokm"; label: string }) => (
    <TouchableOpacity
      onPress={() => { Haptics.selectionAsync(); setMode(m); }}
      style={[s.teamBtn, { flex: 1 },
        mode === m
          ? { backgroundColor: colors.gold }
          : { backgroundColor: colors.surfaceRaised, borderColor: colors.border, borderWidth: 1 }]}
    >
      <Text style={[s.teamBtnText, { color: mode === m ? colors.background : colors.textMuted }]}>{label}</Text>
    </TouchableOpacity>
  );

  const TeamPickBtn = ({ idx, label, active, onTap, activeColor }: { idx: 0 | 1; label: string; active: boolean; onTap: () => void; activeColor: string }) => (
    <TouchableOpacity
      onPress={() => { Haptics.selectionAsync(); onTap(); }}
      style={[s.teamBtn, { flex: 1 },
        active
          ? { backgroundColor: activeColor }
          : { backgroundColor: colors.surfaceRaised, borderColor: colors.border, borderWidth: 1 }]}
    >
      <Text numberOfLines={1} style={[s.teamBtnText, { color: active ? colors.background : colors.textMuted }]}>{label}</Text>
    </TouchableOpacity>
  );

  return (
    <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
      {/* نوع اللعب */}
      <Text style={[s.label, { color: colors.textMuted }]}>نوع اللعب</Text>
      <View style={{ flexDirection: "row-reverse", gap: 10, marginBottom: 12 }}>
        <ModeBtn m="sun" label="صن" />
        <ModeBtn m="hokm" label="حكم" />
      </View>

      {/* الطالب */}
      <Text style={[s.label, { color: colors.textMuted }]}>الطالب (من طلب اللعبة)</Text>
      <View style={{ flexDirection: "row-reverse", gap: 10, marginBottom: 12 }}>
        <TeamPickBtn idx={0} label={teamAName} active={biddingTeam === 0} onTap={() => setBiddingTeam(0)} activeColor={colors.gold} />
        <TeamPickBtn idx={1} label={teamBName} active={biddingTeam === 1} onTap={() => setBiddingTeam(1)} activeColor={colors.gold} />
      </View>

      <View style={[s.divider, { backgroundColor: colors.border }]} />

      {/* أخذ الكل */}
      <Text style={[s.label, { color: colors.textMuted }]}>أخذ كل الأكلات؟ (+٤٤)</Text>
      <View style={{ flexDirection: "row-reverse", gap: 10, marginBottom: 12 }}>
        <TeamPickBtn idx={0} label={teamAName} active={allTricks === 0} onTap={() => setAllTricks(allTricks === 0 ? null : 0)} activeColor={colors.success} />
        <TeamPickBtn idx={1} label={teamBName} active={allTricks === 1} onTap={() => setAllTricks(allTricks === 1 ? null : 1)} activeColor={colors.success} />
        <TouchableOpacity
          onPress={() => { Haptics.selectionAsync(); setAllTricks(null); }}
          style={[s.teamBtn, { paddingHorizontal: 12 },
            allTricks === null
              ? { backgroundColor: colors.surface, borderColor: colors.borderStrong, borderWidth: 1.5 }
              : { backgroundColor: colors.surfaceRaised, borderColor: colors.border, borderWidth: 1 }]}
        >
          <Text style={[s.teamBtnText, { color: colors.textMuted }]}>لا</Text>
        </TouchableOpacity>
      </View>

      {allTricks === null && (
        <>
          {/* أبناط */}
          <Text style={[s.label, { color: colors.textMuted }]}>أبناط كل فريق (مجموع قيمة أوراقه)</Text>
          {[{ label: teamAName, val: aRaw, set: setARaw }, { label: teamBName, val: bRaw, set: setBRaw }].map(({ label, val, set }, i) => (
            <View key={i} style={tkStyles.playerRow}>
              <Stepper value={val} onChange={set} min={0} max={300} colors={colors} />
              <View style={tkStyles.playerInfo}>
                <Text style={[tkStyles.playerName, { color: colors.text }]} numberOfLines={1}>{label}</Text>
                <Text style={[tkStyles.playerScore, { color: colors.textDim, fontFamily: Fonts.mono }]}>
                  ≈ {Math.round((val * (mode === "sun" ? 2 : 1)) / 10) * 10} نقطة
                </Text>
              </View>
            </View>
          ))}

          {/* آخر أكلة */}
          <Text style={[s.label, { color: colors.textMuted, marginTop: 8 }]}>آخر أكلة (+١٠ أبناط)</Text>
          <View style={{ flexDirection: "row-reverse", gap: 10, marginBottom: 12 }}>
            <TeamPickBtn idx={0} label={teamAName} active={lastTrick === 0} onTap={() => setLastTrick(lastTrick === 0 ? null : 0)} activeColor={`${colors.gold}`} />
            <TeamPickBtn idx={1} label={teamBName} active={lastTrick === 1} onTap={() => setLastTrick(lastTrick === 1 ? null : 1)} activeColor={`${colors.gold}`} />
          </View>
        </>
      )}

      <View style={[s.divider, { backgroundColor: colors.border }]} />

      {/* المشاريع */}
      <Text style={[s.label, { color: colors.textMuted }]}>المشاريع</Text>
      {[
        { key: "sraa", label: "سرا (+٢٠ لكل)", aVal: sraaA, bVal: sraaB, setA: setSraaA, setB: setSraaB, max: 5 },
        { key: "khamsin", label: "خمسين (+٥٠ لكل)", aVal: khamsinA, bVal: khamsinB, setA: setKhamsinA, setB: setKhamsinB, max: 3 },
        { key: "mia", label: "مئة (+١٠٠ لكل)", aVal: miaA, bVal: miaB, setA: setMiaA, setB: setMiaB, max: 2 },
      ].map(({ key, label, aVal, bVal, setA, setB, max }) => (
        <View key={key} style={{ marginBottom: 12 }}>
          <Text style={[s.subHint, { color: colors.textDim, marginBottom: 6 }]}>{label}</Text>
          <View style={{ flexDirection: "row-reverse", gap: 20, justifyContent: "space-around" }}>
            {[{ lbl: teamAName, v: aVal, fn: setA }, { lbl: teamBName, v: bVal, fn: setB }].map(({ lbl, v, fn }, i) => (
              <View key={i} style={{ alignItems: "center", gap: 4 }}>
                <Text style={[s.subHint, { color: colors.textMuted }]} numberOfLines={1}>{lbl}</Text>
                <Stepper value={v} onChange={fn} min={0} max={max} colors={colors} />
              </View>
            ))}
          </View>
        </View>
      ))}

      {/* بلوت */}
      <Text style={[s.subHint, { color: colors.textDim, marginBottom: 6 }]}>بلوت (+٢٠) — شيخ وبنت الحكم عند نفس اللاعب</Text>
      <View style={{ flexDirection: "row-reverse", gap: 10, marginBottom: 16 }}>
        <TeamPickBtn idx={0} label={teamAName} active={baloota === 0} onTap={() => setBaloota(baloota === 0 ? null : 0)} activeColor={`${colors.gold}`} />
        <TeamPickBtn idx={1} label={teamBName} active={baloota === 1} onTap={() => setBaloota(baloota === 1 ? null : 1)} activeColor={`${colors.gold}`} />
        <TouchableOpacity
          onPress={() => { Haptics.selectionAsync(); setBaloota(null); }}
          style={[s.teamBtn, { paddingHorizontal: 12 },
            baloota === null
              ? { backgroundColor: colors.surface, borderColor: colors.borderStrong, borderWidth: 1.5 }
              : { backgroundColor: colors.surfaceRaised, borderColor: colors.border, borderWidth: 1 }]}
        >
          <Text style={[s.teamBtnText, { color: colors.textMuted }]}>لا</Text>
        </TouchableOpacity>
      </View>

      {/* النتيجة */}
      <View style={[s.preview, { backgroundColor: colors.surface }]}>
        <Text style={[s.previewTitle, { color: colors.textMuted }]}>النتيجة</Text>
        {failedBidder && (
          <Text style={[s.subHint, { color: colors.red, marginBottom: 6, textAlign: "center" }]}>
            ⚠️ الطالب ما وصل — {mode === "sun" ? "الخصم +٢٦ (صن)" : "الخصم +١٦ (حكم)"}
          </Text>
        )}
        {[{ name: teamAName, score: scoreA, card: cardA, proj: projA }, { name: teamBName, score: scoreB, card: cardB, proj: projB }].map(({ name, score, card, proj }, i) => (
          <View key={i} style={s.previewRow}>
            <View style={{ alignItems: "flex-end" }}>
              <Text style={[s.previewScore, { color: colors.gold, fontFamily: Fonts.mono }]}>+{score}</Text>
              {proj > 0 && <Text style={[s.subHint, { color: colors.textDim }]}>ورق: {card} + مشاريع: {proj}</Text>}
            </View>
            <Text style={[s.previewName, { color: colors.text }]} numberOfLines={1}>{name}</Text>
          </View>
        ))}
      </View>
      <Actions onClose={onClose} onConfirm={confirm} colors={colors} />
    </ScrollView>
  );
}

// ─── BASRA ENTRY ──────────────────────────────────────────────────────────────
function BasraEntry({ players, onSubmit, onClose }: { players: Player[]; onSubmit: (s: Record<string, number>) => void; onClose: () => void }) {
  const colors = useColors();
  const [basras, setBasras] = useState<Record<string, number>>(() => Object.fromEntries(players.map((p) => [p.id, 0])));
  const [cards, setCards] = useState<Record<string, number>>(() => Object.fromEntries(players.map((p) => [p.id, 0])));
  const [clubTwo, setClubTwo] = useState<string | null>(null);
  const [diamondTen, setDiamondTen] = useState<string | null>(null);

  const totalCards = Object.values(cards).reduce((a, b) => a + b, 0);
  const maxCards = players.reduce((best, p) => cards[p.id] > (cards[best] ?? 0) ? p.id : best, players[0]?.id ?? "");

  const calcScores = (): Record<string, number> => {
    const s: Record<string, number> = {};
    players.forEach((p) => {
      let pts = (basras[p.id] ?? 0) * 10;
      if (p.id === clubTwo) pts += 2;
      if (p.id === diamondTen) pts += 3;
      if (totalCards > 0 && p.id === maxCards) pts += 3;
      s[p.id] = pts;
    });
    return s;
  };

  const scores = calcScores();

  const confirm = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    onSubmit(scores);
  };

  return (
    <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
      <Text style={[s.label, { color: colors.textMuted }]}>عدد البصرات لكل لاعب (كل بصرة = ١٠ نقاط)</Text>
      {players.map((p) => (
        <View key={p.id} style={[tkStyles.playerRow]}>
          <Stepper value={basras[p.id] ?? 0} onChange={(v) => setBasras((prev) => ({ ...prev, [p.id]: v }))} min={0} max={20} colors={colors} />
          <View style={tkStyles.playerInfo}>
            <Text style={[tkStyles.playerName, { color: colors.text }]}>{p.name}</Text>
            <Text style={[tkStyles.playerScore, { color: colors.gold, fontFamily: Fonts.mono }]}>+{(basras[p.id] ?? 0) * 10}</Text>
          </View>
        </View>
      ))}

      <View style={[s.divider, { backgroundColor: colors.border }]} />

      <Text style={[s.label, { color: colors.textMuted }]}>عدد الأوراق الملتقطة (لاحتساب الأكثر +٣)</Text>
      {players.map((p) => (
        <View key={p.id} style={tkStyles.playerRow}>
          <Stepper value={cards[p.id] ?? 0} onChange={(v) => setCards((prev) => ({ ...prev, [p.id]: v }))} min={0} max={52} colors={colors} />
          <Text style={[tkStyles.playerName, { color: p.id === maxCards && totalCards > 0 ? colors.gold : colors.text }]}>{p.name} {p.id === maxCards && totalCards > 0 ? "★" : ""}</Text>
        </View>
      ))}

      <View style={[s.divider, { backgroundColor: colors.border }]} />

      <Text style={[s.label, { color: colors.textMuted }]}>بنت سبايا ٢♣ (+٢) — من أخذها؟</Text>
      <View style={{ flexDirection: "row-reverse", flexWrap: "wrap", gap: 8, marginBottom: 10 }}>
        {players.map((p) => (
          <TouchableOpacity key={p.id} onPress={() => { Haptics.selectionAsync(); setClubTwo(clubTwo === p.id ? null : p.id); }}
            style={[tkStyles.radioBtn, { flex: 1 }, clubTwo === p.id ? { backgroundColor: `${colors.gold}22`, borderColor: colors.gold } : { backgroundColor: colors.surfaceRaised, borderColor: colors.border }]}>
            <Text style={[tkStyles.playerName, { color: clubTwo === p.id ? colors.gold : colors.text }]}>{p.name}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <Text style={[s.label, { color: colors.textMuted }]}>حجر الرحمة ١٠♦ (+٣) — من أخذه؟</Text>
      <View style={{ flexDirection: "row-reverse", flexWrap: "wrap", gap: 8, marginBottom: 10 }}>
        {players.map((p) => (
          <TouchableOpacity key={p.id} onPress={() => { Haptics.selectionAsync(); setDiamondTen(diamondTen === p.id ? null : p.id); }}
            style={[tkStyles.radioBtn, { flex: 1 }, diamondTen === p.id ? { backgroundColor: `${colors.gold}22`, borderColor: colors.gold } : { backgroundColor: colors.surfaceRaised, borderColor: colors.border }]}>
            <Text style={[tkStyles.playerName, { color: diamondTen === p.id ? colors.gold : colors.text }]}>{p.name}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <View style={[s.preview, { backgroundColor: colors.surface }]}>
        <Text style={[s.previewTitle, { color: colors.textMuted }]}>النتيجة</Text>
        {players.map((p) => (
          <View key={p.id} style={s.previewRow}>
            <Text style={[s.previewScore, { color: scores[p.id] > 0 ? colors.gold : colors.textDim, fontFamily: Fonts.mono }]}>+{scores[p.id] ?? 0}</Text>
            <Text style={[s.previewName, { color: colors.text }]} numberOfLines={1}>{p.name}</Text>
          </View>
        ))}
      </View>
      <Actions onClose={onClose} onConfirm={confirm} colors={colors} />
    </ScrollView>
  );
}

// ─── LEEKHA ENTRY ─────────────────────────────────────────────────────────────
function LeekhaEntry({ players, onSubmit, onClose }: { players: Player[]; onSubmit: (s: Record<string, number>) => void; onClose: () => void }) {
  const colors = useColors();
  const [spades, setSpades] = useState<Record<string, number>>(() => Object.fromEntries(players.map((p) => [p.id, 0])));
  const [hasQueenSpade, setHasQueenSpade] = useState<string | null>(null);
  const [hasDiamondTen, setHasDiamondTen] = useState<string | null>(null);

  const calcScores = (): Record<string, number> => {
    const s: Record<string, number> = {};
    players.forEach((p) => {
      let pts = spades[p.id] ?? 0;
      if (p.id === hasQueenSpade) pts += 13;
      if (p.id === hasDiamondTen) pts += 10;
      s[p.id] = pts;
    });
    return s;
  };

  const scores = calcScores();

  const confirm = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    onSubmit(scores);
  };

  return (
    <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
      <Text style={[s.label, { color: colors.textMuted }]}>♠ كبة — كم ورقة بستوني أخذ كل لاعب؟ (+١ لكل)</Text>
      {players.map((p) => (
        <View key={p.id} style={tkStyles.playerRow}>
          <Stepper value={spades[p.id] ?? 0} onChange={(v) => setSpades((prev) => ({ ...prev, [p.id]: v }))} min={0} max={12} colors={colors} />
          <View style={tkStyles.playerInfo}>
            <Text style={[tkStyles.playerName, { color: colors.text }]}>{p.name}</Text>
            <Text style={[tkStyles.playerScore, { color: (spades[p.id] ?? 0) > 0 ? colors.red : colors.textDim, fontFamily: Fonts.mono }]}>
              {(spades[p.id] ?? 0) > 0 ? `+${spades[p.id]}` : "٠"}
            </Text>
          </View>
        </View>
      ))}

      <View style={[s.divider, { backgroundColor: colors.border }]} />

      <Text style={[s.label, { color: colors.textMuted }]}>Q♠ بنت البستوني (+١٣) — من أخذتها؟</Text>
      <View style={{ gap: 8, marginBottom: 12 }}>
        {players.map((p) => (
          <TouchableOpacity key={p.id} onPress={() => { Haptics.selectionAsync(); setHasQueenSpade(hasQueenSpade === p.id ? null : p.id); }}
            style={[tkStyles.radioBtn, hasQueenSpade === p.id ? { backgroundColor: `${colors.red}22`, borderColor: colors.red } : { backgroundColor: colors.surfaceRaised, borderColor: colors.border }]}>
            <Text style={[tkStyles.playerScore, { fontFamily: Fonts.mono, color: hasQueenSpade === p.id ? colors.red : colors.textDim }]}>
              {hasQueenSpade === p.id ? "+13" : ""}
            </Text>
            <Text style={[tkStyles.playerName, { color: hasQueenSpade === p.id ? colors.red : colors.text }]}>{p.name}</Text>
          </TouchableOpacity>
        ))}
        <TouchableOpacity onPress={() => { Haptics.selectionAsync(); setHasQueenSpade(null); }}
          style={[tkStyles.radioBtn, !hasQueenSpade ? { backgroundColor: colors.surface, borderColor: colors.borderStrong } : { backgroundColor: colors.surfaceRaised, borderColor: colors.border }]}>
          <Text style={[tkStyles.playerName, { color: !hasQueenSpade ? colors.text : colors.textDim }]}>ما أخذها أحد</Text>
        </TouchableOpacity>
      </View>

      <Text style={[s.label, { color: colors.textMuted }]}>10♦ عشرة الديناري (+١٠) — من أخذها؟</Text>
      <View style={{ gap: 8, marginBottom: 12 }}>
        {players.map((p) => (
          <TouchableOpacity key={p.id} onPress={() => { Haptics.selectionAsync(); setHasDiamondTen(hasDiamondTen === p.id ? null : p.id); }}
            style={[tkStyles.radioBtn, hasDiamondTen === p.id ? { backgroundColor: `${colors.red}22`, borderColor: colors.red } : { backgroundColor: colors.surfaceRaised, borderColor: colors.border }]}>
            <Text style={[tkStyles.playerScore, { fontFamily: Fonts.mono, color: hasDiamondTen === p.id ? colors.red : colors.textDim }]}>
              {hasDiamondTen === p.id ? "+10" : ""}
            </Text>
            <Text style={[tkStyles.playerName, { color: hasDiamondTen === p.id ? colors.red : colors.text }]}>{p.name}</Text>
          </TouchableOpacity>
        ))}
        <TouchableOpacity onPress={() => { Haptics.selectionAsync(); setHasDiamondTen(null); }}
          style={[tkStyles.radioBtn, !hasDiamondTen ? { backgroundColor: colors.surface, borderColor: colors.borderStrong } : { backgroundColor: colors.surfaceRaised, borderColor: colors.border }]}>
          <Text style={[tkStyles.playerName, { color: !hasDiamondTen ? colors.text : colors.textDim }]}>ما أخذها أحد</Text>
        </TouchableOpacity>
      </View>

      <View style={[s.preview, { backgroundColor: colors.surface }]}>
        <Text style={[s.previewTitle, { color: colors.textMuted }]}>النتيجة (أقل = أحسن)</Text>
        {players.map((p) => (
          <View key={p.id} style={s.previewRow}>
            <Text style={[s.previewScore, { color: (scores[p.id] ?? 0) > 0 ? colors.red : colors.textDim, fontFamily: Fonts.mono }]}>
              +{scores[p.id] ?? 0}
            </Text>
            <Text style={[s.previewName, { color: colors.text }]} numberOfLines={1}>{p.name}</Text>
          </View>
        ))}
      </View>
      <Actions onClose={onClose} onConfirm={confirm} colors={colors} />
    </ScrollView>
  );
}

// ─── DOMINO ENTRY ─────────────────────────────────────────────────────────────
function DominoEntry({ players, onSubmit, onClose }: { players: Player[]; onSubmit: (s: Record<string, number>) => void; onClose: () => void }) {
  const colors = useColors();
  const isTeam = players.length === 4;
  const teamA = isTeam ? [players[0], players[2]].filter(Boolean) : [];
  const teamB = isTeam ? [players[1], players[3]].filter(Boolean) : [];
  const [winner, setWinner] = useState<string | null>(null);
  const [pips, setPips] = useState<Record<string, number>>(() => Object.fromEntries(players.map((p) => [p.id, 0])));

  const totalPips = Object.values(pips).reduce((a, b) => a + b, 0);

  const calcScores = (): Record<string, number> => {
    const s: Record<string, number> = {};
    players.forEach((p) => {
      s[p.id] = p.id === winner ? totalPips : 0;
    });
    return s;
  };

  const scores = calcScores();

  const confirm = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    onSubmit(scores);
  };

  return (
    <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
      <Text style={[s.label, { color: colors.textMuted }]}>من أغلق أولاً؟ (الفائز)</Text>
      <View style={{ gap: 8, marginBottom: 12 }}>
        {(isTeam ? [{ id: players[0]?.id, name: teamA.map((p) => p.name).join(" / ") }, { id: players[1]?.id, name: teamB.map((p) => p.name).join(" / ") }] : players.map((p) => ({ id: p.id, name: p.name }))).map(({ id, name }) => (
          <TouchableOpacity key={id} onPress={() => { Haptics.selectionAsync(); setWinner(winner === id ? null : id!); }}
            style={[tkStyles.radioBtn, winner === id ? { backgroundColor: `${colors.gold}22`, borderColor: colors.gold } : { backgroundColor: colors.surfaceRaised, borderColor: colors.border }]}>
            <Text style={[tkStyles.playerName, { color: winner === id ? colors.gold : colors.text }]}>{name}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <View style={[s.divider, { backgroundColor: colors.border }]} />

      <Text style={[s.label, { color: colors.textMuted }]}>نقاط الأحجار المتبقية لكل لاعب/فريق</Text>
      {players.map((p) => (
        <View key={p.id} style={tkStyles.playerRow}>
          <Stepper value={pips[p.id] ?? 0} onChange={(v) => setPips((prev) => ({ ...prev, [p.id]: v }))} min={0} max={100} colors={colors} />
          <Text style={[tkStyles.playerName, { color: colors.text }]}>{p.name}</Text>
        </View>
      ))}
      <Text style={[s.hint, { color: colors.textDim }]}>المجموع: {totalPips}</Text>

      <View style={[s.preview, { backgroundColor: colors.surface, marginTop: 12 }]}>
        <Text style={[s.previewTitle, { color: colors.textMuted }]}>النتيجة</Text>
        {players.map((p) => (
          <View key={p.id} style={s.previewRow}>
            <Text style={[s.previewScore, { color: (scores[p.id] ?? 0) > 0 ? colors.gold : colors.textDim, fontFamily: Fonts.mono }]}>
              {(scores[p.id] ?? 0) > 0 ? `+${scores[p.id]}` : "٠"}
            </Text>
            <Text style={[s.previewName, { color: colors.text }]} numberOfLines={1}>{p.name}</Text>
          </View>
        ))}
      </View>
      <Actions onClose={onClose} onConfirm={confirm} colors={colors} disabled={!winner} />
    </ScrollView>
  );
}

// ─── JACKAROO ENTRY ───────────────────────────────────────────────────────────
function JackarooEntry({ players, isComplex, onSubmit, onClose }: { players: Player[]; isComplex?: boolean; onSubmit: (s: Record<string, number>) => void; onClose: () => void }) {
  const colors = useColors();
  const teamA = [players[0], players[2]].filter(Boolean);
  const teamB = [players[1], players[3]].filter(Boolean);
  const [winnerTeam, setWinnerTeam] = useState<0 | 1 | null>(null);
  const [kills, setKills] = useState<Record<string, number>>(() => Object.fromEntries(players.map((p) => [p.id, 0])));

  const calcScores = (): Record<string, number> => {
    const s: Record<string, number> = {};
    const aKills = teamA.reduce((sum, p) => sum + (kills[p.id] ?? 0), 0);
    const bKills = teamB.reduce((sum, p) => sum + (kills[p.id] ?? 0), 0);
    teamA.forEach((p) => { s[p.id] = (winnerTeam === 0 ? 1 : -1) + (isComplex ? (kills[p.id] ?? 0) - (bKills / Math.max(1, teamB.length)) : 0); });
    teamB.forEach((p) => { s[p.id] = (winnerTeam === 1 ? 1 : -1) + (isComplex ? (kills[p.id] ?? 0) - (aKills / Math.max(1, teamA.length)) : 0); });
    return s;
  };

  const scores = calcScores();

  const confirm = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    onSubmit(scores);
  };

  return (
    <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
      {/* ورقة غش جاكارو */}
      <View style={[s.preview, { backgroundColor: `${colors.gold}11`, borderColor: `${colors.gold}44`, borderWidth: 1, marginBottom: 12 }]}>
        <Text style={[s.previewTitle, { color: colors.gold }]}>📋 قواعد تذكيرية</Text>
        <Text style={[s.subHint, { color: colors.textDim, lineHeight: 20 }]}>
          {"• حجرك على حجر خصم → الخصم يرجع للبيت\n• حجرين متتابعين = قاعدة (محمية من القتل والتخطي)\n• للدخول لمنطقة الأمان: القيمة لازم تكفي بالضبط\n• ما تقدر تتخطى نفسك"}
        </Text>
      </View>
      <Text style={[s.label, { color: colors.textMuted }]}>من وصّل قطعه للبيت أولاً؟</Text>
      <View style={s.teamRow}>
        {[{ team: teamA, idx: 0 }, { team: teamB, idx: 1 }].map(({ team, idx }) => (
          <TouchableOpacity key={idx} onPress={() => { Haptics.selectionAsync(); setWinnerTeam(winnerTeam === idx ? null : idx as 0 | 1); }}
            style={[s.teamBtn, winnerTeam === idx ? { backgroundColor: colors.gold } : { backgroundColor: colors.surfaceRaised, borderColor: colors.border, borderWidth: 1 }]}>
            <Text numberOfLines={1} style={[s.teamBtnText, { color: winnerTeam === idx ? colors.background : colors.textMuted }]}>
              {team.map((p) => p.name).join(" / ")}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {isComplex && (
        <>
          <View style={[s.divider, { backgroundColor: colors.border }]} />
          <Text style={[s.label, { color: colors.textMuted }]}>قتل (kills) لكل لاعب</Text>
          {players.map((p) => (
            <View key={p.id} style={tkStyles.playerRow}>
              <Stepper value={kills[p.id] ?? 0} onChange={(v) => setKills((prev) => ({ ...prev, [p.id]: v }))} min={0} max={16} colors={colors} />
              <Text style={[tkStyles.playerName, { color: colors.text }]}>{p.name}</Text>
            </View>
          ))}
        </>
      )}

      <View style={[s.preview, { backgroundColor: colors.surface, marginTop: 12 }]}>
        <Text style={[s.previewTitle, { color: colors.textMuted }]}>النتيجة</Text>
        {players.map((p) => (
          <View key={p.id} style={s.previewRow}>
            <Text style={[s.previewScore, {
              color: (scores[p.id] ?? 0) > 0 ? colors.success : (scores[p.id] ?? 0) < 0 ? colors.red : colors.textDim,
              fontFamily: Fonts.mono
            }]}>
              {(scores[p.id] ?? 0) > 0 ? `+${scores[p.id]?.toFixed(0)}` : `${scores[p.id]?.toFixed(0) ?? 0}`}
            </Text>
            <Text style={[s.previewName, { color: colors.text }]} numberOfLines={1}>{p.name}</Text>
          </View>
        ))}
      </View>
      <Actions onClose={onClose} onConfirm={confirm} colors={colors} disabled={winnerTeam === null} />
    </ScrollView>
  );
}

// ─── HARREEGA ENTRY ───────────────────────────────────────────────────────────
function HarreegaEntry({ players, onSubmit, onClose }: { players: Player[]; onSubmit: (s: Record<string, number>) => void; onClose: () => void }) {
  const colors = useColors();
  const [points, setPoints] = useState<Record<string, number>>(() => Object.fromEntries(players.map((p) => [p.id, 0])));

  const confirm = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    onSubmit(points);
  };

  return (
    <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
      <Text style={[s.label, { color: colors.textMuted }]}>نقاط الحريقة لكل لاعب</Text>
      <Text style={[s.hint, { color: colors.textDim }]}>الحسبة: كل ورقة محروقة = قيمة الورقة</Text>
      {players.map((p) => (
        <View key={p.id} style={tkStyles.playerRow}>
          <Stepper value={points[p.id] ?? 0} onChange={(v) => setPoints((prev) => ({ ...prev, [p.id]: v }))} min={0} max={999} colors={colors} />
          <Text style={[tkStyles.playerName, { color: colors.text }]}>{p.name}</Text>
        </View>
      ))}
      <View style={[s.preview, { backgroundColor: colors.surface, marginTop: 12 }]}>
        <Text style={[s.previewTitle, { color: colors.textMuted }]}>النتيجة</Text>
        {players.map((p) => (
          <View key={p.id} style={s.previewRow}>
            <Text style={[s.previewScore, { color: (points[p.id] ?? 0) > 0 ? colors.success : colors.textDim, fontFamily: Fonts.mono }]}>+{points[p.id] ?? 0}</Text>
            <Text style={[s.previewName, { color: colors.text }]} numberOfLines={1}>{p.name}</Text>
          </View>
        ))}
      </View>
      <Actions onClose={onClose} onConfirm={confirm} colors={colors} />
    </ScrollView>
  );
}

// ─── NTHALEH ENTRY ────────────────────────────────────────────────────────────
function NthalehEntry({ players, onSubmit, onClose }: { players: Player[]; onSubmit: (s: Record<string, number>) => void; onClose: () => void }) {
  const colors = useColors();
  const [points, setPoints] = useState<Record<string, number>>(() => Object.fromEntries(players.map((p) => [p.id, 0])));

  const confirm = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    onSubmit(points);
  };

  return (
    <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
      <Text style={[s.label, { color: colors.textMuted }]}>نقاط النذالة لكل لاعب</Text>
      {players.map((p) => (
        <View key={p.id} style={tkStyles.playerRow}>
          <Stepper value={points[p.id] ?? 0} onChange={(v) => setPoints((prev) => ({ ...prev, [p.id]: v }))} min={0} max={999} colors={colors} />
          <Text style={[tkStyles.playerName, { color: colors.text }]}>{p.name}</Text>
        </View>
      ))}
      <View style={[s.preview, { backgroundColor: colors.surface, marginTop: 12 }]}>
        <Text style={[s.previewTitle, { color: colors.textMuted }]}>النتيجة</Text>
        {players.map((p) => (
          <View key={p.id} style={s.previewRow}>
            <Text style={[s.previewScore, { color: (points[p.id] ?? 0) > 0 ? colors.success : colors.textDim, fontFamily: Fonts.mono }]}>+{points[p.id] ?? 0}</Text>
            <Text style={[s.previewName, { color: colors.text }]} numberOfLines={1}>{p.name}</Text>
          </View>
        ))}
      </View>
      <Actions onClose={onClose} onConfirm={confirm} colors={colors} />
    </ScrollView>
  );
}

// ─── 400 ENTRY ────────────────────────────────────────────────────────────────
function FourHundredEntry({ players, onSubmit, onClose }: { players: Player[]; onSubmit: (s: Record<string, number>) => void; onClose: () => void }) {
  const colors = useColors();
  const [bids, setBids] = useState<Record<string, number>>(() => Object.fromEntries(players.map((p) => [p.id, 7])));
  const [tricks, setTricks] = useState<Record<string, number>>(() => Object.fromEntries(players.map((p) => [p.id, 0])));

  const calcScores = (): Record<string, number> => {
    const s: Record<string, number> = {};
    players.forEach((p) => {
      const bid = bids[p.id] ?? 7;
      const got = tricks[p.id] ?? 0;
      s[p.id] = got >= bid ? bid * 10 : -bid * 10;
    });
    return s;
  };

  const scores = calcScores();

  const confirm = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    onSubmit(scores);
  };

  return (
    <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
      <Text style={[s.label, { color: colors.textMuted }]}>المزايدة × اللطشات لكل لاعب</Text>
      {players.map((p) => {
        const bid = bids[p.id] ?? 7;
        const got = tricks[p.id] ?? 0;
        const sc = scores[p.id] ?? 0;
        const made = got >= bid;
        return (
          <View key={p.id} style={[fhStyles.playerBlock, { backgroundColor: colors.surface, borderColor: made ? `${colors.success}44` : `${colors.red}44` }]}>
            <Text style={[tkStyles.playerName, { color: colors.text, marginBottom: 8 }]}>{p.name}</Text>
            <View style={fhStyles.row}>
              <View style={{ alignItems: "center", gap: 4 }}>
                <Text style={[s.label, { color: colors.textMuted, marginBottom: 0, marginTop: 0 }]}>مزايدة</Text>
                <Stepper value={bid} onChange={(v) => setBids((prev) => ({ ...prev, [p.id]: v }))} min={7} max={13} colors={colors} />
              </View>
              <View style={{ alignItems: "center", gap: 4 }}>
                <Text style={[s.label, { color: colors.textMuted, marginBottom: 0, marginTop: 0 }]}>أخذ</Text>
                <Stepper value={got} onChange={(v) => setTricks((prev) => ({ ...prev, [p.id]: v }))} min={0} max={13} colors={colors} />
              </View>
              <View style={{ alignItems: "center", gap: 4 }}>
                <Text style={[s.label, { color: colors.textMuted, marginBottom: 0, marginTop: 0 }]}>نتيجة</Text>
                <Text style={[fhStyles.score, { color: made ? colors.success : colors.red, fontFamily: Fonts.mono }]}>
                  {sc >= 0 ? `+${sc}` : `${sc}`}
                </Text>
              </View>
            </View>
          </View>
        );
      })}
      <Actions onClose={onClose} onConfirm={confirm} colors={colors} />
    </ScrollView>
  );
}

const fhStyles = StyleSheet.create({
  playerBlock: { borderRadius: 14, padding: 14, marginBottom: 12, borderWidth: 1.5 },
  row: { flexDirection: "row-reverse", justifyContent: "space-around", alignItems: "center" },
  score: { fontSize: 22 },
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
export function ScoreEntryModal({ visible, players, roundNumber, gameId, rules, onClose, onSubmit }: Props) {
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
  const isTerkis = gameId === "terkis" || gameId === "terkis_team";
  const isTerkisComplex = gameId === "terkis_complex";
  const isHand = gameId === "hand";
  const isBaloot = gameId === "baloot";
  const isBasra = gameId === "basra";
  const isLeekha = gameId === "leekha";
  const isDomino = gameId === "domino";
  const isJackaroo = gameId === "jackaroo";
  const isJackarooCx = gameId === "jackaroo_cx";
  const isHarreega = gameId === "harreega";
  const isNthaleh = gameId === "nthaleh";
  const is400 = gameId === "400";

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
          <TarneebEntry players={players} rules={rules} onSubmit={onSubmit} onClose={onClose} />
        ) : isTerkis ? (
          <TerkisEntry players={players} onSubmit={onSubmit} onClose={onClose} />
        ) : isTerkisComplex ? (
          <TerkisComplexEntry players={players} onSubmit={onSubmit} onClose={onClose} />
        ) : isHand ? (
          <HandEntry players={players} onSubmit={onSubmit} onClose={onClose} />
        ) : isBaloot ? (
          <BalootEntry players={players} onSubmit={onSubmit} onClose={onClose} />
        ) : isBasra ? (
          <BasraEntry players={players} onSubmit={onSubmit} onClose={onClose} />
        ) : isLeekha ? (
          <LeekhaEntry players={players} onSubmit={onSubmit} onClose={onClose} />
        ) : isDomino ? (
          <DominoEntry players={players} onSubmit={onSubmit} onClose={onClose} />
        ) : isJackaroo ? (
          <JackarooEntry players={players} onSubmit={onSubmit} onClose={onClose} />
        ) : isJackarooCx ? (
          <JackarooEntry players={players} isComplex onSubmit={onSubmit} onClose={onClose} />
        ) : isHarreega ? (
          <HarreegaEntry players={players} onSubmit={onSubmit} onClose={onClose} />
        ) : isNthaleh ? (
          <NthalehEntry players={players} onSubmit={onSubmit} onClose={onClose} />
        ) : is400 ? (
          <FourHundredEntry players={players} onSubmit={onSubmit} onClose={onClose} />
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
