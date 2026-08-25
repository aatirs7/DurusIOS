import Constants from "expo-constants";
import { useRouter } from "expo-router";
import { ScrollView, View } from "react-native";

import { Arabic } from "@/components/Arabic";
import { Button } from "@/components/Button";
import { Screen } from "@/components/Screen";
import { Text } from "@/components/Text";
import { space } from "@/theme/layout";
import { FONTS_ARE_PLACEHOLDERS } from "@/theme/typography";
import { makeStyles } from "@/theme/useTheme";

const useStyles = makeStyles((t) => ({
  group: { paddingTop: space(3), gap: space(1) },
  credit: {
    borderWidth: 1,
    borderColor: t.colors.rule,
    backgroundColor: t.colors.surface,
    borderRadius: 12,
    padding: space(2),
    gap: space(1),
  },
  mono: { fontVariant: ["tabular-nums"] },
}));

/*
  !!! ATTRIBUTION IS INCOMPLETE - MUST BE FILLED IN BEFORE ANY EXTERNAL BUILD !!!

  Spec section 9.1 makes this screen a condition of the content licence, not a
  nice-to-have: the source work and its author must be credited by name, in the
  app, reachable in at most two taps.

  The exact author and publisher are deliberately NOT guessed here. Writing a
  plausible-looking credit that turns out to name the wrong person or press is
  worse than an obvious blank - it would be a false claim about someone else's
  work sitting inside a rights notice. Replace the marked strings with the
  wording from the permission document (docs/permission.pdf, spec section 11.2)
  before this reaches anyone outside the author's own devices.
*/
const CREDIT = {
  /* TODO(attribution): the course's Arabic title, as the publisher writes it. */
  titleAr: "دُرُوسُ اللُّغَةِ العَرَبِيَّةِ",
  /* TODO(attribution): confirm the English title, author and publisher exactly
     as they appear in the grant. */
  titleEn: "TODO: course title as published",
  author: "TODO: author name",
  publisher: "TODO: publisher name",
};

export default function About() {
  const s = useStyles();
  const router = useRouter();

  const version = Constants.expoConfig?.version ?? "unknown";
  const build =
    Constants.expoConfig?.ios?.buildNumber ??
    (Constants.expoConfig as { ios?: { buildNumber?: string } } | null)?.ios
      ?.buildNumber ??
    "dev";

  return (
    <Screen>
      <ScrollView contentContainerStyle={{ paddingBottom: space(4) }}>
        <Text variant="pageTitle">About Durus</Text>

        <View style={s.group}>
          <Text color="inkSoft">
            Durus keeps the vocabulary from Madinah Arabic Book 1 in working
            memory, alongside a class that meets weekly.
          </Text>
          <Text color="inkSoft">
            It grades you from your answer and how long it took, so there is
            nothing to rate and no score to keep.
          </Text>
        </View>

        <View style={[s.group]}>
          <Text variant="eyebrow" color="inkSoft">
            The content
          </Text>
          <View style={s.credit}>
            {/* Arabic on its own element, English on another. Never one node. */}
            <Arabic variant="inline">{CREDIT.titleAr}</Arabic>
            <Text>{CREDIT.titleEn}</Text>
            <Text variant="label" color="inkSoft">
              {CREDIT.author}
            </Text>
            <Text variant="label" color="inkSoft">
              {CREDIT.publisher}
            </Text>
            <Text variant="label" color="inkFaint">
              The vocabulary and phrases in this app are drawn from that course
              and are used with the publisher&apos;s permission. Durus does not
              claim authorship of the material, and nothing here implies
              endorsement by its author or publisher.
            </Text>
          </View>
        </View>

        <View style={s.group}>
          <Text variant="eyebrow" color="inkSoft">
            Version
          </Text>
          <Text style={s.mono}>{`${version} (${build})`}</Text>
          {FONTS_ARE_PLACEHOLDERS ? (
            <Text variant="label" color="clay">
              Test build: the typefaces are placeholders, so the Arabic is not
              yet set in Amiri.
            </Text>
          ) : null}
        </View>

        <Button
          label="Back"
          variant="secondary"
          style={{ marginTop: space(3) }}
          onPress={() => router.back()}
        />
      </ScrollView>
    </Screen>
  );
}
