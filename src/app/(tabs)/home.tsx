import { useRouter } from "expo-router";
import { useMemo, useState } from "react";
import { FlatList, Keyboard, Pressable, TextInput, View, useWindowDimensions } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import Svg, { Circle, Path } from "react-native-svg";

import { Arabic } from "@/components/Arabic";
import { Glass } from "@/components/Glass";
import { Text } from "@/components/Text";
import { complete } from "@/quran/phrases";
import { reply } from "@/quran/reply";
import { parseThemeRef, search, type Hit } from "@/quran/search";
import { foldStatus } from "@/quran/status";
import { SURAHS } from "@/quran/tanzil";
import { ayahForDisplay, refOf, searchKeys } from "@/quran/text";
import { usePrefs } from "@/state/prefs";
import { useQuranStatus } from "@/state/quranStatus";
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
  { label: "Ayat al-Kursi", query: "ayat al kursi" },
  { label: "Feeling anxious", query: "feeling anxious" },
  { label: "Before sleep", query: "before sleep" },
  { label: "Juz Amma", query: "juz amma" },
  { label: "Surprise me", query: "surprise me" },
];

type Row = Hit | { kind: "heading"; title: string; count: number };
const NO_RECENTS: string[] = [];

const useStyles = makeStyles((t) => ({
  safe: { flex: 1, backgroundColor: t.colors.paper },
  body: { flex: 1, paddingHorizontal: MARGIN },
  heads: { alignItems: "center", gap: space(1) },
  title: { fontSize: 24, lineHeight: 30, textAlign: "center" },
  bar: { flexDirection: "row", alignItems: "center", borderRadius: 28, minHeight: 56, paddingLeft: space(2), paddingRight: space(1), gap: space(1), overflow: "hidden" },
  input: { flex: 1, fontFamily: FONTS.uiRegular, fontSize: 17, color: t.colors.ink, paddingVertical: space(1.75) },
  chips: { flexDirection: "row", flexWrap: "wrap", justifyContent: "center", gap: space(1) },
  chip: { borderRadius: RADIUS.pill, backgroundColor: t.colors.surfaceSunk, paddingVertical: space(0.875), paddingHorizontal: space(1.5) },
  result: { paddingVertical: space(1.5), gap: space(0.5) },
  rowCard: { borderRadius: RADIUS.card, backgroundColor: t.colors.surface, borderWidth: 1, borderColor: t.colors.rule, paddingHorizontal: space(1.75), marginBottom: space(1) },
  badge: { width: 32, height: 32, borderRadius: 16, borderWidth: 1, borderColor: t.colors.rule, alignItems: "center", justifyContent: "center" },
  heading: { paddingTop: space(2), paddingBottom: space(1) },
  headFixed: { alignItems: "center", gap: space(0.75), paddingBottom: space(2.5) },
  replyCard: { borderRadius: RADIUS.card, backgroundColor: t.colors.lapisWash, paddingVertical: space(1.75), paddingHorizontal: space(2) },
  completion: { flexDirection: "row", alignItems: "center", gap: space(1.25), paddingVertical: space(1.1), paddingHorizontal: space(0.5) },
  forYou: { flexDirection: "row", alignItems: "center", gap: space(1), paddingVertical: space(1.25), paddingHorizontal: space(0.5) },
  forYouRule: { borderTopWidth: 1, borderTopColor: t.colors.rule },
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
  const { height } = useWindowDimensions();
  const lastRead = usePrefs((st) => st.lastRead);
  const [query, setQuery] = useState("");

  const result = useMemo(() => search(query, searchKeys), [query]);
  const completions = useMemo(() => complete(query, 4), [query]);
  const typing = query.trim().length > 0;
  const events = useQuranStatus((st) => st.events);
  const maps = useMemo(() => foldStatus(events), [events]);
  const answer = useMemo(() => reply(query, result, { maps, lastRead, now: new Date() }), [query, result, maps, lastRead]);

  /*
    For you: a few personal starting points when the bar is empty. Built only
    from what the app knows: where you stopped, what you carry, the hour and
    the day.
  */
  const forYou = useMemo(() => {
    const now = new Date();
    const hour = now.getHours();
    const out: { label: string; line: string; onPress: () => void }[] = [];
    if (lastRead) {
      const x = SURAHS[lastRead.surah - 1];
      out.push({ label: `Continue ${x.en}`, line: `You stopped at ayah ${lastRead.ayah}.`, onPress: () => openTo(lastRead.surah, lastRead.ayah) });
    }
    if (now.getDay() === 5) out.push({ label: "Al-Kahf", line: "It is Friday.", onPress: () => openTo(18) });
    else if (hour >= 21 || hour < 4) out.push({ label: "Before sleep", line: "It is late. Readings for the end of the day.", onPress: () => setQuery("before sleep") });
    const carried = SURAHS.filter((x) => {
      let all = true;
      for (let i = x.start; i < x.start + x.ayahs; i++) if (!maps.memorized[i]) { all = false; break; }
      return all;
    });
    if (carried.length > 0) {
      /* A different one each day, so revision moves through what you know. */
      const pick = carried[Math.floor(now.getTime() / 86_400_000) % carried.length];
      out.push({ label: `Revise ${pick.en}`, line: `One of the ${carried.length} ${carried.length === 1 ? "surah" : "surahs"} you know by heart.`, onPress: () => openTo(pick.n) });
    }
    return out.slice(0, 2);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lastRead, maps]);

  const recents = usePrefs((st) => st.recentSearches) ?? NO_RECENTS;
  const rememberSearch = usePrefs((st) => st.rememberSearch);

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

  const openTo = (surah: number, ayah?: number) => {
    Keyboard.dismiss();
    router.push(ayah ? `/surah/${surah}?ayah=${ayah}` : `/surah/${surah}`);
  };
  const open = (surah: number, ayah?: number) => {
    rememberSearch(query);
    openTo(surah, ayah);
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

  /*
    One fixed layout. The mark, the question and the bar never move: typing
    only changes what sits below the bar, and the keyboard is handled by the
    list's own insets rather than by pushing the screen up. Nothing fades,
    because the bar is glass.
  */
  return (
    <SafeAreaView style={s.safe} edges={["top"]}>
      <View style={s.body}>
        <View style={[s.headFixed, { paddingTop: Math.round(height * 0.12) }]}>
          <Arabic variant="title" color="lapis">
            دُرُوس
          </Arabic>
          <Text variant="pageTitle" style={s.title}>
            What would you like to read?
          </Text>
        </View>
        {bar}
        <FlatList
          style={{ flex: 1 }}
          data={typing ? rows : []}
          keyExtractor={(h, i) => `${h.kind}-${i}`}
          renderItem={renderHit}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag"
          automaticallyAdjustKeyboardInsets
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingTop: space(1.5), paddingBottom: space(12) }}
          ListHeaderComponent={
            typing ? (
              <View style={{ gap: space(1.25) }}>
                {answer ? (
                  <View style={[s.replyCard, answer.tone !== "answer" && { backgroundColor: theme.colors.surface }]}>
                    <Text style={{ lineHeight: 23 }}>{answer.text}</Text>
                  </View>
                ) : null}
                {completions.length > 0 ? (
                  <View style={{ gap: 2 }}>
                    {completions.map((c) => (
                      <Pressable key={c} accessibilityRole="button" onPress={() => setQuery(c)} style={s.completion}>
                        <SearchIcon color={theme.colors.inkFaint} />
                        <Text color="inkSoft">{c}</Text>
                      </Pressable>
                    ))}
                  </View>
                ) : null}
              </View>
            ) : (
              /* Quiet when idle: a line or two for you, then a few light
                 suggestions. No boxes, so the bar stays the centre of it. */
              <View style={{ gap: space(3), paddingTop: space(1) }}>
                {forYou.length > 0 ? (
                  <View>
                    {forYou.map((f, i) => (
                      <Pressable key={f.label} accessibilityRole="button" onPress={f.onPress} style={[s.forYou, i > 0 && s.forYouRule]}>
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
                  {(recents.length > 0 ? recents.slice(0, 2).map((r) => ({ label: r, query: r })) : [])
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
          ListFooterComponent={
            typing && result.total > result.hits.length ? (
              <Text variant="label" color="inkFaint" style={{ textAlign: "center", paddingTop: space(2) }}>
                {`Showing ${result.hits.length} of ${result.total}`}
              </Text>
            ) : null
          }
        />
      </View>
    </SafeAreaView>
  );
}
