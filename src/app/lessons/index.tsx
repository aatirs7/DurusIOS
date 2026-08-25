import { useRouter } from "expo-router";
import { useMemo } from "react";
import { Pressable, ScrollView, View } from "react-native";

import { Arabic } from "@/components/Arabic";
import { BackBar } from "@/components/BackBar";
import { Button } from "@/components/Button";
import { Screen } from "@/components/Screen";
import { Text } from "@/components/Text";
import { db } from "@/data/client";
import { listLessons } from "@/data/drills";
import { getSettingsFor } from "@/data/settings";
import { useSession } from "@/state/session";
import { space } from "@/theme/layout";
import { makeStyles } from "@/theme/useTheme";

const useStyles = makeStyles((t) => ({
  row: {
    paddingVertical: space(1.5),
    borderBottomWidth: 1,
    borderBottomColor: t.colors.rule,
    gap: space(0.5),
  },
  meta: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  locked: { opacity: 0.45 },
}));

export default function Lessons() {
  const s = useStyles();
  const router = useRouter();
  const profileId = useSession((st) => st.activeProfileId);

  const view = useMemo(() => {
    if (profileId === null) return null;
    return {
      rows: listLessons(db, profileId),
      showHarakat: getSettingsFor(db, profileId).showHarakat,
    };
  }, [profileId]);

  if (!view) return null;

  return (
    <Screen>
      <BackBar />
      <Text variant="pageTitle">Lessons</Text>
      <ScrollView
        contentContainerStyle={{ paddingBottom: space(4) }}
        showsVerticalScrollIndicator={false}
      >
        {view.rows.map((l) => (
          <Pressable
            key={l.number}
            style={[s.row, !l.unlocked && s.locked]}
            onPress={() => router.push(`/lessons/${l.number}`)}
          >
            {/*
              Arabic and English stacked as separate elements rather than joined
              into one line. Bidi reorders them around each other inside a single
              text node, which puts the lesson number on the wrong side.
            */}
            <Arabic variant="inline" showHarakat={view.showHarakat}>
              {l.titleAr}
            </Arabic>
            <View style={s.meta}>
              <Text variant="label" color="inkSoft">
                {`Lesson ${l.number}`}
              </Text>
              <Text variant="label" color="inkFaint">
                {l.total === 0
                  ? "not written yet"
                  : `${l.seen} of ${l.total} seen`}
              </Text>
            </View>
          </Pressable>
        ))}
      </ScrollView>
      <Button
        label="Back to today"
        variant="quiet"
        onPress={() => router.back()}
      />
    </Screen>
  );
}
