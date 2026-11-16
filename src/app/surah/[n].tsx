import { useLocalSearchParams, useRouter } from "expo-router";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ActionSheetIOS, FlatList, Pressable, Share, View, type ViewToken } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Svg, { Path } from "react-native-svg";

import { Glass } from "@/components/Glass";
import { NavigateSheet, ViewSheet, juzOf } from "@/components/QuranSheets";
import { Text } from "@/components/Text";
import { foldStatus } from "@/quran/status";
import { SURAHS } from "@/quran/tanzil";
import { surahForDisplay } from "@/quran/text";
import { usePrefs } from "@/state/prefs";
import { useQuranStatus } from "@/state/quranStatus";
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

  Tap an ayah and a Liquid Glass bar appears under it: memorized, understood,
  share. The surah and juz pill at the top opens the navigator; Aa opens the
  reading view. The controls float on glass over the page and never hold the
  text itself. Statuses live in the device event log (src/state/quranStatus).
  Everything here is on the phone, so it works offline.
*/

const toArabicDigits = (n: number) => String(n).replace(/\d/g, (d) => "٠١٢٣٤٥٦٧٨٩"[Number(d)]);

const useStyles = makeStyles((t) => ({
  page: { flex: 1, backgroundColor: t.colors.paper },
  topBar: { position: "absolute", left: 0, right: 0, flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: MARGIN },
  round: { width: 44, height: 44, borderRadius: 22, alignItems: "center", justifyContent: "center", overflow: "hidden" },
  pill: { height: 44, borderRadius: 22, paddingHorizontal: space(2.25), alignItems: "center", justifyContent: "center", overflow: "hidden" },
  toolbar: { flexDirection: "row", alignSelf: "center", borderRadius: RADIUS.pill, padding: 4, gap: 4, overflow: "hidden" },
  tool: { flexDirection: "row", alignItems: "center", gap: 6, paddingVertical: space(1), paddingHorizontal: space(1.75), borderRadius: RADIUS.pill },
  head: { alignItems: "center", gap: space(0.5), paddingTop: space(1), paddingBottom: space(3) },
  surahAr: { fontFamily: FONTS.quran, fontSize: 40, lineHeight: 76, color: t.colors.ink, textAlign: "center" },
  basmala: {
    fontFamily: FONTS.quran,
    fontSize: 26,
    lineHeight: 56,
    color: t.colors.ink,
    textAlign: "center",
    writingDirection: "rtl",
    paddingTop: space(2),
  },
  ayah: {
    paddingVertical: space(2),
    paddingHorizontal: space(1),
    borderRadius: RADIUS.card,
    gap: space(1),
  },
  target: { backgroundColor: t.colors.lapisWash },
  selected: { backgroundColor: t.colors.surfaceSunk },
  text: {
    fontFamily: FONTS.quran,
    fontSize: 28,
    lineHeight: 60,
    color: t.colors.ink,
    textAlign: "right",
    writingDirection: "rtl",
  },
  meta: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  chips: { flexDirection: "row", gap: space(0.75) },
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

export default function SurahReader() {
  const s = useStyles();
  const theme = useTheme();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{ n: string; ayah?: string }>();
  const n = Math.min(114, Math.max(1, Number(params.n) || 1));
  const targetAyah = params.ayah ? Number(params.ayah) : null;
  const meta = SURAHS[n - 1];

  const { basmala, ayahs } = useMemo(() => surahForDisplay(n), [n]);
  const events = useQuranStatus((st) => st.events);
  const setAyah = useQuranStatus((st) => st.setAyah);
  const setSurah = useQuranStatus((st) => st.setSurah);
  const setLastRead = usePrefs((st) => st.setLastRead);
  const size = usePrefs((st) => st.arabicSize);
  const maps = useMemo(() => foldStatus(events), [events]);

  const list = useRef<FlatList<string>>(null);
  const [highlight, setHighlight] = useState<number | null>(targetAyah);
  const [selected, setSelected] = useState<number | null>(null);
  const [visibleAyah, setVisibleAyah] = useState(targetAyah ?? 1);
  const [navOpen, setNavOpen] = useState(false);
  const [viewOpen, setViewOpen] = useState(false);

  /* Jump to the ayah search or the Map asked for. Heights vary, so this asks
     FlatList and retries once its estimate has laid out. */
  useEffect(() => {
    if (!targetAyah || targetAyah < 1 || targetAyah > meta.ayahs) return;
    const id = setTimeout(() => list.current?.scrollToIndex({ index: targetAyah - 1, viewPosition: 0.2, animated: false }), 60);
    const fade = setTimeout(() => setHighlight(null), 4000);
    return () => {
      clearTimeout(id);
      clearTimeout(fade);
    };
  }, [targetAyah, meta.ayahs]);

  const onViewable = useRef(({ viewableItems }: { viewableItems: ViewToken<string>[] }) => {
    const first = viewableItems.find((v) => v.index !== null);
    if (first?.index != null) {
      setVisibleAyah(first.index + 1);
      setLastRead({ surah: n, ayah: first.index + 1 });
    }
  }).current;

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

  const go = (surah: number, ayah: number) => {
    setNavOpen(false);
    if (surah === n) {
      list.current?.scrollToIndex({ index: ayah - 1, viewPosition: 0.2, animated: true });
      return;
    }
    router.replace(`/surah/${surah}?ayah=${ayah}`);
  };

  const textStyle = { fontSize: size, lineHeight: Math.round(size * 2.15) };
  const top = insets.top + space(1);
  const juz = juzOf(meta.start + visibleAyah - 1);

  const header = (
    <View style={s.head}>
      <Text selectable={false} style={s.surahAr}>
        {meta.ar}
      </Text>
      <Text variant="pageTitle">{meta.en}</Text>
      <Text variant="label" color="inkSoft">
        {`${meta.meaning}. ${meta.place}, ${meta.ayahs} ayahs`}
      </Text>
      <Pressable accessibilityRole="button" onPress={surahActions} hitSlop={8} style={{ paddingTop: space(1) }}>
        <Text variant="label" color="lapis">
          Mark this surah
        </Text>
      </Pressable>
      {basmala ? (
        <Text selectable={false} style={[s.basmala, { fontSize: size - 2, lineHeight: Math.round((size - 2) * 2.1) }]}>
          {basmala}
        </Text>
      ) : null}
    </View>
  );

  const footer = (
    <View style={s.foot}>
      <Text variant="label" color="inkFaint" style={{ textAlign: "center" }}>
        Arabic text from Tanzil. Translation arrives with Quran.com.
      </Text>
      {n < 114 ? (
        <Pressable accessibilityRole="button" onPress={() => router.replace(`/surah/${n + 1}`)} style={s.next}>
          <Text>{`Next: ${SURAHS[n].en}`}</Text>
        </Pressable>
      ) : null}
    </View>
  );

  return (
    <View style={s.page}>
      <FlatList
        ref={list}
        data={ayahs}
        keyExtractor={(_, i) => String(i)}
        ListHeaderComponent={header}
        ListFooterComponent={footer}
        ItemSeparatorComponent={() => <View style={s.rule} />}
        onViewableItemsChanged={onViewable}
        viewabilityConfig={{ itemVisiblePercentThreshold: 60 }}
        onScrollToIndexFailed={(info) => {
          list.current?.scrollToOffset({ offset: info.averageItemLength * info.index, animated: false });
          setTimeout(() => list.current?.scrollToIndex({ index: info.index, viewPosition: 0.2, animated: false }), 120);
        }}
        initialNumToRender={Math.max(12, (targetAyah ?? 0) + 4)}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingTop: top + TOP_BAR + space(1), paddingHorizontal: MARGIN, paddingBottom: insets.bottom + space(4) }}
        extraData={[selected, highlight, maps, size]}
        renderItem={({ item, index }) => {
          const ayah = index + 1;
          const g = meta.start + index;
          const m = maps.memorized[g] === 1;
          const u = maps.understood[g] === 1;
          const isSel = selected === ayah;
          return (
            <View>
              <Pressable
                onPress={() => setSelected(isSel ? null : ayah)}
                onLongPress={() => setSelected(ayah)}
                accessibilityLabel={`Ayah ${ayah}`}
                accessibilityHint="Tap for memorized, understood and share"
                style={[s.ayah, highlight === ayah && s.target, isSel && s.selected]}
              >
                <Text selectable={false} style={[s.text, textStyle]}>
                  {item}
                </Text>
                <View style={s.meta}>
                  <View style={s.chips}>
                    {m ? (
                      <View style={s.chip}>
                        <View style={[s.dot, { backgroundColor: theme.colors.saffron }]} />
                        <Text variant="label" color="inkSoft">
                          Memorized
                        </Text>
                      </View>
                    ) : null}
                    {u ? (
                      <View style={s.chip}>
                        <View style={[s.dot, { backgroundColor: theme.colors.verdigris }]} />
                        <Text variant="label" color="inkSoft">
                          Understood
                        </Text>
                      </View>
                    ) : null}
                  </View>
                  <View style={s.marker}>
                    <Text variant="label" color="saffron">
                      {toArabicDigits(ayah)}
                    </Text>
                  </View>
                </View>
              </Pressable>
              {isSel ? (
                /* Mounted plainly, never faded: glass does not draw under an
                   animated opacity. */
                <Glass interactive style={[s.toolbar, { marginBottom: space(1.5) }]}>
                  <Pressable
                    accessibilityRole="button"
                    accessibilityState={{ selected: m }}
                    onPress={() => setAyah(g, "memorized", !m)}
                    style={[s.tool, m && { backgroundColor: theme.colors.saffron }]}
                  >
                    <Icon d="M5 12.5l4.5 4.5L19 7.5" color={m ? theme.colors.paper : theme.colors.saffron} />
                    <Text variant="label" color={m ? "paper" : "ink"}>
                      Memorized
                    </Text>
                  </Pressable>
                  <Pressable
                    accessibilityRole="button"
                    accessibilityState={{ selected: u }}
                    onPress={() => setAyah(g, "understood", !u)}
                    style={[s.tool, u && { backgroundColor: theme.colors.verdigris }]}
                  >
                    <Icon
                      d="M2.5 12s3.5-6.5 9.5-6.5S21.5 12 21.5 12s-3.5 6.5-9.5 6.5S2.5 12 2.5 12zM12 14.5a2.5 2.5 0 100-5 2.5 2.5 0 000 5z"
                      color={u ? theme.colors.paper : theme.colors.verdigris}
                    />
                    <Text variant="label" color={u ? "paper" : "ink"}>
                      Understood
                    </Text>
                  </Pressable>
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel="Share reference"
                    onPress={() => void Share.share({ message: `${meta.en} ${n}:${ayah}` })}
                    style={s.tool}
                  >
                    <Icon d="M12 15V3.5M7.5 8L12 3.5 16.5 8M5 12.5v6a2 2 0 002 2h10a2 2 0 002-2v-6" color={theme.colors.lapis} />
                  </Pressable>
                </Glass>
              ) : null}
            </View>
          );
        }}
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

      <NavigateSheet visible={navOpen} onClose={() => setNavOpen(false)} current={{ surah: n, juz }} onGo={go} />
      <ViewSheet visible={viewOpen} onClose={() => setViewOpen(false)} />
    </View>
  );
}
