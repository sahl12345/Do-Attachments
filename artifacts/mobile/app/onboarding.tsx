import * as Haptics from "expo-haptics";
import { useRouter } from "expo-router";
import React, { useRef, useState } from "react";
import {
  Dimensions,
  FlatList,
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

export default function Onboarding() {
  const colors = useColors();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { setProfile } = useApp();
  const [currentSlide, setCurrentSlide] = useState(0);
  const [name, setName] = useState("");
  const flatRef = useRef<FlatList>(null);
  const isLast = currentSlide === SLIDES.length - 1;
  const webTop = Platform.OS === "web" ? 67 : 0;

  const goNext = () => {
    if (isLast) return;
    const next = currentSlide + 1;
    flatRef.current?.scrollToIndex({ index: next, animated: true });
    setCurrentSlide(next);
  };

  const handleStart = async () => {
    if (!name.trim()) return;
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    await setProfile({ name: name.trim(), hasSeenOnboarding: true });
    router.replace("/(tabs)");
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
      <FlatList
        ref={flatRef}
        data={SLIDES}
        horizontal
        pagingEnabled
        scrollEnabled={false}
        showsHorizontalScrollIndicator={false}
        keyExtractor={(item) => item.id}
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

      {isLast && (
        <View style={[styles.inputSection, { paddingHorizontal: 24 }]}>
          <Text style={[styles.inputLabel, { color: colors.textMuted }]}>
            شو اسمك؟
          </Text>
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
            onSubmitEditing={handleStart}
            autoFocus
          />
        </View>
      )}

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
            onPress={handleStart}
            disabled={!name.trim()}
            style={[
              styles.btn,
              {
                backgroundColor: name.trim() ? colors.gold : colors.surfaceRaised,
              },
            ]}
          >
            <Text
              style={[
                styles.btnText,
                {
                  color: name.trim() ? colors.background : colors.textDim,
                },
              ]}
            >
              ابدأ
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
          <TouchableOpacity
            onPress={() => {
              flatRef.current?.scrollToIndex({
                index: SLIDES.length - 1,
                animated: true,
              });
              setCurrentSlide(SLIDES.length - 1);
            }}
          >
            <Text style={[styles.skip, { color: colors.textDim }]}>
              تخطى
            </Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
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
  inputSection: {
    marginBottom: 24,
  },
  inputLabel: {
    fontFamily: "Cairo_700Bold",
    fontSize: 16,
    textAlign: "right",
    marginBottom: 8,
  },
  nameInput: {
    height: 56,
    borderRadius: 16,
    paddingHorizontal: 16,
    fontSize: 17,
    borderWidth: 1.5,
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
});
