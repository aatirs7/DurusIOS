import { useCallback, useEffect, useRef, useState } from "react";
import { Pressable, View, type LayoutChangeEvent } from "react-native";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import Animated, { FadeIn, useReducedMotion } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { GlassButton } from "@/components/Glass";
import { Text } from "@/components/Text";
import { haptics } from "@/lib/haptics";
import { MARGIN, space } from "@/theme/layout";
import { makeStyles } from "@/theme/useTheme";

import { STORY } from "./heroes";

/*
  The five page story (one per tab, in tab order), with Instagram story mechanics.

  - A thin five segment bar at the very top fills over each page's time.
  - Tap the right half for next, the left half for back. Press and hold to
    pause. A horizontal swipe also moves.
  - Each page advances after its own time (STORY[].ms). Under Reduce Motion nothing advances on
    its own and every hero shows its final frame.
  - Continue and Skip both leave the story.

  Time is kept on the JS side at a fixed tick rather than in a Reanimated
  timing, because pausing and resuming a timing mid flight loses its place;
  the bar is thin and twenty updates a second is plenty for it.
*/

/* The default page length; a page can set its own (STORY[].ms). */
export const PAGE_MS = 5000;
const TICK_MS = 50;

const useStyles = makeStyles((t) => ({
  root: { flex: 1 },
  bar: {
    flexDirection: "row",
    gap: 4,
    paddingHorizontal: MARGIN,
    paddingTop: space(1),
  },
  seg: {
    flex: 1,
    height: 3,
    borderRadius: 2,
    backgroundColor: t.colors.rule,
    overflow: "hidden",
  },
  fill: { height: 3, borderRadius: 2, backgroundColor: t.colors.lapis },
  skipRow: {
    flexDirection: "row",
    justifyContent: "flex-end",
    paddingHorizontal: MARGIN,
    paddingTop: space(1),
  },
  hero: { flex: 1 },
  copy: {
    alignItems: "center",
    gap: space(1),
    paddingHorizontal: MARGIN,
    minHeight: 130,
  },
  title: { fontSize: 34, lineHeight: 40, textAlign: "center" },
  line: { fontSize: 17, lineHeight: 24, textAlign: "center", maxWidth: 320 },
  actions: { paddingHorizontal: MARGIN, paddingBottom: space(1) },
}));

/*
  The bar owns the clock, so only the bar re-renders on each tick and the hero
  above it does not. It is remounted per page, which is what resets it.
*/
function StoryBar({
  page,
  paused,
  still,
  onEnd,
}: {
  page: number;
  paused: boolean;
  still: boolean;
  onEnd?: () => void;
}) {
  const s = useStyles();
  const ms = STORY[page]?.ms ?? PAGE_MS;
  const [elapsed, setElapsed] = useState(0);
  const ended = useRef(false);

  useEffect(() => {
    if (still || paused) return;
    const id = setInterval(() => setElapsed((e) => e + TICK_MS), TICK_MS);
    return () => clearInterval(id);
  }, [still, paused]);

  useEffect(() => {
    if (elapsed >= ms && !ended.current && onEnd) {
      ended.current = true;
      onEnd();
    }
  }, [elapsed, onEnd, ms]);

  const fill = still ? 1 : Math.min(1, elapsed / ms);
  return (
    <View
      style={s.bar}
      accessibilityRole="progressbar"
      accessibilityValue={{ min: 1, max: STORY.length, now: page + 1 }}
    >
      {STORY.map((p, i) => (
        <View key={p.key} style={s.seg}>
          <View
            style={[
              s.fill,
              { width: `${i < page ? 100 : i === page ? fill * 100 : 0}%` },
            ]}
          />
        </View>
      ))}
    </View>
  );
}

export function Story({ onDone }: { onDone: () => void }) {
  const s = useStyles();
  const insets = useSafeAreaInsets();
  const still = useReducedMotion();
  const [page, setPage] = useState(0);
  const [paused, setPaused] = useState(false);
  const [size, setSize] = useState({ width: 0, height: 0 });
  const done = useRef(false);

  const go = useCallback(
    (next: number) => {
      if (next < 0) {
        setRestart((n) => n + 1);
        return;
      }
      if (next >= STORY.length) {
        if (!done.current) {
          done.current = true;
          onDone();
        }
        return;
      }
      haptics.select();
      setPage(next);
    },
    [onDone],
  );

  /* Bumped to restart the current page's bar (tap left on the first page). */
  const [restart, setRestart] = useState(0);

  const tap = Gesture.Tap()
    .runOnJS(true)
    .onEnd((e) => {
      go(e.x < size.width / 2 ? page - 1 : page + 1);
    });
  const hold = Gesture.LongPress()
    .runOnJS(true)
    .minDuration(220)
    .onStart(() => setPaused(true))
    .onFinalize(() => setPaused(false));
  const swipe = Gesture.Pan()
    .runOnJS(true)
    .activeOffsetX([-24, 24])
    .onEnd((e) => {
      if (e.translationX < -40) go(page + 1);
      else if (e.translationX > 40) go(page - 1);
    });
  const gesture = Gesture.Exclusive(swipe, hold, tap);

  const onLayout = (e: LayoutChangeEvent) => {
    const { width, height } = e.nativeEvent.layout;
    setSize({ width, height });
  };

  const item = STORY[page];
  const Hero = item.Hero;

  return (
    <View
      style={[s.root, { paddingTop: insets.top, paddingBottom: insets.bottom }]}
    >
      <StoryBar
        key={`${page}-${restart}`}
        page={page}
        paused={paused}
        still={still}
        /* The last page waits for Continue rather than leaving on its own. */
        onEnd={page < STORY.length - 1 ? () => go(page + 1) : undefined}
      />
      <View style={s.skipRow}>
        <Pressable accessibilityRole="button" onPress={onDone} hitSlop={12}>
          <Text variant="label" color="inkSoft">
            Skip
          </Text>
        </Pressable>
      </View>

      <GestureDetector gesture={gesture}>
        <View style={s.hero} onLayout={onLayout} testID="story-stage">
          {size.width > 0 ? (
            /* No fade here: the Learn and Ask heroes hold glass, which does not
               draw under an animated opacity. Each hero animates itself. */
            <View key={item.key} style={{ flex: 1 }}>
              <Hero
                width={size.width}
                height={size.height}
                active
                still={still}
                paused={paused}
              />
            </View>
          ) : null}
        </View>
      </GestureDetector>

      <Animated.View
        key={`copy-${item.key}`}
        entering={FadeIn.duration(260)}
        style={s.copy}
      >
        <Text variant="pageTitle" style={s.title}>
          {item.title}
        </Text>
        <Text color="inkSoft" style={s.line}>
          {item.line}
        </Text>
      </Animated.View>

      <View style={s.actions}>
        <GlassButton
          label="Continue"
          primary
          onPress={() => go(page + 1 >= STORY.length ? STORY.length : page + 1)}
        />
      </View>
    </View>
  );
}
