import { useRouter } from "expo-router";
import { Alert, Pressable } from "react-native";

import { Text } from "@/components/Text";

/*
  The way out of a drill.

  Confirms only when something would be lost. Answers are written to SQLite the
  moment they are given, so leaving a review session mid-way costs nothing and a
  confirmation would be theatre. A speed or case run is different: it is scored
  as a run, so abandoning one does discard the run's result even though the
  individual answers are already recorded.
*/
export function ExitDrill({
  confirm = false,
  label = "Done",
}: {
  confirm?: boolean;
  label?: string;
}) {
  const router = useRouter();

  const leave = () => {
    if (!router.canGoBack()) {
      router.replace("/today");
      return;
    }
    router.back();
  };

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel="Leave this drill"
      hitSlop={12}
      onPress={() => {
        if (!confirm) {
          leave();
          return;
        }
        Alert.alert("Leave this run?", "The answers you have given are kept.", [
          { text: "Stay", style: "cancel" },
          { text: "Leave", style: "destructive", onPress: leave },
        ]);
      }}
    >
      <Text variant="label" color="inkFaint">
        {label}
      </Text>
    </Pressable>
  );
}
