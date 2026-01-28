import React, { useEffect,  useRef } from "react";
import {
  Animated,
  StyleSheet,
  View,
  useWindowDimensions,
  Text,
} from "react-native";

type Props = {
  count: number;
  areaHeight: number;
  enabled?: boolean;
};

type Particle = {
  x: number;
  y: number;
  size: number;
  opacity: number;
  dx: number;
  dy: number;
  phaseX: Animated.Value;
  phaseY: Animated.Value;
};

function buildParticles(
  count: number,
  width: number,
  areaHeight: number,
): Particle[] {
  return Array.from({ length: count }).map((_, i) => {
    const size = 10 + Math.random() * 12;
    return {
      x: Math.random() * Math.max(1, width - 24),
      y: Math.random() * areaHeight,
      size,
      opacity: 0.12 + Math.random() * 0.18,
      dx: 8 + Math.random() * 18,
      dy: 6 + Math.random() * 16,
      phaseX: new Animated.Value((i % 7) / 7),
      phaseY: new Animated.Value((i % 5) / 5),
    };
  });
}

export default function ParticleBackground({
  count,
  areaHeight,
  enabled = true,
}: Props) {
  const { width } = useWindowDimensions();
  const particlesRef = useRef<Particle[]>([]);

  // (re)init gdy zmienia się count / rozmiar
  useEffect(() => {
    particlesRef.current = buildParticles(count, width, areaHeight);
  }, [count, width, areaHeight]);

  useEffect(() => {
    if (!enabled) return;

    const anims: Animated.CompositeAnimation[] = [];

    particlesRef.current.forEach((p) => {
      const durX = 14000 + Math.floor(Math.random() * 12000);
      const durY = 16000 + Math.floor(Math.random() * 14000);

      const loopX = Animated.loop(
        Animated.sequence([
          Animated.timing(p.phaseX, {
            toValue: 1,
            duration: durX,
            useNativeDriver: true,
          }),
          Animated.timing(p.phaseX, {
            toValue: 0,
            duration: durX,
            useNativeDriver: true,
          }),
        ]),
      );

      const loopY = Animated.loop(
        Animated.sequence([
          Animated.timing(p.phaseY, {
            toValue: 1,
            duration: durY,
            useNativeDriver: true,
          }),
          Animated.timing(p.phaseY, {
            toValue: 0,
            duration: durY,
            useNativeDriver: true,
          }),
        ]),
      );

      anims.push(loopX, loopY);
      loopX.start();
      loopY.start();
    });

    return () => {
      anims.forEach((a) => a.stop());
    };
  }, [enabled]);

  if (!enabled) return null;

  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFillObject}>
      {particlesRef.current.map((p, idx) => {
        const tx = p.phaseX.interpolate({
          inputRange: [0, 1],
          outputRange: [-p.dx, p.dx],
        });
        const ty = p.phaseY.interpolate({
          inputRange: [0, 1],
          outputRange: [-p.dy, p.dy],
        });

        return (
          <Animated.View
            key={idx}
            style={[
              styles.flakeWrap,
              {
                left: p.x,
                top: p.y,
                opacity: p.opacity,
                transform: [{ translateX: tx }, { translateY: ty }],
              },
            ]}
          >
            <Text style={[styles.flakeText, { fontSize: p.size }]}>❄︎</Text>
          </Animated.View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  flakeWrap: { position: "absolute" },
  flakeText: {
    color: "rgba(255,255,255,0.55)",
    textShadowColor: "rgba(0,0,0,0.25)",
    textShadowRadius: 6,
    textShadowOffset: { width: 0, height: 2 },
  },
});
