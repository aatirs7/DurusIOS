import type { SearchResult } from "./search";
import { countRange, type StatusMaps } from "./status";
import { SURAHS } from "./tanzil";
import type { Theme } from "./themes";

/*
  A short reply above the results, so search answers like a person rather than
  listing hits. Deterministic and local. It only says things the app knows:
  your marks, where you stopped, the time and day. It never explains or
  interprets an ayah (no tafsir), and it never praises.
*/

export type ReplyContext = {
  maps: StatusMaps;
  lastRead: { surah: number; ayah: number } | null;
  now: Date;
};

export type Reply = { text: string; tone: "answer" | "nothing" | "pending" };

const lower = (s: string) => s.charAt(0).toLowerCase() + s.slice(1);

function memorizedOf(maps: StatusMaps, n: number): number {
  const s = SURAHS[n - 1];
  return countRange(maps.memorized, s.start, s.start + s.ayahs);
}

function surahsIn(theme: Theme): number[] {
  return theme.refs.map((r) => Number(r.split(":")[0]));
}

function themeReply(t: Theme, ctx: ReplyContext): string {
  const hour = ctx.now.getHours();
  let lead: string;
  if (t.kind === "feeling") lead = `When you are dealing with ${lower(t.label)}, these are ayahs to turn to.`;
  else if (t.kind === "passage") lead = `${t.label}.`;
  else lead = `On ${lower(t.label)}, here is where to read.`;
  if (t.id === "sleep" && (hour >= 21 || hour < 4)) lead = "It is late. These are read before sleep.";
  if (t.id === "friday" && ctx.now.getDay() === 5) lead = "It is Friday. Al-Kahf is here.";

  /* Personal: point at a surah from this topic they already carry. */
  const known = surahsIn(t).find((n) => {
    const s = SURAHS[n - 1];
    return memorizedOf(ctx.maps, n) === s.ayahs;
  });
  if (known) return `${lead} You already know ${SURAHS[known - 1].en} by heart, so you can recite it from memory.`;
  return lead;
}

export function reply(query: string, result: SearchResult, ctx: ReplyContext): Reply | null {
  const q = query.trim();
  if (!q) return null;
  const first = result.hits[0];

  if (!first) {
    return { text: "Nothing yet for that. Try how you feel, a surah name, an ayah like 2:255, or Arabic words.", tone: "nothing" };
  }

  if (result.label) return { text: `${result.label}: ${result.total}.`, tone: "answer" };

  if (first.kind === "theme") return { text: themeReply(first.theme, ctx), tone: "answer" };

  if (first.kind === "surah") {
    const s = SURAHS[first.surah - 1];
    const m = memorizedOf(ctx.maps, s.n);
    const parts = [`${s.en}, ${lower(s.meaning)}. ${s.ayahs} ayahs, ${s.place}.`];
    if (m === s.ayahs) parts.push("You have it memorized.");
    else if (m > 0) parts.push(`You have memorized ${m} of its ayahs.`);
    if (ctx.lastRead?.surah === s.n) parts.push(`You stopped at ayah ${ctx.lastRead.ayah}.`);
    return { text: parts.join(" "), tone: "answer" };
  }

  if (first.kind === "ayah") {
    const s = SURAHS[first.surah - 1];
    const known = ctx.maps.memorized[first.index] === 1;
    return { text: `${s.en} ${first.surah}:${first.ayah}.${known ? " You have this one memorized." : ""}`, tone: "answer" };
  }

  if (first.kind === "juz") return { text: `Juz ${first.juz}.`, tone: "answer" };

  /* Arabic words. */
  return { text: `${result.total} ${result.total === 1 ? "place" : "places"} in the Quran with "${q}".`, tone: "answer" };
}
