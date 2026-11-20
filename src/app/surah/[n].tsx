import { useLocalSearchParams, useRouter } from "expo-router";
import { Fragment, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ActionSheetIOS, FlatList, Pressable, Share, View, type ViewToken } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Svg, { Path } from "react-native-svg";

import { AyahZoom } from "@/components/AyahZoom";
import { Glass } from "@/components/Glass";
import { FootnoteCard, TranslationLine, TransliterationLine, WordGrid } from "@/components/QuranLayers";
import { NavigateSheet, ViewSheet, juzOf, useQuranType, useReaderColors } from "@/components/QuranSheets";
import { Text } from "@/components/Text";
import { WORDS_MAP_ATTRIBUTION, wordsMap } from "@/data/wordsMap";
import { translationName, type QfChapter } from "@/quran/qf";
import { loadChapter, prefetchChapters, quranApiConfigured } from "@/quran/remote";
import { foldStatus } from "@/quran/status";
import { SURAHS } from "@/quran/tanzil";
import { surahForDisplay } from "@/quran/text";
import { localToday } from "@/state/barakah";
import { usePrefs } from "@/state/prefs";
import { useQuranStatus } from "@/state/quranStatus";
import { useWordsCoverage } from "@/state/wordsKnown";
import { withAlpha } from "@/theme/tokens";
import { FONTS } from "@/theme/typography";
import { MARGIN, RADIUS, space } from "@/theme/layout";
import { makeStyles, useTheme } from "@/theme/useTheme";

/*
  The reader.

  A root stack screen rather than one nested in the Read tab, so Back returns
  to wherever it was opened from: the surah list, search, or the Map.

  The Arabic is the Tanzil Uthmani text, verbatim (owner approved for Read
  until Quran Foundation sync). It is always shown with its harakat, in the
  Quran face, never through the harakat setting, and never selectable. There
  is no English yet: The Clear Quran only comes through Quran Foundation, and
  Tanzil's translations are licensed for non-commercial use only.

  Tap an ayah and a Liquid Glass bar floats up from the bottom: memorized,
  understood, bookmark, share. The page itself follows the reading view: the
  script, size, spacing, tone (app, paper, sepia, night), ayah by ayah or a
  flowing page, alignment, and whether numbers and marks show. The surah and juz pill at the top opens the navigator; Aa opens the
  reading view. The controls float on glass over the page and never hold the
  text itself. Statuses live in the device event log (src/state/quranStatus).
  Everything here is on the phone, so it works offline.

  Once the learner has started Quranic Words, each ayah says how many of its
  words they know, and the known words carry a faint teal underline (the
  ayah by ayah layout with the plain Arabic only; the flowing page and the
  word grid stay as they are). Worked out once per surah and knowledge
  change, never per render of an ayah.
*/

type AyahWords = { known: number; total: number; tokens: { text: string; known: boolean }[] | null };

const toArabicDigits = (n: number) => String(n).replace(/\d/g, (d) => "٠١٢٣٤٥٦٧٨٩"[Number(d)]);

