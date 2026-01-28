// src/components/AthleteProfileScreen.tsx
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import {
  getAthleteAchievements,
  getAthleteResults,
  getAthleteSeasonBests,
} from "../api/athletesDetailsApi";
import { AthleteRow } from "../storage/athletesDb";

const PZLS = {
  bg: "#DFEFF3",
  navy: "#1F273B",
  gold: "#BF8224",
  red: "#E32428",
  text: "#191C2F",
  sub: "#DADADA",
  st: "#5E1324",
};

type TabKey = "info" | "ach" | "res" | "sb";

type Props = {
  base: AthleteRow;
  onClose: () => void;
};

function formatDatePL(iso: string) {
  if (!iso || iso.length < 10) return "—";
  const [y, m, d] = iso.slice(0, 10).split("-");
  if (!y || !m || !d) return "—";
  return `${d}.${m}.${y}`;
}

function calcAge(birthDate: string) {
  const d = new Date(birthDate);
  if (Number.isNaN(d.getTime())) return null;
  const now = new Date();
  let age = now.getFullYear() - d.getFullYear();
  const mm = now.getMonth() - d.getMonth();
  if (mm < 0 || (mm === 0 && now.getDate() < d.getDate())) age--;
  return age;
}

function initials(firstName: string, lastName: string) {
  const a = (firstName?.trim()?.[0] ?? "").toUpperCase();
  const b = (lastName?.trim()?.[0] ?? "").toUpperCase();
  return `${a}${b}`.trim() || "—";
}

function torLabel(tor: "L" | "S") {
  return tor === "S" ? "ST" : "LT";
}

type LoadState<T> = { loading: boolean; error: string | null; data: T | null };

