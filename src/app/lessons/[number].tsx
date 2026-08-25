import { eq } from "drizzle-orm";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useMemo, useState } from "react";
import { Pressable, ScrollView, Text as RNText, View } from "react-native";
import Animated, { FadeIn, FadeOut } from "react-native-reanimated";

import { Arabic } from "@/components/Arabic";
import { BackBar } from "@/components/BackBar";
import { Button } from "@/components/Button";
import { Rule } from "@/components/Field";
import { Screen } from "@/components/Screen";
import { Text } from "@/components/Text";
import { db } from "@/data/client";
import { getDeck } from "@/data/drills";
import { lessons } from "@/data/schema";
import { getSettingsFor } from "@/data/settings";
import { MATURITY_TOKEN, maturityOf } from "@/engine/constants";
import { segmentRuns, splitNote } from "@/engine/note";
import { useSession } from "@/state/session";
import { RADIUS, space } from "@/theme/layout";
import { arabicStyles, textStyles } from "@/theme/typography";
import { makeStyles, useTheme } from "@/theme/useTheme";

const useStyles = makeStyles((t) => ({
  head: { gap: space(1.5), alignItems: "center", paddingBottom: space(3) },
  titleEn: { textAlign: "center" },

  /*
    The note, as a card that is paged rather than a paragraph that is scrolled.

    A fixed minimum height so stepping between two notes of different lengths
    does not resize the card under the reader's thumb, and everything below it
    stays where it was.
  */
  note: {
    borderWidth: 1,
    borderColor: t.colors.rule,
    borderRadius: RADIUS.card,
    backgroundColor: t.colors.surface,
    padding: space(2.5),
    minHeight: 168,
    justifyContent: "center",
  },
  /* Running prose is the one thing in this app that is left aligned: centring
     a paragraph breaks the ragged edge the eye follows back to the next line. */
  noteText: { ...textStyles.body, color: t.colors.ink, textAlign: "left" },
  /*
    Arabic inside the note is set in Amiri at its own size.

    A React Native Text node has ONE font, so a note left as a single string
    rendered its Arabic in Satoshi - which has no Arabic, so iOS substituted a
    system face mid-sentence, at the Latin size, unvowelled. The runs come from
    engine/note.ts and each is drawn with the face it needs.
  */
  noteArabic: {
    fontFamily: arabicStyles.inline.fontFamily,
    fontSize: 20,
    color: t.colors.ink,
  },

  pager: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  dots: { flexDirection: "row", gap: space(0.75), flex: 1, justifyContent: "center" },
  dot: { width: 6, height: 6, borderRadius: 999, backgroundColor: t.colors.rule },
  dotOn: { backgroundColor: t.colors.lapis },
  step: { minWidth: 64 },

  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: space(1.5),
    paddingVertical: space(1.5),
    borderBottomWidth: 1,
    borderBottomColor: t.colors.rule,
  },
  dotMaturity: { width: 6, height: 6, borderRadius: 999 },
  english: { flex: 1 },
}));

/*
  One step of the grammar note, with its Arabic set in Amiri.

  Nested Text rather than the Arabic component: that component exists to stop
  Arabic and English sharing a node, and it types its children as string so they
  cannot be nested. Here the mixing is the content itself - a rule written in
  English about an Arabic example - so the runs are drawn inline with the right
  face each, which is the same thing the web does with a span.
*/
function NoteStep({ sentences }: { sentences: string[] }) {
  const s = useStyles();
  return (
    <RNText style={s.noteText}>
      {segmentRuns(sentences.join(" ")).map((run, i) => (
        <RNText key={i} style={run.arabic ? s.noteArabic : undefined}>
          {run.text}
        </RNText>
      ))}
    </RNText>
  );
}