const useStyles = makeStyles((t) => ({
  page: { flex: 1, backgroundColor: t.colors.paper },
  topBar: { position: "absolute", left: 0, right: 0, flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: MARGIN },
  round: { width: 44, height: 44, borderRadius: 22, alignItems: "center", justifyContent: "center", overflow: "hidden" },
  pill: { height: 44, borderRadius: 22, paddingHorizontal: space(2.25), alignItems: "center", justifyContent: "center", overflow: "hidden" },
  toolbar: { flexDirection: "row", alignItems: "center", alignSelf: "center", borderRadius: RADIUS.pill, padding: 4, gap: 2, overflow: "hidden" },
  toolLabel: { paddingHorizontal: space(1.25) },
  bottomBar: { position: "absolute", left: 0, right: 0, alignItems: "center", paddingHorizontal: space(1) },
  tool: { flexDirection: "row", alignItems: "center", gap: 6, paddingVertical: space(1), paddingHorizontal: space(1.75), borderRadius: RADIUS.pill },
  head: { alignItems: "center", gap: space(0.5), paddingTop: space(1), paddingBottom: space(3) },
  surahAr: { fontFamily: FONTS.quran, fontSize: 40, lineHeight: 76, color: t.colors.ink, textAlign: "center" },
  basmala: { paddingTop: space(2) },
  ayah: {
    paddingVertical: space(2),
    paddingHorizontal: space(1),
    borderRadius: RADIUS.card,
    gap: space(1),
  },
  meta: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  chips: { flexDirection: "row", flexWrap: "wrap", alignItems: "center", flexShrink: 1, gap: space(0.75) },
  chip: { flexDirection: "row", alignItems: "center", gap: 5 },
  dot: { width: 8, height: 8, borderRadius: 4 },
  marker: {
    minWidth: 30,
    height: 30,
    borderRadius: 15,
    borderWidth: 1.25,
    borderColor: t.colors.saffron,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 4,
  },
  rule: { height: 1, backgroundColor: t.colors.rule, marginHorizontal: space(1) },
  foot: { alignItems: "center", gap: space(1.5), paddingVertical: space(4) },
  next: {
    borderRadius: RADIUS.pill,
    borderWidth: 1,
    borderColor: t.colors.rule,
    backgroundColor: t.colors.surface,
    paddingVertical: space(1.25),
    paddingHorizontal: space(3),
  },
}));

function Icon({ d, color, size = 18 }: { d: string; color: string; size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Path d={d} stroke={color} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" fill="none" />
    </Svg>
  );
}

const TOP_BAR = 44;
const FLOW_CHUNK = 8;

