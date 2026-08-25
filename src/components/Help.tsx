import AsyncStorage from "@react-native-async-storage/async-storage";
import { useEffect, useState } from "react";
import { Modal, Pressable, View } from "react-native";
import Svg, { Circle, G, Rect, Text as SvgText } from "react-native-svg";

import { Text } from "@/components/Text";
import { RADIUS, space } from "@/theme/layout";
import { arabicStyles } from "@/theme/typography";
import type { Theme } from "@/theme/tokens";
import { makeStyles, useTheme } from "@/theme/useTheme";

export type HelpTopic = "review" | "speed" | "cases" | "cards";

/*
  What each drill is for, as a few cards you page through rather than a wall of
  prose.

  Each one carries a small drawing of the actual screen, because "four options,
  one of them right" is a sentence you read and a picture you recognise. The
  drawings are made of the app's own tokens - never a screenshot, which would
  be wrong in the other theme within a week of any change.

  The panel is centred and deliberately small, sitting over the drill rather
  than replacing it: you should be able to see the thing it is talking about.
  It used to be a sheet attached to the bottom edge, which put the explanation
  as far from the screen it described as the geometry allows.

  This is the same structure the web app uses in components/help.tsx, minus its
  keyboard map - there are no keys here.
*/

const AW = 200;
const AH = 120;

/* The Arabic face, for the drawn examples. SVG text takes a family name, not a
   style object, so it is pulled off the shared style rather than restated. */
const AMIRI = arabicStyles.inline.fontFamily;

type Slide = { line: string; art: (t: Theme) => React.ReactNode };

/* A drawn answer option. The width is fixed so four of them read as a column
   rather than as a ragged list. */
function Row({
  y,
  fill,
  stroke,
  w = 140,
}: {
  y: number;
  fill: string;
  stroke: string;
  w?: number;
}) {
  return (
    <Rect x={(AW - w) / 2} y={y} width={w} height={16} rx={6} fill={fill} stroke={stroke} />
  );
}

