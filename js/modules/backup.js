/**
 * ===========================================================================
 * backup.js
 * ---------------------------------------------------------------------------
 * Çfarë bën: eksporti dhe importi i të dhënave të TypeFast.
 *   - Eksporti: mbledh testet, rekordet, statistikat e tasteve dhe cilësimet
 *     në një objekt, e kthen në tekst JSON dhe e shkarkon si skedar
 *     typefast-historiku.json (Blob + URL.createObjectURL + <a download>).
 *   - Importi: lexon skedarin e zgjedhur (File API), e kthen nga JSON në objekt
 *     dhe e KONTROLLON të gjithin para se të prekë diçka. Nëse një pjesë e
 *     vetme është e gabuar, kthen një gabim të qartë në shqip dhe historiku
 *     ekzistues mbetet i paprekur. Vetëm kur gjithçka është në rregull, faqja
 *     pyet përdoruesin dhe pastaj të dhënat zëvendësohen (StorageService.replaceAll).
 *
 * Forma e skedarit (version 1):
 * {
 *   "app": "TypeFast",            <- shenja: vetëm këta skedarë pranohen
 *   "version": 1,                 <- versioni i formatit
 *   "exportedAt": "2026-11-23T...", <- kur u eksportua
 *   "history": [ ...testet... ],  <- si te localStorage "typefast:history"
 *   "records": { ...rekordet... },<- si te "typefast:records"
 *   "keys": { ...tastet... },     <- si te "typefast:keys"
 *   "settings": { ...cilësimet... } <- si te "typefast:settings"
 * }
 *
 * Çfarë eksporton: klasën BackupService.
 * Kush e përdor: js/pages/history-page.js.
 * ===========================================================================
 */

// Konstantet e kontrollit, kufijtë dhe mesazhet
import {
  BACKUP_APP, // shenja "TypeFast"
  BACKUP_VERSION, // versioni i formatit
  BACKUP_FILENAME, // emri i skedarit
  BACKUP_MAX_BYTES, // madhësia maksimale e importit
  MAX_HISTORY, // sa teste ruhen
  DURATIONS, // kohëzgjatjet e lejuara
  WORD_COUNTS, // numrat e lejuar të fjalëve
  lengthKey, // çelësi i gjatësisë: "30" ose "w25"
  LANGUAGES, // gjuhët e lejuara
  LEVELS, // nivelet e rekordeve
  LEVEL_LABELS, // nivelet e testeve (përfshirë praktikën)
  MESSAGES, // mesazhet në shqip
} from "../config.js"; // skedari nga vijnë të gjitha
// Për çelësin e rekordeve, id-të e reja dhe kontrollin e cilësimeve
import { StorageService } from "./storage.js";

/**
 * Eksporti dhe importi i historikut.
 */
export class BackupService {
  /**
   * Krijon shërbimin.
   * @param {StorageService} storage - shërbimi i ruajtjes
   */
  constructor(storage) {
    // Ruajmë shërbimin e ruajtjes
    this.storage = storage;
  }

  // ---------------- EKSPORTI ----------------

  /**
   * Mbledh të gjitha të dhënat në objektin e eksportit.
   * @returns {{app: string, version: number, exportedAt: string, history: object[], records: object, keys: object, settings: object}} objekti
   */
  createExport() {
    // Kthejmë objektin me shenjën, versionin dhe të dhënat aktuale
    return {
      app: BACKUP_APP, // shenja
      version: BACKUP_VERSION, // versioni
      exportedAt: new Date().toISOString(), // tani, në formatin standard ISO
      history: this.storage.getHistory(), // testet
      records: this.storage.getRecords(), // rekordet
      keys: this.storage.getKeyStats(), // statistikat e tasteve
      settings: this.storage.getSettings(), // cilësimet
    };
  }

  /**
   * Shkarkon skedarin typefast-historiku.json.
   * Si funksionon shkarkimi pa server:
   *   1. teksti JSON futet në një Blob (një "skedar" në kujtesën e shfletuesit)
   *   2. URL.createObjectURL i jep Blob-it një adresë të përkohshme
   *   3. krijohet një lidhje <a> me atë adresë dhe atributin download, dhe klikohet nga kodi
   *   4. adresa e përkohshme lirohet me URL.revokeObjectURL
   * @returns {number} sa teste u eksportuan
   */
  download() {
    // Objekti i eksportit
    const data = this.createExport();
    // Teksti JSON; null, 2 = me dhëmbëzim 2 hapësira, që skedari të lexohet edhe me sy
    const text = JSON.stringify(data, null, 2);
    // Blob: përmbajtja e skedarit, me llojin JSON
    const blob = new Blob([text], { type: "application/json" });
    // Adresa e përkohshme e Blob-it
    const url = URL.createObjectURL(blob);
    // Lidhja që shkarkon
    const link = document.createElement("a");
    // Adresa
    link.href = url;
    // download: shfletuesi e ruan si skedar me këtë emër në vend që ta hapë
    link.download = BACKUP_FILENAME;
    // E shtojmë në faqe (disa shfletues klikojnë vetëm lidhje që janë në faqe)
    document.body.append(link);
    // Klikimi nga kodi nis shkarkimin
    link.click();
    // E heqim lidhjen, s'na duhet më
    link.remove();
    // Lirojmë adresën pas një çasti, kur shkarkimi ka nisur
    setTimeout(() => URL.revokeObjectURL(url), 0);
    // Kthejmë numrin e testeve për mesazhin
    return data.history.length;
  }

