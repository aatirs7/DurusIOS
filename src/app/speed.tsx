import { useRouter } from "expo-router";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Pressable, View } from "react-native";

import { Arabic } from "@/components/Arabic";
import { Button } from "@/components/Button";
import { ExitDrill } from "@/components/ExitDrill";
import { Help, HelpButton, useHelp } from "@/components/Help";
import { Screen } from "@/components/Screen";
import { Text } from "@/components/Text";
import { bootOnce } from "@/data/boot";
import { db } from "@/data/client";
import { getSpeedWords, recordSpeedAnswer } from "@/data/drills";
import { getSettingsFor, updateSettings } from "@/data/settings";
import { SpeedRing } from "@/drills/SpeedRing";
import {
  SPEED_FLOOR_MS,
  SPEED_RAMP_THRESHOLD,
  SPEED_STEP_MS,
  type SpeedWord,
} from "@/engine/constants";
import { haptics } from "@/lib/haptics";
import { useSession } from "@/state/session";
import { RADIUS, space } from "@/theme/layout";
import { makeStyles } from "@/theme/useTheme";

const useStyles = makeStyles((t) => ({
  head: { alignItems: "center", gap: space(1), paddingBottom: space(2) },
  prompt: { flex: 1, justifyContent: "center", width: "100%", gap: space(3) },
  /* Fixed share of the height, so the options never shift between cards. A word
     that wraps would otherwise move the row about to be tapped. */
  face: { minHeight: 140, justifyContent: "center", alignItems: "center", width: "100%" },
  options: { gap: space(1.5), width: "100%" },
  option: {
    borderWidth: 1,
    borderColor: t.colors.rule,
    backgroundColor: t.colors.surface,
    borderRadius: RADIUS.button,
    paddingVertical: space(2),
    paddingHorizontal: space(2.5),
    minHeight: 56,
    width: "100%",
    justifyContent: "center",
  },
}));

type Round = { word: SpeedWord; options: string[] };

export default function Speed() {
  const s = useStyles();
  const router = useRouter();
  const profileId = useSession((st) => st.activeProfileId);
  const help = useHelp("speed");
  const boot = bootOnce();

  const start = useMemo(() => {
    if (profileId === null) return null;
    const config = getSettingsFor(db, profileId);
    const words = getSpeedWords(db, profileId);
    const pool = words.map((w) => w.english);

    const rounds: Round[] = words.map((word) => {
      const others = pool.filter((e) => e !== word.english);
      const picked: string[] = [];
      const seen = new Set<string>();
      for (const e of [...others].sort(() => Math.random() - 0.5)) {
        if (seen.has(e)) continue;
        seen.add(e);
        picked.push(e);
        if (picked.length === 3) break;
      }
      return {
        word,
        options: [word.english, ...picked].sort(() => Math.random() - 0.5),
      };
    });

    return { rounds, windowMs: config.speedWindowMs, showHarakat: config.showHarakat };
  }, [profileId]);

  const [index, setIndex] = useState(0);
  const [correct, setCorrect] = useState(0);
  const [done, setDone] = useState(false);
  const shownAt = useRef(Date.now());
  const settled = useRef(false);

  const round = start?.rounds[index];

  const next = useCallback(
    (wasCorrect: boolean) => {
      if (settled.current) return;
      settled.current = true;
      if (!round || profileId === null) return;

      const ms = Date.now() - shownAt.current;
      if (boot.ok) {
        recordSpeedAnswer(db, profileId, boot.deviceId, {
          cardId: round.word.cardId,
          correct: wasCorrect,
          msToAnswer: ms,
        });
      }
      if (wasCorrect) setCorrect((n) => n + 1);

      setIndex((i) => {
        const n = i + 1;
        if (start && n >= start.rounds.length) setDone(true);
        return n;
      });
    },
    [round, profileId, boot, start],
  );

  /* The window is the clock. Running out is simply a wrong answer - there is no
     separate timeout state to reason about. */
  useEffect(() => {
    if (!start || done || !round) return;
    settled.current = false;
    shownAt.current = Date.now();
    const t = setTimeout(() => next(false), start.windowMs);
    return () => clearTimeout(t);
  }, [index, start, done, round, next]);

  /*
    Ramp down only when accuracy is high. Tightening the window on someone who
    is already missing words makes the drill unwinnable rather than harder.
  */
  useEffect(() => {
    if (!done || profileId === null || !start) return;
    const accuracy = start.rounds.length === 0 ? 0 : correct / start.rounds.length;
    if (accuracy <= SPEED_RAMP_THRESHOLD) return;
    const tightened = Math.max(SPEED_FLOOR_MS, start.windowMs - SPEED_STEP_MS);
    if (tightened !== start.windowMs) {
      updateSettings(db, profileId, { speedWindowMs: tightened });
    }
  }, [done, correct, profileId, start]);

  if (profileId === null || !start) return null;

  if (start.rounds.length === 0) {
    return (
      <Screen>
        <Text variant="pageTitle">Not enough words yet.</Text>
        <Text color="inkSoft" style={{ marginTop: space(1) }}>
          The speed drill needs a few vocabulary cards from the lessons you have open.
        </Text>
        <Button
          label="Back to today"
          variant="quiet"
          style={{ marginTop: space(3) }}
          onPress={() => router.back()}
        />
      </Screen>
    );
  }

  if (done || !round) {
    return (
      <Screen>
        <View style={{ flex: 1, justifyContent: "center", gap: space(2) }}>
          <Text variant="pageTitle">Done.</Text>
          <Text color="inkSoft">
            {`${correct} of ${start.rounds.length} inside the window.`}
          </Text>
          <Button
            label="Back to today"
            onPress={() => {
              haptics.sessionComplete();
              router.back();
            }}
          />
        </View>
      </Screen>
    );
  }

  return (
    <Screen>
      <View style={s.head}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
          <Text variant="eyebrow" color="inkSoft">
            Speed drill
          </Text>
          <HelpButton onPress={help.show} />
          <ExitDrill confirm label="Leave" />
        </View>
        {/* Keyed to the card, so a remount can never leave a half finished
            drain attached to the next word. */}
        <SpeedRing key={round.word.cardId} windowMs={start.windowMs} running />
        <Text variant="label" color="inkFaint">
          {`${index + 1} / ${start.rounds.length}`}
        </Text>
      </View>

      <View style={s.prompt}>
        <View style={s.face}>
          <Arabic variant="card" showHarakat={start.showHarakat}>
            {round.word.arabic}
          </Arabic>
        </View>

        <View style={s.options}>
          {round.options.map((o) => (
            <Pressable
              key={o}
              style={s.option}
              onPress={() => {
                haptics.select();
                next(o === round.word.english);
              }}
            >
              <Text>{o}</Text>
            </Pressable>
          ))}
        </View>
      </View>
      <Help topic="speed" open={help.open} onClose={help.close} />
    </Screen>
  );
}
