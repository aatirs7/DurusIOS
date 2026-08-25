import { useSSO } from "@clerk/clerk-expo";
import * as AuthSession from "expo-auth-session";
import { useRouter } from "expo-router";
import * as WebBrowser from "expo-web-browser";
import { useCallback, useEffect, useState } from "react";
import { Pressable, View } from "react-native";
import Svg, { Path } from "react-native-svg";

import { Button } from "@/components/Button";
import { Text } from "@/components/Text";
import { RADIUS, space } from "@/theme/layout";
import { makeStyles, useTheme } from "@/theme/useTheme";

/*
  Dismisses the auth session popup if the app was reopened onto one. Called at
  module scope, as Expo's auth docs require - inside a component it runs too
  late and the browser tab is left hanging.
*/
WebBrowser.maybeCompleteAuthSession();

const useStyles = makeStyles((t) => ({
  actions: { gap: space(1.5) },
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
  colour elsewhere is still caught.
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

/*
  The three ways in, and nothing else.

  There is no way past this panel. An account is what makes progress survive a
  lost phone, and this app writes to a server that keys everything on one -
  offering a way around it would mean shipping a second, quieter product whose
  data silently ends at the edge of the device.

  Rendered both as the last step of onboarding and, on its own, when a signed
  out app is reopened, so the two can never drift apart.
*/
export function SignInPanel({ onSignedIn }: { onSignedIn: () => void }) {
  const s = useStyles();
  const theme = useTheme();
  const router = useRouter();
  const { startSSOFlow } = useSSO();

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
          onSignedIn();
          return;
        }
        /* Cancelled, or the account needs more steps. Neither is an error worth
           shouting about - the panel is still usable. */
      } catch (e) {
        setError(
          (e as { errors?: { longMessage?: string }[] })?.errors?.[0]?.longMessage ??
            "That did not work. Try again.",
        );
      } finally {
        setBusy(null);
      }
    },
    [busy, startSSOFlow, onSignedIn],
  );

  return (
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
    </View>
  );
}
