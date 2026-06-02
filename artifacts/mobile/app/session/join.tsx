import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { useRouter } from "expo-router";
import React, { useRef, useState } from "react";
import {
  ActivityIndicator,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { Fonts } from "@/constants/fonts";
import { useApp } from "@/contexts/AppContext";
import { joinOnlineSession } from "@/services/onlineSession";
import { useColors } from "@/hooks/useColors";

export default function JoinScreen() {
  const colors = useColors();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { userName } = useApp();

  const [code, setCode] = useState("");
  const [name, setName] = useState(userName ?? "");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const codeRef = useRef<TextInput>(null);
  const nameRef = useRef<TextInput>(null);
  const webTop = Platform.OS === "web" ? 67 : 0;

  const codeDigits = code.padEnd(6, " ").split("");

  const handleJoin = async () => {
    if (code.length !== 6 || !name.trim()) return;
    setError("");
    setLoading(true);
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      const { playerId } = await joinOnlineSession(code, name.trim());
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      router.replace({
        pathname: "/session/[id]",
        params: { id: code, playerId },
      });
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "حصل خطأ";
      setError(
        msg === "Session not found"
          ? "ما لقينا جلسة بهذا الكود"
          : msg === "Session already started"
          ? "الجلسة بدأت — ما تقدر تنضم"
          : msg === "Session is full"
          ? "الجلسة ممتلئة"
          : "تحقق من الكود وحاول مرة ثانية"
      );
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <View
      style={[
        styles.container,
        {
          backgroundColor: colors.background,
          paddingTop: insets.top + webTop,
          paddingBottom: insets.bottom + (Platform.OS === "web" ? 34 : 0),
        },
      ]}
    >
      <View style={styles.topBar}>
        <TouchableOpacity
          onPress={() => router.back()}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Feather name="arrow-right" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={[styles.title, { color: colors.text }]}>انضم بكود</Text>
        <View style={{ width: 24 }} />
      </View>

      <View style={styles.body}>
        <Text style={[styles.label, { color: colors.textMuted }]}>
          أدخل الكود المكوّن من ٦ أرقام
        </Text>

        <TouchableOpacity
          activeOpacity={1}
          onPress={() => codeRef.current?.focus()}
          style={styles.codeRow}
        >
          {codeDigits.map((d, i) => (
            <View
              key={i}
              style={[
                styles.codeBox,
                {
                  backgroundColor:
                    i < code.length ? colors.surfaceHigh : colors.surface,
                  borderColor:
                    i === code.length
                      ? colors.gold
                      : i < code.length
                      ? colors.borderStrong
                      : colors.border,
                },
              ]}
            >
              <Text
                style={[
                  styles.codeDigit,
                  { color: i < code.length ? colors.gold : colors.textDim },
                ]}
              >
                {d.trim() || (i === code.length ? "|" : "")}
              </Text>
            </View>
          ))}
          <TextInput
            ref={codeRef}
            style={styles.hiddenInput}
            value={code}
            onChangeText={(v) => {
              const cleaned = v.replace(/\D/g, "").slice(0, 6);
              setCode(cleaned);
              setError("");
              if (cleaned.length === 6) nameRef.current?.focus();
            }}
            keyboardType="number-pad"
            maxLength={6}
            caretHidden
          />
        </TouchableOpacity>

        {error ? (
          <Text style={[styles.error, { color: colors.red }]}>{error}</Text>
        ) : null}

        <Text style={[styles.label, { color: colors.textMuted, marginTop: 24 }]}>
          اسمك في اللعبة
        </Text>
        <TextInput
          ref={nameRef}
          style={[
            styles.nameInput,
            {
              backgroundColor: colors.surface,
              color: colors.text,
              borderColor: name.trim() ? colors.gold : colors.border,
              fontFamily: Fonts.heading,
            },
          ]}
          value={name}
          onChangeText={setName}
          placeholder="اسمك"
          placeholderTextColor={colors.textDim}
          textAlign="right"
          returnKeyType="done"
          onSubmitEditing={handleJoin}
        />
      </View>

      <View style={styles.footer}>
        <TouchableOpacity
          onPress={handleJoin}
          disabled={code.length !== 6 || !name.trim() || loading}
          style={[
            styles.joinBtn,
            {
              backgroundColor:
                code.length === 6 && name.trim() && !loading
                  ? colors.gold
                  : colors.surfaceRaised,
            },
          ]}
        >
          {loading ? (
            <ActivityIndicator color={colors.background} />
          ) : (
            <>
              <Feather
                name="log-in"
                size={20}
                color={
                  code.length === 6 && name.trim()
                    ? colors.background
                    : colors.textDim
                }
              />
              <Text
                style={[
                  styles.joinBtnText,
                  {
                    color:
                      code.length === 6 && name.trim()
                        ? colors.background
                        : colors.textDim,
                  },
                ]}
              >
                انضم
              </Text>
            </>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  topBar: {
    flexDirection: "row-reverse",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  title: {
    fontFamily: Fonts.heading,
    fontSize: 20,
    textAlign: "center",
  },
  body: {
    flex: 1,
    paddingHorizontal: 24,
    paddingTop: 32,
  },
  label: {
    fontFamily: Fonts.body,
    fontSize: 15,
    textAlign: "right",
    marginBottom: 12,
  },
  codeRow: {
    flexDirection: "row",
    justifyContent: "center",
    gap: 8,
    position: "relative",
  },
  codeBox: {
    width: 44,
    height: 56,
    borderRadius: 12,
    borderWidth: 2,
    alignItems: "center",
    justifyContent: "center",
  },
  codeDigit: {
    fontFamily: "IBMPlexMono_400Regular",
    fontSize: 24,
    textAlign: "center",
  },
  hiddenInput: {
    position: "absolute",
    width: 1,
    height: 1,
    opacity: 0,
  },
  error: {
    fontFamily: Fonts.body,
    fontSize: 14,
    textAlign: "center",
    marginTop: 10,
  },
  nameInput: {
    height: 56,
    borderRadius: 14,
    paddingHorizontal: 16,
    fontSize: 17,
    borderWidth: 1.5,
  },
  footer: {
    paddingHorizontal: 24,
    paddingBottom: 16,
  },
  joinBtn: {
    flexDirection: "row-reverse",
    height: 56,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
  },
  joinBtnText: {
    fontFamily: Fonts.heading,
    fontSize: 18,
  },
});
