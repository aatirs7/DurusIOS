import { useEffect, useState } from "react";
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
];

const TYPE_MS = 55;
const ERASE_MS = 28;
const HOLD_MS = 1500;

export function Typewriter({ style }: { style?: object }) {
  const still = useReducedMotion();
  const [i, setI] = useState(0);
  const [n, setN] = useState(0);
  const [erasing, setErasing] = useState(false);

  useEffect(() => {
    if (still) return;
    const text = EXAMPLES[i];
    let id: ReturnType<typeof setTimeout>;
    if (!erasing && n < text.length) id = setTimeout(() => setN(n + 1), TYPE_MS);
    else if (!erasing) id = setTimeout(() => setErasing(true), HOLD_MS);
    else if (n > 0) id = setTimeout(() => setN(n - 1), ERASE_MS);
    else
      id = setTimeout(() => {
        setErasing(false);
        setI((i + 1) % EXAMPLES.length);
      }, 300);
    return () => clearTimeout(id);
  }, [still, i, n, erasing]);

  return (
    <Text numberOfLines={1} color="inkFaint" style={style}>
      {still ? EXAMPLES[0] : EXAMPLES[i].slice(0, n) || " "}
    </Text>
  );
}
