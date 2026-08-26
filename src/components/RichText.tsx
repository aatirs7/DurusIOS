import { useState } from "react";
import { Pressable, Text as RNText, View } from "react-native";

import { segmentRuns } from "@/engine/note";
import { transliterate } from "@/engine/transliterate";
import { RADIUS, space } from "@/theme/layout";
import { arabicStyles, textStyles } from "@/theme/typography";
import { makeStyles } from "@/theme/useTheme";

/*
  Prose with Arabic in it, where the Arabic can be tapped to hear how it is
  said.

  A grammar note is a sentence in English about a word in Arabic, and until now
  the Arabic in it was a shape you either recognised or skipped. "The definite
  article ال" is no use to a reader who cannot yet sound out ال - which is
  precisely the reader the sentence is for.

  So every Arabic run is a tap target, and tapping one puts its reading
  underneath. Reading, not translation: the words in a grammar note are being
  named rather than defined, and what a reader is missing is how to say it.

  Two things this must not do, both of which it would do by accident:

    it must not reflow    the reading appears in a line below the paragraph,
                          not inline, so tapping does not re-wrap the text
                          under the finger that tapped it.

    it must not shape wrong
                          Arabic runs are drawn in Amiri at their own size, in
                          one Text node each. A React Native Text node has one
                          font, so a paragraph left as a single string had iOS
                          substituting a system face mid-sentence.
*/
const useStyles = makeStyles((t) => ({
  body: { ...textStyles.body, color: t.colors.ink, textAlign: "left" },
  arabic: {
    fontFamily: arabicStyles.inline.fontFamily,
    fontSize: 20,
    color: t.colors.lapis,
  },
  /*
    The reading, on its own line under the paragraph.

    Height is NOT reserved. This one is allowed to push the page, because
    unlike a drill there is nothing underneath it that a thumb is on its way
    to - and reserving an empty band under every paragraph of every lesson
    would cost more than it saves.
  */
  reading: {
    marginTop: space(1),
    alignSelf: "flex-start",
    flexDirection: "row",
    alignItems: "center",
    gap: space(1),
    borderWidth: 1,
    borderColor: t.colors.rule,
    borderRadius: RADIUS.pill,
    paddingHorizontal: space(1.5),
    paddingVertical: space(0.5),
  },
  readingArabic: {
    fontFamily: arabicStyles.inline.fontFamily,
    fontSize: 18,
    color: t.colors.ink,
  },
  readingLatin: { ...textStyles.label, color: t.colors.inkSoft, fontStyle: "italic" },
}));

export function RichText({ children }: { children: string }) {
  const s = useStyles();
  const [tapped, setTapped] = useState<string | null>(null);

  const runs = segmentRuns(children);

  return (
    <View>
      <RNText style={s.body}>
        {runs.map((run, i) =>
          run.arabic ? (
            /*
              A nested Text rather than a Pressable: a Pressable inside a Text
              breaks the line box on iOS and the word drops onto its own line.
              onPress on a Text keeps it in the flow.
            */
            <RNText
              key={i}
              style={s.arabic}
              suppressHighlighting
              onPress={() => setTapped((current) => (current === run.text ? null : run.text))}
            >
              {run.text}
            </RNText>
          ) : (
            <RNText key={i}>{run.text}</RNText>
          ),
        )}
      </RNText>

      {tapped ? (
        <Pressable style={s.reading} onPress={() => setTapped(null)}>
          <RNText style={s.readingArabic}>{tapped}</RNText>
          <RNText style={s.readingLatin}>{transliterate(tapped)}</RNText>
        </Pressable>
      ) : null}
    </View>
  );
}
