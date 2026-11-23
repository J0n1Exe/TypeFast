/**
 * ===========================================================================
 * app.js
 * ---------------------------------------------------------------------------
 * Çfarë bën: klasa TypingTest është "kontrolluesi" (controller) i testit.
 * Ajo lidh të gjitha modulet bashkë:
 *   - TextGenerator (texts.js): jep tekstin
 *   - Timer (timer.js): mat kohën
 *   - Stats (stats.js): numëron shtypjet dhe llogarit rezultatin
 *   - StorageService (storage.js): ruan rezultatin, rekordin, statistikat e tasteve dhe cilësimet
 *   - TestUI (ui.js): shfaq gjithçka në faqe
 * Dëgjon tastierën dhe fushën e fshehur të shkrimit, vendos kur nis,
 * kur anulohet dhe kur mbaron testi.
 *
 * Praktika e tasteve të dobëta (this.practiceMode = true): teksti nuk vjen
 * nga një nivel, por ndërtohet nga fjalët ku dalin tastet ku përdoruesi
 * gabon më shumë. Tastet llogariten nga numrat e të gjitha testeve të mbaruara.
 *
 * Gara me rekordin (cilësimi "ghost"): një kursor gri lëviz me shpejtësinë e
 * rekordit për kombinimin e zgjedhur. Pozicioni i tij llogaritet në çdo kornizë
 * (requestAnimationFrame) nga koha e kaluar: karaktere = WPM x 5 x minuta.
 *
 * Mostrat e shpejtësisë: sa herë mbushet një sekondë e plotë, Stats merr një
 * mostër. Prej tyre vizatohet grafiku te rezultati.
 *
 * Dy lloje testi (this.settings.mode):
 *   "time"  - testi mbaron kur mbaron koha (15, 30, 60 ose 120 sekonda)
 *   "words" - teksti ka saktësisht 10, 25 ose 50 fjalë; testi mbaron kur shkruhet
 *             karakteri i fundit, dhe WPM llogaritet me kohën që u desh
 * Teksti yt (this.customText): përdoruesi shkruan ose ngjit tekstin e vet në një
 * <dialog>. Testi sillet si ai me fjalë (mbaron kur shkruhet i gjithë teksti),
 * ruhet me nivelin "Teksti yt" dhe nuk hyn te rekordet.
 * Pas çdo testi, "Shkarko rezultatin" vizaton rezultatin si foto PNG (ResultImage).
 *
 * Gjendjet e testit (this.state):
 *   "loading"  - tekstet po lexohen
 *   "error"    - tekstet nuk u lexuan
 *   "ready"    - teksti është gati, testi nis me shkronjën e parë
 *   "running"  - testi po ecën, koha po numërohet
 *   "finished" - testi mbaroi, shfaqet rezultati
 *
 * Çfarë eksporton: klasën TypingTest.
 * Kush e përdor: js/pages/index-page.js.
 * ===========================================================================
 */

// Konstantet që na duhen nga konfigurimi
import {
  CHARS_PER_WORD, // sa karaktere ka një fjalë standarde (5)
  TEXT_TARGET_WPM, // shpejtësia për të cilën gjenerohet teksti (150 WPM)
  APPEND_THRESHOLD_CHARS, // kur mbeten kaq karaktere, shtohet tekst
  APPEND_CHUNK_CHARS, // sa karaktere shtohen çdo herë
  CARET_IDLE_MS, // pas sa ms kursori pulson sërish
  MESSAGES, // mesazhet në shqip
  PRACTICE_LEVEL, // "niveli" me të cilin ruhen testet e praktikës
  CUSTOM_LEVEL, // "niveli" me të cilin ruhen testet me tekstin tënd
  CUSTOM_MIN_CHARS, // teksti yt: të paktën 20 karaktere
  CUSTOM_MAX_CHARS, // teksti yt: më së shumti 2000 karaktere
  isTextLength, // a mbaron testi kur mbaron teksti
  WEAK_KEY_LIMIT, // sa taste të dobëta praktikohen njëherësh
  WEAK_KEY_MIN_ATTEMPTS, // sa herë duhet të ketë dalë një tast që të renditet
  WEAK_KEY_MIN_ERRORS, // sa herë duhet të jetë gabuar një tast që të renditet
  LANGUAGES, // gjuhët, për emrin shqip të gjuhës te mesazhet
  lengthKey, // çelësi i gjatësisë: "30" ose "w25" (për rekordin e garës)
  findLabel, // gjen emrin shqip nga id-ja
} from "./config.js"; // skedari nga vijnë të gjitha
// Gjeneratori i tekstit
import { TextGenerator } from "./modules/texts.js";
// Kohëmatësi
import { Timer } from "./modules/timer.js";
// Statistikat
import { Stats } from "./modules/stats.js";
// Ndërfaqja
import { TestUI } from "./modules/ui.js";
// Vetëm për funksionin statik recordKey (çelësi i rekordit për një kombinim)
import { StorageService } from "./modules/storage.js";
// Fotoja e rezultatit (Canvas + toDataURL)
import { ResultImage } from "./modules/result-image.js";

/**
 * Tastet që bllokohen gjatë testit, që përdoruesi të mos lëvizë kursorin e fshehur.
 * Set (bashkësi) e bën kontrollin me has() të shpejtë.
 * @type {Set<string>}
 */
const BLOCKED_KEYS = new Set(["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown", "Enter"]);

/**
 * Shkronjat që pranohen në vend të shkronjave me shenja kur çelësi ë/ç është i ndezur.
 * Çelësi është shkronja e tekstit, vlera është shkronja e thjeshtë që pranohet.
 * @type {Readonly<Object<string, string>>}
 */
const DIACRITIC_FALLBACKS = Object.freeze({
  "ë": "e", // ë e vogël pranon e
  "Ë": "E", // Ë e madhe pranon E
  "ç": "c", // ç e vogël pranon c
  "Ç": "C", // Ç e madhe pranon C
});

/**
 * Kontrolluesi i testit të shkrimit.
 */
export class TypingTest {
  /**
   * Krijon testin dhe të gjitha modulet që i duhen.
   * @param {import("./modules/storage.js").StorageService} storage - shërbimi i ruajtjes (i përbashkët me temën)
   */
  constructor(storage) {
    // Ruajtja e të dhënave
    this.storage = storage;
    // Gjeneratori i tekstit
    this.texts = new TextGenerator();
    // Statistikat
    this.stats = new Stats();
    // Ndërfaqja
    this.ui = new TestUI();
    // Kohëmatësi; arrow functions mbajnë "this" të kësaj klase
    this.timer = new Timer({
      onTick: (remaining, elapsed) => this.handleTick(remaining, elapsed), // çdo 100ms
      onEnd: () => this.finish(), // kur mbaron koha
    });
    // Cilësimet e ruajta (ose parazgjedhjet)
    this.settings = storage.getSettings();
    // Gjendja fillestare
    this.state = "loading";
    // Karakteret e pritura të tekstit, si varg (indeksi = pozicioni)
    this.chars = [];
    // Pozicioni ku ndodhet përdoruesi tani
    this.index = 0;
    // Id e kohëmatësit që e kthen kursorin në pulsim pas pushimit
    this.idleTimeoutId = null;
    // Id e requestAnimationFrame për ndryshimin e madhësisë, që të mos rillogarisim shumë herë
    this.resizeFrameId = null;
    // A është aktive praktika e tasteve të dobëta
    this.practiceMode = false;
    // Tastet e dobëta (me shkallën e gabimit) që po përdor praktika aktuale
    this.practiceWeakKeys = [];
    // Rekordi (WPM) kundër të cilit garon kursori gri; null = gara s'është aktive
    this.ghostWpm = null;
    // Id e requestAnimationFrame të garës, që ta ndalojmë ciklin
    this.ghostFrameId = null;
    // Sa sekonda të plota kanë marrë mostër deri tani në këtë test
    this.sampledSeconds = 0;
    // Teksti yt aktiv, ose null kur testi bëhet me tekstet e TypeFast
    this.customText = null;
    // Teksti i pastruar që pret mbylljen e dritares "Teksti yt" me "Fillo me këtë tekst"
    this.pendingCustom = null;
    // Rezultati i fundit dhe nëse ishte rekord (për "Shkarko rezultatin")
    this.lastResult = null;
  }

