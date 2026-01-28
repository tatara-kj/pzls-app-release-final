import React from "react";
import { Text, View } from "react-native";

export default function ResultsTable({ data }: { data: any[] }) {
  return (
    <View>
      {data.map((r, idx) => (
        <Text key={idx}>
          {r.rank}. {r.name} ({r.nation}) – {r.time}
        </Text>
      ))}
    </View>
  );
}
