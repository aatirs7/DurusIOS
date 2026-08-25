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

type Stage = "email" | "code" | "password";

/*
  Sign in with an emailed code, or with a password if the account has one.

  A password is a thing to store, forget and reset, and this app has nothing
  behind it worth protecting with one - the content is a published textbook and
  the progress is one person's revision history. So nothing here ever asks
  anyone to CREATE a password: a code to the address that already identifies
  the account is the smaller mechanism, and it stays the default.

  The password branch exists because a Clerk account can have one set from
  outside this app, and an account with a password that this screen refuses to
  accept is simply broken. It is offered only when Clerk reports that the
  address supports it, so nobody who has not got one is shown a field they
  cannot fill.

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
  const [password, setPassword] = useState("");
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

  /* Prepares and shows the emailed-code step for an attempt already created. */
  const sendEmailCode = async () => {
    const factor = signIn!.supportedFirstFactors?.find((f) => f.strategy === "email_code");
    if (!factor || !("emailAddressId" in factor)) throw new Error("no_email_factor");
    await signIn!.prepareFirstFactor({
      strategy: "email_code",
      emailAddressId: factor.emailAddressId,
    });
    setCreating(false);
    setStage("code");
  };

  const begin = async () => {
    if (!ready || busy) return;
    setBusy(true);
    setError(null);
    try {
      /*
        Created WITHOUT a strategy, so Clerk reports what this address supports
        before anything is sent. Naming email_code up front would mail a code
        even to an account whose owner was about to type a password.
      */
      await signIn!.create({ identifier: email.trim() });

      const hasPassword = signIn!.supportedFirstFactors?.some(
        (f) => f.strategy === "password",
      );
      if (hasPassword) {
        setCreating(false);
        setStage("password");
      } else {
        await sendEmailCode();
      }
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
      } else if (stage === "password") {
        const result = await signIn!.attemptFirstFactor({ strategy: "password", password });
        if (result.status !== "complete") throw new Error("incomplete");
        await setSignInActive!({ session: result.createdSessionId });
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
              {stage === "code" ? "Check your email" : "Sign in"}
            </Text>
            <Text variant="pageTitle">
              {stage === "email"
                ? "Keep your progress across devices."
                : stage === "password"
                  ? `Enter the password for ${email.trim()}.`
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
                  onSubmitEditing={begin}
                />
                <Button
                  label={busy ? "Checking…" : "Continue"}
                  disabled={busy || !ready || email.trim().length < 3}
                  onPress={begin}
                />
              </>
            ) : stage === "password" ? (
              <>
                <TextInput
                  value={password}
                  onChangeText={setPassword}
                  placeholder="Password"
                  placeholderTextColor={theme.colors.inkFaint}
                  style={s.input}
                  secureTextEntry
                  autoCapitalize="none"
                  autoCorrect={false}
                  autoComplete="current-password"
                  textContentType="password"
                  returnKeyType="go"
                  onSubmitEditing={verify}
                />
                <Button
                  label={busy ? "Checking…" : "Continue"}
                  disabled={busy || password.length < 1}
                  onPress={verify}
                />
                {/* Always a way past the password, so a forgotten one is not a
                    locked door. */}
                <Button
                  label="Email me a code instead"
                  variant="text"
                  onPress={async () => {
                    setBusy(true);
                    setError(null);
                    try {
                      await sendEmailCode();
                    } catch (e) {
                      setError(message(e));
                    } finally {
                      setBusy(false);
                    }
                  }}
                />
                <Button
                  label="Use a different address"
                  variant="text"
                  onPress={() => {
                    setStage("email");
                    setPassword("");
                    setError(null);
                  }}
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

          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </Screen>
  );
}
