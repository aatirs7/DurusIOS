import { useMemo, useState } from "react";
import { FlatList, Modal, Pressable, View } from "react-native";

import { Glass, GlassButton } from "@/components/Glass";
import { Text } from "@/components/Text";
import { WORDS_ATTRIBUTION, canShowGloss, lemmaForCard, type WordsLemma } from "@/data/wordsContent";
import { WORDS_MAP_ATTRIBUTION, surahCards } from "@/data/wordsMap";
import { SURAHS } from "@/quran/tanzil";
import { FONTS } from "@/theme/typography";
import { MARGIN, RADIUS, space } from "@/theme/layout";
import { makeStyles } from "@/theme/useTheme";

/*
  "Learn from a surah" (spec 9): pick a surah, see the track's words in it you
  do not know yet, most frequent in the Quran first, and learn them a few at a
  time.

  A native page sheet like the reader's, which iOS draws on Liquid Glass by
  itself; the content stays on paper, glass only for the controls. Every word
  and meaning shown is the track's verbatim Quran Foundation word-by-word
  content, with its attribution.
*/

const ROW = 63;

const useStyles = makeStyles((t) => ({
  sheet: { flex: 1, backgroundColor: t.colors.paper, paddingHorizontal: MARGIN, paddingTop: space(1.5) },
  grabber: { alignSelf: "center", width: 40, height: 5, borderRadius: 3, backgroundColor: t.colors.rule, marginBottom: space(2) },
  center: { textAlign: "center" },
  head: { alignItems: "center", gap: space(0.5), paddingBottom: space(2) },
  row: { flexDirection: "row", alignItems: "center", height: ROW - 1, gap: space(1.5) },
  rule: { height: 1, backgroundColor: t.colors.rule },
  ar: { fontFamily: FONTS.quran, fontSize: 20, lineHeight: 38, color: t.colors.ink, writingDirection: "rtl" },
  word: { alignItems: "center", paddingVertical: space(1), gap: 2 },
  face: { fontFamily: FONTS.quran, fontSize: 26, lineHeight: 48, color: t.colors.ink, writingDirection: "rtl", textAlign: "center" },
  back: {
    alignSelf: "center",
    borderRadius: RADIUS.pill,
    paddingVertical: space(0.875),
    paddingHorizontal: space(1.5),
    overflow: "hidden",
  },
  foot: { gap: space(1), paddingTop: space(1.5), paddingBottom: space(4) },
}));

/* The track's words in a surah that are not known yet, most frequent first. */
export function unknownInSurah(surah: number, knownIds: ReadonlySet<number>): WordsLemma[] {
  return surahCards(surah)
    .filter((id) => !knownIds.has(id))
    .map((id) => lemmaForCard(id))
    .filter((l): l is WordsLemma => !!l && canShowGloss(l.gloss));
}

export function SurahWordsSheet({
  visible,
  onClose,
  onDismiss,
  knownIds,
  introducedIds,
  perSession,
  onStart,
}: {
  visible: boolean;
  onClose: () => void;
  /* Fires once the sheet has fully gone; navigation waits for it. */
  onDismiss?: () => void;
  knownIds: ReadonlySet<number>;
  /* Cards already met: those come back in reviews, so a session from a
     surah teaches only the rest. */
  introducedIds: ReadonlySet<number>;
  perSession: number;
  onStart: (surah: number) => void;
}) {
  const s = useStyles();
  const [surah, setSurah] = useState<number | null>(null);
  const counts = useMemo(
    () => (visible ? SURAHS.map((m) => unknownInSurah(m.n, knownIds).length) : []),
    [visible, knownIds],
  );
  const words = useMemo(() => (surah === null ? [] : unknownInSurah(surah, knownIds)), [surah, knownIds]);
  const fresh = words.filter((l) => !introducedIds.has(l.cardId)).length;
  const meta = surah === null ? null : SURAHS[surah - 1];

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
      onDismiss={() => {
        setSurah(null);
        onDismiss?.();
      }}
    >
      <View style={s.sheet}>
        <View style={s.grabber} />
        {meta === null ? (
          <>
            <View style={s.head}>
              <Text variant="pageTitle" style={s.center}>
                Learn from a surah
              </Text>
              <Text variant="label" color="inkSoft" style={s.center}>
                Pick a surah to learn the words of it you do not know yet.
              </Text>
            </View>
            <FlatList
              data={SURAHS}
              keyExtractor={(x) => String(x.n)}
              getItemLayout={(_, i) => ({ length: ROW, offset: ROW * i, index: i })}
              ItemSeparatorComponent={() => <View style={s.rule} />}
              renderItem={({ item }) => {
                const left = counts[item.n - 1] ?? 0;
                return (
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel={`${item.en}, ${left} ${left === 1 ? "word" : "words"} to learn`}
                    onPress={() => setSurah(item.n)}
                    style={s.row}
                  >
                    <Text variant="label" color="inkFaint" style={{ width: 28, textAlign: "center" }}>
                      {String(item.n)}
                    </Text>
                    <View style={{ flex: 1 }}>
                      <Text>{item.en}</Text>
                      <Text variant="label" color="inkSoft">
                        {left === 0 ? "Every word known" : `${left} ${left === 1 ? "word" : "words"} to learn`}
                      </Text>
                    </View>
                    <Text selectable={false} style={s.ar}>
                      {item.ar}
                    </Text>
                  </Pressable>
                );
              }}
            />
          </>
        ) : (
          <>
            <View style={s.head}>
              <Pressable accessibilityRole="button" accessibilityLabel="All surahs" onPress={() => setSurah(null)}>
                <Glass interactive style={s.back}>
                  <Text variant="label">All surahs</Text>
                </Glass>
              </Pressable>
              <Text variant="pageTitle" style={s.center}>
                {meta.en}
              </Text>
              <Text variant="label" color="inkSoft" style={s.center}>
                {words.length === 0
                  ? "Every word of the path in this surah is known."
                  : `${words.length} ${words.length === 1 ? "word" : "words"} to learn, the most frequent first`}
              </Text>
            </View>
            <FlatList
              data={words}
              keyExtractor={(l) => String(l.cardId)}
              ItemSeparatorComponent={() => <View style={s.rule} />}
              renderItem={({ item }) => (
                <View style={s.word}>
                  <Text selectable={false} style={s.face}>
                    {item.face}
                  </Text>
                  <Text color="inkSoft" style={s.center}>
                    {item.gloss!.text}
                  </Text>
                </View>
              )}
              ListFooterComponent={
                <Text variant="label" color="inkFaint" style={[s.center, { paddingVertical: space(2) }]}>
                  {`${WORDS_ATTRIBUTION}. ${WORDS_MAP_ATTRIBUTION}.`}
                </Text>
              }
            />
            {words.length > 0 ? (
              <View style={s.foot}>
                {fresh > 0 ? (
                  <GlassButton
                    primary
                    label={`Learn ${Math.min(perSession, fresh)} new ${Math.min(perSession, fresh) === 1 ? "word" : "words"}`}
                    onPress={() => onStart(meta.n)}
                  />
                ) : (
                  <Text variant="label" color="inkSoft" style={s.center}>
                    You have met all of these. They come back in your reviews.
                  </Text>
                )}
              </View>
            ) : null}
          </>
        )}
      </View>
    </Modal>
  );
}
