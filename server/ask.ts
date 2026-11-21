/*
  Ask: type anything, get surahs and ayahs suggested by a free AI.

  GET /quran/ask?q=... returns { line, results: [{ ref, reason }] }.

  The AI only names places, it never writes Quran text: the app shows each
  place with its own Tanzil Arabic and the cached translation. Every ref is
  checked against the real ayah counts and anything that is not a real place
  is dropped, so an invented ref cannot reach the screen.

  Gemini first (GEMINI_API_KEY, GEMINI_MODEL), Groq as the fallback
  (GROQ_API_KEY). Both have free tiers. Answers are cached in memory per normalised query, and the
  response is edge cached for a day, so a popular question costs one call.
*/

/* Ayahs per surah, 1 to 114 (Tanzil). */
export const AYAH_COUNTS = [
  7, 286, 200, 176, 120, 165, 206, 75, 129, 109, 123, 111, 43, 52, 99, 128, 111, 110, 98, 135, 112, 78, 118, 64, 77, 227, 93, 88, 69, 60, 34, 30, 73, 54, 45, 83,
  182, 88, 75, 85, 54, 53, 89, 59, 37, 35, 38, 29, 18, 45, 60, 49, 62, 55, 78, 96, 29, 22, 24, 13, 14, 11, 11, 18, 12, 12, 30, 52, 52, 44, 28, 28, 20, 56, 40, 31,
  50, 40, 46, 42, 29, 19, 36, 25, 22, 17, 19, 26, 30, 20, 15, 21, 11, 8, 8, 19, 5, 8, 8, 11, 11, 8, 3, 9, 5, 4, 7, 3, 6, 3, 5, 4, 5, 6,
];

export type AskResult = { ref: string; reason: string };
export type AskAnswer = { line: string; results: AskResult[] };

export function normalizeQuery(q: string): string {
  return q.toLowerCase().replace(/\s+/g, " ").trim().slice(0, 200);
}

/* "2:255", "2:255-257" or "36". Returns the cleaned ref, or null if it is not a real place. */
export function checkRef(raw: string): string | null {
  const m = String(raw).trim().match(/^(\d{1,3})(?::(\d{1,3})(?:\s*-\s*(\d{1,3}))?)?$/);
  if (!m) return null;
  const s = Number(m[1]);
  if (s < 1 || s > 114) return null;
  if (!m[2]) return String(s);
  const n = AYAH_COUNTS[s - 1];
  const a = Number(m[2]);
  const b = m[3] ? Number(m[3]) : a;
  if (a < 1 || a > n || b < a || b > n || b - a > 10) return null;
  return a === b ? `${s}:${a}` : `${s}:${a}-${b}`;
}

const SYSTEM = `You help people find places in the Quran. The user types anything: a feeling, a topic, a story, a question, a half-remembered verse, a situation in their life.
Reply with JSON only: {"line": string, "results": [{"ref": string, "reason": string}]}.
- "ref" is a surah number ("18"), an ayah ("2:255"), or a short range ("94:5-6", at most 10 ayahs). Use the standard Hafs numbering.
- Give 3 to 6 results, the best first. Only cite places you are certain are correct and relevant. Prefer specific ayahs over whole surahs, unless the user asks for a surah.
- "reason" is one short plain sentence (under 16 words) on why this place answers them. Never quote or paraphrase the Quran's wording in it; describe it.
- "line" is one short, warm sentence (under 14 words) introducing the results, without religious rulings.
- People and events count: prophets, the companions of the Prophet (the Muhajirun and Ansar, the pledge under the tree, the cave, Badr, Uhud, the Trench, Hunayn, Tabuk, the slander), Maryam, Luqman, the people of the cave. Name the passages that speak about them, even when the names are not in the text.
- Every "reason" must be true to what that place actually says. Never attach a meaning to a ref you are unsure of; leave the ref out instead.
- Return no results only for requests that have nothing to do with the Quran, Islam, faith or life (for example code, sports scores, maths). Everything else gets results: {"line": "", "results": []}.`;

