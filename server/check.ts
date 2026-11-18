/*
  Live check against Quran Foundation with the credentials in server/.env.local.
  Prints shapes and counts only, never the secret or the token.

    npx tsx server/check.ts [surah] [translationId] [reciterId]
*/
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { handle } from "./handler";

for (const line of readFileSync(resolve(__dirname, ".env.local"), "utf8").split(/\r?\n/)) {
  const m = /^([A-Z_]+)=(.*)$/.exec(line);
  if (m) process.env[m[1]] = m[2];
}

async function main() {
  const [surah = "1", tr = "85", rec = "7"] = process.argv.slice(2);
  const res = await (await handle(new Request("http://local/quran/resources"))).json();
  console.log("env", res.env, "translations", res.translations?.length, "reciters", res.reciters?.length);
  const r = await handle(new Request(`http://local/quran/chapter/${surah}?translation=${tr}&reciter=${rec}`));
  const c = await r.json();
  if (r.status !== 200) return console.log("chapter error", r.status, c);
  const a = c.ayahs[1] ?? c.ayahs[0];
  console.log(`surah ${c.surah}: ${c.ayahs.length} ayahs, ${Object.keys(c.footnotes).length} footnotes`);
  console.log("sample", a.key, "words", a.words.length, "translation parts", a.translation?.length, "audio", !!a.audio, "segments", a.audio?.segments.length);
  console.log("first word", JSON.stringify(a.words[0]));
}

void main();
