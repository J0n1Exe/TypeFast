/**
 * ===========================================================================
 * ui.js
 * ---------------------------------------------------------------------------
 * Çfarë bën: gjithçka që prek faqen (DOM) gjatë testit. Vizaton tekstin
 * si <span class="word"> me <span class="char"> brenda, ngjyros shkronjat
 * (e pashkruar, e saktë, e gabuar), lëviz kursorin, ngjit rreshtat lart,
 * përditëson statistikat e drejtpërdrejta, tregon mesazhin e fokusit,
 * shiritin e cilësimeve, butonin dhe shiritin e praktikës së tasteve të
 * dobëta, kursorin gri të garës me rekordin dhe panelin e rezultatit me
 * grafikun e shpejtësisë.
 * Kjo klasë NUK vendos asgjë për logjikën e testit: vetëm shfaq atë që
 * i thotë app.js. Kështu logjika dhe pamja janë të ndara.
 *
 * Çfarë eksporton: klasën TestUI.
 * Kush e përdor: app.js (klasa TypingTest).
 * ===========================================================================
 */

// Importojmë mesazhet, listat për emrat shqip dhe funksionin që i gjen
import { MESSAGES, LEVEL_LABELS, LANGUAGES, findLabel } from "../config.js";
// Importojmë Stats vetëm për funksionin e formatimit të saktësisë
import { Stats } from "./stats.js";
// Grafiku i shpejtësisë te rezultati, i vizatuar me Canvas
import { SpeedGraph } from "./speed-graph.js";

/**
 * Gjen një element sipas id-së. Shkurtim i document.getElementById.
 * @param {string} id - id-ja e elementit
 * @returns {HTMLElement|null} elementi ose null
 */
function byId(id) {
  // Kthejmë elementin me këtë id
  return document.getElementById(id);
}

/**
 * Ndërfaqja e testit.
 */
export class TestUI {
  /**
   * Gjen të gjithë elementët e faqes që na duhen dhe i ruan.
   */
  constructor() {
    // ---- Cilësimet ----
    this.settings = byId("settings"); // shiriti i cilësimeve
    this.chips = Array.from(document.querySelectorAll(".chip[data-setting]")); // të gjitha zgjedhjet si varg
    this.lenientToggle = byId("lenient-toggle"); // çelësi i ë/ç
    this.practiceToggle = byId("practice-toggle"); // butoni "Praktiko tastet e dobëta"
    this.practiceHint = byId("practice-hint"); // shënimi poshtë butonit të praktikës
    this.practiceAvailable = false; // a ka të dhëna të mjaftueshme për praktikë (vendoset nga app.js)

    // ---- Zona e testit ----
    this.testArea = byId("test-area"); // statistikat, kutia dhe udhëzimi
    this.practiceBanner = byId("practice-banner"); // shiriti "Praktikë për tastet"
    this.practiceKeys = byId("practice-keys"); // vendi ku shfaqen tastet e praktikës
    this.statTime = byId("stat-time"); // numri i sekondave
    this.statWpm = byId("stat-wpm"); // WPM i drejtpërdrejtë
    this.statAccuracy = byId("stat-accuracy"); // saktësia e drejtpërdrejtë
    this.statGhostWrap = byId("stat-ghost-wrap"); // kutia e statistikës "ndaj rekordit"
    this.statGhost = byId("stat-ghost"); // numri me shenjë: karaktere para ose mbrapa rekordit
    this.ghostToggle = byId("ghost-toggle"); // çelësi "Garë me rekordin"
    this.ghostHint = byId("ghost-hint"); // shënimi poshtë çelësit të garës
    this.textBox = byId("text-box"); // kutia e tekstit
    this.track = byId("text-track"); // shiriti që ngjitet lart
    this.words = byId("text-words"); // mbështjellësi i fjalëve
    this.caret = byId("caret"); // kursori
    this.ghostCaret = byId("ghost-caret"); // kursori gri i garës me rekordin
    this.input = byId("typing-input"); // fusha e fshehur e shkrimit
    this.status = byId("text-status"); // mesazhi i ngarkimit / gabimit

    // ---- Rezultati ----
    this.results = byId("results"); // paneli i rezultatit
    this.recordNotice = byId("record-notice"); // "Rekord i ri personal"
    this.resultsMeta = byId("results-meta"); // gjuha, niveli, koha
    this.resultWpm = byId("result-wpm"); // karta WPM
    this.resultAccuracy = byId("result-accuracy"); // karta e saktësisë
    this.resultErrors = byId("result-errors"); // karta e gabimeve
    this.resultChars = byId("result-chars"); // karta e karaktereve
    this.missedList = byId("missed-list"); // lista e karaktereve të gabuara
    this.missedEmpty = byId("missed-empty"); // mesazhi "asnjë gabim"
    this.saveNote = byId("save-note"); // shënimi kur ruajtja dështon
    this.speedCanvas = byId("speed-canvas"); // canvas-i i grafikut të shpejtësisë
    this.speedSummary = byId("speed-summary"); // fjalia me qëndrueshmërinë
    this.speedGraph = new SpeedGraph(this.speedCanvas); // objekti që vizaton grafikun
    this.retryButton = byId("retry-button"); // butoni "Provo përsëri"
    this.resultsPractice = byId("results-practice"); // butoni i praktikës te rezultati
    this.announcer = byId("results-announcer"); // njoftuesi për lexuesit e ekranit

    // ---- Gjendja e brendshme e vizatimit ----
    this.charEls = []; // çdo <span class="char">, në të njëjtin rend si teksti
    this.lastWordEl = null; // fjala e fundit e vizatuar, për të shtuar tekst më vonë
    this.lineHeight = 0; // lartësia e një rreshti në piksel
    this.scrollLines = 0; // sa rreshta është ngjitur teksti lart
  }

