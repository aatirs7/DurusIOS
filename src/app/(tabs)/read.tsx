import { useRouter } from "expo-router";
import { useMemo, useState } from "react";
import { FlatList, Pressable, View } from "react-native";

import { PageTip } from "@/components/PageTip";
import { Breath } from "@/components/Breath";
import { Glass } from "@/components/Glass";
import { Screen } from "@/components/Screen";
import { Text } from "@/components/Text";
import { TopBar } from "@/components/TopBar";
import { countRange, foldStatus } from "@/quran/status";
import { JUZ_STARTS, SURAHS } from "@/quran/tanzil";
import { refOf } from "@/quran/text";
import { usePrefs } from "@/state/prefs";
import { useQuranStatus } from "@/state/quranStatus";
import { FONTS } from "@/theme/typography";
import { space } from "@/theme/layout";
import { makeStyles, useTheme } from "@/theme/useTheme";

/*
  Read: where you left off, then all 114 surahs.

  Rows are Liquid Glass cards over the breathing light, at the owner's ask,
  so Read matches Search. Each row carries two small status marks, saffron for memorized and teal for
  understood, filled in proportion to how much of the surah is marked. Tapping
  a row opens the reader as a root screen.
*/

const useStyles = makeStyles((t) => ({
  head: {
    alignItems: "center",
    gap: space(0.5),
    paddingTop: space(2),
    paddingBottom: space(2.5),
  },
  resume: {
    borderRadius: 24,
    padding: space(2.5),
    alignItems: "center",
    gap: space(0.5),
    overflow: "hidden",
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: space(1.25),
    paddingHorizontal: space(1.5),
    gap: space(1.5),
    borderRadius: 20,
    overflow: "hidden",
  },
  gapRow: { height: space(1) },
  chip: {
    borderRadius: 999,
    paddingVertical: 6,
    paddingHorizontal: space(1.5),
    overflow: "hidden",
  },
  num: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: t.colors.rule,
    alignItems: "center",
    justifyContent: "center",
  },
  names: { flex: 1, gap: 2 },
  ar: {
    fontFamily: FONTS.quran,
    fontSize: 22,
    lineHeight: 42,
    color: t.colors.ink,
    writingDirection: "rtl",
  },
  right: { alignItems: "flex-end", gap: 4 },
  bars: { flexDirection: "row", gap: 4 },
  bar: {
    width: 22,
    height: 4,
    borderRadius: 2,
    backgroundColor: t.colors.surfaceSunk,
    overflow: "hidden",
  },
  rule: { height: 1, backgroundColor: t.colors.rule },
  seg: {
    flexDirection: "row",
    alignSelf: "center",
    borderRadius: 999,
    padding: 3,
    marginBottom: space(1.5),
    overflow: "hidden",
  },
  segItem: {
    paddingVertical: 7,
    paddingHorizontal: space(3),
    borderRadius: 999,
  },
  segOn: { backgroundColor: t.colors.lapisWash },
}));

function Bar({ fraction, color }: { fraction: number; color: string }) {
  const s = useStyles();
  return (
    <View style={s.bar}>
      <View
        style={{
          width: `${Math.round(fraction * 100)}%`,
          height: 4,
          backgroundColor: color,
        }}
      />
    </View>
  );
}

