import { useRouter } from "expo-router";
import { Pressable, View } from "react-native";
import Svg, { Path } from "react-native-svg";

import { Text } from "@/components/Text";
import { space } from "@/theme/layout";
import { makeStyles, useTheme } from "@/theme/useTheme";

const useStyles = makeStyles(() => ({
  /*
    Back on the left, and nothing in the middle.

    It used to centre a title between the chevron and the right corner, which
    fought with the screen's own heading directly underneath - two titles, one
    of them small and off to the side, and the control that matters reading as
    a label rather than a way out. The bar does one job now.
  */
  bar: {
    height: 44,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: space(1),
  },
  /*
    A chevron AND the word, in the link colour.

    On its own, at inkSoft, in the top corner, it was a grey mark most people
    never saw - it read as part of the frame rather than as the way out. The
    word is what makes it a control, and lapis is what the rest of the app uses
    for "this is tappable".
  */
  hit: {
    flexDirection: "row",
    alignItems: "center",
    gap: space(0.5),
    height: 44,
    paddingRight: space(1),
  },
  right: { minWidth: 60, alignItems: "flex-end", justifyContent: "center" },
}));

/*
  A way back, on every screen that is not the root.

  Every drill had one and none of the reading screens did, which left Stats,
  Settings, About and a lesson reachable only by the system swipe - a gesture
  that is invisible, and that does nothing at all if the screen was reached by a
  replace rather than a push. Hence the fallback to Today rather than a bare
  router.back().

  There is no title. Every screen that uses this has its own heading a line
  below, and a second smaller one up here only competed with it.
*/
export function BackBar({
  fallback = "/today",
  right,
}: {
  fallback?: string;
  right?: React.ReactNode;
}) {
  const s = useStyles();
  const theme = useTheme();
  const router = useRouter();

  return (
    <View style={s.bar}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Go back"
        hitSlop={12}
        style={s.hit}
        onPress={() =>
          router.canGoBack() ? router.back() : router.replace(fallback as never)
        }
      >
        <Svg width={20} height={20} viewBox="0 0 24 24" fill="none">
          <Path
            d="M15 5l-7 7 7 7"
            stroke={theme.colors.lapis}
            strokeWidth={2}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </Svg>
        <Text color="lapis">Back</Text>
      </Pressable>

      <View style={{ flex: 1 }} />

      <View style={s.right}>{right}</View>
    </View>
  );
}