  // ---------------- IMPORTI ----------------

  /**
   * Lexon dhe kontrollon një skedar të zgjedhur nga përdoruesi. Nuk ndryshon asgjë.
   * @param {File} file - skedari nga <input type="file">
   * @returns {Promise<{ok: true, data: object, dropped: number} | {ok: false, error: string}>} rezultati
   */
  async readFile(file) {
    // Kontrolli i parë, para leximit: madhësia
    if (file.size > BACKUP_MAX_BYTES) {
      return { ok: false, error: MESSAGES.backupTooBig }; // shumë i madh
    }
    // Teksti i skedarit
    let text;
    // try: leximi mund të dështojë (p.sh. skedari u fshi ndërkohë)
    try {
      // file.text() lexon gjithë skedarin si tekst (File API); kthen Promise
      text = await file.text();
    } catch {
      // Leximi dështoi
      return { ok: false, error: MESSAGES.backupReadError };
    }
    // Objekti i lexuar
    let json;
    // try: JSON.parse hedh gabim kur teksti s'është JSON i vlefshëm
    try {
      // Teksti kthehet në objekt JavaScript
      json = JSON.parse(text);
    } catch {
      // JSON i prishur
      return { ok: false, error: MESSAGES.backupInvalidJson };
    }
    // Kontrolli i plotë i përmbajtjes
    return BackupService.validate(json);
  }

  /**
   * KONTROLLI I SKEDARIT (i pastër): shenja, versioni, struktura dhe çdo test, rekord dhe tast.
   * Rregulli: ose kalon gjithçka, ose asgjë. Gabimi i parë ndalon kontrollin dhe kthehet si mesazh.
   * @param {any} json - objekti i lexuar nga skedari
   * @returns {{ok: true, data: {history: object[], records: object, keys: object, settings: object|null, exportedAt: string}, dropped: number} | {ok: false, error: string}} rezultati
   */
  static validate(json) {
    // Duhet të jetë objekt me shenjën e TypeFast
    if (!BackupService.isObject(json) || json.app !== BACKUP_APP) {
      return { ok: false, error: MESSAGES.backupWrongApp }; // skedar tjetër
    }
    // Versioni duhet të jetë ai që njohim
    if (json.version !== BACKUP_VERSION) {
      return { ok: false, error: MESSAGES.backupWrongVersion }; // version i panjohur
    }
    // Pjesët e detyrueshme: testet si varg, rekordet dhe tastet si objekte
    if (!Array.isArray(json.history) || !BackupService.isObject(json.records) || !BackupService.isObject(json.keys)) {
      return { ok: false, error: MESSAGES.backupBadStructure }; // mungon diçka
    }
    // Testet e kontrolluara
    const history = [];
    // Kontrollojmë çdo test me radhë
    for (let index = 0; index < json.history.length; index += 1) {
      // Testi i pastruar, ose null nëse është i pavlefshëm
      const entry = BackupService.cleanEntry(json.history[index]);
      // Një test i gabuar e ndalon gjithë importin
      if (!entry) {
        return { ok: false, error: MESSAGES.backupBadEntry(index + 1) }; // numri rendor nga 1
      }
      // I shtojmë te lista e mirë
      history.push(entry);
    }
    // Rekordet e kontrolluara
    const records = {};
    // Kontrollojmë çdo rekord
    for (const [key, value] of Object.entries(json.records)) {
      // Rekordi i pastruar, ose null
      const record = BackupService.cleanRecord(key, value);
      // Një rekord i gabuar e ndalon importin
      if (!record) {
        return { ok: false, error: MESSAGES.backupBadRecord(key) }; // emri i rekordit
      }
      // E ruajmë
      records[key] = record;
    }
    // Statistikat e kontrolluara të tasteve
    const keys = {};
    // Kontrollojmë çdo tast
    for (const [key, value] of Object.entries(json.keys)) {
      // Numrat e pastruar, ose null
      const stats = BackupService.cleanKeyStats(key, value);
      // Një tast i gabuar e ndalon importin
      if (!stats) {
        return { ok: false, error: MESSAGES.backupBadKey(key) }; // tasti
      }
      // E ruajmë
      keys[key] = stats;
    }
    // Cilësimet janë opsionale; kur ekzistojnë, duhet të jenë objekt
    if (json.settings !== undefined && !BackupService.isObject(json.settings)) {
      return { ok: false, error: MESSAGES.backupBadSettings }; // formë e gabuar
    }
    // Cilësimet kalojnë nga i njëjti kontroll si në localStorage; mungesa = mos i ndrysho
    const settings = json.settings === undefined ? null : StorageService.sanitizeSettings(json.settings);
    // Renditja: më i riu i pari, si në historik (Date.parse kthen milisekondat e datës)
    history.sort((a, b) => Date.parse(b.dateISO) - Date.parse(a.dateISO));
    // Sa teste të vjetra kalojnë kufirin 200
    const dropped = Math.max(0, history.length - MAX_HISTORY);
    // Data e eksportit; nëse mungon ose është e gabuar, përdorim tekst bosh
    const exportedAt = typeof json.exportedAt === "string" && BackupService.isDate(json.exportedAt) ? json.exportedAt : "";
    // Gjithçka në rregull
    return {
      ok: true, // kontrolli kaloi
      data: { history: history.slice(0, MAX_HISTORY), records, keys, settings, exportedAt }, // të dhënat e pastra
      dropped, // sa teste hiqen
    };
  }

