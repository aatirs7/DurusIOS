import { eq } from "drizzle-orm";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useMemo } from "react";
import { ScrollView, View } from "react-native";

import { Arabic } from "@/components/Arabic";
import { Button } from "@/components/Button";
import { Rule } from "@/components/Field";
import { Screen } from "@/components/Screen";
import { Text } from "@/components/Text";
import { db } from "@/data/client";
import { getDeck } from "@/data/drills";
import { lessons } from "@/data/schema";
import { getSettingsFor } from "@/data/settings";
import { MATURITY_TOKEN, maturityOf } from "@/engine/constants";
import { useSession } from "@/state/session";
import { space } from "@/theme/layout";
import { makeStyles, useTheme } from "@/theme/useTheme";

const useStyles = makeStyles((t) => ({
  head: { gap: space(1), paddingBottom: space(2) },
  /* The one place in the app that is left aligned, because a grammar note is
     running prose and centring breaks it. */
  note: { textAlign: "left", paddingVertical: space(2) },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: space(1.5),
    paddingVertical: space(1.5),
    borderBottomWidth: 1,
    borderBottomColor: t.colors.rule,
  },
  dot: { width: 6, height: 6, borderRadius: 999 },
  english: { flex: 1 },
}));

export default function LessonDetail() {
  const s = useStyles();
  const theme = useTheme();
  const router = useRouter();
  const params = useLocalSearchParams<{ number?: string }>();
  const profileId = useSession((st) => st.activeProfileId);

  const lessonNumber = Number(params.number);

  const view = useMemo(() => {
    if (profileId === null || !Number.isInteger(lessonNumber)) return null;
    const config = getSettingsFor(db, profileId);
    const lesson = db
      .select()
      .from(lessons)
      .where(eq(lessons.number, lessonNumber))
      .get();
    if (!lesson) return null;
    return {
      config,
      lesson,
      cards: getDeck(db, profileId, lessonNumber),
      /* Lessons past the current one are readable but not drillable, the same
         rule the lessons list follows. */
      open: lessonNumber <= config.currentLesson,
    };
  }, [profileId, lessonNumber]);

  if (!view) {
    return (
      <Screen>
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

  const { lesson, cards, open, config } = view;

  return (
    <Screen>
      <ScrollView contentContainerStyle={{ paddingBottom: space(5) }}>
        <View style={s.head}>
          <Text variant="eyebrow" color="inkSoft">
            {`Lesson ${lesson.number}`}
          </Text>
          {/* Arabic and English as separate elements, never one node. */}
          <Arabic variant="card" showHarakat={config.showHarakat}>
            {lesson.titleAr}
          </Arabic>
          <Text variant="pageTitle" style={{ textAlign: "center" }}>
            {lesson.titleEn}
          </Text>
        </View>

        {lesson.grammarNote ? (
          <Text color="inkSoft" style={s.note}>
            {lesson.grammarNote}
          </Text>
        ) : null}

        <Rule />

        {cards.length === 0 ? (
          <Text color="inkSoft" style={{ paddingVertical: space(2) }}>
            {`No cards in Lesson ${lesson.number} yet. Add them after class.`}
          </Text>
        ) : (
          cards.map((c) => (
            <View key={c.cardId} style={s.row}>
              {/* The maturity dot, so the state of a word is legible without a
                  second screen. */}
              <View
                style={[
                  s.dot,
                  {
                    backgroundColor:
                      theme.colors[MATURITY_TOKEN[maturityOf(c.intervalDays)]],
                  },
                ]}
              />
              <Text color="inkSoft" style={s.english}>
                {c.english}
              </Text>
              <Arabic variant="inline" showHarakat={config.showHarakat}>
                {c.arabic}
              </Arabic>
            </View>
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
