// app/_layout.tsx
import "../lib/firebase";

import React, { useEffect } from "react";
import { InteractionManager } from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";

import CustomTabNavigator from "./CustomTabNavigator";

import { syncAthletesToLocal } from "../src/features/athletes/syncAthletesToLocal";
import { getAthletesCount, initAthletesDb } from "../src/storage/athletesDb";

export default function RootLayout() {
  useEffect(() => {
    const task = InteractionManager.runAfterInteractions(() => {
      (async () => {
        try {
          // 1) upewnij się, że DB stoi
          await initAthletesDb();

          // 2) jeśli pusto → próbuj zasysać dane na starcie appki
          const before = await getAthletesCount();
          if (before === 0) {
            const res: any = await syncAthletesToLocal();

            // tylko ostrzeżenia, żadnego spam-logowania
            if (res?.skipped) {
              console.warn(
                "[startup] athletes sync skipped:",
                res?.reason ?? "unknown",
              );
            }
            if (res?.totalDownloaded === 0) {
              console.warn("[startup] athletes sync returned 0 items");
            }
          }
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
