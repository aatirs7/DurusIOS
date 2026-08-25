import * as SplashScreen from "expo-splash-screen";
import { useCallback, useEffect, useRef } from "react";
import { Appearance, Image, StyleSheet, type ImageSourcePropType } from "react-native";
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
  SPLASH_MORPH_MS,
} from "@/theme/layout";
import { THEMES, type Theme } from "@/theme/tokens";
import { useTheme } from "@/theme/useTheme";

/*
  A second splash, drawn by us, that fades out.

  iOS gives no way to hold the launch image or to animate its dismissal - it is
  swapped out the instant the app draws its first frame, which reads as a cut
  rather than a hand-off. The only workaround is to draw the same thing again in
  JavaScript the moment the native one goes, hold it briefly, and fade it.

  THE CONSTRAINT THAT SHAPES ALL OF THIS

  app.json sets userInterfaceStyle "automatic", so iOS chooses the launch image
  from the SYSTEM appearance, before a line of JavaScript has run and long
  before anything can know which theme the user toggled. That asset is static
  and there is no API that makes it follow an in-app setting. Forcing
  UIUserInterfaceStyle in Info.plist would pin it, but it would also pin every
  keyboard, alert and action sheet in the app to one appearance, and it would
  simply move the mismatch to whoever chose the other theme.

  So a phone in system dark running Durus in light gets a DARK launch image, and
  there is no version of this where that does not happen. What there is a
  version of is what happens NEXT:

    drawn in the app's theme   -> a hard cut from the launch image to it
    drawn in the launch theme  -> seamless, but the device appears to override
                                  a setting the user chose

  Neither is right, so this does both in order. It opens on the launch scheme -
  pixel-identical to what iOS just had on screen, so the hand-off is invisible -
  and then crossfades to the app's own theme over SPLASH_MORPH_MS before the
  hold begins. The colour change becomes a deliberate transition rather than a
  flash, and the theme the user chose is the one left standing.

  When the two schemes agree, which is most of the time, the morph is a no-op
  between two identical layers and none of this is visible at all.
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

/* Required at module scope: a require() inside the component would be resolved
   on every render, and Metro wants these static anyway. */
const LIGHT_MARK = require("@/assets/brand/splash.png") as ImageSourcePropType;
const DARK_MARK = require("@/assets/brand/splash-dark.png") as ImageSourcePropType;

const markFor = (theme: Theme) => (theme.dark ? DARK_MARK : LIGHT_MARK);

/* One full-screen splash in a given scheme. Two of these are stacked. */
function Layer({ theme, style }: { theme: Theme; style?: object }) {
  return (
    <Animated.View
      pointerEvents="none"
      style={[
        StyleSheet.absoluteFill,
        {
          backgroundColor: theme.colors.paper,
          alignItems: "center",
          justifyContent: "center",
        },
        style,
      ]}
    >
      <Image
        source={markFor(theme)}
        style={{ width: SPLASH_IMAGE_WIDTH, height: SPLASH_IMAGE_HEIGHT }}
        resizeMode="contain"
        fadeDuration={0}
      />
    </Animated.View>
  );
}

export function AnimatedSplash({ onDone }: { onDone: () => void }) {
  const theme = useTheme();

  /* The launch layer on top, fading away to reveal the app-themed one under
     it. Starts fully opaque so the first frame matches the native splash. */
  const launch = useSharedValue(1);
  /* The pair as a whole, fading away to reveal the app. */
  const whole = useSharedValue(1);

  const sameScheme = theme.key === LAUNCH_THEME.key;

  useEffect(() => {
    /* Nothing to morph between when the schemes already agree. */
    launch.value = sameScheme
      ? 0
      : withTiming(0, {
          duration: SPLASH_MORPH_MS,
          easing: Easing.bezier(0.4, 0, 0.2, 1),
        });

    whole.value = withDelay(
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
  }, [launch, whole, onDone, sameScheme]);

  const wholeStyle = useAnimatedStyle(() => ({ opacity: whole.value }));
  const launchStyle = useAnimatedStyle(() => ({ opacity: launch.value }));

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
      style={[StyleSheet.absoluteFill, wholeStyle]}
    >
      {/* Underneath: the theme the user chose, which is what is left standing. */}
      <Layer theme={theme} />
      {/* On top: what iOS just had on screen, fading off it. */}
      {sameScheme ? null : <Layer theme={LAUNCH_THEME} style={launchStyle} />}
    </Animated.View>
  );
}