export default function AthleteProfileScreen({ base, onClose }: Props) {
  const insets = useSafeAreaInsets();
  const fullName = `${base.firstName} ${base.lastName}`.trim();

  const age = useMemo(() => calcAge(base.birthDate), [base.birthDate]);
  const genderPL =
    base.gender === "K" || base.gender === "F" ? "Kobieta" : "Mężczyzna";

  const [tab, setTab] = useState<TabKey>("info");

  const [achState, setAchState] = useState<LoadState<any>>({
    loading: false,
    error: null,
    data: null,
  });
  const [resState, setResState] = useState<LoadState<any>>({
    loading: false,
    error: null,
    data: null,
  });
  const [sbState, setSbState] = useState<LoadState<any>>({
    loading: false,
    error: null,
    data: null,
  });

  const [resultsLimit, setResultsLimit] = useState(40);

  // request-id żeby ignorować spóźnione odpowiedzi (i kończyć "wieczny loading")
  const achReq = useRef(0);
  const resReq = useRef(0);
  const sbReq = useRef(0);

  // reset po zmianie zawodnika (żeby nie mieszało danych)
  useEffect(() => {
    setTab("info");
    setResultsLimit(40);
    achReq.current = 0;
    resReq.current = 0;
    sbReq.current = 0;
    setAchState({ loading: false, error: null, data: null });
    setResState({ loading: false, error: null, data: null });
    setSbState({ loading: false, error: null, data: null });
  }, [base.id]);

  const ensureAchievements = async () => {
    if (achState.data) return;

    const reqId = ++achReq.current;
    setAchState({ loading: true, error: null, data: null });

    const timeout = setTimeout(() => {
      if (achReq.current === reqId) {
        achReq.current++; // unieważnij ten request
        setAchState({
          loading: false,
          error: "Osiągnięcia: brak odpowiedzi serwera (timeout).",
          data: null,
        });
      }
    }, 15000);

    try {
      const data = await getAthleteAchievements(base.id);
      if (achReq.current !== reqId) return; // spóźnione
      setAchState({ loading: false, error: null, data });
    } catch (e: any) {
      if (achReq.current !== reqId) return;
      setAchState({
        loading: false,
        error: e?.message ?? "Błąd",
        data: null,
      });
    } finally {
      clearTimeout(timeout);
    }
  };

  const ensureResults = async () => {
    if (resState.data) return;

    const reqId = ++resReq.current;
    setResState({ loading: true, error: null, data: null });

    const timeout = setTimeout(() => {
      if (resReq.current === reqId) {
        resReq.current++;
        setResState({
          loading: false,
          error: "Wyniki: brak odpowiedzi serwera (timeout).",
          data: null,
        });
      }
    }, 15000);

    try {
      const data = await getAthleteResults(base.id);
      if (resReq.current !== reqId) return;
      setResState({ loading: false, error: null, data });
    } catch (e: any) {
      if (resReq.current !== reqId) return;
      setResState({
        loading: false,
        error: e?.message ?? "Błąd",
        data: null,
      });
    } finally {
      clearTimeout(timeout);
    }
  };

  const ensureSeasonBests = async () => {
    if (sbState.data) return;

    const reqId = ++sbReq.current;
    setSbState({ loading: true, error: null, data: null });

    const timeout = setTimeout(() => {
      if (sbReq.current === reqId) {
        sbReq.current++;
        setSbState({
          loading: false,
          error: "SB: brak odpowiedzi serwera (timeout).",
          data: null,
        });
      }
    }, 15000);

    try {
      const data = await getAthleteSeasonBests(base.id);
      if (sbReq.current !== reqId) return;
      setSbState({ loading: false, error: null, data });
    } catch (e: any) {
      if (sbReq.current !== reqId) return;
      setSbState({
        loading: false,
        error: e?.message ?? "Błąd",
        data: null,
      });
    } finally {
      clearTimeout(timeout);
    }
  };

  // odpalaj fetch po zmianie taba (czytelnie i pewnie)
  useEffect(() => {
    if (tab === "ach") ensureAchievements();
    if (tab === "res") ensureResults();
    if (tab === "sb") ensureSeasonBests();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab, base.id]);

  const derivedTors = useMemo(() => {
    const set = new Set<"L" | "S">();
    const addFrom = (items: any[] | undefined) => {
      (items ?? []).forEach((x) => {
        const t = x?.Tor;
        if (t === "L" || t === "S") set.add(t);
      });
    };
    addFrom(achState.data?.items);
    addFrom(resState.data?.items);
    addFrom(sbState.data?.items);
    return Array.from(set.values());
  }, [achState.data, resState.data, sbState.data]);

  const headerTop = Math.max(insets.top, 14);

  return (
    <View style={styles.root}>
      <LinearGradient
        colors={[
          "rgba(191,130,36,0.28)",
          "rgba(227,36,40,0.18)",
          "rgba(31,39,59,0.0)",
        ]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[styles.hero, { paddingTop: headerTop + 10 }]}
      >
        <Pressable onPress={onClose} hitSlop={12} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={22} color="#FFF" />
        </Pressable>

        <View style={styles.headerRow}>
          <View style={styles.avatarBox}>
            <Text style={styles.avatarText}>
              {initials(base.firstName, base.lastName)}
            </Text>
          </View>

          <View style={{ flex: 1 }}>
            <Text style={styles.name} numberOfLines={2}>
              {fullName.toUpperCase()}
            </Text>

            <View style={styles.pills}>
              <Pill icon="person" text={genderPL} />
              {age !== null ? (
                <Pill icon="hourglass" text={`${age} lat`} />
              ) : null}
              {base.category ? (
                <Pill icon="podium" text={base.category} />
              ) : null}
              {derivedTors.length ? (
                <Pill
                  icon="speedometer-outline"
                  text={derivedTors.map((t) => torLabel(t)).join(" / ")}
                  accent={derivedTors.includes("S")}
                />
              ) : null}
            </View>
          </View>
        </View>

        <Segment value={tab} onChange={setTab} />
      </LinearGradient>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ padding: 16, paddingBottom: 110 }}
      >
        {tab === "info" && (
          <Card title="Informacje">
            <Info label="ID" value={base.id} />
            <Info label="Imię" value={base.firstName} />
            <Info label="Nazwisko" value={base.lastName} />
            <Info label="Data urodzenia" value={formatDatePL(base.birthDate)} />
            <Info label="Kategoria" value={base.category || "—"} />
            <Info label="Klub" value={base.club || "—"} />
          </Card>
        )}

        {tab === "ach" && (
          <Card title="Osiągnięcia">
            <LoadBlock
              loading={achState.loading}
              error={achState.error}
              empty={
                !achState.loading &&
                !achState.error &&
                (achState.data?.items?.length ?? 0) === 0
              }
              onRetry={ensureAchievements}
            />

            {(achState.data?.items ?? [])
              .slice(0, 80)
              .map((it: any, idx: number) => (
                <Row key={`${it?.NrKomunikatu ?? "x"}-${idx}`}>
                  <RowTop
                    left={`${it?.Rodzaj ?? ""} • ${torLabel(it?.Tor)} • ${
                      it?.Sezon ?? ""
                    }`}
                    right={`#${it?.Miejsce ?? "—"}`}
                    accent={it?.Tor === "S"}
                  />
                  <RowMid
                    title={`${it?.Nazwa ?? ""} ${it?.Konkurencja ?? ""}`.trim()}
                    sub={`${it?.ZawodyMiasto ?? ""} • ${formatDatePL(
                      it?.ZawodyData ?? ""
                    )}`}
                  />
                  {it?.Uwagi ? <RowNote text={String(it.Uwagi)} /> : null}
                </Row>
              ))}
          </Card>
        )}

        {tab === "res" && (
          <Card title="Wyniki">
            <LoadBlock
              loading={resState.loading}
              error={resState.error}
              empty={
                !resState.loading &&
                !resState.error &&
                (resState.data?.items?.length ?? 0) === 0
              }
              onRetry={ensureResults}
            />

            {(() => {
              const items = (resState.data?.items ?? [])
                .slice()
                .sort((a: any, b: any) => {
                  const da = String(a?.ZawodyData ?? "");
                  const db = String(b?.ZawodyData ?? "");
                  return db.localeCompare(da);
                });

              const visible = items.slice(0, resultsLimit);

              return (
                <>
                  {visible.map((it: any, idx: number) => (
                    <Row key={`${it?.DataAkt ?? "x"}-${idx}`}>
                      <RowTop
                        left={`${torLabel(it?.Tor)} • ${it?.Konkurencja ?? ""}`}
                        right={it?.Wynik ? String(it.Wynik) : "—"}
                        accent={it?.Tor === "S"}
                      />
                      <RowMid
                        title={`${it?.ZawodyNazwa ?? ""}`.trim()}
                        sub={`${it?.ZawodyMiasto ?? ""} • ${formatDatePL(
                          it?.ZawodyData ?? ""
                        )}`}
                      />
                      <RowMeta
                        left={`Miejsce: ${it?.Miejsce ?? "—"}`}
                        right={
                          it?.KlasaSportowa ? `Klasa: ${it.KlasaSportowa}` : ""
                        }
                      />
                      {it?.Uwagi ? <RowNote text={String(it.Uwagi)} /> : null}
                    </Row>
                  ))}

                  {items.length > resultsLimit ? (
                    <Pressable
                      onPress={() => setResultsLimit((x) => x + 40)}
                      style={styles.moreBtn}
                    >
                      <Text style={styles.moreText}>Pokaż więcej</Text>
                      <Ionicons name="chevron-down" size={16} color="#FFF" />
                    </Pressable>
                  ) : null}
                </>
              );
            })()}
          </Card>
        )}

        {tab === "sb" && (
          <Card title="Najlepsze w sezonach (SB)">
            <LoadBlock
              loading={sbState.loading}
              error={sbState.error}
              empty={
                !sbState.loading &&
                !sbState.error &&
                (sbState.data?.items?.length ?? 0) === 0
              }
              onRetry={ensureSeasonBests}
            />

            {(sbState.data?.items ?? [])
              .slice()
              .sort((a: any, b: any) =>
                String(b?.Sezon ?? "").localeCompare(String(a?.Sezon ?? ""))
              )
              .slice(0, 120)
              .map((it: any, idx: number) => (
                <Row key={`${it?.Sezon ?? "x"}-${it?.NrKonkur ?? "y"}-${idx}`}>
                  <RowTop
                    left={`${it?.Sezon ?? ""} • ${torLabel(it?.Tor)} • ${
                      it?.Konkurencja ?? ""
                    }`}
                    right={it?.Wynik ? String(it.Wynik) : "—"}
                    accent={it?.Tor === "S"}
                  />
                  <RowMid
                    title={`${it?.ZawodyMiasto ?? ""}`.trim()}
                    sub={`${formatDatePL(it?.ZawodyData ?? "")} • Kat: ${
                      it?.Kategoria ?? "—"
                    }`}
                  />
                </Row>
              ))}
          </Card>
        )}
      </ScrollView>
    </View>
  );
}

