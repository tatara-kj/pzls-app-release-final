// src/components/ProfileCard.tsx
import React, { useEffect, useMemo, useRef, useState } from "react";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { MotiView } from "moti";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";

import {
  Animated,
  Dimensions,
  Pressable,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import Svg, { Defs, LinearGradient as SvgLinear, Path, Stop } from "react-native-svg";
import { Athlete, isJunior } from "../data/mockAthletes";

/* ---------- PALETA PZŁS ---------- */
const PZLS_COLORS = {
  bg: "#DFEFF3",
  navyCard: "#1F273B",
  primary: "#BF8224",
  red: "#E32428",
  text: "#191C2F",
  subText: "#DADADA",
  accentST: "#5E1324",
};

const { width } = Dimensions.get("window");

/* ---------- TYPY ---------- */
type Mode = "overlay" | "page";
type TabKey = "info" | "pb" | "events";

interface Props {
  athlete: Athlete;
  onClose: () => void;
  mode?: Mode;
}

/* ---------- DEKOR: RIBBON POD HEADEREM ---------- */
const HeaderRibbon = () => (
  <Svg
    width={width}
    height={110}
    viewBox={`0 0 ${width} 110`}
    style={{ position: "absolute", top: 0, left: 0 }}
  >
    <Defs>
      <SvgLinear id="ribbon" x1="0" y1="0" x2="0" y2="1">
        <Stop offset="0%" stopColor={PZLS_COLORS.red} stopOpacity="0.9" />
        <Stop offset="100%" stopColor={PZLS_COLORS.red} stopOpacity="0.0" />
      </SvgLinear>
    </Defs>
    <Path
      d={`M0,0 H${width} V68 Q${width * 0.55},88 ${width * 0.15},78 L0,72 Z`}
      fill="url(#ribbon)"
      opacity={0.28}
    />
  </Svg>
);

/* ---------- AKCENT: BARDZO WOLNA KRESKA (pod tytułami sekcji) ---------- */
const UnderlinePulse = () => {
  const scale = useRef(new Animated.Value(0.95)).current;
  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(scale, {
          toValue: 1,
          duration: 3000,
          useNativeDriver: true,
        }),
        Animated.timing(scale, {
          toValue: 0.95,
          duration: 3000,
          useNativeDriver: true,
        }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [scale]);
  return (
    <Animated.View
      style={{
        alignSelf: "flex-start",
        transform: [{ scaleX: scale }],
        height: 4,
        width: 70,
        borderRadius: 999,
        backgroundColor: PZLS_COLORS.red,
        opacity: 0.9,
        marginTop: 8,
      }}
    />
  );
};

/* ---------- BADGE/PILL ---------- */
const Pill = ({
  icon,
  text,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  text: string;
}) => (
  <View style={styles.pill}>
    <Ionicons name={icon} size={14} color={PZLS_COLORS.navyCard} />
    <Text style={styles.pillText}>{text}</Text>
  </View>
);

/* ---------- AVATAR z GRADIENT RING ---------- */
const AvatarWithRing = ({ source }: { source: any }) => {
  return (
    <View style={styles.avatarWrap}>
      <LinearGradient
        colors={["rgba(191,130,36,0.9)", "rgba(227,36,40,0.85)"]}
        start={{ x: 0, y: 0.5 }}
        end={{ x: 1, y: 0.5 }}
        style={styles.avatarRing}
      />
      <Animated.Image source={source} style={styles.avatar} />
    </View>
  );
};

export default function ProfileCard({
  athlete,
  onClose,
  mode = "page",
}: Props) {
  const age = new Date().getFullYear() - athlete.birthYear;
  const category = isJunior(athlete) ? "Junior" : "Senior";
  const genderPL = athlete.gender === "F" ? "Kobieta" : "Mężczyzna";

  const isOverlay = mode === "overlay";
  const [fav, setFav] = useState(athlete.isFav ?? false);
  const insets = useSafeAreaInsets();
  const topGap = Math.max(insets.top, 16) - 13;

  /* ---------- TABS ---------- */
  const tabs: { key: TabKey; label: string }[] = useMemo(
    () => [
      { key: "info", label: "Informacje" },
      { key: "pb", label: "PB" },
      { key: "events", label: "Wydarzenia" },
    ],
    []
  );
  const [activeTab, setActiveTab] = useState<TabKey>("info");
  const indicatorX = useRef(new Animated.Value(0)).current;
  const segmentW = (width - 44) / tabs.length; // 22px padding z lewej/prawej

  const animateToTab = (index: number) => {
    Animated.timing(indicatorX, {
      toValue: index * segmentW,
      duration: 200,
      useNativeDriver: true,
    }).start();
  };

  /* ---------- PARALLAX HEADER ---------- */
  const scrollY = useRef(new Animated.Value(0)).current;
  const avatarScale = scrollY.interpolate({
    inputRange: [0, 120],
    outputRange: [1, 0.9],
    extrapolate: "clamp",
  });
  const headerTranslateY = scrollY.interpolate({
    inputRange: [0, 120],
    outputRange: [0, -6],
    extrapolate: "clamp",
  });

  /* ---------- ANIM FAV ---------- */
  const favScale = useRef(new Animated.Value(1)).current;
  const bounceFav = () => {
    favScale.setValue(0.7);
    Animated.spring(favScale, {
      toValue: 1,
      useNativeDriver: true,
      friction: 5,
      tension: 140,
    }).start();
  };

  return (
    <View style={isOverlay ? styles.overlay : styles.pageRoot}>
      {/* ← BACK BUTTON */}
      <TouchableOpacity
        onPress={() => {
          Haptics.selectionAsync();
          onClose();
        }}
        style={[styles.backBtn, { top: topGap, left: 16 }]}
        hitSlop={{ top: 14, left: 14, right: 14, bottom: 14 }}
        activeOpacity={0.7}
        accessibilityRole="button"
        accessibilityLabel="Wróć"
      >
        <Ionicons name="arrow-back" size={24} color="#FFF" />
      </TouchableOpacity>

      {isOverlay && (
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />
      )}

      <MotiView
        from={{ translateY: isOverlay ? 600 : 0, opacity: 0.6 }}
        animate={{ translateY: 0, opacity: 1 }}
        exit={{ translateY: isOverlay ? 600 : 0, opacity: 0 }}
        transition={{ type: "timing", duration: 320 }}
        style={[
          styles.cardRoot,
          { paddingTop: topGap + 45 },
          !isOverlay && { borderRadius: 0, width: "100%", minHeight: "100%" },
          { zIndex: 1 },
        ]}
      >
        <HeaderRibbon />

        {/* ---------- HEAD ---------- */}
        <Animated.View
          style={[
            styles.headerRow,
            { transform: [{ translateY: headerTranslateY }] },
          ]}
        >
          <Animated.View style={{ transform: [{ scale: avatarScale }] }}>
            <AvatarWithRing source={athlete.avatar} />
          </Animated.View>

          <View style={{ flex: 1, marginLeft: 16 }}>
            <Text style={styles.name}>{athlete.name.toUpperCase()}</Text>
            <Text style={styles.discipline}>
              {athlete.discipline === "short-track" ? "Short Track" : "Long Track"}
            </Text>

            {/* badges/pills */}
            <View style={styles.pillsRow}>
              <Pill icon="person" text={`${genderPL}`} />
              <Pill icon="hourglass" text={`${age} lat`} />
              <Pill icon="podium" text={category} />
              <Pill
                icon="speedometer-outline"
                text={athlete.discipline === "short-track" ? "ST" : "LT"}
              />
            </View>

            <View style={{ height: 8 }} />
          </View>

          <Pressable
            onPress={() => {
              Haptics.selectionAsync();
              setFav((prev) => !prev);
              bounceFav();
            }}
            hitSlop={8}
            accessibilityRole="button"
            accessibilityLabel={fav ? "Usuń z ulubionych" : "Dodaj do ulubionych"}
          >
            <Animated.View style={{ transform: [{ scale: favScale }] }}>
              <Ionicons
                name={fav ? "star" : "star-outline"}
                size={30}
                color={fav ? "#E7B825" : PZLS_COLORS.subText}
                style={{ marginRight: 4 }}
              />
            </Animated.View>
          </Pressable>
        </Animated.View>

        {/* ---------- SEGMENTED CONTROL ---------- */}
        <View style={styles.segmentWrap}>
          {/* tło segmentów */}
          <View style={styles.segmentBg} />
          {/* wskaźnik */}
          <Animated.View
            style={[
              styles.segmentIndicator,
              {
                width: segmentW - 6, // mały „gutter”
                transform: [{ translateX: indicatorX }],
              },
            ]}
          >
            <LinearGradient
              colors={["#BF8224", "#E32428"]}
              start={{ x: 0, y: 0.5 }}
              end={{ x: 1, y: 0.5 }}
              style={StyleSheet.absoluteFillObject}
            />
          </Animated.View>

          <View style={styles.segmentRow} pointerEvents="box-none">
            {tabs.map((t, idx) => (
              <Pressable
                key={t.key}
                onPress={() => {
                  setActiveTab(t.key);
                  animateToTab(idx);
                  Haptics.selectionAsync();
                }}
                style={[styles.segmentItem, { width: segmentW }]}
                accessibilityRole="tab"
                accessibilityState={{ selected: activeTab === t.key }}
                accessibilityLabel={t.label}
              >
                <Text
                  style={[
                    styles.segmentText,
                    activeTab === t.key && styles.segmentTextActive,
                  ]}
                >
                  {t.label}
                </Text>
              </Pressable>
            ))}
          </View>
        </View>

        {/* ---------- CONTENT ---------- */}
        <Animated.ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: insets.bottom + 120 }}
          bounces={false}
          alwaysBounceVertical={false}
          onScroll={Animated.event(
            [{ nativeEvent: { contentOffset: { y: scrollY } } }],
            { useNativeDriver: true }
          )}
          scrollEventThrottle={16}
        >
          {activeTab === "info" && (
            <Section title="Informacje">
              <Info label="Wiek" value={`${age} lat`} />
              <Info label="Kraj" value={athlete.country ?? "—"} />
              <Info label="Płeć" value={genderPL} />
              <Info label="Kategoria" value={category} />
              <Info
                label="Dyscyplina"
                value={athlete.discipline === "short-track" ? "ST" : "LT"}
              />
              {athlete.pb && <Info label="Rekord życiowy" value={athlete.pb} />}
            </Section>
          )}

          {activeTab === "pb" && (
            <>
              <Section title="Rekordy życiowe (mock)">
                <Info label="500 m" value="41.575" />
                <Info label="1000 m" value="1:27.26" />
                <Info label="1500 m" value="2:06.83" />
                <Info label="3000 m" value="4:15.12" />
              </Section>
              <Section title="Najlepsze wyniki sezonu (mock)">
                <Info label="500 m" value="42.001" />
                <Info label="1000 m" value="1:28.10" />
              </Section>
            </>
          )}

          {activeTab === "events" && (
            <>
              <Section title="Najbliższe wydarzenie (mock)">
                <Text style={styles.eventTitle}>Mistrzostwa Europy</Text>
                <Text style={styles.eventSub}>11–13 stycznia 2024</Text>
                <Text style={styles.eventSub}>Gdańsk, POL</Text>
              </Section>

              <Section title="Historia startów (mock)">
                <EventRow title="Puchar Świata #2" date="22–24.11.2023" place="Hamar, NOR" />
                <EventRow title="Mistrzostwa Polski" date="03–05.03.2024" place="Tomaszów Maz." />
              </Section>
            </>
          )}
        </Animated.ScrollView>
      </MotiView>
    </View>
  );
}

