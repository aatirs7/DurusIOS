import { act, fireEvent, render } from "@testing-library/react-native";

import { SafeAreaProvider } from "react-native-safe-area-context";

import AdhkarWalk from "@/app/adhkar/[time]";

import Barakah from "@/app/(tabs)/barakah";
import { ADHKAR, adhkarFor, pick } from "@/barakah/adhkar";
import { SURAHS } from "@/quran/tanzil";
import { localToday, useBarakah } from "@/state/barakah";
import { usePrefs } from "@/state/prefs";

jest.mock("expo-router", () => ({ useRouter: () => ({ push: jest.fn(), back: jest.fn() }), usePathname: () => "/barakah", useLocalSearchParams: () => ({ time: "evening" }) }));

/* Reading the goal's worth of ayahs ticks the daily Quran portion, once. */
describe("barakah reading link", () => {
  beforeEach(() => {
    useBarakah.setState({ _hydrated: true, events: [], tracked: ["fajr", "quran"], since: localToday() });
    usePrefs.setState({ readingGoal: 3, readLog: {} });
  });

  it("ticks the portion when today's reading reaches the goal", async () => {
    usePrefs.setState({ readLog: { [localToday()]: [1, 2, 3] } });
    await render(<Barakah />);
    await act(async () => {});
    expect(useBarakah.getState().events.some((e) => e.practiceId === "quran" && e.value === 1)).toBe(true);
  });

  it("leaves a card alone once it was touched by hand today", async () => {
    useBarakah.setState({ events: [{ at: 1, day: localToday(), practiceId: "quran", value: 0 }] });
    usePrefs.setState({ readLog: { [localToday()]: [1, 2, 3, 4] } });
    await render(<Barakah />);
    await act(async () => {});
    expect(useBarakah.getState().events).toHaveLength(1);
  });

  it("does nothing below the goal", async () => {
    usePrefs.setState({ readLog: { [localToday()]: [1] } });
    await render(<Barakah />);
    await act(async () => {});
    expect(useBarakah.getState().events).toHaveLength(0);
  });
});

describe("adhkar walkthrough content", () => {
  it("has both times, unique ids, real Quran refs and text for every step", () => {
    expect(adhkarFor("morning").length).toBeGreaterThan(15);
    expect(adhkarFor("evening").length).toBeGreaterThan(15);
    expect(new Set(ADHKAR.map((d) => d.id)).size).toBe(ADHKAR.length);
    for (const d of ADHKAR) {
      expect(d.repeat).toBeGreaterThan(0);
      expect(d.arabic || d.quran).toBeTruthy();
      for (const t of ["morning", "evening"] as const) {
        expect(pick(d.translit, t).length).toBeGreaterThan(5);
        expect(pick(d.meaning, t).length).toBeGreaterThan(5);
        if (d.arabic) expect(pick(d.arabic, t)).toMatch(/[؀-ۿ]/);
      }
      for (const [s, a, b] of d.quran ?? []) {
        expect(a).toBeGreaterThanOrEqual(1);
        expect(b).toBeLessThanOrEqual(SURAHS[s - 1].ayahs);
      }
    }
  });
});

describe("adhkar walkthrough screen", () => {
  beforeEach(() => {
    useBarakah.setState({ _hydrated: true, events: [], tracked: ["eveningAdhkar"], since: localToday(), adhkarRun: null });
  });

  it("walks the evening adhkar and marks the practice at the end", async () => {
    const screen = await render(
      <SafeAreaProvider initialMetrics={{ frame: { x: 0, y: 0, width: 390, height: 844 }, insets: { top: 47, left: 0, right: 0, bottom: 34 } }}>
        <AdhkarWalk />
      </SafeAreaProvider>,
    );
    expect(screen.getAllByText("Ayat al-Kursi").length).toBeGreaterThan(0);
    const n = adhkarFor("evening").length;
    for (let k = 0; k < n; k++) await act(async () => fireEvent.press(screen.getByLabelText("Skip")));
    expect(screen.getByText("Evening adhkar complete")).toBeTruthy();
    expect(useBarakah.getState().events.some((e) => e.practiceId === "eveningAdhkar" && e.value === 1)).toBe(true);
  });
});
