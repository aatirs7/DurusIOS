import { fireEvent, render, screen } from "@testing-library/react-native";

import Home from "@/app/(tabs)/home";
import MapTab from "@/app/(tabs)/map";
import SurahReader from "@/app/surah/[n]";

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
    expect(screen.getByText(/being reviewed/)).toBeTruthy();

    await fireEvent.changeText(screen.getByLabelText("Search the Quran"), "meccan surahs");
    expect(screen.getByText(/Meccan surahs, 86/)).toBeTruthy();
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
  it("renders the field, counters and surahs", async () => {
    await render(<MapTab />);
    expect(screen.getByText("Surahs memorized")).toBeTruthy();
    expect(screen.getByText("Reading this week")).toBeTruthy();
    expect(screen.getByText("Al-Faatiha")).toBeTruthy();
  });
});
