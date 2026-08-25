import { useAuth } from "@clerk/clerk-expo";
import { useRouter } from "expo-router";
import { useCallback, useMemo, useState } from "react";
import {
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  Switch,
  TouchableWithoutFeedback,
  View,
} from "react-native";
import Animated, { FadeIn, FadeOut } from "react-native-reanimated";
import Svg, { Circle, Path } from "react-native-svg";

import { Arabic } from "@/components/Arabic";
import { Button } from "@/components/Button";
import { OnboardingChrome, WordField } from "@/components/OnboardingChrome";
import { Screen } from "@/components/Screen";
import { SignInPanel } from "@/components/SignIn";
import { Text } from "@/components/Text";
import { TextField } from "@/components/TextField";
import { db } from "@/data/client";
import { countNewAvailable } from "@/data/queue";
import { syncReminders } from "@/data/reminders";
import { setProfileName } from "@/data/session";
import { updateSettings } from "@/data/settings";
import { TOTAL_LESSONS } from "@/engine/constants";
import { requestPermission } from "@/lib/notifications";
import { useSession } from "@/state/session";
import { RADIUS, TICK, space } from "@/theme/layout";
import { textStyles } from "@/theme/typography";
import { makeStyles, useTheme } from "@/theme/useTheme";

/*
  The order is deliberate, and it is not the order these questions were first
  written in.

  It opens by saying what the app is, because a stranger who has just tapped an
  icon has been told nothing yet, and "what should we call you?" as a first
  screen reads as a form rather than as an introduction. Then the two questions
  that decide what the app will actually show - the book and the lesson - then
  the schedule, then the name, which is the least consequential of the four
  answers and the one most likely to be given carelessly if it is asked first.

  Sign in is last and is the only step with no way past it. Everything before it
  is held in component state and thrown away if the app is closed early:
  nothing is written until there is an account to attach it to, so quitting
  halfway starts again rather than dropping someone into a half configured app.
*/
const STEPS = ["intro", "book", "lesson", "reminders", "name", "signin", "done"] as const;
type Step = (typeof STEPS)[number];

/*
  Three books eventually. Only the first has content, and the other two say so
  rather than being hidden - someone on Book 2 should be able to see that the
  app knows Book 2 exists.

  Named in full. "Book 1" on its own is only unambiguous to somebody who already
  knows which series this is, which is exactly the reader this screen cannot
  assume it has.
*/
const BOOKS = [
  { number: 1, label: "Madinah Book 1", available: true },
  { number: 2, label: "Madinah Book 2", available: false },
  { number: 3, label: "Madinah Book 3", available: false },
];

