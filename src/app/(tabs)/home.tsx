import { useRouter } from "expo-router";
import { useEffect, useMemo, useState } from "react";
import { FlatList, Keyboard, Pressable, TextInput, View, useWindowDimensions } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import Svg, { Circle, Path } from "react-native-svg";

import { Arabic } from "@/components/Arabic";
import { Glass } from "@/components/Glass";
import { Text } from "@/components/Text";
import { ThemeToggle } from "@/components/ThemeToggle";
import { complete } from "@/quran/phrases";
import { loadVerseTranslations } from "@/quran/remote";
import { search } from "@/quran/search";
import { foldStatus } from "@/quran/status";
import { SURAHS } from "@/quran/tanzil";
import { ayahForDisplay, refOf, searchKeys } from "@/quran/text";
import { usePrefs } from "@/state/prefs";
import { useQuranStatus } from "@/state/quranStatus";
import { FONTS } from "@/theme/typography";
import { MARGIN, RADIUS, space } from "@/theme/layout";
import { makeStyles, useTheme } from "@/theme/useTheme";

/*
  Search: type anything, get ayahs and surahs.

  One clean list. Every result is either an ayah (the Arabic, its English
  underneath, and where it is from) or a surah. A feeling or topic expands
  into the ayahs it points to, so "i feel sad" shows ayahs, not a topic box.
  A single quiet line above the list says what you are looking at.

  The bar never moves: the head above it is a fixed height whether or not you
  are typing, and the list handles the keyboard with its own insets.

  Deterministic and local; only the English comes from the Durus server, and
  each ayah's English is kept on the phone once fetched.
*/

const SUGGESTIONS: { label: string; query: string }[] = [
  { label: "Al-Kahf", query: "kahf" },
  { label: "Ayat al-Kursi", query: "ayat al kursi" },
  { label: "Feeling anxious", query: "feeling anxious" },
  { label: "Before sleep", query: "before sleep" },
  { label: "Juz Amma", query: "juz amma" },
  { label: "Surprise me", query: "surprise me" },
];

const NO_RECENTS: string[] = [];
const MAX_RESULTS = 30;
const PER_REF = 3;

type Item = { kind: "ayah"; index: number } | { kind: "surah"; n: number };

