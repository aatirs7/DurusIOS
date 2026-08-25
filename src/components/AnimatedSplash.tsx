import * as SplashScreen from "expo-splash-screen";
import { useCallback, useEffect, useRef } from "react";
import { Appearance, Image, StyleSheet } from "react-native";
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

  It has to match the native splash exactly or the swap is visible: same mark,
  same width (SPLASH_IMAGE_WIDTH, which app.json's imageWidth also uses), and
  the same ground.

  "The same ground" is the subtle one, and it is NOT the app's theme.

  app.json sets userInterfaceStyle "automatic", so iOS draws the launch screen
  from the SYSTEM appearance - before a line of JavaScript has run, and long
  before anything knows which theme the user toggled. A phone in system dark
  running the app in light therefore gets the DARK launch image, and drawing
  this one in the app's theme put a light screen immediately after it. That
  mismatch is what read as a flash of dark blue, and it is a mismatch of
  COLOUR, so no amount of adjusting when the hand-off happens can fix it.

  So this draws the scheme the native splash actually used, and the fade is
  what carries the eye from there to the app's own theme - a crossfade rather
  than a cut. When the two agree, which is most of the time, none of this is
  visible at all.
*/

/*
  Read at module scope, which is before any effect has run.

  RootLayout calls Appearance.setColorScheme to push the chosen theme into the
  OS, and that changes what getColorScheme() returns. Reading it during render
  or from an effect would hand back the app's theme, which is precisely the
  value that must not be used here. Module evaluation happens at bundle load,
  so this is the appearance iOS drew the launch screen with.
*/
const LAUNCH_THEME = THEMES[Appearance.getColorScheme() === "dark" ? "dark" : "light"];

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
          backgroundColor: LAUNCH_THEME.colors.paper,
          alignItems: "center",
          justifyContent: "center",
        },
        style,
      ]}
    >
      <Image
        source={
          LAUNCH_THEME.dark
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
