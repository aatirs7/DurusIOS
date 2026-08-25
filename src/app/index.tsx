import { Redirect } from "expo-router";

import { db } from "@/data/client";
import { activeAccount } from "@/data/session";
import { useSession } from "@/state/session";

/*
  A real index route that redirects, rather than conditional rendering in the
  layout. Keeps deep links working and keeps the layout tree stable across the
  onboarding boundary.

  The gate reads the LOCAL account table, not Clerk.

  Clerk's isLoaded can require a network round trip, and spec section 2 calls
  launching without one "the one architectural decision". The account row is
  written when a Clerk user is bound and cleared on sign out, so it answers the
  same question from disk: a cold launch in airplane mode by someone who signed
  in last week goes straight to Today, while a signed out app goes to the
  sign in screen without waiting to be told it is offline.

  Onboarding writes nothing until its own sign in step succeeds, so an account
  without onboardedAt means the flow was quit partway and is started again from
  the top rather than resumed.
*/
export default function Boot() {
  const onboardedAt = useSession((s) => s.onboardedAt);
  const signedIn = activeAccount(db) !== null;

  if (!signedIn) return <Redirect href={onboardedAt === null ? "/onboarding" : "/welcome"} />;
  if (onboardedAt === null) return <Redirect href="/onboarding" />;
  return <Redirect href="/today" />;
}