  /**
   * Kontrollon dhe pastron një test të vetëm (e pastër). Fushat e panjohura hiqen.
   * @param {any} entry - testi nga skedari
   * @returns {object|null} testi i pastër, ose null nëse një fushë është e pavlefshme
   */
  static cleanEntry(entry) {
    // Duhet të jetë objekt
    if (!BackupService.isObject(entry)) {
      return null; // s'është test
    }
    // Lista e kushteve; testi pranohet vetëm nëse të gjitha janë true
    const valid = [
      typeof entry.dateISO === "string" && BackupService.isDate(entry.dateISO), // data e vlefshme
      LANGUAGES.some((item) => item.id === entry.lang), // gjuhë e njohur
      LEVEL_LABELS.some((item) => item.id === entry.level), // nivel i njohur (edhe praktika)
      BackupService.isValidLength(entry), // test me kohë të lejuar, ose me fjalë dhe kohë pozitive
      Number.isFinite(entry.wpm) && entry.wpm >= 0, // WPM numër jo negativ
      Number.isFinite(entry.accuracy) && entry.accuracy >= 0 && entry.accuracy <= 100, // saktësia 0 deri 100
      BackupService.isCount(entry.errors), // gabimet: numër i plotë jo negativ
      BackupService.isCount(entry.correctChars), // karakteret e sakta
      BackupService.isCount(entry.totalChars), // të gjitha shtypjet
      entry.mostMissed === undefined || BackupService.isMissedList(entry.mostMissed), // lista e gabimeve (opsionale)
    ].every(Boolean); // every(Boolean): true vetëm nëse çdo kusht i listës është true
    // Nëse një kusht dështon, testi është i pavlefshëm
    if (!valid) {
      return null; // i pavlefshëm
    }
    // Ndërtojmë testin e pastër, vetëm me fushat që njohim
    return {
      id: typeof entry.id === "string" && entry.id ? entry.id : StorageService.createId(), // id e vjetër, ose e re
      dateISO: entry.dateISO, // data
      lang: entry.lang, // gjuha
      level: entry.level, // niveli
      ...(entry.mode === "words" ? { mode: "words", words: entry.words } : {}), // fushat e testit me fjalë
      duration: entry.duration, // kohëzgjatja
      wpm: entry.wpm, // shpejtësia
      accuracy: entry.accuracy, // saktësia
      errors: entry.errors, // gabimet
      correctChars: entry.correctChars, // karakteret e sakta
      totalChars: entry.totalChars, // shtypjet
      mostMissed: entry.mostMissed || [], // lista e gabimeve, ose bosh
    };
  }

