import { useMemo, useState } from "react";
import { FlatList, Modal, Pressable, ScrollView, Switch, View } from "react-native";

import Svg, { Path } from "react-native-svg";

import { BlockRow, Group } from "@/components/Group";
import { Text } from "@/components/Text";
import { JUZ_STARTS, SURAHS } from "@/quran/tanzil";
import { TRANSLATIONS } from "@/quran/qf";
import { quranApiConfigured } from "@/quran/remote";
import { quranText, refOf } from "@/quran/text";
import { DEFAULT_LOOK, usePrefs, type ReaderView } from "@/state/prefs";
import { READER_TONES } from "@/theme/tokens";
import { FONTS, QURAN_FONTS } from "@/theme/typography";
import { MARGIN, RADIUS, space } from "@/theme/layout";
import { makeStyles, useTheme } from "@/theme/useTheme";

/*
  The reader's two sheets: where to go (surah or juz) and how to read (view
  and size).

  Both are native page sheets (Modal, pageSheet), which iOS 26 draws on Liquid
  Glass by itself. The content inside stays on paper, by the rule that glass is
  for chrome and never for text.
*/

const useStyles = makeStyles((t) => ({
  sheet: { flex: 1, backgroundColor: t.colors.paper, paddingHorizontal: MARGIN, paddingTop: space(1.5) },
  grabber: { alignSelf: "center", width: 40, height: 5, borderRadius: 3, backgroundColor: t.colors.rule, marginBottom: space(2) },
  title: { textAlign: "center", paddingBottom: space(2) },
  seg: { flexDirection: "row", alignSelf: "center", borderRadius: RADIUS.pill, borderWidth: 1, borderColor: t.colors.rule, padding: 3, marginBottom: space(2) },
  segItem: { paddingVertical: 7, paddingHorizontal: space(3), borderRadius: RADIUS.pill },
  segOn: { backgroundColor: t.colors.lapisWash },
  row: { flexDirection: "row", alignItems: "center", paddingVertical: space(1.25), gap: space(1.5) },
  here: { backgroundColor: t.colors.lapisWash, borderRadius: RADIUS.field, paddingHorizontal: space(1) },
  ar: { fontFamily: FONTS.quran, fontSize: 20, lineHeight: 38, color: t.colors.ink, writingDirection: "rtl" },
  rule: { height: 1, backgroundColor: t.colors.rule },
  option: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderRadius: RADIUS.field,
    borderWidth: 1,
    borderColor: t.colors.rule,
    backgroundColor: t.colors.surface,
    paddingVertical: space(1.5),
    paddingHorizontal: space(2),
  },
  optionOn: { borderColor: t.colors.lapis, backgroundColor: t.colors.lapisWash },
  sizeRow: { flexDirection: "row", alignItems: "center", gap: space(1.5) },
  fullSeg: { flexDirection: "row", borderRadius: RADIUS.pill, backgroundColor: t.colors.paper, borderWidth: 1, borderColor: t.colors.rule, padding: 3 },
  fullSegItem: { flex: 1, alignItems: "center", paddingVertical: 8, borderRadius: RADIUS.pill },
  pick: { flexDirection: "row", alignItems: "center", paddingVertical: space(1.5), gap: space(2) },
  fontTile: { alignItems: "center", borderRadius: 14, borderWidth: 1, borderColor: t.colors.rule, backgroundColor: t.colors.paper, paddingHorizontal: space(1.5), paddingBottom: space(0.75), minWidth: 84 },
  swatch: { flex: 1, alignItems: "center", borderRadius: 14, borderWidth: 1, borderColor: t.colors.rule, paddingBottom: space(0.75) },
  preview: { borderRadius: 20, borderWidth: 1, padding: space(2.5) },
  toggleRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingVertical: space(1.25) },
  sizeBtn: { width: 38, height: 38, borderRadius: 19, borderWidth: 1, borderColor: t.colors.rule, backgroundColor: t.colors.paper, alignItems: "center", justifyContent: "center" },
}));

function Sheet({
  visible,
  onClose,
  onDismiss,
  children,
}: {
  visible: boolean;
  onClose: () => void;
  /* Fires once the sheet has fully gone. Navigation waits for it: replacing
     the screen while its sheet is still closing can leave iOS unresponsive. */
  onDismiss?: () => void;
  children: React.ReactNode;
}) {
  const s = useStyles();
  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose} onDismiss={onDismiss}>
      <View style={s.sheet}>
        <View style={s.grabber} />
        {children}
      </View>
    </Modal>
  );
}

