import { eq, isNull } from "drizzle-orm";

import type { Db } from "./client";
import { account, device, profiles, settings, syncState } from "./schema";

/*
  Resolving an identity to a local profile id, and minting the device id.

  This is the only module that writes to `account` and `profiles`. Spec section
  15's discipline - one place where a call turns into a profile id - is what
  stops a query quietly forgetting to filter, and it matters more here than it
  did on the web because two Clerk accounts really can share one device.
*/

/*
  A device id, stable across sign out and reinstall-preserving restores. Not
  crypto.randomUUID(): Hermes does not reliably expose it, and this only has to
  be unique among one person's phones.
*/
function mintDeviceId(): string {
  const rand = () => Math.floor(Math.random() * 0x100000000).toString(16).padStart(8, "0");
  return `dev_${Date.now().toString(16)}${rand()}${rand()}`;
}

export function ensureDeviceId(db: Db): string {
  const existing = db.select({ id: device.id }).from(device).get();
  if (existing) return existing.id;

  const id = mintDeviceId();
  db.insert(device).values({ id, createdAt: new Date() }).onConflictDoNothing().run();
  /* Re-read rather than trusting the insert: if two callers raced, the row that
     won is the one every later write must agree with. */
  return db.select({ id: device.id }).from(device).get()?.id ?? id;
}

/*
  The local profile used before anyone has signed in.

  A cold launch with no network is a supported state (spec section 2), so the
  app has to be able to produce a profileId before Clerk has loaded - otherwise
  the queue cannot be built and the splash would have to wait on the network.
  This profile carries clerkUserId null; binding it to a real account later is
  one UPDATE, rather than rewriting every scoped row.
*/
export function ensureLocalProfile(db: Db, name = "You"): number {
  const unbound = db
    .select({ id: profiles.id })
    .from(profiles)
    .where(isNull(profiles.clerkUserId))
    .get();
  if (unbound) return unbound.id;

  return db.transaction((tx) => {
    const created = tx
      .insert(profiles)
      .values({ name, clerkUserId: null, createdAt: new Date() })
      .returning({ id: profiles.id })
      .get();
    tx.insert(settings).values({ profileId: created.id }).onConflictDoNothing().run();
    tx.insert(syncState).values({ profileId: created.id }).onConflictDoNothing().run();
    return created.id;
  });
}

/*
  Binds a Clerk user to a local profile, adopting the unbound one if it exists.

  The adoption branch is the first-launch-offline path: the app created a local
  profile and the user answered real cards before Clerk ever loaded, and those
  answers belong to whoever signs in first. Without it, signing in would strand
  a session's worth of work under a profile nothing points at.
*/
export function resolveProfile(db: Db, clerkUserId: string, name: string): number {
  return db.transaction((tx) => {
    const found = tx
      .select({ id: profiles.id })
      .from(profiles)
      .where(eq(profiles.clerkUserId, clerkUserId))
      .get();
    if (found) {
      tx.update(profiles).set({ name }).where(eq(profiles.id, found.id)).run();
      return found.id;
    }

    const unbound = tx
      .select({ id: profiles.id })
      .from(profiles)
      .where(isNull(profiles.clerkUserId))
      .get();

    const id = unbound
      ? (tx
          .update(profiles)
          .set({ clerkUserId, name })
          .where(eq(profiles.id, unbound.id))
          .run(),
        unbound.id)
      : tx
          .insert(profiles)
          .values({ clerkUserId, name, createdAt: new Date() })
          .returning({ id: profiles.id })
          .get().id;

    tx.insert(settings).values({ profileId: id }).onConflictDoNothing().run();
    tx.insert(syncState).values({ profileId: id }).onConflictDoNothing().run();
    tx.insert(account)
      .values({
        clerkUserId,
        profileId: id,
        displayName: name,
        isActive: true,
        bootstrappedAt: new Date(),
      })
      .onConflictDoUpdate({
        target: account.clerkUserId,
        set: { profileId: id, displayName: name, isActive: true },
      })
      .run();

    return id;
  });
}

/*
  Sign out clears the active flag and DELETES NOTHING.

  Re-signing in is then instantly offline capable, and more importantly,
  deleting a device's only copy of reviews that have not reached the server is a
  silent data loss path wearing a UX hat. Removing local data is a separate,
  explicitly destructive control in Settings.
*/
export function clearActiveAccount(db: Db) {
  db.update(account).set({ isActive: false }).run();
}

export function activeAccount(db: Db) {
  return db.select().from(account).where(eq(account.isActive, true)).get() ?? null;
}
