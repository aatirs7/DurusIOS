/*
  The device's SQLite schema. A mirror of the Postgres schema in the web repo
  (db/schema.ts), which is the durable copy; this one is a local cache and an
  offline write buffer.

  Written against drizzle-orm/sqlite-core rather than the expo driver, so the
  same file can be driven by better-sqlite3 in the node test project. That is
  what lets the real queries and the real generated migrations be tested without
  the expo-sqlite native module.

  Type mapping, per spec section 2.1:
    serial                  -> integer primaryKey autoIncrement
    timestamp with tz       -> integer mode timestamp_ms   (epoch ms, never a
                               formatted local time)
    real                    -> real
    boolean                 -> integer mode boolean
    pgEnum                  -> text with an enum list
*/

import {
  index,
  integer,
  primaryKey,
  real,
  sqliteTable,
  text,
  uniqueIndex,
} from "drizzle-orm/sqlite-core";

/* Bumped by hand whenever either schema changes. schema-lockstep.test.ts
   asserts this matches the Postgres side, so a change to one file that forgets
   the other fails here rather than as a 400 from the API three weeks later. */
export const SCHEMA_REVISION = 3;

/*
  Two direction enums, kept separate for the reason the web schema gives:
  card_states has two directions, reviews has three, because speed runs are
  logged but never scheduled.
*/
const CARD_TYPE = ["vocab", "phrase"] as const;
const GENDER = ["m", "f"] as const;

/*
  Which deck a lesson belongs to.

  The numbers trainer's stages are lessons: ordered, gated, taught once, and
  full of cards. Making them lesson rows means one scheduler, one fold and one
  sync path, and every query that joins through lesson_id keeps working
  unchanged - which is the whole reason they are not a parallel table with a
  parallel scheduler behind it.

  What they must not do is turn up in the book. This column is what keeps them
  out, and it is on LESSONS rather than on cards because a card's deck is
  simply its lesson's. Denormalising it onto cards invites the two to disagree,
  and every query that needs the filter is already joining lessons to read its
  number.
*/
const DECK = ["book", "numbers"] as const;
const STATE_DIRECTION = ["recognition", "production"] as const;
const REVIEW_DIRECTION = ["recognition", "production", "speed"] as const;
const GRADE = ["again", "hard", "good", "easy"] as const;

/* ------------------------------------------------------------------ content */

/*
  Content is server owned and pull only, so ids are the server's and are stored
  verbatim. No autoIncrement: a locally minted lesson id would not match the
  card.lessonId the server sends, and the join would silently return nothing
  rather than fail. The bundled asset in assets/content/lessons.json is
  generated from the same database for the same reason.
*/
export const lessons = sqliteTable("lessons", {
  id: integer("id").primaryKey(),
  number: integer("number").notNull().unique(),
  titleAr: text("title_ar").notNull(),
  titleEn: text("title_en").notNull(),
  grammarNote: text("grammar_note"),
  /* Defaults to book, so every row that exists is a book lesson without a
     backfill and every existing query means what it meant before. */
  deck: text("deck", { enum: DECK }).notNull().default("book"),
  /* Null means the lesson has not been covered in class yet. The app never
     unlocks a lesson on its own; the user advances settings.currentLesson. */
  unlockedAt: integer("unlocked_at", { mode: "timestamp_ms" }),
});

export const cards = sqliteTable(
  "cards",
  {
    id: integer("id").primaryKey(),
    lessonId: integer("lesson_id")
      .notNull()
      .references(() => lessons.id, { onDelete: "cascade" }),
    type: text("type", { enum: CARD_TYPE }).notNull().default("vocab"),
    arabic: text("arabic").notNull(),
    english: text("english").notNull(),
    transliteration: text("transliteration"),
    gender: text("gender", { enum: GENDER }),
    plural: text("plural"),
    note: text("note"),
    /* $defaultFn is a JS side default, not a SQL one. Drizzle's SQLite integer
       has no defaultNow(), so any raw SQL insert must supply this itself. */
    createdAt: integer("created_at", { mode: "timestamp_ms" })
      .notNull()
      .$defaultFn(() => new Date()),
  },
  (t) => [
    index("cards_lesson_idx").on(t.lessonId),
    /* Pasting the same block twice should not double the deck. */
    uniqueIndex("cards_lesson_arabic_idx").on(t.lessonId, t.arabic),
  ],
);

