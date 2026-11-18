/**
 * ===========================================================================
 * guide.js
 * ---------------------------------------------------------------------------
 * Çfarë bën: zhvillon një mësim të kursit "Mësimet" brenda një dritareje
 * <dialog>. Faqja e mësimeve (mesimet.html) e hap kur klikohet një mësim i
 * hapur në rrugë, ose prova e një kapitulli.
 *   - teksti i mësimit ndahet në pjesë; çdo pjesë shfaqet si rresht katrorësh
 *   - përdoruesi shtyp tastin e katrorit aktual
 *   - tasti i saktë kërcen dhe bëhet jeshil; tasti i gabuar e dridh rreshtin
 *   - fjalia poshtë tregon gishtin (dhe Shift-in për shkronjat e mëdha)
 *   - tastiera e vogël e ndriçon tastin
 *   - kur mbaron mësimi, shënohet si i kryer dhe hapet vetë mësimi tjetër
 *   - prova e kapitullit: me të paktën 90% saktësi, gjithë kapitulli shënohet i kryer
 * Animacionet janë në CSS (animations.css); JavaScript vetëm shton dhe heq klasa.
 * Shtypjet lexohen nga një fushë e fshehur me ngjarjen "input", si te testi.
 *
 * Çfarë eksporton: klasën TypingGuide.
 * Kush e përdor: js/pages/lessons-page.js.
 * ===========================================================================
 */

// Kohët, kufiri i provës, tastierat dhe mesazhet
import {
  GUIDE_CHUNK_SIZE, // sa katrorë shfaqen njëherësh
  GUIDE_CHUNK_MS, // pritja mes dy pjesëve
  GUIDE_ADVANCE_MS, // pritja para mësimit tjetër
  GUIDE_PASS_ACCURACY, // saktësia minimale për të kaluar provën (90)
  KEYBOARD_LAYOUTS, // rreshtat e tastierave për tastierën e vogël
  MESSAGES, // mesazhet në shqip
} from "../config.js"; // skedari nga vijnë të gjitha
// Logjika e kursit (ndarja në pjesë)
import { Course } from "./course.js";

/**
 * Tastet me vijë të ngritur në çdo tastierë: gishtat tregues i gjejnë me prekje.
 * @type {Set<string>}
 */
const BUMP_KEYS = new Set(["f", "j"]);

/**
 * Drejtuesi i një mësimi ose i një prove kapitulli.
 */
export class TypingGuide {
  /**
   * Gjen elementët e dritares dhe lidh ngjarjet. Nuk e hap dritaren.
   * @param {object} options - opsionet
   * @param {Course} options.course - kursi (përparimi, kyçja, gishtat)
   * @param {() => void} [options.onProgress] - thirret sa herë ndryshon përparimi (faqja rivizaton rrugën)
   */
  constructor({ course, onProgress = () => {} }) {
    // Kursi
    this.course = course;
    // Funksioni që thirret kur kryhet një mësim
    this.onProgress = onProgress;

    // ---- Elementët e dritares ----
    this.dialog = document.getElementById("guide"); // dritarja
    this.closeButton = document.getElementById("guide-close"); // butoni X
    this.countEl = document.getElementById("guide-count"); // numëruesi
    this.barEl = document.getElementById("guide-bar"); // vija e përparimit të mësimit
    this.titleEl = document.getElementById("guide-title"); // titulli
    this.textEl = document.getElementById("guide-text"); // shpjegimi
    this.lessonEl = document.getElementById("guide-lesson"); // skena, ndihmat dhe tastiera e vogël
    this.keysEl = document.getElementById("guide-keys"); // rreshti i katrorëve
    this.input = document.getElementById("guide-input"); // fusha e fshehur
    this.capsEl = document.getElementById("guide-caps"); // paralajmërimi i Caps Lock
    this.fingerEl = document.getElementById("guide-finger"); // fjalia e gishtit
    this.keyboardEl = document.getElementById("guide-keyboard"); // tastiera e vogël
    this.prevButton = document.getElementById("guide-prev"); // "Mësimi i mëparshëm"
    this.retryButton = document.getElementById("guide-retry"); // "Provo përsëri"
    this.nextChapterButton = document.getElementById("guide-next-chapter"); // "Kapitulli tjetër"
    this.backButton = document.getElementById("guide-back"); // "Kthehu te rruga"
    this.testLink = document.getElementById("guide-test"); // "Shko te testi"

    // ---- Gjendja ----
    this.mode = "lesson"; // "lesson" = mësim i zakonshëm, "checkpoint" = prova e kapitullit
    this.lesson = null; // mësimi aktual (në mënyrën "lesson")
    this.chapter = null; // kapitulli aktual
    this.chunks = []; // pjesët e tekstit, secila si varg karakteresh
    this.chunkIndex = 0; // pjesa aktuale
    this.keyIndex = 0; // katrori që duhet shtypur tani
    this.keyEls = []; // katrorët e pjesës aktuale
    this.errors = 0; // shtypjet e gabuara (për saktësinë e provës)
    this.typedChars = 0; // karakteret e shtypura saktë
    this.timeoutId = null; // id e setTimeout që kalon te pjesa ose mësimi tjetër
    this.capsLockOn = false; // gjendja e fundit e Caps Lock e shfaqur

    // Lidhim ngjarjet
    this.bindEvents();
  }