/* Jump to a surah or a juz. */
export function NavigateSheet({
  visible,
  onClose,
  current,
  onGo,
  onDismiss,
}: {
  visible: boolean;
  onClose: () => void;
  current: { surah: number; juz: number };
  onGo: (surah: number, ayah: number) => void;
  onDismiss?: () => void;
}) {
  const s = useStyles();
  const [tab, setTab] = useState<"surah" | "juz">("surah");
  const juzRows = useMemo(() => JUZ_STARTS.map((start, i) => ({ juz: i + 1, ...refOf(start) })), []);

  return (
    <Sheet visible={visible} onClose={onClose} onDismiss={onDismiss}>
      <View style={s.seg}>
        {(["surah", "juz"] as const).map((k) => (
          <Pressable key={k} accessibilityRole="button" accessibilityState={{ selected: tab === k }} onPress={() => setTab(k)} style={[s.segItem, tab === k && s.segOn]}>
            <Text color={tab === k ? "lapis" : "inkSoft"}>{k === "surah" ? "Surah" : "Juz"}</Text>
          </Pressable>
        ))}
      </View>
      {tab === "surah" ? (
        <FlatList
          data={SURAHS}
          keyExtractor={(x) => String(x.n)}
          initialScrollIndex={Math.max(0, current.surah - 3)}
          getItemLayout={(_, i) => ({ length: 63, offset: 63 * i, index: i })}
          ItemSeparatorComponent={() => <View style={s.rule} />}
          renderItem={({ item }) => (
            <Pressable
              accessibilityRole="button"
              onPress={() => onGo(item.n, 1)}
              style={[s.row, { height: 62 }, item.n === current.surah && s.here]}
            >
              <Text variant="label" color="inkFaint" style={{ width: 28, textAlign: "center" }}>
                {String(item.n)}
              </Text>
              <View style={{ flex: 1 }}>
                <Text>{item.en}</Text>
                <Text variant="label" color="inkSoft">{`${item.ayahs} ayahs`}</Text>
              </View>
              <Text selectable={false} style={s.ar}>
                {item.ar}
              </Text>
            </Pressable>
          )}
        />
      ) : (
        <FlatList
          data={juzRows}
          keyExtractor={(x) => String(x.juz)}
          initialScrollIndex={Math.max(0, current.juz - 3)}
          getItemLayout={(_, i) => ({ length: 63, offset: 63 * i, index: i })}
          ItemSeparatorComponent={() => <View style={s.rule} />}
          renderItem={({ item }) => (
            <Pressable
              accessibilityRole="button"
              onPress={() => onGo(item.surah, item.ayah)}
              style={[s.row, { height: 62 }, item.juz === current.juz && s.here]}
            >
              <Text variant="label" color="inkFaint" style={{ width: 28, textAlign: "center" }}>
                {String(item.juz)}
              </Text>
              <View style={{ flex: 1 }}>
                <Text>{`Juz ${item.juz}`}</Text>
                <Text variant="label" color="inkSoft">{`Starts at ${SURAHS[item.surah - 1].en} ${item.surah}:${item.ayah}`}</Text>
              </View>
              <Text selectable={false} style={s.ar}>
                {SURAHS[item.surah - 1].ar}
              </Text>
            </Pressable>
          )}
        />
      )}
    </Sheet>
  );
}

/*
  How to read. Arabic works now. The four layers below it come from Quran
  Foundation (translation, word by word, transliteration), so until that
  connection exists they are listed, honestly marked, and not selectable.
  Nothing here is machine transliterated: the app's transliterator was built
  for vocabulary cards and does not know Quranic recitation rules.
*/
export const VIEWS: { key: ReaderView; label: string; line: string; available: boolean }[] = [
  { key: "arabic", label: "Arabic", line: "The Uthmani text on its own", available: true },
  { key: "translation", label: "Translation", line: "English under each ayah", available: false },
  { key: "wordTranslation", label: "Word by word", line: "Meaning under each word", available: false },
  { key: "transliteration", label: "Transliteration", line: "Reading under each ayah", available: false },
  { key: "wordTransliteration", label: "Transliteration by word", line: "Reading under each word", available: false },
];

/* The colours the reader paints with, from the chosen tone. "app" follows the app's theme. */
export function useReaderColors(): { page: string; ink: string; soft: string; rule: string; accent: string; dark: boolean } {
  const theme = useTheme();
  const tone = usePrefs((st) => st.reader?.tone ?? "app");
  if (tone === "app") {
    return { page: theme.colors.paper, ink: theme.colors.ink, soft: theme.colors.inkSoft, rule: theme.colors.rule, accent: theme.colors.lapis, dark: theme.dark };
  }
  return READER_TONES[tone];
}