/* ----------------------------------------------------------------- identity */

/*
  Identity is Clerk's; the local integer id is ours.

  The key on every scoped table stays an integer rather than becoming the Clerk
  user id: the app has to produce a profileId before Clerk has loaded, because a
  cold launch with no network is a supported state, and rewriting every scoped
  row once a network identity arrives is not something to design in.

  There is no unique index on lower(name). That existed on the web because name
  plus PIN *was* the credential; under Clerk two users called "Aatir" are two
  accounts and name is a display field.
*/
export const profiles = sqliteTable(
  "profiles",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    clerkUserId: text("clerk_user_id"),
    name: text("name").notNull(),
    createdAt: integer("created_at", { mode: "timestamp_ms" })
      .notNull()
      .$defaultFn(() => new Date()),
  },
  (t) => [uniqueIndex("profiles_clerk_user_idx").on(t.clerkUserId)],
);

/* -------------------------------------------------------------- scheduling */

/*
  DERIVED. card_states is a deterministic fold over reviews and nothing else,
  recomputed locally by src/engine/fold.ts.

  It is never synced, carries no clientId, no syncedAt and no deviceId, and can
  be deleted and rebuilt at any time. That property is the cheapest repair
  action this design has and it is worth protecting: do not add a sync column
  here.
*/
export const cardStates = sqliteTable(
  "card_states",
  {
    profileId: integer("profile_id")
      .notNull()
      .references(() => profiles.id, { onDelete: "cascade" }),
    cardId: integer("card_id")
      .notNull()
      .references(() => cards.id, { onDelete: "cascade" }),
    direction: text("direction", { enum: STATE_DIRECTION }).notNull(),
    ease: real("ease").notNull().default(2.5),
    intervalDays: real("interval_days").notNull().default(0),
    repetitions: integer("repetitions").notNull().default(0),
    dueAt: integer("due_at", { mode: "timestamp_ms" })
      .notNull()
      .$defaultFn(() => new Date()),
    lapses: integer("lapses").notNull().default(0),
  },
  (t) => [
    primaryKey({ columns: [t.profileId, t.cardId, t.direction] }),
    /* The due query is the hot path. */
    index("card_states_due_idx").on(t.profileId, t.dueAt),
  ],
);

/*
  Append only. undoGrade sets retractedAt rather than deleting: a log with a
  tombstone can be replayed, one with a hole in it cannot.

  This table is also the outbox. syncedAt null means the row has not been
  acknowledged by the server, so draining is a query rather than a second copy
  of the data in a parallel store that can disagree with it.
*/
export const reviews = sqliteTable(
  "reviews",
  {
    /* Local only, and NOT the server's id. Nothing joins on it across the wire;
       clientId is the sync key. */
    id: integer("id").primaryKey({ autoIncrement: true }),
    profileId: integer("profile_id")
      .notNull()
      .references(() => profiles.id, { onDelete: "cascade" }),
    cardId: integer("card_id")
      .notNull()
      .references(() => cards.id, { onDelete: "cascade" }),
    direction: text("direction", { enum: REVIEW_DIRECTION }).notNull(),
    grade: text("grade", { enum: GRADE }).notNull(),
    msToAnswer: integer("ms_to_answer").notNull(),
    reviewedAt: integer("reviewed_at", { mode: "timestamp_ms" })
      .notNull()
      .$defaultFn(() => new Date()),

    /* The three inputs schedule() consumed that were not being stored. Without
       them the fold is not deterministic. See src/engine/fold.ts. */
    practice: integer("practice", { mode: "boolean" }).notNull().default(false),
    capped: integer("capped", { mode: "boolean" }).notNull().default(false),
    fuzz: real("fuzz"),

    retractedAt: integer("retracted_at", { mode: "timestamp_ms" }),

    /* ULID minted on this device. The idempotency key: a retry whose response
       was lost inserts once, server side, on conflict do nothing. */
    clientId: text("client_id").notNull(),
    deviceId: text("device_id").notNull(),
    syncedAt: integer("synced_at", { mode: "timestamp_ms" }),
    serverSeq: integer("server_seq"),
    /* A permanent server rejection. The row stays and still counts locally,
       because a review the server refuses is still a thing the user did, but it
       is excluded from future batches: retrying forever means one bad row
       blocks every row behind it. */
    syncError: text("sync_error"),
  },
  (t) => [
    uniqueIndex("reviews_client_id_idx").on(t.clientId),
    index("reviews_reviewed_at_idx").on(t.profileId, t.reviewedAt),
    /* The fold's hot path. */
    index("reviews_fold_idx").on(t.profileId, t.cardId, t.direction, t.reviewedAt),
    index("reviews_outbox_idx").on(t.profileId, t.syncedAt),
  ],
);