const SLIDES: Record<HelpTopic, { title: string; slides: Slide[] }> = {
  review: {
    title: "Review",
    slides: [
      {
        line: "An Arabic word appears on its own. Nothing else, so there is nothing to guess from.",
        art: (t) => (
          <>
            <Rect
              x={20}
              y={14}
              width={160}
              height={92}
              rx={10}
              fill={t.colors.surface}
              stroke={t.colors.rule}
            />
            <SvgText
              x={100}
              y={70}
              textAnchor="middle"
              fill={t.colors.ink}
              fontSize={30}
              fontFamily={AMIRI}
            >
              بَيْت
            </SvgText>
          </>
        ),
      },
      {
        line: "A new word gives you four meanings to choose from. The right one is always marked afterwards, whichever you picked.",
        art: (t) => (
          <>
            <Row y={12} fill={t.colors.surfaceSunk} stroke={t.colors.rule} />
            <Row y={38} fill={t.colors.lapisWash} stroke={t.colors.verdigris} />
            <Row y={64} fill={t.colors.surfaceSunk} stroke={t.colors.rule} />
            <Row y={90} fill={t.colors.surfaceSunk} stroke={t.colors.rule} />
            <Circle cx={152} cy={46} r={5} fill={t.colors.verdigris} />
          </>
        ),
      },
      {
        line: "Answer a word correctly twice and it stops offering options. From then on it asks you to type the meaning.",
        art: (t) => (
          <>
            <SvgText
              x={100}
              y={34}
              textAnchor="middle"
              fill={t.colors.ink}
              fontSize={24}
              fontFamily={AMIRI}
            >
              قَلَم
            </SvgText>
            <Rect
              x={30}
              y={50}
              width={140}
              height={24}
              rx={8}
              fill={t.colors.surfaceSunk}
              stroke={t.colors.lapis}
            />
            <Rect x={40} y={59} width={42} height={6} rx={3} fill={t.colors.inkFaint} />
            <Rect x={30} y={84} width={140} height={22} rx={8} fill={t.colors.lapis} />
          </>
        ),
      },
      {
        line: "Then it turns around. The same word, from the English, first by choice and then built from its letters.",
        art: (t) => (
          <>
            <SvgText x={100} y={24} textAnchor="middle" fill={t.colors.inkFaint} fontSize={11}>
              house
            </SvgText>
            <Rect
              x={52}
              y={34}
              width={96}
              height={18}
              rx={7}
              fill={t.colors.surfaceSunk}
              stroke={t.colors.rule}
            />
            <SvgText
              x={100}
              y={48}
              textAnchor="middle"
              fill={t.colors.ink}
              fontSize={13}
              fontFamily={AMIRI}
            >
              بَيْت
            </SvgText>
            {[46, 84, 122].map((x) => (
              <Rect
                key={x}
                x={x}
                y={64}
                width={30}
                height={26}
                rx={8}
                fill={t.colors.surface}
                stroke={t.colors.rule}
              />
            ))}
            {/* Right to left, the way the tiles are actually laid out. */}
            {[
              { x: 61, ch: "تٌ" },
              { x: 99, ch: "بَ" },
              { x: 137, ch: "يْ" },
            ].map((tile) => (
              <SvgText
                key={tile.x}
                x={tile.x}
                y={82}
                textAnchor="middle"
                fill={t.colors.ink}
                fontSize={14}
                fontFamily={AMIRI}
              >
                {tile.ch}
              </SvgText>
            ))}
          </>
        ),
      },
      {
        line: "Four steps in all, and each one waits for two correct answers. Get one wrong and the word drops back a step.",
        art: (t) => (
          <>
            {[
              { y: 8, label: "pick the meaning", on: true },
              { y: 34, label: "type the meaning", on: true },
              { y: 60, label: "pick the Arabic", on: false },
              { y: 86, label: "build the Arabic", on: false },
            ].map((rung) => (
              <G key={rung.y}>
                <Rect
                  x={26}
                  y={rung.y}
                  width={148}
                  height={20}
                  rx={7}
                  fill={rung.on ? t.colors.lapisWash : t.colors.surfaceSunk}
                  stroke={rung.on ? t.colors.lapis : t.colors.rule}
                />
                <SvgText
                  x={100}
                  y={rung.y + 14}
                  textAnchor="middle"
                  fill={rung.on ? t.colors.lapis : t.colors.inkFaint}
                  fontSize={10}
                >
                  {rung.label}
                </SvgText>
              </G>
            ))}
          </>
        ),
      },
    ],
  },

  speed: {
    title: "Speed drill",
    slides: [
      {
        line: "A word shows for the length of your window, with the ring draining around it.",
        art: (t) => (
          <>
            <Circle cx={100} cy={60} r={38} fill="none" stroke={t.colors.surfaceSunk} strokeWidth={5} />
            {/*
              A partly drained ring. The dash array is the full circumference so
              the offset reads as the fraction remaining, and the rotation puts
              the start at twelve o'clock rather than at three.
            */}
            <Circle
              cx={100}
              cy={60}
              r={38}
              fill="none"
              stroke={t.colors.lapis}
              strokeWidth={5}
              strokeLinecap="round"
              strokeDasharray={239}
              strokeDashoffset={80}
              transform="rotate(-90 100 60)"
            />
            <SvgText
              x={100}
              y={70}
              textAnchor="middle"
              fill={t.colors.ink}
              fontSize={24}
              fontFamily={AMIRI}
            >
              نَجْم
            </SvgText>
          </>
        ),
      },
      {
        line: "When the window closes the word blurs out. However long you stare, it is gone.",
        art: (t) => (
          <>
            <Circle cx={100} cy={60} r={38} fill="none" stroke={t.colors.surfaceSunk} strokeWidth={5} />
            {/* Opacity rather than a blur filter: React Native's SVG has no
                feGaussianBlur, and a faded word says the same thing. */}
            <SvgText
              x={100}
              y={70}
              textAnchor="middle"
              fill={t.colors.ink}
              opacity={0.25}
              fontSize={24}
              fontFamily={AMIRI}
            >
              نَجْم
            </SvgText>
          </>
        ),
      },
      {
        line: "Say whether you knew it. Speed runs never move a word's next review.",
        art: (t) => (
          <>
            <Rect
              x={16}
              y={44}
              width={78}
              height={32}
              rx={10}
              fill={t.colors.surface}
              stroke={t.colors.rule}
            />
            <SvgText x={55} y={64} textAnchor="middle" fill={t.colors.inkSoft} fontSize={11}>
              missed it
            </SvgText>
            <Rect
              x={106}
              y={44}
              width={78}
              height={32}
              rx={10}
              fill={t.colors.surface}
              stroke={t.colors.rule}
            />
            <SvgText x={145} y={64} textAnchor="middle" fill={t.colors.inkSoft} fontSize={11}>
              knew it
            </SvgText>
          </>
        ),
      },
    ],
  },

  cases: {
    title: "Case drill",
    slides: [
      {
        line: "A sentence appears with the final harakah on one noun blanked out.",
        art: (t) => (
          <>
            <SvgText
              x={100}
              y={56}
              textAnchor="middle"
              fill={t.colors.ink}
              fontSize={22}
              fontFamily={AMIRI}
            >
              البَيْتُ كَبِير
            </SvgText>
            {/* The gap, drawn as the dotted circle the drill itself uses. */}
            <Circle
              cx={100}
              cy={80}
              r={9}
              fill="none"
              stroke={t.colors.inkFaint}
              strokeWidth={1}
              strokeDasharray="2 3"
            />
          </>
        ),
      },
      {
        line: "Choose the ending that belongs there, not the word. Four options, one rule.",
        art: (t) => (
          <>
            {[34, 76, 118, 160].map((x, i) => (
              <G key={x}>
                <Circle
                  cx={x}
                  cy={60}
                  r={16}
                  fill={i === 1 ? t.colors.lapisWash : t.colors.surface}
                  stroke={i === 1 ? t.colors.lapis : t.colors.rule}
                />
                <Circle
                  cx={x}
                  cy={64}
                  r={7}
                  fill="none"
                  stroke={t.colors.inkFaint}
                  strokeWidth={1}
                  strokeDasharray="2 3"
                />
                <SvgText
                  x={x}
                  y={58}
                  textAnchor="middle"
                  fill={t.colors.ink}
                  fontSize={13}
                  fontFamily={AMIRI}
                >
                  {["َ", "ُ", "ِ", "ً"][i]}
                </SvgText>
              </G>
            ))}
          </>
        ),
      },
      {
        line: "This tests the grammar, so it never touches your card schedule.",
        art: (t) => (
          <>
            <Rect
              x={30}
              y={30}
              width={140}
              height={60}
              rx={12}
              fill={t.colors.surface}
              stroke={t.colors.rule}
            />
            <SvgText x={100} y={58} textAnchor="middle" fill={t.colors.inkSoft} fontSize={11}>
              case drill
            </SvgText>
            <SvgText x={100} y={76} textAnchor="middle" fill={t.colors.inkFaint} fontSize={10}>
              schedule untouched
            </SvgText>
          </>
        ),
      },
    ],
  },

  cards: {
    title: "Flashcards",
    slides: [
      {
        line: "Tap a card to turn it. The word on one side, the meaning on the other.",
        art: (t) => (
          <>
            <Rect
              x={20}
              y={14}
              width={160}
              height={92}
              rx={10}
              fill={t.colors.surface}
              stroke={t.colors.rule}
            />
            <SvgText
              x={100}
              y={62}
              textAnchor="middle"
              fill={t.colors.ink}
              fontSize={26}
              fontFamily={AMIRI}
            >
              مِفْتاح
            </SvgText>
            <SvgText x={100} y={88} textAnchor="middle" fill={t.colors.inkFaint} fontSize={10}>
              tap to turn
            </SvgText>
          </>
        ),
      },
      {
        line: "Mark the ones giving you trouble. A marked word is a note to yourself; the scheduler does not read it.",
        art: (t) => (
          <>
            <Rect
              x={20}
              y={14}
              width={160}
              height={92}
              rx={10}
              fill={t.colors.surface}
              stroke={t.colors.rule}
            />
            <SvgText x={100} y={66} textAnchor="middle" fill={t.colors.inkSoft} fontSize={13}>
              key
            </SvgText>
            {/* The same corner the real control sits in. */}
            <Circle cx={162} cy={30} r={9} fill={t.colors.clay} opacity={0.9} />
          </>
        ),
      },
      {
        line: "Nothing here is graded and nothing changes your schedule.",
        art: (t) => (
          <>
            <Rect
              x={30}
              y={30}
              width={140}
              height={60}
              rx={12}
              fill={t.colors.surface}
              stroke={t.colors.rule}
            />
            <SvgText x={100} y={66} textAnchor="middle" fill={t.colors.inkFaint} fontSize={11}>
              browsing, not drilling
            </SvgText>
          </>
        ),
      },
    ],
  },
};

