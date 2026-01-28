import firestore from "@react-native-firebase/firestore";
import { format } from "date-fns";
import { pl } from "date-fns/locale";
import { BlurView } from "expo-blur";
import * as Haptics from "expo-haptics";
import { LinearGradient as ExpoGradient } from "expo-linear-gradient";
import Ionicons from "@expo/vector-icons/Ionicons";
import { MotiView } from "moti";
import type { DomtelEvent } from "../src/features/events/types";
import { FlashList } from "@shopify/flash-list";
import { useDomtelEventResults } from "../src/features/events/hooks/useDomtelEventResults";

import React, { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Animated,
  Dimensions,
  Image,
  Linking,
  Platform,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from "react-native";

import { Calendar, LocaleConfig } from "react-native-calendars";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Svg, { Defs, LinearGradient, Path, Stop } from "react-native-svg";

import { useDomtelEvents } from "../src/features/events/hooks/useDomtelEvents";

/* ───────── LocaleConfig (PL) ───────── */
LocaleConfig.locales["pl"] = {
  monthNames: [
    "styczeń",
    "luty",
    "marzec",
    "kwiecień",
    "maj",
    "czerwiec",
    "lipiec",
    "sierpień",
    "wrzesień",
    "październik",
    "listopad",
    "grudzień",
  ],
  monthNamesShort: [
    "sty",
    "lut",
    "mar",
    "kwi",
    "maj",
    "cze",
    "lip",
    "sie",
    "wrz",
    "paź",
    "lis",
    "gru",
  ],
  dayNames: [
    "niedziela",
    "poniedziałek",
    "wtorek",
    "środa",
    "czwartek",
    "piątek",
    "sobota",
  ],
  dayNamesShort: ["N", "Pn", "Wt", "Śr", "Cz", "Pt", "So"],
  today: "Dziś",
};
LocaleConfig.defaultLocale = "pl";

/* ───────── Paleta PZŁS (dark) ───────── */
const PZLS = {
  bg: "#191C2F",
  card: "rgba(31,39,59,0.55)",
  glassRed: "rgba(227,36,40,0.72)",
  glassBlue: "rgba(25,28,47,0.85)",
  primary: "#E32428",
  secondary: "#BF8224",
  textLight: "#DFEFF3",
  textSub: "#DADADA",
  accentST: "#5E1324",
};

const CARD_RADIUS = 18;
const { width, height } = Dimensions.get("window");

/* ───────── Helpers ───────── */
function seasonFromISO(iso: string) {
  const y = Number(iso.slice(0, 4));
  const m = Number(iso.slice(5, 7));
  return String(m >= 7 ? y : y - 1);
}

function nextDayISO(iso: string) {
  const d = new Date(iso + "T00:00:00");
  d.setDate(d.getDate() + 1);
  return format(d, "yyyy-MM-dd");
}
function toLocalDate(input: string) {
  const s = String(input || "").trim();
  if (!s) return new Date(NaN);
  // jeśli to "yyyy-MM-dd" to dopnij local midnight, żeby nie przesuwało dnia strefą
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return new Date(s + "T00:00:00");
  return new Date(s);
}

function toISODateSafe(input: string) {
  const s = String(input || "").trim();
  const m = s.match(/^(\d{4}-\d{2}-\d{2})/);
  if (m) return m[1]; // "yyyy-MM-dd" niezależnie czy jest "T...Z"
  return format(new Date(s), "yyyy-MM-dd");
}

function isoInRange(selISO: string, startISO: string, endISO?: string) {
  const end = endISO?.trim() ? endISO : startISO;
  return selISO >= startISO && selISO <= end;
}

function normalizeTorToLS(typeOrTor: any): "L" | "S" {
  if (typeOrTor === "short-track") return "S";
  if (typeOrTor === "long-track") return "L";
  if (typeOrTor === "S" || typeOrTor === "L") return typeOrTor;
  return "L";
}
function matchDomtelForPzls(p: PzlsEvent, domtel: DomtelEvent[]) {
  const pISO = toISODateSafe(p.date);
  const pTor = p.type === "short-track" ? "S" : "L";

  const norm = (s: string) =>
    String(s || "")
      .toUpperCase()
      .normalize("NFD")
      .replace(/\p{Diacritic}/gu, "")
      .replace(/\s+/g, " ")
      .trim();

  const pCity = norm(p.location ?? "");
  const pName = norm(p.name ?? "");

  let best: { score: number; item: DomtelEvent } | null = null;

  for (const d of domtel ?? []) {
    const start = String(d.data1 || "").trim();
    if (!/^\d{4}-\d{2}-\d{2}$/.test(start)) continue;

    const end = String(d.data2 || "").trim() ? String(d.data2) : start;
    if (!isoInRange(pISO, start, end)) continue;

    if (String(d.tor) !== pTor) continue;

    const dCity = norm(d.miasto ?? "");
    const dName = norm(d.nazwa ?? "");

    let score = 0;

    if (pCity && dCity && (dCity.includes(pCity) || pCity.includes(dCity)))
      score += 3;

    // prosta podobieństwo po słowach
    const pWords = new Set(pName.split(" ").filter(Boolean));
    const dWords = new Set(dName.split(" ").filter(Boolean));
    let common = 0;
    for (const w of pWords) if (dWords.has(w)) common++;
    score += Math.min(4, common);

    // bonus jeśli są wyniki
    if (Number(d.liczbaWynikow || 0) > 0) score += 1;

    if (!best || score > best.score) best = { score, item: d };
  }

  return best?.item;
}

/* ───────── Płatki śniegu (particles) ───────── */
const Snowflake = (p: any) => {
  const pos = React.useRef(new Animated.ValueXY({ x: p.x, y: p.y })).current;

  React.useEffect(() => {
    let off = false;
    const fly = () => {
      if (off) return;
      Animated.timing(pos, {
        toValue: {
          x: p.x + (Math.random() * 2 - 1) * p.range,
          y: p.y + (Math.random() * 2 - 1) * p.range,
        },
        duration: p.duration,
        useNativeDriver: true,
      }).start(fly);
    };

    const t = setTimeout(fly, p.delay);
    return () => {
      off = true;
      clearTimeout(t);
    };
  }, [p.delay, p.duration, p.range, p.x, p.y, pos]);

  return (
    <Animated.Image
      source={require("../assets/images/snowflake.png")}
      resizeMode="contain"
      style={{
        position: "absolute",
        width: p.size,
        height: p.size,
        opacity: p.opacity,
        transform: [{ translateX: pos.x }, { translateY: pos.y }],
      }}
    />
  );
};

const Particles = () => {
  const list = useMemo(
    () =>
      Array.from({ length: 18 }).map(() => ({
        x: Math.random() * width,
        y: Math.random() * height,
        size: 16 + Math.random() * 16,
        opacity: 0.2 + Math.random() * 0.25,
        duration: 4500 + Math.random() * 3500,
        delay: Math.random() * 2000,
        range: 30 + Math.random() * 40,
      })),
    [],
  );

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      {list.map((p, i) => (
        <Snowflake key={i} {...p} />
      ))}
    </View>
  );
};

