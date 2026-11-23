/**
 * ===========================================================================
 * config.js
 * ---------------------------------------------------------------------------
 * Çfarë bën: mban të gjitha konstantet e projektit në një vend të vetëm
 * (kohëzgjatjet, nivelet, gjuhët, çelësat e localStorage, kufijtë dhe
 * mesazhet që krijon JavaScript). Nëse duam të ndryshojmë p.sh. numrin
 * maksimal të testeve në historik, e ndryshojmë vetëm këtu.
 *
 * Çfarë eksporton: DURATIONS, LEVELS, LANGUAGES, STORAGE_KEYS, MAX_HISTORY,
 * CHARS_PER_WORD, DEFAULT_SETTINGS, THEMES, DEFAULT_THEME, TEXTS_URL,
 * TIMER_INTERVAL_MS, LIVE_WPM_MIN_SECONDS, TEXT_TARGET_WPM,
 * APPEND_THRESHOLD_CHARS, APPEND_CHUNK_CHARS, CARET_IDLE_MS,
 * MOST_MISSED_LIMIT, CHART_MAX_POINTS, PRACTICE_LEVEL, LEVEL_LABELS,
 * WEAK_KEY_LIMIT, WEAK_KEY_TABLE_LIMIT, WEAK_KEY_MIN_ATTEMPTS,
 * WEAK_KEY_MIN_ERRORS, PRACTICE_TOKENS_PER_KEY, KEYBOARD_LAYOUTS,
 * DEFAULT_LAYOUT, HEAT_THRESHOLDS, PROGRESS_SAMPLE_SIZE, GUIDE_CHAPTERS,
 * GUIDE_US_MAP, GUIDE_FINGERS, GUIDE_THUMB, GUIDE_CHUNK_SIZE, GUIDE_CHUNK_MS,
 * GUIDE_ADVANCE_MS, GUIDE_PASS_ACCURACY, BACKUP_APP, BACKUP_VERSION,
 * BACKUP_FILENAME, BACKUP_MAX_BYTES, MESSAGES, plural, findLabel.
 *
 * Kush e përdor: pothuajse të gjithë modulet (texts.js, timer.js, stats.js,
 * storage.js, ui.js, theme.js, chart.js, app.js) dhe faqet te js/pages/.
 * ===========================================================================
 */

/**
 * Kohëzgjatjet e lejuara të testit, në sekonda.
 * Object.freeze e bën listën të pandryshueshme, që asnjë modul të mos e prishë gabimisht.
 * @type {ReadonlyArray<number>}
 */
export const DURATIONS = Object.freeze([15, 30, 60, 120]);

/**
 * Nivelet e vështirësisë. "id" përputhet me çelësat te data/texts.json,
 * "label" është teksti shqip që shfaqet në faqe.
 * @type {ReadonlyArray<{id: string, label: string}>}
 */
export const LEVELS = Object.freeze([
  Object.freeze({ id: "easy", label: "E lehtë" }), // fjalë të shkurtra të rastësishme
  Object.freeze({ id: "medium", label: "Mesatare" }), // fjali të zakonshme
  Object.freeze({ id: "hard", label: "E vështirë" }), // fjali me numra dhe shenja pikësimi
]);

/**
 * "Niveli" që u jepet testeve të praktikës në historik. NUK është zgjedhje te
 * shiriti i cilësimeve: teksti i praktikës ndërtohet nga tastet e dobëta, jo nga një nivel.
 * Testet e praktikës nuk hyjnë te rekordet, sepse teksti i tyre nuk krahasohet drejt me nivelet.
 * @type {Readonly<{id: string, label: string}>}
 */
export const PRACTICE_LEVEL = Object.freeze({ id: "practice", label: "Praktikë" });

/**
 * Të gjitha emrat e niveleve që mund të shfaqen te rezultati dhe historiku
 * (tre nivelet e zakonshme plus praktika). Përdoret vetëm për të gjetur tekstin shqip.
 * @type {ReadonlyArray<{id: string, label: string}>}
 */
export const LEVEL_LABELS = Object.freeze([...LEVELS, PRACTICE_LEVEL]);

/**
 * Gjuhët e tekstit. "id" është kodi i gjuhës te data/texts.json.
 * @type {ReadonlyArray<{id: string, label: string}>}
 */
export const LANGUAGES = Object.freeze([
  Object.freeze({ id: "sq", label: "Shqip" }), // shqip
  Object.freeze({ id: "en", label: "English" }), // anglisht
]);

/**
 * Çelësat (emrat) me të cilët ruhen të dhënat në localStorage.
 * Parashtesa "typefast:" i ndan nga të dhënat e faqeve të tjera në të njëjtin server
 * (p.sh. projekte të tjera që hapen me Live Server te 127.0.0.1:5500).
 * @type {Readonly<{HISTORY: string, RECORDS: string, SETTINGS: string, THEME: string}>}
 */
export const STORAGE_KEYS = Object.freeze({
  HISTORY: "typefast:history", // lista e testeve
  RECORDS: "typefast:records", // rekordet për çdo kombinim
  SETTINGS: "typefast:settings", // cilësimet e fundit të testit
  THEME: "typefast:theme", // tema e zgjedhur
  KEYS: "typefast:keys", // për çdo tast: sa herë doli dhe sa herë u gabua (të gjitha testet)
  LAYOUT: "typefast:layout", // cila tastierë shfaqet te harta e tastierës (sq ose us)
  GUIDE: "typefast:guide", // id-të e mësimeve të kursit "Mëso bazat" që janë kryer
});

/**
 * Sa teste mbahen në historik. Testet më të vjetra fshihen kur kalohet ky numër.
 * @type {number}
 */
export const MAX_HISTORY = 200;

/**
 * Sa karaktere llogariten si një "fjalë" në formulën e WPM (standardi ndërkombëtar).
 * @type {number}
 */
export const CHARS_PER_WORD = 5;

