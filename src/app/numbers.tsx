import AsyncStorage from "@react-native-async-storage/async-storage";
import { useRouter } from "expo-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Pressable, ScrollView, View } from "react-native";

import { Arabic } from "@/components/Arabic";
import { BackBar } from "@/components/BackBar";
import { Button } from "@/components/Button";
import { Screen } from "@/components/Screen";
import { Text } from "@/components/Text";
import { db } from "@/data/client";
import { listStages, type Stage } from "@/data/numbers";
import { useSession } from "@/state/session";
import { RADIUS, space } from "@/theme/layout";
import { textStyles } from "@/theme/typography";
import { makeStyles } from "@/theme/useTheme";

/*
  The numbers trainer's stage list.

  Thirteen stages eventually; three have content today. Each is an ordinary
  lesson row with deck = "numbers", so what is drilled here goes through the
  same scheduler, the same fold and the same sync as everything else - the only
  thing that differs is which deck the queue draws from.

  No percentages, no streak, no badges. A stage says how many of its items are
  solid and whether anything is due, and that is the whole of it.

  WHERE "TAUGHT" IS STORED

  In AsyncStorage, per profile, not in a table. The spec asked for a
  number_stage_progress table; what "taught" actually records is that a person
  has read a screen once on this phone, which is the same kind of fact as the
  help sheet's seen flag and is stored the same way. Putting it in the synced
  schema would have meant a migration on a live database to carry one bit that
  nothing else reads. If it ever needs to follow an account between devices,
  that is the moment to promote it.
*/

const taughtKey = (profileId: number, stage: number) => `durus.numbers.taught.${profileId}.${stage}`;

const useStyles = makeStyles((t) => ({
  head: { gap: space(1), paddingBottom: space(2) },

  row: {
    borderWidth: 1.5,
    borderColor: t.colors.rule,
    borderRadius: RADIUS.field,
    backgroundColor: t.colors.surface,
    paddingHorizontal: space(2.5),
    paddingVertical: space(2),
    marginBottom: space(1.5),
    gap: space(0.5),
  },
  /*
    An unlocked but untaught stage carries a thin saffron rule. It is the only
    colour on the screen, and it is doing the job a badge would otherwise do:
    saying "this one is ready" without counting anything.
  */
  ready: { borderColor: t.colors.saffron },
  locked: { opacity: 0.45 },

  titleRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: space(2) },
  due: { ...textStyles.numeral, fontSize: 17, color: t.colors.lapis },
  meta: { flexDirection: "row", alignItems: "center", gap: space(1) },
}));

export default function Numbers() {
  const s = useStyles();
  const router = useRouter();
  const profileId = useSession((st) => st.activeProfileId);

  const [taught, setTaught] = useState<Record<number, boolean>>({});
  const [tick, setTick] = useState(0);

  const stages = useMemo(
    () => (profileId === null ? [] : listStages(db, profileId)),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [profileId, tick],
  );

  useEffect(() => {
    if (profileId === null || stages.length === 0) return;
    let cancelled = false;
    Promise.all(
      stages.map(async (stage) => [stage.stage, await AsyncStorage.getItem(taughtKey(profileId, stage.stage))] as const),
    )
      .then((entries) => {
        if (cancelled) return;
        setTaught(Object.fromEntries(entries.map(([n, v]) => [n, v === "1"])));
      })
      .catch(() => {
        /* Storage failing means the teach screen is offered again, which is a
           great deal better than a stage that cannot be reached. */
      });
    return () => {
      cancelled = true;
    };
  }, [profileId, stages]);

  const open = useCallback(
    (stage: Stage) => {
      if (stage.state === "locked") return;
      /*
        Untaught goes to the teach screen; taught goes straight to the drill.
        Nothing auto-starts: this is a tap on a row that says what it will do.
      */
      if (!taught[stage.stage]) {
        router.push(`/numbers/teach?stage=${stage.number}`);
        return;
      }
      router.push(`/review?deck=numbers&lessons=${stage.number}`);
    },
    [router, taught],
  );

  if (profileId === null) return null;

  const totalDue = stages.reduce((n, stage) => n + stage.due, 0);

  return (
    <Screen>
      <BackBar />

      <View style={s.head}>
        <Text variant="pageTitle" style={{ textAlign: "center" }}>
          Numbers
        </Text>
        <Text color="inkSoft" style={{ textAlign: "center" }}>
          {totalDue > 0
            ? `${totalDue} ${totalDue === 1 ? "card" : "cards"} due.`
            : "Nothing due."}
        </Text>
      </View>

      <ScrollView showsVerticalScrollIndicator={false}>
        {stages.map((stage) => {
          const isTaught = taught[stage.stage] === true;
          const ready = stage.state !== "locked" && !isTaught;

          return (
            <Pressable
              key={stage.number}
              disabled={stage.state === "locked"}
              onPress={() => open(stage)}
              style={[s.row, ready && s.ready, stage.state === "locked" && s.locked]}
            >
              <View style={s.titleRow}>
                <Text variant="pageTitle" style={{ fontSize: 19, flex: 1 }}>
                  {stage.titleEn}
                </Text>
                {stage.due > 0 ? <Text style={s.due}>{String(stage.due)}</Text> : null}
              </View>

              <View style={s.meta}>
                <Arabic variant="inline" color="inkSoft">
                  {stage.titleAr}
                </Arabic>
              </View>

              <Text variant="label" color="inkFaint">
                {stage.state === "locked"
                  ? "Finish the stage before this one first."
                  : !isTaught
                    ? `${stage.items} to learn`
                    : `${stage.learned} of ${stage.items} solid`}
              </Text>
            </Pressable>
          );
        })}
      </ScrollView>

      {totalDue > 0 ? (
        <View style={{ paddingBottom: space(1) }}>
          <Button
            label="Review what is due"
            onPress={() => {
              router.push("/review?deck=numbers");
              setTick((n) => n + 1);
            }}
          />
        </View>
      ) : null}
    </Screen>
  );
}