  /**
   * Nis gjithçka: shfaq cilësimet, lidh ngjarjet, lexon tekstet dhe përgatit testin e parë.
   * @param {object} [options] - opsionet
   * @param {boolean} [options.startInPractice=false] - true kur faqja hapet nga lidhja "Praktiko" te historiku
   * @returns {Promise<void>}
   */
  async init({ startInPractice = false } = {}) {
    // Zgjedhjet aktive sipas cilësimeve të ruajtura
    this.ui.applySettings(this.settings);
    // Dëgjuesit e ngjarjeve
    this.bindEvents();
    // "Duke ngarkuar tekstet..."
    this.ui.showLoading();
    // try: leximi i teksteve mund të dështojë
    try {
      // Presim fetch-in e data/texts.json
      await this.texts.load();
    } catch (error) {
      // Gjendja e gabimit: shkrimi nuk lejohet
      this.state = "error";
      // Shfaqim mesazhin e qartë në kuti
      this.ui.showError(error.message);
      // Dalim, s'ka test pa tekst
      return;
    }
    // Fshehim mesazhin e ngarkimit
    this.ui.hideStatus();
    // A ka të dhëna për praktikë? Përditëson butonin dhe shënimin
    this.refreshPracticeAvailability();
    // Nëse u kërkua praktika dhe ajo është e mundur, testi i parë është praktikë
    this.practiceMode = startInPractice && this.ui.practiceAvailable;
    // Krijojmë testin e parë
    this.newTest();
    // Vendosim fokusin, që përdoruesi të shkruajë menjëherë
    this.ui.focusInput();
  }

  /**
   * Lidh të gjithë dëgjuesit e ngjarjeve (event listeners).
   * @returns {void}
   */
  bindEvents() {
    // Fusha e fshehur ku shkruan përdoruesi
    const input = this.ui.input;

    // "input": ndodh pasi shfletuesi ka futur tekst (punon me AltGr, taste të vdekura dhe tastierat e tabletit)
    input.addEventListener("input", (event) => this.handleInput(event));
    // "compositionend": mbaron një shkronjë e përbërë (p.sh. ¨ + e = ë) ose një fjalë në tastierat e Android
    input.addEventListener("compositionend", () => this.consumeInput());
    // "keydown": vetëm për Backspace, Tab, Esc, tastet e bllokuara dhe kontrollin e Caps Lock
    input.addEventListener("keydown", (event) => this.handleKeydown(event));
    // "keyup": kontrollojmë Caps Lock edhe kur lëshohet tasti, sepse disa shfletues
    // e raportojnë gjendjen e re të Caps Lock vetëm pas lëshimit të tij
    input.addEventListener("keyup", (event) => this.updateCapsLock(event));
    // "paste": ngjitja e tekstit bllokohet, që rezultati të jetë i ndershëm
    input.addEventListener("paste", (event) => event.preventDefault());
    // "drop": edhe tërheqja e tekstit me miun bllokohet
    input.addEventListener("drop", (event) => event.preventDefault());
    // "focus": teksti bëhet i qartë
    input.addEventListener("focus", () => this.ui.setFocused(true));
    // "blur": teksti turbullohet dhe shfaqet mesazhi
    input.addEventListener("blur", () => {
      // Teksti turbullohet
      this.ui.setFocused(false);
      // Pa fokus s'mund ta dimë më gjendjen e Caps Lock, prandaj e fshehim paralajmërimin
      this.ui.setCapsLock(false);
    });

    // Klikimi kudo në kuti vendos fokusin te fusha (rezervë, se fusha e mbulon kutinë)
    this.ui.textBox.addEventListener("click", () => this.focusIfActive());

    // Klikimet te shiriti i cilësimeve (një dëgjues për të gjitha zgjedhjet: "event delegation")
    this.ui.settings.addEventListener("click", (event) => this.handleSettingsClick(event));

    // Butoni "Provo përsëri"
    this.ui.retryButton.addEventListener("click", () => this.restart());

    // "Shkarko rezultatin": fotoja PNG e rezultatit të fundit
    this.ui.downloadButton.addEventListener("click", () => this.downloadResult());

    // ---- Teksti yt ----
    // Dritarja, formulari, fusha, numëruesi dhe gabimi
    this.custom = {
      dialog: document.getElementById("custom-dialog"), // dritarja
      form: document.getElementById("custom-form"), // formulari brenda saj
      input: document.getElementById("custom-input"), // fusha e tekstit
      count: document.getElementById("custom-count"), // "120 / 2000 karaktere"
      error: document.getElementById("custom-error"), // mesazhi i gabimit
    };
    // Butoni "Teksti yt" hap dritaren
    this.ui.customOpen.addEventListener("click", () => this.openCustomDialog());
    // Gjatë shkrimit përditësohet numëruesi dhe fshihet gabimi i vjetër
    this.custom.input.addEventListener("input", () => this.updateCustomCount());
    // "submit" ndodh kur klikohet "Anulo" ose "Fillo me këtë tekst"; këtu kontrollohet teksti
    this.custom.form.addEventListener("submit", (event) => this.handleCustomSubmit(event));
    // Kur mbyllet dritarja: nëse u konfirmua, nis testi me tekstin
    this.custom.dialog.addEventListener("close", () => this.handleCustomClose());

    // Butoni "Praktiko tastet e dobëta" te paneli i rezultatit
    this.ui.resultsPractice.addEventListener("click", () => this.startPractice());

    // Tasti kur fokusi s'është askund (te body): "shtyp çfarëdo tasti për të vazhduar"
    document.addEventListener("keydown", (event) => this.handleGlobalKeydown(event));

    // Ndryshimi i madhësisë së dritares: shkronjat ndryshojnë vend, kursori duhet rillogaritur
    window.addEventListener("resize", () => this.handleResize());
  }

  // ---------------- CIKLI I TESTIT ----------------

