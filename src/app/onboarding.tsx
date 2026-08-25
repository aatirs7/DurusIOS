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
import { db } from "@/data/client";
import { countNewAvailable } from "@/data/queue";
import { syncReminders } from "@/data/reminders";
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
  the schedule.

  There is no "what should we call you?". It was asked, saved, overwritten by
  the Clerk name seconds later at the sign in step, and read by nothing: the
  screen promised it was "only used to greet you" and nothing greets. A
  question that buys nothing is worse than one fewer screen.

  Sign in is last and is the only step with no way past it. Everything before it
  is held in component state and thrown away if the app is closed early:
  nothing is written until there is an account to attach it to, so quitting
  halfway starts again rather than dropping someone into a half configured app.
*/
/*
  Two kinds of learner, and they are not the same product.

  Someone in a class does not choose what to study next: the syllabus does, and
  the app's job is to stay exactly level with it - which lesson the class is on,
  and nothing beyond it. Someone teaching themselves has the opposite problem.
  Nobody is telling them where to be, so what they need is a place to start and
  a pace to go at, and the app moves when they say so.

  Asking one question at the top and branching is cheaper than trying to write
  copy that is true for both. "Which lesson is your class on?" is meaningless to
  a self-teacher, and "how fast do you want to go?" is not a self-teacher's
  question when a teacher is already answering it.
*/
type LearnerPath = "class" | "self";

const CLASS_STEPS = [
  "intro",
  "path",
  "book",
  "lesson",
  "reminders",
  "signin",
  "done",
] as const;

/*
  The self path asks neither which book nor which lesson, and that is the point.

  Both are questions only a student in a class can answer. Somebody who wants to
  read Fusha and has never heard of the Madinah series cannot tell you which of
  its three volumes they are on, and asking them to pick a starting lesson is
  asking them to guess at the shape of a syllabus they have not seen. They also
  cannot meaningfully skip ahead: the books teach in order and Book 2 assumes
  Book 1, so the honest answer is the only correct one - start at the beginning
  and go in order.

  What they DO have to decide is how fast, because no teacher is deciding it for
  them. That is the one question a syllabus answers for everybody else, so it is
  the one question this path asks.
*/
const SELF_STEPS = ["intro", "path", "pace", "reminders", "signin", "done"] as const;

type Step = (typeof CLASS_STEPS)[number] | (typeof SELF_STEPS)[number];

/* Until the question is answered both lists agree, so the progress track does
   not jump when it is. */
function stepsFor(path: LearnerPath | null): readonly Step[] {
  return path === "self" ? SELF_STEPS : CLASS_STEPS;
}

const PATHS: { value: LearnerPath; label: string; hint: string }[] = [
  {
    value: "class",
    label: "I am taking a class",
    hint: "Keep level with the lesson your teacher is on",
  },
  {
    value: "self",
    label: "I am learning on my own",
    hint: "Start at the beginning and go at your own pace",
  },
];

/*
  How many new words a day, offered as three plain choices rather than a number.

  A self-teacher has to answer this and has no way to judge it in the abstract,
  so it is framed as an amount of time rather than a count - the count is what
  it writes, but "ten words" tells you nothing about your evening.
*/
const PACES: { label: string; hint: string; newPerDay: number }[] = [
  { label: "Steady", hint: "5 new words a day", newPerDay: 5 },
  { label: "Normal", hint: "10 new words a day", newPerDay: 10 },
  { label: "Quick", hint: "20 new words a day", newPerDay: 20 },
];

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
  /* A card that carries a line of explanation under its title. */
  cardStack: { alignItems: "center", gap: space(0.5) },
  cardHint: { textAlign: "center" },
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

