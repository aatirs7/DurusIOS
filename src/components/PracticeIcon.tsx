import Svg, { Path } from "react-native-svg";

/* A small line drawing for each practice, shown above its title. */
export const PRACTICE_ICON: Record<string, string> = {
  fajr: "M3 18h18M7 18a5 5 0 0110 0M12 7v3M5.6 11.6l1.8 1.4M18.4 11.6l-1.8 1.4",
  morningAdhkar:
    "M12 8a4 4 0 100 8 4 4 0 000-8zM12 2.5v2M12 19.5v2M2.5 12h2M19.5 12h2M5.3 5.3l1.4 1.4M17.3 17.3l1.4 1.4M18.7 5.3l-1.4 1.4M6.7 17.3l-1.4 1.4",
  eveningAdhkar: "M20 13.4A8.2 8.2 0 1110.6 4a6.6 6.6 0 009.4 9.4z",
  quran:
    "M3.5 5.5c3-1 6-1 8.5 1v13c-2.5-2-5.5-2-8.5-1zM20.5 5.5c-3-1-6-1-8.5 1v13c2.5-2 5.5-2 8.5-1z",
  duha: "M12 9a3 3 0 100 6 3 3 0 000-6zM12 3v2.5M4.2 7.5l2 1.2M19.8 7.5l-2 1.2M3 19h18",
  rawatib: "M6 4h12v16H6zM9 8h6M9 12h6M9 16h3",
  witr: "M17 14.4A7 7 0 118.6 5a5.6 5.6 0 008.4 9.4zM18.5 3.5l.6 1.4 1.4.6-1.4.6-.6 1.4-.6-1.4-1.4-.6 1.4-.6z",
  istighfar: "M12 3s6 6.5 6 11a6 6 0 01-12 0c0-4.5 6-11 6-11z",
  salawat: "M12 20s-7-4.5-7-10a4 4 0 017-2.6A4 4 0 0119 10c0 5.5-7 10-7 10z",
  sadaqah:
    "M4 10h16v10H4zM3 7h18v3H3zM12 7v13M12 7c-2-3-5-3-5-1s3 1 5 1zM12 7c2-3 5-3 5-1s-3 1-5 1z",
  family:
    "M8 11a3 3 0 100-6 3 3 0 000 6zM16 11a3 3 0 100-6 3 3 0 000 6zM2.5 20a5.5 5.5 0 0111 0M10.5 20a5.5 5.5 0 0111 0",
  kahf: "M2.5 20L9 8l4 6 2.5-3.5L21.5 20zM10 20a3 3 0 016 0",
  fastMonThu: "M12 3a9 9 0 100 18 9 9 0 000-18zM12 7v5l3 2",
  whiteDays: "M12 4a8 8 0 100 16 8 8 0 000-16z",
};

export function PracticeIcon({ id, color }: { id: string; color: string }) {
  const d = PRACTICE_ICON[id];
  if (!d) return null;
  return (
    <Svg width={28} height={28} viewBox="0 0 24 24">
      <Path
        d={d}
        stroke={color}
        strokeWidth={1.6}
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
    </Svg>
  );
}
