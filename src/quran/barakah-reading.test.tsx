import { act, render } from "@testing-library/react-native";

import Barakah from "@/app/(tabs)/barakah";
import { localToday, useBarakah } from "@/state/barakah";
import { usePrefs } from "@/state/prefs";

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