  // ---------------- TEKSTI ----------------

  /**
   * Fshin tekstin e vjetër dhe vizaton tekstin e ri nga fillimi.
   * @param {string} text - teksti i plotë
   * @returns {void}
   */
  renderText(text) {
    // textContent = "" fshin të gjitha fjalët e vjetra me një veprim
    this.words.textContent = "";
    // Fillojmë listën e shkronjave nga zero
    this.charEls = [];
    // S'ka ende fjalë të fundit
    this.lastWordEl = null;
    // Vizatojmë fjalët e reja
    this.appendWords(text);
    // -1 detyron updateCaret() ta rivendosë zhvendosjen (0 rreshta) edhe nëse ishte 0 më parë
    this.scrollLines = -1;
    // Matim lartësinë e rreshtit për tekstin e ri
    this.measure();
    // Kursori te shkronja e parë dhe teksti në krye, pa animacion
    this.updateCaret(0, true);
  }

  /**
   * Shton tekst në fund pa prekur atë që ekziston (kur teksti po mbaron).
   * Para tekstit të ri vendoset një hapësirë te fjala e fundit.
   * @param {string} text - teksti shtesë
   * @returns {void}
   */
  appendText(text) {
    // Nëse ka një fjalë të fundit, i shtojmë hapësirën ndarëse
    if (this.lastWordEl) {
      // Krijojmë hapësirën dhe e fusim në fund të fjalës
      this.lastWordEl.append(this.createChar(" "));
    }
    // Vizatojmë fjalët e reja
    this.appendWords(text);
  }

  /**
   * Kthen tekstin në fjalë dhe shkronja dhe i shton në faqe.
   * Hapësira mes fjalëve futet brenda fjalës që i paraprin, që fjalët
   * të mos thyhen kurrë në mes të rreshtit.
   * @param {string} text - teksti
   * @returns {void}
   */
  appendWords(text) {
    // DocumentFragment: "kuti" në kujtesë; e shtojmë në faqe vetëm një herë, që është më shpejt
    const fragment = document.createDocumentFragment();
    // Ndajmë tekstin në fjalë sipas hapësirës
    const words = text.split(" ");
    // Kalojmë çdo fjalë me pozicionin e saj
    words.forEach((word, wordIndex) => {
      // Krijojmë <span class="word">
      const wordEl = document.createElement("span");
      // I japim klasën
      wordEl.className = "word";
      // Array.from ndan fjalën në karaktere të plota (edhe ë dhe ç si një karakter)
      Array.from(word).forEach((char) => wordEl.append(this.createChar(char)));
      // Çdo fjalë, përveç së fundit, merr hapësirën pas saj
      if (wordIndex < words.length - 1) {
        // Shtojmë hapësirën brenda fjalës
        wordEl.append(this.createChar(" "));
      }
      // Fjala shkon te fragmenti
      fragment.append(wordEl);
      // Mbajmë mend fjalën e fundit
      this.lastWordEl = wordEl;
    });
    // Një shtim i vetëm në faqe
    this.words.append(fragment);
  }

