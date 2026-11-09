/**
 * ===========================================================================
 * stats.js
 * ---------------------------------------------------------------------------
 * Çfarë bën: regjistron çdo shtypje tasti gjatë testit dhe llogarit
 * shpejtësinë (WPM), saktësinë, gabimet dhe karakteret më të gabuara.
 * Metodat e llogaritjes janë "të pastra": nuk prekin faqen (DOM),
 * marrin numra dhe kthejnë numra. Kështu janë të lehta për t'u shpjeguar
 * dhe për t'u provuar.
 *
 * Përkufizimet:
 * - totalKeystrokes: çdo karakter i shtypur (Backspace NUK numërohet).
 * - errorKeystrokes: çdo shtypje e gabuar, edhe nëse më pas fshihet me Backspace.
 * - correctCharsInPlace: karakteret që janë të sakta në tekst tani.
 * - WPM = (correctCharsInPlace / 5) / minuta
 * - Saktësia = (shtypje të sakta / totalKeystrokes) x 100
 *
 * Çfarë eksporton: klasën Stats.
 * Kush e përdor: app.js (gjatë testit) dhe js/pages/history-page.js
 * (vetëm metodën statike formatAccuracy).
 * ===========================================================================
 */

// Importojmë sa karaktere ka një fjalë, kur nis WPM i drejtpërdrejtë dhe sa gabime shfaqen
import { CHARS_PER_WORD, LIVE_WPM_MIN_SECONDS, MOST_MISSED_LIMIT } from "../config.js";

/**
 * Mbledh dhe llogarit statistikat e një testi.
 */
export class Stats {
  /**
   * Krijon një objekt statistikash bosh.
   */
  constructor() {
    // Vendosim të gjitha vlerat në gjendjen fillestare
    this.reset();
  }

  /**
   * Fshin gjithçka, për një test të ri.
   * @returns {void}
   */
  reset() {
    // Lista e çdo shtypjeje: { expected, typed, correct }
    this.keystrokes = [];
    // Gjendja e çdo pozicioni në tekst: true = i saktë, false = i gabuar
    this.positions = [];
    // Numri i shtypjeve të gabuara (nuk zvogëlohet me Backspace)
    this.errorCount = 0;
    // Harta: karakteri i pritur -> sa herë u gabua (Map ruan rendin e futjes)
    this.missed = new Map();
  }

  /**
   * Regjistron një shtypje.
   * @param {number} index - pozicioni në tekst
   * @param {string} expected - karakteri që duhej shkruar
   * @param {string} typed - karakteri që u shkrua
   * @param {boolean} isCorrect - a përputhen
   * @returns {void}
   */
  record(index, expected, typed, isCorrect) {
    // Ruajmë shtypjen në listë
    this.keystrokes.push({ expected, typed, correct: isCorrect });
    // Shënojmë gjendjen e këtij pozicioni
    this.positions[index] = isCorrect;
    // Nëse shtypja ishte e gabuar
    if (!isCorrect) {
      // Rrisim numrin e gabimeve
      this.errorCount += 1;
      // Rrisim numrin e gabimeve për këtë karakter (|| 0 kur s'ka ende vlerë)
      this.missed.set(expected, (this.missed.get(expected) || 0) + 1);
    }
  }

  /**
   * Backspace: fshin gjendjen e pozicionit të fundit. Gabimet NUK zbriten.
   * @param {number} index - pozicioni që fshihet
   * @returns {void}
   */
  removeAt(index) {
    // Duke i dhënë gjatësinë index, vargu pritet dhe pozicionet nga index e tutje zhduken
    this.positions.length = index;
  }

  /**
   * Sa karaktere janë shtypur gjithsej.
   * @returns {number} numri i shtypjeve
   */
  get totalKeystrokes() {
    // Çdo element i listës është një shtypje
    return this.keystrokes.length;
  }

  /**
   * Sa shtypje ishin të gabuara.
   * @returns {number} numri i gabimeve
   */
  get errorKeystrokes() {
    // Numëruesi që mbajmë te record()
    return this.errorCount;
  }

  /**
   * Sa shtypje ishin të sakta.
   * @returns {number} shtypje të sakta
   */
  get correctKeystrokes() {
    // Të gjitha minus të gabuarat
    return this.totalKeystrokes - this.errorKeystrokes;
  }

  /**
   * Sa karaktere janë të sakta në tekst tani.
   * @returns {number} karaktere të sakta në vend
   */
  get correctCharsInPlace() {
    // filter(Boolean) mban vetëm vlerat true, pastaj numërojmë sa mbetën
    return this.positions.filter(Boolean).length;
  }

