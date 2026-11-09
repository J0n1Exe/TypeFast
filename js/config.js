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
 * MOST_MISSED_LIMIT, CHART_MAX_POINTS, MESSAGES, findLabel.
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
 * @type {Readonly<{duration: number, level: string, lang: string, lenient: boolean}>}
 */
export const DEFAULT_SETTINGS = Object.freeze({
  duration: 30, // 30 sekonda
  level: "medium", // niveli mesatar
  lang: "sq", // shqip
  lenient: false, // kontroll i rreptë i ë dhe ç
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