/* ───────── Falujące nagłówki ───────── */
const TopWave = () => (
  <Svg
    width={width}
    height={120}
    viewBox={"0 0 " + width + " 120"}
    style={{ position: "absolute", top: 0, left: 0 }}
  >
    <Defs>
      <LinearGradient id="fadeRed" x1="0" y1="0" x2="0" y2="1">
        <Stop offset="0%" stopColor={PZLS.glassRed} stopOpacity="1" />
        <Stop offset="100%" stopColor={PZLS.glassRed} stopOpacity="0" />
      </LinearGradient>
    </Defs>

    <Path
      d={
        "M0,0 H" +
        width +
        " V60 Q" +
        width * 0.85 +
        ",95 " +
        width * 0.45 +
        ",80 T0,60 Z"
      }
      fill="#141624"
      opacity={0.96}
    />
    <Path
      d={
        "M0,0 H" +
        width +
        " V55 Q" +
        width * 0.8 +
        ",90 " +
        width * 0.45 +
        ",75 T0,55 Z"
      }
      fill={PZLS.glassBlue}
      opacity={0.9}
    />
    <Path
      d={
        "M0,0 H" +
        width +
        " V50 Q" +
        width * 0.75 +
        ",85 " +
        width * 0.45 +
        ",70 T0,50 Z"
      }
      fill="url(#fadeRed)"
    />
  </Svg>
);

const BottomWave = ({
  translateY,
}: {
  translateY: Animated.AnimatedInterpolation<number>;
}) => (
  <Animated.View
    style={{
      position: "absolute",
      bottom: 0,
      left: 0,
      transform: [{ translateY }],
    }}
  >
    <Svg width={width} height={120} viewBox={"0 0 " + width + " 120"}>
      <Path
        d={
          "M0,80 Q" +
          width / 4 +
          ",120 " +
          width / 2 +
          ",90 T" +
          width +
          ",80 V120 H0 Z"
        }
        fill={PZLS.accentST}
        opacity={0.5}
      />
      <Path
        d={
          "M0,90 Q" +
          width / 3 +
          ",110 " +
          width / 1.3 +
          ",100 T" +
          width +
          ",110 V120 H0 Z"
        }
        fill={PZLS.primary}
        opacity={0.28}
      />
    </Svg>
  </Animated.View>
);

/* ───────── Typy ───────── */
type PzlsEvent = {
  id: string;
  date: string;
  name: string;
  type?: "short-track" | "long-track";
  location?: string;
};

type MergedEvent = {
  key: string;
  source: "pzls" | "domtel";
  title: string;
  city: string;
  tor: "L" | "S";
  startISO: string;
  endISO: string;
  hasResults: boolean;
  sezon?: string;
  nrKomunikatu?: string;
  raw?: any;
};

type PzlsEventLite = { date: string; type?: "short-track" | "long-track" };

const buildMarks = (args: {
  sel: string;
  pzls: PzlsEventLite[];
  domtel: DomtelEvent[];
}) => {
  const marks: Record<string, any> = {};

  const addDot = (iso: string, type: "short-track" | "long-track") => {
    const dot = type === "short-track" ? PZLS.primary : PZLS.secondary;
    if (!marks[iso]) marks[iso] = { dots: [] };
    marks[iso].dots.push({ color: dot });
  };

  args.pzls.forEach((e) => {
    const iso = toISODateSafe(e.date);

    addDot(iso, e.type === "short-track" ? "short-track" : "long-track");
  });

  args.domtel.forEach((e) => {
    const start = String(e.data1 || "");
    if (!/^\d{4}-\d{2}-\d{2}$/.test(start)) return;

    const end = String(e.data2 || "").trim() ? String(e.data2) : start;
    const type: "short-track" | "long-track" =
      String(e.tor) === "S" ? "short-track" : "long-track";

    let cur = start;
    let guard = 0;
    while (cur <= end && guard < 32) {
      addDot(cur, type);
      cur = nextDayISO(cur);
      guard++;
    }
  });

  marks[args.sel] = {
    ...(marks[args.sel] || {}),
    selected: true,
    selectedColor: PZLS.primary,
  };

  return marks;
};

/* ---------- Helper – tytuł sekcji ---------- */