  /**
   * Lidh dëgjuesit e ngjarjeve të dritares.
   * @returns {void}
   */
  bindEvents() {
    // Butoni X e mbyll dritaren
    this.closeButton.addEventListener("click", () => this.dialog.close());
    // "Kthehu te rruga" e mbyll dritaren
    this.backButton.addEventListener("click", () => this.dialog.close());
    // "close" ndodh sido që të mbyllet dritarja (X, Esc, butoni): ndalojmë pritjet
    this.dialog.addEventListener("close", () => clearTimeout(this.timeoutId));
    // "input": shfletuesi ka futur një shkronjë te fusha e fshehur
    this.input.addEventListener("input", (event) => this.handleInput(event));
    // "compositionend": mbaroi një shkronjë e përbërë (p.sh. ¨ + e = ë)
    this.input.addEventListener("compositionend", () => this.consumeInput());
    // Ngjitja e tekstit nuk lejohet në mësime
    this.input.addEventListener("paste", (event) => event.preventDefault());
    // Keydown: Caps Lock dhe rikthimi i fokusit te fusha
    this.dialog.addEventListener("keydown", (event) => this.handleKeydown(event));
    // Keyup: disa shfletues e raportojnë gjendjen e re të Caps Lock vetëm pas lëshimit të tastit
    this.dialog.addEventListener("keyup", (event) => this.updateCapsLock(event));
    // Kur mbaron dridhja e rreshtit, heqim klasat e saj
    this.keysEl.addEventListener("animationend", (event) => this.handleAnimationEnd(event));
    // Klikimi në skenë e rikthen fokusin te fusha (nëse ishte humbur)
    this.lessonEl.addEventListener("click", () => this.input.focus({ preventScroll: true }));
    // "Mësimi i mëparshëm"
    this.prevButton.addEventListener("click", () => this.openPrevious());
    // "Provo përsëri": rinis provën ose mësimin
    this.retryButton.addEventListener("click", () => this.restart());
    // "Kapitulli tjetër": mësimi i parë i kapitullit pasardhës
    this.nextChapterButton.addEventListener("click", () => this.openNextChapter());
  }

  // ---------------- HAPJA ----------------

  /**
   * Hap dritaren nëse s'është e hapur.
   * @returns {void}
   */
  showDialog() {
    // showModal hedh gabim nëse dritarja është tashmë e hapur, prandaj kontrollojmë
    if (!this.dialog.open) {
      // Dritare modale: pjesa tjetër e faqes bllokohet dhe Esc e mbyll
      this.dialog.showModal();
    }
  }

