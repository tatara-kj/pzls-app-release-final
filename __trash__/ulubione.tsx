// app/ulubione.tsx
// ============================================================================
// ULUBIONE (mock) – PZŁS style
// - TopWave jak na HomeScreen (SVG + gradient)
// - Animated snowflakes w tle
// - Segment: Wydarzenia / Zawodnicy
// - Zawodnicy: bierzemy ulubionych z src/data/mockAthletes.ts (max 4),
//   gwiazdka zawsze wypełniona, awatar z mocku
// - Wydarzenia: karty z badge daty, przycisk „Szczegóły” (Alert)
// ============================================================================

import { useIsFocused } from "@react-navigation/native";
import { LinearGradient } from "expo-linear-gradient";
import { MotiView } from "moti";
import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  Alert,
  Animated,
  Dimensions,
  Image,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Svg, {
  Defs,
  Path,
  Stop,
  LinearGradient as SvgLinearGradient,
} from "react-native-svg";

// ---- dane mock wydarzeń (ulubione) ----
type EventItem = {
  id: string;
  dateISO: string;
  title: string;
  city: string;
  country: string;
  favorite?: boolean;
};
const eventsFav: EventItem[] = [
  {
    id: "1",
    dateISO: "2025-01-14",
    title: "Zawody międzynarodowe",
    city: "Zakopane",
    country: "POL",
    favorite: true,
  },
  {
    id: "2",
    dateISO: "2025-03-09",
    title: "World Cup",
    city: "Heerenveen",
    country: "NED",
    favorite: true,
  },
  {
    id: "3",
    dateISO: "2025-05-22",
    title: "Mistrzostwa Polski",
    city: "Warszawa",
    country: "POL",
    favorite: true,
  },
];

// ---- import zawodników z mocka ----
import { allAthletes, Athlete } from "../src/data/mockAthletes";

// ========================== USTAWIENIA / KOLORY =============================
const C = {
  bg: "#191C2F",
  card: "rgba(19,25,41,0.72)",
  border: "rgba(109,120,146,0.22)",
  outline: "rgba(109,120,146,0.25)",
  text: "#DFEFF3",
  sub: "#97A6C1",
  label: "#DADADA",
  red: "#E32428",
  gold: "#BF8224",
};
const { width, height } = Dimensions.get("window");
const PL_MONTHS_SHORT = [
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
];
const partsPL = (iso: string) => {
  const d = new Date(iso);
  return { day: String(d.getDate()), mon: PL_MONTHS_SHORT[d.getMonth()] };
};

// ========================= ŚNIEŻYNKI (Animated) ============================
const Snowflake = ({
  initialX,
  initialY,
  size,
  opacity,
  duration,
  delay,
  rangeX,
  rangeY,
}: {
  initialX: number;
  initialY: number;
  size: number;
  opacity: number;
  duration: number;
  delay: number;
  rangeX: number;
  rangeY: number;
}) => {
  const position = useRef(
    new Animated.ValueXY({ x: initialX, y: initialY })
  ).current;
  useEffect(() => {
    let stop = false;
    const animate = () => {
      if (stop) return;
      const nx = initialX + (Math.random() * 2 - 1) * rangeX;
      const ny = initialY + (Math.random() * 2 - 1) * rangeY;
      Animated.timing(position, {
        toValue: { x: nx, y: ny },
        duration,
        useNativeDriver: true,
      }).start(({ finished }) => {
        if (finished && !stop) animate();
      });
    };
    const t = setTimeout(animate, delay);
    return () => {
      stop = true;
      clearTimeout(t);
    };
  }, [delay, duration, initialX, initialY, rangeX, rangeY, position]);

  return (
    <Animated.Image
      source={require("../assets/images/snowflake.png")}
      style={{
        position: "absolute",
        width: size,
        height: size,
        opacity,
        transform: [{ translateX: position.x }, { translateY: position.y }],
      }}
      resizeMode="contain"
    />
  );
};

