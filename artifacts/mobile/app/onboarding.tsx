import * as Haptics from "expo-haptics";
import { useRouter } from "expo-router";
import React, { useRef, useState } from "react";
import {
  ActivityIndicator,
  Dimensions,
  FlatList,
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
import { sendPhoneOTP, verifyPhoneOTP, upsertProfile } from "@/services/auth";
import { supabase } from "@/lib/supabase";

const { width: SCREEN_WIDTH } = Dimensions.get("window");

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

type Step = "slides" | "phone" | "otp" | "name";

export default function Onboarding() {
  const colors = useColors();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { updateUserName } = useApp();

  const [currentSlide, setCurrentSlide] = useState(0);
  const [step, setStep] = useState<Step>("slides");

  const [phone, setPhone] = useState("");
  const [otp, setOtp] = useState(["", "", "", "", "", ""]);
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [fullPhone, setFullPhone] = useState("");

  const flatRef = useRef<FlatList>(null);
  const otpRefs = useRef<(TextInput | null)[]>([]);

  const webTop = Platform.OS === "web" ? 67 : 0;
  const isLast = currentSlide === SLIDES.length - 1;

  const goNext = () => {
    if (isLast) return;
    const next = currentSlide + 1;
    flatRef.current?.scrollToIndex({ index: next, animated: true });
    setCurrentSlide(next);
  };

  const skipToLast = () => {
    flatRef.current?.scrollToIndex({
      index: SLIDES.length - 1,
      animated: true,
    });
    setCurrentSlide(SLIDES.length - 1);
  };

  // ── Phone step ──────────────────────────────────────────────────────────────
  const handleSendOTP = async () => {
    const digits = phone.replace(/\D/g, "");
    if (digits.length < 8) {
      setError("أدخل رقم صحيح");
      return;
    }
    const formatted = "+962" + digits.replace(/^0/, "");
    setFullPhone(formatted);
    setLoading(true);
    setError("");
    try {
      const { error: err } = await sendPhoneOTP(formatted);
      if (err) throw err;
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setStep("otp");
    } catch (e: any) {
      setError(e.message ?? "حدث خطأ، حاول مرة ثانية");
    } finally {
      setLoading(false);
    }
  };

  // ── OTP step ────────────────────────────────────────────────────────────────
  const handleOTPChange = (val: string, idx: number) => {
    const digit = val.replace(/\D/g, "").slice(-1);
    const next = [...otp];
    next[idx] = digit;
    setOtp(next);
    if (digit && idx < 5) {
      otpRefs.current[idx + 1]?.focus();
    }
    if (next.every((d) => d !== "")) {
      verifyCode(next.join(""));
    }
  };

  const handleOTPKeyPress = (key: string, idx: number) => {
    if (key === "Backspace" && !otp[idx] && idx > 0) {
      otpRefs.current[idx - 1]?.focus();
    }
  };

  const verifyCode = async (code: string) => {
    setLoading(true);
    setError("");
    try {
      const { data, error: err } = await verifyPhoneOTP(fullPhone, code);
      if (err) throw err;
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      // Check if profile has a name
      if (data.user) {
        const { data: profile } = await supabase
          .from("profiles")
          .select("name")
          .eq("id", data.user.id)
          .maybeSingle();
        if (profile?.name) {
          router.replace("/(tabs)");
        } else {
          setStep("name");
        }
      }
    } catch (e: any) {
      setError("الكود غير صحيح أو انتهت صلاحيته");
      setOtp(["", "", "", "", "", ""]);
      otpRefs.current[0]?.focus();
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    setError("");
    setOtp(["", "", "", "", "", ""]);
    const { error: err } = await sendPhoneOTP(fullPhone);
    if (!err) Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  // ── Name step ───────────────────────────────────────────────────────────────
  const handleFinish = async () => {
    if (!name.trim()) return;
    setLoading(true);
    try {
      await updateUserName(name.trim());
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      router.replace("/(tabs)");
    } catch (_) {
    } finally {
      setLoading(false);
    }
  };

  // ── Render ──────────────────────────────────────────────────────────────────
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
        {step === "slides" && (
          <>
            <FlatList
              ref={flatRef}
              data={SLIDES}
              horizontal
              pagingEnabled
              scrollEnabled={false}
              showsHorizontalScrollIndicator={false}
              keyExtractor={(item) => item.id}
              style={{ flex: 1 }}
              renderItem={({ item }) => (
                <View style={[styles.slide, { width: SCREEN_WIDTH }]}>
                  <View
                    style={[
                      styles.iconContainer,
                      { backgroundColor: colors.surfaceRaised },
                    ]}
                  >
                    <Text style={[styles.icon, { color: colors.gold }]}>
                      {item.icon}
                    </Text>
                  </View>
                  <Text style={[styles.title, { color: colors.text }]}>
                    {item.title}
                  </Text>
                  <Text style={[styles.subtitle, { color: colors.textMuted }]}>
                    {item.subtitle}
                  </Text>
                </View>
              )}
            />
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
                <TouchableOpacity
                  onPress={() => setStep("phone")}
                  style={[styles.btn, { backgroundColor: colors.gold }]}
                >
                  <Text style={[styles.btnText, { color: colors.background }]}>
                    ابدأ الرحلة
                  </Text>
                </TouchableOpacity>
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

        {step === "phone" && (
          <View style={styles.authStep}>
            <View style={styles.stepHeader}>
              <Text style={[styles.stepIcon, { color: colors.gold }]}>📱</Text>
              <Text style={[styles.stepTitle, { color: colors.text }]}>
                رقم موبايلك؟
              </Text>
              <Text style={[styles.stepSubtitle, { color: colors.textMuted }]}>
                راح نبعتلك رسالة للتحقق من رقمك
              </Text>
            </View>

            <View
              style={[
                styles.phoneInputRow,
                {
                  backgroundColor: colors.surface,
                  borderColor: phone ? colors.gold : colors.border,
                },
              ]}
            >
              <TextInput
                style={[
                  styles.phoneInput,
                  { color: colors.text, fontFamily: Fonts.heading },
                ]}
                value={phone}
                onChangeText={(t) => {
                  setError("");
                  setPhone(t.replace(/\D/g, ""));
                }}
                placeholder="7X XXX XXXX"
                placeholderTextColor={colors.textDim}
                keyboardType="phone-pad"
                textAlign="right"
                autoFocus
              />
              <View
                style={[
                  styles.prefixBox,
                  { backgroundColor: colors.surfaceRaised },
                ]}
              >
                <Text style={[styles.prefix, { color: colors.textMuted }]}>
                  +962
                </Text>
              </View>
            </View>

            {error ? (
              <Text style={[styles.errorText, { color: colors.red }]}>
                {error}
              </Text>
            ) : null}

            <TouchableOpacity
              onPress={handleSendOTP}
              disabled={loading || phone.length < 8}
              style={[
                styles.btn,
                {
                  backgroundColor:
                    phone.length >= 8 ? colors.gold : colors.surfaceRaised,
                  marginTop: 8,
                },
              ]}
            >
              {loading ? (
                <ActivityIndicator color={colors.background} />
              ) : (
                <Text
                  style={[
                    styles.btnText,
                    {
                      color:
                        phone.length >= 8 ? colors.background : colors.textDim,
                    },
                  ]}
                >
                  أرسل الكود
                </Text>
              )}
            </TouchableOpacity>
          </View>
        )}

        {step === "otp" && (
          <View style={styles.authStep}>
            <View style={styles.stepHeader}>
              <Text style={[styles.stepIcon, { color: colors.gold }]}>🔑</Text>
              <Text style={[styles.stepTitle, { color: colors.text }]}>
                الكود اللي وصلك
              </Text>
              <Text style={[styles.stepSubtitle, { color: colors.textMuted }]}>
                أدخل الكود المكون من 6 أرقام
              </Text>
              <Text
                style={[styles.phoneDisplay, { color: colors.gold }]}
              >
                {fullPhone}
              </Text>
            </View>

            <View style={styles.otpRow}>
              {otp.map((digit, i) => (
                <TextInput
                  key={i}
                  ref={(r) => {
                    otpRefs.current[i] = r;
                  }}
                  style={[
                    styles.otpBox,
                    {
                      backgroundColor: colors.surface,
                      color: colors.text,
                      borderColor: digit ? colors.gold : colors.border,
                      fontFamily: Fonts.mono,
                    },
                  ]}
                  value={digit}
                  onChangeText={(v) => handleOTPChange(v, i)}
                  onKeyPress={({ nativeEvent }) =>
                    handleOTPKeyPress(nativeEvent.key, i)
                  }
                  keyboardType="number-pad"
                  maxLength={1}
                  textAlign="center"
                  autoFocus={i === 0}
                  selectTextOnFocus
                />
              ))}
            </View>

            {loading && (
              <ActivityIndicator
                color={colors.gold}
                style={{ marginTop: 16 }}
              />
            )}

            {error ? (
              <Text style={[styles.errorText, { color: colors.red }]}>
                {error}
              </Text>
            ) : null}

            <TouchableOpacity
              onPress={handleResend}
              style={{ marginTop: 16 }}
            >
              <Text style={[styles.skip, { color: colors.textMuted }]}>
                ما وصلني الكود — أعد الإرسال
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => {
                setStep("phone");
                setOtp(["", "", "", "", "", ""]);
                setError("");
              }}
              style={{ marginTop: 8 }}
            >
              <Text style={[styles.skip, { color: colors.textDim }]}>
                تغيير الرقم
              </Text>
            </TouchableOpacity>
          </View>
        )}

        {step === "name" && (
          <View style={styles.authStep}>
            <View style={styles.stepHeader}>
              <Text style={[styles.stepIcon, { color: colors.gold }]}>✌️</Text>
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
              onChangeText={(t) => setName(t)}
              placeholder="اسمك بالعربي"
              placeholderTextColor={colors.textDim}
              textAlign="right"
              returnKeyType="done"
              onSubmitEditing={handleFinish}
              autoFocus
            />

            <TouchableOpacity
              onPress={handleFinish}
              disabled={loading || !name.trim()}
              style={[
                styles.btn,
                {
                  backgroundColor: name.trim()
                    ? colors.gold
                    : colors.surfaceRaised,
                  marginTop: 8,
                },
              ]}
            >
              {loading ? (
                <ActivityIndicator color={colors.background} />
              ) : (
                <Text
                  style={[
                    styles.btnText,
                    {
                      color: name.trim() ? colors.background : colors.textDim,
                    },
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
  container: {
    flex: 1,
  },
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
  // ── Auth steps ──────────────────────────────────────────────────────────────
  authStep: {
    flex: 1,
    paddingHorizontal: 24,
    paddingTop: 40,
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
  phoneDisplay: {
    fontFamily: "IBMPlexMono_400Regular",
    fontSize: 14,
    letterSpacing: 1,
    marginTop: 4,
  },
  phoneInputRow: {
    flexDirection: "row-reverse",
    alignItems: "center",
    borderRadius: 16,
    borderWidth: 1.5,
    overflow: "hidden",
    height: 58,
  },
  phoneInput: {
    flex: 1,
    height: "100%",
    paddingHorizontal: 16,
    fontSize: 18,
  },
  prefixBox: {
    height: "100%",
    paddingHorizontal: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  prefix: {
    fontFamily: "IBMPlexMono_400Regular",
    fontSize: 15,
  },
  otpRow: {
    flexDirection: "row-reverse",
    justifyContent: "center",
    gap: 10,
    marginVertical: 8,
  },
  otpBox: {
    width: 48,
    height: 58,
    borderRadius: 12,
    borderWidth: 1.5,
    fontSize: 22,
    textAlign: "center",
  },
  nameInput: {
    height: 58,
    borderRadius: 16,
    paddingHorizontal: 16,
    fontSize: 17,
    borderWidth: 1.5,
  },
  errorText: {
    fontFamily: "Tajawal_400Regular",
    fontSize: 14,
    textAlign: "center",
  },
});
