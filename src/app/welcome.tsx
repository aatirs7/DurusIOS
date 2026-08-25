import { useSSO } from "@clerk/clerk-expo";
import * as AuthSession from "expo-auth-session";
import { useRouter } from "expo-router";
import * as WebBrowser from "expo-web-browser";
import { useCallback, useEffect, useState } from "react";
import { Pressable, View } from "react-native";
import Svg, { Path } from "react-native-svg";

import { Arabic } from "@/components/Arabic";
import { Button } from "@/components/Button";
import { Screen } from "@/components/Screen";
import { Text } from "@/components/Text";
import { ThemeToggle } from "@/components/ThemeToggle";
import { TOTAL_LESSONS } from "@/engine/constants";
import { useSession } from "@/state/session";
import { RADIUS, TICK, space } from "@/theme/layout";
import { makeStyles, useTheme } from "@/theme/useTheme";

/*
  Dismisses the auth session popup if the app was reopened onto one. Called at
  module scope, as Expo's auth docs require - inside a component it runs too
  late and the browser tab is left hanging.
*/
WebBrowser.maybeCompleteAuthSession();

const useStyles = makeStyles((t) => ({
  header: { height: 40, flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  hero: { flex: 1, alignItems: "center", justifyContent: "center", gap: space(4) },
  titles: { alignItems: "center", gap: space(2) },
  h1: { fontSize: 32, textAlign: "center", lineHeight: 38 },
  blurb: { textAlign: "center", maxWidth: 340 },

  ticks: { flexDirection: "row", justifyContent: "center", gap: TICK.gap },
  tick: { width: TICK.width, height: TICK.height, borderRadius: 999, backgroundColor: t.colors.rule },

  actions: { gap: space(1.5), paddingBottom: space(2) },
  /*
    Apple sits above Google. Apple's Human Interface Guidelines require Sign in
    with Apple to appear at least as prominently as any other third party
    option, and "above" is the unambiguous reading of that.
  */
  oauth: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: space(1.5),
    borderRadius: RADIUS.button,
    borderWidth: 1,
    borderColor: t.colors.rule,
    backgroundColor: t.colors.surface,
    paddingVertical: 14,
    paddingHorizontal: 20,
    minHeight: 52,
  },
  caption: { textAlign: "center" },
  error: { color: t.colors.clay, textAlign: "center" },
}));

/* Apple's mark, drawn rather than shipped as an image so it takes the ink
   colour in both themes. */
function AppleMark({ color }: { color: string }) {
  return (
    <Svg width={18} height={18} viewBox="0 0 24 24">
      <Path
        fill={color}
        d="M16.36 12.78c.02-2.3 1.88-3.4 1.96-3.45-1.07-1.56-2.73-1.78-3.32-1.8-1.41-.14-2.76.83-3.48.83-.72 0-1.83-.81-3-.79-1.54.02-2.96.9-3.75 2.28-1.6 2.77-.41 6.87 1.15 9.12.76 1.1 1.67 2.34 2.86 2.29 1.15-.05 1.58-.74 2.97-.74 1.39 0 1.78.74 3 .72 1.24-.02 2.02-1.12 2.78-2.23.87-1.28 1.23-2.52 1.25-2.58-.03-.01-2.4-.92-2.42-3.65zM14.1 5.98c.63-.77 1.06-1.83.94-2.9-.91.04-2.02.61-2.67 1.37-.58.68-1.09 1.77-.95 2.81 1.02.08 2.05-.52 2.68-1.28z"
      />
    </Svg>
  );
}

/*
  Google's four-colour mark.

  These hex values are fixed by Google's branding requirements and are not ours
  to replace with tokens - the mark is wrong in any other colour, in either
  theme. The disable is scoped to this function rather than the file so a stray
  colour elsewhere in this screen is still caught.
*/
/* eslint-disable no-restricted-syntax */
function GoogleMark() {
  return (
    <Svg width={18} height={18} viewBox="0 0 24 24">
      <Path fill="#4285F4" d="M23.5 12.27c0-.79-.07-1.54-.2-2.27H12v4.51h6.47a5.53 5.53 0 0 1-2.4 3.62v3h3.86c2.26-2.08 3.57-5.15 3.57-8.86z" />
      <Path fill="#34A853" d="M12 24c3.24 0 5.96-1.08 7.94-2.91l-3.86-3c-1.08.72-2.45 1.16-4.08 1.16-3.13 0-5.78-2.11-6.73-4.96H1.29v3.09A11.99 11.99 0 0 0 12 24z" />
      <Path fill="#FBBC05" d="M5.27 14.29a7.2 7.2 0 0 1 0-4.58V6.62H1.29a12 12 0 0 0 0 10.76l3.98-3.09z" />
      <Path fill="#EA4335" d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.23 0 12 0 7.7 0 3.99 2.47 1.29 6.62l3.98 3.09C6.22 6.86 8.87 4.75 12 4.75z" />
    </Svg>
  );
}
/* eslint-enable no-restricted-syntax */

