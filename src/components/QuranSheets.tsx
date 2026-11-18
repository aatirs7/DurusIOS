import { useMemo, useState } from "react";
import { FlatList, Modal, Pressable, ScrollView, Switch, View } from "react-native";

import { Text } from "@/components/Text";
import { JUZ_STARTS, SURAHS } from "@/quran/tanzil";
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
  sizeRow: { flexDirection: "row", alignItems: "center", gap: space(3) },
  group: { gap: space(1) },
  choices: { flexDirection: "row", flexWrap: "wrap", gap: space(1) },
  choice: { borderRadius: RADIUS.pill, borderWidth: 1, borderColor: t.colors.rule, backgroundColor: t.colors.surface, paddingVertical: space(1), paddingHorizontal: space(1.75) },
  swatch: { borderRadius: RADIUS.field, borderWidth: 1, borderColor: t.colors.rule, paddingVertical: space(1.25), paddingHorizontal: space(2) },
  preview: { borderRadius: 20, borderWidth: 1, padding: space(2.5) },
  toggleRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingVertical: space(0.5) },
  sizeBtn: { width: 48, height: 48, borderRadius: 24, borderWidth: 1, borderColor: t.colors.rule, alignItems: "center", justifyContent: "center" },
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

function Choice<K extends string>({
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
    <View style={s.choices}>
      {options.map((o) => (
        <Pressable
          key={o.key}
          accessibilityRole="button"
          accessibilityState={{ selected: value === o.key }}
          onPress={() => onChange(o.key)}
          style={[s.choice, value === o.key && s.optionOn]}
        >
          <Text variant="label" color={value === o.key ? "lapis" : "inkSoft"}>
            {o.label}
          </Text>
        </Pressable>
      ))}
    </View>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  const s = useStyles();
  return (
    <View style={s.group}>
      <Text variant="eyebrow" color="inkSoft">
        {label}
      </Text>
      {children}
    </View>
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
  const type = useQuranType();
  const look = type.look;
  const colors = useReaderColors();

  return (
    <Sheet visible={visible} onClose={onClose}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: space(6), gap: space(2.5) }}>
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

        <Row label="Show">
          <View style={{ gap: space(1) }}>
            {VIEWS.map((base) => ({ ...base, available: base.available || quranApiConfigured() })).map((v) => (
              <Pressable
                key={v.key}
                accessibilityRole="radio"
                accessibilityState={{ selected: view === v.key, disabled: !v.available }}
                disabled={!v.available}
                onPress={() => setView(v.key)}
                style={[s.option, view === v.key && s.optionOn, !v.available && { borderStyle: "dashed" }]}
              >
                <View style={{ gap: 2, flex: 1 }}>
                  <Text color={v.available ? "ink" : "inkFaint"}>{v.label}</Text>
                  <Text variant="label" color={v.available ? "inkSoft" : "inkFaint"}>
                    {v.available ? v.line : `${v.line}. Comes with Quran.com.`}
                  </Text>
                </View>
                {view === v.key ? <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: theme.colors.lapis }} /> : null}
              </Pressable>
            ))}
          </View>
        </Row>

        <Row label="Script">
          <Choice
            options={(Object.keys(QURAN_FONTS) as (keyof typeof QURAN_FONTS)[]).map((k) => ({ key: k, label: QURAN_FONTS[k].label }))}
            value={look.font}
            onChange={(font) => setReader({ font })}
          />
        </Row>

        <Row label="Size">
          <View style={s.sizeRow}>
            <Pressable accessibilityRole="button" accessibilityLabel="Smaller" onPress={() => setSize(size - 2)} style={s.sizeBtn}>
              <Text>A</Text>
            </Pressable>
            <Text variant="numeral" style={{ fontSize: 26, lineHeight: 32 }}>{`${size}`}</Text>
            <Pressable accessibilityRole="button" accessibilityLabel="Larger" onPress={() => setSize(size + 2)} style={s.sizeBtn}>
              <Text style={{ fontSize: 22 }}>A</Text>
            </Pressable>
          </View>
        </Row>

        <Row label="Line spacing">
          <Choice
            options={[
              { key: "compact", label: "Compact" },
              { key: "normal", label: "Normal" },
              { key: "airy", label: "Airy" },
            ]}
            value={look.spacing}
            onChange={(spacing) => setReader({ spacing })}
          />
        </Row>

        <Row label="Page">
          <View style={s.choices}>
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
                  <Text variant="label" style={{ color: c.ink }}>
                    {k === "app" ? "Auto" : k[0].toUpperCase() + k.slice(1)}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </Row>

        <Row label="Layout">
          <Choice
            options={[
              { key: "ayah", label: "Ayah by ayah" },
              { key: "flow", label: "Flowing page" },
            ]}
            value={look.layout}
            onChange={(layout) => setReader({ layout })}
          />
        </Row>

        <Row label="Alignment">
          <Choice
            options={[
              { key: "right", label: "Right" },
              { key: "center", label: "Centre" },
            ]}
            value={look.align}
            onChange={(align) => setReader({ align })}
          />
        </Row>

        <View style={s.toggleRow}>
          <Text>Ayah numbers</Text>
          <Switch value={look.numbers} onValueChange={(numbers) => setReader({ numbers })} trackColor={{ true: theme.colors.lapis, false: theme.colors.rule }} />
        </View>
        <View style={s.toggleRow}>
          <Text>Show my marks</Text>
          <Switch value={look.marks} onValueChange={(marks) => setReader({ marks })} trackColor={{ true: theme.colors.lapis, false: theme.colors.rule }} />
        </View>
      </ScrollView>
    </Sheet>
  );
}

export function juzOf(index: number): number {
  let j = 1;
  for (let i = 0; i < JUZ_STARTS.length; i++) if (JUZ_STARTS[i] <= index) j = i + 1;
  return j;
}