  /**
   * Përgatit një test të ri me tekst të ri. Nuk e nis kohën: koha nis me shkronjën e parë.
   * @returns {void}
   */
  newTest() {
    // Ndalojmë dhe fshijmë kohëmatësin
    this.timer.reset();
    // Fshijmë statistikat
    this.stats.reset();
    // Ndalojmë kohëmatësin e pulsimit nëse ka
    clearTimeout(this.idleTimeoutId);
    // Fillojmë nga pozicioni 0
    this.index = 0;
    // A është test me fjalë (teksti yt s'përdor numrin e fjalëve të cilësimeve)
    const wordsMode = !this.customText && this.settings.mode === "words";
    // Me kohë: aq tekst sa mjafton për dikë me 150 WPM (150 fjalë x 5 karaktere x minutat).
    // Me fjalë: rreth dyfishi i karaktereve që duhen (pastaj teksti pritet saktë te fitWords).
    const minChars = wordsMode
      ? this.settings.words * CHARS_PER_WORD * 2 // p.sh. 25 fjalë x 5 x 2 = 250 karaktere
      : Math.ceil(TEXT_TARGET_WPM * CHARS_PER_WORD * (this.settings.duration / 60)); // p.sh. 30 sekonda jep 375
    // Teksti i testit; me tekstin tënd është ai vetë, ndryshe gjenerohet më poshtë
    let text = this.customText || "";
    // Në praktikë (dhe pa tekstin tënd), teksti ndërtohet nga tastet e dobëta
    if (!this.customText && this.practiceMode) {
      // Tastet e dobëta, të rillogaritura nga të gjitha testet deri tani
      this.practiceWeakKeys = this.getWeakKeys();
      // Gjenerojmë tekstin e praktikës
      const practice = this.texts.generatePractice(this.settings.lang, this.practiceWeakKeys, minChars);
      // Nëse u gjet të paktën një tast në këtë gjuhë, përdorim tekstin e praktikës
      if (practice.keys.length > 0) {
        // Teksti i praktikës
        text = practice.text;
        // Mbajmë vetëm tastet që u përdorën vërtet (për shiritin dhe për shtesat e tekstit)
        this.practiceWeakKeys = this.practiceWeakKeys.filter((item) => practice.keys.includes(item.key));
      } else {
        // Asnjë tast i dobët s'gjendet në këtë gjuhë: kthehemi te testi normal
        this.practiceMode = false;
        // Shpjegojmë pse, në shënimin poshtë butonit (butoni mbetet aktiv për gjuhën tjetër)
        this.ui.setPracticeAvailability(true, MESSAGES.practiceNoMatch(this.weakKeysLabel(), findLabel(LANGUAGES, this.settings.lang)));
      }
    }
    // Testi normal (ose praktika që s'u realizua): tekst sipas gjuhës dhe nivelit
    if (!this.customText && !this.practiceMode) {
      // Gjenerojmë tekstin sipas gjuhës dhe nivelit
      text = this.texts.generate(this.settings.lang, this.settings.level, minChars);
    }
    // Me fjalë: teksti pritet (ose zgjatet) që të ketë saktësisht aq fjalë sa u zgjodhën
    if (wordsMode) {
      // P.sh. saktësisht 25 fjalë
      text = this.fitWords(text, this.settings.words);
    }
    // Etiketa e numrit të parë: "sekonda" ose "fjalë"
    this.ui.setLengthMode(this.activeMode());
    // Zgjedhjet aktive (në praktikë asnjë nivel nuk shënohet; me tekstin tënd as koha, fjalët dhe niveli)
    this.ui.applySettings(this.settings, this.practiceMode, Boolean(this.customText));
    // Shënimi pranë "Teksti yt": sa fjalë ka teksti aktiv, ose çfarë bën butoni
    this.ui.setCustomHint(this.customText ? MESSAGES.customActive(this.totalWords()) : MESSAGES.customHint);
    // Shiriti i praktikës: tastet që po praktikohen, ose i fshehur
    this.ui.showPracticeBanner(this.practiceMode ? this.practiceWeakKeys.map((item) => item.key) : null);
    // Array.from ndan tekstin në karaktere të plota (ë është një karakter)
    this.chars = Array.from(text);
    // Shfaqim zonën e testit PARA vizatimit, që matjet e pozicionit të jenë të sakta
    this.ui.showTest();
    // Vizatojmë tekstin (dhe vendosim kursorin në fillim)
    this.ui.renderText(text);
    // Kursori pulson derisa të nisë shkrimi
    this.ui.setCaretTyping(false);
    // Statistikat fillestare: koha e plotë, 0 WPM, 0 saktësi
    this.updateLiveStats(this.settings.duration, 0);
    // Cilësimet lejohen para nisjes
    this.ui.setSettingsDisabled(false);
    // Fshijmë njoftimin e vjetër, që i njëjti rezultat të lexohet sërish herën tjetër
    this.ui.announce("");
    // Asnjë sekondë s'ka marrë ende mostër
    this.sampledSeconds = 0;
    // Përgatisim garën me rekordin (kursori gri në fillim, ose i fshehur)
    this.setupGhost();
    // Gati për shkrim
    this.state = "ready";
  }

  /**
   * Nis kohën. Thirret automatikisht me shkronjën e parë.
   * @returns {void}
   */
  start() {
    // Gjendja "po ecën"
    this.state = "running";
    // Cilësimet bllokohen gjatë testit
    this.ui.setSettingsDisabled(true);
    // Me kohë: kohëmatësi numëron mbrapsht nga kohëzgjatja e zgjedhur.
    // Me fjalë: Infinity (pafundësi) e bën kronometër që s'mbaron vetë; testi mbaron te typeChar().
    this.timer.start(this.endsAtText() ? Infinity : this.settings.duration);
    // Nëse gara është aktive, kursori gri nis të lëvizë
    if (this.ghostWpm !== null) {
      // Korniza e parë e ciklit të garës
      this.runGhostFrame();
    }
  }

  /**
   * Tab ose "Provo përsëri": test i ri me tekst të ri. Testi i papërfunduar nuk ruhet.
   * @returns {void}
   */
  restart() {
    // Pa tekste të ngarkuara s'mund të rifillojmë
    if (this.state === "loading" || this.state === "error") {
      return; // ndalojmë këtu, pjesa tjetër e funksionit nuk ekzekutohet
    }
    // Krijojmë testin e ri
    this.newTest();
    // Fokusi te fusha e shkrimit
    this.ui.focusInput();
  }

  /**
   * Esc: anulon testin dhe kthen të njëjtin tekst në fillim. Asgjë nuk ruhet.
   * @returns {void}
   */
  cancel() {
    // Ka kuptim vetëm kur testi është gati ose po ecën
    if (this.state !== "ready" && this.state !== "running") {
      return; // ndalojmë këtu, pjesa tjetër e funksionit nuk ekzekutohet
    }
    // Ndalojmë kohën
    this.timer.reset();
    // Fshijmë statistikat
    this.stats.reset();
    // Ndalojmë kohëmatësin e pulsimit
    clearTimeout(this.idleTimeoutId);
    // Kthehemi në fillim
    this.index = 0;
    // Të gjitha shkronjat bëhen të pashkruara
    this.ui.resetChars();
    // Kursori dhe teksti në fillim, pa animacion
    this.ui.refreshLayout(0);
    // Mostrat nisin nga e para
    this.sampledSeconds = 0;
    // Kursori gri ndalon dhe kthehet në fillim
    this.setupGhost();
    // Kursori pulson
    this.ui.setCaretTyping(false);
    // Numrat fillestarë
    this.updateLiveStats(this.settings.duration, 0);
    // Cilësimet zhbllokohen
    this.ui.setSettingsDisabled(false);
    // Gati sërish
    this.state = "ready";
  }

