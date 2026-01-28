// src/components/HeroCarousel.tsx
import React from "react";
import {
  Dimensions,
  ImageBackground,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";

import Animated, {
  Extrapolate,
  interpolate,
  SharedValue,
  useAnimatedStyle,
  useSharedValue,
} from "react-native-reanimated";
import Carousel from "react-native-reanimated-carousel";

import { stars } from "../data/mockAthletes";
import { Colors } from "../theme/colors";

const { width: SCREEN_WIDTH } = Dimensions.get("window");
const HERO_HEIGHT = SCREEN_WIDTH * 1.05;
const AUTO_PLAY_INTERVAL = 5000; // ms

const ACCENT_ST = "#5E1324"; // Short Track
const ACCENT_LT = "#BF8224"; // Long Track

type StarItem = {
  name: string;
  discipline: "short-track" | "long-track" | string;
  avatar: any; // require(...)
};

const HeroSlide = React.memo(function HeroSlide({
  item,
  index,
  progress,
}: {
  item: StarItem;
  index: number;
  progress: SharedValue<number>;
}) {
  const textAnim = useAnimatedStyle(() => {
    const diff = Math.abs(progress.value - index); // 0 dla aktywnego
    return {
      opacity: interpolate(diff, [0, 0.6, 1], [1, 0.85, 0.5]),
      transform: [
        {
          translateY: interpolate(diff, [0, 1], [0, 10], Extrapolate.CLAMP),
        },
        {
          scale: interpolate(diff, [0, 1], [1, 0.985], Extrapolate.CLAMP),
        },
      ],
    };
  }, [index, progress]);

  const pillBg = item.discipline === "short-track" ? ACCENT_ST : ACCENT_LT;
  const pillText =
    item.discipline === "short-track" ? "Short Track" : "Long Track";

  return (
    <View style={styles.slide}>
      <ImageBackground
        source={item.avatar}
        style={styles.image}
        resizeMode="cover"
      >
        {/* SCRIM dla czytelności napisów */}
        <LinearGradient
          colors={[
            "rgba(31,39,59,0.0)",
            "rgba(31,39,59,0.18)",
            "rgba(31,39,59,0.38)",
            "rgba(31,39,59,0.64)",
          ]}
          start={{ x: 0.5, y: 0 }}
          end={{ x: 0.5, y: 1 }}
          style={StyleSheet.absoluteFillObject}
        />

        {/* Teksty i pill */}
        <Animated.View style={[styles.textWrap, textAnim]}>
          <Text style={styles.name} numberOfLines={2}>
            {item.name}
          </Text>

          <View style={[styles.pill, { backgroundColor: pillBg }]}>
            <Text style={styles.pillText}>{pillText}</Text>
          </View>
        </Animated.View>
      </ImageBackground>
    </View>
  );
});

const Dot = React.memo(function Dot({
  i,
  progress,
}: {
  i: number;
  progress: SharedValue<number>;
}) {
  const dotStyle = useAnimatedStyle(() => {
    const diff = Math.abs(progress.value - i);
    return {
      transform: [
        {
          scale: interpolate(diff, [0, 1], [1.25, 0.8], Extrapolate.CLAMP),
        },
      ],
      opacity: interpolate(diff, [0, 1], [1, 0.45], Extrapolate.CLAMP),
    };
  }, [i, progress]);

  return <Animated.View style={[styles.dot, dotStyle]} />;
});

export default function HeroCarousel() {
  const progress = useSharedValue(0); // 0..n (float)

  return (
    <View>
      <Carousel
        width={SCREEN_WIDTH}
        height={HERO_HEIGHT}
        data={stars as StarItem[]}
        loop
        autoPlay
        autoPlayInterval={AUTO_PLAY_INTERVAL}
        mode="parallax"
        modeConfig={{
          parallaxScrollingScale: 1,
          parallaxScrollingOffset: 52,
        }}
        scrollAnimationDuration={1200}
        onProgressChange={(_, absProgress) => {
          // NIE rób tu setState co klatkę (to potrafi lagować).
          progress.value = absProgress;
        }}
        renderItem={({ item, index }) => (
          <HeroSlide
            item={item as StarItem}
            index={index}
            progress={progress}
          />
        )}
      />

      {/* Kropki postępu */}
      <View style={styles.dotsRow}>
        {(stars as StarItem[]).map((_, i) => (
          <Dot key={`dot_${i}`} i={i} progress={progress} />
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  slide: {
    width: "100%",
    height: "100%",
    overflow: "hidden",
    backgroundColor: "#f5f7fa",
  },
  image: { flex: 1, justifyContent: "flex-end" },
  textWrap: {
    paddingHorizontal: 22,
    paddingBottom: 140,
  },
  name: {
    fontFamily: "GoodTimes-BoldItalic", // jeśli u Ciebie tak się nazywa font
    fontSize: 32,
    color: "#191C2F",
    letterSpacing: 1,
    textShadowColor: "rgba(255,255,255,0.25)",
    textShadowOffset: { width: 2, height: 2 },
    textShadowRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 2,
    alignSelf: "flex-start",
  },
  pill: {
    marginTop: 8,
    alignSelf: "flex-start",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
    shadowColor: "#000",
    shadowOpacity: 0.22,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
  },
  pillText: {
    fontFamily: "Jost-Bold",
    fontSize: 13,
    color: "#FFFFFF",
    letterSpacing: 0.5,
  },
  dotsRow: {
    flexDirection: "row",
    justifyContent: "center",
    marginTop: 18,
  },
  dot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginHorizontal: 6,
    backgroundColor: Colors.primary,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.6)",
  },
});
