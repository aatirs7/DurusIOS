import { useAuth } from "@clerk/clerk-expo";
import { useRouter } from "expo-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  Switch,
  TextInput,
  TouchableWithoutFeedback,
  View,
  useWindowDimensions,
} from "react-native";
import Animated, {
  Easing,
  FadeIn,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withDelay,
  withTiming,
} from "react-native-reanimated";
import { SafeAreaView } from "react-native-safe-area-context";
import Svg, { Path } from "react-native-svg";

import { Arabic } from "@/components/Arabic";
import { AyahField } from "@/components/AyahField";
import { Glass, GlassButton } from "@/components/Glass";
import { FIELD, WordField } from "@/components/OnboardingChrome";
import { SignInPanel } from "@/components/SignIn";
import { Text } from "@/components/Text";
import { ThemeToggle } from "@/components/ThemeToggle";
import { db } from "@/data/client";
import { syncReminders } from "@/data/reminders";
import { updateSettings } from "@/data/settings";
import { haptics } from "@/lib/haptics";
import { requestPermission } from "@/lib/notifications";
import {
  afterReminders,
  saveOnboarding,
  shouldAskPermission,
} from "@/onboarding/save";
import { Story } from "@/onboarding/Story";
import { SURAHS, TOTAL_AYAHS } from "@/quran/tanzil";
import { usePrefs } from "@/state/prefs";
import { useQuranStatus } from "@/state/quranStatus";
import { useSession } from "@/state/session";
import { MARGIN, RADIUS, space } from "@/theme/layout";
import { FONTS } from "@/theme/typography";
import { makeStyles, useTheme } from "@/theme/useTheme";

/*
  Onboarding v3 (issue #2).

    open -> story (5 pages) -> your name -> your hifz -> reminders -> sign in -> your map

  One real question, what you have memorized, because it is the one that pays
  off visually. Everything the old flow asked about the Arabic course (class or
  self, book, lesson, pace) is gone; save writes the self path's defaults and
  book and lesson live in Settings.

  Kept from the old flow, deliberately:
  - Nothing is written before sign in succeeds. Answers live in this
    component's state, so quitting at any point starts again from Open.
  - A keychain restored session skips sign in and goes straight to finish().
  - Notification permission is asked as the reminders step is left, and only
    if a reminder is on.
  - Back exists on hifz, reminders and sign in only.
  - index.tsx's gating is unchanged.

  Onboarding is exempt from the four animation rule (owner's answer, issue #2).
  Everything here still honours Reduce Motion.
*/

type Step = "open" | "story" | "name" | "hifz" | "reminders" | "signin" | "map";

/* Al-Fatiha, then Juz Amma (78 to 114). */
const HIFZ_CHOICES = [1, ...Array.from({ length: 37 }, (_, i) => 78 + i)];

const useStyles = makeStyles((t) => ({
  safe: { flex: 1, backgroundColor: t.colors.paper },
  pad: { flex: 1, paddingHorizontal: MARGIN },
  top: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    height: 48,
  },
  corner: {
    width: 44,
    height: 44,
    alignItems: "center",
    justifyContent: "center",
  },
  heads: { alignItems: "center", gap: space(1), paddingTop: space(1) },
  h1: { fontSize: 34, lineHeight: 40, textAlign: "center" },
  sub: { fontSize: 17, lineHeight: 24, textAlign: "center", maxWidth: 320 },
  actions: { gap: space(1.5), paddingBottom: space(1), alignItems: "stretch" },
  textButton: { alignSelf: "center", paddingVertical: space(1) },

  /* Open */
  openCenter: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: space(2),
  },
  openTitle: {
    fontSize: 44,
    lineHeight: 50,
    letterSpacing: -0.6,
    textAlign: "center",
  },

  /* Hifz */
  chips: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "center",
    gap: space(1),
    paddingVertical: space(2),
  },
  chip: {
    width: 104,
    borderRadius: RADIUS.field,
    paddingVertical: space(1),
    paddingHorizontal: space(0.5),
    alignItems: "center",
    overflow: "hidden",
  },

  /* Reminders */
  row: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderRadius: 20,
    paddingVertical: space(2),
    paddingHorizontal: space(2.5),
    overflow: "hidden",
  },

  /* Name */
  nameField: { borderRadius: RADIUS.field, paddingHorizontal: space(2.5), overflow: "hidden" },
  nameInput: { fontFamily: FONTS.uiRegular, fontSize: 22, textAlign: "center", paddingVertical: space(2), color: t.colors.ink },

  /* Sign in */
  signCard: { borderRadius: 24, padding: space(2.5), overflow: "hidden" },

  /* Map */
  counters: {
    flexDirection: "row",
    justifyContent: "center",
    gap: space(5),
    paddingTop: space(2),
  },
  counter: { alignItems: "center" },
  numeral: { fontSize: 56, lineHeight: 62 },
}));

