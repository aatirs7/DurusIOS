import { and, eq, inArray, isNull, sql } from "drizzle-orm";

import { db } from "@/data/client";
import { refoldCard } from "@/data/review";
import {
  account,
  cardHearts,
  cardSuspensions,
  reviews,
  settings,
  syncState,
} from "@/data/schema";

import {
  PAGE,
  type SyncRequest,
  type SyncResponse,
  type WireReview,
  type WireSetRow,
} from "./wire";

const API = process.env.EXPO_PUBLIC_DURUS_API ?? "";

export type SyncOutcome =
  | { ok: true; pushed: number; pulled: number }
  | { ok: false; reason: "offline" | "signed-out" | "no-api" | "gone" | "error" };

/*
  Single flight. Concurrent callers await the same run rather than racing, which
  matters because the triggers overlap by design - a foreground and the end of a
  session can land within the same second.
*/
let inFlight: Promise<SyncOutcome> | null = null;

export function syncNow(getToken: () => Promise<string | null>): Promise<SyncOutcome> {
  if (inFlight) return inFlight;
  inFlight = run(getToken).finally(() => {
    inFlight = null;
  });
  return inFlight;
}

async function run(getToken: () => Promise<string | null>): Promise<SyncOutcome> {
  if (!API) return { ok: false, reason: "no-api" };

  const acct = db.select().from(account).where(eq(account.isActive, true)).get();
  if (!acct) return { ok: false, reason: "signed-out" };

  const token = await getToken();
  if (!token) return { ok: false, reason: "signed-out" };

  const profileId = acct.profileId;
  const state = db
    .select()
    .from(syncState)
    .where(eq(syncState.profileId, profileId))
    .get();

  /* Backoff is persisted, so a relaunch cannot be used to hammer a failing
     server. */
  const now = Date.now();
  if (state?.backoffUntil && state.backoffUntil.getTime() > now) {
    return { ok: false, reason: "error" };
  }

  let pushed = 0;
  let pulled = 0;
  let cursor = Number(state?.cursor ?? 0);

  try {
    for (;;) {
      const body = collect(profileId, acct.clerkUserId, cursor);
      pushed += body.reviews.length + body.hearts.length + body.suspensions.length;

      const res = await fetch(`${API}/api/v1/sync`, {
        method: "POST",
        headers: {
          "content-type": "application/json",
          authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(body),
      });

      /* Terminal: the account no longer exists server side. Retrying can only
         fail, so stop rather than backing off forever. */
      if (res.status === 410) {
        db.update(account).set({ isActive: false }).run();
        return { ok: false, reason: "gone" };
      }
      if (!res.ok) throw new Error(`sync ${res.status}`);

      const data = (await res.json()) as SyncResponse;
      apply(profileId, body, data);
      pulled += data.reviews.length + data.hearts.length + data.suspensions.length;
      cursor = data.cursor;

      if (!data.hasMore) break;
    }

    db.update(syncState)
      .set({
        cursor: String(cursor),
        lastSuccessAt: new Date(),
        lastAttemptAt: new Date(),
        lastError: null,
        backoffUntil: null,
      })
      .where(eq(syncState.profileId, profileId))
      .run();

    return { ok: true, pushed, pulled };
  } catch (e) {
    /* Exponential with full jitter, capped at five minutes. */
    const attempts = state?.lastError ? 2 : 1;
    const capped = Math.min(5 * 60_000, 2_000 * 2 ** attempts);
    db.update(syncState)
      .set({
        lastAttemptAt: new Date(),
        lastError: e instanceof Error ? e.message : String(e),
        backoffUntil: new Date(Date.now() + Math.random() * capped),
      })
      .where(eq(syncState.profileId, profileId))
      .run();
    return { ok: false, reason: "offline" };
  }
}

/*
  Gathers one page of local work.

  The reviews table IS the outbox. syncedAt null means unacknowledged, so
  draining is a query rather than a second copy of the data in a parallel store
  that can disagree with it. Rows the server has permanently rejected carry a
  syncError and are excluded, because retrying one bad row forever blocks every
  row behind it.
*/
function collect(profileId: number, deviceId: string, since: number): SyncRequest {
  const pending = db
    .select()
    .from(reviews)
    .where(
      and(
        eq(reviews.profileId, profileId),
        isNull(reviews.syncedAt),
        isNull(reviews.syncError),
      ),
    )
    .limit(PAGE)
    .all();

  const hearts = db
    .select()
    .from(cardHearts)
    .where(and(eq(cardHearts.profileId, profileId), eq(cardHearts.dirty, true)))
    .limit(PAGE)
    .all();

  const suspensions = db
    .select()
    .from(cardSuspensions)
    .where(and(eq(cardSuspensions.profileId, profileId), eq(cardSuspensions.dirty, true)))
    .limit(PAGE)
    .all();

  const config = db
    .select()
    .from(settings)
    .where(and(eq(settings.profileId, profileId), eq(settings.dirty, true)))
    .get();

  return {
    deviceId,
    since,
    reviews: pending.map(
      (r): WireReview => ({
        clientId: r.clientId,
        deviceId: r.deviceId,
        cardId: r.cardId,
        direction: r.direction,
        grade: r.grade,
        msToAnswer: r.msToAnswer,
        reviewedAt: r.reviewedAt.getTime(),
        practice: r.practice,
        capped: r.capped,
        fuzz: r.fuzz,
        retractedAt: r.retractedAt ? r.retractedAt.getTime() : null,
      }),
    ),
    hearts: hearts.map(toSetRow),
    suspensions: suspensions.map(toSetRow),
    settings: config
      ? {
          values: stripLocal(config),
          fieldUpdatedAt: config.fieldUpdatedAt ?? {},
        }
      : null,
  };
}

function toSetRow(r: {
  cardId: number;
  deletedAt: Date | null;
  updatedAt: Date;
  deviceId: string;
}): WireSetRow {
  return {
    cardId: r.cardId,
    deletedAt: r.deletedAt ? r.deletedAt.getTime() : null,
    updatedAt: r.updatedAt.getTime(),
    deviceId: r.deviceId,
  };
}

/*
  Device-only settings never leave the phone.

  haptics and reduceMotion are properties of this handset, not of the account -
  syncing them would turn a preference into a surprise on the other device.
*/
const LOCAL_ONLY = new Set([
  "profileId",
  "dirty",
  "hapticsEnabled",
  "reduceMotion",
  "fieldUpdatedAt",
  /* The server's settings table has no column for this yet. Sending it would be
     silently dropped, which is worse than not sending it, because the field
     would look synced. */
  "currentBook",
]);

function stripLocal(config: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(config)) {
    if (LOCAL_ONLY.has(k)) continue;
    out[k] = v instanceof Date ? v.getTime() : v;
  }
  return out;
}

