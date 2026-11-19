import { useRouter } from "expo-router";
import { useEffect, useMemo, useState } from "react";
import { FlatList, Keyboard, Pressable, StyleSheet, TextInput, View, useWindowDimensions } from "react-native";
import Animated, { Easing, useAnimatedStyle, useReducedMotion, useSharedValue, withTiming } from "react-native-reanimated";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import Svg, { Circle, Path } from "react-native-svg";

import { Arabic } from "@/components/Arabic";
import { Breath } from "@/components/Breath";
import { Glyphs } from "@/components/Glyphs";
import { Glass } from "@/components/Glass";
import { Seeking } from "@/components/Seeking";
import { Text } from "@/components/Text";
import { TOP_BAR_HEIGHT, TopBar } from "@/components/TopBar";
import { Typewriter } from "@/components/Typewriter";
import { complete } from "@/quran/phrases";
import { askKey, askQuran, loadVerseTranslations, type AskAnswer } from "@/quran/remote";
import { search } from "@/quran/search";
import { SURAHS } from "@/quran/tanzil";
import { ayahForDisplay, refOf, searchKeys } from "@/quran/text";
import { hijriDate } from "@/lib/time";
import { usePrefs } from "@/state/prefs";
import { FONTS } from "@/theme/typography";
import { MARGIN, RADIUS, space } from "@/theme/layout";
import { makeStyles, useTheme } from "@/theme/useTheme";

/*
  Search: type anything, get ayahs and surahs. The app opens here: a centred
  bar over a slow breathing light, with example searches typing themselves
  into the bar instead of a list of suggestions.

  One clean list. Every result is either an ayah (the Arabic, its English
  underneath, and where it is from) or a surah. A feeling or topic expands
  into the ayahs it points to, so "i feel sad" shows ayahs, not a topic box.
  A single quiet line above the list says what you are looking at.

  The bar never moves: the head above it is a fixed height whether or not you
  are typing, and the list handles the keyboard with its own insets.

  Local search answers instantly. Anything typed in words is also asked of a
  free AI on the Durus server (server/ask.ts), whose picks lead the list with
  a line on why; the AI only names places, the text is always Tanzil's. The
  English comes from the Durus server and is kept on the phone once fetched.
*/


const MAX_RESULTS = 30;
/* Height of the mark and question above the bar, folded away while searching. */
const HEAD = 118;
const PER_REF = 3;
/* Heights used to centre the idle search: the greeting row, the bar, and the
   room the floating tab bar takes at the bottom. */
const TOP_ROW = TOP_BAR_HEIGHT;
const BAR_H = 54;
const TAB_ROOM = 88;



/* `reason` is set on AI picks: one line on why this place answers the search. */
type Item = ({ kind: "ayah"; index: number } | { kind: "surah"; n: number }) & { reason?: string };

const useStyles = makeStyles((t) => ({
  safe: { flex: 1, backgroundColor: t.colors.paper },
  body: { flex: 1, paddingHorizontal: MARGIN },
  pill: { flexDirection: "row", alignItems: "center", gap: space(1), alignSelf: "center", borderRadius: RADIUS.pill, paddingVertical: space(1.125), paddingHorizontal: space(2), overflow: "hidden" },
  head: { alignItems: "center", justifyContent: "flex-end", gap: space(0.75), paddingBottom: space(2.5), overflow: "hidden" },
  title: { fontSize: 24, lineHeight: 30, textAlign: "center" },
  bar: { flexDirection: "row", alignItems: "center", borderRadius: 28, minHeight: 54, paddingLeft: space(2), paddingRight: space(1), gap: space(1), overflow: "hidden" },
  input: { flex: 1, fontFamily: FONTS.uiRegular, fontSize: 17, color: t.colors.ink, paddingVertical: space(1.5) },
  caption: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: space(0.75), paddingTop: space(2), paddingBottom: space(0.5), paddingHorizontal: space(1) },
  item: { paddingVertical: space(2), gap: space(0.75) },
  rule: { height: 1, backgroundColor: t.colors.rule },
  ayah: { fontFamily: FONTS.quran, fontSize: 22, lineHeight: 46, color: t.colors.ink, textAlign: "right", writingDirection: "rtl" },
  english: { fontSize: 15, lineHeight: 22, color: t.colors.inkSoft },
  ar: { fontFamily: FONTS.quran, fontSize: 22, lineHeight: 42, color: t.colors.ink, writingDirection: "rtl" },
  chips: { flexDirection: "row", flexWrap: "wrap", justifyContent: "center", gap: space(1) },
  chip: { borderRadius: RADIUS.pill, backgroundColor: t.colors.surfaceSunk, paddingVertical: space(0.875), paddingHorizontal: space(1.5) },
  quiet: { flexDirection: "row", alignItems: "center", gap: space(1), paddingVertical: space(1.25), paddingHorizontal: space(0.5) },
  quietRule: { borderTopWidth: 1, borderTopColor: t.colors.rule },
}));

