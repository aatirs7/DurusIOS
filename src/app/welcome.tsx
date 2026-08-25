import { useAuth } from "@clerk/clerk-expo";
import { useRouter } from "expo-router";
import { useEffect } from "react";
import { View } from "react-native";

import { Arabic } from "@/components/Arabic";
import { Button } from "@/components/Button";
import { Screen } from "@/components/Screen";
import { SignInPanel } from "@/components/SignIn";
import { Text } from "@/components/Text";
import { ThemeToggle } from "@/components/ThemeToggle";
import { TOTAL_LESSONS } from "@/engine/constants";
import { useSession } from "@/state/session";
import { TICK, space } from "@/theme/layout";
import { makeStyles } from "@/theme/useTheme";

/*
  The way back in for an app that has been signed out of.

  Onboarding asks for an account as its last step, so a first launch never
  reaches this screen. What does reach it is signing out from Settings, or a
  session that could not be renewed - cases where the setup answers are already
  on the device and only the identity is missing. So it asks for the identity
  and nothing else.

  There is no way past it, and that is the change from the version that shipped
  first. Everything the app records is keyed on an account; letting someone
  decline meant quietly running a second product whose data stopped at the edge
  of the phone.

  The panel itself lives in components/SignIn so this and the onboarding step
  cannot drift apart.
*/
const useStyles = makeStyles((t) => ({
  header: {
    height: 40,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  hero: { flex: 1, alignItems: "center", justifyContent: "center", gap: space(4) },
  titles: { alignItems: "center", gap: space(2) },
  h1: { fontSize: 32, textAlign: "center", lineHeight: 38 },
  blurb: { textAlign: "center", maxWidth: 340 },

  ticks: { flexDirection: "row", justifyContent: "center", gap: TICK.gap },
  tick: {
    width: TICK.width,
    height: TICK.height,
    borderRadius: 999,
    backgroundColor: t.colors.rule,
  },

  actions: { paddingBottom: space(2) },
}));

export default function Welcome() {
  const s = useStyles();
  const router = useRouter();
  const { isSignedIn } = useAuth();
  const restartOnboarding = useSession((st) => st.restartOnboarding);

  /*
    Never sit on the gate with a live session.

    The gate on the index route reads the LOCAL account row, which is what keeps
    a cold launch off the network. Clerk can disagree with it - a session it
    restored from the keychain that this device has no account row for yet - and
    when it does, the right answer is to go in, not to ask someone to sign in to
    the account they are already signed in to.
  */
  useEffect(() => {
    if (isSignedIn) router.replace("/today");
  }, [isSignedIn, router]);

  return (
    <Screen>
      <View style={s.header}>
        <Arabic variant="title" color="lapis">
          دُرُوس
        </Arabic>
        <ThemeToggle />
      </View>

      <View style={s.hero}>
        <Arabic variant="card" color="lapis">
          دُرُوس
        </Arabic>

        <View style={s.titles}>
          <Text variant="pageTitle" style={s.h1}>
            Welcome back
          </Text>
          {/*
            Says what signing in is for rather than what the app contains. The
            reader has used it before; what they need to know is why they are
            being asked again.
          */}
          <Text color="inkSoft" style={s.blurb}>
            Sign in to pick up where you left off.
          </Text>
        </View>

        <View style={s.ticks}>
          {Array.from({ length: TOTAL_LESSONS }, (_, i) => (
            <View key={i} style={s.tick} />
          ))}
        </View>
      </View>

      <View style={s.actions}>
        <SignInPanel onSignedIn={() => router.replace("/today")} />

        {/*
          A way in for somebody who has never set Durus up on this phone.

          This screen is reached whenever there is no account on the device, and
          that is not only the returning user it addresses - a friend borrowing
          the phone, or anyone who signed out before finishing. Without this
          there is no route to the setup questions at all: every button here
          assumes an account already exists.
        */}
        <Button
          label="New here? Set up Durus"
          variant="text"
          onPress={() => {
            restartOnboarding();
            router.replace("/onboarding");
          }}
        />
      </View>
    </Screen>
  );
}