export default function Read() {
  const s = useStyles();
  const theme = useTheme();
  const router = useRouter();
  const events = useQuranStatus((st) => st.events);
  const lastRead = usePrefs((st) => st.lastRead);
  const bookmarks = usePrefs((st) => st.bookmarks);
  const [by, setBy] = useState<"surah" | "juz">("surah");
  const juzRows = useMemo(
    () => JUZ_STARTS.map((start, i) => ({ juz: i + 1, ...refOf(start) })),
    [],
  );

  const fractions = useMemo(() => {
    const maps = foldStatus(events);
    return SURAHS.map((x) => ({
      m: countRange(maps.memorized, x.start, x.start + x.ayahs) / x.ayahs,
      u: countRange(maps.understood, x.start, x.start + x.ayahs) / x.ayahs,
    }));
  }, [events]);

  const header = (
    <>
      {lastRead ? (
        <Pressable
          accessibilityRole="button"
          onPress={() =>
            router.push(`/surah/${lastRead.surah}?ayah=${lastRead.ayah}`)
          }
          style={{ marginBottom: space(2.5) }}
        >
          <Glass interactive style={s.resume}>
            <Text variant="eyebrow" color="inkSoft">
              Continue reading
            </Text>
            <Text
              selectable={false}
              style={[s.ar, { fontSize: 28, lineHeight: 52 }]}
            >
              {SURAHS[lastRead.surah - 1].ar}
            </Text>
            <Text>{`${SURAHS[lastRead.surah - 1].en}, ayah ${lastRead.ayah}`}</Text>
          </Glass>
        </Pressable>
      ) : null}
      {bookmarks.length > 0 ? (
        <View style={{ paddingBottom: space(2.5), gap: space(1) }}>
          <Text
            variant="eyebrow"
            color="inkSoft"
            style={{ textAlign: "center" }}
          >
            Bookmarks
          </Text>
          <View
            style={{
              flexDirection: "row",
              flexWrap: "wrap",
              justifyContent: "center",
              gap: space(1),
            }}
          >
            {bookmarks.slice(0, 12).map((g) => {
              const at = refOf(g);
              return (
                <Pressable
                  key={g}
                  accessibilityRole="button"
                  onPress={() =>
                    router.push(`/surah/${at.surah}?ayah=${at.ayah}`)
                  }
                >
                  <Glass interactive style={s.chip}>
                    <Text variant="label">{`${SURAHS[at.surah - 1].en} ${at.surah}:${at.ayah}`}</Text>
                  </Glass>
                </Pressable>
              );
            })}
          </View>
        </View>
      ) : null}
      <Glass style={s.seg}>
        {(["surah", "juz"] as const).map((k) => (
          <Pressable
            key={k}
            accessibilityRole="button"
            accessibilityState={{ selected: by === k }}
            onPress={() => setBy(k)}
            style={[s.segItem, by === k && s.segOn]}
          >
            <Text color={by === k ? "lapis" : "inkSoft"}>
              {k === "surah" ? "Surah" : "Juz"}
            </Text>
          </Pressable>
        ))}
      </Glass>
    </>
  );

  if (by === "juz") {
    return (
      <Screen tab>
        <Breath />
        <PageTip id="read" />
        <TopBar title="Read" subtitle="The Quran, surah by surah" />
        <FlatList
          data={juzRows}
          keyExtractor={(x) => String(x.juz)}
          ListHeaderComponent={header}
          ItemSeparatorComponent={() => <View style={s.gapRow} />}
          contentContainerStyle={{ paddingBottom: space(12) }}
          showsVerticalScrollIndicator={false}
          renderItem={({ item }) => (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={`Juz ${item.juz}`}
              onPress={() =>
                router.push(`/surah/${item.surah}?ayah=${item.ayah}`)
              }
            >
              <Glass interactive style={s.row}>
                <View style={s.num}>
                  <Text variant="label" color="inkSoft">
                    {String(item.juz)}
                  </Text>
                </View>
                <View style={s.names}>
                  <Text>{`Juz ${item.juz}`}</Text>
                  <Text
                    variant="label"
                    color="inkSoft"
                  >{`From ${SURAHS[item.surah - 1].en} ${item.surah}:${item.ayah}`}</Text>
                </View>
                <Text selectable={false} style={s.ar}>
                  {SURAHS[item.surah - 1].ar}
                </Text>
              </Glass>
            </Pressable>
          )}
        />
      </Screen>
    );
  }

  return (
    <Screen tab>
      <Breath />
      <PageTip id="read" />
      <TopBar title="Read" subtitle="The Quran, surah by surah" />
      <FlatList
        data={SURAHS}
        keyExtractor={(x) => String(x.n)}
        ListHeaderComponent={header}
        ItemSeparatorComponent={() => <View style={s.gapRow} />}
        contentContainerStyle={{ paddingBottom: space(12) }}
        showsVerticalScrollIndicator={false}
        initialNumToRender={16}
        renderItem={({ item }) => {
          const f = fractions[item.n - 1];
          return (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={`${item.en}, ${item.ayahs} ayahs`}
              onPress={() => router.push(`/surah/${item.n}`)}
            >
              <Glass interactive style={s.row}>
                <View style={s.num}>
                  <Text variant="label" color="inkSoft">
                    {String(item.n)}
                  </Text>
                </View>
                <View style={s.names}>
                  <Text>{item.en}</Text>
                  <Text
                    variant="label"
                    color="inkSoft"
                  >{`${item.meaning}, ${item.ayahs} ayahs`}</Text>
                </View>
                <View style={s.right}>
                  <Text selectable={false} style={s.ar}>
                    {item.ar}
                  </Text>
                  {f.m > 0 || f.u > 0 ? (
                    <View style={s.bars}>
                      <Bar fraction={f.m} color={theme.colors.saffron} />
                      <Bar fraction={f.u} color={theme.colors.verdigris} />
                    </View>
                  ) : null}
                </View>
              </Glass>
            </Pressable>
          );
        }}
      />
    </Screen>
  );
}
