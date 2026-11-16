import { useEffect, useState, type ReactNode } from "react";
import { AccessibilityInfo, Pressable, View, type StyleProp, type ViewStyle } from "react-native";

import { Text } from "@/components/Text";
import { RADIUS, space } from "@/theme/layout";
import { makeStyles, useTheme } from "@/theme/useTheme";

/*
  Liquid Glass, with the solid fallback, for every control that floats over
  content. One wrapper, used app wide.

  Rules it enforces by construction:
  - Glass is for controls. Content (Quran text, cards, the Ayah Field) never
    goes inside it, and there is no glass on glass.
  - Only the one primary action per screen is tinted lapis (`primary`).
  - Below iOS 26, without the native module, or with Reduce Transparency on, it
    is a solid surface with a hairline border and the same shape.

  The native module is resolved defensively. It is autolinked through
  expo-router in the shipped builds, but an over-the-air update can land on a
  binary that does not have it, and onboarding is the only way in for a new
  sign in, so a missing module must degrade to the fallback rather than throw.

  The fallback uses the app's own surface token rather than the spec's
  #FAF6EE / #181D2B: the spec says Durus tokens win where they differ.
*/

type GlassModule = typeof import("expo-glass-effect");

let glass: GlassModule | null | undefined;
function loadGlass(): GlassModule | null {
  if (glass !== undefined) return glass;
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const m: GlassModule = require("expo-glass-effect");
    glass = m.isLiquidGlassAvailable() ? m : null;
  } catch {
    glass = null;
  }
  return glass;
}

function useReduceTransparency(): boolean {
  const [on, setOn] = useState(false);
  useEffect(() => {
    let alive = true;
    AccessibilityInfo.isReduceTransparencyEnabled()
      .then((v) => alive && setOn(v))
      .catch(() => {});
    const sub = AccessibilityInfo.addEventListener("reduceTransparencyChanged", setOn);
    return () => {
      alive = false;
      sub.remove();
    };
  }, []);
  return on;
}

const useStyles = makeStyles((t) => ({
  solid: { backgroundColor: t.colors.surface, borderWidth: 1, borderColor: t.colors.rule },
  solidPrimary: { backgroundColor: t.colors.lapis, borderColor: t.colors.lapis },
  button: {
    minHeight: 54,
    borderRadius: RADIUS.pill,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: space(3),
    overflow: "hidden",
  },
}));

export function Glass({
  children,
  style,
  primary = false,
  interactive = false,
  tint,
}: {
  children?: ReactNode;
  style?: StyleProp<ViewStyle>;
  primary?: boolean;
  interactive?: boolean;
  /* A status tint (saffron for a memorized chip). Primary wins if both are set. */
  tint?: string;
}) {
  const s = useStyles();
  const theme = useTheme();
  const reduce = useReduceTransparency();
  const m = reduce ? null : loadGlass();

  if (m) {
    const { GlassView } = m;
    return (
      <GlassView
        /* The primary action also carries a solid lapis base, so it can never
           vanish: Begin did once, when glass failed to draw under a fade. */
        style={[style, primary ? { backgroundColor: theme.colors.lapis } : null]}
        glassEffectStyle="regular"
        isInteractive={interactive}
        tintColor={primary ? theme.colors.lapis : tint}
        colorScheme={theme.dark ? "dark" : "light"}
      >
        {children}
      </GlassView>
    );
  }
  return (
    <View style={[s.solid, tint ? { backgroundColor: tint, borderColor: tint } : null, primary && s.solidPrimary, style]}>
      {children}
    </View>
  );
}

/* A full width glass button. `primary` is the screen's one lapis action. */
export function GlassButton({
  label,
  onPress,
  primary = false,
  disabled = false,
}: {
  label: string;
  onPress: () => void;
  primary?: boolean;
  disabled?: boolean;
}) {
  const s = useStyles();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPress={onPress}
    >
      {/* Disabled is told by the label, not by fading the glass: opacity on
          glass is the one way the spec says never to animate it. */}
      <Glass primary={primary && !disabled} interactive={!disabled} style={s.button}>
        <Text color={disabled ? "inkFaint" : primary ? "paper" : "ink"}>{label}</Text>
      </Glass>
    </Pressable>
  );
}
