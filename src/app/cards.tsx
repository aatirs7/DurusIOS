import { useRouter } from "expo-router";
import { useMemo, useState } from "react";
import { Pressable, View, type StyleProp, type ViewStyle } from "react-native";
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";

import Svg, { Path } from "react-native-svg";

import { Arabic } from "@/components/Arabic";
import { Button } from "@/components/Button";
import { BackBar } from "@/components/BackBar";
import { Help, HelpButton, useHelp } from "@/components/Help";
import { Screen } from "@/components/Screen";
import { Text } from "@/components/Text";
import { bootOnce } from "@/data/boot";
import { db } from "@/data/client";
import { getDeck, setHeart } from "@/data/drills";
import { getSettingsFor } from "@/data/settings";
import { useSession } from "@/state/session";
import { RADIUS, space } from "@/theme/layout";
import { makeStyles, useTheme } from "@/theme/useTheme";

/*
  The card turn.

  700ms is much slower than a UI transition, on purpose. This one is meant to be
  watched: the turn is what tells you the two faces are the same object, and
  anything quick enough to feel responsive reads as a swap instead. The easing
  is nearly all ease out, so the card leaves briskly and settles rather than
  stopping dead.

  perspective sits on the scene rather than the card, so the vanishing point
  belongs to the frame and the card rotates inside it.
*/
const FLIP_MS = 700;
const FLIP_EASING = Easing.bezier(0.16, 0.84, 0.28, 1);

const useStyles = makeStyles((t) => ({
  scene: { flex: 1, alignItems: "center", justifyContent: "center", width: "100%" },
  /*
    An explicit height, not minHeight. Both faces are absolutely positioned, so
    they contribute nothing to layout and a hug-content parent collapses to
    zero - which is exactly how this screen shipped blank.
  */
  card: { width: "100%", height: 280 },
  face: {
    position: "absolute",
    /* Explicit edges rather than `inset: 0`. React Native does not support the
       inset shorthand, so it is silently dropped and the face has no size. */
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    borderRadius: RADIUS.card,
    borderWidth: 1,
    borderColor: t.colors.rule,
    backgroundColor: t.colors.surface,
    alignItems: "center",
    justifyContent: "center",
    padding: space(3),
    gap: space(1),
    /* Keeps the far face from bleeding a hairline along the edge mid turn. */
    backfaceVisibility: "hidden",
  },
  /*
    The heart sits ON the card, in the corner, on BOTH faces.

    It used to be a line of text under the nav, which read as a caption about
    the card rather than as a mark on it - and it stayed put while the card
    turned, so nothing tied the two together. One per face, inside the
    transform, means it turns with the card and is only ever tappable on the
    side you can see.
  */
  heart: {
    position: "absolute",
    top: space(1.5),
    right: space(1.5),
    width: 44,
    height: 44,
    alignItems: "center",
    justifyContent: "center",
  },
  nav: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingTop: space(2) },
  counter: { minWidth: 80, textAlign: "center" },
}));

/* Drawn rather than a glyph so the outline and the filled state are the same
   shape, and so it takes a theme colour in both. */
function Heart({ filled, color }: { filled: boolean; color: string }) {
  return (
    <Svg width={22} height={22} viewBox="0 0 24 24">
      <Path
        d="M12 20.3l-1.5-1.35C5.4 14.36 2.5 11.72 2.5 8.5 2.5 6.02 4.42 4 6.9 4c1.4 0 2.75.66 3.6 1.7L12 7.1l1.5-1.4A4.74 4.74 0 0 1 17.1 4C19.58 4 21.5 6.02 21.5 8.5c0 3.22-2.9 5.86-8 10.45z"
        fill={filled ? color : "none"}
        stroke={color}
        strokeWidth={1.6}
        strokeLinejoin="round"
      />
    </Svg>
  );
}

/*
  The corner control, one per face.

  Hoisted rather than declared inside the screen: a component defined during
  render is a new type on every pass, so React tears the subtree down and builds
  it again each time - which for something sitting inside a running transform
  is a flicker waiting to happen.
*/
function HeartButton({
  hearted,
  onPress,
  style,
}: {
  hearted: boolean;
  onPress: () => void;
  style: StyleProp<ViewStyle>;
}) {
  const theme = useTheme();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={hearted ? "Unmark this word" : "Mark this word for more work"}
      hitSlop={8}
      style={style}
      onPress={onPress}
    >
      <Heart filled={hearted} color={hearted ? theme.colors.clay : theme.colors.inkFaint} />
    </Pressable>
  );
}

