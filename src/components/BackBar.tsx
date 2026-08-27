import { useRouter } from "expo-router";
import { Alert, Pressable, View } from "react-native";
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

  It is also the way out of every DRILL, which is why it takes a label and a
  confirmation. Before this, review had a faint chevron in the top left, speed
  and the case drill had a "Leave" at the bottom of the page, and flashcards
  had a "Done" - three placements and three words for one action, none of them
  where the rest of the app puts it.
*/
export function BackBar({
  fallback = "/today",
  right,
  label = "Back",
  confirm,
}: {
  fallback?: string;
  right?: React.ReactNode;
  /* "Leave" inside a drill, "Back" everywhere else. Same control, and the word
     is the only thing that changes. */
  label?: string;
  /*
    Asks first, and only where something would actually be lost.

    Answers are written to SQLite the moment they are given, so leaving a
    review costs nothing and a confirmation would be theatre. A speed or case
    run is scored as a run, so abandoning one does discard that result even
    though every answer in it is already recorded.
  */
  confirm?: { title: string; message: string };
}) {
  const s = useStyles();
  const theme = useTheme();
  const router = useRouter();

  const leave = () =>
    router.canGoBack() ? router.back() : router.replace(fallback as never);

  const onPress = () => {
    if (!confirm) {
      leave();
      return;
    }
    Alert.alert(confirm.title, confirm.message, [
      { text: "Stay", style: "cancel" },
      { text: "Leave", style: "destructive", onPress: leave },
    ]);
  };

  return (
    <View style={s.bar}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={label === "Back" ? "Go back" : "Leave this drill"}
        hitSlop={12}
        style={s.hit}
        onPress={onPress}
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
        <Text color="lapis">{label}</Text>
      </Pressable>

      <View style={{ flex: 1 }} />

      <View style={s.right}>{right}</View>
    </View>
  );
}
