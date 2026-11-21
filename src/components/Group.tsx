import { Children, Fragment, isValidElement, type ReactNode } from "react";
import { Pressable, View } from "react-native";
import Svg, { Path } from "react-native-svg";

import { Text } from "@/components/Text";
import { space } from "@/theme/layout";
import { makeStyles, useTheme } from "@/theme/useTheme";

/*
  A settings group, iOS inset style: a small heading, then one rounded card
  holding its rows with a hairline between each. Used by Settings and the
  reader's Reading view sheet so both read the same way.
*/

const useStyles = makeStyles((t) => ({
  wrap: { gap: space(1) },
  head: { paddingHorizontal: space(2) },
  card: {
    borderRadius: 20,
    backgroundColor: t.colors.surface,
    borderWidth: 1,
    borderColor: t.colors.rule,
    paddingHorizontal: space(2),
    overflow: "hidden",
  },
  rule: { height: 1, backgroundColor: t.colors.rule },
  foot: { paddingHorizontal: space(2) },
  link: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingVertical: space(1.75), gap: space(2) },
  block: { paddingVertical: space(1.5), gap: space(1) },
}));

export function Group({ title, footer, children }: { title?: string; footer?: string; children: ReactNode }) {
  const s = useStyles();
  /* Flatten fragments so conditional rows still get a rule between them. */
  const flat: ReactNode[] = [];
  const walk = (n: ReactNode) =>
    Children.forEach(n, (c) => {
      if (c === null || c === undefined || c === false) return;
      if (isValidElement(c) && c.type === Fragment) walk((c.props as { children?: ReactNode }).children);
      else flat.push(c);
    });
  walk(children);
  return (
    <View style={s.wrap}>
      {title ? (
        <Text variant="eyebrow" color="inkSoft" style={s.head}>
          {title}
        </Text>
      ) : null}
      <View style={s.card}>
        {flat.map((c, i) => (
          <Fragment key={i}>
            {i > 0 ? <View style={s.rule} /> : null}
            {c}
          </Fragment>
        ))}
      </View>
      {footer ? (
        <Text variant="label" color="inkFaint" style={s.foot}>
          {footer}
        </Text>
      ) : null}
    </View>
  );
}

/* A tappable row: a label, an optional hint, a chevron. */
export function LinkRow({
  label,
  hint,
  onPress,
  tone = "lapis",
  chevron = true,
  disabled,
}: {
  label: string;
  hint?: string;
  onPress: () => void;
  tone?: "lapis" | "clay" | "ink";
  chevron?: boolean;
  disabled?: boolean;
}) {
  const s = useStyles();
  const theme = useTheme();
  return (
    <Pressable accessibilityRole="button" disabled={disabled} onPress={onPress} style={({ pressed }) => [s.link, { opacity: pressed || disabled ? 0.5 : 1 }]}>
      <View style={{ flex: 1, gap: space(0.25) }}>
        <Text color={tone}>{label}</Text>
        {hint ? (
          <Text variant="label" color="inkFaint">
            {hint}
          </Text>
        ) : null}
      </View>
      {chevron ? (
        <Svg width={16} height={16} viewBox="0 0 24 24">
          <Path d="M9 6l6 6-6 6" stroke={theme.colors.inkFaint} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" fill="none" />
        </Svg>
      ) : null}
    </Pressable>
  );
}

/* A row that holds something taller than a field: a label over its control. */
export function BlockRow({ label, children }: { label?: string; children: ReactNode }) {
  const s = useStyles();
  return (
    <View style={s.block}>
      {label ? <Text>{label}</Text> : null}
      {children}
    </View>
  );
}
