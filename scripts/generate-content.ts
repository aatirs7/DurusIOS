/*
  Generates assets/content/lessons.json, the content bundled with the app and
  seeded into SQLite on first launch.

  Reads from Neon rather than from the web repo's db/seed-data/lessons-1-4.ts,
  and that is forced rather than merely convenient: content ids are the
  server's (see src/data/schema.ts), and a parser emits {arabic, english, ...}
  with no identity at all. A card seeded under a locally minted id would fail
  its foreign key the first time the server sent a card_state for it. Neon also
  already holds everything the seed data has plus anything added through the
  web paste screen.

  Output is committed, so a clean clone builds with no database access and CI
  needs no DATABASE_URL. Run this when content changes:

      npm run content:build

  Not a build step. Deliberately manual.
*/

import { neon } from "@neondatabase/serverless";
import fs from "node:fs";
import path from "node:path";

const OUT = path.join(__dirname, "..", "assets", "content", "lessons.json");
const CONTENT_VERSION = 1;

/*
  The web repo's .env.local is the only place DATABASE_URL lives. Read it
  directly rather than copying the secret into this repo, and never write it
  anywhere: nothing in the generated JSON is derived from the connection string.
*/
function databaseUrl(): string {
  const fromEnv = process.env.DATABASE_URL;
  if (fromEnv) return fromEnv;

  const webEnv = process.env.DURUS_WEB_ENV ?? "C:/Users/aatir/Durus/.env.local";
  if (!fs.existsSync(webEnv)) {
    throw new Error(
      `No DATABASE_URL in the environment and no env file at ${webEnv}. ` +
        `Set DATABASE_URL, or point DURUS_WEB_ENV at the web repo's .env.local.`,
    );
  }
  for (const line of fs.readFileSync(webEnv, "utf8").split(/\r?\n/)) {
    const i = line.indexOf("=");
    if (i === -1) continue;
    if (line.slice(0, i).trim() !== "DATABASE_URL") continue;
    return line
      .slice(i + 1)
      .trim()
      .replace(/^["']|["']$/g, "");
  }
  throw new Error(`DATABASE_URL not found in ${webEnv}`);
}

type LessonRow = {
  id: number;
  number: number;
  title_ar: string;
  title_en: string;
  grammar_note: string | null;
};

type CardRow = {
  id: number;
  lesson_id: number;
  type: "vocab" | "phrase";
  arabic: string;
  english: string;
  transliteration: string | null;
  gender: "m" | "f" | null;
  plural: string | null;
  note: string | null;
};

async function main() {
  const sql = neon(databaseUrl());

  const lessons = (await sql.query(
    `select id, number, title_ar, title_en, grammar_note
       from lessons order by number`,
  )) as LessonRow[];

  /*
    Ordered by id, and the order is load-bearing rather than cosmetic.
    buildQueue's new-card bucket orders by cards.id, so this array's order is
    what makes new words arrive in book order rather than shuffled. A future
    edit that re-sorts this is a real behaviour change.
  */
  const cards = (await sql.query(
    `select id, lesson_id, type, arabic, english, transliteration, gender, plural, note
       from cards order by id`,
  )) as CardRow[];

  const known = new Set(lessons.map((l) => l.id));
  const orphans = cards.filter((c) => !known.has(c.lesson_id));
  if (orphans.length > 0) {
    throw new Error(
      `${orphans.length} card(s) reference a lesson that does not exist: ` +
        orphans
          .slice(0, 5)
          .map((c) => `#${c.id} -> lesson ${c.lesson_id}`)
          .join(", "),
    );
  }

  const seen = new Set<string>();
  for (const c of cards) {
    const key = `${c.lesson_id}\u0000${c.arabic}`;
    if (seen.has(key)) {
      throw new Error(
        `duplicate (lesson_id, arabic) for card #${c.id}: ${c.arabic}. ` +
          `The seed inserts against uniqueIndex(lessonId, arabic) and would ` +
          `fail inside the boot gate on a real device.`,
      );
    }
    seen.add(key);
  }

  const payload = {
    version: CONTENT_VERSION,
    generatedAt: new Date().toISOString(),
    source: "neon" as const,
    lessons: lessons.map((l) => ({
      id: l.id,
      number: l.number,
      titleAr: l.title_ar,
      titleEn: l.title_en,
      grammarNote: l.grammar_note,
    })),
    /* No unlockedAt: that is a per user fact set by onboarding, not content.
       No copyright string on any row either - per spec section 9.1 attribution
       is the About screen's job, not a column. */
    cards: cards.map((c) => ({
      id: c.id,
      lessonId: c.lesson_id,
      type: c.type,
      arabic: c.arabic,
      english: c.english,
      transliteration: c.transliteration,
      gender: c.gender,
      plural: c.plural,
      note: c.note,
    })),
  };

  fs.mkdirSync(path.dirname(OUT), { recursive: true });
  fs.writeFileSync(OUT, JSON.stringify(payload, null, 2) + "\n");

  const perLesson = new Map<number, number>();
  for (const c of cards) {
    const n = lessons.find((l) => l.id === c.lesson_id)!.number;
    perLesson.set(n, (perLesson.get(n) ?? 0) + 1);
  }
  console.log(`wrote ${OUT}`);
  console.log(`  lessons ${lessons.length}, cards ${cards.length}`);
  for (const l of lessons) {
    const n = perLesson.get(l.number) ?? 0;
    if (n > 0) console.log(`  lesson ${String(l.number).padStart(2)}  ${n} cards`);
  }
  const empty = lessons.filter((l) => !perLesson.get(l.number)).map((l) => l.number);
  if (empty.length > 0) console.log(`  no cards yet: lessons ${empty.join(", ")}`);
}

main().catch((e) => {
  console.error(e instanceof Error ? e.message : e);
  process.exit(1);
});
