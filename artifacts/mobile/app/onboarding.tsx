import * as Haptics from "expo-haptics";
import { useRouter } from "expo-router";
import React, { useState } from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
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
import { useColors } from "@/hooks/useColors";
import { signInWithGoogle } from "@/services/auth";

const SLIDES = [
  {
    id: "1",
    title: "حلستك، قواعدك",
    subtitle: "تتبع نقاط لعبتك بدون ورقة وقلم — ما في غش، ما في جدال",
    icon: "♠",
  },
  {
    id: "2",
    title: "لا غش، لا خلافات",
    subtitle: "كل جولة مسجلة وموثقة — النقاط بتكلم لحالها",
    icon: "♥",
  },
  {
    id: "3",
    title: "سجّل تاريخك مع الشلة",
    subtitle: "إحصائيات وجلسات سابقة — كمان بعد سنة بتعرف مين الأحسن",
    icon: "♦",
  },
];

type Step = "slides" | "name";

export default function Onboarding() {
  const colors = useColors();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { updateUserName } = useApp();

  const [currentSlide, setCurrentSlide] = useState(0);
  const [step, setStep] = useState<Step>("slides");
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const webTop = Platform.OS === "web" ? 67 : 0;
  const isLast = currentSlide === SLIDES.length - 1;
  const slide = SLIDES[currentSlide];

  const goNext = () => {
    if (!isLast) setCurrentSlide((s) => s + 1);
  };

  const skipToLast = () => {
    setCurrentSlide(SLIDES.length - 1);
  };

  const handleGoogleSignIn = async () => {
    setLoading(true);
    setError("");
    try {
      await signInWithGoogle();
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    } catch (e: unknown) {
      const msg: string = (e as { message?: string })?.message ?? "";
      if (!msg.includes("ألغيت")) {
        setError(msg || "حدث خطأ، حاول مرة ثانية");
      }
      setLoading(false);
    }
  };

  const handleFinishName = async () => {
    if (!name.trim()) return;
    setLoading(true);
    try {
      await updateUserName(name.trim());
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      router.replace("/(tabs)");
    } catch (e: unknown) {
      const msg = (e as { message?: string })?.message ?? "";
      setError(msg || "تعذّر حفظ الاسم، حاول مرة ثانية");
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
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
        {/* ── Slides ── */}
        {step === "slides" && (
          <>
            {/* Single slide shown at a time — works on both native and web */}
            <View style={styles.slide}>
              <View
                style={[
                  styles.iconContainer,
                  { backgroundColor: colors.surfaceRaised },
                ]}
              >
                <Text style={[styles.icon, { color: colors.gold }]}>
                  {slide.icon}
                </Text>
              </View>
              <Text style={[styles.title, { color: colors.text }]}>
                {slide.title}
              </Text>
              <Text style={[styles.subtitle, { color: colors.textMuted }]}>
                {slide.subtitle}
              </Text>
            </View>

            <View style={styles.footer}>
              <View style={styles.dots}>
                {SLIDES.map((_, i) => (
                  <View
                    key={i}
                    style={[
                      styles.dot,
                      {
                        backgroundColor:
                          i === currentSlide ? colors.gold : colors.textDim,
                        width: i === currentSlide ? 20 : 8,
                      },
                    ]}
                  />
                ))}
              </View>

              {isLast ? (
                <>
                  <TouchableOpacity
                    onPress={handleGoogleSignIn}
                    disabled={loading}
                    style={[styles.googleBtn, { backgroundColor: colors.gold }]}
                  >
                    {loading ? (
                      <ActivityIndicator color={colors.background} />
                    ) : (
                      <>
                        <Text style={styles.googleIcon}>G</Text>
                        <Text
                          style={[
                            styles.googleBtnText,
                            { color: colors.background },
                          ]}
                        >
                          ابدأ مع Google
                        </Text>
                      </>
                    )}
                  </TouchableOpacity>

                  {error ? (
                    <Text style={[styles.errorText, { color: colors.red }]}>
                      {error}
                    </Text>
                  ) : null}
                </>
              ) : (
                <TouchableOpacity
                  onPress={goNext}
                  style={[styles.btn, { backgroundColor: colors.gold }]}
                >
                  <Text style={[styles.btnText, { color: colors.background }]}>
                    التالي
                  </Text>
                </TouchableOpacity>
              )}

              {!isLast && (
                <TouchableOpacity onPress={skipToLast}>
                  <Text style={[styles.skip, { color: colors.textDim }]}>
                    تخطى
                  </Text>
                </TouchableOpacity>
              )}
            </View>
          </>
        )}

        {/* ── Name step ── */}
        {step === "name" && (
          <View style={styles.authStep}>
            <View style={styles.stepHeader}>
              <Text style={styles.stepIcon}>✌️</Text>
              <Text style={[styles.stepTitle, { color: colors.text }]}>
                شو اسمك؟
              </Text>
              <Text style={[styles.stepSubtitle, { color: colors.textMuted }]}>
                هذا هو اسمك بالتطبيق، بتقدر تغيّره لاحقاً
              </Text>
            </View>

            <TextInput
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
              placeholder="اسمك بالعربي"
              placeholderTextColor={colors.textDim}
              textAlign="right"
              returnKeyType="done"
              onSubmitEditing={handleFinishName}
              autoFocus
            />

            <TouchableOpacity
              onPress={handleFinishName}
              disabled={loading || !name.trim()}
              style={[
                styles.btn,
                {
                  backgroundColor: name.trim()
                    ? colors.gold
                    : colors.surfaceRaised,
                },
              ]}
            >
              {loading ? (
                <ActivityIndicator color={colors.background} />
              ) : (
                <Text
                  style={[
                    styles.btnText,
                    { color: name.trim() ? colors.background : colors.textDim },
                  ]}
                >
                  ابدأ اللعب 🃏
                </Text>
              )}
            </TouchableOpacity>
          </View>
        )}
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  slide: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 32,
  },
  iconContainer: {
    width: 100,
    height: 100,
    borderRadius: 32,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 32,
  },
  icon: {
    fontSize: 48,
    textAlign: "center",
  },
  title: {
    fontFamily: "Cairo_700Bold",
    fontSize: 28,
    textAlign: "center",
    marginBottom: 16,
  },
  subtitle: {
    fontFamily: "Tajawal_400Regular",
    fontSize: 16,
    textAlign: "center",
    lineHeight: 26,
  },
  footer: {
    paddingHorizontal: 24,
    paddingBottom: 24,
    alignItems: "center",
    gap: 12,
  },
  dots: {
    flexDirection: "row",
    gap: 6,
    marginBottom: 8,
  },
  dot: {
    height: 8,
    borderRadius: 4,
  },
  btn: {
    width: "100%",
    height: 56,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  btnText: {
    fontFamily: "Cairo_700Bold",
    fontSize: 18,
  },
  skip: {
    fontFamily: "Tajawal_400Regular",
    fontSize: 14,
  },
  googleBtn: {
    width: "100%",
    height: 56,
    borderRadius: 14,
    flexDirection: "row-reverse",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
  },
  googleIcon: {
    fontSize: 20,
    fontFamily: "Cairo_700Bold",
    color: "#0D0D1A",
  },
  googleBtnText: {
    fontFamily: "Cairo_700Bold",
    fontSize: 18,
  },
  errorText: {
    fontFamily: "Tajawal_400Regular",
    fontSize: 14,
    textAlign: "center",
  },
  authStep: {
    flex: 1,
    paddingHorizontal: 24,
    paddingTop: 60,
    gap: 16,
  },
  stepHeader: {
    alignItems: "center",
    gap: 8,
    marginBottom: 16,
  },
  stepIcon: {
    fontSize: 48,
    marginBottom: 8,
  },
  stepTitle: {
    fontFamily: "Cairo_700Bold",
    fontSize: 26,
    textAlign: "center",
  },
  stepSubtitle: {
    fontFamily: "Tajawal_400Regular",
    fontSize: 15,
    textAlign: "center",
    lineHeight: 24,
  },
  nameInput: {
    height: 58,
    borderRadius: 16,
    paddingHorizontal: 16,
    fontSize: 17,
    borderWidth: 1.5,
  },
});
