import { drizzle } from "drizzle-orm/expo-sqlite";
import { openDatabaseSync, type SQLiteDatabase } from "expo-sqlite";

import * as schema from "./schema";

export const DB_NAME = "durus.db";

/*
  PRAGMAs are per connection, not per database, so they belong at the one place
  the connection is opened.

  foreign_keys is deliberately OFF here and is turned on by the boot gate only
  after migrations have run. This is not an oversight, and it is the single
  nastiest trap in this layer:

  SQLite cannot ALTER TABLE DROP COLUMN in most cases, so drizzle-kit generates
  the standard twelve step table rebuild - create new, copy rows, DROP old,
  rename. With foreign_keys ON, that DROP fires every `on delete cascade` and
  takes the dependent rows with it. It does not error. It is worse than the
  better known "SQLite defaults foreign keys to off" trap, because it only bites
  on the *second* migration, in production, once there is data worth losing.
  SQLite's own documented rebuild procedure begins by turning foreign keys off.

  See src/data/migrate.ts, which owns the off -> migrate -> check -> on sequence.

  journal_mode returns a row, so it is a query rather than an exec.
*/
function openDurusDb(): SQLiteDatabase {
  const sqlite = openDatabaseSync(DB_NAME, {
    /* Required for useLiveQuery. Without it the hook returns a first result and
       never refreshes, which reads as "the due count is stale" rather than as
       an error. */
    enableChangeListener: true,
  });
  sqlite.getFirstSync("PRAGMA journal_mode = WAL");
  return sqlite;
}

export const sqlite = openDurusDb();

/*
  Note the driver is sync mode: db.transaction(cb) takes a SYNCHRONOUS callback
  and returns T, not Promise<T>. An async callback returns a promise the wrapper
  commits before it resolves, which is a silently half applied write with no
  error anywhere. Inside a transaction use .get() / .all() / .run(), never
  await. There is an eslint rule enforcing this.
*/
export const db = drizzle(sqlite, { schema });

export type Db = typeof db;
