import {
  COUNTED_NOUNS,
  NUMBERS,
  buildCountingQuestion,
  buildWordQuestion,
  countedPhrase,
  easternDigits,
} from "./numbers";

const fixed = (n = 0.5) => () => n;
const noun = (english: string) => COUNTED_NOUNS.find((c) => c.english === english)!;

describe("the number data", () => {
  it("covers one to ten", () => {
    expect(NUMBERS.map((n) => n.value)).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);
  });

  /*
    The rule everyone gets wrong, pinned so a tidy-up cannot quietly swap the
    two columns: for three to ten the number's gender is the OPPOSITE of the
    noun's, so the form used with a masculine noun is the one carrying the ta.
  */
  it("puts the ta on the form used with masculine nouns", () => {
    const three = NUMBERS.find((n) => n.value === 3)!;
    expect(three.withMasculine).toContain("ة");
    expect(three.withFeminine).not.toContain("ة");
  });

  it("gives eight its sukun rather than a dammah", () => {
    const eight = NUMBERS.find((n) => n.value === 8)!;
    expect(eight.withFeminine).toBe("ثَمَانِي");
  });

  /* A drill about masculine versus feminine needs both. */
  it("has a balanced set of counted nouns", () => {
    const m = COUNTED_NOUNS.filter((c) => c.gender === "m").length;
    const f = COUNTED_NOUNS.filter((c) => c.gender === "f").length;
    expect(m).toBe(f);
  });

  /* Diptotes take a fathah and no tanwin in the genitive - a different rule
     from a different lesson, deliberately kept out. */
  it("uses only plurals that take tanwin in the genitive", () => {
    for (const c of COUNTED_NOUNS) expect(c.pluralGenitive).toMatch(/ٍ$/);
  });
});

describe("easternDigits", () => {
  it("writes the Arabic-Indic forms", () => {
    expect(easternDigits(3)).toBe("٣");
    expect(easternDigits(10)).toBe("١٠");
  });
});

describe("buildWordQuestion", () => {
  it("offers four, one of them right", () => {
    const q = buildWordQuestion(7, fixed());
    expect(q.options).toHaveLength(4);
    expect(q.options).toContain(q.answer);
    expect(q.answer).toBe(NUMBERS.find((n) => n.value === 7)!.arabic);
  });

  /* The prompt is digits and English only. Showing the Arabic would be showing
     the answer. */
  it("never puts Arabic in the prompt", () => {
    const q = buildWordQuestion(4, fixed());
    expect(q.prompt).not.toMatch(/[؀-ۿ]/);
  });
});

describe("buildCountingQuestion", () => {
  it("takes the ta form for a masculine noun", () => {
    const q = buildCountingQuestion(3, noun("books"), fixed());
    expect(q.answer).toBe("ثَلَاثَةُ");
    expect(q.note).toContain("WITH the ta");
  });

  it("drops the ta for a feminine noun", () => {
    const q = buildCountingQuestion(3, noun("girls"), fixed());
    expect(q.answer).toBe("ثَلَاثُ");
    expect(q.note).toContain("WITHOUT the ta");
  });

  /* The mistake the stage is about has to be on the screen, or there is
     nothing to get wrong. */
  it("always offers the wrong-gender form as a distractor", () => {
    const q = buildCountingQuestion(5, noun("girls"), fixed());
    expect(q.options).toContain("خَمْسَةُ");
    expect(q.answer).toBe("خَمْسُ");
  });

  /* The other distractors agree in gender, so they can only be eliminated by
     knowing which number was asked. */
  it("offers neighbours in the right gender", () => {
    const q = buildCountingQuestion(5, noun("books"), fixed());
    const others = q.options.filter((o) => o !== q.answer && o !== "خَمْسُ");
    for (const o of others) expect(o).toContain("ة");
  });

  it("builds the whole phrase for the reveal", () => {
    expect(countedPhrase(3, noun("girls"))).toBe("ثَلَاثُ بَنَاتٍ");
    expect(countedPhrase(3, noun("books"))).toBe("ثَلَاثَةُ كُتُبٍ");
  });
});
