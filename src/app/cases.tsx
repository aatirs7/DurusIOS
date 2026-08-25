import { useRouter } from "expo-router";
import { useMemo, useRef, useState } from "react";
import { Pressable, View } from "react-native";

import { Arabic } from "@/components/Arabic";
import { Button } from "@/components/Button";
import { Screen } from "@/components/Screen";
import { Text } from "@/components/Text";
import { db } from "@/data/client";
import { getCaseQuestions } from "@/data/drills";
import { getSettingsFor } from "@/data/settings";
import {
  BLANK,
  CASE_LABELS,
  CASE_MARKS,
  CASE_ORDER,
  type CaseEnding,
} from "@/engine/caseDrill";
import { haptics } from "@/lib/haptics";
import { useSession } from "@/state/session";
import { BAND_HEIGHT, RADIUS, space } from "@/theme/layout";
import { makeStyles } from "@/theme/useTheme";

/*
  U+25CC DOTTED CIRCLE.

  The four endings are combining marks, and a lone combining mark sits at
  whatever height the font gives it, so a row of four bare harakat looks
  scattered. Attaching each to a dotted circle gives them a shared base and
  therefore a shared baseline. This is the conventional way to display a
  diacritic in isolation, not a hack.
*/
const DOTTED_CIRCLE = "◌";

const useStyles = makeStyles((t) => ({
  head: { alignItems: "center", gap: space(0.5) },
  prompt: { flex: 1, alignItems: "center", justifyContent: "center", gap: space(2) },
  phrase: { flexDirection: "row-reverse", flexWrap: "wrap", justifyContent: "center", alignItems: "center" },
  options: { flexDirection: "row", gap: space(1), justifyContent: "center" },
  option: {
    borderWidth: 1,
    borderColor: t.colors.rule,
    backgroundColor: t.colors.surface,
    borderRadius: RADIUS.button,
    paddingVertical: space(1),
    paddingHorizontal: space(2),
    alignItems: "center",
    minWidth: 70,
    gap: space(0.5),
  },
  right: { borderColor: t.colors.verdigris, backgroundColor: t.colors.lapisWash },
  wrong: { borderColor: t.colors.clay },
  band: { height: BAND_HEIGHT, justifyContent: "center", gap: space(1) },
}));

export default function Cases() {
  const s = useStyles();
  const router = useRouter();
  const profileId = useSession((st) => st.activeProfileId);

  const start = useMemo(() => {
    if (profileId === null) return null;
    return {
      questions: getCaseQuestions(db, profileId),
      showHarakat: getSettingsFor(db, profileId).showHarakat,
    };
  }, [profileId]);

  const [index, setIndex] = useState(0);
  const [picked, setPicked] = useState<CaseEnding | null>(null);
  const [correct, setCorrect] = useState(0);
  const answered = useRef(0);

  if (profileId === null || !start) return null;

  if (start.questions.length === 0) {
    return (
      <Screen>
        <Text variant="pageTitle">No phrases yet.</Text>
        <Text color="inkSoft" style={{ marginTop: space(1) }}>
          The case drill needs phrase cards from the lessons you have open.
        </Text>
        <Button
          label="Back to today"
          variant="secondary"
          style={{ marginTop: space(3) }}
          onPress={() => router.back()}
        />
      </Screen>
    );
  }

  const q = start.questions[index];

  if (!q) {
    return (
      <Screen>
        <View style={{ flex: 1, justifyContent: "center", gap: space(2) }}>
          <Text variant="pageTitle">Done.</Text>
          <Text color="inkSoft">{`${correct} of ${answered.current} right.`}</Text>
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

  const settled = picked !== null;

  return (
    <Screen>
      <View style={s.head}>
        <Text variant="eyebrow" color="inkSoft">
          Which ending
        </Text>
        <Text variant="label" color="inkFaint">
          {`${index + 1} / ${start.questions.length}`}
        </Text>
      </View>

      <View style={s.prompt}>
        {/*
          Built from separate Arabic elements rather than one interpolated
          string, so the blank can be styled without splitting a text node that
          bidi would then reorder.
        */}
        <View style={s.phrase}>
          {q.after ? (
            <Arabic variant="title" showHarakat={start.showHarakat}>
              {`${q.after} `}
            </Arabic>
          ) : null}
          <Arabic variant="title" color="lapis" showHarakat={start.showHarakat}>
            {`${q.stem}${settled ? CASE_MARKS[q.answer] : BLANK}${q.punct}`}
          </Arabic>
          {q.before ? (
            <Arabic variant="title" showHarakat={start.showHarakat}>
              {` ${q.before}`}
            </Arabic>
          ) : null}
        </View>

        <Text color="inkSoft" style={{ textAlign: "center" }}>
          {q.english}
        </Text>

        <View style={s.options}>
          {CASE_ORDER.map((ending) => {
            const isRight = ending === q.answer;
            return (
              <Pressable
                key={ending}
                disabled={settled}
                style={[
                  s.option,
                  settled && isRight && s.right,
                  settled && !isRight && picked === ending && s.wrong,
                ]}
                onPress={() => {
                  haptics.select();
                  answered.current += 1;
                  if (isRight) setCorrect((n) => n + 1);
                  setPicked(ending);
                }}
              >
                <Arabic variant="tile" showHarakat>
                  {`${DOTTED_CIRCLE}${CASE_MARKS[ending]}`}
                </Arabic>
                <Text variant="label" color="inkSoft">
                  {CASE_LABELS[ending].en}
                </Text>
              </Pressable>
            );
          })}
        </View>
      </View>

      <View style={s.band}>
        {settled ? (
          <>
            <Text color={picked === q.answer ? "verdigris" : "clay"}>
              {picked === q.answer ? "Right." : "Not that one."}
            </Text>
            <Button
              label="Next"
              variant="secondary"
              onPress={() => {
                setPicked(null);
                setIndex((i) => i + 1);
              }}
            />
          </>
        ) : null}
      </View>
    </Screen>
  );
}
