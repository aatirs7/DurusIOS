/*
  The morning and evening adhkar, as a guided walkthrough.

  The selection and order follow Hisn al-Muslim (Sa'id al-Qahtani), the
  standard pocket collection, chapter "Words of remembrance for morning and
  evening". Where the evening wording differs (asbahna / amsayna and so on)
  both are written out in full.

  Quran passages carry `quran` refs and are shown from the app's own Tanzil
  text, never typed here. Their English comes from the reader's translation
  when it has been fetched, with `meaning` as the offline fallback.

  The English and the transliterations are Durus's own plain renderings. Each
  `about` states only what the cited narration reports, in plain words, with
  the collection it is found in.
*/

export type Time = "morning" | "evening";
type Both = string | { morning: string; evening: string };

export type Dhikr = {
  id: string;
  title: string;
  /* Some are said only in the morning or only in the evening. */
  only?: Time;
  repeat: number;
  /* Quran passages: [surah, fromAyah, toAyah]. Shown from Tanzil. */
  quran?: [number, number, number][];
  /* Said before a Quran passage, such as the ta'awwudh. */
  lead?: { arabic: string; translit: string; meaning: string };
  arabic?: Both;
  translit: Both;
  meaning: Both;
  about: string;
  source: string;
};

export function pick(x: Both, t: Time): string {
  return typeof x === "string" ? x : x[t];
}