  /**
   * Krijon një <span class="char"> për një karakter dhe e regjistron te charEls.
   * @param {string} char - karakteri
   * @returns {HTMLSpanElement} elementi i krijuar
   */
  createChar(char) {
    // Krijojmë elementin
    const el = document.createElement("span");
    // Klasa bazë (gjendja e pashkruar)
    el.className = "char";
    // Hapësira trajtohet ndryshe
    if (char === " ") {
      // Klasë shtesë për stilin e hapësirës së gabuar
      el.classList.add("char--space");
      // Hapësira e pathyeshme ( ) zë vend të dukshëm; hapësira e zakonshme do të zhdukej në fund të fjalës
      el.textContent = " ";
    } else {
      // Shkronja e zakonshme
      el.textContent = char;
    }
    // E ruajmë në listë, në të njëjtin rend si teksti
    this.charEls.push(el);
    // E kthejmë
    return el;
  }

  /**
   * Mat lartësinë e saktë të një rreshti nga CSS.
   * @returns {void}
   */
  measure() {
    // getComputedStyle jep vlerën përfundimtare, p.sh. "38.4px"; parseFloat e kthen në 38.4
    const fromCss = parseFloat(getComputedStyle(this.words).lineHeight);
    // Nëse CSS jep numër, e përdorim; përndryshe matim lartësinë e shkronjës së parë
    this.lineHeight = Number.isFinite(fromCss) ? fromCss : this.charEls[0]?.offsetHeight || 0;
  }

  /**
   * Ndryshon gjendjen e një shkronje.
   * @param {number} index - pozicioni
   * @param {"untyped"|"correct"|"wrong"} state - gjendja e re
   * @returns {void}
   */
  setCharState(index, state) {
    // Marrim elementin
    const el = this.charEls[index];
    // Nëse s'ekziston, s'bëjmë asgjë
    if (!el) {
      return; // ndalojmë këtu, pjesa tjetër e funksionit nuk ekzekutohet
    }
    // Heqim gjendjet e mëparshme, që të kthehet në "e pashkruar"
    el.classList.remove("char--correct", "char--wrong");
    // Nëse gjendja e re është e saktë
    if (state === "correct") {
      // E gjelbër
      el.classList.add("char--correct");
    } else if (state === "wrong") { // përndryshe, nëse gjendja e re është e gabuar
      // E kuqe dhe e nënvizuar
      el.classList.add("char--wrong");
    }
  }

  /**
   * Kthen të gjitha shkronjat në gjendjen e pashkruar (për Esc).
   * @returns {void}
   */
  resetChars() {
    // Kalojmë çdo shkronjë dhe i heqim ngjyrat
    this.charEls.forEach((el) => el.classList.remove("char--correct", "char--wrong"));
  }

  // ---------------- KURSORI DHE RRESHTAT ----------------

