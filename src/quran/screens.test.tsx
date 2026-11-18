import { act, fireEvent, render, screen } from "@testing-library/react-native";

import Home from "@/app/(tabs)/home";
import MapTab from "@/app/(tabs)/map";
import SurahReader from "@/app/surah/[n]";
import { DEFAULT_LOOK, usePrefs } from "@/state/prefs";
import { useQuranStatus } from "@/state/quranStatus";

/*
  Smoke renders for the screens a tester lands on. Search is now the launch
  screen for everyone, so a crash there would lock people out of the whole
  app, Learn included. These cannot judge how anything looks; they catch a
  screen that throws.
*/

const params: { n: string; ayah?: string } = { n: "1" };
jest.mock("expo-router", () => ({
  useRouter: () => ({ push: jest.fn(), replace: jest.fn(), back: jest.fn(), canGoBack: () => true }),
  useLocalSearchParams: () => params,
}));

jest.mock("react-native-safe-area-context", () => {
  const actual = jest.requireActual("react-native-safe-area-context");
  return { ...actual, useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }) };
});

describe("search home", () => {
  it("renders idle, then results for a name and for Arabic", async () => {
    await render(<Home />);
    expect(screen.getByText("What would you like to read?")).toBeTruthy();

    await fireEvent.changeText(screen.getByLabelText("Search the Quran"), "kahf");
    expect(screen.getAllByText("Al-Kahf").length).toBeGreaterThan(0);

    await fireEvent.changeText(screen.getByLabelText("Search the Quran"), "الرحمن");
    expect(screen.getAllByText(/Showing|Ar-Rahmaan|Al-Faatiha/).length).toBeGreaterThan(0);

    await fireEvent.changeText(screen.getByLabelText("Search the Quran"), "I feel anxious about work");
    expect(screen.getAllByText("Anxiety, worry").length).toBeGreaterThan(0);

    await fireEvent.changeText(screen.getByLabelText("Search the Quran"), "verses about parents");
    expect(screen.getAllByText("Parents").length).toBeGreaterThan(0);

    await fireEvent.changeText(screen.getByLabelText("Search the Quran"), "meccan surahs");
    expect(screen.getByText("Meccan surahs")).toBeTruthy();
  });
});

describe("reader", () => {
  it.each(["1", "2", "9"])("renders surah %s", async (n) => {
    params.n = n;
    params.ayah = n === "2" ? "255" : undefined;
    await render(<SurahReader />);
    expect(screen.getByLabelText("Ayah 1")).toBeTruthy();
    expect(screen.getByLabelText("Go to a surah or juz")).toBeTruthy();
  });
});

describe("map", () => {
  it("renders the four views on one screen", async () => {
    await render(<MapTab />);
    await fireEvent(screen.getByTestId("progress-pager"), "layout", { nativeEvent: { layout: { width: 390, height: 560 } } });
    for (const tab of ["Wall", "Juz", "Stats", "Week"]) expect(screen.getByText(tab)).toBeTruthy();
    expect(screen.getByText(/^Memorized \d/)).toBeTruthy();
    expect(screen.getByText(/Each square is one ayah/)).toBeTruthy();
    expect(screen.getByText("Reading this week")).toBeTruthy();
  });
});

describe("reader variants", () => {
  afterEach(() => usePrefs.setState({ reader: DEFAULT_LOOK }));

  it.each([
    ["flow", "night"],
    ["ayah", "sepia"],
    ["flow", "paper"],
  ] as const)("renders the %s layout on %s", async (layout, tone) => {
    usePrefs.setState({ reader: { ...DEFAULT_LOOK, layout, tone, font: "scheherazade", spacing: "airy", align: "center", numbers: true, marks: true } });
    params.n = "112";
    params.ayah = undefined;
    await render(<SurahReader />);
    expect(screen.getByLabelText("Reading view")).toBeTruthy();
  });

  it("opens the reading view sheet", async () => {
    params.n = "1";
    await render(<SurahReader />);
    await fireEvent.press(screen.getByLabelText("Reading view"));
    expect(screen.getByText("Line spacing")).toBeTruthy();
    expect(screen.getByText("Scheherazade")).toBeTruthy();
  });
});

describe("progress surah sheet", () => {
  it("marks an ayah from the Mark button", async () => {
    jest.useFakeTimers();
    try {
      await render(<MapTab />);
      await fireEvent.press(screen.getByLabelText("Mark a surah"));
      await fireEvent.press(screen.getByLabelText(/^Al-Faatiha,/));
      await act(async () => {
        jest.advanceTimersByTime(500);
      });
      expect(screen.getByText("Ayah by ayah")).toBeTruthy();
      await fireEvent.press(screen.getByLabelText("Ayah 3"));
      expect(useQuranStatus.getState().events.at(-1)).toMatchObject({ type: "ayah_status_set", memorized: true });
    } finally {
      jest.useRealTimers();
    }
  });
});
