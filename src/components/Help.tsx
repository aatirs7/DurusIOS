import AsyncStorage from "@react-native-async-storage/async-storage";
import { useEffect, useState } from "react";
import { Modal, Pressable, View } from "react-native";

import { Button } from "@/components/Button";
import { Text } from "@/components/Text";
import { RADIUS, space } from "@/theme/layout";
import { makeStyles } from "@/theme/useTheme";

export type HelpTopic = "review" | "speed" | "cases" | "cards";

type Slide = { title: string; body: string };

/*
  How the ladder gets explained.

  Spec section 1.1 point 1 - the user never grades themselves - only works if
  they understand the app is grading them. Nobody reads a manual, so this opens
  itself the first time each drill is entered and never again, and the "?" in
  the corner is there for the second time.

  Held at one size across slides so the sheet does not resize under a thumb
  mid-read.
*/
const SLIDES: Record<HelpTopic, { heading: string; slides: Slide[] }> = {
  review: {
    heading: "Review",
    slides: [
      {
        title: "You are not asked to rate yourself.",
        body: "There is no Again / Hard / Good / Easy row. Whether you were right comes from your answer, and how well you knew it comes from how long you took.",
      },
      {
        title: "The question gets harder as the word gets easier.",
        body: "A new word is four options to tap. Once you have it twice, you type the meaning instead, and later you build the Arabic letter by letter.",
      },
      {
        title: "Recognising and producing are separate.",
        body: "Reading a word and recalling it from the English are two different skills, so they are scheduled apart. Production only starts once recognition is solid.",
      },
      {
        title: "Getting one wrong is not a penalty.",
        body: "A wrong answer simply brings the word back sooner, and this session. Nothing is scored and nothing is lost.",
      },
    ],
  },
  speed: {
    heading: "Speed drill",
    slides: [
      {
        title: "Twenty words against a shrinking clock.",
        body: "Recognition only. The ring is the time you have left; when it empties the card counts as missed and moves on.",
      },
      {
        title: "It gets faster only when you are ready.",
        body: "Answer above 85% inside the window and the next run gives you a little less time. Miss more than that and it stays where it is.",
      },
      {
        title: "It does not touch your schedule.",
        body: "Speed runs are recorded so your times stay honest, but they never move a word's next review.",
      },
    ],
  },
  cases: {
    heading: "Case drill",
    slides: [
      {
        title: "One ending is missing.",
        body: "A noun in the phrase has lost its final harakah. Pick the ending that belongs there.",
      },
      {
        title: "The four marks sit on a dotted circle.",
        body: "That circle is not part of the answer. It is a placeholder so the four marks share a baseline and can be told apart.",
      },
    ],
  },
  cards: {
    heading: "Flashcards",
    slides: [
      {
        title: "Browsing, not drilling.",
        body: "Tap a card to turn it. Nothing here is graded and nothing changes your schedule.",
      },
      {
        title: "Mark the ones giving you trouble.",
        body: "A marked word is just a note to yourself. The scheduler does not read it.",
      },
    ],
  },
};

const seenKey = (topic: HelpTopic) => `durus.help.${topic}`;

const useStyles = makeStyles((t) => ({
  backdrop: {
    flex: 1,
    /*
      The one colour in src/ outside tokens.ts, and deliberately so. A scrim is
      not a palette entry: it is black at low alpha in both themes, because it
      dims whatever is behind it rather than participating in the palette.
      Adding it as a token would imply it changes with the theme, which it must
      not. The lint rule only catches hex, so this note is the guard.
    */
    backgroundColor: "rgba(0,0,0,0.45)",
    justifyContent: "flex-end",
  },
  sheet: {
    backgroundColor: t.colors.surface,
    borderTopLeftRadius: RADIUS.card,
    borderTopRightRadius: RADIUS.card,
    borderTopWidth: 1,
    borderColor: t.colors.rule,
    padding: space(3),
    paddingBottom: space(5),
    gap: space(2),
  },
  /* One height for every slide, so the sheet does not jump as you page. */
  body: { minHeight: 150, gap: space(1.5) },
  dots: { flexDirection: "row", justifyContent: "center", gap: space(1) },
  dot: { width: 6, height: 6, borderRadius: 999 },
  row: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
}));

export function Help({
  topic,
  open,
  onClose,
}: {
  topic: HelpTopic;
  open: boolean;
  onClose: () => void;
}) {
  const s = useStyles();
  const [index, setIndex] = useState(0);
  const content = SLIDES[topic];
  const slide = content.slides[index];
  const last = index === content.slides.length - 1;

  useEffect(() => {
    if (open) setIndex(0);
  }, [open]);

  return (
    <Modal visible={open} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={s.backdrop} onPress={onClose}>
        {/* Swallows the tap so pressing the sheet itself does not dismiss it. */}
        <Pressable style={s.sheet} onPress={() => {}}>
          <Text variant="eyebrow" color="inkSoft">
            {content.heading}
          </Text>

          <View style={s.body}>
            <Text variant="pageTitle">{slide.title}</Text>
            <Text color="inkSoft">{slide.body}</Text>
          </View>

          <View style={s.dots}>
            {content.slides.map((_, i) => (
              <View
                key={i}
                style={[s.dot, { opacity: i === index ? 1 : 0.25 }]}
              />
            ))}
          </View>

          <View style={s.row}>
            <Button
              label="Skip"
              variant="text"
              onPress={onClose}
            />
            <Button
              label={last ? "Start" : "Next"}
              onPress={() => (last ? onClose() : setIndex((i) => i + 1))}
              style={{ minWidth: 120 }}
            />
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

/*
  Opens itself the first time a drill is entered, and never again.

  The flag is written as soon as it opens rather than when it is dismissed: if
  the app is killed mid-sheet, showing it forever is worse than showing it once
  less than intended.
*/
export function useHelp(topic: HelpTopic) {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    let cancelled = false;
    AsyncStorage.getItem(seenKey(topic))
      .then((seen) => {
        if (cancelled || seen) return;
        setOpen(true);
        return AsyncStorage.setItem(seenKey(topic), "1");
      })
      .catch(() => {
        /* A storage failure must not block a drill. Worst case the sheet
           reappears next time. */
      });
    return () => {
      cancelled = true;
    };
  }, [topic]);

  return { open, show: () => setOpen(true), close: () => setOpen(false) };
}

/* The "?" that lives beside a drill's eyebrow, for the second time onward. */
export function HelpButton({ onPress }: { onPress: () => void }) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel="How this drill works"
      onPress={onPress}
      hitSlop={12}
    >
      <Text variant="label" color="inkFaint">
        ?
      </Text>
    </Pressable>
  );
}
