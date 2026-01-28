// src/components/AthleteGrid.tsx
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Pressable, StyleSheet, Text, View, Platform } from "react-native";

import { FlashList } from "@shopify/flash-list";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import {
  AthleteRow,
  getAthletesCount,
  getAthletesLike,
  initAthletesDb,
} from "../storage/athletesDb";
import { matchesAthleteRowFilters, useFilters } from "../hooks/useFilters";
import AthleteTile from "./AthleteTile";
import SearchFiltersPro from "./SearchFiltersPro";

import ParticleBackground from "./ParticleBackground";

type Props = { onSelect: (row: AthleteRow) => void; isActive?: boolean };

function useDebouncedValue<T>(value: T, delayMs: number) {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delayMs);
    return () => clearTimeout(t);
  }, [value, delayMs]);
  return debounced;
}

export default function AthleteGrid({ onSelect, isActive = true }: Props) {
  const insets = useSafeAreaInsets();
  const { query, filters } = useFilters();

  const debouncedQuery = useDebouncedValue(query, 180);

  const anyFilterActive =
    Object.values(filters).some(Boolean) || (query?.trim().length ?? 0) > 0;

  const BASE_LIMIT = 240;
  const MAX_LIMIT = 1200;

  const [limit, setLimit] = useState(BASE_LIMIT);
  const [totalCount, setTotalCount] = useState(0);
  const [rows, setRows] = useState<AthleteRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  // reset limit przy zmianie wyszukiwania/filtrów
  useEffect(() => {
    setLimit(BASE_LIMIT);
  }, [debouncedQuery, filters]);

  const effectiveLimit = anyFilterActive ? limit : BASE_LIMIT;

  // total count
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        await initAthletesDb();
        const c = await getAthletesCount();
        if (!cancelled) setTotalCount(c);
      } catch {}
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  // load z SQLite
  useEffect(() => {
    let cancelled = false;

    (async () => {
      setLoading(true);
      setErr(null);
      try {
        await initAthletesDb();
        // ✅ 2 argumenty — bez kombinowania z sortem
        const r = await getAthletesLike(debouncedQuery, effectiveLimit);
        if (!cancelled) setRows(r);
      } catch (e: any) {
        if (!cancelled) setErr(e?.message ?? "Błąd pobierania danych");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [debouncedQuery, effectiveLimit]);

  const filtered = useMemo(() => {
    return rows.filter((a) => matchesAthleteRowFilters(a, filters));
  }, [rows, filters]);

  const canLoadMore =
    anyFilterActive &&
    !loading &&
    !err &&
    rows.length >= effectiveLimit &&
    effectiveLimit < MAX_LIMIT;

  const onLoadMore = useCallback(() => {
    if (!canLoadMore) return;
    setLimit((l) => Math.min(l + 240, MAX_LIMIT));
  }, [canLoadMore]);

  const Header = (
    <View style={{ paddingTop: insets.top + 10 }}>
      <View style={styles.headerTopRow}>
        <Text style={styles.title}>Zawodnicy</Text>

        <View style={styles.badge}>
          <Ionicons name="snow" size={14} color="#FFF" />
          <Text style={styles.badgeText}>Sezon 2025/26</Text>
        </View>
      </View>

      <SearchFiltersPro />

      <View style={styles.counterRow}>
        <Text style={styles.counterText}>
          {loading
            ? "Ładowanie…"
            : `${filtered.length}${
                totalCount ? ` / ${totalCount}` : ""
              } wyników`}
        </Text>
      </View>

      {err ? (
        <View style={styles.errorBox}>
          <Ionicons name="warning" size={18} color="#FFF" />
          <Text style={styles.errorText} numberOfLines={2}>
            {err}
          </Text>
          <Pressable onPress={() => setLimit((l) => l)} style={styles.retryBtn}>
            <Text style={styles.retryText}>Spróbuj ponownie</Text>
          </Pressable>
        </View>
      ) : null}

      <View style={{ height: 8 }} />
    </View>
  );

  return (
    <View style={styles.root}>
      {/* ✅ TŁO: tylko śnieżynki — zero kapsułek/aurory */}
      <View pointerEvents="none" style={styles.bgLayer}>
        <ParticleBackground
          enabled={isActive}
          count={Platform.OS === "android" ? 0 : 14}
          areaHeight={1200}
        />
      </View>

      <FlashList
        data={filtered}
        keyExtractor={(item) => item.id}
        estimatedItemSize={98}
        ListHeaderComponent={Header}
        renderItem={({ item }) => (
          <AthleteTile item={item} onSelect={onSelect} />
        )}
        onEndReached={onLoadMore}
        onEndReachedThreshold={0.6}
        ListFooterComponent={
          canLoadMore ? (
            <Pressable
              onPress={async () => {
                try {
                  await Haptics.selectionAsync();
                } catch {}
                onLoadMore();
              }}
              style={styles.moreBtn}
            >
              <Text style={styles.moreText}>Pokaż więcej</Text>
            </Pressable>
          ) : (
            <View style={{ height: insets.bottom + 140 }} />
          )
        }
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },

  bgLayer: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 0,
    opacity: 0.95,
  },

  headerTopRow: {
    paddingHorizontal: 16,
    marginBottom: 6,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },
  title: {
    color: "#FFF",
    fontFamily: "Jost-BoldItalic",
    fontSize: 22,
    letterSpacing: 0.4,
  },
  badge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: "rgba(255,255,255,0.06)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
  },
  badgeText: {
    color: "rgba(255,255,255,0.9)",
    fontFamily: "Jost-Medium",
    fontSize: 12,
  },

  counterRow: {
    paddingHorizontal: 16,
    marginTop: 8,
    marginBottom: 8,
    flexDirection: "row",
    justifyContent: "flex-end",
  },
  counterText: {
    color: "rgba(255,255,255,0.65)",
    fontFamily: "Jost-Medium",
    fontSize: 12,
  },

  errorBox: {
    marginHorizontal: 16,
    marginTop: 8,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    padding: 14,
    borderRadius: 14,
    backgroundColor: "rgba(227,36,40,0.22)",
    borderWidth: 1,
    borderColor: "rgba(227,36,40,0.35)",
  },
  errorText: {
    flex: 1,
    color: "#FFF",
    fontFamily: "Jost-Medium",
    fontSize: 13,
  },
  retryBtn: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: "rgba(0,0,0,0.22)",
  },
  retryText: {
    color: "#FFF",
    fontFamily: "Jost-Medium",
    fontSize: 12,
  },

  moreBtn: {
    marginTop: 12,
    marginBottom: 10,
    alignSelf: "center",
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 999,
    backgroundColor: "rgba(191,130,36,0.22)",
    borderWidth: 1,
    borderColor: "rgba(191,130,36,0.35)",
  },
  moreText: {
    color: "#FFF",
    fontFamily: "Jost-Medium",
    fontSize: 13,
    letterSpacing: 0.2,
  },
});
