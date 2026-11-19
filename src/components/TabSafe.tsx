import { useContext, type ReactNode } from "react";
import { View, type StyleProp, type ViewStyle } from "react-native";
import { SafeAreaInsetsContext, initialWindowMetrics } from "react-native-safe-area-context";

/*
  The top safe area for the five tabs, as a fixed number from launch.

  Each native tab is its own screen with its own safe-area measurement. The
  first time a tab opens, that measurement briefly reads the inset as zero
  and then corrects it, so the whole page jumped down a status bar's height:
  the "flash to adjust" on first switching to a tab. The app is portrait
  only, so the window's top inset at launch is the right value for every tab
  and never changes; using it means there is nothing to correct.

  Tabs only. Sheets and pushed screens keep the ordinary SafeAreaView.
*/
export function useTabTop(): number {
  const live = useContext(SafeAreaInsetsContext);
  return initialWindowMetrics?.insets.top ?? live?.top ?? 0;
}

export function TabSafe({ style, children }: { style?: StyleProp<ViewStyle>; children: ReactNode }) {
  const top = useTabTop();
  return <View style={[style, { paddingTop: top }]}>{children}</View>;
}
