import { useRouter } from "expo-router";
import { useCallback, useMemo, useState } from "react";
import { Pressable, ScrollView, View } from "react-native";

import { Arabic } from "@/components/Arabic";
import { Button } from "@/components/Button";
import { Screen } from "@/components/Screen";
import { Text } from "@/components/Text";
import { bootOnce } from "@/data/boot";
import { db } from "@/data/client";
import { setSuspended } from "@/data/drills";
import { getStats } from "@/data/stats";
import { getSettingsFor } from "@/data/settings";
import { MATURITY_TOKEN, type Maturity } from "@/engine/constants";
import { useSession } from "@/state/session";
import { RADIUS, space } from "@/theme/layout";
import { textStyles } from "@/theme/typography";
import { makeStyles, useTheme } from "@/theme/useTheme";

const useStyles = makeStyles((t) => ({
  group: { paddingTop: space(3), gap: space(1) },
  pair: { flexDirection: "row", gap: space(2) },
  stat: {
    flex: 1,
    borderWidth: 1,
    borderColor: t.colors.rule,
    backgroundColor: t.colors.surface,
    borderRadius: RADIUS.card,
    padding: space(2),
    gap: space(0.5),
  },
  numeral: { ...textStyles.numeral, fontSize: 28, color: t.colors.ink },

  /* Thirty bars, one per day. Deliberately not a chart library: the shape is
     the only thing being read, so axes and gridlines would be furniture. */
  spark: { flexDirection: "row", alignItems: "flex-end", gap: 2, height: 56 },
  bar: { flex: 1, borderRadius: 1, minHeight: 2 },

  meter: { flexDirection: "row", height: 10, borderRadius: 999, overflow: "hidden" },
  legend: { flexDirection: "row", flexWrap: "wrap", gap: space(2) },
  legendItem: { flexDirection: "row", alignItems: "center", gap: space(0.75) },
  dot: { width: 8, height: 8, borderRadius: 999 },

  leech: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: space(1.5),
    borderBottomWidth: 1,
    borderBottomColor: t.colors.rule,
    gap: space(2),
  },
  leechText: { flex: 1, gap: space(0.25) },
}));

const MATURITY_ORDER: Maturity[] = ["unseen", "learning", "mature"];
const MATURITY_LABEL: Record<Maturity, string> = {
  unseen: "unseen",
  learning: "learning",
  mature: "mature",
};

export default function Stats() {
  const s = useStyles();
  const theme = useTheme();
  const router = useRouter();
  const profileId = useSession((st) => st.activeProfileId);
  const boot = bootOnce();

  const [tick, setTick] = useState(0);
  const bump = useCallback(() => setTick((n) => n + 1), []);

  const view = useMemo(() => {
    if (profileId === null) return null;
    return {
      stats: getStats(db, profileId),
      showHarakat: getSettingsFor(db, profileId).showHarakat,
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profileId, tick]);

  if (!view) return null;
  const { stats } = view;

  const peak = Math.max(1, ...stats.perDay.map((d) => d.count));
  const totalCards = MATURITY_ORDER.reduce((n, k) => n + stats.maturity[k], 0);
  const reviewed30 = stats.perDay.reduce((n, d) => n + d.count, 0);

  return (
    <Screen>
      <ScrollView contentContainerStyle={{ paddingBottom: space(4) }}>
        <Text variant="pageTitle">Stats</Text>

        <View style={s.group}>
          <View style={s.pair}>
            <View style={s.stat}>
              <Text style={s.numeral}>
                {stats.medianMs === null ? "—" : `${(stats.medianMs / 1000).toFixed(1)}s`}
              </Text>
              <Text variant="eyebrow" color="inkSoft">
                7 day median
              </Text>
            </View>
            <View style={s.stat}>
              <Text style={s.numeral}>
                {stats.bestMs === null ? "—" : `${(stats.bestMs / 1000).toFixed(1)}s`}
              </Text>
              <Text variant="eyebrow" color="inkSoft">
                best day
              </Text>
            </View>
          </View>
          <Text variant="label" color="inkFaint">
            Recognition answers only. The best is the best single day&apos;s median, not
            the fastest single card.
          </Text>
        </View>

        <View style={s.group}>
          <Text variant="eyebrow" color="inkSoft">
            Last 30 days
          </Text>
          <View style={s.spark}>
            {stats.perDay.map((d) => (
              <View
                key={d.day}
                style={[
                  s.bar,
                  {
                    height: `${Math.max(3, (d.count / peak) * 100)}%`,
                    backgroundColor: d.count === 0 ? theme.colors.rule : theme.colors.lapis,
                  },
                ]}
              />
            ))}
          </View>
          <Text variant="label" color="inkFaint">
            {`${reviewed30} answers, peak ${peak} in a day.`}
          </Text>
        </View>

        <View style={s.group}>
          <Text variant="eyebrow" color="inkSoft">
            Maturity
          </Text>
          <View style={s.meter}>
            {MATURITY_ORDER.map((k) => {
              const n = stats.maturity[k];
              if (n === 0) return null;
              return (
                <View
                  key={k}
                  style={{
                    flex: n,
                    backgroundColor: theme.colors[MATURITY_TOKEN[k]],
                  }}
                />
              );
            })}
          </View>
          <View style={s.legend}>
            {MATURITY_ORDER.map((k) => (
              <View key={k} style={s.legendItem}>
                <View
                  style={[s.dot, { backgroundColor: theme.colors[MATURITY_TOKEN[k]] }]}
                />
                <Text variant="label" color="inkSoft">
                  {`${stats.maturity[k]} ${MATURITY_LABEL[k]}`}
                </Text>
              </View>
            ))}
          </View>
          <Text variant="label" color="inkFaint">
            {`${totalCards} cards in Lessons you have open. Mature is an interval past 21 days.`}
          </Text>
        </View>

        {stats.leeches.length > 0 ? (
          <View style={s.group}>
            <Text variant="eyebrow" color="inkSoft">
              Words that keep coming back
            </Text>
            {stats.leeches.map((l) => (
              <View key={l.cardId} style={s.leech}>
                <View style={s.leechText}>
                  <Arabic variant="inline" showHarakat={view.showHarakat}>
                    {l.arabic}
                  </Arabic>
                  <Text variant="label" color="inkSoft">
                    {l.english}
                  </Text>
                  <Text variant="label" color="inkFaint">
                    {`${l.lapses} lapses · Lesson ${l.lessonNumber}`}
                  </Text>
                </View>
                <Pressable
                  onPress={() => {
                    if (!boot.ok) return;
                    setSuspended(db, profileId!, boot.deviceId, l.cardId, !l.suspended);
                    bump();
                  }}
                >
                  <Text color={l.suspended ? "clay" : "lapis"}>
                    {l.suspended ? "Resume" : "Suspend"}
                  </Text>
                </Pressable>
              </View>
            ))}
            <Text variant="label" color="inkFaint">
              Suspending takes a word out of the rotation without deleting it.
            </Text>
          </View>
        ) : null}

        <Button
          label="Back to today"
          variant="quiet"
          style={{ marginTop: space(3) }}
          onPress={() => router.back()}
        />
      </ScrollView>
    </Screen>
  );
}
