import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import React, { useState } from "react";
import {
  Alert,
  Platform,
  ScrollView,
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

export default function ProfileScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { profile, setProfile, sessions } = useApp();
  const [name, setName] = useState(profile.name);
  const [editing, setEditing] = useState(false);
  const webTop = Platform.OS === "web" ? 67 : 0;

  const totalSessions = sessions.length;
  const totalWins = sessions.filter((s) =>
    s.completedAt &&
    s.players.some((p) => p.name === profile.name && p.id === s.winnerId)
  ).length;

  const handleSave = async () => {
    if (!name.trim()) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    await setProfile({ ...profile, name: name.trim() });
    setEditing(false);
  };

  const handleClearData = () => {
    Alert.alert(
      "مسح كل البيانات",
      "هذا سيحذف كل الجلسات والتاريخ. متأكد؟",
      [
        { text: "إلغاء", style: "cancel" },
        {
          text: "احذف كل شي",
          style: "destructive",
          onPress: async () => {
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
          },
        },
      ]
    );
  };

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: colors.background }]}
      contentContainerStyle={[
        styles.content,
        {
          paddingTop: insets.top + webTop + 16,
          paddingBottom: insets.bottom + 100 + (Platform.OS === "web" ? 34 : 0),
        },
      ]}
      showsVerticalScrollIndicator={false}
    >
      <Text style={[styles.title, { color: colors.text }]}>ملفك</Text>

      <View style={[styles.profileCard, { backgroundColor: colors.surface }]}>
        <View
          style={[styles.avatar, { backgroundColor: colors.surfaceRaised }]}
        >
          <Feather name="user" size={32} color={colors.gold} />
        </View>

        {editing ? (
          <View style={styles.editRow}>
            <TouchableOpacity
              onPress={handleSave}
              style={[styles.saveBtn, { backgroundColor: colors.gold }]}
            >
              <Feather name="check" size={18} color={colors.background} />
            </TouchableOpacity>
            <TextInput
              style={[
                styles.nameInput,
                {
                  color: colors.text,
                  backgroundColor: colors.surfaceRaised,
                  fontFamily: Fonts.heading,
                  borderColor: colors.gold,
                },
              ]}
              value={name}
              onChangeText={setName}
              textAlign="right"
              autoFocus
              onSubmitEditing={handleSave}
              returnKeyType="done"
            />
          </View>
        ) : (
          <TouchableOpacity
            onPress={() => setEditing(true)}
            style={styles.nameRow}
          >
            <Feather name="edit-2" size={16} color={colors.textDim} />
            <Text style={[styles.profileName, { color: colors.text }]}>
              {profile.name}
            </Text>
          </TouchableOpacity>
        )}
      </View>

      <View style={styles.statsRow}>
        <View
          style={[styles.miniStat, { backgroundColor: colors.surface }]}
        >
          <Text
            style={[
              styles.miniStatVal,
              { color: colors.gold, fontFamily: Fonts.mono },
            ]}
          >
            {totalSessions}
          </Text>
          <Text style={[styles.miniStatLabel, { color: colors.textMuted }]}>
            جلسة
          </Text>
        </View>
        <View
          style={[styles.miniStat, { backgroundColor: colors.surface }]}
        >
          <Text
            style={[
              styles.miniStatVal,
              { color: colors.gold, fontFamily: Fonts.mono },
            ]}
          >
            {totalWins}
          </Text>
          <Text style={[styles.miniStatLabel, { color: colors.textMuted }]}>
            انتصار
          </Text>
        </View>
      </View>

      <View style={styles.section}>
        <Text style={[styles.sectionTitle, { color: colors.text }]}>
          الإعدادات
        </Text>

        <View style={[styles.settingsCard, { backgroundColor: colors.surface }]}>
          <SettingRow
            icon="info"
            label="الإصدار"
            value="1.0.0"
            colors={colors}
          />
          <View style={[styles.divider, { backgroundColor: colors.border }]} />
          <SettingRow
            icon="moon"
            label="الوضع الليلي"
            value="دائماً"
            colors={colors}
          />
        </View>

        <TouchableOpacity
          onPress={handleClearData}
          style={[
            styles.dangerBtn,
            { borderColor: `${colors.red}44`, backgroundColor: `${colors.red}11` },
          ]}
        >
          <Text style={[styles.dangerText, { color: colors.red }]}>
            مسح كل البيانات
          </Text>
          <Feather name="trash-2" size={18} color={colors.red} />
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

function SettingRow({
  icon,
  label,
  value,
  colors,
}: {
  icon: string;
  label: string;
  value: string;
  colors: ReturnType<typeof useColors>;
}) {
  return (
    <View style={settingStyles.row}>
      <Text style={[settingStyles.value, { color: colors.textMuted }]}>
        {value}
      </Text>
      <View style={settingStyles.left}>
        <Feather name={icon as any} size={18} color={colors.textMuted} />
        <Text style={[settingStyles.label, { color: colors.text }]}>
          {label}
        </Text>
      </View>
    </View>
  );
}

const settingStyles = StyleSheet.create({
  row: {
    flexDirection: "row-reverse",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 14,
    paddingHorizontal: 16,
  },
  left: {
    flexDirection: "row-reverse",
    alignItems: "center",
    gap: 10,
  },
  label: {
    fontFamily: "Tajawal_400Regular",
    fontSize: 15,
    textAlign: "right",
  },
  value: {
    fontFamily: "Tajawal_400Regular",
    fontSize: 14,
  },
});

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { paddingHorizontal: 16 },
  title: {
    fontFamily: Fonts.heading,
    fontSize: 28,
    textAlign: "right",
    marginBottom: 20,
  },
  profileCard: {
    borderRadius: 20,
    padding: 24,
    alignItems: "center",
    gap: 16,
    marginBottom: 16,
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    alignItems: "center",
    justifyContent: "center",
  },
  nameRow: {
    flexDirection: "row-reverse",
    alignItems: "center",
    gap: 8,
  },
  profileName: {
    fontFamily: Fonts.heading,
    fontSize: 22,
    textAlign: "center",
  },
  editRow: {
    flexDirection: "row-reverse",
    alignItems: "center",
    gap: 8,
    width: "100%",
  },
  nameInput: {
    flex: 1,
    height: 48,
    borderRadius: 12,
    paddingHorizontal: 14,
    fontSize: 16,
    borderWidth: 1.5,
  },
  saveBtn: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  statsRow: {
    flexDirection: "row-reverse",
    gap: 10,
    marginBottom: 24,
  },
  miniStat: {
    flex: 1,
    borderRadius: 16,
    padding: 16,
    alignItems: "center",
    gap: 4,
  },
  miniStatVal: {
    fontSize: 28,
    textAlign: "center",
  },
  miniStatLabel: {
    fontFamily: Fonts.body,
    fontSize: 13,
  },
  section: { gap: 12 },
  sectionTitle: {
    fontFamily: Fonts.heading,
    fontSize: 20,
    textAlign: "right",
  },
  settingsCard: {
    borderRadius: 16,
    overflow: "hidden",
  },
  divider: {
    height: 1,
    marginHorizontal: 16,
  },
  dangerBtn: {
    flexDirection: "row-reverse",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    height: 52,
    borderRadius: 14,
    borderWidth: 1,
    marginTop: 8,
  },
  dangerText: {
    fontFamily: Fonts.heading,
    fontSize: 15,
  },
});
