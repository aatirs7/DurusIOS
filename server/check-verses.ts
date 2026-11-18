/* Live check of the verses route: npx tsx server/check-verses.ts */
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { handle } from "./handler";

for (const line of readFileSync(resolve(__dirname, ".env.local"), "utf8").split(/\r?\n/)) {
  const m = /^([A-Z_]+)=(.*)$/.exec(line);
  if (m) process.env[m[1]] = m[2];
}

async function main() {
  const r = await handle(new Request("http://local/quran/verses?keys=13:28,94:5,2:153&translation=20"), { ...process.env, DURUS_APP_KEY: "" });
  const j = await r.json();
  console.log(r.status, JSON.stringify(j).slice(0, 500));
  process.exit(0);
}
void main();
