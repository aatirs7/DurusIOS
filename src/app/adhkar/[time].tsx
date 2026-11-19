import { useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { FlatList, Pressable, ScrollView, View, useWindowDimensions, type NativeScrollEvent, type NativeSyntheticEvent } from "react-native";
import Animated, { Easing, useAnimatedStyle, useReducedMotion, useSharedValue, withSequence, withTiming } from "react-native-reanimated";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import Svg, { Circle, Path } from "react-native-svg";

import { Breath } from "@/components/Breath";
import { Glass } from "@/components/Glass";
import { Text } from "@/components/Text";
import { ADHKAR_CREDIT, adhkarFor, pick, type Dhikr, type Time } from "@/barakah/adhkar";
import { surahForDisplay } from "@/quran/text";
import { SURAHS } from "@/quran/tanzil";
import { localToday, useBarakah } from "@/state/barakah";
import { FONTS } from "@/theme/typography";
import { MARGIN, RADIUS, space } from "@/theme/layout";
import { makeStyles, useTheme } from "@/theme/useTheme";

/*
  The morning or evening adhkar, one at a time: what to say (the Arabic, then
  how to say it), what it means, and where it comes from. A glass counter at
  the foot counts the repetitions and moves on by itself when one is done.

  Content sits on paper; only the controls are glass. Progress is kept for the
  day, so leaving halfway and coming back picks up where you were. Reaching
  the end marks the practice done in Barakah.
*/

const toArabicDigits = (n: number) => String(n).replace(/\d/g, (d) => "٠١٢٣٤٥٦٧٨٩"[Number(d)]);

/* The Quran passage of a dhikr, from the app's Tanzil text. */
function quranOf(d: Dhikr): { surah: number; basmala: string | null; text: string }[] {
  return (d.quran ?? []).map(([surah, from, to]) => {
    const { basmala, ayahs } = surahForDisplay(surah);
    const text = ayahs
      .slice(from - 1, to)
      .map((a, k) => `${a} ﴿${toArabicDigits(from + k)}﴾`)
      .join(" ");
    return { surah, basmala: from === 1 ? basmala : null, text };
  });
}

const useStyles = makeStyles((t) => ({
  safe: { flex: 1, backgroundColor: t.colors.paper },
  top: { flexDirection: "row", alignItems: "center", paddingHorizontal: MARGIN, paddingTop: space(1), gap: space(1.5) },
  iconBtn: { width: 40, height: 40, borderRadius: 20, alignItems: "center", justifyContent: "center", overflow: "hidden" },
  track: { flexDirection: "row", gap: 3, paddingHorizontal: MARGIN, paddingTop: space(1.5) },
  seg: { flex: 1, height: 3, borderRadius: 2 },
  page: { paddingHorizontal: MARGIN, paddingTop: space(2.5), gap: space(2) },
  panel: { backgroundColor: t.colors.surface, borderRadius: 24, borderWidth: 1, borderColor: t.colors.rule, paddingVertical: space(3), paddingHorizontal: space(2.5), gap: space(1.5) },
  arabic: { fontFamily: FONTS.arabicRegular, fontSize: 25, lineHeight: 50, color: t.colors.ink, textAlign: "center", writingDirection: "rtl" },
  quran: { fontFamily: FONTS.quran, fontSize: 25, lineHeight: 54, color: t.colors.ink, textAlign: "center", writingDirection: "rtl" },
  section: { gap: space(0.75) },
  foot: { position: "absolute", left: 0, right: 0, alignItems: "center", justifyContent: "center", flexDirection: "row", gap: space(3) },
  side: { width: 52, height: 52, borderRadius: 26, alignItems: "center", justifyContent: "center", overflow: "hidden" },
  counter: { width: 104, height: 104, borderRadius: 52, alignItems: "center", justifyContent: "center", overflow: "hidden" },
  done: { flex: 1, alignItems: "center", justifyContent: "center", paddingHorizontal: MARGIN, gap: space(2) },
  primary: { borderRadius: RADIUS.pill, paddingVertical: space(1.75), paddingHorizontal: space(4), overflow: "hidden" },
}));

function Icon({ d, color, size = 20 }: { d: string; color: string; size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Path d={d} stroke={color} strokeWidth={1.9} strokeLinecap="round" strokeLinejoin="round" fill="none" />
    </Svg>
  );
}

function Ring({ value, of, size }: { value: number; of: number; size: number }) {
  const theme = useTheme();
  const stroke = 4;
  const r = size / 2 - stroke;
  const c = 2 * Math.PI * r;
  const f = Math.min(1, value / Math.max(1, of));
  return (
    <Svg width={size} height={size} style={{ position: "absolute" }}>
      <Circle cx={size / 2} cy={size / 2} r={r} stroke={theme.colors.rule} strokeWidth={stroke} fill="none" />
      <Circle
        cx={size / 2}
        cy={size / 2}
        r={r}
        stroke={f >= 1 ? theme.colors.verdigris : theme.colors.lapis}
        strokeWidth={stroke}
        fill="none"
        strokeLinecap="round"
        strokeDasharray={`${c * f} ${c}`}
        transform={`rotate(-90 ${size / 2} ${size / 2})`}
      />
    </Svg>
  );
}

function DhikrPage({ d, time, width, bottom }: { d: Dhikr; time: Time; width: number; bottom: number }) {
  const s = useStyles();
  const quran = useMemo(() => quranOf(d), [d]);
  const arabic = d.arabic ? pick(d.arabic, time) : null;
  return (
    <ScrollView style={{ width }} contentContainerStyle={[s.page, { paddingBottom: bottom }]} showsVerticalScrollIndicator={false}>
      <View style={{ alignItems: "center", gap: space(0.5) }}>
        <Text variant="eyebrow" color="inkSoft">
          {d.repeat === 1 ? "Say once" : `Say ${d.repeat} times`}
        </Text>
        <Text variant="pageTitle" style={{ textAlign: "center", fontSize: 21, lineHeight: 27 }}>
          {d.title}
        </Text>
      </View>

      <View style={s.panel}>
        {d.lead ? (
          <Text selectable={false} style={[s.arabic, { fontSize: 19, lineHeight: 38 }]}>
            {d.lead.arabic}
          </Text>
        ) : null}
        {quran.map((q) => (
          <View key={q.surah} style={{ gap: space(0.5) }}>
            {quran.length > 1 ? (
              <Text variant="label" color="inkFaint" style={{ textAlign: "center" }}>
                {`${SURAHS[q.surah - 1].en}, surah ${q.surah}`}
              </Text>
            ) : null}
            {q.basmala ? (
              <Text selectable={false} style={[s.quran, { fontSize: 20, lineHeight: 42 }]}>
                {q.basmala}
              </Text>
            ) : null}
            <Text selectable={false} style={s.quran}>
              {q.text}
            </Text>
          </View>
        ))}
        {arabic ? (
          <Text selectable={false} style={s.arabic}>
            {arabic}
          </Text>
        ) : null}
      </View>

      <View style={s.section}>
        <Text variant="eyebrow" color="inkSoft">
          How to say it
        </Text>
        {d.lead ? (
          <Text color="inkSoft" style={{ fontStyle: "italic" }}>
            {d.lead.translit}
          </Text>
        ) : null}
        <Text color="inkSoft" style={{ fontStyle: "italic", lineHeight: 24 }}>
          {pick(d.translit, time)}
        </Text>
      </View>

      <View style={s.section}>
        <Text variant="eyebrow" color="inkSoft">
          What it means
        </Text>
        <Text style={{ lineHeight: 24 }}>{pick(d.meaning, time)}</Text>
      </View>

      <View style={s.section}>
        <Text variant="eyebrow" color="inkSoft">
          Why it is said
        </Text>
        <Text color="inkSoft" style={{ lineHeight: 23 }}>
          {d.about}
        </Text>
        <Text variant="label" color="lapis">
          {d.quran ? `Quran ${d.quran.map(([a, b, c]) => (b === c ? `${a}:${b}` : `${a}:${b}-${c}`)).join(", ")} · ${d.source}` : d.source}
        </Text>
      </View>
    </ScrollView>
  );
}

export default function AdhkarWalk() {
  const s = useStyles();
  const theme = useTheme();
  const router = useRouter();
  const still = useReducedMotion();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const { time: raw } = useLocalSearchParams<{ time: string }>();
  const time: Time = raw === "evening" ? "evening" : "morning";
  const list = useMemo(() => adhkarFor(time), [time]);

  const log = useBarakah((st) => st.log);
  const saved = useBarakah((st) => st.adhkarRun);
  const setRun = useBarakah((st) => st.setAdhkarRun);
  const today = localToday();
  const key = `${today}:${time}`;
  const resume = saved?.key === key ? saved : null;

  const [i, setI] = useState(resume?.i ?? 0);
  const [counts, setCounts] = useState<Record<string, number>>(resume?.counts ?? {});
  const finished = i >= list.length;
  const pager = useRef<FlatList<Dhikr>>(null);

  useEffect(() => {
    setRun({ key, i, counts });
  }, [key, i, counts, setRun]);

  /* Reaching the end marks the practice for today. */
  useEffect(() => {
    if (finished) log(today, time === "morning" ? "morningAdhkar" : "eveningAdhkar", 1);
  }, [finished, log, today, time]);

  const goTo = (n: number) => {
    const next = Math.max(0, Math.min(list.length, n));
    setI(next);
    if (next < list.length) pager.current?.scrollToIndex({ index: next, animated: !still });
  };

  const pulse = useSharedValue(1);
  const pulseStyle = useAnimatedStyle(() => ({ transform: [{ scale: pulse.value }] }));

  const d = list[Math.min(i, list.length - 1)];
  const count = counts[d.id] ?? 0;
  const tap = () => {
    if (finished) return;
    const next = Math.min(d.repeat, count + 1);
    setCounts((c) => ({ ...c, [d.id]: next }));
    if (!still) pulse.value = withSequence(withTiming(0.92, { duration: 70 }), withTiming(1, { duration: 160, easing: Easing.out(Easing.cubic) }));
    if (next >= d.repeat) setTimeout(() => goTo(i + 1), still ? 0 : 420);
  };

  const onSwipe = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const n = Math.round(e.nativeEvent.contentOffset.x / Math.max(1, width));
    if (n !== i) setI(n);
  };

  const footH = 104 + space(2) + insets.bottom;
  const title = time === "morning" ? "Morning adhkar" : "Evening adhkar";

  return (
    <SafeAreaView style={s.safe} edges={["top"]}>
      <Breath />
      <View style={s.top}>
        <Pressable accessibilityRole="button" accessibilityLabel="Close" onPress={() => router.back()}>
          <Glass interactive style={s.iconBtn}>
            <Icon d="M6 6l12 12M18 6L6 18" color={theme.colors.ink} size={18} />
          </Glass>
        </Pressable>
        <View style={{ flex: 1, alignItems: "center" }}>
          <Text>{title}</Text>
          <Text variant="label" color="inkSoft">
            {finished ? "Complete" : `${i + 1} of ${list.length}`}
          </Text>
        </View>
        <View style={{ width: 40 }} />
      </View>
      <View style={s.track}>
        {list.map((x, k) => (
          <View
            key={x.id}
            style={[s.seg, { backgroundColor: (counts[x.id] ?? 0) >= x.repeat ? theme.colors.verdigris : k === i ? theme.colors.lapis : theme.colors.rule }]}
          />
        ))}
      </View>

      {finished ? (
        <View style={s.done}>
          <Svg width={64} height={64} viewBox="0 0 24 24">
            <Circle cx={12} cy={12} r={11} fill={theme.colors.verdigris} />
            <Path d="M7 12.5l3.2 3.2L17 9" stroke={theme.colors.paper} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" fill="none" />
          </Svg>
          <Text variant="pageTitle" style={{ textAlign: "center" }}>
            {`${title} complete`}
          </Text>
          <Text color="inkSoft" style={{ textAlign: "center" }}>
            Marked for today in Barakah.
          </Text>
          <Pressable accessibilityRole="button" onPress={() => router.back()} style={{ marginTop: space(1) }}>
            <Glass interactive primary style={s.primary}>
              <Text color="paper">Back to Barakah</Text>
            </Glass>
          </Pressable>
          <Pressable accessibilityRole="button" onPress={() => goTo(list.length - 1)} hitSlop={10}>
            <Text variant="label" color="inkSoft">
              Go back through them
            </Text>
          </Pressable>
          <Text variant="label" color="inkFaint" style={{ textAlign: "center", paddingTop: space(3) }}>
            {ADHKAR_CREDIT}
          </Text>
        </View>
      ) : (
        <>
          <FlatList
            ref={pager}
            data={list}
            horizontal
            pagingEnabled
            initialScrollIndex={Math.min(i, list.length - 1)}
            getItemLayout={(_, k) => ({ length: width, offset: width * k, index: k })}
            keyExtractor={(x) => x.id}
            showsHorizontalScrollIndicator={false}
            onMomentumScrollEnd={onSwipe}
            renderItem={({ item }) => <DhikrPage d={item} time={time} width={width} bottom={footH + space(2)} />}
          />
          <View style={[s.foot, { bottom: insets.bottom + space(1.5) }]}>
            <Pressable accessibilityRole="button" accessibilityLabel="Previous" disabled={i === 0} onPress={() => goTo(i - 1)} style={{ opacity: i === 0 ? 0.35 : 1 }}>
              <Glass interactive style={s.side}>
                <Icon d="M15 6l-6 6 6 6" color={theme.colors.ink} />
              </Glass>
            </Pressable>
            <Pressable accessibilityRole="button" accessibilityLabel={`Count, ${count} of ${d.repeat}`} onPress={tap}>
              <Animated.View style={pulseStyle}>
                <Glass interactive style={s.counter}>
                  <Ring value={count} of={d.repeat} size={104} />
                  <Text variant="numeral" style={{ fontSize: 28, lineHeight: 32 }}>
                    {d.repeat === 1 ? (count >= 1 ? "✓" : "1") : String(count)}
                  </Text>
                  <Text variant="label" color="inkSoft">
                    {d.repeat === 1 ? (count >= 1 ? "said" : "tap when said") : `of ${d.repeat}`}
                  </Text>
                </Glass>
              </Animated.View>
            </Pressable>
            <Pressable accessibilityRole="button" accessibilityLabel="Skip" onPress={() => goTo(i + 1)}>
              <Glass interactive style={s.side}>
                <Icon d="M9 6l6 6-6 6" color={theme.colors.ink} />
              </Glass>
            </Pressable>
          </View>
        </>
      )}
    </SafeAreaView>
  );
}
