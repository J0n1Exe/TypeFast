/**
 * ===========================================================================
 * chart.js
 * ---------------------------------------------------------------------------
 * Çfarë bën: mbështjell librarinë Chart.js për grafikun e përparimit te
 * historiku.html. Merr historikun, zbaton filtrat (gjuha, niveli, koha),
 * mban 30 testet e fundit dhe vizaton WPM si vijë. Saktësia shfaqet te
 * tooltip-i (kutia që del kur kalon miun mbi një pikë).
 * Ngjyrat lexohen nga variablat CSS (--text, --border, --text-muted...),
 * pra grafiku ndjek temën. Kur tema ndryshon (ngjarja "themechange" nga
 * theme.js), grafiku shkatërrohet dhe krijohet sërish me ngjyrat e reja.
 *
 * Chart.js ngarkohet si skript i zakonshëm (UMD) te historiku.html dhe
 * krijon objektin global window.Chart. Ky modul e lexon prej andej.
 *
 * Çfarë eksporton: klasën ProgressChart.
 * Kush e përdor: js/pages/history-page.js.
 * ===========================================================================
 */

// Sa pika shfaqen dhe mesazhet
import { CHART_MAX_POINTS, MESSAGES, LEVEL_LABELS, LANGUAGES, findLabel } from "../config.js";
// Formatimi i saktësisë me presje
import { Stats } from "./stats.js";

/**
 * Shton 0 para numrave njëshifrorë, p.sh. 9 -> "09".
 * @param {number} value - numri
 * @returns {string} numri me dy shifra
 */
function pad(value) {
  // padStart(2, "0") plotëson nga e majta me zero deri në 2 karaktere
  return String(value).padStart(2, "0");
}

/**
 * Data e shkurtër për boshtin horizontal, p.sh. "09.11 17:30".
 * @param {string} iso - data në formatin ISO
 * @returns {string} teksti
 */
