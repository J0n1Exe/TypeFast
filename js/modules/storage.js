/**
 * ===========================================================================
 * storage.js
 * ---------------------------------------------------------------------------
 * Çfarë bën: mbështjell localStorage (kujtesa e përhershme e shfletuesit).
 * Çdo lexim dhe shkrim është brenda try/catch: nëse kujtesa është plot,
 * e bllokuar (p.sh. modaliteti privat në disa shfletues) ose të dhënat janë
 * të prishura, faqja vazhdon të punojë pa u rrëzuar.
 * Ruan historikun, rekordet, cilësimet dhe temën.
 *
 * Çfarë eksporton: klasën StorageService.
 * Kush e përdor: app.js, theme.js dhe faqet te js/pages/.
 * ===========================================================================
 */

// Importojmë çelësat, kufirin e historikut dhe vlerat e lejuara për kontroll
import {
  STORAGE_KEYS, // çelësat e localStorage
  MAX_HISTORY, // sa teste mbahen (200)
  DEFAULT_SETTINGS, // cilësimet e parazgjedhura
  DURATIONS, // kohëzgjatjet e lejuara
  LEVELS, // nivelet e lejuara
  LANGUAGES, // gjuhët e lejuara
  THEMES, // temat e lejuara
  DEFAULT_THEME, // tema e parazgjedhur
} from "../config.js"; // skedari nga vijnë të gjitha

/**
 * Shërbimi i ruajtjes së të dhënave.
 */
export class StorageService {
  /**
   * Krijon shërbimin dhe gjen localStorage nëse lejohet.
   */
  constructor() {
    // Vetëm leximi i window.localStorage mund të hedhë gabim kur cookies janë të bllokuara
    this.store = StorageService.getStore();
  }

  /**
   * Gjen localStorage në mënyrë të sigurt.
   * @returns {Storage|null} localStorage ose null nëse nuk lejohet
   */
  static getStore() {
    // try: disa shfletues hedhin SecurityError kur preket localStorage
    try {
      // E marrim objektin
      const store = window.localStorage;
      // Provë e vogël: shkruajmë dhe fshijmë një vlerë për të parë nëse punon
      store.setItem("typefast:test", "1");
      // Fshijmë provën
      store.removeItem("typefast:test");
      // Punon: e kthejmë
      return store;
    } catch {
      // Nuk lejohet: punojmë pa ruajtje
      return null;
    }
  }

  /**
   * Lexon një vlerë JSON. Kthen vlerën rezervë nëse mungon ose është e prishur.
   * @param {string} key - çelësi
   * @param {any} fallback - vlera që kthehet kur s'ka të dhëna të vlefshme
   * @returns {any} vlera e lexuar ose fallback
   */
  readJSON(key, fallback) {
    // Pa localStorage kthejmë direkt vlerën rezervë
    if (!this.store) {
      return fallback; // kthejmë këtë vlerë dhe dalim nga funksioni
    }
    // try: JSON.parse hedh gabim nëse teksti i ruajtur është i prishur
    try {
      // getItem kthen tekstin ose null nëse çelësi s'ekziston
      const raw = this.store.getItem(key);
      // Nëse s'ka tekst, vlera rezervë; përndryshe e kthejmë tekstin në objekt
      return raw === null ? fallback : JSON.parse(raw);
    } catch {
      // Të dhëna të prishura: vlera rezervë
      return fallback;
    }
  }

  /**
   * Shkruan një vlerë si JSON.
   * @param {string} key - çelësi
   * @param {any} value - vlera
   * @returns {boolean} true nëse u ruajt, false nëse dështoi
   */
  writeJSON(key, value) {
    // Pa localStorage nuk mund të ruajmë
    if (!this.store) {
      return false; // kthejmë këtë vlerë dhe dalim nga funksioni
    }
    // try: setItem hedh QuotaExceededError kur kujtesa është plot
    try {
      // JSON.stringify e kthen objektin në tekst, sepse localStorage ruan vetëm tekst
      this.store.setItem(key, JSON.stringify(value));
      // U ruajt
      return true;
    } catch {
      // Dështoi, por faqja vazhdon
      return false;
    }
  }

