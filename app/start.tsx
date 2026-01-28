// app/start.tsx
import { Ionicons } from "@expo/vector-icons";

import { BlurView } from "expo-blur";
import * as Haptics from "expo-haptics";

import React, { useEffect, useMemo, useRef } from "react";
import {
  ActivityIndicator,
  Animated,
  Dimensions,
  ScrollView,
  Linking,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import Svg, { Defs, LinearGradient, Path, Stop } from "react-native-svg";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useDomtelEvents } from "../src/features/events/hooks/useDomtelEvents";
import { useDomtelEventResults } from "../src/features/events/hooks/useDomtelEventResults";
import type { DomtelEvent } from "../src/features/events/types";

const { width, height } = Dimensions.get("window");

/* ───────── Paleta ───────── */
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

const monthRoman = [
  "I",
  "II",
  "III",
  "IV",
  "V",
  "VI",
  "VII",
  "VIII",
  "IX",
  "X",
  "XI",
  "XII",
];

function toLocalDate(iso: string) {
  // YYYY-MM-DD -> lokalna północ (bez przesuwania strefą)
  if (/^\d{4}-\d{2}-\d{2}$/.test(iso)) return new Date(iso + "T00:00:00");
  return new Date(iso);
}

function todayISO() {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function seasonFromISO(iso: string) {
  const y = Number(iso.slice(0, 4));
  const m = Number(iso.slice(5, 7));
  return String(m >= 7 ? y : y - 1);
}

function cityOnly(miasto: string) {
  const s = String(miasto || "—").trim();
  const i = s.indexOf("(");
  return (i > 0 ? s.slice(0, i) : s).trim();
}

function formatRangeRoman(data1: string, data2?: string) {
  const a = String(data1 || "").trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(a)) return "—";
  const b = String(data2 || "").trim();
  const end = /^\d{4}-\d{2}-\d{2}$/.test(b) ? b : a;

  const d1 = toLocalDate(a);
  const d2 = toLocalDate(end);

  const y1 = d1.getFullYear();
  const y2 = d2.getFullYear();

  const m1 = d1.getMonth(); // 0-based
  const m2 = d2.getMonth();

  const day1 = d1.getDate();
  const day2 = d2.getDate();

  // najczęstszy case: ten sam miesiąc + rok
  if (y1 === y2 && m1 === m2) {
    const mm = monthRoman[m1];
    if (a === end) return `${day1} ${mm} ${y1}`;
    return `${day1}–${day2} ${mm} ${y1}`;
  }

  // fallback – prosto i czytelnie
  const mm1 = monthRoman[m1];
  const mm2 = monthRoman[m2];
  if (y1 === y2) return `${day1} ${mm1} – ${day2} ${mm2} ${y1}`;
  return `${day1} ${mm1} ${y1} – ${day2} ${mm2} ${y2}`;
}

function daysUntil(iso: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(iso)) return null;
  const start = toLocalDate(iso).getTime();
  const now = toLocalDate(todayISO()).getTime();
  const diff = Math.round((start - now) / (24 * 3600 * 1000));
  return diff;
}