/* ---------- HELPERS / SUB-KOMPONENTY ---------- */
const Section = ({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) => (
  <View style={styles.sectionBox}>
    <Text style={styles.sectionTitle}>{title}</Text>
    <UnderlinePulse />
    <View style={{ marginTop: 14 }}>{children}</View>
  </View>
);

const Info = ({ label, value }: { label: string; value: string }) => (
  <View style={styles.infoRow}>
    <Text style={styles.infoLabel}>{label}</Text>
    <Text style={styles.infoValue}>{value}</Text>
  </View>
);

const EventRow = ({
  title,
  date,
  place,
}: {
  title: string;
  date: string;
  place: string;
}) => (
  <View style={styles.eventRow}>
    <View style={{ flex: 1 }}>
      <Text style={styles.eventTitle}>{title}</Text>
      <Text style={styles.eventSub}>{date}</Text>
      <Text style={styles.eventSub}>{place}</Text>
    </View>
    <View style={styles.eventIconBox}>
      <Ionicons name="chevron-forward" size={18} color="#FFF" />
    </View>
  </View>
);

/* ---------- STYLES ---------- */
const CARD_RADIUS = 28;

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.45)",
    zIndex: 99,
    justifyContent: "flex-end",
  },
  pageRoot: {
    flex: 1,
    backgroundColor: PZLS_COLORS.bg,
    position: "relative",
  },

  cardRoot: {
    width,
    backgroundColor: PZLS_COLORS.navyCard,
    borderTopLeftRadius: CARD_RADIUS,
    borderTopRightRadius: CARD_RADIUS,
    paddingTop: 60,
    paddingHorizontal: 22,
  },

  backBtn: {
    position: "absolute",
    padding: 6,
    zIndex: 9999,
    elevation: 50,
  },

  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 16,
    paddingTop: 6,
  },

  /* --- Avatar + ring --- */
  avatarWrap: {
    width: 120,
    height: 120,
    borderRadius: 26 + 6,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarRing: {
    position: "absolute",
    width: 120 + 10,
    height: 120 + 10,
    borderRadius: 26 + 11,
    opacity: 0.9,
  },
  avatar: {
    width: 120,
    height: 120,
    borderRadius: 26,
    backgroundColor: "#0f1420",
  },

  name: {
    fontFamily: "GoodTimes_700BoldItalic",
    fontSize: 26,
    lineHeight: 30,
    color: "#FFF",
  },

  discipline: {
    fontFamily: "Jost-Medium",
    fontSize: 16,
    color: PZLS_COLORS.subText,
    marginTop: 2,
  },

  /* --- pills --- */
  pillsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginTop: 10,
  },
  pill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: PZLS_COLORS.primary,
  },
  pillText: {
    fontFamily: "Jost-Medium",
    color: PZLS_COLORS.navyCard,
    fontSize: 12,
  },

  /* --- segmented control --- */
  segmentWrap: {
    position: "relative",
    marginBottom: 18,
  },
  segmentBg: {
    height: 40,
    borderRadius: 999,
    backgroundColor: "rgba(255,255,255,0.04)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.07)",
  },
  segmentIndicator: {
    position: "absolute",
    top: 3,
    left: 3,
    bottom: 3,
    borderRadius: 999,
    overflow: "hidden",
  },
  segmentRow: {
    position: "absolute",
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
    flexDirection: "row",
    alignItems: "center",
  },
  segmentItem: {
    height: 40,
    alignItems: "center",
    justifyContent: "center",
  },
  segmentText: {
    fontFamily: "Jost-Medium",
    color: PZLS_COLORS.subText,
    fontSize: 14,
    letterSpacing: 0.3,
  },
  segmentTextActive: {
    color: "#FFF",
    fontFamily: "Jost-Bold",
  },

  /* --- sekcje --- */
  sectionBox: {
    backgroundColor: "rgba(255,255,255,0.03)",
    borderRadius: 26,
    padding: 22,
    marginBottom: 26,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.07)",
  },
  sectionTitle: {
    fontFamily: "GoodTimes_700BoldItalic",
    fontSize: 20,
    color: "#FFF",
  },

  infoRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 6,
  },
  infoLabel: {
    fontFamily: "Jost-Regular",
    color: PZLS_COLORS.subText,
    fontSize: 16,
  },
  infoValue: {
    fontFamily: "Jost-Medium",
    color: "#FFF",
    fontSize: 16,
  },

  /* --- events rows --- */
  eventRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.035)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.06)",
    padding: 14,
    borderRadius: 18,
    marginTop: 10,
  },
  eventTitle: {
    fontFamily: "Jost-Bold",
    color: "#FFF",
    fontSize: 16,
    marginBottom: 2,
  },
  eventSub: {
    fontFamily: "Jost-Regular",
    color: PZLS_COLORS.subText,
    fontSize: 14,
  },
  eventIconBox: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: "rgba(0,0,0,0.18)",
    alignItems: "center",
    justifyContent: "center",
    marginLeft: 10,
  },
});