  /**
   * Fundi i testit: bllokon shkrimin, llogarit, ruan, kontrollon rekordin dhe shfaq rezultatin.
   * @returns {void}
   */
  finish() {
    // Mbaron vetëm një test që po ecën (mbrojtje nga thirrjet e dyfishta)
    if (this.state !== "running") {
      return; // ndalojmë këtu, pjesa tjetër e funksionit nuk ekzekutohet
    }
    // Gjendja "mbaroi": shkronjat e tjera injorohen
    this.state = "finished";
    // Koha e kaluar, e lexuar PARA ndalimit (te testi me kohë është gjithmonë kohëzgjatja e plotë)
    const elapsed = this.timer.getElapsedSeconds();
    // Ndalojmë kohën
    this.timer.stop();
    // A mbaroi testi kur mbaroi teksti (me fjalë ose me tekstin tënd)
    const wordsMode = this.endsAtText();
    // Me fjalë, testi zakonisht mbaron në mes të një sekonde: marrim edhe mostrën e asaj copëze,
    // por vetëm nëse zgjati të paktën gjysmë sekonde (një copëz shumë e shkurtër do të jepte një
    // shpejtësi të çastit të fryrë, p.sh. 1 shtypje në 0,05 sekonda)
    if (wordsMode && elapsed - this.sampledSeconds >= 0.5) {
      // Mostra e fundit, me çastin e saktë të mbarimit
      this.stats.takeSample(Math.ceil(elapsed), elapsed);
    }
    // Ndalojmë kohëmatësin e pulsimit
    clearTimeout(this.idleTimeoutId);
    // Ndalojmë ciklin e garës (kursori gri s'lëviz më)
    cancelAnimationFrame(this.ghostFrameId);
    // Bllokojmë fushën e shkrimit
    this.ui.setInputLocked(true);
    // Rezultati: cilësimet plus numrat nga Stats (WPM me kohëzgjatjen e plotë)
    const result = {
      lang: this.settings.lang, // gjuha
      level: this.customText ? CUSTOM_LEVEL.id : this.practiceMode ? PRACTICE_LEVEL.id : this.settings.level, // niveli, "custom" ose "practice"
      ...(wordsMode ? { mode: this.activeMode(), words: this.totalWords() } : {}), // lloji ("words" ose "custom") dhe numri i fjalëve
      duration: wordsMode ? Math.round(elapsed * 10) / 10 : this.settings.duration, // me kohë: kohëzgjatja; me fjalë: koha që u desh (1 shifër pas presjes)
      ...this.stats.getSummary(wordsMode ? elapsed : this.settings.duration), // WPM me kohën e plotë (me kohë) ose me kohën e kaluar (me fjalë)
    };
    // Kontrollojmë rekordin PARA se ta ruajmë (krahasojmë me rekordin e vjetër)
    const isRecord = this.storage.isNewRecord(result);
    // Ruajmë në historik; marrim elementin me id dhe datë
    const { entry, saved } = this.storage.addResult(result);
    // Nëse është rekord dhe u ruajt, përditësojmë rekordin
    if (isRecord && saved) {
      // Ruajmë rekordin e ri
      this.storage.updateRecord(entry);
    }
    // Shtojmë numrat e tasteve të këtij testi te totali i të gjitha testeve
    this.storage.addKeyStats(this.stats.getKeyStats());
    // Tastet e dobëta mund të kenë ndryshuar: përditësojmë butonin e praktikës
    this.refreshPracticeAvailability();
    // Shfaqim panelin e rezultatit
    this.ui.showResults(entry, { isRecord, saved, speed: this.stats.getSpeedData() });
    // Ruajmë rezultatin për butonin "Shkarko rezultatin"
    this.lastResult = { entry, isRecord };
    // Cilësimet lejohen sërish
    this.ui.setSettingsDisabled(false);
    // Njoftojmë lexuesin e ekranit
    this.ui.announce(MESSAGES.announceResult(entry.wpm, Stats.formatAccuracy(entry.accuracy), entry.errors));
    // Fokusi te "Provo përsëri"
    this.ui.focusRetry();
  }

  // ---------------- SHKRIMI ----------------

  /**
   * Ngjarja "input" e fushës së fshehur.
   * @param {InputEvent} event - ngjarja
   * @returns {void}
   */
  handleInput(event) {
    // Gjatë një shkronje të përbërë (tast i vdekur, p.sh. ¨ para e), presim compositionend
    if (event.isComposing) {
      return; // ndalojmë këtu, pjesa tjetër e funksionit nuk ekzekutohet
    }
    // Disa tastiera tableti nuk dërgojnë keydown për Backspace, por vetëm këtë lloj inputi
    if (event.inputType === "deleteContentBackward") {
      // E trajtojmë si Backspace
      this.handleBackspace();
    }
    // Lexojmë dhe pastrojmë çfarëdo teksti që u fut
    this.consumeInput();
  }

  /**
   * Lexon tekstin e futur në fushë, e pastron fushën dhe përpunon çdo karakter.
   * Mund të thirret dy herë (input dhe compositionend) pa problem: herën e dytë fusha është bosh.
   * @returns {void}
   */
  consumeInput() {
    // Teksti që ka fusha tani
    const value = this.ui.input.value;
    // Pastrojmë fushën menjëherë, që ajo të jetë gjithmonë bosh
    this.ui.input.value = "";
    // Nëse s'kishte asgjë, dalim
    if (!value) {
      return; // ndalojmë këtu, pjesa tjetër e funksionit nuk ekzekutohet
    }
    // normalize("NFC") bashkon "e" + "¨" në një karakter të vetëm "ë"; Array.from e ndan në karaktere
    const typedChars = Array.from(value.normalize("NFC"));
    // Përpunojmë çdo karakter me radhë
    for (const char of typedChars) {
      // Rreshti i ri (\n) dhe kthimi i karrocës (\r) nuk janë pjesë e testit
      if (char === "\n" || char === "\r") {
        continue; // kalojmë te karakteri tjetër pa e përpunuar këtë
      }
      // Përpunojmë karakterin
      this.typeChar(char);
      // Nëse testi mbaroi gjatë ciklit, ndalojmë
      if (this.state === "finished") {
        break; // dalim nga cikli
      }
    }
  }

  /**
   * Përpunon një karakter të shkruar: e krahason, e regjistron, e ngjyros dhe lëviz kursorin.
   * @param {string} char - karakteri i shkruar
   * @returns {void}
   */
  typeChar(char) {
    // Pranojmë karaktere vetëm kur testi është gati ose po ecën
    if (this.state !== "ready" && this.state !== "running") {
      return; // ndalojmë këtu, pjesa tjetër e funksionit nuk ekzekutohet
    }
    // Shkronja e parë nis testin
    if (this.state === "ready") {
      // Nisim kohën
      this.start();
    }
    // Karakteri që duhej shkruar në këtë pozicion
    const expected = this.chars[this.index];
    // Krahasimi (me ose pa tolerancë për ë/ç)
    const isCorrect = TypingTest.charsMatch(expected, char, this.settings.lenient);
    // Regjistrojmë shtypjen
    this.stats.record(this.index, expected, char, isCorrect);
    // Ngjyrosim shkronjën
    this.ui.setCharState(this.index, isCorrect ? "correct" : "wrong");
    // Kalojmë te pozicioni tjetër
    this.index += 1;
    // Me fjalë: kur shkruhet karakteri i fundit, testi mbaron
    if (this.endsAtText() && this.index >= this.chars.length) {
      // Numrat e fundit ("25 / 25")
      this.updateLiveStats(0, this.timer.getElapsedSeconds());
      // Mbarimi
      this.finish();
      // Dalim
      return;
    }
    // Shtojmë tekst nëse po mbaron (vetëm te testi me kohë)
    this.ensureEnoughText();
    // Lëvizim kursorin
    this.ui.updateCaret(this.index);
    // Kursori i plotë gjatë shkrimit
    this.markTyping();
    // Përditësojmë numrat
    this.updateLiveStats(this.settings.duration - this.timer.getElapsedSeconds(), this.timer.getElapsedSeconds());
  }

  /**
   * Backspace: kthehet një karakter mbrapa dhe e bën të pashkruar. Gabimi mbetet i numëruar.
   * @returns {void}
   */
  handleBackspace() {
    // Vetëm gjatë testit dhe jo në pozicionin 0
    if (this.state !== "running" || this.index === 0) {
      return; // ndalojmë këtu, pjesa tjetër e funksionit nuk ekzekutohet
    }
    // Kthehemi një pozicion
    this.index -= 1;
    // Statistikat harrojnë gjendjen e këtij pozicioni (gabimi mbetet te errorCount)
    this.stats.removeAt(this.index);
    // Shkronja bëhet gri
    this.ui.setCharState(this.index, "untyped");
    // Kursori kthehet
    this.ui.updateCaret(this.index);
    // Kursori i plotë
    this.markTyping();
    // Numrat e rinj (WPM mund të bjerë sepse një karakter i saktë u fshi)
    this.updateLiveStats(this.settings.duration - this.timer.getElapsedSeconds(), this.timer.getElapsedSeconds());
  }

