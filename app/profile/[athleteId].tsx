import { Stack, useLocalSearchParams } from "expo-router";
import React, { useEffect, useMemo, useState } from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";

import { Colors } from "../../src/theme/colors";

import {
  AthleteRow,
  getAthleteByIdRow,
  initAthletesDb,
} from "../../src/storage/athletesDb";

function calcAgeFromBirthDate(birthDate: string) {
  // birthDate: "YYYY-MM-DD"
  const d = new Date(birthDate);
  if (Number.isNaN(d.getTime())) return null;
  const now = new Date();
  let age = now.getFullYear() - d.getFullYear();
  const m = now.getMonth() - d.getMonth();
  if (m < 0 || (m === 0 && now.getDate() < d.getDate())) age--;
  return age;
}

function initials(firstName: string, lastName: string) {
  const a = (firstName?.trim()?.[0] ?? "").toUpperCase();
  const b = (lastName?.trim()?.[0] ?? "").toUpperCase();
  return `${a}${b}`.trim() || "—";
}

export default function AthleteProfileScreen() {
  const { athleteId } = useLocalSearchParams();

  const id = useMemo(() => {
    const v = Array.isArray(athleteId) ? athleteId[0] : athleteId;
    return String(v ?? "");
  }, [athleteId]);

  const [row, setRow] = useState<AthleteRow | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        if (!id) return;
        await initAthletesDb();
        const r = await getAthleteByIdRow(id);
        if (!cancelled) setRow(r);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [id]);

  const displayName = row ? `${row.firstName} ${row.lastName}`.trim() : "";

  if (loading) {
    return (
      <View style={styles.container}>
        <Text style={styles.loading}>Ładowanie…</Text>
      </View>
    );
  }

  if (!row) {
    return (
      <View style={styles.container}>
        <Text style={styles.notFound}>Zawodnik nie znaleziony!</Text>
      </View>
    );
  }

  const genderPL =
    row.gender === "K" || row.gender === "F" ? "Kobieta" : "Mężczyzna";

  const age = row.birthDate ? calcAgeFromBirthDate(row.birthDate) : null;

  return (
    <View style={styles.container}>
      <Stack.Screen options={{ title: displayName || "Zawodnik" }} />

      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {/* Avatar: na danych z SQLite nie ma zdjęć -> inicjały */}
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>
            {initials(row.firstName, row.lastName)}
          </Text>
        </View>

        <Text style={styles.name}>{displayName}</Text>

        <View style={styles.card}>
          {age !== null ? <Info label="Wiek" value={`${age} lat`} /> : null}
          {row.birthDate ? (
            <Info label="Data urodzenia" value={row.birthDate} />
          ) : null}
          <Info label="Płeć" value={genderPL} />
          {row.category ? (
            <Info label="Kategoria" value={row.category} />
          ) : null}
          {row.club ? <Info label="Klub" value={row.club} /> : null}
        </View>

        <Text style={styles.note}>
          Na danych z SQLite nie ma zdjęć i części pól — jeśli chcesz, dodamy je
          z innego źródła albo rozszerzymy tabelę.
        </Text>
      </ScrollView>
    </View>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.row}>
      <Text style={styles.label}>{label}</Text>
      <Text style={styles.value}>{value || "—"}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.darkBg,
  },
  content: {
    padding: 18,
    paddingBottom: 120,
    alignItems: "center",
  },
  loading: {
    marginTop: 40,
    color: "#FFF",
    fontFamily: "Jost-Medium",
    fontSize: 16,
  },
  notFound: {
    marginTop: 40,
    color: "#FFF",
    fontFamily: "Jost-Medium",
    fontSize: 16,
  },

  avatar: {
    width: 110,
    height: 110,
    borderRadius: 28,
    backgroundColor: "rgba(255,255,255,0.06)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.10)",
    alignItems: "center",
    justifyContent: "center",
    marginTop: 10,
  },
  avatarText: {
    color: "#FFF",
    fontFamily: "Jost-BoldItalic",
    fontSize: 28,
    letterSpacing: 1,
  },

  name: {
    marginTop: 14,
    color: "#FFF",
    fontFamily: "Jost-BoldItalic",
    fontSize: 22,
    letterSpacing: 0.6,
    textAlign: "center",
  },

  card: {
    width: "100%",
    marginTop: 18,
    borderRadius: 22,
    padding: 16,
    backgroundColor: "rgba(255,255,255,0.04)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
  },

  row: {
    width: "100%",
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 8,
  },
  label: {
    color: Colors.textSecondary,
    fontFamily: "Jost-Regular",
    fontSize: 15,
  },
  value: {
    color: "#FFF",
    fontFamily: "Jost-Medium",
    fontSize: 15,
  },

  note: {
    marginTop: 14,
    color: "rgba(255,255,255,0.65)",
    fontFamily: "Jost-Regular",
    fontSize: 12,
    textAlign: "center",
  },
});