  /**
   * Kontrollon një rekord (e pastër). Çelësi duhet të përputhet me gjuhën, nivelin dhe kohën e tij.
   * @param {string} key - çelësi, p.sh. "sq-medium-30"
   * @param {any} record - rekordi
   * @returns {object|null} rekordi i pastër, ose null
   */
  static cleanRecord(key, record) {
    // Duhet të jetë objekt
    if (!BackupService.isObject(record)) {
      return null; // s'është rekord
    }
    // Kushtet e rekordit
    const valid = [
      LANGUAGES.some((item) => item.id === record.lang), // gjuhë e njohur
      LEVELS.some((item) => item.id === record.level), // vetëm nivelet e zakonshme (praktika s'ka rekord)
      BackupService.isValidLength(record), // gjatësi e lejuar
      key === StorageService.recordKey(record.lang, record.level, lengthKey(record)), // çelësi përputhet
      Number.isFinite(record.wpm) && record.wpm > 0, // rekordi ka të paktën 1 WPM
      Number.isFinite(record.accuracy) && record.accuracy >= 0 && record.accuracy <= 100, // saktësia
      typeof record.dateISO === "string" && BackupService.isDate(record.dateISO), // data
    ].every(Boolean); // every(Boolean): true vetëm nëse çdo kusht i listës është true
    // Rekordi i pastër vetëm me fushat që njohim, ose null
    return valid
      ? { lang: record.lang, level: record.level, ...(record.mode === "words" ? { mode: "words", words: record.words } : {}), duration: record.duration, wpm: record.wpm, accuracy: record.accuracy, dateISO: record.dateISO } // i pastër
      : null; // i pavlefshëm
  }

  /**
   * Kontrollon statistikat e një tasti (e pastër).
   * @param {string} key - tasti
   * @param {any} value - { attempts, errors }
   * @returns {{attempts: number, errors: number}|null} numrat, ose null
   */
  static cleanKeyStats(key, value) {
    // Tasti duhet të jetë një karakter i vetëm (Array.from numëron ë si një karakter)
    if (Array.from(key).length !== 1 || !BackupService.isObject(value)) {
      return null; // tast i pavlefshëm
    }
    // Numra të plotë jo negativë, dhe gabimet jo më shumë se herët që doli tasti
    const valid = BackupService.isCount(value.attempts) && BackupService.isCount(value.errors) && value.errors <= value.attempts;
    // Numrat e pastër, ose null
    return valid ? { attempts: value.attempts, errors: value.errors } : null;
  }

  // ---------------- NDIHMËS TË VEGJËL ----------------

  /**
   * A është vlera një objekt i zakonshëm (jo null dhe jo varg)?
   * @param {any} value - vlera
   * @returns {boolean} true nëse po
   */
  static isObject(value) {
    // typeof null është "object", prandaj e përjashtojmë veçmas; edhe vargjet janë "object"
    return value !== null && typeof value === "object" && !Array.isArray(value);
  }

  /**
   * A është gjatësia e një testi ose rekordi e vlefshme?
   * - Me kohë (pa fushën mode, ose mode "time"): kohëzgjatja duhet të jetë 15, 30, 60 ose 120.
   * - Me fjalë (mode "words"): numri i fjalëve 10, 25 ose 50, dhe koha që u desh një numër pozitiv.
   * @param {object} item - testi ose rekordi
   * @returns {boolean} true nëse po
   */
  static isValidLength(item) {
    // Test me fjalë
    if (item.mode === "words") {
      return WORD_COUNTS.includes(item.words) && Number.isFinite(item.duration) && item.duration > 0; // fjalë të lejuara dhe kohë pozitive
    }
    // Përndryshe duhet të jetë test me kohë (ose test i vjetër pa fushën mode)
    return (item.mode === undefined || item.mode === "time") && DURATIONS.includes(item.duration);
  }

  /**
   * A është vlera një numër i plotë jo negativ (0, 1, 2, ...)?
   * @param {any} value - vlera
   * @returns {boolean} true nëse po
   */
  static isCount(value) {
    // Number.isInteger kthen false për tekste, NaN dhe numra me presje
    return Number.isInteger(value) && value >= 0;
  }

  /**
   * A është teksti një datë që JavaScript e kupton?
   * @param {string} text - teksti
   * @returns {boolean} true nëse po
   */
  static isDate(text) {
    // Date.parse kthen NaN për tekste që s'janë data
    return !Number.isNaN(Date.parse(text));
  }

  /**
   * A është vlera një listë e vlefshme e karaktereve më të gabuara: [{ char, count }, ...]?
   * @param {any} list - vlera
   * @returns {boolean} true nëse po
   */
  static isMissedList(list) {
    // Duhet të jetë varg, dhe çdo element një karakter me numër pozitiv
    return Array.isArray(list) && list.every((item) => BackupService.isObject(item) && typeof item.char === "string" && Array.from(item.char).length === 1 && Number.isInteger(item.count) && item.count > 0);
  }

  /**
   * Ruan të dhënat e kontrolluara (zëvendësim i plotë, me rikthim nëse dështon).
   * @param {{history: object[], records: object, keys: object, settings: object|null}} data - nga validate()
   * @returns {boolean} true nëse u ruajt gjithçka
   */
  apply(data) {
    // StorageService bën zëvendësimin "të gjitha ose asnjë"
    return this.storage.replaceAll(data);
  }
}
