import React, { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
  useWindowDimensions,
} from "react-native";
import {
  SafeAreaView,
  useSafeAreaInsets,
} from "react-native-safe-area-context";
import { BlurView } from "expo-blur";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { MotiView } from "moti";

import {
  CompetitionItem,
  RankingItem,
  fetchCompetitions,
  fetchRanking,
} from "../src/api/rankingsApi";

const BRAND = {
  bg: "#191C2F",
  card: "rgba(31,39,59,0.55)",
  border: "rgba(255,255,255,0.10)",
  text: "#DFEFF3",
  muted: "#DADADA",
  red: "#E32428",
  gold: "#BF8224",
};

type Gender = "K" | "M";
type CategoryCode = "O" | "S" | "A" | "B" | "C" | "D" | "E" | "F";

const CATEGORIES: { code: CategoryCode; label: string }[] = [
  { code: "O", label: "OPEN" },
  { code: "S", label: "Senior" },
  { code: "A", label: "Junior A" },
  { code: "B", label: "Junior B" },
  { code: "C", label: "Junior C" },
  { code: "D", label: "Junior D" },
  { code: "E", label: "Junior E" },
  { code: "F", label: "Junior F" },
];

function font(name: "regular" | "medium" | "title") {
  switch (name) {
    case "title":
      return "Jost-BoldItalic";
    case "medium":
      return "Jost-Medium";
    default:
      return "Jost-Regular";
  }
}

function getCurrentSeasonStartYear(now = new Date()) {
  const y = now.getFullYear();
  const m = now.getMonth();
  return m >= 6 ? y : y - 1;
}

function buildSeasons(count = 18) {
  const start = getCurrentSeasonStartYear();
  return Array.from({ length: count }).map((_, i) => {
    const y = start - i;
    return { startYear: y, label: `${y}/${String(y + 1).slice(2)}` };
  });
}

/** Jedyny blur w całej zakładce: karta filtrów (wydajność) */
function GlassCard({ children }: { children: React.ReactNode }) {
  return (
    <View style={styles.cardOuter}>
      <BlurView intensity={18} tint="dark" style={styles.cardBlur}>
        <View style={styles.cardInner}>{children}</View>
      </BlurView>
    </View>
  );
}

/** DUŻY, wyraźny przycisk (kafelek) */
function BigTile({
  icon,
  label,
  value,
  variant,
  onPress,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  value: string;
  variant: "red" | "gold" | "neutral";
  onPress: () => void;
}) {
  const grad =
    variant === "red"
      ? ["rgba(227,36,40,0.30)", "rgba(255,255,255,0.06)"]
      : variant === "gold"
        ? ["rgba(191,130,36,0.30)", "rgba(255,255,255,0.06)"]
        : ["rgba(255,255,255,0.08)", "rgba(255,255,255,0.04)"];

  const border =
    variant === "red"
      ? "rgba(227,36,40,0.35)"
      : variant === "gold"
        ? "rgba(191,130,36,0.35)"
        : "rgba(255,255,255,0.12)";

  return (
    <Pressable
      onPress={onPress}
      hitSlop={6}
      style={({ pressed }) => [
        styles.tileOuter,
        { borderColor: border },
        pressed && { transform: [{ scale: 0.985 }], opacity: 0.95 },
      ]}
    >
      <LinearGradient
        colors={grad as any}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.tileBg}
      />
      <View style={styles.tileTop}>
        <View style={styles.tileIconBadge}>
          <Ionicons name={icon} size={18} color={BRAND.text} />
        </View>
        <Ionicons
          name="chevron-forward"
          size={18}
          color="rgba(218,218,218,0.75)"
        />
      </View>
      <Text
        style={[styles.tileLabel, { fontFamily: font("regular") }]}
        numberOfLines={1}
      >
        {label}
      </Text>
      <Text
        style={[styles.tileValue, { fontFamily: font("medium") }]}
        numberOfLines={1}
      >
        {value}
      </Text>
    </Pressable>
  );
}