/**
 * Cilësimet e parazgjedhura kur përdoruesi hap faqen për herë të parë.
 * lenient: false do të thotë kontroll i rreptë (e NUK pranohet për ë).
 * ghost: false do të thotë pa garë me rekordin (kursori gri nuk shfaqet).
 * @type {Readonly<{duration: number, level: string, lang: string, lenient: boolean, ghost: boolean}>}
 */
export const DEFAULT_SETTINGS = Object.freeze({
  duration: 30, // 30 sekonda
  level: "medium", // niveli mesatar
  lang: "sq", // shqip
  lenient: false, // kontroll i rreptë i ë dhe ç
  ghost: false, // gara me rekordin është e fikur
});

/**
 * Temat e lejuara dhe tema e parazgjedhur.
 * @type {ReadonlyArray<string>}
 */
export const THEMES = Object.freeze(["dark", "light"]);

/** @type {string} Tema që përdoret kur përdoruesi nuk ka zgjedhur asgjë. */
export const DEFAULT_THEME = "dark";

/**
 * Adresa e skedarit me tekstet. Është relative ndaj faqes HTML (index.html është në rrënjë).
 * @type {string}
 */
export const TEXTS_URL = "data/texts.json";

/**
 * Sa shpesh përditësohet ekrani gjatë testit (milisekonda).
 * Kjo NUK përdoret për të numëruar kohën, vetëm për të rifreskuar numrat.
 * @type {number}
 */
export const TIMER_INTERVAL_MS = 100;

/**
 * Para kësaj kohe (sekonda), WPM i drejtpërdrejtë tregon 0,
 * sepse me pak milisekonda formula jep numra të mëdhenj pa kuptim.
 * @type {number}
 */
export const LIVE_WPM_MIN_SECONDS = 1;

/**
 * Teksti fillestar gjenerohet aq i gjatë sa të mjaftojë për dikë që shkruan 150 WPM.
 * @type {number}
 */
export const TEXT_TARGET_WPM = 150;

/**
 * Kur përdoruesit i mbeten më pak se kaq karaktere deri në fund, shtohet tekst i ri.
 * @type {number}
 */
export const APPEND_THRESHOLD_CHARS = 30;

/**
 * Sa karaktere të paktën shtohen sa herë që teksti po mbaron.
 * @type {number}
 */
export const APPEND_CHUNK_CHARS = 200;

/**
 * Pas sa milisekondave pa shtypur asgjë kursori fillon të pulsojë sërish.
 * @type {number}
 */
export const CARET_IDLE_MS = 600;

/**
 * Sa karaktere të gabuara shfaqen te rezultati.
 * @type {number}
 */
export const MOST_MISSED_LIMIT = 5;

/**
 * Sa teste të fundit shfaq grafiku i përparimit.
 * @type {number}
 */
export const CHART_MAX_POINTS = 30;

/**
 * Sa taste të dobëta përdor praktika njëherësh (5 më të dobëtat).
 * @type {number}
 */
export const WEAK_KEY_LIMIT = 5;

/**
 * Sa taste shfaq tabela "Tastet e dobëta" te historiku.
 * @type {number}
 */
export const WEAK_KEY_TABLE_LIMIT = 10;

/**
 * Një tast renditet si "i dobët" vetëm pasi të ketë dalë të paktën kaq herë.
 * Pa këtë kufi, një tast që doli 1 herë dhe u gabua 1 herë do të kishte 100% gabim
 * dhe do të dilte i pari, edhe pse është thjesht fat i keq.
 * @type {number}
 */
export const WEAK_KEY_MIN_ATTEMPTS = 5;

/**
 * Një tast renditet si "i dobët" vetëm nëse është gabuar të paktën kaq herë.
 * @type {number}
 */
export const WEAK_KEY_MIN_ERRORS = 2;

/**
 * Për çdo tast të dobët, praktika zgjedh nga kaq fjalët ku ai tast zë pjesën më të madhe të shkronjave.
 * @type {number}
 */
export const PRACTICE_TOKENS_PER_KEY = 30;

/**
 * Tastierat që di të vizatojë harta e tastierës te historiku.
 * Çdo "rows" është një listë rreshtash; çdo rresht është një tekst ku çdo karakter është një tast
 * (vetëm karakteret që shkruhen PA Shift). Karakteret që s'janë në tastierën e zgjedhur
 * (p.sh. ? ! ose ë në tastierën amerikane) shfaqen veçmas te "Shenja të tjera".
 * @type {ReadonlyArray<{id: string, label: string, rows: ReadonlyArray<string>}>}
 */
export const KEYBOARD_LAYOUTS = Object.freeze([
  Object.freeze({ // tastiera e parë: shqipja
    id: "sq", // tastiera shqipe, ku Z dhe Y kanë ndërruar vend dhe ë, ç kanë tastet e tyre
    label: "Shqipe (QWERTZ)", // teksti i butonit
    rows: Object.freeze(["1234567890-", "qwertzuiopç", "asdfghjklë", "yxcvbnm,."]), // katër rreshtat
  }),
  Object.freeze({ // tastiera e dytë: amerikanja
    id: "us", // tastiera amerikane
    label: "Amerikane (QWERTY)", // teksti i butonit
    rows: Object.freeze(["1234567890-", "qwertyuiop", "asdfghjkl;'", "zxcvbnm,./"]), // katër rreshtat
  }),
]);

/** @type {string} Tastiera që shfaqet kur përdoruesi s'ka zgjedhur asnjë. */
export const DEFAULT_LAYOUT = "sq";

/**
 * Kufijtë e shkallës së gabimit për ngjyrat e hartës së tastierës.
 * 0 gabime = shkalla 0; nën 2% = shkalla 1; nën 5% = shkalla 2; nën 10% = shkalla 3; 10% e lart = shkalla 4.
 * @type {ReadonlyArray<number>}
 */
export const HEAT_THRESHOLDS = Object.freeze([0.02, 0.05, 0.1]);

/**
 * Sa teste krahasohen te "Përparimi": mesatarja e 10 të fundit kundrejt 10 të parave.
 * Me më pak se 20 teste, krahasohen gjysmat (p.sh. 3 të fundit me 3 të parat).
 * @type {number}
 */
export const PROGRESS_SAMPLE_SIZE = 10;

