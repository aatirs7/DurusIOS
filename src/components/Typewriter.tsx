import { useEffect, useMemo, useState } from "react";
import { useReducedMotion } from "react-native-reanimated";

import { Text } from "@/components/Text";

/*
  The search bar's placeholder, typed out and erased: one example search at a
  time, in grey, so the bar shows what it can do instead of a list of
  suggestions. Every example is a query search answers today. Under Reduce
  Motion it shows the first example, still.
*/

export const EXAMPLES = [
  "Surah about the battle of Badr",
  "Surah for hopelessness",
  "32nd surah",
  "Ayat al-Kursi",
  "I feel anxious",
  "The story of Yusuf",
  "When I can't sleep",
  "Verses about patience",
  "Surah about Maryam",
  "2:255",
  "Feeling far from Allah",
  "Juz Amma",
  "Verses about my parents",
  "I feel lonely",
  "Surah Al-Mulk",
  "The story of Musa",
  "Verses about gratitude",
  "When I'm grieving",
  "Surah Yaseen",
  "The last ten surahs",
  "I'm stressed about exams",
  "Verses about forgiveness",
  "The story of Ibrahim",
  "Surah for Friday",
  "Verses about marriage",
  "When I'm sick",
  "The 18th surah",
  "Verses about rizq",
  "I feel guilty",
  "The story of Nuh",
  "Surah Ar-Rahman",
  "Verses about death",
  "Juz 30",
  "When I'm angry",
  "Verses about charity",
  "The story of Adam",
  "I feel sad",
  "Surah Al-Kahf",
  "Verses about prayer",
  "Shortest surah",
  "When I lost someone",
  "Verses about hope",
  "The story of Yunus",
  "94:5",
  "Verses about trust in Allah",
  "I'm afraid",
  "Verses about kindness",
  "The story of the companions of the cave",
  "Surah for protection",
  "Verses about Jannah",
  "Longest surah",
  "When I'm overwhelmed",
  "Verses about mothers",
  "The story of Sulaiman",
  "Verses about knowledge",
  "Surah Al-Ikhlas",
  "I need guidance",
  "Verses about the night prayer",
  "Meccan surahs",
];

const TYPE_MS = 55;
const ERASE_MS = 28;
const HOLD_MS = 1500;

export function Typewriter({ style }: { style?: object }) {
  const still = useReducedMotion();
  const [i, setI] = useState(0);
  const [n, setN] = useState(0);
  const [erasing, setErasing] = useState(false);
  /* A fresh order each time the app opens, so the same few do not repeat:
     the first stays first, the rest are shuffled. */
  const order = useMemo(() => {
    const rest = EXAMPLES.slice(1);
    for (let k = rest.length - 1; k > 0; k--) {
      const j = Math.floor(Math.random() * (k + 1));
      [rest[k], rest[j]] = [rest[j], rest[k]];
    }
    return [EXAMPLES[0], ...rest];
  }, []);

  useEffect(() => {
    if (still) return;
    const text = order[i];
    let id: ReturnType<typeof setTimeout>;
    if (!erasing && n < text.length) id = setTimeout(() => setN(n + 1), TYPE_MS);
    else if (!erasing) id = setTimeout(() => setErasing(true), HOLD_MS);
    else if (n > 0) id = setTimeout(() => setN(n - 1), ERASE_MS);
    else
      id = setTimeout(() => {
        setErasing(false);
        setI((i + 1) % order.length);
      }, 300);
    return () => clearTimeout(id);
  }, [still, i, n, erasing, order]);

  return (
    <Text numberOfLines={1} color="inkFaint" style={style}>
      {still ? order[0] : order[i].slice(0, n) || " "}
    </Text>
  );
}
