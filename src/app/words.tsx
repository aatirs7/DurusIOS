import { useLocalSearchParams, useRouter } from "expo-router";
import { useMemo, useRef, useState } from "react";
import { Pressable, ScrollView, View } from "react-native";

import { Arabic } from "@/components/Arabic";
import { BackBar } from "@/components/BackBar";
import { Glass, GlassButton } from "@/components/Glass";
import { Screen } from "@/components/Screen";
import { Text } from "@/components/Text";
import { bootOnce } from "@/data/boot";
import { db } from "@/data/client";
import { submitGrade } from "@/data/review";
import { NEW_PER_DAY, buildWordsSession, type WordQuestion } from "@/data/words";
import {
  WORDS_ATTRIBUTION,
  canShowGloss,
  canShowNote,
  skillsForStage,
  stageShare,
  type WordsLemma,
  type WordsStage,
} from "@/data/wordsContent";
import { gradeWordChoice } from "@/engine/words";
import { haptics } from "@/lib/haptics";
import { SURAHS } from "@/quran/tanzil";
import { useSession } from "@/state/session";
import { RADIUS, space } from "@/theme/layout";
import { FONTS } from "@/theme/typography";
import { makeStyles, useTheme } from "@/theme/useTheme";

/*
  One Quranic Words session (spec sections 6 and 7): a stage's intro the first
  time it starts, each new word's card, then the drills, reviews first.

  Drill 2 (see the Arabic, recall the meaning, then choose it) is the drill
  for now. Drill 1 (listen, choose the meaning) needs an audio module in the
  native build; canPlayWordAudio() is false until then and the session is text
  first. Grading is deterministic: the choice is right or it is not, graded by
  speed the way the book's choice rung is. A wrong answer comes back once at the
  end of the session, ungraded, so the right meaning is seen again.

  Everything Quranic on screen is verbatim Quran Foundation word-by-word, and
  the attribution line sits under it. Notes show only once written and
  verified, which today is none.
*/

type Step =
  | { kind: "intro"; stage: WordsStage }
  | { kind: "teach"; lemma: WordsLemma }
  | { kind: "drill"; q: WordQuestion; retry: boolean };

const useStyles = makeStyles((t) => ({
  body: { flexGrow: 1, alignItems: "center", gap: space(2), paddingVertical: space(2) },
  center: { textAlign: "center" },
  face: { fontFamily: FONTS.quran },
  forms: { flexDirection: "row", flexWrap: "wrap", justifyContent: "center", gap: space(2) },
  skill: {
    width: "100%",
    borderTopWidth: 1,
    borderTopColor: t.colors.rule,
    paddingTop: space(1.5),
    gap: space(0.75),
    alignItems: "center",
  },
  example: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: space(1.5) },
  options: { width: "100%", gap: space(1) },
  option: {
    minHeight: 54,
    borderRadius: RADIUS.field,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: space(2),
    paddingVertical: space(1),
    overflow: "hidden",
  },
  foot: { gap: space(1), paddingBottom: space(1) },
}));

function anchorLabel(lemma: WordsLemma): string {
  const [s, a] = lemma.anchor.ayah.split(":").map(Number);
  const surah = SURAHS[s - 1];
  return surah ? `${surah.en} ${s}:${a}` : lemma.anchor.ayah;
}