const ParticleBackground = () => {
  const flakes = useMemo(
    () =>
      Array.from({ length: 16 }, () => {
        const x = Math.random() * width * 0.95;
        const y = Math.random() * height * 0.9;
        const sz = 10 + Math.random() * 12;
        return {
          initialX: x,
          initialY: y,
          size: sz,
          opacity: 0.18 + Math.random() * 0.27,
          duration: 3600 + Math.random() * 3600,
          delay: Math.random() * 1600,
          rangeX: 22 + Math.random() * 26,
          rangeY: 22 + Math.random() * 26,
        };
      }),
    []
  );
  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      {flakes.map((p, i) => (
        <Snowflake key={i} {...p} />
      ))}
    </View>
  );
};

// ============================= FALA GÓRNA (SVG) =============================
const TopWave = () => (
  <View style={{ position: "absolute", top: 0, left: 0, width, zIndex: 0 }}>
    <Svg width={width} height={120} viewBox={`0 0 ${width} 120`}>
      <Defs>
        <SvgLinearGradient id="fadeRed" x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0%" stopColor={C.red} stopOpacity="1" />
          <Stop offset="100%" stopColor={C.red} stopOpacity="0" />
        </SvgLinearGradient>
      </Defs>

      <Path
        d={`M0,0 H${width} V60 Q${width * 0.85},95 ${width * 0.45},80 T0,60 Z`}
        fill="#141624"
        opacity={0.96}
      />
      <Path
        d={`M0,0 H${width} V55 Q${width * 0.8},90 ${width * 0.45},75 T0,55 Z`}
        fill={C.bg}
        opacity={0.9}
      />
      <Path
        d={`M0,0 H${width} V50 Q${width * 0.75},85 ${width * 0.45},70 T0,50 Z`}
        fill="url(#fadeRed)"
      />
    </Svg>
  </View>
);

// ================================ EKRAN =====================================
export default function Ulubione() {
  const isFocused = useIsFocused();
  const { top, bottom } = useSafeAreaInsets();

  const [tab, setTab] = useState<"events" | "athletes">("events");
  const [filterOpen, setFilterOpen] = useState(false);
  const [filter, setFilter] = useState("All");

  // --- ULUBIENI ZAWODNICY (max 4, z mockAthletes) ---
  const favAthletes: Athlete[] = useMemo(() => {
    // deduplikacja po id (w mocku są dublowane wpisy niektórych osób)
    const map = new Map<string, Athlete>();
    allAthletes.forEach((a) => {
      if (a.isFav) map.set(a.id, a);
    });
    return Array.from(map.values()).slice(0, 4);
  }, []);

  const onDetails = (title: string) => Alert.alert("Szczegóły (mock)", title);

  return (
    <MotiView
      from={{ translateX: 160, opacity: 0 }}
      animate={{ translateX: isFocused ? 0 : 160, opacity: isFocused ? 1 : 0 }}
      transition={{ type: "timing", duration: 320 }}
      style={[styles.container, { backgroundColor: C.bg }]}
    >
      <TopWave />
      <ParticleBackground />

      <ScrollView
        contentContainerStyle={{
          paddingTop: Math.max(top + 8, 16),
          paddingBottom: bottom + 12,
        }}
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.title}>ULUBIONE</Text>

        {/* segment + filtr */}
        <View style={styles.row}>
          <Segment value={tab} onChange={setTab} />
          <Pressable
            onPress={() => setFilterOpen(true)}
            style={styles.filterPill}
          >
            <Text style={styles.filterText}>{filter}</Text>
            <Text style={{ color: C.text, opacity: 0.8, fontSize: 12 }}>
              {" "}
              ▼
            </Text>
          </Pressable>
        </View>

        <Text style={styles.sectionTitle}>
          {tab === "events" ? "Ulubione wydarzenia" : "Ulubieni zawodnicy"}
        </Text>

        {/* LISTA */}
        {tab === "events" ? (
          <View style={{ paddingHorizontal: 16 }}>
            {eventsFav.map((ev) => (
              <EventCard key={ev.id} item={ev} onDetails={onDetails} />
            ))}
          </View>
        ) : (
          <View style={{ paddingHorizontal: 16 }}>
            {favAthletes.map((a) => (
              <AthleteCard key={a.id} item={a} onDetails={onDetails} />
            ))}
          </View>
        )}
      </ScrollView>

      {/* modal filtra (mock) */}
      <FilterModal
        visible={filterOpen}
        selected={filter}
        onClose={() => setFilterOpen(false)}
        onSelect={(v) => {
          setFilter(v);
          setFilterOpen(false);
        }}
      />
    </MotiView>
  );
}