/*
  Applies one response, in ONE transaction with the cursor advance, so
  card_states is never observably inconsistent with reviews.
*/
function apply(profileId: number, sent: SyncRequest, data: SyncResponse) {
  const touched = new Set<string>();

  db.transaction((tx) => {
    /* The echo is the ack: mark exactly the rows that came back, not the rows
       we sent. */
    const echoed = new Set(data.reviews.map((r) => r.clientId));
    const ours = sent.reviews.filter((r) => echoed.has(r.clientId)).map((r) => r.clientId);
    if (ours.length > 0) {
      tx.update(reviews)
        .set({ syncedAt: new Date() })
        .where(inArray(reviews.clientId, ours))
        .run();
    }

    for (const r of data.rejected) {
      if (r.kind === "review" && r.clientId) {
        tx.update(reviews)
          .set({ syncError: r.reason })
          .where(eq(reviews.clientId, r.clientId))
          .run();
      }
    }

    /* Remote reviews. Set union on clientId - a union of appends has no
       conflict to resolve. */
    for (const r of data.reviews) {
      tx.insert(reviews)
        .values({
          profileId,
          cardId: r.cardId,
          direction: r.direction,
          grade: r.grade,
          msToAnswer: r.msToAnswer,
          reviewedAt: new Date(r.reviewedAt),
          practice: r.practice,
          capped: r.capped,
          fuzz: r.fuzz,
          retractedAt: r.retractedAt ? new Date(r.retractedAt) : null,
          clientId: r.clientId,
          deviceId: r.deviceId,
          syncedAt: new Date(),
          serverSeq: r.seq ?? null,
        })
        .onConflictDoUpdate({
          target: reviews.clientId,
          set: {
            retractedAt: r.retractedAt ? new Date(r.retractedAt) : null,
            syncedAt: new Date(),
            serverSeq: r.seq ?? null,
          },
        })
        .run();

      if (r.direction !== "speed") touched.add(`${r.cardId}:${r.direction}`);
    }

    for (const h of data.hearts) applySet(tx, cardHearts, profileId, h);
    for (const s of data.suspensions) applySet(tx, cardSuspensions, profileId, s);

    if (data.settings) {
      /* Per field: only take a remote value whose stamp is newer than ours. */
      const mine = tx.select().from(settings).where(eq(settings.profileId, profileId)).get();
      const mineStamps = mine?.fieldUpdatedAt ?? {};
      const next: Record<string, unknown> = {};
      const stamps = { ...mineStamps };

      for (const [k, at] of Object.entries(data.settings.fieldUpdatedAt)) {
        if ((mineStamps[k] ?? 0) >= at) continue;
        const v = data.settings.values[k];
        next[k] = k.endsWith("Since") && typeof v === "number" ? new Date(v) : v;
        stamps[k] = at;
      }

      if (Object.keys(next).length > 0) {
        tx.update(settings)
          .set({ ...next, fieldUpdatedAt: stamps, dirty: false })
          .where(eq(settings.profileId, profileId))
          .run();
      } else if (sent.settings) {
        tx.update(settings).set({ dirty: false }).where(eq(settings.profileId, profileId)).run();
      }
    }

    /* Sent set rows the server accepted are no longer dirty. */
    for (const [table, rows] of [
      [cardHearts, sent.hearts],
      [cardSuspensions, sent.suspensions],
    ] as const) {
      for (const row of rows) {
        tx.update(table)
          .set({ dirty: false })
          .where(and(eq(table.profileId, profileId), eq(table.cardId, row.cardId)))
          .run();
      }
    }
  });

  /*
    Refold every touched key AFTER the write transaction.

    A full refold per key rather than an incremental patch: a remote review can
    land chronologically before local ones, which invalidates everything after
    it. The cost is bounded - a card accumulates tens of reviews over a course -
    and it is the whole practical payoff of keeping card_states derived.
  */
  for (const key of touched) {
    const [cardId, direction] = key.split(":");
    refoldCard(db, profileId, Number(cardId), direction as "recognition" | "production");
  }
}

