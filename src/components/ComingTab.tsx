import { View } from "react-native";

import { Screen } from "@/components/Screen";
import { Text } from "@/components/Text";
import { space } from "@/theme/layout";

/*
  A tab whose content is not built yet.

  Says plainly what will live here and what it is waiting on. It never shows
  sample Quran text or adhkar: nothing religious renders unless it came from the
  verified source, and a placeholder ayah would be exactly that.
*/
export function ComingTab({ title, line, waiting }: { title: string; line: string; waiting: string }) {
  return (
    <Screen>
      <View style={{ flex: 1, alignItems: "center", justifyContent: "center", gap: space(1.5) }}>
        <Text variant="pageTitle" style={{ textAlign: "center" }}>
          {title}
        </Text>
        <Text color="inkSoft" style={{ textAlign: "center" }}>
          {line}
        </Text>
        <Text color="inkFaint" variant="label" style={{ textAlign: "center" }}>
          {waiting}
        </Text>
      </View>
    </Screen>
  );
}