  /**
   * KRAHASIMI I KARAKTEREVE.
   * 1. Nëse janë identikë, është i saktë.
   * 2. Nëse toleranca është e ndezur dhe karakteri i pritur është ë/Ë/ç/Ç,
   *    pranohet edhe shkronja pa shenjë (e/E/c/C).
   * 3. Në çdo rast tjetër është gabim.
   * @param {string} expected - karakteri i tekstit
   * @param {string} typed - karakteri i shkruar
   * @param {boolean} lenient - true kur çelësi "Prano e për ë dhe c për ç" është i ndezur
   * @returns {boolean} true nëse pranohet
   */
  static charsMatch(expected, typed, lenient) {
    // Rasti 1: përputhje e plotë
    if (typed === expected) {
      return true; // karakteri është i saktë
    }
    // Rasti 2: toleranca; DIACRITIC_FALLBACKS["ë"] është "e"
    return lenient && DIACRITIC_FALLBACKS[expected] === typed;
  }

  /**
   * Kur përdoruesi i afrohet fundit të tekstit, shton tekst të ri, që teksti të mos mbarojë kurrë.
   * @returns {void}
   */
  ensureEnoughText() {
    // Te testi me fjalë dhe me tekstin tënd teksti ka gjatësi të fiksuar: s'shtohet asgjë
    if (this.endsAtText()) {
      return; // teksti s'zgjatet
    }
    // Sa karaktere kanë mbetur deri në fund
    const remaining = this.chars.length - this.index;
    // Nëse kanë mbetur më shumë se 30, s'bëjmë asgjë
    if (remaining >= APPEND_THRESHOLD_CHARS) {
      return; // ndalojmë këtu, pjesa tjetër e funksionit nuk ekzekutohet
    }
    // Gjenerojmë një pjesë të re (të paktën 200 karaktere)
    const more = this.moreText(APPEND_CHUNK_CHARS);
    // Shtojmë hapësirën ndarëse dhe karakteret e reja te vargu
    this.chars.push(" ", ...Array.from(more));
    // E shtojmë edhe në faqe (UI vendos vetë hapësirën)
    this.ui.appendText(more);
  }

  /**
   * Tekst i ri: nga tastet e dobëta në praktikë, nga gjuha dhe niveli përndryshe.
   * @param {number} minChars - gjatësia minimale
   * @returns {string} teksti
   */
  moreText(minChars) {
    // Operatori ternar zgjedh burimin e tekstit
    return this.practiceMode
      ? this.texts.generatePractice(this.settings.lang, this.practiceWeakKeys, minChars).text // në praktikë: vetëm teksti nga tastet e dobëta
      : this.texts.generate(this.settings.lang, this.settings.level, minChars); // normalisht: tekst sipas nivelit
  }

  /**
   * Teksti me saktësisht `count` fjalë: nëse ka më shumë, pritet; nëse ka më pak, zgjatet.
   * Fjalitë mund të priten në mes, si te çdo test me numër fjalësh.
   * @param {string} text - teksti i gjeneruar
   * @param {number} count - sa fjalë duhen
   * @returns {string} teksti me aq fjalë
   */
  fitWords(text, count) {
    // Fjalët e tekstit (ndarë me hapësirë)
    const words = text.split(" ");
    // Nëse s'mjaftojnë, shtojmë tekst derisa të mjaftojnë
    while (words.length < count) {
      // Shtojmë fjalët e një pjese të re
      words.push(...this.moreText(APPEND_CHUNK_CHARS).split(" "));
    }
    // Mbajmë vetëm fjalët e para dhe i bashkojmë sërish me hapësirë
    return words.slice(0, count).join(" ");
  }

  /**
   * Sa fjalë janë shkruar deri tani: çdo hapësirë e kaluar mbyll një fjalë,
   * dhe fjala e fundit numërohet kur shkruhet karakteri i fundit i tekstit.
   * @returns {number} fjalët e shkruara
   */
  typedWords() {
    // Hapësirat mes pozicionit 0 dhe atij aktual
    const spaces = this.chars.slice(0, this.index).filter((char) => char === " ").length;
    // Plus 1 kur teksti është shkruar i gjithi (fjala e fundit s'ka hapësirë pas saj)
    return spaces + (this.index >= this.chars.length ? 1 : 0);
  }

  /**
   * Kursori ndalon pulsimin gjatë shkrimit dhe rinis pas 600ms pushim.
   * @returns {void}
   */
  markTyping() {
    // Kursori i plotë
    this.ui.setCaretTyping(true);
    // Fshijmë kohëmatësin e mëparshëm
    clearTimeout(this.idleTimeoutId);
    // Pas pushimit, kursori pulson sërish
    this.idleTimeoutId = setTimeout(() => this.ui.setCaretTyping(false), CARET_IDLE_MS);
  }

  // ---------------- TASTIERA ----------------

  /**
   * Keydown te fusha e fshehur: Backspace, Tab, Esc dhe tastet e bllokuara.
   * @param {KeyboardEvent} event - ngjarja
   * @returns {void}
   */
  handleKeydown(event) {
    // Çdo shtypje tregon edhe gjendjen e Caps Lock; e kontrollojmë para çdo gjëje tjetër
    this.updateCapsLock(event);
    // Gjatë një shkronje të përbërë, tastet i përkasin sistemit (p.sh. Backspace fshin shenjën ¨)
    if (event.isComposing) {
      return; // ndalojmë këtu, pjesa tjetër e funksionit nuk ekzekutohet
    }
    // Shift+Tab lejohet normalisht, që përdoruesi i tastierës të dalë nga fusha
    if (event.key === "Tab" && event.shiftKey) {
      return; // ndalojmë këtu, pjesa tjetër e funksionit nuk ekzekutohet
    }
    // Tab: rifillo testin
    if (event.key === "Tab") {
      // Ndalojmë lëvizjen e fokusit
      event.preventDefault();
      // Test i ri
      this.restart();
      // Dalim
      return;
    }
    // Esc: anulo
    if (event.key === "Escape") {
      // Ndalojmë sjelljen e parazgjedhur
      event.preventDefault();
      // Anulojmë
      this.cancel();
      // Dalim
      return;
    }
    // Backspace: një karakter mbrapa
    if (event.key === "Backspace") {
      // Ndalojmë shfletuesin (fusha është bosh gjithsesi)
      event.preventDefault();
      // E trajtojmë ne
      this.handleBackspace();
      // Dalim
      return;
    }
    // Shigjetat dhe Enter bllokohen
    if (BLOCKED_KEYS.has(event.key)) {
      // Ndalojmë sjelljen e parazgjedhur
      event.preventDefault();
    }
  }

  /**
   * Lexon gjendjen e Caps Lock nga një ngjarje tastiere dhe shfaq ose fsheh paralajmërimin.
   * getModifierState("CapsLock") kthen true kur Caps Lock është i ndezur.
   * @param {KeyboardEvent} event - ngjarja keydown ose keyup
   * @returns {void}
   */
  updateCapsLock(event) {
    // Disa tastiera virtuale dërgojnë ngjarje pa këtë funksion; atëherë s'mund të dimë asgjë
    if (typeof event.getModifierState !== "function") {
      return; // s'ka informacion për Caps Lock
    }
    // true kur Caps Lock është i ndezur
    this.ui.setCapsLock(event.getModifierState("CapsLock"));
  }

