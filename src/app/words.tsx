import { useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { Pressable, ScrollView, View } from "react-native";

import Svg, { Path } from "react-native-svg";

import { Arabic } from "@/components/Arabic";
import { BackBar } from "@/components/BackBar";
import { Glass, GlassButton } from "@/components/Glass";
import { Screen } from "@/components/Screen";
import { Text } from "@/components/Text";
import { bootOnce } from "@/data/boot";
import { db } from "@/data/client";
import { submitGrade } from "@/data/review";
import { syncWordGlosses, useWordGlosses } from "@/data/wordGlosses";
import {
  NEW_PER_DAY,
  buildWordsSession,
  refreshWordsKnown,
  type WordQuestion,
  type WordsSession as WordsSessionData,
} from "@/data/words";
import {
  WORDS_ATTRIBUTION,
  canShowGloss,
  wordAudioUrl,
  canShowNote,
  lemmaForCard,
  skillsForStage,
  stageShare,
  type WordsLemma,
  type WordsStage,
} from "@/data/wordsContent";
import { transliterateQuranWord } from "@/engine/quranTranslit";
import { canPlayWordAudio, playWordAudio } from "@/lib/wordAudio";
import { playWordFromDownload } from "@/quran/offlineAudio";
import { usePrefs } from "@/state/prefs";
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

  New words go through a learning loop (see buildSteps): meaning, then the
  Arabic for the meaning, then the meaning again. Reviews are asked one way
  or the other. Drill 1 (listen, choose the meaning) needs an audio module in the
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
  /* meaning: see the Arabic, choose the meaning. arabic: see the meaning,
     choose the Arabic. graded: whether the answer goes into the schedule. */
  | { kind: "drill"; q: WordQuestion; retry: boolean; type: DrillType; graded: boolean };

type DrillType = "meaning" | "arabic";

/*
  The session's order, built once.

  Reviews first, each asked one way or the other so a word is met from both
  sides over the days. Then the new words: each word's card, then a learning
  loop across all of them, the way the book's Study Lesson works: choose the
  meaning, then choose the Arabic for the meaning, then the meaning again,
  each round shuffled. Only the first round's answer is graded into the
  schedule (one review per word per day); the other rounds are practice. A
  wrong answer comes back at the end of the session, ungraded.
*/
function buildSteps(session: WordsSessionData): Step[] {
  const shuffle = <T,>(xs: T[]) => [...xs].sort(() => Math.random() - 0.5);
  const reviews = session.questions.filter((q) => !q.isNew);
  const fresh = session.questions.filter((q) => q.isNew);
  const out: Step[] = [...session.intros.map((stage) => ({ kind: "intro" as const, stage }))];
  for (const q of reviews) {
    const type: DrillType = session.practice || Math.random() < 0.5 ? "meaning" : "arabic";
    out.push({ kind: "drill", q, retry: false, type, graded: !session.practice });
  }
  if (fresh.length > 0) {
    out.push(...session.newCards.map((lemma) => ({ kind: "teach" as const, lemma })));
    for (const q of shuffle(fresh)) out.push({ kind: "drill", q, retry: false, type: "meaning", graded: true });
    for (const q of shuffle(fresh)) out.push({ kind: "drill", q, retry: false, type: "arabic", graded: false });
    for (const q of shuffle(fresh)) out.push({ kind: "drill", q, retry: false, type: "meaning", graded: false });
  }
  return out;
}

const useStyles = makeStyles((t) => ({
  body: { flexGrow: 1, alignItems: "center", gap: space(2), paddingVertical: space(2) },
  center: { textAlign: "center" },
  face: { fontFamily: FONTS.quran },
  forms: { flexDirection: "row", flexWrap: "wrap", justifyContent: "center", gap: space(3) },
  form: { alignItems: "center", gap: space(0.5) },
  word: { alignItems: "center", gap: space(1) },
  middle: { justifyContent: "center" },
  listen: { flexDirection: "row", alignItems: "center", gap: space(1), paddingHorizontal: space(2), paddingVertical: space(1), borderRadius: RADIUS.pill },
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

/*
  The word meanings come from Quran Foundation after install (they may not ship
  in the app). Normally they are already here from app open; on a first open
  before they have arrived, this waits for them, and offline it says so.
*/
export default function WordsSession() {
  const ready = useWordGlosses();
  const [tried, setTried] = useState(false);
  useEffect(() => {
    if (ready) return;
    let live = true;
    void syncWordGlosses().finally(() => {
      if (live) setTried(true);
    });
    return () => {
      live = false;
    };
  }, [ready]);
  if (ready) return <WordsSessionBody />;
  return <WaitingForMeanings offline={tried} />;
}

function WaitingForMeanings({ offline }: { offline: boolean }) {
  const s = useStyles();
  return (
    <Screen>
      <BackBar fallback="/today" />
      <View style={[s.body, { justifyContent: "center" }]}>
        <Text variant="pageTitle" style={s.center}>
          {offline ? "Connect once to begin" : "Getting the word meanings"}
        </Text>
        <Text color="inkSoft" style={[s.center, { marginTop: space(2) }]}>
          {offline
            ? "The meanings come from Quran Foundation. Open this again with an internet connection and they will be kept on your phone."
            : "One moment."}
        </Text>
      </View>
    </Screen>
  );
}

function WordsSessionBody() {
  const s = useStyles();
  const theme = useTheme();
  const router = useRouter();
  const profileId = useSession((st) => st.activeProfileId);
  const boot = useRef(bootOnce()).current;

  /* Built once on mount, so answering does not reshuffle the session. */
  const { mode, surah: surahParam } = useLocalSearchParams<{ mode?: string; surah?: string }>();
  /* "Learn from a surah": new words from that surah only. */
  const surah = surahParam && SURAHS[Number(surahParam) - 1] ? Number(surahParam) : null;
  const session = useMemo(
    () =>
      profileId === null
        ? null
        : buildWordsSession(
            db,
            profileId,
            surah !== null
              ? { surah }
              : mode === "more"
                ? { extraNew: NEW_PER_DAY }
                : mode === "practice"
                  ? { practice: true }
                  : {},
          ),
    [profileId, mode, surah],
  );


  const [steps, setSteps] = useState<Step[]>(() => (session ? buildSteps(session) : []));
  const [index, setIndex] = useState(0);
  /* On the way out, hand what is now known to Read and the Map. */
  useEffect(
    () => () => {
      if (profileId !== null) refreshWordsKnown(db, profileId);
    },
    [profileId],
  );
  const [revealed, setRevealed] = useState(false);
  const [chosen, setChosen] = useState<number | null>(null);
  const shownAt = useRef(0);

  if (profileId === null || !session) return null;

  const step = steps[index];
  const next = () => {
    /* A "choose the Arabic" drill shows its options at once: time it from here. */
    shownAt.current = Date.now();
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
          {surah !== null ? (
            <GlassButton
              primary
              label={`Learn more from ${SURAHS[surah - 1].en}`}
              onPress={() => router.replace(`/words?surah=${surah}`)}
            />
          ) : (
            <GlassButton primary label={`Learn ${NEW_PER_DAY} more words`} onPress={() => router.replace("/words?mode=more")} />
          )}
          {canPractice ? <GlassButton label="Practise words you have met" onPress={() => router.replace("/words?mode=practice")} /> : null}
          <Pressable accessibilityRole="button" onPress={finish} style={{ alignSelf: "center", paddingVertical: space(1) }}>
            <Text color="lapis">Back to Learn</Text>
          </Pressable>
        </View>
      </Screen>
    );
  }

  const answer = (st: Extract<Step, { kind: "drill" }>, optionId: number) => {
    const { q, retry } = st;
    if (chosen !== null) return;
    haptics.select();
    setChosen(optionId);
    const correct = optionId === q.cardId;
    if (!retry && st.graded && !session.practice && boot.ok) {
      submitGrade(db, profileId, boot.deviceId, {
        cardId: q.cardId,
        direction: "recognition",
        grade: gradeWordChoice(correct, Date.now() - shownAt.current),
        msToAnswer: Date.now() - shownAt.current,
      });
    }
    if (!correct && !retry) setSteps((all) => [...all, { ...st, retry: true, graded: false }]);
  };

  return (
    <Screen>
      <BackBar label="Leave" fallback="/today" />

      <ScrollView contentContainerStyle={[s.body, step.kind === "teach" && s.middle]} showsVerticalScrollIndicator={false}>
        {step.kind === "intro" ? <Intro stage={step.stage} /> : null}
        {step.kind === "teach" ? <Teach lemma={step.lemma} /> : null}
        {step.kind === "drill" ? (
          <>
            {step.type === "meaning" ? (
              <>
                <Text variant="eyebrow" color="inkSoft">
                  What does this mean?
                </Text>
                <Arabic variant="card" style={s.face}>
                  {step.q.lemma.face}
                </Arabic>
                <Listen key={`${index}`} path={step.q.lemma.audio} />
              </>
            ) : (
              <>
                <Text variant="eyebrow" color="inkSoft">
                  Which is the Arabic for
                </Text>
                <Text variant="pageTitle" style={s.center}>
                  {step.q.english.trim()}
                </Text>
              </>
            )}
            {revealed || step.type === "arabic" ? (
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
                      accessibilityLabel={step.type === "meaning" ? o.english.trim() : (lemmaForCard(o.cardId)?.face ?? o.english)}
                      onPress={() => answer(step, o.cardId)}
                    >
                      <Glass interactive={chosen === null} tint={tint} style={s.option}>
                        {step.type === "meaning" ? (
                          <Text color={tint ? "paper" : "ink"} style={s.center}>
                            {o.english.trim()}
                          </Text>
                        ) : (
                          <Arabic variant="inline" color={tint ? "paper" : "ink"} style={[s.face, { fontSize: 26, lineHeight: 48 }]}>
                            {lemmaForCard(o.cardId)?.face ?? ""}
                          </Arabic>
                        )}
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
        {step.kind === "drill" && step.type === "meaning" && !revealed ? (
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

/*
  The word as Quran Foundation's reciter says it: played once as it appears,
  and again on a tap. Streamed, not stored. Only on builds with the audio
  module; older builds show nothing here.
*/
function Listen({ path }: { path: string | null }) {
  const s = useStyles();
  const theme = useTheme();
  const url = wordAudioUrl(path);
  const can = !!url && canPlayWordAudio();
  /* From a downloaded verse when there is one (offline), else streamed. */
  const hear = () => {
    const { reciterId, translationId } = usePrefs.getState();
    void playWordFromDownload(path, reciterId ?? 7, translationId).then((ok) => ok || playWordAudio(url));
  };
  useEffect(() => {
    if (can) hear();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [can, url]);
  if (!can) return null;
  return (
    <Pressable accessibilityRole="button" accessibilityLabel="Listen" onPress={hear} hitSlop={8}>
      <Glass interactive style={s.listen}>
        <Svg width={20} height={20} viewBox="0 0 24 24">
          <Path d="M4 9.5h3.5L12 5.5v13l-4.5-4H4z" fill="none" stroke={theme.colors.lapis} strokeWidth={1.7} strokeLinejoin="round" />
          <Path d="M15.5 9a4.2 4.2 0 0 1 0 6M18 6.5a7.8 7.8 0 0 1 0 11" fill="none" stroke={theme.colors.lapis} strokeWidth={1.7} strokeLinecap="round" />
        </Svg>
        <Text variant="label">Listen</Text>
      </Glass>
    </Pressable>
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
      <View style={s.word}>
        <Arabic variant="card" style={s.face}>
          {lemma.face}
        </Arabic>
        <Text variant="label" color="inkSoft">
          {transliterateQuranWord(lemma.face)}
        </Text>
        <Listen path={lemma.audio} />
      </View>
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
              <View key={f} style={s.form}>
                <Arabic variant="title" color="inkSoft" style={s.face}>
                  {f}
                </Arabic>
                <Text variant="label" color="inkFaint">
                  {transliterateQuranWord(f)}
                </Text>
              </View>
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