export const ADHKAR: Dhikr[] = [
  {
    id: "kursi",
    title: "Ayat al-Kursi",
    repeat: 1,
    lead: {
      arabic: "أَعُوذُ بِاللَّهِ مِنَ الشَّيْطَانِ الرَّجِيمِ",
      translit: "A'udhu billahi minash-shaytanir-rajim.",
      meaning: "I seek refuge in Allah from the accursed devil.",
    },
    quran: [[2, 255, 255]],
    translit:
      "Allahu la ilaha illa huwal-hayyul-qayyum, la ta'khudhuhu sinatun wa la nawm, lahu ma fis-samawati wa ma fil-ard, man dhal-ladhi yashfa'u 'indahu illa bi-idhnih, ya'lamu ma bayna aydihim wa ma khalfahum, wa la yuhituna bi-shay'im-min 'ilmihi illa bima sha', wasi'a kursiyyuhus-samawati wal-ard, wa la ya'uduhu hifdhuhuma, wa huwal-'aliyyul-'adhim.",
    meaning:
      "Allah, there is no god but Him, the Ever-Living, the Sustainer of all. Neither drowsiness nor sleep overtakes Him. To Him belongs all in the heavens and the earth. Who could intercede with Him except by His leave? He knows what is before them and behind them, and they grasp nothing of His knowledge except what He wills. His Kursi spans the heavens and the earth, and guarding them does not tire Him. He is the Most High, the Most Great.",
    about:
      "The greatest ayah in the Quran. The Prophet ﷺ said that whoever recites it in the morning is protected from the jinn until evening, and whoever recites it in the evening is protected until morning.",
    source: "al-Hakim; an-Nasa'i, al-Sunan al-Kubra",
  },
  {
    id: "quls",
    title: "The three Quls",
    repeat: 3,
    quran: [
      [112, 1, 4],
      [113, 1, 5],
      [114, 1, 6],
    ],
    translit:
      "Qul huwallahu ahad. Allahus-samad. Lam yalid wa lam yulad. Wa lam yakul-lahu kufuwan ahad.\n\nQul a'udhu bi-rabbil-falaq. Min sharri ma khalaq. Wa min sharri ghasiqin idha waqab. Wa min sharrin-naffathati fil-'uqad. Wa min sharri hasidin idha hasad.\n\nQul a'udhu bi-rabbin-nas. Malikin-nas. Ilahin-nas. Min sharril-waswasil-khannas. Alladhi yuwaswisu fi sudurin-nas. Minal-jinnati wan-nas.",
    meaning:
      "Al-Ikhlas: Allah is One, the Self-Sufficient; He neither begets nor was begotten, and none is equal to Him.\n\nAl-Falaq: refuge with the Lord of daybreak from the harm of what He created, of the dark night, of those who blow on knots, and of the envier.\n\nAn-Nas: refuge with the Lord, King and God of mankind from the whisperer who withdraws, who whispers in people's chests, of jinn and of men.",
    about:
      "Recite each of the three, three times. The Prophet ﷺ told Abdullah ibn Khubayb that saying them morning and evening would suffice him against everything.",
    source: "Abu Dawud; at-Tirmidhi",
  },
  {
    id: "mulk",
    title: "We have reached the morning",
    repeat: 1,
    arabic: {
      morning:
        "أَصْبَحْنَا وَأَصْبَحَ الْمُلْكُ لِلَّهِ، وَالْحَمْدُ لِلَّهِ، لَا إِلَهَ إِلَّا اللَّهُ وَحْدَهُ لَا شَرِيكَ لَهُ، لَهُ الْمُلْكُ وَلَهُ الْحَمْدُ وَهُوَ عَلَى كُلِّ شَيْءٍ قَدِيرٌ، رَبِّ أَسْأَلُكَ خَيْرَ مَا فِي هَذَا الْيَوْمِ وَخَيْرَ مَا بَعْدَهُ، وَأَعُوذُ بِكَ مِنْ شَرِّ مَا فِي هَذَا الْيَوْمِ وَشَرِّ مَا بَعْدَهُ، رَبِّ أَعُوذُ بِكَ مِنَ الْكَسَلِ وَسُوءِ الْكِبَرِ، رَبِّ أَعُوذُ بِكَ مِنْ عَذَابٍ فِي النَّارِ وَعَذَابٍ فِي الْقَبْرِ",
      evening:
        "أَمْسَيْنَا وَأَمْسَى الْمُلْكُ لِلَّهِ، وَالْحَمْدُ لِلَّهِ، لَا إِلَهَ إِلَّا اللَّهُ وَحْدَهُ لَا شَرِيكَ لَهُ، لَهُ الْمُلْكُ وَلَهُ الْحَمْدُ وَهُوَ عَلَى كُلِّ شَيْءٍ قَدِيرٌ، رَبِّ أَسْأَلُكَ خَيْرَ مَا فِي هَذِهِ اللَّيْلَةِ وَخَيْرَ مَا بَعْدَهَا، وَأَعُوذُ بِكَ مِنْ شَرِّ مَا فِي هَذِهِ اللَّيْلَةِ وَشَرِّ مَا بَعْدَهَا، رَبِّ أَعُوذُ بِكَ مِنَ الْكَسَلِ وَسُوءِ الْكِبَرِ، رَبِّ أَعُوذُ بِكَ مِنْ عَذَابٍ فِي النَّارِ وَعَذَابٍ فِي الْقَبْرِ",
    },
    translit: {
      morning:
        "Asbahna wa asbahal-mulku lillah, wal-hamdu lillah, la ilaha illallahu wahdahu la sharika lah, lahul-mulku wa lahul-hamdu wa huwa 'ala kulli shay'in qadir. Rabbi as'aluka khayra ma fi hadhal-yawmi wa khayra ma ba'dah, wa a'udhu bika min sharri ma fi hadhal-yawmi wa sharri ma ba'dah. Rabbi a'udhu bika minal-kasali wa su'il-kibar. Rabbi a'udhu bika min 'adhabin fin-nari wa 'adhabin fil-qabr.",
      evening:
        "Amsayna wa amsal-mulku lillah, wal-hamdu lillah, la ilaha illallahu wahdahu la sharika lah, lahul-mulku wa lahul-hamdu wa huwa 'ala kulli shay'in qadir. Rabbi as'aluka khayra ma fi hadhihil-laylati wa khayra ma ba'daha, wa a'udhu bika min sharri ma fi hadhihil-laylati wa sharri ma ba'daha. Rabbi a'udhu bika minal-kasali wa su'il-kibar. Rabbi a'udhu bika min 'adhabin fin-nari wa 'adhabin fil-qabr.",
    },
    meaning: {
      morning:
        "We have reached the morning, and the whole kingdom belongs to Allah. Praise is for Allah. There is no god but Allah alone, without partner; His is the kingdom and His the praise, and He has power over all things. My Lord, I ask You for the good of this day and what follows it, and seek refuge in You from the evil of this day and what follows it. My Lord, I seek refuge in You from laziness and the frailty of old age. My Lord, I seek refuge in You from punishment in the Fire and punishment in the grave.",
      evening:
        "We have reached the evening, and the whole kingdom belongs to Allah. Praise is for Allah. There is no god but Allah alone, without partner; His is the kingdom and His the praise, and He has power over all things. My Lord, I ask You for the good of this night and what follows it, and seek refuge in You from the evil of this night and what follows it. My Lord, I seek refuge in You from laziness and the frailty of old age. My Lord, I seek refuge in You from punishment in the Fire and punishment in the grave.",
    },
    about: "Abdullah ibn Mas'ud reported that the Prophet ﷺ said this every evening, and in the morning with the morning's wording.",
    source: "Sahih Muslim",
  },
  {
    id: "bika",
    title: "By You we live",
    repeat: 1,
    arabic: {
      morning: "اللَّهُمَّ بِكَ أَصْبَحْنَا، وَبِكَ أَمْسَيْنَا، وَبِكَ نَحْيَا، وَبِكَ نَمُوتُ، وَإِلَيْكَ النُّشُورُ",
      evening: "اللَّهُمَّ بِكَ أَمْسَيْنَا، وَبِكَ أَصْبَحْنَا، وَبِكَ نَحْيَا، وَبِكَ نَمُوتُ، وَإِلَيْكَ الْمَصِيرُ",
    },
    translit: {
      morning: "Allahumma bika asbahna, wa bika amsayna, wa bika nahya, wa bika namutu, wa ilaykan-nushur.",
      evening: "Allahumma bika amsayna, wa bika asbahna, wa bika nahya, wa bika namutu, wa ilaykal-masir.",
    },
    meaning: {
      morning: "O Allah, by You we reach the morning and by You the evening, by You we live and by You we die, and to You is the rising.",
      evening: "O Allah, by You we reach the evening and by You the morning, by You we live and by You we die, and to You is the return.",
    },
    about: "The Prophet ﷺ taught his companions to say this when morning and evening came.",
    source: "Abu Dawud; at-Tirmidhi",
  },
  {
    id: "sayyid",
    title: "The master of seeking forgiveness",
    repeat: 1,
    arabic:
      "اللَّهُمَّ أَنْتَ رَبِّي لَا إِلَهَ إِلَّا أَنْتَ، خَلَقْتَنِي وَأَنَا عَبْدُكَ، وَأَنَا عَلَى عَهْدِكَ وَوَعْدِكَ مَا اسْتَطَعْتُ، أَعُوذُ بِكَ مِنْ شَرِّ مَا صَنَعْتُ، أَبُوءُ لَكَ بِنِعْمَتِكَ عَلَيَّ، وَأَبُوءُ بِذَنْبِي، فَاغْفِرْ لِي فَإِنَّهُ لَا يَغْفِرُ الذُّنُوبَ إِلَّا أَنْتَ",
    translit:
      "Allahumma anta rabbi la ilaha illa ant, khalaqtani wa ana 'abduk, wa ana 'ala 'ahdika wa wa'dika mastata't, a'udhu bika min sharri ma sana't, abu'u laka bi-ni'matika 'alayy, wa abu'u bi-dhanbi, faghfir li fa-innahu la yaghfirudh-dhunuba illa ant.",
    meaning:
      "O Allah, You are my Lord; there is no god but You. You created me and I am Your servant, and I keep Your covenant and promise as best I can. I seek refuge in You from the evil of what I have done. I acknowledge Your favour upon me and I acknowledge my sin, so forgive me, for none forgives sins but You.",
    about:
      "The Prophet ﷺ called this the master of seeking forgiveness. Whoever says it by day with certainty and dies before evening is of the people of Paradise, and whoever says it by night with certainty and dies before morning is of the people of Paradise.",
    source: "Sahih al-Bukhari",
  },
  {
    id: "ushhiduk",
    title: "I call You to witness",
    repeat: 4,
    arabic: {
      morning:
        "اللَّهُمَّ إِنِّي أَصْبَحْتُ أُشْهِدُكَ، وَأُشْهِدُ حَمَلَةَ عَرْشِكَ، وَمَلَائِكَتَكَ، وَجَمِيعَ خَلْقِكَ، أَنَّكَ أَنْتَ اللَّهُ لَا إِلَهَ إِلَّا أَنْتَ وَحْدَكَ لَا شَرِيكَ لَكَ، وَأَنَّ مُحَمَّدًا عَبْدُكَ وَرَسُولُكَ",
      evening:
        "اللَّهُمَّ إِنِّي أَمْسَيْتُ أُشْهِدُكَ، وَأُشْهِدُ حَمَلَةَ عَرْشِكَ، وَمَلَائِكَتَكَ، وَجَمِيعَ خَلْقِكَ، أَنَّكَ أَنْتَ اللَّهُ لَا إِلَهَ إِلَّا أَنْتَ وَحْدَكَ لَا شَرِيكَ لَكَ، وَأَنَّ مُحَمَّدًا عَبْدُكَ وَرَسُولُكَ",
    },
    translit: {
      morning:
        "Allahumma inni asbahtu ush-hiduka, wa ush-hidu hamalata 'arshika, wa mala'ikataka, wa jami'a khalqika, annaka antallahu la ilaha illa anta wahdaka la sharika lak, wa anna Muhammadan 'abduka wa rasuluk.",
      evening:
        "Allahumma inni amsaytu ush-hiduka, wa ush-hidu hamalata 'arshika, wa mala'ikataka, wa jami'a khalqika, annaka antallahu la ilaha illa anta wahdaka la sharika lak, wa anna Muhammadan 'abduka wa rasuluk.",
    },
    meaning:
      "O Allah, at the start of this day (or night) I call on You, the bearers of Your Throne, Your angels and all Your creation to witness that You are Allah, there is no god but You alone, without partner, and that Muhammad is Your servant and Your messenger.",
    about: "The narration says that whoever says it four times, morning or evening, Allah frees from the Fire.",
    source: "Abu Dawud",
  },
  {
    id: "nima",
    title: "Every blessing is from You",
    repeat: 1,
    arabic: {
      morning: "اللَّهُمَّ مَا أَصْبَحَ بِي مِنْ نِعْمَةٍ أَوْ بِأَحَدٍ مِنْ خَلْقِكَ فَمِنْكَ وَحْدَكَ لَا شَرِيكَ لَكَ، فَلَكَ الْحَمْدُ وَلَكَ الشُّكْرُ",
      evening: "اللَّهُمَّ مَا أَمْسَى بِي مِنْ نِعْمَةٍ أَوْ بِأَحَدٍ مِنْ خَلْقِكَ فَمِنْكَ وَحْدَكَ لَا شَرِيكَ لَكَ، فَلَكَ الْحَمْدُ وَلَكَ الشُّكْرُ",
    },
    translit: {
      morning: "Allahumma ma asbaha bi min ni'matin aw bi-ahadin min khalqika fa-minka wahdaka la sharika lak, fa-lakal-hamdu wa lakash-shukr.",
      evening: "Allahumma ma amsa bi min ni'matin aw bi-ahadin min khalqika fa-minka wahdaka la sharika lak, fa-lakal-hamdu wa lakash-shukr.",
    },
    meaning: "O Allah, whatever blessing I or any of Your creation have this morning (or evening) is from You alone, without partner. To You is all praise and all thanks.",
    about: "Whoever says it in the morning has given thanks for that day, and whoever says it in the evening has given thanks for that night.",
    source: "Abu Dawud",
  },
  {
    id: "afini",
    title: "Health in body, hearing and sight",
    repeat: 3,
    arabic:
      "اللَّهُمَّ عَافِنِي فِي بَدَنِي، اللَّهُمَّ عَافِنِي فِي سَمْعِي، اللَّهُمَّ عَافِنِي فِي بَصَرِي، لَا إِلَهَ إِلَّا أَنْتَ. اللَّهُمَّ إِنِّي أَعُوذُ بِكَ مِنَ الْكُفْرِ وَالْفَقْرِ، وَأَعُوذُ بِكَ مِنْ عَذَابِ الْقَبْرِ، لَا إِلَهَ إِلَّا أَنْتَ",
    translit:
      "Allahumma 'afini fi badani, Allahumma 'afini fi sam'i, Allahumma 'afini fi basari, la ilaha illa ant. Allahumma inni a'udhu bika minal-kufri wal-faqr, wa a'udhu bika min 'adhabil-qabr, la ilaha illa ant.",
    meaning:
      "O Allah, keep my body well. O Allah, keep my hearing well. O Allah, keep my sight well. There is no god but You. O Allah, I seek refuge in You from disbelief and poverty, and from the punishment of the grave. There is no god but You.",
    about: "Abu Bakrah's son heard his father say this three times each morning and evening, and he said he had heard the Prophet ﷺ supplicate with these words.",
    source: "Abu Dawud",
  },
  {
    id: "hasbi",
    title: "Allah is enough for me",
    repeat: 7,
    arabic: "حَسْبِيَ اللَّهُ لَا إِلَهَ إِلَّا هُوَ، عَلَيْهِ تَوَكَّلْتُ، وَهُوَ رَبُّ الْعَرْشِ الْعَظِيمِ",
    translit: "Hasbiyallahu la ilaha illa huw, 'alayhi tawakkalt, wa huwa rabbul-'arshil-'adhim.",
    meaning: "Allah is enough for me. There is no god but Him. In Him I trust, and He is Lord of the mighty Throne.",
    about: "The words close Surah at-Tawbah (9:129). The narration says that whoever says them seven times morning and evening, Allah will suffice him in what concerns him.",
    source: "Abu Dawud",
  },
  {
    id: "afw",
    title: "Pardon and wellbeing",
    repeat: 1,
    arabic:
      "اللَّهُمَّ إِنِّي أَسْأَلُكَ الْعَفْوَ وَالْعَافِيَةَ فِي الدُّنْيَا وَالْآخِرَةِ، اللَّهُمَّ إِنِّي أَسْأَلُكَ الْعَفْوَ وَالْعَافِيَةَ فِي دِينِي وَدُنْيَايَ وَأَهْلِي وَمَالِي، اللَّهُمَّ اسْتُرْ عَوْرَاتِي، وَآمِنْ رَوْعَاتِي، اللَّهُمَّ احْفَظْنِي مِنْ بَيْنِ يَدَيَّ، وَمِنْ خَلْفِي، وَعَنْ يَمِينِي، وَعَنْ شِمَالِي، وَمِنْ فَوْقِي، وَأَعُوذُ بِعَظَمَتِكَ أَنْ أُغْتَالَ مِنْ تَحْتِي",
    translit:
      "Allahumma inni as'alukal-'afwa wal-'afiyata fid-dunya wal-akhirah. Allahumma inni as'alukal-'afwa wal-'afiyata fi dini wa dunyaya wa ahli wa mali. Allahummastur 'awrati, wa amin raw'ati. Allahummahfadhni min bayni yadayya, wa min khalfi, wa 'an yamini, wa 'an shimali, wa min fawqi, wa a'udhu bi-'adhamatika an ughtala min tahti.",
    meaning:
      "O Allah, I ask You for pardon and wellbeing in this world and the next. O Allah, I ask You for pardon and wellbeing in my religion, my worldly life, my family and my wealth. O Allah, cover my faults and calm my fears. O Allah, guard me from in front and behind, from my right and my left, and from above, and I seek refuge in Your greatness from being taken unawares from below.",
    about: "Ibn Umar said the Prophet ﷺ never left these words, morning and evening.",
    source: "Abu Dawud; Ibn Majah",
  },
  {
    id: "alim",
    title: "Knower of the unseen",
    repeat: 1,
    arabic:
      "اللَّهُمَّ عَالِمَ الْغَيْبِ وَالشَّهَادَةِ، فَاطِرَ السَّمَاوَاتِ وَالْأَرْضِ، رَبَّ كُلِّ شَيْءٍ وَمَلِيكَهُ، أَشْهَدُ أَنْ لَا إِلَهَ إِلَّا أَنْتَ، أَعُوذُ بِكَ مِنْ شَرِّ نَفْسِي، وَمِنْ شَرِّ الشَّيْطَانِ وَشِرْكِهِ، وَأَنْ أَقْتَرِفَ عَلَى نَفْسِي سُوءًا، أَوْ أَجُرَّهُ إِلَى مُسْلِمٍ",
    translit:
      "Allahumma 'alimal-ghaybi wash-shahadah, fatiras-samawati wal-ard, rabba kulli shay'in wa malikah, ash-hadu an la ilaha illa ant, a'udhu bika min sharri nafsi, wa min sharrish-shaytani wa shirkih, wa an aqtarifa 'ala nafsi su'an aw ajurrahu ila muslim.",
    meaning:
      "O Allah, Knower of the unseen and the seen, Originator of the heavens and the earth, Lord and Owner of everything: I bear witness that there is no god but You. I seek refuge in You from the evil of my own self, from the evil of Shaytan and his call to associate partners with You, and from doing wrong against myself or bringing it upon a Muslim.",
    about: "Abu Bakr asked the Prophet ﷺ for words to say morning and evening, and he taught him these, to say also when lying down to sleep.",
    source: "Abu Dawud; at-Tirmidhi",
  },
  {
    id: "bismillah",
    title: "In the name of Allah, nothing harms",
    repeat: 3,
    arabic: "بِسْمِ اللَّهِ الَّذِي لَا يَضُرُّ مَعَ اسْمِهِ شَيْءٌ فِي الْأَرْضِ وَلَا فِي السَّمَاءِ، وَهُوَ السَّمِيعُ الْعَلِيمُ",
    translit: "Bismillahil-ladhi la yadurru ma'asmihi shay'un fil-ardi wa la fis-sama', wa huwas-sami'ul-'alim.",
    meaning: "In the name of Allah, with whose name nothing on earth or in the heavens can cause harm, and He is the All-Hearing, the All-Knowing.",
    about: "Uthman ibn Affan reported that whoever says it three times in the morning and three in the evening, nothing will harm him.",
    source: "Abu Dawud; at-Tirmidhi",
  },
  {
    id: "radit",
    title: "Content with Allah as Lord",
    repeat: 3,
    arabic: "رَضِيتُ بِاللَّهِ رَبًّا، وَبِالْإِسْلَامِ دِينًا، وَبِمُحَمَّدٍ ﷺ نَبِيًّا",
    translit: "Raditu billahi rabba, wa bil-islami dina, wa bi-Muhammadin ﷺ nabiyya.",
    meaning: "I am pleased with Allah as Lord, with Islam as religion, and with Muhammad ﷺ as Prophet.",
    about: "The narration says that whoever says it three times morning and evening, it is upon Allah to please him on the Day of Resurrection.",
    source: "Abu Dawud; at-Tirmidhi; Ahmad",
  },
  {
    id: "hayy",
    title: "O Ever-Living, set my affairs right",
    repeat: 1,
    arabic: "يَا حَيُّ يَا قَيُّومُ بِرَحْمَتِكَ أَسْتَغِيثُ، أَصْلِحْ لِي شَأْنِي كُلَّهُ، وَلَا تَكِلْنِي إِلَى نَفْسِي طَرْفَةَ عَيْنٍ",
    translit: "Ya hayyu ya qayyum, bi-rahmatika astaghith, aslih li sha'ni kullah, wa la takilni ila nafsi tarfata 'ayn.",
    meaning: "O Ever-Living, O Sustainer of all, by Your mercy I call for help. Set all my affairs right, and do not leave me to myself even for the blink of an eye.",
    about: "The Prophet ﷺ taught this to his daughter Fatimah, to say in the morning and the evening.",
    source: "al-Hakim; an-Nasa'i, 'Amal al-Yawm wal-Laylah",
  },
  {
    id: "rabbil",
    title: "The good of this day",
    repeat: 1,
    arabic: {
      morning:
        "أَصْبَحْنَا وَأَصْبَحَ الْمُلْكُ لِلَّهِ رَبِّ الْعَالَمِينَ، اللَّهُمَّ إِنِّي أَسْأَلُكَ خَيْرَ هَذَا الْيَوْمِ: فَتْحَهُ، وَنَصْرَهُ، وَنُورَهُ، وَبَرَكَتَهُ، وَهُدَاهُ، وَأَعُوذُ بِكَ مِنْ شَرِّ مَا فِيهِ وَشَرِّ مَا بَعْدَهُ",
      evening:
        "أَمْسَيْنَا وَأَمْسَى الْمُلْكُ لِلَّهِ رَبِّ الْعَالَمِينَ، اللَّهُمَّ إِنِّي أَسْأَلُكَ خَيْرَ هَذِهِ اللَّيْلَةِ: فَتْحَهَا، وَنَصْرَهَا، وَنُورَهَا، وَبَرَكَتَهَا، وَهُدَاهَا، وَأَعُوذُ بِكَ مِنْ شَرِّ مَا فِيهَا وَشَرِّ مَا بَعْدَهَا",
    },
    translit: {
      morning:
        "Asbahna wa asbahal-mulku lillahi rabbil-'alamin. Allahumma inni as'aluka khayra hadhal-yawm: fat-hahu, wa nasrahu, wa nurahu, wa barakatahu, wa hudah, wa a'udhu bika min sharri ma fihi wa sharri ma ba'dah.",
      evening:
        "Amsayna wa amsal-mulku lillahi rabbil-'alamin. Allahumma inni as'aluka khayra hadhihil-laylah: fat-haha, wa nasraha, wa nuraha, wa barakataha, wa hudaha, wa a'udhu bika min sharri ma fiha wa sharri ma ba'daha.",
    },
    meaning: {
      morning:
        "We have reached the morning, and the kingdom belongs to Allah, Lord of the worlds. O Allah, I ask You for the good of this day: its openings, its help, its light, its blessing and its guidance. I seek refuge in You from the evil in it and the evil after it.",
      evening:
        "We have reached the evening, and the kingdom belongs to Allah, Lord of the worlds. O Allah, I ask You for the good of this night: its openings, its help, its light, its blessing and its guidance. I seek refuge in You from the evil in it and the evil after it.",
    },
    about: "The Prophet ﷺ said: when one of you reaches the morning, let him say this, and in the evening likewise.",
    source: "Abu Dawud",
  },
  {
    id: "fitrah",
    title: "Upon the natural way of Islam",
    repeat: 1,
    arabic: {
      morning:
        "أَصْبَحْنَا عَلَى فِطْرَةِ الْإِسْلَامِ، وَعَلَى كَلِمَةِ الْإِخْلَاصِ، وَعَلَى دِينِ نَبِيِّنَا مُحَمَّدٍ ﷺ، وَعَلَى مِلَّةِ أَبِينَا إِبْرَاهِيمَ، حَنِيفًا مُسْلِمًا، وَمَا كَانَ مِنَ الْمُشْرِكِينَ",
      evening:
        "أَمْسَيْنَا عَلَى فِطْرَةِ الْإِسْلَامِ، وَعَلَى كَلِمَةِ الْإِخْلَاصِ، وَعَلَى دِينِ نَبِيِّنَا مُحَمَّدٍ ﷺ، وَعَلَى مِلَّةِ أَبِينَا إِبْرَاهِيمَ، حَنِيفًا مُسْلِمًا، وَمَا كَانَ مِنَ الْمُشْرِكِينَ",
    },
    translit: {
      morning: "Asbahna 'ala fitratil-islam, wa 'ala kalimatil-ikhlas, wa 'ala dini nabiyyina Muhammadin ﷺ, wa 'ala millati abina Ibrahim, hanifan musliman wa ma kana minal-mushrikin.",
      evening: "Amsayna 'ala fitratil-islam, wa 'ala kalimatil-ikhlas, wa 'ala dini nabiyyina Muhammadin ﷺ, wa 'ala millati abina Ibrahim, hanifan musliman wa ma kana minal-mushrikin.",
    },
    meaning:
      "We have reached the morning (or evening) upon the natural way of Islam, the word of sincere faith, the religion of our Prophet Muhammad ﷺ, and the way of our father Ibrahim, who was upright, a Muslim, and not of those who associate partners with Allah.",
    about: "The Prophet ﷺ would say this when morning and evening came.",
    source: "Ahmad",
  },
  {
    id: "subhan100",
    title: "Glory be to Allah and praise Him",
    repeat: 100,
    arabic: "سُبْحَانَ اللَّهِ وَبِحَمْدِهِ",
    translit: "Subhanallahi wa bi-hamdih.",
    meaning: "Glory be to Allah, and praise be to Him.",
    about: "Whoever says it a hundred times in the morning and evening, no one comes on the Day of Resurrection with anything better, except someone who said the same or more.",
    source: "Sahih Muslim",
  },
  {
    id: "tahlil10",
    title: "None has the right to worship but Allah",
    repeat: 10,
    arabic: "لَا إِلَهَ إِلَّا اللَّهُ وَحْدَهُ لَا شَرِيكَ لَهُ، لَهُ الْمُلْكُ وَلَهُ الْحَمْدُ، وَهُوَ عَلَى كُلِّ شَيْءٍ قَدِيرٌ",
    translit: "La ilaha illallahu wahdahu la sharika lah, lahul-mulku wa lahul-hamdu, wa huwa 'ala kulli shay'in qadir.",
    meaning: "There is no god but Allah alone, without partner. His is the kingdom and His the praise, and He has power over all things.",
    about: "Ten times, or once on a heavy day. Said a hundred times in a day, the Prophet ﷺ likened it to freeing ten slaves, with a hundred good deeds written and a hundred sins erased.",
    source: "al-Bukhari and Muslim (a hundred times); an-Nasa'i (ten)",
  },
  {
    id: "adada",
    title: "As many as His creation",
    only: "morning",
    repeat: 3,
    arabic: "سُبْحَانَ اللَّهِ وَبِحَمْدِهِ، عَدَدَ خَلْقِهِ، وَرِضَا نَفْسِهِ، وَزِنَةَ عَرْشِهِ، وَمِدَادَ كَلِمَاتِهِ",
    translit: "Subhanallahi wa bi-hamdihi, 'adada khalqihi, wa rida nafsihi, wa zinata 'arshihi, wa midada kalimatih.",
    meaning: "Glory be to Allah and praise be to Him, as many times as the number of His creation, as much as pleases Him, as heavy as His Throne, and as much as the ink of His words.",
    about: "The Prophet ﷺ told his wife Juwayriyah, who had spent the whole morning in remembrance, that these words said three times outweigh all she had said since dawn.",
    source: "Sahih Muslim",
  },
  {
    id: "ilm",
    title: "Beneficial knowledge",
    only: "morning",
    repeat: 1,
    arabic: "اللَّهُمَّ إِنِّي أَسْأَلُكَ عِلْمًا نَافِعًا، وَرِزْقًا طَيِّبًا، وَعَمَلًا مُتَقَبَّلًا",
    translit: "Allahumma inni as'aluka 'ilman nafi'a, wa rizqan tayyiba, wa 'amalan mutaqabbala.",
    meaning: "O Allah, I ask You for knowledge that benefits, provision that is good, and deeds that are accepted.",
    about: "Umm Salamah reported that the Prophet ﷺ said this after the Fajr prayer.",
    source: "Ibn Majah",
  },
  {
    id: "kalimat",
    title: "Refuge in Allah's perfect words",
    only: "evening",
    repeat: 3,
    arabic: "أَعُوذُ بِكَلِمَاتِ اللَّهِ التَّامَّاتِ مِنْ شَرِّ مَا خَلَقَ",
    translit: "A'udhu bi-kalimatillahit-tammati min sharri ma khalaq.",
    meaning: "I seek refuge in the perfect words of Allah from the evil of what He has created.",
    about: "A man came to the Prophet ﷺ having been stung by a scorpion in the night. He told him that had he said this in the evening, it would not have harmed him.",
    source: "Sahih Muslim",
  },
  {
    id: "istighfar",
    title: "Seeking forgiveness",
    repeat: 100,
    arabic: "أَسْتَغْفِرُ اللَّهَ وَأَتُوبُ إِلَيْهِ",
    translit: "Astaghfirullaha wa atubu ilayh.",
    meaning: "I seek Allah's forgiveness and turn to Him in repentance.",
    about: "The Prophet ﷺ said he sought Allah's forgiveness and repented to Him a hundred times a day.",
    source: "Sahih Muslim; al-Bukhari",
  },
  {
    id: "salawat",
    title: "Blessings on the Prophet ﷺ",
    repeat: 10,
    arabic: "اللَّهُمَّ صَلِّ وَسَلِّمْ عَلَى نَبِيِّنَا مُحَمَّدٍ",
    translit: "Allahumma salli wa sallim 'ala nabiyyina Muhammad.",
    meaning: "O Allah, send blessings and peace upon our Prophet Muhammad.",
    about: "The narration says that whoever sends blessings on him ten times in the morning and ten in the evening will have his intercession on the Day of Resurrection.",
    source: "at-Tabarani",
  },
];

export function adhkarFor(t: Time): Dhikr[] {
  return ADHKAR.filter((d) => !d.only || d.only === t);
}

export const ADHKAR_CREDIT = "Selection and order from Hisn al-Muslim by Sa'id ibn Wahf al-Qahtani. Quran text from Tanzil.";
