import React from "react";
import { View, Text, Image, StyleSheet, ActivityIndicator } from "react-native";
import { LinearGradient } from "expo-linear-gradient";

export default function Splash() {
  return (
    <LinearGradient
      colors={["#191C2F", "#120d18"]} // ciemniejszy dół
      start={{ x: 0.3, y: 0 }}
      end={{ x: 0.8, y: 1 }}
      style={styles.container}
    >
      <Image
        source={require("../../assets/images/pzls_logo.png")}
        style={styles.logo} // BEZ animacji
        resizeMode="contain"
      />

      <Text style={styles.tagline}>Pasja • Prędkość • Emocje</Text>

      <ActivityIndicator
        size="large"
        color="#BF8224"
        style={{ marginTop: 28 }}
      />
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: "center", alignItems: "center" },
  logo: { width: 140, height: 140 },
  tagline: { color: "#DFEFF3", fontSize: 16, fontWeight: "600", marginTop: 24 },
});
