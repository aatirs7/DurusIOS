import { useRouter } from "expo-router";
import { useCallback, useMemo, useState } from "react";
import { Pressable, View } from "react-native";
import Animated, { FadeIn } from "react-native-reanimated";

import { Arabic } from "@/components/Arabic";
import { BackBar } from "@/components/BackBar";
import { Button } from "@/components/Button";
import { Screen } from "@/components/Screen";
import { Text } from "@/components/Text";
import {
  COUNTED_NOUNS,
  NUMBERS,
  buildCountingQuestion,
  buildWordQuestion,
  countedPhrase,
  easternDigits,
  type CountedNoun,
  type NumberQuestion,
  type NumberStage,
} from "@/engine/numbers";
import { haptics } from "@/lib/haptics";
import { RADIUS, space } from "@/theme/layout";
import { textStyles } from "@/theme/typography";
import { makeStyles, useTheme } from "@/theme/useTheme";

/*
  The numbers drill.

  Two stages, and you choose. Stage one is the ten words; stage two is what
  happens when one goes in front of a noun, which is what Book 1 lessons 19 to
  21 are actually about. Somebody who cannot yet say "seven" has no business
  being asked whether it keeps its ta.

  It touches NOTHING. No card states, no reviews, no schedule - like the case
  drill, this is a drill for one piece of grammar rather than part of the
  ladder, and the numbers are not cards. That is why it writes nothing at all.
*/

const RUN_LENGTH = 12;

const useStyles = makeStyles((t) => ({
  body: { flex: 1, justifyContent: "center", gap: space(3) },

  /* Stage picker. */
  choice: {
    borderWidth: 1.5,
    borderColor: t.colors.rule,
    borderRadius: RADIUS.field,
    backgroundColor: t.colors.surface,
    paddingHorizontal: space(3),
    paddingVertical: space(2.5),
    gap: space(0.5),
    alignItems: "center",
  },

  prompt: { alignItems: "center", gap: space(0.5) },
  digits: { ...textStyles.numeral, fontSize: 64, lineHeight: 74, color: t.colors.ink },
  eastern: { ...textStyles.numeral, fontSize: 28, color: t.colors.inkFaint },

  options: { gap: space(1.5) },
  option: {
    backgroundColor: t.colors.surface,
    borderRadius: RADIUS.button,
    borderWidth: 1,
    borderColor: t.colors.rule,
    paddingVertical: space(2),
    alignItems: "center",
  },
  optionRight: { borderColor: t.colors.verdigris },
  optionWrong: { borderColor: t.colors.clay },

  /* Reserved so revealing the rule does not move the options. */
  reveal: { minHeight: 96, alignItems: "center", justifyContent: "center", gap: space(1) },
  note: { textAlign: "center", maxWidth: 300 },

  summary: { flex: 1, alignItems: "center", justifyContent: "center", gap: space(2) },
  score: { ...textStyles.numeral, fontSize: 56, lineHeight: 66, color: t.colors.ink },
}));

type Round = { question: NumberQuestion; noun: CountedNoun | null; value: number };

function buildRun(stage: NumberStage): Round[] {
  const rounds: Round[] = [];

  for (let i = 0; i < RUN_LENGTH; i += 1) {
    if (stage === "words") {
      const value = NUMBERS[Math.floor(Math.random() * NUMBERS.length)].value;
      rounds.push({ question: buildWordQuestion(value, Math.random), noun: null, value });
    } else {
      /* Three to ten only: one and two are adjectives that follow the noun,
         which is a different rule. */
      const value = 3 + Math.floor(Math.random() * 8);
      const noun = COUNTED_NOUNS[Math.floor(Math.random() * COUNTED_NOUNS.length)];
      rounds.push({ question: buildCountingQuestion(value, noun, Math.random), noun, value });
    }
  }

  return rounds;
}