/* ---------- DomTel Details ---------- */
const DomtelDetailsCard = ({
  domtel,
  onClose,
}: {
  domtel: DomtelEvent;
  onClose: () => void;
}) => {
  const insets = useSafeAreaInsets();
  const isST = String(domtel.tor) === "S";
  const end = domtel.data2?.trim() ? domtel.data2 : domtel.data1;

  const [filtersOpen, setFiltersOpen] = useState(true);
  const [plecFilter, setPlecFilter] = useState<"ALL" | "K" | "M">("ALL");
  const [konkurFilter, setKonkurFilter] = useState<string>("ALL");

  const { results, loading, error, refetch } = useDomtelEventResults({
    sezon: String(domtel.sezon ?? ""),
    nrKomunikatu: String(domtel.nrKomunikatu ?? ""),
    enabled: Number(domtel.liczbaWynikow || 0) > 0,
  });

  // --- SUMMARY z CAŁEGO API (wyniki) ---
  const summary = useMemo(() => {
    const disciplines = new Set<string>();
    const genders = new Set<string>();
    const athletes = new Set<string>();
    const heats = new Set<string>();
    let maxLevel = 0;
    let hasRelay = false;
    let lastAkt = "";

    const pushId = (v: any) => {
      const s = String(v ?? "").trim();
      if (!s || s === "0" || s.toLowerCase() === "null") return;
      athletes.add(s);
    };

    for (const r of results ?? []) {
      const raw: any = (r as any)?.raw ?? {};
      const konkur = String(
        raw?.Konkurencja ?? (r as any)?.discipline ?? "",
      ).trim();
      const plec = String(raw?.Plec ?? "").trim();
      const seria = String(raw?.Seria ?? "").trim();
      const szcz = String(raw?.Szczebel ?? "").trim();
      const akt = String(raw?.DataAkt ?? "").trim();

      if (konkur) disciplines.add(konkur);
      if (plec) genders.add(plec);

      pushId(raw?.NrZawodnika);
      pushId(raw?.NrZawodnikaSzt1);
      pushId(raw?.NrZawodnikaSzt2);
      pushId(raw?.NrZawodnikaSzt3);
      pushId(raw?.NrZawodnikaSzt4);
      pushId(raw?.NrZawodnikaSzt5);

      const heatKey = `${konkur}|${seria}|${szcz}|${String(
        raw?.ZawodyData ?? "",
      ).trim()}`;
      heats.add(heatKey);

      const lvl = Number(String(raw?.Szczebel ?? "").trim());
      if (Number.isFinite(lvl)) maxLevel = Math.max(maxLevel, lvl);

      const relayIds = [
        raw?.NrZawodnikaSzt1,
        raw?.NrZawodnikaSzt2,
        raw?.NrZawodnikaSzt3,
        raw?.NrZawodnikaSzt4,
        raw?.NrZawodnikaSzt5,
      ]
        .map((x: any) => String(x ?? "").trim())
        .filter((x: string) => x && x !== "0" && x.toLowerCase() !== "null");

      if (relayIds.length) hasRelay = true;
      if (konkur.toLowerCase().startsWith("szt")) hasRelay = true;

      if (akt && (!lastAkt || akt > lastAkt)) lastAkt = akt;
    }

    return {
      disciplines: Array.from(disciplines).sort((a, b) => a.localeCompare(b)),
      genders: Array.from(genders).sort(),
      athletesCount: athletes.size,
      heatsCount: heats.size,
      maxLevel,
      hasRelay,
      lastAkt,
    };
  }, [results]);

  const uniqKonkur = useMemo(() => {
    const set = new Set<string>();
    for (const r of results ?? []) {
      const raw: any = (r as any)?.raw ?? {};
      const k = String(raw?.Konkurencja ?? (r as any)?.discipline ?? "").trim();
      if (k) set.add(k);
    }
    return ["ALL", ...Array.from(set).sort((a, b) => a.localeCompare(b))];
  }, [results]);

  const filtered = useMemo(() => {
    return (results ?? []).filter((r: any) => {
      const raw = r?.raw ?? {};
      const plec = String(raw?.Plec ?? "").trim();
      const konkur = String(raw?.Konkurencja ?? r?.discipline ?? "").trim();

      if (plecFilter !== "ALL" && plec !== plecFilter) return false;
      if (konkurFilter !== "ALL" && konkur !== konkurFilter) return false;
      return true;
    });
  }, [results, plecFilter, konkurFilter]);

  type RowItem =
    | { kind: "hdr"; id: string; title: string }
    | { kind: "row"; id: string; row: any };

  const flat = useMemo<RowItem[]>(() => {
    const by = new Map<string, any[]>();
    for (const r of filtered as any[]) {
      const k =
        String(r?.raw?.Konkurencja ?? r?.discipline ?? "Inne").trim() || "Inne";
      if (!by.has(k)) by.set(k, []);
      by.get(k)!.push(r);
    }

    const keys = Array.from(by.keys()).sort((a, b) => a.localeCompare(b));
    const out: RowItem[] = [];

    for (const k of keys) {
      out.push({ kind: "hdr", id: `h_${k}`, title: k });
      const rows = by.get(k)!;
      rows.sort((a, b) => Number(a?.place ?? 9999) - Number(b?.place ?? 9999));
      for (let i = 0; i < rows.length; i++)
        out.push({ kind: "row", id: `r_${k}_${i}`, row: rows[i] });
    }

    return out;
  }, [filtered]);

  const headerDate =
    domtel.data1 === end
      ? format(toLocalDate(domtel.data1), "d MMMM yyyy, EEEE", { locale: pl })
      : `${format(toLocalDate(domtel.data1), "d MMM yyyy", {
          locale: pl,
        })} – ${format(toLocalDate(end), "d MMM yyyy", { locale: pl })}`;

  const ListHeader = (
    <View style={{ paddingHorizontal: 20, paddingTop: insets.top + 52 }}>
      <View style={styles.headerCard}>
        <Text style={styles.headerTitle}>{domtel.nazwa}</Text>

        <View style={styles.metaRow}>
          <Ionicons
            name="location"
            size={16}
            color={PZLS.textSub}
            style={{ marginRight: 6 }}
          />
          <Text style={styles.metaText}>{domtel.miasto}</Text>
        </View>

        <View style={styles.metaRow}>
          <Ionicons
            name="calendar"
            size={16}
            color={PZLS.textSub}
            style={{ marginRight: 6 }}
          />
          <Text style={styles.metaText}>{headerDate}</Text>
        </View>

        <View style={styles.metaRow}>
          <Ionicons
            name="chatbubble-ellipses"
            size={16}
            color={PZLS.textSub}
            style={{ marginRight: 6 }}
          />
          <Text style={styles.metaText}>
            {isST ? "Tor krótki (S)" : "Tor długi (L)"}
          </Text>
        </View>

        {/* Tabs + refresh (bez wielkiego bloku meta) */}
        <View
          style={{
            flexDirection: "row",
            gap: 10,
            marginTop: 14,
            alignItems: "center",
          }}
        >
          <Text style={styles.tabText}>Informacje</Text>

          <View style={{ flex: 1 }} />

          <Pressable
            onPress={refetch}
            hitSlop={14}
            style={extraStyles.refreshIconBtn}
          >
            <Ionicons name="refresh" size={18} color={PZLS.textLight} />
            <Text style={extraStyles.refreshIconText}>Odśwież</Text>
          </Pressable>
        </View>

        {/* Szybkie „Kowalski-friendly” summary (z API) */}
        <View style={extraStyles.summaryRow}>
          <Text style={extraStyles.summaryChip}>
            Konkurencje: {summary.disciplines.length}
          </Text>
          <Text style={extraStyles.summaryChip}>
            Zawodnicy: {summary.athletesCount}
          </Text>
          <Text style={extraStyles.summaryChip}>
            Biegi: {summary.heatsCount}
          </Text>
          {summary.hasRelay ? (
            <Text style={extraStyles.summaryChip}>Sztafety: ✓</Text>
          ) : null}
        </View>
      </View>

      {/* Filtry tylko na tab "wyniki" */}

      <View style={{ marginTop: 14 }}>
        <Pressable
          onPress={() => setFiltersOpen((v) => !v)}
          style={extraStyles.filtersToggle}
        >
          <Ionicons
            name={filtersOpen ? "chevron-up" : "chevron-down"}
            size={18}
            color={PZLS.textLight}
          />
          <Text style={extraStyles.filtersToggleText}>
            {filtersOpen ? "Zwiń filtry" : "Pokaż filtry"}
          </Text>
        </Pressable>

        {filtersOpen ? (
          <>
            <View style={{ flexDirection: "row", gap: 10, marginTop: 10 }}>
              {(["ALL", "K", "M"] as const).map((x) => (
                <Pressable
                  key={x}
                  onPress={() => setPlecFilter(x)}
                  style={[
                    styles.filterChip,
                    plecFilter === x ? styles.filterChipActive : null,
                  ]}
                >
                  <Text style={styles.filterText}>
                    {x === "ALL"
                      ? "Wszyscy"
                      : x === "K"
                        ? "Kobiety"
                        : "Mężczyźni"}
                  </Text>
                </Pressable>
              ))}
            </View>

            {uniqKonkur.length > 1 ? (
              <View
                style={{
                  flexDirection: "row",
                  flexWrap: "wrap",
                  gap: 8,
                  marginTop: 10,
                }}
              >
                {uniqKonkur.slice(0, 18).map((k) => (
                  <Pressable
                    key={k}
                    onPress={() => setKonkurFilter(k)}
                    style={[
                      styles.filterChipSmall,
                      konkurFilter === k ? styles.filterChipActive : null,
                    ]}
                  >
                    <Text style={styles.filterTextSmall}>
                      {k === "ALL" ? "Wszystkie" : k}
                    </Text>
                  </Pressable>
                ))}
              </View>
            ) : null}
          </>
        ) : null}
      </View>
    </View>
  );

  return (
    <View style={[StyleSheet.absoluteFillObject, { backgroundColor: PZLS.bg }]}>
      <Pressable
        onPress={onClose}
        hitSlop={18}
        style={[
          styles.backBtn,
          { top: insets.top + 10, flexDirection: "row", alignItems: "center" },
        ]}
      >
        <Ionicons name="chevron-back" size={30} color={PZLS.textLight} />
        <Text
          style={{
            fontFamily: "Jost-Medium",
            fontSize: 18,
            color: PZLS.textLight,
          }}
        >
          Powrót
        </Text>
      </Pressable>

      <FlashList
        data={flat}
        keyExtractor={(it: RowItem) => it.id}
        estimatedItemSize={84}
        ListHeaderComponent={ListHeader}
        contentContainerStyle={{ paddingBottom: insets.bottom + 140 }}
        renderItem={({ item }: { item: RowItem }) => {
          if (item.kind === "hdr") {
            return (
              <View
                style={{
                  paddingHorizontal: 20,
                  paddingTop: 18,
                  paddingBottom: 10,
                }}
              >
                <Text style={styles.sectionHdr}>{item.title}</Text>
              </View>
            );
          }

          const r: any = item.row;
          const raw = r?.raw ?? {};

          const plec = String(raw?.Plec ?? "").trim();
          const genderLabel =
            plec === "K" ? "Kobiety" : plec === "M" ? "Mężczyźni" : "";

          const sportClass = String(raw?.KlasaSportowa ?? "").trim();
          const stage = String(raw?.Szczebel ?? "").trim();
          const series = String(raw?.Seria ?? "").trim();
          const notes = String(raw?.Uwagi ?? "").trim();

          const mainId = String(raw?.NrZawodnika ?? "").trim();
          const name = String(raw?.Sztafeta ?? "").trim()
            ? `Sztafeta: ${String(raw?.Sztafeta).trim()}`
            : String(raw?.Zawodnik ?? r?.name ?? "").trim() ||
              (mainId ? `Zawodnik #${mainId}` : "—");

          const club = String(raw?.Klub ?? r?.club ?? "").trim();

          return (
            <View style={[styles.resultCard, { marginHorizontal: 20 }]}>
              <View style={{ flexDirection: "row", alignItems: "center" }}>
                <Text style={styles.resultPlace}>{r.place ?? "—"}</Text>

                <View style={{ flex: 1 }}>
                  <Text style={styles.resultName} numberOfLines={1}>
                    {name}
                  </Text>

                  {club ? (
                    <Text style={styles.resultClub} numberOfLines={1}>
                      {club}
                    </Text>
                  ) : null}

                  <View
                    style={{
                      flexDirection: "row",
                      flexWrap: "wrap",
                      gap: 8,
                      marginTop: 8,
                    }}
                  >
                    {genderLabel ? (
                      <Text style={styles.metaBadge}>{genderLabel}</Text>
                    ) : null}
                    {sportClass ? (
                      <Text style={styles.metaBadge}>Klasa: {sportClass}</Text>
                    ) : null}
                    {stage ? (
                      <Text style={styles.metaBadge}>Szczebel: {stage}</Text>
                    ) : null}
                    {series ? (
                      <Text style={styles.metaBadge}>Seria: {series}</Text>
                    ) : null}
                    {notes ? (
                      <Text style={[styles.metaBadge, { color: PZLS.primary }]}>
                        Uwagi: {notes}
                      </Text>
                    ) : null}
                  </View>
                </View>

                <Text style={styles.resultTime} numberOfLines={1}>
                  {r.resultText}
                </Text>
              </View>
            </View>
          );
        }}
        ListEmptyComponent={
          <View style={{ padding: 24, alignItems: "center" }}>
            {loading ? (
              <ActivityIndicator size="small" color={PZLS.primary} />
            ) : error ? (
              <>
                <Text
                  style={{
                    fontFamily: "Jost-Medium",
                    color: PZLS.secondary,
                    textAlign: "center",
                  }}
                >
                  {error}
                </Text>
                <Pressable onPress={refetch} style={{ marginTop: 10 }}>
                  <Text
                    style={{ fontFamily: "Jost-Medium", color: PZLS.primary }}
                  >
                    Spróbuj ponownie
                  </Text>
                </Pressable>
              </>
            ) : (
              <Text style={styles.noEv}>
                Brak wyników dla wybranych filtrów
              </Text>
            )}
          </View>
        }
      />
    </View>
  );
};

