/*
  Writes every lesson out as one markdown file: the plain English explanations,
  the book's own note, and the word list, in the order the lesson screen shows
  them.

  For sharing and for reading through in one go - the app shows one idea per
  screen, which is right for learning and useless for checking the whole thing
  over. Generated, so it cannot drift from what the app actually renders.

  Run with: npx tsx scripts/export-lessons.ts [outfile]
*/

import { writeFileSync } from "node:fs";
import { join } from "node:path";

import content from "../assets/content/lessons.json";
import { LESSON_NOTES } from "../src/engine/lessonNotes";
import { transliterate } from "../src/engine/transliterate";

type Card = {
  id: number;
  lessonId: number;
  type: string;
  arabic: string;
  english: string;
  transliteration: string | null;
  gender: string | null;
  plural: string | null;
  note: string | null;
};

const lessons = [...content.lessons].sort((a, b) => a.number - b.number);
const cards = content.cards as Card[];

const out: string[] = [];

out.push("# Durus, lesson content");
out.push("");
out.push(
  "Every lesson as the app shows it: the plain English explanation first, then " +
    "the book's own grammar note verbatim, then the words.",
);
out.push("");
out.push(
  "The plain English is written for this app. The grammar notes are the book's " +
    "and are quoted unchanged. Transliterations are derived from the vowelled " +
    "Arabic and checked against the book's own key.",
);
out.push("");
out.push(`Generated from the app's content. ${lessons.length} lessons, ${cards.length} cards.`);
out.push("");
out.push("---");
out.push("");

for (const lesson of lessons) {
  const note = LESSON_NOTES[lesson.number];
  const deck = cards.filter((c) => c.lessonId === lesson.id);

  out.push(`## Lesson ${lesson.number} — ${lesson.titleEn}`);
  out.push("");
  out.push(`${lesson.titleAr}`);
  out.push("");

  if (note) {
    out.push(`**${note.summary}**`);
    out.push("");

    for (const point of note.points) {
      out.push(`### ${point.title}`);
      out.push("");
      out.push(point.body);
      out.push("");
      if (point.example) {
        out.push(
          `> ${point.example.arabic} — *${transliterate(point.example.arabic)}* — ${point.example.gloss}`,
        );
        out.push("");
      }
    }
  }

  if (lesson.grammarNote) {
    out.push("### From the book");
    out.push("");
    out.push(`> ${lesson.grammarNote}`);
    out.push("");
  }

  out.push(`### Words (${deck.length})`);
  out.push("");

  if (deck.length === 0) {
    out.push("_None yet._");
    out.push("");
  } else {
    out.push("| Arabic | Reading | English | Gender | Plural | Note |");
    out.push("| --- | --- | --- | --- | --- | --- |");
    for (const c of deck) {
      const gender = c.type === "phrase" ? "phrase" : (c.gender ?? "");
      out.push(
        `| ${c.arabic} | ${c.transliteration ?? transliterate(c.arabic)} | ${c.english} | ${gender} | ${c.plural ?? ""} | ${c.note ?? ""} |`,
      );
    }
    out.push("");
  }

  out.push("---");
  out.push("");
}

const target = process.argv[2] ?? join(__dirname, "..", "docs", "lesson-content.md");
writeFileSync(target, out.join("\n"), "utf8");

console.log(`wrote ${target}`);
console.log(`${lessons.length} lessons, ${cards.length} cards`);
