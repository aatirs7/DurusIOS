import type { ReactNode } from "react";
import { useRouter } from "expo-router";
import { Pressable, View } from "react-native";
import Svg, { Circle, Path } from "react-native-svg";

import { Text } from "@/components/Text";
import { ThemeToggle } from "@/components/ThemeToggle";
import { MARGIN, space } from "@/theme/layout";
import { FONTS } from "@/theme/typography";
import { makeStyles, useTheme } from "@/theme/useTheme";

/*
  The one top bar every tab shares, so switching tabs never moves anything:
  the same height, the same distance from the top, the title centred, and the
  theme toggle and the Settings gear in the same spot at the right. A tab's own action (Progress's
  Mark) goes in the left slot, never next to the toggle.

  `inset` adds the page margin for screens whose body has none.
*/

export const TOP_BAR_HEIGHT = 72;

const SLOT = 88;

const useStyles = makeStyles(() => ({
  bar: { height: TOP_BAR_HEIGHT, flexDirection: "row", alignItems: "center", paddingTop: space(2.5) },
  slot: { width: SLOT, flexDirection: "row", alignItems: "center" },
  middle: { flex: 1, alignItems: "center", justifyContent: "center", gap: 1 },
  title: { fontFamily: FONTS.uiMedium, fontSize: 17, lineHeight: 22, textAlign: "center" },
}));

/* Settings, from every tab: a flat glyph like the theme toggle beside it. */
function SettingsGear() {
  const theme = useTheme();
  const router = useRouter();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel="Settings"
      onPress={() => router.push("/settings")}
      style={({ pressed }) => ({
        width: 40,
        height: 40,
        alignItems: "center",
        justifyContent: "center",
        opacity: pressed ? 1 : 0.7,
      })}
    >
      <Svg width={19} height={19} viewBox="0 0 24 24" fill="none">
        <Circle cx={12} cy={12} r={3} stroke={theme.colors.lapis} strokeWidth={1.6} />
        <Path
          d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 11-2.83 2.83l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 11-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 11-2.83-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 110-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 112.83-2.83l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 114 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 112.83 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 110 4h-.09a1.65 1.65 0 00-1.51 1z"
          stroke={theme.colors.lapis}
          strokeWidth={1.6}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </Svg>
    </Pressable>
  );
}

export function TopBar({ title, subtitle, left, inset = false }: { title: string; subtitle?: string | null; left?: ReactNode; inset?: boolean }) {
  const s = useStyles();
  return (
    <View style={[s.bar, inset && { paddingHorizontal: MARGIN }]}>
      <View style={[s.slot, { justifyContent: "flex-start" }]}>{left ?? null}</View>
      <View style={s.middle}>
        <Text style={s.title} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.75} accessibilityRole="header">
          {title}
        </Text>
        {subtitle ? (
          <Text variant="label" color="inkSoft" numberOfLines={1}>
            {subtitle}
          </Text>
        ) : null}
      </View>
      <View style={[s.slot, { justifyContent: "flex-end", marginRight: -8 }]}>
        <ThemeToggle />
        <SettingsGear />
      </View>
    </View>
  );
}
