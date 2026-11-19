import { eq } from "drizzle-orm";
import { useFocusEffect, useRouter } from "expo-router";
import { useCallback, useMemo, useState } from "react";
import { Pressable, ScrollView, View } from "react-native";

import { Arabic } from "@/components/Arabic";
import { BarakahRing } from "@/components/BarakahRing";
import { Breath } from "@/components/Breath";
import { Glass, GlassButton } from "@/components/Glass";
import { Screen } from "@/components/Screen";
import { Text } from "@/components/Text";
import { TopBar } from "@/components/TopBar";
import { db } from "@/data/client";
import { countDue, countNewAvailable } from "@/data/queue";
import { lessons } from "@/data/schema";
import { getSettingsFor } from "@/data/settings";
import {
  memorizedCoverage,
  wordsProgress,
  type WordsStageView,
} from "@/data/words";
import { WORDS } from "@/data/wordsContent";
import { TOTAL_LESSONS } from "@/engine/constants";
import { dateLine } from "@/lib/time";
import { countRange, foldStatus } from "@/quran/status";
import { SURAHS } from "@/quran/tanzil";
import { useQuranStatus } from "@/state/quranStatus";
import { useSession } from "@/state/session";
import { TICK, space } from "@/theme/layout";
import { textStyles } from "@/theme/typography";
import { makeStyles, useTheme } from "@/theme/useTheme";

/*
  Learn opens on a calm overview (the owner's call): one ring, what Learn is
  in a few plain sentences, and two ways in. "Begin" opens the Quranic Words
  path; "Arabic Course" opens the course with every control it had. A glass
  Back pill in the top bar returns to the overview.

  Earlier note, still true of the parts: Quranic Words first, the Arabic
  Course as "Go deeper" (spec section 3).

  The same page as before in its parts: the breathing light, the shared top
  bar, glass buttons, the two-by-two glass tiles and the glass pills. What
  changed is the order. The words track leads with its coverage line, its one
  Start and its path of stages; the course keeps every control it had, under
  it, now that the page scrolls.

  The coverage line says "words you know make up", never "understand": 80% of
  the words is not 80% comprehension (spec section 1).
*/

const useStyles = makeStyles((t) => ({
  scroll: { paddingBottom: space(6), gap: space(3) },
  center: { textAlign: "center" },

  meter: { alignItems: "center", gap: space(1), paddingTop: space(2) },
  track: {
    width: "100%",
    height: 8,
    borderRadius: 999,
    backgroundColor: t.colors.surfaceSunk,
    overflow: "hidden",
  },
  fill: { height: 8, borderRadius: 999, backgroundColor: t.colors.lapis },
  markRow: { width: "100%", height: 14 },
  mark: {
    position: "absolute",
    top: 0,
    width: 1,
    height: 8,
    backgroundColor: t.colors.inkSoft,
  },
  lines: { alignItems: "center", gap: space(0.5) },

  path: { gap: space(1) },
  stage: {
    flexDirection: "row",
    alignItems: "center",
    gap: space(1.5),
    paddingVertical: space(1.25),
    paddingHorizontal: space(2),
    borderRadius: 20,
    overflow: "hidden",
  },
  home: {
    flexGrow: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: space(2.5),
    paddingBottom: space(12),
  },
  ringBox: { alignItems: "center", justifyContent: "center" },
  ringText: { position: "absolute", alignItems: "center" },
  back: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    borderRadius: 999,
    paddingVertical: space(0.875),
    paddingHorizontal: space(1.5),
    overflow: "hidden",
  },
  stageText: { flex: 1, gap: space(0.25), alignItems: "center" },

  deeper: { alignItems: "center", gap: space(2), paddingTop: space(2) },
  lesson: { alignItems: "center", gap: space(0.5) },
  count: { alignItems: "center", gap: space(0.5) },
  numeral: { ...textStyles.numeral, color: t.colors.ink },
  buttons: { width: "100%", gap: space(1) },

  grid: { flexDirection: "row", flexWrap: "wrap", width: "100%" },
  gridItem: { width: "50%", alignItems: "center", padding: space(0.625) },
  tile: {
    height: 56,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  pill: {
    borderRadius: 999,
    paddingVertical: space(1),
    paddingHorizontal: space(2.5),
    overflow: "hidden",
  },
  foot: { alignItems: "center", gap: space(2.5), width: "100%" },
  ticks: { flexDirection: "row", justifyContent: "center", gap: TICK.gap },
  tick: { width: TICK.width, height: TICK.height, borderRadius: 999 },
  footLinks: { flexDirection: "row", justifyContent: "center", gap: space(3) },
}));