  /**
   * Çon kursorin te shkronja në pozicionin index. Nëse kursori arrin
   * rreshtin e 3-të, e ngjit tekstin lart që rreshti aktual të jetë në mes.
   * @param {number} index - pozicioni i shkronjës aktuale
   * @param {boolean} [instant=false] - true = pa animacion (p.sh. pas ndryshimit të madhësisë)
   * @returns {void}
   */
  updateCaret(index, instant = false) {
    // Shkronja ku duhet të shkojë kursori
    const el = this.charEls[index];
    // Nëse s'ka shkronjë, s'bëjmë asgjë
    if (!el) {
      return; // ndalojmë këtu, pjesa tjetër e funksionit nuk ekzekutohet
    }
    // Për lëvizje të menjëhershme, fikim përkohësisht animacionet
    if (instant) {
      // Kursori pa animacion
      this.caret.classList.add("caret--instant");
      // Shiriti pa animacion
      this.track.classList.add("text-track--instant");
    }
    // Lartësia e rreshtit (rezervë: lartësia e shkronjës)
    const lineHeight = this.lineHeight || el.offsetHeight;
    // Në cilin rresht është shkronja: offsetTop / lartësia e rreshtit, i rrumbullakuar (0 = i pari)
    const line = Math.round(el.offsetTop / lineHeight);
    // Sa rreshta duhen fshehur lart që rreshti aktual të jetë i dyti (në mes); jo më pak se 0
    const scrollLines = Math.max(0, line - 1);
    // Ndryshojmë zhvendosjen vetëm kur ndryshon rreshti, që të mos rifillojë animacioni pa nevojë
    if (scrollLines !== this.scrollLines) {
      // Ruajmë vlerën e re
      this.scrollLines = scrollLines;
      // Zhvendosja është negative: teksti ngjitet lart
      this.track.style.setProperty("--scroll-y", `${-scrollLines * lineHeight}px`);
    }
    // Pozicioni i shkronjës brenda shiritit
    const { x, y } = this.getCharPosition(el);
    // CSS e lexon --caret-x dhe e përdor te transform
    this.caret.style.setProperty("--caret-x", `${x}px`);
    // CSS e lexon --caret-y
    this.caret.style.setProperty("--caret-y", `${y}px`);
    // Nëse lëvizja ishte e menjëhershme, rikthejmë animacionet
    if (instant) {
      // Leximi i offsetHeight e detyron shfletuesin të zbatojë stilet tani (pa animacion)
      void this.track.offsetHeight;
      // Kursori rifiton animacionin për lëvizjet e ardhshme
      this.caret.classList.remove("caret--instant");
      // Shiriti rifiton animacionin
      this.track.classList.remove("text-track--instant");
    }
  }

  /**
   * Llogarit ku duhet vendosur një kursor (i yti ose ai gri) për një shkronjë.
   * @param {HTMLElement} el - elementi i shkronjës
   * @returns {{x: number, y: number}} pozicioni në piksela, brenda shiritit të tekstit
   */
  getCharPosition(el) {
    // Kthejmë dy koordinatat
    return {
      x: el.offsetLeft, // sa larg është shkronja nga e majta e shiritit
      y: el.offsetTop + (el.offsetHeight - this.caret.offsetHeight) / 2, // kursori (1em) qendërzohet brenda lartësisë së rreshtit
    };
  }

  // ---------------- GARA ME REKORDIN (kursori gri) ----------------

  /**
   * Shfaq ose fsheh kursorin gri dhe statistikën "ndaj rekordit", dhe vendos shënimin e çelësit.
   * @param {boolean} active - true kur gara është aktive (çelësi i ndezur, ka rekord, s'është praktikë)
   * @param {string} hint - shënimi poshtë çelësit
   * @returns {void}
   */
  setGhost(active, hint) {
    // Kursori gri shfaqet vetëm kur gara është aktive
    this.ghostCaret.hidden = !active;
    // Edhe statistika "ndaj rekordit"
    this.statGhostWrap.hidden = !active;
    // Teksti i shënimit
    this.ghostHint.textContent = hint;
  }

  /**
   * Çon kursorin gri te shkronja në pozicionin index.
   * Nëse rekordi është më shpejt se teksti i gjeneruar deri tani, kursori ndalet te shkronja e fundit.
   * @param {number} index - sa karaktere do të kishte shkruar rekordi deri tani
   * @returns {void}
   */
  updateGhost(index) {
    // Math.min: jo përtej shkronjës së fundit që ekziston
    const el = this.charEls[Math.min(index, this.charEls.length - 1)];
    // Pa shkronja s'bëjmë asgjë
    if (!el) {
      return; // asgjë për të pozicionuar
    }
    // Pozicioni i shkronjës
    const { x, y } = this.getCharPosition(el);
    // CSS e lexon --ghost-x dhe e përdor te transform
    this.ghostCaret.style.setProperty("--ghost-x", `${x}px`);
    // CSS e lexon --ghost-y
    this.ghostCaret.style.setProperty("--ghost-y", `${y}px`);
  }

  /**
   * Shfaq sa karaktere je para ose mbrapa rekordit, me shenjë: +12, 0 ose -5.
   * @param {number} lead - karakteret e tua të sakta minus karakteret e rekordit
   * @returns {void}
   */
  updateGhostLead(lead) {
    // Numrat pozitivë marrin "+" përpara; negativët e kanë vetë "-"
    this.statGhost.textContent = lead > 0 ? `+${lead}` : String(lead);
  }

