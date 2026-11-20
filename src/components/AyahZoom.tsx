import { useEffect, useState } from "react";
import { Modal, Pressable, ScrollView, Share, View, useWindowDimensions } from "react-native";
import Animated, { Easing, useAnimatedStyle, useReducedMotion, useSharedValue, withTiming } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Svg, { Path } from "react-native-svg";

import { Glass } from "@/components/Glass";
import { Text } from "@/components/Text";
import { canPlayWordAudio, playAudio, playClip, stopAudio } from "@/lib/wordAudio";
import { localAudio } from "@/quran/offlineAudio";
import { usePrefs } from "@/state/prefs";
import { wordAudioFor, type QfAyah, type QfWord } from "@/quran/qf";
import { RADIUS, space } from "@/theme/layout";
import { makeStyles, useTheme } from "@/theme/useTheme";

/*
  Long press an ayah and it lifts off the page into a Liquid Glass zoom: the
  ayah large, every word over its meaning and reading, the transliteration and
  translation, and the ayah's actions. Tap a word to zoom in on that word and hear it; the speaker
  in the corner recites the whole ayah (on builds with the audio module).

  The glass is the frame and the controls. The Quran text and its layers sit on
  a solid paper panel inside it, so they stay legible whatever is behind.

  The zoom grows in by scale, never by fading: glass does not draw under an
  animated opacity. The dim behind is a plain view, so it may fade.

  The Arabic of the ayah is the Tanzil text the reader shows, verbatim. Words,
  meanings, readings and the translation are Quran Foundation's, as delivered.
*/

type Props = {
  visible: boolean;
  onClose: () => void;
  title: string;
  arabic: string;
  quran: { fontFamily: string };
  layer: QfAyah | null;
  layerState: "ready" | "loading" | "unavailable" | "error";
  translationName: string | null;
  memorized: boolean;
  understood: boolean;
  bookmarked: boolean;
  onMemorized: () => void;
  onUnderstood: () => void;
  onBookmark: () => void;
};

const useStyles = makeStyles((t) => ({
  scrim: { flex: 1, backgroundColor: t.dark ? "rgba(8,10,16,0.62)" : "rgba(20,30,60,0.32)" },
  frame: { borderRadius: 30, padding: space(1.25), overflow: "hidden" },
  panel: { borderRadius: 22, backgroundColor: t.colors.paper, padding: space(2.25), gap: space(2) },
  head: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  words: { flexDirection: "row-reverse", flexWrap: "wrap", justifyContent: "center", gap: space(1.25), rowGap: space(1.5) },
  word: { alignItems: "center", borderRadius: 14, paddingHorizontal: space(0.75), paddingVertical: space(0.5), maxWidth: 150 },
  wordOn: { backgroundColor: t.colors.lapisWash },
  focus: { alignItems: "center", gap: space(0.5), borderRadius: 18, backgroundColor: t.colors.surface, borderWidth: 1, borderColor: t.colors.rule, paddingVertical: space(2), paddingHorizontal: space(2) },
  section: { gap: space(0.75), alignItems: "center" },
  bar: { flexDirection: "row", alignSelf: "center", borderRadius: RADIUS.pill, padding: 4, gap: 2, overflow: "hidden", marginTop: space(1.25) },
  tool: { flexDirection: "row", alignItems: "center", gap: 6, paddingVertical: space(1), paddingHorizontal: space(1.5), borderRadius: RADIUS.pill },
}));

/* A play triangle with a speaker's sound waves. */
const PLAY = "M4 9.5h3.5L12 5.5v13l-4.5-4H4zM15.5 9a4.2 4.2 0 0 1 0 6M18 6.5a7.8 7.8 0 0 1 0 11";

function Icon({ d, color, size = 18 }: { d: string; color: string; size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Path d={d} stroke={color} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" fill="none" />
    </Svg>
  );
}