/**
 * Kursi "Mëso bazat": kapitujt dhe mësimet e udhëzuesit për fillestarët.
 * Çdo kapitull ka: id, titull, një hyrje (intro) dhe një listë mësimesh.
 * Çdo mësim ka:
 *   - id: emër i qëndrueshëm, p.sh. "1-3" (me të ruhet përparimi në localStorage)
 *   - title dhe text: titulli dhe shpjegimi që lexon përdoruesi
 *   - keys: tastet që shtypen me radhë, për tastierën shqipe (çdo karakter bëhet një katror)
 *   - keysUs (opsionale): tekst tjetër për tastierën amerikane, kur fjalët shqipe s'kanë kuptim aty
 *   - titleUs (opsionale): titull tjetër për tastierën amerikane, kur tasti ka shkronjë tjetër aty
 *   - onlySq (opsionale): mësimi shfaqet vetëm në tastierën shqipe (p.sh. Ç)
 * Kur mungon keysUs, guide.js e kthen tekstin shqip me GUIDE_US_MAP (i njëjti tast fizik).
 * @type {ReadonlyArray<{id: string, title: string, intro: string, lessons: ReadonlyArray<{id: string, title: string, titleUs?: string, text: string, keys: string, keysUs?: string, onlySq?: boolean}>}>}
 */