/* ---------------------------------------------------------------- the sets */

/*
  Two hand made marks, both set semantics: a row exists or it does not.

  Separate tables from card_states on purpose, and the reason gets stronger with
  sync rather than weaker: a hand set mark and an algorithm rewritten scheduler
  row have completely different conflict resolution rules, and mixing them would
  force the sync layer to merge one table field by field.

  deletedAt is the tombstone that lets an un-heart propagate instead of being
  lost to a naive set union.
*/
export const cardHearts = sqliteTable(
  "card_hearts",
  {
    profileId: integer("profile_id")
      .notNull()
      .references(() => profiles.id, { onDelete: "cascade" }),
    cardId: integer("card_id")
      .notNull()
      .references(() => cards.id, { onDelete: "cascade" }),
    updatedAt: integer("updated_at", { mode: "timestamp_ms" })
      .notNull()
      .$defaultFn(() => new Date()),
    deletedAt: integer("deleted_at", { mode: "timestamp_ms" }),
    deviceId: text("device_id").notNull(),
    dirty: integer("dirty", { mode: "boolean" }).notNull().default(true),
  },
  (t) => [
    primaryKey({ columns: [t.profileId, t.cardId] }),
    index("card_hearts_profile_idx").on(t.profileId),
  ],
);

/* Suspension, moved off card_states so that table stays 100% derived. */
export const cardSuspensions = sqliteTable(
  "card_suspensions",
  {
    profileId: integer("profile_id")
      .notNull()
      .references(() => profiles.id, { onDelete: "cascade" }),
    cardId: integer("card_id")
      .notNull()
      .references(() => cards.id, { onDelete: "cascade" }),
    updatedAt: integer("updated_at", { mode: "timestamp_ms" })
      .notNull()
      .$defaultFn(() => new Date()),
    deletedAt: integer("deleted_at", { mode: "timestamp_ms" }),
    deviceId: text("device_id").notNull(),
    dirty: integer("dirty", { mode: "boolean" }).notNull().default(true),
  },
  (t) => [
    primaryKey({ columns: [t.profileId, t.cardId] }),
    index("card_suspensions_profile_idx").on(t.profileId),
  ],
);

/* ------------------------------------------------------------------ settings */