function SearchIcon({ color }: { color: string }) {
  return (
    <Svg width={20} height={20} viewBox="0 0 24 24">
      <Circle cx={11} cy={11} r={6.5} stroke={color} strokeWidth={1.8} fill="none" />
      <Path d="M16 16l4.5 4.5" stroke={color} strokeWidth={1.8} strokeLinecap="round" />
    </Svg>
  );
}

/* Marks a caption as the AI's suggestion, in place of a separate line saying so. */
function Sparkle({ color }: { color: string }) {
  return (
    <Svg width={14} height={14} viewBox="0 0 24 24">
      <Path d="M12 2.5l2.1 6.4 6.4 2.1-6.4 2.1L12 19.5l-2.1-6.4L3.5 11l6.4-2.1zM19 16l.9 2.1 2.1.9-2.1.9L19 22l-.9-2.1-2.1-.9 2.1-.9z" fill={color} />
    </Svg>
  );
}

/* Expand a topic reference: "2:155-157" to its ayahs (a few at most), "93" to the surah. */
function expandRef(ref: string): Item[] {
  const [sn, range] = ref.split(":");
  const surah = SURAHS[Number(sn) - 1];
  if (!surah) return [];
  if (!range) return [{ kind: "surah", n: surah.n }];
  const [a, b] = range.split("-").map(Number);
  const out: Item[] = [];
  for (let k = a; k <= (b || a) && out.length < PER_REF; k++) if (k >= 1 && k <= surah.ayahs) out.push({ kind: "ayah", index: surah.start + k - 1 });
  return out;
}

const lower = (s: string) => s.charAt(0).toLowerCase() + s.slice(1);

