/*
  Date formatting.

  Hermes ships full ICU on iOS, but the Hijri calendar is the one Intl call that
  is not guaranteed, so both formatters are built defensively and fall back
  rather than throwing inside a render. There is a test asserting both work.
*/

/* Built once. Constructing an Intl.DateTimeFormat per call is the classic way
   to turn a list screen into a visible stall. */
let hijri: Intl.DateTimeFormat | null | undefined;
let gregorian: Intl.DateTimeFormat | null | undefined;

function hijriFormatter(): Intl.DateTimeFormat | null {
  if (hijri !== undefined) return hijri;
  try {
    hijri = new Intl.DateTimeFormat("en-GB-u-ca-islamic-umalqura", {
      day: "numeric",
      month: "long",
      year: "numeric",
    });
  } catch {
    hijri = null;
  }
  return hijri;
}

function gregorianFormatter(): Intl.DateTimeFormat | null {
  if (gregorian !== undefined) return gregorian;
  try {
    gregorian = new Intl.DateTimeFormat("en-GB", {
      weekday: "long",
      day: "numeric",
      month: "long",
    });
  } catch {
    gregorian = null;
  }
  return gregorian;
}

export function hijriDate(now: Date): string | null {
  const f = hijriFormatter();
  if (!f) return null;
  try {
    /* The formatter appends "AH" in some ICU builds and not others. Trim it so
       the line reads the same everywhere. */
    return f.format(now).replace(/\s*AH$/, "");
  } catch {
    return null;
  }
}

export function gregorianDate(now: Date): string {
  const f = gregorianFormatter();
  if (!f) return now.toDateString();
  try {
    return f.format(now);
  } catch {
    return now.toDateString();
  }
}

/*
  A calendar day key in a named zone, as YYYY-MM-DD.

  en-CA gives that format directly. Used by the stats day buckets, where the web
  version has a real bug worth not reproducing: date_trunc ran in the Neon
  session timezone (UTC) while fillDays bucketed with toISOString(), so a review
  at 8pm New York time landed on different days in the two halves.
*/
const dayKeyCache = new Map<string, Intl.DateTimeFormat>();

export function dayKey(at: Date, timeZone: string): string {
  let f = dayKeyCache.get(timeZone);
  if (!f) {
    try {
      f = new Intl.DateTimeFormat("en-CA", {
        timeZone,
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
      });
    } catch {
      f = new Intl.DateTimeFormat("en-CA", {
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
      });
    }
    dayKeyCache.set(timeZone, f);
  }
  return f.format(at);
}
