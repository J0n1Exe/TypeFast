/**
 * ===========================================================================
 * history-page.js
 * ---------------------------------------------------------------------------
 * Çfarë bën: skripti hyrës i historiku.html. Vendos temën, pastaj lexon
 * historikun dhe rekordet nga localStorage dhe plotëson:
 *   - tabelën e rekordeve personale
 *   - tabelën e tasteve të dobëta (me lidhjen për praktikë)
 *   - grafikun e përparimit me filtra (ProgressChart)
 *   - tabelën e plotë të testeve
 *   - butonin "Fshi historikun" me dritaren <dialog>
 *   - gjendjen bosh kur s'ka asnjë test
 * Rreshtat krijohen me document.createElement dhe textContent, jo me
 * innerHTML, që asnjë e dhënë e ruajtur të mos interpretohet si HTML.
 *
 * Çfarë eksporton: asgjë (pikë hyrjeje).
 * Kush e përdor: historiku.html, me <script type="module">.
 * ===========================================================================
 */

// Ruajtja e të dhënave
import { StorageService } from "../modules/storage.js";
// Menaxheri i temës
import { ThemeManager } from "../modules/theme.js";
// Grafiku i përparimit
import { ProgressChart } from "../modules/chart.js";
// Animacioni i shfaqjes së seksioneve
import { ScrollReveal } from "../modules/reveal.js";
// Formatimi i saktësisë
import { Stats } from "../modules/stats.js";
// Listat dhe mesazhet
import {
  LANGUAGES, // gjuhët
  LEVELS, // nivelet, për renditjen e rekordeve
  LEVEL_LABELS, // emrat e niveleve, përfshirë "Praktikë"
  DURATIONS, // kohëzgjatjet, për renditjen e rekordeve
  MESSAGES, // mesazhet në shqip
  WEAK_KEY_TABLE_LIMIT, // sa taste shfaq tabela
  WEAK_KEY_MIN_ATTEMPTS, // sa herë duhet të ketë dalë një tast
  WEAK_KEY_MIN_ERRORS, // sa herë duhet të jetë gabuar një tast
  findLabel, // gjen emrin shqip nga id-ja
} from "../config.js"; // skedari nga vijnë të gjitha

// Shërbimi i ruajtjes për gjithë faqen
const storage = new StorageService();
// Menaxheri i temës
const themeManager = new ThemeManager(storage);
// E PARA: tema e ruajtur te <html>
themeManager.apply();
// Butoni i temës
themeManager.bindToggle(document.getElementById("theme-toggle"));

/**
 * Shton 0 para numrave njëshifrorë.
 * @param {number} value - numri
 * @returns {string} numri me dy shifra
 */
function pad(value) {
  // Plotësim nga e majta me zero deri në 2 karaktere
  return String(value).padStart(2, "0");
}

/**
 * Data, p.sh. "09.11.2026".
 * @param {string} iso - data ISO
 * @returns {string} data e formatuar
 */
function formatDate(iso) {
  // Objekt Date në orën lokale
  const date = new Date(iso);
  // Dita.muaji.viti
  return `${pad(date.getDate())}.${pad(date.getMonth() + 1)}.${date.getFullYear()}`;
}

/**
 * Data dhe ora, p.sh. "09.11.2026, 17:30".
 * @param {string} iso - data ISO
 * @returns {string} data dhe ora
 */