  /**
   * Keydown kudo në faqe. Nëse fokusi s'është te asnjë element (body) dhe
   * shtypet një tast me shkronjë, rikthejmë fokusin te testi. Shfletuesi
   * e fut atë shkronjë direkt te fusha, pra ajo numërohet.
   * @param {KeyboardEvent} event - ngjarja
   * @returns {void}
   */
  handleGlobalKeydown(event) {
    // Vetëm kur fokusi është te body (jo te një buton, lidhje ose fushë tjetër)
    if (event.target !== document.body) {
      return; // ndalojmë këtu, pjesa tjetër e funksionit nuk ekzekutohet
    }
    // event.key.length === 1: tast me karakter (jo Shift, F5, shigjeta etj.)
    const isCharacter = event.key.length === 1;
    // Ctrl ose Cmd: shkurtore të shfletuesit (p.sh. Ctrl+R); AltGr dërgon Ctrl+Alt, ai lejohet
    const isShortcut = event.metaKey || (event.ctrlKey && !event.altKey);
    // Nëse është karakter dhe jo shkurtore
    if (isCharacter && !isShortcut) {
      // Rikthejmë fokusin
      this.focusIfActive();
    }
  }

  /**
   * Vendos fokusin te fusha vetëm kur testi pret shkrim.
   * @returns {void}
   */
  focusIfActive() {
    // Vetëm në gjendjet ku shkruhet
    if (this.state === "ready" || this.state === "running") {
      // Fokusi te fusha
      this.ui.focusInput();
    }
  }

  // ---------------- CILËSIMET ----------------

  /**
   * Klikim te shiriti i cilësimeve.
   * @param {MouseEvent} event - ngjarja
   * @returns {void}
   */
  handleSettingsClick(event) {
    // Butoni i praktikës trajtohet veçmas, sepse nuk është cilësim i ruajtur
    const practiceButton = event.target.closest("#practice-toggle");
    // Nëse u klikua butoni i praktikës
    if (practiceButton) {
      // I çaktivizuar (pa të dhëna ose gjatë testit): s'bëjmë asgjë
      if (practiceButton.disabled) {
        return; // butoni i bllokuar nuk bën asgjë
      }
      // Ndezim ose fikim praktikën
      this.togglePractice(event.detail > 0);
      // Dalim, s'është cilësim tjetër
      return;
    }
    // closest gjen butonin e klikuar edhe nëse klikimi ra mbi një <span> brenda tij
    const button = event.target.closest("[data-setting]");
    // Klikim jashtë butonave ose buton i çaktivizuar
    if (!button || button.disabled) {
      return; // ndalojmë këtu, pjesa tjetër e funksionit nuk ekzekutohet
    }
    // Emri i cilësimit, p.sh. "level"
    const name = button.dataset.setting;
    // Vlera e re sipas llojit të cilësimit
    let value;
    // Kohëzgjatja është numër
    if (name === "duration") {
      // Number("30") jep 30
      value = Number(button.dataset.value);
    } else if (name === "lenient") { // çelësi ë/ç: vlera e re është e kundërta e asaj aktuale
      // Çelësi ndërron vlerën aktuale
      value = !this.settings.lenient;
    } else if (name === "words") { // numri i fjalëve është numër
      // Number("25") jep 25
      value = Number(button.dataset.value);
    } else if (name === "ghost") { // çelësi i garës: edhe ky ndërron vlerën aktuale
      // E kundërta e vlerës aktuale
      value = !this.settings.ghost;
    } else {
      // Niveli dhe gjuha janë tekst
      value = button.dataset.value;
    }
    // event.detail > 0 kur klikohet me miun ose me prekje; 0 kur aktivizohet me Enter/Space
    this.changeSetting(name, value, event.detail > 0);
  }

  /**
   * Ndryshon një cilësim, e ruan dhe rinis testin me tekst të ri.
   * @param {string} name - emri i cilësimit
   * @param {number|string|boolean} value - vlera e re
   * @param {boolean} viaPointer - true nëse u klikua me miun/prekje
   * @returns {void}
   */
  changeSetting(name, value, viaPointer) {
    // Gjatë testit cilësimet s'ndryshojnë
    if (this.state === "running") {
      return; // ndalojmë këtu, pjesa tjetër e funksionit nuk ekzekutohet
    }
    // Në praktikë, klikimi i çdo niveli (edhe atij që ishte zgjedhur) të kthen te testi normal
    const leavingPractice = name === "level" && this.practiceMode;
    // Me tekstin tënd, zgjedhja e një kohe, numri fjalësh ose niveli të kthen te tekstet e TypeFast
    const leavingCustom = Boolean(this.customText) && ["duration", "words", "level"].includes(name);
    // Cilësimet e reja: kopje e të vjetrave (spread) me vlerën e ndryshuar
    const next = { ...this.settings, [name]: value };
    // Zgjedhja e një kohe e bën testin me kohë; zgjedhja e një numri fjalësh e bën me fjalë
    if (name === "duration" || name === "words") {
      // "duration" -> "time", "words" -> "words"
      next.mode = name === "duration" ? "time" : "words";
    }
    // Nëse asgjë s'ndryshoi dhe nuk po dalim nga praktika, s'ka nevojë për test të ri
    // (JSON.stringify i kthen të dy objektet në tekst, që të krahasohen të gjitha fushat njëherësh)
    if (!leavingPractice && !leavingCustom && JSON.stringify(next) === JSON.stringify(this.settings)) {
      return; // ndalojmë këtu, pjesa tjetër e funksionit nuk ekzekutohet
    }
    // Zgjedhja e një niveli mbyll praktikën
    if (leavingPractice) {
      // Kthehemi te testi normal
      this.practiceMode = false;
    }
    // Zgjedhja e kohës, fjalëve ose nivelit mbyll tekstin tënd
    if (leavingCustom) {
      // Kthehemi te tekstet e TypeFast
      this.customText = null;
    }
    // Ruajmë cilësimet e reja
    this.settings = next;
    // Ruajmë në localStorage
    this.storage.saveSettings(this.settings);
    // Shënojmë zgjedhjen aktive
    this.ui.applySettings(this.settings, this.practiceMode, Boolean(this.customText));
    // Pa tekste s'mund të krijojmë test
    if (this.state === "loading" || this.state === "error") {
      return; // ndalojmë këtu, pjesa tjetër e funksionit nuk ekzekutohet
    }
    // Me gjuhë të re, shënimi i praktikës rifillon nga e para (mund të kishte mesazhin e gjuhës tjetër)
    if (name === "lang") {
      // Rifreskojmë butonin dhe shënimin e praktikës
      this.refreshPracticeAvailability();
    }
    // Test i ri me tekst të ri
    this.newTest();
    // Me miun: fokusi te testi, që të shkruash menjëherë. Me tastierë: fokusi mbetet te butoni.
    if (viaPointer) {
      // Fokusi te fusha
      this.ui.focusInput();
    }
  }

  // ---------------- PRAKTIKA E TASTEVE TË DOBËTA ----------------

  /**
   * Tastet më të dobëta nga numrat e të gjitha testeve, të renditura sipas shkallës së gabimit.
   * Hapësira përjashtohet: ajo del në çdo tekst, nuk mund të synohet me fjalë të veçanta.
   * @returns {{key: string, attempts: number, errors: number, rate: number}[]} deri në 5 taste
   */
  getWeakKeys() {
    // Renditja e pastër te Stats, me kufijtë nga config.js
    return Stats.rankWeakKeys(this.storage.getKeyStats(), {
      minAttempts: WEAK_KEY_MIN_ATTEMPTS, // të paktën 5 herë
      minErrors: WEAK_KEY_MIN_ERRORS, // të paktën 2 gabime
      limit: WEAK_KEY_LIMIT, // 5 më të dobëtat
      excludeSpace: true, // pa hapësirën
    });
  }

