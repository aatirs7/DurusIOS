import { act, fireEvent, render, screen } from "@testing-library/react-native";

import SurahReader from "@/app/surah/[n]";
import { DEFAULT_LOOK, usePrefs } from "@/state/prefs";

import raw from "./__fixtures__/qf-verses-1.json";
import { normalizeVerse, type QfChapter, type RawVerse } from "./qf";

/*
  The reader's Quran Foundation layers, driven by a real (trimmed) prelive
  response with the network faked. Only the two fixture ayahs carry layers.
*/

const verses = (raw as unknown as { verses: RawVerse[] }).verses;
const mockChapter: QfChapter = {
  surah: 1,
  translationId: 85,
  translationName: null,
  reciterId: 7,
  ayahs: verses.map((v, i) => {
    const a = normalizeVerse(v, null);
    return i === 1
      ? { ...a, translation: [{ text: "Praise belongs to God, Lord of the Worlds," }, { footnote: 9, mark: "1" }] }
      : a;
  }),
  footnotes: { 9: "A test footnote." },
  fetchedAt: Date.now(),
  env: "prelive",
};

jest.mock("@/quran/remote", () => ({
  quranApiConfigured: () => true,
  loadChapter: jest.fn(async () => mockChapter),
}));
jest.mock("expo-router", () => ({
  useRouter: () => ({ push: jest.fn(), replace: jest.fn(), back: jest.fn(), canGoBack: () => true }),
  useLocalSearchParams: () => ({ n: "1" }),
  usePathname: () => "/surah/1",
}));
jest.mock("react-native-safe-area-context", () => {
  const actual = jest.requireActual("react-native-safe-area-context");
  return { ...actual, useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }) };
});

afterEach(() => usePrefs.setState({ readerView: "arabic", reader: DEFAULT_LOOK }));

it("shows the translation with a tappable footnote", async () => {
  usePrefs.setState({ readerView: "translation" });
  await render(<SurahReader />);
  await act(async () => {});
  expect(screen.getByText("Praise belongs to God, Lord of the Worlds,")).toBeTruthy();
  await fireEvent.press(screen.getByLabelText("Footnote 1"));
  expect(screen.getByText("A test footnote.")).toBeTruthy();
});

it("shows each word over its meaning, and over its reading", async () => {
  usePrefs.setState({ readerView: "wordTranslation" });
  await render(<SurahReader />);
  await act(async () => {});
  expect(screen.getByText(mockChapter.ayahs[1].words[0].meaning!)).toBeTruthy();

  usePrefs.setState({ readerView: "wordTransliteration" });
  await act(async () => {});
  expect(screen.getByText("al-ḥamdu")).toBeTruthy();
});

it("tap cycles translation then transliteration, long press opens the bar", async () => {
  usePrefs.setState({ readerView: "arabic" });
  await render(<SurahReader />);
  await act(async () => {});
  await fireEvent.press(screen.getByLabelText("Ayah 2"));
  expect(screen.getByText("Praise belongs to God, Lord of the Worlds,")).toBeTruthy();
  await fireEvent.press(screen.getByLabelText("Ayah 2"));
  expect(screen.getByText("al-ḥamdu", { exact: false })).toBeTruthy();
  await fireEvent.press(screen.getByLabelText("Ayah 2"));
  expect(screen.queryByText("Praise belongs to God, Lord of the Worlds,")).toBeNull();
});

it("zooms into an ayah from the long press bar, then into a word", async () => {
  await render(<SurahReader />);
  await fireEvent(screen.getByLabelText("Ayah 2"), "longPress");
  await fireEvent.press(screen.getByLabelText("Zoom in"));
  await act(async () => {});
  expect(screen.getByText("Transliteration")).toBeTruthy();
  expect(screen.getByText("Praise belongs to God, Lord of the Worlds,")).toBeTruthy();
  const word = mockChapter.ayahs[1].words[0];
  await fireEvent.press(screen.getByLabelText(word.meaning!));
  expect(screen.getByText("Tap to go back to the ayah")).toBeTruthy();
  await fireEvent.press(screen.getAllByText("Memorized")[0]);
  const { useQuranStatus } = jest.requireActual("@/state/quranStatus");
  expect(useQuranStatus.getState().events.at(-1)).toMatchObject({ type: "ayah_status_set", index: 1, memorized: true });
});
