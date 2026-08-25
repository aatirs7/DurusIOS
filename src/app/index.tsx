import { Redirect } from "expo-router";

/*
  A real index route that redirects, rather than conditional rendering in the
  layout. Keeps deep links working and keeps the layout tree stable across the
  onboarding boundary.
*/
export default function Boot() {
  return <Redirect href="/today" />;
}