export default function LessonDetail() {
  const s = useStyles();
  const theme = useTheme();
  const router = useRouter();
  const params = useLocalSearchParams<{ number?: string }>();
  const profileId = useSession((st) => st.activeProfileId);

  const lessonNumber = Number(params.number);
  const [step, setStep] = useState(0);

  const view = useMemo(() => {
    if (profileId === null || !Number.isInteger(lessonNumber)) return null;
    const config = getSettingsFor(db, profileId);
    const lesson = db.select().from(lessons).where(eq(lessons.number, lessonNumber)).get();
    if (!lesson) return null;
    return {
      config,
      lesson,
      cards: getDeck(db, profileId, lessonNumber),
      steps: splitNote(lesson.grammarNote ?? ""),
      /* Lessons past the current one are readable but not drillable, the same
         rule the lessons list follows. */
      open: lessonNumber <= config.currentLesson,
    };
  }, [profileId, lessonNumber]);

  if (!view) {
    return (
      <Screen>
        <BackBar fallback="/lessons" />
        <Text variant="pageTitle">No such lesson.</Text>
        <Button
          label="All lessons"
          variant="quiet"
          style={{ marginTop: space(3) }}
          onPress={() => router.replace("/lessons")}
        />
      </Screen>
    );
  }

  const { lesson, cards, open, config, steps } = view;
  const at = Math.min(step, Math.max(0, steps.length - 1));

  return (
    <Screen>
      <BackBar title={`Lesson ${lesson.number}`} fallback="/lessons" />

      <ScrollView
        contentContainerStyle={{ paddingBottom: space(5) }}
        showsVerticalScrollIndicator={false}
      >
        {/*
          The lesson number is in the bar above and nowhere else. It used to be
          stated three times running - eyebrow, Arabic title, English title -
          which reads as a stutter rather than as a heading.
        */}
        <View style={s.head}>
          {/* Arabic and English as separate elements, never one node. */}
          <Arabic variant="card" showHarakat={config.showHarakat}>
            {lesson.titleAr}
          </Arabic>
          <Text variant="pageTitle" style={s.titleEn}>
            {lesson.titleEn}
          </Text>
        </View>

        {steps.length > 0 ? (
          <View style={{ gap: space(1.5) }}>
            <View style={s.note}>
              {/* Keyed on the step so each one crossfades in place rather than
                  the text swapping under the eye. */}
              <Animated.View
                key={at}
                entering={FadeIn.duration(180)}
                exiting={FadeOut.duration(90)}
              >
                <NoteStep sentences={steps[at]} />
              </Animated.View>
            </View>

            {steps.length > 1 ? (
              <View style={s.pager}>
                <View style={s.step}>
                  {at > 0 ? (
                    <Button label="Back" variant="text" onPress={() => setStep(at - 1)} />
                  ) : null}
                </View>

                <View style={s.dots}>
                  {steps.map((_, i) => (
                    <View key={i} style={[s.dot, i === at && s.dotOn]} />
                  ))}
                </View>

                <View style={[s.step, { alignItems: "flex-end" }]}>
                  {at < steps.length - 1 ? (
                    <Button label="Next" variant="text" onPress={() => setStep(at + 1)} />
                  ) : null}
                </View>
              </View>
            ) : null}
          </View>
        ) : null}

        <Rule />

        {cards.length === 0 ? (
          <Text color="inkSoft" style={{ paddingVertical: space(2) }}>
            {`No cards in Lesson ${lesson.number} yet. Add them after class.`}
          </Text>
        ) : (
          cards.map((c) => (
            <Pressable key={c.cardId} style={s.row} disabled>
              {/* The maturity dot, so the state of a word is legible without a
                  second screen. */}
              <View
                style={[
                  s.dotMaturity,
                  { backgroundColor: theme.colors[MATURITY_TOKEN[maturityOf(c.intervalDays)]] },
                ]}
              />
              <Text color="inkSoft" style={s.english}>
                {c.english}
              </Text>
              <Arabic variant="inline" showHarakat={config.showHarakat}>
                {c.arabic}
              </Arabic>
            </Pressable>
          ))
        )}

        {open && cards.length > 0 ? (
          <Button
            label="Drill this lesson only"
            style={{ marginTop: space(3) }}
            onPress={() => router.push(`/review?lesson=${lesson.number}`)}
          />
        ) : null}

        <Button
          label="All lessons"
          variant="text"
          style={{ marginTop: space(2) }}
          onPress={() => router.replace("/lessons")}
        />
      </ScrollView>
    </Screen>
  );
}
