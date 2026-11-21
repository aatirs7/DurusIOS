/*
  Accuracy check for Ask. npx tsx server/eval-ask.ts [gemini|groq|both] [filter]

  Each case lists the places that are right for it (well established, not
  matters of opinion). A returned ref counts as right when it overlaps any of
  them; a whole surah counts when that surah is in the list. Reports, per
  case and overall: precision (share of returned refs that are right), top
  (the first result is right), any (at least one is right), empties and time.

  Feelings get generous lists, since many places can comfort; history,
  stories and rulings get the passages where the thing actually is.
*/
import { readFileSync } from "node:fs";

import { ask } from "./ask";

type Case = { q: string; ok: string[]; none?: boolean; ruling?: boolean };

export const CASES: Case[] = [
  /* History of the Prophet's time */
  { q: "what happened at the battle of uhud", ok: ["3:121-175"] },
  { q: "battle of badr", ok: ["3:123-127", "8:5-19", "8:41-48", "8:67-71", "3:13"] },
  { q: "battle of the trench", ok: ["33:9-27"] },
  { q: "battle of hunayn", ok: ["9:25-27"] },
  { q: "the expedition of tabuk", ok: ["9:38-59", "9:81-96", "9:117-118"] },
  { q: "the slander against aisha", ok: ["24:11-26"] },
  { q: "the prophet and abu bakr in the cave", ok: ["9:40"] },
  { q: "pledge under the tree", ok: ["48:10", "48:18-19"] },
  { q: "story of the companions", ok: ["9:100", "9:117-118", "48:18-19", "48:29", "59:8-10", "8:72-75", "3:110", "33:23", "9:40", "3:121-175", "33:9-27", "24:11-26", "62:11", "9:88-89", "57:10", "4:95"] },
  { q: "the night journey", ok: ["17:1", "53:1-18"] },
  { q: "abu lahab", ok: ["111"] },
  { q: "zayd the adopted son", ok: ["33:4-5", "33:36-40"] },
  /* Prophets and stories */
  { q: "story of yusuf", ok: ["12"] },
  { q: "musa and pharaoh", ok: ["28:3-43", "20:9-79", "7:103-137", "26:10-68", "10:75-92", "2:49-50", "40:23-46", "79:15-26", "44:17-33", "17:101-103", "27:7-14", "43:46-56"] },
  { q: "musa and khidr", ok: ["18:60-82"] },
  { q: "dhul qarnayn", ok: ["18:83-98"] },
  { q: "people of the cave", ok: ["18:9-26"] },
  { q: "birth of isa", ok: ["19:16-34", "3:42-47", "66:12", "21:91"] },
  { q: "ibrahim breaks the idols", ok: ["21:51-71", "6:74-83", "26:69-89", "37:83-98", "19:41-50", "29:16-25"] },
  { q: "ibrahim and the sacrifice of his son", ok: ["37:99-113"] },
  { q: "nuh and the flood", ok: ["11:25-49", "71", "23:23-30", "26:105-122", "54:9-16", "7:59-64", "29:14-15", "10:71-73", "37:75-82"] },
  { q: "yunus in the whale", ok: ["37:139-148", "21:87-88", "68:48-50", "10:98"] },
  { q: "ayyub and his illness", ok: ["21:83-84", "38:41-44"] },
  { q: "sulayman and the queen of sheba", ok: ["27:20-44"] },
  { q: "sulayman and the ant", ok: ["27:17-19"] },
  { q: "luqman's advice to his son", ok: ["31:12-19"] },
  { q: "the army of the elephant", ok: ["105"] },
  { q: "qarun and his wealth", ok: ["28:76-82", "29:39", "40:24"] },
  { q: "talut and jalut", ok: ["2:246-251"] },
  { q: "the people of the ditch", ok: ["85:4-10"] },
  { q: "adam and iblis", ok: ["2:30-39", "7:11-27", "15:26-44", "17:61-65", "18:50", "20:115-123", "38:71-85"] },
  { q: "the two sons of adam", ok: ["5:27-32"] },
  { q: "the people of lut", ok: ["11:77-83", "15:57-77", "26:160-175", "7:80-84", "27:54-58", "29:28-35", "54:33-39", "37:133-138", "51:31-37"] },
  { q: "salih and the she camel", ok: ["7:73-79", "11:61-68", "26:141-159", "54:23-31", "91:11-15", "17:59", "27:45-53"] },
  /* Rulings and practice */
  { q: "inheritance shares", ok: ["4:7-14", "4:176", "2:180-182"] },
  { q: "how to do wudu", ok: ["5:6", "4:43"] },
  { q: "change of the qibla", ok: ["2:142-150", "2:115"] },
  { q: "alcohol and gambling", ok: ["5:90-91", "2:219", "4:43"] },
  { q: "interest riba", ok: ["2:275-281", "3:130", "4:161", "30:39"] },
  { q: "hijab and modesty", ok: ["24:30-31", "33:59", "33:53"] },
  { q: "fasting in ramadan", ok: ["2:183-187", "97"] },
  { q: "divorce", ok: ["2:226-237", "2:241", "65", "33:49", "4:35", "4:128-130"] },
  { q: "writing down a debt", ok: ["2:282-283", "2:280"] },
  { q: "ayat al kursi", ok: ["2:255"] },
  /* Feelings: generous */
  { q: "i feel sad", ok: ["94", "93", "13:28", "2:286", "3:139", "9:40", "2:155-157", "12:83-87", "39:53", "65:2-3", "2:153", "20:46", "15:97-99", "16:127", "10:62-65", "35:34", "3:173", "8:10", "57:22-23", "28:7", "2:214", "29:2-3", "41:30", "21:83-84", "21:87-88", "2:45"] },
  { q: "my mom is sick", ok: ["26:80", "21:83-84", "17:82", "10:57", "41:44", "38:41-44", "2:286", "94", "2:155-157", "2:186", "13:28", "17:23-24", "31:14", "46:15", "2:201", "40:60", "14:41", "71:28", "27:62", "2:153", "65:3"] },
  { q: "i want to repent", ok: ["39:53-54", "4:110", "25:68-71", "66:8", "3:133-136", "11:3", "2:222", "20:82", "4:17", "24:31", "7:23", "11:90", "110:3", "42:25", "6:54", "40:3", "21:87", "71:10-12", "2:37", "5:39", "9:104", "4:64"] },
  { q: "how to control anger", ok: ["3:133-134", "42:37", "41:34-36", "7:199-201", "16:126", "24:22", "25:63", "42:43"] },
  /* Holdout: not in the index, to see whether it generalises */
  { q: "the story of the cow bani israil", ok: ["2:67-73"] },
  { q: "the owners of the garden who refused the poor", ok: ["68:17-33", "18:32-44"] },
  { q: "the dam of saba", ok: ["34:15-19"] },
  { q: "the man who passed by a ruined town and died for a hundred years", ok: ["2:259"] },
  { q: "the believer from pharaoh's family", ok: ["40:28-45"] },
  { q: "the sabbath breakers turned into apes", ok: ["7:163-166", "2:65-66", "5:60"] },
  { q: "the mubahala challenge", ok: ["3:59-63"] },
  { q: "dawud and the two disputants", ok: ["38:21-26"] },
  { q: "the table spread from heaven", ok: ["5:112-115"] },
  { q: "the blind man the prophet frowned at", ok: ["80:1-12"] },
  /* Ruling questions: places only, never a verdict (checked separately) */
  { q: "is music haram", ok: ["31:6", "17:64", "53:59-61", "25:72", "23:3", "28:55"], ruling: true },
  { q: "can i eat pork", ok: ["2:173", "5:3", "6:145", "16:115"], ruling: true },
  { q: "how much zakat do i pay", ok: ["9:60", "2:43", "2:110", "2:177", "2:267", "2:271", "2:273", "2:276-277", "9:103", "9:34-35", "51:19", "70:24-25", "30:39"], ruling: true },
  /* Not about the Quran */
  { q: "best pizza near me", ok: [], none: true },
];

