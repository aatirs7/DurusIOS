/* Live check for Ask: npx tsx server/check-ask.ts "query" ... */
import { readFileSync } from "node:fs";

import { ask } from "./ask";

const env: Record<string, string> = {};
for (const line of readFileSync(new URL("./.env.local", import.meta.url), "utf8").split(/\r?\n/)) {
  const m = line.match(/^([A-Z_]+)=(.*)$/);
  if (m) env[m[1]] = m[2];
}

const qs = process.argv.slice(2);
(async () => {
  for (const q of qs.length ? qs : ["surah about the battle of badr", "i feel hopeless", "what does the quran say about debt", "my mom is sick"]) {
    const t = Date.now();
    const a = await ask(q, env);
    console.log(`\n${q}  (${Date.now() - t}ms)\n  ${a.line}`);
    for (const r of a.results) console.log(`  ${r.ref.padEnd(9)} ${r.reason}`);
  }
  process.exit(0);
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