function formatDateTime(iso) {
  // Objekt Date
  const date = new Date(iso);
  // Data, pastaj ora:minuta
  return `${formatDate(iso)}, ${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

/**
 * Krijon një rresht tabele nga një listë qelizash.
 * @param {{text: string, numeric?: boolean}[]} cells - qelizat
 * @returns {HTMLTableRowElement} rreshti
 */
function createRow(cells) {
  // <tr>
  const row = document.createElement("tr");
  // Një <td> për çdo qelizë
  cells.forEach(({ text, numeric }) => {
    // <td>
    const cell = document.createElement("td");
    // textContent: teksti futet si tekst i thjeshtë, jo si HTML
    cell.textContent = text;
    // Kolonat me numra marrin klasën që i rreshton djathtas
    if (numeric) {
      // Klasa e numrave
      cell.className = "table__num";
    }
    // Qeliza futet te rreshti
    row.append(cell);
  });
  // Kthejmë rreshtin
  return row;
}

/**
 * Pozicioni i një id-je në një listë, për renditje (p.sh. "sq" para "en").
 * @param {ReadonlyArray<{id: string}>} list - LANGUAGES ose LEVELS
 * @param {string} id - id-ja
 * @returns {number} pozicioni
 */
function orderOf(list, id) {
  // findIndex kthen pozicionin e elementit me këtë id
  return list.findIndex((item) => item.id === id);
}

/**
 * Plotëson tabelën e rekordeve, të renditura sipas gjuhës, nivelit dhe kohës.
 * @param {HTMLTableSectionElement} body - <tbody> i tabelës
 * @param {Object<string, object>} records - rekordet
 * @returns {void}
 */
function renderRecords(body, records) {
  // Fshijmë rreshtat e vjetër
  body.textContent = "";
  // Object.values kthen vetëm rekordet; i renditim
  const list = Object.values(records).sort((a, b) =>
    // Së pari sipas gjuhës
    orderOf(LANGUAGES, a.lang) - orderOf(LANGUAGES, b.lang)
    // Pastaj sipas nivelit (|| kalon te krahasimi tjetër kur i pari është 0, pra i barabartë)
    || orderOf(LEVELS, a.level) - orderOf(LEVELS, b.level)
    // Pastaj sipas kohës
    || DURATIONS.indexOf(a.duration) - DURATIONS.indexOf(b.duration));
  // Nëse s'ka asnjë rekord (p.sh. të gjitha testet kishin 0 WPM)
  if (list.length === 0) {
    // Një rresht me mesazh
    const row = document.createElement("tr");
    // Një qelizë e vetme
    const cell = document.createElement("td");
    // colSpan = 6: qeliza zë të 6 kolonat
    cell.colSpan = 6;
    // Mesazhi i ndershëm
    cell.textContent = MESSAGES.noRecords;
    // Qeliza te rreshti
    row.append(cell);
    // Rreshti te tabela
    body.append(row);
    // Dalim
    return;
  }
  // Një rresht për çdo rekord
  list.forEach((record) => {
    // Krijojmë rreshtin me 6 qeliza
    body.append(createRow([
      { text: findLabel(LANGUAGES, record.lang) }, // gjuha
      { text: findLabel(LEVEL_LABELS, record.level) }, // niveli
      { text: `${record.duration} s` }, // koha
      { text: String(record.wpm), numeric: true }, // WPM
      { text: `${Stats.formatAccuracy(record.accuracy)}%`, numeric: true }, // saktësia
      { text: formatDate(record.dateISO) }, // data
    ]));
  });
}

/**
 * Plotëson tabelën e plotë të historikut (më i riu sipër).
 * @param {HTMLTableSectionElement} body - <tbody>
 * @param {object[]} history - testet, më i riu i pari
 * @returns {void}
 */
function renderHistory(body, history) {
  // Fshijmë rreshtat e vjetër
  body.textContent = "";
  // Fragment, që ta shtojmë gjithçka në faqe me një veprim
  const fragment = document.createDocumentFragment();
  // Një rresht për çdo test
  history.forEach((entry) => {
    // Rreshti me 7 qeliza
    fragment.append(createRow([
      { text: formatDateTime(entry.dateISO) }, // data dhe ora
      { text: findLabel(LANGUAGES, entry.lang) }, // gjuha
      { text: findLabel(LEVEL_LABELS, entry.level) }, // niveli
      { text: `${entry.duration} s` }, // koha
      { text: String(entry.wpm), numeric: true }, // WPM
      { text: `${Stats.formatAccuracy(entry.accuracy)}%`, numeric: true }, // saktësia
      { text: String(entry.errors), numeric: true }, // gabimet
    ]));
  });
  // Shtojmë të gjitha rreshtat
  body.append(fragment);
}

/**
 * Plotëson tabelën e tasteve të dobëta dhe shfaq lidhjen e praktikës kur ka taste.
 * @param {HTMLTableSectionElement} body - <tbody>
 * @param {HTMLAnchorElement} practiceLink - lidhja "Praktiko tastet e dobëta"
 * @param {Object<string, {attempts: number, errors: number}>} keyStats - numrat e ruajtur
 * @returns {void}
 */
function renderWeakKeys(body, practiceLink, keyStats) {
  // Fshijmë rreshtat e vjetër
  body.textContent = "";
  // 10 tastet me shkallën më të lartë të gabimit (hapësira përfshihet këtu, se është informacion i vlefshëm)
  const ranked = Stats.rankWeakKeys(keyStats, {
    minAttempts: WEAK_KEY_MIN_ATTEMPTS, // të paktën 5 herë
    minErrors: WEAK_KEY_MIN_ERRORS, // të paktën 2 gabime
    limit: WEAK_KEY_TABLE_LIMIT, // 10 rreshta
  });
  // Praktika ka kuptim vetëm kur ka të paktën një tast që nuk është hapësira
  practiceLink.hidden = !ranked.some((item) => item.key !== " ");
  // Pa asnjë tast të dobët: një rresht me shpjegim
  if (ranked.length === 0) {
    // Rreshti
    const row = document.createElement("tr");
    // Një qelizë e vetme
    const cell = document.createElement("td");
    // colSpan = 4: zë të 4 kolonat
    cell.colSpan = 4;
    // Mesazhi i ndershëm
    cell.textContent = MESSAGES.noWeakKeys;
    // Klasa që lejon mesazhin e gjatë të kalojë në disa rreshta (tabela ka nowrap si parazgjedhje)
    cell.className = "table__wrap";
    // Qeliza te rreshti
    row.append(cell);
    // Rreshti te tabela
    body.append(row);
    // Dalim
    return;
  }
  // Një rresht për çdo tast
  ranked.forEach((item) => {
    // Krijojmë rreshtin me 4 qeliza
    body.append(createRow([
      { text: item.key === " " ? MESSAGES.space : item.key }, // tasti; hapësira shkruhet me fjalë
      { text: String(item.errors), numeric: true }, // gabimet
      { text: String(item.attempts), numeric: true }, // herë që doli
      { text: `${Stats.formatAccuracy(item.rate * 100)}%`, numeric: true }, // shkalla në përqindje, me presje
    ]));
  });
}

/**
 * Nis faqen e historikut: gjen elementët, vizaton dhe lidh ngjarjet.
 * @returns {void}
 */
function initHistoryPage() {
  // Elementët e faqes, të mbledhur në një objekt
  const elements = {
    empty: document.getElementById("history-empty"), // gjendja bosh
    content: document.getElementById("history-content"), // pjesa me të dhëna
    recordsBody: document.getElementById("records-body"), // trupi i tabelës së rekordeve
    keysBody: document.getElementById("keys-body"), // trupi i tabelës së tasteve të dobëta
    keysPractice: document.getElementById("keys-practice"), // lidhja "Praktiko tastet e dobëta"
    historyBody: document.getElementById("history-body"), // trupi i tabelës së historikut
    historyCount: document.getElementById("history-count"), // fjalia me numrin e testeve
    filters: Array.from(document.querySelectorAll("[data-filter]")), // tre listat e filtrave
    clearButton: document.getElementById("clear-button"), // butoni "Fshi historikun"
    dialog: document.getElementById("clear-dialog"), // dritarja e konfirmimit
  };
  // Grafiku
  const chart = new ProgressChart({
    canvas: document.getElementById("progress-chart"), // canvas-i
    emptyEl: document.getElementById("chart-empty"), // mesazhi bosh
    summaryEl: document.getElementById("chart-summary"), // përmbledhja
  });

  /**
   * Lexon të dhënat dhe rivizaton gjithë faqen.
   * @returns {void}
   */
  function render() {
    // Historiku nga localStorage
    const history = storage.getHistory();
    // A ka të paktën një test?
    const hasData = history.length > 0;
    // Gjendja bosh shfaqet vetëm pa të dhëna
    elements.empty.hidden = hasData;
    // Përmbajtja shfaqet vetëm me të dhëna
    elements.content.hidden = !hasData;
    // Pa të dhëna: heqim grafikun e vjetër dhe dalim
    if (!hasData) {
      // Shkatërrojmë grafikun nëse ekzistonte
      chart.destroy();
      // Dalim
      return;
    }
    // Tabela e rekordeve
    renderRecords(elements.recordsBody, storage.getRecords());
    // Tabela e tasteve të dobëta
    renderWeakKeys(elements.keysBody, elements.keysPractice, storage.getKeyStats());
    // Tabela e historikut
    renderHistory(elements.historyBody, history);
    // Fjalia me numrin real të testeve
    elements.historyCount.textContent = MESSAGES.historyCount(history.length);
    // Grafiku (pasi përmbajtja është e dukshme, që Chart.js të masë madhësinë saktë)
    chart.setHistory(history);
  }

  // Vizatimi i parë
  render();

  // Çdo filtër: kur ndryshon vlera, ndryshon grafiku
  elements.filters.forEach((select) => {
    // "change" ndodh kur zgjidhet një opsion i ri
    select.addEventListener("change", () => chart.setFilter(select.dataset.filter, select.value));
  });

  // Klikimi te "Fshi historikun" hap dritaren
  elements.clearButton.addEventListener("click", () => {
    // Fshijmë përgjigjen e mëparshme (Esc e mbyll dritaren pa e ndryshuar këtë vlerë)
    elements.dialog.returnValue = "";
    // showModal: dritare modale, pjesa tjetër e faqes bllokohet
    elements.dialog.showModal();
  });

  // Kur dritarja mbyllet (me buton ose Esc)
  elements.dialog.addEventListener("close", () => {
    // Vetëm butoni "Po, fshije" ka value="confirm"
    if (elements.dialog.returnValue !== "confirm") {
      return; // ndalojmë këtu, pjesa tjetër e funksionit nuk ekzekutohet
    }
    // Fshijmë historikun dhe rekordet
    storage.clearHistory();
    // Rivizatojmë: tani shfaqet gjendja bosh
    render();
    // Fokusi te lidhja e gjendjes bosh, që përdoruesi i tastierës të mos humbasë
    elements.empty.querySelector("a")?.focus();
  });

  // Animacioni i shfaqjes së seksioneve
  new ScrollReveal().init();
}

// Nisim faqen vetëm kur nuk është hapur si skedar (file://)
if (window.location.protocol !== "file:") {
  // Nisja
  initHistoryPage();
}