  /**
   * Rimat dhe rivendos kursorin pa animacion (pas ndryshimit të madhësisë së dritares).
   * @param {number} index - pozicioni aktual
   * @returns {void}
   */
  refreshLayout(index) {
    // Lartësia e rreshtit mund të ketë ndryshuar (p.sh. nën 768px shkronjat zvogëlohen)
    this.measure();
    // Detyrojmë rillogaritjen e zhvendosjes
    this.scrollLines = -1;
    // Vendosim kursorin pa animacion
    this.updateCaret(index, true);
  }

  /**
   * Kursori pulson kur përdoruesi pushon dhe është i plotë kur shkruan.
   * @param {boolean} isTyping - true gjatë shkrimit
   * @returns {void}
   */
  setCaretTyping(isTyping) {
    // toggle me argument të dytë: shton klasën kur është true, e heq kur është false
    this.caret.classList.toggle("caret--idle", !isTyping);
  }

  // ---------------- FOKUSI ----------------

  /**
   * Turbullon ose qartëson tekstin sipas fokusit.
   * @param {boolean} focused - true kur fusha e shkrimit ka fokus
   * @returns {void}
   */
  setFocused(focused) {
    // Pa fokus: klasa is-blurred turbullon tekstin dhe shfaq mesazhin
    this.textBox.classList.toggle("is-blurred", !focused);
  }

  /**
   * Vendos fokusin te fusha e fshehur e shkrimit.
   * @returns {void}
   */
  focusInput() {
    // preventScroll: faqja nuk kërcen kur fokusohet fusha
    this.input.focus({ preventScroll: true });
  }

  /**
   * Bllokon ose zhbllokon fushën e shkrimit.
   * @param {boolean} locked - true = s'lejohet shkrimi
   * @returns {void}
   */
  setInputLocked(locked) {
    // Fusha e çaktivizuar nuk merr fokus dhe nuk pranon tekst
    this.input.disabled = locked;
  }

  // ---------------- STATISTIKAT E DREJTPËRDREJTA ----------------

  /**
   * Përditëson tre numrat sipër kutisë.
   * @param {{remaining: number, wpm: number, accuracy: number}} values - vlerat
   * @returns {void}
   */
  updateLiveStats({ remaining, wpm, accuracy }) {
    // Math.ceil: 29.3 sekonda shfaqen si 30, që 0 të dalë vetëm kur koha mbaron
    this.statTime.textContent = String(Math.ceil(remaining));
    // WPM si numër i plotë
    this.statWpm.textContent = String(wpm);
    // Saktësia me presje dhjetore
    this.statAccuracy.textContent = Stats.formatAccuracy(accuracy);
  }

  // ---------------- CILËSIMET ----------------

  /**
   * Shënon zgjedhjet aktive sipas cilësimeve.
   * Në praktikë asnjë nivel nuk shënohet si aktiv, sepse teksti nuk vjen nga një nivel.
   * @param {{duration: number, level: string, lang: string, lenient: boolean}} settings - cilësimet
   * @param {boolean} [practiceActive=false] - true kur praktika e tasteve të dobëta është aktive
   * @returns {void}
   */
  applySettings(settings, practiceActive = false) {
    // Kalojmë çdo zgjedhje
    this.chips.forEach((chip) => {
      // data-setting tregon cilin cilësim përfaqëson, p.sh. "duration"
      const name = chip.dataset.setting;
      // Në praktikë, zgjedhjet e nivelit nuk janë aktive; përndryshe krahasojmë si tekst ("30")
      const isActive = !(practiceActive && name === "level") && chip.dataset.value === String(settings[name]);
      // aria-pressed="true" për aktiven; CSS e ngjyros me theksin
      chip.setAttribute("aria-pressed", String(isActive));
    });
    // Çelësi i ë/ç: aria-checked "true" ose "false"
    this.lenientToggle.setAttribute("aria-checked", String(settings.lenient));
    // Çelësi i garës me rekordin
    this.ghostToggle.setAttribute("aria-checked", String(settings.ghost));
    // Butoni i praktikës është "i shtypur" kur praktika është aktive
    this.practiceToggle.setAttribute("aria-pressed", String(practiceActive));
  }