// ================================ KOMPONENTY ================================
function Segment({
  value,
  onChange,
}: {
  value: "events" | "athletes";
  onChange: (v: "events" | "athletes") => void;
}) {
  return (
    <View style={styles.segment}>
      <Pressable
        onPress={() => onChange("events")}
        style={[styles.segmentBtn, value === "events" && styles.segmentOn]}
      >
        <Text
          style={[
            styles.segmentText,
            { opacity: value === "events" ? 1 : 0.6 },
          ]}
        >
          Wydarzenia
        </Text>
      </Pressable>
      <Pressable
        onPress={() => onChange("athletes")}
        style={[styles.segmentBtn, value === "athletes" && styles.segmentOn]}
      >
        <Text
          style={[
            styles.segmentText,
            { opacity: value === "athletes" ? 1 : 0.6 },
          ]}
        >
          Zawodnicy
        </Text>
      </Pressable>
    </View>
  );
}

function EventCard({
  item,
  onDetails,
}: {
  item: EventItem;
  onDetails: (t: string) => void;
}) {
  const { day, mon } = partsPL(item.dateISO);
  return (
    <View style={styles.card}>
      <View style={styles.cardRow}>
        {/* badge daty */}
        <LinearGradient colors={[C.red, "#7c1018"]} style={styles.badge}>
          <Text style={styles.badgeDay}>{day}</Text>
          <Text style={styles.badgeMon}>{mon}</Text>
        </LinearGradient>

        {/* tytuł + lokalizacja */}
        <View style={{ flex: 1, marginRight: 10 }}>
          <Text style={styles.cardTitle}>{item.title}</Text>
          <Text style={styles.cardSub}>{`${item.city}, ${item.country}`}</Text>
        </View>

        {/* gwiazdka (ulubione) */}
        <Text style={styles.star}>{item.favorite ? "⭐" : "☆"}</Text>
      </View>

      <View style={styles.cardActions}>
        <Pressable
          onPress={() => onDetails(item.title)}
          style={styles.ghostBtn}
        >
          <Text style={styles.ghostBtnText}>Szczegóły</Text>
        </Pressable>
      </View>
    </View>
  );
}

function AthleteCard({
  item,
  onDetails,
}: {
  item: Athlete;
  onDetails: (t: string) => void;
}) {
  return (
    <View style={styles.card}>
      <View style={styles.cardRow}>
        {/* avatar ze zdjęcia z mocka */}
        <View style={styles.avatarWrap}>
          <Image source={item.avatar} style={styles.avatarImg} />
        </View>

        <View style={{ flex: 1, marginRight: 10 }}>
          <Text style={styles.cardTitle}>{item.name}</Text>
          <Text style={styles.cardSub}>{item.country ?? ""}</Text>
        </View>

        {/* ZAWSZE pełna gwiazdka w ulubionych */}
        <Text style={styles.star}>⭐</Text>
      </View>

      <View style={styles.cardActions}>
        <Pressable onPress={() => onDetails(item.name)} style={styles.ghostBtn}>
          <Text style={styles.ghostBtnText}>Szczegóły</Text>
        </Pressable>
      </View>
    </View>
  );
}

