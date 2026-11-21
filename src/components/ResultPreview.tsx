import { Modal, Pressable, ScrollView, StyleSheet, View } from "react-native";
import Animated, { Easing, FadeIn, ZoomIn } from "react-native-reanimated";

import { Button } from "@/components/Button";
import { Glass } from "@/components/Glass";
import { Text } from "@/components/Text";
import { SURAHS } from "@/quran/tanzil";
import { ayahForDisplay, refOf } from "@/quran/text";
import { space } from "@/theme/layout";
import { FONTS } from "@/theme/typography";
import { makeStyles } from "@/theme/useTheme";

/*
  Press and hold a search result: what it is, why it came up, and the other
  ayahs from this search in the same surah, with a way to read. The card grows
  in by scale and the dim fades on its own layer, so the glass is never under
  an animated opacity.
*/

export type Preview = {
  surah: number;
  /* Global ayah index when the held result was an ayah. */
  index?: number;
  /* The AI's note on the held result, or the search's caption for a topic. */
  why?: string | null;
  /* Other ayahs from this search in the same surah (global indexes). */
  related: number[];
};

const useStyles = makeStyles((t) => ({
  scrim: { backgroundColor: t.dark ? "rgba(8,10,16,0.55)" : "rgba(20,30,60,0.28)" },
  wrap: { flex: 1, justifyContent: "center", padding: space(2.5) },
  card: { borderRadius: 28, padding: space(2.5), gap: space(1.5), maxHeight: "86%" },
  ar: { fontFamily: FONTS.quran, fontSize: 34, lineHeight: 64, color: t.colors.lapis, textAlign: "center", writingDirection: "rtl" },
  ayah: { fontFamily: FONTS.quran, fontSize: 22, lineHeight: 44, color: t.colors.ink, textAlign: "right", writingDirection: "rtl" },
  box: { borderRadius: 16, backgroundColor: t.colors.surface, borderWidth: 1, borderColor: t.colors.rule, padding: space(1.5), gap: space(0.5) },
  rel: { paddingVertical: space(1), gap: 2, borderTopWidth: 1, borderTopColor: t.colors.rule },
}));

export function ResultPreview({
  preview,
  english,
  onOpen,
  onClose,
}: {
  preview: Preview | null;
  english: Record<string, string>;
  onOpen: (surah: number, ayah?: number) => void;
  onClose: () => void;
}) {
  const s = useStyles();
  if (!preview) return null;
  const x = SURAHS[preview.surah - 1];
  const held = preview.index !== undefined ? refOf(preview.index) : null;
  const heldKey = held ? `${held.surah}:${held.ayah}` : null;

  return (
    <Modal visible transparent animationType="none" onRequestClose={onClose}>
      <Animated.View entering={FadeIn.duration(220)} style={[StyleSheet.absoluteFill, s.scrim]}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} accessibilityLabel="Close" />
      </Animated.View>
      <View style={s.wrap} pointerEvents="box-none">
        <Animated.View entering={ZoomIn.duration(340).easing(Easing.out(Easing.cubic))}>
          <Glass style={s.card}>
            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ gap: space(1.5) }}>
              <View style={{ alignItems: "center", gap: 2 }}>
                <Text selectable={false} style={s.ar}>
                  {x.ar}
                </Text>
                <Text variant="pageTitle" style={{ textAlign: "center" }}>
                  {x.en}
                </Text>
                <Text variant="label" color="inkSoft" style={{ textAlign: "center" }}>
                  {`Surah ${x.n}, ${x.meaning}. ${x.place}, ${x.ayahs} ayahs`}
                </Text>
              </View>

              {preview.why ? (
                <View style={{ gap: 4 }}>
                  <Text variant="eyebrow" color="inkSoft">
                    Why it came up
                  </Text>
                  <Text color="lapis">{preview.why}</Text>
                </View>
              ) : null}

              {held && preview.index !== undefined ? (
                <View style={s.box}>
                  <Text selectable={false} style={s.ayah}>
                    {ayahForDisplay(preview.index)}
                  </Text>
                  {heldKey && english[heldKey] ? (
                    <Text color="inkSoft" style={{ fontSize: 15, lineHeight: 22 }}>
                      {english[heldKey]}
                    </Text>
                  ) : null}
                  <Text variant="label" color="inkFaint">{`${x.en} ${heldKey}`}</Text>
                </View>
              ) : null}

              {preview.related.length > 0 ? (
                <View>
                  <Text variant="eyebrow" color="inkSoft" style={{ paddingBottom: space(0.5) }}>
                    {held ? "Also from this surah" : "Ayahs from this search"}
                  </Text>
                  {preview.related.map((i) => {
                    const r = refOf(i);
                    const key = `${r.surah}:${r.ayah}`;
                    return (
                      <Pressable key={i} accessibilityRole="button" onPress={() => onOpen(r.surah, r.ayah)} style={s.rel}>
                        <Text selectable={false} numberOfLines={2} style={[s.ayah, { fontSize: 19, lineHeight: 38 }]}>
                          {ayahForDisplay(i)}
                        </Text>
                        <Text variant="label" color="lapis">{`Open ${key}`}</Text>
                      </Pressable>
                    );
                  })}
                </View>
              ) : null}
            </ScrollView>

            <View style={{ gap: space(1) }}>
              {held ? <Button label={`Open at ${heldKey}`} onPress={() => onOpen(held.surah, held.ayah)} /> : null}
              <Button label={held ? "Read the surah from the start" : "Read the surah"} variant={held ? "quiet" : "primary"} onPress={() => onOpen(x.n)} />
              <Button label="Close" variant="text" onPress={onClose} />
            </View>
          </Glass>
        </Animated.View>
      </View>
    </Modal>
  );
}