export default function SurahReader() {
  const s = useStyles();
  const theme = useTheme();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{ n: string; ayah?: string }>();
  const n = Math.min(114, Math.max(1, Number(params.n) || 1));
  const targetAyah = params.ayah ? Number(params.ayah) : null;
  /* Where to open: the ayah asked for, else where this surah was left, else
     the top. Read once, on opening. */
  const [startAyah] = useState<number | null>(() => {
    if (targetAyah) return targetAyah;
    const left = usePrefs.getState().surahPos?.[n];
    return left && left > 1 ? left : null;
  });
  const meta = SURAHS[n - 1];

  const { basmala, ayahs } = useMemo(() => surahForDisplay(n), [n]);
  const coverage = useWordsCoverage();
  const ayahWords = useMemo<(AyahWords | null)[] | null>(() => {
    const p = coverage ? wordsMap() : null;
    if (!coverage || !p) return null;
    return ayahs.map((text, i) => {
      const g = meta.start + i;
      const a = p.ayahStart[g];
      const total = p.ayahStart[g + 1] - a;
      /* Only where the table's words are the reader's words, one to one. */
      if (!p.aligned[g]) return null;
      const parts = text.split(" ");
      if (parts.length !== total) return null;
      const known = coverage.ayahKnown[g];
      return {
        known,
        total,
        tokens: known > 0 ? parts.map((t, j) => ({ text: t, known: coverage.words[a + j] === 1 })) : null,
      };
    });
  }, [coverage, ayahs, meta.start]);
  const events = useQuranStatus((st) => st.events);
  const setAyah = useQuranStatus((st) => st.setAyah);
  const setSurah = useQuranStatus((st) => st.setSurah);
  const setLastRead = usePrefs((st) => st.setLastRead);
  const bookmarks = usePrefs((st) => st.bookmarks);
  const toggleBookmark = usePrefs((st) => st.toggleBookmark);
  const logRead = usePrefs((st) => st.logRead);
  const maps = useMemo(() => foldStatus(events), [events]);
  const colors = useReaderColors();
  const type = useQuranType();
  const look = type.look;
  const view = usePrefs((st) => st.readerView);
  const translationId = usePrefs((st) => st.translationId) ?? 20;
  const reciterId = usePrefs((st) => st.reciterId) ?? 7;

  /* Layers from Quran Foundation, loaded per surah and kept offline. */
  const wantsLayers = view !== "arabic" && quranApiConfigured();
  const [qf, setQf] = useState<QfChapter | null>(null);
  const [qfState, setQfState] = useState<"idle" | "loading" | "error">("idle");
  const [footnote, setFootnote] = useState<number | null>(null);
  /* The long-press zoom, and whether its layers are loading. */
  const [zoom, setZoom] = useState<number | null>(null);
  /* Tapping an ayah reveals its translation, a second tap adds the
     transliteration, a third goes back to the Arabic alone. The layers are
     loaded with the surah, whatever the view, so a tap never waits, and the
     next surah is fetched behind it. */
  const [reveal, setReveal] = useState<Record<number, 1 | 2>>({});
  const cycle = (ayah: number) =>
    setReveal((r) => {
      const next = { ...r };
      const now = r[ayah] ?? 0;
      if (now === 2) delete next[ayah];
      else next[ayah] = (now + 1) as 1 | 2;
      return next;
    });
  useEffect(() => setReveal({}), [n]);
  const needLayers = quranApiConfigured();
  useEffect(() => {
    if (!needLayers) return;
    let alive = true;
    setQfState("loading");
    loadChapter(n, translationId, reciterId)
      .then((c) => {
        if (!alive) return;
        setQf(c);
        setQfState("idle");
        void prefetchChapters([n + 1], translationId, reciterId);
      })
      .catch(() => alive && setQfState("error"));
    return () => {
      alive = false;
    };
  }, [needLayers, n, translationId, reciterId]);

  /* Layers need one ayah per row, so they always use the ayah layout. */
  const flow = look.layout === "flow" && !wantsLayers;

  /* Flowing layout groups ayahs into paragraphs so a long surah stays one
     scrollable list rather than one enormous text node. */
  const chunks = useMemo(() => {
    const out: number[][] = [];
    for (let i = 0; i < ayahs.length; i += FLOW_CHUNK) out.push(Array.from({ length: Math.min(FLOW_CHUNK, ayahs.length - i) }, (_, k) => i + k));
    return out;
  }, [ayahs.length]);
  const rowOf = (ayah: number) => (flow ? Math.floor((ayah - 1) / FLOW_CHUNK) : ayah - 1);

  const list = useRef<FlatList<number | number[]>>(null);
  const [highlight, setHighlight] = useState<number | null>(targetAyah);
  const [selected, setSelected] = useState<number | null>(null);
  const [visibleAyah, setVisibleAyah] = useState(startAyah ?? 1);
  const [navOpen, setNavOpen] = useState(false);
  const [viewOpen, setViewOpen] = useState(false);

  /* Jump to the ayah search or the Map asked for. Heights vary, so this asks
     FlatList and retries once its estimate has laid out. */
  useEffect(() => {
    if (!startAyah || startAyah < 1 || startAyah > meta.ayahs) {
      /* A surah not read before opens at its very top. */
      const top0 = setTimeout(() => list.current?.scrollToOffset({ offset: 0, animated: false }), 60);
      return () => clearTimeout(top0);
    }
    const id = setTimeout(() => list.current?.scrollToIndex({ index: rowOf(startAyah), viewPosition: 0.2, animated: false }), 60);
    const fade = setTimeout(() => setHighlight(null), 4000);
    return () => {
      clearTimeout(id);
      clearTimeout(fade);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [startAyah, meta.ayahs]);

  const flowRef = useRef(flow);
  flowRef.current = flow;
  const onViewable = useRef(({ viewableItems }: { viewableItems: ViewToken<number | number[]>[] }) => {
    const first = viewableItems.find((v) => v.index !== null);
    if (first?.index != null) setVisibleAyah(flowRef.current ? first.index * FLOW_CHUNK + 1 : first.index + 1);
  }).current;

  /* The reading position is saved a moment after scrolling settles, not on
     every ayah that passes. */
  useEffect(() => {
    const id = setTimeout(() => {
      setLastRead({ surah: n, ayah: visibleAyah });
      /* An ayah you stayed on counts as read, once per day. */
      logRead(localToday(), meta.start + visibleAyah - 1);
    }, 800);
    return () => clearTimeout(id);
  }, [n, visibleAyah, setLastRead, logRead, meta.start]);

  const surahActions = useCallback(() => {
    let mAll = true;
    let uAll = true;
    for (let i = meta.start; i < meta.start + meta.ayahs; i++) {
      if (!maps.memorized[i]) mAll = false;
      if (!maps.understood[i]) uAll = false;
    }
    ActionSheetIOS.showActionSheetWithOptions(
      {
        options: [mAll ? "Unmark surah memorized" : "Mark whole surah memorized", uAll ? "Unmark surah understood" : "Mark whole surah understood", "Cancel"],
        cancelButtonIndex: 2,
        title: meta.en,
      },
      (i) => {
        if (i === 0) setSurah(n, "memorized", !mAll);
        if (i === 1) setSurah(n, "understood", !uAll);
      },
    );
  }, [maps, meta, n, setSurah]);

  /* Chosen in the sheet, acted on once the sheet has fully closed. */
  const pending = useRef<{ surah: number; ayah: number } | null>(null);
  const go = (surah: number, ayah: number) => {
    pending.current = { surah, ayah };
    setNavOpen(false);
    /* onDismiss is the right moment, but if it ever fails to fire the jump
       still happens once the sheet has had time to close. afterSheet runs once. */
    setTimeout(afterSheet, 650);
  };
  const afterSheet = () => {
    const to = pending.current;
    pending.current = null;
    if (!to) return;
    if (to.surah === n) {
      list.current?.scrollToIndex({ index: rowOf(to.ayah), viewPosition: 0.2, animated: true });
      return;
    }
    router.replace(`/surah/${to.surah}?ayah=${to.ayah}`);
  };

  const quran = { fontFamily: type.fontFamily, fontSize: type.fontSize, lineHeight: type.lineHeight, color: colors.ink, textAlign: look.align, writingDirection: "rtl" as const };
  const top = insets.top + space(1);
  const juz = juzOf(meta.start + visibleAyah - 1);
  const selColor = colors.dark ? colors.rule : theme.colors.lapisWash;
  const knownLine = useMemo(
    () => ({
      textDecorationLine: "underline" as const,
      textDecorationColor: withAlpha(theme.colors.verdigris, 0.45),
    }),
    [theme.colors.verdigris],
  );
  const markColor = (g: number) =>
    !look.marks ? colors.soft : maps.understood[g] ? theme.colors.verdigris : maps.memorized[g] ? theme.colors.saffron : colors.soft;

  const header = (
    <View style={s.head}>
      <Text selectable={false} style={[s.surahAr, { color: colors.ink }]}>
        {meta.ar}
      </Text>
      <Text variant="pageTitle" style={{ color: colors.ink }}>
        {meta.en}
      </Text>
      <Text variant="label" style={{ color: colors.soft }}>
        {`${meta.meaning}. ${meta.place}, ${meta.ayahs} ayahs, Juz ${juzOf(meta.start)}`}
      </Text>
      <Pressable accessibilityRole="button" onPress={surahActions} hitSlop={8} style={{ paddingTop: space(1) }}>
        <Text variant="label" style={{ color: colors.accent }}>
          Mark this surah
        </Text>
      </Pressable>
      {basmala ? (
        <Text selectable={false} style={[quran, s.basmala, { textAlign: "center" }]}>
          {basmala}
        </Text>
      ) : null}
      {wantsLayers && qfState === "loading" ? (
        <Text variant="label" style={{ color: colors.soft, paddingTop: space(1.5) }}>
          Loading from Quran.com. Kept on this phone after the first time.
        </Text>
      ) : null}
      {wantsLayers && qfState === "error" ? (
        <Text variant="label" style={{ color: colors.soft, paddingTop: space(1.5), textAlign: "center" }}>
          Could not reach Quran.com. Showing the Arabic; try again when you are online.
        </Text>
      ) : null}
    </View>
  );

  const footer = (
    <View style={s.foot}>
      <Text variant="label" style={{ textAlign: "center", color: colors.soft }}>
        {`Arabic text from Tanzil. Translation and transliteration from Quran.com, provided by Quran Foundation.${ayahWords && !flow ? ` ${WORDS_MAP_ATTRIBUTION}.` : ""}`}
      </Text>
      {n < 114 ? (
        <Pressable accessibilityRole="button" onPress={() => router.replace(`/surah/${n + 1}`)} style={[s.next, { borderColor: colors.rule }]}>
          <Text style={{ color: colors.ink }}>{`Next: ${SURAHS[n].en}`}</Text>
        </Pressable>
      ) : null}
    </View>
  );

  const renderAyah = (index: number) => {
    const ayah = index + 1;
    const g = meta.start + index;
    const m = look.marks && maps.memorized[g] === 1;
    const u = look.marks && maps.understood[g] === 1;
    const isSel = selected === ayah;
    const qa = wantsLayers && qf ? qf.ayahs[index] : undefined;
    const layer = qf ? qf.ayahs[index] : undefined;
    const shown = reveal[ayah] ?? 0;
    const aw = ayahWords?.[index] ?? null;
    return (
      <Pressable
        onPress={() => cycle(ayah)}
        onLongPress={() => {
          setSelected(null);
          setZoom(ayah);
        }}
        delayLongPress={320}
        accessibilityLabel={`Ayah ${ayah}`}
        accessibilityHint="Tap to show the translation, then the transliteration. Long press to zoom in, with its actions."
        style={[s.ayah, (highlight === ayah || isSel) && { backgroundColor: selColor }]}
      >
        {qa && (view === "wordTranslation" || view === "wordTransliteration") ? (
          <WordGrid ayah={qa} under={view === "wordTranslation" ? "meaning" : "translit"} colors={colors} quran={quran} />
        ) : (
          <Text selectable={false} style={quran}>
            {aw?.tokens
              ? aw.tokens.map((t, j) => (
                  <Fragment key={j}>
                    {j > 0 ? " " : null}
                    {t.known ? (
                      <Text selectable={false} testID="known-word" style={[quran, knownLine]}>
                        {t.text}
                      </Text>
                    ) : (
                      t.text
                    )}
                  </Fragment>
                ))
              : ayahs[index]}
          </Text>
        )}
        {qa && view === "translation" ? <TranslationLine ayah={qa} colors={colors} onFootnote={setFootnote} /> : null}
        {qa && view === "transliteration" ? <TransliterationLine ayah={qa} colors={colors} /> : null}
        {shown >= 1 && view !== "translation" ? (
          layer ? (
            <TranslationLine ayah={layer} colors={colors} onFootnote={setFootnote} />
          ) : (
            <Text variant="label" style={{ color: colors.soft, paddingTop: space(1) }}>
              {qfState === "error" || !quranApiConfigured() ? "Translation needs a connection the first time." : "Loading the translation"}
            </Text>
          )
        ) : null}
        {shown >= 2 && view !== "transliteration" && layer ? <TransliterationLine ayah={layer} colors={colors} /> : null}
        {look.numbers || m || u || aw || bookmarks.includes(g) ? (
          <View style={s.meta}>
            <View style={s.chips}>
              {m ? (
                <View style={s.chip}>
                  <View style={[s.dot, { backgroundColor: theme.colors.saffron }]} />
                  <Text variant="label" style={{ color: colors.soft }}>
                    Memorized
                  </Text>
                </View>
              ) : null}
              {u ? (
                <View style={s.chip}>
                  <View style={[s.dot, { backgroundColor: theme.colors.verdigris }]} />
                  <Text variant="label" style={{ color: colors.soft }}>
                    Understood
                  </Text>
                </View>
              ) : null}
              {bookmarks.includes(g) ? <Icon d="M6.5 3.5h11v17l-5.5-4-5.5 4z" color={theme.colors.lapis} size={14} /> : null}
              {aw ? (
                <Text variant="label" color="inkFaint">
                  {`You know ${aw.known} of ${aw.total} ${aw.total === 1 ? "word" : "words"}`}
                </Text>
              ) : null}
            </View>
            {look.numbers ? (
              <View style={s.marker}>
                <Text variant="label" color="saffron">
                  {toArabicDigits(ayah)}
                </Text>
              </View>
            ) : null}
          </View>
        ) : null}
      </Pressable>
    );
  };

  /* One paragraph of the flowing layout: each ayah is its own pressable span,
     followed by its number in ornate brackets, tinted by its status. */
  const renderFlow = (indexes: number[]) => (
    <Text selectable={false} style={[quran, { paddingVertical: space(1) }]}>
      {indexes.map((index) => {
        const ayah = index + 1;
        const g = meta.start + index;
        const lit = selected === ayah || highlight === ayah;
        return (
          <Text key={index} selectable={false}>
            <Text
              selectable={false}
              onPress={() => setSelected(selected === ayah ? null : ayah)}
              onLongPress={() => {
                setSelected(null);
                setZoom(ayah);
              }}
              style={[quran, lit && { backgroundColor: selColor }]}
            >
              {ayahs[index]}
            </Text>
            {look.numbers ? (
              <Text selectable={false} style={[quran, { color: markColor(g) }]}>{` ﴿${toArabicDigits(ayah)}﴾ `}</Text>
            ) : (
              <Text selectable={false} style={quran}>
                {"  "}
              </Text>
            )}
          </Text>
        );
      })}
    </Text>
  );

  const sel = selected ? meta.start + selected - 1 : null;
  const selM = sel !== null && maps.memorized[sel] === 1;
  const selU = sel !== null && maps.understood[sel] === 1;
  const selB = sel !== null && bookmarks.includes(sel);

  return (
    <View style={[s.page, { backgroundColor: colors.page }]}>
      <FlatList<number | number[]>
        key={look.layout}
        ref={list}
        data={flow ? chunks : ayahs.map((_, i) => i)}
        keyExtractor={(_, i) => String(i)}
        ListHeaderComponent={header}
        ListFooterComponent={footer}
        ItemSeparatorComponent={flow ? null : () => <View style={[s.rule, { backgroundColor: colors.rule }]} />}
        onViewableItemsChanged={onViewable}
        viewabilityConfig={{ itemVisiblePercentThreshold: 40 }}
        onScrollToIndexFailed={(info) => {
          list.current?.scrollToOffset({ offset: info.averageItemLength * info.index, animated: false });
          setTimeout(() => list.current?.scrollToIndex({ index: info.index, viewPosition: 0.2, animated: false }), 120);
        }}
        initialNumToRender={Math.max(12, (startAyah ? rowOf(startAyah) : 0) + 4)}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingTop: top + TOP_BAR + space(1), paddingHorizontal: MARGIN, paddingBottom: insets.bottom + space(14) }}
        extraData={[selected, highlight, maps, type, bookmarks, colors, qf, view, ayahWords]}
        renderItem={({ item }) => (Array.isArray(item) ? renderFlow(item) : renderAyah(item))}
      />

      {/* Chrome floats on glass above the page. */}
      <View style={[s.topBar, { top }]} pointerEvents="box-none">
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Back"
          onPress={() => (router.canGoBack() ? router.back() : router.replace("/read"))}
        >
          <Glass interactive style={s.round}>
            <Icon d="M15 6l-6 6 6 6" color={theme.colors.ink} size={20} />
          </Glass>
        </Pressable>
        <Pressable accessibilityRole="button" accessibilityLabel="Go to a surah or juz" onPress={() => setNavOpen(true)}>
          <Glass interactive style={s.pill}>
            <Text variant="label">{`${meta.en}, Juz ${juz}`}</Text>
          </Glass>
        </Pressable>
        <Pressable accessibilityRole="button" accessibilityLabel="Reading view" onPress={() => setViewOpen(true)}>
          <Glass interactive style={s.round}>
            <Text>Aa</Text>
          </Glass>
        </Pressable>
      </View>

      {/* The ayah bar: floats on glass at the bottom while an ayah is chosen.
          Mounted plainly, never faded, so the glass always draws. */}
      {selected && sel !== null ? (
        <View style={[s.bottomBar, { bottom: insets.bottom + space(1.5) }]} pointerEvents="box-none">
          <Glass interactive style={s.toolbar}>
            <View style={s.toolLabel}>
              <Text variant="label">{`${n}:${selected}`}</Text>
            </View>
            <Pressable
              accessibilityRole="button"
              accessibilityState={{ selected: selM }}
              onPress={() => setAyah(sel, "memorized", !selM)}
              style={[s.tool, selM && { backgroundColor: theme.colors.saffron }]}
            >
              <Icon d="M5 12.5l4.5 4.5L19 7.5" color={selM ? theme.colors.paper : theme.colors.saffron} />
              <Text variant="label" color={selM ? "paper" : "ink"}>
                Memorized
              </Text>
            </Pressable>
            <Pressable
              accessibilityRole="button"
              accessibilityState={{ selected: selU }}
              onPress={() => setAyah(sel, "understood", !selU)}
              style={[s.tool, selU && { backgroundColor: theme.colors.verdigris }]}
            >
              <Icon
                d="M2.5 12s3.5-6.5 9.5-6.5S21.5 12 21.5 12s-3.5 6.5-9.5 6.5S2.5 12 2.5 12zM12 14.5a2.5 2.5 0 100-5 2.5 2.5 0 000 5z"
                color={selU ? theme.colors.paper : theme.colors.verdigris}
              />
              <Text variant="label" color={selU ? "paper" : "ink"}>
                Understood
              </Text>
            </Pressable>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={selB ? "Remove bookmark" : "Bookmark"}
              accessibilityState={{ selected: selB }}
              onPress={() => toggleBookmark(sel)}
              style={[s.tool, selB && { backgroundColor: theme.colors.lapis }]}
            >
              <Icon d="M6.5 3.5h11v17l-5.5-4-5.5 4z" color={selB ? theme.colors.paper : theme.colors.lapis} />
            </Pressable>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Share reference"
              onPress={() => void Share.share({ message: `${meta.en} ${n}:${selected}` })}
              style={s.tool}
            >
              <Icon d="M12 15V3.5M7.5 8L12 3.5 16.5 8M5 12.5v6a2 2 0 002 2h10a2 2 0 002-2v-6" color={theme.colors.lapis} />
            </Pressable>
            <Pressable accessibilityRole="button" accessibilityLabel="Close" onPress={() => setSelected(null)} style={s.tool}>
              <Icon d="M6 6l12 12M18 6L6 18" color={theme.colors.inkSoft} size={16} />
            </Pressable>
          </Glass>
        </View>
      ) : null}

      {footnote !== null && qf?.footnotes[footnote] ? (
        <View style={[s.bottomBar, { bottom: insets.bottom + space(1.5), paddingHorizontal: MARGIN }]}>
          <FootnoteCard text={qf.footnotes[footnote]} onClose={() => setFootnote(null)} colors={colors} />
        </View>
      ) : null}

      {zoom !== null ? (
        <AyahZoom
          visible
          onClose={() => setZoom(null)}
          title={`${meta.en} ${n}:${zoom}`}
          arabic={ayahs[zoom - 1]}
          quran={{ fontFamily: type.fontFamily }}
          layer={qf ? qf.ayahs[zoom - 1] ?? null : null}
          layerState={!quranApiConfigured() ? "unavailable" : qf ? "ready" : qfState === "error" ? "error" : "loading"}
          translationName={translationName(translationId)}
          memorized={maps.memorized[meta.start + zoom - 1] === 1}
          understood={maps.understood[meta.start + zoom - 1] === 1}
          bookmarked={bookmarks.includes(meta.start + zoom - 1)}
          onMemorized={() => setAyah(meta.start + zoom - 1, "memorized", maps.memorized[meta.start + zoom - 1] !== 1)}
          onUnderstood={() => setAyah(meta.start + zoom - 1, "understood", maps.understood[meta.start + zoom - 1] !== 1)}
          onBookmark={() => toggleBookmark(meta.start + zoom - 1)}
        />
      ) : null}

      <NavigateSheet visible={navOpen} onClose={() => setNavOpen(false)} current={{ surah: n, juz }} onGo={go} onDismiss={afterSheet} />
      <ViewSheet visible={viewOpen} onClose={() => setViewOpen(false)} />
    </View>
  );
}