export const GUIDE_CHAPTERS = Object.freeze([
  Object.freeze({ // kapitulli 1
    id: "1", // numri i kapitullit
    title: "Rreshti bazë", // titulli i kapitullit
    intro: "Rreshti bazë është shtëpia e gishtave: çdo gisht nis prej këtu dhe kthehet këtu pas çdo tasti. Ulu drejt, mbaji kyçet pak lart pa i mbështetur dhe shiko ekranin, jo tastierën.", // hyrja që shfaqet te lista e kapitujve
    lessons: Object.freeze([ // mësimet e kapitullit, me radhë
      Object.freeze({ id: "1-1", title: "F dhe J", text: "Prek tastet F dhe J: kanë nga një vijë të vogël të ngritur, që t'i gjesh pa parë. Vendos gishtin tregues të majtë te F dhe të djathtin te J.", keys: "fj fj jf fj" }), // mësimi 1-1: F dhe J
      Object.freeze({ id: "1-2", title: "Gishtat tregues", text: "Përsërit F dhe J pa parë tastierën. Gishtat e tjerë pushojnë lehtë mbi tastet ngjitur, pa i shtypur.", keys: "fff jjj fjf jfj ffjj" }), // mësimi 1-2: Gishtat tregues
      Object.freeze({ id: "1-3", title: "D dhe K", text: "Ngjitur me F është D, ngjitur me J është K. I shtyp me gishtat e mesit; gishtat tregues mbeten mbi F dhe J.", keys: "ddd kkk dkd kdk fdf jkj" }), // mësimi 1-3: D dhe K
      Object.freeze({ id: "1-4", title: "S dhe L", text: "Një tast më tej: S me gishtin e unazës të majtë, L me gishtin e unazës të djathtë.", keys: "sss lll sls lsl dsd klk" }), // mësimi 1-4: S dhe L
      Object.freeze({ id: "1-5", title: "A dhe Ë", titleUs: "A dhe ;", text: "Tastet e skajeve: A me gishtin e vogël të majtë dhe Ë me gishtin e vogël të djathtë (në tastierën amerikane ky tast është pikëpresja).", keys: "aaa ëëë aëa ëaë sas lël" }), // mësimi 1-5: A dhe Ë
      Object.freeze({ id: "1-6", title: "G dhe H", text: "Gishtat tregues zgjaten një tast drejt mesit: nga F te G dhe nga J te H. Pas shtypjes kthehen menjëherë në vend.", keys: "fgf jhj ggg hhh fgh jhg" }), // mësimi 1-6: G dhe H
      Object.freeze({ id: "1-7", title: "Hapësira", text: "Hapësirën e shtyp me gishtin e madh, pa i ngritur gishtat e tjerë nga rreshti bazë.", keys: "a s d f g h j k l ë" }), // mësimi 1-7: Hapësira
      Object.freeze({ id: "1-8", title: "Fjalët e para", text: "Fjalë të vërteta vetëm me tastet e rreshtit bazë. Shko ngadalë dhe pa parë tastierën.", keys: "ka gjak flas djalë kafshë shkak halla", keysUs: "a sad lad has a glass flask" }), // mësimi 1-8: Fjalët e para
    ]),
  }),
  Object.freeze({ // kapitulli 2
    id: "2", // numri i kapitullit
    title: "Rreshti i sipërm", // titulli i kapitullit
    intro: "Për rreshtin e sipërm gishti zgjatet lart dhe pak majtas, shtyp tastin dhe kthehet menjëherë në rreshtin bazë. Lëviz vetëm gishtin, jo gjithë dorën.", // hyrja që shfaqet te lista e kapitujve
    lessons: Object.freeze([ // mësimet e kapitullit, me radhë
      Object.freeze({ id: "2-1", title: "E dhe I", text: "E është mbi D dhe I është mbi K. I shtypin gishtat e mesit.", keys: "ded kik eee iii dei kie ei ie" }), // mësimi 2-1: E dhe I
      Object.freeze({ id: "2-2", title: "R dhe U", text: "R është mbi F dhe U është mbi J. I shtypin gishtat tregues.", keys: "frf juj rrr uuu fru jur ru ur" }), // mësimi 2-2: R dhe U
      Object.freeze({ id: "2-3", title: "T dhe Z", titleUs: "T dhe Y", text: "T është lart djathtas nga F, Z lart majtas nga J (në tastierën amerikane ky tast është Y). Të dyja i shtypin gishtat tregues.", keys: "ftf jzj ttt zzz ftz jzt" }), // mësimi 2-3: T dhe Z
      Object.freeze({ id: "2-4", title: "W dhe O", text: "W është mbi S dhe O është mbi L. I shtypin gishtat e unazës.", keys: "sws lol www ooo swo low" }), // mësimi 2-4: W dhe O
      Object.freeze({ id: "2-5", title: "Q dhe P", text: "Q është mbi A dhe P mbi tastin e skajit të djathtë. I shtypin gishtat e vegjël.", keys: "aqa ëpë qqq ppp aqp ëpq" }), // mësimi 2-5: Q dhe P
      Object.freeze({ id: "2-6", title: "Ç", text: "Ç është në skajin e djathtë të rreshtit të sipërm, pas P. Gishti i vogël i djathtë zgjatet lart djathtas.", keys: "ëçë ççç çaj çdo çast", onlySq: true }), // mësimi 2-6: Ç
      Object.freeze({ id: "2-7", title: "Fjalë me dy rreshta", text: "Fjalë që përdorin rreshtin bazë dhe atë të sipërm. Pas çdo shkronje të sipërme, gishti kthehet poshtë.", keys: "ti je i ri ajo flet shqip ku je", keysUs: "we sit here quietly at the pool" }), // mësimi 2-7: Fjalë me dy rreshta
    ]),
  }),
  Object.freeze({ // kapitulli 3
    id: "3", // numri i kapitullit
    title: "Rreshti i poshtëm", // titulli i kapitullit
    intro: "Për rreshtin e poshtëm gishtat përkulen poshtë dhe pak djathtas. Ky rresht është më i vështiri, prandaj shko ngadalë: saktësia vjen para shpejtësisë.", // hyrja që shfaqet te lista e kapitujve
    lessons: Object.freeze([ // mësimet e kapitullit, me radhë
      Object.freeze({ id: "3-1", title: "V dhe M", text: "V është poshtë F, M është poshtë J. I shtypin gishtat tregues.", keys: "fvf jmj vvv mmm fvm jmv" }), // mësimi 3-1: V dhe M
      Object.freeze({ id: "3-2", title: "B dhe N", text: "B dhe N janë në mes të rreshtit të poshtëm. Gishtat tregues zgjaten poshtë dhe drejt mesit.", keys: "fbf jnj bbb nnn fbn jnb" }), // mësimi 3-2: B dhe N
      Object.freeze({ id: "3-3", title: "C dhe presja", text: "C është poshtë D, presja poshtë K. I shtypin gishtat e mesit.", keys: "dcd k,k ccc ,,, dc, k,c" }), // mësimi 3-3: C dhe presja
      Object.freeze({ id: "3-4", title: "X dhe pika", text: "X është poshtë S, pika poshtë L. I shtypin gishtat e unazës.", keys: "sxs l.l xxx ... sx. l.x" }), // mësimi 3-4: X dhe pika
      Object.freeze({ id: "3-5", title: "Y", titleUs: "Z", text: "Y është në skajin e majtë të rreshtit të poshtëm (në tastierën amerikane ky tast është Z). E shtyp gishti i vogël i majtë.", keys: "aya yyy aya yay" }), // mësimi 3-5: Y
      Object.freeze({ id: "3-6", title: "Fjalë me tre rreshta", text: "Tani të tre rreshtat bashkë. Mos shiko tastierën: nëse humbet, gjej sërish F dhe J me prekje.", keys: "nëna bën bukë vëllai im më ndihmon", keysUs: "my mom bakes bread and makes jam" }), // mësimi 3-6: Fjalë me tre rreshta
    ]),
  }),
  Object.freeze({ // kapitulli 4
    id: "4", // numri i kapitullit
    title: "Shkronjat e mëdha, shenjat dhe numrat", // titulli i kapitullit
    intro: "Shkronjën e madhe e shkruan duke mbajtur Shift me gishtin e vogël të dorës tjetër: për shkronjat e dorës së majtë Shift-in e djathtë, për ato të dorës së djathtë Shift-in e majtë.", // hyrja që shfaqet te lista e kapitujve
    lessons: Object.freeze([ // mësimet e kapitullit, me radhë
      Object.freeze({ id: "4-1", title: "Shkronja e madhe", text: "Emra që nisin me shkronjë të madhe. Mbaj Shift me dorën tjetër, shtyp shkronjën, pastaj lësho Shift.", keys: "Ana Dita Lala Jeta Kaja" }), // mësimi 4-1: Shkronja e madhe
      Object.freeze({ id: "4-2", title: "Presja dhe pika në fjali", text: "Pas presjes dhe pikës vjen një hapësirë. Fjalia nis me shkronjë të madhe.", keys: "Po, e di. Jo, nuk e di.", keysUs: "Yes, I know. No, I do not." }), // mësimi 4-2: Presja dhe pika në fjali
      Object.freeze({ id: "4-3", title: "Numrat", text: "Numrat janë në rreshtin më të lartë. Çdo gisht shtyp numrin mbi tastin e vet: 4 dhe 5 gishti tregues i majtë, 6 dhe 7 gishti tregues i djathtë.", keys: "12 34 56 78 90 2026 1912" }), // mësimi 4-3: Numrat
      Object.freeze({ id: "4-4", title: "Fjali me numra", text: "Një fjali me shkronja të mëdha, numra dhe pikë. Gishtat kthehen në rreshtin bazë pas çdo numri.", keys: "Më 28 nëntor 1912 Shqipëria shpalli pavarësinë.", keysUs: "In 1969 people walked on the moon." }), // mësimi 4-4: Fjali me numra
    ]),
  }),
  Object.freeze({ // kapitulli 5
    id: "5", // numri i kapitullit
    title: "Shkrimi i rrjedhshëm", // titulli i kapitullit
    intro: "Tani bashko gjithçka. Shkruaj me ritëm të njëtrajtshëm: më mirë ngadalë dhe pa gabime, se shpejt dhe me ndalesa.", // hyrja që shfaqet te lista e kapitujve
    lessons: Object.freeze([ // mësimet e kapitullit, me radhë
      Object.freeze({ id: "5-1", title: "Fjali e shkurtër", text: "Një fjali e plotë. Mos u ndal te gabimet e vogla: vazhdo me ritëm.", keys: "Sot mësoj të shkruaj pa parë tastierën.", keysUs: "Today I learn to type without looking." }), // mësimi 5-1: Fjali e shkurtër
      Object.freeze({ id: "5-2", title: "Fjali me presje", text: "Presja është një pushim i vogël. Shtype dhe vazhdo pa e humbur ritmin.", keys: "Kur gabon, ndalo, merr frymë dhe vazhdo.", keysUs: "When you make a mistake, stop and breathe." }), // mësimi 5-2: Fjali me presje
      Object.freeze({ id: "5-3", title: "Fjali e gjatë", text: "Fjalia e fundit e kursit. Pasi ta mbarosh, provo testin e lehtë në faqen kryesore.", keys: "Çdo ditë pak praktikë e bën shkrimin më të shpejtë dhe më të saktë.", keysUs: "A little practice every day makes typing faster and more accurate." }), // mësimi 5-3: Fjali e gjatë
    ]),
  }),
]);