  /**
   * Tastet e dobëta si tekst për mesazhet, p.sh. "j · ë · q".
   * Ndarësi është pika e mesme dhe jo presja, sepse edhe presja mund të jetë tast i dobët.
   * @returns {string} lista e ndarë me pikë të mesme
   */
  weakKeysLabel() {
    // Marrim vetëm tastet dhe i bashkojmë me " · "
    return this.getWeakKeys().map((item) => item.key).join(" \u00B7 ");
  }

  /**
   * Përditëson butonin e praktikës: aktiv me listën e tasteve, ose i çaktivizuar me shpjegim.
   * @returns {void}
   */
  refreshPracticeAvailability() {
    // Tastet e dobëta tani
    const weakKeys = this.getWeakKeys();
    // Pa asnjë tast të dobët, praktika s'ka çfarë të praktikojë
    if (weakKeys.length === 0) {
      // Butoni i çaktivizuar me shpjegimin e ndershëm
      this.ui.setPracticeAvailability(false, MESSAGES.practiceNoData);
      // Dalim
      return;
    }
    // Butoni aktiv dhe shënimi me tastet reale
    this.ui.setPracticeAvailability(true, MESSAGES.practiceHint(this.weakKeysLabel()));
  }

  /**
   * Ndez ose fik praktikën nga butoni te shiriti i cilësimeve.
   * @param {boolean} viaPointer - true nëse u klikua me miun/prekje
   * @returns {void}
   */
  togglePractice(viaPointer) {
    // Gjatë testit ose pa tekste s'ndryshojmë asgjë
    if (this.state === "running" || this.state === "loading" || this.state === "error") {
      return; // ndalojmë këtu, pjesa tjetër e funksionit nuk ekzekutohet
    }
    // Rifreskojmë shënimin (mund të ketë mbetur mesazhi i një gjuhe tjetër)
    this.refreshPracticeAvailability();
    // Ndërrojmë modalitetin
    this.practiceMode = !this.practiceMode;
    // Praktika dhe teksti yt s'bashkohen: praktika e mbyll tekstin tënd
    this.customText = null;
    // Test i ri me tekstin e duhur
    this.newTest();
    // Me miun: fokusi te testi. Me tastierë: fokusi mbetet te butoni.
    if (viaPointer) {
      // Fokusi te fusha
      this.ui.focusInput();
    }
  }

  /**
   * Nis praktikën nga butoni te paneli i rezultatit.
   * @returns {void}
   */
  startPractice() {
    // Pa të dhëna ose gjatë testit, s'bëjmë asgjë
    if (!this.ui.practiceAvailable || this.state === "running") {
      return; // ndalojmë këtu, pjesa tjetër e funksionit nuk ekzekutohet
    }
    // Ndezim praktikën
    this.practiceMode = true;
    // Praktika e mbyll tekstin tënd
    this.customText = null;
    // Test i ri me tekstin e praktikës
    this.newTest();
    // Fokusi te fusha, që të shkruash menjëherë
    this.ui.focusInput();
  }

  // ---------------- LLOJI I TESTIT ----------------

  /**
   * Lloji aktual i testit: "custom" me tekstin tënd, përndryshe ai i cilësimeve ("time" ose "words").
   * @returns {string} lloji
   */
  activeMode() {
    // Teksti yt ka përparësi mbi cilësimet
    return this.customText ? "custom" : this.settings.mode;
  }

  /**
   * A mbaron testi aktual kur mbaron teksti (me fjalë ose me tekstin tënd)?
   * @returns {boolean} true nëse po
   */
  endsAtText() {
    // isTextLength kontrollon llojin
    return isTextLength({ mode: this.activeMode() });
  }

  /**
   * Sa fjalë ka teksti i testit: me tekstin tënd numërohen fjalët e tij, me fjalë është numri i zgjedhur.
   * @returns {number} fjalët gjithsej
   */
  totalWords() {
    // Teksti yt ndahet sipas hapësirës (hapësirat e tepërta janë hequr më parë)
    return this.customText ? this.customText.split(" ").length : this.settings.words;
  }

  // ---------------- TEKSTI YT ----------------

  /**
   * Pastron tekstin e përdoruesit (e pastër): ë e përbërë bëhet një karakter (NFC), çdo grup
   * hapësirash, rreshtash të rinj dhe tabulatorësh bëhet një hapësirë, dhe hiqen hapësirat në skaje.
   * @param {string} text - teksti ashtu siç u shkrua ose u ngjit
   * @returns {string} teksti i pastër
   */
  static normalizeCustom(text) {
    // \s+ = një ose më shumë karaktere bosh (hapësirë, rresht i ri, tabulator)
    return text.normalize("NFC").replace(/\s+/g, " ").trim();
  }

  /**
   * Hap dritaren "Teksti yt", me tekstin e fundit të shkruar aty.
   * @returns {void}
   */
  openCustomDialog() {
    // Gjatë testit ose pa tekste s'hapet
    if (this.state === "running" || this.state === "loading" || this.state === "error") {
      return; // s'lejohet tani
    }
    // Nëse teksti yt është aktiv, e vendosim në fushë që të ndryshohet lehtë
    if (this.customText) {
      // Teksti aktual
      this.custom.input.value = this.customText;
    }
    // Fshijmë gabimin e vjetër
    this.custom.error.textContent = "";
    // Numëruesi sipas tekstit në fushë
    this.updateCustomCount();
    // Fshijmë përgjigjen e mëparshme (Esc e mbyll pa e ndryshuar këtë vlerë)
    this.custom.dialog.returnValue = "";
    // Dritare modale
    this.custom.dialog.showModal();
    // Fokusi te fusha, që të shkruash ose ngjitësh menjëherë
    this.custom.input.focus();
  }

  /**
   * Përditëson numëruesin "120 / 2000 karaktere" dhe fsheh gabimin gjatë shkrimit.
   * @returns {void}
   */
  updateCustomCount() {
    // Karakteret pas pastrimit (Array.from numëron ë si një karakter)
    const count = Array.from(TypingTest.normalizeCustom(this.custom.input.value)).length;
    // Teksti i numëruesit
    this.custom.count.textContent = MESSAGES.customCount(count);
    // Gabimi i vjetër s'vlen më pasi teksti ndryshoi
    this.custom.error.textContent = "";
  }

  /**
   * Kontrolli kur klikohet një buton i formularit. "Anulo" mbyll pa kontroll; "Fillo me këtë tekst"
   * mbyll vetëm nëse teksti ka 20 deri në 2000 karaktere.
   * @param {SubmitEvent} event - ngjarja
   * @returns {void}
   */
  handleCustomSubmit(event) {
    // event.submitter është butoni që u klikua; "Anulo" s'ka nevojë për kontroll
    if (!event.submitter || event.submitter.value !== "confirm") {
      return; // mbyllet normalisht
    }
    // Teksti i pastër
    const text = TypingTest.normalizeCustom(this.custom.input.value);
    // Gjatësia në karaktere
    const length = Array.from(text).length;
    // Gabimi, nëse ka
    let error = "";
    // Shumë i shkurtër
    if (length < CUSTOM_MIN_CHARS) {
      // Mesazhi
      error = MESSAGES.customTooShort;
    } else if (length > CUSTOM_MAX_CHARS) { // shumë i gjatë
      // Mesazhi
      error = MESSAGES.customTooLong;
    }
    // Me gabim: dritarja mbetet e hapur dhe gabimi shfaqet
    if (error) {
      // preventDefault ndalon mbylljen e dritares
      event.preventDefault();
      // Mesazhi (role="alert" e lexon menjëherë)
      this.custom.error.textContent = error;
      // Fokusi kthehet te fusha, që të ndreqet teksti
      this.custom.input.focus();
      // Dalim
      return;
    }
    // Teksti është i vlefshëm: e ruajmë derisa dritarja të mbyllet
    this.pendingCustom = text;
  }

