/**
 * ===========================================================================
 * summary.js
 * ---------------------------------------------------------------------------
 * Çfarë bën: llogarit statistikat e përgjithshme nga historiku i testeve:
 *   - sa teste dhe sa karaktere janë shtypur gjithsej
 *   - sa kohë është shkruar gjithsej (shuma e kohëzgjatjeve të testeve)
 *   - ditë rresht me të paktën një test (seria aktuale dhe më e gjata)
 *   - përparimi: mesatarja e testeve të fundit kundrejt të parave
 * Të gjitha metodat janë statike dhe "të pastra": marrin historikun dhe
 * kthejnë numra, pa prekur faqen dhe pa lexuar localStorage. Çdo numër vjen
 * nga testet reale; nuk ka asnjë vlerë të shpikur.
 *
 * Çfarë eksporton: klasën HistorySummary.
 * Kush e përdor: js/pages/history-page.js.
 * ===========================================================================
 */

// Sa teste krahasohen te përparimi dhe id-ja e nivelit të praktikës
import { PROGRESS_SAMPLE_SIZE, PRACTICE_LEVEL } from "../config.js";

/** @type {number} Sa milisekonda ka një ditë (24 orë x 60 min x 60 s x 1000 ms). */
const MS_PER_DAY = 24 * 60 * 60 * 1000;

/**
 * Llogaritjet e përmbledhjes së historikut.
 */
export class HistorySummary {
  /**
   * Llogarit të gjitha statistikat njëherësh.
   * @param {object[]} history - testet, më i riu i pari
   * @param {Date} [now=new Date()] - "tani"; jepet si parametër që funksioni të jetë i pastër dhe i provueshëm
   * @returns {{tests: number, totalChars: number, totalSeconds: number, streak: {current: number, longest: number}, progress: {count: number, firstAvg: number, lastAvg: number, delta: number}|null}} përmbledhja
   */
  static compute(history, now = new Date()) {
    // Kthejmë një objekt me të gjitha vlerat
    return {
      tests: history.length, // numri i testeve
      totalChars: history.reduce((sum, entry) => sum + (entry.totalChars || 0), 0), // shuma e të gjitha shtypjeve
      totalSeconds: history.reduce((sum, entry) => sum + (entry.duration || 0), 0), // shuma e kohëzgjatjeve
      streak: HistorySummary.streaks(history, now), // ditët rresht
      progress: HistorySummary.progress(history), // përparimi, ose null
    };
  }

  /**
   * Kthen një datë në çelës dite sipas orës LOKALE, p.sh. "2026-11-09".
   * Përdorim orën lokale dhe jo UTC, sepse "sot" për përdoruesin është dita e tij.
   * @param {Date} date - data
   * @returns {string} çelësi i ditës
   */
  static dayKey(date) {
    // Muaji nis nga 0, prandaj +1; padStart shton zero përpara (9 -> "09")
    const month = String(date.getMonth() + 1).padStart(2, "0");
    // Dita e muajit me dy shifra
    const day = String(date.getDate()).padStart(2, "0");
    // Viti-muaji-dita
    return `${date.getFullYear()}-${month}-${day}`;
  }

  /**
   * Numri rendor i një dite: sa ditë kanë kaluar nga 1 janari 1970.
   * Dy ditë njëra pas tjetrës kanë numra që ndryshojnë saktësisht me 1,
   * prandaj krahasimi i ditëve bëhet me zbritje të thjeshtë.
   * @param {string} key - çelësi i ditës, p.sh. "2026-11-09"
   * @returns {number} numri i ditës
   */
  static dayNumber(key) {
    // Ndajmë çelësin në vit, muaj dhe ditë si numra
    const [year, month, day] = key.split("-").map(Number);
    // Date.UTC jep milisekondat e mesnatës UTC të asaj date (pa ndikim nga ora verore)
    return Math.round(Date.UTC(year, month - 1, day) / MS_PER_DAY);
  }