const SPACING = { compact: 1.75, normal: 2.15, airy: 2.6 } as const;

/* Font family, size and line height for Quran text, from the reader settings. */
export function useQuranType(base?: number) {
  /* Select the stored object and merge outside the selector: a selector that
     builds a new object every call makes zustand re-render forever. */
  const stored = usePrefs((st) => st.reader);
  const look = { ...DEFAULT_LOOK, ...stored };
  const size = usePrefs((st) => st.arabicSize);
  const f = QURAN_FONTS[look.font] ?? QURAN_FONTS.amiriQuran;
  const px = Math.round((base ?? size) * f.scale);
  return { fontFamily: f.family, fontSize: px, lineHeight: Math.round(px * SPACING[look.spacing]), look };
}

/* Equal segments across the full width: the cleanest way to pick one of a few. */
function Seg<K extends string>({
  options,
  value,
  onChange,
}: {
  options: { key: K; label: string }[];
  value: K;
  onChange: (k: K) => void;
}) {
  const s = useStyles();
  return (
    <View style={s.fullSeg}>
      {options.map((o) => (
        <Pressable
          key={o.key}
          accessibilityRole="button"
          accessibilityState={{ selected: value === o.key }}
          onPress={() => onChange(o.key)}
          style={[s.fullSegItem, value === o.key && s.segOn]}
        >
          <Text variant="label" color={value === o.key ? "lapis" : "inkSoft"} numberOfLines={1}>
            {o.label}
          </Text>
        </Pressable>
      ))}
    </View>
  );
}

/* A radio row inside a group: label, optional line, a check when chosen. */
function Pick({ label, line, on, disabled, onPress }: { label: string; line?: string; on: boolean; disabled?: boolean; onPress: () => void }) {
  const s = useStyles();
  const theme = useTheme();
  return (
    <Pressable
      accessibilityRole="radio"
      accessibilityState={{ selected: on, disabled }}
      disabled={disabled}
      onPress={onPress}
      style={s.pick}
    >
      <View style={{ flex: 1, gap: 2 }}>
        <Text color={disabled ? "inkFaint" : "ink"}>{label}</Text>
        {line ? (
          <Text variant="label" color={disabled ? "inkFaint" : "inkSoft"}>
            {line}
          </Text>
        ) : null}
      </View>
      {on ? (
        <Svg width={18} height={18} viewBox="0 0 24 24">
          <Path d="M5 12.5l4.5 4.5L19 7.5" stroke={theme.colors.lapis} strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round" fill="none" />
        </Svg>
      ) : null}
    </Pressable>
  );
}

