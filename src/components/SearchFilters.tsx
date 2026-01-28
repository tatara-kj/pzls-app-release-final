import * as Haptics from "expo-haptics";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import React, { useCallback, useMemo } from "react";
import {
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";

import { useFilters } from "../hooks/useFilters";
import { Colors } from "../theme/colors";

const C = {
  text: (Colors as any).textPrimary ?? "#FFFFFF",
  textDim: (Colors as any).textSecondary ?? "rgba(255,255,255,0.72)",
  placeholder: (Colors as any).textLight ?? "rgba(255,255,255,0.55)",

  glass: (Colors as any).chipBg ?? "rgba(255,255,255,0.06)",
  glassBorder: "rgba(255,255,255,0.10)",

  // ✅ nieaktywne muszą wyglądać jak przyciski, nie jak zwykły tekst
  chipBg: "rgba(255,255,255,0.14)",
  chipBorder: "rgba(255,255,255,0.26)",

  accentA: (Colors as any).accent2 ?? "#BF8224",
  accentB: (Colors as any).accent ?? "#E32428",
};

const CHIP_H = 46; // wygodny tap target
const CLEAR_SIZE = 52;

export default function SearchFiltersPro() {
  const { query, setQuery, filters, toggleFilter } = useFilters();

  const chips = useMemo(
    () => [
      { label: "Senior!!", key: "senior!!" as const },
      { label: "Junior", key: "junior" as const },
      { label: "Kobiety", key: "women" as const },
      { label: "Mężczyźni", key: "men" as const },
    ],
    []
  );

  const anyFilterActive =
    Object.values(filters).some(Boolean) || (query?.trim().length ?? 0) > 0;

  const haptic = useCallback(() => {
    if (Platform.OS === "ios") Haptics.selectionAsync().catch(() => {});
  }, []);

  const clearQuery = useCallback(() => {
    setQuery("");
    haptic();
  }, [setQuery, haptic]);

  const clearAll = useCallback(() => {
    setQuery("");
    (Object.keys(filters) as (keyof typeof filters)[]).forEach((k) => {
      if (filters[k]) toggleFilter(k);
    });
    if (Platform.OS === "ios") {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(
        () => {}
      );
    }
  }, [filters, setQuery, toggleFilter]);

  return (
    <View style={styles.wrapper}>
      {/* SEARCH */}
      <LinearGradient
        colors={["rgba(191,130,36,0.18)", "rgba(227,36,40,0.14)"]}
        start={{ x: 0, y: 0.5 }}
        end={{ x: 1, y: 0.5 }}
        style={styles.searchBorder}
      >
        <View style={styles.searchRow}>
          <Ionicons name="search" size={22} color={C.textDim} />

          <TextInput
            style={styles.searchInput}
            placeholder="Szukaj zawodnika…"
            placeholderTextColor={C.placeholder}
            value={query}
            onChangeText={setQuery}
            selectionColor={C.accentB}
            returnKeyType="search"
            allowFontScaling={false}
          />

          <View style={styles.searchRight}>
            {query?.length ? (
              <View style={styles.clip}>
                <Pressable
                  onPress={clearQuery}
                  hitSlop={18}
                  android_ripple={{ color: "rgba(255,255,255,0.12)" }}
                  style={({ pressed }) => [
                    styles.iconBtn,
                    pressed && { opacity: 0.85 },
                  ]}
                >
                  <Ionicons name="close" size={22} color={C.text} />
                </Pressable>
              </View>
            ) : (
              <Ionicons name="options-outline" size={20} color={C.textDim} />
            )}
          </View>
        </View>
      </LinearGradient>

      {/* FILTERS */}
      <View style={styles.filtersRow}>
        <View style={styles.chipsWrap}>
          {chips.map((c) => {
            const active = !!(filters as any)[c.key];

            return (
              <View key={c.key} style={styles.chipWrap}>
                <View style={styles.clip}>
                  <Pressable
                    onPress={() => {
                      // feedback i dopiero zmiana stanu — mniej “lag feel”
                      haptic();
                      requestAnimationFrame(() => toggleFilter(c.key as any));
                    }}
                    hitSlop={12}
                    android_ripple={{ color: "rgba(255,255,255,0.14)" }}
                    style={({ pressed }) => [
                      styles.chip,
                      active ? styles.chipActive : styles.chipInactive,
                      pressed && { opacity: 0.86 },
                    ]}
                  >
                    {active ? (
                      <LinearGradient
                        colors={[C.accentA, C.accentB]}
                        start={{ x: 0, y: 0.5 }}
                        end={{ x: 1, y: 0.5 }}
                        style={StyleSheet.absoluteFillObject}
                      />
                    ) : null}

                    <Text
                      allowFontScaling={false}
                      maxFontSizeMultiplier={1}
                      numberOfLines={1}
                      style={[
                        styles.chipText,
                        active && styles.chipTextActive,
                      ]}
                    >
                      {c.label}
                    </Text>
                  </Pressable>
                </View>
              </View>
            );
          })}
        </View>

        {/* CLEAR X */}
        <View style={styles.clearWrap}>
          <View style={styles.clip}>
            <Pressable
              onPress={clearAll}
              disabled={!anyFilterActive}
              hitSlop={22}
              android_ripple={{ color: "rgba(255,255,255,0.14)" }}
              style={({ pressed }) => [
                styles.clearBtn,
                !anyFilterActive && styles.clearBtnDisabled,
                anyFilterActive && pressed && { opacity: 0.88 },
              ]}
            >
              {anyFilterActive ? (
                <LinearGradient
                  colors={[C.accentB, C.accentA]}
                  start={{ x: 0, y: 0.5 }}
                  end={{ x: 1, y: 0.5 }}
                  style={StyleSheet.absoluteFillObject}
                />
              ) : null}

              <Ionicons
                name="close"
                size={26}
                color={anyFilterActive ? "#FFF" : "rgba(255,255,255,0.65)"}
              />
            </Pressable>
          </View>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    paddingHorizontal: 16,
    paddingTop: 18,
    backgroundColor: "transparent",
  },

  searchBorder: { borderRadius: 30, padding: 1 },
  searchRow: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 30,
    paddingHorizontal: 14,
    paddingVertical: 12,
    backgroundColor: C.glass,
    borderWidth: 1,
    borderColor: C.glassBorder,
  },
  searchInput: {
    flex: 1,
    marginLeft: 10,
    fontFamily: "Jost-Medium",
    fontSize: 16,
    color: C.text,
    paddingVertical: Platform.OS === "android" ? 6 : 0,
    ...(Platform.OS === "android"
      ? { includeFontPadding: false as const, textAlignVertical: "center" as const }
      : null),
  },
  searchRight: {
    width: 46,
    height: 46,
    alignItems: "center",
    justifyContent: "center",
  },

  clip: { borderRadius: 999, overflow: "hidden" },

  iconBtn: {
    width: 46,
    height: 46,
    borderRadius: 23,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(0,0,0,0.14)",
  },

  // ✅ tu jest “ładnie i działa”: wrap + odstępy + duże cele dotyku
  filtersRow: {
    marginTop: 14,
    flexDirection: "row",
    alignItems: "flex-start",
  },
  chipsWrap: {
    flex: 1,
    flexDirection: "row",
    flexWrap: "wrap",
  },
  chipWrap: {
    marginRight: 10,
    marginBottom: 10,
  },

  chip: {
    minHeight: CHIP_H,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 999,
    borderWidth: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  chipInactive: {
    backgroundColor: C.chipBg,
    borderColor: C.chipBorder,
  },
  chipActive: {
    borderColor: "rgba(255,255,255,0.22)",
  },

  chipText: {
    fontSize: 15,
    lineHeight: 18,
    fontFamily: "Jost-Medium",
    letterSpacing: 0.2,
    color: C.text,
    ...(Platform.OS === "android" ? { includeFontPadding: true as const } : null),
  },
  chipTextActive: {
    color: "#FFF",
    fontFamily: "Jost-SemiBold",
  },

  clearWrap: {
    marginLeft: 10,
    marginTop: 2,
  },
  clearBtn: {
    width: CLEAR_SIZE,
    height: CLEAR_SIZE,
    borderRadius: 999,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255,255,255,0.10)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.22)",
  },
  clearBtnDisabled: {
    opacity: 0.55,
    backgroundColor: "rgba(255,255,255,0.06)",
    borderColor: "rgba(255,255,255,0.14)",
  },
});