  /**
   * Nis një mësim. Mësimet e kyçura nuk niset.
   * @param {string} id - id e mësimit
   * @returns {void}
   */
  openLesson(id) {
    // Mësimi në tastierën aktuale
    const lesson = this.course.findLesson(id);
    // Mësim që s'ekziston ose është i kyçur: s'bëjmë asgjë
    if (!lesson || !this.course.isUnlocked(id)) {
      return; // mësimi s'mund të niset
    }
    // Mënyra e zakonshme
    this.mode = "lesson";
    // Ruajmë mësimin
    this.lesson = lesson;
    // Dhe kapitullin e tij
    this.chapter = this.course.findChapter(lesson.chapterId);
    // Hapim dritaren
    this.showDialog();
    // Nisim
    this.restart();
  }

  /**
   * Nis provën e një kapitulli: teksti i mësimit të tij të fundit, pa ndihmën e kalimit automatik.
   * @param {string} chapterId - id e kapitullit
   * @returns {void}
   */
  openCheckpoint(chapterId) {
    // Kapitulli
    const chapter = this.course.findChapter(chapterId);
    // Nëse s'ekziston, s'bëjmë asgjë
    if (!chapter) {
      return; // asgjë për të nisur
    }
    // Mënyra e provës
    this.mode = "checkpoint";
    // S'ka mësim të vetëm
    this.lesson = null;
    // Ruajmë kapitullin
    this.chapter = chapter;
    // Hapim dritaren
    this.showDialog();
    // Nisim
    this.restart();
  }

  /**
   * Nis (ose rinis) mësimin ose provën aktuale nga pjesa e parë.
   * @returns {void}
   */
  restart() {
    // Ndalojmë çdo pritje të mbetur
    clearTimeout(this.timeoutId);
    // Numrat e saktësisë nga zero
    this.errors = 0;
    // Karakteret e shtypura nga zero
    this.typedChars = 0;
    // Në provë: teksti i mësimit të fundit të kapitullit. Në mësim: teksti i mësimit
    const keys = this.mode === "checkpoint" ? this.chapter.lessons[this.chapter.lessons.length - 1].keys : this.lesson.keys;
    // Titulli dhe shpjegimi
    this.titleEl.textContent = this.mode === "checkpoint" ? MESSAGES.guideCheckpointTitle(this.chapter.number) : this.lesson.title;
    // Shpjegimi
    this.textEl.textContent = this.mode === "checkpoint" ? MESSAGES.guideCheckpointText : this.lesson.text;
    // Ndajmë tekstin në pjesë me nga 9 karaktere
    this.chunks = Course.splitChunks(keys, GUIDE_CHUNK_SIZE);
    // Nisim nga pjesa e parë
    this.chunkIndex = 0;
    // Shfaqim pamjen e mësimit
    this.showButtons("lesson");
    // Vizatojmë pjesën
    this.renderChunk();
  }

  // ---------------- PAMJET ----------------

  /**
   * Shfaq vetëm butonat dhe pjesët që i përkasin pamjes.
   * @param {"lesson"|"result-lesson"|"result-pass"|"result-fail"|"result-end"} view - pamja
   * @returns {void}
   */
  showButtons(view) {
    // A jemi në pamjen e mësimit (me katrorë)
    const isLesson = view === "lesson";
    // Skena, ndihmat dhe tastiera e vogël shfaqen vetëm gjatë mësimit
    this.lessonEl.hidden = !isLesson;
    // "Mësimi i mëparshëm": vetëm gjatë një mësimi të zakonshëm
    this.prevButton.hidden = !(isLesson && this.mode === "lesson");
    // I çaktivizuar kur s'ka mësim para këtij
    this.prevButton.disabled = !this.previousLesson();
    // "Provo përsëri": gjatë provës dhe kur prova s'kalohet
    this.retryButton.hidden = !(view === "result-fail" || (isLesson && this.mode === "checkpoint"));
    // "Kapitulli tjetër": kur mbaron një kapitull ose kalohet prova (dhe ka kapitull tjetër)
    this.nextChapterButton.hidden = !((view === "result-lesson" || view === "result-pass") && this.nextChapter());
    // "Shko te testi": kur mbaron gjithë kursi
    this.testLink.hidden = view !== "result-end";
  }

