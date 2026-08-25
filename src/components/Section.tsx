import { useState } from "react";
import { Pressable, View } from "react-native";
import Animated, { FadeIn, FadeOut, LinearTransition } from "react-native-reanimated";
import Svg, { Path } from "react-native-svg";

import { Text } from "@/components/Text";
import { space } from "@/theme/layout";
import { makeStyles, useTheme } from "@/theme/useTheme";

const useStyles = makeStyles((t) => ({
  wrap: { borderBottomWidth: 1, borderBottomColor: t.colors.rule },
  head: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: space(2),
    gap: space(2),
  },
  body: { paddingBottom: space(2), gap: space(1) },
}));

/*
  One collapsible group of settings.

  Settings had grown to six groups shown at once, which is a long scroll of
  controls most of which are set once and never touched again. Collapsed, the
  screen is a list of six things you can read in a glance, and the one you came
  for is one tap away.

  Open state is per-section and deliberately NOT persisted: a settings screen
  that remembers which drawers were open reopens in a shape the user has to
  re-read every time, and the cheap default - everything shut - is also the
  legible one. `defaultOpen` exists for the group that is genuinely the reason
  most people are here.

  The chevron rotates rather than swapping between two glyphs, so the control
  reads as one object in two states.
*/
export function Section({
  title,
  defaultOpen = false,
  children,
}: {
  title: string;
  defaultOpen?: boolean;
  children: React.ReactNode;
}) {
  const s = useStyles();
  const theme = useTheme();
  const [open, setOpen] = useState(defaultOpen);

  return (
    /*
      The layout transition is on the wrapper, so opening one section slides the
      ones below it rather than making them jump. duration(), not the default:
      the default is a spring, and spec section 7.4 permits none anywhere.
    */
    <Animated.View style={s.wrap} layout={LinearTransition.duration(200)}>
      <Pressable
        accessibilityRole="button"
        accessibilityState={{ expanded: open }}
        accessibilityLabel={title}
        onPress={() => setOpen((o) => !o)}
        style={s.head}
      >
        <Text variant="eyebrow" color="inkSoft">
          {title}
        </Text>
        <Svg
          width={18}
          height={18}
          viewBox="0 0 24 24"
          style={{ transform: [{ rotate: open ? "180deg" : "0deg" }] }}
        >
          <Path
            d="M6 9l6 6 6-6"
            stroke={theme.colors.inkFaint}
            strokeWidth={1.75}
            strokeLinecap="round"
            strokeLinejoin="round"
            fill="none"
          />
        </Svg>
      </Pressable>

      {open ? (
        <Animated.View
          style={s.body}
          entering={FadeIn.duration(160)}
          exiting={FadeOut.duration(80)}
        >
          {children}
        </Animated.View>
      ) : null}
    </Animated.View>
  );
}

/* A group that is always visible, shaped like a Section so the two can sit in
   one list without the odd one out having different padding. */
export function OpenSection({ children }: { children: React.ReactNode }) {
  const s = useStyles();
  return <View style={[s.wrap, s.body, { paddingTop: space(2) }]}>{children}</View>;
}
