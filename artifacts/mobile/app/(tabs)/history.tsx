import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { useRouter } from "expo-router";
import React, { useState } from "react";
import {
  FlatList,
  Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { SessionCard } from "@/components/SessionCard";
import { Fonts } from "@/constants/fonts";
import { useApp } from "@/contexts/AppContext";
import { useColors } from "@/hooks/useColors";

type Filter = "all" | "active" | "done";

export default function HistoryScreen() {
  const colors = useColors();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { sessions, deleteSession } = useApp();
  const [filter, setFilter] = useState<Filter>("all");
  const webTop = Platform.OS === "web" ? 67 : 0;

  const filtered = sessions.filter((s) => {
    if (filter === "active") return !s.completedAt;
    if (filter === "done") return !!s.completedAt;
    return true;
  });

  const filters: { key: Filter; label: string }[] = [
    { key: "all", label: "الكل" },
    { key: "active", label: "جارية" },
    { key: "done", label: "منتهية" },
  ];

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View
        style={[
          styles.header,
          {
            paddingTop: insets.top + webTop + 16,
            backgroundColor: colors.background,
          },
        ]}
      >
        <Text style={[styles.title, { color: colors.text }]}>جلساتك</Text>
        <View style={styles.filters}>
          {filters.map((f) => (
            <TouchableOpacity
              key={f.key}
              onPress={() => {
                setFilter(f.key);
                Haptics.selectionAsync();
              }}
              style={[
                styles.filterBtn,
                {
                  backgroundColor:
                    filter === f.key ? colors.gold : colors.surface,
                },
              ]}
            >
              <Text
                style={[
                  styles.filterText,
                  {
                    color:
                      filter === f.key ? colors.background : colors.textMuted,
                  },
                ]}
              >
                {f.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      <FlatList
        data={filtered}
        keyExtractor={(item) => item.id}
        contentContainerStyle={[
          styles.list,
          {
            paddingBottom:
              insets.bottom + 100 + (Platform.OS === "web" ? 34 : 0),
          },
        ]}
        scrollEnabled={!!filtered.length}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <View style={[styles.empty, { backgroundColor: colors.surface }]}>
            <Feather name="inbox" size={36} color={colors.textDim} />
            <Text style={[styles.emptyText, { color: colors.textDim }]}>
              ما في جلسات هنا
            </Text>
          </View>
        }
        renderItem={({ item }) => (
          <SessionCard
            session={item}
            onPress={() => router.push(`/session/${item.id}`)}
            onDelete={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
              deleteSession(item.id);
            }}
          />
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    paddingHorizontal: 16,
    paddingBottom: 12,
  },
  title: {
    fontFamily: Fonts.heading,
    fontSize: 28,
    textAlign: "right",
    marginBottom: 12,
  },
  filters: {
    flexDirection: "row-reverse",
    gap: 8,
  },
  filterBtn: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
  },
  filterText: {
    fontFamily: Fonts.body,
    fontSize: 14,
  },
  list: {
    paddingHorizontal: 16,
    paddingTop: 8,
  },
  empty: {
    borderRadius: 16,
    padding: 40,
    alignItems: "center",
    gap: 12,
    marginTop: 24,
  },
  emptyText: {
    fontFamily: Fonts.body,
    fontSize: 15,
    textAlign: "center",
  },
});
