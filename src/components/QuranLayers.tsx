import { Pressable, View } from "react-native";

import { Text } from "@/components/Text";
import type { QfAyah } from "@/quran/qf";
import { FONTS } from "@/theme/typography";
import { space } from "@/theme/layout";

/*
  The layers Quran Foundation content adds to an ayah: a translation under it
  (with footnote marks you can tap), a transliteration under it, or a word by
  word grid that replaces the line with each word over its meaning or reading.

  Text is rendered as delivered: never machine translated, never edited. The
  word grid shows Quran Foundation's own word text, so each word sits exactly
  over its own meaning.
*/

type Colors = { ink: string; soft: string; rule: string; accent: string };

export function TranslationLine({ ayah, colors, onFootnote }: { ayah: QfAyah; colors: Colors; onFootnote: (id: number) => void }) {
  if (!ayah.translation) return null;
  return (
    <Text style={{ color: colors.ink, fontSize: 16, lineHeight: 25, paddingTop: space(1) }}>
      {ayah.translation.map((p, i) =>
        "text" in p ? (
          <Text key={i} style={{ color: colors.ink }}>
            {p.text}
          </Text>
        ) : (
          <Text
            key={i}
            accessibilityRole="button"
            accessibilityLabel={`Footnote ${p.mark}`}
            onPress={() => onFootnote(p.footnote)}
            style={{ color: colors.accent, fontSize: 11, lineHeight: 16, fontFamily: FONTS.uiMedium }}
          >
            {` ${p.mark} `}
          </Text>
        ),
      )}
    </Text>
  );
}

export function TransliterationLine({ ayah, colors }: { ayah: QfAyah; colors: Colors }) {
  const t = ayah.words.map((w) => w.translit).filter(Boolean).join(" ");
  if (!t) return null;
  return <Text style={{ color: colors.soft, fontSize: 15, lineHeight: 23, fontStyle: "italic", paddingTop: space(1) }}>{t}</Text>;
}

export function WordGrid({
  ayah,
  under,
  colors,
  quran,
}: {
  ayah: QfAyah;
  under: "meaning" | "translit";
  colors: Colors;
  quran: { fontFamily: string; fontSize: number; lineHeight: number };
}) {
  const size = Math.round(quran.fontSize * 0.92);
  return (
    <View style={{ flexDirection: "row-reverse", flexWrap: "wrap", gap: space(1.25), rowGap: space(1.5) }}>
      {ayah.words.map((w) => (
        <View key={w.position} style={{ alignItems: "center", maxWidth: 140 }}>
          <Text selectable={false} style={{ fontFamily: quran.fontFamily, fontSize: size, lineHeight: Math.round(size * 1.9), color: colors.ink }}>
            {w.text}
          </Text>
          <Text
            style={{
              color: colors.soft,
              fontSize: 12,
              lineHeight: 16,
              textAlign: "center",
              fontStyle: under === "translit" ? "italic" : "normal",
            }}
          >
            {(under === "meaning" ? w.meaning : w.translit) ?? ""}
          </Text>
        </View>
      ))}
    </View>
  );
}

export function FootnoteCard({ text, onClose, colors }: { text: string; onClose: () => void; colors: Colors & { page: string } }) {
  return (
    <View style={{ borderRadius: 20, borderWidth: 1, borderColor: colors.rule, backgroundColor: colors.page, padding: space(2.5), gap: space(1.5) }}>
      <Text variant="eyebrow" style={{ color: colors.soft }}>
        Footnote
      </Text>
      <Text style={{ color: colors.ink, lineHeight: 24 }}>{text}</Text>
      <Pressable accessibilityRole="button" onPress={onClose} style={{ alignSelf: "flex-start" }} hitSlop={8}>
        <Text variant="label" style={{ color: colors.accent }}>
          Close
        </Text>
      </Pressable>
    </View>
  );
}
