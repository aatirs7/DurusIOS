import { useMemo } from "react";
import { View } from "react-native";
import Svg, { Path, Text as SvgText } from "react-native-svg";

import { dotsPath, layoutField } from "@/onboarding/field";
import { JUZ_STARTS, TOTAL_AYAHS } from "@/quran/tanzil";
import { FONTS } from "@/theme/typography";
import { useTheme } from "@/theme/useTheme";

/*
  The Ayah Field: all 6,236 ayahs as dots, grouped by juz.

  Drawn as three SVG paths (unlit, memorized, understood) instead of 6,236
  views. The unlit base is built once per size; only the lit dots are rebuilt
  on a change. An ayah that is both memorized and understood draws teal.

  `labels` puts each juz's number in a gutter on the left, beside its first
  row, so the field can be read as a map rather than a texture.
*/
const GUTTER = 22;

export function AyahField({
  width,
  height,
  memorized,
  understood,
  labels = false,
}: {
  width: number;
  height: number;
  memorized?: (i: number) => boolean;
  understood?: (i: number) => boolean;
  labels?: boolean;
}) {
  const theme = useTheme();
  const gutter = labels ? GUTTER : 0;
  const layout = useMemo(() => layoutField(width - gutter, height, JUZ_STARTS, TOTAL_AYAHS), [width, height, gutter]);

  const base = useMemo(() => dotsPath(layout, () => true), [layout]);
  const m = memorized ?? (() => false);
  const u = understood ?? (() => false);
  const saffron = dotsPath(layout, (i) => m(i) && !u(i));
  const teal = dotsPath(layout, (i) => u(i));

  /* Label every juz when there is room, otherwise every fifth and the last. */
  const every = layout.pitch * 2 >= 9 ? 1 : 5;
  const fontSize = Math.min(10, Math.max(7, layout.pitch * 2.4));

  return (
    <View style={{ width, height: layout.height, alignItems: "center" }}>
      <Svg width={width} height={layout.height}>
        {labels
          ? JUZ_STARTS.map((start, j) =>
              j === 0 || (j + 1) % every === 0 || j === 29 ? (
                <SvgText
                  key={j}
                  x={gutter - 6}
                  y={layout.y[start] + fontSize * 0.35}
                  fontSize={fontSize}
                  fontFamily={FONTS.uiMedium}
                  fill={theme.colors.inkFaint}
                  textAnchor="end"
                >
                  {String(j + 1)}
                </SvgText>
              ) : null,
            )
          : null}
        <Path d={base} fill={theme.colors.rule} transform={`translate(${gutter} 0)`} />
        {saffron ? <Path d={saffron} fill={theme.colors.saffron} transform={`translate(${gutter} 0)`} /> : null}
        {teal ? <Path d={teal} fill={theme.colors.verdigris} transform={`translate(${gutter} 0)`} /> : null}
      </Svg>
    </View>
  );
}
