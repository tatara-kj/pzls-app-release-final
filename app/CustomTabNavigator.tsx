import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Ionicons } from "@expo/vector-icons";
import { BlurView } from "expo-blur";
import AsyncStorage from "@react-native-async-storage/async-storage";

import {
  Platform,
  Pressable,
  StyleSheet,
  View,
  useWindowDimensions,
} from "react-native";
import Animated, {
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";
import { Gesture, GestureDetector } from "react-native-gesture-handler";

import WelcomeScreen from "./welcome";
import StartScreen from "./start";
import WydarzeniaScreen from "./wydarzenia";
import ZawodnicyScreen from "./zawodnicy";
import RankingiScreen from "./rankingi";

type TabName = "start" | "wydarzenia" | "zawodnicy" | "rankingi";
type IoniconName = React.ComponentProps<typeof Ionicons>["name"];

const TABS: { name: TabName; icon: IoniconName }[] = [
  { name: "start", icon: "home" },
  { name: "wydarzenia", icon: "calendar" },
  { name: "zawodnicy", icon: "people" },
  { name: "rankingi", icon: "podium" },
];

const WELCOME_SEEN_KEY = "welcome_seen_v1";

function clamp(v: number, min: number, max: number) {
  "worklet";
  return Math.max(min, Math.min(max, v));
}

export default function CustomTabNavigator() {
  const { width } = useWindowDimensions();

  // boot: żeby nie mignęło welcome/start zanim odczytamy storage
  const [bootReady, setBootReady] = useState(false);

  // welcome -> dopiero potem pokazujemy taby
  const [entered, setEntered] = useState(false);

  // aktywny index (ikony, itp.)
  const [index, setIndex] = useState(0);

  // shared: aktualny index (dla workletów)
  const indexSV = useSharedValue(0);

  // shared: translateX całego "paska ekranów"
  const translateX = useSharedValue(0);
  const panStartX = useSharedValue(0);

  const maxIndex = TABS.length - 1;
  const minX = -maxIndex * width;
  const maxX = 0;

  // 1) Odczyt: czy welcome już było?
  useEffect(() => {
    (async () => {
      try {
        const seen = await AsyncStorage.getItem(WELCOME_SEEN_KEY);
        if (seen === "1") {
          setEntered(true);
          setIndex(0);
          indexSV.value = 0;
          translateX.value = 0;
        } else {
          setEntered(false);
        }
      } finally {
        setBootReady(true);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // 2) synchronizacja po zmianie index lub width (np. zmiana rozmiaru okna)
  useEffect(() => {
    indexSV.value = index;
    translateX.value = -index * width;
  }, [index, width, indexSV, translateX]);

  const goToTab = useCallback(
    (name: TabName) => {
      const next = TABS.findIndex((t) => t.name === name);
      if (next < 0 || next === index) return;

      // ikony reagują od razu
      setIndex(next);

      // animacja "bez laga" (krótka, ale nie teleport)
      translateX.value = withTiming(-next * width, { duration: 160 });
    },
    [index, translateX, width],
  );

  const onSnapTo = useCallback((next: number) => {
    setIndex(next);
  }, []);

  // Swipe: pokazuje oba ekrany w trakcie przeciągania
  const pan = useMemo(() => {
    return Gesture.Pan()
      .activeOffsetX([-18, 18])
      .failOffsetY([-14, 14])
      .onBegin(() => {
        panStartX.value = translateX.value;
      })
      .onUpdate((e) => {
        const x = panStartX.value + e.translationX;
        translateX.value = clamp(x, minX, maxX);
      })
      .onEnd((e) => {
        const cur = indexSV.value;

        let next = cur;
        if (e.velocityX < -900) next = Math.min(cur + 1, maxIndex);
        else if (e.velocityX > 900) next = Math.max(cur - 1, 0);
        else next = clamp(Math.round(-translateX.value / width), 0, maxIndex);

        translateX.value = withTiming(-next * width, { duration: 160 });
        runOnJS(onSnapTo)(next);
      });
  }, [indexSV, panStartX, translateX, width, minX, maxX, maxIndex, onSnapTo]);

  const pagerStyle = useAnimatedStyle(() => {
    return {
      transform: [{ translateX: translateX.value }],
    };
  });

  // ekrany: trzymamy ZAMONTOWANE -> minimalny delay
  const screens = useMemo(() => {
    const Start: any = StartScreen;
    const Wyd: any = WydarzeniaScreen;
    const Zaw: any = ZawodnicyScreen;
    const Ran: any = RankingiScreen;

    return [
      { name: "start" as const, Component: Start },
      { name: "wydarzenia" as const, Component: Wyd },
      { name: "zawodnicy" as const, Component: Zaw },
      { name: "rankingi" as const, Component: Ran },
    ];
  }, []);

  // dopóki nie wiemy czy welcome było — nie renderuj nic (bez migania)
  if (!bootReady) {
    return <View style={styles.root} />;
  }

  // jeśli welcome nie było widziane — pokazuj je
  if (!entered) {
    return (
      <WelcomeScreen
        isActive={true}
        onEnter={async () => {
          try {
            await AsyncStorage.setItem(WELCOME_SEEN_KEY, "1");
          } catch {
            // nic — nawet jak storage padnie, user i tak wejdzie dalej
          }
          setEntered(true);
          setIndex(0);
          translateX.value = withTiming(0, { duration: 160 });
        }}
      />
    );
  }

  return (
    <View style={styles.root}>
      <GestureDetector gesture={pan}>
        <View style={styles.viewport}>
          <Animated.View
            style={[
              styles.pagerRow,
              { width: width * TABS.length },
              pagerStyle,
            ]}
          >
            {screens.map((s, i) => {
              const Comp: any = s.Component;
              const isActive = i === index;

              // props: tylko to co jest potrzebne
              const props =
                s.name === "start" ? { goToTab, isActive } : { isActive };

              return (
                <View key={s.name} style={{ width, flex: 1 }}>
                  <Comp {...props} />
                </View>
              );
            })}
          </Animated.View>
        </View>
      </GestureDetector>

      {/* TAB BAR */}
      <View
        style={[styles.tabBarWrap, { left: width * 0.05, width: width * 0.9 }]}
      >
        <View style={styles.blurWrapper}>
          <BlurView tint="dark" intensity={60} style={styles.blur} />
        </View>

        <View style={styles.tabBar}>
          {TABS.map((t, i) => (
            <Pressable
              key={t.name}
              onPress={() => goToTab(t.name)}
              style={styles.tabBtn}
            >
              <Ionicons
                name={t.icon}
                size={28}
                color={i === index ? "#E32428" : "#DADADA"}
              />
            </Pressable>
          ))}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#191C2F" },

  viewport: {
    flex: 1,
    overflow: "hidden",
  },

  pagerRow: {
    flex: 1,
    flexDirection: "row",
  },

  tabBarWrap: {
    position: "absolute",
    bottom: Platform.select({ ios: 20, android: 10 }),
    height: 70,
    borderRadius: 35,
    overflow: "hidden",
    zIndex: 50,
  },
  blurWrapper: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: 35,
    overflow: "hidden",
  },
  blur: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(31,34,51,0.3)",
  },
  tabBar: {
    ...StyleSheet.absoluteFillObject,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-around",
  },
  tabBtn: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
});