  /**
   * Ditët rresht me të paktën një test.
   * - current: seria që përfundon sot. Nëse sot s'ka ende test, por dje ka, seria vazhdon
   *   (dita e sotme s'ka mbaruar ende). Përndryshe është 0.
   * - longest: seria më e gjatë ndonjëherë në historikun e ruajtur.
   * @param {object[]} history - testet
   * @param {Date} now - tani
   * @returns {{current: number, longest: number}} seritë
   */
  static streaks(history, now) {
    // Set mban çdo ditë vetëm një herë, edhe nëse ka 10 teste atë ditë
    const days = new Set(history.map((entry) => HistorySummary.dayKey(new Date(entry.dateISO))));
    // Numrat e ditëve, të renditur nga më e vjetra te më e reja
    const numbers = Array.from(days, (key) => HistorySummary.dayNumber(key)).sort((a, b) => a - b);
    // Seria më e gjatë e gjetur
    let longest = 0;
    // Seria që po numërojmë tani
    let run = 0;
    // Kalojmë çdo ditë me radhë
    numbers.forEach((number, index) => {
      // Nëse dita është saktësisht 1 pas së mëparshmes, seria vazhdon; përndryshe nis nga 1
      run = index > 0 && number === numbers[index - 1] + 1 ? run + 1 : 1;
      // Mbajmë serinë më të gjatë
      longest = Math.max(longest, run);
    });
    // Numri i ditës së sotme
    const today = HistorySummary.dayNumber(HistorySummary.dayKey(now));
    // Bashkësi me numrat, për kontroll të shpejtë
    const numberSet = new Set(numbers);
    // Seria aktuale nis nga sot, ose nga dje nëse sot s'ka ende test
    let cursor = numberSet.has(today) ? today : today - 1;
    // Numëruesi i serisë aktuale
    let current = 0;
    // Ecim mbrapsht ditë pas dite derisa të gjejmë një ditë pa test
    while (numberSet.has(cursor)) {
      // Një ditë më shumë në seri
      current += 1;
      // Dita e mëparshme
      cursor -= 1;
    }
    // Kthejmë të dyja seritë
    return { current, longest };
  }

  /**
   * Përparimi: mesatarja e WPM e testeve të fundit minus mesatarja e të parave.
   * Testet e praktikës nuk përfshihen, sepse teksti i tyre është më i vështirë me qëllim.
   * Krahasohen 10 me 10; me më pak se 20 teste, krahasohen gjysmat (p.sh. 3 me 3).
   * @param {object[]} history - testet, më i riu i pari
   * @returns {{count: number, firstAvg: number, lastAvg: number, delta: number}|null} null kur ka më pak se 2 teste
   */
  static progress(history) {
    // Vetëm testet normale
    const normal = history.filter((entry) => entry.level !== PRACTICE_LEVEL.id);
    // Sa teste ka çdo grup: 10, ose gjysma kur ka pak teste
    const count = Math.min(PROGRESS_SAMPLE_SIZE, Math.floor(normal.length / 2));
    // Me më pak se 2 teste, grupet do të ishin bosh
    if (count < 1) {
      return null; // s'ka çfarë të krahasojmë
    }
    // Të fundit janë në fillim të listës (më i riu i pari)
    const lastAvg = HistorySummary.averageWpm(normal.slice(0, count));
    // Të parat janë në fund të listës; slice me numër negativ merr nga fundi
    const firstAvg = HistorySummary.averageWpm(normal.slice(-count));
    // Kthejmë dy mesataret dhe diferencën
    return { count, firstAvg, lastAvg, delta: lastAvg - firstAvg };
  }

  /**
   * Mesatarja e WPM e një liste testesh, e rrumbullakuar.
   * @param {object[]} entries - testet
   * @returns {number} mesatarja
   */
  static averageWpm(entries) {
    // Shuma e WPM pjesëtuar me numrin e testeve
    return Math.round(entries.reduce((sum, entry) => sum + entry.wpm, 0) / entries.length);
  }

  /**
   * Kthen sekondat në tekst shqip: "45 s", "12 min 30 s" ose "1 orë 5 min".
   * @param {number} totalSeconds - sekondat
   * @returns {string} teksti
   */
  static formatDuration(totalSeconds) {
    // Orët e plota (3600 sekonda në një orë)
    const hours = Math.floor(totalSeconds / 3600);
    // Minutat e mbetura pas orëve (% jep mbetjen e pjesëtimit)
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    // Sekondat e mbetura pas minutave
    const seconds = totalSeconds % 60;
    // Nëse ka orë, tregojmë orë dhe minuta
    if (hours > 0) {
      return `${hours} orë ${minutes} min`; // p.sh. "1 orë 5 min"
    }
    // Nëse ka minuta, tregojmë minuta dhe sekonda
    if (minutes > 0) {
      return `${minutes} min ${seconds} s`; // p.sh. "12 min 30 s"
    }
    // Përndryshe vetëm sekonda
    return `${seconds} s`;
  }
}
