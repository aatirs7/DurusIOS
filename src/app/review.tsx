import { useLocalSearchParams, useRouter } from "expo-router";
import { useMemo, useRef } from "react";
import { KeyboardAvoidingView, Platform, Pressable, View } from "react-native";
import Svg, { Path } from "react-native-svg";

import { Button } from "@/components/Button";
import { Help, useHelp } from "@/components/Help";
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
import { makeStyles, useTheme } from "@/theme/useTheme";

const useStyles = makeStyles(() => ({
  /*
    A back chevron and a "?" on their own row, the way the web sets it. The mode
    eyebrow belongs with the card below rather than up here competing with the
    controls.
  */
  header: {
    height: 40,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  hit: { width: 44, height: 40, justifyContent: "center" },
}));

export default function Review() {
  const s = useStyles();
  const theme = useTheme();
  const router = useRouter();
  const profileId = useSession((st) => st.activeProfileId);
  const deviceId = useRef(bootOnce()).current;
  const help = useHelp("review");
  const params = useLocalSearchParams<{ lesson?: string }>();

  /* "Drill this lesson only", from a lesson page. Absent means the scheduler
     picks across every open lesson, which is the normal path. */
  const lessonOnly = Number(params.lesson);
  const lessonNumber = Number.isInteger(lessonOnly) ? lessonOnly : undefined;

  /*
    Built once, when the screen mounts. Rebuilding as answers land would
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
      <View style={s.header}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Leave this session"
          hitSlop={12}
          style={s.hit}
          onPress={() => (router.canGoBack() ? router.back() : router.replace("/today"))}
        >
          {/* A chevron, not the word "Done". Leaving costs nothing: every
              answer was written the moment it was given. */}
          <Svg width={22} height={22} viewBox="0 0 24 24" fill="none">
            <Path
              d="M15 5l-7 7 7 7"
              stroke={theme.colors.inkSoft}
              strokeWidth={1.6}
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </Svg>
        </Pressable>

        <Pressable
          accessibilityRole="button"
          accessibilityLabel="How this drill works"
          hitSlop={12}
          style={[s.hit, { alignItems: "flex-end" }]}
          onPress={help.show}
        >
          <Text color="inkFaint" style={{ fontSize: 20 }}>
            ?
          </Text>
        </Pressable>
      </View>

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
