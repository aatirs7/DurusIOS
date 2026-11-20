import { transliterateQuranWord as t } from "./quranTranslit";

describe("transliterating a Quran word", () => {
  it.each([
    ["ٱللَّهِ", "allāhi"],
    ["وَٱللَّهُ", "wallāhu"],
    ["ٱلرَّحْمَـٰنِ", "ar-raḥmāni"],
    ["ٱلْحَمْدُ", "al-ḥamdu"],
    ["ٱلْيَوْمَ", "al-yawma"],
    ["بِٱلرَّحْمَـٰنِ", "birraḥmāni"],
    ["لِلرَّحْمَـٰنِ", "lirraḥmāni"],
    ["فِى", "fī"],
    ["عَلَىٰ", "ʿalā"],
    ["إِلَىٰ", "ilā"],
    ["مِّن", "min"],
    ["رَّحِيمٌۭ", "raḥīmun"],
    ["ٱعْبُدُوا۟", "uʿbudū"],
    ["أَنَا۠", "ana"],
    ["إِنَّهُۥ", "innahū"],
    ["صِرَٰطٍۢ", "ṣirāṭin"],
    ["يَوْمَئِذٍۢ", "yawmaʾidhin"],
    ["ذَٰلِكَ", "dhālika"],
    ["هِىَ", "hiya"],
    ["رَبِّى", "rabbī"],
    ["يَوْمَ", "yawma"],
    ["ٱلدِّينِ", "ad-dīni"],
    ["هَدَىٰنَا", "hadānā"],
    ["ٱسْتَعِينُوا۟", "istaʿīnū"],
    ["ضَآلِّينَ", "ḍāllīna"],
    ["ٱلَّيْلِ", "allayli"],
    ["ٱلَّذِينَ", "alladhīna"],
    ["شَىْءٍۢ", "shayʾin"],
    ["يَدَىْ", "yaday"],
    ["ٱلْأَرْضِ", "al-arḍi"],
  ])("%s is %s", (ar, en) => {
    expect(t(ar)).toBe(en);
  });
});
