import { db, sqlite } from "./client";
import { seedContent } from "./seed";
import { ensureDeviceId, ensureLocalProfile } from "./session";

export type BootResult =
  | { ok: true; profileId: number; deviceId: string }
  | { ok: false; error: Error };

/*
  Everything the app must do once, after migrations have applied and before the
  splash lifts.

  Memoised at module scope rather than held in component state on purpose. All
  of it is synchronous, and running it from an effect that then calls setState
  causes a cascading render on every boot - which React's own lint rule flags,
  and which is a real extra frame on the splash. A module level singleton is the
  honest shape for "this happens once per process".
*/
let cached: BootResult | null = null;

export function bootOnce(): BootResult {
  if (cached) return cached;

  try {
    /*
      The foreign key dance. Order matters and it is not the obvious one:

      The connection opens with foreign_keys OFF (see client.ts) because
      drizzle-kit's SQLite migrations rebuild tables by DROPping them, and with
      enforcement on that DROP fires every `on delete cascade` and silently
      takes the dependent rows with it. SQLite's own documented rebuild
      procedure begins by turning foreign keys off.

      So: migrations have now run with it off, foreign_key_check proves the
      rebuild left nothing dangling, and only then is enforcement turned on for
      the life of the connection - the schema leans on cascade at runtime.
    */
    const dangling = sqlite.getAllSync("PRAGMA foreign_key_check");
    if (dangling.length > 0) {
      throw new Error(
        `foreign_key_check found ${dangling.length} dangling row(s) after migration`,
      );
    }
    sqlite.execSync("PRAGMA foreign_keys = ON");

    const deviceId = ensureDeviceId(db);
    seedContent(db);
    /*
      A profile must exist before Clerk has loaded: a cold launch with no
      network is a supported state and the queue has to be buildable. Binding
      this profile to a Clerk account later is one UPDATE.
    */
    const profileId = ensureLocalProfile(db);

    cached = { ok: true, profileId, deviceId };
  } catch (e) {
    cached = { ok: false, error: e instanceof Error ? e : new Error(String(e)) };
  }

  return cached;
}

/* Used by the reset-local-data recovery path, which must be able to re-run. */
export function resetBootCache() {
  cached = null;
}
