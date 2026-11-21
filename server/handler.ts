/*
  The Durus Quran endpoint, as a plain Fetch API handler: Request in, Response
  out. It runs unchanged on any host that speaks the Fetch API (Vercel, EAS
  Hosting, Cloudflare, Node 18+ via a tiny adapter).

  Routes
    GET /quran/resources          translations and reciters available
    GET /quran/chapter/:n?translation=20&reciter=7
    GET /quran/verses?keys=13:28,94:5&translation=20
    GET /quran/words?keys=2:255,1:2   English word meanings, by ayah
    GET /quran/ask?q=i feel hopeless   free AI picks, refs checked (ask.ts)

  Access: if DURUS_APP_KEY is set, callers must send it as x-durus-key. Who may
  call this (anyone, signed-in users via Clerk, or an app key) is still the
  owner's decision; until then the key is the switch.
*/
import { ask } from "./ask";
import { QfClient, configFromEnv } from "./qf";

let client: QfClient | null = null;
function qf(env: Record<string, string | undefined>): QfClient {
  client ??= new QfClient(configFromEnv(env));
  return client;
}

const json = (body: unknown, status = 200, cache = "public, max-age=3600") =>
  new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json", "cache-control": cache } });

/*
  Abuse protection. The app key ships inside the app, so anyone can pull it
  out; this caps how often one address may call. Per server instance and in
  memory (Vercel runs a handful), which is enough to stop a script hammering
  Ask or the Quran Foundation proxy without a database round trip. Answers
  served from Vercel's edge cache never reach here and cost nothing.

  Ask (the AI): 20 a minute, 300 a day per address. Everything else: 240 a
  minute. Over the limit: 429, never cached, and the app falls back to its
  own search.
*/
type Bucket = { minute: number; inMinute: number; day: string; inDay: number };
const buckets = new Map<string, Bucket>();
const LIMITS = { ask: { minute: 20, day: 300 }, other: { minute: 240, day: 20_000 } } as const;

export function overLimit(ip: string, kind: keyof typeof LIMITS, now = Date.now()): boolean {
  const key = `${kind}:${ip}`;
  const minute = Math.floor(now / 60_000);
  const day = new Date(now).toISOString().slice(0, 10);
  let b = buckets.get(key);
  if (!b) {
    if (buckets.size > 50_000) buckets.clear();
    b = { minute, inMinute: 0, day, inDay: 0 };
    buckets.set(key, b);
  }
  if (b.minute !== minute) {
    b.minute = minute;
    b.inMinute = 0;
  }
  if (b.day !== day) {
    b.day = day;
    b.inDay = 0;
  }
  b.inMinute++;
  b.inDay++;
  return b.inMinute > LIMITS[kind].minute || b.inDay > LIMITS[kind].day;
}

function clientIp(req: Request): string {
  return (req.headers.get("x-forwarded-for") ?? "").split(",")[0].trim() || req.headers.get("x-real-ip") || "unknown";
}

export async function handle(req: Request, env: Record<string, string | undefined> = process.env): Promise<Response> {
  if (req.method !== "GET") return json({ error: "method" }, 405, "no-store");
  if (env.DURUS_APP_KEY && req.headers.get("x-durus-key") !== env.DURUS_APP_KEY) return json({ error: "forbidden" }, 403, "no-store");

  const url = new URL(req.url);
  const parts = url.pathname.replace(/^\/+|\/+$/g, "").split("/");
  /* Accept a mount prefix such as /api. */
  const i = parts.indexOf("quran");
  const route = i >= 0 ? parts.slice(i + 1) : [];
  if (overLimit(clientIp(req), route[0] === "ask" ? "ask" : "other")) return json({ error: "slow_down" }, 429, "no-store");

  try {
    if (route[0] === "resources") {
      const [translations, reciters] = await Promise.all([qf(env).translations(), qf(env).recitations()]);
      return json({ env: qf(env).env, translations, reciters });
    }
    if (route[0] === "ask") {
      const q = url.searchParams.get("q") ?? "";
      const answer = await ask(q, env);
      /* An empty answer is not kept at the edge, so the next try asks again. */
      return answer.results.length > 0 ? json(answer) : json(answer, 200, "no-store");
    }
    if (route[0] === "verses") {
      /* Up to 20 keys like 13:28, for search results. */
      const keys = (url.searchParams.get("keys") ?? "")
        .split(",")
        .filter((k) => /^\d{1,3}:\d{1,3}$/.test(k))
        .slice(0, 20);
      const t = url.searchParams.get("translation");
      if (keys.length === 0) return json({ verses: [] });
      const verses = await qf(env).verses(keys, t && /^\d+$/.test(t) ? Number(t) : 20);
      return json({ verses });
    }
    if (route[0] === "words") {
      /* Up to 60 ayah keys like 2:255: each ayah's English word meanings, in word order. */
      const keys = (url.searchParams.get("keys") ?? "")
        .split(",")
        .filter((k) => /^\d{1,3}:\d{1,3}$/.test(k))
        .slice(0, 60);
      if (keys.length === 0) return json({ verses: [] });
      return json({ verses: await qf(env).wordMeanings(keys) });
    }
    if (route[0] === "chapter" && /^\d{1,3}$/.test(route[1] ?? "")) {
      const n = Number(route[1]);
      if (n < 1 || n > 114) return json({ error: "surah" }, 400, "no-store");
      const t = url.searchParams.get("translation");
      const r = url.searchParams.get("reciter");
      const chapter = await qf(env).chapter(n, {
        translationId: t && /^\d+$/.test(t) ? Number(t) : null,
        reciterId: r && /^\d+$/.test(r) ? Number(r) : null,
      });
      return json(chapter);
    }
    return json({ error: "not found" }, 404, "no-store");
  } catch (e) {
    return json({ error: String((e as Error).message ?? e) }, 502, "no-store");
  }
}

/* Reset the cached client; for tests. */
export function resetClient() {
  client = null;
}
