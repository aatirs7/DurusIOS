import * as Router from "expo-router";
import { useCallback, useEffect, useState } from "react";
import { Modal, StyleSheet, View } from "react-native";
import Animated, { Easing, FadeIn, ZoomIn } from "react-native-reanimated";

import { Button } from "@/components/Button";
import { Glass } from "@/components/Glass";
import { Text } from "@/components/Text";
import { claimOverlay, releaseOverlay } from "@/lib/overlay";
import { usePrefs } from "@/state/prefs";
import { space } from "@/theme/layout";
import { makeStyles } from "@/theme/useTheme";

/*
  First-visit tips: the first time a learner lands on a tab (and the reader),
  a short card says what the page is for and the one or two gestures nobody
  would guess, like press and hold. "Got it" puts it away for good; Settings
  > Show tips again brings them all back.

  Shown only while its page is focused, never over another card (the offline
  question takes turns with it through claimOverlay). The card grows in by
  scale, the dim fades on its own layer, so the glass is never under an
  animated opacity.
*/

export type TipId = "search" | "read" | "reader" | "progress" | "learn" | "barakah";

const TIPS: Record<TipId, { title: string; lines: string[] }> = {
  search: {
    title: "Search",
    lines: [
      "Type a surah, an ayah like 2:255, a topic, or how you feel.",
      "Durus finds the ayahs that fit, with a short note on what each one is about.",
    ],
  },
  read: {
    title: "Read",
    lines: ["Every surah, with where you left off kept for you.", "Open one to start reading."],
  },
  reader: {
    title: "Press and hold an ayah",
    lines: [
      "It lifts into a closer view: every word with its reading and meaning, and the translation.",
      "Tap a word there to hear it; the speaker plays the whole ayah.",
    ],
  },
  progress: {
    title: "Progress",
    lines: [
      "Tap Mark to add the surahs you already know.",
      "Swipe across for the Wall of every ayah, each juz, your stats and your week.",
    ],
  },
  learn: {
    title: "Learn",
    lines: [
      "The Quran's most common words, a few a day, starting with Al-Fatiha.",
      "Each word comes back just before you would forget it.",
    ],
  },
  barakah: {
    title: "Barakah",
    lines: [
      "Tap a circle to tick a practice. Press and hold a tile for what it is and why.",
      "Prayers: one tap means prayed late, two means on time.",
    ],
  },
};

const DELAY_MS = 600;

const useStyles = makeStyles((t) => ({
  scrim: { backgroundColor: t.dark ? "rgba(8,10,16,0.55)" : "rgba(20,30,60,0.28)" },
  wrap: { flex: 1, justifyContent: "center", padding: space(3) },
  card: { borderRadius: 28, padding: space(3), gap: space(1.25) },
}));

/* expo-router's focus hook; a no-op where a test stands the router in. */
const useFocus: (cb: () => void | (() => void)) => void =
  (Router as { useFocusEffect?: (cb: () => void | (() => void)) => void }).useFocusEffect ?? (() => {});

export function PageTip({ id }: { id: TipId }) {
  const s = useStyles();
  const hydrated = usePrefs((st) => st._hydrated);
  const seen = usePrefs((st) => (st.tipsSeen ?? []).includes(id));
  const markTipSeen = usePrefs((st) => st.markTipSeen);
  const [focused, setFocused] = useState(false);
  const [show, setShow] = useState(false);

  useFocus(
    useCallback(() => {
      setFocused(true);
      return () => setFocused(false);
    }, []),
  );

  useEffect(() => {
    if (!hydrated || seen || !focused) return;
    let claimed = false;
    const tryOpen = () => {
      if (claimOverlay(`tip:${id}`)) {
        claimed = true;
        setShow(true);
      } else timer = setTimeout(tryOpen, 1500);
    };
    let timer = setTimeout(tryOpen, DELAY_MS);
    return () => {
      clearTimeout(timer);
      if (claimed) releaseOverlay(`tip:${id}`);
      setShow(false);
    };
  }, [hydrated, seen, focused, id]);

  const close = () => {
    markTipSeen(id);
    setShow(false);
    releaseOverlay(`tip:${id}`);
  };

  const tip = TIPS[id];
  return (
    <Modal visible={show} transparent animationType="none" onRequestClose={close}>
      <Animated.View entering={FadeIn.duration(240)} style={[StyleSheet.absoluteFill, s.scrim]} />
      <View style={s.wrap}>
        <Animated.View entering={ZoomIn.duration(360).easing(Easing.out(Easing.cubic))}>
          <Glass style={s.card}>
            <Text variant="eyebrow" color="inkSoft" style={{ textAlign: "center" }}>
              Tip
            </Text>
            <Text variant="pageTitle" style={{ textAlign: "center" }}>
              {tip.title}
            </Text>
            {tip.lines.map((l) => (
              <Text key={l} color="inkSoft" style={{ textAlign: "center" }}>
                {l}
              </Text>
            ))}
            <View style={{ paddingTop: space(1) }}>
              <Button label="Got it" onPress={close} />
            </View>
          </Glass>
        </Animated.View>
      </View>
    </Modal>
  );
}
