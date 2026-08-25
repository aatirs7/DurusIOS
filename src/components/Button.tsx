import { Pressable, type ViewStyle } from "react-native";

import { Text } from "@/components/Text";
import { haptics } from "@/lib/haptics";
import { RADIUS } from "@/theme/layout";
import { makeStyles } from "@/theme/useTheme";

/*
  Ported from the web app's components/ui.tsx BUTTON_BASE and VARIANTS, so the
  two clients agree on shape: 12px radius, 20px horizontal, 14px vertical, 16px
  medium label.

  Three variants and no more. `text` is a plain link rather than a fourth box:
  the web version's comment is the reason, and it is worth keeping - four
  bordered tiles under the primary button turned a quiet list of alternatives
  into a second menu competing with it.
*/
const useStyles = makeStyles((t) => ({
  base: {
    borderRadius: RADIUS.button,
    paddingHorizontal: 20,
    paddingVertical: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  primary: { backgroundColor: t.colors.lapis },
  quiet: {
    backgroundColor: t.colors.surface,
    borderWidth: 1,
    borderColor: t.colors.rule,
  },
  /* Same vertical padding as the other variants (web py-3.5), so a column of
     text links has the same rhythm as the web's. Cramping this is what made the
     Today grid read as two tight rows. */
  text: { paddingHorizontal: 0, paddingVertical: 14 },
  pressed: { opacity: 0.75 },
  disabled: { opacity: 0.4 },
}));

export type ButtonVariant = "primary" | "quiet" | "text";

export function Button({
  label,
  onPress,
  variant = "primary",
  disabled,
  style,
  align = "center",
}: {
  label: string;
  onPress: () => void;
  variant?: ButtonVariant;
  disabled?: boolean;
  style?: ViewStyle;
  /* `text` links in the Today grid are left aligned inside their column. */
  align?: "center" | "left";
}) {
  const s = useStyles();

  const press = () => {
    haptics.select();
    onPress();
  };

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled: !!disabled }}
      disabled={disabled}
      onPress={press}
      style={({ pressed }) => [
        s.base,
        s[variant],
        align === "left" && { alignItems: "flex-start" },
        pressed && s.pressed,
        disabled && s.disabled,
        style,
      ]}
    >
      <Text color={variant === "primary" ? "paper" : variant === "text" ? "lapis" : "ink"}>
        {label}
      </Text>
    </Pressable>
  );
}
