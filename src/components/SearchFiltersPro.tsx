// src/components/SearchFiltersPro.tsx
import * as Haptics from "expo-haptics";
import { LinearGradient } from "expo-linear-gradient";
import { Search, SlidersHorizontal, X } from "lucide-react-native";
import { AnimatePresence, MotiView } from "moti";
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

type Chip = {
  label: string;
  key: "senior" | "junior" | "women" | "men";
};

export default function SearchFiltersPro() {
  const { query, setQuery, filters, toggleFilter } = useFilters();

  // ✅ TYLKO TO co chcesz
  const chips = useMemo<Chip[]>(
    () => [
      { label: "Senior", key: "senior" },
      { label: "Junior", key: "junior" },
      { label: "Kobiety", key: "women" },
      { label: "Mężczyźni", key: "men" },
    ],
    []
  );

  const anyFilterActive =
    Object.values(filters).some(Boolean) || (query?.trim().length ?? 0) > 0;

  // haptics — nie psujemy Androida
  const softHaptic = useCallback(async () => {
    if (Platform.OS === "ios") {
      try {
        await Haptics.selectionAsync();
      } catch {}
    }
  }, []);

  const handleToggle = useCallback(
    (key: keyof typeof filters) => {
      toggleFilter(key);
      requestAnimationFrame(softHaptic);
    },
    [toggleFilter, softHaptic]
  );

  const clearQuery = useCallback(() => {
    setQuery("");
    requestAnimationFrame(softHaptic);
  }, [setQuery, softHaptic]);

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
      {/* SEARCH BAR */}
      <LinearGradient
        colors={["rgba(191,130,36,0.18)", "rgba(227,36,40,0.14)"]}
        start={{ x: 0, y: 0.5 }}
        end={{ x: 1, y: 0.5 }}
        style={styles.inputBorder}
      >
        <View style={styles.inputRow}>
          <Search size={20} color={Colors.textSecondary} />

          <TextInput
            style={styles.input}
            placeholder="Szukaj zawodnika…"
            placeholderTextColor="rgba(255,255,255,0.55)"
            value={query}
            onChangeText={setQuery}
            selectionColor={Colors.buttonBg}
            returnKeyType="search"
            autoCorrect={false}
            autoCapitalize="none"
          />

          <AnimatePresence>
            {query?.length ? (
              <MotiView
                from={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                transition={{ type: "timing", duration: 140 }}
              >
                <Pressable
                  onPress={clearQuery}
                  hitSlop={12}
                  style={styles.clearIcon}
                >
                  <X size={18} color={Colors.textSecondary} />
                </Pressable>
              </MotiView>
            ) : (
              <View style={styles.filterIconGhost}>
                <SlidersHorizontal size={18} color={Colors.textSecondary} />
              </View>
            )}
          </AnimatePresence>
        </View>
      </LinearGradient>

      {/* CHIPS */}
      <View style={styles.chipsRow}>
        {chips.map((chip, idx) => {
          const active = !!filters[chip.key];

          return (
            <MotiView
              key={chip.key}
              from={{ opacity: 0, translateY: 2 }}
              animate={{ opacity: 1, translateY: 0 }}
              transition={{ type: "timing", duration: 140, delay: idx * 20 }}
            >
              <Pressable
                onPress={() => handleToggle(chip.key)}
                style={[styles.chip, active && styles.chipActive]}
                android_ripple={{
                  color: "rgba(191,130,36,0.12)",
                  borderless: false,
                }}
              >
                <Text
                  style={[styles.chipText, active && styles.chipTextActive]}
                >
                  {chip.label}
                </Text>
              </Pressable>
            </MotiView>
          );
        })}

        {/* CLEAR ALL */}
        {anyFilterActive && (
          <MotiView
            from={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ type: "timing", duration: 140 }}
          >
            <Pressable
              onPress={clearAll}
              style={styles.clearAllChip}
              android_ripple={{
                color: "rgba(227,36,40,0.14)",
                borderless: false,
              }}
            >
              <View style={styles.clearAllInner}>
                <X size={14} color="#FFF" />
                <Text style={styles.clearAllText}>Wyczyść</Text>
              </View>
            </Pressable>
          </MotiView>
        )}
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

  inputBorder: {
    borderRadius: 30,
    padding: 1,
  },
  inputRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: Colors.chipBg,
    borderRadius: 30,
    paddingHorizontal: 16,
    paddingVertical: 12, // ✅ większy padding (Twoje “ma być większy”)
    borderWidth: Platform.OS === "ios" ? 0 : 1,
    borderColor: "rgba(255,255,255,0.06)",
  },
  input: {
    flex: 1,
    marginLeft: 8,
    color: "#fff",
    fontFamily: "Jost-Medium",
    fontSize: 16,
    paddingVertical: Platform.OS === "android" ? 6 : 0,
  },

  clearIcon: {
    marginLeft: 8,
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(0,0,0,0.12)",
  },
  filterIconGhost: {
    marginLeft: 8,
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
  },

  chipsRow: {
    marginTop: 14,
    flexDirection: "row",
    flexWrap: "wrap",
  },

  chip: {
    borderRadius: 999,
    paddingHorizontal: 18, // ✅ większe
    paddingVertical: 10, // ✅ większe
    marginRight: 10, // ✅ zamiast gap (bo RN czasem olewa gap)
    marginBottom: 10,
    borderWidth: 1.1,
    borderColor: "rgba(255,255,255,0.10)",
    backgroundColor: Colors.chipBg,
  },
  chipActive: {
    backgroundColor: Colors.buttonBg,
    borderColor: Colors.buttonBg,
  },
  chipText: {
    fontSize: 15,
    fontFamily: "Jost-Medium",
    color: "rgba(255,255,255,0.85)",
    letterSpacing: 0.2,
  },
  chipTextActive: {
    color: "#FFF",
    fontFamily: "Jost-BoldItalic",
  },

  clearAllChip: {
    borderRadius: 999,
    paddingHorizontal: 16,
    paddingVertical: 10,
    marginBottom: 10,
    backgroundColor: "#E32428",
    borderWidth: 1,
    borderColor: "#E32428",
  },
  clearAllInner: {
    flexDirection: "row",
    alignItems: "center",
  },
  clearAllText: {
    marginLeft: 6, // ✅ zamiast gap
    color: "#FFF",
    fontFamily: "Jost-Medium",
    fontSize: 13,
    letterSpacing: 0.2,
  },
});
