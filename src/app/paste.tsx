import { useRouter } from "expo-router";
import { useMemo, useState } from "react";
import { KeyboardAvoidingView, Platform, ScrollView, TextInput, View } from "react-native";

import { Arabic } from "@/components/Arabic";
import { BackBar } from "@/components/BackBar";
import { Button } from "@/components/Button";
import { Screen } from "@/components/Screen";
import { Text } from "@/components/Text";
import { db } from "@/data/client";
import { addPastedCards } from "@/data/paste";
import { getSettingsFor } from "@/data/settings";
import { TOTAL_LESSONS } from "@/engine/constants";
import { parseCards } from "@/engine/parseCards";
import { Stepper } from "@/components/Field";
import { useSession } from "@/state/session";
import { RADIUS, space } from "@/theme/layout";
import { makeStyles, useTheme } from "@/theme/useTheme";

const useStyles = makeStyles((t) => ({
  input: {
    borderWidth: 1,
    borderColor: t.colors.rule,
    backgroundColor: t.colors.surface,
    borderRadius: RADIUS.button,
    padding: space(2),
    color: t.colors.ink,
    fontSize: 15,
    minHeight: 180,
    textAlignVertical: "top",
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: space(1.5),
  },
  preview: {
    borderTopWidth: 1,
    borderTopColor: t.colors.rule,
    paddingVertical: space(1),
    gap: space(0.25),
  },
  error: { color: t.colors.clay },
}));

/*
  How lessons 5 to 23 actually get entered.

  Buried in Settings on purpose - this is an authoring tool, not a drill. It
  runs the SAME parser that produced the bundled content asset, so a block that
  parses here is a block that would have parsed at build time.
*/
export default function Paste() {
  const s = useStyles();
  const theme = useTheme();
  const router = useRouter();
  const profileId = useSession((st) => st.activeProfileId);

  const config = useMemo(
    () => (profileId === null ? null : getSettingsFor(db, profileId)),
    [profileId],
  );

  const [lessonNumber, setLessonNumber] = useState(config?.currentLesson ?? 1);
  const [text, setText] = useState("");
  const [saved, setSaved] = useState<string | null>(null);

  const parsed = useMemo(() => (text.trim() ? parseCards(text) : null), [text]);

  if (profileId === null || !config) return null;

  return (
    <Screen>
      <BackBar fallback="/settings" />
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <ScrollView
          contentContainerStyle={{ paddingBottom: space(5) }}
          keyboardShouldPersistTaps="handled"
        >
          <Text variant="eyebrow" color="inkSoft">
            Settings
          </Text>
          <Text variant="pageTitle">Add cards</Text>

          <Text color="inkSoft" style={{ paddingTop: space(1) }}>
            One card per line, fields separated by a vertical bar.
          </Text>
          <Text variant="label" color="inkFaint" style={{ paddingTop: space(0.5) }}>
            arabic | english | transliteration | gender or &quot;phrase&quot; | plural | note
          </Text>

          <View style={s.row}>
            <Text>Lesson</Text>
            <Stepper
              value={lessonNumber}
              min={1}
              max={TOTAL_LESSONS}
              onChange={setLessonNumber}
            />
          </View>

          <TextInput
            value={text}
            onChangeText={(v) => {
              setText(v);
              setSaved(null);
            }}
            multiline
            placeholder={"بَيْتٌ | house | baytun | m\nمَسْجِدٌ | mosque | masjidun | m"}
            placeholderTextColor={theme.colors.inkFaint}
            style={s.input}
            autoCorrect={false}
            autoCapitalize="none"
            spellCheck={false}
          />

          {parsed ? (
            <View style={{ paddingTop: space(2), gap: space(1) }}>
              <Text variant="eyebrow" color="inkSoft">
                {`${parsed.cards.length} parsed, ${parsed.errors.length} bad`}
              </Text>

              {parsed.errors.slice(0, 5).map((e) => (
                <Text key={`${e.line}`} variant="label" style={s.error}>
                  {`Line ${e.line}: ${e.message}`}
                </Text>
              ))}

              {parsed.cards.slice(0, 6).map((c, i) => (
                <View key={`${c.arabic}-${i}`} style={s.preview}>
                  <Arabic variant="inline" showHarakat={config.showHarakat}>
                    {c.arabic}
                  </Arabic>
                  <Text variant="label" color="inkSoft">
                    {c.english}
                  </Text>
                </View>
              ))}
              {parsed.cards.length > 6 ? (
                <Text variant="label" color="inkFaint">
                  {`and ${parsed.cards.length - 6} more`}
                </Text>
              ) : null}
            </View>
          ) : null}

          {saved ? (
            <Text color="verdigris" style={{ paddingTop: space(2) }}>
              {saved}
            </Text>
          ) : null}

          <Button
            label="Add to lesson"
            style={{ marginTop: space(3) }}
            disabled={!parsed || parsed.cards.length === 0 || parsed.errors.length > 0}
            onPress={() => {
              if (!parsed) return;
              const result = addPastedCards(db, lessonNumber, parsed.cards);
              setSaved(
                result.inserted === 0
                  ? "Every one of those was already in this lesson."
                  : `Added ${result.inserted}${result.skipped > 0 ? `, skipped ${result.skipped} already there` : ""}.`,
              );
              setText("");
            }}
          />

          <Button
            label="Back"
            variant="quiet"
            style={{ marginTop: space(1) }}
            onPress={() => router.back()}
          />
        </ScrollView>
      </KeyboardAvoidingView>
    </Screen>
  );
}
