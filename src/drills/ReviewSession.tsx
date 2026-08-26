import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Pressable, ScrollView, TextInput, View, type ViewStyle } from "react-native";
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";

import { Arabic } from "@/components/Arabic";
import { Button } from "@/components/Button";
import { Text } from "@/components/Text";
import type { Question } from "@/data/queue";
import { checkAnswer } from "@/engine/answer";
import { assembledCorrectly, type Tile } from "@/engine/letters";
import { feedbackFor, gradeFor, modeLabel } from "@/engine/modes";
import { haptics } from "@/lib/haptics";
import { RADIUS, space } from "@/theme/layout";
import { textStyles } from "@/theme/typography";
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
    The end of a session.

    Centred, and built from the same pieces Today is: an eyebrow, one large
    numeral, and a rule with facts under it. It used to be the word "Done." and
    a count, left aligned against the edge of the screen, which read as an
    error state rather than the end of a piece of work.

    Facts only, and no praise. Spec section 1.1 point 6 - the app does not
    editorialise on what you did - applies here more than anywhere, because
    this is the one screen with something to congratulate you about.
  */
  summary: { flex: 1, alignItems: "center", justifyContent: "center", gap: space(2) },
  summaryNumeral: { ...textStyles.numeral, fontSize: 64, lineHeight: 74, color: t.colors.ink },
  summaryRule: { height: 1, backgroundColor: t.colors.rule, alignSelf: "stretch", marginVertical: space(1) },
  summaryRow: { flexDirection: "row", justifyContent: "center", gap: space(5) },
  summaryStat: { alignItems: "center", gap: space(0.25) },
  summaryStatValue: { ...textStyles.numeral, fontSize: 22, color: t.colors.ink },
  summaryNote: { textAlign: "center", maxWidth: 260 },

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

/*
  Fades a piece of the answer in without moving anything.

  The three things that appear on an answer - the transliteration, the gender
  and plural chips, and the verdict - used to pop in, and the chips pushed the
  four options down the screen as they did. A moving target under a thumb
  already on its way is worse than a slow one.

  So the space is always reserved and only the opacity changes. It fades IN over
  a couple of hundred milliseconds and out instantly: the outward fade would
  otherwise still be running over the next card, which is the one thing the
  hand-off must never show.
*/
const REVEAL_MS = 240;

function Reveal({
  show,
  style,
  children,
}: {
  show: boolean;
  style?: ViewStyle | ViewStyle[];
  children: React.ReactNode;
}) {
  /*
    Always starts at zero, even when it mounts already shown.

    The verdict overlay is mounted only once there is an answer, so seeding it
    from `show` would have it appear at full opacity and skip the fade entirely
    - the exact abruptness this exists to remove. The effect runs after the
    first paint and takes it up from there.
  */
  const opacity = useSharedValue(0);

  useEffect(() => {
    opacity.value = show
      ? withTiming(1, { duration: REVEAL_MS, easing: Easing.bezier(0.2, 0, 0.1, 1) })
      : 0;
  }, [show, opacity]);

  const animated = useAnimatedStyle(() => ({ opacity: opacity.value }));

  return (
    <Animated.View style={[style, animated]} pointerEvents="none">
      {children}
    </Animated.View>
  );
}

/*
  How much room the verdict needs at the foot of the screen.

  The verdict is absolutely positioned so that showing it moves nothing - but
  "moves nothing" and "covers nothing" are different promises, and only the
  first was being kept. With four options on a phone the fourth one reached
  into the same band, so the answer landed on top of it.

  Reserved as padding on the scroll content, ALWAYS, whether or not there is a
  verdict yet. Adding it only once answered would be the layout shift this
  design exists to avoid.

  Sized for the tallest case: a wrong answer, which stacks the correct answer,
  the pill and the "tap anywhere" line.
*/
const VERDICT_SPACE = 148;

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
  /*
    What the session is worth saying afterwards. Accumulated as it goes rather
    than derived at the end, because the queue has been consumed by then and
    the answers are not on this screen any more.
  */
  const [right, setRight] = useState(0);
  const [cameBack, setCameBack] = useState(0);
  const [times, setTimes] = useState<number[]>([]);

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
      if (correct) setRight((n) => n + 1);
      if (grade === "again") setCameBack((n) => n + 1);
      setTimes((all) => [...all, msToAnswer]);
      setResult({ correct, close, grade, message: feedbackFor(outcome, grade) });
    },
    [question, result, onAnswer],
  );

  if (!question) {
    /*
      The typical answer, not the average one. A single card where the phone
      was put down mid-session drags a mean into meaninglessness, and the
      median is what the stats screen already reports for the same reason.
    */
    const sorted = [...times].sort((a, b) => a - b);
    const typical = sorted.length
      ? sorted.length % 2
        ? sorted[(sorted.length - 1) / 2]
        : (sorted[sorted.length / 2 - 1] + sorted[sorted.length / 2]) / 2
      : null;

    return (
      <View style={s.root}>
        <View style={s.summary}>
          <Text variant="eyebrow" color="inkSoft">
            Session
          </Text>

          <Text style={s.summaryNumeral}>{String(answered)}</Text>
          <Text variant="eyebrow" color="inkSoft">
            {answered === 1 ? "answer" : "answers"}
          </Text>

          {answered > 0 ? (
            <>
              <View style={s.summaryRule} />

              <View style={s.summaryRow}>
                <View style={s.summaryStat}>
                  <Text style={s.summaryStatValue}>{`${Math.round((right / answered) * 100)}%`}</Text>
                  <Text variant="eyebrow" color="inkSoft">
                    right
                  </Text>
                </View>

                {typical !== null ? (
                  <View style={s.summaryStat}>
                    <Text style={s.summaryStatValue}>{`${(typical / 1000).toFixed(1)}s`}</Text>
                    <Text variant="eyebrow" color="inkSoft">
                      typical
                    </Text>
                  </View>
                ) : null}
              </View>

              {/*
                Stated as a fact about the words rather than about the reader.
                "3 came back" is what happened; "you got 3 wrong" is a verdict,
                and a word you missed today is the whole point of the app
                rather than a failure of it.
              */}
              {cameBack > 0 ? (
                <Text variant="label" color="inkFaint" style={s.summaryNote}>
                  {`${cameBack} ${cameBack === 1 ? "word" : "words"} came back for another go, and ${cameBack === 1 ? "is" : "are"} due again soon.`}
                </Text>
              ) : null}
            </>
          ) : null}
        </View>

        <Button label="Back to today" onPress={onDone} />
      </View>
    );
  }

  const done = result !== null;
  const tone = result?.correct ? theme.colors.verdigris : theme.colors.clay;

  return (
    <View style={s.root}>
      <ScrollView
        contentContainerStyle={{ flexGrow: 1, paddingBottom: VERDICT_SPACE }}
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

            <Reveal show={done && !!question.transliteration}>
              <Text color="inkFaint" style={s.translit}>
                {question.transliteration ?? " "}
              </Text>
            </Reveal>
          </View>

          {/*
            Gender and plural belong under the word they describe, not down
            beside the verdict where wide pills read as buttons. Revealed only
            on a correct answer: on a wrong one, the word itself is what to
            read.

            The row is RENDERED as soon as the card is, and only faded in later.
            Whether a word has a gender is known before it is answered, so the
            height can be reserved from the start - which is what stops the four
            options sliding down at the moment of the answer.
          */}
          {question.gender || question.plural ? (
            <Reveal show={!!result?.correct} style={s.notes}>
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
            </Reveal>
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

          <Reveal show style={s.verdict}>
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
          </Reveal>
        </>
      ) : null}
    </View>
  );
}