export function AyahZoom(p: Props) {
  const s = useStyles();
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const { height } = useWindowDimensions();
  const still = useReducedMotion();
  const [focus, setFocus] = useState<QfWord | null>(null);
  /* Sound needs the build with the audio module; older builds stay silent. */
  const canHear = canPlayWordAudio();
  const reciterId = usePrefs((st) => st.reciterId) ?? 7;
  /* Downloaded for offline listening: the verse file on the phone. */
  const local = p.layer ? localAudio(reciterId, p.layer.key, p.layer.audio?.url) : null;
  const hearAyah = () => {
    if (p.layer?.audio) playAudio(local ?? p.layer.audio.url);
  };
  /* A word: cut from the downloaded verse file when there is one (works
     offline), else Quran Foundation's word recording, streamed. */
  const hearWord = (w: QfWord) => {
    const seg = p.layer?.audio?.segments.find((x) => x[1] === w.position);
    if (local && seg) playClip(local, seg[2], seg[3]);
    else if (p.layer) playAudio(wordAudioFor(p.layer.key, w.position));
  };

  /* Scale only: a zoom, never a fade, so the glass is always drawn. */
  const scale = useSharedValue(still ? 1 : 0.88);
  useEffect(() => {
    if (!p.visible) {
      setFocus(null);
      stopAudio();
      scale.value = still ? 1 : 0.88;
      return;
    }
    scale.value = withTiming(1, { duration: still ? 0 : 260, easing: Easing.out(Easing.cubic) });
  }, [p.visible, still, scale]);
  const zoom = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));

  const big = { fontFamily: p.quran.fontFamily, color: theme.colors.ink, writingDirection: "rtl" as const, textAlign: "center" as const };
  const translit = p.layer?.words.map((w) => w.translit).filter(Boolean).join(" ") ?? "";

  return (
    <Modal visible={p.visible} transparent animationType="fade" onRequestClose={p.onClose} statusBarTranslucent>
      <Pressable accessibilityLabel="Close" style={s.scrim} onPress={p.onClose}>
        <View style={{ flex: 1, justifyContent: "center", paddingHorizontal: space(1.5), paddingTop: insets.top + space(2), paddingBottom: insets.bottom + space(2) }}>
          {/* Taps inside the card must not close it. */}
          <Pressable onPress={() => {}} accessible={false}>
            <Animated.View style={zoom}>
              <Glass style={s.frame}>
                <View style={s.panel}>
                  <View style={s.head}>
                    <Text variant="eyebrow" color="inkSoft">
                      {p.title}
                    </Text>
                    <View style={{ flexDirection: "row", alignItems: "center", gap: space(2.5) }}>
                      {/* The whole ayah, recited (Quran Foundation, the chosen reciter). */}
                      {canHear && p.layer?.audio ? (
                        <Pressable accessibilityRole="button" accessibilityLabel="Play the ayah" onPress={hearAyah} hitSlop={10}>
                          <Icon d={PLAY} color={theme.colors.lapis} size={18} />
                        </Pressable>
                      ) : null}
                      <Pressable accessibilityRole="button" accessibilityLabel="Close" onPress={p.onClose} hitSlop={10}>
                        <Icon d="M6 6l12 12M18 6L6 18" color={theme.colors.inkSoft} size={16} />
                      </Pressable>
                    </View>
                  </View>

                  <ScrollView style={{ maxHeight: height * 0.62 }} showsVerticalScrollIndicator={false} contentContainerStyle={{ gap: space(2) }}>
                    {focus ? (
                      <Pressable accessibilityRole="button" accessibilityLabel="Back to the ayah" onPress={() => setFocus(null)} style={s.focus}>
                        <Text selectable={false} style={[big, { fontSize: 64, lineHeight: 120 }]}>
                          {focus.text}
                        </Text>
                        {focus.translit ? (
                          <Text color="inkSoft" style={{ fontStyle: "italic", fontSize: 18 }}>
                            {focus.translit}
                          </Text>
                        ) : null}
                        {focus.meaning ? <Text style={{ fontSize: 18, textAlign: "center" }}>{focus.meaning}</Text> : null}
                        {canHear && (focus.audio || local) ? (
                          <Pressable accessibilityRole="button" accessibilityLabel="Listen" onPress={() => hearWord(focus)} hitSlop={8} style={{ flexDirection: "row", alignItems: "center", gap: 6, paddingTop: space(1) }}>
                            <Icon d={PLAY} color={theme.colors.lapis} size={16} />
                            <Text variant="label" color="lapis">
                              Listen again
                            </Text>
                          </Pressable>
                        ) : null}
                        <Text variant="label" color="inkFaint" style={{ paddingTop: space(0.5) }}>
                          Tap to go back to the ayah
                        </Text>
                      </Pressable>
                    ) : p.layer ? (
                      /* Each word over its meaning and reading; tap one to zoom in. */
                      <View style={s.words}>
                        {p.layer.words.map((w) => (
                          <Pressable key={w.position} accessibilityRole="button" accessibilityLabel={w.meaning ?? `Word ${w.position}`} onPress={() => {
                              setFocus(w);
                              /* Tapping a word says it. */
                              if (canHear) hearWord(w);
                            }} style={s.word}>
                            <Text selectable={false} style={[big, { fontSize: 34, lineHeight: 64 }]}>
                              {w.text}
                            </Text>
                            {w.translit ? (
                              <Text variant="label" color="inkSoft" style={{ fontStyle: "italic", textAlign: "center" }}>
                                {w.translit}
                              </Text>
                            ) : null}
                            {w.meaning ? (
                              <Text variant="label" style={{ textAlign: "center" }}>
                                {w.meaning}
                              </Text>
                            ) : null}
                          </Pressable>
                        ))}
                      </View>
                    ) : (
                      <Text selectable={false} style={[big, { fontSize: 36, lineHeight: 76 }]}>
                        {p.arabic}
                      </Text>
                    )}

                    {p.layer && translit ? (
                      <View style={s.section}>
                        <Text variant="eyebrow" color="inkSoft">
                          Transliteration
                        </Text>
                        <Text color="inkSoft" style={{ fontStyle: "italic", lineHeight: 23, textAlign: "center" }}>
                          {translit}
                        </Text>
                      </View>
                    ) : null}

                    {p.layer?.translation ? (
                      <View style={s.section}>
                        <Text variant="eyebrow" color="inkSoft">
                          {p.translationName ?? "Translation"}
                        </Text>
                        <Text style={{ lineHeight: 24, textAlign: "center" }}>{p.layer.translation.map((x) => ("text" in x ? x.text : "")).join("")}</Text>
                      </View>
                    ) : null}

                    {p.layerState === "loading" ? (
                      <Text variant="label" color="inkSoft" style={{ textAlign: "center" }}>
                        Loading the words, transliteration and translation.
                      </Text>
                    ) : null}
                    {p.layerState === "unavailable" ? (
                      <Text variant="label" color="inkSoft" style={{ textAlign: "center" }}>
                        Word by word, transliteration and translation appear here once Quran.com is connected.
                      </Text>
                    ) : null}
                    {p.layerState === "error" ? (
                      <Text variant="label" color="inkSoft" style={{ textAlign: "center" }}>
                        Could not reach Quran.com. Try again when you are online.
                      </Text>
                    ) : null}
                  </ScrollView>
                </View>

                <Glass interactive style={s.bar}>
                  <Pressable accessibilityRole="button" accessibilityState={{ selected: p.memorized }} onPress={p.onMemorized} style={[s.tool, p.memorized && { backgroundColor: theme.colors.saffron }]}>
                    <Icon d="M5 12.5l4.5 4.5L19 7.5" color={p.memorized ? theme.colors.paper : theme.colors.saffron} />
                    <Text variant="label" color={p.memorized ? "paper" : "ink"}>
                      Memorized
                    </Text>
                  </Pressable>
                  <Pressable accessibilityRole="button" accessibilityState={{ selected: p.understood }} onPress={p.onUnderstood} style={[s.tool, p.understood && { backgroundColor: theme.colors.verdigris }]}>
                    <Icon
                      d="M2.5 12s3.5-6.5 9.5-6.5S21.5 12 21.5 12s-3.5 6.5-9.5 6.5S2.5 12 2.5 12zM12 14.5a2.5 2.5 0 100-5 2.5 2.5 0 000 5z"
                      color={p.understood ? theme.colors.paper : theme.colors.verdigris}
                    />
                    <Text variant="label" color={p.understood ? "paper" : "ink"}>
                      Understood
                    </Text>
                  </Pressable>
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel={p.bookmarked ? "Remove bookmark" : "Bookmark"}
                    onPress={p.onBookmark}
                    style={[s.tool, p.bookmarked && { backgroundColor: theme.colors.lapis }]}
                  >
                    <Icon d="M6.5 3.5h11v17l-5.5-4-5.5 4z" color={p.bookmarked ? theme.colors.paper : theme.colors.lapis} />
                  </Pressable>
                  <Pressable accessibilityRole="button" accessibilityLabel="Share reference" onPress={() => void Share.share({ message: p.title })} style={s.tool}>
                    <Icon d="M12 15V3.5M7.5 8L12 3.5 16.5 8M5 12.5v6a2 2 0 002 2h10a2 2 0 002-2v-6" color={theme.colors.lapis} />
                  </Pressable>
                </Glass>
              </Glass>
            </Animated.View>
          </Pressable>
        </View>
      </Pressable>
    </Modal>
  );
}
