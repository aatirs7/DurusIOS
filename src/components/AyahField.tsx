import { useMemo } from "react";
import { View } from "react-native";
import Svg, { Path } from "react-native-svg";

import { dotsPath, layoutField } from "@/onboarding/field";
import { JUZ_STARTS, TOTAL_AYAHS } from "@/onboarding/tanzil";
import { useTheme } from "@/theme/useTheme";

/*
  The Ayah Field: all 6,236 ayahs as dots, grouped by juz.

  Drawn as three SVG paths (unlit, memorized, understood) instead of 6,236
  views, so a page can re-render it on every animation beat without stalling.
  An ayah that is both memorized and understood draws teal over saffron.

  `memorized` and `understood` are predicates over the global ayah index, so a
  caller can light a range, a set, or a moving wave without building arrays.
*/
export function AyahField({
  width,
  height,
  memorized,
  understood,
}: {
  width: number;
  height: number;
  memorized?: (i: number) => boolean;
  understood?: (i: number) => boolean;
}) {
  const theme = useTheme();
  const layout = useMemo(() => layoutField(width, height, JUZ_STARTS, TOTAL_AYAHS), [width, height]);

  const m = memorized ?? (() => false);
  const u = understood ?? (() => false);
  const base = dotsPath(layout, (i) => !m(i) && !u(i));
  const saffron = dotsPath(layout, (i) => m(i) && !u(i));
  const teal = dotsPath(layout, (i) => u(i));

  return (
    <View style={{ width, height: layout.height, alignItems: "center" }}>
      <Svg width={width} height={layout.height}>
        {base ? <Path d={base} fill={theme.colors.rule} /> : null}
        {saffron ? <Path d={saffron} fill={theme.colors.saffron} /> : null}
        {teal ? <Path d={teal} fill={theme.colors.verdigris} /> : null}
      </Svg>
    </View>
  );
}