const seenKey = (topic: HelpTopic) => `durus.help.${topic}`;

const useStyles = makeStyles((t) => ({
  /*
    A light scrim rather than a cover. The drill stays visible behind the panel,
    which is the point of explaining it here rather than on a page of its own.

    Black at low alpha in both themes, deliberately not a token: a scrim dims
    whatever is behind it rather than participating in the palette, and a token
    would imply it changes with the theme.
  */
  backdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.28)",
    alignItems: "center",
    justifyContent: "center",
    padding: space(2),
  },
  panel: {
    width: "100%",
    maxWidth: 360,
    backgroundColor: t.colors.surface,
    borderRadius: RADIUS.card,
    borderWidth: 1,
    borderColor: t.colors.rule,
    paddingHorizontal: space(3),
    paddingVertical: space(3),
    gap: space(2),
  },
  head: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  /* The art sits on paper, so the drawn screen reads as a screen rather than as
     part of the panel it is on. */
  artBox: {
    backgroundColor: t.colors.paper,
    borderRadius: RADIUS.field,
    paddingVertical: space(1),
    alignItems: "center",
  },
  /*
    A fixed height, not a minimum. The panel is paged through, and a box that
    grows and shrinks as the lines change length moves the dots and the buttons
    between taps.
  */
  line: { height: 96, alignItems: "center", justifyContent: "center" },
  lineText: { textAlign: "center" },

  dots: { flexDirection: "row", justifyContent: "center", gap: space(1) },
  dot: { width: 8, height: 8, borderRadius: 999 },

  buttons: { flexDirection: "row", gap: space(1) },
  back: {
    flex: 1,
    borderWidth: 1,
    borderColor: t.colors.rule,
    borderRadius: RADIUS.button,
    paddingVertical: space(1.5),
    alignItems: "center",
  },
  next: {
    flex: 1,
    backgroundColor: t.colors.lapis,
    borderRadius: RADIUS.button,
    paddingVertical: space(1.5),
    alignItems: "center",
  },
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
  const theme = useTheme();
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
        {/* Swallows the tap so pressing the panel itself does not dismiss it. */}
        <Pressable style={s.panel} onPress={() => {}}>
          <View style={s.head}>
            <Text style={{ fontSize: 17 }}>{content.title}</Text>
            <Text variant="label" color="inkFaint">
              {`${index + 1} of ${content.slides.length}`}
            </Text>
          </View>

          <View style={s.artBox}>
            <Svg width="100%" height={AH} viewBox={`0 0 ${AW} ${AH}`}>
              {slide.art(theme)}
            </Svg>
          </View>

          <View style={s.line}>
            <Text style={s.lineText}>{slide.line}</Text>
          </View>

          {/* The dots double as the way back to any slide. */}
          <View style={s.dots}>
            {content.slides.map((_, i) => (
              <Pressable
                key={i}
                accessibilityRole="button"
                accessibilityLabel={`Slide ${i + 1}`}
                hitSlop={8}
                onPress={() => setIndex(i)}
                style={[
                  s.dot,
                  { backgroundColor: i === index ? theme.colors.lapis : theme.colors.surfaceSunk },
                ]}
              />
            ))}
          </View>

          <View style={s.buttons}>
            {index > 0 ? (
              <Pressable style={s.back} onPress={() => setIndex((i) => i - 1)}>
                <Text color="inkSoft">Back</Text>
              </Pressable>
            ) : null}
            <Pressable
              style={s.next}
              onPress={() => (last ? onClose() : setIndex((i) => i + 1))}
            >
              <Text style={{ color: theme.colors.paper }}>{last ? "Got it" : "Next"}</Text>
            </Pressable>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

/*
  Opens itself the first time a drill is entered, and never again.

  The flag is written as soon as it opens rather than when it is dismissed: if
  the app is killed mid-panel, showing it forever is worse than showing it once
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
        /* A storage failure must not block a drill. Worst case the panel
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