type R = { s: number; a: number; b: number } | { s: number; a: 0; b: 0 };
function parse(ref: string): R {
  const [s, rest] = ref.split(":");
  if (!rest) return { s: Number(s), a: 0, b: 0 };
  const [a, b] = rest.split("-").map(Number);
  return { s: Number(s), a, b: b ?? a };
}
export function right(ref: string, ok: string[]): boolean {
  const r = parse(ref);
  return ok.some((o) => {
    const g = parse(o);
    if (g.s !== r.s) return false;
    if (g.a === 0 || r.a === 0) return true;
    return r.a <= g.b && g.a <= r.b;
  });
}

const env: Record<string, string> = {};
for (const line of readFileSync(new URL("./.env.local", import.meta.url), "utf8").split(/\r?\n/)) {
  const m = line.match(/^([A-Z_]+)=(.*)$/);
  if (m) env[m[1]] = m[2];
}

const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function run(name: string, e: Record<string, string | undefined>, filter?: string) {
  let refs = 0, good = 0, top = 0, any = 0, empty = 0, n = 0, ms = 0, fails = 0;
  const bad: string[] = [];
  for (const c of CASES.filter((x) => !filter || x.q.includes(filter))) {
    const t = Date.now();
    let a;
    try {
      try {
        a = await ask(c.q, e);
      } catch (first) {
        if (!/429|not_configured|503/.test(String(first))) throw first;
        await wait(62_000);
        a = await ask(c.q, e);
      }
    } catch (err) {
      fails++;
      console.log(`  FAIL ${c.q}: ${String(err).slice(0, 80)}`);
      await wait(Number(e.EVAL_GAP_MS ?? 2500));
      continue;
    }
    const took = Date.now() - t;
    ms += took;
    n++;
    if (c.none) {
      if (a.results.length === 0) good++, refs++, top++, any++;
      else refs++, bad.push(`${c.q}: gave ${a.results.map((r) => r.ref).join(" ")}`);
      continue;
    }
    if (a.results.length === 0) {
      empty++;
      bad.push(`${c.q}: EMPTY`);
      continue;
    }
    const ruled = [a.line, ...a.results.map((r) => r.reason)].filter((x) => /\b(haram|halal|permissible|not allowed|is allowed|you must|you should)\b/i.test(x));
    if (ruled.length) bad.push(`${c.q}: RULING ${ruled.join(" | ")}`);
    if (c.ruling) console.log(`  (ruling case) ${c.q}: ${a.line}`);
    const ok = a.results.map((r) => right(r.ref, c.ok));
    refs += ok.length;
    good += ok.filter(Boolean).length;
    if (ok[0]) top++;
    if (ok.some(Boolean)) any++;
    const wrong = a.results.filter((_, i) => !ok[i]).map((r) => `${r.ref} (${r.reason})`);
    if (wrong.length) bad.push(`${c.q} [${took}ms]: ${wrong.join("; ")}`);
    await wait(Number(e.EVAL_GAP_MS ?? 2500));
  }
  console.log(`\n=== ${name}: ${n} cases, ${fails} failed`);
  console.log(`precision ${((100 * good) / Math.max(1, refs)).toFixed(0)}%  top ${((100 * top) / Math.max(1, n)).toFixed(0)}%  any ${((100 * any) / Math.max(1, n)).toFixed(0)}%  empty ${empty}  avg ${Math.round(ms / Math.max(1, n))}ms`);
  for (const b of bad) console.log(`  x ${b}`);
}

(async () => {
  const which = process.argv[2] ?? "gemini";
  const filter = process.argv[3];
  if (which === "gemini" || which === "both") await run("gemini", { GEMINI_API_KEY: env.GEMINI_API_KEY, GEMINI_MODEL: env.GEMINI_MODEL }, filter);
  if (which === "groq" || which === "both") await run("groq", { GROQ_API_KEY: env.GROQ_API_KEY }, filter);
  process.exit(0);
})();
