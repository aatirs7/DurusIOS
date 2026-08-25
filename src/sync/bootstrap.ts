import { eq } from "drizzle-orm";

import { db } from "@/data/client";
import { account, syncState } from "@/data/schema";

import type { BootstrapResponse } from "./wire";

const API = process.env.EXPO_PUBLIC_DURUS_API ?? "";

/*
  Creates the account's profile on the server, once.

  Deliberately separate from /sync, which refuses to create profiles: a bad
  token there should be an error rather than silently producing a new empty
  account that then diverges from the real one.

  Note the server's profile id is NOT stored here and never crosses the wire in
  either direction. Rows are keyed by cardId and clientId; the server derives
  whose they are from the bearer token. That means the local integer id and the
  server integer id are free to differ, which they will, and nothing has to
  reconcile them.
*/
export async function bootstrapProfile(
  clerkUserId: string,
  getToken: () => Promise<string | null>,
): Promise<boolean> {
  if (!API) return false;

  const token = await getToken();
  if (!token) return false;

  try {
    const res = await fetch(`${API}/api/v1/bootstrap`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        authorization: `Bearer ${token}`,
      },
    });
    if (!res.ok) return false;

    const data = (await res.json()) as BootstrapResponse;

    const local = db
      .select()
      .from(account)
      .where(eq(account.clerkUserId, clerkUserId))
      .get();
    if (!local) return false;

    /* A fresh account starts at cursor 0 and pulls the whole history, rather
       than starting from "now" and silently missing everything before it. */
    db.insert(syncState)
      .values({ profileId: local.profileId, cursor: String(data.cursor) })
      .onConflictDoNothing()
      .run();

    return true;
  } catch {
    return false;
  }
}
