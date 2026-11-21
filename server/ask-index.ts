/*
  A vetted index of well known places, given to the AI so it reaches for
  them first. References only, no text. Built from src/quran/themes.ts and a
  list of the main stories, battles and rulings (server/mkindex in the
  session scratchpad). The AI may still cite other places it is sure of.
*/
export const ASK_INDEX = `Anxiety, worry: 94, 13:28, 65:2-3, 2:286
Grief, loss: 2:155-157, 93, 12
Gratitude: 55, 14:7
Feeling distant from Allah: 2:186, 39:53, 50:16
Before sleep: 67, 2:255, 2:285-286, 112, 113, 114
Friday: 18
Patience, hardship: 94:5-6, 2:153, 3:200
Guilt, wanting to repent: 39:53, 4:110, 25:70
Ayat al-Kursi: 2:255
The last two ayahs of Al-Baqarah: 2:285-286
The three Quls: 112, 113, 114
The Opening: 1
The Light verse: 24:35
The verse of debt: 2:282
The first revelation: 96:1-5
The names of Allah: 59:22-24, 7:180, 17:110
Duas that begin Rabbana: 2:201, 2:286, 3:8, 7:23, 14:40-41, 25:74
The dua of Yunus: 21:87
Musa's dua for an open heart: 20:25-28
Fear: 20:46, 3:173, 3:175
Sadness: 9:40, 3:139, 93
Anger: 3:134, 42:37, 41:34
Hope: 12:87, 39:53, 15:56, 65:7
The mercy of Allah: 39:53, 7:156, 6:54
Trusting Allah: 65:3, 3:159, 9:51
Money and provision: 65:2-3, 11:6, 51:22
Illness and healing: 26:80, 17:82, 10:57
Being wronged: 14:42, 26:227, 4:148
Self-worth: 95:4, 17:70, 49:13
Temptation: 12:33, 12:53, 7:200-201
Envy and the evil eye: 113, 4:54
Protection: 113, 114, 2:255, 16:98
Doubt: 2:2, 10:57, 41:53
Making a decision: 3:159, 2:216, 65:3
Studying and exams: 20:114, 20:25-28, 96:1-5
Travelling: 43:13-14, 11:41
A new beginning: 1, 94, 65:2-3
Parents: 17:23-24, 31:14, 46:15
Marriage and spouses: 30:21, 25:74, 2:187
Hoping to marry: 28:24, 25:74, 24:32
Children: 25:74, 18:46, 64:15
Hoping for a child: 21:89-90, 3:38, 19:2-6
Family and kinship: 4:1, 4:36, 47:22
Friends and company: 18:28, 43:67, 25:27-29
Orphans and the needy: 93:9-10, 107, 76:8
Neighbours and kindness: 4:36, 2:83
Prayer: 2:45, 29:45, 20:14, 23:1-2
Night prayer: 73:1-6, 17:79, 32:16
Making dua: 2:186, 40:60, 7:55
Remembering Allah: 13:28, 2:152, 33:41-42
Fasting and Ramadan: 2:183-185
The Night of Decree: 97, 44:3-4
Hajj and Umrah: 22:27, 2:196, 3:97
Charity: 2:261-262, 2:274, 3:92
Purity and wudu: 5:6, 2:222
The Quran itself: 17:9, 54:17, 38:29, 47:24
Reciting slowly: 73:4, 25:32
The oneness of Allah: 112, 2:255, 2:163
Allah is near: 2:186, 50:16, 57:4
The love of Allah: 3:31, 2:165, 5:54, 2:222
Death and the next life: 3:185, 29:57, 21:35, 62:8
The Day of Judgement: 99, 101, 81, 82
Paradise: 55:46-78, 56:10-40, 76:5-22
The Fire: 56:41-56, 67:6-11
Angels: 35:1, 66:6, 2:285
The Jinn: 72, 55:15
Creation and signs: 3:190-191, 2:164, 30:22
Time: 103
Small deeds: 99:7-8, 4:40
Why we are tested: 2:155, 29:2-3, 67:2
This worldly life: 57:20, 18:45-46, 102
Humility and arrogance: 31:18-19, 25:63, 17:37
Honesty: 33:70, 9:119
Justice: 4:135, 5:8, 16:90
Forgiving others: 24:22, 42:40, 7:199
Speech, gossip and mockery: 49:11-12, 33:70
Brotherhood and unity: 49:10, 3:103
Peace: 8:61, 25:63, 10:25
Good character: 68:4, 33:21, 41:34
Purifying the soul: 91:7-10, 87:14-15
Modesty: 24:30-31, 33:59
Work and honest earning: 62:10, 83:1-3, 17:35
Debt: 2:280, 2:282
Food and drink: 2:168, 5:88, 5:90
Seeking knowledge: 20:114, 58:11, 39:9
Success: 23:1-11, 91:9-10, 3:185
Guidance: 1, 93:7, 6:125
The purpose of life: 51:56, 67:2, 23:115
The story of Yusuf: 12
The story of Musa: 28, 20:9-98
The story of Ibrahim: 2:124-131, 14:35-41, 37:99-111
Maryam: 19:16-34, 3:42-47
Isa: 19:30-33, 3:45-49
The story of Nuh: 71, 11:25-49
The people of the cave: 18:9-26
Stories of the prophets: 12, 18, 19, 28, 21
The battle of Badr: 8, 3:123
The Prophet Muhammad: 33:21, 21:107, 68:4, 48:29
Battle of Badr: 3:123-127, 8:5-19, 8:41-48, 8:67-71
Battle of Uhud: 3:121-175
Battle of the Trench (Ahzab): 33:9-27
Battle of Hunayn: 9:25-27
Expedition of Tabuk, and the three who stayed behind: 9:38-59, 9:81-96, 9:117-118
Treaty of Hudaybiyyah and the pledge under the tree: 48:1-29 (48:10, 48:18-19, 48:24-27)
The slander against Aisha (al-Ifk): 24:11-26
The Hijrah, the Prophet and Abu Bakr in the cave: 9:40
The companions, Muhajirun and Ansar: 9:100, 59:8-10, 48:29, 8:72-75, 57:10
The Night Journey and the Ascension: 17:1, 53:1-18
Abu Lahab: 111
Zayd and the adopted son ruling: 33:4-5, 33:36-40
The Prophet's wives: 33:28-34, 33:50-53, 66:1-5
Yusuf: 12
Musa and Pharaoh: 28:3-43, 20:9-79, 7:103-137, 26:10-68, 10:75-92, 40:23-46, 79:15-26
Musa and Khidr: 18:60-82
Dhul-Qarnayn: 18:83-98
The people of the cave: 18:9-26
Maryam and the birth of Isa: 19:16-34, 3:42-47
Ibrahim breaks the idols: 21:51-71, 6:74-83, 37:83-98, 19:41-50
Ibrahim and the sacrifice of his son: 37:99-113
Nuh and the flood: 11:25-49, 71, 23:23-30, 54:9-16
Yunus and the whale: 37:139-148, 21:87-88, 68:48-50
Ayyub's illness and patience: 21:83-84, 38:41-44
Sulayman and the Queen of Sheba: 27:20-44
Sulayman and the ant: 27:17-19
Luqman's advice to his son: 31:12-19
The army of the elephant: 105
Qarun: 28:76-82
Talut and Jalut, Dawud: 2:246-251
The people of the ditch: 85:4-10
Adam and Iblis: 2:30-39, 7:11-27, 20:115-123, 38:71-85
The two sons of Adam: 5:27-32
The people of Lut: 11:77-83, 15:57-77, 26:160-175
Salih and the she-camel (Thamud): 7:73-79, 11:61-68, 26:141-159, 91:11-15
Hud and Ad: 7:65-72, 11:50-60, 46:21-26
Shuayb and Madyan: 7:85-93, 11:84-95
Inheritance shares: 4:7-14, 4:176
Wudu and tayammum: 5:6, 4:43
Change of the qibla: 2:142-150
Alcohol and gambling: 5:90-91, 2:219
Riba (interest): 2:275-281, 3:130
Hijab and modesty: 24:30-31, 33:59
Fasting: 2:183-187
Divorce: 2:226-237, 65
Writing down debts: 2:282-283
Ayat al-Kursi: 2:255`;