export default function Welcome() {
  const s = useStyles();
  const theme = useTheme();
  const router = useRouter();
  const { startSSOFlow } = useSSO();
  const completeWelcome = useSession((st) => st.completeWelcome);

  const [busy, setBusy] = useState<"apple" | "google" | null>(null);
  const [error, setError] = useState<string | null>(null);

  /* Warms the browser on Android so the first tap does not sit on a blank
     screen. A no-op on iOS, and harmless if it throws. */
  useEffect(() => {
    void WebBrowser.warmUpAsync().catch(() => {});
    return () => {
      void WebBrowser.coolDownAsync().catch(() => {});
    };
  }, []);

  const signInWith = useCallback(
    async (strategy: "oauth_apple" | "oauth_google", which: "apple" | "google") => {
      if (busy) return;
      setBusy(which);
      setError(null);
      try {
        const { createdSessionId, setActive } = await startSSOFlow({
          strategy,
          redirectUrl: AuthSession.makeRedirectUri(),
        });

        if (createdSessionId && setActive) {
          await setActive({ session: createdSessionId });
          completeWelcome();
          router.replace("/today");
          return;
        }
        /* Cancelled, or the account needs more steps. Neither is an error worth
           shouting about - the screen is still usable. */
      } catch (e) {
        setError(
          (e as { errors?: { longMessage?: string }[] })?.errors?.[0]?.longMessage ??
            "That did not work. Try again.",
        );
      } finally {
        setBusy(null);
      }
    },
    [busy, startSSOFlow, completeWelcome, router],
  );

  return (
    <Screen>
      <View style={s.header}>
        {/* The wordmark, unvowelled, the way the site sets it. */}
        <Arabic variant="title" color="lapis" showHarakat={false}>
          دروس
        </Arabic>
        <ThemeToggle />
      </View>

      <View style={s.hero}>
        <Arabic variant="card" color="lapis" showHarakat={false}>
          دروس
        </Arabic>

        <View style={s.titles}>
          <Text variant="pageTitle" style={s.h1}>
            Arabic revision for Madinah Book 1
          </Text>
          {/*
            What the app is for, rather than what it contains. A lesson count
            ages the moment content is added and tells a new reader nothing
            about why they would open it.
          */}
          <Text color="inkSoft" style={s.blurb}>
            The vocabulary you have been taught, brought back just before you
            forget it.
          </Text>
        </View>

        <View style={s.ticks}>
          {Array.from({ length: TOTAL_LESSONS }, (_, i) => (
            <View key={i} style={s.tick} />
          ))}
        </View>
      </View>

      <View style={s.actions}>
        <Pressable
          accessibilityRole="button"
          disabled={busy !== null}
          onPress={() => signInWith("oauth_apple", "apple")}
          style={({ pressed }) => [s.oauth, (pressed || busy === "apple") && { opacity: 0.7 }]}
        >
          <AppleMark color={theme.colors.ink} />
          <Text>{busy === "apple" ? "Continuing…" : "Continue with Apple"}</Text>
        </Pressable>

        <Pressable
          accessibilityRole="button"
          disabled={busy !== null}
          onPress={() => signInWith("oauth_google", "google")}
          style={({ pressed }) => [s.oauth, (pressed || busy === "google") && { opacity: 0.7 }]}
        >
          <GoogleMark />
          <Text>{busy === "google" ? "Continuing…" : "Continue with Google"}</Text>
        </Pressable>

        <Button label="Sign in with email" variant="text" onPress={() => router.push("/sign-in")} />

        {error ? (
          <Text variant="label" style={s.error}>
            {error}
          </Text>
        ) : null}

        {/*
          Skippable, and that is deliberate. Everything works signed out, so an
          account is offered for what it actually buys - surviving a lost phone -
          rather than standing in front of a textbook.
        */}
        <Button
          label="Not now"
          variant="text"
          onPress={() => {
            completeWelcome();
            router.replace("/today");
          }}
        />
        <Text variant="label" color="inkFaint" style={s.caption}>
          Without an account your progress lives only on this phone.
        </Text>
      </View>
    </Screen>
  );
}
