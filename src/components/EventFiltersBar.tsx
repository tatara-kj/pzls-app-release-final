import React, { useMemo, useState, useCallback } from "react";
import {
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { LinearGradient } from "expo-linear-gradient";

type Props = {
  query: string;
  setQuery: (v: string) => void;

  season: string;
  setSeason: (v: string) => void;

  tor: "ALL" | "L" | "S";
  setTor: (v: "ALL" | "L" | "S") => void;

  onlyWithResults: boolean;
  setOnlyWithResults: (v: boolean) => void;
};

const C = {
  text: "#DFEFF3",
  textDim: "rgba(223,239,243,0.72)",
  placeholder: "rgba(223,239,243,0.55)",

  glass: "rgba(255,255,255,0.06)",
  glassBorder: "rgba(255,255,255,0.10)",

  chipBg: "rgba(255,255,255,0.09)",
  chipBorder: "rgba(255,255,255,0.16)",

  accentA: "#BF8224",
  accentB: "#E32428",
};

const CHIP_MIN_H = 48;
const CHIP_PAD_X = 18;
const CHIP_PAD_Y = 12;
const CHIP_GAP = 10;
const CLEAR_SIZE = 48;

function seasonLabel(season: string) {
  const y = Number(season);
  if (!Number.isFinite(y)) return season;
  return `${y}/${String(y + 1).slice(2)}`;
}

export default function EventFiltersBar({
  query,
  setQuery,
  season,
  setSeason,
  tor,
  setTor,
  onlyWithResults,
  setOnlyWithResults,
}: Props) {
  const [seasonOpen, setSeasonOpen] = useState(false);

  const seasons = useMemo(() => {
    const now = new Date();
    const y = now.getFullYear();
    // ostatnie 12 sezonów
    return Array.from({ length: 12 }).map((_, i) => String(y - i));
  }, []);

  const anyActive =
    (query?.trim().length ?? 0) > 0 || tor !== "ALL" || onlyWithResults;

  const haptic = useCallback(() => {
    if (Platform.OS === "ios") Haptics.selectionAsync().catch(() => {});
  }, []);

  const clearAll = useCallback(() => {
    setQuery("");
    setTor("ALL");
    setOnlyWithResults(false);
    if (Platform.OS === "ios") {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(
        () => {}
      );
    }
  }, [setOnlyWithResults, setQuery, setTor]);

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
            placeholder="Szukaj: nazwa / miasto…"
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
                  onPress={() => {
                    setQuery("");
                    haptic();
                  }}
                  hitSlop={16}
                  android_ripple={{ color: "rgba(255,255,255,0.12)" }}
                  style={({ pressed }) => [
                    styles.iconBtn,
                    pressed && { opacity: 0.9, transform: [{ scale: 0.95 }] },
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

      {/* CHIPS */}
      <View style={styles.row}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.chipsContent}
        >
          {/* SEASON */}
          <View style={[styles.clip, { marginRight: CHIP_GAP }]}>
            <Pressable
              onPress={() => {
                setSeasonOpen(true);
                haptic();
              }}
              android_ripple={{ color: "rgba(255,255,255,0.12)" }}
              style={({ pressed }) => [
                styles.chip,
                styles.chipInactive,
                pressed && { opacity: 0.92, transform: [{ scale: 0.98 }] },
              ]}
            >
              <Ionicons
                name="calendar-outline"
                size={18}
                color={C.textDim}
                style={{ marginRight: 8 }}
              />
              <Text numberOfLines={1} style={styles.chipText}>
                Sezon {seasonLabel(season)}
              </Text>
            </Pressable>
          </View>

          {/* TOR L */}
          <View style={[styles.clip, { marginRight: CHIP_GAP }]}>
            <Pressable
              onPress={() => {
                setTor(tor === "L" ? "ALL" : "L");
                haptic();
              }}
              android_ripple={{ color: "rgba(255,255,255,0.12)" }}
              style={({ pressed }) => [
                styles.chip,
                tor === "L" ? styles.chipActive : styles.chipInactive,
                pressed && { opacity: 0.92, transform: [{ scale: 0.98 }] },
              ]}
            >
              {tor === "L" ? (
                <LinearGradient
                  colors={[C.accentA, C.accentB]}
                  start={{ x: 0, y: 0.5 }}
                  end={{ x: 1, y: 0.5 }}
                  style={StyleSheet.absoluteFillObject}
                />
              ) : null}
              <Text style={[styles.chipText, tor === "L" && styles.chipTextOn]}>
                Tor długi (L)
              </Text>
            </Pressable>
          </View>

          {/* TOR S */}
          <View style={[styles.clip, { marginRight: CHIP_GAP }]}>
            <Pressable
              onPress={() => {
                setTor(tor === "S" ? "ALL" : "S");
                haptic();
              }}
              android_ripple={{ color: "rgba(255,255,255,0.12)" }}
              style={({ pressed }) => [
                styles.chip,
                tor === "S" ? styles.chipActive : styles.chipInactive,
                pressed && { opacity: 0.92, transform: [{ scale: 0.98 }] },
              ]}
            >
              {tor === "S" ? (
                <LinearGradient
                  colors={[C.accentA, C.accentB]}
                  start={{ x: 0, y: 0.5 }}
                  end={{ x: 1, y: 0.5 }}
                  style={StyleSheet.absoluteFillObject}
                />
              ) : null}
              <Text style={[styles.chipText, tor === "S" && styles.chipTextOn]}>
                Short Track (S)
              </Text>
            </Pressable>
          </View>

          {/* ONLY RESULTS */}
          <View style={[styles.clip, { marginRight: CHIP_GAP }]}>
            <Pressable
              onPress={() => {
                setOnlyWithResults(!onlyWithResults);
                haptic();
              }}
              android_ripple={{ color: "rgba(255,255,255,0.12)" }}
              style={({ pressed }) => [
                styles.chip,
                onlyWithResults ? styles.chipActive : styles.chipInactive,
                pressed && { opacity: 0.92, transform: [{ scale: 0.98 }] },
              ]}
            >
              {onlyWithResults ? (
                <LinearGradient
                  colors={[C.accentA, C.accentB]}
                  start={{ x: 0, y: 0.5 }}
                  end={{ x: 1, y: 0.5 }}
                  style={StyleSheet.absoluteFillObject}
                />
              ) : null}
              <Ionicons
                name="trophy-outline"
                size={18}
                color={onlyWithResults ? "#FFF" : C.textDim}
                style={{ marginRight: 8 }}
              />
              <Text
                style={[styles.chipText, onlyWithResults && styles.chipTextOn]}
              >
                Tylko z wynikami
              </Text>
            </Pressable>
          </View>
        </ScrollView>

        {/* CLEAR */}
        <View style={[styles.clip, { marginLeft: 4 }]}>
          <Pressable
            onPress={clearAll}
            disabled={!anyActive}
            hitSlop={16}
            android_ripple={{ color: "rgba(255,255,255,0.12)" }}
            style={({ pressed }) => [
              styles.clearBtn,
              !anyActive && { opacity: 0, transform: [{ scale: 0 }] },
              anyActive && { opacity: 1, transform: [{ scale: 1 }] },
              anyActive &&
                pressed && { opacity: 0.8, transform: [{ scale: 0.92 }] },
            ]}
          >
            <Ionicons name="close" size={26} color="#FFF" />
          </Pressable>
        </View>
      </View>

      {/* SEASON MODAL */}
      <Modal
        visible={seasonOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setSeasonOpen(false)}
      >
        <Pressable
          style={styles.modalBackdrop}
          onPress={() => setSeasonOpen(false)}
        >
          <Pressable
            style={styles.modalCard}
            onPress={(e) => e.stopPropagation()}
          >
            <Text style={styles.modalTitle}>Wybierz sezon</Text>
            <ScrollView style={{ maxHeight: 340 }}>
              {seasons.map((s) => {
                const active = s === season;
                return (
                  <View key={s} style={[styles.clip, { marginBottom: 10 }]}>
                    <Pressable
                      onPress={() => {
                        setSeason(s);
                        setSeasonOpen(false);
                        haptic();
                      }}
                      android_ripple={{ color: "rgba(255,255,255,0.12)" }}
                      style={({ pressed }) => [
                        styles.modalRow,
                        active && styles.modalRowActive,
                        pressed && { opacity: 0.95 },
                      ]}
                    >
                      <Text style={styles.modalRowText}>{seasonLabel(s)}</Text>
                      {active ? (
                        <Ionicons name="checkmark" size={20} color="#FFF" />
                      ) : null}
                    </Pressable>
                  </View>
                );
              })}
            </ScrollView>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 6,
    backgroundColor: "transparent",
  },

  searchBorder: { borderRadius: 30, padding: 1 },
  searchRow: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 30,
    paddingHorizontal: 16,
    paddingVertical: 14,
    backgroundColor: C.glass,
    borderWidth: 1,
    borderColor: C.glassBorder,
    minHeight: 52,
  },
  searchInput: {
    flex: 1,
    marginLeft: 12,
    fontFamily: "Jost-Medium",
    fontSize: 16,
    color: C.text,
    paddingVertical: Platform.OS === "android" ? 8 : 0,
    ...(Platform.OS === "android"
      ? {
          includeFontPadding: false as const,
          textAlignVertical: "center" as const,
        }
      : null),
  },
  searchRight: {
    width: 46,
    height: 46,
    alignItems: "center",
    justifyContent: "center",
  },

  row: { marginTop: 12, flexDirection: "row", alignItems: "center" },
  chipsContent: { alignItems: "center", paddingRight: 10 },

  clip: { borderRadius: 999, overflow: "hidden" },

  chip: {
    minHeight: CHIP_MIN_H,
    paddingHorizontal: CHIP_PAD_X,
    paddingVertical: CHIP_PAD_Y,
    borderRadius: 999,
    borderWidth: 1,
    justifyContent: "center",
    alignItems: "center",
    flexDirection: "row",
  },
  chipInactive: { backgroundColor: C.chipBg, borderColor: C.chipBorder },
  chipActive: { borderColor: "rgba(255,255,255,0.25)" },

  chipText: {
    fontSize: 15,
    lineHeight: 18,
    fontFamily: "Jost-Medium",
    letterSpacing: 0.2,
    color: C.text,
    ...(Platform.OS === "android"
      ? {
          includeFontPadding: false as const,
          textAlignVertical: "center" as const,
        }
      : null),
  },
  chipTextOn: { color: "#FFF", fontFamily: "Jost-SemiBold" },

  iconBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255,255,255,0.08)",
  },

  clearBtn: {
    width: CLEAR_SIZE,
    height: CLEAR_SIZE,
    borderRadius: 999,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(227,36,40,0.85)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.2)",
  },

  modalBackdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.55)",
    justifyContent: "center",
    padding: 20,
  },
  modalCard: {
    borderRadius: 22,
    backgroundColor: "rgba(25,28,47,0.96)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.12)",
    padding: 16,
  },
  modalTitle: {
    fontFamily: "GoodTimes-BoldItalic",
    color: "#BF8224",
    fontSize: 18,
    marginBottom: 12,
  },
  modalRow: {
    paddingVertical: 14,
    paddingHorizontal: 14,
    borderRadius: 16,
    backgroundColor: "rgba(255,255,255,0.06)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.10)",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  modalRowActive: {
    backgroundColor: "rgba(227,36,40,0.22)",
    borderColor: "rgba(255,255,255,0.18)",
  },
  modalRowText: { fontFamily: "Jost-Medium", color: "#DFEFF3", fontSize: 16 },
});