/* ───────── Płatki śniegu (bez lagów) ───────── */
const Snowflake = (p: any) => {
  const pos = useRef(new Animated.ValueXY({ x: p.x, y: p.y })).current;

  useEffect(() => {
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
      // zatrzymaj natychmiast, nie czekaj do końca timingu
      // @ts-ignore
      pos.stopAnimation?.();
      // @ts-ignore
      pos.x?.stopAnimation?.();
      // @ts-ignore
      pos.y?.stopAnimation?.();
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
  const count = Platform.OS === "android" ? 6 : 14;
  // android: mniej = mniej lagów
  const list = useMemo(
    () =>
      Array.from({ length: count }).map(() => ({
        x: Math.random() * width,
        y: Math.random() * height,
        size: 14 + Math.random() * 14,
        opacity: 0.15 + Math.random() * 0.2,
        duration: 5000 + Math.random() * 4000,
        delay: Math.random() * 2200,
        range: 26 + Math.random() * 44,
      })),
    [count],
  );

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      {list.map((p, i) => (
        <Snowflake key={i} {...p} />
      ))}
    </View>
  );
};

/* ───────── Fale ───────── */
const TopWave = () => (
  <Svg
    width={width}
    height={120}
    viewBox={"0 0 " + width + " 120"}
    style={{ position: "absolute", top: 0, left: 0 }}
  >
    <Defs>
      <LinearGradient id="fadeRedHome" x1="0" y1="0" x2="0" y2="1">
        <Stop offset="0%" stopColor={PZLS.primary} stopOpacity="1" />
        <Stop offset="100%" stopColor={PZLS.primary} stopOpacity="0" />
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
      fill={PZLS.bg}
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
      fill="url(#fadeRedHome)"
    />
  </Svg>
);

const BottomWave = () => (
  <View style={{ position: "absolute", bottom: 0, left: 0 }}>
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
        opacity={0.27}
      />
    </Svg>
  </View>
);

/* ───────── UI helpers ───────── */
function openUrl(url: string) {
  Linking.openURL(url).catch(() => {});
}

function openMap(query: string) {
  const q = encodeURIComponent(query);
  openUrl(`https://www.google.com/maps/search/?api=1&query=${q}`);
}

function medalEmoji(place?: number) {
  if (place === 1) return "🥇";
  if (place === 2) return "🥈";
  if (place === 3) return "🥉";
  return "🏁";
}

/* ============================== */
export default function StartScreen(props: {
  goToTab?: (name: string) => void;
  isActive?: boolean;
}) {
  const insets = useSafeAreaInsets();
  const active = props.isActive !== false;

  const nowISO = useMemo(() => todayISO(), []);
  const season = useMemo(() => seasonFromISO(nowISO), [nowISO]);

  const {
    domtelEvents,
    domtelLoading,
    domtelError,
    refetchDomtel,
    hasLoadedOnce,
  } = useDomtelEvents(season);

  function onlyISO10(s: any) {
    const v = String(s ?? "").trim();
    const m = v.match(/^(\d{4}-\d{2}-\d{2})/);
    return m ? m[1] : "";
  }

  const upcoming = useMemo(() => {
    const list = (domtelEvents ?? [])
      .map((e) => {
        const d1 = onlyISO10(e.data1);
        const d2 = onlyISO10(e.data2);
        return { ...e, data1: d1, data2: d2 };
      })
      .filter((e) => /^\d{4}-\d{2}-\d{2}$/.test(String(e.data1)))
      .sort((a, b) => (String(a.data1) > String(b.data1) ? 1 : -1));

    // bierzemy 3 NAJBLIŻSZE od dzisiaj, a jeśli nic nie ma "w przyszłości",
    // to bierzemy 3 najnowsze (fallback, żeby nigdy nie było pusto)
    const future = list.filter((e) => String(e.data1) >= nowISO);
    return (future.length ? future : list.slice(-3)).slice(0, 3);
  }, [domtelEvents, nowISO]);

  const hero = upcoming[0];

  // “Ostatnie wyniki” = ostatnia impreza, która ma wyniki i już się skończyła
  const lastResultsEvent = useMemo<DomtelEvent | null>(() => {
    const finished = (domtelEvents ?? [])
      .filter((e) => Number(e.liczbaWynikow || 0) > 0)
      .filter((e) => {
        const start = String(e.data1 || "").trim();
        if (!/^\d{4}-\d{2}-\d{2}$/.test(start)) return false;
        const end = String(e.data2 || "").trim() ? String(e.data2) : start;
        return end <= nowISO;
      })
      .sort((a, b) => {
        const aEnd = String(a.data2 || "").trim()
          ? String(a.data2)
          : String(a.data1);
        const bEnd = String(b.data2 || "").trim()
          ? String(b.data2)
          : String(b.data1);
        return aEnd > bEnd ? -1 : 1;
      });

    return finished[0] ?? null;
  }, [domtelEvents, nowISO]);

  const { results: lastResults, loading: lastResLoading } =
    useDomtelEventResults({
      sezon: lastResultsEvent?.sezon,
      nrKomunikatu: lastResultsEvent?.nrKomunikatu,
      enabled: !!lastResultsEvent,
    });

  const topPodium = useMemo(() => {
    const rows = (lastResults ?? [])
      .filter((r) => Number.isFinite(r.place as any))
      .sort((a, b) => Number(a.place) - Number(b.place));

    const podium = rows.filter(
      (r) => r.place === 1 || r.place === 2 || r.place === 3,
    );
    if (podium.length) return podium.slice(0, 3);
    return rows.slice(0, 3);
  }, [lastResults]);

  const heroCountdown = useMemo(() => {
    if (!hero?.data1) return null;
    return daysUntil(hero.data1);
  }, [hero]);

  return (
    <View style={[styles.screen, { paddingTop: insets.top }]}>
      <TopWave />
      {active ? <Particles /> : null}
      <BottomWave />

      <ScrollView
        style={{ flex: 1, width: "100%" }}
        contentContainerStyle={{ paddingTop: 36, paddingBottom: 0 }}
        showsVerticalScrollIndicator={false}
      >
        {/* HERO: najbliższe zawody */}
        <BlurView intensity={16} tint="dark" style={styles.heroCard}>
          <View style={{ flexDirection: "row", alignItems: "center" }}>
            <Text style={styles.heroTitle} numberOfLines={2}>
              {hero?.nazwa ?? "Najbliższe zawody"}
            </Text>

            <View style={{ flex: 1 }} />

            <Pressable
              onPress={() => {
                Haptics.selectionAsync().catch(() => {});
                refetchDomtel();
              }}
              hitSlop={12}
              style={styles.refreshBtn}
            >
              <Ionicons name="refresh" size={18} color={PZLS.textLight} />
            </Pressable>
          </View>

          <Text style={styles.heroSub} numberOfLines={1}>
            {hero
              ? `${formatRangeRoman(hero.data1, hero.data2)} • ${cityOnly(hero.miasto)}`
              : !hasLoadedOnce || domtelLoading
                ? "Ładowanie imprez..."
                : "Brak danych"}
          </Text>

          <View
            style={{
              flexDirection: "row",
              flexWrap: "wrap",
              gap: 10,
              marginTop: 12,
            }}
          >
            <Text
              style={[
                styles.badge,
                {
                  color: PZLS.textLight,
                  backgroundColor: "rgba(255,255,255,0.08)",
                },
              ]}
            >
              Sezon: {season}/{String(Number(season) + 1).slice(-2)}
            </Text>

            {hero ? (
              <Text
                style={[
                  styles.badge,
                  {
                    color: hero.tor === "S" ? PZLS.primary : PZLS.secondary,
                    backgroundColor:
                      (hero.tor === "S" ? PZLS.primary : PZLS.secondary) + "22",
                    borderColor:
                      (hero.tor === "S" ? PZLS.primary : PZLS.secondary) + "55",
                  },
                ]}
              >
                {hero.tor === "S" ? "Short Track" : "Tor długi"}
              </Text>
            ) : null}

            {heroCountdown !== null && heroCountdown >= 0 ? (
              <Text
                style={[
                  styles.badge,
                  { color: PZLS.primary, borderColor: "rgba(227,36,40,0.55)" },
                ]}
              >
                Start za: {heroCountdown} dni
              </Text>
            ) : null}

            {hero ? (
              <Pressable
                onPress={() => {
                  Haptics.selectionAsync().catch(() => {});
                  openMap(hero.miasto);
                }}
                style={[
                  styles.badgeBtn,
                  { borderColor: "rgba(255,255,255,0.14)" },
                ]}
              >
                <Ionicons name="map-outline" size={16} color={PZLS.textLight} />
                <Text style={styles.badgeBtnText}>Mapa</Text>
              </Pressable>
            ) : null}
          </View>

          {/* Skróty (działają, jeśli zrobiłeś zmianę w layout.tsx) */}
          <View style={{ flexDirection: "row", gap: 10, marginTop: 14 }}>
            <Pressable
              onPress={() => props.goToTab?.("wydarzenia")}
              style={styles.quickBtn}
            >
              <Ionicons name="calendar" size={18} color={PZLS.textLight} />
              <Text style={styles.quickBtnText}>Kalendarz</Text>
            </Pressable>

            <Pressable
              onPress={() => props.goToTab?.("zawodnicy")}
              style={styles.quickBtn}
            >
              <Ionicons name="people" size={18} color={PZLS.textLight} />
              <Text style={styles.quickBtnText}>Zawodnicy</Text>
            </Pressable>
          </View>

          {domtelError ? (
            <Text style={[styles.errorText, { marginTop: 10 }]}>
              {domtelError}
            </Text>
          ) : null}
        </BlurView>

        <View style={{ marginTop: 14 }}>
          {(upcoming ?? []).map((ev) => (
            <Pressable
              key={ev.id}
              onPress={() => {
                Haptics.selectionAsync().catch(() => {});
                openMap(ev.miasto);
              }}
              style={styles.miniRow}
            >
              <Text style={styles.miniDate}>
                {formatRangeRoman(ev.data1, ev.data2)}
              </Text>

              <View style={{ flex: 1 }}>
                <Text style={styles.miniTitle} numberOfLines={1}>
                  {ev.nazwa}
                </Text>
                <Text style={styles.miniSub} numberOfLines={1}>
                  {cityOnly(ev.miasto)}
                </Text>
              </View>

              <Text
                style={[
                  styles.miniBadge,
                  { color: ev.tor === "S" ? PZLS.primary : PZLS.secondary },
                ]}
              >
                {ev.tor === "S" ? "ST" : "L"}
              </Text>
            </Pressable>
          ))}
        </View>

        {/* OSTATNIE WYNIKI */}
        <View style={{ marginTop: 22 }}>
          <Text style={styles.sectionTitle}>OSTATNIE WYNIKI</Text>
          <View style={styles.sectionLine} />

          {!lastResultsEvent ? (
            <Text style={styles.emptyText}>
              Brak imprez z wynikami (w tej chwili).
            </Text>
          ) : lastResLoading ? (
            <View style={{ paddingVertical: 14 }}>
              <ActivityIndicator size="small" color={PZLS.primary} />
            </View>
          ) : topPodium.length ? (
            <BlurView intensity={14} tint="dark" style={styles.resultsCard}>
              <Text style={styles.resultsHdr} numberOfLines={2}>
                {lastResultsEvent.nazwa}
              </Text>
              <Text style={styles.resultsSub} numberOfLines={1}>
                {formatRangeRoman(
                  lastResultsEvent.data1,
                  lastResultsEvent.data2,
                )}{" "}
                • {cityOnly(lastResultsEvent.miasto)}
              </Text>

              <View style={{ marginTop: 12 }}>
                {topPodium.map((r, idx) => (
                  <View key={idx} style={styles.resultRow}>
                    <Text style={styles.medal}>{medalEmoji(r.place)}</Text>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.resultName} numberOfLines={1}>
                        {r.name}
                      </Text>
                      <Text style={styles.resultMeta} numberOfLines={1}>
                        {(r.discipline ? r.discipline + " • " : "") +
                          (r.club ?? "")}
                      </Text>
                    </View>
                    <Text style={styles.resultTime} numberOfLines={1}>
                      {r.resultText}
                    </Text>
                  </View>
                ))}
              </View>
            </BlurView>
          ) : (
            <Text style={styles.emptyText}>
              Wyniki istnieją, ale brak czytelnych pozycji.
            </Text>
          )}
        </View>

        {/* Social */}
        <View
          style={{
            flexDirection: "row",
            justifyContent: "center",
            marginTop: 28,
          }}
        >
          <Pressable
            onPress={() => Linking.openURL("https://instagram.com/pzls_pl")}
            hitSlop={12}
            style={{ marginHorizontal: 18 }}
          >
            <Ionicons name="logo-instagram" size={40} color="#BF8224" />
          </Pressable>

          <Pressable
            onPress={() =>
              Linking.openURL(
                "https://www.facebook.com/PZLSPolska/?locale=pl_PL",
              )
            }
            hitSlop={12}
            style={{ marginHorizontal: 18 }}
          >
            <Ionicons name="logo-facebook" size={40} color="#BF8224" />
          </Pressable>

          <Pressable
            onPress={() => Linking.openURL("https://www.youtube.com/@PZLStv")}
            hitSlop={12}
            style={{ marginHorizontal: 18 }}
          >
            <Ionicons name="logo-youtube" size={40} color="#BF8224" />
          </Pressable>
        </View>
        {/* Privacy policy */}
        <Pressable
          onPress={() => openUrl("https://tatara-kj.github.io/pzls-privacy/")}
          hitSlop={12}
          style={[
            styles.badgeBtn,
            {
              alignSelf: "center",
              marginTop: 18,
              borderColor: "rgba(255,255,255,0.18)",
              backgroundColor: "rgba(255,255,255,0.04)",
            },
          ]}
        >
          <Ionicons
            name="shield-checkmark-outline"
            size={16}
            color={PZLS.textLight}
          />
          <Text style={styles.badgeBtnText}>Polityka prywatności</Text>
        </Pressable>

        <View style={{ height: 120 }} />
      </ScrollView>
    </View>
  );
}

