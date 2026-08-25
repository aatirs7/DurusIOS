import { useCallback, useMemo, useRef, useState } from "react";
import { Pressable, ScrollView, TextInput, View } from "react-native";

import { Arabic } from "@/components/Arabic";
import { Button } from "@/components/Button";
import { Text } from "@/components/Text";
import type { Question } from "@/data/queue";
import { assembledCorrectly, type Tile } from "@/engine/letters";
import { checkAnswer } from "@/engine/answer";
import { feedbackFor, gradeFor, modeLabel } from "@/engine/modes";
import { haptics } from "@/lib/haptics";
import { BAND_HEIGHT, RADIUS, space } from "@/theme/layout";
import { makeStyles, useTheme } from "@/theme/useTheme";

const useStyles = makeStyles((t) => ({
  root: { flex: 1 },
  header: { alignItems: "center", paddingBottom: space(1) },
  prompt: { flex: 1, justifyContent: "center", alignItems: "center", gap: space(2) },
  english: { textAlign: "center" },

  options: { gap: space(1) },
  option: {
    borderWidth: 1,
    borderColor: t.colors.rule,
    backgroundColor: t.colors.surface,
    borderRadius: RADIUS.button,
    paddingVertical: space(1.5),
    paddingHorizontal: space(2),
    minHeight: 52,
    justifyContent: "center",
  },
  optionRight: { borderColor: t.colors.verdigris, backgroundColor: t.colors.lapisWash },
  optionWrong: { borderColor: t.colors.clay },

  input: {
    borderWidth: 1,
    borderColor: t.colors.rule,
    backgroundColor: t.colors.surface,
    borderRadius: RADIUS.button,
    paddingVertical: space(1.5),
    paddingHorizontal: space(2),
    color: t.colors.ink,
    fontSize: 18,
    minHeight: 52,
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
    Reserved height rather than an absolutely positioned overlay. The web
    version learned this the hard way: floating the band over the content put it
    on top of the input on small devices, so an answer could end up underneath
    the thing telling you about it.
  */
  band: { height: BAND_HEIGHT, justifyContent: "center", gap: space(1) },
  bandRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
}));

type Result = {
  correct: boolean;
  close: boolean;
  grade: ReturnType<typeof gradeFor>;
  feedback: string;
  /* What the answer actually was, shown only when they got it wrong. */
  answer: string;
};

export type ReviewSessionProps = {
  questions: Question[];
  onAnswer: (q: Question, grade: ReturnType<typeof gradeFor>, msToAnswer: number) => void;
  onUndo: (q: Question) => void;
  onDone: () => void;
  showHarakat: boolean;
};

export function ReviewSession({
  questions,
  onAnswer,
  onUndo,
  onDone,
  showHarakat,
}: ReviewSessionProps) {
  const s = useStyles();
  const theme = useTheme();

  const [queue, setQueue] = useState<Question[]>(questions);
  const [index, setIndex] = useState(0);
  const [typed, setTyped] = useState("");
  const [built, setBuilt] = useState<Tile[]>([]);
  const [result, setResult] = useState<Result | null>(null);
  const [answered, setAnswered] = useState(0);

  /*
    Time to answer runs from the card appearing, not from the first keystroke.
    A ref rather than state, so reading it never causes a render and the value
    cannot be one frame stale.
  */
  const shownAt = useRef(Date.now());

  const question = queue[index];

  const remainingTiles = useMemo(() => {
    if (!question || question.mode !== "assemble") return [];
    const usedIds = new Set(built.map((t) => t.id));
    return question.tiles.filter((t) => !usedIds.has(t.id));
  }, [question, built]);

  const advance = useCallback(
    (pushBack: boolean) => {
      /*
        Clearing the result and advancing in the SAME commit, so the previous
        answer never flashes on top of the next card.
      */
      setQueue((q) => (pushBack && question ? [...q, question] : q));
      setIndex((i) => i + 1);
      setResult(null);
      setTyped("");
      setBuilt([]);
      shownAt.current = Date.now();
    },
    [question],
  );

  const settle = useCallback(
    (correct: boolean, close: boolean) => {
      if (!question) return;
      const msToAnswer = Date.now() - shownAt.current;
      const outcome = { correct, close, msToAnswer, mode: question.mode };
      const grade = gradeFor(outcome);

      onAnswer(question, grade, msToAnswer);
      setAnswered((n) => n + 1);
      setResult({
        correct,
        close,
        grade,
        feedback: feedbackFor(outcome, grade),
        answer: question.direction === "production" ? question.arabic : question.english,
      });
    },
    [question, onAnswer],
  );

  if (!question) {
    /* Spec section 7.5: Success fires once, at the end of a session, never per
       card. Calling it during render would repeat it, so it is fired by the
       button that got here. */
    return (
      <View style={[s.root, { justifyContent: "center", gap: space(2) }]}>
        <Text variant="pageTitle">Done.</Text>
        <Text color="inkSoft">{`${answered} ${answered === 1 ? "answer" : "answers"}.`}</Text>
        <Button label="Back to today" onPress={onDone} />
      </View>
    );
  }

  const dismissed = result !== null;

  return (
    <View style={s.root}>
      <View style={s.header}>
        {/* Shown above the card, so the rung you are on is never a surprise. */}
        <Text variant="eyebrow" color="inkSoft">
          {modeLabel(question.mode, question.direction)}
        </Text>
      </View>

      <ScrollView
        contentContainerStyle={{ flexGrow: 1 }}
        keyboardShouldPersistTaps="handled"
      >
        <View style={s.prompt}>
          {question.direction === "recognition" ? (
            <Arabic variant="card" showHarakat={showHarakat}>
              {question.arabic}
            </Arabic>
          ) : (
            <Text variant="pageTitle" style={s.english}>
              {question.english}
            </Text>
          )}

          {question.mode === "choice" ? (
            <View style={s.options}>
              {question.options.map((o) => {
                const isRight = o.english === question.english;
                const show = dismissed;
                return (
                  <Pressable
                    key={`${o.arabic}|${o.english}`}
                    disabled={dismissed}
                    onPress={() => {
                      haptics.select();
                      settle(isRight, false);
                    }}
                    style={[
                      s.option,
                      show && isRight && s.optionRight,
                      show && !isRight && result?.correct === false && s.optionWrong,
                    ]}
                  >
                    {question.direction === "recognition" ? (
                      <Text>{o.english}</Text>
                    ) : (
                      <Arabic variant="inline" showHarakat={showHarakat}>
                        {o.arabic}
                      </Arabic>
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
              editable={!dismissed}
              placeholder="the meaning"
              placeholderTextColor={theme.colors.inkFaint}
              style={s.input}
              /*
                Autocorrect turning "masjid" into "mastic" and marking it wrong
                is the single most annoying possible bug in this app.
              */
              autoCorrect={false}
              autoCapitalize="none"
              spellCheck={false}
              autoComplete="off"
              returnKeyType="done"
              onSubmitEditing={() => {
                if (dismissed || typed.trim() === "") return;
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
                    disabled={dismissed}
                    onPress={() => {
                      /* Tapping a placed tile returns it. */
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
                    disabled={dismissed}
                    onPress={() => {
                      haptics.select();
                      const next = [...built, t];
                      setBuilt(next);
                      /*
                        Compared by text rather than by tile order, because a
                        word with a repeated letter has more than one correct
                        arrangement.
                      */
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

      <View style={s.band}>
        {result ? (
          <>
            <View style={s.bandRow}>
              {/* Never praise, never a streak. "Right.", "Right, but slow.",
                  "Not that one." */}
              <Text color={result.correct ? "verdigris" : "clay"}>{result.feedback}</Text>
              <Pressable
                onPress={() => {
                  onUndo(question);
                  setResult(null);
                  shownAt.current = Date.now();
                }}
              >
                <Text variant="label" color="inkFaint">
                  Undo
                </Text>
              </Pressable>
            </View>

            {!result.correct ? (
              question.direction === "production" ? (
                <Arabic variant="inline" showHarakat={showHarakat}>
                  {result.answer}
                </Arabic>
              ) : (
                <Text color="inkSoft">{result.answer}</Text>
              )
            ) : null}

            {/*
              The band stays up until dismissed. No timer: the moment right
              after getting a word wrong is the moment you are actually reading
              it, and how long that takes is not something the app can know.
            */}
            <Button
              label="Next"
              variant="secondary"
              onPress={() => advance(result.grade === "again")}
            />
          </>
        ) : null}
      </View>
    </View>
  );
}