export default function WordsSession() {
  const s = useStyles();
  const theme = useTheme();
  const router = useRouter();
  const profileId = useSession((st) => st.activeProfileId);
  const boot = useRef(bootOnce()).current;

  /* Built once on mount, so answering does not reshuffle the session. */
  const { mode } = useLocalSearchParams<{ mode?: string }>();
  const session = useMemo(
    () =>
      profileId === null
        ? null
        : buildWordsSession(db, profileId, mode === "more" ? { extraNew: NEW_PER_DAY } : mode === "practice" ? { practice: true } : {}),
    [profileId, mode],
  );


  const [steps, setSteps] = useState<Step[]>(() =>
    session
      ? [
          ...session.intros.map((stage) => ({ kind: "intro" as const, stage })),
          ...session.newCards.map((lemma) => ({ kind: "teach" as const, lemma })),
          ...session.questions.map((q) => ({ kind: "drill" as const, q, retry: false })),
        ]
      : [],
  );
  const [index, setIndex] = useState(0);
  const [revealed, setRevealed] = useState(false);
  const [chosen, setChosen] = useState<number | null>(null);
  const shownAt = useRef(0);

  if (profileId === null || !session) return null;

  const step = steps[index];
  const next = () => {
    setRevealed(false);
    setChosen(null);
    setIndex((i) => i + 1);
  };

  const finish = () => {
    haptics.sessionComplete();
    router.back();
  };

  if (!step) {
    /* Whether there is anything to practise: any word met, this session included. */
    const canPractice = buildWordsSession(db, profileId, { practice: true }).questions.length > 0;
    const reviewed = session.questions.filter((q) => !q.isNew).length;
    const learnt = session.newCards.length;
    return (
      <Screen>
        <BackBar fallback="/today" />
        <View style={[s.body, { justifyContent: "center" }]}>
          <Text variant="pageTitle" style={s.center}>
            {steps.length === 0 ? "Nothing is due right now" : "That is all for now"}
          </Text>
          <Text color="inkSoft" style={s.center}>
            {steps.length === 0
              ? "Words you have met come back when they are due. You can keep going whenever you like."
              : session.practice
                ? `${reviewed} practised. Practice does not move when words come back.`
                : [learnt ? `${learnt} new ${learnt === 1 ? "word" : "words"}` : null, reviewed ? `${reviewed} reviewed` : null]
                    .filter(Boolean)
                    .join(", ") + "."}
          </Text>
        </View>
        <View style={s.foot}>
          <GlassButton primary label={`Learn ${NEW_PER_DAY} more words`} onPress={() => router.replace("/words?mode=more")} />
          {canPractice ? <GlassButton label="Practise words you have met" onPress={() => router.replace("/words?mode=practice")} /> : null}
          <Pressable accessibilityRole="button" onPress={finish} style={{ alignSelf: "center", paddingVertical: space(1) }}>
            <Text color="lapis">Back to Learn</Text>
          </Pressable>
        </View>
      </Screen>
    );
  }

  const answer = (q: WordQuestion, optionId: number, retry: boolean) => {
    if (chosen !== null) return;
    haptics.select();
    setChosen(optionId);
    const correct = optionId === q.cardId;
    if (!retry && !session.practice && boot.ok) {
      submitGrade(db, profileId, boot.deviceId, {
        cardId: q.cardId,
        direction: "recognition",
        grade: gradeWordChoice(correct, Date.now() - shownAt.current),
        msToAnswer: Date.now() - shownAt.current,
      });
    }
    if (!correct && !retry) setSteps((all) => [...all, { kind: "drill", q, retry: true }]);
  };

  return (
    <Screen>
      <BackBar label="Leave" fallback="/today" />

      <ScrollView contentContainerStyle={s.body} showsVerticalScrollIndicator={false}>
        {step.kind === "intro" ? <Intro stage={step.stage} /> : null}
        {step.kind === "teach" ? <Teach lemma={step.lemma} /> : null}
        {step.kind === "drill" ? (
          <>
            <Text variant="eyebrow" color="inkSoft">
              What does this mean?
            </Text>
            <Arabic variant="card" style={s.face}>
              {step.q.lemma.face}
            </Arabic>
            {revealed ? (
              <View style={s.options}>
                {step.q.options.map((o) => {
                  const isAnswer = o.cardId === step.q.cardId;
                  const tint =
                    chosen === null
                      ? undefined
                      : isAnswer
                        ? theme.colors.verdigris
                        : o.cardId === chosen
                          ? theme.colors.clay
                          : undefined;
                  return (
                    <Pressable
                      key={o.cardId}
                      accessibilityRole="button"
                      accessibilityLabel={o.english.trim()}
                      onPress={() => answer(step.q, o.cardId, step.retry)}
                    >
                      <Glass interactive={chosen === null} tint={tint} style={s.option}>
                        <Text color={tint ? "paper" : "ink"} style={s.center}>
                          {o.english.trim()}
                        </Text>
                      </Glass>
                    </Pressable>
                  );
                })}
              </View>
            ) : (
              <Text color="inkFaint" style={s.center}>
                Think of the meaning first.
              </Text>
            )}
            {chosen !== null ? (
              <Text variant="label" color="inkSoft" style={s.center}>
                {`Heard in ${anchorLabel(step.q.lemma)}`}
              </Text>
            ) : null}
          </>
        ) : null}
      </ScrollView>

      <View style={s.foot}>
        {step.kind === "drill" && !revealed ? (
          <GlassButton
            primary
            label="Show the meanings"
            onPress={() => {
              shownAt.current = Date.now();
              setRevealed(true);
            }}
          />
        ) : step.kind === "drill" && chosen === null ? (
          <GlassButton label="Choose one" disabled onPress={() => {}} />
        ) : (
          <GlassButton primary label={step.kind === "intro" ? "Begin" : "Continue"} onPress={next} />
        )}
        <Text variant="label" color="inkFaint" style={s.center}>
          {WORDS_ATTRIBUTION}
        </Text>
      </View>
    </Screen>
  );
}