function Chevron() {
  const theme = useTheme();
  return (
    <Svg width={22} height={22} viewBox="0 0 24 24">
      <Path
        d="M15 6l-6 6 6 6"
        stroke={theme.colors.ink}
        strokeWidth={1.75}
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
    </Svg>
  );
}

/* Back on the left, theme on the right. Only on the question steps. */
function TopBar({ onBack }: { onBack?: () => void }) {
  const s = useStyles();
  return (
    <View style={s.top}>
      <View style={s.corner}>
        {onBack ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Back"
            onPress={onBack}
            hitSlop={8}
          >
            <Chevron />
          </Pressable>
        ) : null}
      </View>
      <View style={s.corner}>
        <ThemeToggle />
      </View>
    </View>
  );
}

/* ---------- Open ---------- */

const OPEN_MS = 1200;

function FlyingWord({
  index,
  width,
  height,
  progress,
}: {
  index: number;
  width: number;
  height: number;
  progress: { value: number };
}) {
  const theme = useTheme();
  const w = FIELD[index];
  const x = (parseFloat(w.left) / 100) * width;
  const y = (parseFloat(w.top) / 100) * height;
  const dx = width / 2 - x - w.size;
  const dy = height / 2 - y - w.size;
  const style = useAnimatedStyle(() => ({
    opacity: (theme.dark ? 0.1 : 0.14) * (1 - progress.value),
    transform: [
      { translateX: dx * progress.value },
      { translateY: dy * progress.value },
      { scale: 1 - 0.4 * progress.value },
    ],
  }));
  return (
    <Animated.View
      style={[{ position: "absolute", left: x, top: y }, style]}
      pointerEvents="none"
    >
      <Arabic
        variant="inline"
        color="lapis"
        showHarakat={false}
        style={{ fontSize: w.size, lineHeight: Math.round(w.size * 1.6) }}
      >
        {w.word}
      </Arabic>
    </Animated.View>
  );
}

function Open({
  onBegin,
  onAccount,
}: {
  onBegin: () => void;
  onAccount: () => void;
}) {
  const s = useStyles();
  const still = useReducedMotion();
  const { width, height } = useWindowDimensions();
  const progress = useSharedValue(still ? 1 : 0);

  /* The scattered words drift together and resolve into the mark, once. */
  useEffect(() => {
    if (still) return;
    progress.value = withDelay(
      350,
      withTiming(1, {
        duration: OPEN_MS,
        easing: Easing.bezier(0.4, 0, 0.2, 1),
      }),
    );
  }, [still, progress]);

  const [ready, setReady] = useState(still);
  useEffect(() => {
    if (still) return;
    const id = setTimeout(() => setReady(true), OPEN_MS + 500);
    return () => clearTimeout(id);
  }, [still]);

  const mark = useAnimatedStyle(() => ({
    opacity: progress.value,
    transform: [{ scale: 0.86 + 0.14 * progress.value }],
  }));

  return (
    <View style={{ flex: 1 }}>
      <View
        style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0 }}
        pointerEvents="none"
      >
        {FIELD.map((_, i) => (
          <FlyingWord
            key={i}
            index={i}
            width={width}
            height={height}
            progress={progress}
          />
        ))}
      </View>
      <SafeAreaView style={s.pad} edges={["top", "bottom"]}>
        <View style={s.openCenter}>
          <Animated.View style={mark}>
            <Arabic variant="card" color="lapis">
              دُرُوس
            </Arabic>
          </Animated.View>
          <Animated.View
            entering={
              still ? undefined : FadeIn.delay(OPEN_MS + 200).duration(500)
            }
            style={{ alignItems: "center", gap: space(1) }}
          >
            <Text variant="pageTitle" style={s.openTitle}>
              Read. Memorize. Understand.
            </Text>
            <Text color="inkSoft" style={s.sub}>
              The Quran, and the Arabic to understand it.
            </Text>
          </Animated.View>
        </View>
        {/*
          No fade on this block: Liquid Glass does not draw inside a view whose
          opacity is animated, which is how Begin went invisible. The buttons
          appear on a timer instead, in space that is reserved from the start
          so nothing shifts.
        */}
        <View style={[s.actions, { minHeight: 112 }]}>
          {ready ? (
            <>
              <GlassButton label="Begin" primary onPress={onBegin} />
              <Pressable
                accessibilityRole="button"
                onPress={onAccount}
                style={s.textButton}
              >
                <Text color="lapis">I have an account</Text>
              </Pressable>
            </>
          ) : null}
        </View>
      </SafeAreaView>
    </View>
  );
}