  /**
   * Vizaton pjesën aktuale: numëruesi, vija e përparimit, katrorët, gishti dhe tastiera.
   * @returns {void}
   */
  renderChunk() {
    // Katrori i parë i pjesës
    this.keyIndex = 0;
    // Numëruesi: "Kapitulli 1 · Mësimi 3 nga 8 · Pjesa 2 nga 3" ose për provën
    this.countEl.textContent = this.mode === "checkpoint"
      ? MESSAGES.guideCheckpointCount(this.chapter.number, this.chunkIndex + 1, this.chunks.length)
      : MESSAGES.guideCount(this.chapter.number, this.chapter.lessons.indexOf(this.lesson) + 1, this.chapter.lessons.length, this.chunkIndex + 1, this.chunks.length);
    // Përparimi brenda mësimit: sa pjesë janë mbaruar (nga 0 në 1)
    this.setProgress(this.chunkIndex / this.chunks.length);
    // Krijojmë katrorët
    this.renderKeys(this.chunks[this.chunkIndex]);
    // Shënojmë katrorin aktual
    this.updateCurrent();
    // Fokusi te fusha e fshehur, që shtypjet të kapen menjëherë
    this.input.focus({ preventScroll: true });
  }

  /**
   * Vendos gjatësinë e vijës së përparimit.
   * @param {number} value - nga 0 deri në 1
   * @returns {void}
   */
  setProgress(value) {
    // CSS e lexon --progress dhe e kthen në gjatësi me scaleX
    this.barEl.style.setProperty("--progress", String(value));
  }

  /**
   * Krijon një katror për çdo karakter të pjesës. Rikrijimi bën që animacioni i
   * hyrjes (CSS) të luhet nga e para në çdo pjesë.
   * @param {string[]} chars - karakteret e pjesës
   * @returns {void}
   */
  renderKeys(chars) {
    // Fshijmë katrorët e vjetër
    this.keysEl.textContent = "";
    // Krijojmë katrorët dhe i ruajmë në varg
    this.keyEls = chars.map((char, index) => {
      // <span class="guide-key">
      const el = document.createElement("span");
      // Klasa bazë
      el.className = "guide-key";
      // Numri i katrorit: CSS e përdor për vonesën e hyrjes (njëri pas tjetrit)
      el.style.setProperty("--key-index", String(index));
      // Hapësira shfaqet me fjalë dhe është më e gjerë
      if (char === " ") {
        // Klasa e katrorit të gjerë
        el.classList.add("guide-key--space");
        // Fjala në vend të karakterit
        el.textContent = MESSAGES.space;
      } else {
        // Karakteri ashtu siç duhet shtypur (i madh ose i vogël)
        el.textContent = char;
      }
      // E shtojmë te rreshti
      this.keysEl.append(el);
      // E kthejmë, që map ta fusë te vargu
      return el;
    });
  }

  /**
   * Shënon katrorin aktual dhe përditëson fjalinë e gishtit dhe tastierën e vogël.
   * @returns {void}
   */
  updateCurrent() {
    // Karakteri që pritet tani
    const char = this.chunks[this.chunkIndex][this.keyIndex];
    // Vetëm katrori në pozicionin keyIndex merr klasën "aktual"
    this.keyEls.forEach((el, index) => el.classList.toggle("guide-key--current", index === this.keyIndex));
    // Gishti dhe Shift-i për këtë karakter
    const info = this.course.fingerFor(char);
    // Emri i tastit: "Hapësira" ose vetë karakteri
    const keyName = char === " " ? MESSAGES.space : char;
    // Me Shift: fjalia me Shift-in; pa Shift: fjalia e zakonshme
    this.fingerEl.textContent = info.shift ? MESSAGES.guideFingerShift(keyName, info.finger, info.shift) : MESSAGES.guideFinger(keyName, info.finger);
    // E ndriçojmë te tastiera e vogël
    this.renderKeyboard(char.toLowerCase(), info.shiftSide);
  }

