/*
  The Quran Foundation word meanings: fetched after install, kept on the phone,
  refreshed after seven days, and left alone when offline. The file system and
  the server are stand-ins; what is checked is when the app asks and what it
  keeps.
*/

const mockFiles = new Map<string, string>();

jest.mock("expo-file-system", () => {
  class Directory {
    uri: string;
    constructor(_base: unknown, name: string) {
      this.uri = name;
    }
    get exists() {
      return true;
    }
    create() {}
  }
  class File {
    uri: string;
    constructor(dir: { uri: string }, name: string) {
      this.uri = `${dir.uri}/${name}`;
    }
    get exists() {
      return mockFiles.has(this.uri);
    }
    async text() {
      return mockFiles.get(this.uri) ?? "";
    }
    write(s: string) {
      mockFiles.set(this.uri, s);
    }
  }
  return { Directory, File, Paths: { document: "doc" } };
});

const mockFetch = jest.fn();
jest.mock("@/quran/remote", () => ({
  quranApiConfigured: () => true,
  fetchWordMeanings: (keys: string[]) => mockFetch(keys),
}));

const DAY = 86_400_000;

function serve(label: string) {
  mockFetch.mockImplementation(async (keys: string[]) =>
    Object.fromEntries(keys.map((k) => [k, Array.from({ length: 80 }, (_, i) => `${label} ${k}:${i + 1}`)])),
  );
}

beforeEach(() => {
  jest.resetModules();
  mockFiles.clear();
  mockFetch.mockReset();
});

const load = () => ({
  g: require("../wordGlosses") as typeof import("../wordGlosses"),
  c: require("../wordsContent") as typeof import("../wordsContent"),
});

describe("word meanings from Quran Foundation", () => {
  it("are fetched on first open, in batches, and fill every word", async () => {
    serve("v1");
    const { g, c } = load();
    expect(g.wordGlossesReady()).toBe(false);
    await g.syncWordGlosses(1_000 * DAY);
    expect(g.wordGlossesReady()).toBe(true);
    const l = c.WORDS.lemmas[0];
    expect(l.gloss!.text).toBe(`v1 ${l.gloss!.ref}`);
    for (const call of mockFetch.mock.calls) expect(call[0].length).toBeLessThanOrEqual(60);
    expect(mockFetch.mock.calls.flatMap((x) => x[0]).sort()).toEqual([...g.WORD_GLOSS_AYAHS].sort());
  });

  it("are not fetched again within the week, and come back from the phone after a restart", async () => {
    serve("v1");
    await load().g.syncWordGlosses(1_000 * DAY);
    const calls = mockFetch.mock.calls.length;

    jest.resetModules();
    const { g, c } = load();
    await g.syncWordGlosses(1_006 * DAY);
    expect(mockFetch.mock.calls.length).toBe(calls);
    expect(g.wordGlossesReady()).toBe(true);
    expect(c.WORDS.lemmas[0].gloss!.text.startsWith("v1 ")).toBe(true);
  });

  it("are refreshed in the background once older than seven days", async () => {
    serve("v1");
    await load().g.syncWordGlosses(1_000 * DAY);

    jest.resetModules();
    serve("v2");
    const { g, c } = load();
    await g.syncWordGlosses(1_008 * DAY);
    expect(c.WORDS.lemmas[0].gloss!.text.startsWith("v2 ")).toBe(true);
  });

  it("stay as stored when offline, whatever their age", async () => {
    serve("v1");
    await load().g.syncWordGlosses(1_000 * DAY);

    jest.resetModules();
    mockFetch.mockRejectedValue(new Error("offline"));
    const { g, c } = load();
    await g.syncWordGlosses(1_030 * DAY);
    expect(g.wordGlossesReady()).toBe(true);
    expect(c.WORDS.lemmas[0].gloss!.text.startsWith("v1 ")).toBe(true);
  });
});
