import type { ReactNode } from "react";
import { Pressable, View } from "react-native";

import { Text } from "@/components/Text";
import { RADIUS, space } from "@/theme/layout";
import { makeStyles, useTheme } from "@/theme/useTheme";

const useStyles = makeStyles((t) => ({
  field: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: space(1.5),
    gap: space(2),
  },
  labels: { flex: 1, gap: space(0.25) },
  rule: { height: 1, backgroundColor: t.colors.rule },

  stepper: { flexDirection: "row", alignItems: "center", gap: space(1.5) },
  step: {
    width: 36,
    height: 36,
    borderRadius: RADIUS.button,
    borderWidth: 1,
    borderColor: t.colors.rule,
    backgroundColor: t.colors.surface,
    alignItems: "center",
    justifyContent: "center",
  },
  stepDisabled: { opacity: 0.35 },
  value: { minWidth: 56, textAlign: "center" },

  segment: { flexDirection: "row", borderWidth: 1, borderColor: t.colors.rule, borderRadius: RADIUS.button, overflow: "hidden" },
  segmentItem: { paddingVertical: space(1), paddingHorizontal: space(1.5) },
  segmentOn: { backgroundColor: t.colors.lapisWash },
}));

export function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: ReactNode;
}) {
  const s = useStyles();
  return (
    <View style={s.field}>
      <View style={s.labels}>
        <Text>{label}</Text>
        {hint ? (
          <Text variant="label" color="inkFaint">
            {hint}
          </Text>
        ) : null}
      </View>
      {children}
    </View>
  );
}

export function Rule() {
  const s = useStyles();
  return <View style={s.rule} />;
}

/*
  A stepper rather than a slider or a text input. The values here are all
  coarse - lesson numbers, cards a day, tenths of a second - and a stepper is
  the only one of the three that cannot produce a value the app has to validate
  and reject.
*/
export function Stepper({
  value,
  min,
  max,
  step = 1,
  format,
  onChange,
}: {
  value: number;
  min: number;
  max: number;
  step?: number;
  format?: (n: number) => string;
  onChange: (next: number) => void;
}) {
  const s = useStyles();
  const atMin = value <= min;
  const atMax = value >= max;

  return (
    <View style={s.stepper}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Less"
        disabled={atMin}
        onPress={() => onChange(Math.max(min, value - step))}
        style={[s.step, atMin && s.stepDisabled]}
      >
        <Text>−</Text>
      </Pressable>
      <Text style={s.value}>{format ? format(value) : String(value)}</Text>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="More"
        disabled={atMax}
        onPress={() => onChange(Math.min(max, value + step))}
        style={[s.step, atMax && s.stepDisabled]}
      >
        <Text>+</Text>
      </Pressable>
    </View>
  );
}

/* Used for the three way theme choice, which a two state toggle cannot hold. */
export function Segmented<T extends string>({
  value,
  options,
  onChange,
}: {
  value: T;
  options: { value: T; label: string }[];
  onChange: (next: T) => void;
}) {
  const s = useStyles();
  const theme = useTheme();
  return (
    <View style={s.segment}>
      {options.map((o) => (
        <Pressable
          key={o.value}
          accessibilityRole="button"
          accessibilityState={{ selected: o.value === value }}
          onPress={() => onChange(o.value)}
          style={[
            s.segmentItem,
            o.value === value && s.segmentOn,
            { borderLeftWidth: o.value === options[0].value ? 0 : 1, borderLeftColor: theme.colors.rule },
          ]}
        >
          <Text variant="label" color={o.value === value ? "lapis" : "inkSoft"}>
            {o.label}
          </Text>
        </Pressable>
      ))}
    </View>
  );
}