/* ---------- Hifz ---------- */

function useMask(surahs: Set<number>): Uint8Array {
  return useMemo(() => {
    const mask = new Uint8Array(TOTAL_AYAHS);
    for (const n of surahs) {
      const x = SURAHS[n - 1];
      mask.fill(1, x.start, x.start + x.ayahs);
    }
    return mask;
  }, [surahs]);
}

function Hifz({
  chosen,
  toggle,
}: {
  chosen: Set<number>;
  toggle: (n: number) => void;
}) {
  const s = useStyles();
  const theme = useTheme();
  const { width } = useWindowDimensions();
  const mask = useMask(chosen);

  return (
    <ScrollView
      contentContainerStyle={{ paddingBottom: space(2) }}
      showsVerticalScrollIndicator={false}
    >
      <View style={s.heads}>
        <Text variant="pageTitle" style={s.h1}>
          What have you memorized?
        </Text>
        <Text color="inkSoft" style={s.sub}>
          Tap any you know. You can add more on the Map.
        </Text>
      </View>
      <View style={{ alignItems: "center", paddingTop: space(2.5) }}>
        <AyahField
          width={width - MARGIN * 2}
          height={120}
          memorized={(i) => mask[i] === 1}
        />
      </View>
      <View style={s.chips}>
        {HIFZ_CHOICES.map((n) => {
          const on = chosen.has(n);
          const x = SURAHS[n - 1];
          return (
            <Pressable
              key={n}
              accessibilityRole="checkbox"
              accessibilityState={{ checked: on }}
              accessibilityLabel={x.en}
              onPress={() => toggle(n)}
            >
              <Glass
                interactive
                style={s.chip}
                tint={on ? theme.colors.saffron : undefined}
              >
                <Arabic variant="inline" color={on ? "paper" : "ink"}>
                  {x.ar}
                </Arabic>
                <Text
                  variant="label"
                  color={on ? "paper" : "inkSoft"}
                  numberOfLines={1}
                >
                  {x.en}
                </Text>
              </Glass>
            </Pressable>
          );
        })}
      </View>
    </ScrollView>
  );
}

/* ---------- Your map ---------- */

function YourMap({ chosen }: { chosen: Set<number> }) {
  const s = useStyles();
  const still = useReducedMotion();
  const { width, height } = useWindowDimensions();
  const mask = useMask(chosen);
  const ayahs = useMemo(() => mask.reduce((n, v) => n + v, 0), [mask]);

  /* A slow sweep through the mushaf that lights what they marked as it passes. */
  const [reach, setReach] = useState(still ? TOTAL_AYAHS : 0);
  useEffect(() => {
    if (still) return;
    const startAt = Date.now();
    const id = setInterval(() => {
      const f = Math.min(1, (Date.now() - startAt) / 1600);
      setReach(Math.round(TOTAL_AYAHS * f));
      if (f >= 1) clearInterval(id);
    }, 40);
    return () => clearInterval(id);
  }, [still]);

  return (
    <View
      style={{
        flex: 1,
        justifyContent: "center",
        alignItems: "center",
        gap: space(2),
      }}
    >
      <AyahField
        width={width - MARGIN * 2}
        height={height * 0.5}
        memorized={(i) => mask[i] === 1 && i < reach}
      />
      {chosen.size > 0 ? (
        <View style={s.counters}>
          <View style={s.counter}>
            <Text variant="numeral" style={s.numeral}>{`${chosen.size}`}</Text>
            <Text variant="label" color="inkSoft">
              {chosen.size === 1 ? "Surah memorized" : "Surahs memorized"}
            </Text>
          </View>
          <View style={s.counter}>
            <Text variant="numeral" style={s.numeral}>{`${ayahs}`}</Text>
            <Text variant="label" color="inkSoft">
              Ayahs memorized
            </Text>
          </View>
        </View>
      ) : (
        <Text color="inkSoft" style={s.sub}>
          Your map starts here.
        </Text>
      )}
    </View>
  );
}

/* ---------- the flow ---------- */

