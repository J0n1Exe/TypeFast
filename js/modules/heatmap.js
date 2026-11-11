/**
 * ===========================================================================
 * heatmap.js
 * ---------------------------------------------------------------------------
 * Çfarë bën: vizaton hartën e tastierës te historiku. Çdo tast është një
 * element i krijuar me JavaScript (document.createElement) që merr një
 * klasë ngjyre sipas shkallës së gabimit të atij tasti:
 *   heat-none: tasti ka dalë më pak se 5 herë (pak të dhëna, vijë e ndërprerë)
 *   heat-0: asnjë gabim
 *   heat-1 deri heat-4: sa më shumë gabime, aq më e fortë e kuqja
 * Tastierat (shqipe QWERTZ dhe amerikane QWERTY) janë te config.js.
 * Karakteret që s'janë në tastierën e zgjedhur (p.sh. ? ! ose shenjat me
 * Shift) shfaqen në një rresht të veçantë "Shenja të tjera".
 *
 * Çfarë eksporton: klasën KeyboardHeatmap.
 * Kush e përdor: js/pages/history-page.js.
 * ===========================================================================
 */

// Tastierat, kufijtë e ngjyrave, kufiri minimal i të dhënave dhe mesazhet
import { KEYBOARD_LAYOUTS, HEAT_THRESHOLDS, WEAK_KEY_MIN_ATTEMPTS, MESSAGES } from "../config.js";
// Formatimi i përqindjes me presje
import { Stats } from "./stats.js";

/**
 * Harta e tastierës me ngjyra sipas gabimeve.
 */
export class KeyboardHeatmap {
  /**
   * Krijon hartën.
   * @param {object} elements - elementët e faqes
   * @param {HTMLElement} elements.keyboardEl - ku vizatohen rreshtat e tastierës
   * @param {HTMLElement} elements.otherEl - ku vizatohen shenjat e tjera
   * @param {HTMLElement} elements.otherWrapEl - mbështjellësi i shenjave të tjera (fshihet kur s'ka)
   */
  constructor({ keyboardEl, otherEl, otherWrapEl }) {
    // Vendi i tastierës
    this.keyboardEl = keyboardEl;
    // Vendi i shenjave të tjera
    this.otherEl = otherEl;
    // Mbështjellësi i shenjave të tjera
    this.otherWrapEl = otherWrapEl;
  }

  /**
   * SHKALLA E NGJYRËS (e pastër): kthen numrat e një tasti në një shkallë nga 0 deri në 4.
   * @param {{attempts: number, errors: number}|undefined} stats - numrat e tastit
   * @returns {number|null} null = pak të dhëna; 0 = pa gabime; 1 deri 4 = gjithnjë e më shumë gabime
   */
  static heatLevel(stats) {
    // Pa numra, ose me më pak se 5 shtypje, s'nxjerrim përfundime
    if (!stats || stats.attempts < WEAK_KEY_MIN_ATTEMPTS) {
      return null; // pak të dhëna
    }
    // Asnjë gabim: shkalla 0
    if (stats.errors === 0) {
      return 0; // tast pa gabime
    }
    // Shkalla e gabimit nga 0 deri në 1
    const rate = stats.errors / stats.attempts;
    // Gjejmë kufirin e parë që është mbi shkallën: [0.02, 0.05, 0.1]
    const index = HEAT_THRESHOLDS.findIndex((threshold) => rate < threshold);
    // Nëse s'u gjet (-1), shkalla është mbi të gjithë kufijtë: 4. Përndryshe pozicioni + 1.
    return index === -1 ? HEAT_THRESHOLDS.length + 1 : index + 1;
  }