  /**
   * Pas mbylljes së dritares: nëse u konfirmua, nis testi me tekstin tënd.
   * @returns {void}
   */
  handleCustomClose() {
    // Teksti që priste
    const text = this.pendingCustom;
    // S'pret më
    this.pendingCustom = null;
    // "Anulo" ose Esc: asgjë s'ndryshon
    if (this.custom.dialog.returnValue !== "confirm" || !text) {
      return; // u anulua
    }
    // Teksti yt aktiv
    this.customText = text;
    // Praktika mbyllet, s'bashkohen
    this.practiceMode = false;
    // Test i ri me këtë tekst
    this.newTest();
    // Fokusi te fusha e testit
    this.ui.focusInput();
  }

  /**
   * "Shkarko rezultatin": vizaton dhe shkarkon foton e rezultatit të fundit.
   * @returns {void}
   */
  downloadResult() {
    // Pa rezultat s'ka çfarë të shkarkohet
    if (!this.lastResult) {
      return; // asnjë test i mbaruar
    }
    // Fotoja PNG me ngjyrat e temës aktuale
    ResultImage.download(this.lastResult.entry, { isRecord: this.lastResult.isRecord });
  }

  // ---------------- GARA ME REKORDIN ----------------

  /**
   * Përgatit garën për testin e ri: gjen rekordin e kombinimit, vendos nëse gara
   * është aktive, shfaq shënimin e duhur dhe e çon kursorin gri në fillim.
   * Gara është aktive vetëm kur: çelësi është i ndezur, s'jemi në praktikë dhe ekziston një rekord.
   * @returns {void}
   */
  setupGhost() {
    // Ndalojmë ciklin e mëparshëm nëse po ecte
    cancelAnimationFrame(this.ghostFrameId);
    // Rekordi i ruajtur për këtë gjuhë, nivel dhe kohë (undefined nëse s'ka)
    const record = this.storage.getRecords()[StorageService.recordKey(this.settings.lang, this.settings.level, lengthKey(this.settings))];
    // Shënimi poshtë çelësit, sipas rastit
    let hint;
    // Me tekstin tënd s'ka rekord për të garuar
    if (this.customText) {
      // Shpjegojmë pse
      hint = MESSAGES.ghostCustom;
    } else if (this.practiceMode) { // në praktikë s'ka rekord për të garuar
      // Shpjegojmë pse
      hint = MESSAGES.ghostPractice;
    } else if (!record) { // pa rekord për këtë kombinim
      // Shpjegojmë që duhet një test i mbaruar
      hint = MESSAGES.ghostNoRecord;
    } else {
      // Tregojmë rekordin real
      hint = MESSAGES.ghostHint(record.wpm);
    }
    // Gara është aktive vetëm kur plotësohen të tri kushtet
    const active = this.settings.ghost && !this.practiceMode && !this.customText && Boolean(record);
    // Ruajmë shpejtësinë e rekordit, ose null kur gara s'është aktive
    this.ghostWpm = active ? record.wpm : null;
    // Shfaqim ose fshehim kursorin gri dhe statistikën, me shënimin
    this.ui.setGhost(active, hint);
    // Kursori gri te shkronja e parë
    this.ui.updateGhost(0);
    // Diferenca fillestare është 0
    this.ui.updateGhostLead(0);
  }

  /**
   * Sa karaktere do të kishte shkruar tani dikush që shkruan pa gabime me shpejtësinë e rekordit.
   * Është formula e WPM e kthyer mbrapsht: karaktere = WPM x 5 x minuta.
   * @returns {number} numri i karaktereve (0 kur gara s'është aktive)
   */
  getGhostChars() {
    // Pa garë, kursori gri s'ka pozicion
    if (this.ghostWpm === null) {
      return 0; // gara s'është aktive
    }
    // Minutat e kaluara nga ora e saktë e kohëmatësit
    const minutes = this.timer.getElapsedSeconds() / 60;
    // Math.floor: vetëm karaktere të plota
    return Math.floor(this.ghostWpm * CHARS_PER_WORD * minutes);
  }

  /**
   * Një kornizë e garës: lëviz kursorin gri, përditëson diferencën dhe kërkon kornizën tjetër.
   * requestAnimationFrame e thërret këtë para çdo vizatimi të ekranit (rreth 60 herë në sekondë),
   * prandaj lëvizja është e butë dhe ndalon vetë kur skeda s'është e dukshme.
   * @returns {void}
   */
  runGhostFrame() {
    // Ku është rekordi tani
    const ghostChars = this.getGhostChars();
    // Lëvizim kursorin gri
    this.ui.updateGhost(ghostChars);
    // Diferenca: karakteret e tua të sakta minus ato të rekordit
    this.ui.updateGhostLead(this.stats.correctCharsInPlace - ghostChars);
    // Kërkojmë kornizën tjetër dhe ruajmë id-në, që ta ndalojmë te finish() ose cancel()
    this.ghostFrameId = requestAnimationFrame(() => this.runGhostFrame());
  }

  // ---------------- KOHA DHE STATISTIKAT ----------------

  /**
   * Thirret nga Timer çdo 100ms.
   * @param {number} remaining - sekonda të mbetura
   * @param {number} elapsed - sekonda të kaluara
   * @returns {void}
   */
  handleTick(remaining, elapsed) {
    // Përditësojmë numrat
    this.updateLiveStats(remaining, elapsed);
    // Sa sekonda të plota kanë kaluar (p.sh. 7.3 -> 7)
    const wholeSeconds = Math.floor(elapsed);
    // Marrim një mostër për çdo sekondë të re. while (jo if): nëse skeda ishte në sfond
    // dhe kaluan disa sekonda pa tik, i marrim të gjitha që të mos mungojë asnjë.
    while (this.sampledSeconds < wholeSeconds) {
      // Sekonda e radhës
      this.sampledSeconds += 1;
      // Stats ruan WPM, shpejtësinë e çastit dhe gabimet e kësaj sekonde
      this.stats.takeSample(this.sampledSeconds);
    }
  }

  /**
   * Përditëson kohën, WPM dhe saktësinë në faqe.
   * @param {number} remaining - sekonda të mbetura
   * @param {number} elapsed - sekonda të kaluara
   * @returns {void}
   */
  updateLiveStats(remaining, elapsed) {
    // Numri i parë: me fjalë "3 / 25"; me kohë sekondat e mbetura
    // (Math.ceil: 29.3 sekonda shfaqen si 30, që 0 të dalë vetëm kur koha mbaron)
    const primary = this.endsAtText() ? `${this.typedWords()} / ${this.totalWords()}` : String(Math.ceil(remaining));
    // I kalojmë vlerat te ndërfaqja
    this.ui.updateLiveStats({
      primary, // teksti i numrit të parë
      wpm: this.stats.getLiveWpm(elapsed), // WPM deri tani (0 në sekondën e parë)
      accuracy: this.stats.getAccuracy(), // saktësia deri tani
    });
  }

  /**
   * Ndryshimi i madhësisë: rillogaritim kursorin një herë për kornizë (frame).
   * @returns {void}
   */
  handleResize() {
    // Anulojmë kërkesën e mëparshme nëse ende s'është ekzekutuar
    cancelAnimationFrame(this.resizeFrameId);
    // requestAnimationFrame ekzekuton para vizatimit të radhës, pra maksimumi 60 herë në sekondë
    this.resizeFrameId = requestAnimationFrame(() => {
      // Vetëm kur teksti është në ekran
      if (this.state === "ready" || this.state === "running") {
        // Rimatim dhe vendosim kursorin
        this.ui.refreshLayout(this.index);
        // Edhe kursori gri duhet rivendosur, sepse shkronjat kanë ndërruar vend
        this.ui.updateGhost(this.getGhostChars());
      }
    });
  }
}