export function ViewSheet({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  const s = useStyles();
  const theme = useTheme();
  const view = usePrefs((st) => st.readerView);
  const setView = usePrefs((st) => st.setReaderView);
  const size = usePrefs((st) => st.arabicSize);
  const setSize = usePrefs((st) => st.setArabicSize);
  const setReader = usePrefs((st) => st.setReader);
  const translationId = usePrefs((st) => st.translationId) ?? 20;
  const setTranslationId = usePrefs((st) => st.setTranslationId);
  const type = useQuranType();
  const look = type.look;
  const colors = useReaderColors();
  const sw = { true: theme.colors.lapis, false: theme.colors.rule };

  return (
    <Sheet visible={visible} onClose={onClose}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: space(6), gap: space(3) }}>
        <Text variant="pageTitle" style={s.title}>
          Reading view
        </Text>

        {/* A live sample: Al-Fatiha 1:2, verbatim, in the chosen look. */}
        <View style={[s.preview, { backgroundColor: colors.page, borderColor: colors.rule }]}>
          <Text
            selectable={false}
            style={{
              fontFamily: type.fontFamily,
              fontSize: type.fontSize,
              lineHeight: type.lineHeight,
              color: colors.ink,
              textAlign: look.align,
              writingDirection: "rtl",
            }}
          >
            {`${quranText()[1]}${look.numbers ? " ﴿٢﴾" : ""}`}
          </Text>
        </View>

        <Group title="Show">
          {VIEWS.map((base) => ({ ...base, available: base.available || quranApiConfigured() })).map((v) => (
            <Pick
              key={v.key}
              label={v.label}
              line={v.available ? v.line : `${v.line}. Comes with Quran.com.`}
              on={view === v.key}
              disabled={!v.available}
              onPress={() => setView(v.key)}
            />
          ))}
        </Group>

        <Group title="Text">
          <BlockRow label="Script">
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: space(1) }}>
              {(Object.keys(QURAN_FONTS) as (keyof typeof QURAN_FONTS)[]).map((k) => (
                <Pressable
                  key={k}
                  accessibilityRole="button"
                  accessibilityState={{ selected: look.font === k }}
                  onPress={() => setReader({ font: k })}
                  style={[s.fontTile, look.font === k && s.optionOn]}
                >
                  <Text selectable={false} style={{ fontFamily: QURAN_FONTS[k].family, fontSize: 24, lineHeight: 44, color: theme.colors.ink }}>
                    بِسْمِ
                  </Text>
                  <Text variant="label" color={look.font === k ? "lapis" : "inkSoft"}>
                    {QURAN_FONTS[k].label}
                  </Text>
                </Pressable>
              ))}
            </ScrollView>
          </BlockRow>
          <View style={s.toggleRow}>
            <Text>Size</Text>
            <View style={s.sizeRow}>
              <Pressable accessibilityRole="button" accessibilityLabel="Smaller" onPress={() => setSize(size - 2)} style={s.sizeBtn}>
                <Text style={{ fontSize: 14 }}>A</Text>
              </Pressable>
              <Text variant="numeral" style={{ fontSize: 20, lineHeight: 26, minWidth: 32, textAlign: "center" }}>{`${size}`}</Text>
              <Pressable accessibilityRole="button" accessibilityLabel="Larger" onPress={() => setSize(size + 2)} style={s.sizeBtn}>
                <Text style={{ fontSize: 20 }}>A</Text>
              </Pressable>
            </View>
          </View>
          <BlockRow label="Line spacing">
            <Seg
              options={[
                { key: "compact", label: "Compact" },
                { key: "normal", label: "Normal" },
                { key: "airy", label: "Airy" },
              ]}
              value={look.spacing}
              onChange={(spacing) => setReader({ spacing })}
            />
          </BlockRow>
        </Group>

        <Group title="Page">
          <BlockRow>
            <View style={{ flexDirection: "row", gap: space(1) }}>
              {(["app", "paper", "sepia", "night"] as const).map((k) => {
                const c = k === "app" ? { page: theme.colors.paper, ink: theme.colors.ink } : READER_TONES[k];
                return (
                  <Pressable
                    key={k}
                    accessibilityRole="button"
                    accessibilityLabel={k === "app" ? "Match the app" : k}
                    accessibilityState={{ selected: look.tone === k }}
                    onPress={() => setReader({ tone: k })}
                    style={[s.swatch, { backgroundColor: c.page }, look.tone === k && { borderColor: theme.colors.lapis, borderWidth: 2 }]}
                  >
                    <Text selectable={false} style={{ fontFamily: type.fontFamily, fontSize: 20, lineHeight: 36, color: c.ink }}>
                      ب
                    </Text>
                    <Text variant="label" style={{ color: c.ink }}>
                      {k === "app" ? "Auto" : k[0].toUpperCase() + k.slice(1)}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </BlockRow>
          <BlockRow label="Layout">
            <Seg
              options={[
                { key: "ayah", label: "Ayah by ayah" },
                { key: "flow", label: "Flowing page" },
              ]}
              value={look.layout}
              onChange={(layout) => setReader({ layout })}
            />
          </BlockRow>
          <BlockRow label="Alignment">
            <Seg
              options={[
                { key: "right", label: "Right" },
                { key: "center", label: "Centre" },
              ]}
              value={look.align}
              onChange={(align) => setReader({ align })}
            />
          </BlockRow>
          <View style={s.toggleRow}>
            <Text>Ayah numbers</Text>
            <Switch value={look.numbers} onValueChange={(numbers) => setReader({ numbers })} trackColor={sw} />
          </View>
          <View style={s.toggleRow}>
            <Text>Show my marks</Text>
            <Switch value={look.marks} onValueChange={(marks) => setReader({ marks })} trackColor={sw} />
          </View>
        </Group>

        {quranApiConfigured() ? (
          <Group title="Translation">
            {TRANSLATIONS.map((t) => (
              <Pick key={t.id} label={t.name} on={translationId === t.id} onPress={() => setTranslationId(t.id)} />
            ))}
          </Group>
        ) : null}
      </ScrollView>
    </Sheet>
  );
}

export function juzOf(index: number): number {
  let j = 1;
  for (let i = 0; i < JUZ_STARTS.length; i++) if (JUZ_STARTS[i] <= index) j = i + 1;
  return j;
}