  /**
   * Vizaton tastierën e vogël: katër rreshtat, Shift-et dhe hapësirën, me tastin aktual të ndriçuar.
   * @param {string} target - tasti që duhet shtypur (shkronjë e vogël, ose " ")
   * @param {"left"|"right"|null} shiftSide - cili Shift duhet mbajtur, ose null
   * @returns {void}
   */
  renderKeyboard(target, shiftSide) {
    // Tastiera e zgjedhur
    const layout = KEYBOARD_LAYOUTS.find((item) => item.id === this.course.layout) || KEYBOARD_LAYOUTS[0];
    // Fshijmë tastierën e vjetër
    this.keyboardEl.textContent = "";
    // Rreshtat e shkronjave plus një rresht me hapësirën
    const rows = [...layout.rows, " "];
    // Pozicioni i rreshtit të poshtëm (ai ku vihen Shift-et)
    const bottomIndex = layout.rows.length - 1;
    // Krijojmë çdo rresht
    rows.forEach((rowText, rowIndex) => {
      // Rreshti
      const row = document.createElement("div");
      // Klasa e rreshtit
      row.className = "mini-keyboard__row";
      // Rreshti i poshtëm nis me Shift-in e majtë
      if (rowIndex === bottomIndex) {
        // Tasti Shift i majtë, i ndriçuar kur duhet
        row.append(TypingGuide.createMiniKey("Shift", { shift: true, target: shiftSide === "left" }));
      }
      // Një tast për çdo karakter të rreshtit
      Array.from(rowText).forEach((char) => {
        // Tasti: i gjerë për hapësirën, me vijë për F dhe J, i ndriçuar kur është tasti aktual
        row.append(TypingGuide.createMiniKey(char === " " ? "" : char, { wide: char === " ", bump: BUMP_KEYS.has(char), target: char === target }));
      });
      // Rreshti i poshtëm mbaron me Shift-in e djathtë
      if (rowIndex === bottomIndex) {
        // Tasti Shift i djathtë
        row.append(TypingGuide.createMiniKey("Shift", { shift: true, target: shiftSide === "right" }));
      }
      // Rreshti futet te tastiera
      this.keyboardEl.append(row);
    });
  }

  /**
   * Krijon një tast të tastierës së vogël.
   * @param {string} label - teksti i tastit
   * @param {{wide?: boolean, bump?: boolean, shift?: boolean, target?: boolean}} flags - pamja e tastit
   * @returns {HTMLSpanElement} tasti
   */
  static createMiniKey(label, { wide = false, bump = false, shift = false, target = false }) {
    // <span class="mini-key">
    const key = document.createElement("span");
    // Klasa bazë
    key.className = "mini-key";
    // Teksti
    key.textContent = label;
    // classList.toggle me argument të dytë shton klasën vetëm kur vlera është true
    key.classList.toggle("mini-key--wide", wide);
    // Vija e ngritur e F dhe J
    key.classList.toggle("mini-key--bump", bump);
    // Tasti Shift (më i gjerë)
    key.classList.toggle("mini-key--shift", shift);
    // Tasti që duhet shtypur tani
    key.classList.toggle("mini-key--target", target);
    // E kthejmë
    return key;
  }

  // ---------------- SHTYPJET ----------------

  /**
   * Ngjarja "input" e fushës së fshehur.
   * @param {InputEvent} event - ngjarja
   * @returns {void}
   */
  handleInput(event) {
    // Gjatë një shkronje të përbërë presim compositionend
    if (event.isComposing) {
      return; // ende s'ka shkronjë të plotë
    }
    // Lexojmë dhe pastrojmë fushën
    this.consumeInput();
  }

  /**
   * Lexon çfarë u shkrua te fusha, e pastron dhe përpunon çdo karakter.
   * @returns {void}
   */
  consumeInput() {
    // Teksti i futur
    const value = this.input.value;
    // Fusha mbetet gjithmonë bosh
    this.input.value = "";
    // normalize("NFC") bashkon shkronjën me shenjën e saj (ë); Array.from i ndan në karaktere
    Array.from(value.normalize("NFC")).forEach((char) => this.pressKey(char));
  }