  /**
   * Vizaton tastierën nga e para.
   * @param {Object<string, {attempts: number, errors: number}>} keyStats - numrat e të gjitha tasteve
   * @param {string} layoutId - "sq" ose "us"
   * @returns {void}
   */
  render(keyStats, layoutId) {
    // Gjejmë tastierën e zgjedhur; nëse id-ja s'njihet, marrim të parën
    const layout = KEYBOARD_LAYOUTS.find((item) => item.id === layoutId) || KEYBOARD_LAYOUTS[0];
    // Fshijmë tastierën e vjetër
    this.keyboardEl.textContent = "";
    // Një rresht për çdo tekst te layout.rows
    layout.rows.forEach((rowText) => {
      // Krijojmë rreshtin
      const row = KeyboardHeatmap.createRow();
      // Array.from ndan tekstin në karaktere; çdo karakter bëhet tast
      Array.from(rowText).forEach((char) => row.append(KeyboardHeatmap.createKey(char, keyStats[char])));
      // Rreshti futet te tastiera
      this.keyboardEl.append(row);
    });
    // Rreshti i fundit: tasti i hapësirës, më i gjerë
    const spaceRow = KeyboardHeatmap.createRow();
    // Hapësira është karakteri " "
    spaceRow.append(KeyboardHeatmap.createKey(" ", keyStats[" "]));
    // E shtojmë te tastiera
    this.keyboardEl.append(spaceRow);

    // Bashkësi me të gjitha karakteret që janë në këtë tastierë (plus hapësira)
    const onLayout = new Set([...Array.from(layout.rows.join("")), " "]);
    // Karakteret e shtypura që s'janë në tastierë, më të shpeshtat të parat
    const others = Object.keys(keyStats)
      // Mbajmë vetëm ato jashtë tastierës
      .filter((char) => !onLayout.has(char))
      // Renditje zbritëse sipas herëve që dolën
      .sort((a, b) => keyStats[b].attempts - keyStats[a].attempts);
    // Fshijmë shenjat e vjetra
    this.otherEl.textContent = "";
    // Mbështjellësi fshihet kur s'ka asnjë shenjë tjetër
    this.otherWrapEl.hidden = others.length === 0;
    // Një tast për çdo shenjë
    others.forEach((char) => this.otherEl.append(KeyboardHeatmap.createKey(char, keyStats[char])));
  }

  /**
   * Krijon një rresht bosh të tastierës.
   * @returns {HTMLDivElement} rreshti
   */
  static createRow() {
    // <div class="keyboard__row">
    const row = document.createElement("div");
    // Klasa e stilit
    row.className = "keyboard__row";
    // E kthejmë
    return row;
  }

  /**
   * Krijon një tast me shkronjën, përqindjen dhe klasën e ngjyrës.
   * @param {string} char - karakteri i tastit
   * @param {{attempts: number, errors: number}|undefined} stats - numrat e tastit
   * @returns {HTMLDivElement} tasti
   */
  static createKey(char, stats) {
    // A është ky tasti i hapësirës
    const isSpace = char === " ";
    // Emri që shfaqet: fjala "Hapësira" ose vetë karakteri
    const name = isSpace ? MESSAGES.space : char;
    // Shkalla e ngjyrës (null kur ka pak të dhëna)
    const level = KeyboardHeatmap.heatLevel(stats);
    // <div class="key">
    const key = document.createElement("div");
    // Klasa bazë plus klasa e ngjyrës: heat-none ose heat-0 ... heat-4
    key.className = `key ${level === null ? "heat-none" : `heat-${level}`}`;
    // Tasti i hapësirës është më i gjerë
    if (isSpace) {
      // Klasa e gjerësisë
      key.classList.add("key--wide");
    }
    // Shkronja e tastit
    const label = document.createElement("span");
    // Klasa e stilit
    label.className = "key__label";
    // Teksti
    label.textContent = name;
    // Përqindja poshtë shkronjës
    const rateEl = document.createElement("span");
    // Klasa e stilit
    rateEl.className = "key__rate";
    // Me të dhëna të mjaftueshme tregojmë përqindjen; përndryshe shpjegimin
    if (level === null) {
      // Teksti "pak të dhëna" fshihet për syrin (tasti i zbehur e tregon), por lexohet nga lexuesi i ekranit
      rateEl.classList.add("visually-hidden");
      // Teksti
      rateEl.textContent = MESSAGES.heatNoData;
      // title: shfaqet kur miu qëndron mbi tast
      key.title = `${name}: ${MESSAGES.heatNoData}`;
    } else {
      // Shkalla në përqindje
      const percent = (stats.errors / stats.attempts) * 100;
      // Në tast numër i plotë, që të nxërë
      rateEl.textContent = `${Math.round(percent)}%`;
      // Te title numrat e saktë: gabime, herë, përqindja me një shifër pas presjes
      key.title = MESSAGES.heatTitle(name, stats.errors, stats.attempts, Stats.formatAccuracy(percent));
    }
    // Shkronja dhe përqindja futen te tasti
    key.append(label, rateEl);
    // Kthejmë tastin
    return key;
  }
}