/** Segmented z animowanym “pill” */
function Segmented({
  value,
  onChange,
}: {
  value: "L" | "S";
  onChange: (v: "L" | "S") => void;
}) {
  const [w, setW] = useState(0);
  const idx = value === "L" ? 0 : 1;
  const innerW = Math.max(0, w - 8); // 4+4 padding

  return (
    <View
      style={styles.segment}
      onLayout={(e) => setW(e.nativeEvent.layout.width)}
    >
      {w > 0 && (
        <MotiView
          style={[styles.segmentActive, { width: innerW / 2 }]}
          animate={{ translateX: idx * (innerW / 2) }}
          transition={{ type: "timing", duration: 220 }}
        />
      )}

      <Pressable
        onPress={() => onChange("L")}
        style={styles.segmentBtn}
        hitSlop={6}
      >
        <Text
          style={[
            styles.segmentText,
            { fontFamily: font(value === "L" ? "medium" : "regular") },
            value === "L" && { color: BRAND.text },
          ]}
          numberOfLines={1}
        >
          Tor długi (L)
        </Text>
      </Pressable>

      <Pressable
        onPress={() => onChange("S")}
        style={styles.segmentBtn}
        hitSlop={6}
      >
        <Text
          style={[
            styles.segmentText,
            { fontFamily: font(value === "S" ? "medium" : "regular") },
            value === "S" && { color: BRAND.text },
          ]}
          numberOfLines={1}
        >
          Short Track (S)
        </Text>
      </Pressable>
    </View>
  );
}

function Sheet({
  visible,
  title,
  onClose,
  children,
}: {
  visible: boolean;
  title: string;
  onClose: () => void;
  children: React.ReactNode;
}) {
  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <Pressable style={styles.sheetBackdrop} onPress={onClose}>
        <Pressable style={styles.sheet} onPress={() => {}}>
          <View style={styles.sheetHeader}>
            <Text style={[styles.sheetTitle, { fontFamily: font("medium") }]}>
              {title}
            </Text>
            <Pressable onPress={onClose} hitSlop={10}>
              <Ionicons name="close" size={20} color={BRAND.muted} />
            </Pressable>
          </View>
          {children}
        </Pressable>
      </Pressable>
    </Modal>
  );
}