  /**
   * Përpunon një tast të shtypur. Krahasimi është i saktë: "A" dhe "a" janë të ndryshme,
   * sepse kapitulli 4 mëson pikërisht shkronjat e mëdha.
   * @param {string} char - karakteri i shtypur
   * @returns {void}
   */
  pressKey(char) {
    // Pjesa aktuale (undefined kur jemi në pamjen e rezultatit)
    const chunk = this.chunks[this.chunkIndex];
    // Pa pjesë, ose kur pjesa ka mbaruar dhe po pritet tjetra, shtypjet injorohen
    if (this.lessonEl.hidden || !chunk || this.keyIndex >= chunk.length) {
      return; // s'ka katror për të shtypur
    }
    // Karakteri që pritet
    const expected = chunk[this.keyIndex];
    // Katrori aktual
    const el = this.keyEls[this.keyIndex];
    // Gabim
    if (char !== expected) {
      // Numërojmë gabimin (për saktësinë e provës)
      this.errors += 1;
      // Nëse ndryshon vetëm madhësia e shkronjës, e themi qartë
      if (char.toLowerCase() === expected.toLowerCase()) {
        // Fjalia e gishtit zëvendësohet përkohësisht me këshillën për Shift dhe Caps Lock
        this.fingerEl.textContent = MESSAGES.guideCaseHint;
      }
      // Katrori i kuq dhe rreshti dridhet
      this.showWrong(el);
      // Mbetemi te i njëjti katror
      return;
    }
    // I saktë: një karakter më shumë
    this.typedChars += 1;
    // Katrori s'është më "aktual" as "gabim"
    el.classList.remove("guide-key--current", "guide-key--wrong");
    // Bëhet jeshil dhe kërcen (CSS)
    el.classList.add("guide-key--done");
    // Katrori tjetër
    this.keyIndex += 1;
    // Nëse ka ende katrorë në këtë pjesë
    if (this.keyIndex < chunk.length) {
      // Shënojmë katrorin e ri aktual
      this.updateCurrent();
      // Dalim
      return;
    }
    // Pjesa mbaroi: vija e përparimit zgjatet
    this.setProgress((this.chunkIndex + 1) / this.chunks.length);
    // Nëse ka pjesë tjetër, e shfaqim pas një pritjeje të shkurtër
    if (this.chunkIndex < this.chunks.length - 1) {
      // Pjesa tjetër pas 350ms
      this.timeoutId = setTimeout(() => {
        // Pjesa e radhës
        this.chunkIndex += 1;
        // E vizatojmë
        this.renderChunk();
      }, GUIDE_CHUNK_MS);
      // Dalim
      return;
    }
    // Mbaroi i gjithë teksti
    this.timeoutId = setTimeout(() => this.finish(), GUIDE_ADVANCE_MS);
  }

  /**
   * Mbarimi i mësimit ose i provës.
   * @returns {void}
   */
  finish() {
    // Prova e kapitullit ka rregullat e veta
    if (this.mode === "checkpoint") {
      // Llogaritja e saktësisë
      this.finishCheckpoint();
      // Dalim
      return;
    }
    // Shënojmë mësimin si të kryer
    this.course.markDone([this.lesson.id]);
    // Faqja rivizaton rrugën
    this.onProgress();
    // Mësimi tjetër në rrugë
    const next = this.course.lessonAfter(this.lesson.id);
    // Nëse ka mësim tjetër në të njëjtin kapitull, kalojmë direkt te ai
    if (next && next.chapterId === this.lesson.chapterId) {
      // Mësimi tjetër (sapo u hap, sepse ky u krye)
      this.openLesson(next.id);
      // Dalim
      return;
    }
    // Mbaroi kapitulli (ose gjithë kursi)
    this.showResult(next ? "result-lesson" : "result-end");
  }