  /**
   * Fshin një çelës.
   * @param {string} key - çelësi
   * @returns {boolean} true nëse u fshi
   */
  remove(key) {
    // Pa localStorage s'ka çfarë fshijmë
    if (!this.store) {
      return false; // kthejmë këtë vlerë dhe dalim nga funksioni
    }
    // try: për siguri, edhe removeItem mund të hedhë gabim në raste të rralla
    try {
      // Fshijmë çelësin
      this.store.removeItem(key);
      // U fshi
      return true;
    } catch {
      // Dështoi
      return false;
    }
  }

  // ---------------- HISTORIKU ----------------

  /**
   * Kthen listën e testeve, më i riu i pari.
   * @returns {object[]} historiku
   */
  getHistory() {
    // Lexojmë listën; rezerva është varg bosh
    const history = this.readJSON(STORAGE_KEYS.HISTORY, []);
    // Nëse dikush ka ruajtur diçka që s'është varg, e injorojmë
    if (!Array.isArray(history)) {
      return []; // kthejmë këtë vlerë dhe dalim nga funksioni
    }
    // Mbajmë vetëm elementët që kanë fushat kryesore, që faqja të mos prishet nga të dhëna të çuditshme
    return history.filter((entry) => entry && typeof entry.wpm === "number" && typeof entry.dateISO === "string");
  }

  /**
   * Ruan një rezultat të ri në krye të historikut dhe mban vetëm MAX_HISTORY më të rinjtë.
   * @param {{lang: string, level: string, duration: number, wpm: number, accuracy: number, errors: number, correctChars: number, totalChars: number, mostMissed: object[]}} result - rezultati
   * @returns {{entry: object, saved: boolean}} elementi i plotë dhe nëse u ruajt
   */
  addResult(result) {
    // Ndërtojmë elementin me fushat e kërkuara, pa asgjë shtesë
    const entry = {
      id: StorageService.createId(), // identifikues unik
      dateISO: new Date().toISOString(), // data dhe ora në formatin standard ISO
      lang: result.lang, // gjuha
      level: result.level, // niveli
      duration: result.duration, // kohëzgjatja në sekonda
      wpm: result.wpm, // shpejtësia
      accuracy: result.accuracy, // saktësia
      errors: result.errors, // gabimet
      correctChars: result.correctChars, // karaktere të sakta
      totalChars: result.totalChars, // të gjitha shtypjet
      mostMissed: result.mostMissed, // karakteret më të gabuara
    };
    // Elementi i ri shkon i pari, pastaj historiku ekzistues
    const history = [entry, ...this.getHistory()];
    // slice mban vetëm 200 të parët (më të rinjtë)
    const trimmed = history.slice(0, MAX_HISTORY);
    // Ruajmë dhe mbajmë mend nëse u ruajt
    const saved = this.writeJSON(STORAGE_KEYS.HISTORY, trimmed);
    // Kthejmë elementin dhe gjendjen e ruajtjes
    return { entry, saved };
  }

  /**
   * Fshin gjithë historikun dhe rekordet (rekordet vijnë nga historiku).
   * @returns {void}
   */
  clearHistory() {
    // Fshijmë listën e testeve
    this.remove(STORAGE_KEYS.HISTORY);
    // Fshijmë rekordet
    this.remove(STORAGE_KEYS.RECORDS);
  }

  // ---------------- REKORDET ----------------

  /**
   * Çelësi i rekordit për një kombinim, p.sh. "sq-medium-30".
   * @param {string} lang - gjuha
   * @param {string} level - niveli
   * @param {number} duration - kohëzgjatja
   * @returns {string} çelësi
   */
  static recordKey(lang, level, duration) {
    // Template string bashkon të tri vlerat me vizë të zakonshme
    return `${lang}-${level}-${duration}`;
  }

  /**
   * Kthen të gjitha rekordet si objekt: çelësi -> rekordi.
   * @returns {Object<string, object>} rekordet
   */
  getRecords() {
    // Lexojmë objektin; rezerva është objekt bosh
    const records = this.readJSON(STORAGE_KEYS.RECORDS, {});
    // Duhet të jetë objekt i zakonshëm, jo varg dhe jo null
    return records && typeof records === "object" && !Array.isArray(records) ? records : {};
  }

