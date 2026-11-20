/*
  Offline recitation: downloaded only when chosen, played from the phone,
  replaced when Quran Foundation's audio URL changes, deleted when the
  recitation is removed or the learner removes it. File system and network
  are stand-ins.
*/

const mockFiles = new Map<string, string>();
const mockDownloads: string[] = [];

jest.mock("expo-file-system", () => {
  const join = (parts: unknown[]) => parts.map((p) => (typeof p === "string" ? p : (p as { uri: string }).uri)).join("/");
  class Directory {
    uri: string;
    constructor(...parts: unknown[]) {
      this.uri = join(parts);
    }
    get exists() {
      return true;
    }
    create() {}
    delete() {
      for (const k of [...mockFiles.keys()]) if (k.startsWith(this.uri + "/")) mockFiles.delete(k);
    }
    list() {
      return [...mockFiles.keys()].filter((k) => k.startsWith(this.uri + "/")).map((k) => Object.assign(new File(k), {}));
    }
  }
  class File {
    uri: string;
    constructor(...parts: unknown[]) {
      this.uri = join(parts);
    }
    get exists() {
      return mockFiles.has(this.uri);
    }
    get size() {
      return (mockFiles.get(this.uri) ?? "").length;
    }
    textSync() {
      return mockFiles.get(this.uri) ?? "";
    }
    write(s: string) {
      mockFiles.set(this.uri, s);
    }
    delete() {
      mockFiles.delete(this.uri);
    }
    static async downloadFileAsync(url: string, dest: File) {
      mockDownloads.push(url);
      mockFiles.set(dest.uri, `audio:${url}`);
      return dest;
    }
  }
  return { Directory, File, Paths: { document: "doc" } };
});

type Ch = { surah: number; translationId: number; reciterId: number; ayahs: { key: string; audio: { url: string; segments: number[][] } | null }[] };
const chapter = (urls: (string | null)[]): Ch => ({
  surah: 112,
  translationId: 20,
  reciterId: 7,
  ayahs: urls.map((u, i) => ({ key: `112:${i + 1}`, audio: u ? { url: u, segments: [[0, 1, 0, 500]] } : null })),
});
let mockChapter = chapter(["u1", "u2", "u3", "u4"]);
let mockRefreshed: ((c: Ch) => void) | null = null;
jest.mock("./remote", () => ({
  chapterFromDisk: async () => mockChapter,
  onChapterRefreshed: (f: (c: Ch) => void) => {
    mockRefreshed = f;
  },
}));

/* Required after the stand-ins above, so the module registers its hook with them. */
// eslint-disable-next-line @typescript-eslint/no-require-imports
const { downloadSurahs, localAudio, removeAllRecitations, removeSurahRecitation, surahDownload } = require("./offlineAudio") as typeof import("./offlineAudio");

const settle = () => new Promise((r) => setTimeout(r, 0));
async function idle() {
  for (let i = 0; i < 50; i += 1) await settle();
}

beforeEach(() => {
  removeAllRecitations();
  mockFiles.clear();
  mockDownloads.length = 0;
  mockChapter = chapter(["u1", "u2", "u3", "u4"]);
});

describe("offline recitation", () => {
  it("downloads nothing until a surah is chosen, then every ayah of it", async () => {
    expect(surahDownload(112, 7, 4).state).toBe("none");
    expect(mockDownloads).toEqual([]);
    downloadSurahs([112], 20, 7);
    await idle();
    expect(mockDownloads).toEqual(["u1", "u2", "u3", "u4"]);
    expect(surahDownload(112, 7, 4).state).toBe("done");
    expect(localAudio(7, "112:1", "u1")).toMatch(/recitations\/r7\/112001\.mp3$/);
  });

  it("never plays a stored file for a different URL", async () => {
    downloadSurahs([112], 20, 7);
    await idle();
    expect(localAudio(7, "112:2", "u2-new")).toBeNull();
  });

  it("replaces a file whose audio URL changed, and deletes a removed recitation", async () => {
    downloadSurahs([112], 20, 7);
    await idle();
    mockChapter = chapter(["u1", "u2-new", "u3", null]);
    mockRefreshed!(mockChapter);
    await idle();
    expect(mockDownloads.slice(4)).toEqual(["u2-new"]);
    expect(localAudio(7, "112:2", "u2-new")).not.toBeNull();
    expect(localAudio(7, "112:4", "u4")).toBeNull();
    expect([...mockFiles.keys()].some((k) => k.endsWith("112004.mp3"))).toBe(false);
  });

  it("deletes the files when the learner removes them", async () => {
    downloadSurahs([112], 20, 7);
    await idle();
    removeSurahRecitation(112, 7);
    expect(surahDownload(112, 7, 4).state).toBe("none");
    expect([...mockFiles.keys()].some((k) => k.endsWith(".mp3"))).toBe(false);
  });
});
