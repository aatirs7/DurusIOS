import { useRouter } from "expo-router";
import { useMemo, useState } from "react";
import { FlatList, Keyboard, KeyboardAvoidingView, Platform, Pressable, TextInput, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import Svg, { Circle, Path } from "react-native-svg";

import { Arabic } from "@/components/Arabic";
import { Glass } from "@/components/Glass";
import { Text } from "@/components/Text";
import { parseThemeRef, search, suggest, type Hit } from "@/quran/search";
import { SURAHS } from "@/quran/tanzil";
import { ayahForDisplay, refOf, searchKeys } from "@/quran/text";
import { usePrefs } from "@/state/prefs";
import { FONTS } from "@/theme/typography";
import { MARGIN, RADIUS, space } from "@/theme/layout";
import { makeStyles, useTheme } from "@/theme/useTheme";

/*
  Home is a search bar, the way Claude opens: the bar sits in the middle of
  the screen until you type, then rises to the top with results under it.

  Deterministic, local and offline (owner, 2026-11-16): no model and no
  network. It understands references (2:255), surah numbers and names, juz, and
  Arabic words, matched through Tanzil's Simple Clean search key so typed
  Arabic finds Uthmani spelling. Feelings and topics come from a reviewed list
  and say so plainly while that list is still under review.
*/

const SUGGESTIONS: { label: string; query: string }[] = [
  { label: "Al-Kahf", query: "kahf" },
  { label: "2:255", query: "2:255" },
  { label: "Juz 30", query: "juz 30" },
  { label: "Al-Mulk", query: "mulk" },
  { label: "Ya-Sin", query: "36" },
  { label: "Ar-Rahman", query: "55" },
  { label: "I can't sleep", query: "i cant sleep" },
  { label: "Feeling anxious", query: "feeling anxious" },
  { label: "Surprise me", query: "surprise me" },
];

type Row = Hit | { kind: "heading"; title: string; count: number };
const NO_RECENTS: string[] = [];

const useStyles = makeStyles((t) => ({
  safe: { flex: 1, backgroundColor: t.colors.paper },
  body: { flex: 1, paddingHorizontal: MARGIN },
  heads: { alignItems: "center", gap: space(1) },
  title: { fontSize: 34, lineHeight: 40, textAlign: "center" },
  bar: { flexDirection: "row", alignItems: "center", borderRadius: 28, minHeight: 56, paddingLeft: space(2), paddingRight: space(1), gap: space(1), overflow: "hidden" },
  input: { flex: 1, fontFamily: FONTS.uiRegular, fontSize: 17, color: t.colors.ink, paddingVertical: space(1.75) },
  chips: { flexDirection: "row", flexWrap: "wrap", justifyContent: "center", gap: space(1) },
  chip: { borderRadius: RADIUS.pill, borderWidth: 1, borderColor: t.colors.rule, backgroundColor: t.colors.surface, paddingVertical: space(1), paddingHorizontal: space(1.75) },
  result: { paddingVertical: space(1.5), gap: space(0.5) },
  rowCard: { borderRadius: RADIUS.card, backgroundColor: t.colors.surface, borderWidth: 1, borderColor: t.colors.rule, paddingHorizontal: space(1.75), marginBottom: space(1) },
  badge: { width: 32, height: 32, borderRadius: 16, borderWidth: 1, borderColor: t.colors.rule, alignItems: "center", justifyContent: "center" },
  heading: { paddingTop: space(2), paddingBottom: space(1) },
  refRow: { flexDirection: "row", alignItems: "center", gap: space(1) },
  ref: { borderRadius: RADIUS.pill, backgroundColor: t.colors.lapisWash, paddingHorizontal: space(1.25), paddingVertical: 2 },
  ayah: { fontFamily: FONTS.quran, fontSize: 22, lineHeight: 46, color: t.colors.ink, textAlign: "right", writingDirection: "rtl" },
  ar: { fontFamily: FONTS.quran, fontSize: 20, lineHeight: 38, color: t.colors.ink, writingDirection: "rtl" },
  rule: { height: 1, backgroundColor: t.colors.rule },
  note: { borderRadius: RADIUS.card, backgroundColor: t.colors.surface, borderWidth: 1, borderColor: t.colors.rule, padding: space(2), gap: space(0.5), marginTop: space(1.5) },
}));

function SearchIcon({ color }: { color: string }) {
  return (
    <Svg width={20} height={20} viewBox="0 0 24 24">
      <Circle cx={11} cy={11} r={6.5} stroke={color} strokeWidth={1.8} fill="none" />
      <Path d="M16 16l4.5 4.5" stroke={color} strokeWidth={1.8} strokeLinecap="round" />
    </Svg>
  );
}

export default function Home() {
  const s = useStyles();
  const theme = useTheme();
  const router = useRouter();
  const lastRead = usePrefs((st) => st.lastRead);
  const [query, setQuery] = useState("");

  const result = useMemo(() => search(query, searchKeys), [query]);
  const completions = useMemo(() => suggest(query).filter((c) => c.toLowerCase() !== query.trim().toLowerCase()), [query]);
  const typing = query.trim().length > 0;

  const recents = usePrefs((st) => st.recentSearches) ?? NO_RECENTS;
  const rememberSearch = usePrefs((st) => st.rememberSearch);
  const clearSearches = usePrefs((st) => st.clearSearches);

  /* Results grouped under quiet headings: topics, surahs, ayahs. */
  const rows = useMemo(() => {
    const groups: [string, Hit[]][] = [
      ["Topics", result.hits.filter((h) => h.kind === "theme")],
      ["Surahs and juz", result.hits.filter((h) => h.kind === "surah" || h.kind === "juz")],
      ["Ayahs", result.hits.filter((h) => h.kind === "ayah" || h.kind === "text")],
    ];
    const out: Row[] = [];
    for (const [title, hits] of groups) {
      if (hits.length === 0) continue;
      out.push({ kind: "heading", title: result.label && title !== "Topics" ? result.label : title, count: title === "Ayahs" ? Math.max(hits.length, result.total - out.length) : hits.length });
      hits.forEach((h) => out.push(h));
    }
    return out;
  }, [result]);

  const open = (surah: number, ayah?: number) => {
    rememberSearch(query);
    Keyboard.dismiss();
    router.push(ayah ? `/surah/${surah}?ayah=${ayah}` : `/surah/${surah}`);
  };

  const renderHit = ({ item }: { item: Row }) => {
    if (item.kind === "heading") {
      return (
        <View style={s.heading}>
          <Text variant="eyebrow" color="inkSoft">
            {item.title}
          </Text>
        </View>
      );
    }
    if (item.kind === "surah") {
      const x = SURAHS[item.surah - 1];
      return (
        <Pressable accessibilityRole="button" onPress={() => open(x.n)} style={[s.result, s.rowCard, { flexDirection: "row", alignItems: "center", gap: space(1.5) }]}>
          <View style={s.badge}>
            <Text variant="label" color="inkSoft">
              {String(x.n)}
            </Text>
          </View>
          <View style={{ flex: 1, gap: 2 }}>
            <Text>{x.en}</Text>
            <Text variant="label" color="inkSoft">{`Surah ${x.n}. ${x.meaning}, ${x.ayahs} ayahs`}</Text>
          </View>
          <Text selectable={false} style={s.ar}>
            {x.ar}
          </Text>
        </Pressable>
      );
    }
    if (item.kind === "juz") {
      const at = refOf(item.index);
      return (
        <Pressable accessibilityRole="button" onPress={() => open(at.surah, at.ayah)} style={[s.result, s.rowCard]}>
          <Text>{`Juz ${item.juz}`}</Text>
          <Text variant="label" color="inkSoft">{`From ${SURAHS[at.surah - 1].en} ${at.surah}:${at.ayah}`}</Text>
        </Pressable>
      );
    }
    if (item.kind === "theme") {
      /* Only verified topics reach here. Each reference opens in the reader. */
      return (
        <View style={[s.result, s.rowCard]}>
          <Text>{item.theme.label}</Text>
          <View style={[s.chips, { justifyContent: "flex-start", paddingTop: space(0.5) }]}>
            {item.theme.refs.map((r) => {
              const at = parseThemeRef(r);
              return (
                <Pressable key={r} accessibilityRole="button" onPress={() => open(at.surah, at.ayah)} style={s.chip}>
                  <Text variant="label" color="lapis">
                    {r.includes(":") ? r : SURAHS[at.surah - 1].en}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </View>
      );
    }
    /* An ayah, by reference or by its words. Shown verbatim. */
    const x = SURAHS[item.surah - 1];
    return (
      <Pressable accessibilityRole="button" onPress={() => open(item.surah, item.ayah)} style={[s.result, s.rowCard]}>
        <View style={s.refRow}>
          <View style={s.ref}>
            <Text variant="label" color="lapis">{`${item.surah}:${item.ayah}`}</Text>
          </View>
          <Text variant="label" color="inkSoft">
            {x.en}
          </Text>
        </View>
        <Text selectable={false} numberOfLines={3} style={s.ayah}>
          {ayahForDisplay(item.index)}
        </Text>
      </Pressable>
    );
  };

  const bar = (
    <Glass interactive style={s.bar}>
      <SearchIcon color={theme.colors.inkSoft} />
      <TextInput
        value={query}
        onChangeText={setQuery}
        placeholder="A surah, 2:255, a juz, or Arabic words"
        placeholderTextColor={theme.colors.inkFaint}
        style={s.input}
        returnKeyType="search"
        autoCorrect={false}
        autoCapitalize="none"
        clearButtonMode="while-editing"
        accessibilityLabel="Search the Quran"
      />
    </Glass>
  );

  return (
    <SafeAreaView style={s.safe} edges={["top"]}>
      <KeyboardAvoidingView style={s.body} behavior={Platform.OS === "ios" ? "padding" : undefined}>
        {/*
          One tree for both states, so the input is never remounted and the
          keyboard stays up on the first letter. Idle, flexible space above and
          below centres the bar; typing, the space above collapses and results
          fill the space below. No fade: the bar is glass.
        */}
        <View style={{ flex: typing ? 0 : 1 }} />
        {typing ? null : (
          <View style={[s.heads, { paddingBottom: space(3) }]}>
            <Arabic variant="title" color="lapis">
              دُرُوس
            </Arabic>
            <Text variant="pageTitle" style={s.title}>
              What would you like to read?
            </Text>
          </View>
        )}
        <View style={{ paddingTop: typing ? space(1.5) : 0 }}>{bar}</View>
        {typing ? (
          <FlatList
            style={{ flex: 1 }}
            data={rows}
            keyExtractor={(h, i) => `${h.kind}-${i}`}
            renderItem={renderHit}
            keyboardShouldPersistTaps="handled"
            keyboardDismissMode="on-drag"
            contentContainerStyle={{ paddingTop: space(1), paddingBottom: space(12) }}
            ListHeaderComponent={
              <View>
                {completions.length > 0 ? (
                  /* Type-ahead: tap to finish the query. */
                  <View style={[s.chips, { justifyContent: "flex-start", paddingTop: space(1) }]}>
                    {completions.map((c) => (
                      <Pressable key={c} accessibilityRole="button" onPress={() => setQuery(c)} style={s.chip}>
                        <Text variant="label" color="inkSoft">
                          {c}
                        </Text>
                      </Pressable>
                    ))}
                  </View>
                ) : null}
                {result.pendingTopic ? (
                  <View style={s.note}>
                    <Text>{`"${result.pendingTopic}" is being reviewed`}</Text>
                    <Text variant="label" color="inkSoft">
                      Each topic appears once its references have been checked. Until then, search a surah, an ayah or Arabic words.
                    </Text>
                  </View>
                ) : null}
              </View>
            }
            ListEmptyComponent={
              result.pendingTopic ? null : (
                <Text color="inkSoft" style={{ textAlign: "center", paddingTop: space(3) }}>
                  Nothing found. Try a surah name, a number like 18, an ayah like 2:255, or Arabic words.
                </Text>
              )
            }
            ListFooterComponent={
              result.total > result.hits.length ? (
                <Text variant="label" color="inkFaint" style={{ textAlign: "center", paddingTop: space(2) }}>
                  {`Showing ${result.hits.length} of ${result.total}`}
                </Text>
              ) : null
            }
          />
        ) : (
          <View style={{ flex: 1, paddingTop: space(3), gap: space(2.5) }}>
            {recents.length > 0 ? (
              <View style={{ gap: space(1) }}>
                <View style={{ flexDirection: "row", justifyContent: "center", gap: space(2) }}>
                  <Text variant="eyebrow" color="inkSoft">
                    Recent
                  </Text>
                  <Pressable accessibilityRole="button" onPress={clearSearches} hitSlop={8}>
                    <Text variant="eyebrow" color="inkFaint">
                      Clear
                    </Text>
                  </Pressable>
                </View>
                <View style={s.chips}>
                  {recents.slice(0, 6).map((r) => (
                    <Pressable key={r} accessibilityRole="button" onPress={() => setQuery(r)} style={s.chip}>
                      <Text variant="label">{r}</Text>
                    </Pressable>
                  ))}
                </View>
              </View>
            ) : null}
            <View style={s.chips}>
              {lastRead ? (
                <Pressable
                  accessibilityRole="button"
                  onPress={() => open(lastRead.surah, lastRead.ayah)}
                  style={[s.chip, { borderColor: theme.colors.lapis }]}
                >
                  <Text variant="label" color="lapis">{`Continue ${SURAHS[lastRead.surah - 1].en} ${lastRead.surah}:${lastRead.ayah}`}</Text>
                </Pressable>
              ) : null}
              {SUGGESTIONS.map((x) => (
                <Pressable key={x.label} accessibilityRole="button" onPress={() => setQuery(x.query)} style={s.chip}>
                  <Text variant="label" color="inkSoft">
                    {x.label}
                  </Text>
                </Pressable>
              ))}
            </View>
          </View>
        )}
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