export default function Home() {
  const s = useStyles();
  const theme = useTheme();
  const router = useRouter();
  const rememberSearch = usePrefs((st) => st.rememberSearch);
  const translationId = usePrefs((st) => st.translationId) ?? 20;
  const [query, setQuery] = useState("");
  const [focused, setFocused] = useState(false);
  const still = useReducedMotion();
  const lastRead = usePrefs((st) => st.lastRead);
  /* Their name from onboarding (or, failing that, the account's first name,
     filled in by ClerkGate). */
  const savedName = usePrefs((st) => st.name);
  const greetName = savedName.trim().split(/\s+/)[0] ?? "";
  const now = useMemo(() => new Date(), []);
  const hijri = useMemo(() => hijriDate(now), [now]);
  const typing = query.trim().length > 0;

  const result = useMemo(() => search(query, searchKeys), [query]);

  /*
    Ask: anything typed in words also goes to the free AI on the Durus server,
    after a pause in typing. Its picks lead the list; the local results follow.
    References, juz and surah names are answered locally and never asked.
  */
  const [ai, setAi] = useState<{ q: string; a: AskAnswer } | null>(null);
  const [asking, setAsking] = useState(false);
  const askable = typing && !result.label && /[a-z]{3}/i.test(query) && !/^\s*\d/.test(query);
  useEffect(() => {
    if (!askable) {
      setAsking(false);
      return;
    }
    const k = askKey(query);
    let alive = true;
    setAsking(true);
    const id = setTimeout(() => {
      askQuran(k).then((a) => {
        if (!alive) return;
        setAsking(false);
        if (a) setAi({ q: k, a });
      });
    }, 650);
    return () => {
      alive = false;
      clearTimeout(id);
    };
  }, [query, askable]);
  const picks = askable && ai && ai.q === askKey(query) ? ai.a : null;

  /* Results as one list of ayahs and surahs, plus one line saying what they are. */
  const { items, caption } = useMemo(() => {
    const out: Item[] = [];
    const seen = new Set<string>();
    const add = (it: Item) => {
      const k = it.kind === "ayah" ? `a${it.index}` : `s${it.n}`;
      if (seen.has(k) || out.length >= MAX_RESULTS) return;
      seen.add(k);
      out.push(it);
    };
    for (const r of picks?.results ?? []) expandRef(r.ref).forEach((it, i) => add(i === 0 ? { ...it, reason: r.reason } : it));
    const themes = result.hits.filter((h) => h.kind === "theme").slice(0, 2);
    for (const h of themes) if (h.kind === "theme") for (const r of h.theme.refs) expandRef(r).forEach(add);
    for (const h of result.hits) {
      if (h.kind === "surah") add({ kind: "surah", n: h.surah });
      else if (h.kind === "ayah" || h.kind === "text" || h.kind === "juz") add({ kind: "ayah", index: h.index });
    }
    let cap: string | null = null;
    const first = themes[0];
    if (picks && picks.results.length > 0) cap = (picks.line || "Suggested for you").replace(/[:\s]+$/, "");
    else if (first && first.kind === "theme") cap = first.theme.kind === "passage" ? first.theme.label : `For ${lower(first.theme.label)}`;
    else if (result.label) cap = result.label;
    else if (result.hits.some((h) => h.kind === "text")) cap = `${result.total} ${result.total === 1 ? "place" : "places"} with "${query.trim()}"`;
    else if (typing && out.length === 0 && asking) cap = null;
    else if (typing && out.length === 0) cap = result.pendingTopic ? `"${result.pendingTopic}" is coming soon` : "Nothing found";
    return { items: out, caption: cap };
  }, [result, query, typing, picks, asking]);

  /* English under each ayah: from the phone if fetched before, else the server. */
  const [english, setEnglish] = useState<Record<string, string>>({});
  useEffect(() => {
    const keys = items.filter((i) => i.kind === "ayah").map((i) => {
      const r = refOf((i as { index: number }).index);
      return `${r.surah}:${r.ayah}`;
    });
    if (keys.length === 0) return;
    let alive = true;
    const id = setTimeout(() => {
      loadVerseTranslations(keys, translationId).then((c) => alive && setEnglish({ ...c }));
    }, 250);
    return () => {
      alive = false;
      clearTimeout(id);
    };
  }, [items, translationId]);

  const completions = useMemo(() => (items.length === 0 ? complete(query, 4) : []), [query, items.length]);

  const openTo = (surah: number, ayah?: number) => {
    Keyboard.dismiss();
    router.push(ayah ? `/surah/${surah}?ayah=${ayah}` : `/surah/${surah}`);
  };
  const open = (surah: number, ayah?: number) => {
    rememberSearch(query);
    openTo(surah, ayah);
  };

  const renderItem = ({ item }: { item: Item }) => {
    if (item.kind === "surah") {
      const x = SURAHS[item.n - 1];
      return (
        <Pressable accessibilityRole="button" accessibilityLabel={`Surah ${x.en}`} onPress={() => open(x.n)} style={[s.item, { flexDirection: "row", alignItems: "center", gap: space(1.5) }]}>
          <View style={{ flex: 1, gap: 2 }}>
            {item.reason ? (
              <Text variant="label" color="lapis">
                {item.reason}
              </Text>
            ) : null}
            <Text>{x.en}</Text>
            <Text variant="label" color="inkFaint">{`Surah ${x.n}, ${x.meaning}, ${x.ayahs} ayahs`}</Text>
          </View>
          <Text selectable={false} style={s.ar}>
            {x.ar}
          </Text>
        </Pressable>
      );
    }
    const r = refOf(item.index);
    const key = `${r.surah}:${r.ayah}`;
    const x = SURAHS[r.surah - 1];
    return (
      <Pressable accessibilityRole="button" accessibilityLabel={`${x.en} ${key}`} onPress={() => open(r.surah, r.ayah)} style={s.item}>
        {item.reason ? (
          <Text variant="label" color="lapis">
            {item.reason}
          </Text>
        ) : null}
        <Text selectable={false} numberOfLines={4} style={s.ayah}>
          {ayahForDisplay(item.index)}
        </Text>
        {english[key] ? (
          <Text numberOfLines={4} style={s.english}>
            {english[key]}
          </Text>
        ) : null}
        <Text variant="label" color="inkFaint">{`${x.en} ${key}`}</Text>
      </Pressable>
    );
  };

  /*
    Idle, the bar rests in the middle of the screen under the mark and the
    question. Start typing and it glides to the top, the head folding away,
    and results gather beneath. A glide rather than a jump, and the bar itself is
    only ever moved, never faded, so its glass always draws.
  */
  const active = focused || typing;
  /* Idle, the mark, question and bar sit truly centred in the space between
     the greeting and the tab bar, measured rather than guessed. */
  /* Start from the window size so the first frame is already centred; the
     measured height only refines it, so opening the tab does not jump. */
  const win = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const [bodyH, setBodyH] = useState(win.height - insets.top);
  const [kbH, setKbH] = useState(0);
  useEffect(() => {
    const show = Keyboard.addListener("keyboardWillShow", (e) => setKbH(e.endCoordinates.height));
    const hide = Keyboard.addListener("keyboardWillHide", () => setKbH(0));
    return () => {
      show.remove();
      hide.remove();
    };
  }, []);
  const idleTop = Math.max(space(2), Math.round((bodyH - TOP_ROW - TAB_ROOM - HEAD - BAR_H) / 2));
  const activeTop = space(1);
  /* The group stays centred, mark and question included, while tapping and
     while typing (the owner's call): it lifts only if the keyboard would
     cover the bar, and folds the head only on a phone too short to fit it.
     Results gather beneath the bar. */
  let target = idleTop;
  let fold = 0;
  const lift = kbH > 0 ? Math.round(bodyH - kbH - space(3) - BAR_H - TOP_ROW - HEAD) : idleTop;
  if (focused || typing) {
    if (lift >= activeTop) target = Math.min(idleTop, lift);
    else {
      target = activeTop;
      fold = 1;
    }
  }
  const top = useSharedValue(idleTop);
  const p = useSharedValue(0);
  useEffect(() => {
    const cfg = { duration: still ? 0 : 280, easing: Easing.out(Easing.cubic) };
    top.value = withTiming(target, cfg);
    p.value = withTiming(fold, cfg);
  }, [target, fold, still, top, p]);
  /* Shared values only inside a worklet: calling an ordinary function such
     as space() there runs on the UI thread and crashes a release build. */
  const spacer = useAnimatedStyle(() => ({ height: top.value }));
  const head = useAnimatedStyle(() => ({ height: HEAD * (1 - p.value), opacity: 1 - p.value }));

  return (
    <SafeAreaView style={s.safe} edges={["top"]}>
      <Breath />
      {typing ? null : <Glyphs />}
      <View style={s.body} onLayout={(e) => setBodyH(e.nativeEvent.layout.height)}>
        <TopBar title={greetName ? `Assalamu alaikum, ${greetName}` : "Assalamu alaikum"} subtitle={hijri} />
        <Animated.View style={spacer} />
        <Animated.View style={[s.head, head]} pointerEvents={fold ? "none" : "auto"}>
          <Arabic variant="title" color="lapis">
            دُرُوس
          </Arabic>
          <Text variant="pageTitle" style={s.title}>
            What would you like to read?
          </Text>
        </Animated.View>

        <Glass interactive style={s.bar}>
          <SearchIcon color={theme.colors.inkSoft} />
          <View style={{ flex: 1, justifyContent: "center" }}>
            {query.length === 0 ? (
              <View pointerEvents="none" style={StyleSheet.absoluteFill}>
                <View style={{ flex: 1, justifyContent: "center" }}>
                  <Typewriter style={{ fontSize: 17 }} />
                </View>
              </View>
            ) : null}
            <TextInput
              value={query}
              onChangeText={setQuery}
              onFocus={() => setFocused(true)}
              onBlur={() => setFocused(false)}
              style={s.input}
              returnKeyType="search"
              autoCorrect={false}
              autoCapitalize="none"
              clearButtonMode="while-editing"
              accessibilityLabel="Search the Quran"
            />
          </View>
        </Glass>

        {typing ? (
          <FlatList
            style={{ flex: 1 }}
            data={items}
            keyExtractor={(it) => (it.kind === "ayah" ? `a${it.index}` : `s${it.n}`)}
            renderItem={renderItem}
            ItemSeparatorComponent={() => <View style={s.rule} />}
            keyboardShouldPersistTaps="handled"
            keyboardDismissMode="on-drag"
            automaticallyAdjustKeyboardInsets
            showsVerticalScrollIndicator={false}
            contentContainerStyle={{ paddingBottom: space(12) }}
            ListHeaderComponent={
              <View>
                {typing && asking && items.length === 0 && completions.length === 0 ? <Seeking /> : null}
                {caption ? (
                  <View style={s.caption} accessible accessibilityLabel={picks && picks.results.length > 0 ? `Suggested by AI. ${caption}` : caption}>
                    {picks && picks.results.length > 0 ? <Sparkle color={theme.colors.lapis} /> : null}
                    <Text variant="label" color="inkSoft" style={{ textAlign: "center", flexShrink: 1 }}>
                      {caption}
                    </Text>
                  </View>
                ) : null}
                {completions.map((c, i) => (
                  <Pressable key={c} accessibilityRole="button" onPress={() => setQuery(c)} style={[s.quiet, i > 0 && s.quietRule]}>
                    <SearchIcon color={theme.colors.inkFaint} />
                    <Text color="inkSoft">{c}</Text>
                  </Pressable>
                ))}
              </View>
            }
          />
        ) : (
          <Pressable style={{ flex: 1 }} onPress={Keyboard.dismiss} accessible={false}>
            {!active && lastRead ? (
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={`Continue reading ${SURAHS[lastRead.surah - 1]?.en ?? ""} ${lastRead.surah}:${lastRead.ayah}`}
                onPress={() => openTo(lastRead.surah, lastRead.ayah)}
                style={{ alignSelf: "center", marginTop: space(2) }}
              >
                <Glass interactive style={s.pill}>
                  <Svg width={16} height={16} viewBox="0 0 24 24">
                    <Path d="M3.5 5.5c3-1 6-1 8.5 1v13c-2.5-2-5.5-2-8.5-1zM20.5 5.5c-3-1-6-1-8.5 1v13c2.5-2 5.5-2 8.5-1z" stroke={theme.colors.lapis} strokeWidth={1.7} strokeLinejoin="round" fill="none" />
                  </Svg>
                  <Text variant="label">{`Continue ${SURAHS[lastRead.surah - 1]?.en ?? "reading"}`}</Text>
                  <Text variant="label" color="inkFaint">{`${lastRead.surah}:${lastRead.ayah}`}</Text>
                </Glass>
              </Pressable>
            ) : null}
          </Pressable>
        )}
      </View>
    </SafeAreaView>
  );
}