/**
 * Si kthehet teksti i një mësimi për tastierën amerikane: çdo karakter zëvendësohet me
 * karakterin që ndodhet në të NJËJTIN tast fizik. Karakteret që s'janë këtu mbeten njësoj.
 * @type {Readonly<Object<string, string>>}
 */
export const GUIDE_US_MAP = Object.freeze({
  "z": "y", // tasti i "z" në tastierën shqipe është "y" në atë amerikane
  "y": "z", // tasti i "y" në tastierën shqipe është "z" në atë amerikane
  "Z": "Y", // tasti i "Z" në tastierën shqipe është "Y" në atë amerikane
  "Y": "Z", // tasti i "Y" në tastierën shqipe është "Z" në atë amerikane
  "ë": ";", // tasti i "ë" në tastierën shqipe është ";" në atë amerikane
});

/**
 * Emri i gishtit sipas kolonës së tastit në rresht (0 = tasti i parë majtas).
 * Në shkrimin me dhjetë gishta, çdo gisht ka kolonën e vet në të katër rreshtat;
 * kolonat 4 dhe 5 janë zgjatjet e gishtave tregues drejt mesit; nga kolona 9 e tutje
 * shtyp gjithmonë gishti i vogël i djathtë.
 * @type {ReadonlyArray<string>}
 */
export const GUIDE_FINGERS = Object.freeze([
  "gishti i vogël i majtë", // kolona 0
  "gishti i unazës i majtë", // kolona 1
  "gishti i mesit i majtë", // kolona 2
  "gishti tregues i majtë", // kolona 3
  "gishti tregues i majtë", // kolona 4
  "gishti tregues i djathtë", // kolona 5
  "gishti tregues i djathtë", // kolona 6
  "gishti i mesit i djathtë", // kolona 7
  "gishti i unazës i djathtë", // kolona 8
  "gishti i vogël i djathtë", // kolona 9
]);

/** @type {string} Gishti i hapësirës. */
export const GUIDE_THUMB = "gishti i madh, i cilësdo dorë";

/**
 * Sa katrorë shfaqen njëherësh. Mësimet më të gjata ndahen në pjesë me kaq karaktere,
 * që katrorët të nxënë në dritare pa e zgjatur atë.
 * @type {number}
 */
export const GUIDE_CHUNK_SIZE = 9;

/**
 * Sa milisekonda pret udhëzuesi pasi mbaron një pjesë, para se të shfaqë pjesën tjetër.
 * @type {number}
 */
export const GUIDE_CHUNK_MS = 350;

/**
 * Sa milisekonda pret udhëzuesi pasi mbaron një mësim, para se të kalojë te tjetri
 * (që përdoruesi të shohë animacionin e tastit të fundit).
 * @type {number}
 */
export const GUIDE_ADVANCE_MS = 700;

/**
 * Saktësia minimale (në përqindje) për të kaluar provën e një kapitulli.
 * Kush e kalon, e kapërcen kapitullin: të gjitha mësimet e tij shënohen të kryera.
 * @type {number}
 */
export const GUIDE_PASS_ACCURACY = 90;

/**
 * Shenja që shkruhet në çdo skedar eksporti. Importi pranon vetëm skedarë me këtë shenjë,
 * që të mos ngatërrohet me një skedar JSON tjetër.
 * @type {string}
 */
export const BACKUP_APP = "TypeFast";

/**
 * Versioni i formatit të skedarit të eksportit. Nëse formati ndryshon një ditë,
 * rritet ky numër dhe importi i njeh skedarët e vjetër.
 * @type {number}
 */
export const BACKUP_VERSION = 1;

/** @type {string} Emri i skedarit që shkarkohet. */
export const BACKUP_FILENAME = "typefast-historiku.json";

/**
 * Madhësia maksimale e skedarit të importit: 1 MB. Një eksport me 200 teste është rreth 100 KB,
 * pra një skedar shumë më i madh s'është eksport i TypeFast dhe s'ia vlen të lexohet.
 * @type {number}
 */
export const BACKUP_MAX_BYTES = 1000000;

/**
 * Mesazhet në shqip që krijon JavaScript (tekstet e tjera janë te HTML).
 * Funksionet brenda marrin numra realë dhe kthejnë fjalinë e plotë.
 */
