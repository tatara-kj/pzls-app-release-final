import React from "react";
import { Text,  Linking, TouchableOpacity } from "react-native";

export default function YouTubePlayer({ url }: { url: string }) {
  return (
    <TouchableOpacity onPress={() => Linking.openURL(url)}>
      <Text style={{ color: "blue" }}>Oglądaj tutaj: {url}</Text>
    </TouchableOpacity>
  );
}