  /**
   * A është ky rezultat rekord i ri për kombinimin e vet?
   * Duhet të paktën 1 WPM, që një test bosh të mos quhet rekord.
   * @param {{lang: string, level: string, duration: number, wpm: number}} result - rezultati
   * @returns {boolean} true nëse e kalon rekordin ekzistues (ose s'ka rekord)
   */
  isNewRecord(result) {
    // 0 WPM nuk është arritje
    if (result.wpm <= 0) {
      return false; // kthejmë këtë vlerë dhe dalim nga funksioni
    }
    // Gjejmë rekordin ekzistues për këtë kombinim
    const current = this.getRecords()[StorageService.recordKey(result.lang, result.level, result.duration)];
    // Rekord i ri nëse s'ka rekord ose nëse WPM është më i madh
    return !current || result.wpm > current.wpm;
  }

  /**
   * Ruan rezultatin si rekord për kombinimin e vet.
   * @param {{dateISO: string, lang: string, level: string, duration: number, wpm: number, accuracy: number}} result - rezultati i ruajtur
   * @returns {boolean} true nëse u ruajt
   */
  updateRecord(result) {
    // Lexojmë rekordet ekzistuese
    const records = this.getRecords();
    // Vendosim ose zëvendësojmë rekordin për këtë kombinim
    records[StorageService.recordKey(result.lang, result.level, result.duration)] = {
      lang: result.lang, // gjuha
      level: result.level, // niveli
      duration: result.duration, // kohëzgjatja
      wpm: result.wpm, // WPM më i mirë
      accuracy: result.accuracy, // saktësia e atij testi
      dateISO: result.dateISO, // kur u arrit
    };
    // Ruajmë objektin e përditësuar
    return this.writeJSON(STORAGE_KEYS.RECORDS, records);
  }

  // ---------------- CILËSIMET ----------------

  /**
   * Lexon cilësimet dhe kontrollon çdo vlerë. Vlerat e pavlefshme zëvendësohen me parazgjedhjet.
   * @returns {{duration: number, level: string, lang: string, lenient: boolean}} cilësimet
   */
  getSettings() {
    // Lexojmë; rezerva është objekt bosh
    const saved = this.readJSON(STORAGE_KEYS.SETTINGS, {}) || {};
    // Kthejmë një objekt të ri ku çdo fushë kontrollohet veçmas
    return {
      // Kohëzgjatja duhet të jetë një nga 15/30/60/120
      duration: DURATIONS.includes(saved.duration) ? saved.duration : DEFAULT_SETTINGS.duration,
      // Niveli duhet të jetë një nga id-të te LEVELS
      level: LEVELS.some((item) => item.id === saved.level) ? saved.level : DEFAULT_SETTINGS.level,
      // Gjuha duhet të jetë një nga id-të te LANGUAGES
      lang: LANGUAGES.some((item) => item.id === saved.lang) ? saved.lang : DEFAULT_SETTINGS.lang,
      // lenient duhet të jetë true/false
      lenient: typeof saved.lenient === "boolean" ? saved.lenient : DEFAULT_SETTINGS.lenient,
    };
  }

  /**
   * Ruan cilësimet.
   * @param {{duration: number, level: string, lang: string, lenient: boolean}} settings - cilësimet
   * @returns {boolean} true nëse u ruajtën
   */
  saveSettings(settings) {
    // Ruajmë objektin si JSON
    return this.writeJSON(STORAGE_KEYS.SETTINGS, settings);
  }

  // ---------------- TEMA ----------------

  /**
   * Lexon temën e ruajtur.
   * @returns {string} "dark" ose "light"
   */
  getTheme() {
    // Tema ruhet si JSON string, p.sh. "\"light\""
    const theme = this.readJSON(STORAGE_KEYS.THEME, DEFAULT_THEME);
    // Pranojmë vetëm temat e njohura
    return THEMES.includes(theme) ? theme : DEFAULT_THEME;
  }

  /**
   * Ruan temën.
   * @param {string} theme - "dark" ose "light"
   * @returns {boolean} true nëse u ruajt
   */
  saveTheme(theme) {
    // Ruajmë si JSON
    return this.writeJSON(STORAGE_KEYS.THEME, theme);
  }

  // ---------------- NDIHMËS ----------------

  /**
   * Krijon një id unike. Nuk përdorim crypto.randomUUID(), sepse ai mungon
   * kur faqja hapet nga tableti me adresë IP (http://192.168...), që s'është "kontekst i sigurt".
   * @returns {string} id, p.sh. "lq2x9k-4f7a1c"
   */
  static createId() {
    // Koha aktuale në bazën 36 (shifra + shkronja) plus 6 karaktere të rastësishme
    return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
  }
}
