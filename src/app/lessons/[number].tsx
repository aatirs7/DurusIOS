import { eq } from "drizzle-orm";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useMemo, useState } from "react";
import { Pressable, ScrollView, View } from "react-native";
import Animated, { FadeIn, FadeOut } from "react-native-reanimated";

import { Arabic } from "@/components/Arabic";
import { BackBar } from "@/components/BackBar";
import { Button } from "@/components/Button";
import { RichText } from "@/components/RichText";
import { Screen } from "@/components/Screen";
import { Text } from "@/components/Text";
import { db } from "@/data/client";
import { getDeck } from "@/data/drills";
import { lessons } from "@/data/schema";
import { getSettingsFor } from "@/data/settings";
import { MATURITY_TOKEN, maturityOf } from "@/engine/constants";
import { LESSON_NOTES, type LessonPoint } from "@/engine/lessonNotes";
import { splitNote } from "@/engine/note";
import { transliterate } from "@/engine/transliterate";
import { useSession } from "@/state/session";
import { RADIUS, space } from "@/theme/layout";
import { makeStyles, useTheme } from "@/theme/useTheme";

/*
  A lesson, as something you read through rather than scroll past.

  It used to be one page: a title, the book's grammar note as a wall of prose,
  and the word list under it. Everything was there and nothing was taught -
  reading it meant holding the whole lesson in your head at once, in a
  vocabulary of grammatical terms that the lesson itself is supposed to be
  introducing.

  So it is paged. One idea per screen, in plain English first, then the book's
  own note, then the words. The book's note is never replaced or edited: it is
  accurate and terse and it is what a teacher will refer to, so it stays
  verbatim - it is simply no longer the first thing anyone meets.

  Every Arabic word in the prose can be tapped for how it is said. See
  components/RichText: a sentence about ال is no use to somebody who cannot yet
  sound out ال.
*/

type Step =
  | { kind: "overview" }
  | { kind: "point"; point: LessonPoint }
  | { kind: "book"; sentences: string[] }
  | { kind: "words" };

const useStyles = makeStyles((t) => ({
  head: { alignItems: "center", gap: space(1), paddingBottom: space(2) },
  titleEn: { textAlign: "center" },

  /* One idea, vertically centred, with room to breathe. Deliberately not a
     card: a lesson is a page being read, not a tile being browsed. */
  stage: { flex: 1, justifyContent: "center", gap: space(2.5) },
  pointTitle: { fontSize: 24, lineHeight: 32, textAlign: "left" },

  example: {
    borderWidth: 1,
    borderColor: t.colors.rule,
    borderRadius: RADIUS.card,
    backgroundColor: t.colors.surface,
    paddingVertical: space(2.5),
    paddingHorizontal: space(2),
    alignItems: "center",
    gap: space(0.75),
  },
  gloss: { textAlign: "center" },

  bookNote: {
    borderLeftWidth: 2,
    borderLeftColor: t.colors.rule,
    paddingLeft: space(2),
    gap: space(1),
  },

  pager: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  dots: { flexDirection: "row", gap: space(0.75), flex: 1, justifyContent: "center" },
  dot: { width: 6, height: 6, borderRadius: 999, backgroundColor: t.colors.rule },
  dotOn: { backgroundColor: t.colors.lapis },
  end: { minWidth: 64 },

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
  actions: { gap: space(1), paddingBottom: space(1) },
}));