/* ---------- PZLS Details (z dopięciem DomTel jeśli jest match) ---------- */
const EventDetailsCard = ({
  pzls,
  domtelMatch,
  onOpenDomtel,
  onClose,
}: {
  pzls: PzlsEvent;
  domtelMatch?: DomtelEvent;
  onOpenDomtel?: (d: DomtelEvent) => void;
  onClose: () => void;
}) => {
  const fade = React.useRef(new Animated.Value(0)).current;
  const slide = React.useRef(new Animated.Value(26)).current;
  const insets = useSafeAreaInsets();

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fade, {
        toValue: 1,
        duration: 220,
        useNativeDriver: true,
      }),
      Animated.spring(slide, {
        toValue: 0,
        damping: 16,
        stiffness: 160,
        useNativeDriver: true,
      }),
    ]).start();
  }, [fade, slide]);

  const isST =
    (domtelMatch?.tor ? String(domtelMatch.tor) === "S" : false) ||
    pzls.type === "short-track";

  const startISO = domtelMatch?.data1?.trim()
    ? String(domtelMatch.data1)
    : toISODateSafe(pzls.date);

  const endISO = domtelMatch?.data2?.trim()
    ? String(domtelMatch.data2)
    : startISO;

  const cityRaw = String(domtelMatch?.miasto ?? pzls.location ?? "—");
  const title = String(domtelMatch?.nazwa ?? pzls.name ?? "Wydarzenie");

  const openMap = () => {
    const q = encodeURIComponent(cityRaw);
    Linking.openURL(
      `https://www.google.com/maps/search/?api=1&query=${q}`,
    ).catch(() => {});
  };

  const dateLine =
    startISO === endISO
      ? format(toLocalDate(startISO), "d MMMM yyyy, EEEE", { locale: pl })
      : `${format(toLocalDate(startISO), "d MMM yyyy", {
          locale: pl,
        })} – ${format(toLocalDate(endISO), "d MMM yyyy", { locale: pl })}`;

  const resultsCount = Number(domtelMatch?.liczbaWynikow || 0);
  const hasDomtel = !!domtelMatch;

  return (
    <Animated.ScrollView
      style={[
        StyleSheet.absoluteFillObject,
        {
          paddingHorizontal: 20,
          backgroundColor: PZLS.bg,
          opacity: fade,
          transform: [{ translateY: slide }],
        },
      ]}
      contentContainerStyle={{
        paddingTop: insets.top + 52,
        paddingBottom: insets.bottom + 140,
      }}
    >
      <Pressable
        onPress={onClose}
        hitSlop={18}
        style={[
          styles.backBtn,
          { top: insets.top + 10, flexDirection: "row", alignItems: "center" },
        ]}
      >
        <Ionicons name="chevron-back" size={30} color={PZLS.textLight} />
        <Text
          style={{
            fontFamily: "Jost-Medium",
            fontSize: 18,
            color: PZLS.textLight,
          }}
        >
          Powrót
        </Text>
      </Pressable>

      <View style={styles.headerCard}>
        <Text style={styles.headerTitle}>{title}</Text>

        <View style={styles.metaRow}>
          <Ionicons
            name="calendar"
            size={16}
            color={PZLS.textSub}
            style={{ marginRight: 6 }}
          />
          <Text style={styles.metaText}>{dateLine}</Text>
        </View>

        <View style={styles.metaRow}>
          <Ionicons
            name="location"
            size={16}
            color={PZLS.textSub}
            style={{ marginRight: 6 }}
          />
          <Text style={styles.metaText}>{cityRaw}</Text>
        </View>

        <View style={styles.metaRow}>
          <Ionicons
            name="chatbubble-ellipses"
            size={16}
            color={PZLS.textSub}
            style={{ marginRight: 6 }}
          />
          <Text style={styles.metaText}>
            {isST ? "Tor krótki" : "Tor długi"}
          </Text>
        </View>

        <Pressable
          style={[styles.actionBtn, { marginTop: 14 }]}
          onPress={openMap}
        >
          <Ionicons name="map-outline" size={20} color={PZLS.textLight} />
          <Text style={styles.actionText}>Otwórz mapę</Text>
        </Pressable>

        {hasDomtel && onOpenDomtel ? (
          <Pressable
            style={[styles.actionBtn, { marginTop: 12 }]}
            onPress={() => onOpenDomtel(domtelMatch!)}
          >
            <Ionicons name="stats-chart" size={20} color={PZLS.secondary} />
            <Text style={[styles.actionText, { color: PZLS.textLight }]}>
              {resultsCount > 0
                ? `Wyniki (${resultsCount})`
                : "Szczegóły / wyniki"}
            </Text>
          </Pressable>
        ) : (
          <Text style={[styles.domtelSub, { marginTop: 14 }]}>
            Brak powiązania z DomTel dla tego wydarzenia.
          </Text>
        )}
      </View>
    </Animated.ScrollView>
  );
};

