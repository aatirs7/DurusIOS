import { useLocalSearchParams, useRouter } from "expo-router";
import { useMemo, useRef } from "react";
import { KeyboardAvoidingView, Platform } from "react-native";

import { BackBar } from "@/components/BackBar";
import { Button } from "@/components/Button";
import { Help, HelpButton, useHelp } from "@/components/Help";
import { Screen } from "@/components/Screen";
import { Text } from "@/components/Text";
import { bootOnce } from "@/data/boot";
import { db } from "@/data/client";
import { buildQuestions, buildQueue, type Question } from "@/data/queue";
import { syncReminders } from "@/data/reminders";
import { submitGrade } from "@/data/review";
import { getSettingsFor } from "@/data/settings";
import { ReviewSession } from "@/drills/ReviewSession";
import { haptics } from "@/lib/haptics";
import { useSession } from "@/state/session";
import { space } from "@/theme/layout";

export default function Review() {
  const router = useRouter();
  const profileId = useSession((st) => st.activeProfileId);
  const deviceId = useRef(bootOnce()).current;
  const help = useHelp("review");
  const params = useLocalSearchParams<{ lesson?: string; lessons?: string; deck?: string }>();

  /*
    Which lessons this run draws from. Absent means the scheduler picks across
    every open lesson, which is the normal path.

    Two parameters, because they arrive from two places: `lesson` is "drill this
    one" from a lesson page, and `lessons` is a chosen set from the picker. The
    singular one is kept rather than folded in, so a link someone saved or a
    deep link still works.
  */
  const chosen = useMemo(() => {
    const many = (params.lessons ?? "")
      .split(",")
      .map((n) => Number(n.trim()))
      .filter((n) => Number.isInteger(n) && n > 0);
    if (many.length) return many;
    const one = Number(params.lesson);
    return Number.isInteger(one) ? [one] : [];
  }, [params.lesson, params.lessons]);

  /*
    Built once, when the screen mounts. Rebuilding as answers land would
    reshuffle the deck under the user mid-session; the relearn bucket is handled
    inside the session component instead, because "earlier this session" is not
    a database fact.
  */
  const start = useMemo(() => {
    if (profileId === null) return null;
    const config = getSettingsFor(db, profileId);
    /* The numbers trainer drills through this same screen: same ladder, same
       grading, same writes. Only the deck it draws from differs. */
    const deck = params.deck === "numbers" ? "numbers" : "book";
    const queue = buildQueue(db, profileId, { lessonNumbers: chosen, deck });
    /* The distractor pool follows the queue: a lesson-only run should not offer
       options from lessons the drill never asks about. */
    const lessonNumbers = chosen.length
      ? chosen
      : Array.from({ length: config.currentLesson }, (_, i) => i + 1);
    const questions: Question[] = buildQuestions(db, queue, lessonNumbers);
    return { questions, showHarakat: config.showHarakat };
  }, [profileId, chosen, params.deck]);

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
      <BackBar label="Leave" right={<HelpButton onPress={help.show} />} />

      {/*
        The card, the input and the result all have to stay visible with the
        keyboard up on the smallest supported device. Test on an SE.
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
