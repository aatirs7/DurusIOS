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
import { getSettingsFor, updateSettings } from "@/data/settings";
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
  middle: { flexShrink: 0 },
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
  const canUnlock = config.currentLesson < TOTAL_LESSONS;

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

        <View style={s.count}>
          <Text style={s.numeral}>{String(due)}</Text>
          <Text variant="eyebrow" color="inkSoft">
            due
          </Text>
          {newToday > 0 ? (
            <Text color="inkSoft">{`${newToday} new to learn`}</Text>
          ) : null}
          {clear ? (
            <Text variant="bodySoft" color="inkFaint" style={{ textAlign: "center" }}>
              {`Nothing scheduled. Review goes over Lessons 1 to ${config.currentLesson}.`}
            </Text>
          ) : null}
        </View>
      </View>

      {/* The centre line. */}
      <View style={s.middle}>
        <Button label="Start review" onPress={() => router.push("/review")} />
      </View>

      <View style={s.bottom}>
        {/*
          A fixed two column grid rather than a row of links left to wrap
          wherever they run out of width. A wrapped row puts a different number
          of items on each line depending on the lesson number, which is what
          made this read as unfinished: the layout was an accident of the text.
        */}
        <View style={s.grid}>
          {(
            [
              ["Speed drill", "/speed"],
              ["Flashcards", "/cards"],
              ["Case drill", "/cases"],
              [`Lesson ${config.currentLesson}`, `/lessons/${config.currentLesson}`],
            ] as const
          ).map(([label, href]) => (
            <View key={href} style={s.gridItem}>
              {/* Centred within its column, the way the web sets it. */}
              <Button label={label} variant="text" onPress={() => router.push(href)} />
            </View>
          ))}
        </View>

        {canUnlock ? (
          <Button
            label={`Add Lesson ${config.currentLesson + 1}`}
            variant="quiet"
            onPress={() => {
              updateSettings(db, profileId!, { currentLesson: config.currentLesson + 1 });
              bump();
            }}
          />
        ) : null}

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