const useStyles = makeStyles((t) => ({
  body: { flex: 1, justifyContent: "center", gap: space(3) },
  heads: { alignItems: "center", gap: space(1) },
  h1: { fontSize: 30, lineHeight: 38, textAlign: "center" },
  sub: { textAlign: "center", maxWidth: 320 },

  actions: { gap: space(1), paddingBottom: space(1) },

  /* Intro. */
  hero: { alignItems: "center", gap: space(4) },
  ticks: { flexDirection: "row", justifyContent: "center", gap: TICK.gap },
  tick: {
    width: TICK.width,
    height: TICK.height,
    borderRadius: 999,
    backgroundColor: t.colors.rule,
  },

  /*
    Book cards. A selectable surface, not a button: softer radius, and the
    selected state is a border plus a tick rather than a fill.

    The label is centred in the card and the tick is absolutely positioned over
    it, so the title sits on the card's true centre line rather than on the
    centre of whatever space the tick left behind - which is what made the
    selected row look shunted left against the two below it.
  */
  book: {
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1.5,
    borderColor: t.colors.rule,
    borderRadius: RADIUS.field,
    backgroundColor: t.colors.surface,
    paddingHorizontal: space(6),
    paddingVertical: space(2),
    minHeight: 64,
  },
  bookOn: { borderColor: t.colors.lapis, backgroundColor: t.colors.lapisWash },
  bookOff: { opacity: 0.55 },
  bookLabel: { fontSize: 20, textAlign: "center" },
  bookMark: {
    position: "absolute",
    right: space(2.5),
    top: 0,
    bottom: 0,
    justifyContent: "center",
  },
  soon: {
    borderWidth: 1,
    borderColor: t.colors.rule,
    borderRadius: RADIUS.pill,
    paddingHorizontal: space(1.25),
    paddingVertical: 2,
  },

  /* Lesson picker. */
  stripWrap: { alignItems: "center", gap: space(2) },
  strip: { flexDirection: "row", justifyContent: "center", gap: 4, alignItems: "flex-end" },
  bar: { width: 3, height: 28, borderRadius: 999 },
  stepper: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: space(3),
  },
  round: {
    width: 48,
    height: 48,
    borderRadius: 999,
    borderWidth: 1.5,
    borderColor: t.colors.rule,
    alignItems: "center",
    justifyContent: "center",
  },
  /*
    lineHeight has to be restated wherever fontSize is.

    textStyles.numeral carries a lineHeight computed for its own 40pt size, so
    overriding the size alone leaves the line box too short for the glyph and
    the digit is clipped off at the waist. Any resize of a shared text style
    moves both numbers together.
  */
  big: {
    ...textStyles.numeral,
    fontSize: 72,
    lineHeight: 84,
    color: t.colors.ink,
    textAlign: "center",
    minWidth: 120,
  },

  /* Reminder rows. */
  row: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderWidth: 1.5,
    borderColor: t.colors.rule,
    borderRadius: RADIUS.field,
    backgroundColor: t.colors.surface,
    paddingHorizontal: space(2.5),
    paddingVertical: space(1.75),
    gap: space(2),
  },
  time: { ...textStyles.numeral, fontSize: 17, color: t.colors.inkSoft },

  /* Done. */
  ring: { alignItems: "center", justifyContent: "center", height: 200 },
  ringMark: { position: "absolute" },
  bullets: { gap: space(1), alignSelf: "center" },
  bullet: { flexDirection: "row", alignItems: "center", gap: space(1.5) },
  dot: { width: 5, height: 5, borderRadius: 999, backgroundColor: t.colors.lapis },
}));

function hourLabel(h: number): string {
  const suffix = h < 12 ? "AM" : "PM";
  const twelve = h % 12 === 0 ? 12 : h % 12;
  return `${twelve}:00 ${suffix}`;
}