  /**
   * Çaktivizon ose aktivizon cilësimet (gjatë testit janë të çaktivizuara).
   * @param {boolean} disabled - true = të bllokuara
   * @returns {void}
   */
  setSettingsDisabled(disabled) {
    // Çdo zgjedhje
    this.chips.forEach((chip) => {
      // Atributi disabled e bën butonin të paklikueshëm
      chip.disabled = disabled;
    });
    // Edhe çelësi
    this.lenientToggle.disabled = disabled;
    // Edhe çelësi i garës
    this.ghostToggle.disabled = disabled;
    // Butoni i praktikës: i bllokuar gjatë testit OSE kur s'ka ende të dhëna
    this.practiceToggle.disabled = disabled || !this.practiceAvailable;
  }

  // ---------------- PRAKTIKA ----------------

  /**
   * A mund të niset praktika? Përditëson butonin, shënimin dhe butonin te rezultati.
   * @param {boolean} available - true kur ka të paktën një tast të dobët
   * @param {string} hint - teksti i shënimit (tastet ose shpjegimi)
   * @returns {void}
   */
  setPracticeAvailability(available, hint) {
    // Ruajmë gjendjen, që setSettingsDisabled ta respektojë
    this.practiceAvailable = available;
    // Teksti i shënimit
    this.practiceHint.textContent = hint;
    // Pa të dhëna butoni s'klikohet
    this.practiceToggle.disabled = !available;
    // Butoni te rezultati shfaqet vetëm kur praktika është e mundur
    this.resultsPractice.hidden = !available;
  }

  /**
   * Shfaq shiritin e praktikës me tastet, ose e fsheh.
   * @param {string[]|null} keys - tastet që po praktikohen; null = fshihe
   * @returns {void}
   */
  showPracticeBanner(keys) {
    // Pa taste: shiriti fshihet
    this.practiceBanner.hidden = !keys;
    // Fshijmë tastet e vjetra
    this.practiceKeys.textContent = "";
    // Nëse s'ka taste, kemi mbaruar
    if (!keys) {
      return; // asgjë për të shfaqur
    }
    // Një <kbd> për çdo tast, që të duket si tast i tastierës
    keys.forEach((key) => {
      // Krijojmë elementin
      const kbd = document.createElement("kbd");
      // Tasti si tekst i thjeshtë
      kbd.textContent = key;
      // E shtojmë te shiriti
      this.practiceKeys.append(kbd);
    });
  }

  // ---------------- MESAZHET E KUTISË ----------------

  /**
   * Shfaq "Duke ngarkuar tekstet...".
   * @returns {void}
   */
  showLoading() {
    // Heqim stilin e gabimit
    this.status.classList.remove("text-box__status--error");
    // Vendosim tekstin
    this.status.textContent = MESSAGES.loading;
    // E shfaqim
    this.status.hidden = false;
  }

  /**
   * Shfaq një gabim të qartë në vend të tekstit dhe bllokon shkrimin.
   * @param {string} message - mesazhi
   * @returns {void}
   */
  showError(message) {
    // Stili i gabimit (tekst i qartë)
    this.status.classList.add("text-box__status--error");
    // Mesazhi
    this.status.textContent = message;
    // E shfaqim
    this.status.hidden = false;
    // S'ka tekst për të shkruar, prandaj bllokojmë fushën
    this.setInputLocked(true);
  }

  /**
   * Fsheh mesazhin e ngarkimit/gabimit.
   * @returns {void}
   */
  hideStatus() {
    // E fshehim
    this.status.hidden = true;
  }

  // ---------------- PAMJET ----------------

  /**
   * Shfaq zonën e testit dhe fsheh rezultatin.
   * @returns {void}
   */
  showTest() {
    // Fshehim rezultatin
    this.results.hidden = true;
    // Shfaqim testin
    this.testArea.hidden = false;
    // Zhbllokojmë fushën
    this.setInputLocked(false);
  }

