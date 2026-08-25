import { Redirect } from "expo-router";

import { useSession } from "@/state/session";

/*
  A real index route that redirects, rather than conditional rendering in the
  layout. Keeps deep links working and keeps the layout tree stable across the
  onboarding boundary.
*/
export default function Boot() {
  const onboardedAt = useSession((s) => s.onboardedAt);
  return <Redirect href={onboardedAt === null ? "/onboarding" : "/today"} />;
}
