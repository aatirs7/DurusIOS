import { eq } from "drizzle-orm";
import { useFocusEffect, useRouter } from "expo-router";
import { useCallback, useMemo, useState } from "react";
import { View } from "react-native";

import { Arabic } from "@/components/Arabic";
import { Button } from "@/components/Button";
import { Screen } from "@/components/Screen";
import { Text } from "@/components/Text";
import { ThemeToggle } from "@/components/ThemeToggle";
import { db } from "@/data/client";
import { countDue, countNewAvailable } from "@/data/queue";
import { lessons } from "@/data/schema";
import { getSettingsFor } from "@/data/settings";
import { TOTAL_LESSONS } from "@/engine/constants";
import { dateLine } from "@/lib/time";
import { useSession } from "@/state/session";
import { TICK, space } from "@/theme/layout";
import { textStyles } from "@/theme/typography";
import { makeStyles, useTheme } from "@/theme/useTheme";

const useStyles = makeStyles((t) => ({
  /*
    Three rows, 1fr auto 1fr, so Start review sits on the exact centre line of
    the screen regardless of how much sits above or below it. Centring the whole
    stack instead drifts the button every time a line appears or disappears.

    The top row spreads its three groups across the row rather than stacking
    them centred: date at the top, where you are in the book in the middle, and
    the count sitting just above the button that acts on it. Centring all three
    together is what left a large void under the count.
  */
  top: { flex: 1, alignItems: "center", justifyContent: "space-between", paddingBottom: space(4) },
  /* Two buttons now: the review and the lesson. */
  middle: { flexShrink: 0, gap: space(1) },
  bottom: { flex: 1, alignItems: "center", justifyContent: "flex-start", gap: space(2.5), paddingTop: space(3) },

  /* Same height as the theme toggle in the corner, so the two sit on one line
     rather than the date floating below it. */
  dateRow: { height: 40, justifyContent: "center" },
  lesson: { alignItems: "center", gap: space(0.5) },
  count: { alignItems: "center", gap: space(0.5) },
  numeral: { ...textStyles.numeral, color: t.colors.ink },

  grid: { flexDirection: "row", flexWrap: "wrap", width: "100%" },
  /*
    alignItems, not just width. The web's ButtonLink is `inline-flex
    justify-center` at `w-full`, so each label centres inside its own column.
    A React Native Pressable does not centre its child for free, so half the
    grid was sitting hard against the left of its column while everything above
    it on the screen was centred.
  */
  gridItem: { width: "50%", alignItems: "center" },

  /*
    Flows directly under the links rather than being pushed to the bottom edge.
    marginTop:auto drove the ticks and Stats/Settings onto the home indicator
    and left a hole in the middle; the web leaves its slack BELOW this cluster.
  */
  foot: { alignItems: "center", gap: space(2.5), width: "100%" },
  ticks: { flexDirection: "row", justifyContent: "center", gap: TICK.gap },
  tick: { width: TICK.width, height: TICK.height, borderRadius: 999 },
  footLinks: { flexDirection: "row", justifyContent: "center", gap: space(3) },
  toggle: { position: "absolute", right: 0, top: 0, zIndex: 1 },
}));