function Segment({
  value,
  onChange,
}: {
  value: TabKey;
  onChange: (v: TabKey) => void;
}) {
  const tabs: { k: TabKey; label: string }[] = [
    { k: "info", label: "Info" },
    { k: "ach", label: "Osiągnięcia" },
    { k: "res", label: "Wyniki" },
    { k: "sb", label: "SB" },
  ];

  return (
    <View style={styles.segmentWrap}>
      {tabs.map((t) => {
        const active = t.k === value;
        return (
          <Pressable
            key={t.k}
            onPress={() => onChange(t.k)}
            style={[styles.segmentItem, active && styles.segmentItemActive]}
          >
            <Text
              style={[styles.segmentText, active && styles.segmentTextActive]}
            >
              {t.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

function Pill({
  icon,
  text,
  accent,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  text: string;
  accent?: boolean;
}) {
  return (
    <View style={[styles.pill, accent ? { backgroundColor: PZLS.st } : null]}>
      <Ionicons name={icon} size={14} color="#FFF" />
      <Text style={styles.pillText}>{text}</Text>
    </View>
  );
}

function Card({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <View style={styles.card}>
      <Text style={styles.cardTitle}>{title}</Text>
      <View style={{ height: 10 }} />
      {children}
    </View>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.infoRow}>
      <Text style={styles.infoLabel}>{label}</Text>
      <Text style={styles.infoValue} numberOfLines={2}>
        {value || "—"}
      </Text>
    </View>
  );
}

function LoadBlock({
  loading,
  error,
  empty,
  onRetry,
}: {
  loading: boolean;
  error: string | null;
  empty: boolean;
  onRetry: () => void;
}) {
  if (loading) {
    return (
      <View style={styles.loadBox}>
        <ActivityIndicator />
        <Text style={styles.loadText}>Ładowanie…</Text>
      </View>
    );
  }
  if (error) {
    return (
      <View style={styles.loadBox}>
        <Text style={styles.errTitle}>Nie udało się pobrać</Text>
        <Text style={styles.errText} numberOfLines={3}>
          {error}
        </Text>
        <Pressable onPress={onRetry} style={styles.retryBtn}>
          <Ionicons name="refresh" size={16} color="#FFF" />
          <Text style={styles.retryText}>Spróbuj ponownie</Text>
        </Pressable>
      </View>
    );
  }
  if (empty) {
    return (
      <View style={styles.loadBox}>
        <Text style={styles.errTitle}>Brak danych</Text>
        <Text style={styles.errText}>Dla tego zawodnika nie ma wpisów.</Text>
      </View>
    );
  }
  return null;
}

function Row({ children }: { children: React.ReactNode }) {
  return <View style={styles.rowBox}>{children}</View>;
}

function RowTop({
  left,
  right,
  accent,
}: {
  left: string;
  right: string;
  accent?: boolean;
}) {
  return (
    <View style={styles.rowTop}>
      <Text
        style={[styles.rowTopLeft, accent ? { color: PZLS.sub } : null]}
        numberOfLines={1}
      >
        {left}
      </Text>
      <Text style={styles.rowTopRight} numberOfLines={1}>
        {right}
      </Text>
    </View>
  );
}

function RowMid({ title, sub }: { title: string; sub: string }) {
  return (
    <View style={{ marginTop: 6 }}>
      <Text style={styles.rowTitle} numberOfLines={2}>
        {title || "—"}
      </Text>
      <Text style={styles.rowSub} numberOfLines={2}>
        {sub || "—"}
      </Text>
    </View>
  );
}

function RowMeta({ left, right }: { left: string; right: string }) {
  return (
    <View style={styles.rowMeta}>
      <Text style={styles.rowMetaText}>{left}</Text>
      {right ? <Text style={styles.rowMetaText}>{right}</Text> : <View />}
    </View>
  );
}

function RowNote({ text }: { text: string }) {
  return (
    <Text style={styles.rowNote} numberOfLines={2}>
      {text}
    </Text>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: PZLS.navy },

  hero: {
    paddingHorizontal: 16,
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(255,255,255,0.08)",
  },

  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(0,0,0,0.22)",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 10,
  },

  headerRow: { flexDirection: "row", alignItems: "center", gap: 14 },

  avatarBox: {
    width: 78,
    height: 78,
    borderRadius: 22,
    backgroundColor: "rgba(255,255,255,0.06)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.12)",
    alignItems: "center",
    justifyContent: "center",
  },
  avatarText: {
    color: "#FFF",
    fontFamily: "Jost-BoldItalic",
    fontSize: 26,
    letterSpacing: 1.2,
  },

  name: {
    color: "#FFF",
    fontFamily: "Jost-BoldItalic",
    fontSize: 20,
    letterSpacing: 0.7,
  },

  pills: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 10 },
  pill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 999,
    backgroundColor: "rgba(255,255,255,0.10)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.10)",
  },
  pillText: { color: "#FFF", fontFamily: "Jost-Medium", fontSize: 12 },

  segmentWrap: { marginTop: 14, flexDirection: "row", gap: 8 },
  segmentItem: {
    flex: 1,
    borderRadius: 999,
    paddingVertical: 10,
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.06)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
  },
  segmentItemActive: { backgroundColor: PZLS.red, borderColor: PZLS.red },
  segmentText: {
    color: "rgba(255,255,255,0.75)",
    fontFamily: "Jost-Medium",
    fontSize: 12,
  },
  segmentTextActive: { color: "#FFF", fontFamily: "Jost-BoldItalic" },

  card: {
    backgroundColor: "rgba(255,255,255,0.04)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
    borderRadius: 22,
    padding: 16,
    marginBottom: 14,
  },
  cardTitle: {
    color: "#FFF",
    fontFamily: "Jost-BoldItalic",
    fontSize: 16,
    letterSpacing: 0.5,
  },

  infoRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 8,
    gap: 12,
  },
  infoLabel: {
    color: "rgba(255,255,255,0.70)",
    fontFamily: "Jost-Regular",
    fontSize: 14,
  },
  infoValue: {
    color: "#FFF",
    fontFamily: "Jost-Medium",
    fontSize: 14,
    flex: 1,
    textAlign: "right",
  },

  loadBox: {
    borderRadius: 18,
    padding: 14,
    backgroundColor: "rgba(0,0,0,0.16)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.06)",
    gap: 8,
    marginBottom: 10,
  },
  loadText: { color: "#FFF", fontFamily: "Jost-Medium", fontSize: 13 },
  errTitle: { color: "#FFF", fontFamily: "Jost-BoldItalic", fontSize: 13 },
  errText: {
    color: "rgba(255,255,255,0.75)",
    fontFamily: "Jost-Regular",
    fontSize: 12,
  },

  retryBtn: {
    marginTop: 6,
    alignSelf: "flex-start",
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: PZLS.gold,
    paddingHorizontal: 12,
    paddingVertical: 9,
    borderRadius: 999,
  },
  retryText: { color: "#191C2F", fontFamily: "Jost-Bold", fontSize: 12 },

  rowBox: {
    borderRadius: 18,
    padding: 12,
    backgroundColor: "rgba(0,0,0,0.14)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.06)",
    marginBottom: 10,
  },
  rowTop: { flexDirection: "row", justifyContent: "space-between", gap: 10 },
  rowTopLeft: {
    color: "rgba(255,255,255,0.78)",
    fontFamily: "Jost-Medium",
    fontSize: 12,
    flex: 1,
  },
  rowTopRight: {
    color: "#FFF",
    fontFamily: "Jost-Bold",
    fontSize: 12,
    maxWidth: 130,
    textAlign: "right",
  },

  rowTitle: { color: "#FFF", fontFamily: "Jost-Bold", fontSize: 14 },
  rowSub: {
    color: "rgba(255,255,255,0.70)",
    fontFamily: "Jost-Regular",
    fontSize: 12,
    marginTop: 2,
  },

  rowMeta: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 8,
  },
  rowMetaText: {
    color: "rgba(255,255,255,0.70)",
    fontFamily: "Jost-Medium",
    fontSize: 12,
  },

  rowNote: {
    color: "rgba(255,255,255,0.65)",
    fontFamily: "Jost-Regular",
    fontSize: 12,
    marginTop: 6,
  },

  moreBtn: {
    marginTop: 4,
    alignSelf: "center",
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: PZLS.red,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 999,
  },
  moreText: { color: "#FFF", fontFamily: "Jost-BoldItalic", fontSize: 12 },
});