export default function Onboarding() {
  const s = useStyles();
  const theme = useTheme();
  const router = useRouter();
  const profileId = useSession((st) => st.activeProfileId);
  const completeOnboarding = useSession((st) => st.completeOnboarding);
  const setAdhkarReminder = usePrefs((st) => st.setAdhkarReminder);
  const savedName = usePrefs((st) => st.name);
  const setName = usePrefs((st) => st.setName);
  const [name, setNameDraft] = useState(savedName);
  const markSurahs = useQuranStatus((st) => st.markSurahs);
  const { isSignedIn } = useAuth();

  const [step, setStep] = useState<Step>("open");
  const [chosen, setChosen] = useState<Set<number>>(new Set());
  const [adhkar, setAdhkar] = useState(true);
  const [review, setReview] = useState(true);
  const [notify, setNotify] = useState(false);
  /* Where Back from sign in goes: reminders, or Open for "I have an account". */
  const [signinFrom, setSigninFrom] = useState<Step>("reminders");

  const toggle = useCallback((n: number) => {
    haptics.select();
    setChosen((prev) => {
      const next = new Set(prev);
      if (next.has(n)) next.delete(n);
      else next.add(n);
      return next;
    });
  }, []);

  /*
    Everything the flow collected, written in one go once there is an account.
    See src/onboarding/save.ts for the rules, which are tested there.
  */
  const finish = useCallback(
    async (opts?: {
      returning?: boolean;
      notifyNow?: boolean;
      from?: Step;
    }) => {
      if (profileId !== null) {
        await saveOnboarding(
          {
            hifz: [...chosen].sort((a, b) => a - b),
            adhkar,
            review,
            /* Passed straight through on the keychain path, where the state
             update from leaving reminders has not landed yet. */
            notify: opts?.notifyNow ?? notify,
            returning: opts?.returning ?? (opts?.from ?? signinFrom) === "open",
            /* `from` is passed on the keychain path, where setSigninFrom has
               not landed yet either. */
            askedReminders: (opts?.from ?? signinFrom) !== "open",
          },
          {
            updateSettings: (patch) => updateSettings(db, profileId, patch),
            setAdhkarReminder,
            markSurahs: (surahs) => markSurahs(surahs, true),
            syncReminders: () => syncReminders(db, profileId),
          },
        );
      }
      completeOnboarding();
      setStep("map");
    },
    [
      profileId,
      chosen,
      adhkar,
      review,
      notify,
      signinFrom,
      setAdhkarReminder,
      markSurahs,
      completeOnboarding,
    ],
  );

  /*
    A keychain restored session (the iOS keychain survives deleting the app) has
    nothing to sign in to, so it skips the gate and saves. Without this the app
    would ask to be set up on every launch.
  */
  const toSignin = useCallback(
    (from: Step, notifyNow?: boolean) => {
      setSigninFrom(from);
      if (afterReminders(!!isSignedIn) === "finish") {
        void finish({ returning: true, notifyNow, from });
        return;
      }
      setStep("signin");
    },
    [isSignedIn, finish],
  );

  /* Permission is asked as this step is LEFT, next to the question that motivates it. */
  const leaveReminders = useCallback(async () => {
    const granted = shouldAskPermission({ adhkar, review })
      ? await requestPermission()
      : false;
    setNotify(granted);
    toSignin("reminders", granted);
  }, [adhkar, review, toSignin]);

  if (step === "open") {
    return (
      <View style={s.safe}>
        <Open
          onBegin={() => setStep("story")}
          onAccount={() => toSignin("open")}
        />
      </View>
    );
  }

  if (step === "story") {
    return (
      <View style={s.safe}>
        <Story onDone={() => setStep("name")} />
      </View>
    );
  }

  return (
    <SafeAreaView style={s.safe} edges={["top", "bottom"]}>
      {step === "hifz" ? <WordField /> : null}
      <View style={s.pad}>
        <TopBar
          onBack={
            step === "name"
              ? () => setStep("story")
              : step === "hifz"
              ? () => setStep("name")
              : step === "reminders"
                ? () => setStep("hifz")
                : step === "signin"
                  ? () => setStep(signinFrom)
                  : undefined
          }
        />

        {/* A plain view, not a fade: these steps hold glass, and glass does not
            draw under an animated opacity. */}
        <View key={step} style={{ flex: 1 }}>
          {step === "name" ? (
            /* The keyboard must not cover the field, and tapping past it puts it away. */
            <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
              <TouchableWithoutFeedback onPress={Keyboard.dismiss} accessible={false}>
                <View style={{ flex: 1, justifyContent: "center", gap: space(3) }}>
                  <View style={s.heads}>
                    <Text variant="pageTitle" style={s.h1}>
                      What should we call you?
                    </Text>
                    <Text color="inkSoft" style={s.sub}>
                      So Durus can greet you by name.
                    </Text>
                  </View>
                  <Glass interactive style={s.nameField}>
                    <TextInput
                      value={name}
                      onChangeText={setNameDraft}
                      placeholder="Your first name"
                      placeholderTextColor={theme.colors.inkFaint}
                      autoCapitalize="words"
                      autoCorrect={false}
                      autoComplete="given-name"
                      textContentType="givenName"
                      returnKeyType="done"
                      maxLength={40}
                      onSubmitEditing={() => {
                        setName(name);
                        setStep("hifz");
                      }}
                      accessibilityLabel="Your first name"
                      style={s.nameInput}
                    />
                  </Glass>
                </View>
              </TouchableWithoutFeedback>
            </KeyboardAvoidingView>
          ) : null}

          {step === "hifz" ? <Hifz chosen={chosen} toggle={toggle} /> : null}

          {step === "reminders" ? (
            <View style={{ flex: 1, justifyContent: "center", gap: space(4) }}>
              <View style={s.heads}>
                <Text variant="pageTitle" style={s.h1}>
                  Two gentle reminders
                </Text>
              </View>
              <View style={{ gap: space(1.5) }}>
                {[
                  {
                    label: "Morning adhkar",
                    time: "6:00 AM",
                    value: adhkar,
                    set: setAdhkar,
                  },
                  {
                    label: "Daily review",
                    time: "9:00 AM",
                    value: review,
                    set: setReview,
                  },
                ].map((r) => (
                  <Glass key={r.label} style={s.row}>
                    <View style={{ gap: 2 }}>
                      <Text>{r.label}</Text>
                      <Text variant="label" color="inkSoft">
                        {r.time}
                      </Text>
                    </View>
                    <Switch
                      accessibilityLabel={r.label}
                      value={r.value}
                      onValueChange={r.set}
                      trackColor={{
                        true: theme.colors.lapis,
                        false: theme.colors.rule,
                      }}
                    />
                  </Glass>
                ))}
              </View>
            </View>
          ) : null}

          {step === "signin" ? (
            /* The keyboard must never cover the panel, and tapping past the
               field puts it away: this is the gate, so it cannot feel stuck. */
            <KeyboardAvoidingView
              style={{ flex: 1 }}
              behavior={Platform.OS === "ios" ? "padding" : undefined}
            >
              <TouchableWithoutFeedback
                onPress={Keyboard.dismiss}
                accessible={false}
              >
                <View
                  style={{ flex: 1, justifyContent: "center", gap: space(3) }}
                >
                  <View style={s.heads}>
                    <Text variant="pageTitle" style={s.h1}>
                      Keep your progress
                    </Text>
                    <Text color="inkSoft" style={s.sub}>
                      Your map, lessons and practice, saved if you change
                      phones.
                    </Text>
                  </View>
                  <Glass style={s.signCard}>
                    <SignInPanel onSignedIn={() => void finish()} />
                  </Glass>
                </View>
              </TouchableWithoutFeedback>
            </KeyboardAvoidingView>
          ) : null}

          {step === "map" ? <YourMap chosen={chosen} /> : null}
        </View>

        {/* The sign in step has nothing here: its only ways forward are in the
            panel, which is what makes it a gate. */}
        <View style={s.actions}>
          {step === "name" ? (
            <>
              <GlassButton
                label="Continue"
                primary
                onPress={() => {
                  setName(name);
                  setStep("hifz");
                }}
              />
              <Pressable accessibilityRole="button" onPress={() => setStep("hifz")} style={s.textButton}>
                <Text color="lapis">Skip</Text>
              </Pressable>
            </>
          ) : null}
          {step === "hifz" ? (
            <>
              <GlassButton
                label="Continue"
                primary
                onPress={() => setStep("reminders")}
              />
              <Pressable
                accessibilityRole="button"
                onPress={() => {
                  setChosen(new Set());
                  setStep("reminders");
                }}
                style={s.textButton}
              >
                <Text color="lapis">Skip</Text>
              </Pressable>
            </>
          ) : null}
          {step === "reminders" ? (
            <GlassButton
              label="Continue"
              primary
              onPress={() => void leaveReminders()}
            />
          ) : null}
          {step === "map" ? (
            <GlassButton
              label="Open Durus"
              primary
              onPress={() => router.replace(chosen.size > 0 ? "/map" : "/home")}
            />
          ) : null}
        </View>
      </View>
    </SafeAreaView>
  );
}