export const MESSAGES = Object.freeze({
  loading: "Duke ngarkuar tekstet...", // gjatë leximit të data/texts.json
  capsLock: "Caps Lock është aktiv", // paralajmërimi mbi kutinë e tekstit
  textsError: "Tekstet e testit nuk u ngarkuan. Kontrollo që skedari data/texts.json ekziston dhe që faqja është hapur me Live Server, pastaj rifresko faqen.", // kur fetch dështon
  textsInvalid: "Skedari data/texts.json nuk ka strukturën e duhur.", // kur JSON nuk ka formën e pritur
  space: "Hapësira", // si shfaqet karakteri hapësirë te lista e gabimeve
  themeToLight: "Kalo në temën e çelët", // aria-label kur tema aktuale është e errët
  themeToDark: "Kalo në temën e errët", // aria-label kur tema aktuale është e çelët
  chartUnavailable: "Grafiku nuk mund të shfaqet, sepse skedari assets/libs/chart.umd.min.js nuk u ngarkua.", // kur Chart.js mungon
  noRecords: "Ende nuk ka rekord. Një rekord kërkon të paktën 1 WPM.", // tabela e rekordeve bosh
  practiceNoData: "Ende s'ka të dhëna të mjaftueshme. Mbaro një test dhe do të shohim ku gabon.", // butoni i praktikës i çaktivizuar
  noWeakKeys: "Ende s'ka asnjë tast të dobët. Një tast shfaqet këtu pasi të ketë dalë të paktën 5 herë dhe të jetë gabuar të paktën 2 herë.", // tabela e tasteve bosh

  /**
   * Shënimi poshtë butonit të praktikës, me tastet reale më të dobëta.
   * @param {string} keys - tastet, p.sh. "j · ë · q"
   * @returns {string} fjalia
   */
  practiceHint: (keys) => `Tastet e tua më të dobëta: ${keys}`,

  /**
   * Kur asnjë nga tastet e dobëta nuk gjendet në tekstet e gjuhës së zgjedhur (p.sh. ë në anglisht).
   * @param {string} keys - tastet
   * @param {string} language - emri i gjuhës
   * @returns {string} fjalia
   */
  practiceNoMatch: (keys, language) => `Tastet e tua më të dobëta (${keys}) nuk gjenden në tekstet në ${language}. Zgjidh gjuhën tjetër për t'i praktikuar.`,

  ghostNoRecord: "Ende s'ka rekord për këtë kombinim. Mbaro një test dhe gara fillon.", // çelësi i garës pa rekord
  ghostPractice: "Gara nuk punon në praktikë, sepse praktika s'ka rekord.", // çelësi i garës gjatë praktikës
  ghostOff: "Kursori gri lëviz me shpejtësinë e rekordit tënd.", // çelësi i garës i fikur
  heatNoData: "pak të dhëna", // tast që ka dalë më pak se 5 herë
  summaryNoProgress: "Duhen të paktën 2 teste (pa praktikën) për të krahasuar.", // karta e përparimit pa të dhëna

  guideEndTitle: "E mbarove kursin", // titulli kur mbaron kapitulli i fundit
  guideEndText: "Kjo është gjithë teknika: gishtat nisen nga rreshti bazë dhe kthehen aty pas çdo tasti. Në fillim rëndësi ka saktësia; shpejtësia vjen vetë me praktikë. Provoje tani në një test të lehtë.", // teksti kur mbaron kursi
  guideChapterEndText: "I kalove të gjitha mësimet e këtij kapitulli. Vazhdo me kapitullin tjetër, ose bëj një test për ta provuar atë që mësove.", // teksti kur mbaron një kapitull
  guideCaseHint: "Kujdes shkronjën e madhe dhe të vogël: kontrollo Shift dhe Caps Lock.", // kur shtypet shkronja e duhur, por me madhësi tjetër
  guideStart: "Fillo mësimin e parë", // butoni kryesor i faqes kur s'është kryer asnjë mësim
  guideContinue: "Vazhdo mësimin e radhës", // butoni kryesor kur kursi është nisur
  guideCheckpointText: "Shkruaj tekstin e mësimit të fundit të kapitullit. Me të paktën 90% saktësi, i gjithë kapitulli shënohet si i kryer dhe hapet kapitulli tjetër.", // shpjegimi i provës
  guideCheckpointPassTitle: "E kalove provën", // titulli kur kalohet prova
  guideCheckpointFailTitle: "Edhe pak", // titulli kur prova s'kalohet

  /**
   * Titulli i provës së një kapitulli.
   * @param {number} number - numri i kapitullit
   * @returns {string} teksti
   */
  guideCheckpointTitle: (number) => `Prova e kapitullit ${number}`,

  /**
   * Numëruesi gjatë provës.
   * @param {number} chapter - numri i kapitullit
   * @param {number} part - pjesa aktuale
   * @param {number} parts - sa pjesë ka prova
   * @returns {string} teksti
   */
  guideCheckpointCount: (chapter, part, parts) => `Kapitulli ${chapter} \u00B7 Prova \u00B7 Pjesa ${part} nga ${parts}`,

  /**
   * Teksti kur kalohet prova.
   * @param {number} accuracy - saktësia në përqindje
   * @returns {string} fjalia
   */
  guideCheckpointPass: (accuracy) => `Saktësia: ${accuracy}%. I gjithë kapitulli u shënua si i kryer dhe u hap kapitulli tjetër.`,

  /**
   * Teksti kur prova s'kalohet.
   * @param {number} accuracy - saktësia në përqindje
   * @returns {string} fjalia
   */
  guideCheckpointFail: (accuracy) => `Saktësia: ${accuracy}%. Duhen të paktën 90%. Provo përsëri, ose bëj mësimet e kapitullit me radhë.`,

  /**
   * Emri i një mësimi në rrugë për lexuesit e ekranit, me gjendjen e tij.
   * @param {string} code - numri, p.sh. "1.3"
   * @param {string} title - titulli
   * @param {"done"|"current"|"open"|"locked"} state - gjendja
   * @returns {string} p.sh. "Mësimi 1.3, D dhe K: i kryer"
   */
  guideNodeLabel: (code, title, state) => `Mësimi ${code}, ${title}: ${{ done: "i kryer", current: "mësimi i radhës", open: "i hapur", locked: "i kyçur" }[state]}`,

  /**
   * Vështirësia e kapitullit, për lexuesit e ekranit.
   * @param {number} level - vështirësia
   * @param {number} max - vështirësia më e lartë
   * @returns {string} teksti
   */
  guideDifficulty: (level, max) => `Vështirësia ${level} nga ${max}`,

  /**
   * Përparimi i gjithë kursit.
   * @param {number} done - mësime të kryera
   * @param {number} total - mësime gjithsej
   * @returns {string} teksti
   */
  guideCourseProgress: (done, total) => `${done} nga ${total} mësime të kryera`,

  /**
   * Përparimi i një kapitulli, te karta e tij.
   * @param {number} done - mësime të kryera në kapitull
   * @param {number} total - mësime në kapitull
   * @returns {string} teksti
   */
  guideChapterProgress: (done, total) => `${done} nga ${total} mësime`,

  /**
   * Titulli i një kapitulli me numrin e tij.
   * @param {string} number - numri, p.sh. "2"
   * @param {string} title - titulli
   * @returns {string} p.sh. "Kapitulli 2: Rreshti i sipërm"
   */
  guideChapterTitle: (number, title) => `Kapitulli ${number}: ${title}`,

  /**
   * Titulli kur mbaron një kapitull.
   * @param {string} number - numri i kapitullit
   * @returns {string} teksti
   */
  guideChapterDone: (number) => `Kapitulli ${number} u krye`,

  /**
   * Numëruesi gjatë një mësimi. Pjesa shtohet vetëm kur mësimi ka më shumë se një pjesë.
   * @param {string} chapter - numri i kapitullit
   * @param {number} lesson - numri i mësimit në kapitull (nga 1)
   * @param {number} total - mësime në kapitull
   * @param {number} part - pjesa aktuale (nga 1)
   * @param {number} parts - sa pjesë ka mësimi
   * @returns {string} p.sh. "Kapitulli 1 · Mësimi 3 nga 8 · Pjesa 2 nga 3"
   */
  guideCount: (chapter, lesson, total, part, parts) => `Kapitulli ${chapter} \u00B7 Mësimi ${lesson} nga ${total}${parts > 1 ? ` \u00B7 Pjesa ${part} nga ${parts}` : ""}`,

  /**
   * Fjalia për një shkronjë të madhe: gishti i shkronjës dhe Shift-i i dorës tjetër.
   * @param {string} keyName - shkronja, p.sh. "A"
   * @param {string} finger - gishti i shkronjës
   * @param {string} shift - cili Shift, p.sh. "Shift-in e djathtë me gishtin e vogël të djathtë"
   * @returns {string} fjalia
   */
  guideFingerShift: (keyName, finger, shift) => `Tasti ${keyName}: ${finger}, duke mbajtur ${shift}.`,

  /**
   * Fjalia që tregon me cilin gisht shtypet tasti aktual.
   * @param {string} keyName - emri i tastit, p.sh. "F" ose "Hapësira"
   * @param {string} finger - gishti, p.sh. "gishti tregues i majtë"
   * @returns {string} fjalia
   */
  guideFinger: (keyName, finger) => `Tasti ${keyName}: ${finger}.`,

  backupTooBig: "Skedari është shumë i madh (mbi 1 MB) për të qenë eksport i TypeFast. Historiku nuk u prek.", // importi: skedar i madh
  backupReadError: "Skedari nuk u lexua dot. Provo përsëri ose zgjidh një skedar tjetër. Historiku nuk u prek.", // importi: leximi dështoi
  backupInvalidJson: "Skedari nuk është JSON i vlefshëm (mund të jetë i prishur ose i ndryshuar me dorë). Historiku nuk u prek.", // importi: JSON i prishur
  backupWrongApp: "Ky skedar nuk është eksport i TypeFast. Zgjidh skedarin typefast-historiku.json. Historiku nuk u prek.", // importi: shenja mungon
  backupWrongVersion: "Ky skedar është krijuar nga një version tjetër i TypeFast dhe nuk mund të lexohet. Historiku nuk u prek.", // importi: version i panjohur
  backupBadStructure: "Skedarit i mungojnë pjesë të detyrueshme (testet, rekordet ose statistikat e tasteve). Historiku nuk u prek.", // importi: struktura e gabuar
  backupBadSettings: "Cilësimet në skedar nuk janë në formën e duhur. Historiku nuk u prek.", // importi: cilësimet e gabuara
  backupSaveError: "Të dhënat nuk u ruajtën, sepse shfletuesi nuk lejon ruajtjen (ose kujtesa është plot). Historiku i mëparshëm u rikthye.", // importi: ruajtja dështoi
  backupCancelled: "Importi u anulua. Historiku nuk u prek.", // importi: përdoruesi tha "Anulo"
  backupExportEmpty: "Ende s'ka teste për të eksportuar.", // eksporti: historik bosh

  /**
   * Gabimi kur një test në skedar ka të dhëna të pavlefshme.
   * @param {number} number - numri rendor i testit në skedar (nga 1)
   * @returns {string} fjalia
   */
  backupBadEntry: (number) => `Testi nr. ${number} në skedar ka të dhëna të pavlefshme. Historiku nuk u prek.`,

  /**
   * Gabimi kur një rekord në skedar është i pavlefshëm.
   * @param {string} key - çelësi i rekordit, p.sh. "sq-medium-30"
   * @returns {string} fjalia
   */
  backupBadRecord: (key) => `Rekordi "${key}" në skedar ka të dhëna të pavlefshme. Historiku nuk u prek.`,

  /**
   * Gabimi kur statistikat e një tasti janë të pavlefshme.
   * @param {string} key - tasti
   * @returns {string} fjalia
   */
  backupBadKey: (key) => `Statistikat e tastit "${key}" në skedar janë të pavlefshme. Historiku nuk u prek.`,

  /**
   * Teksti i dritares së konfirmimit të importit, me numrat realë.
   * @param {object} info - numrat
   * @param {number} info.tests - testet në skedar (pas shkurtimit në 200)
   * @param {number} info.records - rekordet në skedar
   * @param {number} info.keys - tastet me statistika
   * @param {string} info.date - data e eksportit, e formatuar
   * @param {number} info.current - testet aktuale në këtë shfletues
   * @param {number} info.dropped - sa teste të vjetra hiqen sepse kalojnë kufirin 200
   * @returns {string} teksti
   */
  backupConfirm: ({ tests, records, keys, date, current, dropped }) => `Skedari (eksportuar më ${date}) ka ${plural(tests, "test", "teste")}, ${plural(records, "rekord", "rekorde")} dhe statistikat e ${plural(keys, "tasti", "tasteve")}.${dropped > 0 ? ` ${dropped === 1 ? "Testi më i vjetër nuk merret" : `${dropped} testet më të vjetra nuk merren`}, sepse ruhen deri në ${MAX_HISTORY}.` : ""} Historiku aktual (${plural(current, "test", "teste")}) do të zëvendësohet plotësisht.`,

  /**
   * Mesazhi pas një importi të suksesshëm.
   * @param {number} tests - testet e importuara
   * @returns {string} fjalia
   */
  backupImported: (tests) => `Historiku u importua: ${plural(tests, "test", "teste")}.`,

  /**
   * Mesazhi pas eksportit.
   * @param {number} tests - testet e eksportuara
   * @returns {string} fjalia
   */
  backupExported: (tests) => `U shkarkua ${BACKUP_FILENAME} me ${plural(tests, "test", "teste")}.`,

  /**
   * Numër ditësh me fjalë, p.sh. "3 ditë" (në shqip njëjës dhe shumës janë njësoj).
   * @param {number} count - numri i ditëve
   * @returns {string} teksti
   */
  days: (count) => `${count} ditë`,

  /**
   * Shënimi i kartës "Teste gjithsej".
   * @param {number} chars - të gjitha shtypjet në të gjitha testet
   * @returns {string} fjalia
   */
  summaryChars: (chars) => `${chars} karaktere të shtypura gjithsej.`,

  /**
   * Shënimi i kartës "Ditë rresht".
   * @param {number} longest - seria më e gjatë
   * @returns {string} fjalia
   */
  summaryLongest: (longest) => `Seria më e gjatë: ${longest} ditë.`,

  /**
   * Shënimi i garës kur ka rekord.
   * @param {number} wpm - rekordi për këtë kombinim
   * @returns {string} fjalia
   */
  ghostHint: (wpm) => `Kursori gri lëviz me rekordin tënd: ${wpm} WPM.`,

  /**
   * Përmbledhja poshtë grafikut të shpejtësisë.
   * @param {number} consistency - qëndrueshmëria në përqindje
   * @param {number} peak - shpejtësia më e lartë e çastit
   * @param {number} peakSecond - në cilën sekondë
   * @returns {string} fjalia
   */
  speedSummary: (consistency, peak, peakSecond) => `Qëndrueshmëria: ${consistency}%. Shpejtësia më e lartë e çastit: ${peak} WPM, në sekondën ${peakSecond}.`,

  /**
   * Përshkrimi i grafikut për lexuesit e ekranit (canvas nuk lexohet vetë).
   * @param {number} seconds - sa sekonda ka grafiku
   * @param {number} errorSeconds - në sa sekonda pati gabime
   * @returns {string} fjalia
   */
  speedAria: (seconds, errorSeconds) => `Grafiku i shpejtësisë për ${seconds} sekonda. Pati gabime në ${errorSeconds} sekonda.`,

  /**
   * Teksti i një tasti te harta, kur kalon miun mbi të.
   * @param {string} key - tasti
   * @param {number} errors - gabimet
   * @param {number} attempts - herë që doli
   * @param {string} rate - shkalla e formatuar, p.sh. "12,5"
   * @returns {string} fjalia
   */
  heatTitle: (key, errors, attempts, rate) => `${key}: ${errors} gabime nga ${attempts} herë (${rate}%)`,

  /**
   * Karta e përparimit: shpjegimi i dy mesatareve.
   * @param {number} count - sa teste ka çdo grup
   * @param {number} lastAvg - mesatarja e të fundit
   * @param {number} firstAvg - mesatarja e të parave
   * @returns {string} fjalia
   */
  summaryProgress: (count, lastAvg, firstAvg) => `Mesatarja e ${count} testeve të fundit (${lastAvg} WPM) kundrejt ${count} të parave të ruajtura (${firstAvg} WPM), pa praktikën.`,

  /**
   * Fjalia që lexon lexuesi i ekranit kur mbaron testi.
   * @param {number} wpm - shpejtësia
   * @param {string} accuracy - saktësia e formatuar, p.sh. "93,8"
   * @param {number} errors - numri i gabimeve
   * @returns {string} fjalia e plotë
   */
  announceResult: (wpm, accuracy, errors) => `Testi mbaroi. ${wpm} fjalë në minutë, saktësia ${accuracy} përqind, ${errors} gabime.`,

  /**
   * Përmbledhja poshtë grafikut.
   * @param {number} count - sa teste po shfaqen
   * @returns {string} fjalia
   */
  chartSummary: (count) => (count === 1 ? "Po shfaqet 1 test." : `Po shfaqen ${count} testet e fundit.`),

  /**
   * Fjalia mbi tabelën e plotë të historikut.
   * @param {number} count - numri i testeve të ruajtura
   * @returns {string} fjalia
   */
  historyCount: (count) => (count === 1 ? "1 test i ruajtur, më i riu sipër." : `${count} teste të ruajtura, më i riu sipër. Ruhen deri në ${MAX_HISTORY} testet e fundit.`),
});

