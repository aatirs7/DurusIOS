import { NativeTabs } from "expo-router/unstable-native-tabs";

import { useTheme } from "@/theme/useTheme";

/*
  The expansion's tab shell.

  NativeTabs is the system UITabBarController, so on iOS 26 the bar is Liquid
  Glass for free and shrinks on scroll; below 26 it is the ordinary system bar.
  No custom tab bar, by spec.

  Learn is the existing Durus app. Its route stays /today (a group segment adds
  nothing to the URL), so every "Back to today" and every deep link that
  already points there keeps working without being touched.

  Lapis tints only the selected tab, which is the one primary action the bar
  has.
*/
export default function TabsLayout() {
  const theme = useTheme();

  return (
    <NativeTabs tintColor={theme.colors.lapis} minimizeBehavior="onScrollDown">
      {/* Search is home: the app opens here, to a centred search bar, the way
          Claude opens. It is an ordinary first tab, not the separate search
          circle, so getting back to it is one tap on the bar like any other. */}
      <NativeTabs.Trigger name="home">
        <NativeTabs.Trigger.Label>Search</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon sf="magnifyingglass" />
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="read">
        <NativeTabs.Trigger.Label>Read</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon sf={{ default: "book", selected: "book.fill" }} />
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="map">
        <NativeTabs.Trigger.Label>Progress</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon sf={{ default: "chart.pie", selected: "chart.pie.fill" }} />
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="today">
        <NativeTabs.Trigger.Label>Learn</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon sf={{ default: "character.book.closed", selected: "character.book.closed.fill" }} />
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="barakah">
        <NativeTabs.Trigger.Label>Barakah</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon sf={{ default: "leaf", selected: "leaf.fill" }} />
      </NativeTabs.Trigger>
    </NativeTabs>
  );
}
