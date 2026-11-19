import { fireEvent, render, screen } from "@testing-library/react-native";

import Today from "@/app/(tabs)/today";
import WordsSession from "@/app/words";
import { useSession } from "@/state/session";

/*
  Smoke renders for Learn and a Quranic Words session, against a real seeded
  database (better-sqlite3 standing in for expo-sqlite, the same migrations
  and seeds). They catch a screen that throws and check the copy rules: the
  meter says "words you know make up", the attribution shows with Quran
  content, and a full first session can be walked through.
*/

jest.mock("@/data/client", () => {
  /* Test only: better-sqlite3 never reaches the app bundle from here. */
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const Database = require("better-sqlite3");
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { drizzle } = require("drizzle-orm/better-sqlite3");
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { migrate } = require("drizzle-orm/better-sqlite3/migrator");
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const schema = require("@/data/schema");
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const path = require("node:path");
  const sqlite = new Database(":memory:");
  const db = drizzle(sqlite, { schema });
  migrate(db, { migrationsFolder: path.join(__dirname, "..", "..", "..", "drizzle") });
  return { db, sqlite, DB_NAME: "test.db" };
});

jest.mock("@/data/boot", () => ({ bootOnce: () => ({ ok: true, profileId: 1, deviceId: "device-test" }) }));

jest.mock("expo-router", () => ({
  useRouter: () => ({ push: jest.fn(), replace: jest.fn(), back: jest.fn(), canGoBack: () => true }),
  useLocalSearchParams: () => ({}),
  usePathname: () => "/today",
  useFocusEffect: () => {},
}));

jest.mock("react-native-safe-area-context", () => {
  const actual = jest.requireActual("react-native-safe-area-context");
  return { ...actual, useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }) };
});

beforeAll(() => {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { db } = require("@/data/client");
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { seedContent } = require("@/data/seed");
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { seedWords } = require("@/data/seedWords");
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { profiles } = require("@/data/schema");
  seedContent(db);
  seedWords(db);
  db.insert(profiles).values({ id: 1, name: "Learner" }).run();
  useSession.setState({ activeProfileId: 1 } as never);
});

describe("Learn", () => {
  it("opens on an overview, then the words path or the Arabic Course", async () => {
    await render(<Today />);
    expect(screen.getByText("Learn the words of the Quran")).toBeTruthy();
    expect(screen.queryByText(/understand \d/i)).toBeNull();

    await fireEvent.press(screen.getByLabelText("Begin"));
    expect(screen.getByText("Words you know make up 0% of the words in the Quran")).toBeTruthy();
    expect(screen.getByText("Ayahs you can mostly follow: 0")).toBeTruthy();
    expect(screen.getByLabelText("Start")).toBeTruthy();
    expect(screen.getByText("Al-Fatiha")).toBeTruthy();
    await fireEvent.press(screen.getByLabelText("How this is counted"));
    expect(screen.getByText(/A word counts once/)).toBeTruthy();
    expect(screen.getByText(/Quranic Universal Library/)).toBeTruthy();

    /* Learn from a surah: the list, then a surah's words, most frequent first. */
    await fireEvent.press(screen.getByLabelText("Learn from a surah"));
    await fireEvent.press(screen.getByLabelText(/^Al-Faatiha, \d+ words to learn$/));
    expect(screen.getByText(/words to learn, the most frequent first/)).toBeTruthy();
    expect(screen.getByLabelText(/^Learn \d new words?$/)).toBeTruthy();
    await fireEvent.press(screen.getByLabelText("All surahs"));

    await fireEvent.press(screen.getByLabelText("Back to Learn"));
    await fireEvent.press(screen.getByLabelText("Arabic Course"));
    expect(screen.getByLabelText("Start review")).toBeTruthy();
    expect(screen.getByLabelText("Numbers")).toBeTruthy();
  });
});

describe("a first words session", () => {
  it("walks from the Al-Fatiha intro through new words and drills to the end", async () => {
    await render(<WordsSession />);
    expect(screen.getByText("Al-Fatiha")).toBeTruthy();
    expect(screen.getByText("Quran data provided by Quran Foundation")).toBeTruthy();
    await fireEvent.press(screen.getByLabelText("Begin"));

    /* Five new word cards. */
    for (let i = 0; i < 5; i += 1) {
      expect(screen.getByText("New word")).toBeTruthy();
      await fireEvent.press(screen.getByLabelText("Continue"));
    }

    /* Five drills: reveal, choose, continue. Answering wrong brings one back. */
    let guard = 0;
    while (screen.queryByText("What does this mean?") && guard < 20) {
      guard += 1;
      await fireEvent.press(screen.getByLabelText("Show the meanings"));
      const options = screen.getAllByRole("button").filter((b) => !["Leave this drill", "Choose one"].includes(b.props.accessibilityLabel));
      await fireEvent.press(options[0]);
      expect(screen.getByText(/Heard in/)).toBeTruthy();
      await fireEvent.press(screen.getByLabelText("Continue"));
    }
    expect(screen.getByText("That is all for now")).toBeTruthy();
    expect(screen.getByLabelText("Learn 5 more words")).toBeTruthy();
    expect(screen.getByLabelText("Practise words you have met")).toBeTruthy();
  });
});