const useStyles = makeStyles((t) => ({
  safe: { flex: 1, backgroundColor: t.colors.paper },
  body: { flex: 1, paddingHorizontal: MARGIN },
  toggle: { position: "absolute", right: MARGIN, top: space(1), zIndex: 2 },
  head: { alignItems: "center", gap: space(0.75), paddingBottom: space(2.5) },
  title: { fontSize: 24, lineHeight: 30, textAlign: "center" },
  bar: { flexDirection: "row", alignItems: "center", borderRadius: 28, minHeight: 54, paddingLeft: space(2), paddingRight: space(1), gap: space(1), overflow: "hidden" },
  input: { flex: 1, fontFamily: FONTS.uiRegular, fontSize: 17, color: t.colors.ink, paddingVertical: space(1.5) },
  caption: { paddingTop: space(2), paddingBottom: space(0.5) },
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
  const { height } = useWindowDimensions();
  const lastRead = usePrefs((st) => st.lastRead);
  const recents = usePrefs((st) => st.recentSearches) ?? NO_RECENTS;
  const rememberSearch = usePrefs((st) => st.rememberSearch);
  const translationId = usePrefs((st) => st.translationId) ?? 20;
  const events = useQuranStatus((st) => st.events);
  const maps = useMemo(() => foldStatus(events), [events]);
  const [query, setQuery] = useState("");
  const typing = query.trim().length > 0;

  const result = useMemo(() => search(query, searchKeys), [query]);

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
    const themes = result.hits.filter((h) => h.kind === "theme").slice(0, 2);
    for (const h of themes) if (h.kind === "theme") for (const r of h.theme.refs) expandRef(r).forEach(add);
    for (const h of result.hits) {
      if (h.kind === "surah") add({ kind: "surah", n: h.surah });
      else if (h.kind === "ayah" || h.kind === "text" || h.kind === "juz") add({ kind: "ayah", index: h.index });
    }
    let cap: string | null = null;
    const first = themes[0];
    if (first && first.kind === "theme") cap = first.theme.kind === "passage" ? first.theme.label : `For ${lower(first.theme.label)}`;
    else if (result.label) cap = result.label;
    else if (result.hits.some((h) => h.kind === "text")) cap = `${result.total} ${result.total === 1 ? "place" : "places"} with "${query.trim()}"`;
    else if (typing && out.length === 0) cap = result.pendingTopic ? `"${result.pendingTopic}" is coming soon` : "Nothing found";
    return { items: out, caption: cap };
  }, [result, query, typing]);

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

  /* Two personal starting points when the bar is empty. */
  const forYou = useMemo(() => {
    const now = new Date();
    const hour = now.getHours();
    const out: { label: string; line: string; onPress: () => void }[] = [];
    if (lastRead) {
      const x = SURAHS[lastRead.surah - 1];
      out.push({ label: `Continue ${x.en}`, line: `Ayah ${lastRead.ayah}`, onPress: () => openTo(lastRead.surah, lastRead.ayah) });
    }
    if (now.getDay() === 5) out.push({ label: "Al-Kahf", line: "It is Friday", onPress: () => openTo(18) });
    else if (hour >= 21 || hour < 4) out.push({ label: "Before sleep", line: "Readings for the end of the day", onPress: () => setQuery("before sleep") });
    const carried = SURAHS.filter((x) => {
      for (let i = x.start; i < x.start + x.ayahs; i++) if (!maps.memorized[i]) return false;
      return true;
    });
    if (carried.length > 0) {
      const pick = carried[Math.floor(now.getTime() / 86_400_000) % carried.length];
      out.push({ label: `Revise ${pick.en}`, line: "From what you know by heart", onPress: () => openTo(pick.n) });
    }
    return out.slice(0, 2);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lastRead, maps]);

  const renderItem = ({ item }: { item: Item }) => {
    if (item.kind === "surah") {
      const x = SURAHS[item.n - 1];
      return (
        <Pressable accessibilityRole="button" accessibilityLabel={`Surah ${x.en}`} onPress={() => open(x.n)} style={[s.item, { flexDirection: "row", alignItems: "center", gap: space(1.5) }]}>
          <View style={{ flex: 1, gap: 2 }}>
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

  return (
    <SafeAreaView style={s.safe} edges={["top"]}>
      <View style={s.toggle}>
        <ThemeToggle />
      </View>
      <View style={s.body}>
        {/* Fixed height in both states, so the bar never moves. */}
        <View style={[s.head, { paddingTop: Math.round(height * 0.1) }]}>
          <Arabic variant="title" color="lapis">
            دُرُوس
          </Arabic>
          <Text variant="pageTitle" style={s.title}>
            What would you like to read?
          </Text>
        </View>

        <Glass interactive style={s.bar}>
          <SearchIcon color={theme.colors.inkSoft} />
          <TextInput
            value={query}
            onChangeText={setQuery}
            placeholder="Anything: a feeling, a surah, 2:255, Arabic"
            placeholderTextColor={theme.colors.inkFaint}
            style={s.input}
            returnKeyType="search"
            autoCorrect={false}
            autoCapitalize="none"
            clearButtonMode="while-editing"
            accessibilityLabel="Search the Quran"
          />
        </Glass>

        <FlatList
          style={{ flex: 1 }}
          data={typing ? items : []}
          keyExtractor={(it) => (it.kind === "ayah" ? `a${it.index}` : `s${it.n}`)}
          renderItem={renderItem}
          ItemSeparatorComponent={() => <View style={s.rule} />}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag"
          automaticallyAdjustKeyboardInsets
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: space(12) }}
          ListHeaderComponent={
            typing ? (
              <View>
                {caption ? (
                  <Text variant="label" color="inkSoft" style={s.caption}>
                    {caption}
                  </Text>
                ) : null}
                {completions.map((c, i) => (
                  <Pressable key={c} accessibilityRole="button" onPress={() => setQuery(c)} style={[s.quiet, i > 0 && s.quietRule]}>
                    <SearchIcon color={theme.colors.inkFaint} />
                    <Text color="inkSoft">{c}</Text>
                  </Pressable>
                ))}
              </View>
            ) : (
              <View style={{ gap: space(3), paddingTop: space(2) }}>
                {forYou.length > 0 ? (
                  <View>
                    {forYou.map((f, i) => (
                      <Pressable key={f.label} accessibilityRole="button" onPress={f.onPress} style={[s.quiet, i > 0 && s.quietRule]}>
                        <View style={{ flex: 1 }}>
                          <Text>{f.label}</Text>
                          <Text variant="label" color="inkFaint">
                            {f.line}
                          </Text>
                        </View>
                        <Text color="inkFaint">{"›"}</Text>
                      </Pressable>
                    ))}
                  </View>
                ) : null}
                <View style={s.chips}>
                  {recents
                    .slice(0, 2)
                    .map((r) => ({ label: r, query: r }))
                    .concat(SUGGESTIONS)
                    .slice(0, 6)
                    .map((x) => (
                      <Pressable key={x.label} accessibilityRole="button" onPress={() => setQuery(x.query)} style={s.chip}>
                        <Text variant="label" color="inkSoft">
                          {x.label}
                        </Text>
                      </Pressable>
                    ))}
                </View>
              </View>
            )
          }
        />
      </View>
    </SafeAreaView>
  );
}
