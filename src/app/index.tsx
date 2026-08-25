import { Redirect } from "expo-router";

import { useSession } from "@/state/session";

/*
  A real index route that redirects, rather than conditional rendering in the
  layout. Keeps deep links working and keeps the layout tree stable across the
  onboarding boundary.

  Setup first, then the account. Both are recorded separately so skipping the
  account does not re-ask the setup questions on the next launch.
*/
export default function Boot() {
  const onboardedAt = useSession((s) => s.onboardedAt);
  const welcomedAt = useSession((s) => s.welcomedAt);

  if (onboardedAt === null) return <Redirect href="/onboarding" />;
  if (welcomedAt === null) return <Redirect href="/welcome" />;
  return <Redirect href="/today" />;
}
