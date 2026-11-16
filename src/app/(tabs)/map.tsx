import { useRouter } from "expo-router";
import { useMemo, useState } from "react";
import { ActionSheetIOS, FlatList, Pressable, View, useWindowDimensions } from "react-native";

import { AyahField } from "@/components/AyahField";
import { Screen } from "@/components/Screen";
import { Text } from "@/components/Text";
import { countRange, foldStatus, totals } from "@/quran/status";
import { SURAHS, TOTAL_AYAHS } from "@/quran/tanzil";
import { useQuranStatus } from "@/state/quranStatus";
import { FONTS } from "@/theme/typography";
import { MARGIN, RADIUS, space } from "@/theme/layout";
import { makeStyles, useTheme } from "@/theme/useTheme";

/*
  The Map: every ayah as a dot, lit saffron when memorized and teal when
  understood, with the counts that matter above the list of surahs.

  Surah names and ayah counts are Tanzil's metadata (owner approved for the
  Map, 2026-11-16). Marking is per surah here; per ayah lives on the reader's
  long press.
*/

const useStyles = makeStyles((t) => ({
  head: { alignItems: "center", gap: space(0.5), paddingTop: space(2), paddingBottom: space(2) },
  counters: { flexDirection: "row", justifyContent: "center", flexWrap: "wrap", gap: space(3), paddingVertical: space(2.5) },
  counter: { alignItems: "center", minWidth: 96 },
  numeral: { fontSize: 32, lineHeight: 38 },
  filters: { flexDirection: "row", justifyContent: "center", gap: space(1), paddingBottom: space(1.5) },
  filter: { borderRadius: RADIUS.pill, borderWidth: 1, borderColor: t.colors.rule, paddingVertical: 6, paddingHorizontal: space(1.75) },
  filterOn: { backgroundColor: t.colors.lapisWash, borderColor: t.colors.lapis },
  row: { flexDirection: "row", alignItems: "center", paddingVertical: space(1.25), gap: space(1.5) },
  names: { flex: 1, gap: 2 },
  ar: { fontFamily: FONTS.quran, fontSize: 20, lineHeight: 38, color: t.colors.ink, writingDirection: "rtl" },
  track: { height: 4, borderRadius: 2, backgroundColor: t.colors.surfaceSunk, overflow: "hidden", flexDirection: "row" },
  rule: { height: 1, backgroundColor: t.colors.rule },
}));

type Filter = "all" | "memorized" | "understood";

export default function MapTab() {
  const s = useStyles();
  const theme = useTheme();
  const router = useRouter();
  const { width } = useWindowDimensions();
  const events = useQuranStatus((st) => st.events);
  const setSurah = useQuranStatus((st) => st.setSurah);
  const [filter, setFilter] = useState<Filter>("all");

  const maps = useMemo(() => foldStatus(events), [events]);
  const t = useMemo(() => totals(maps), [maps]);
  const rows = useMemo(
    () =>
      SURAHS.map((x) => ({
        ...x,
        m: countRange(maps.memorized, x.start, x.start + x.ayahs),
        u: countRange(maps.understood, x.start, x.start + x.ayahs),
      })).filter((x) => (filter === "memorized" ? x.m > 0 : filter === "understood" ? x.u > 0 : true)),
    [maps, filter],
  );

  const act = (n: number, m: number, u: number) => {
    const x = SURAHS[n - 1];
    const mAll = m === x.ayahs;
    const uAll = u === x.ayahs;
    ActionSheetIOS.showActionSheetWithOptions(
      {
        title: x.en,
        options: [mAll ? "Unmark memorized" : "Mark memorized", uAll ? "Unmark understood" : "Mark understood", "Open in Read", "Cancel"],
        cancelButtonIndex: 3,
      },
      (i) => {
        if (i === 0) setSurah(n, "memorized", !mAll);
        if (i === 1) setSurah(n, "understood", !uAll);
        if (i === 2) router.push(`/surah/${n}`);
      },
    );
  };

  const header = (
    <>
      <View style={s.head}>
        <Text variant="pageTitle">Map</Text>
        <Text color="inkSoft">Every ayah is a dot.</Text>
      </View>
      <View style={{ alignItems: "center" }}>
        <AyahField
          width={width - MARGIN * 2}
          height={Math.round(width * 0.95)}
          memorized={(i) => maps.memorized[i] === 1}
          understood={(i) => maps.understood[i] === 1}
        />
      </View>
      <View style={s.counters}>
        <View style={s.counter}>
          <Text variant="numeral" style={s.numeral}>{`${t.surahsMemorized}`}</Text>
          <Text variant="label" color="inkSoft">
            Surahs memorized
          </Text>
        </View>
        <View style={s.counter}>
          <Text variant="numeral" style={s.numeral}>{`${t.ayahsMemorized}`}</Text>
          <Text variant="label" color="inkSoft">{`of ${TOTAL_AYAHS.toLocaleString("en-US")} ayahs`}</Text>
        </View>
        <View style={s.counter}>
          <Text variant="numeral" style={s.numeral}>{`${t.surahsUnderstood}`}</Text>
          <Text variant="label" color="inkSoft">
            Surahs understood
          </Text>
        </View>
      </View>
      <View style={s.filters}>
        {(["all", "memorized", "understood"] as const).map((f) => (
          <Pressable
            key={f}
            accessibilityRole="button"
            accessibilityState={{ selected: filter === f }}
            onPress={() => setFilter(f)}
            style={[s.filter, filter === f && s.filterOn]}
          >
            <Text variant="label" color={filter === f ? "lapis" : "inkSoft"}>
              {f === "all" ? "All surahs" : f === "memorized" ? "Memorized" : "Understood"}
            </Text>
          </Pressable>
        ))}
      </View>
    </>
  );

  return (
    <Screen edges={["top"]}>
      <FlatList
        data={rows}
        keyExtractor={(x) => String(x.n)}
        ListHeaderComponent={header}
        ItemSeparatorComponent={() => <View style={s.rule} />}
        contentContainerStyle={{ paddingBottom: space(12) }}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <Text color="inkSoft" style={{ textAlign: "center", paddingTop: space(2) }}>
            Nothing here yet. Tap any surah under All surahs to mark it.
          </Text>
        }
        renderItem={({ item }) => (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`${item.en}, ${item.m} of ${item.ayahs} memorized`}
            onPress={() => act(item.n, item.m, item.u)}
            style={s.row}
          >
            <Text variant="label" color="inkFaint" style={{ width: 28, textAlign: "center" }}>
              {String(item.n)}
            </Text>
            <View style={s.names}>
              <Text>{item.en}</Text>
              <View style={s.track}>
                <View style={{ flex: item.m, backgroundColor: theme.colors.saffron }} />
                <View style={{ flex: Math.max(0, item.u - item.m), backgroundColor: theme.colors.verdigris }} />
                <View style={{ flex: Math.max(0, item.ayahs - Math.max(item.m, item.u)) }} />
              </View>
            </View>
            <Text selectable={false} style={s.ar}>
              {item.ar}
            </Text>
          </Pressable>
        )}
      />
    </Screen>
  );
}
