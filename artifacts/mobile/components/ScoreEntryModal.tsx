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
  onClose: () => void;
  onSubmit: (scores: Record<string, number>) => void;
}

export function ScoreEntryModal({
  visible,
  players,
  roundNumber,
  onClose,
  onSubmit,
}: Props) {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const slideAnim = useRef(new Animated.Value(SCREEN_HEIGHT)).current;
  const [inputs, setInputs] = useState<Record<string, string>>({});

  useEffect(() => {
    if (visible) {
      const init: Record<string, string> = {};
      players.forEach((p) => { init[p.id] = ""; });
      setInputs(init);
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
  }, [visible, players, slideAnim]);

  const handleSubmit = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    const scores: Record<string, number> = {};
    players.forEach((p) => {
      const raw = inputs[p.id]?.trim() ?? "0";
      scores[p.id] = parseInt(raw, 10) || 0;
    });
    onSubmit(scores);
  };

  const adjust = (playerId: string, delta: number) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setInputs((prev) => {
      const cur = parseInt(prev[playerId] ?? "0", 10) || 0;
      return { ...prev, [playerId]: String(cur + delta) };
    });
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      statusBarTranslucent
      onRequestClose={onClose}
    >
      <TouchableWithoutFeedback onPress={onClose}>
        <View style={styles.overlay} />
      </TouchableWithoutFeedback>

      <Animated.View
        style={[
          styles.sheet,
          {
            backgroundColor: colors.surfaceHigh,
            paddingBottom: insets.bottom + 16,
            transform: [{ translateY: slideAnim }],
          },
        ]}
      >
        <View
          style={[styles.handle, { backgroundColor: colors.textDim }]}
        />
        <Text style={[styles.title, { color: colors.text }]}>
          جولة {roundNumber} — أدخل النقاط
        </Text>

        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : undefined}
        >
          <ScrollView
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >
            {players.map((player) => (
              <View
                key={player.id}
                style={[
                  styles.playerRow,
                  { borderBottomColor: colors.border },
                ]}
              >
                <View style={styles.stepper}>
                  <TouchableOpacity
                    onPress={() => adjust(player.id, -5)}
                    style={[
                      styles.stepBtn,
                      { backgroundColor: `${colors.red}33` },
                    ]}
                  >
                    <Feather name="minus" size={16} color={colors.red} />
                  </TouchableOpacity>
                  <TextInput
                    style={[
                      styles.input,
                      {
                        color: colors.text,
                        backgroundColor: colors.surface,
                        fontFamily: Fonts.mono,
                      },
                    ]}
                    value={inputs[player.id] ?? ""}
                    onChangeText={(v) =>
                      setInputs((prev) => ({ ...prev, [player.id]: v }))
                    }
                    keyboardType="numbers-and-punctuation"
                    textAlign="center"
                    returnKeyType="done"
                    placeholderTextColor={colors.textDim}
                    placeholder="0"
                  />
                  <TouchableOpacity
                    onPress={() => adjust(player.id, 5)}
                    style={[
                      styles.stepBtn,
                      { backgroundColor: `${colors.success}33` },
                    ]}
                  >
                    <Feather name="plus" size={16} color={colors.success} />
                  </TouchableOpacity>
                </View>
                <Text style={[styles.playerName, { color: colors.text }]}>
                  {player.name}
                </Text>
              </View>
            ))}
          </ScrollView>
        </KeyboardAvoidingView>

        <View style={styles.actions}>
          <TouchableOpacity
            onPress={onClose}
            style={[styles.cancelBtn, { borderColor: colors.borderStrong }]}
          >
            <Text style={[styles.cancelText, { color: colors.textMuted }]}>
              إلغاء
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={handleSubmit}
            style={[styles.confirmBtn, { backgroundColor: colors.gold }]}
          >
            <Text style={[styles.confirmText, { color: colors.background }]}>
              تأكيد
            </Text>
          </TouchableOpacity>
        </View>
      </Animated.View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.6)",
  },
  sheet: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20,
    maxHeight: SCREEN_HEIGHT * 0.85,
  },
  handle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    alignSelf: "center",
    marginBottom: 20,
  },
  title: {
    fontFamily: "Cairo_700Bold",
    fontSize: 18,
    textAlign: "center",
    marginBottom: 20,
  },
  playerRow: {
    flexDirection: "row-reverse",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 14,
    borderBottomWidth: 1,
  },
  playerName: {
    fontFamily: "Tajawal_400Regular",
    fontSize: 16,
    textAlign: "right",
    flex: 1,
    marginRight: 0,
    marginLeft: 8,
  },
  stepper: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  stepBtn: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  input: {
    width: 70,
    height: 40,
    borderRadius: 10,
    fontSize: 16,
  },
  actions: {
    flexDirection: "row",
    gap: 12,
    marginTop: 20,
  },
  cancelBtn: {
    flex: 1,
    height: 52,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
  },
  cancelText: {
    fontFamily: "Cairo_700Bold",
    fontSize: 16,
  },
  confirmBtn: {
    flex: 2,
    height: 52,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  confirmText: {
    fontFamily: "Cairo_700Bold",
    fontSize: 16,
  },
});
