import { useMemo, useState } from "react";
import { FlatList, Modal, Pressable, View } from "react-native";

import { Text } from "@/components/Text";
import { JUZ_STARTS, SURAHS } from "@/quran/tanzil";
import { refOf } from "@/quran/text";
import { usePrefs, type ReaderView } from "@/state/prefs";
import { FONTS } from "@/theme/typography";
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
  sizeRow: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: space(3), paddingTop: space(1) },
  sizeBtn: { width: 48, height: 48, borderRadius: 24, borderWidth: 1, borderColor: t.colors.rule, alignItems: "center", justifyContent: "center" },
}));

function Sheet({ visible, onClose, children }: { visible: boolean; onClose: () => void; children: React.ReactNode }) {
  const s = useStyles();
  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
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
}: {
  visible: boolean;
  onClose: () => void;
  current: { surah: number; juz: number };
  onGo: (surah: number, ayah: number) => void;
}) {
  const s = useStyles();
  const [tab, setTab] = useState<"surah" | "juz">("surah");
  const juzRows = useMemo(() => JUZ_STARTS.map((start, i) => ({ juz: i + 1, ...refOf(start) })), []);

  return (
    <Sheet visible={visible} onClose={onClose}>
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

export function ViewSheet({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  const s = useStyles();
  const theme = useTheme();
  const view = usePrefs((st) => st.readerView);
  const setView = usePrefs((st) => st.setReaderView);
  const size = usePrefs((st) => st.arabicSize);
  const setSize = usePrefs((st) => st.setArabicSize);

  return (
    <Sheet visible={visible} onClose={onClose}>
      <Text variant="pageTitle" style={s.title}>
        Reading view
      </Text>
      <View style={{ gap: space(1) }}>
        {VIEWS.map((v) => (
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

      <Text variant="eyebrow" color="inkSoft" style={{ textAlign: "center", paddingTop: space(3) }}>
        Arabic size
      </Text>
      <View style={s.sizeRow}>
        <Pressable accessibilityRole="button" accessibilityLabel="Smaller" onPress={() => setSize(size - 2)} style={s.sizeBtn}>
          <Text selectable={false} style={{ fontFamily: FONTS.quran, fontSize: 18, lineHeight: 34, color: theme.colors.ink }}>
            ع
          </Text>
        </Pressable>
        <Text variant="numeral" style={{ fontSize: 28, lineHeight: 34 }}>{`${size}`}</Text>
        <Pressable accessibilityRole="button" accessibilityLabel="Larger" onPress={() => setSize(size + 2)} style={s.sizeBtn}>
          <Text selectable={false} style={{ fontFamily: FONTS.quran, fontSize: 28, lineHeight: 48, color: theme.colors.ink }}>
            ع
          </Text>
        </Pressable>
      </View>
    </Sheet>
  );
}

export function juzOf(index: number): number {
  let j = 1;
  for (let i = 0; i < JUZ_STARTS.length; i++) if (JUZ_STARTS[i] <= index) j = i + 1;
  return j;
}