function parse(text: string): AskAnswer {
  let body: unknown;
  try {
    body = JSON.parse(text);
  } catch {
    const m = text.match(/\{[\s\S]*\}/);
    body = m ? JSON.parse(m[0]) : {};
  }
  const o = (body ?? {}) as { line?: unknown; results?: unknown };
  const seen = new Set<string>();
  const results: AskResult[] = [];
  for (const r of Array.isArray(o.results) ? o.results : []) {
    const ref = checkRef((r as { ref?: unknown })?.ref as string);
    const reason = String((r as { reason?: unknown })?.reason ?? "").trim().slice(0, 160);
    if (!ref || seen.has(ref)) continue;
    seen.add(ref);
    results.push({ ref, reason });
    if (results.length >= 6) break;
  }
  return { line: typeof o.line === "string" ? o.line.trim().slice(0, 140) : "", results };
}

async function groq(q: string, key: string, model: string): Promise<AskAnswer> {
  const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
    method: "POST",
    headers: { "content-type": "application/json", authorization: `Bearer ${key}` },
    body: JSON.stringify({
      model,
      temperature: 0.2,
      max_completion_tokens: 2500,
      reasoning_effort: "medium",
      messages: [
        { role: "system", content: SYSTEM },
        { role: "user", content: q },
      ],
    }),
    signal: AbortSignal.timeout(12000),
  });
  if (!res.ok) throw new Error(`groq ${res.status} ${(await res.text()).slice(0, 160)}`);
  const data = (await res.json()) as { choices?: { message?: { content?: string } }[] };
  return parse(data.choices?.[0]?.message?.content ?? "");
}

async function gemini(q: string, key: string, model: string): Promise<AskAnswer> {
  const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`, {
    method: "POST",
    headers: { "content-type": "application/json", "x-goog-api-key": key },
    body: JSON.stringify({
      systemInstruction: { parts: [{ text: SYSTEM }] },
      contents: [{ role: "user", parts: [{ text: q }] }],
      generationConfig: { temperature: 0.2, responseMimeType: "application/json" },
    }),
    signal: AbortSignal.timeout(12000),
  });
  if (!res.ok) throw new Error(`gemini ${res.status}`);
  const data = (await res.json()) as { candidates?: { content?: { parts?: { text?: string }[] } }[] };
  return parse(data.candidates?.[0]?.content?.parts?.[0]?.text ?? "");
}

const cache = new Map<string, AskAnswer>();
const MAX_CACHE = 2000;

export async function ask(raw: string, env: Record<string, string | undefined>): Promise<AskAnswer> {
  const q = normalizeQuery(raw);
  if (q.length < 2) return { line: "", results: [] };
  const hit = cache.get(q);
  if (hit) return hit;

  /* Gemini first: it knows where things are in the Quran far better. Groq is the fallback. */
  const tries: (() => Promise<AskAnswer>)[] = [];
  if (env.GEMINI_API_KEY) tries.push(() => gemini(q, env.GEMINI_API_KEY!, env.GEMINI_MODEL ?? "gemini-flash-lite-latest"));
  if (env.GROQ_API_KEY) {
    tries.push(() => groq(q, env.GROQ_API_KEY!, env.GROQ_MODEL ?? "openai/gpt-oss-120b"));
    tries.push(() => groq(q, env.GROQ_API_KEY!, "openai/gpt-oss-20b"));
  }
  if (tries.length === 0) throw new Error("ask_not_configured");

  let last: unknown;
  let empty: AskAnswer | null = null;
  for (const t of tries) {
    try {
      const answer = await t();
      /* An empty answer is often the model being shy, not the question being
         unanswerable: try the next model, and never keep an empty answer. */
      if (answer.results.length === 0) {
        empty = answer;
        continue;
      }
      if (cache.size >= MAX_CACHE) cache.delete(cache.keys().next().value as string);
      cache.set(q, answer);
      return answer;
    } catch (e) {
      last = e;
    }
  }
  if (empty) return empty;
  throw last instanceof Error ? last : new Error("ask_failed");
}
