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
 * DEFAULT_LAYOUT, HEAT_THRESHOLDS, PROGRESS_SAMPLE_SIZE, MESSAGES, findLabel.
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
 * Mesazhet në shqip që krijon JavaScript (tekstet e tjera janë te HTML).
 * Funksionet brenda marrin numra realë dhe kthejnë fjalinë e plotë.
 */
export const MESSAGES = Object.freeze({
  loading: "Duke ngarkuar tekstet...", // gjatë leximit të data/texts.json
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