export default function Onboarding() {
  const s = useStyles();
  const theme = useTheme();
  const router = useRouter();
  const profileId = useSession((st) => st.activeProfileId);
  const completeOnboarding = useSession((st) => st.completeOnboarding);
  const { isSignedIn } = useAuth();

  const [step, setStep] = useState<Step>("intro");
  const [name, setName] = useState("");
  const [book, setBook] = useState(1);
  const [lesson, setLesson] = useState(1);
  const [morning, setMorning] = useState(true);
  const [evening, setEvening] = useState(false);

  const index = STEPS.indexOf(step);

  const go = useCallback((next: Step) => {
    Keyboard.dismiss();
    setStep(next);
  }, []);

  /*
    Back is available on every step that is still a question, and nowhere else.

    Not on the intro, because there is nothing behind it. Not on the last
    screen, because by then the account exists and the answers have been
    written, so stepping back would offer to redo something that has already
    taken effect.
  */
  const canGoBack = index > 0 && step !== "done";
  const back = useCallback(() => {
    Keyboard.dismiss();
    setStep((current) => STEPS[Math.max(0, STEPS.indexOf(current) - 1)]);
  }, []);

  /* Read from the content rather than written into the copy, so a new lesson
     never leaves a number stale on this screen. */
  const waiting = useMemo(() => {
    if (profileId === null) return 0;
    return countNewAvailable(db, profileId, lesson);
  }, [profileId, lesson]);

  /*
    Everything the flow collected, written in one go once there is an account.

    Deferring the write is what makes quitting halfway a clean restart: until
    this runs there is no record that onboarding was ever begun, so the next
    launch asks again from the top instead of resuming into a partly configured
    app.
  */
  const save = useCallback(
    async (withReminders: boolean) => {
      if (profileId === null) return;
      setProfileName(db, profileId, name);
      updateSettings(db, profileId, {
        currentBook: book,
        currentLesson: lesson,
        remindersOn: withReminders,
        secondReminderOn: evening,
      });
      if (withReminders) await syncReminders(db, profileId);
    },
    [profileId, name, book, lesson, evening],
  );

  /*
    Permission is asked as this step is LEFT, not later when everything is
    saved.

    iOS gives exactly one chance at the prompt, and it only makes sense next to
    the question that motivates it. Asking at the end instead meant the system
    dialog appeared moments after signing in, with nothing on screen to explain
    what it was for. The answer is carried to the save rather than re-asked.
  */
  const [notify, setNotify] = useState(false);
  const leaveReminders = useCallback(async () => {
    setNotify(morning || evening ? await requestPermission() : false);
    go("name");
  }, [morning, evening, go]);

  const finish = useCallback(async () => {
    await save(notify);
    completeOnboarding();
    go("done");
  }, [notify, save, completeOnboarding, go]);

  /*
    Leaving the name step. Two ways out, and BOTH have to end up saving.

    Being already signed in on a first launch is not the edge case it looks
    like: expo-secure-store keeps Clerk's token in the iOS keychain, and the
    keychain survives deleting the app. So a reinstall comes back already
    authenticated, the sign in step has nothing to ask, and the flow skips it.

    That skip used to go straight to "done" without calling finish(), which
    meant onboarding never recorded itself and never wrote the book, the lesson
    or the reminders. The symptom was not a missing save - it was the app
    asking every single launch to be set up again, because onboardedAt was
    still null, and never showing a sign in screen, because there was nothing
    to sign in to.
  */
  const leaveName = useCallback(() => {
    if (isSignedIn) {
      void finish();
      return;
    }
    go("signin");
  }, [isSignedIn, finish, go]);

  return (
    <Screen>
      <WordField />
      <OnboardingChrome step={index} total={STEPS.length} onBack={canGoBack ? back : undefined} />

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        {/*
          Tapping the background puts the keyboard away.

          Without it the only way out of the name field is the keyboard's own
          return key, which leaves the field looking stuck to anyone who taps
          past it - and the keyboard is covering the button they are reaching
          for.
        */}
        <TouchableWithoutFeedback onPress={Keyboard.dismiss} accessible={false}>
          {/*
            Each step crossfades in place rather than sliding the whole screen.
            The wordmark and the progress track never move, so the frame reads
            as one screen asking successive questions rather than seven screens.
          */}
          <Animated.View
            key={step}
            entering={FadeIn.duration(220)}
            exiting={FadeOut.duration(120)}
            style={{ flex: 1 }}
          >
            <View style={s.body}>
              {step === "intro" ? (
                <View style={s.hero}>
                  <Arabic variant="card" color="lapis">
                    دُرُوس
                  </Arabic>
                  <View style={s.heads}>
                    <Text variant="pageTitle" style={s.h1}>
                      Arabic revision for Madinah Book 1
                    </Text>
                    {/*
                      What the app is for, rather than what it contains. A
                      lesson count ages the moment content is added, and tells a
                      new reader nothing about why they would open it.
                    */}
                    <Text color="inkSoft" style={s.sub}>
                      The vocabulary you have been taught, brought back just
                      before you forget it.
                    </Text>
                  </View>
                  <View style={s.ticks}>
                    {Array.from({ length: TOTAL_LESSONS }, (_, i) => (
                      <View key={i} style={s.tick} />
                    ))}
                  </View>
                </View>
              ) : null}

              {step === "book" ? (
                <>
                  <View style={s.heads}>
                    <Text variant="pageTitle" style={s.h1}>
                      Which book are you on?
                    </Text>
                    <Text color="inkSoft" style={s.sub}>
                      You can change this later.
                    </Text>
                  </View>
                  <View style={{ gap: space(1.5) }}>
                    {BOOKS.map((b) => (
                      <Pressable
                        key={b.number}
                        disabled={!b.available}
                        onPress={() => setBook(b.number)}
                        style={[
                          s.book,
                          b.number === book && b.available && s.bookOn,
                          !b.available && s.bookOff,
                        ]}
                      >
                        <Text variant="pageTitle" style={s.bookLabel}>
                          {b.label}
                        </Text>
                        <View style={s.bookMark} pointerEvents="none">
                          {b.available ? (
                            b.number === book ? (
                              <Svg width={22} height={22} viewBox="0 0 24 24">
                                <Circle cx={12} cy={12} r={11} fill={theme.colors.lapis} />
                                <Path
                                  d="M7 12.5l3.2 3.2L17 9"
                                  stroke={theme.colors.paper}
                                  strokeWidth={2}
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  fill="none"
                                />
                              </Svg>
                            ) : null
                          ) : (
                            <View style={s.soon}>
                              <Text variant="eyebrow" color="inkFaint">
                                Soon
                              </Text>
                            </View>
                          )}
                        </View>
                      </Pressable>
                    ))}
                  </View>
                </>
              ) : null}

              {step === "lesson" ? (
                <>
                  <View style={s.heads}>
                    <Text variant="pageTitle" style={s.h1}>
                      Which lesson is your class on?
                    </Text>
                    <Text color="inkSoft" style={s.sub}>
                      Nothing appears before you have been taught it.
                    </Text>
                  </View>

                  <View style={s.stripWrap}>
                    {/* The same ticks Today uses, so the shape of the book is
                        familiar before it is ever seen. */}
                    <View style={s.strip}>
                      {Array.from({ length: TOTAL_LESSONS }, (_, i) => (
                        <View
                          key={i}
                          /*
                            One height for every tick. Growing the filled ones
                            makes the strip lurch as the number changes, and it
                            reads as two different scales rather than as one
                            scale being filled in. Colour carries the state.
                          */
                          style={[
                            s.bar,
                            {
                              backgroundColor:
                                i < lesson ? theme.colors.lapis : theme.colors.rule,
                            },
                          ]}
                        />
                      ))}
                    </View>

                    <View style={{ alignItems: "center" }}>
                      <Text variant="eyebrow" color="inkSoft">
                        Lesson
                      </Text>
                      <View style={s.stepper}>
                        <Pressable
                          style={s.round}
                          accessibilityRole="button"
                          accessibilityLabel="Previous lesson"
                          onPress={() => setLesson((n) => Math.max(1, n - 1))}
                        >
                          <Text style={{ fontSize: 22 }}>−</Text>
                        </Pressable>
                        <Text style={s.big}>{String(lesson)}</Text>
                        <Pressable
                          style={s.round}
                          accessibilityRole="button"
                          accessibilityLabel="Next lesson"
                          onPress={() => setLesson((n) => Math.min(TOTAL_LESSONS, n + 1))}
                        >
                          <Text style={{ fontSize: 22 }}>+</Text>
                        </Pressable>
                      </View>
                    </View>
                  </View>
                </>
              ) : null}

              {step === "reminders" ? (
                <>
                  <View style={s.heads}>
                    <Text variant="pageTitle" style={s.h1}>
                      When should we remind you?
                    </Text>
                    {/*
                      A reminder is a time to sit down, not a report on the
                      queue. This says what it will do and makes no promise
                      about staying quiet, because it no longer does.
                    */}
                    <Text color="inkSoft" style={s.sub}>
                      Pick one or two times a day. You can change these later.
                    </Text>
                  </View>

                  <View style={{ gap: space(1.5) }}>
                    <View style={s.row}>
                      <Text>Morning</Text>
                      <View style={{ flexDirection: "row", alignItems: "center", gap: space(2) }}>
                        <Text style={s.time}>{hourLabel(9)}</Text>
                        <Switch
                          value={morning}
                          onValueChange={setMorning}
                          trackColor={{ true: theme.colors.lapis, false: theme.colors.rule }}
                        />
                      </View>
                    </View>

                    <View style={s.row}>
                      <Text>Evening</Text>
                      <View style={{ flexDirection: "row", alignItems: "center", gap: space(2) }}>
                        <Text style={s.time}>{hourLabel(20)}</Text>
                        <Switch
                          value={evening}
                          onValueChange={setEvening}
                          trackColor={{ true: theme.colors.lapis, false: theme.colors.rule }}
                        />
                      </View>
                    </View>
                  </View>
                </>
              ) : null}

              {step === "name" ? (
                <>
                  <View style={s.heads}>
                    <Text variant="pageTitle" style={s.h1}>
                      What should we call you?
                    </Text>
                    <Text color="inkSoft" style={s.sub}>
                      Only used to greet you.
                    </Text>
                  </View>
                  <TextField
                    value={name}
                    onChangeText={setName}
                    placeholder="Your name"
                    autoCapitalize="words"
                    autoCorrect={false}
                    returnKeyType="done"
                    centered
                    onSubmitEditing={leaveName}
                  />
                </>
              ) : null}

              {step === "signin" ? (
                <>
                  <View style={s.heads}>
                    <Text variant="pageTitle" style={s.h1}>
                      {name.trim() === "" ? "One last thing" : `Nearly there, ${name.trim()}`}
                    </Text>
                    <Text color="inkSoft" style={s.sub}>
                      An account is what keeps your progress if you lose this
                      phone.
                    </Text>
                  </View>
                  <SignInPanel onSignedIn={finish} />
                </>
              ) : null}

              {step === "done" ? (
                <>
                  <View style={s.ring}>
                    <Svg width={200} height={200}>
                      <Circle
                        cx={100}
                        cy={100}
                        r={92}
                        stroke={theme.colors.lapis}
                        strokeWidth={1.5}
                        fill="none"
                        opacity={0.55}
                      />
                    </Svg>
                    <View style={s.ringMark}>
                      <Arabic variant="card" color="lapis">
                        دُرُوس
                      </Arabic>
                    </View>
                  </View>

                  <View style={s.heads}>
                    <Text variant="pageTitle" style={s.h1}>
                      You&apos;re set
                    </Text>
                  </View>

                  <View style={s.bullets}>
                    {[
                      waiting > 0
                        ? `${waiting} ${waiting === 1 ? "word" : "words"} from Lesson ${lesson} and earlier`
                        : `Lesson ${lesson} and everything before it`,
                      "Reviews start today",
                      "Add new words after class",
                    ].map((line) => (
                      <View key={line} style={s.bullet}>
                        <View style={s.dot} />
                        <Text color="inkSoft">{line}</Text>
                      </View>
                    ))}
                  </View>
                </>
              ) : null}
            </View>
          </Animated.View>
        </TouchableWithoutFeedback>
      </KeyboardAvoidingView>

      {/*
        One button per step, and no way to skip any of them.

        The sign in step deliberately has nothing here: its only ways forward
        are the three in the panel above, which is what makes it a gate rather
        than a suggestion.
      */}
      <View style={s.actions}>
        {step === "intro" ? <Button label="Get started" onPress={() => go("book")} /> : null}
        {step === "book" ? <Button label="Continue" onPress={() => go("lesson")} /> : null}
        {step === "lesson" ? <Button label="Continue" onPress={() => go("reminders")} /> : null}
        {step === "reminders" ? (
          <Button label="Continue" onPress={() => void leaveReminders()} />
        ) : null}
        {step === "name" ? (
          <Button label="Continue" onPress={leaveName} />
        ) : null}
        {step === "done" ? (
          <Button label="Start reviewing" onPress={() => router.replace("/today")} />
        ) : null}
      </View>
    </Screen>
  );
}