export default function Numbers() {
  const s = useStyles();
  const theme = useTheme();
  const router = useRouter();

  const [stage, setStage] = useState<NumberStage | null>(null);
  const [rounds, setRounds] = useState<Round[]>([]);
  const [index, setIndex] = useState(0);
  const [picked, setPicked] = useState<string | null>(null);
  const [right, setRight] = useState(0);

  const begin = useCallback((next: NumberStage) => {
    setStage(next);
    setRounds(buildRun(next));
    setIndex(0);
    setPicked(null);
    setRight(0);
  }, []);

  const round = rounds[index];
  const answered = picked !== null;

  const advance = useCallback(() => {
    setPicked(null);
    setIndex((i) => i + 1);
  }, []);

  const counted = useMemo(
    () => (round?.noun ? countedPhrase(round.value, round.noun) : null),
    [round],
  );

  /* ------------------------------------------------------------- the picker */
  if (stage === null) {
    return (
      <Screen>
        <BackBar title="Numbers" />
        <View style={s.body}>
          <View style={{ alignItems: "center", gap: space(1) }}>
            <Text variant="pageTitle" style={{ textAlign: "center" }}>
              Which part?
            </Text>
            <Text color="inkSoft" style={{ textAlign: "center" }}>
              Learn the ten words first. The grammar of counting only makes
              sense once you have them.
            </Text>
          </View>

          <View style={{ gap: space(1.5) }}>
            <Pressable style={s.choice} onPress={() => begin("words")}>
              <Text variant="pageTitle" style={{ fontSize: 20 }}>
                The numbers
              </Text>
              <Text variant="label" color="inkSoft">
                One to ten, as words
              </Text>
            </Pressable>

            <Pressable style={s.choice} onPress={() => begin("counting")}>
              <Text variant="pageTitle" style={{ fontSize: 20 }}>
                Counting things
              </Text>
              <Text variant="label" color="inkSoft">
                Three to ten, and the ta that behaves backwards
              </Text>
            </Pressable>
          </View>
        </View>
      </Screen>
    );
  }

  /* ------------------------------------------------------------ the summary */
  if (!round) {
    return (
      <Screen>
        <BackBar title="Numbers" />
        <View style={s.summary}>
          <Text variant="eyebrow" color="inkSoft">
            {stage === "words" ? "The numbers" : "Counting things"}
          </Text>
          <Text style={s.score}>{`${right}/${rounds.length}`}</Text>
          <Text variant="label" color="inkFaint" style={s.note}>
            Nothing here touches your schedule.
          </Text>
        </View>
        <View style={{ gap: space(1), paddingBottom: space(1) }}>
          <Button label="Go again" onPress={() => begin(stage)} />
          <Button label="Back to today" variant="text" onPress={() => router.replace("/today")} />
        </View>
      </Screen>
    );
  }

  /* -------------------------------------------------------------- the drill */
  const { question } = round;

  return (
    <Screen>
      <BackBar title={stage === "words" ? "The numbers" : "Counting things"} />

      <View style={s.body}>
        <View style={s.prompt}>
          <Text variant="eyebrow" color="inkSoft">
            {stage === "words" ? "Which word is this?" : "Which form goes here?"}
          </Text>
          <Text style={s.digits}>{String(round.value)}</Text>
          <Text style={s.eastern}>{easternDigits(round.value)}</Text>
          {round.noun ? (
            <Text color="inkSoft">{round.noun.english}</Text>
          ) : null}
        </View>

        <View style={s.options}>
          {question.options.map((option) => {
            const isAnswer = option === question.answer;
            const isPicked = option === picked;
            return (
              <Pressable
                key={option}
                disabled={answered}
                onPress={() => {
                  haptics.select();
                  setPicked(option);
                  if (isAnswer) setRight((n) => n + 1);
                }}
                style={[
                  s.option,
                  /* Once answered the right one is marked whichever was
                     chosen. Seeing only your own mistake teaches nothing. */
                  answered && isAnswer && s.optionRight,
                  answered && !isAnswer && isPicked && s.optionWrong,
                ]}
              >
                <Arabic variant="tile">{option}</Arabic>
              </Pressable>
            );
          })}
        </View>

        {/* Height reserved, so the rule appearing does not move the options. */}
        <View style={s.reveal}>
          {answered ? (
            <Animated.View
              entering={FadeIn.duration(200)}
              style={{ alignItems: "center", gap: space(1) }}
            >
              {counted ? <Arabic variant="title">{counted}</Arabic> : null}
              {question.note ? (
                <Text
                  variant="label"
                  style={[
                    s.note,
                    { color: picked === question.answer ? theme.colors.verdigris : theme.colors.clay },
                  ]}
                >
                  {question.note}
                </Text>
              ) : null}
            </Animated.View>
          ) : null}
        </View>
      </View>

      <View style={{ paddingBottom: space(1) }}>
        <Button
          label={index === rounds.length - 1 ? "Finish" : "Next"}
          disabled={!answered}
          onPress={advance}
        />
      </View>
    </Screen>
  );
}
