import { parseCards } from "./parseCards";

/*
  Field order is:
    arabic | english | transliteration | gender or phrase | plural | note
*/
describe("parseCards", () => {
  it("parses a plain vocab line", () => {
    const { cards, errors } = parseCards("بَيْتٌ | house | baytun | m");
    expect(errors).toHaveLength(0);
    expect(cards[0]).toMatchObject({
      arabic: "بَيْتٌ",
      english: "house",
      transliteration: "baytun",
      type: "vocab",
      gender: "m",
      plural: null,
      note: null,
    });
  });

  it("parses every field", () => {
    const { cards } = parseCards(
      "مَسْجِدٌ | mosque | masjidun | m | مَسَاجِدُ | diptote",
    );
    expect(cards[0]).toMatchObject({
      transliteration: "masjidun",
      gender: "m",
      plural: "مَسَاجِدُ",
      note: "diptote",
    });
  });

  it("treats the word phrase as a type, not a gender", () => {
    const { cards } = parseCards(
      "هٰذَا بَيْتٌ | this is a house | hadha baytun | phrase",
    );
    expect(cards[0].type).toBe("phrase");
    expect(cards[0].gender).toBeNull();
  });

  it("allows empty middle fields", () => {
    const { cards, errors } = parseCards(
      "غَنِيٌّ | rich | ghaniyyun | | | opposite of poor",
    );
    expect(errors).toHaveLength(0);
    expect(cards[0]).toMatchObject({
      transliteration: "ghaniyyun",
      gender: null,
      plural: null,
      note: "opposite of poor",
      type: "vocab",
    });
  });

  it("allows the transliteration to be left out", () => {
    const { cards, errors } = parseCards("بَابٌ | door | | m");
    expect(errors).toHaveLength(0);
    expect(cards[0]).toMatchObject({
      transliteration: null,
      gender: "m",
    });
  });

  it("skips blank lines, fences, and headings", () => {
    const input = "```\n\n# Vocabulary\nبَابٌ | door | babun | m\n```";
    const { cards, errors } = parseCards(input);
    expect(errors).toHaveLength(0);
    expect(cards).toHaveLength(1);
  });

  it("names the line number when the English is missing", () => {
    const { errors } = parseCards("بَيْتٌ | house | baytun | m\nمَسْجِدٌ |");
    expect(errors).toHaveLength(1);
    expect(errors[0].line).toBe(2);
    expect(errors[0].message).toContain("line 2");
    expect(errors[0].message).toContain("missing English meaning");
  });

  it("rejects Latin letters in the Arabic field", () => {
    const { cards, errors } = parseCards("house | بَيْتٌ | baytun | m");
    expect(cards).toHaveLength(0);
    expect(errors[0].message).toContain("Latin");
  });

  it("rejects a gender field that is neither m, f, nor phrase", () => {
    const { errors } = parseCards("بَيْتٌ | house | baytun | masculine");
    expect(errors[0].message).toContain("m, f, or the word phrase");
  });

  it("rejects a line with no pipe at all", () => {
    const { errors } = parseCards("بَيْتٌ");
    expect(errors).toHaveLength(1);
    expect(errors[0].message).toContain("at least an Arabic field");
  });

  it("warns but does not block when a vocab word has no harakat", () => {
    const { cards, errors } = parseCards("بيت | house | baytun | m");
    expect(errors).toHaveLength(0);
    expect(cards).toHaveLength(1);
    expect(cards[0].warning).toContain("no harakat");
  });

  it("does not warn about phrases with no harakat", () => {
    const { cards } = parseCards("نعم | yes | naam | phrase");
    expect(cards[0].warning).toBeNull();
  });

  it("reports line numbers against the original input, not the parsed rows", () => {
    const input = "\n\nبَيْتٌ | house | baytun | m\n\nبَابٌ |";
    const { cards, errors } = parseCards(input);
    expect(cards[0].line).toBe(3);
    expect(errors[0].line).toBe(5);
  });
});
