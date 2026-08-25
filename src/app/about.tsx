import Constants from "expo-constants";
import { useRouter } from "expo-router";
import { ScrollView, View } from "react-native";

import { Arabic } from "@/components/Arabic";
import { BackBar } from "@/components/BackBar";
import { Button } from "@/components/Button";
import { Screen } from "@/components/Screen";
import { Text } from "@/components/Text";
import { space } from "@/theme/layout";
import { FONTS_ARE_PLACEHOLDERS } from "@/theme/typography";
import { makeStyles } from "@/theme/useTheme";

const useStyles = makeStyles((t) => ({
  /*
    Centred, like every other reading screen in the app. About is a page of
    credits and version numbers rather than running prose, so the ragged left
    edge a paragraph needs buys nothing here and left alignment just made it
    the one screen that did not match.
  */
  group: { paddingTop: space(3), gap: space(1), alignItems: "center" },
  centred: { textAlign: "center" },
  credit: {
    width: "100%",
    alignItems: "center",
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
  The credits, which are a licence term rather than a courtesy.

  Spec section 9.1 makes this screen a condition of the content licence: the
  source work and its author must be credited by name, in the app, reachable in
  at most two taps. It is also what App Review will look for in an app built on
  someone else's textbook.

  The typeface credit is complete and must not be trimmed in a tidy up.
  Fontshare's licence (name ID 13, inside the font file itself) requires the ITF
  fonts to be identified by name and ITF's ownership of the trademarks and
  copyrights to be credited in production credits.

  The course credit below names the work as it is published. CONFIRM IT AGAINST
  THE GRANT (docs/permission.pdf, spec section 11.2) before submission - these
  are the work's established details, not a transcription of the permission
  document, and the two must agree. In particular the English title has several
  common renderings and the grant's wording is the one that belongs here.
*/
const CREDIT = {
  titleAr: "دُرُوسُ اللُّغَةِ العَرَبِيَّةِ لِغَيْرِ النَّاطِقِينَ بِهَا",
  titleEn: "Lessons in Arabic Language for Non-Native Speakers",
  author: "Dr. V. Abdur Rahim",
  publisher: "Islamic University of Madinah",
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
      <BackBar />
      <ScrollView
        contentContainerStyle={{ paddingBottom: space(4) }}
        showsVerticalScrollIndicator={false}
      >
        <Text variant="pageTitle" style={s.centred}>About Durus</Text>

        <View style={s.group}>
          <Text color="inkSoft" style={s.centred}>
            Durus keeps the vocabulary from Madinah Arabic Book 1 in working
            memory, alongside a class that meets weekly.
          </Text>
          <Text color="inkSoft" style={s.centred}>
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
            <Text variant="label" color="inkFaint" style={s.centred}>
              The vocabulary and phrases in this app are drawn from that course
              and are used with the publisher&apos;s permission. Durus does not
              claim authorship of the material, and nothing here implies
              endorsement by its author or publisher.
            </Text>
          </View>
        </View>

        <View style={s.group}>
          <Text variant="eyebrow" color="inkSoft">
            Typefaces
          </Text>
          <View style={s.credit}>
            <Text>Satoshi</Text>
            <Text variant="label" color="inkSoft">
              Indian Type Foundry
            </Text>
            <Text variant="label" color="inkFaint" style={s.centred}>
              Satoshi is a trademark of the Indian Type Foundry.
              Copyright 2017-2021 Indian Type Foundry. All rights reserved.
            </Text>
            <Text variant="label" color="inkFaint" style={s.centred}>
              Arabic is set in Amiri and numerals in IBM Plex Mono, both under
              the SIL Open Font License.
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
          variant="quiet"
          style={{ marginTop: space(3) }}
          onPress={() => router.back()}
        />
      </ScrollView>
    </Screen>
  );
}
