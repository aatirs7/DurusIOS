/*
  Why each Barakah practice, in a sentence, with where it comes from. Shown on
  a long press of a tile, at the owner's request (19 Nov).

  Paraphrased meanings, not quotations, each tied to a well-known source. To
  be reviewed by the owner or a teacher like the rest of the religious copy;
  keep every line short and keep the reference with it.
*/

export type Benefit = { why: string; source: string };

export const BENEFITS: Record<string, Benefit> = {
  fajr: {
    why: "Whoever prays Fajr is under the protection of Allah for that day.",
    source: "Sahih Muslim 657",
  },
  morningAdhkar: {
    why: "Allah tells the believers to remember Him often and glorify Him morning and evening.",
    source: "Quran 33:41-42",
  },
  eveningAdhkar: {
    why: "Allah tells the believers to remember Him often and glorify Him morning and evening.",
    source: "Quran 33:41-42",
  },
  quran: {
    why: "Read the Quran, for it will come on the Day of Resurrection as an intercessor for those who read it.",
    source: "Sahih Muslim 804",
  },
  duha: {
    why: "Each joint of the body owes a charity every morning, and two rakahs of Duha are enough for all of it.",
    source: "Sahih Muslim 720",
  },
  rawatib: {
    why: "Whoever prays twelve voluntary rakahs in a day and night, a house is built for them in Paradise.",
    source: "Sahih Muslim 728",
  },
  witr: {
    why: "Allah is One and loves what is odd, so pray witr.",
    source: "Sunan Abi Dawud 1416",
  },
  istighfar: {
    why: "The Prophet, peace be upon him, asked Allah's forgiveness more than seventy times a day.",
    source: "Sahih al-Bukhari 6307",
  },
  salawat: {
    why: "Whoever sends blessings on the Prophet once, Allah sends blessings on them ten times.",
    source: "Sahih Muslim 408",
  },
  sadaqah: {
    why: "Charity never decreases wealth.",
    source: "Sahih Muslim 2588",
  },
  family: {
    why: "Whoever wants their provision increased and their life blessed should keep the ties of kinship.",
    source: "Sahih al-Bukhari 5986",
  },
  kahf: {
    why: "Whoever reads Surah Al-Kahf on Friday, a light shines for them until the next Friday.",
    source: "Al-Hakim, graded sahih by al-Albani",
  },
  fastMonThu: {
    why: "Deeds are presented to Allah on Mondays and Thursdays, and the Prophet loved his to be presented while he was fasting.",
    source: "Jami at-Tirmidhi 747",
  },
  whiteDays: {
    why: "Fasting three days of every month is like fasting the whole year.",
    source: "Sahih al-Bukhari 1979",
  },
};
