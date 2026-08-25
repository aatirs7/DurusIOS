import { Text as RNText, type TextProps as RNTextProps } from "react-native";

import { stripHarakat } from "@/engine/harakat";
import type { ColorToken } from "@/theme/tokens";
import { arabicStyles, type ArabicVariant } from "@/theme/typography";
import { useTheme } from "@/theme/useTheme";

export type ArabicProps = Omit<RNTextProps, "children"> & {
  children: string;
  variant?: ArabicVariant;
  color?: ColorToken;
  /* From settings.showHarakat. Applied at render, never at the data layer:
     the harakat are the content and this is a view preference. */
  showHarakat?: boolean;
};

/*
  Every piece of Arabic in the app goes through this component and nowhere else.
  Four rules from spec section 7.3, each of which is visible immediately when
  broken:

  1. No letterSpacing, ever. React Native applies tracking between glyphs and it
     breaks the joins. The arabic styles in typography.ts deliberately omit it,
     and no caller may add it.
  2. writingDirection: "rtl" here rather than I18nManager.forceRTL. The document
     stays LTR and only Arabic text is RTL, which mirrors the web layout exactly.
     forceRTL would flip every screen.
  3. Never mixed with English in one node. That is why children is typed as
     string rather than ReactNode - you cannot nest anything into it.
  4. Not selectable, and no long press. A long press on a card face does nothing.
*/
export function Arabic({
  children,
  variant = "card",
  color = "ink",
  showHarakat = true,
  style,
  ...rest
}: ArabicProps) {
  const theme = useTheme();
  const text = showHarakat ? children : stripHarakat(children);

  return (
    <RNText
      {...rest}
      selectable={false}
      style={[
        arabicStyles[variant],
        { color: theme.colors[color], writingDirection: "rtl", textAlign: "center" },
        style,
      ]}
    >
      {text}
    </RNText>
  );
}