/* ───────── Main ───────── */
export default function Wydarzenia(props: { isActive?: boolean }) {
  const insets = useSafeAreaInsets();

  const isActive = props?.isActive !== false;

  const [events, setEvents] = useState<PzlsEvent[]>([]);
  const [activeEvent, setActiveEvent] = useState<MergedEvent | null>(null);
  const [activeDomtel, setActiveDomtel] = useState<DomtelEvent | null>(null);

  const [sel, setSel] = useState(format(new Date(), "yyyy-MM-dd"));
  const [visibleMonthISO, setVisibleMonthISO] = useState(sel);

  const [refreshing, setRefreshing] = useState(false);
  const [monthLoad, setMonthLoad] = useState(false);

  const season = useMemo(
    () => seasonFromISO(visibleMonthISO),
    [visibleMonthISO],
  );

  const { domtelEvents, domtelLoading, refetchDomtel } =
    useDomtelEvents(season);

  const scrollY = React.useRef(new Animated.Value(0)).current;

  useEffect(() => {}, [events, domtelEvents]);

  const mergedEvents = useMemo<MergedEvent[]>(() => {
    const list: MergedEvent[] = [];

    // PZŁS: dodaj tylko jeśli NIE ma sensownego dopasowania w DomTel
    for (const e of events ?? []) {
      const pzlsEvent: PzlsEvent = {
        ...e,
        date: toISODateSafe(e.date),
      };

      const matched = matchDomtelForPzls(pzlsEvent, domtelEvents ?? []);

      if (matched) continue; // <-- klucz: nie pokazuj duplikatu z gorszego źródła

      const startISO = toISODateSafe(pzlsEvent.date);
      const tor = normalizeTorToLS(pzlsEvent.type);

      list.push({
        key: `pzls_${pzlsEvent.id ?? `${startISO}_${pzlsEvent.name}`}`,
        source: "pzls",
        title: String(pzlsEvent.name ?? "Wydarzenie"),
        city: String(pzlsEvent.location ?? "—"),
        tor,
        startISO,
        endISO: startISO,
        hasResults: false,
        raw: pzlsEvent,
      });
    }

    // DomTel: zakres data1->data2
    for (const d of domtelEvents ?? []) {
      const startISO = String(d.data1 || "").trim();
      if (!/^\d{4}-\d{2}-\d{2}$/.test(startISO)) continue;

      const endISO = String(d.data2 || "").trim() ? String(d.data2) : startISO;
      const tor = normalizeTorToLS(d.tor);

      list.push({
        key: `domtel_${d.id}`,
        source: "domtel",
        title: String(d.nazwa || "Impreza"),
        city: String(d.miasto || "—"),
        tor,
        startISO,
        endISO,
        hasResults: (d.liczbaWynikow ?? 0) > 0,
        sezon: String(d.sezon),
        nrKomunikatu: String(d.nrKomunikatu),
        raw: d,
      });
    }

    list.sort((a, b) => (a.startISO > b.startISO ? 1 : -1));
    return list;
  }, [events, domtelEvents]);

  const daily = useMemo(() => {
    return mergedEvents.filter((e) => e.startISO <= sel && sel <= e.endISO);
  }, [mergedEvents, sel]);

  const marked = useMemo(() => {
    return buildMarks({
      sel,
      pzls: events as any,
      domtel: (domtelEvents ?? []) as any,
    });
  }, [sel, events, domtelEvents]);

  const onRefresh = async () => {
    setRefreshing(true);
    try {
      const snap = await firestore().collection("events").orderBy("date").get();
      const list = snap.docs
        .map((d) => {
          const val = d.data();
          return val ? ({ ...val, id: d.id } as any) : null;
        })
        .filter((e): e is PzlsEvent => !!(e && e.date && e.name))
        .sort((a, b) => (a.date > b.date ? 1 : -1));
      setEvents(list);
      await refetchDomtel();
    } finally {
      setRefreshing(false);
    }
  };

  useEffect(() => {
    if (!isActive) return;

    const unsub = firestore()
      .collection("events")
      .orderBy("date")
      .onSnapshot((snap) => {
        const docs = Array.isArray(snap?.docs) ? snap.docs : [];
        const list = docs
          .map((d) => {
            const val = d.data();
            return val ? ({ ...val, id: d.id } as any) : null;
          })
          .filter((e): e is PzlsEvent => !!(e && e.date && e.name))
          .sort((a, b) => (a.date > b.date ? 1 : -1));
        setEvents(list);
      });

    return () => unsub();
  }, [isActive]);

  const AnimatedFlashList = useMemo(
    () => Animated.createAnimatedComponent(FlashList as any),
    [],
  );

  return (
   <View style={{ flex: 1, backgroundColor: PZLS.bg, paddingTop: insets.top }}>
      <TopWave />

      <BottomWave
        translateY={scrollY.interpolate({
          inputRange: [0, 160],
          outputRange: [0, -8],
          extrapolate: "clamp",
        })}
      />

      {isActive ? <Particles /> : null}

      {(activeEvent || activeDomtel) && (
        <>
          <BlurView
            style={StyleSheet.absoluteFill}
            intensity={12}
            tint="dark"
          />

          {activeDomtel ? (
            <DomtelDetailsCard
              domtel={activeDomtel}
              onClose={() => setActiveDomtel(null)}
            />
          ) : activeEvent?.source === "domtel" ? (
            <DomtelDetailsCard
              domtel={activeEvent.raw as DomtelEvent}
              onClose={() => setActiveEvent(null)}
            />
          ) : (
            (() => {
              const p = activeEvent?.raw as PzlsEvent;
              const matched = matchDomtelForPzls(
                {
                  id: p.id,
                  name: p.name,
                  date: p.date,
                  location: p.location,
                  type: p.type,
                },
                domtelEvents || [],
              );

              return (
                <EventDetailsCard
                  pzls={p}
                  domtelMatch={matched}
                  onOpenDomtel={(d: DomtelEvent) => setActiveDomtel(d)}
                  onClose={() => setActiveEvent(null)}
                />
              );
            })()
          )}
        </>
      )}

      {!activeEvent && !activeDomtel && (
        <View style={styles.titleContainer}>
          <MotiView
            from={{ scale: 0.6, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ type: "spring", duration: 800 }}
            style={{ marginRight: 10 }}
          >
            <Image
              source={require("../assets/images/lyzwa.png")}
              style={{ width: 24, height: 24 }}
              resizeMode="contain"
            />
          </MotiView>

          <MotiView
            from={{ scale: 1, opacity: 0.8 }}
            animate={{ scale: 1.03, opacity: 1 }}
            transition={{ loop: true, repeatReverse: true, duration: 2200 }}
          >
            <Text style={styles.title}>Kalendarz</Text>
          </MotiView>
        </View>
      )}

      <View
        style={{
          flex: 1,
          opacity: activeEvent || activeDomtel ? 0 : 1,
          pointerEvents: activeEvent || activeDomtel ? "none" : "auto",
        }}
      >
        <BlurView intensity={8} tint="dark" style={styles.calendarCard}>
          <Calendar
            current={sel}
            markingType="multi-dot"
            markedDates={marked}
            onPressArrowLeft={(cb) => {
              setMonthLoad(true);
              cb();
              setTimeout(() => setMonthLoad(false), 300);
            }}
            onPressArrowRight={(cb) => {
              setMonthLoad(true);
              cb();
              setTimeout(() => setMonthLoad(false), 300);
            }}
            onMonthChange={(m) => {
              // m.dateString to zwykle "YYYY-MM-DD" (1 dzień miesiąca)
              if (m?.dateString) setVisibleMonthISO(m.dateString);
            }}
            onDayPress={(d) => {
              setSel(d.dateString);
              setVisibleMonthISO(d.dateString); // <- ważne: kliknięcie dnia też ustawia sezon
              Haptics.selectionAsync().catch(() => {});
            }}
            enableSwipeMonths
            theme={{
              calendarBackground: "transparent",
              backgroundColor: "transparent",
              textSectionTitleColor: PZLS.textSub,
              dayTextColor: PZLS.textLight,
              todayTextColor: PZLS.primary,
              selectedDayTextColor: PZLS.textLight,
              monthTextColor: PZLS.textLight,
              arrowColor: PZLS.textLight,
              textDayFontSize: 22,
              textDisabledColor: PZLS.textSub,
              textMonthFontSize: 24,
              textDayHeaderFontSize: 17,
              textDayFontFamily: "Jost-Medium",
              textMonthFontFamily: "Jost-Medium",
              textDayHeaderFontFamily: "Jost-Medium",
            }}
            dayComponent={({ date, state, marking }) => {
              if (!date) return null;
              const isSel = date.dateString === sel;
              return (
                <Pressable
                  onPress={() => {
                    if (isSel) return;
                    setSel(date.dateString);
                    requestAnimationFrame(() =>
                      Haptics.selectionAsync().catch(() => {}),
                    );
                  }}
                  style={{
                    width: 40,
                    height: 40,
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  {isSel && (
                    <View
                      style={{
                        position: "absolute",
                        width: 28,
                        height: 28,
                        borderRadius: 14,
                        backgroundColor: PZLS.primary,
                      }}
                    />
                  )}

                  <Text
                    style={{
                      color:
                        state === "disabled" ? PZLS.textSub : PZLS.textLight,
                      fontSize: 22,
                      fontFamily: "Jost-Medium",
                      transform: [{ translateY: 1 }],
                      ...(Platform.OS === "android"
                        ? { includeFontPadding: false }
                        : null),
                    }}
                  >
                    {date.day}
                  </Text>

                  {marking?.dots && (
                    <View
                      style={{ flexDirection: "row", gap: 2, marginTop: 1 }}
                    >
                      {marking.dots.slice(0, 3).map((d: any, i: number) => (
                        <View
                          key={i}
                          style={{
                            width: 3.5,
                            height: 3.5,
                            borderRadius: 2,
                            backgroundColor: d.color,
                          }}
                        />
                      ))}
                    </View>
                  )}
                </Pressable>
              );
            }}
          />

          {monthLoad && (
            <ActivityIndicator
              size="small"
              color={PZLS.primary}
              style={{ position: "absolute", top: 12, right: 16 }}
            />
          )}
        </BlurView>

        <AnimatedFlashList
          data={daily}
          keyExtractor={(it: MergedEvent) => it.key}
          estimatedItemSize={112}
          contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 100 }}
          onScroll={Animated.event(
            [{ nativeEvent: { contentOffset: { y: scrollY } } }],
            { useNativeDriver: true },
          )}
          scrollEventThrottle={16}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor={PZLS.primary}
            />
          }
          ListEmptyComponent={
            <View style={{ padding: 24, alignItems: "center" }}>
              {domtelLoading ? (
                <ActivityIndicator size="small" color={PZLS.primary} />
              ) : (
                <Text style={styles.noEv}>Brak wydarzeń w tym dniu</Text>
              )}
            </View>
          }
          renderItem={({
            item,
            index,
          }: {
            item: MergedEvent;
            index: number;
          }) => {
            const badgeText = item.tor === "S" ? "Short Track" : "Tor długi";
            const badgeStyle = {
              backgroundColor:
                item.tor === "S" ? PZLS.primary + "33" : PZLS.secondary + "33",
              color: item.tor === "S" ? PZLS.primary : PZLS.secondary,
            } as const;

            const subLine =
              item.source === "domtel"
                ? `${item.startISO}${
                    item.endISO !== item.startISO ? ` – ${item.endISO}` : ""
                  } • ${item.city}`
                : `${format(toLocalDate(item.startISO), "d MMMM yyyy", {
                    locale: pl,
                  })} • ${item.city}`;

            return (
              <Pressable
                onPress={() => {
                  Haptics.selectionAsync().catch(() => {});
                  setActiveEvent(item);
                }}
              >
                <MotiView
                  style={[styles.card, styles.cardShadow]}
                  from={{ opacity: 0, translateY: -14 }}
                  animate={{ opacity: 1, translateY: 0 }}
                  exit={{ opacity: 0, translateY: 14 }}
                  transition={{
                    type: "timing",
                    duration: 320,
                    delay: index * 40,
                  }}
                >
                  <ExpoGradient
                    colors={["rgba(31,39,59,0.85)", "rgba(31,39,59,0.6)"]}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 0, y: 1 }}
                    style={[StyleSheet.absoluteFillObject, styles.cardGradient]}
                  />

                  <View style={styles.cardContent}>
                    <Text style={styles.cardTitle}>{item.title}</Text>
                    <Text style={styles.cardSub}>{subLine}</Text>

                    <View
                      style={{
                        flexDirection: "row",
                        alignItems: "center",
                        flexWrap: "wrap",
                        gap: 10,
                        marginTop: 12,
                      }}
                    >
                      <Text style={[styles.badge, badgeStyle as any]}>
                        {badgeText}
                      </Text>

                      {item.source === "domtel" ? (
                        <Text
                          style={[
                            styles.badge,
                            {
                              backgroundColor: "rgba(255,255,255,0.10)",
                              color: PZLS.textLight,
                            },
                          ]}
                        >
                          Wyniki: {item.hasResults ? "✓" : "—"}
                        </Text>
                      ) : null}
                    </View>
                  </View>
                </MotiView>
              </Pressable>
            );
          }}
        />
      </View>
    </View>
  );
}

