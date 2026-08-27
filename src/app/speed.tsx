import { useLocalSearchParams, useRouter } from "expo-router";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Pressable, View } from "react-native";

import { Arabic } from "@/components/Arabic";
import { Button } from "@/components/Button";
import { BackBar } from "@/components/BackBar";
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
import {
  DIAGNOSTIC_LENGTH,
  DIAGNOSTIC_MIN_CORRECT,
  windowFromDiagnostic,
} from "@/engine/speedWindow";
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

  /*
    A diagnostic is the same drill with the clock taken off.

    The window used to start at a default and creep down 100ms per run, which
    takes a fortnight to find somebody's real pace and starts everybody in the
    same place - so a fast reader spends two weeks on a drill that is not
    testing them, and a slow one spends the same two weeks losing. This asks
    the question directly instead: read some words untimed, and set the window
    from how long that took.

    Same route rather than a screen of its own, because it IS the drill. Only
    the clock and the length differ.
  */
  const params = useLocalSearchParams<{ mode?: string }>();
  const diagnostic = params.mode === "diagnostic";

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

    return {
      rounds: diagnostic ? rounds.slice(0, DIAGNOSTIC_LENGTH) : rounds,
      windowMs: config.speedWindowMs,
      showHarakat: config.showHarakat,
    };
  }, [profileId, diagnostic]);

  const [index, setIndex] = useState(0);
  const [correct, setCorrect] = useState(0);
  const [done, setDone] = useState(false);
  /* Correct answers only. A wrong answer's time is how long somebody took to
     guess, and counting it would pay out a longer window for answering badly
     and fast. */
  const [correctTimes, setCorrectTimes] = useState<number[]>([]);
  const [measured, setMeasured] = useState<number | null>(null);
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
      if (wasCorrect) {
        setCorrect((n) => n + 1);
        setCorrectTimes((all) => [...all, ms]);
      }

      setIndex((i) => {
        const n = i + 1;
        if (start && n >= start.rounds.length) setDone(true);
        return n;
      });
    },
    [round, profileId, boot, start],
  );

  /*
    The window is the clock. Running out is simply a wrong answer - there is no
    separate timeout state to reason about.

    It does NOT run while the help panel is open. The panel opens itself the
    first time anyone enters this drill, and the clock was counting down behind
    it - so a first run began with a word already lost to a screen explaining
    the rules. Reading the instructions is not part of the twenty seconds.

    help.open is in the dependencies, so closing the panel re-runs this and the
    word gets its full window from the moment it is actually visible.
  */
  useEffect(() => {
    if (!start || done || !round || help.open) return;
    settled.current = false;
    shownAt.current = Date.now();
    /* No clock in a diagnostic - the whole point is to find out how long these
       take when nothing is rushing them. */
    if (diagnostic) return;
    const t = setTimeout(() => next(false), start.windowMs);
    return () => clearTimeout(t);
  }, [index, start, done, round, next, help.open, diagnostic]);

  /*
    A diagnostic writes the window it measured, once.

    Guarded by a ref rather than by `measured`, because measured is legitimately
    null when too few answers were right - so it cannot also mean "not yet
    computed" without the effect running for ever.
  */
  const wrote = useRef(false);
  useEffect(() => {
    if (!done || !diagnostic || profileId === null || wrote.current) return;
    wrote.current = true;
    const next = windowFromDiagnostic(correctTimes);
    setMeasured(next);
    if (next !== null) updateSettings(db, profileId, { speedWindowMs: next });
  }, [done, diagnostic, profileId, correctTimes]);

  /*
    Ramp down only when accuracy is high. Tightening the window on someone who
    is already missing words makes the drill unwinnable rather than harder.
  */
  useEffect(() => {
    if (!done || profileId === null || !start || diagnostic) return;
    const accuracy = start.rounds.length === 0 ? 0 : correct / start.rounds.length;
    if (accuracy <= SPEED_RAMP_THRESHOLD) return;
    const tightened = Math.max(SPEED_FLOOR_MS, start.windowMs - SPEED_STEP_MS);
    if (tightened !== start.windowMs) {
      updateSettings(db, profileId, { speedWindowMs: tightened });
    }
  }, [done, correct, profileId, start, diagnostic]);

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
          <Text variant="pageTitle" style={{ textAlign: "center" }}>
            Done.
          </Text>

          {diagnostic ? (
            <>
              <Text color="inkSoft" style={{ textAlign: "center" }}>
                {measured === null
                  ? `${correct} of ${start.rounds.length} right.`
                  : `${correct} of ${start.rounds.length} right. Your window is now ${(measured / 1000).toFixed(1)} seconds.`}
              </Text>
              {measured === null ? (
                <Text variant="label" color="inkFaint" style={{ textAlign: "center" }}>
                  {`Fewer than ${DIAGNOSTIC_MIN_CORRECT} right, which is not enough to set a pace from. Your window has been left where it was.`}
                </Text>
              ) : null}
              <Button
                label="Back to today"
                onPress={() => {
                  haptics.sessionComplete();
                  router.replace("/today");
                }}
              />
            </>
          ) : (
            <>
              <Text color="inkSoft" style={{ textAlign: "center" }}>
                {`${correct} of ${start.rounds.length} inside the window.`}
              </Text>
              <Button
                label="Back to today"
                onPress={() => {
                  haptics.sessionComplete();
                  router.back();
                }}
              />
              {/* Offered here because this is where somebody has just decided
                  the window is wrong for them. */}
              <Button
                label="Find my speed"
                variant="text"
                onPress={() => router.replace("/speed?mode=diagnostic")}
              />
            </>
          )}
        </View>
      </Screen>
    );
  }

  return (
    <Screen>
      <BackBar
        label="Leave"
        right={<HelpButton onPress={help.show} />}
        confirm={{
          title: "Leave this run?",
          message: "Your answers are saved. The run's result is not.",
        }}
      />

      <View style={s.head}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
          <Text variant="eyebrow" color="inkSoft">
            Speed drill
          </Text>
        </View>
        {/* Keyed to the card, so a remount can never leave a half finished
            drain attached to the next word. */}
        <SpeedRing
          key={`${round.word.cardId}-${help.open ? "held" : "run"}`}
          windowMs={start.windowMs}
          running={!help.open}
        />
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
