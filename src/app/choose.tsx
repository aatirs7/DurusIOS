import { useRouter } from "expo-router";
import { useMemo, useState } from "react";
import { Pressable, ScrollView, View } from "react-native";
import Svg, { Circle, Path } from "react-native-svg";

import { Arabic } from "@/components/Arabic";
import { BackBar } from "@/components/BackBar";
import { Button } from "@/components/Button";
import { Screen } from "@/components/Screen";
import { Text } from "@/components/Text";
import { db } from "@/data/client";
import { listLessons } from "@/data/drills";
import { getSettingsFor } from "@/data/settings";
import { useSession } from "@/state/session";
import { RADIUS, space } from "@/theme/layout";
import { makeStyles, useTheme } from "@/theme/useTheme";

/*
  Reviewing a chosen set of lessons.

  The scheduler's own queue is the right default and remains the one button on
  Today - it knows what is due and picking by hand cannot beat it. But "go over
  lessons 3 and 7 before Wednesday" is a real thing to want, and the app had no
  answer to it beyond drilling one lesson at a time from its own page.

  What this produces is a plain review over those lessons: the same ladder, the
  same grading, the same writes. It is not a separate mode - the only thing
  that changes is which cards may be drawn.

  Lessons the class has not reached are not offered. The rule everywhere else
  is that nothing appears before it has been taught, and a picker that let you
  tick Lesson 20 on your first week would be the one place that rule broke.
*/
const useStyles = makeStyles((t) => ({
  head: { gap: space(1), paddingBottom: space(2) },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: space(2),
    borderWidth: 1.5,
    borderColor: t.colors.rule,
    borderRadius: RADIUS.field,
    backgroundColor: t.colors.surface,
    paddingHorizontal: space(2),
    paddingVertical: space(1.5),
    marginBottom: space(1),
  },
  rowOn: { borderColor: t.colors.lapis, backgroundColor: t.colors.lapisWash },
  rowText: { flex: 1, gap: space(0.25) },
  actions: { gap: space(1), paddingTop: space(1), paddingBottom: space(1) },
}));

export default function ChooseLessons() {
  const s = useStyles();
  const theme = useTheme();
  const router = useRouter();
  const profileId = useSession((st) => st.activeProfileId);

  const view = useMemo(() => {
    if (profileId === null) return null;
    const config = getSettingsFor(db, profileId);
    return {
      config,
      /* Only what has been taught. */
      rows: listLessons(db, profileId).filter((l) => l.number <= config.currentLesson),
    };
  }, [profileId]);

  const [picked, setPicked] = useState<number[]>([]);

  if (!view) return null;

  const toggle = (n: number) =>
    setPicked((all) => (all.includes(n) ? all.filter((x) => x !== n) : [...all, n]));

  const chosen = [...picked].sort((a, b) => a - b);

  return (
    <Screen>
      <BackBar title="Choose lessons" />

      <View style={s.head}>
        <Text variant="pageTitle" style={{ textAlign: "center" }}>
          Which lessons?
        </Text>
        <Text color="inkSoft" style={{ textAlign: "center" }}>
          Pick any combination. Leave it empty and Durus uses the whole
          schedule, the way Start review does.
        </Text>
      </View>

      <ScrollView showsVerticalScrollIndicator={false}>
        {view.rows.map((l) => {
          const on = picked.includes(l.number);
          return (
            <Pressable
              key={l.number}
              accessibilityRole="checkbox"
              accessibilityState={{ checked: on }}
              onPress={() => toggle(l.number)}
              style={[s.row, on && s.rowOn]}
            >
              <Svg width={22} height={22} viewBox="0 0 24 24">
                <Circle
                  cx={12}
                  cy={12}
                  r={11}
                  fill={on ? theme.colors.lapis : "transparent"}
                  stroke={on ? theme.colors.lapis : theme.colors.rule}
                  strokeWidth={1.5}
                />
                {on ? (
                  <Path
                    d="M7 12.5l3.2 3.2L17 9"
                    stroke={theme.colors.paper}
                    strokeWidth={2}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    fill="none"
                  />
                ) : null}
              </Svg>

              <View style={s.rowText}>
                <Text>{`Lesson ${l.number}`}</Text>
                <Text variant="label" color="inkFaint">
                  {l.titleEn}
                </Text>
              </View>

              <Arabic variant="inline" showHarakat={view.config.showHarakat}>
                {l.titleAr}
              </Arabic>
            </Pressable>
          );
        })}
      </ScrollView>

      <View style={s.actions}>
        <Button
          label={
            chosen.length === 0
              ? "Review everything"
              : chosen.length === 1
                ? `Review Lesson ${chosen[0]}`
                : `Review ${chosen.length} lessons`
          }
          onPress={() =>
            router.replace(
              chosen.length ? `/review?lessons=${chosen.join(",")}` : "/review",
            )
          }
        />
        {chosen.length > 0 ? (
          <Button label="Clear" variant="text" onPress={() => setPicked([])} />
        ) : null}
      </View>
    </Screen>
  );
}
