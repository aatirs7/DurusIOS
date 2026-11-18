/*
  Quran Foundation Content API client, server side only.

  Holds the client secret, so it must never be imported by the app. It reads
  QF_CLIENT_ID, QF_CLIENT_SECRET and QF_ENV (prelive | production) from the
  environment. New clients get granular scopes, not `content` (verified
  2026-11-18): this asks for the five the Durus client is approved for.

  Not deployed anywhere yet. Where it runs, and who may call it, is the
  owner's decision (see docs/relay/from-prime.md).
*/
import { footnoteIds, normalizeVerse, parseTranslation, type QfChapter, type RawVerse } from "../src/quran/qf";

type Env = "prelive" | "production";

const HOSTS: Record<Env, { auth: string; api: string }> = {
  prelive: { auth: "https://prelive-oauth2.quran.foundation", api: "https://apis-prelive.quran.foundation/content/api/v4" },
  production: { auth: "https://oauth2.quran.foundation", api: "https://apis.quran.foundation/content/api/v4" },
};

const SCOPES = "content.quran.read content.translations.read content.audio.read content.sync.read content.tafsirs.read";

export type QfConfig = { clientId: string; clientSecret: string; env: Env; fetch?: typeof fetch };

export function configFromEnv(env: Record<string, string | undefined> = process.env): QfConfig {
  const clientId = env.QF_CLIENT_ID;
  const clientSecret = env.QF_CLIENT_SECRET;
  if (!clientId || !clientSecret) throw new Error("QF_CLIENT_ID and QF_CLIENT_SECRET must be set");
  return { clientId, clientSecret, env: env.QF_ENV === "production" ? "production" : "prelive" };
}

export class QfClient {
  private token: { value: string; expires: number } | null = null;
  private f: typeof fetch;
  constructor(private cfg: QfConfig) {
    this.f = cfg.fetch ?? fetch;
  }

  get env(): Env {
    return this.cfg.env;
  }

  /* Cached until 30 seconds before expiry, as the docs ask. */
  private async accessToken(): Promise<string> {
    if (this.token && Date.now() < this.token.expires - 30_000) return this.token.value;
    const basic = Buffer.from(`${this.cfg.clientId}:${this.cfg.clientSecret}`).toString("base64");
    const res = await this.f(`${HOSTS[this.cfg.env].auth}/oauth2/token`, {
      method: "POST",
      headers: { Authorization: `Basic ${basic}`, "Content-Type": "application/x-www-form-urlencoded" },
      body: `grant_type=client_credentials&scope=${encodeURIComponent(SCOPES)}`,
    });
    const j = (await res.json()) as { access_token?: string; expires_in?: number; error?: string };
    if (!res.ok || !j.access_token) throw new Error(`token: ${res.status} ${j.error ?? ""}`);
    this.token = { value: j.access_token, expires: Date.now() + (j.expires_in ?? 3600) * 1000 };
    return this.token.value;
  }

  /* GET with the two required headers. Retries 429 and 5xx with backoff and jitter. */
  async get<T>(path: string): Promise<T> {
    for (let attempt = 0; ; attempt++) {
      const res = await this.f(`${HOSTS[this.cfg.env].api}/${path}`, {
        headers: { "x-auth-token": await this.accessToken(), "x-client-id": this.cfg.clientId },
      });
      if (res.ok) return (await res.json()) as T;
      if (res.status === 401 && attempt === 0) {
        this.token = null;
        continue;
      }
      if ((res.status === 429 || res.status >= 500) && attempt < 4) {
        await new Promise((r) => setTimeout(r, 400 * 2 ** attempt + Math.random() * 250));
        continue;
      }
      throw new Error(`${path}: ${res.status}`);
    }
  }

  async translations(): Promise<{ id: number; name: string; author: string; language: string }[]> {
    const j = await this.get<{ translations: { id: number; name: string; author_name: string; language_name: string }[] }>(
      "resources/translations?language=en",
    );
    return j.translations.map((t) => ({ id: t.id, name: t.name, author: t.author_name, language: t.language_name }));
  }

  async recitations(): Promise<{ id: number; name: string }[]> {
    const j = await this.get<{ recitations: { id: number; reciter_name: string; style: string | null }[] }>("resources/recitations?language=en");
    return j.recitations.map((r) => ({ id: r.id, name: r.style ? `${r.reciter_name} (${r.style})` : r.reciter_name }));
  }

  /* One translation for a few specific ayahs, for search results. */
  async verses(keys: string[], translationId: number): Promise<{ key: string; translation: ReturnType<typeof parseTranslation> | null }[]> {
    return Promise.all(
      keys.map(async (key) => {
        const j = await this.get<{ verse: RawVerse }>(`verses/by_key/${key}?translations=${translationId}&words=false`);
        const t = j.verse.translations?.find((x) => x.resource_id === translationId) ?? j.verse.translations?.[0];
        return { key, translation: t ? parseTranslation(t.text) : null };
      }),
    );
  }

  /* Every ayah of a surah with words, one translation, recitation audio and footnotes. */
  async chapter(surah: number, opts: { translationId: number | null; reciterId: number | null; translationName?: string | null }): Promise<QfChapter> {
    const raw: RawVerse[] = [];
    for (let page = 1; ; page++) {
      const q = new URLSearchParams({ language: "en", words: "true", per_page: "50", page: String(page) });
      q.set("word_fields", "text_uthmani");
      if (opts.translationId !== null) q.set("translations", String(opts.translationId));
      if (opts.reciterId !== null) q.set("audio", String(opts.reciterId));
      const j = await this.get<{ verses: RawVerse[]; pagination: { next_page: number | null } }>(`verses/by_chapter/${surah}?${q}`);
      raw.push(...j.verses);
      if (!j.pagination.next_page) break;
    }
    const ayahs = raw.map((v) => normalizeVerse(v, opts.translationId));
    const ids = [...new Set(ayahs.flatMap((a) => footnoteIds(a.translation)))];
    const footnotes: Record<number, string> = {};
    for (const id of ids) {
      const j = await this.get<{ foot_note: { text: string } }>(`foot_notes/${id}`);
      footnotes[id] = j.foot_note.text.replace(/<[^>]+>/g, "");
    }
    return {
      surah,
      translationId: opts.translationId,
      translationName: opts.translationName ?? null,
      reciterId: opts.reciterId,
      ayahs,
      footnotes,
      fetchedAt: Date.now(),
      env: this.cfg.env,
    };
  }
}
