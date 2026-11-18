import { DEFAULT_TRACKED } from "@/engine/barakah";

import { useBarakah } from "./barakah";
import { usePrefs } from "./prefs";
import { useQuranStatus } from "./quranStatus";

/*
  Empties the device-only stores (Barakah, hifz marks, prefs) when the account
  is deleted. Sign out keeps them, the same way it keeps the local database.
*/
export function clearDeviceStores() {
  useBarakah.setState({ events: [], tracked: DEFAULT_TRACKED, since: null });
  useQuranStatus.setState({ events: [] });
  usePrefs.setState({ adhkarReminder: false, lastRead: null, bookmarks: [] });
}