/* ───────── Styles ───────── */
const styles = StyleSheet.create({
  titleContainer: {
    position: "absolute",
    top: 60,
    left: 20,
    flexDirection: "row",
    alignItems: "center",
    zIndex: 3,
  },
  cardGradient: {
    borderRadius: CARD_RADIUS * 1.6,
  },
  cardContent: {
    paddingVertical: 22,
    paddingHorizontal: 24,
  },
  title: {
    fontFamily: "GoodTimes-BoldItalic",
    fontSize: 28,
    color: PZLS.textLight,
    textShadowColor: "#000",
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 8,
  },
  calendarCard: {
    width: width * 0.92,
    alignSelf: "center",
    marginTop: 65,
    borderRadius: 30,
    overflow: "hidden",
    padding: 28,
    borderWidth: 1.2,
    borderColor: "rgba(255,255,255,0.12)",
    shadowColor: "#000",
    shadowOpacity: 0.15,
    shadowRadius: 10,
    elevation: 6,
  },

  tabPill: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 999,
    backgroundColor: "rgba(255,255,255,0.06)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.10)",
    alignItems: "center",
  },
  tabPillActive: {
    backgroundColor: "rgba(227,36,40,0.20)",
    borderColor: "rgba(227,36,40,0.45)",
  },
  tabText: {
    fontFamily: "Jost-Medium",
    color: PZLS.textLight,
    fontSize: 14,
  },
  filterChip: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 999,
    backgroundColor: "rgba(255,255,255,0.06)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.10)",
    alignItems: "center",
  },
  filterChipSmall: {
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: "rgba(255,255,255,0.06)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.10)",
  },
  filterChipActive: {
    backgroundColor: "rgba(191,130,36,0.18)",
    borderColor: "rgba(191,130,36,0.55)",
  },
  filterText: {
    fontFamily: "Jost-Medium",
    color: PZLS.textLight,
    fontSize: 13,
  },
  filterTextSmall: {
    fontFamily: "Jost-Medium",
    color: PZLS.textLight,
    fontSize: 12,
  },
  sectionHdr: {
    fontFamily: "Jost-Medium",
    color: PZLS.secondary,
    fontSize: 16,
  },
  resultCard: {
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderRadius: 18,
    backgroundColor: "rgba(255,255,255,0.06)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.10)",
    marginBottom: 10,
  },
  resultPlace: {
    width: 34,
    fontFamily: "Jost-Medium",
    color: PZLS.textLight,
    fontSize: 16,
  },
  resultName: {
    fontFamily: "Jost-Medium",
    color: PZLS.textLight,
    fontSize: 15,
  },
  resultClub: {
    marginTop: 2,
    fontFamily: "Jost-Light",
    color: "rgba(223,239,243,0.72)",
    fontSize: 12,
  },
  resultTime: {
    marginLeft: 10,
    fontFamily: "Jost-Medium",
    color: PZLS.primary,
    fontSize: 15,
  },
  metaBadge: {
    fontFamily: "Jost-Medium",
    fontSize: 11,
    color: "rgba(223,239,243,0.80)",
    backgroundColor: "rgba(255,255,255,0.06)",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    overflow: "hidden",
  },
  infoCard: {
    padding: 16,
    borderRadius: 18,
    backgroundColor: "rgba(255,255,255,0.06)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.10)",
  },
  infoTitle: {
    fontFamily: "Jost-Medium",
    color: PZLS.textLight,
    fontSize: 16,
    marginBottom: 10,
  },
  infoLine: {
    fontFamily: "Jost-Light",
    color: "rgba(223,239,243,0.82)",
    fontSize: 13,
    marginTop: 6,
  },
  infoHint: {
    marginTop: 12,
    fontFamily: "Jost-Medium",
    color: PZLS.secondary,
    fontSize: 12,
  },

  metaRow: {
    marginTop: 6,
    flexDirection: "row",
    alignItems: "center",
  },
  card: {
    borderRadius: CARD_RADIUS * 1.6,
    overflow: "hidden",
    marginVertical: 8,
  },
  cardShadow: {
    shadowColor: "#000",
    shadowOpacity: 0.15,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 8 },
    elevation: 4,
  },
  cardTitle: {
    fontFamily: "Jost-Medium",
    fontSize: 17,
    color: PZLS.primary,
  },
  cardSub: {
    color: PZLS.textLight,
    marginTop: 4,
    fontFamily: "Jost-Light",
  },
  badge: {
    alignSelf: "flex-start",
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 999,
    fontFamily: "Jost-Medium",
    fontSize: 13,
    overflow: "hidden",
  },
  metaText: {
    fontFamily: "Jost-Light",
    fontSize: 16,
    color: PZLS.textLight,
  },
  backBtn: {
    position: "absolute",
    left: 20,
    zIndex: 5,
  },
  headerCard: {
    backgroundColor: "#1E2333",
    borderRadius: 24,
    padding: 24,
    shadowColor: "#000",
    shadowOpacity: 0.25,
    shadowRadius: 16,
    elevation: 8,
  },
  headerTitle: {
    fontFamily: "GoodTimes-BoldItalic",
    fontSize: 26,
    color: PZLS.primary,
    marginBottom: 14,
  },
  noEv: {
    fontFamily: "Jost-Medium",
    fontSize: 18,
    color: PZLS.secondary,
    textAlign: "center",
  },
  actionBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 12,
    backgroundColor: "#262B3D",
    borderRadius: 16,
    shadowColor: "#000",
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 4,
  },
  actionText: {
    fontFamily: "Jost-Medium",
    fontSize: 16,
    color: PZLS.textLight,
  },
  domtelBox: {
    marginTop: 12,
    padding: 12,
    borderRadius: 16,
    backgroundColor: "rgba(255,255,255,0.06)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.10)",
  },
  domtelText: {
    fontFamily: "Jost-Medium",
    color: PZLS.textLight,
    fontSize: 14,
  },
  domtelSub: {
    marginTop: 6,
    fontFamily: "Jost-Light",
    color: "rgba(223,239,243,0.72)",
    fontSize: 12,
  },
});

