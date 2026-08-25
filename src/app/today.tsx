import { eq } from "drizzle-orm";
import { useFocusEffect, useRouter } from "expo-router";
import { useCallback, useMemo, useState } from "react";
import { Pressable, View } from "react-native";

import { Arabic } from "@/components/Arabic";
import { Button } from "@/components/Button";
import { Screen } from "@/components/Screen";
import { Text } from "@/components/Text";
import { db } from "@/data/client";
import { countDue, countNewAvailable } from "@/data/queue";
import { lessons } from "@/data/schema";
import { getSettingsFor } from "@/data/settings";
import { TOTAL_LESSONS } from "@/engine/constants";
import { gregorianDate, hijriDate } from "@/lib/time";
import { useSession } from "@/state/session";
import { TICK, space } from "@/theme/layout";
import { textStyles } from "@/theme/typography";
import { makeStyles, useTheme } from "@/theme/useTheme";

const useStyles = makeStyles((t) => ({
  /*
    Three rows, 1fr / auto / 1fr, so Start review sits on the exact centre line
    of the screen regardless of how much sits above or below it. Centring the
    whole stack instead drifts the button every time a line appears or
    disappears, which is visible when the due count changes.
  */
  top: { flex: 1, justifyContent: "center", alignItems: "center", gap: space(1) },
  middle: { flexShrink: 0, paddingVertical: space(2) },
  bottom: { flex: 1, justifyContent: "flex-end", gap: space(2), paddingBottom: space(2) },

  dateLine: { flexDirection: "row", alignItems: "center", gap: space(1) },
  count: { ...textStyles.numeral, color: t.colors.ink, textAlign: "center" },
  links: { flexDirection: "row", flexWrap: "wrap" },
  link: { width: "50%", paddingVertical: space(1) },
  ticks: { flexDirection: "row", justifyContent: "center", gap: TICK.gap },
  tick: { width: TICK.width, height: TICK.height, borderRadius: 2 },
  footer: {
    flexDirection: "row",
    justifyContent: "center",
    gap: space(4),
    paddingTop: space(1),
  },
  quiet: { textAlign: "center" },
}));

export default function Today() {
  const s = useStyles();
  const theme = useTheme();
  const router = useRouter();
  const profileId = useSession((st) => st.activeProfileId);

  const [tick, setTick] = useState(0);
  /* Recount on focus rather than on an interval: the count only changes when
     the user answers something, and they have to come back here to see it. */
  useFocusEffect(useCallback(() => setTick((n) => n + 1), []));

  const view = useMemo(() => {
    if (profileId === null) return null;
    const config = getSettingsFor(db, profileId);
    const due = countDue(db, profileId);
    const fresh = countNewAvailable(db, profileId, config.currentLesson);
    const lesson = db
      .select()
      .from(lessons)
      .where(eq(lessons.number, config.currentLesson))
      .get();
    return { config, due, fresh, lesson };
    /* `tick` is not read in the body and that is the point: it is the
       cache-buster that re-runs these queries when the screen regains focus.
       SQLite is an external store, so nothing else here changes identity when
       the underlying rows do. */
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profileId, tick]);

  const now = new Date();
  const hijri = hijriDate(now);

  if (!view) return null;
  const { config, due, fresh, lesson } = view;

  return (
    <Screen>
      <View style={s.top}>
        {/*
          Hijri and Gregorian on one line, but as two elements. Spec section 7.3
          rule 3: Arabic and English never share a text node. These are both
          Latin script here, so one node would be safe, but keeping them
          separate matches the lessons list and survives a future Arabic month
          name.
        */}
        <View style={s.dateLine}>
          {hijri ? (
            <>
              <Text variant="label" color="inkSoft">
                {hijri}
              </Text>
              <Text variant="label" color="inkFaint">
                ·
              </Text>
            </>
          ) : null}
          <Text variant="label" color="inkSoft">
            {gregorianDate(now)}
          </Text>
        </View>

        {lesson ? (
          <>
            <Arabic variant="title" showHarakat={config.showHarakat}>
              {lesson.titleAr}
            </Arabic>
            <Text variant="label" color="inkSoft">
              {`Lesson ${config.currentLesson}`}
            </Text>
          </>
        ) : null}

        <View style={{ marginTop: space(2) }}>
          <Text style={s.count}>{String(due)}</Text>
          <Text variant="eyebrow" color="inkSoft" style={s.quiet}>
            due
          </Text>
        </View>
      </View>

      <View style={s.middle}>
        <Button label="Start review" onPress={() => router.push("/review")} />
        {/*
          Nothing is due is not a different screen. The same count, the same
          button, the same links, plus one faint line. The screen does not change
          shape.
        */}
        {due === 0 && fresh === 0 ? (
          <Text variant="label" color="inkFaint" style={[s.quiet, { marginTop: space(1) }]}>
            {`Nothing scheduled. Review goes over Lessons 1 to ${config.currentLesson}.`}
          </Text>
        ) : null}
      </View>

      <View style={s.bottom}>
        <View style={s.links}>
          {(
            [
              ["Speed drill", "/speed"],
              ["Case drill", "/cases"],
              ["Flashcards", "/cards"],
              ["Lessons", "/lessons"],
            ] as const
          ).map(([label, href]) => (
            <Pressable key={href} style={s.link} onPress={() => router.push(href)}>
              <Text color="lapis">{label}</Text>
            </Pressable>
          ))}
        </View>

        {/* 23 ticks. Filled to currentLesson, so where you are in the book is
            legible without a number. */}
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

        <View style={s.footer}>
          <Pressable onPress={() => router.push("/stats")}>
            <Text color="inkSoft">Stats</Text>
          </Pressable>
          <Pressable onPress={() => router.push("/settings")}>
            <Text color="inkSoft">Settings</Text>
          </Pressable>
        </View>
      </View>
    </Screen>
  );
}