export default function RankingiScreen() {
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const maxW = Math.min(560, width - 24);

  const seasons = useMemo(() => buildSeasons(18), []);
  const [seasonStartYear, setSeasonStartYear] = useState(
    seasons[0]?.startYear ?? 2025,
  );

  const [gender, setGender] = useState<Gender>("K");
  const [category, setCategory] = useState<CategoryCode>("O");
  const [onlyBest, setOnlyBest] = useState(true);

  const [trackFilter, setTrackFilter] = useState<"L" | "S">("L");

  const [competitions, setCompetitions] = useState<CompetitionItem[]>([]);
  const [selectedCompetitionId, setSelectedCompetitionId] = useState("");

  const [rowsRaw, setRowsRaw] = useState<RankingItem[]>([]);
  const [search, setSearch] = useState("");

  const [loadingComps, setLoadingComps] = useState(true);
  const [loadingRanking, setLoadingRanking] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [seasonSheet, setSeasonSheet] = useState(false);
  const [genderSheet, setGenderSheet] = useState(false);
  const [categorySheet, setCategorySheet] = useState(false);
  const [competitionSheet, setCompetitionSheet] = useState(false);

  const [compSearch, setCompSearch] = useState("");

  const seasonLabel = useMemo(() => {
    const hit = seasons.find((s) => s.startYear === seasonStartYear);
    return (
      hit?.label ?? `${seasonStartYear}/${String(seasonStartYear + 1).slice(2)}`
    );
  }, [seasons, seasonStartYear]);

  const categoryLabel = useMemo(
    () => CATEGORIES.find((c) => c.code === category)?.label ?? "OPEN",
    [category],
  );

  const selectedCompetition = useMemo(
    () => competitions.find((c) => c.id === selectedCompetitionId) ?? null,
    [competitions, selectedCompetitionId],
  );

  const competitionsFiltered = useMemo(() => {
    const q = compSearch.trim().toLowerCase();
    return competitions
      .filter((c) => (c.track ? c.track === trackFilter : true))
      .filter((c) => (q ? c.label.toLowerCase().includes(q) : true));
  }, [competitions, compSearch, trackFilter]);

  const rows = useMemo(() => {
    let base = rowsRaw;

    if (onlyBest) {
      base = base.filter(
        (r) => (r.counter ?? 0) === 1 || (r.counter ?? 0) === 0,
      );
    }

    base = base.map((r, i) => ({ ...r, rank: i + 1 }));

    const q = search.trim().toLowerCase();
    if (!q) return base;

    return base.filter((r) => {
      const a = (r.name ?? "").toLowerCase();
      const b = (r.club ?? "").toLowerCase();
      return a.includes(q) || b.includes(q);
    });
  }, [rowsRaw, onlyBest, search]);

  async function loadCompetitions() {
    setError(null);
    setLoadingComps(true);
    try {
      const items = await fetchCompetitions();
      setCompetitions(items);

      // wybierz sensownie pierwszą konkurencję dla aktualnego toru
      if (!selectedCompetitionId) {
        const first = items.find((x) => x.track === trackFilter) ?? items[0];
        setSelectedCompetitionId(first?.id ?? "");
      }
    } catch (e: any) {
      setError(e?.message ?? "Nie udało się pobrać konkurencji.");
    } finally {
      setLoadingComps(false);
    }
  }

  async function loadRanking() {
    if (!selectedCompetitionId) return;
    setError(null);
    setLoadingRanking(true);
    try {
      const items = await fetchRanking({
        NrKonkur: selectedCompetitionId,
        Sezon: String(seasonStartYear),
        Plec: gender,
        Kategoria: category,
      });
      setRowsRaw(items.slice(0, 500));
    } catch (e: any) {
      setError(e?.message ?? "Nie udało się pobrać rankingu.");
      setRowsRaw([]);
    } finally {
      setLoadingRanking(false);
    }
  }

  useEffect(() => {
    loadCompetitions();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // jeśli zmienisz tor i aktualna konkurencja nie pasuje → auto-przestaw
  useEffect(() => {
    if (!competitions.length) return;
    const current = competitions.find((c) => c.id === selectedCompetitionId);
    if (current?.track === trackFilter) return;

    const first = competitions.find((c) => c.track === trackFilter);
    if (first) setSelectedCompetitionId(first.id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [trackFilter]);

  useEffect(() => {
    loadRanking();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedCompetitionId, seasonStartYear, gender, category]);

  return (
    <SafeAreaView style={styles.safe} edges={["top", "left", "right"]}>
      <LinearGradient
        colors={["#2A2F49", BRAND.bg, BRAND.bg]}
        start={{ x: 0.5, y: 0 }}
        end={{ x: 0.5, y: 1 }}
        style={StyleSheet.absoluteFill}
      />
      <LinearGradient
        colors={["rgba(227,36,40,0.70)", "rgba(227,36,40,0.0)"]}
        start={{ x: 0.5, y: 0 }}
        end={{ x: 0.5, y: 1 }}
        style={styles.topGlow}
      />

      <FlatList
        data={rows}
        keyExtractor={(it) => `${it.rank}-${it.name}-${it.result}`}
        contentContainerStyle={{
          paddingTop: 10,
          paddingBottom: 120 + insets.bottom,
        }}
        // płynność / pamięć:
        initialNumToRender={10}
        maxToRenderPerBatch={10}
        updateCellsBatchingPeriod={40}
        windowSize={7}
        removeClippedSubviews
        ListHeaderComponent={
          <View style={{ paddingHorizontal: 12, alignItems: "center" }}>
            <View style={{ width: maxW }}>
              <MotiView
                from={{ opacity: 0, translateY: 8 }}
                animate={{ opacity: 1, translateY: 0 }}
                transition={{ type: "timing", duration: 240 }}
              >
                <Text style={[styles.bigTitle, { fontFamily: font("title") }]}>
                  RANKINGI
                </Text>
                <Text
                  style={[styles.subTitle, { fontFamily: font("regular") }]}
                >
                  Sezon • Płeć • Kategoria • Konkurencja
                </Text>
              </MotiView>

              <View style={{ height: 12 }} />

              <GlassCard>
                {/* Główny tytuł + refresh */}
                <View style={styles.heroRow}>
                  <View style={{ flex: 1 }}>
                    <Text
                      style={[styles.heroTitle, { fontFamily: font("title") }]}
                      numberOfLines={1}
                    >
                      {(
                        selectedCompetition?.label ?? "Wybierz konkurencję"
                      ).toUpperCase()}
                    </Text>
                    <Text
                      style={[styles.heroMeta, { fontFamily: font("regular") }]}
                      numberOfLines={1}
                    >
                      {seasonLabel} • {gender === "K" ? "Kobiety" : "Mężczyźni"}{" "}
                      • {categoryLabel} • Tor: {trackFilter}
                    </Text>
                  </View>

                  <Pressable
                    onPress={loadRanking}
                    hitSlop={8}
                    style={({ pressed }) => [
                      styles.roundBtn,
                      pressed && { opacity: 0.9, transform: [{ scale: 0.98 }] },
                    ]}
                  >
                    <Ionicons name="refresh" size={18} color={BRAND.text} />
                  </Pressable>
                </View>

                <View style={{ height: 14 }} />

                {/* KAFLE 2x2 – MUSI BYĆ WIDAĆ ŻE TO PRZYCISKI */}
                <View style={styles.tilesGrid}>
                  <BigTile
                    icon="calendar-outline"
                    label="Sezon"
                    value={seasonLabel}
                    variant="red"
                    onPress={() => setSeasonSheet(true)}
                  />
                  <BigTile
                    icon="people-outline"
                    label="Płeć"
                    value={gender === "K" ? "Kobiety" : "Mężczyźni"}
                    variant="gold"
                    onPress={() => setGenderSheet(true)}
                  />
                  <BigTile
                    icon="funnel-outline"
                    label="Kategoria"
                    value={categoryLabel}
                    variant="neutral"
                    onPress={() => setCategorySheet(true)}
                  />
                  <BigTile
                    icon="sparkles-outline"
                    label="Tryb"
                    value={onlyBest ? "Tylko najlepsze" : "Wszystkie"}
                    variant={onlyBest ? "gold" : "neutral"}
                    onPress={() => setOnlyBest((v) => !v)}
                  />
                </View>

                <View style={{ height: 14 }} />

                <Text
                  style={[styles.blockLabel, { fontFamily: font("regular") }]}
                >
                  Tor
                </Text>
                <Segmented value={trackFilter} onChange={setTrackFilter} />

                <View style={{ height: 14 }} />

                {/* KONKURENCJA – duży button */}
                <Pressable
                  onPress={() => setCompetitionSheet(true)}
                  hitSlop={10}
                  style={({ pressed }) => [
                    styles.competitionPicker,
                    pressed && { opacity: 0.93, transform: [{ scale: 0.99 }] },
                  ]}
                >
                  <LinearGradient
                    colors={["rgba(191,130,36,0.22)", "rgba(255,255,255,0.06)"]}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={StyleSheet.absoluteFill}
                  />

                  {/* lewy “accent” żeby wyglądało jak picker */}
                  <View style={styles.competitionAccent} />

                  {/* IKONA jako overlay – nigdy nie wyjedzie */}
                  <View style={styles.competitionIconOverlay}>
                    <Ionicons
                      name="list-outline"
                      size={16}
                      color={BRAND.text}
                    />
                  </View>

                  <View style={styles.competitionRow}>
                    <View style={styles.competitionTextWrap}>
                      <Text
                        style={[
                          styles.competitionLabel,
                          { fontFamily: font("regular") },
                        ]}
                      >
                        Konkurencja
                      </Text>
                      <Text
                        style={[
                          styles.competitionValue,
                          { fontFamily: font("medium") },
                        ]}
                        numberOfLines={1}
                      >
                        {selectedCompetition
                          ? selectedCompetition.label
                          : "Wybierz konkurencję"}
                      </Text>
                    </View>
                  </View>

                  <View style={styles.competitionChevronPill}>
                    <Ionicons
                      name="chevron-forward"
                      size={18}
                      color={BRAND.text}
                    />
                  </View>
                </Pressable>

                <View style={{ height: 14 }} />

                {/* Search */}
                <View style={styles.searchBox}>
                  <Ionicons
                    name="search"
                    size={16}
                    color={BRAND.muted}
                    style={{ marginRight: 8 }}
                  />
                  <TextInput
                    value={search}
                    onChangeText={setSearch}
                    placeholder="Szukaj nazwiska lub klubu…"
                    placeholderTextColor="rgba(218,218,218,0.65)"
                    style={[
                      styles.searchInput,
                      { fontFamily: font("regular") },
                    ]}
                    autoCapitalize="none"
                    autoCorrect={false}
                  />
                  {!!search && (
                    <Pressable
                      onPress={() => setSearch("")}
                      style={{ padding: 6 }}
                    >
                      <Ionicons
                        name="close-circle"
                        size={18}
                        color={BRAND.muted}
                      />
                    </Pressable>
                  )}
                </View>

                {/* Statusy */}
                <View style={{ height: 10 }} />

                {loadingComps ? (
                  <View style={styles.notice}>
                    <ActivityIndicator color={BRAND.text} />
                    <Text
                      style={[
                        styles.noticeText,
                        { fontFamily: font("regular") },
                      ]}
                    >
                      Ładuję konkurencje…
                    </Text>
                  </View>
                ) : null}

                {loadingRanking ? (
                  <View style={styles.notice}>
                    <ActivityIndicator color={BRAND.text} />
                    <Text
                      style={[
                        styles.noticeText,
                        { fontFamily: font("regular") },
                      ]}
                    >
                      Ładuję ranking…
                    </Text>
                  </View>
                ) : null}

                {error ? (
                  <View style={styles.notice}>
                    <Ionicons name="alert-circle" size={18} color={BRAND.red} />
                    <Text
                      style={[
                        styles.noticeText,
                        { fontFamily: font("regular") },
                      ]}
                    >
                      {error}
                    </Text>
                  </View>
                ) : null}

                {!loadingRanking && !error && rowsRaw.length === 0 ? (
                  <View style={styles.notice}>
                    <Text
                      style={[
                        styles.noticeText,
                        { fontFamily: font("regular") },
                      ]}
                    >
                      Brak wyników dla tych filtrów.
                    </Text>
                  </View>
                ) : null}
              </GlassCard>

              <View style={{ height: 14 }} />

              <View style={{ alignItems: "center" }}>
                <Text
                  style={[styles.sectionBig, { fontFamily: font("title") }]}
                >
                  TOP
                </Text>
                <View style={styles.redUnderline} />
              </View>

              <View style={{ height: 12 }} />
            </View>
          </View>
        }
        renderItem={({ item, index }) => {
          const medal =
            item.rank === 1
              ? { icon: "trophy", color: BRAND.gold }
              : item.rank === 2
                ? { icon: "medal", color: "rgba(218,218,218,0.90)" }
                : item.rank === 3
                  ? { icon: "medal-outline", color: "rgba(218,218,218,0.65)" }
                  : null;

          return (
            <View style={{ paddingHorizontal: 12, alignItems: "center" }}>
              <View style={{ width: maxW }}>
                <MotiView
                  from={{ opacity: 0, translateY: 10 }}
                  animate={{ opacity: 1, translateY: 0 }}
                  transition={{
                    type: "timing",
                    duration: 180,
                    delay: Math.min(index * 6, 120),
                  }}
                >
                  {/* Bez blur na wierszu – płynność */}
                  <View style={styles.rowCard}>
                    <View style={styles.rowInner}>
                      <View style={styles.rankBadge}>
                        <Text
                          style={[
                            styles.rankText,
                            { fontFamily: font("medium") },
                          ]}
                        >
                          {item.rank}
                        </Text>
                      </View>

                      <View style={{ flex: 1, paddingRight: 10 }}>
                        <Text
                          style={[
                            styles.nameText,
                            { fontFamily: font("medium") },
                          ]}
                          numberOfLines={1}
                        >
                          {item.name ?? "—"}
                        </Text>
                        <Text
                          style={[
                            styles.metaText,
                            { fontFamily: font("regular") },
                          ]}
                          numberOfLines={1}
                        >
                          {item.club ?? "—"}
                          {item.eventCity ? ` • ${item.eventCity}` : ""}
                        </Text>
                        {!!item.eventName && (
                          <Text
                            style={[
                              styles.eventText,
                              { fontFamily: font("regular") },
                            ]}
                            numberOfLines={1}
                          >
                            {item.eventName}
                          </Text>
                        )}
                      </View>

                      <View style={{ alignItems: "flex-end" }}>
                        <Text
                          style={[
                            styles.resultText,
                            { fontFamily: font("medium") },
                          ]}
                          numberOfLines={1}
                        >
                          {item.result ?? "—"}
                        </Text>
                        {!!item.eventDate && (
                          <Text
                            style={[
                              styles.dateText,
                              { fontFamily: font("regular") },
                            ]}
                            numberOfLines={1}
                          >
                            {item.eventDate}
                          </Text>
                        )}
                      </View>

                      {medal ? (
                        <View style={styles.badgeIcon}>
                          <Ionicons
                            name={medal.icon as any}
                            size={16}
                            color={medal.color}
                          />
                        </View>
                      ) : null}
                    </View>
                  </View>
                </MotiView>
              </View>
            </View>
          );
        }}
      />

      {/* SEZON */}
      <Sheet
        visible={seasonSheet}
        title="Wybierz sezon"
        onClose={() => setSeasonSheet(false)}
      >
        <View style={{ gap: 10 }}>
          {seasons.map((s) => {
            const active = s.startYear === seasonStartYear;
            return (
              <Pressable
                key={s.startYear}
                onPress={() => {
                  setSeasonStartYear(s.startYear);
                  setSeasonSheet(false);
                }}
                style={({ pressed }) => [
                  styles.sheetRow,
                  active && styles.sheetRowActive,
                  pressed && { opacity: 0.92 },
                ]}
              >
                <Text
                  style={[
                    styles.sheetRowText,
                    { fontFamily: font(active ? "medium" : "regular") },
                  ]}
                >
                  {s.label}
                </Text>
                <Ionicons
                  name={active ? "checkmark-circle" : "ellipse-outline"}
                  size={18}
                  color={active ? BRAND.gold : BRAND.border}
                />
              </Pressable>
            );
          })}
        </View>
      </Sheet>

      {/* PŁEĆ */}
      <Sheet
        visible={genderSheet}
        title="Wybierz płeć"
        onClose={() => setGenderSheet(false)}
      >
        <View style={{ gap: 10 }}>
          {(
            [
              { key: "K", label: "Kobiety" },
              { key: "M", label: "Mężczyźni" },
            ] as const
          ).map((g) => {
            const active = gender === g.key;
            return (
              <Pressable
                key={g.key}
                onPress={() => {
                  setGender(g.key);
                  setGenderSheet(false);
                }}
                style={({ pressed }) => [
                  styles.sheetRow,
                  active && styles.sheetRowActive,
                  pressed && { opacity: 0.92 },
                ]}
              >
                <Text
                  style={[
                    styles.sheetRowText,
                    { fontFamily: font(active ? "medium" : "regular") },
                  ]}
                >
                  {g.label}
                </Text>
                <Ionicons
                  name={active ? "checkmark-circle" : "ellipse-outline"}
                  size={18}
                  color={active ? BRAND.gold : BRAND.border}
                />
              </Pressable>
            );
          })}
        </View>
      </Sheet>

      {/* KATEGORIA */}
      <Sheet
        visible={categorySheet}
        title="Wybierz kategorię"
        onClose={() => setCategorySheet(false)}
      >
        <View style={{ gap: 10 }}>
          {CATEGORIES.map((c) => {
            const active = category === c.code;
            return (
              <Pressable
                key={c.code}
                onPress={() => {
                  setCategory(c.code);
                  setCategorySheet(false);
                }}
                style={({ pressed }) => [
                  styles.sheetRow,
                  active && styles.sheetRowActive,
                  pressed && { opacity: 0.92 },
                ]}
              >
                <Text
                  style={[
                    styles.sheetRowText,
                    { fontFamily: font(active ? "medium" : "regular") },
                  ]}
                >
                  {c.label}
                </Text>
                <Ionicons
                  name={active ? "checkmark-circle" : "ellipse-outline"}
                  size={18}
                  color={active ? BRAND.gold : BRAND.border}
                />
              </Pressable>
            );
          })}
        </View>
      </Sheet>

      {/* KONKURENCJA – osobny sheet */}
      <Sheet
        visible={competitionSheet}
        title="Wybierz konkurencję"
        onClose={() => setCompetitionSheet(false)}
      >
        <View style={styles.compSearchBox}>
          <Ionicons
            name="search"
            size={16}
            color={BRAND.muted}
            style={{ marginRight: 8 }}
          />
          <TextInput
            value={compSearch}
            onChangeText={setCompSearch}
            placeholder="Szukaj konkurencji…"
            placeholderTextColor="rgba(218,218,218,0.65)"
            style={[styles.searchInput, { fontFamily: font("regular") }]}
            autoCapitalize="none"
            autoCorrect={false}
          />
          {!!compSearch && (
            <Pressable onPress={() => setCompSearch("")} style={{ padding: 6 }}>
              <Ionicons name="close-circle" size={18} color={BRAND.muted} />
            </Pressable>
          )}
        </View>

        <View style={{ height: 12 }} />

        <FlatList
          data={competitionsFiltered}
          keyExtractor={(c) => c.id}
          style={{ maxHeight: 460 }}
          ItemSeparatorComponent={() => <View style={{ height: 10 }} />}
          initialNumToRender={18}
          removeClippedSubviews
          renderItem={({ item }) => {
            const active = item.id === selectedCompetitionId;
            return (
              <Pressable
                onPress={() => {
                  setSelectedCompetitionId(item.id);
                  setCompetitionSheet(false);
                }}
                style={({ pressed }) => [
                  styles.sheetRow,
                  active && styles.sheetRowActive,
                  pressed && { opacity: 0.92 },
                ]}
              >
                <View style={{ flex: 1 }}>
                  <Text
                    style={[
                      styles.sheetRowText,
                      { fontFamily: font(active ? "medium" : "regular") },
                    ]}
                    numberOfLines={1}
                  >
                    {item.label}
                  </Text>
                  <Text
                    style={[
                      styles.sheetRowSub,
                      { fontFamily: font("regular") },
                    ]}
                    numberOfLines={1}
                  >
                    Tor: {item.track ?? "—"} • NrKonkur: {item.id}
                  </Text>
                </View>
                <Ionicons
                  name={active ? "checkmark-circle" : "ellipse-outline"}
                  size={18}
                  color={active ? BRAND.gold : BRAND.border}
                />
              </Pressable>
            );
          }}
        />
      </Sheet>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: BRAND.bg },
  topGlow: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    height: 130,
    opacity: 0.9,
  },

  bigTitle: { color: BRAND.text, fontSize: 34, letterSpacing: 1.2 },
  subTitle: { color: "rgba(218,218,218,0.85)", marginTop: 4, fontSize: 13 },

  cardOuter: {
    borderRadius: 22,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: BRAND.border,
    backgroundColor: BRAND.card,
  },
  cardBlur: { borderRadius: 22 },
  cardInner: { padding: 14 },

  heroRow: { flexDirection: "row", alignItems: "center", gap: 12 },
  heroTitle: { color: BRAND.text, fontSize: 18, letterSpacing: 0.8 },
  heroMeta: { color: "rgba(218,218,218,0.85)", marginTop: 4, fontSize: 12 },

  roundBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.14)",
    backgroundColor: "rgba(255,255,255,0.08)",
  },

  tilesGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    rowGap: 12,
  },
  tileOuter: {
    width: "48.5%",
    minHeight: 96,
    borderRadius: 18,
    borderWidth: 1,
    backgroundColor: "rgba(255,255,255,0.06)",
    overflow: "hidden",
  },
  tileBg: {
    ...StyleSheet.absoluteFillObject,
  },
  tileTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 12,
    paddingBottom: 6,
  },
  tileIconBadge: {
    width: 34,
    height: 34,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255,255,255,0.10)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.14)",
  },
  tileLabel: {
    paddingHorizontal: 12,
    marginTop: 2,
    color: "rgba(218,218,218,0.78)",
    fontSize: 11,
  },
  tileValue: {
    paddingHorizontal: 12,
    marginTop: 5,
    marginBottom: 12,
    color: BRAND.text,
    fontSize: 14,
  },

  competitionLeft: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },

  blockLabel: {
    color: "rgba(218,218,218,0.78)",
    fontSize: 11,
    marginBottom: 8,
  },
  segment: {
    position: "relative",
    flexDirection: "row",
    borderRadius: 18, // bardziej “premium”
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.14)",
    backgroundColor: "rgba(255,255,255,0.06)",
    overflow: "hidden",

    padding: 4, // ✅ oddech od krawędzi
  },
  segmentActive: {
    position: "absolute",
    top: 4,
    bottom: 4,
    left: 4,
    borderRadius: 16, // dopasowane do paddingu
    backgroundColor: "rgba(227,36,40,0.18)",
    borderWidth: 1,
    borderColor: "rgba(227,36,40,0.25)",
  },
  segmentBtn: {
    flex: 1,
    minHeight: 46,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 14, // ✅ tekst dalej od brzegów
    zIndex: 2,
  },

  segmentText: {
    color: "rgba(218,218,218,0.85)",
    fontSize: 12,
  },

  bigAction: {
    minHeight: 62,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "rgba(191,130,36,0.35)",
    backgroundColor: "rgba(191,130,36,0.10)",
    paddingHorizontal: 12,
    paddingVertical: 10,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    overflow: "hidden",
  },
  bigActionIcon: {
    width: 36,
    height: 36,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255,255,255,0.10)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.14)",
  },
  bigActionLabel: { color: "rgba(218,218,218,0.78)", fontSize: 11 },
  bigActionValue: { color: BRAND.text, fontSize: 14, marginTop: 2 },

  searchBox: {
    minHeight: 56,
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.14)",
    borderRadius: 18,
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: "rgba(255,255,255,0.06)",
  },
  compSearchBox: {
    minHeight: 56,
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.14)",
    borderRadius: 18,
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: "rgba(255,255,255,0.06)",
  },
  searchInput: { flex: 1, color: BRAND.text, fontSize: 13 },

  notice: {
    marginTop: 8,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingVertical: 6,
  },
  noticeText: { color: "rgba(218,218,218,0.90)", fontSize: 13 },

  sectionBig: { color: BRAND.text, fontSize: 28, letterSpacing: 1.2 },
  redUnderline: {
    width: 82,
    height: 3,
    borderRadius: 2,
    backgroundColor: BRAND.red,
    marginTop: 8,
  },

  rowCard: {
    borderRadius: 18,
    borderWidth: 1,
    borderColor: BRAND.border,
    backgroundColor: BRAND.card,
    marginBottom: 10,
    overflow: "hidden",
  },
  rowInner: {
    padding: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },

  rankBadge: {
    width: 36,
    height: 36,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.14)",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255,255,255,0.07)",
  },
  rankText: { color: BRAND.text, fontSize: 13 },

  nameText: { color: BRAND.text, fontSize: 14 },
  metaText: { color: "rgba(218,218,218,0.85)", fontSize: 12, marginTop: 2 },
  eventText: { color: "rgba(218,218,218,0.70)", fontSize: 12, marginTop: 2 },

  resultText: { color: BRAND.text, fontSize: 14 },
  dateText: { color: "rgba(218,218,218,0.70)", fontSize: 12, marginTop: 2 },

  badgeIcon: {
    width: 30,
    height: 30,
    borderRadius: 999,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255,255,255,0.07)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.14)",
  },

  sheetBackdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.55)",
    padding: 14,
    justifyContent: "flex-end",
  },
  sheet: {
    borderRadius: 20,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: BRAND.border,
    backgroundColor: "rgba(31,39,59,0.95)",
    padding: 14,
  },
  sheetHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 12,
  },
  sheetTitle: { color: BRAND.text, fontSize: 16 },

  sheetRow: {
    minHeight: 56,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.10)",
    backgroundColor: "rgba(255,255,255,0.05)",
    gap: 10,
  },
  sheetRowActive: {
    borderColor: "rgba(191,130,36,0.45)",
    backgroundColor: "rgba(191,130,36,0.10)",
  },
  sheetRowText: { color: BRAND.text, fontSize: 13 },
  sheetRowSub: { color: "rgba(218,218,218,0.75)", fontSize: 11, marginTop: 2 },

  competitionPicker: {
    minHeight: 78,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: "rgba(191,130,36,0.38)",
    backgroundColor: "rgba(191,130,36,0.10)",
    paddingHorizontal: 20,
    paddingVertical: 14,
    overflow: "hidden",
    justifyContent: "center",
  },
  competitionIconOverlay: {
    position: "absolute",
    left: 12, // bezpieczny offset – nie dotyka krawędzi
    top: "50%",
    transform: [{ translateY: -16 }],
    width: 34,
    height: 32,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255,255,255,0.08)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.12)",
  },

  competitionAccent: {
    position: "absolute",
    left: 0,
    top: 0,
    bottom: 0,
    width: 4,
    backgroundColor: "rgba(191,130,36,0.65)",
  },

  competitionRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingRight: 56,
    paddingLeft: 52, // przesuwa tekst, ale NIE zwiększa zewnętrznego paddingu
  },

  competitionIconBadge: {
    width: 38,
    height: 38,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255,255,255,0.10)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.14)",
    marginRight: 12,
  },

  competitionTextWrap: {
    flex: 1,
  },

  competitionLabel: {
    color: "rgba(218,218,218,0.80)",
    fontSize: 11,
  },

  competitionValue: {
    color: BRAND.text,
    fontSize: 16,
    marginTop: 3,
  },

  competitionChevronPill: {
    position: "absolute",
    right: 14,
    top: "50%",
    transform: [{ translateY: -18 }],
    width: 40,
    height: 36,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255,255,255,0.10)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.14)",
  },
});