  /**
   * WPM i drejtpërdrejtë gjatë testit. Në sekondën e parë kthen 0.
   * @param {number} elapsedSeconds - sekonda të kaluara
   * @returns {number} WPM i rrumbullakuar
   */
  getLiveWpm(elapsedSeconds) {
    // Shumë herët: numri do të ishte i madh pa kuptim, prandaj 0
    if (elapsedSeconds < LIVE_WPM_MIN_SECONDS) {
      return 0; // kthejmë këtë vlerë dhe dalim nga funksioni
    }
    // Sekondat kthehen në minuta dhe thërrasim formulën
    return Stats.calculateWpm(this.correctCharsInPlace, elapsedSeconds / 60);
  }

  /**
   * Saktësia aktuale.
   * @returns {number} përqindja me një shifër pas presjes
   */
  getAccuracy() {
    // Thërrasim formulën e pastër
    return Stats.calculateAccuracy(this.correctKeystrokes, this.totalKeystrokes);
  }

  /**
   * Karakteret më të gabuara.
   * @param {number} [limit=MOST_MISSED_LIMIT] - sa të kthehen
   * @returns {{char: string, count: number}[]} lista e renditur
   */
  getMostMissed(limit = MOST_MISSED_LIMIT) {
    // Thërrasim funksionin e pastër të renditjes
    return Stats.topEntries(this.missed, limit);
  }

  /**
   * Përmbledhja përfundimtare e testit. WPM llogaritet me kohëzgjatjen e plotë.
   * @param {number} durationSeconds - kohëzgjatja e testit
   * @returns {{wpm: number, accuracy: number, errors: number, correctChars: number, totalChars: number, mostMissed: {char: string, count: number}[]}} rezultati
   */
  getSummary(durationSeconds) {
    // Kthejmë një objekt me të gjitha numrat
    return {
      wpm: Stats.calculateWpm(this.correctCharsInPlace, durationSeconds / 60), // minutat = kohëzgjatja e plotë
      accuracy: this.getAccuracy(), // përqindja e saktësisë
      errors: this.errorKeystrokes, // gabimet, përfshirë ato të fshira
      correctChars: this.correctCharsInPlace, // karaktere të sakta në tekst
      totalChars: this.totalKeystrokes, // të gjitha shtypjet
      mostMissed: this.getMostMissed(), // 5 karakteret më të gabuara
    };
  }

  /**
   * FORMULA E WPM (e pastër): (karaktere të sakta / 5) / minuta.
   * @param {number} correctChars - karaktere të sakta
   * @param {number} minutes - minuta të kaluara
   * @returns {number} WPM i rrumbullakuar në numër të plotë
   */
  static calculateWpm(correctChars, minutes) {
    // Pa kohë nuk mund të pjesëtojmë (pjesëtimi me 0 jep Infinity)
    if (minutes <= 0) {
      return 0; // kthejmë këtë vlerë dhe dalim nga funksioni
    }
    // Karakteret kthehen në "fjalë standarde"
    const words = correctChars / CHARS_PER_WORD;
    // Fjalët pjesëtohen me minutat dhe rrumbullakohen
    return Math.round(words / minutes);
  }

  /**
   * FORMULA E SAKTËSISË (e pastër): (të sakta / totali) x 100, me një shifër pas presjes.
   * @param {number} correct - shtypje të sakta
   * @param {number} total - të gjitha shtypjet
   * @returns {number} përqindja; 0 nëse nuk është shtypur asgjë
   */
  static calculateAccuracy(correct, total) {
    // Nëse s'është shtypur asgjë, saktësia është 0 (jo NaN nga 0/0)
    if (total === 0) {
      return 0; // kthejmë këtë vlerë dhe dalim nga funksioni
    }
    // Përqindja e saktë
    const percent = (correct / total) * 100;
    // x10, rrumbullakim, /10 = një shifër pas presjes (p.sh. 93.75 -> 93.8)
    return Math.round(percent * 10) / 10;
  }

  /**
   * Rendit hartën nga numri më i madh te më i vogli dhe kthen të parat.
   * @param {Map<string, number>} map - karakteri -> numri
   * @param {number} limit - sa elementë të kthehen
   * @returns {{char: string, count: number}[]} lista e renditur
   */
  static topEntries(map, limit) {
    // Array.from kthen hartën në varg çiftesh [karakteri, numri]
    return Array.from(map.entries())
      // Renditje zbritëse sipas numrit (b - a)
      .sort((a, b) => b[1] - a[1])
      // Mbajmë vetëm të parat
      .slice(0, limit)
      // Çdo çift bëhet objekt i lexueshëm
      .map(([char, count]) => ({ char, count }));
  }

  /**
   * Formaton saktësinë për shfaqje në shqip: presje dhjetore, p.sh. 93.8 -> "93,8".
   * @param {number} value - saktësia si numër
   * @returns {string} teksti i formatuar
   */
  static formatAccuracy(value) {
    // toFixed(1) jep gjithmonë një shifër pas pikës; pastaj pika bëhet presje (standardi shqip)
    return Number(value).toFixed(1).replace(".", ",");
  }
}