export default function Today() {
  const s = useStyles();
  const theme = useTheme();
  const router = useRouter();
  const profileId = useSession((st) => st.activeProfileId);

  const [tick, setTick] = useState(0);
  const bump = useCallback(() => setTick((n) => n + 1), []);
  useFocusEffect(bump);

  const view = useMemo(() => {
    if (profileId === null) return null;
    const config = getSettingsFor(db, profileId);
    const due = countDue(db, profileId);
    const newAvailable = countNewAvailable(db, profileId, config.currentLesson);
    /* What a session would actually introduce today, not the whole backlog. */
    const newToday = Math.min(newAvailable, config.newPerDay);
    const lesson = db
      .select()
      .from(lessons)
      .where(eq(lessons.number, config.currentLesson))
      .get();
    return { config, due, newToday, lesson };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profileId, tick]);

  if (!view) return null;
  const { config, due, newToday, lesson } = view;
  const now = new Date();

  /*
    Nothing scheduled. The screen does not change shape for it: the same count,
    the same button, the same links. Finishing what is loaded is not a different
    mode, it just means review goes over the lessons you have rather than a
    queue the scheduler picked.
  */
  const clear = due === 0 && newToday === 0;
  /*
    There is no "Add Lesson" here any more.

    Which lesson you are on is answered once in onboarding and changed in
    Settings, which is where a setting belongs. As a button on Today it was a
    control you could press by accident on the screen you open most, and it
    silently changed what the app would show you for the next fortnight - the
    lesson cap keys off currentLessonSince, so a stray tap restarted that clock.

    The tick strip below stays: it says where you are in the book without
    offering to move you.
  */

  return (
    <Screen>
      <View style={s.toggle}>
        <ThemeToggle />
      </View>

      <View style={s.top}>
        <View style={s.dateRow}>
          <Text variant="eyebrow" color="inkSoft">
            {dateLine(now, config.timezone)}
          </Text>
        </View>

        {/* The English sits under the Arabic, the way the lessons list sets it,
            and never in the same text node, or bidi reorders the two. */}
        {lesson ? (
          <View style={s.lesson}>
            <Arabic variant="title" showHarakat={config.showHarakat}>
              {lesson.titleAr}
            </Arabic>
            <Text variant="eyebrow" color="inkSoft">
              {`Lesson ${config.currentLesson}`}
            </Text>
          </View>
        ) : (
          <View />
        )}

        {/*
          The number is the SESSION, not the scheduler's backlog.

          It used to be the due count with "due" under it and "N new to learn"
          below that - two numbers, neither explained, and the larger of the
          two usually the one in small text. "Due" is a word about the
          scheduler's internals: it means a word you have met before whose turn
          has come round again, and nothing on the screen said so.

          So the headline is what you will actually sit down and do, and the
          line under it says what it is made of, in words that explain
          themselves. "Coming back" is a fact about the word rather than a term
          of art.
        */}
        <View style={s.count}>
          <Text style={s.numeral}>{String(due + newToday)}</Text>
          <Text variant="eyebrow" color="inkSoft">
            {due + newToday === 1 ? "word today" : "words today"}
          </Text>
          {due + newToday > 0 ? (
            <Text color="inkSoft">
              {[
                newToday > 0 ? `${newToday} new` : null,
                due > 0 ? `${due} coming back` : null,
              ]
                .filter(Boolean)
                .join("  ·  ")}
            </Text>
          ) : null}
          {clear ? (
            <Text variant="bodySoft" color="inkFaint" style={{ textAlign: "center" }}>
              {`Nothing is waiting. A review now goes back over Lessons 1 to ${config.currentLesson} without moving anything.`}
            </Text>
          ) : null}
        </View>
      </View>

      {/*
        The centre line, and under it the lesson.

        "Lesson 4" used to sit in the bottom right of the drill grid, below
        Flashcards, which read as the least important of four alternatives -
        when it is the page that says what the class is actually on and holds
        the grammar and the word list. It has its own button now, directly
        under Start review, where its weight matches what it is for.
      */}
      <View style={s.middle}>
        <Button label="Start review" onPress={() => router.push("/review")} />
        {/*
          A link, not a button.

          As a quiet button it sat directly under Start review at the same
          width and nearly the same weight, so the page had two things
          competing to be the thing you press - and Start review is the thing
          you press. Being central is what this needed; being loud is not.
        */}
        <Button
          label={`Study Lesson ${config.currentLesson}`}
          variant="text"
          onPress={() => router.push(`/lessons/${config.currentLesson}`)}
        />
      </View>

      <View style={s.bottom}>
        {/*
          A fixed grid rather than a row of links left to wrap wherever they run
          out of width. A wrapped row puts a different number of items on each
          line depending on the text, which is what made this read as
          unfinished: the layout was an accident of the labels.

          Two columns and four drills, which fills the grid exactly.
        */}
        <View style={s.grid}>
          {(
            [
              ["Speed drill", "/speed"],
              ["Flashcards", "/cards"],
              ["Case drill", "/cases"],
              /* The slot the lesson left. Counting is the one piece of Book 1
                 grammar with no drill of its own, and the numbers themselves
                 are not cards - the book assumes a teacher said them aloud. */
              ["Numbers", "/numbers"],
            ] as const
          ).map(([label, href]) => (
            <View key={href} style={s.gridItem}>
              {/* Centred within its column, the way the web sets it. */}
              <Button label={label} variant="text" onPress={() => router.push(href)} />
            </View>
          ))}
        </View>

        <View style={s.foot}>
          {/*
            Twenty three tick marks, no numbers. A progress bar that happens to
            be honest about how far the book goes. Decoration only - a two pixel
            tap target is not a control.
          */}
          <View style={s.ticks}>
            {Array.from({ length: TOTAL_LESSONS }, (_, i) => (
              <View
                key={i}
                style={[
                  s.tick,
                  {
                    backgroundColor:
                      i < config.currentLesson ? theme.colors.lapis : theme.colors.rule,
                  },
                ]}
              />
            ))}
          </View>

          <View style={s.footLinks}>
            <Button label="Stats" variant="text" onPress={() => router.push("/stats")} />
            <Button label="Settings" variant="text" onPress={() => router.push("/settings")} />
          </View>
        </View>
      </View>
    </Screen>
  );
}
