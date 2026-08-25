import { useRouter } from "expo-router";
import { useState } from "react";
import { KeyboardAvoidingView, Platform, Switch, View } from "react-native";

import { Button } from "@/components/Button";
import { Stepper } from "@/components/Field";
import { Screen } from "@/components/Screen";
import { Text } from "@/components/Text";
import { db } from "@/data/client";
import { syncReminders } from "@/data/reminders";
import { updateSettings } from "@/data/settings";
import { TOTAL_LESSONS } from "@/engine/constants";
import { requestPermission } from "@/lib/notifications";
import { useSession } from "@/state/session";
import { space } from "@/theme/layout";
import { makeStyles, useTheme } from "@/theme/useTheme";

const useStyles = makeStyles(() => ({
  body: { flex: 1, justifyContent: "center", gap: space(2) },
  actions: { gap: space(1), paddingBottom: space(2) },
  dots: { flexDirection: "row", justifyContent: "center", gap: space(1), paddingBottom: space(2) },
  dot: { width: 6, height: 6, borderRadius: 999 },
}));

type Step = "what" | "lesson" | "reminder";
const ORDER: Step[] = ["what", "lesson", "reminder"];

/*
  Three questions, asked once.

  The web app opened on an unlock screen instead, because several people shared
  one browser. A phone does not have that problem, so the first run asks only
  the things the app genuinely cannot work out for itself: where the class has
  got to, and whether to send reminders.

  Signing in is NOT one of the questions. Everything works signed out, so
  putting an account in front of a textbook would be asking for something
  before having given anything.
*/
export default function Onboarding() {
  const s = useStyles();
  const theme = useTheme();
  const router = useRouter();
  const profileId = useSession((st) => st.activeProfileId);
  const completeOnboarding = useSession((st) => st.completeOnboarding);

  const [step, setStep] = useState<Step>("what");
  const [lesson, setLesson] = useState(1);
  const [reminders, setReminders] = useState(true);

  const index = ORDER.indexOf(step);

  const finish = async (withReminders: boolean) => {
    if (profileId !== null) {
      updateSettings(db, profileId, {
        currentLesson: lesson,
        remindersOn: withReminders,
      });
      if (withReminders) await syncReminders(db, profileId);
    }
    completeOnboarding();
    router.replace("/today");
  };

  return (
    <Screen>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <View style={s.body}>
          {step === "what" ? (
            <>
              <Text variant="eyebrow" color="inkSoft">
                Durus
              </Text>
              <Text variant="pageTitle">
                Revision for Madinah Arabic, Book 1.
              </Text>
              <Text color="inkSoft">
                It keeps the words from the lessons you have already covered in
                working memory, so the class is the only place you meet them for
                the first time.
              </Text>
              <Text color="inkSoft">
                You are never asked to rate yourself. Whether you were right
                comes from your answer, and how well you knew it comes from how
                long you took.
              </Text>
            </>
          ) : null}

          {step === "lesson" ? (
            <>
              <Text variant="eyebrow" color="inkSoft">
                Where you are
              </Text>
              <Text variant="pageTitle">
                Which lesson has the class covered?
              </Text>
              <Text color="inkSoft">
                Review only ever draws from lessons up to this one. You move it
                yourself after class - the app never unlocks a lesson on its
                own.
              </Text>
              <View style={{ alignItems: "center", paddingTop: space(2) }}>
                <Stepper
                  value={lesson}
                  min={1}
                  max={TOTAL_LESSONS}
                  onChange={setLesson}
                />
              </View>
            </>
          ) : null}

          {step === "reminder" ? (
            <>
              <Text variant="eyebrow" color="inkSoft">
                Reminders
              </Text>
              <Text variant="pageTitle">A nudge when something is due.</Text>
              <Text color="inkSoft">
                Two a day at most, and silent when nothing is waiting or you have
                just finished a session. No sound.
              </Text>
              <View
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  justifyContent: "space-between",
                  paddingTop: space(2),
                }}
              >
                <Text>Send reminders</Text>
                <Switch
                  value={reminders}
                  onValueChange={setReminders}
                  trackColor={{ true: theme.colors.lapis, false: theme.colors.rule }}
                />
              </View>
            </>
          ) : null}
        </View>

        <View style={s.dots}>
          {ORDER.map((k, i) => (
            <View key={k} style={[s.dot, { backgroundColor: i <= index ? theme.colors.lapis : theme.colors.rule }]} />
          ))}
        </View>

        <View style={s.actions}>
          <Button
            label={step === "reminder" ? "Start" : "Next"}
            onPress={async () => {
              if (step === "what") return setStep("lesson");
              if (step === "lesson") return setStep("reminder");

              /*
                The one place notification permission is ever requested, along
                with the Settings toggle. iOS gives exactly one chance, so it is
                spent on an explicit yes rather than on entering a screen.
              */
              if (reminders) {
                const granted = await requestPermission();
                await finish(granted);
                return;
              }
              await finish(false);
            }}
          />
          {step !== "what" ? (
            <Button
              label="Back"
              variant="text"
              onPress={() => setStep(ORDER[Math.max(0, index - 1)])}
            />
          ) : null}
        </View>
      </KeyboardAvoidingView>
    </Screen>
  );
}
