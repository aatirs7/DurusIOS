import { act, fireEvent, render, screen } from "@testing-library/react-native";

import MapTab from "@/app/(tabs)/map";
import SurahReader from "@/app/surah/[n]";
import { WORDS } from "@/data/wordsContent";
import { useWordsKnown } from "@/state/wordsKnown";

/*
  Quranic Words in Read and on the Map: quiet until the learner has started
  the track, then a per-ayah count and the QUL credit in Read, and a
  "Words I know" toggle on the Wall.
*/

const params: { n: string; ayah?: string } = { n: "1" };
jest.mock("expo-router", () => ({
  useRouter: () => ({ push: jest.fn(), replace: jest.fn(), back: jest.fn(), canGoBack: () => true }),
  useLocalSearchParams: () => params,
  usePathname: () => "/map",
}));

jest.mock("react-native-safe-area-context", () => {
  const actual = jest.requireActual("react-native-safe-area-context");
  return { ...actual, useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }) };
});

const everything = () =>
  act(() => {
    useWordsKnown.getState().publish({
      started: true,
      known: WORDS.lemmas.map((l) => l.cardId).sort((a, b) => a - b),
      taught: WORDS.skills.map((s) => s.id).sort((a, b) => a - b),
    });
  });

afterEach(() =>
  act(() => {
    useWordsKnown.getState().publish({ started: false, known: [], taught: [] });
  }),
);

describe("Read", () => {
  it("says nothing about words before the track is started", async () => {
    params.n = "1";
    await render(<SurahReader />);
    expect(screen.queryByText(/^You know \d+ of \d+ words$/)).toBeNull();
    expect(screen.queryByText(/Quranic Universal Library \(Tarteel\)/)).toBeNull();
  });

  it("counts the known words of each ayah and credits QUL", async () => {
    await everything();
    params.n = "1";
    await render(<SurahReader />);
    expect(screen.getAllByText(/^You know \d+ of \d+ words$/).length).toBeGreaterThan(0);
    expect(screen.getByText(/Quranic Universal Library \(Tarteel\)/)).toBeTruthy();
    /* The tap cycle still answers on the ayah. */
    expect(screen.getByLabelText("Ayah 1")).toBeTruthy();
  });
});

describe("the Wall", () => {
  it("lights the ayahs you can mostly follow with Words I know", async () => {
    await everything();
    await render(<MapTab />);
    await fireEvent(screen.getByTestId("progress-pager"), "layout", { nativeEvent: { layout: { width: 390, height: 560 } } });
    await fireEvent.press(screen.getByLabelText("Words I know"));
    expect(screen.getByText(/ayahs you can mostly follow$/)).toBeTruthy();
    expect(screen.getByText(/^Mostly followable \d/)).toBeTruthy();
  });
});
