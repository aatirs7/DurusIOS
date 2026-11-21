import { Redirect } from "expo-router";

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

  Guest mode (App Store 5.1.1(v)): an account is optional. Everything runs on
  the local profile that boot creates, and signing in later binds that same
  profile, so nothing is lost. So the gate only asks whether setup was done:
  without onboardedAt the flow was never finished and starts from the top.
*/
export default function Boot() {
  const onboardedAt = useSession((s) => s.onboardedAt);

  if (onboardedAt === null) return <Redirect href="/onboarding" />;
  return <Redirect href="/home" />;
}
