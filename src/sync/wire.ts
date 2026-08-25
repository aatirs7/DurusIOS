/*
  The shape of one sync round trip.

  Push and pull travel together in a single request. Fewer states to reason
  about, and no window where a device has pushed but not pulled.

  The server applies the push BEFORE computing the pull, so a device sees its
  own rows echoed back carrying their assigned seq. That echo is the
  acknowledgement, not the HTTP status: a lost response simply means the next
  sync re-pushes, and the unique constraint on (profileId, clientId) absorbs it.
*/

export type WireReview = {
  /* Client minted, and the idempotency key. */
  clientId: string;
  deviceId: string;
  cardId: number;
  direction: "recognition" | "production" | "speed";
  grade: "again" | "hard" | "good" | "easy";
  msToAnswer: number;
  reviewedAt: number;
  practice: boolean;
  capped: boolean;
  fuzz: number | null;
  retractedAt: number | null;
  /* Present only on rows coming back down. */
  seq?: number;
};

/* Hearts and suspensions are sets: a row is present or tombstoned. */
export type WireSetRow = {
  cardId: number;
  deletedAt: number | null;
  updatedAt: number;
  deviceId: string;
  seq?: number;
};

export type WireSettings = {
  values: Record<string, unknown>;
  /*
    Per field rather than per row. Whole row last-write-wins is tempting because
    settings already has an updatedAt, and it is wrong for one specific and
    likely reason: the speed drill writes speedWindowMs automatically at the end
    of every run, so a speed run on one device would silently revert a
    currentLesson change made on another. The user reads that as "the app forgot
    which lesson I'm on", which breaks spec section 1.1 point 4 and is close to
    undiagnosable from a bug report.
  */
  fieldUpdatedAt: Record<string, number>;
};

export type SyncRequest = {
  deviceId: string;
  /* Opaque, and the server's. Never a device generated timestamp. */
  since: number;
  reviews: WireReview[];
  hearts: WireSetRow[];
  suspensions: WireSetRow[];
  settings: WireSettings | null;
};

export type RejectedRow = {
  kind: "review" | "heart" | "suspension";
  clientId?: string;
  cardId?: number;
  /* Permanent. A rejected row is never retried - retrying forever means one bad
     row blocks every row behind it, which is what kills naive outboxes. */
  reason: string;
};

export type SyncResponse = {
  cursor: number;
  hasMore: boolean;
  accepted: { reviews: number; hearts: number; suspensions: number; settings: boolean };
  rejected: RejectedRow[];
  reviews: WireReview[];
  hearts: WireSetRow[];
  suspensions: WireSetRow[];
  settings: WireSettings | null;
};

export type BootstrapResponse = {
  profileId: number;
  clerkUserId: string;
  displayName: string | null;
  createdNow: boolean;
  cursor: number;
};

/* One batch. Small enough that a failed round trip is cheap to repeat. */
export const PAGE = 500;
