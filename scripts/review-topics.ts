/* Writes docs/review/topics.md: every search topic, its references and its approval state. */
import { writeFileSync } from "node:fs";
import { resolve } from "node:path";

import { THEMES } from "../src/quran/themes";

const lines = ["# Search topics for review", "", "Approve by setting `verified: true` in src/quran/themes.ts, or reply \"approve all\" in the chat.", ""];
const groups: Record<string, typeof THEMES> = {};
for (const t of THEMES) (groups[t.kind] ??= []).push(t);
for (const [kind, list] of Object.entries(groups)) {
  lines.push(`## ${kind[0].toUpperCase()}${kind.slice(1)}s`, "");
  for (const t of list) lines.push(`- ${t.verified ? "[approved]" : "[to review]"} **${t.label}**: ${t.refs.join(", ")}`);
  lines.push("");
}
const pending = THEMES.filter((t) => !t.verified).length;
lines.push(`${THEMES.length} topics, ${THEMES.length - pending} approved, ${pending} to review. ${THEMES.reduce((n, t) => n + t.keywords.length, 0)} keywords and phrases.`);
writeFileSync(resolve(__dirname, "../docs/review/topics.md"), lines.join("\n") + "\n");
console.log(lines[lines.length - 1]);