/* ───────── Styles ───────── */
const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: PZLS.bg,
  },

  topBar: {
    position: "absolute",
    left: 20,
    right: 20,
    zIndex: 5,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },

  langPill: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: "rgba(255,255,255,0.07)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.12)",
  },
  langText: {
    fontFamily: "Jost-Medium",
    color: PZLS.textLight,
    fontSize: 16,
    letterSpacing: 1.2,
  },

  heroCard: {
    borderRadius: 24,
    padding: 18,
    backgroundColor: "rgba(31,39,59,0.40)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.12)",
    overflow: "hidden",
  },
  heroTitle: {
    flex: 1,
    fontFamily: "Savate-BoldItalic",
    color: PZLS.textLight,
    fontSize: 28,
    letterSpacing: 0.6,
  },
  heroSub: {
    marginTop: 8,
    fontFamily: "Jost-Light",
    color: "rgba(223,239,243,0.78)",
    fontSize: 13,
  },

  refreshBtn: {
    width: 42,
    height: 42,
    borderRadius: 999,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255,255,255,0.08)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.12)",
  },

  badge: {
    alignSelf: "flex-start",
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.12)",
    backgroundColor: "rgba(255,255,255,0.05)",
    fontFamily: "Jost-Medium",
    fontSize: 12,
    color: PZLS.textLight,
    overflow: "hidden",
  },
  miniRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 18,
    backgroundColor: "rgba(255,255,255,0.05)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.09)",
    marginBottom: 10,
  },
  miniDate: {
    width: 96,
    textAlign: "right",
    fontFamily: "Jost-Medium",
    color: PZLS.textLight,
    fontSize: 12,
  },
  miniTitle: {
    fontFamily: "Jost-Medium",
    color: PZLS.secondary,
    fontSize: 13,
  },
  miniSub: {
    marginTop: 2,
    fontFamily: "Jost-Light",
    color: "rgba(223,239,243,0.70)",
    fontSize: 12,
  },
  miniBadge: {
    fontFamily: "Jost-Medium",
    fontSize: 12,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: "rgba(255,255,255,0.05)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.09)",
    overflow: "hidden",
  },

  badgeBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 999,
    borderWidth: 1,
    backgroundColor: "rgba(255,255,255,0.05)",
  },
  badgeBtnText: {
    fontFamily: "Jost-Medium",
    color: PZLS.textLight,
    fontSize: 12,
  },

  quickBtn: {
    flex: 1,
    flexDirection: "row",
    gap: 8,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 12,
    borderRadius: 16,
    backgroundColor: "rgba(255,255,255,0.06)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.10)",
  },
  quickBtnText: {
    fontFamily: "Jost-Medium",
    color: PZLS.textLight,
    fontSize: 14,
  },

  errorText: {
    fontFamily: "Jost-Medium",
    color: PZLS.secondary,
    fontSize: 12,
  },

  sectionTitle: {
    fontFamily: "Savate-BoldItalic",
    color: PZLS.textLight,
    fontSize: 28,
    letterSpacing: 0.8,
    textAlign: "center",
  },
  sectionLine: {
    alignSelf: "center",
    height: 3,
    width: 70,
    borderRadius: 999,
    backgroundColor: PZLS.primary,
    opacity: 0.9,
    marginTop: 10,
    marginBottom: 14,
  },

  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: 18,
    backgroundColor: "rgba(255,255,255,0.06)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.10)",
    marginBottom: 10,
  },
  rowDate: {
    fontFamily: "Jost-Medium",
    color: PZLS.textLight,
    fontSize: 13,
    textAlign: "right",
  },
  rowTitle: {
    fontFamily: "Jost-Medium",
    color: PZLS.secondary,
    fontSize: 15,
  },
  rowSub: {
    marginTop: 2,
    fontFamily: "Jost-Light",
    color: "rgba(223,239,243,0.72)",
    fontSize: 12,
  },
  rowBadge: {
    fontFamily: "Jost-Medium",
    fontSize: 12,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: "rgba(255,255,255,0.06)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.10)",
    overflow: "hidden",
  },

  emptyText: {
    fontFamily: "Jost-Medium",
    color: PZLS.textSub,
    textAlign: "center",
    marginTop: 6,
  },

  resultsCard: {
    borderRadius: 22,
    padding: 16,
    backgroundColor: "rgba(31,39,59,0.40)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.12)",
    overflow: "hidden",
  },
  resultsHdr: {
    fontFamily: "Jost-Medium",
    color: PZLS.textLight,
    fontSize: 16,
  },
  resultsSub: {
    marginTop: 6,
    fontFamily: "Jost-Light",
    color: "rgba(223,239,243,0.72)",
    fontSize: 12,
  },

  resultRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingVertical: 10,
  },
  medal: {
    fontSize: 24,
    width: 34,
    textAlign: "center",
  },
  resultName: {
    fontFamily: "Jost-Medium",
    color: PZLS.textLight,
    fontSize: 14,
  },
  resultMeta: {
    marginTop: 2,
    fontFamily: "Jost-Light",
    color: "rgba(223,239,243,0.70)",
    fontSize: 12,
  },
  resultTime: {
    fontFamily: "Jost-Medium",
    color: PZLS.primary,
    fontSize: 14,
    marginLeft: 10,
  },

  socialRow: {
    flexDirection: "row",
    justifyContent: "center",
    gap: 34,
    marginTop: 26,
  },
  socialBtn: {
    padding: 6,
  },
});
