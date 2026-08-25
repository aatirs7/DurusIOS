import { useSignIn, useSignUp } from "@clerk/clerk-expo";
import { useRouter } from "expo-router";
import { useState } from "react";
import { KeyboardAvoidingView, Platform, ScrollView, TextInput, View } from "react-native";

import { BackBar } from "@/components/BackBar";
import { Button } from "@/components/Button";
import { Screen } from "@/components/Screen";
import { Text } from "@/components/Text";
import { RADIUS, space } from "@/theme/layout";
import { makeStyles, useTheme } from "@/theme/useTheme";

const useStyles = makeStyles((t) => ({
  body: { flex: 1, justifyContent: "center", gap: space(2) },
  input: {
    borderWidth: 1,
    borderColor: t.colors.rule,
    backgroundColor: t.colors.surface,
    borderRadius: RADIUS.button,
    paddingVertical: space(2),
    paddingHorizontal: space(2),
    color: t.colors.ink,
    fontSize: 17,
    minHeight: 54,
  },
  error: { color: t.colors.clay },
}));

type Stage = "email" | "code";

/*
  Sign in with an emailed code. No password.

  A password is a thing to store, forget and reset, and this app has nothing
  behind it worth protecting with one - the content is a published textbook and
  the progress is one person's revision history. A code to the address that
  already identifies the account is the smaller mechanism.

  The same screen covers sign up: Clerk's sign-in fails with a form_identifier
  _not_found for an unknown address, and creating an account at that point is
  the obvious thing to do rather than a second screen asking the same question.
*/
export default function SignIn() {
  const s = useStyles();
  const theme = useTheme();
  const router = useRouter();
  const { signIn, setActive: setSignInActive, isLoaded: signInLoaded } = useSignIn();
  const { signUp, setActive: setSignUpActive, isLoaded: signUpLoaded } = useSignUp();

  const [stage, setStage] = useState<Stage>("email");
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [creating, setCreating] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const ready = signInLoaded && signUpLoaded;

  const message = (e: unknown): string => {
    const err = e as { errors?: { longMessage?: string; message?: string }[] };
    return (
      err?.errors?.[0]?.longMessage ??
      err?.errors?.[0]?.message ??
      "That did not work. Try again."
    );
  };

  const sendCode = async () => {
    if (!ready || busy) return;
    setBusy(true);
    setError(null);
    try {
      await signIn!.create({ strategy: "email_code", identifier: email.trim() });
      setCreating(false);
      setStage("code");
    } catch (e) {
      /* No account with that address yet, so make one. Same field, same code,
         no second screen. */
      try {
        await signUp!.create({ emailAddress: email.trim() });
        await signUp!.prepareEmailAddressVerification({ strategy: "email_code" });
        setCreating(true);
        setStage("code");
      } catch (e2) {
        setError(message(e2 ?? e));
      }
    } finally {
      setBusy(false);
    }
  };

  const verify = async () => {
    if (!ready || busy) return;
    setBusy(true);
    setError(null);
    try {
      if (creating) {
        const result = await signUp!.attemptEmailAddressVerification({ code: code.trim() });
        if (result.status !== "complete") throw new Error("incomplete");
        await setSignUpActive!({ session: result.createdSessionId });
      } else {
        const result = await signIn!.attemptFirstFactor({
          strategy: "email_code",
          code: code.trim(),
        });
        if (result.status !== "complete") throw new Error("incomplete");
        await setSignInActive!({ session: result.createdSessionId });
      }
      /* ClerkGate binds the session to a local profile; this screen's only job
         is over. replace rather than back, so the stack has no signed-out
         screen left behind it. */
      router.replace("/today");
    } catch (e) {
      setError(message(e));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Screen>
      <BackBar fallback="/welcome" />
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <ScrollView contentContainerStyle={{ flexGrow: 1 }} keyboardShouldPersistTaps="handled">
          <View style={s.body}>
            <Text variant="eyebrow" color="inkSoft">
              {stage === "email" ? "Sign in" : "Check your email"}
            </Text>
            <Text variant="pageTitle">
              {stage === "email"
                ? "Keep your progress across devices."
                : `A six digit code is on its way to ${email.trim()}.`}
            </Text>

            {stage === "email" ? (
              <>
                <TextInput
                  value={email}
                  onChangeText={setEmail}
                  placeholder="you@example.com"
                  placeholderTextColor={theme.colors.inkFaint}
                  style={s.input}
                  inputMode="email"
                  autoCapitalize="none"
                  autoCorrect={false}
                  autoComplete="email"
                  keyboardType="email-address"
                  returnKeyType="go"
                  onSubmitEditing={sendCode}
                />
                <Button
                  label={busy ? "Sending…" : "Email me a code"}
                  disabled={busy || !ready || email.trim().length < 3}
                  onPress={sendCode}
                />
              </>
            ) : (
              <>
                <TextInput
                  value={code}
                  onChangeText={setCode}
                  placeholder="123456"
                  placeholderTextColor={theme.colors.inkFaint}
                  style={s.input}
                  inputMode="numeric"
                  keyboardType="number-pad"
                  autoComplete="one-time-code"
                  textContentType="oneTimeCode"
                  returnKeyType="go"
                  onSubmitEditing={verify}
                />
                <Button
                  label={busy ? "Checking…" : "Continue"}
                  disabled={busy || code.trim().length < 4}
                  onPress={verify}
                />
                <Button
                  label="Use a different address"
                  variant="text"
                  onPress={() => {
                    setStage("email");
                    setCode("");
                    setError(null);
                  }}
                />
              </>
            )}

            {error ? <Text style={s.error}>{error}</Text> : null}

            {/*
              Skippable, and that is deliberate. The app is fully usable signed
              out - everything is on the device - so an account is offered for
              what it actually buys (surviving a lost phone) rather than being a
              gate in front of a textbook.
            */}
            <Button
              label="Not now"
              variant="text"
              onPress={() => router.replace("/today")}
            />
            <Text variant="label" color="inkFaint">
              Without an account your progress lives only on this phone.
            </Text>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </Screen>
  );
}
