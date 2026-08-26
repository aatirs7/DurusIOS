/*
  Plain English for every lesson, alongside the book's own note.

  The notes that ship with the content are the book's: accurate, terse, and
  written in the vocabulary of Arabic grammar. "The mudaf takes neither ال nor
  tanwin and is definite by position" is exactly right and is no use at all to
  somebody who does not yet know what a mudaf is - which is everybody reading
  it for the first time.

  So each lesson gets a second pass in ordinary words. Not a replacement: the
  book's note stays, and the lesson screen shows both. The point is to say what
  is going on first, so the technical sentence reads as a summary rather than a
  wall.

  Rules for writing these:

    say the thing, then name it   "the first noun owns the second - that pair
                                  is called an idafah", not the other way round

    one idea per point            a reader taps through these; a point that
                                  needs two examples is two points

    show it                       an example with a gloss beats another
                                  sentence about the rule

    no encouragement              the app does not congratulate anyone
                                  anywhere else and this is not the place to
                                  start
*/

export type LessonPoint = {
  title: string;
  body: string;
  /* An example, when one earns its place. Arabic and its meaning stay separate
     fields - never one string - because they are never one text node. */
  example?: { arabic: string; gloss: string };
};

export type LessonNote = {
  /* One line, read before anything else: what this lesson gives you. */
  summary: string;
  points: LessonPoint[];
};

