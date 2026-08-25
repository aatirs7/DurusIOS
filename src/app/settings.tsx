import { useRouter } from "expo-router";
import { useState } from "react";
import { Pressable, ScrollView, Switch, View } from "react-native";

import { Button } from "@/components/Button";
import { Screen } from "@/components/Screen";
import { Text } from "@/components/Text";
import { db } from "@/data/client";
import { getSettingsFor, updateSettings } from "@/data/settings";
import { TOTAL_LESSONS } from "@/engine/constants";
import { setHapticsEnabled } from "@/lib/haptics";
import { useSession } from "@/state/session";
import { RADIUS, space } from "@/theme/layout";
import { makeStyles, useTheme } from "@/theme/useTheme";

const useStyles = makeStyles((t) => ({
  row: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: space(1.5),
    borderBottomWidth: 1,
    borderBottomColor: t.colors.rule,
  },
  group: { paddingTop: space(3), paddingBottom: space(1) },
  stepper: { flexDirection: "row", alignItems: "center", gap: space(2) },
  step: {
    width: 40,
    height: 40,
    borderRadius: RADIUS.button,
    borderWidth: 1,
    borderColor: t.colors.rule,
    backgroundColor: t.colors.surface,
    alignItems: "center",
    justifyContent: "center",
  },
}));

export default function SettingsScreen() {
  const s = useStyles();
  const theme = useTheme();
  const router = useRouter();
  const profileId = useSession((st) => st.activeProfileId);

  const [config, setConfig] = useState(() =>
    profileId === null ? null : getSettingsFor(db, profileId),
  );

  if (profileId === null || !config) return null;

  const patch = (next: Parameters<typeof updateSettings>[2]) => {
    setConfig(updateSettings(db, profileId, next));
  };

  return (
    <Screen>
      <ScrollView contentContainerStyle={{ paddingBottom: space(4) }}>
        <Text variant="pageTitle">Settings</Text>

        <Text variant="eyebrow" color="inkSoft" style={s.group}>
          The course
        </Text>

        {/*
          The app never unlocks a lesson on its own. This is the control that
          moves the course forward, and moving it restamps currentLessonSince,
          which is what starts the 14 day interval cap on the new lesson.
        */}
        <View style={s.row}>
          <View>
            <Text>Current lesson</Text>
            <Text variant="label" color="inkFaint">
              What the class has covered
            </Text>
          </View>
          <View style={s.stepper}>
            <Pressable
              style={s.step}
              onPress={() =>
                patch({ currentLesson: Math.max(1, config.currentLesson - 1) })
              }
            >
              <Text>−</Text>
            </Pressable>
            <Text variant="pageTitle">{String(config.currentLesson)}</Text>
            <Pressable
              style={s.step}
              onPress={() =>
                patch({
                  currentLesson: Math.min(TOTAL_LESSONS, config.currentLesson + 1),
                })
              }
            >
              <Text>+</Text>
            </Pressable>
          </View>
        </View>

        <View style={s.row}>
          <View>
            <Text>New cards a day</Text>
            <Text variant="label" color="inkFaint">
              How fast new words arrive
            </Text>
          </View>
          <View style={s.stepper}>
            <Pressable
              style={s.step}
              onPress={() => patch({ newPerDay: Math.max(0, config.newPerDay - 2) })}
            >
              <Text>−</Text>
            </Pressable>
            <Text variant="pageTitle">{String(config.newPerDay)}</Text>
            <Pressable
              style={s.step}
              onPress={() => patch({ newPerDay: Math.min(50, config.newPerDay + 2) })}
            >
              <Text>+</Text>
            </Pressable>
          </View>
        </View>

        <Text variant="eyebrow" color="inkSoft" style={s.group}>
          Reading
        </Text>

        <View style={s.row}>
          <View>
            <Text>Show harakat</Text>
            <Text variant="label" color="inkFaint">
              The short vowels, on every card face
            </Text>
          </View>
          <Switch
            value={config.showHarakat}
            onValueChange={(v) => patch({ showHarakat: v })}
            trackColor={{ true: theme.colors.lapis, false: theme.colors.rule }}
          />
        </View>

        <Text variant="eyebrow" color="inkSoft" style={s.group}>
          This device
        </Text>

        <View style={s.row}>
          <View>
            <Text>Haptics</Text>
            <Text variant="label" color="inkFaint">
              A tap when you choose an answer
            </Text>
          </View>
          <Switch
            value={config.hapticsEnabled}
            onValueChange={(v) => {
              setHapticsEnabled(v);
              patch({ hapticsEnabled: v });
            }}
            trackColor={{ true: theme.colors.lapis, false: theme.colors.rule }}
          />
        </View>

        <View style={s.row}>
          <View>
            <Text>Reduce motion</Text>
            <Text variant="label" color="inkFaint">
              The card turn becomes a fade
            </Text>
          </View>
          <Switch
            value={config.reduceMotion}
            onValueChange={(v) => patch({ reduceMotion: v })}
            trackColor={{ true: theme.colors.lapis, false: theme.colors.rule }}
          />
        </View>

        <Pressable style={s.row} onPress={() => router.push("/about")}>
          <Text>About</Text>
          <Text color="inkFaint">›</Text>
        </Pressable>

        <Button
          label="Back to today"
          variant="secondary"
          style={{ marginTop: space(3) }}
          onPress={() => router.back()}
        />
      </ScrollView>
    </Screen>
  );
}
