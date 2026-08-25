import { Pressable, type ViewStyle } from "react-native";

import { Text } from "@/components/Text";
import { haptics } from "@/lib/haptics";
import { RADIUS, space } from "@/theme/layout";
import { makeStyles } from "@/theme/useTheme";

const useStyles = makeStyles((t) => ({
  base: {
    borderRadius: RADIUS.button,
    paddingVertical: space(2),
    paddingHorizontal: space(3),
    alignItems: "center",
    justifyContent: "center",
  },
  primary: { backgroundColor: t.colors.lapis },
  secondary: { backgroundColor: t.colors.surface, borderWidth: 1, borderColor: t.colors.rule },
  quiet: { backgroundColor: "transparent", paddingVertical: space(1.5) },
  pressed: { opacity: 0.85 },
  disabled: { opacity: 0.4 },
}));

export type ButtonVariant = "primary" | "secondary" | "quiet";

export function Button({
  label,
  onPress,
  variant = "primary",
  disabled,
  style,
}: {
  label: string;
  onPress: () => void;
  variant?: ButtonVariant;
  disabled?: boolean;
  style?: ViewStyle;
}) {
  const s = useStyles();

  /* Light impact on tap. Spec section 7.5 permits exactly this and a Success at
     the end of a session; a wrong answer must never buzz. */
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
        pressed && s.pressed,
        disabled && s.disabled,
        style,
      ]}
    >
      <Text
        variant={variant === "quiet" ? "body" : "body"}
        color={variant === "primary" ? "paper" : "ink"}
      >
        {label}
      </Text>
    </Pressable>
  );
}