/**
 * Numri me fjalën në njëjës ose shumës: 1 test, 2 teste.
 * Përdoret nga mesazhet më lart (funksionet e tyre thirren më vonë, pra ky funksion ekziston atëherë).
 * @param {number} count - numri
 * @param {string} one - fjala për 1, p.sh. "test"
 * @param {string} many - fjala për shumë, p.sh. "teste"
 * @returns {string} p.sh. "1 test" ose "5 teste"
 */
export function plural(count, one, many) {
  // Vetëm numri 1 merr njëjësin
  return `${count} ${count === 1 ? one : many}`;
}

/**
 * Gjen tekstin shqip (label) për një id, p.sh. "medium" kthen "Mesatare".
 * Përdoret nga rezultati dhe nga tabelat e historikut.
 * @param {ReadonlyArray<{id: string, label: string}>} list - LEVELS ose LANGUAGES
 * @param {string} id - id-ja që kërkojmë
 * @returns {string} label-i, ose vetë id-ja nëse nuk gjendet
 */
export function findLabel(list, id) {
  // find kthen elementin e parë që ka këtë id, ose undefined
  const item = list.find((entry) => entry.id === id);
  // Nëse u gjet, kthejmë tekstin shqip; përndryshe kthejmë id-në që të mos shfaqet "undefined"
  return item ? item.label : id;
}
