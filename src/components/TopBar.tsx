import type { ReactNode } from "react";
import { View } from "react-native";

import { Text } from "@/components/Text";
import { ThemeToggle } from "@/components/ThemeToggle";
import { MARGIN, space } from "@/theme/layout";
import { FONTS } from "@/theme/typography";
import { makeStyles } from "@/theme/useTheme";

/*
  The one top bar every tab shares, so switching tabs never moves anything:
  the same height, the same distance from the top, the title centred, and the
  theme toggle in the same spot at the right. A tab's own action (Progress's
  Mark) goes in the left slot, never next to the toggle.

  `inset` adds the page margin for screens whose body has none.
*/

export const TOP_BAR_HEIGHT = 56;

const SLOT = 88;

const useStyles = makeStyles(() => ({
  bar: { height: TOP_BAR_HEIGHT, flexDirection: "row", alignItems: "center", paddingTop: space(0.5) },
  slot: { width: SLOT, flexDirection: "row", alignItems: "center" },
  middle: { flex: 1, alignItems: "center", justifyContent: "center", gap: 1 },
  title: { fontFamily: FONTS.uiMedium, fontSize: 17, lineHeight: 22, textAlign: "center" },
}));

export function TopBar({ title, subtitle, left, inset = false }: { title: string; subtitle?: string | null; left?: ReactNode; inset?: boolean }) {
  const s = useStyles();
  return (
    <View style={[s.bar, inset && { paddingHorizontal: MARGIN }]}>
      <View style={[s.slot, { justifyContent: "flex-start" }]}>{left ?? null}</View>
      <View style={s.middle}>
        <Text style={s.title} numberOfLines={1} accessibilityRole="header">
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
      </View>
    </View>
  );
}
