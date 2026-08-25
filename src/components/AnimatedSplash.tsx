import { useEffect } from "react";
import { Image, StyleSheet } from "react-native";
import Animated, {
  Easing,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withTiming,
} from "react-native-reanimated";

import { ENTER_MS, SPLASH_HOLD_MS } from "@/theme/layout";
import { useTheme } from "@/theme/useTheme";

/*
  A second splash, drawn by us, that fades out.

  iOS gives no way to hold the launch image or to animate its dismissal - it is
  swapped out the instant the app draws its first frame, which reads as a cut
  rather than a hand-off. The only workaround is to draw the same thing again in
  JavaScript the moment the native one goes, hold it briefly, and fade it.

  It has to match the native splash exactly or the swap is visible: same mark,
  same width (200pt, per app.json imageWidth), same ground. The app is already
  mounted underneath, so the fade reveals a finished screen rather than an empty
  frame.
*/
export function AnimatedSplash({ onDone }: { onDone: () => void }) {
  const theme = useTheme();
  const opacity = useSharedValue(1);

  useEffect(() => {
    opacity.value = withDelay(
      SPLASH_HOLD_MS,
      withTiming(
        0,
        /* The same curve as globals.css durus-enter. Nearly all ease-out, so it
           leaves briskly and settles rather than stopping dead. */
        { duration: ENTER_MS, easing: Easing.bezier(0.2, 0, 0.1, 1) },
        (finished) => {
          if (finished) runOnJS(onDone)();
        },
      ),
    );
  }, [opacity, onDone]);

  const style = useAnimatedStyle(() => ({ opacity: opacity.value }));

  return (
    <Animated.View
      pointerEvents="none"
      style={[
        StyleSheet.absoluteFill,
        { backgroundColor: theme.colors.paper, alignItems: "center", justifyContent: "center" },
        style,
      ]}
    >
      <Image
        source={
          theme.dark
            ? require("@/assets/brand/splash-dark.png")
            : require("@/assets/brand/splash.png")
        }
        style={{ width: 200, height: 100 }}
        resizeMode="contain"
        fadeDuration={0}
      />
    </Animated.View>
  );
}
