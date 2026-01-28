import React, { useMemo } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";

import { AthleteRow } from "../storage/athletesDb";

function initials(firstName: string, lastName: string) {
  const f = (firstName ?? "").trim().slice(0, 1).toUpperCase();
  const l = (lastName ?? "").trim().slice(0, 1).toUpperCase();
  const out = `${f}${l}`.trim();
  return out.length ? out : "•";
}

function ageFromBirthDate(birthDate: string): number | null {
  const d = new Date(birthDate);
  if (Number.isNaN(d.getTime())) return null;
  const now = new Date();
  let age = now.getFullYear() - d.getFullYear();
  const m = now.getMonth() - d.getMonth();
  if (m < 0 || (m === 0 && now.getDate() < d.getDate())) age--;
  return age;
}

function genderPill(g: string) {
  const u = (g ?? "").toUpperCase().trim();
  if (u === "K" || u === "F") return "K";
  if (u === "M") return "M";
  return "—";
}

type Props = {
  item: AthleteRow;
  onSelect: (row: AthleteRow) => void;
};

export default function AthleteTile({ item, onSelect }: Props) {
  const label = useMemo(
    () => initials(item.firstName, item.lastName),
    [item.firstName, item.lastName]
  );
  const age = useMemo(() => ageFromBirthDate(item.birthDate), [item.birthDate]);

  return (
    <Pressable onPress={() => onSelect(item)} style={styles.card}>
      <LinearGradient
        colors={[
          "rgba(191,130,36,0.22)",
          "rgba(227,36,40,0.14)",
          "rgba(0,0,0,0.08)",
        ]}
        style={styles.glow}
      />

      <View style={styles.row}>
        <LinearGradient
          colors={["rgba(191,130,36,0.95)", "rgba(227,36,40,0.85)"]}
          start={{ x: 0, y: 0.5 }}
          end={{ x: 1, y: 0.5 }}
          style={styles.avatar}
        >
          <Text style={styles.avatarText}>{label}</Text>
        </LinearGradient>

        <View style={styles.mid}>
          <Text style={styles.name} numberOfLines={1}>
            {item.firstName} {item.lastName}
          </Text>
          <Text style={styles.club} numberOfLines={1}>
            {item.club || "—"}
          </Text>

          <View style={styles.pills}>
            <View style={styles.pill}>
              <Text style={styles.pillText}>{item.category || "—"}</Text>
            </View>
            <View style={styles.pill}>
              <Text style={styles.pillText}>{genderPill(item.gender)}</Text>
            </View>
            <View style={styles.pillSoft}>
              <Text style={styles.pillTextSoft}>
                {age !== null ? `${age} lat` : "wiek —"}
              </Text>
            </View>
          </View>
        </View>

        <View style={styles.chev}>
          <Ionicons
            name="chevron-forward"
            size={18}
            color="rgba(255,255,255,0.85)"
          />
        </View>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    marginHorizontal: 16,
    marginVertical: 8,
    borderRadius: 18,
    overflow: "hidden",
    backgroundColor: "rgba(255,255,255,0.03)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.06)",
  },
  glow: {
    ...StyleSheet.absoluteFillObject,
    opacity: 0.75,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    padding: 14,
    gap: 12,
  },
  avatar: {
    width: 56,
    height: 56,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarText: {
    color: "#FFF",
    fontFamily: "Jost-BoldItalic",
    fontSize: 18,
    letterSpacing: 0.6,
  },
  mid: {
    flex: 1,
    minWidth: 0,
  },
  name: {
    color: "#FFF",
    fontFamily: "Jost-BoldItalic",
    fontSize: 16,
    letterSpacing: 0.2,
  },
  club: {
    marginTop: 4,
    color: "rgba(255,255,255,0.72)",
    fontFamily: "Jost-Regular",
    fontSize: 13,
  },
  pills: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginTop: 10,
  },
  pill: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: "rgba(94,19,36,0.55)",
    borderWidth: 1,
    borderColor: "rgba(191,130,36,0.25)",
  },
  pillText: {
    color: "#FFF",
    fontFamily: "Jost-Medium",
    fontSize: 12,
  },
  pillSoft: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: "rgba(255,255,255,0.05)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.06)",
  },
  pillTextSoft: {
    color: "rgba(255,255,255,0.85)",
    fontFamily: "Jost-Medium",
    fontSize: 12,
  },
  chev: {
    width: 28,
    alignItems: "flex-end",
  },
});