function FilterModal({
  visible,
  selected,
  onClose,
  onSelect,
}: {
  visible: boolean;
  selected: string;
  onClose: () => void;
  onSelect: (v: string) => void;
}) {
  const options = ["All", "This month", "Next 30 days", "This season"];
  return (
    <Modal
      animationType="fade"
      transparent
      visible={visible}
      onRequestClose={onClose}
    >
      <View style={styles.modalBackdrop}>
        <View style={styles.modalCard}>
          <Text style={styles.modalTitle}>Filter</Text>

          {options.map((opt) => (
            <Pressable
              key={opt}
              onPress={() => onSelect(opt)}
              style={[
                styles.optionRow,
                {
                  backgroundColor:
                    selected === opt
                      ? "rgba(227,36,40,0.15)"
                      : "rgba(255,255,255,0.02)",
                },
              ]}
            >
              <Text style={{ color: "#fff", fontSize: 15 }}>{opt}</Text>
              <Text
                style={{
                  color: selected === opt ? C.red : "rgba(255,255,255,0.35)",
                }}
              >
                {selected === opt ? "●" : "○"}
              </Text>
            </Pressable>
          ))}

          <Pressable onPress={onClose} style={{ marginTop: 12 }}>
            <Text style={{ color: C.sub, textAlign: "center" }}>Close</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

// ================================ STYLE =====================================
const styles = StyleSheet.create({
  container: { flex: 1 },
  title: {
    fontSize: 32,
    color: C.text,
    letterSpacing: 1,
    marginBottom: 12,
    paddingHorizontal: 16,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    gap: 10,
    marginBottom: 12,
  },
  segment: {
    flexDirection: "row",
    backgroundColor: "rgba(10,12,20,0.6)",
    borderRadius: 999,
    borderWidth: 1,
    borderColor: C.outline,
    overflow: "hidden",
  },
  segmentBtn: {
    paddingHorizontal: 14,
    height: 36,
    alignItems: "center",
    justifyContent: "center",
  },
  segmentOn: { backgroundColor: "rgba(227,36,40,0.25)" },
  segmentText: { fontSize: 14, color: C.text },

  filterPill: {
    marginLeft: "auto",
    height: 36,
    paddingHorizontal: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: C.outline,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    backgroundColor: "rgba(10,12,20,0.6)",
  },
  filterText: { color: C.text, fontSize: 14 },

  sectionTitle: {
    color: C.sub,
    fontSize: 13,
    letterSpacing: 1,
    marginLeft: 22,
    marginBottom: 6,
  },

  // cards
  card: {
    backgroundColor: C.card,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: C.outline,
    padding: 14,
    marginBottom: 12,
  },
  cardRow: { flexDirection: "row", alignItems: "center" },
  cardTitle: { color: C.text, fontSize: 18, marginBottom: 4, flexShrink: 1 },
  cardSub: { color: C.sub, fontSize: 14 },

  // event badge
  badge: {
    width: 64,
    height: 64,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
    shadowColor: "#000",
    shadowOpacity: 0.25,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 6 },
    elevation: 3,
  },
  badgeDay: { color: "#fff", fontSize: 20, lineHeight: 22, fontWeight: "700" },
  badgeMon: {
    color: "#fff",
    fontSize: 13,
    opacity: 0.9,
    textTransform: "lowercase",
  },

  // athlete avatar
  avatarWrap: {
    width: 58,
    height: 58,
    borderRadius: 16,
    marginRight: 12,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: C.outline,
    backgroundColor: "#0f1321",
  },
  avatarImg: { width: "100%", height: "100%", resizeMode: "cover" },

  star: { fontSize: 22, marginLeft: 8 },

  // actions
  cardActions: {
    marginTop: 12,
    flexDirection: "row",
    gap: 10,
    justifyContent: "flex-start",
  },
  ghostBtn: {
    paddingHorizontal: 16,
    height: 38,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: C.outline,
    alignItems: "center",
    justifyContent: "center",
  },
  ghostBtnText: { color: C.text, fontSize: 14 },

  // modal
  modalBackdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.45)",
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
  },
  modalCard: {
    width: "100%",
    maxWidth: 420,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: C.outline,
    backgroundColor: "rgba(17,21,34,0.96)",
    padding: 16,
  },
  modalTitle: {
    color: "#fff",
    fontSize: 16,
    textAlign: "center",
    marginBottom: 8,
    letterSpacing: 0.3,
  },
  optionRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: C.outline,
    marginTop: 8,
  },
});