/*
  A selectable card with a title and a line under it.

  The same shape as the book cards, because these are the same kind of
  question - one of a short list, chosen once - and giving each its own
  treatment would make three consecutive screens look like three different
  apps.
*/
function ChoiceCard({
  label,
  hint,
  selected,
  onPress,
  styles,
  tick,
}: {
  label: string;
  hint: string;
  selected: boolean;
  onPress: () => void;
  styles: ReturnType<typeof useStyles>;
  tick: React.ReactNode;
}) {
  return (
    <Pressable onPress={onPress} style={[styles.book, selected && styles.bookOn]}>
      <View style={styles.cardStack}>
        <Text variant="pageTitle" style={styles.bookLabel}>
          {label}
        </Text>
        <Text variant="label" color="inkSoft" style={styles.cardHint}>
          {hint}
        </Text>
      </View>
      <View style={styles.bookMark} pointerEvents="none">
        {selected ? tick : null}
      </View>
    </Pressable>
  );
}

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
  const [path, setPath] = useState<LearnerPath | null>(null);
  const [pace, setPace] = useState(10);
  const [book, setBook] = useState(1);
  const [lesson, setLesson] = useState(1);
  const [morning, setMorning] = useState(true);
  const [evening, setEvening] = useState(false);

  const steps = stepsFor(path);
  const index = steps.indexOf(step);

  /* One tick mark, shared by every card on every step. */
  const tick = (
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
  );

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
    setStep((current) => {
      const list = stepsFor(path);
      return list[Math.max(0, list.indexOf(current) - 1)];
    });
  }, [path]);

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
      updateSettings(db, profileId, {
        /*
          For the self path these are never asked and stay at their defaults of
          Book 1, Lesson 1 - which is the only correct answer for somebody
          starting from the beginning, and is why the questions are not asked.
        */
        currentBook: book,
        currentLesson: lesson,
        remindersOn: withReminders,
        secondReminderOn: evening,
        /*
          Both of these are what the path actually decides.

          The Wednesday nudge is about a class, so a self-teacher must not get
          it. The pace is the self-teacher's answer to a question a syllabus
          answers for everyone else, so the class path leaves newPerDay at
          whatever it already was.
        */
        classDayReminder: path === "class",
        ...(path === "self" ? { newPerDay: pace } : null),
      });
      if (withReminders) await syncReminders(db, profileId);
    },
    [profileId, book, lesson, evening, path, pace],
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
  const leaveSetup = useCallback(() => {
    if (isSignedIn) {
      void finish();
      return;
    }
    go("signin");
  }, [isSignedIn, finish, go]);

  /* Declared after leaveSetup because it calls it: the permission prompt is the
     last thing this step does, and where it goes next is that decision. */
  const leaveReminders = useCallback(async () => {
    setNotify(morning || evening ? await requestPermission() : false);
    leaveSetup();
  }, [morning, evening, leaveSetup]);

  return (
    <Screen>
      <WordField />
      <OnboardingChrome step={index} total={steps.length} onBack={canGoBack ? back : undefined} />

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
                    {/*
                      This screen comes BEFORE the flow forks, so it has to be
                      true for both people who see it. It used to say "the
                      vocabulary you have been taught", which quietly assumed a
                      class and told somebody arriving with no Arabic at all
                      that they were in the wrong place.

                      So it says what the app does rather than who it assumes
                      you are, and the last line names both ways in - which also
                      sets up the question on the next screen.
                    */}
                    <Text variant="pageTitle" style={s.h1}>
                      Learn the Madinah vocabulary, and keep it
                    </Text>
                    <Text color="inkSoft" style={s.sub}>
                      Durus drills the words the Madinah books teach and brings
                      each one back just before you would forget it. Follow a
                      class lesson by lesson, or start at the beginning on your
                      own.
                    </Text>
                  </View>
                  <View style={s.ticks}>
                    {Array.from({ length: TOTAL_LESSONS }, (_, i) => (
                      <View key={i} style={s.tick} />
                    ))}
                  </View>
                </View>
              ) : null}

              {step === "path" ? (
                <>
                  <View style={s.heads}>
                    <Text variant="pageTitle" style={s.h1}>
                      How are you learning?
                    </Text>
                    <Text color="inkSoft" style={s.sub}>
                      This decides what Durus asks you next.
                    </Text>
                  </View>
                  <View style={{ gap: space(1.5) }}>
                    {PATHS.map((option) => (
                      <ChoiceCard
                        key={option.value}
                        label={option.label}
                        hint={option.hint}
                        selected={path === option.value}
                        onPress={() => setPath(option.value)}
                        styles={s}
                        tick={tick}
                      />
                    ))}
                  </View>
                </>
              ) : null}

              {step === "pace" ? (
                <>
                  <View style={s.heads}>
                    <Text variant="pageTitle" style={s.h1}>
                      How fast do you want to go?
                    </Text>
                    <Text color="inkSoft" style={s.sub}>
                      How many new words arrive each day. You can change this
                      later.
                    </Text>
                  </View>
                  <View style={{ gap: space(1.5) }}>
                    {PACES.map((option) => (
                      <ChoiceCard
                        key={option.label}
                        label={option.label}
                        hint={option.hint}
                        selected={pace === option.newPerDay}
                        onPress={() => setPace(option.newPerDay)}
                        styles={s}
                        tick={tick}
                      />
                    ))}
                  </View>
                </>
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
                            b.number === book ? tick : null
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

              {step === "signin" ? (
                <>
                  <View style={s.heads}>
                    <Text variant="pageTitle" style={s.h1}>
                      One last thing
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
                      path === "self"
                        ? "Move to the next lesson when you are ready"
                        : "Add new words after class",
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
        {step === "intro" ? <Button label="Get started" onPress={() => go("path")} /> : null}
        {step === "path" ? (
          /* Disabled rather than defaulted. Guessing which of the two somebody
             is would send half of them down the wrong flow silently. */
          <Button
            label="Continue"
            disabled={path === null}
            onPress={() => go(path === "self" ? "pace" : "book")}
          />
        ) : null}
        {step === "book" ? <Button label="Continue" onPress={() => go("lesson")} /> : null}
        {step === "pace" ? <Button label="Continue" onPress={() => go("reminders")} /> : null}
        {step === "lesson" ? <Button label="Continue" onPress={() => go("reminders")} /> : null}
        {step === "reminders" ? (
          <Button label="Continue" onPress={() => void leaveReminders()} />
        ) : null}
        {step === "done" ? (
          <Button label="Start reviewing" onPress={() => router.replace("/today")} />
        ) : null}
      </View>
    </Screen>
  );
}
