import { usePathname } from "expo-router";
import { Pressable } from "react-native";
import Svg, { Circle, Path } from "react-native-svg";

import { useThemeChoice } from "@/state/theme";
import { useTheme } from "@/theme/useTheme";

/* The review card face stays bare. Nothing to tap but the card. */
const HIDDEN_ON = ["/review"];

/*
  A sun and a moon in the corner. Flat: no border, no fill, no circle. It is a
  glyph rather than a control competing with the primary button, and the 40pt
  box is only there so a thumb has something to land on.

  Two states only, light and dark. System stays available in Settings for anyone
  who wants it, but a corner control that cycles three ways is a control you
  have to think about.
*/
export function ThemeToggle() {
  const theme = useTheme();
  const toggle = useThemeChoice((s) => s.toggle);
  const pathname = usePathname();

  if (HIDDEN_ON.some((p) => pathname.startsWith(p))) return null;

  const dark = theme.dark;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={dark ? "Switch to light" : "Switch to dark"}
      onPress={() => toggle(dark)}
      style={({ pressed }) => ({
        width: 40,
        height: 40,
        alignItems: "center",
        justifyContent: "center",
        opacity: pressed ? 1 : 0.7,
      })}
    >
      {dark ? (
        <Svg width={18} height={18} viewBox="0 0 24 24" fill="none">
          <Circle
            cx={12}
            cy={12}
            r={4.2}
            stroke={theme.colors.saffron}
            strokeWidth={1.6}
            strokeLinecap="round"
          />
          <Path
            d="M12 2.6v2.2M12 19.2v2.2M2.6 12h2.2M19.2 12h2.2M5.4 5.4l1.6 1.6M17 17l1.6 1.6M18.6 5.4L17 7M7 17l-1.6 1.6"
            stroke={theme.colors.saffron}
            strokeWidth={1.6}
            strokeLinecap="round"
          />
        </Svg>
      ) : (
        <Svg width={18} height={18} viewBox="0 0 24 24" fill="none">
          <Path
            d="M20 13.4A8.2 8.2 0 1 1 10.6 4a6.6 6.6 0 0 0 9.4 9.4z"
            stroke={theme.colors.lapis}
            strokeWidth={1.6}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </Svg>
      )}
    </Pressable>
  );
}