function formatShort(iso) {
  // Kthejmë tekstin ISO në objekt Date (në orën lokale të përdoruesit)
  const date = new Date(iso);
  // Dita.muaji ora:minuta (getMonth() nis nga 0, prandaj +1)
  return `${pad(date.getDate())}.${pad(date.getMonth() + 1)} ${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

/**
 * Data e plotë për titullin e tooltip-it, p.sh. "09.11.2026, 17:30".
 * @param {string} iso - data në formatin ISO
 * @returns {string} teksti
 */
function formatFull(iso) {
  // Objekt Date
  const date = new Date(iso);
  // Dita.muaji.viti, ora:minuta
  return `${pad(date.getDate())}.${pad(date.getMonth() + 1)}.${date.getFullYear()}, ${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

/**
 * Grafiku i përparimit.
 */
export class ProgressChart {
  /**
   * Krijon grafikun (pa e vizatuar ende).
   * @param {object} elements - elementët e faqes
   * @param {HTMLCanvasElement} elements.canvas - sipërfaqja e vizatimit
   * @param {HTMLElement} elements.emptyEl - mesazhi kur s'ka të dhëna
   * @param {HTMLElement} elements.summaryEl - përmbledhja me tekst poshtë grafikut
   */
  constructor({ canvas, emptyEl, summaryEl }) {
    // Canvas-i
    this.canvas = canvas;
    // Mesazhi bosh
    this.emptyEl = emptyEl;
    // Përmbledhja
    this.summaryEl = summaryEl;
    // Objekti Chart.js; null = s'është krijuar
    this.chart = null;
    // Historiku i plotë (më i riu i pari)
    this.history = [];
    // Filtrat aktivë; "all" = pa filtër
    this.filters = { lang: "all", level: "all", duration: "all" };
    // Testet që po shfaqen, në rend kohor (për tooltip-in)
    this.points = [];
    // Kur ndryshon tema, rivizatojmë me ngjyrat e reja
    document.addEventListener("themechange", () => this.render());
  }

  /**
   * A u ngarkua Chart.js?
   * @returns {boolean} true nëse window.Chart ekziston
   */
  static isAvailable() {
    // Chart.js UMD krijon window.Chart si funksion (klasë)
    return typeof window.Chart === "function";
  }

  /**
   * Vendos historikun dhe rivizaton.
   * @param {object[]} history - lista e testeve, më i riu i pari
   * @returns {void}
   */
  setHistory(history) {
    // Ruajmë listën
    this.history = history;
    // Vizatojmë
    this.render();
  }

  /**
   * Ndryshon një filtër dhe rivizaton.
   * @param {"lang"|"level"|"duration"} name - emri i filtrit
   * @param {string} value - vlera ("all" ose p.sh. "sq", "hard", "60")
   * @returns {void}
   */
  setFilter(name, value) {
    // Ruajmë vlerën e re
    this.filters[name] = value;
    // Vizatojmë
    this.render();
  }

  /**
   * Zbaton filtrat dhe kthen 30 testet e fundit në rend kohor (i vjetri majtas).
   * @returns {object[]} testet për grafik
   */
  getPoints() {
    // Marrim filtrat me destrukturim
    const { lang, level, duration } = this.filters;
    // Mbajmë vetëm testet që kalojnë çdo filtër
    const filtered = this.history.filter((entry) =>
      // Gjuha: "all" ose e njëjta
      (lang === "all" || entry.lang === lang)
      // Niveli: "all" ose i njëjti
      && (level === "all" || entry.level === level)
      // Koha: "all" ose e njëjta (vlera e select është tekst, prandaj String)
      && (duration === "all" || String(entry.duration) === duration));
    // Historiku është më i riu i pari: marrim 30 të parët dhe i kthejmë mbrapsht (kronologjik)
    return filtered.slice(0, CHART_MAX_POINTS).reverse();
  }

  /**
   * Lexon ngjyrat dhe madhësitë nga variablat CSS, që grafiku të ndjekë temën pa vlera të shkruara me dorë.
   * @returns {{text: string, muted: string, border: string, surface: string, fontFamily: string, fontSize: number, padding: number, radius: number}} vlerat
   */
  static readTheme() {
    // Stilet përfundimtare të <html>, ku janë variablat
    const styles = getComputedStyle(document.documentElement);
    // Funksion i shkurtër: lexon një variabël dhe heq hapësirat
    const read = (name) => styles.getPropertyValue(name).trim();
    // Kthejmë një objekt me të gjitha vlerat
    return {
      text: read("--text"), // ngjyra e vijës
      muted: read("--text-muted"), // ngjyra e etiketave
      border: read("--border"), // ngjyra e rrjetës
      surface: read("--surface"), // sfondi i tooltip-it
      fontFamily: read("--font-ui"), // shkronja e ndërfaqes
      fontSize: parseFloat(read("--fs-small")), // 13 (Chart.js do numër, jo "13px")
      padding: parseFloat(read("--space-1")), // 8, hapësira brenda tooltip-it
      radius: parseFloat(read("--radius-sm")), // 4, qoshet e tooltip-it
    };
  }

  /**
   * Shkatërron grafikun ekzistues (Chart.js kërkon këtë para se të krijohet një i ri në të njëjtin canvas).
   * @returns {void}
   */
  destroy() {
    // Vetëm nëse ekziston
    if (this.chart) {
      // Chart.js liron canvas-in dhe dëgjuesit e vet
      this.chart.destroy();
      // Harrojmë objektin
      this.chart = null;
    }
  }

  /**
   * Vizaton grafikun nga e para me filtrat dhe ngjyrat aktuale.
   * @returns {void}
   */
  render() {
    // Gjithmonë fillojmë nga zero
    this.destroy();
    // Nëse Chart.js mungon, e themi qartë në vend të një gabimi në konsolë
    if (!ProgressChart.isAvailable()) {
      // Teksti i mesazhit
      this.emptyEl.textContent = MESSAGES.chartUnavailable;
      // Shfaqim mesazhin
      this.emptyEl.hidden = false;
      // Fshehim canvas-in bosh
      this.canvas.hidden = true;
      // Dalim
      return;
    }
    // Testet që do shfaqen
    this.points = this.getPoints();
    // Përmbledhja me tekst (bosh kur s'ka pika)
    this.summaryEl.textContent = this.points.length > 0 ? MESSAGES.chartSummary(this.points.length) : "";
    // Pa pika: mesazhi "Nuk ka teste për këta filtra."
    if (this.points.length === 0) {
      // Shfaqim mesazhin
      this.emptyEl.hidden = false;
      // Fshehim canvas-in
      this.canvas.hidden = true;
      // Dalim
      return;
    }
    // Ka pika: fshehim mesazhin
    this.emptyEl.hidden = true;
    // Shfaqim canvas-in
    this.canvas.hidden = false;
    // Lexojmë ngjyrat e temës aktuale
    const theme = ProgressChart.readTheme();
    // Shkronja për të gjitha tekstet e grafikut
    const font = { family: theme.fontFamily, size: theme.fontSize };
    // Me lëvizje të reduktuar, grafiku shfaqet pa animacion
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    // Krijojmë grafikun e ri
    this.chart = new window.Chart(this.canvas, {
      type: "line", // grafik me vijë
      data: { // të dhënat e grafikut
        labels: this.points.map((entry) => formatShort(entry.dateISO)), // etiketat e boshtit X
        datasets: [ // seritë e të dhënave (këtu vetëm një: WPM)
          { // seria e vetme
            label: "WPM", // emri i serisë
            data: this.points.map((entry) => entry.wpm), // vlerat e boshtit Y
            borderColor: theme.text, // vija me ngjyrën e tekstit (jo theks)
            backgroundColor: theme.text, // ngjyra e pikave
            pointBackgroundColor: theme.text, // mbushja e pikave
            pointBorderColor: theme.text, // korniza e pikave
            pointRadius: 3, // madhësia e pikave
            pointHoverRadius: 5, // pikat zmadhohen kur kalon miun
            borderWidth: 2, // trashësia e vijës
            tension: 0.25, // vija lakohet pak mes pikave
            fill: false, // pa mbushje poshtë vijës
          },
        ],
      },
      options: { // opsionet e pamjes dhe të sjelljes
        responsive: true, // ndryshon madhësinë me dritaren
        maintainAspectRatio: false, // ndjek lartësinë e kutisë (--chart-height), jo një raport të fiksuar
        animation: reducedMotion ? false : { duration: 300 }, // pa animacion nëse kërkohet
        interaction: { mode: "nearest", intersect: false }, // tooltip-i del te pika më e afërt, pa e prekur saktë
        plugins: { // shtesat e brendshme të Chart.js
          legend: { display: false }, // pa legjendë, ka vetëm një seri
          tooltip: { // kutia që del kur kalon miun mbi një pikë
            backgroundColor: theme.surface, // sfondi i kutisë
            borderColor: theme.border, // korniza e kutisë
            borderWidth: 1, // vijë 1px
            titleColor: theme.text, // ngjyra e titullit
            bodyColor: theme.text, // ngjyra e tekstit
            titleFont: font, // shkronja e titullit
            bodyFont: font, // shkronja e tekstit
            padding: theme.padding, // 8px brenda
            cornerRadius: theme.radius, // qoshe 4px
            displayColors: false, // pa katrorin e ngjyrës
            callbacks: { // funksionet që shkruajnë tekstin e kutisë
              // Titulli: data dhe ora e plotë e testit
              title: (items) => formatFull(this.points[items[0].dataIndex].dateISO),
              // Rreshti kryesor: WPM
              label: (item) => `WPM: ${item.parsed.y}`,
              // Rreshtat shtesë: saktësia dhe kombinimi
              afterLabel: (item) => {
                // Testi që i përket kësaj pike
                const entry = this.points[item.dataIndex];
                // Dy rreshta: saktësia dhe gjuha/niveli/koha
                return [
                  `Saktësia: ${Stats.formatAccuracy(entry.accuracy)}%`, // rreshti i saktësisë, me presje dhjetore
                  `${findLabel(LANGUAGES, entry.lang)}, ${findLabel(LEVEL_LABELS, entry.level)}, ${entry.duration} s`, // rreshti me gjuhën, nivelin dhe kohën
                ];
              },
            },
          },
        },
        scales: { // boshtet e grafikut
          x: { // boshti horizontal: data dhe ora e testeve
            offset: true, // gjysmë hapi bosh në të dy skajet: pikat e skajeve nuk priten dhe një pikë e vetme del në mes
            ticks: { color: theme.muted, font, maxRotation: 0, autoSkip: true, maxTicksLimit: 6 }, // etiketat gri, horizontale, jo shumë
            grid: { color: theme.border }, // vijat e rrjetës
            border: { color: theme.border }, // vija e boshtit
          },
          y: { // boshti vertikal: WPM
            beginAtZero: true, // boshti nis nga 0, që krahasimi të jetë i ndershëm
            ticks: { color: theme.muted, font, precision: 0 }, // vetëm numra të plotë
            grid: { color: theme.border }, // vijat e rrjetës
            border: { color: theme.border }, // vija e boshtit
            title: { display: true, text: "WPM", color: theme.muted, font }, // titulli i boshtit
          },
        },
      },
    });
  }
}
