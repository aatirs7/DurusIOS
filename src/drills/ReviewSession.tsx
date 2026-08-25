import { useCallback, useMemo, useRef, useState } from "react";
import { Pressable, ScrollView, TextInput, View } from "react-native";

import { Arabic } from "@/components/Arabic";
import { Button } from "@/components/Button";
import { Text } from "@/components/Text";
import type { Question } from "@/data/queue";
import { checkAnswer } from "@/engine/answer";
import { assembledCorrectly, type Tile } from "@/engine/letters";
import { feedbackFor, gradeFor, modeLabel } from "@/engine/modes";
import { haptics } from "@/lib/haptics";
import { RADIUS, space } from "@/theme/layout";
import { makeStyles, useTheme } from "@/theme/useTheme";

const useStyles = makeStyles((t) => ({
  root: { flex: 1 },

  /* The card column, centred vertically. The verdict is overlaid rather than
     placed in this flow, so the answers never jump when a result appears. */
  column: { flex: 1, justifyContent: "center", gap: space(3) },

  prompt: { alignItems: "center", gap: space(0.5) },
  /*
    Always rendered, even before the answer, at zero opacity. Reserving the line
    is what stops the four options shifting down the moment a card is answered -
    a moving target under a thumb already on its way.
  */
  translit: { fontStyle: "italic", textAlign: "center", fontSize: 18 },

  notes: { flexDirection: "row", flexWrap: "wrap", justifyContent: "center", gap: space(1) },
  note: {
    borderWidth: 1,
    borderColor: t.colors.rule,
    borderRadius: RADIUS.pill,
    paddingHorizontal: space(1.5),
    paddingVertical: 2,
  },

  options: { gap: space(1.5) },
  option: {
    backgroundColor: t.colors.surface,
    borderRadius: RADIUS.button,
    borderWidth: 1,
    borderColor: t.colors.rule,
    paddingHorizontal: space(2.5),
    paddingVertical: space(2),
    alignItems: "center",
    justifyContent: "center",
  },
  optionRight: { borderColor: t.colors.verdigris },
  optionWrong: { borderColor: t.colors.clay },
  optionText: { textAlign: "center" },

  input: {
    borderWidth: 1,
    borderColor: t.colors.rule,
    backgroundColor: t.colors.surface,
    borderRadius: RADIUS.button,
    paddingVertical: space(2),
    paddingHorizontal: space(2.5),
    color: t.colors.ink,
    fontSize: 18,
    textAlign: "center",
    minHeight: 56,
  },

  tiles: { flexDirection: "row-reverse", flexWrap: "wrap", gap: space(1), justifyContent: "center" },
  tile: {
    borderWidth: 1,
    borderColor: t.colors.rule,
    backgroundColor: t.colors.surface,
    borderRadius: RADIUS.tile,
    paddingHorizontal: space(1.5),
    paddingVertical: space(0.5),
    minWidth: 48,
    alignItems: "center",
  },
  built: {
    flexDirection: "row-reverse",
    flexWrap: "wrap",
    gap: space(0.5),
    justifyContent: "center",
    minHeight: 60,
    alignItems: "center",
  },

  /*
    The verdict sits over everything, pinned to the bottom, and the whole screen
    becomes the tap target that advances. Overlaid rather than in the flow so
    the card above does not move when it appears.
  */
  scrim: { position: "absolute", top: 0, left: 0, right: 0, bottom: 0, zIndex: 10 },
  verdict: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: space(2),
    alignItems: "center",
    gap: space(1),
    zIndex: 11,
  },
  pill: {
    borderWidth: 1,
    borderRadius: RADIUS.pill,
    paddingHorizontal: space(2),
    paddingVertical: space(0.75),
  },
}));

type Result = {
  correct: boolean;
  close: boolean;
  grade: ReturnType<typeof gradeFor>;
  message: string;
};

export type ReviewSessionProps = {
  questions: Question[];
  onAnswer: (q: Question, grade: ReturnType<typeof gradeFor>, msToAnswer: number) => void;
  onDone: () => void;
  showHarakat: boolean;
};