export const LESSON_NOTES: Record<number, LessonNote> = {
  1: {
    summary: "Naming things, and asking what something is.",
    points: [
      {
        title: "Arabic has no word for “is”.",
        body: "Put two words side by side and you have said a whole sentence. Nothing is missing - the “is” lives in the space between them.",
        example: { arabic: "هٰذَا بَيْتٌ", gloss: "this is a house" },
      },
      {
        title: "The -un ending means “a”.",
        body: "Arabic has no separate word for “a” or “an”. That little -un on the end, written as a doubled vowel and called tanwin, is doing that job.",
        example: { arabic: "بَيْتٌ", gloss: "a house" },
      },
      {
        title: "One letter turns it into a question.",
        body: "Put أ in front and the statement becomes a question. There is no change to the word order and nothing else moves.",
        example: { arabic: "أَهٰذَا بَيْتٌ؟", gloss: "is this a house?" },
      },
    ],
  },

  2: {
    summary: "Pointing at something further away, and joining two things.",
    points: [
      {
        title: "هٰذَا is near, ذٰلِكَ is far.",
        body: "Exactly the difference between “this” and “that” in English - what is in your hand against what is across the room.",
        example: { arabic: "ذٰلِكَ مَسْجِدٌ", gloss: "that is a mosque" },
      },
      {
        title: "Both are spelt short and said long.",
        body: "You will hear a long “aa” in the middle of both, but no alif is written for it. A small vertical stroke stands in for it instead.",
      },
      {
        title: "“And” is a letter, not a word.",
        body: "وَ attaches to the front of the next word with no space, the way “n’” does in “fish n’ chips” - except that in Arabic it is always written this way.",
        example: { arabic: "وَذٰلِكَ", gloss: "and that" },
      },
    ],
  },

  3: {
    summary: "The word “the”, and the two families of letters that follow it.",
    points: [
      {
        title: "“The” is two letters on the front.",
        body: "ال goes on the front of the word, and the -un ending drops off as it does. A word cannot be both “a house” and “the house”.",
        example: { arabic: "البَيْتُ", gloss: "the house" },
      },
      {
        title: "Half the alphabet swallows the l.",
        body: "Fourteen letters are called Solar. Before one of them the l of ال is written but not said - the following letter simply doubles instead.",
        example: { arabic: "الشَّمْسُ", gloss: "the sun, said ash-shamsu" },
      },
      {
        title: "The other half does not.",
        body: "The other fourteen are Lunar, and before them the l is said exactly as written. There is no rule to work it out from - it is learnt by hearing it.",
        example: { arabic: "القَمَرُ", gloss: "the moon, said al-qamaru" },
      },
    ],
  },

  4: {
    summary: "Endings that change, and the two words for “it”.",
    points: [
      {
        title: "The ending of a noun is not decoration.",
        body: "It says what the noun is doing in the sentence. Left alone a noun ends in -u; after a preposition that -u becomes -i, and nothing else about the word changes.",
        example: { arabic: "فِي البَيْتِ", gloss: "in the house" },
      },
      {
        title: "Everything is masculine or feminine.",
        body: "Not just people - a book, a house and a car each have a gender, and it decides which words around them change. Most feminine nouns end in ة, but not all of them do.",
      },
      {
        title: "“He” and “she” are used for objects too.",
        body: "There is no “it”. A book is masculine so it is هُوَ, and a car is feminine so it is هِيَ. English does this with ships; Arabic does it with everything.",
      },
    ],
  },

  5: {
    summary: "Saying that one thing belongs to another.",
    points: [
      {
        title: "Put two nouns together and the first owns the second.",
        body: "No word for “of” and no apostrophe. The pair is called an idafah, and the order is the opposite of English: the thing owned comes first.",
        example: { arabic: "بَيْتُ الإِمَامِ", gloss: "the imam's house" },
      },
      {
        title: "The first word loses its “the” and its “a”.",
        body: "It cannot take ال and it cannot take the -un ending, because being owned already makes it definite. This is the part that feels wrong at first and stops feeling wrong quickly.",
      },
      {
        title: "The second word ends in -i.",
        body: "The same -i you met after a preposition. Whatever is doing the owning takes that ending.",
      },
      {
        title: "Calling someone by name.",
        body: "يَا goes in front of a name to address the person, the way “O” does in older English. The name after it takes a single short -u.",
        example: { arabic: "يَا مُحَمَّدُ", gloss: "Muhammad!" },
      },
    ],
  },

  6: {
    summary: "The feminine of “this”, and how to say something is yours.",
    points: [
      {
        title: "هٰذِهِ is “this” for feminine things.",
        body: "Same word, feminine shape. Which one you use is decided by the noun, not by who is speaking.",
        example: { arabic: "هٰذِهِ سَيَّارَةٌ", gloss: "this is a car" },
      },
      {
        title: "Body parts you have two of are feminine.",
        body: "Hand, eye, foot, ear. The ones you have one of - head, nose, mouth - are masculine. It is a small list and it is worth learning as one.",
      },
      {
        title: "لِ means “belongs to”.",
        body: "One letter on the front of a word, and the word after it takes the -i ending.",
        example: { arabic: "لِمَنْ هٰذَا؟", gloss: "whose is this?" },
      },
    ],
  },

  7: {
    summary: "The feminine of “that”.",
    points: [
      {
        title: "تِلْكَ is “that” for feminine things.",
        body: "The pair to ذٰلِكَ, exactly as هٰذِهِ is the pair to هٰذَا. This lesson adds one word and a great deal of practice.",
        example: { arabic: "تِلْكَ مَدْرَسَةٌ", gloss: "that is a school" },
      },
    ],
  },

  8: {
    summary: "The difference between a sentence and a phrase.",
    points: [
      {
        title: "“This book” is not a sentence.",
        body: "هٰذَا بَيْتٌ is “this is a house”. Add ال and هٰذَا البَيْتُ becomes just “this house” - a phrase, waiting for you to say something about it.",
        example: { arabic: "هٰذَا الكِتَابُ جَدِيدٌ", gloss: "this book is new" },
      },
      {
        title: "Some words never change their ending.",
        body: "Nouns finishing in a long alif keep the same shape whatever their job in the sentence. Nothing is wrong when you see no ending on them.",
      },
      {
        title: "“Behind” and “in front of” take the -i ending.",
        body: "They behave like prepositions: whatever follows them changes ending, the same way it does after فِي.",
        example: { arabic: "أَمَامَ المُدَرِّسِ", gloss: "in front of the teacher" },
      },
    ],
  },

  9: {
    summary: "Describing things, and joining two sentences with “who”.",
    points: [
      {
        title: "The description comes after the thing.",
        body: "The opposite of English. “A new house” is house-new, and the adjective copies the noun in gender, in whether it has “the”, and in its ending.",
        example: { arabic: "بَيْتٌ جَدِيدٌ", gloss: "a new house" },
      },
      {
        title: "Matching “the” is what makes it a sentence or not.",
        body: "البَيْتُ الجَدِيدُ is “the new house”, a phrase. البَيْتُ جَدِيدٌ is “the house is new”, a sentence. The only difference is whether the adjective also has ال.",
      },
      {
        title: "الَّذِي is “who” or “which”.",
        body: "It joins a second statement onto a noun you have already named, the way “the man who went out” does in English.",
      },
      {
        title: "عِنْدَ is “with” in the sense of having.",
        body: "The word after it takes the -i ending, and the pair is how Arabic says somebody has something.",
      },
    ],
  },

  10: {
    summary: "My, your, his, her - and how to say “I have”.",
    points: [
      {
        title: "Possession is a syllable on the end.",
        body: "No separate word. كِتَابٌ becomes كِتَابُكَ for “your book” and كِتَابِي for “my book”, and the -un ending drops because the word is now definite.",
        example: { arabic: "كِتَابُهُ", gloss: "his book" },
      },
      {
        title: "“Father” and “brother” grow a letter.",
        body: "أَبٌ and أَخٌ take a waw when something is attached: أَبُوكَ, أَخُوكَ. With “my” they do not: أَبِي, أَخِي.",
      },
      {
        title: "There is no verb “to have”.",
        body: "عِنْدَ with an ending does the whole job. عِنْدِي is “I have”, and it is a preposition with a pronoun stuck on rather than a verb.",
      },
      {
        title: "مَا makes it negative.",
        body: "Put مَا in front and you have said you do not have it.",
        example: { arabic: "مَا عِنْدِي", gloss: "I do not have" },
      },
    ],
  },

  11: {
    summary: "Revision, and one new ending.",
    points: [
      {
        title: "A third ending, for the thing a verb acts on.",
        body: "You know -u for a plain noun and -i after a preposition. What a verb is done TO takes -a. That is the whole set, and the three are called nominative, genitive and accusative.",
      },
      {
        title: "It disappears before “my”.",
        body: "Attach the “my” ending and the -a is not written or heard. Nothing is missing - it is simply not there in that combination.",
      },
    ],
  },

  12: {
    summary: "Speaking to a woman, and saying what she did.",
    points: [
      {
        title: "أَنْتِ is “you” to a woman.",
        body: "The same word as أَنْتَ with a different final vowel, and the possessive ending changes to match.",
      },
      {
        title: "A silent ت marks that a woman did it.",
        body: "ذَهَبَ is “he went”. ذَهَبَتْ is “she went”. The ت on the end carries no vowel of its own - except before ال, where it takes a short -i so the words can join.",
      },
      {
        title: "الَّتِي is “who” for a woman.",
        body: "The feminine of الَّذِي, and used in exactly the same way.",
      },
    ],
  },

  13: {
    summary: "More than two of something.",
    points: [
      {
        title: "Some plurals are an ending.",
        body: "Add -uuna for a group of men, -aatun for a group of women or things. The word itself does not change, which is why these are called sound plurals.",
      },
      {
        title: "Most plurals are a different word.",
        body: "The letters stay and the vowels between them are rebuilt: كِتَابٌ becomes كُتُبٌ. These are called broken plurals, there are many patterns, and there is no way to predict which a word takes. Learn each one with the word.",
        example: { arabic: "كِتَابٌ ← كُتُبٌ", gloss: "book, books" },
      },
      {
        title: "هٰؤُلَاءِ is “these”.",
        body: "The plural of both هٰذَا and هٰذِهِ, used mostly for people.",
      },
    ],
  },

  14: {
    summary: "Talking to a group, and an ambiguity that endings solve.",
    points: [
      {
        title: "أَنْتُمْ is “you” to more than one person.",
        body: "And نَحْنُ is “we”. Each has its own possessive ending, and the past-tense verb changes shape to match.",
      },
      {
        title: "One ending decides who is new.",
        body: "بَيْتُ الإِمَامِ الجَدِيدُ is the imam's new HOUSE. بَيْتُ الإِمَامِ الجَدِيدِ is the NEW imam's house. Nothing moves - only the last vowel of the adjective changes, and it tells you which noun is being described.",
      },
      {
        title: "Most foreign names take no -un.",
        body: "London, Pakistan and most prophets' names are left bare. Short three-letter masculine ones like نُوحٌ are the exception.",
      },
    ],
  },

  15: {
    summary: "Speaking to a group of women, and words that must own something.",
    points: [
      {
        title: "أَنْتُنَّ is “you” to a group of women.",
        body: "The last of the set, with its own possessive ending and its own verb shape.",
      },
      {
        title: "“Before” and “after” are never on their own.",
        body: "قَبْلَ and بَعْدَ are always the first half of a pair, so something always follows them and takes the -i ending.",
        example: { arabic: "بَعْدَ الدَّرْسِ", gloss: "after the lesson" },
      },
    ],
  },

  16: {
    summary: "Why a pile of books is “she”.",
    points: [
      {
        title: "Arabic sorts nouns into people and not-people.",
        body: "It matters only in the plural, and then it matters a lot.",
      },
      {
        title: "Plurals of things are treated as one feminine thing.",
        body: "Books, cars, houses - a plural of anything that is not a person takes feminine singular agreement. So you say “these books, she is small”, and it is correct.",
        example: { arabic: "هٰذِهِ كُتُبٌ، هِيَ صَغِيرَةٌ", gloss: "these are books, they are small" },
      },
      {
        title: "Plurals of people behave as you expect.",
        body: "A group of men is “they”, a group of women is “they”, and the adjectives are plural too.",
      },
    ],
  },

  17: {
    summary: "More practice on the last lesson.",
    points: [
      {
        title: "Nothing new here.",
        body: "This lesson adds vocabulary and gives the rational-and-irrational rule from Lesson 16 room to settle. If that rule still feels strange, this is where it stops feeling strange.",
      },
    ],
  },

  18: {
    summary: "Exactly two of something, and asking how many.",
    points: [
      {
        title: "Arabic counts one, two, and many.",
        body: "Two is not a plural - it has an ending of its own, -aani, and every word describing it takes that ending too.",
        example: { arabic: "كِتَابَانِ", gloss: "two books" },
      },
      {
        title: "“This” has a dual as well.",
        body: "هٰذَانِ for two masculine things, هَاتَانِ for two feminine, هُمَا for “they two”.",
      },
      {
        title: "كَمْ asks how many, and takes a singular.",
        body: "Where English says “how many books”, Arabic says how-many book, singular, with the -a ending.",
        example: { arabic: "كَمْ كِتَابًا؟", gloss: "how many books?" },
      },
    ],
  },

  19: {
    summary: "Counting, and the rule that looks backwards.",
    points: [
      {
        title: "One and two come after the noun.",
        body: "They behave like adjectives, because a noun already tells you it is one or two. Saying them is optional emphasis.",
        example: { arabic: "كِتَابٌ وَاحِدٌ", gloss: "one book" },
      },
      {
        title: "Three to ten come before, and own what they count.",
        body: "The number is the first half of a pair, so it takes no “the”, and the thing counted is plural with the -i ending.",
        example: { arabic: "ثَلَاثَةُ كُتُبٍ", gloss: "three books" },
      },
      {
        title: "The number takes the ta with a masculine noun.",
        body: "ثَلَاثَةُ with a masculine word. This is the rule that catches everyone, and Lesson 20 is the other half of it.",
      },
    ],
  },

  20: {
    summary: "The other half of the counting rule.",
    points: [
      {
        title: "With a feminine noun, the number drops its ta.",
        body: "ثَلَاثَةُ كُتُبٍ but ثَلَاثُ بَنَاتٍ. The number takes the opposite gender to the thing it counts, for three to ten only.",
        example: { arabic: "ثَلَاثُ بَنَاتٍ", gloss: "three girls" },
      },
      {
        title: "One and two behave normally.",
        body: "They follow the noun and agree with it the ordinary way: وَاحِدَةٌ and اِثْنَتَانِ with feminine words. The backwards rule is only for three to ten.",
      },
      {
        title: "Eight is irregular.",
        body: "With a feminine noun it is ثَمَانِي, ending on the ya with no vowel after it.",
      },
    ],
  },

  21: {
    summary: "A test lesson.",
    points: [
      {
        title: "Nothing new here.",
        body: "The book uses this lesson to check what has landed. Everything in it has been met before.",
      },
    ],
  },

  22: {
    summary: "Words that refuse the -un ending.",
    points: [
      {
        title: "A group of words never takes tanwin.",
        body: "Where you expect -un they take a single -u, and they never take it at all. They are called diptotes.",
      },
      {
        title: "Mostly names and a few patterns.",
        body: "Women's names, men's names ending in ة, foreign names, colours and certain adjective shapes, and several broken plural patterns.",
        example: { arabic: "مَسَاجِدُ", gloss: "mosques" },
      },
      {
        title: "Nothing is missing when you see one.",
        body: "The single -u is the correct and complete ending. This is worth saying because it looks like a mistake for a long time.",
      },
    ],
  },

  23: {
    summary: "What diptotes do after a preposition.",
    points: [
      {
        title: "They take -a where everything else takes -i.",
        body: "An ordinary noun after a preposition ends in -i. A diptote ends in -a instead, and still takes no tanwin.",
        example: { arabic: "مِنْ أَحْمَدَ", gloss: "from Ahmad" },
      },
      {
        title: "The same happens in a pair.",
        body: "Whatever is doing the owning normally takes -i. If it is a diptote it takes -a.",
        example: { arabic: "كِتَابُ إِبْرَاهِيمَ", gloss: "Ibrahim's book" },
      },
    ],
  },
};
