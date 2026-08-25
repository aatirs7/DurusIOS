import { useCallback, useEffect, useRef } from "react";
import { Image, StyleSheet } from "react-native";
import * as SplashScreen from "expo-splash-screen";
import Animated, {
  Easing,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withTiming,
} from "react-native-reanimated";

import {
  SPLASH_FADE_MS,
  SPLASH_HOLD_MS,
  SPLASH_IMAGE_HEIGHT,
  SPLASH_IMAGE_WIDTH,
} from "@/theme/layout";
import { useTheme } from "@/theme/useTheme";

/*
  A second splash, drawn by us, that fades out.

  iOS gives no way to hold the launch image or to animate its dismissal - it is
  swapped out the instant the app draws its first frame, which reads as a cut
  rather than a hand-off. The only workaround is to draw the same thing again in
  JavaScript the moment the native one goes, hold it briefly, and fade it.

  It has to match the native splash exactly or the swap is visible: same mark,
  same width (SPLASH_IMAGE_WIDTH, which app.json's imageWidth also uses), same
  ground. The app is already
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
        /*
          Ease-IN-out rather than the app's usual ease-out curve. The mark
          should linger a moment longer before it starts to go, so the fade
          begins imperceptibly instead of the opacity dropping the instant the
          hold expires - which is what made a 550ms hold read as an abrupt cut.
        */
        { duration: SPLASH_FADE_MS, easing: Easing.bezier(0.4, 0, 0.2, 1) },
        (finished) => {
          if (finished) runOnJS(onDone)();
        },
      ),
    );
  }, [opacity, onDone]);

  const style = useAnimatedStyle(() => ({ opacity: opacity.value }));

  /*
    The hand-off. The native splash is dismissed only once THIS view has been
    laid out, so the drawn one is already on screen underneath it and there is
    no frame in between showing the bare window.

    Guarded with a ref rather than state: onLayout fires again on every
    rotation and on the keyboard appearing, and hideAsync on an already hidden
    splash is a rejected promise rather than a no-op.
  */
  const handedOff = useRef(false);
  const onLayout = useCallback(() => {
    if (handedOff.current) return;
    handedOff.current = true;
    SplashScreen.hideAsync().catch(() => {});
  }, []);

  return (
    <Animated.View
      onLayout={onLayout}
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
        style={{ width: SPLASH_IMAGE_WIDTH, height: SPLASH_IMAGE_HEIGHT }}
        resizeMode="contain"
        fadeDuration={0}
      />
    </Animated.View>
  );
}
