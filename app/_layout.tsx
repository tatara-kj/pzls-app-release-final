// app/_layout.tsx
import "../lib/firebase";

import React, { useEffect } from "react";
import { InteractionManager } from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";

import CustomTabNavigator from "./CustomTabNavigator";


export default function RootLayout() {
  useEffect(() => {
    const task = InteractionManager.runAfterInteractions(() => {
      (async () => {
        try {
          
        } catch (e: any) {
          console.warn("[startup] failed", e?.message ?? e);
        }
      })();
    });

    return () => {
      // @ts-ignore
      task?.cancel?.();
    };
  }, []);

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <CustomTabNavigator />
    </GestureHandlerRootView>
  );
}
