import { useLocalSearchParams, useRouter } from "expo-router";
import { useMemo, useRef } from "react";
import { KeyboardAvoidingView, Platform } from "react-native";

import { Button } from "@/components/Button";
import { Screen } from "@/components/Screen";
import { Text } from "@/components/Text";
import { bootOnce } from "@/data/boot";
import { db } from "@/data/client";
import { buildQuestions, buildQueue, type Question } from "@/data/queue";
import { syncReminders } from "@/data/reminders";
import { submitGrade, undoGrade } from "@/data/review";
import { getSettingsFor } from "@/data/settings";
import { Help, useHelp } from "@/components/Help";
import { ReviewSession } from "@/drills/ReviewSession";
import { haptics } from "@/lib/haptics";
import { useSession } from "@/state/session";
import { space } from "@/theme/layout";

export default function Review() {
  const router = useRouter();
  const profileId = useSession((s) => s.activeProfileId);
  const deviceId = useRef(bootOnce()).current;
  const help = useHelp("review");
  const params = useLocalSearchParams<{ lesson?: string }>();
  /* "Drill this lesson only", from a lesson page. Absent means the scheduler
     picks across every open lesson, which is the normal path. */
  const lessonOnly = Number(params.lesson);
  const lessonNumber = Number.isInteger(lessonOnly) ? lessonOnly : undefined;

  /*
    Built once, when the screen mounts. Rebuilding it as answers land would
    reshuffle the deck under the user mid-session; the relearn bucket is handled
    inside the session component instead, because "earlier this session" is not
    a database fact.
  */
  const start = useMemo(() => {
    if (profileId === null) return null;
    const config = getSettingsFor(db, profileId);
    const queue = buildQueue(db, profileId, { lessonNumber });
    /* The distractor pool follows the queue: a lesson-only run should not offer
       options from lessons the drill never asks about. */
    const lessonNumbers = lessonNumber
      ? [lessonNumber]
      : Array.from({ length: config.currentLesson }, (_, i) => i + 1);
    const questions: Question[] = buildQuestions(db, queue, lessonNumbers);
    return { questions, showHarakat: config.showHarakat };
  }, [profileId, lessonNumber]);

  if (profileId === null || !start) return null;

  if (start.questions.length === 0) {
    return (
      <Screen>
        <Text variant="pageTitle">Nothing to review.</Text>
        <Text color="inkSoft" style={{ marginTop: space(1) }}>
          Add a lesson from Today when your class covers one.
        </Text>
        <Button
          label="Back to today"
          variant="quiet"
          style={{ marginTop: space(3) }}
          onPress={() => router.back()}
        />
      </Screen>
    );
  }

  return (
    <Screen>
      {/*
        The card, the input and the result band all have to stay visible with
        the keyboard up on the smallest supported device. Test on an SE.
      */}
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <ReviewSession
          questions={start.questions}
          showHarakat={start.showHarakat}
          onAnswer={(q, grade, msToAnswer) => {
            if (!deviceId.ok) return;
            submitGrade(db, profileId, deviceId.deviceId, {
              cardId: q.cardId,
              direction: q.direction,
              grade,
              msToAnswer,
              practice: q.practice,
            });
          }}
          onUndo={(q) => {
            undoGrade(db, profileId, { cardId: q.cardId, direction: q.direction });
          }}
          onHelp={help.show}
          onDone={() => {
            haptics.sessionComplete();
            /*
              Rebuilding the notification window here is what implements "do not
              nudge someone who has just finished": the next slot simply has
              nothing due by it any more and drops out of the plan.
            */
            void syncReminders(db, profileId);
            router.back();
          }}
        />
      </KeyboardAvoidingView>
      <Help topic="review" open={help.open} onClose={help.close} />
    </Screen>
  );
}
