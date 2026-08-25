import { useRouter } from "expo-router";
import { useMemo, useState } from "react";
import { Pressable, View } from "react-native";
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";

import { Arabic } from "@/components/Arabic";
import { Button } from "@/components/Button";
import { ExitDrill } from "@/components/ExitDrill";
import { Help, HelpButton, useHelp } from "@/components/Help";
import { Screen } from "@/components/Screen";
import { Text } from "@/components/Text";
import { bootOnce } from "@/data/boot";
import { db } from "@/data/client";
import { getDeck, setHeart } from "@/data/drills";
import { getSettingsFor } from "@/data/settings";
import { useSession } from "@/state/session";
import { RADIUS, space } from "@/theme/layout";
import { makeStyles } from "@/theme/useTheme";

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
  nav: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingTop: space(2) },
  counter: { minWidth: 80, textAlign: "center" },
}));

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
      <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
        <Text variant="eyebrow" color="inkSoft">
          Flashcards
        </Text>
        <HelpButton onPress={help.show} />
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

      <View style={{ flexDirection: "row", justifyContent: "space-between", paddingTop: space(1) }}>
        <Pressable
          onPress={() => {
            const next = !hearted;
            setHearts((h) => ({ ...h, [card.cardId]: next }));
            if (boot.ok) setHeart(db, profileId, boot.deviceId, card.cardId, next);
          }}
        >
          <Text color={hearted ? "clay" : "inkFaint"}>
            {hearted ? "Marked for more work" : "Mark for more work"}
          </Text>
        </Pressable>
        <ExitDrill />
      </View>
      <Help topic="cards" open={help.open} onClose={help.close} />
    </Screen>
  );
}