const extraStyles = StyleSheet.create({
  refreshIconBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 999,
    backgroundColor: "rgba(255,255,255,0.08)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.12)",
  },
  refreshIconText: {
    fontFamily: "Jost-Medium",
    color: PZLS.textLight,
    fontSize: 14,
  },

  summaryRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginTop: 12,
  },
  summaryChip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: "rgba(255,255,255,0.06)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.10)",
    fontFamily: "Jost-Medium",
    color: PZLS.textLight,
    fontSize: 12,
    overflow: "hidden",
  },

  infoHdr: {
    fontFamily: "Jost-Medium",
    color: PZLS.textLight,
    fontSize: 15,
  },
  infoGrid: {
    marginTop: 10,
    padding: 12,
    borderRadius: 16,
    backgroundColor: "rgba(255,255,255,0.05)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.10)",
    gap: 6,
  },

  filtersToggle: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    alignSelf: "flex-start",
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 999,
    backgroundColor: "rgba(255,255,255,0.06)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.10)",
  },
  filtersToggleText: {
    fontFamily: "Jost-Medium",
    color: PZLS.textLight,
    fontSize: 13,
  },

  tabPill: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 999,
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.06)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.10)",
  },
  tabPillActive: {
    backgroundColor: "rgba(227,36,40,0.22)",
    borderColor: "rgba(227,36,40,0.45)",
  },
  tabText: {
    fontFamily: "Jost-Medium",
    color: PZLS.textLight,
    fontSize: 14,
  },

  filterChip: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 999,
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.06)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.10)",
  },
  filterChipSmall: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: "rgba(255,255,255,0.06)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.10)",
  },
  filterChipActive: {
    backgroundColor: "rgba(191,130,36,0.18)",
    borderColor: "rgba(191,130,36,0.38)",
  },
  filterText: {
    fontFamily: "Jost-Medium",
    color: PZLS.textLight,
  },
  filterTextSmall: {
    fontFamily: "Jost-Medium",
    color: PZLS.textLight,
    fontSize: 12,
  },

  sectionHdr: {
    fontFamily: "GoodTimes-BoldItalic",
    color: PZLS.secondary,
    fontSize: 16,
  },

  resultCard: {
    paddingVertical: 14,
    paddingHorizontal: 14,
    borderRadius: 18,
    backgroundColor: "rgba(255,255,255,0.06)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.10)",
    marginBottom: 12,
  },
  resultPlace: {
    width: 34,
    fontFamily: "Jost-Medium",
    color: PZLS.textLight,
    fontSize: 16,
  },
  resultName: {
    fontFamily: "Jost-Medium",
    color: PZLS.textLight,
    fontSize: 15,
  },
  resultClub: {
    marginTop: 2,
    fontFamily: "Jost-Light",
    color: "rgba(223,239,243,0.72)",
  },
  metaBadge: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 999,
    backgroundColor: "rgba(255,255,255,0.06)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.10)",
    fontFamily: "Jost-Medium",
    color: PZLS.textLight,
    fontSize: 12,
    overflow: "hidden",
  },
  resultTime: {
    marginLeft: 10,
    fontFamily: "Jost-Medium",
    color: PZLS.primary,
    fontSize: 14,
  },

  infoLine: {
    fontFamily: "Jost-Light",
    color: "rgba(223,239,243,0.78)",
  },
});
