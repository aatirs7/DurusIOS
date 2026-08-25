import * as SplashScreen from "expo-splash-screen";
import { useCallback, useEffect, useRef } from "react";
import { Image, StyleSheet } from "react-native";
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
import { THEMES } from "@/theme/tokens";

/*
  A second splash, drawn by us, that fades out.

  iOS gives no way to hold the launch image or to animate its dismissal - it is
  swapped out the instant the app draws its first frame, which reads as a cut
  rather than a hand-off. The only workaround is to draw the same thing again in
  JavaScript the moment the native one goes, hold it briefly, and fade it.

  THE SPLASH IS ALWAYS LIGHT, IN BOTH THEMES. That is a decision, not an
  oversight, and it is what makes this simple.

  iOS chooses the launch image from the SYSTEM appearance, before a line of
  JavaScript has run and long before anything can know which theme the user
  toggled. That asset is static and no API makes it follow an in-app setting. So
  as long as there were two of them, the one iOS picked could always contradict
  the one the app wanted, and every fix for that was a way of dressing up the
  contradiction: match the app and cut hard from the launch image, match the
  launch image and let the device appear to override the user, or crossfade
  between them and show both.

  Removing the dark variant removes the contradiction instead. app.json ships a
  single light splash, iOS has nothing to choose between, and this draws the
  same one. The hand-off is pixel-identical by construction. What follows it -
  onboarding, Today, everything - is the theme the user actually chose, and the
  fade from a light splash into a dark app is a crossfade rather than a cut.
*/
const SPLASH_THEME = THEMES.light;

export function AnimatedSplash({ onDone }: { onDone: () => void }) {
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

    Guarded with a ref rather than state: onLayout fires again on every rotation
    and on the keyboard appearing, and hideAsync on an already hidden splash is
    a rejected promise rather than a no-op.
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
        {
          backgroundColor: SPLASH_THEME.colors.paper,
          alignItems: "center",
          justifyContent: "center",
        },
        style,
      ]}
    >
      <Image
        source={require("@/assets/brand/splash.png")}
        style={{ width: SPLASH_IMAGE_WIDTH, height: SPLASH_IMAGE_HEIGHT }}
        resizeMode="contain"
        fadeDuration={0}
      />
    </Animated.View>
  );
}