  /**
   * SAKTËSIA E PROVËS: karaktere të sakta / (karaktere të sakta + gabime) x 100.
   * Me të paktën 90%, të gjitha mësimet e kapitullit shënohen si të kryera.
   * @returns {void}
   */
  finishCheckpoint() {
    // Të gjitha shtypjet: të saktat plus gabimet
    const total = this.typedChars + this.errors;
    // Përqindja e rrumbullakuar (total s'është kurrë 0, sepse teksti ka karaktere)
    const accuracy = Math.round((this.typedChars / total) * 100);
    // A u kalua prova
    const passed = accuracy >= GUIDE_PASS_ACCURACY;
    // Kur kalohet, gjithë kapitulli shënohet i kryer dhe faqja rivizaton rrugën
    if (passed) {
      // Të gjitha id-të e kapitullit
      this.course.markDone(this.chapter.lessons.map((lesson) => lesson.id));
      // Rruga përditësohet
      this.onProgress();
    }
    // Teksti i rezultatit me saktësinë reale
    this.showResult(passed ? "result-pass" : "result-fail", accuracy);
  }

  /**
   * Shfaq ekranin e rezultatit: fundi i kapitullit, fundi i kursit, ose rezultati i provës.
   * @param {"result-lesson"|"result-end"|"result-pass"|"result-fail"} view - cili rezultat
   * @param {number} [accuracy=0] - saktësia e provës
   * @returns {void}
   */
  showResult(view, accuracy = 0) {
    // Vija e përparimit plot
    this.setProgress(1);
    // Numëruesi tregon kapitullin
    this.countEl.textContent = MESSAGES.guideChapterTitle(this.chapter.number, this.chapter.title);
    // Titulli dhe teksti sipas rezultatit
    const texts = {
      "result-lesson": [MESSAGES.guideChapterDone(this.chapter.number), MESSAGES.guideChapterEndText], // kapitull i mbaruar
      "result-end": [MESSAGES.guideEndTitle, MESSAGES.guideEndText], // kurs i mbaruar
      "result-pass": [MESSAGES.guideCheckpointPassTitle, MESSAGES.guideCheckpointPass(accuracy)], // prova u kalua
      "result-fail": [MESSAGES.guideCheckpointFailTitle, MESSAGES.guideCheckpointFail(accuracy)], // prova s'u kalua
    }[view];
    // Titulli
    this.titleEl.textContent = texts[0];
    // Teksti
    this.textEl.textContent = texts[1];
    // Butonat e kësaj pamjeje
    this.showButtons(view);
    // Fokusi te butoni më i dobishëm: kapitulli tjetër, provo përsëri, testi, ose kthimi te rruga
    const focusTarget = [this.nextChapterButton, this.retryButton, this.testLink, this.backButton].find((button) => !button.hidden);
    // Fokusi
    focusTarget.focus();
  }

  /**
   * Tregon që u shtyp tasti i gabuar: katrori i kuq dhe dridhja e rreshtit.
   * @param {HTMLElement} el - katrori aktual
   * @returns {void}
   */
  showWrong(el) {
    // Katrori bëhet i kuq
    el.classList.add("guide-key--wrong");
    // Heqim klasën e dridhjes, në rast se dridhja e mëparshme s'ka mbaruar
    this.keysEl.classList.remove("guide__keys--shake");
    // Leximi i offsetWidth e detyron shfletuesin ta vërejë heqjen; pa këtë animacioni s'rifillon
    void this.keysEl.offsetWidth;
    // E shtojmë sërish: animacioni nis nga e para
    this.keysEl.classList.add("guide__keys--shake");
  }

  /**
   * Kur mbaron dridhja, heqim klasën e saj dhe të kuqen nga katrorët.
   * @param {AnimationEvent} event - ngjarja e fundit të një animacioni
   * @returns {void}
   */
  handleAnimationEnd(event) {
    // Na intereson vetëm dridhja e rreshtit
    if (event.animationName !== "guide-shake") {
      return; // animacion tjetër
    }
    // Rreshti s'dridhet më
    this.keysEl.classList.remove("guide__keys--shake");
    // Katrorët kthehen në ngjyrën e tyre
    this.keyEls.forEach((el) => el.classList.remove("guide-key--wrong"));
  }

