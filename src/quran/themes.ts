/*
  Topics and feelings for search. The starter seed from the owner's handoff
  (DURUS_HANDOFF.md, section 6), as references only: no text, no rulings.

  Nothing religious ships unverified. Every entry stays `verified: false`
  until the owner reviews it, and search only returns verified entries.
*/

export type Theme = {
  id: string;
  label: string;
  /* Lowercase words a query may contain. */
  keywords: string[];
  /* "13:28", a range "65:2-3", or a whole surah "94". */
  refs: string[];
  verified: boolean;
};

export const THEMES: Theme[] = [
  { id: "anxiety", label: "Anxiety, worry", keywords: ["anxious", "anxiety", "worry", "worried", "stress", "stressed", "nervous", "overwhelmed"], refs: ["94", "13:28", "65:2-3", "2:286"], verified: false },
  { id: "grief", label: "Grief, loss", keywords: ["grief", "grieving", "loss", "lost", "sad", "sadness", "death", "died", "mourning"], refs: ["2:155-157", "93", "12"], verified: false },
  { id: "gratitude", label: "Gratitude", keywords: ["grateful", "gratitude", "thankful", "thanks", "blessed", "blessing"], refs: ["55", "14:7"], verified: false },
  { id: "distant", label: "Feeling distant from Allah", keywords: ["distant", "far", "disconnected", "lonely", "alone", "empty"], refs: ["2:186", "39:53", "50:16"], verified: false },
  { id: "sleep", label: "Before sleep", keywords: ["sleep", "night", "bed", "bedtime", "insomnia"], refs: ["67", "2:255", "2:285-286", "112", "113", "114"], verified: false },
  { id: "friday", label: "Friday", keywords: ["friday", "jumuah", "jummah"], refs: ["18"], verified: false },
  { id: "patience", label: "Patience, hardship", keywords: ["patience", "patient", "hardship", "hard", "difficult", "struggle", "struggling", "tired"], refs: ["94:5-6", "2:153", "3:200"], verified: false },
  { id: "repent", label: "Guilt, wanting to repent", keywords: ["guilt", "guilty", "repent", "repentance", "sin", "sinned", "forgive", "forgiveness", "regret"], refs: ["39:53", "4:110", "25:70"], verified: false },
];