export default function LessonDetail() {
  const s = useStyles();
  const theme = useTheme();
  const router = useRouter();
  const params = useLocalSearchParams<{ number?: string }>();
  const profileId = useSession((st) => st.activeProfileId);

  const lessonNumber = Number(params.number);
  const [at, setAt] = useState(0);
  const [revealed, setRevealed] = useState<number | null>(null);

  const view = useMemo(() => {
    if (profileId === null || !Number.isInteger(lessonNumber)) return null;
    const config = getSettingsFor(db, profileId);
    const lesson = db.select().from(lessons).where(eq(lessons.number, lessonNumber)).get();
    if (!lesson) return null;

    const note = LESSON_NOTES[lessonNumber];
    const bookSteps = splitNote(lesson.grammarNote ?? "");

    const steps: Step[] = [
      ...(note ? ([{ kind: "overview" }] as Step[]) : []),
      ...(note ? note.points.map((point): Step => ({ kind: "point", point })) : []),
      ...bookSteps.map((sentences): Step => ({ kind: "book", sentences })),
      { kind: "words" },
    ];

    return {
      config,
      lesson,
      note,
      steps,
      cards: getDeck(db, profileId, lessonNumber),
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

  const { lesson, cards, open, config, note, steps } = view;
  const index = Math.min(at, steps.length - 1);
  const step = steps[index];
  const last = index === steps.length - 1;

  return (
    <Screen>
      <BackBar fallback="/lessons" />

      {/*
        The lesson number is in the bar above and nowhere else. It used to be
        stated three times running - eyebrow, Arabic title, English title -
        which reads as a stutter rather than as a heading.
      */}
      <View style={s.head}>
        {/* Arabic and English as separate elements, never one node. */}
        <Arabic variant="title" showHarakat={config.showHarakat}>
          {lesson.titleAr}
        </Arabic>
        <Text variant="pageTitle" style={s.titleEn}>
          {lesson.titleEn}
        </Text>
      </View>

      {/* Keyed on the step so each one crossfades in place rather than the
          text swapping under the eye. */}
      <Animated.View
        key={index}
        entering={FadeIn.duration(180)}
        exiting={FadeOut.duration(90)}
        style={{ flex: 1 }}
      >
        {step.kind === "overview" && note ? (
          <View style={s.stage}>
            <Text variant="eyebrow" color="inkSoft">
              What this lesson gives you
            </Text>
            <Text variant="pageTitle" style={s.pointTitle}>
              {note.summary}
            </Text>
            <Text color="inkSoft">
              {`${note.points.length} ${note.points.length === 1 ? "idea" : "ideas"}, then the book's own note, then the words.`}
            </Text>
          </View>
        ) : null}

        {step.kind === "point" ? (
          <ScrollView contentContainerStyle={{ flexGrow: 1 }} showsVerticalScrollIndicator={false}>
            <View style={s.stage}>
              <Text variant="pageTitle" style={s.pointTitle}>
                {step.point.title}
              </Text>
              <RichText>{step.point.body}</RichText>

              {step.point.example ? (
                <View style={s.example}>
                  <Arabic variant="title" showHarakat={config.showHarakat}>
                    {step.point.example.arabic}
                  </Arabic>
                  <Text variant="label" color="inkFaint">
                    {transliterate(step.point.example.arabic)}
                  </Text>
                  <Text color="inkSoft" style={s.gloss}>
                    {step.point.example.gloss}
                  </Text>
                </View>
              ) : null}
            </View>
          </ScrollView>
        ) : null}

        {step.kind === "book" ? (
          <ScrollView contentContainerStyle={{ flexGrow: 1 }} showsVerticalScrollIndicator={false}>
            <View style={s.stage}>
              <Text variant="eyebrow" color="inkSoft">
                From the book
              </Text>
              {/* Verbatim, and set apart by a rule so it is visibly a quotation
                  rather than more of our own prose. */}
              <View style={s.bookNote}>
                <RichText>{step.sentences.join(" ")}</RichText>
              </View>
            </View>
          </ScrollView>
        ) : null}

        {step.kind === "words" ? (
          <ScrollView showsVerticalScrollIndicator={false}>
            <Text variant="eyebrow" color="inkSoft" style={{ paddingBottom: space(1) }}>
              {`${cards.length} ${cards.length === 1 ? "word" : "words"}`}
            </Text>

            {cards.length === 0 ? (
              <Text color="inkSoft" style={{ paddingVertical: space(2) }}>
                {`No cards in Lesson ${lesson.number} yet. Add them after class.`}
              </Text>
            ) : (
              cards.map((c) => (
                /* Tap a word for how it is said - the same offer the prose
                   makes, in the one place a reader is most likely to want it. */
                <Pressable
                  key={c.cardId}
                  style={s.row}
                  onPress={() => setRevealed((r) => (r === c.cardId ? null : c.cardId))}
                >
                  <View
                    style={[
                      s.dotMaturity,
                      { backgroundColor: theme.colors[MATURITY_TOKEN[maturityOf(c.intervalDays)]] },
                    ]}
                  />
                  <View style={s.english}>
                    <Text color="inkSoft">{c.english}</Text>
                    {revealed === c.cardId ? (
                      <Text variant="label" color="inkFaint" style={{ fontStyle: "italic" }}>
                        {c.transliteration ?? transliterate(c.arabic)}
                      </Text>
                    ) : null}
                  </View>
                  <Arabic variant="inline" showHarakat={config.showHarakat}>
                    {c.arabic}
                  </Arabic>
                </Pressable>
              ))
            )}
          </ScrollView>
        ) : null}
      </Animated.View>

      <View style={s.actions}>
        {steps.length > 1 ? (
          <View style={s.pager}>
            <View style={s.end}>
              {index > 0 ? (
                <Button label="Back" variant="text" onPress={() => setAt(index - 1)} />
              ) : null}
            </View>

            <View style={s.dots}>
              {steps.map((_, i) => (
                <View key={i} style={[s.dot, i === index && s.dotOn]} />
              ))}
            </View>

            <View style={[s.end, { alignItems: "flex-end" }]}>
              {!last ? (
                <Button label="Next" variant="text" onPress={() => setAt(index + 1)} />
              ) : null}
            </View>
          </View>
        ) : null}

        {last && open && cards.length > 0 ? (
          <Button
            label="Drill this lesson"
            onPress={() => router.push(`/review?lesson=${lesson.number}`)}
          />
        ) : null}
      </View>
    </Screen>
  );
}