/* The quiet line under a stage: a fact, never praise. */
function stageLine(st: WordsStageView, current: boolean): string {
  if (st.items > 0 && st.learned >= st.items)
    return `${st.titleEn}: every word known`;
  if (current || st.introduced > 0)
    return `${st.learned} of ${st.items} words known`;
  return `${st.items} words`;
}

export default function Today() {
  const s = useStyles();
  const theme = useTheme();
  const router = useRouter();
  const profileId = useSession((st) => st.activeProfileId);
  const events = useQuranStatus((st) => st.events);
  const [howOpen, setHowOpen] = useState(false);
  const [mode, setMode] = useState<"home" | "words" | "course">("home");

  const [tick, setTick] = useState(0);
  const bump = useCallback(() => setTick((n) => n + 1), []);
  useFocusEffect(bump);

  const view = useMemo(() => {
    if (profileId === null) return null;
    const config = getSettingsFor(db, profileId);
    /* The book's own due count: trainer and words dues are never drawn by
       its review, so they must not swell this number. */
    const due = countDue(db, profileId, new Date(), "book");
    const newAvailable = countNewAvailable(db, profileId, config.currentLesson);
    const newToday = Math.min(newAvailable, config.newPerDay);
    const lesson = db
      .select()
      .from(lessons)
      .where(eq(lessons.number, config.currentLesson))
      .get();
    const words = wordsProgress(db, profileId);
    return { config, due, newToday, lesson, words };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profileId, tick]);

  /* Whole surahs marked memorized on the Map. */
  const memorized = useMemo(() => {
    const maps = foldStatus(events);
    return SURAHS.filter(
      (m) => countRange(maps.memorized, m.start, m.start + m.ayahs) === m.ayahs,
    ).map((m) => m.n);
  }, [events]);

  if (!view) return null;
  const { config, due, newToday, lesson, words } = view;
  const now = new Date();
  const clear = due === 0 && newToday === 0;

  const memorizedShare =
    words.ready && memorized.length > 0
      ? memorizedCoverage(words.prefix, memorized)
      : null;
  const currentStage = words.stages.findIndex((st) => st.learned < st.items);

  return (
    <Screen tab>
      <Breath />
      <TopBar
        title={
          mode === "words"
            ? "Quranic Words"
            : mode === "course"
              ? "Arabic Course"
              : "Learn"
        }
        subtitle={dateLine(now, config.timezone)}
        left={
          mode === "home" ? null : (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Back to Learn"
              onPress={() => setMode("home")}
            >
              <Glass interactive style={s.back}>
                <Text variant="label">Back</Text>
              </Glass>
            </Pressable>
          )
        }
      />

      {mode === "home" ? (
        <ScrollView
          contentContainerStyle={s.home}
          showsVerticalScrollIndicator={false}
        >
          <View style={s.ringBox}>
            <BarakahRing
              fills={[words.ready ? Math.min(1, words.percent / 100) : 0]}
              size={156}
              stroke={9}
            />
            <View style={s.ringText}>
              <Text
                style={s.numeral}
              >{`${words.ready ? words.percent : 0}%`}</Text>
              <Text variant="label" color="inkSoft">
                of words known
              </Text>
            </View>
          </View>
          <View style={s.lines}>
            <Text variant="pageTitle" style={s.center}>
              Learn the words of the Quran
            </Text>
            <Text
              variant="bodySoft"
              color="inkSoft"
              style={[s.center, { maxWidth: 330 }]}
            >
              {`A few hundred words make up most of what you hear in recitation. Learn them a few a day, starting with Al-Fatiha, and more of every ayah becomes familiar. When you want grammar and full sentences, the Arabic Course goes deeper.`}
            </Text>
          </View>
          <View style={s.buttons}>
            <GlassButton
              primary
              label={
                words.ready && words.stages.some((st) => st.introduced > 0)
                  ? "Continue"
                  : "Begin"
              }
              onPress={() => setMode("words")}
            />
            <GlassButton
              label="Arabic Course"
              onPress={() => setMode("course")}
            />
          </View>
          <View style={s.footLinks}>
            {(
              [
                ["Stats", "/stats"],
                ["Settings", "/settings"],
              ] as const
            ).map(([label, href]) => (
              <Pressable
                key={href}
                accessibilityRole="button"
                accessibilityLabel={label}
                onPress={() => router.push(href)}
              >
                <Glass interactive style={s.pill}>
                  <Text variant="label">{label}</Text>
                </Glass>
              </Pressable>
            ))}
          </View>
        </ScrollView>
      ) : null}

      {mode === "words" ? (
        <ScrollView
          contentContainerStyle={s.scroll}
          showsVerticalScrollIndicator={false}
        >
          {words.ready ? (
            <>
              {/* The coverage meter. Tap for how it is counted. */}
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="How this is counted"
                onPress={() => setHowOpen((o) => !o)}
                style={s.meter}
              >
                <Text variant="pageTitle" style={s.center}>
                  {`Words you know make up ${words.percent}% of the words in the Quran`}
                </Text>
                <View style={s.track}>
                  <View
                    style={[
                      s.fill,
                      { width: `${Math.min(100, words.percent)}%` },
                    ]}
                  />
                </View>
                {/* A calm marker at 80%, the figure the path is built to reach. */}
                <View style={s.markRow}>
                  <View style={[s.mark, { left: "80%" }]} />
                </View>
                {howOpen ? (
                  <Text variant="bodySoft" color="inkSoft" style={s.center}>
                    {`A word counts once you have chosen its meaning correctly twice, and only when every part joined to it, such as wa-, bi- or al-, has been taught too. The figure is the share of the Quran's ${WORDS.totals.words.toLocaleString("en-US")} words that are known along the path in order, so it can lag behind but never runs ahead. The mark is at 80%. Knowing most of the words is a step toward following an ayah, not the same as understanding it.`}
                  </Text>
                ) : (
                  <Text variant="label" color="inkFaint">
                    How this is counted
                  </Text>
                )}
              </Pressable>

              <View style={s.lines}>
                <Text color="inkSoft" style={s.center}>
                  {`Ayahs you can mostly follow: ${words.followable.toLocaleString("en-US")}`}
                </Text>
                {memorizedShare !== null ? (
                  <Text color="inkSoft" style={s.center}>
                    {`Your memorized surahs: ${Math.floor(100 * memorizedShare + 1e-9)}% of words known`}
                  </Text>
                ) : null}
              </View>

              {/* The one Start: reviews first, then new words. */}
              <GlassButton
                primary
                label="Start"
                onPress={() => router.push("/words")}
              />

              <View style={s.path}>
                {words.stages.map((st, i) => (
                  <Glass key={st.stage} style={s.stage}>
                    <BarakahRing
                      fills={[st.items ? st.learned / st.items : 0]}
                      size={36}
                      stroke={4}
                    />
                    <View style={s.stageText}>
                      <Text
                        color={
                          i <= currentStage || currentStage === -1
                            ? "ink"
                            : "inkSoft"
                        }
                        style={s.center}
                      >
                        {st.titleEn}
                      </Text>
                      <Text variant="label" color="inkFaint" style={s.center}>
                        {stageLine(st, i === currentStage)}
                      </Text>
                    </View>
                    {/* Balances the ring, so the words sit in the true centre. */}
                    <View style={{ width: 36 }} />
                  </Glass>
                ))}
              </View>
            </>
          ) : (
            <Text color="inkSoft" style={[s.center, { paddingTop: space(4) }]}>
              The words are being set up. Try again in a moment.
            </Text>
          )}
        </ScrollView>
      ) : null}

      {mode === "course" ? (
        <ScrollView
          contentContainerStyle={s.scroll}
          showsVerticalScrollIndicator={false}
        >
          {/* The Arabic Course, every control it had. */}
          <View style={s.deeper}>
            <View style={s.lesson}>
              <Text style={s.center} color="inkSoft">
                Grammar and full sentences
              </Text>
            </View>

            {lesson ? (
              <View style={s.lesson}>
                <Arabic variant="title" showHarakat={config.showHarakat}>
                  {lesson.titleAr}
                </Arabic>
                <Text variant="eyebrow" color="inkSoft">
                  {`Lesson ${config.currentLesson}`}
                </Text>
              </View>
            ) : null}

            <View style={s.count}>
              <Text style={s.numeral}>{String(due + newToday)}</Text>
              <Text variant="eyebrow" color="inkSoft">
                {due + newToday === 1 ? "word today" : "words today"}
              </Text>
              {due + newToday > 0 ? (
                <Text color="inkSoft">
                  {[
                    newToday > 0 ? `${newToday} new` : null,
                    due > 0 ? `${due} coming back` : null,
                  ]
                    .filter(Boolean)
                    .join("  ·  ")}
                </Text>
              ) : null}
              {clear ? (
                <Text variant="bodySoft" color="inkFaint" style={s.center}>
                  {`Nothing is waiting. A review now goes back over Lessons 1 to ${config.currentLesson} without moving anything.`}
                </Text>
              ) : null}
            </View>

            <View style={s.buttons}>
              <GlassButton
                label="Start review"
                onPress={() => router.push("/review")}
              />
              <GlassButton
                label={`Study Lesson ${config.currentLesson}`}
                onPress={() => router.push(`/lessons/${config.currentLesson}`)}
              />
            </View>

            <View style={s.grid}>
              {(
                [
                  ["Speed drill", "/speed"],
                  ["Flashcards", "/cards"],
                  ["Case drill", "/cases"],
                  ["Numbers", "/numbers"],
                ] as const
              ).map(([label, href]) => (
                <View key={href} style={s.gridItem}>
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel={label}
                    onPress={() => router.push(href)}
                    style={{ width: "100%" }}
                  >
                    <Glass interactive style={s.tile}>
                      <Text>{label}</Text>
                    </Glass>
                  </Pressable>
                </View>
              ))}
            </View>

            <View style={s.foot}>
              <View style={s.ticks}>
                {Array.from({ length: TOTAL_LESSONS }, (_, i) => (
                  <View
                    key={i}
                    style={[
                      s.tick,
                      {
                        backgroundColor:
                          i < config.currentLesson
                            ? theme.colors.lapis
                            : theme.colors.rule,
                      },
                    ]}
                  />
                ))}
              </View>

              <View style={s.footLinks}>
                {(
                  [
                    ["Stats", "/stats"],
                    ["Settings", "/settings"],
                  ] as const
                ).map(([label, href]) => (
                  <Pressable
                    key={href}
                    accessibilityRole="button"
                    accessibilityLabel={label}
                    onPress={() => router.push(href)}
                  >
                    <Glass interactive style={s.pill}>
                      <Text variant="label">{label}</Text>
                    </Glass>
                  </Pressable>
                ))}
              </View>
            </View>
          </View>
        </ScrollView>
      ) : null}
    </Screen>
  );
}
