import React from "react";
import { Text, View } from "react-native";

export default function EntriesList({ data }: { data: any[] }) {
  return (
    <View>
      {data.map((e, idx) => (
        <Text key={idx}>
          {e.name} • {e.nation}
        </Text>
      ))}
    </View>
  );
}
