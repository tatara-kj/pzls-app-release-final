import { MotiView } from "moti";
import { ResizeMode, Video, AVPlaybackStatus } from "expo-av";
import { LinearGradient } from "expo-linear-gradient";
import { StatusBar } from "expo-status-bar";
import React, { useCallback, useEffect, useRef, useState } from "react";
import { Animated, Pressable, StyleSheet, Text, View } from "react-native";

export default function Welcome({
  onEnter,
  isActive,
}: {
  onEnter: () => void;
  isActive?: boolean;
}) {
  const active = isActive !== false;

  const [videoReady, setVideoReady] = useState(false);
  const fade = useRef(new Animated.Value(0)).current;

  const videoRef = useRef<Video>(null);

  // ręczny loop (stabilniejszy niż isLooping na części urządzeń/emulatorów)
  const onStatus = useCallback((s: AVPlaybackStatus) => {
    if (!s.isLoaded) return;

    if (s.didJustFinish) {
      videoRef.current?.setPositionAsync(0).then(() => {
        videoRef.current?.playAsync();
      });
    }
  }, []);

  // reset + stop gdy ekran nieaktywny
  useEffect(() => {
    if (!active) {
      setVideoReady(false);
      fade.setValue(0);

      // zatrzymaj i cofnij
      videoRef.current?.pauseAsync().catch(() => {});
      videoRef.current?.setPositionAsync(0).catch(() => {});
      return;
    }
  }, [active, fade]);

  // fade in jak video gotowe
  useEffect(() => {
    if (active && videoReady) {
      Animated.timing(fade, {
        toValue: 1,
        duration: 450,
        useNativeDriver: true,
      }).start();
    }
  }, [active, videoReady, fade]);

  return (
    <MotiView
      from={{ translateX: 160, opacity: 0 }}
      animate={{ translateX: active ? 0 : 160, opacity: active ? 1 : 0 }}
      transition={{ type: "timing", duration: 240 }}
      style={styles.container}
    >
      <StatusBar style="light" translucent />

      {/* Video renderujemy TYLKO gdy ekran aktywny */}
      {active && (
        <Animated.View style={[StyleSheet.absoluteFill, { opacity: fade }]}>
          <Video
            ref={videoRef}
            source={require("../assets/images/intro.mp4")}
            style={StyleSheet.absoluteFillObject}
            resizeMode={ResizeMode.COVER}
            shouldPlay={active}
            isLooping={false}
            isMuted
            progressUpdateIntervalMillis={250}
            onPlaybackStatusUpdate={onStatus}
            onReadyForDisplay={() => setVideoReady(true)}
            onError={() => {
              // awaryjnie: restart
              videoRef.current?.setPositionAsync(0).then(() => {
                videoRef.current?.playAsync();
              });
            }}
          />
        </Animated.View>
      )}

      <LinearGradient
        colors={["rgba(25,28,47,0.70)", "#191C2F"]}
        style={StyleSheet.absoluteFillObject}
      />

      <View style={styles.center}>
        <Text style={styles.title}>
          Witaj w&nbsp;oficjalnej{"\n"}aplikacji&nbsp;PZŁS
        </Text>

        <Pressable
          style={({ pressed }) => [
            styles.btn,
            { transform: [{ scale: pressed ? 0.97 : 1 }] },
          ]}
          onPress={onEnter}
        >
          <Text style={styles.btnTxt}>Przejdź dalej</Text>
        </Pressable>
      </View>
    </MotiView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#191C2F" },
  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 22,
  },
  title: {
    fontFamily: "Jost-BoldItalic",
    fontSize: 26,
    color: "#FFF",
    textAlign: "center",
    lineHeight: 32,
  },
  btn: {
    marginTop: 22,
    paddingVertical: 14,
    paddingHorizontal: 22,
    borderRadius: 16,
    backgroundColor: "rgba(255,255,255,0.10)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.14)",
  },
  btnTxt: {
    fontFamily: "Jost-Medium",
    color: "#FFF",
    fontSize: 16,
  },
});
