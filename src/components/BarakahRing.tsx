import { View } from "react-native";
import Svg, { Circle, Path } from "react-native-svg";

import { Text } from "@/components/Text";
import { makeStyles, useTheme } from "@/theme/useTheme";

/*
  The Barakah ring and the month grid's day cell, shared by the Barakah tab and
  the onboarding story so the two can never drift apart.
*/

/* One arc, from fraction a to b of the circle, clockwise from the top. */
function arc(a: number, b: number, r: number, c: number): string {
  const p = (f: number) => {
    const angle = f * 2 * Math.PI - Math.PI / 2;
    return `${c + r * Math.cos(angle)} ${c + r * Math.sin(angle)}`;
  };
  return `M ${p(a)} A ${r} ${r} 0 ${b - a > 0.5 ? 1 : 0} 1 ${p(b)}`;
}

export function BarakahRing({ fills, size = 184, stroke = 12 }: { fills: number[]; size?: number; stroke?: number }) {
  const theme = useTheme();
  const c = size / 2;
  const r = c - stroke / 2;
  const n = fills.length;

  if (n === 0) {
    return (
      <Svg width={size} height={size}>
        <Circle cx={c} cy={c} r={r} stroke={theme.colors.rule} strokeWidth={stroke} fill="none" />
      </Svg>
    );
  }

  /* A small gap between segments, so each practice reads as its own piece. */
  const gap = n === 1 ? 0 : Math.min(0.02, 0.25 / n);
  const span = 1 / n;
  const seg = (i: number, f: number) => {
    const start = i * span + gap / 2;
    if (n === 1) return arc(0, f >= 1 ? 0.9999 : Math.max(0.001, f), r, c);
    return arc(start, Math.max(start + 0.001, start + (span - gap) * f), r, c);
  };

  return (
    <Svg width={size} height={size}>
      {fills.map((_, i) => (
        <Path key={`t${i}`} d={seg(i, 1)} stroke={theme.colors.surfaceSunk} strokeWidth={stroke} strokeLinecap="round" fill="none" />
      ))}
      {fills.map((f, i) =>
        f > 0 ? (
          <Path key={`f${i}`} d={seg(i, f)} stroke={theme.colors.verdigris} strokeWidth={stroke} strokeLinecap="round" fill="none" />
        ) : null,
      )}
    </Svg>
  );
}

const useStyles = makeStyles((t) => ({
  cell: { width: 40, height: 40, alignItems: "center", justifyContent: "center" },
  fill: { position: "absolute", width: 32, height: 32, borderRadius: 10 },
  selected: { borderWidth: 1, borderColor: t.colors.lapis },
}));

/*
  One day of the month grid. A calm wash that deepens with what was done; a day
  with nothing is just paper, never a red mark.
*/
export function DayCell({
  ratio,
  label,
  selected = false,
  future = false,
}: {
  ratio: number;
  label: string;
  selected?: boolean;
  future?: boolean;
}) {
  const s = useStyles();
  const theme = useTheme();
  return (
    <View style={s.cell}>
      <View
        style={[
          s.fill,
          { backgroundColor: ratio > 0 ? theme.colors.verdigris : theme.colors.surfaceSunk },
          { opacity: ratio > 0 ? 0.2 + 0.8 * ratio : future ? 0.25 : 0.6 },
          selected && s.selected,
        ]}
      />
      <Text variant="label" color={ratio >= 0.6 ? "paper" : "inkSoft"}>
        {label}
      </Text>
    </View>
  );
}
