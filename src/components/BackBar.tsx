import { useRouter } from "expo-router";
import { Pressable, View } from "react-native";
import Svg, { Path } from "react-native-svg";

import { Text } from "@/components/Text";
import { space } from "@/theme/layout";
import { makeStyles, useTheme } from "@/theme/useTheme";

const useStyles = makeStyles(() => ({
  bar: {
    height: 40,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: space(1),
  },
  /* The chevron is small; the tap target must not be. */
  hit: { width: 44, height: 40, justifyContent: "center" },
  right: { minWidth: 44, alignItems: "flex-end", justifyContent: "center" },
  title: { flex: 1, textAlign: "center" },
}));

/*
  A way back, on every screen that is not the root.

  Every drill had one and none of the reading screens did, which left Stats,
  Settings, About and a lesson reachable only by the system swipe - a gesture
  that is invisible, and that does nothing at all if the screen was reached by a
  replace rather than a push. Hence the fallback to Today rather than a bare
  router.back().

  The title is optional and centred between the two corners, which reserve equal
  width so it sits on the screen's true centre whether or not anything is on the
  right.
*/
export function BackBar({
  title,
  fallback = "/today",
  right,
}: {
  title?: string;
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
        <Svg width={22} height={22} viewBox="0 0 24 24" fill="none">
          <Path
            d="M15 5l-7 7 7 7"
            stroke={theme.colors.inkSoft}
            strokeWidth={1.6}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </Svg>
      </Pressable>

      {title ? (
        <Text variant="eyebrow" color="inkSoft" style={s.title}>
          {title}
        </Text>
      ) : (
        <View style={{ flex: 1 }} />
      )}

      <View style={s.right}>{right}</View>
    </View>
  );
}