export default function Flashcards() {
  const s = useStyles();
  const router = useRouter();
  const profileId = useSession((st) => st.activeProfileId);
  const help = useHelp("cards");
  const boot = bootOnce();

  const start = useMemo(() => {
    if (profileId === null) return null;
    return {
      deck: getDeck(db, profileId),
      showHarakat: getSettingsFor(db, profileId).showHarakat,
    };
  }, [profileId]);

  const [index, setIndex] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [hearts, setHearts] = useState<Record<number, boolean>>({});
  const turn = useSharedValue(0);

  /*
    perspective comes FIRST in the transform array. React Native applies these
    in order, so a perspective listed after the rotation is applied to an
    already-flat result and the card turns without any depth at all.
  */
  const front = useAnimatedStyle(() => ({
    transform: [{ perspective: 1200 }, { rotateY: `${turn.value * 180}deg` }],
  }));
  const back = useAnimatedStyle(() => ({
    transform: [{ perspective: 1200 }, { rotateY: `${turn.value * 180 + 180}deg` }],
  }));

  if (profileId === null || !start) return null;

  if (start.deck.length === 0) {
    return (
      <Screen>
        <Text variant="pageTitle">No cards yet.</Text>
        <Button
          label="Back to today"
          variant="quiet"
          style={{ marginTop: space(3) }}
          onPress={() => router.back()}
        />
      </Screen>
    );
  }

  const card = start.deck[index];
  const hearted = hearts[card.cardId] ?? card.hearted;

  const toggleHeart = () => {
    const next = !hearted;
    setHearts((h) => ({ ...h, [card.cardId]: next }));
    if (boot.ok) setHeart(db, profileId, boot.deviceId, card.cardId, next);
  };

  const flip = () => {
    const next = flipped ? 0 : 1;
    setFlipped(!flipped);
    turn.value = withTiming(next, { duration: FLIP_MS, easing: FLIP_EASING });
  };

  const move = (delta: number) => {
    const next = Math.min(start.deck.length - 1, Math.max(0, index + delta));
    if (next === index) return;
    setIndex(next);
    setFlipped(false);
    turn.value = 0;
  };

  return (
    <Screen>
      {/* No confirmation: flashcards score nothing, so leaving discards
          nothing. */}
      <BackBar label="Leave" right={<HelpButton onPress={help.show} />} />

      <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
        <Text variant="eyebrow" color="inkSoft">
          Flashcards
        </Text>
      </View>

      <Pressable style={s.scene} onPress={flip} accessibilityRole="button">
        <View style={s.card}>
          {/*
            Both faces stay mounted and are hidden by backfaceVisibility, so the
            turn reveals the other side rather than swapping content halfway.
            pointerEvents follows the facing side so a tap always lands on the
            face you can actually see.
          */}
          <Animated.View
            pointerEvents={flipped ? "none" : "auto"}
            style={[s.face, front]}
          >
            <Arabic variant="card" showHarakat={start.showHarakat}>
              {card.arabic}
            </Arabic>
            <HeartButton hearted={hearted} onPress={toggleHeart} style={s.heart} />
          </Animated.View>

          <Animated.View
            pointerEvents={flipped ? "auto" : "none"}
            style={[s.face, back]}
          >
            <Text variant="pageTitle" style={{ textAlign: "center" }}>
              {card.english}
            </Text>
            {card.transliteration ? (
              <Text variant="label" color="inkSoft">
                {card.transliteration}
              </Text>
            ) : null}
            {card.plural ? (
              <Arabic variant="inline" showHarakat={start.showHarakat}>
                {card.plural}
              </Arabic>
            ) : null}
            <HeartButton hearted={hearted} onPress={toggleHeart} style={s.heart} />
          </Animated.View>
        </View>
      </Pressable>

      <View style={s.nav}>
        <Button label="Back" variant="quiet" onPress={() => move(-1)} />
        <Text color="inkSoft" style={s.counter}>
          {`${index + 1} / ${start.deck.length}`}
        </Text>
        <Button label="Next" variant="quiet" onPress={() => move(1)} />
      </View>

      <Help topic="cards" open={help.open} onClose={help.close} />
    </Screen>
  );
}
