import { useState } from "react";
import { TextInput, type TextInputProps, View } from "react-native";

import { RADIUS, space } from "@/theme/layout";
import { FONTS } from "@/theme/typography";
import { makeStyles, useTheme } from "@/theme/useTheme";

const useStyles = makeStyles((t) => ({
  wrap: {
    borderRadius: RADIUS.field,
    borderWidth: 1.5,
    borderColor: t.colors.rule,
    backgroundColor: t.colors.surface,
  },
  /*
    The focused state is a colour change on a border that is already there,
    rather than a border appearing. A box that grows a ring on focus shifts
    every pixel of its own contents by the ring's width.
  */
  focused: { borderColor: t.colors.lapis, backgroundColor: t.colors.surfaceSunk },
  input: {
    fontFamily: FONTS.uiRegular,
    fontSize: 18,
    color: t.colors.ink,
    paddingHorizontal: space(2.5),
    /* 56pt clears Apple's 44pt minimum with room for descenders. */
    height: 58,
  },
}));

export function TextField(props: TextInputProps) {
  const s = useStyles();
  const theme = useTheme();
  const [focused, setFocused] = useState(false);

  return (
    <View style={[s.wrap, focused && s.focused]}>
      <TextInput
        {...props}
        placeholderTextColor={theme.colors.inkFaint}
        selectionColor={theme.colors.lapis}
        style={[s.input, props.style]}
        onFocus={(e) => {
          setFocused(true);
          props.onFocus?.(e);
        }}
        onBlur={(e) => {
          setFocused(false);
          props.onBlur?.(e);
        }}
      />
    </View>
  );
}
