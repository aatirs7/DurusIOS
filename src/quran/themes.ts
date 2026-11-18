/*
  Topics, feelings and named passages for search. References only: no text,
  no rulings, no tafsir.

  Nothing religious ships unverified. `verified: true` means the owner has
  approved that entry's references. The first eight are the owner's handoff
  seed, approved 2026-11-16. Every other entry was added at the owner's request
  to broaden search and stays `verified: false` until the owner approves it;
  search only returns verified entries, and says plainly when a match is still
  under review.

  `keywords` are words or short phrases. The matcher in search.ts lowercases
  the query, drops filler ("i feel", "verses about", "what should i read"),
  folds simple word endings, and tolerates one typo in longer words, so each
  keyword already covers many phrasings.
*/

export type Theme = {
  id: string;
  label: string;
  keywords: string[];
  /* "13:28", a range "65:2-3", or a whole surah "94". */
  refs: string[];
  verified: boolean;
  /* "feeling" for moods and situations, "topic" for subjects, "passage" for a named passage. */
  kind: "feeling" | "topic" | "passage";
};

const T = (kind: Theme["kind"], id: string, label: string, refs: string[], keywords: string[], verified = false): Theme => ({
  id,
  label,
  refs,
  keywords,
  verified,
  kind,
});

export const THEMES: Theme[] = [
  /* ---------- the owner's eight, approved ---------- */
  T("feeling", "anxiety", "Anxiety, worry", ["94", "13:28", "65:2-3", "2:286"], [
    "anxious", "anxiety", "worry", "worried", "worrying", "stress", "stressed", "stressful", "nervous", "overwhelmed", "overthinking",
    "panic", "panicking", "uneasy", "restless", "tense", "pressure", "burnout", "burnt out", "on edge", "cant cope", "scared of the future",
    "uncertain", "uncertainty", "what if", "dread", "racing thoughts", "heart racing", "exam stress", "work stress", "deadline",
  ], true),
  T("feeling", "grief", "Grief, loss", ["2:155-157", "93", "12"], [
    "grief", "grieving", "griefstricken", "loss", "lost someone", "lost my", "sad", "sadness", "death", "died", "passed away", "passing",
    "mourning", "funeral", "bereaved", "bereavement", "miscarriage", "heartbroken", "heartbreak", "broken heart", "missing someone", "miss them",
    "crying", "tears", "sorrow",
  ], true),
  T("feeling", "gratitude", "Gratitude", ["55", "14:7"], [
    "grateful", "gratitude", "thankful", "thanks", "thank allah", "blessed", "blessing", "blessings", "alhamdulillah", "appreciate", "appreciation",
    "feeling content", "content with", "good news", "happy", "happiness", "joy", "joyful", "celebrate", "celebration",
  ], true),
  T("feeling", "distant", "Feeling distant from Allah", ["2:186", "39:53", "50:16"], [
    "distant", "far from allah", "feel far", "disconnected", "lonely", "alone", "loneliness", "empty", "emptiness", "lost faith", "weak iman",
    "low iman", "iman low", "spiritually dry", "numb", "no motivation to pray", "drifting", "forgotten", "abandoned", "nobody cares",
  ], true),
  T("topic", "sleep", "Before sleep", ["67", "2:255", "2:285-286", "112", "113", "114"], [
    "sleep", "sleeping", "at night", "bed", "bedtime", "before bed", "insomnia", "cant sleep", "nightmare", "nightmares", "tired at night", "night routine",
  ], true),
  T("topic", "friday", "Friday", ["18"], ["friday", "jumuah", "jummah", "jumma", "juma", "jumah"], true),
  T("feeling", "patience", "Patience, hardship", ["94:5-6", "2:153", "3:200"], [
    "patience", "patient", "sabr", "hardship", "hard time", "so hard", "life is hard", "difficult", "difficulty", "struggle", "struggling", "tired", "exhausted",
    "suffering", "pain", "trial", "trials", "being tested", "going through", "rough", "rough patch", "give up", "giving up", "hopeless",
    "everything is going wrong", "bad day", "bad week", "setback", "failure", "failed",
  ], true),
  T("feeling", "repent", "Guilt, wanting to repent", ["39:53", "4:110", "25:70"], [
    "guilt", "guilty", "repent", "repentance", "tawbah", "tauba", "sin", "sins", "sinned", "forgive me", "forgiveness", "regret", "regretful",
    "ashamed", "shame", "messed up", "made a mistake", "mistake", "relapse", "relapsed", "start again", "fresh start", "turn back", "come back to allah",
  ], true),

  /* ---------- named passages (owner to approve) ---------- */
  T("passage", "kursi", "Ayat al-Kursi", ["2:255"], ["ayat al kursi", "ayatul kursi", "ayat ul kursi", "kursi", "throne verse", "verse of the throne"]),
  T("passage", "baqarah-end", "The last two ayahs of Al-Baqarah", ["2:285-286"], [
    "last two ayahs of baqarah", "last two verses of baqarah", "end of baqarah", "amana rasul", "amanar rasul", "last ayahs of baqarah",
  ]),
  T("passage", "quls", "The three Quls", ["112", "113", "114"], ["three quls", "3 quls", "the quls", "quls", "muawwidhat", "muawwidhatayn", "four quls"]),
  T("passage", "fatiha", "The Opening", ["1"], ["fatiha", "fatihah", "al fatiha", "the opening", "ummul kitab", "umm al kitab", "seven oft repeated"]),
  T("passage", "light", "The Light verse", ["24:35"], ["light verse", "ayat an nur", "ayatun nur", "verse of light", "allah is the light"]),
  T("passage", "debt-verse", "The verse of debt", ["2:282"], ["verse of debt", "ayat ad dayn", "longest ayah", "longest verse"]),
  T("passage", "first-revelation", "The first revelation", ["96:1-5"], ["first revelation", "first verses revealed", "iqra", "read in the name"]),
  T("passage", "names", "The names of Allah", ["59:22-24", "7:180", "17:110"], ["names of allah", "99 names", "asma ul husna", "asmaul husna", "beautiful names"]),
  T("passage", "rabbana", "Duas that begin Rabbana", ["2:201", "2:286", "3:8", "7:23", "14:40-41", "25:74"], [
    "rabbana", "rabbana duas", "quranic duas", "duas from the quran", "dua from quran", "prophetic duas", "duas of the prophets",
  ]),
  T("passage", "yunus-dua", "The dua of Yunus", ["21:87"], ["dua of yunus", "dua yunus", "jonah", "la ilaha illa anta subhanaka", "in the whale"]),
  T("passage", "musa-chest", "Musa's dua for an open heart", ["20:25-28"], [
    "rabbi shrah li sadri", "rabbish rahli sadri", "open my chest", "expand my chest", "dua before exam", "dua for speaking", "public speaking",
  ]),

  /* ---------- feelings and situations (owner to approve) ---------- */
  T("feeling", "fear", "Fear", ["20:46", "3:173", "3:175"], ["fear", "afraid", "scared", "frightened", "terrified", "phobia", "unsafe", "danger"]),
  T("feeling", "sad", "Sadness", ["9:40", "3:139", "93"], ["depressed", "depression", "down", "low", "feeling low", "blue", "miserable", "unhappy", "gloomy"]),
  T("feeling", "anger", "Anger", ["3:134", "42:37", "41:34"], ["angry", "anger", "furious", "rage", "mad", "irritated", "frustrated", "frustration", "annoyed", "temper"]),
  T("feeling", "hope", "Hope", ["12:87", "39:53", "15:56", "65:7"], ["hope", "hopeful", "despair", "despairing", "no way out", "losing hope", "lost hope", "optimism"]),
  T("feeling", "mercy", "The mercy of Allah", ["39:53", "7:156", "6:54"], ["mercy", "merciful", "rahma", "rahmah", "compassion", "will allah forgive", "is it too late"]),
  T("feeling", "trust", "Trusting Allah", ["65:3", "3:159", "9:51"], ["trust", "tawakkul", "rely on allah", "reliance", "leave it to allah", "out of my control", "letting go"]),
  T("feeling", "provision", "Money and provision", ["65:2-3", "11:6", "51:22"], [
    "money", "rizq", "provision", "broke", "poor", "poverty", "bills", "rent", "job loss", "lost my job", "unemployed", "jobless", "finances", "financial",
  ]),
  T("feeling", "illness", "Illness and healing", ["26:80", "17:82", "10:57"], [
    "sick", "ill", "illness", "disease", "healing", "heal", "cure", "hospital", "surgery", "diagnosis", "cancer", "pain relief", "recovery", "unwell",
  ]),
  T("feeling", "oppressed", "Being wronged", ["14:42", "26:227", "4:148"], [
    "wronged", "oppressed", "oppression", "injustice", "unfair", "treated unfairly", "betrayed", "betrayal", "bullied", "bullying", "abused", "lied about",
  ]),
  T("feeling", "worth", "Self-worth", ["95:4", "17:70", "49:13"], [
    "worthless", "self worth", "self esteem", "not good enough", "insecure", "insecurity", "ugly", "compare myself", "comparison", "imposter",
  ]),
  T("feeling", "temptation", "Temptation", ["12:33", "12:53", "7:200-201"], ["temptation", "tempted", "desire", "desires", "lust", "urges", "addiction", "addicted", "habit"]),
  T("feeling", "envy", "Envy and the evil eye", ["113", "4:54"], ["envy", "envious", "jealous", "jealousy", "hasad", "evil eye", "nazar"]),
  T("feeling", "protection", "Protection", ["113", "114", "2:255", "16:98"], ["protection", "protect", "shaytan", "shaitan", "satan", "devil", "waswas", "whispers", "intrusive thoughts", "black magic", "sihr"]),
  T("feeling", "doubt", "Doubt", ["2:2", "10:57", "41:53"], ["doubt", "doubts", "doubting", "questioning faith", "is islam true", "certainty", "yaqeen"]),
  T("feeling", "decision", "Making a decision", ["3:159", "2:216", "65:3"], ["decision", "decide", "choice", "choose", "istikhara", "confused", "which way", "crossroads", "dilemma"]),
  T("feeling", "exam", "Studying and exams", ["20:114", "20:25-28", "96:1-5"], ["exam", "exams", "test tomorrow", "study", "studying", "school", "university", "college", "homework", "revision"]),
  T("feeling", "travel", "Travelling", ["43:13-14", "11:41"], ["travel", "travelling", "traveling", "journey", "trip", "flight", "flying", "driving", "road trip", "safar"]),
  T("feeling", "new-start", "A new beginning", ["1", "94", "65:2-3"], ["new beginning", "new start", "new job", "moving", "new home", "new chapter", "starting over", "first day"]),

  /* ---------- people and family (owner to approve) ---------- */
  T("topic", "parents", "Parents", ["17:23-24", "31:14", "46:15"], ["parents", "mother", "mom", "mum", "father", "dad", "mother and father", "honour parents", "birr"]),
  T("topic", "marriage", "Marriage and spouses", ["30:21", "25:74", "2:187"], ["marriage", "married", "spouse", "husband", "wife", "nikah", "wedding", "love", "relationship"]),
  T("topic", "seeking-marriage", "Hoping to marry", ["28:24", "25:74", "24:32"], ["want to get married", "looking for a spouse", "single", "finding a spouse", "rishta"]),
  T("topic", "children", "Children", ["25:74", "18:46", "64:15"], ["children", "kids", "son", "daughter", "raising children", "parenting", "my baby"]),
  T("topic", "wanting-children", "Hoping for a child", ["21:89-90", "3:38", "19:2-6"], ["want a child", "infertility", "trying to conceive", "ttc", "pregnancy", "pregnant", "expecting"]),
  T("topic", "family-ties", "Family and kinship", ["4:1", "4:36", "47:22"], ["family", "relatives", "kinship", "siblings", "brother", "sister", "cousins", "family problems", "silat ar rahim"]),
  T("topic", "friends", "Friends and company", ["18:28", "43:67", "25:27-29"], ["friends", "friendship", "bad friends", "good company", "peer pressure", "best friend"]),
  T("topic", "orphans", "Orphans and the needy", ["93:9-10", "107", "76:8"], ["orphan", "orphans", "needy", "poor people", "homeless", "feeding the poor"]),
  T("topic", "neighbours", "Neighbours and kindness", ["4:36", "2:83"], ["neighbour", "neighbor", "neighbours", "neighbors", "kindness", "be kind"]),

  /* ---------- worship (owner to approve) ---------- */
  T("topic", "prayer", "Prayer", ["2:45", "29:45", "20:14", "23:1-2"], ["prayer", "salah", "salat", "namaz", "pray", "praying", "khushu", "focus in prayer", "missed prayer"]),
  T("topic", "night-prayer", "Night prayer", ["73:1-6", "17:79", "32:16"], ["tahajjud", "qiyam", "night prayer", "pray at night", "last third of the night"]),
  T("topic", "dua", "Making dua", ["2:186", "40:60", "7:55"], ["dua", "supplication", "ask allah", "asking allah", "will my dua be answered", "dua not answered"]),
  T("topic", "dhikr", "Remembering Allah", ["13:28", "2:152", "33:41-42"], ["dhikr", "zikr", "remembrance", "remember allah", "tasbih", "tasbeeh"]),
  T("topic", "fasting", "Fasting and Ramadan", ["2:183-185"], ["ramadan", "fasting", "fast", "sawm", "roza", "iftar", "suhoor", "laylatul qadr", "laylat al qadr"]),
  T("topic", "qadr", "The Night of Decree", ["97", "44:3-4"], ["night of decree", "night of power", "qadr", "laylatul qadr night", "last ten nights"]),
  T("topic", "hajj", "Hajj and Umrah", ["22:27", "2:196", "3:97"], ["hajj", "umrah", "pilgrimage", "makkah", "mecca", "kaaba", "arafah"]),
  T("topic", "charity", "Charity", ["2:261-262", "2:274", "3:92"], ["charity", "sadaqah", "sadaqa", "giving", "donate", "donation", "zakat", "zakah", "spend in the way of allah"]),
  T("topic", "purity", "Purity and wudu", ["5:6", "2:222"], ["wudu", "wudhu", "ablution", "purity", "cleanliness", "ghusl"]),
  T("topic", "quran", "The Quran itself", ["17:9", "54:17", "38:29", "47:24"], ["the quran", "about the quran", "reading quran", "reflect on quran", "tadabbur", "memorize quran", "hifz", "hafiz"]),
  T("topic", "tartil", "Reciting slowly", ["73:4", "25:32"], ["tartil", "tarteel", "recite slowly", "recitation", "tajweed", "tajwid"]),

  /* ---------- belief and the unseen (owner to approve) ---------- */
  T("topic", "tawhid", "The oneness of Allah", ["112", "2:255", "2:163"], ["tawhid", "tawheed", "oneness", "one god", "who is allah", "god"]),
  T("topic", "allah-near", "Allah is near", ["2:186", "50:16", "57:4"], ["allah is near", "allah is close", "does allah hear me", "is allah listening", "allah sees"]),
  T("topic", "love-of-allah", "The love of Allah", ["3:31", "2:165", "5:54", "2:222"], ["love of allah", "allah loves", "does allah love me", "loved by allah"]),
  T("topic", "death", "Death and the next life", ["3:185", "29:57", "21:35", "62:8"], ["death", "dying", "afterlife", "akhirah", "grave", "barzakh", "fear of death"]),
  T("topic", "judgement", "The Day of Judgement", ["99", "101", "81", "82"], ["day of judgement", "judgment day", "qiyamah", "resurrection", "end of the world", "end times", "the hour"]),
  T("topic", "paradise", "Paradise", ["55:46-78", "56:10-40", "76:5-22"], ["paradise", "jannah", "heaven", "garden", "rewards"]),
  T("topic", "hellfire", "The Fire", ["56:41-56", "67:6-11"], ["hell", "hellfire", "jahannam", "the fire", "punishment"]),
  T("topic", "angels", "Angels", ["35:1", "66:6", "2:285"], ["angels", "angel", "jibril", "gabriel", "malaika"]),
  T("topic", "jinn", "The Jinn", ["72", "55:15"], ["jinn", "djinn"]),
  T("topic", "creation", "Creation and signs", ["3:190-191", "2:164", "30:22"], ["creation", "nature", "universe", "stars", "sky", "science", "signs of allah", "sunrise", "sunset", "rain", "ocean", "mountains"]),
  T("topic", "time", "Time", ["103"], ["time", "wasting time", "procrastination", "procrastinating", "busy", "productivity"]),
  T("topic", "deeds", "Small deeds", ["99:7-8", "4:40"], ["small deeds", "good deeds", "every deed", "does it count", "atoms weight"]),
  T("topic", "tests", "Why we are tested", ["2:155", "29:2-3", "67:2"], ["why me", "why is this happening", "tested", "test of life", "why do bad things happen"]),
  T("topic", "dunya", "This worldly life", ["57:20", "18:45-46", "102"], ["dunya", "worldly life", "materialism", "wealth", "rich", "greed", "social media", "status"]),

  /* ---------- character (owner to approve) ---------- */
  T("topic", "humility", "Humility and arrogance", ["31:18-19", "25:63", "17:37"], ["humble", "humility", "arrogant", "arrogance", "pride", "proud", "ego", "showing off"]),
  T("topic", "honesty", "Honesty", ["33:70", "9:119"], ["honest", "honesty", "truth", "truthful", "lying", "lie", "lies"]),
  T("topic", "justice", "Justice", ["4:135", "5:8", "16:90"], ["justice", "just", "fairness", "fair"]),
  T("topic", "forgiving-others", "Forgiving others", ["24:22", "42:40", "7:199"], ["forgive others", "forgive someone", "grudge", "holding a grudge", "letting go of anger", "pardon"]),
  T("topic", "speech", "Speech, gossip and mockery", ["49:11-12", "33:70"], ["gossip", "backbiting", "ghibah", "slander", "mocking", "insults", "words", "speech"]),
  T("topic", "unity", "Brotherhood and unity", ["49:10", "3:103"], ["unity", "brotherhood", "ummah", "division", "together"]),
  T("topic", "peace", "Peace", ["8:61", "25:63", "10:25"], ["peace", "peaceful", "inner peace", "calm", "calmness", "serenity", "tranquility", "sakina", "sakinah"]),
  T("topic", "character", "Good character", ["68:4", "33:21", "41:34"], ["good character", "akhlaq", "manners", "adab", "be a better person", "self improvement"]),
  T("topic", "purification", "Purifying the soul", ["91:7-10", "87:14-15"], ["tazkiyah", "purify", "soul", "nafs", "heart", "spiritual growth"]),
  T("topic", "modesty", "Modesty", ["24:30-31", "33:59"], ["modesty", "modest", "lower the gaze", "hijab", "haya"]),
  T("topic", "work", "Work and honest earning", ["62:10", "83:1-3", "17:35"], ["work", "job", "career", "business", "earning", "halal income", "trade", "boss", "promotion", "interview", "job interview"]),
  T("topic", "debt", "Debt", ["2:280", "2:282"], ["debt", "loan", "owe money", "borrowing", "lending"]),
  T("topic", "food", "Food and drink", ["2:168", "5:88", "5:90"], ["food", "halal food", "eating", "alcohol", "drinking"]),
  T("topic", "knowledge", "Seeking knowledge", ["20:114", "58:11", "39:9"], ["knowledge", "learning", "learn", "ilm", "wisdom", "scholars"]),
  T("topic", "success", "Success", ["23:1-11", "91:9-10", "3:185"], ["success", "successful", "falah", "winning", "achieve", "goals", "ambition"]),
  T("topic", "guidance", "Guidance", ["1", "93:7", "6:125"], ["guidance", "guide me", "lost", "lost in life", "direction", "purpose", "meaning of life", "why are we here"]),
  T("topic", "purpose", "The purpose of life", ["51:56", "67:2", "23:115"], ["purpose of life", "why was i created", "why do we exist", "meaning"]),

  /* ---------- stories (owner to approve) ---------- */
  T("topic", "yusuf", "The story of Yusuf", ["12"], ["yusuf", "joseph", "story of yusuf", "best of stories"]),
  T("topic", "musa", "The story of Musa", ["28", "20:9-98"], ["musa", "moses", "pharaoh", "firawn", "story of musa"]),
  T("topic", "ibrahim", "The story of Ibrahim", ["2:124-131", "14:35-41", "37:99-111"], ["ibrahim", "abraham", "story of ibrahim", "ismail", "ishmael"]),
  T("topic", "maryam", "Maryam", ["19:16-34", "3:42-47"], ["maryam", "mary", "story of maryam"]),
  T("topic", "isa", "Isa", ["19:30-33", "3:45-49"], ["isa", "jesus"]),
  T("topic", "nuh", "The story of Nuh", ["71", "11:25-49"], ["nuh", "noah", "the ark", "flood"]),
  T("topic", "cave", "The people of the cave", ["18:9-26"], ["people of the cave", "ashab al kahf", "sleepers of the cave", "companions of the cave"]),
  T("topic", "prophets", "Stories of the prophets", ["12", "18", "19", "28", "21"], ["prophets", "stories", "stories of the prophets", "prophet stories", "qasas"]),
  T("topic", "prophet-muhammad", "The Prophet Muhammad", ["33:21", "21:107", "68:4", "48:29"], ["prophet muhammad", "muhammad", "rasulullah", "the prophet", "mercy to the worlds"]),
];
