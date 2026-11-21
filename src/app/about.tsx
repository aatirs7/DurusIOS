import Constants from "expo-constants";
import { useRouter } from "expo-router";
import { Linking, Pressable, ScrollView, View } from "react-native";

import { Arabic } from "@/components/Arabic";
import { BackBar } from "@/components/BackBar";
import { Button } from "@/components/Button";
import { Screen } from "@/components/Screen";
import { Text } from "@/components/Text";
import { TANZIL_CREDIT } from "@/quran/tanzil";
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


/* Which over-the-air update is running, for checking a phone is current. */
function updateLabel(): string {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const U: typeof import("expo-updates") = require("expo-updates");
    if (U.isEmbeddedLaunch || !U.updateId) return "built in";
    const at = U.createdAt ? ` ${U.createdAt.toISOString().slice(0, 16).replace("T", " ")} UTC` : "";
    return `${U.updateId.slice(0, 8)}${at}`;
  } catch {
    return "unknown";
  }
}
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
            Durus is for reading, memorizing and understanding the Quran.
            Read with translation, mark what you have memorized, learn the
            Arabic behind it, and keep a calm daily practice.
          </Text>
          <Text color="inkSoft" style={s.centred}>
            The Arabic Course grades you from your answer and how long it
            took, so there is nothing to rate and no score to keep.
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

        {/* Tanzil's terms: credit the source clearly and link to tanzil.net so users can track changes. */}
        <View style={s.group}>
          <Text variant="eyebrow" color="inkSoft">
            Quran text
          </Text>
          <View style={s.credit}>
            <Text>{TANZIL_CREDIT.name}</Text>
            <Text variant="label" color="inkSoft">
              {TANZIL_CREDIT.version}
            </Text>
            <Text variant="label" color="inkFaint" style={s.centred}>
              The Quran text in Durus is the Tanzil Uthmani text, copied
              verbatim, under the Creative Commons Attribution 3.0 licence.
              Surah names, ayah counts and juz are from Tanzil&apos;s metadata.
            </Text>
            <Pressable accessibilityRole="link" onPress={() => void Linking.openURL(TANZIL_CREDIT.url)}>
              <Text color="lapis">tanzil.net</Text>
            </Pressable>
          </View>
        </View>

        {/* Translations, recitation and word meanings come from Quran Foundation's API (Quran.com). */}
        <View style={s.group}>
          <Text variant="eyebrow" color="inkSoft">
            Translations and recitation
          </Text>
          <View style={s.credit}>
            <Text>Quran Foundation</Text>
            <Text variant="label" color="inkFaint" style={s.centred}>
              Translations, word by word meanings and transliteration, and
              recitation are provided by Quran Foundation through the Quran.com
              API. Each translation is the work of its translator, named where
              you choose it: Saheeh International, Abdel Haleem, Pickthall,
              Yusuf Ali, Hilali and Khan, and Taqi Usmani. Recitation by Mishari
              Rashid al-Afasy.
            </Text>
            <Pressable accessibilityRole="link" onPress={() => void Linking.openURL("https://quran.com")}>
              <Text color="lapis">quran.com</Text>
            </Pressable>
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
              The Quran is set in Amiri Quran, Scheherazade New, Noto Naskh
              Arabic, Amiri or Lateef, your choice, and numerals in IBM Plex
              Mono, all under the SIL Open Font License.
            </Text>
          </View>
        </View>

        <View style={s.group}>
          <Text variant="eyebrow" color="inkSoft">
            Version
          </Text>
          <Text style={s.mono}>{`${version} (${build})`}</Text>
          <Text style={s.mono}>{`Update ${updateLabel()}`}</Text>
          {FONTS_ARE_PLACEHOLDERS ? (
            <Text variant="label" color="clay">
              Test build: the typefaces are placeholders, so the Arabic is not
              yet set in Amiri.
            </Text>
          ) : null}
        </View>

        <View style={s.group}>
          <Text variant="eyebrow" color="inkSoft">
            Help and privacy
          </Text>
          <Pressable accessibilityRole="link" onPress={() => void Linking.openURL("https://durus.space/privacy")}>
            <Text color="lapis">Privacy policy</Text>
          </Pressable>
          <Pressable accessibilityRole="link" onPress={() => void Linking.openURL("https://durus.space/support")}>
            <Text color="lapis">Support</Text>
          </Pressable>
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
