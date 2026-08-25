import type { ReactNode } from "react";
import { View, type ViewStyle } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { MARGIN } from "@/theme/layout";
import { makeStyles } from "@/theme/useTheme";

const useStyles = makeStyles((t) => ({
  safe: { flex: 1, backgroundColor: t.colors.paper },
  body: { flex: 1, paddingHorizontal: MARGIN },
}));

export function Screen({
  children,
  style,
  edges = ["top", "bottom"],
}: {
  children: ReactNode;
  style?: ViewStyle;
  edges?: ("top" | "bottom" | "left" | "right")[];
}) {
  const s = useStyles();
  return (
    <SafeAreaView style={s.safe} edges={edges}>
      <View style={[s.body, style]}>{children}</View>
    </SafeAreaView>
  );
}
