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
 * - Statistikat e tasteve: për çdo tast, sa herë doli dhe sa herë u gabua.
 * - Shkalla e gabimit të një tasti = gabime / herë që doli. Tastet renditen
 *   sipas saj, jo sipas numrit bruto të gabimeve (shiko rankWeakKeys).
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
   * Statistikat e tasteve të këtij testi, nga lista e shtypjeve.
   * Tasti është karakteri që DUHEJ shkruar, me shkronjë të vogël: "Ë" dhe "ë"
   * janë i njëjti tast në tastierë, ndryshon vetëm Shift.
   * Çdo shtypje numërohet, edhe ato që më pas u fshinë me Backspace.
   * @returns {Object<string, {attempts: number, errors: number}>} tasti -> numrat
   */
  getKeyStats() {
    // Objekti ku mbledhim numrat
    const result = {};
    // Kalojmë çdo shtypje të regjistruar
    this.keystrokes.forEach(({ expected, correct }) => {
      // Tasti fizik: shkronja e vogël e karakterit të pritur
      const key = expected.toLowerCase();
      // Nëse tasti s'ka ende numra, i krijojmë me zero
      if (!result[key]) {
        // Vlerat fillestare
        result[key] = { attempts: 0, errors: 0 };
      }
      // Tasti doli edhe një herë
      result[key].attempts += 1;
      // Nëse shtypja ishte gabim, rritet edhe numri i gabimeve
      if (!correct) {
        // Një gabim më shumë për këtë tast
        result[key].errors += 1;
      }
    });
    // Kthejmë objektin
    return result;
  }

  /**
   * RENDITJA E TASTEVE TË DOBËTA (e pastër).
   * Pse sipas shkallës së gabimit dhe jo sipas numrit të gabimeve:
   * shkronjat e shpeshta (e, a, hapësira) do të kishin gjithmonë më shumë gabime
   * vetëm sepse dalin më shpesh. Shkalla (gabime / herë që doli) tregon ku
   * gabon më shpesh në raport me sa e ke shkruar tastin.
   * @param {Object<string, {attempts: number, errors: number}>} keyStats - numrat e ruajtur për çdo tast
   * @param {object} options - kufijtë
   * @param {number} options.minAttempts - sa herë duhet të ketë dalë tasti të paktën
   * @param {number} options.minErrors - sa herë duhet të jetë gabuar të paktën
   * @param {number} options.limit - sa taste të kthehen
   * @param {boolean} [options.excludeSpace=false] - true = hapësira nuk renditet (praktika s'mund ta synojë veçmas)
   * @returns {{key: string, attempts: number, errors: number, rate: number}[]} tastet, i dobëti i pari
   */
  static rankWeakKeys(keyStats, { minAttempts, minErrors, limit, excludeSpace = false }) {
    // Object.entries kthen çifte [tasti, numrat]
    return Object.entries(keyStats)
      // Heqim hapësirën kur kërkohet dhe tastet me shumë pak të dhëna
      .filter(([key, value]) => !(excludeSpace && key === " ") && value.attempts >= minAttempts && value.errors >= minErrors)
      // Çdo çift bëhet objekt me shkallën e gabimit (nga 0 deri në 1)
      .map(([key, value]) => ({ key, attempts: value.attempts, errors: value.errors, rate: value.errors / value.attempts }))
      // Renditje: shkalla më e lartë e para; me shkallë të barabartë, ai me më shumë gabime
      .sort((a, b) => b.rate - a.rate || b.errors - a.errors)
      // Mbajmë vetëm të parët
      .slice(0, limit);
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