export const settings = sqliteTable("settings", {
  profileId: integer("profile_id")
    .primaryKey()
    .references(() => profiles.id, { onDelete: "cascade" }),
  /*
    Which book of the series. One today, three eventually - the lesson numbering
    restarts per book, so this has to sit beside currentLesson rather than being
    folded into it.

    Local only for now: the server's settings table has no column for it, and
    syncing a field the other side cannot store would silently drop it. See
    LOCAL_ONLY in src/sync/engine.ts.
  */
  currentBook: integer("current_book").notNull().default(1),
  currentLesson: integer("current_lesson").notNull().default(1),
  newPerDay: integer("new_per_day").notNull().default(12),
  maxReviews: integer("max_reviews").notNull().default(120),
  showHarakat: integer("show_harakat", { mode: "boolean" }).notNull().default(true),
  speedWindowMs: integer("speed_window_ms").notNull().default(2000),
  remindersOn: integer("reminders_on", { mode: "boolean" }).notNull().default(false),
  reminderHour: integer("reminder_hour").notNull().default(9),
  secondReminderOn: integer("second_reminder_on", { mode: "boolean" })
    .notNull()
    .default(true),
  reminderHour2: integer("reminder_hour_2").notNull().default(20),
  classDayReminder: integer("class_day_reminder", { mode: "boolean" })
    .notNull()
    .default(true),
  timezone: text("timezone").notNull().default("America/New_York"),
  /*
    Set when currentLesson last changed. The interval cap on the current lesson
    expires 14 days after this, so getting it wrong silently disables the cap
    rather than throwing.
  */
  currentLessonSince: integer("current_lesson_since", { mode: "timestamp_ms" })
    .notNull()
    .$defaultFn(() => new Date()),

  /* iOS only, spec sections 7.5 and 6.5. */
  hapticsEnabled: integer("haptics_enabled", { mode: "boolean" }).notNull().default(true),
  reduceMotion: integer("reduce_motion", { mode: "boolean" }).notNull().default(false),

  /*
    lastNotifiedOn and lastNotifiedHour are deliberately absent. With a rolling
    window of locally scheduled notifications there is no server deciding
    whether a slot was served, and the notification identifiers are the dedupe.

    updatedAt is the device clock, for last write wins. fieldUpdatedAt is a JSON
    map of field name to timestamp, because whole row LWW would let
    tightenSpeedWindow (which writes speedWindowMs at the end of every speed
    run) silently revert a currentLesson change made on another device. The user
    experiences that as "the app forgot which lesson I'm on", which breaks spec
    section 1.1 point 4 and is near impossible to diagnose from a bug report.
  */
  updatedAt: integer("updated_at", { mode: "timestamp_ms" })
    .notNull()
    .$defaultFn(() => new Date()),
  fieldUpdatedAt: text("field_updated_at", { mode: "json" })
    .$type<Record<string, number>>()
    .notNull()
    .default({}),
  dirty: integer("dirty", { mode: "boolean" }).notNull().default(false),
});

/* --------------------------------------------------------- local only tables */

/* One row. Minted at first launch and stable across sign out. */
export const device = sqliteTable("device", {
  id: text("id").primaryKey(),
  createdAt: integer("created_at", { mode: "timestamp_ms" }).notNull(),
});

/*
  What the boot gate reads instead of Clerk.

  Spec section 2 calls launching without a network round trip "the one
  architectural decision". Clerk's isLoaded can require one, so the splash is
  never gated on it: the active row here is what tells the app whose data to
  show, and Clerk reconciles afterwards.
*/
export const account = sqliteTable("account", {
  clerkUserId: text("clerk_user_id").primaryKey(),
  profileId: integer("profile_id").notNull(),
  displayName: text("display_name"),
  isActive: integer("is_active", { mode: "boolean" }).notNull().default(false),
  bootstrappedAt: integer("bootstrapped_at", { mode: "timestamp_ms" }).notNull(),
});

export const syncState = sqliteTable("sync_state", {
  profileId: integer("profile_id").primaryKey(),
  /* Opaque, and the server's. Never a device generated timestamp: device clocks
     are wrong, sometimes by years, and a cursor derived from one silently skips
     a window of history. */
  cursor: text("cursor"),
  lastSuccessAt: integer("last_success_at", { mode: "timestamp_ms" }),
  lastAttemptAt: integer("last_attempt_at", { mode: "timestamp_ms" }),
  lastError: text("last_error"),
  backoffUntil: integer("backoff_until", { mode: "timestamp_ms" }),
  schemaRevision: integer("schema_revision").notNull().default(SCHEMA_REVISION),
});

/* Key/value for the seed guard. Gives contentVersion somewhere to live, plus a
   place for future flags that PRAGMA user_version could not hold. */
export const meta = sqliteTable("meta", {
  key: text("key").primaryKey(),
  value: text("value").notNull(),
});

export type Lesson = typeof lessons.$inferSelect;
export type Card = typeof cards.$inferSelect;
export type CardState = typeof cardStates.$inferSelect;
export type Review = typeof reviews.$inferSelect;
export type NewReview = typeof reviews.$inferInsert;
export type Settings = typeof settings.$inferSelect;
export type Profile = typeof profiles.$inferSelect;