function Intro({ stage }: { stage: WordsStage }) {
  const s = useStyles();
  const skills = skillsForStage(stage.stage);
  return (
    <>
      <Text variant="eyebrow" color="inkSoft">
        {`Stage ${stage.stage}`}
      </Text>
      <Text variant="pageTitle" style={s.center}>
        {stage.titleEn}
      </Text>
      <Text color="inkSoft" style={s.center}>
        {`These ${stage.lemmas} words are in about ${stageShare(stage)} of every 100 words of the Quran.`}
      </Text>
      {skills.length > 0 ? (
        <>
          <Text variant="eyebrow" color="inkSoft" style={{ marginTop: space(1) }}>
            Parts of words in this stage
          </Text>
          {skills.map((k) => (
            <View key={k.id} style={s.skill}>
              <Text style={s.center}>{k.label}</Text>
              {k.examples.map((e) => (
                <View key={e.ref} style={s.example}>
                  <Text color="inkSoft">{e.gloss.trim()}</Text>
                  <Arabic variant="inline" style={s.face}>
                    {e.arabic}
                  </Arabic>
                </View>
              ))}
              {canShowNote(k.note) ? <Text color="inkSoft">{k.note.text}</Text> : null}
            </View>
          ))}
        </>
      ) : null}
    </>
  );
}

function Teach({ lemma }: { lemma: WordsLemma }) {
  const s = useStyles();
  const others = lemma.forms.filter((f) => f !== lemma.face).slice(0, 3);
  return (
    <>
      <Text variant="eyebrow" color="inkSoft">
        New word
      </Text>
      <Arabic variant="card" style={s.face}>
        {lemma.face}
      </Arabic>
      {canShowGloss(lemma.gloss) ? (
        <Text variant="pageTitle" style={s.center}>
          {lemma.gloss.text.trim()}
        </Text>
      ) : null}
      {others.length > 0 ? (
        <>
          <Text variant="label" color="inkFaint">
            Also heard as
          </Text>
          <View style={s.forms}>
            {others.map((f) => (
              <Arabic key={f} variant="title" color="inkSoft" style={s.face}>
                {f}
              </Arabic>
            ))}
          </View>
        </>
      ) : null}
      <Text color="inkSoft" style={s.center}>
        {`In ${lemma.freq.toLocaleString("en-US")} words of the Quran. Heard in ${anchorLabel(lemma)}.`}
      </Text>
      {canShowNote(lemma.note) ? <Text color="inkSoft">{lemma.note.text}</Text> : null}
    </>
  );
}