export function ReviewSession({ questions, onAnswer, onDone, showHarakat }: ReviewSessionProps) {
  const s = useStyles();
  const theme = useTheme();

  const [queue, setQueue] = useState<Question[]>(questions);
  const [index, setIndex] = useState(0);
  const [typed, setTyped] = useState("");
  const [built, setBuilt] = useState<Tile[]>([]);
  const [picked, setPicked] = useState<string | null>(null);
  const [result, setResult] = useState<Result | null>(null);
  const [answered, setAnswered] = useState(0);

  /* Time to answer runs from the card appearing, not from the first keystroke.
     A ref, so reading it never renders and cannot be a frame stale. */
  const shownAt = useRef(Date.now());

  const question = queue[index];

  const remainingTiles = useMemo(() => {
    if (!question || question.mode !== "assemble") return [];
    const used = new Set(built.map((t) => t.id));
    return question.tiles.filter((t) => !used.has(t.id));
  }, [question, built]);

  const advance = useCallback(() => {
    if (!result || !question) return;
    /* Clearing the result and advancing in the SAME commit, so the previous
       answer never flashes on top of the next card. */
    setQueue((q) => (result.grade === "again" ? [...q, question] : q));
    setIndex((i) => i + 1);
    setResult(null);
    setPicked(null);
    setTyped("");
    setBuilt([]);
    shownAt.current = Date.now();
  }, [result, question]);

  const settle = useCallback(
    (correct: boolean, close: boolean) => {
      if (!question || result) return;
      const msToAnswer = Date.now() - shownAt.current;
      const outcome = { correct, close, msToAnswer, mode: question.mode };
      const grade = gradeFor(outcome);
      onAnswer(question, grade, msToAnswer);
      setAnswered((n) => n + 1);
      setResult({ correct, close, grade, message: feedbackFor(outcome, grade) });
    },
    [question, result, onAnswer],
  );

  if (!question) {
    return (
      <View style={[s.root, { justifyContent: "center", gap: space(2) }]}>
        <Text variant="pageTitle">Done.</Text>
        <Text color="inkSoft">{`${answered} ${answered === 1 ? "answer" : "answers"}.`}</Text>
        <Button label="Back to today" onPress={onDone} />
      </View>
    );
  }

  const done = result !== null;
  const tone = result?.correct ? theme.colors.verdigris : theme.colors.clay;

  return (
    <View style={s.root}>
      <ScrollView
        contentContainerStyle={{ flexGrow: 1 }}
        keyboardShouldPersistTaps="handled"
        scrollEnabled={!done}
      >
        <View style={s.column}>
          {/* Which rung this card is on, so the format is never a surprise. */}
          <Text variant="eyebrow" color="inkSoft" style={{ textAlign: "center" }}>
            {modeLabel(question.mode, question.direction)}
          </Text>

          <View style={s.prompt}>
            {/* Recognition shows the Arabic and nothing else, because anything
                else on screen is something the eye can cheat with. */}
            {question.direction === "recognition" ? (
              <Arabic variant="card" showHarakat={showHarakat}>
                {question.arabic}
              </Arabic>
            ) : (
              <Text variant="pageTitle" style={{ textAlign: "center" }}>
                {question.english}
              </Text>
            )}

            <Text
              color="inkFaint"
              style={[s.translit, { opacity: done && question.transliteration ? 1 : 0 }]}
            >
              {question.transliteration ?? " "}
            </Text>
          </View>

          {/*
            Gender and plural belong under the word they describe, not down
            beside the verdict where wide pills read as buttons. Shown only on a
            correct answer: on a wrong one, the word itself is what to read.
          */}
          {result?.correct && (question.gender || question.plural) ? (
            <View style={s.notes}>
              {question.gender ? (
                <View style={s.note}>
                  <Text variant="label" color="inkSoft">
                    {question.gender === "m" ? "masculine" : "feminine"}
                  </Text>
                </View>
              ) : null}
              {question.plural ? (
                <View style={s.note}>
                  <Arabic variant="inline" showHarakat={showHarakat}>
                    {question.plural}
                  </Arabic>
                </View>
              ) : null}
            </View>
          ) : null}

          {question.mode === "choice" ? (
            <View style={s.options}>
              {question.options.map((o) => {
                const isAnswer = o.english === question.english;
                const isPicked = o.english === picked;
                return (
                  <Pressable
                    key={`${o.arabic}|${o.english}`}
                    disabled={done}
                    onPress={() => {
                      haptics.select();
                      setPicked(o.english);
                      settle(isAnswer, false);
                    }}
                    style={[
                      s.option,
                      /* Once answered the right one is marked whether or not it
                         was chosen. Seeing only your own mistake teaches
                         nothing. */
                      done && isAnswer && s.optionRight,
                      done && !isAnswer && isPicked && s.optionWrong,
                    ]}
                  >
                    {question.direction === "production" ? (
                      <Arabic variant="tile" showHarakat={showHarakat}>
                        {o.arabic}
                      </Arabic>
                    ) : (
                      <Text style={s.optionText}>{o.english}</Text>
                    )}
                  </Pressable>
                );
              })}
            </View>
          ) : null}

          {question.mode === "written" ? (
            <TextInput
              value={typed}
              onChangeText={setTyped}
              editable={!done}
              placeholder="the meaning"
              placeholderTextColor={theme.colors.inkFaint}
              style={s.input}
              /* Autocorrect turning "masjid" into "mastic" and marking it wrong
                 is the single most annoying possible bug in this app. */
              autoCorrect={false}
              autoCapitalize="none"
              spellCheck={false}
              autoComplete="off"
              returnKeyType="done"
              onSubmitEditing={() => {
                if (done || typed.trim() === "") return;
                const m = checkAnswer(typed, question.english);
                settle(m.kind !== "wrong", m.kind === "close");
              }}
            />
          ) : null}

          {question.mode === "assemble" ? (
            <>
              <View style={s.built}>
                {built.map((t, i) => (
                  <Pressable
                    key={`${t.id}-${i}`}
                    disabled={done}
                    onPress={() => {
                      haptics.select();
                      setBuilt((b) => b.filter((_, j) => j !== i));
                    }}
                    style={s.tile}
                  >
                    <Arabic variant="tile" showHarakat={showHarakat}>
                      {t.letter}
                    </Arabic>
                  </Pressable>
                ))}
              </View>
              <View style={s.tiles}>
                {remainingTiles.map((t) => (
                  <Pressable
                    key={t.id}
                    disabled={done}
                    onPress={() => {
                      haptics.select();
                      const next = [...built, t];
                      setBuilt(next);
                      /* Compared by text, not tile order: a word with a
                         repeated letter has more than one correct arrangement. */
                      if (next.length === question.tiles.length) {
                        settle(assembledCorrectly(next, question.arabic), false);
                      }
                    }}
                    style={s.tile}
                  >
                    <Arabic variant="tile" showHarakat={showHarakat}>
                      {t.letter}
                    </Arabic>
                  </Pressable>
                ))}
              </View>
            </>
          ) : null}
        </View>
      </ScrollView>

      {done ? (
        <>
          {/* The whole screen advances. No Next button competing with four
              answers for the same thumb. */}
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Next card"
            style={s.scrim}
            onPress={advance}
          />

          <View style={s.verdict} pointerEvents="none">
            {/*
              On a wrong answer, the side that was being asked for. The other
              side is the prompt, still on screen, so repeating it would say
              nothing. Above the verdict, because it is the part worth reading.
            */}
            {!result.correct ? (
              question.direction === "production" ? (
                <Arabic variant="title" showHarakat={showHarakat}>
                  {question.arabic}
                </Arabic>
              ) : (
                <Text style={{ fontSize: 20 }}>{question.english}</Text>
              )
            ) : null}

            {/* A badge in its own colour, rather than a line of small text that
                has to compete with four answer buttons. */}
            <View style={[s.pill, { borderColor: tone }]}>
              <Text style={{ fontSize: 18, color: tone }}>{result.message}</Text>
            </View>

            <Text variant="label" color="inkFaint">
              Tap anywhere to continue
            </Text>
          </View>
        </>
      ) : null}
    </View>
  );
}
