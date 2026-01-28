// app/profile/profil.tsx  (lub app/profil.tsx)
// ============================================================================
// PROFIL – mock zgodny z makietą (bez custom fontów).
// Zmiany:
// - śnieżynki oparte na Animated (jak w przykładzie) + obrazek snowflake.png
// - mniejszy dolny padding (nie nachodzi na navbar)
// - nagłówek odsunięty od notcha (safe-area top)
// - "Notifications" zamiast "Email notifications"
// - brak theme preview / export data (usunięte poprzednio)
// ============================================================================

import auth from "@react-native-firebase/auth";
import { useIsFocused } from "@react-navigation/native";
import { LinearGradient } from "expo-linear-gradient";
import { MotiView } from "moti";
import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  Alert,
  Animated,
  Dimensions,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

// ========================== Snow background (Animated) ======================

const { width, height } = Dimensions.get("window");

// pojedynczy płatek
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
    let cancelled = false;
    const animate = () => {
      if (cancelled) return;
      const targetX = initialX + (Math.random() * 2 - 1) * rangeX;
      const targetY = initialY + (Math.random() * 2 - 1) * rangeY;
      Animated.timing(position, {
        toValue: { x: targetX, y: targetY },
        duration,
        useNativeDriver: true,
      }).start(({ finished }) => finished && !cancelled && animate());
    };
    const t = setTimeout(animate, delay);
    return () => {
      cancelled = true;
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

// całe tło
function ParticleBackground({
  count,
  areaHeight,
}: {
  count: number;
  areaHeight: number;
}) {
  const particles = useMemo(
    () =>
      Array.from({ length: count }, () => {
        const startX = Math.random() * width * 0.95;
        const startY = Math.random() * areaHeight;
        const sz = 10 + Math.random() * 12;
        return {
          initialX: startX,
          initialY: startY,
          size: sz,
          opacity: 0.2 + Math.random() * 0.25,
          duration: 3500 + Math.random() * 3500,
          delay: Math.random() * 2000,
          rangeX: 25 + Math.random() * 30,
          rangeY: 25 + Math.random() * 30,
        };
      }),
    [count, areaHeight]
  );

  return (
    <View style={[StyleSheet.absoluteFill, { zIndex: 0 }]} pointerEvents="none">
      {particles.map((p, i) => (
        <Snowflake key={i} {...p} />
      ))}
    </View>
  );
}

// =============================== Main Screen ================================

export default function Profil() {
  const isFocused = useIsFocused();
  const { top, bottom } = useSafeAreaInsets();

  // Mock/real user
  const currentUser = auth().currentUser ?? null;
  const [name, setName] = useState(currentUser?.displayName || "Jan Kowalski");
  const [email, setEmail] = useState(
    currentUser?.email || "jan.kowalski@example.com"
  );
  const [password, setPassword] = useState("•••••••");

  const [notifications, setNotifications] = useState(false);
  const [language, setLanguage] = useState<"Polski" | "English">("Polski");
  const [theme, setTheme] = useState<"light" | "dark">("dark");
  const [saving, setSaving] = useState(false);
  const [langModalVisible, setLangModalVisible] = useState(false);

  // Kolory PZŁS
  const colors = useMemo(
    () => ({
      bg: "#191C2F",
      card: "rgba(19,25,41,0.72)",
      border: "rgba(109,120,146,0.22)",
      label: "#DADADA",
      text: "#DFEFF3",
      sub: "#97A6C1",
      accent1: "#E32428",
      accent2: "#BF8224",
      muted: "rgba(10,12,20,0.6)",
    }),
    []
  );

  // Akcje
  const handleSave = async () => {
    setSaving(true);
    try {
      if (!currentUser) {
        Alert.alert(
          "Zapisane (mock)",
          "Po spięciu backendu zapiszemy to do Firestore."
        );
        return;
      }
      if (name !== currentUser.displayName)
        await currentUser.updateProfile({ displayName: name });
      if (email !== currentUser.email) await currentUser.updateEmail(email);
      if (password && password !== "•••••••")
        await currentUser.updatePassword(password);
      Alert.alert("Zapisano", "Profil zaktualizowany.");
    } catch {
      Alert.alert(
        "Błąd zapisu",
        "Zmiana e-maila/hasła zwykle wymaga ponownej autoryzacji (na razie mock)."
      );
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = () =>
    Alert.alert(
      "Usunąć konto?",
      "Tej operacji nie można cofnąć.",
      [
        { text: "Anuluj", style: "cancel" },
        {
          text: "Usuń",
          style: "destructive",
          onPress: async () => {
            try {
              if (!currentUser)
                return Alert.alert("Mock", "Brak zalogowanego użytkownika.");
              await currentUser.delete();
              Alert.alert("Konto usunięte");
            } catch {
              Alert.alert(
                "Nie udało się usunąć",
                "Firebase zwykle wymaga ponownej autoryzacji."
              );
            }
          },
        },
      ],
      { cancelable: true }
    );

  return (
    <MotiView
      from={{ translateX: 160, opacity: 0 }}
      animate={{ translateX: isFocused ? 0 : 160, opacity: isFocused ? 1 : 0 }}
      transition={{ type: "timing", duration: 320 }}
      style={[styles.container, { backgroundColor: colors.bg }]}
    >
      {/* tło z płatkami (renderowane jako pierwsze, więc zostaje z tyłu) */}
      <ParticleBackground count={16} areaHeight={height} />

      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        style={{ flex: 1 }}
      >
        <ScrollView
          contentContainerStyle={[
            styles.scroll,
            {
              paddingTop: Math.max(top + 8, 16), // odsunięcie spod notcha
              paddingBottom: bottom + 12, // mniejszy odstęp nad navbarem
            },
          ]}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* Nagłówek */}
          <Text style={[styles.title, { color: colors.text }]}>PROFIL</Text>

          {/* Karta danych */}
          <View
            style={[
              styles.card,
              { backgroundColor: colors.card, borderColor: colors.border },
            ]}
          >
            <Field
              label="Name"
              value={name}
              onChangeText={setName}
              colors={colors}
            />
            <Field
              label="Email"
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
              colors={colors}
            />
            <Field
              label="Change Password"
              value={password}
              onChangeText={setPassword}
              secureTextEntry
              colors={colors}
            />

            <Pressable
              onPress={handleSave}
              style={{ marginTop: 16 }}
              disabled={saving}
            >
              <LinearGradient
                colors={[colors.accent1, colors.accent2]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.primaryBtn}
              >
                <Text style={styles.primaryBtnText}>
                  {saving ? "Saving..." : "Save"}
                </Text>
              </LinearGradient>
            </Pressable>
          </View>

          {/* NOTIFICATIONS */}
          <SectionTitle title="NOTIFICATIONS" colors={colors} />
          <RowCard colors={colors}>
            <Text style={[styles.rowLabel, { color: colors.text }]}>
              Notifications
            </Text>
            <Switch
              value={notifications}
              onValueChange={setNotifications}
              thumbColor={notifications ? "#fff" : "#eee"}
              trackColor={{
                false: "rgba(255,255,255,0.15)",
                true: colors.accent1,
              }}
            />
          </RowCard>

          {/* PREFERENCES */}
          <SectionTitle title="PREFERENCES" colors={colors} />

          {/* Język */}
          <RowCard colors={colors}>
            <Text style={[styles.rowLabel, { color: colors.text }]}>
              Language
            </Text>
            <Pressable
              style={styles.pill}
              onPress={() => setLangModalVisible(true)}
            >
              <Text style={{ color: colors.text }}>{language}</Text>
            </Pressable>
          </RowCard>

          {/* Motyw */}
          <RowCard colors={colors} extraGap>
            <Text style={[styles.rowLabel, { color: colors.text }]}>Theme</Text>
            <View style={styles.segment}>
              <Pressable
                onPress={() => setTheme("light")}
                style={[
                  styles.segmentBtn,
                  theme === "light" && styles.segmentBtnActive,
                ]}
              >
                <Text
                  style={[
                    styles.segmentText,
                    { opacity: theme === "light" ? 1 : 0.7 },
                  ]}
                >
                  Light
                </Text>
              </Pressable>
              <Pressable
                onPress={() => setTheme("dark")}
                style={[
                  styles.segmentBtn,
                  theme === "dark" && styles.segmentBtnActive,
                ]}
              >
                <Text
                  style={[
                    styles.segmentText,
                    { opacity: theme === "dark" ? 1 : 0.7 },
                  ]}
                >
                  Dark
                </Text>
              </Pressable>
            </View>
          </RowCard>

          {/* DATA & PRIVACY */}
          <SectionTitle title="DATA & PRIVACY" colors={colors} />
          <View
            style={[
              styles.card,
              { backgroundColor: colors.card, borderColor: colors.border },
            ]}
          >
            <Pressable onPress={handleDelete}>
              <LinearGradient
                colors={[colors.accent1, "#8A1A22"]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={[styles.primaryBtn, { opacity: 0.95 }]}
              >
                <Text style={styles.primaryBtnText}>DELETE ACCOUNT</Text>
              </LinearGradient>
            </Pressable>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>

      {/* MODAL WYBORU JĘZYKA */}
      <LanguageModal
        visible={langModalVisible}
        onClose={() => setLangModalVisible(false)}
        onSelect={(lng) => {
          setLanguage(lng);
          setLangModalVisible(false);
        }}
        colors={colors}
        selected={language}
      />
    </MotiView>
  );
}

/* --------------------------- Podkomponenty -------------------------------- */

function SectionTitle({ title, colors }: { title: string; colors: any }) {
  return <Text style={[styles.section, { color: colors.sub }]}>{title}</Text>;
}

function RowCard({
  children,
  colors,
  extraGap,
}: {
  children: React.ReactNode;
  colors: any;
  extraGap?: boolean;
}) {
  return (
    <View
      style={[
        styles.rowCard,
        {
          backgroundColor: colors.card,
          borderColor: colors.border,
          gap: extraGap ? 12 : 0,
        },
      ]}
    >
      {children}
    </View>
  );
}

function Field({
  label,
  colors,
  ...inputProps
}: {
  label: string;
  colors: any;
  value: string;
  onChangeText: (t: string) => void;
  placeholder?: string;
  secureTextEntry?: boolean;
  keyboardType?: any;
  autoCapitalize?: "none" | "sentences" | "words" | "characters";
}) {
  return (
    <View style={{ marginBottom: 12 }}>
      <Text style={[styles.label, { color: colors.label }]}>{label}</Text>
      <View
        style={[
          styles.inputWrap,
          { borderColor: colors.border, backgroundColor: colors.muted },
        ]}
      >
        <TextInput
          placeholderTextColor="#6D7892"
          style={[styles.input, { color: colors.text }]}
          {...inputProps}
        />
      </View>
    </View>
  );
}

function LanguageModal({
  visible,
  onClose,
  onSelect,
  colors,
  selected,
}: {
  visible: boolean;
  onClose: () => void;
  onSelect: (lng: "Polski" | "English") => void;
  colors: any;
  selected: "Polski" | "English";
}) {
  return (
    <Modal
      visible={visible}
      animationType="fade"
      transparent
      statusBarTranslucent
    >
      <View style={styles.modalBackdrop}>
        <View
          style={[
            styles.modalCard,
            {
              backgroundColor: "rgba(17,21,34,0.96)",
              borderColor: colors.border,
            },
          ]}
        >
          <Text style={[styles.modalTitle, { color: "#fff" }]}>
            Choose language
          </Text>

          <ModalOption
            label="Polski"
            selected={selected === "Polski"}
            onPress={() => onSelect("Polski")}
            colors={colors}
          />
          <ModalOption
            label="English"
            selected={selected === "English"}
            onPress={() => onSelect("English")}
            colors={colors}
          />

          <Pressable onPress={onClose} style={{ marginTop: 16 }}>
            <Text
              style={{ textAlign: "center", color: colors.sub, fontSize: 14 }}
            >
              Close
            </Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

function ModalOption({
  label,
  selected,
  onPress,
  colors,
}: {
  label: string;
  selected: boolean;
  onPress: () => void;
  colors: any;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={[
        styles.optionRow,
        {
          borderColor: colors.border,
          backgroundColor: selected
            ? "rgba(227,36,40,0.15)"
            : "rgba(255,255,255,0.02)",
        },
      ]}
    >
      <Text style={{ color: "#fff", fontSize: 15 }}>{label}</Text>
      <View
        style={{
          width: 18,
          height: 18,
          borderRadius: 9,
          borderWidth: 1,
          borderColor: selected ? colors.accent1 : "rgba(255,255,255,0.35)",
          backgroundColor: selected ? colors.accent1 : "transparent",
        }}
      />
    </Pressable>
  );
}

/* -------------------------------- STYLES ---------------------------------- */
const styles = StyleSheet.create({
  container: { flex: 1 },
  scroll: { paddingHorizontal: 20 },
  title: {
    fontSize: 32,
    textAlign: "center",
    marginBottom: 12,
    letterSpacing: 1,
  },

  card: { borderRadius: 22, borderWidth: 1, padding: 16, marginTop: 8 },
  rowCard: {
    borderRadius: 18,
    borderWidth: 1,
    padding: 14,
    marginTop: 8,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },

  label: { fontSize: 13, marginBottom: 6, opacity: 0.9 },
  inputWrap: {
    borderWidth: 1,
    borderRadius: 16,
    paddingHorizontal: 14,
    height: 52,
    justifyContent: "center",
  },
  input: { fontSize: 16, includeFontPadding: false, paddingTop: 2 },

  primaryBtn: {
    height: 56,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    shadowOpacity: 0.25,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 6 },
    elevation: 3,
  },
  primaryBtnText: { fontSize: 16, color: "#fff", letterSpacing: 0.4 },

  section: { fontSize: 12, marginLeft: 6 },

  rowLabel: { fontSize: 16 },

  pill: {
    paddingHorizontal: 16,
    height: 36,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "rgba(109,120,146,0.25)",
    alignItems: "center",
    justifyContent: "center",
  },

  segment: {
    flexDirection: "row",
    backgroundColor: "rgba(10,12,20,0.6)",
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "rgba(109,120,146,0.22)",
    overflow: "hidden",
  },
  segmentBtn: {
    paddingHorizontal: 18,
    height: 36,
    alignItems: "center",
    justifyContent: "center",
  },
  segmentBtnActive: { backgroundColor: "rgba(227,36,40,0.25)" },
  segmentText: { fontSize: 14, color: "#DFEFF3" },

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
    padding: 16,
  },
  modalTitle: {
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
    marginTop: 8,
  },
});
