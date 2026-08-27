import AsyncStorage from "@react-native-async-storage/async-storage";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useMemo } from "react";
import { ScrollView, View } from "react-native";

import { Arabic } from "@/components/Arabic";
import { BackBar } from "@/components/BackBar";
import { Button } from "@/components/Button";
import { Screen } from "@/components/Screen";
import { Text } from "@/components/Text";
import { db } from "@/data/client";
import { stageItems } from "@/data/numbers";
import { lessons } from "@/data/schema";
import { easternDigits } from "@/engine/numbers";
import { useSession } from "@/state/session";
import { RADIUS, space } from "@/theme/layout";
import { textStyles } from "@/theme/typography";
import { makeStyles } from "@/theme/useTheme";
import { eq } from "drizzle-orm";

/*
  The teach screen for a foundation stage.

  ONE SCROLLING COLUMN, not a card per number. These are twenty words with
  nothing to work out - a reference you read once and then drill. Paginating
  them into twenty screens would be a lie about how hard they are, and it would
  put a tap between the learner and the comparison that actually teaches: the
  two forms of each number, side by side, differing by one letter.

  So the digits sit on the left, the two forms in the middle, and the reading
  underneath. The eye goes down the column and the pattern falls out.
*/

const useStyles = makeStyles((t) => ({
  head: { gap: space(1), paddingBottom: space(2) },

  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: space(2),
    paddingVertical: space(1.5),
    borderBottomWidth: 1,
    borderBottomColor: t.colors.rule,
  },
  /* Fixed width so every Arabic form starts on the same line down the page. */
  digits: {
    ...textStyles.numeral,
    fontSize: 20,
    color: t.colors.inkFaint,
    width: 54,
    textAlign: "right",
  },
  word: { flex: 1, gap: space(0.25) },
  gloss: { textAlign: "left" },

  note: {
    borderWidth: 1,
    borderColor: t.colors.rule,
    borderRadius: RADIUS.field,
    backgroundColor: t.colors.surface,
    padding: space(2),
    marginTop: space(2),
  },
}));

export default function TeachStage() {
  const s = useStyles();
  const router = useRouter();
  const params = useLocalSearchParams<{ stage?: string }>();
  const profileId = useSession((st) => st.activeProfileId);

  const lessonNumber = Number(params.stage);

  const view = useMemo(() => {
    if (!Number.isInteger(lessonNumber)) return null;
    const lesson = db.select().from(lessons).where(eq(lessons.number, lessonNumber)).get();
    if (!lesson || lesson.deck !== "numbers") return null;
    return { lesson, items: stageItems(db, lessonNumber) };
  }, [lessonNumber]);

  if (!view || profileId === null) {
    return (
      <Screen>
        <BackBar fallback="/numbers" />
        <Text variant="pageTitle">No such stage.</Text>
      </Screen>
    );
  }

  const { lesson, items } = view;

  const begin = async () => {
    /* Marked as soon as the drill is entered rather than when the screen is
       left, so a mid-read kill shows it once less rather than for ever. */
    try {
      await AsyncStorage.setItem(`durus.numbers.taught.${profileId}.${lessonNumber - 100}`, "1");
    } catch {
      /* Worst case it is offered again, which beats a stage that cannot be
         reached. */
    }
    router.replace(`/review?deck=numbers&lessons=${lessonNumber}`);
  };

  return (
    <Screen>
      <BackBar fallback="/numbers" />

      <View style={s.head}>
        <Arabic variant="title" color="lapis">
          {lesson.titleAr}
        </Arabic>
        {lesson.grammarNote ? (
          <Text color="inkSoft" style={{ textAlign: "center" }}>
            {lesson.grammarNote}
          </Text>
        ) : null}
      </View>

      <ScrollView showsVerticalScrollIndicator={false}>
        {items.map((item) => {
          /* The value is not stored on the card, so it is read back off the
             English, which always begins with the number word. */
          const label = item.english.replace(/\s*\(.*\)$/, "");
          const value = WORD_TO_VALUE[label] ?? null;

          return (
            <View key={item.id} style={s.row}>
              <Text style={s.digits}>{value === null ? "" : easternDigits(value)}</Text>

              <View style={s.word}>
                <Arabic variant="title">{item.arabic}</Arabic>
                <Text variant="label" color="inkFaint" style={{ fontStyle: "italic" }}>
                  {item.transliteration ?? ""}
                </Text>
                <Text color="inkSoft" style={s.gloss}>
                  {item.english}
                </Text>
                {item.note ? (
                  <Text variant="label" color="inkFaint">
                    {item.note}
                  </Text>
                ) : null}
              </View>
            </View>
          );
        })}

        <View style={s.note}>
          <Text variant="label" color="inkSoft">
            Read these once. The drill is what makes them stick, and it starts
            on the next tap.
          </Text>
        </View>
      </ScrollView>

      <View style={{ paddingVertical: space(1) }}>
        <Button label="Start drilling" onPress={() => void begin()} />
      </View>
    </Screen>
  );
}

/*
  English number word to its value, for the digit column.

  The value is not a column on `cards` - it is a fact about these particular
  cards and nothing else in the app needs it - so it is recovered from the
  English, which every seeded item begins with.
*/
const WORD_TO_VALUE: Record<string, number> = {
  one: 1,
  two: 2,
  three: 3,
  four: 4,
  five: 5,
  six: 6,
  seven: 7,
  eight: 8,
  nine: 9,
  ten: 10,
  eleven: 11,
  twelve: 12,
  thirteen: 13,
  fourteen: 14,
  fifteen: 15,
  sixteen: 16,
  seventeen: 17,
  eighteen: 18,
  nineteen: 19,
  twenty: 20,
  thirty: 30,
  forty: 40,
  fifty: 50,
  sixty: 60,
  seventy: 70,
  eighty: 80,
  ninety: 90,
  "a hundred": 100,
  "a thousand": 1000,
};
