import { useRouter } from "expo-router";
import { useCallback, useMemo, useState } from "react";
import { KeyboardAvoidingView, Platform, Pressable, Switch, View } from "react-native";
import Animated, { FadeIn, FadeOut } from "react-native-reanimated";
import Svg, { Circle, Path } from "react-native-svg";

import { Arabic } from "@/components/Arabic";
import { Button } from "@/components/Button";
import { OnboardingChrome, WordField } from "@/components/OnboardingChrome";
import { Screen } from "@/components/Screen";
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
import { RADIUS, space } from "@/theme/layout";
import { textStyles } from "@/theme/typography";
import { makeStyles, useTheme } from "@/theme/useTheme";

const STEPS = ["name", "book", "lesson", "reminders", "done"] as const;
type Step = (typeof STEPS)[number];

/*
  Three books eventually. Only the first has content, and the other two say so
  rather than being hidden - someone on Book 2 should be able to see that the
  app knows Book 2 exists.

  Lesson counts are read from the content, never written in prose, so adding a
  book or a lesson never leaves a number stale somewhere in the copy.
*/
const BOOKS = [
  { number: 1, label: "Book 1", available: true },
  { number: 2, label: "Book 2", available: false },
  { number: 3, label: "Book 3", available: false },
];

const useStyles = makeStyles((t) => ({
  body: { flex: 1, justifyContent: "center", gap: space(3) },
  heads: { alignItems: "center", gap: space(1) },
  h1: { fontSize: 30, lineHeight: 38, textAlign: "center" },
  sub: { textAlign: "center", maxWidth: 320 },

  actions: { gap: space(1), paddingBottom: space(1) },

  /* Book cards. A selectable surface, not a button: softer radius, and the
     selected state is a border plus a tick rather than a fill. */
  book: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderWidth: 1.5,
    borderColor: t.colors.rule,
    borderRadius: RADIUS.field,
    backgroundColor: t.colors.surface,
    paddingHorizontal: space(2.5),
    paddingVertical: space(2),
    gap: space(2),
  },
  bookOn: { borderColor: t.colors.lapis, backgroundColor: t.colors.lapisWash },
  bookOff: { opacity: 0.55 },
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
  bar: { width: 3, borderRadius: 999 },
  stepper: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: space(3) },
  round: {
    width: 48,
    height: 48,
    borderRadius: 999,
    borderWidth: 1.5,
    borderColor: t.colors.rule,
    alignItems: "center",
    justifyContent: "center",
  },
  big: { ...textStyles.numeral, fontSize: 72, color: t.colors.ink, textAlign: "center", minWidth: 120 },

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

  const [step, setStep] = useState<Step>("name");
  const [name, setName] = useState("");
  const [book, setBook] = useState(1);
  const [lesson, setLesson] = useState(1);
  const [morning, setMorning] = useState(true);
  const [evening, setEvening] = useState(false);
  const [classNudge, setClassNudge] = useState(true);

  const index = STEPS.indexOf(step);
  const go = useCallback((next: Step) => setStep(next), []);

  /* Read from the content rather than written into the copy, so a new lesson
     never leaves a number stale on this screen. */
  const waiting = useMemo(() => {
    if (profileId === null) return 0;
    return countNewAvailable(db, profileId, lesson);
  }, [profileId, lesson]);

  const save = useCallback(
    async (withReminders: boolean) => {
      if (profileId === null) return;
      setProfileName(db, profileId, name);
      updateSettings(db, profileId, {
        currentBook: book,
        currentLesson: lesson,
        remindersOn: withReminders,
        secondReminderOn: evening,
        classDayReminder: classNudge,
      });
      if (withReminders) await syncReminders(db, profileId);
    },
    [profileId, name, book, lesson, evening, classNudge],
  );

  return (
    <Screen>
      <WordField />
      <OnboardingChrome step={index} total={STEPS.length} />

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        {/*
          Each step crossfades in place rather than sliding the whole screen.
          The wordmark and the progress track never move, so the frame reads as
          one screen asking successive questions rather than five screens.
        */}
        <Animated.View
          key={step}
          entering={FadeIn.duration(220)}
          exiting={FadeOut.duration(120)}
          style={{ flex: 1 }}
        >
          <View style={s.body}>
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
                  returnKeyType="next"
                  onSubmitEditing={() => go("book")}
                />
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
                      <Text variant="pageTitle" style={{ fontSize: 20 }}>
                        {b.label}
                      </Text>
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
                  {/* The strip is the same twenty three ticks Today uses, so the
                      shape of the book is familiar before it is ever seen. */}
                  <View style={s.strip}>
                    {Array.from({ length: TOTAL_LESSONS }, (_, i) => (
                      <View
                        key={i}
                        style={[
                          s.bar,
                          {
                            height: i < lesson ? 30 : 20,
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
                        onPress={() => setLesson((n) => Math.max(1, n - 1))}
                      >
                        <Text style={{ fontSize: 22 }}>−</Text>
                      </Pressable>
                      <Text style={s.big}>{String(lesson)}</Text>
                      <Pressable
                        style={s.round}
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
                  <Text color="inkSoft" style={s.sub}>
                    Only when cards are actually due. Nothing is sent on a clear
                    day.
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

                  <View style={s.row}>
                    <Text>Wednesday class nudge</Text>
                    <Switch
                      value={classNudge}
                      onValueChange={setClassNudge}
                      trackColor={{ true: theme.colors.saffron, false: theme.colors.rule }}
                    />
                  </View>
                </View>
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
      </KeyboardAvoidingView>

      <View style={s.actions}>
        {step === "name" ? (
          <>
            <Button label="Continue" onPress={() => go("book")} />
            <Button label="Skip" variant="text" onPress={() => go("book")} />
          </>
        ) : null}

        {step === "book" ? <Button label="Continue" onPress={() => go("lesson")} /> : null}
        {step === "lesson" ? <Button label="Continue" onPress={() => go("reminders")} /> : null}

        {step === "reminders" ? (
          <>
            <Button
              label="Turn on reminders"
              onPress={async () => {
                /* The one place permission is asked, along with the Settings
                   toggle. iOS gives exactly one chance. */
                const granted = morning || evening ? await requestPermission() : false;
                await save(granted);
                go("done");
              }}
            />
            <Button
              label="Not now"
              variant="text"
              onPress={async () => {
                await save(false);
                go("done");
              }}
            />
          </>
        ) : null}

        {step === "done" ? (
          <Button
            label="Start reviewing"
            onPress={() => {
              completeOnboarding();
              /* Signing in comes after the setup, not before it: the app is
                 already usable by this point, so an account is offered for what
                 it buys rather than as a gate. */
              router.replace("/welcome");
            }}
          />
        ) : null}
      </View>
    </Screen>
  );
}