type SetTable = typeof cardHearts | typeof cardSuspensions;

function applySet(
  tx: Parameters<Parameters<typeof db.transaction>[0]>[0],
  table: SetTable,
  profileId: number,
  row: WireSetRow,
) {
  const mine = tx
    .select()
    .from(table)
    .where(and(eq(table.profileId, profileId), eq(table.cardId, row.cardId)))
    .get();

  /* Last write wins per key, over {present, deleted}. A tie keeps what is
     already here rather than flapping. */
  if (mine && mine.updatedAt.getTime() >= row.updatedAt) return;

  tx.insert(table)
    .values({
      profileId,
      cardId: row.cardId,
      updatedAt: new Date(row.updatedAt),
      deletedAt: row.deletedAt ? new Date(row.deletedAt) : null,
      deviceId: row.deviceId,
      dirty: false,
    })
    .onConflictDoUpdate({
      target: [table.profileId, table.cardId],
      set: {
        updatedAt: new Date(row.updatedAt),
        deletedAt: row.deletedAt ? new Date(row.deletedAt) : null,
        deviceId: row.deviceId,
        dirty: false,
      },
    })
    .run();
}

/* How many local rows are still waiting. Drives the one line in Settings. */
export function pendingCount(profileId: number): number {
  const row = db
    .select({ n: sql<number>`count(*)`.mapWith(Number) })
    .from(reviews)
    .where(
      and(
        eq(reviews.profileId, profileId),
        isNull(reviews.syncedAt),
        isNull(reviews.syncError),
      ),
    )
    .get();
  return row?.n ?? 0;
}