  /**
   * Keydown në dritare: kontrollon Caps Lock dhe, nëse fokusi është te një buton
   * dhe shtypet një shkronjë, e çon fokusin te fusha e fshehur (shkronja numërohet).
   * @param {KeyboardEvent} event - ngjarja
   * @returns {void}
   */
  handleKeydown(event) {
    // Gjendja e Caps Lock
    this.updateCapsLock(event);
    // Nëse fokusi është te fusha, ose s'jemi në mësim, s'ka nevojë për më shumë
    if (event.target === this.input || this.lessonEl.hidden) {
      return; // fusha e ka fokusin
    }
    // Vetëm tastet me një karakter; hapësira përjashtohet sepse ajo aktivizon butonin e fokusuar
    const isCharacter = event.key.length === 1 && event.key !== " ";
    // Shkurtoret e shfletuesit (Ctrl ose Cmd) nuk preken; AltGr dërgon Ctrl+Alt dhe lejohet
    const isShortcut = event.metaKey || (event.ctrlKey && !event.altKey);
    // Nëse është shkronjë dhe jo shkurtore
    if (isCharacter && !isShortcut) {
      // Fokusi te fusha e fshehur
      this.input.focus({ preventScroll: true });
    }
  }

  /**
   * Shfaq ose fsheh paralajmërimin e Caps Lock, vetëm kur ndryshon gjendja.
   * @param {KeyboardEvent} event - ngjarja keydown ose keyup
   * @returns {void}
   */
  updateCapsLock(event) {
    // Disa tastiera virtuale dërgojnë ngjarje pa këtë funksion
    if (typeof event.getModifierState !== "function") {
      return; // s'ka informacion
    }
    // true kur Caps Lock është i ndezur
    const on = event.getModifierState("CapsLock");
    // Nëse s'ka ndryshuar, s'e rishkruajmë (lexuesi i ekranit do ta përsëriste)
    if (on === this.capsLockOn) {
      return; // asnjë ndryshim
    }
    // Ruajmë gjendjen
    this.capsLockOn = on;
    // Me tekst shfaqet; bosh e fsheh CSS (:empty)
    this.capsEl.textContent = on ? MESSAGES.capsLock : "";
  }

  // ---------------- LËVIZJA NË RRUGË ----------------

  /**
   * Mësimi para atij aktual (vetëm në mënyrën "lesson").
   * @returns {object|null} mësimi, ose null
   */
  previousLesson() {
    // Në provë ose pa mësim s'ka "të mëparshëm"
    if (this.mode !== "lesson" || !this.lesson) {
      return null; // s'ka
    }
    // Lista e mësimeve
    const lessons = this.course.lessons;
    // Pozicioni i mësimit aktual
    const index = lessons.findIndex((lesson) => lesson.id === this.lesson.id);
    // Mësimi para tij, ose null kur ky është i pari
    return index > 0 ? lessons[index - 1] : null;
  }

  /**
   * Hap mësimin e mëparshëm (është gjithmonë i hapur, sepse është kryer ose është para këtij).
   * @returns {void}
   */
  openPrevious() {
    // Mësimi i mëparshëm
    const previous = this.previousLesson();
    // Nëse ekziston, e hapim
    if (previous) {
      // Nisim mësimin
      this.openLesson(previous.id);
    }
  }

  /**
   * Kapitulli pas atij aktual.
   * @returns {object|null} kapitulli, ose null kur ky është i fundit
   */
  nextChapter() {
    // Pozicioni i kapitullit aktual
    const index = this.course.chapters.indexOf(this.chapter);
    // Kapitulli pasardhës, ose null
    return this.course.chapters[index + 1] || null;
  }

  /**
   * Hap mësimin e parë të kapitullit tjetër.
   * @returns {void}
   */
  openNextChapter() {
    // Kapitulli tjetër
    const chapter = this.nextChapter();
    // Nëse ekziston, nisim mësimin e tij të parë
    if (chapter) {
      // Mësimi i parë
      this.openLesson(chapter.lessons[0].id);
    }
  }
}
