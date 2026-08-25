import { ClerkProvider } from "@clerk/clerk-expo";
import { Amiri_400Regular, Amiri_700Bold } from "@expo-google-fonts/amiri";
import {
  IBMPlexMono_400Regular,
  IBMPlexMono_500Medium,
} from "@expo-google-fonts/ibm-plex-mono";
import { useFonts } from "expo-font";
import { Stack } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { StatusBar } from "expo-status-bar";
import * as SystemUI from "expo-system-ui";
import { useEffect, useMemo } from "react";
import { AppState, View } from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { SafeAreaProvider } from "react-native-safe-area-context";

import { Button } from "@/components/Button";
import { ClerkGate } from "@/components/ClerkGate";
import { Screen } from "@/components/Screen";
import { Text } from "@/components/Text";
import { bootOnce } from "@/data/boot";
import { DB_NAME, db, sqlite } from "@/data/client";
import { useDurusMigrations } from "@/data/migrate";
import { syncReminders } from "@/data/reminders";
import { useSession } from "@/state/session";
import { tokenCache } from "@/lib/tokenCache";
import { space } from "@/theme/layout";
import { useTheme } from "@/theme/useTheme";

SplashScreen.preventAutoHideAsync().catch(() => {});

/*
  The boot gate.

  Holds the splash until: migrations applied and foreign keys verified, content
  seeded, the session store hydrated, and a profile id in hand.

  Clerk is deliberately NOT in that list. @clerk/expo's isLoaded can require a
  network round trip, and spec section 2 calls launching with no network round
  trip "the one architectural decision". The app reads its own local tables
  instead and lets Clerk reconcile afterwards, so a cold launch in airplane mode
  reaches Today with real counts.
*/
export default function RootLayout() {
  const theme = useTheme();
  const migration = useDurusMigrations();

  const hydrated = useSession((s) => s._hydrated);
  const setActiveProfile = useSession((s) => s.setActiveProfile);

  /*
    Amiri is load-bearing rather than decorative: without it the harakat detach
    from their letters and float above the word, which makes a vowelled card
    unreadable. A missing font must still never block launch though, so a load
    error degrades to the system face rather than holding the splash.
  */
  const [fontsLoaded, fontError] = useFonts({
    Amiri_400Regular,
    Amiri_700Bold,
    IBMPlexMono_400Regular,
    IBMPlexMono_500Medium,
  });

  /* bootOnce is synchronous and memoised at module scope, so this is a read
     rather than a side effect that has to settle over several renders. */
  const boot = useMemo(
    () => (migration.phase === "ready" ? bootOnce() : null),
    [migration.phase],
  );

  /* Writing to an external store is what effects are actually for. */
  useEffect(() => {
    if (boot?.ok) setActiveProfile(boot.profileId);
  }, [boot, setActiveProfile]);

  useEffect(() => {
    SystemUI.setBackgroundColorAsync(theme.colors.paper).catch(() => {});
  }, [theme]);

  /*
    The rolling notification window is rebuilt on every foreground, and after
    every session (see review.tsx).

    It has to be re-planned rather than left alone because a DAILY trigger
    cannot consult the due count: the whole point is that a slot goes quiet when
    nothing is waiting. Time passing changes which slots deserve a notification
    even when the user has done nothing at all.
  */
  useEffect(() => {
    if (!boot?.ok) return;
    const profileId = boot.profileId;
    void syncReminders(db, profileId);
    const sub = AppState.addEventListener("change", (state) => {
      if (state === "active") void syncReminders(db, profileId);
    });
    return () => sub.remove();
  }, [boot]);

  const failure =
    migration.phase === "failed"
      ? migration.error
      : boot && !boot.ok
        ? boot.error
        : null;

  const ready = !!boot?.ok && hydrated && (fontsLoaded || !!fontError);

  useEffect(() => {
    if (ready || failure) SplashScreen.hideAsync().catch(() => {});
  }, [ready, failure]);

  /*
    A migration or seed failure must not hide the splash into a broken app. It
    is the one boot failure a user can act on, and because the server holds the
    durable copy, resetting local data is recovery rather than loss.
  */
  if (failure) {
    return (
      <SafeAreaProvider>
        <Screen>
          <View style={{ flex: 1, justifyContent: "center", gap: space(2) }}>
            <Text variant="pageTitle">Durus could not start.</Text>
            <Text color="inkSoft">{failure.message}</Text>
            <Text color="inkFaint" variant="label">
              Your progress is on the server. Resetting this device downloads it again.
            </Text>
            <Button
              label="Reset local data"
              onPress={() => {
                try {
                  sqlite.closeSync();
                  // eslint-disable-next-line @typescript-eslint/no-require-imports
                  require("expo-sqlite").deleteDatabaseSync(DB_NAME);
                } catch {
                  /* Nothing useful to do: the next launch re-runs migrations
                     against whatever is there. */
                }
              }}
            />
          </View>
        </Screen>
      </SafeAreaProvider>
    );
  }

  if (!ready) return null;

  return (
    /*
      ClerkProvider wraps the tree but gates nothing. The splash was already
      lifted by the time this renders, because the boot gate above waits on
      migrations, the seed and the local account row - never on Clerk, whose
      isLoaded can require a network round trip.
    */
    <ClerkProvider
      publishableKey={process.env.EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY!}
      tokenCache={tokenCache}
    >
      <GestureHandlerRootView style={{ flex: 1 }}>
        <SafeAreaProvider>
          <ClerkGate />
          <StatusBar style={theme.dark ? "light" : "dark"} />
          <Stack
            screenOptions={{
              headerShown: false,
              contentStyle: { backgroundColor: theme.colors.paper },
            }}
          >
            {/* Spec section 7.4: motion is limited to four animations, so
                entering a drill does not slide. */}
            <Stack.Screen name="review" options={{ animation: "none" }} />
            <Stack.Screen name="speed" options={{ animation: "none" }} />
            <Stack.Screen name="cases" options={{ animation: "none" }} />
            <Stack.Screen name="cards" options={{ animation: "none" }} />
          </Stack>
        </SafeAreaProvider>
      </GestureHandlerRootView>
    </ClerkProvider>
  );
}
