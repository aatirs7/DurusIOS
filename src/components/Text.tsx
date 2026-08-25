import { Text as RNText, type TextProps as RNTextProps } from "react-native";

import type { ColorToken } from "@/theme/tokens";
import { textStyles, type TextVariant } from "@/theme/typography";
import { useTheme } from "@/theme/useTheme";

export type TextProps = RNTextProps & {
  variant?: TextVariant;
  color?: ColorToken;
};

/*
  The one place allowed to reach react-native's Text. Everything else in the app
  imports this, so the type scale and the palette are applied by construction
  rather than by remembering - there is an eslint rule enforcing it.

  This component is for ENGLISH ONLY. Arabic goes through <Arabic>, which has
  its own text style with no tracking and its own line height. Spec section 7.3
  rule 3: Arabic and English never share a text node, because bidi reorders them
  around each other.
*/
export function Text({ variant = "body", color = "ink", style, ...rest }: TextProps) {
  const theme = useTheme();
  return (
    <RNText
      {...rest}
      style={[textStyles[variant], { color: theme.colors[color] }, style]}
    />
  );
}
