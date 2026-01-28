import React, { useState } from "react";
import { StyleSheet, View } from "react-native";
import { LinearGradient } from "expo-linear-gradient";

import AthleteGrid from "../src/components/AthleteGrid";
import AthleteProfileScreen from "../src/components/AthleteProfileScreen";
import { FiltersProvider } from "../src/hooks/useFilters";
import { AthleteRow } from "../src/storage/athletesDb";
import { Colors } from "../src/theme/colors";

export default function ZawodnicyScreen() {
  const [selected, setSelected] = useState<AthleteRow | null>(null);

  return (
    <FiltersProvider>
      <View style={styles.root}>
        <LinearGradient
          colors={[Colors.darkBg, "#151C2A"]}
          style={StyleSheet.absoluteFillObject}
        />

        {/* Grid zawsze żyje -> brak “lag back” */}
        <AthleteGrid onSelect={setSelected} isActive={!selected} />

        {/* Profil jako overlay */}
        {selected ? (
          <View style={StyleSheet.absoluteFillObject}>
            <AthleteProfileScreen
              base={selected}
              onClose={() => setSelected(null)}
            />
          </View>
        ) : null}
      </View>
    </FiltersProvider>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: Colors.darkBg },
});