  /**
   * Plotëson dhe shfaq panelin e rezultatit në vend të testit.
   * @param {{lang: string, level: string, duration: number, wpm: number, accuracy: number, errors: number, correctChars: number, totalChars: number, mostMissed: {char: string, count: number}[]}} result - rezultati
   * @param {object} extra - të dhëna shtesë
   * @param {boolean} extra.isRecord - a është rekord i ri
   * @param {boolean} extra.saved - a u ruajt në historik
   * @param {{samples: object[], consistency: number, peak: number, peakSecond: number}} extra.speed - të dhënat e grafikut të shpejtësisë
   * @returns {void}
   */
  showResults(result, { isRecord, saved, speed }) {
    // WPM
    this.resultWpm.textContent = String(result.wpm);
    // Saktësia me presje dhe shenjën %
    this.resultAccuracy.textContent = `${Stats.formatAccuracy(result.accuracy)}%`;
    // Gabimet
    this.resultErrors.textContent = String(result.errors);
    // Të sakta / totale
    this.resultChars.textContent = `${result.correctChars} / ${result.totalChars}`;
    // Rreshti me kombinimin, p.sh. "Shqip, Mesatare, 30 sekonda"
    this.resultsMeta.textContent = `${findLabel(LANGUAGES, result.lang)}, ${findLabel(LEVEL_LABELS, result.level)}, ${result.duration} sekonda`;
    // Njoftimi i rekordit shfaqet vetëm për rekord të ri
    this.recordNotice.hidden = !isRecord;
    // Shënimi i ruajtjes shfaqet vetëm kur ruajtja dështoi
    this.saveNote.hidden = saved;
    // Vizatojmë listën e gabimeve
    this.renderMissed(result.mostMissed);
    // Fshehim testin
    this.testArea.hidden = true;
    // Shfaqim rezultatin (CSS nis animacionin e shfaqjes)
    this.results.hidden = false;
    // Fjalia me qëndrueshmërinë dhe shpejtësinë më të lartë
    this.speedSummary.textContent = MESSAGES.speedSummary(speed.consistency, speed.peak, speed.peakSecond);
    // Në sa sekonda pati gabime (për përshkrimin e grafikut)
    const errorSeconds = speed.samples.filter((sample) => sample.errors > 0).length;
    // Përshkrimi me tekst i grafikut, për lexuesit e ekranit
    this.speedCanvas.setAttribute("aria-label", MESSAGES.speedAria(speed.samples.length, errorSeconds));
    // Vizatojmë grafikun PASI paneli është i dukshëm, që canvas-i të ketë përmasa reale
    this.speedGraph.setSamples(speed.samples);
  }

  /**
   * Vizaton listën e karaktereve më të gabuara.
   * @param {{char: string, count: number}[]} missed - lista
   * @returns {void}
   */
  renderMissed(missed) {
    // Fshijmë listën e vjetër
    this.missedList.textContent = "";
    // Nëse s'ka gabime, shfaqim mesazhin dhe fshehim listën
    this.missedEmpty.hidden = missed.length > 0;
    // Lista fshihet kur është bosh
    this.missedList.hidden = missed.length === 0;
    // Krijojmë një element për çdo karakter
    missed.forEach(({ char, count }) => {
      // <li>
      const item = document.createElement("li");
      // Klasa e stilit
      item.className = "missed__item";
      // <span> për karakterin
      const charEl = document.createElement("span");
      // Klasa e stilit
      charEl.className = "missed__char";
      // Hapësira shfaqet me fjalën "Hapësira", përndryshe vetë karakteri
      charEl.textContent = char === " " ? MESSAGES.space : char;
      // <span> për numrin
      const countEl = document.createElement("span");
      // Klasa e stilit
      countEl.className = "missed__count";
      // Numri i gabimeve
      countEl.textContent = String(count);
      // Fjala "gabime", e fshehur për syrin, e lexueshme për lexuesin e ekranit
      const hidden = document.createElement("span");
      // Klasa që e fsheh vizualisht
      hidden.className = "visually-hidden";
      // Teksti
      hidden.textContent = " gabime";
      // Fjala futet pas numrit
      countEl.append(hidden);
      // Karakteri dhe numri futen te <li>
      item.append(charEl, countEl);
      // <li> futet te lista
      this.missedList.append(item);
    });
  }

  /**
   * Vendos fokusin te butoni "Provo përsëri", që Enter të nisë menjëherë një test të ri.
   * @returns {void}
   */
  focusRetry() {
    // preventScroll: pa kërcim të faqes
    this.retryButton.focus({ preventScroll: true });
  }

  /**
   * Shkruan tekst te njoftuesi aria-live, që e lexon lexuesi i ekranit.
   * @param {string} text - teksti
   * @returns {void}
   */
  announce(text) {
    // Lexuesi i ekranit e lexon kur ndryshon përmbajtja
    this.announcer.textContent = text;
  }
}
