/**
 * ===========================================================================
 * guide.js
 * ---------------------------------------------------------------------------
 * Çfarë bën: udhëzuesi "Mëso bazat" për fillestarët. Hapet nga butoni
 * "I ri këtu? Mëso bazat" si dritare <dialog> dhe tregon hap pas hapi ku
 * vendosen gishtat në tastierë:
 *   - çdo hap shfaq një rresht katrorësh me shkronja (p.sh. F dhe J)
 *   - përdoruesi shtyp tastin e katrorit aktual
 *   - tasti i saktë kërcen dhe bëhet i gjelbër, tasti i gabuar e dridh rreshtin
 *   - një tastierë e vogël tregon ku ndodhet tasti dhe një fjali thotë cili gisht e shtyp
 *   - kur mbarojnë katrorët, kalon vetë te hapi tjetër
 * Animacionet janë të gjitha në CSS (animations.css); JavaScript vetëm shton
 * dhe heq klasa. Shtypjet lexohen nga një fushë e fshehur me ngjarjen "input",
 * e njëjta teknikë si te testi (punon me ë dhe me tastierat e tabletit).
 * Hapat dhe gishtat janë te config.js (GUIDE_STEPS, GUIDE_FINGERS).
 *
 * Çfarë eksporton: klasën TypingGuide.
 * Kush e përdor: js/pages/index-page.js.
 * ===========================================================================
 */

// Hapat, gishtat, koha e pritjes, tastierat dhe mesazhet
import { GUIDE_STEPS, GUIDE_FINGERS, GUIDE_ADVANCE_MS, KEYBOARD_LAYOUTS, MESSAGES } from "../config.js";

/**
 * Tastet me vijë të ngritur në çdo tastierë: gishtat tregues i gjejnë me prekje.
 * @type {Set<string>}
 */
const BUMP_KEYS = new Set(["f", "j"]);

/**
 * Udhëzuesi i bazave të shkrimit.
 */
export class TypingGuide {
  /**
   * Gjen elementët e dritares dhe lidh ngjarjet. Nuk e hap dritaren.
   * @param {object} options - opsionet
   * @param {import("./storage.js").StorageService} options.storage - për të lexuar dhe ruajtur tastierën e zgjedhur
   * @param {() => void} [options.onOpen] - thirret kur hapet udhëzuesi (p.sh. për të anuluar testin)
   * @param {() => void} [options.onClose] - thirret kur mbyllet (p.sh. për ta kthyer fokusin te testi)
   */
  constructor({ storage, onOpen = () => {}, onClose = () => {} }) {
    // Shërbimi i ruajtjes
    this.storage = storage;
    // Funksioni që thirret në hapje
    this.onOpen = onOpen;
    // Funksioni që thirret në mbyllje
    this.onClose = onClose;

    // ---- Elementët e faqes ----
    this.dialog = document.getElementById("guide"); // dritarja
    this.openButton = document.getElementById("guide-open"); // butoni "I ri këtu? Mëso bazat"
    this.closeButton = document.getElementById("guide-close"); // butoni X
    this.countEl = document.getElementById("guide-count"); // "Hapi 1 nga 8"
    this.barEl = document.getElementById("guide-bar"); // vija e përparimit
    this.titleEl = document.getElementById("guide-title"); // titulli i hapit
    this.textEl = document.getElementById("guide-text"); // shpjegimi i hapit
    this.stageEl = document.getElementById("guide-stage"); // skena me katrorët
    this.keysEl = document.getElementById("guide-keys"); // rreshti i katrorëve
    this.input = document.getElementById("guide-input"); // fusha e fshehur
    this.fingerEl = document.getElementById("guide-finger"); // fjalia e gishtit
    this.keyboardEl = document.getElementById("guide-keyboard"); // tastiera e vogël
    this.layoutsEl = this.dialog.querySelector(".guide__layouts"); // mbështjellësi i butonave të tastierës
    this.layoutButtons = Array.from(this.dialog.querySelectorAll("[data-guide-layout]")); // dy butonat e tastierës
    this.prevButton = document.getElementById("guide-prev"); // "Mbrapa"
    this.skipButton = document.getElementById("guide-skip"); // "Kapërce hapin"
    this.restartButton = document.getElementById("guide-restart"); // "Nga fillimi"
    this.startButton = document.getElementById("guide-start"); // "Fillo testin"

    // ---- Gjendja ----
    this.layout = storage.getLayout(); // tastiera e zgjedhur: "sq" ose "us"
    this.steps = TypingGuide.buildSteps(this.layout); // hapat e përshtatur për këtë tastierë
    this.stepIndex = 0; // në cilin hap jemi (0 = i pari)
    this.keyIndex = 0; // cilin katror të hapit duhet shtypur tani
    this.keyEls = []; // katrorët e hapit aktual, në rend
    this.advanceTimeoutId = null; // id e setTimeout që kalon te hapi tjetër

    // Lidhim të gjitha ngjarjet
    this.bindEvents();
  }

  /**
   * Përshtat hapat për tastierën e zgjedhur (e pastër): në tastierën amerikane
   * tasti nën gishtin e vogël të djathtë është ";" dhe jo "ë".
   * @param {string} layoutId - "sq" ose "us"
   * @returns {{title: string, text: string, keys: string[]}[]} hapat, me tastet si varg karakteresh
   */
  static buildSteps(layoutId) {
    // map krijon një hap të ri për çdo hap të konfigurimit
    return GUIDE_STEPS.map((step) => ({
      title: step.title, // titulli mbetet i njëjtë
      text: step.text, // shpjegimi mbetet i njëjtë
      // replaceAll ndërron çdo "ë" me ";" vetëm për tastierën amerikane; Array.from e ndan në karaktere
      keys: Array.from(layoutId === "us" ? step.keys.replaceAll("ë", ";") : step.keys),
    }));
  }

  /**
   * Lidh dëgjuesit e ngjarjeve të dritares.
   * @returns {void}
   */
  bindEvents() {
    // Butoni në faqe hap udhëzuesin
    this.openButton.addEventListener("click", () => this.open());
    // Butoni X e mbyll dritaren (ngjarja "close" më poshtë bën pastrimin)
    this.closeButton.addEventListener("click", () => this.dialog.close());
    // "close" ndodh sido që të mbyllet dritarja: me X, me Esc ose me "Fillo testin"
    this.dialog.addEventListener("close", () => this.handleClose());

    // "input": shfletuesi ka futur një shkronjë te fusha e fshehur
    this.input.addEventListener("input", (event) => this.handleInput(event));
    // "compositionend": mbaroi një shkronjë e përbërë (p.sh. ¨ + e = ë)
    this.input.addEventListener("compositionend", () => this.consumeInput());
    // Ngjitja e tekstit nuk ka kuptim këtu, prandaj bllokohet
    this.input.addEventListener("paste", (event) => event.preventDefault());

    // Nëse fokusi ka shkuar te një buton dhe përdoruesi shtyp një shkronjë, e kthejmë fokusin te fusha
    this.dialog.addEventListener("keydown", (event) => this.handleKeydown(event));
    // Kur mbaron dridhja e rreshtit, heqim klasat që ta lejojmë të dridhet sërish
    this.keysEl.addEventListener("animationend", (event) => this.handleAnimationEnd(event));

    // "Mbrapa": një hap më parë
    this.prevButton.addEventListener("click", () => this.goTo(this.stepIndex - 1));
    // "Kapërce hapin": një hap më tej
    this.skipButton.addEventListener("click", () => this.goTo(this.stepIndex + 1));
    // "Nga fillimi": hapi i parë
    this.restartButton.addEventListener("click", () => this.goTo(0));
    // "Fillo testin": mbyll dritaren
    this.startButton.addEventListener("click", () => this.dialog.close());

    // Butonat e tastierës: ndërrojnë tastierën e udhëzuesit
    this.layoutButtons.forEach((button) => {
      // Klikimi merr tastierën nga atributi data-guide-layout
      button.addEventListener("click", () => this.setLayout(button.dataset.guideLayout));
    });
  }

  // ---------------- HAPJA DHE MBYLLJA ----------------

  /**
   * Hap udhëzuesin nga hapi i parë.
   * @returns {void}
   */
  open() {
    // Nëse është tashmë i hapur, s'bëjmë asgjë (showModal do të hidhte gabim)
    if (this.dialog.open) {
      return; // dritarja është e hapur
    }
    // Njoftojmë faqen (index-page.js anulon testin që mund të ishte duke ecur)
    this.onOpen();
    // showModal: dritare modale; pjesa tjetër e faqes bllokohet dhe Esc e mbyll
    this.dialog.showModal();
    // Nisim nga hapi i parë
    this.goTo(0);
  }

  /**
   * Pastrimi pas mbylljes së dritares.
   * @returns {void}
   */
  handleClose() {
    // Anulojmë kalimin e planifikuar te hapi tjetër, nëse kishte
    clearTimeout(this.advanceTimeoutId);
    // Njoftojmë faqen (index-page.js e kthen fokusin te testi)
    this.onClose();
  }

  // ---------------- HAPAT ----------------

  /**
   * Shkon te një hap. Numri kufizohet mes 0 dhe numrit të hapave
   * (vlera e barabartë me numrin e hapave do të thotë "ekrani i fundit").
   * @param {number} index - hapi i kërkuar
   * @returns {void}
   */
  goTo(index) {
    // Anulojmë kalimin automatik që mund të ishte në pritje
    clearTimeout(this.advanceTimeoutId);
    // Math.max/Math.min e mbajnë numrin brenda kufijve
    this.stepIndex = Math.max(0, Math.min(index, this.steps.length));
    // Vizatojmë hapin
    this.render();
  }

  /**
   * Vizaton hapin aktual, ose ekranin e fundit kur hapat kanë mbaruar.
   * @returns {void}
   */
  render() {
    // A kanë mbaruar të gjithë hapat
    const finished = this.stepIndex >= this.steps.length;
    // Përparimi nga 0 në 1; CSS e kthen në gjatësi të vijës
    this.barEl.style.setProperty("--progress", String(this.stepIndex / this.steps.length));
    // Skena, fjalia e gishtit, tastiera dhe zgjedhja e tastierës fshihen në fund
    this.stageEl.hidden = finished;
    // Fjalia e gishtit
    this.fingerEl.hidden = finished;
    // Tastiera e vogël
    this.keyboardEl.hidden = finished;
    // Butonat e tastierës
    this.layoutsEl.hidden = finished;
    // "Kapërce hapin" s'ka kuptim në fund
    this.skipButton.hidden = finished;
    // "Nga fillimi" dhe "Fillo testin" shfaqen vetëm në fund
    this.restartButton.hidden = !finished;
    // Butoni kryesor i fundit
    this.startButton.hidden = !finished;
    // "Mbrapa" është i çaktivizuar te hapi i parë
    this.prevButton.disabled = this.stepIndex === 0;
    // Butoni aktiv i tastierës
    this.layoutButtons.forEach((button) => {
      // aria-pressed="true" vetëm për tastierën e zgjedhur
      button.setAttribute("aria-pressed", String(button.dataset.guideLayout === this.layout));
    });
    // Ekrani i fundit
    if (finished) {
      // Numëruesi
      this.countEl.textContent = MESSAGES.guideEndCount;
      // Titulli
      this.titleEl.textContent = MESSAGES.guideEndTitle;
      // Teksti përmbyllës
      this.textEl.textContent = MESSAGES.guideEndText;
      // Fokusi te "Fillo testin", që Enter të mbyllë udhëzuesin
      this.startButton.focus();
      // Dalim
      return;
    }
    // Hapi aktual
    const step = this.steps[this.stepIndex];
    // "Hapi 3 nga 8"
    this.countEl.textContent = MESSAGES.guideCount(this.stepIndex + 1, this.steps.length);
    // Titulli i hapit
    this.titleEl.textContent = step.title;
    // Shpjegimi i hapit
    this.textEl.textContent = step.text;
    // Fillojmë nga katrori i parë
    this.keyIndex = 0;
    // Krijojmë katrorët
    this.renderKeys(step.keys);
    // Shënojmë katrorin aktual, gishtin dhe tastin te tastiera e vogël
    this.updateCurrent();
    // Fokusi te fusha e fshehur, që shtypjet të kapen menjëherë
    this.input.focus({ preventScroll: true });
  }

  /**
   * Krijon një katror për çdo tast të hapit. Rikrijimi i elementeve bën që
   * animacioni i hyrjes (CSS) të luhet nga e para në çdo hap.
   * @param {string[]} keys - tastet e hapit
   * @returns {void}
   */
  renderKeys(keys) {
    // Fshijmë katrorët e hapit të mëparshëm
    this.keysEl.textContent = "";
    // Krijojmë katrorët dhe i ruajmë në varg
    this.keyEls = keys.map((char, index) => {
      // <span class="guide-key">
      const el = document.createElement("span");
      // Klasa bazë
      el.className = "guide-key";
      // Numri i katrorit: CSS e përdor për vonesën e hyrjes (katrorët hyjnë njëri pas tjetrit)
      el.style.setProperty("--key-index", String(index));
      // Hapësira shfaqet me fjalë dhe është më e gjerë
      if (char === " ") {
        // Klasa e katrorit të gjerë
        el.classList.add("guide-key--space");
        // Fjala në vend të shkronjës
        el.textContent = MESSAGES.space;
      } else {
        // Shkronja (CSS e shfaq të madhe)
        el.textContent = char;
      }
      // E shtojmë te rreshti
      this.keysEl.append(el);
      // E kthejmë, që map ta fusë te vargu
      return el;
    });
  }

  /**
   * Shënon katrorin që duhet shtypur tani dhe përditëson fjalinë e gishtit dhe tastierën e vogël.
   * @returns {void}
   */
  updateCurrent() {
    // Tasti që pritet tani
    const char = this.steps[this.stepIndex].keys[this.keyIndex];
    // Kalojmë çdo katror
    this.keyEls.forEach((el, index) => {
      // Vetëm katrori në pozicionin keyIndex merr klasën "aktual"
      el.classList.toggle("guide-key--current", index === this.keyIndex);
    });
    // Emri i tastit për fjalinë: "Hapësira" ose shkronja e madhe
    const keyName = char === " " ? MESSAGES.space : char.toUpperCase();
    // "Tasti F: gishti tregues i majtë."
    this.fingerEl.textContent = MESSAGES.guideFinger(keyName, GUIDE_FINGERS[char] || "");
    // E ndriçojmë te tastiera e vogël
    this.renderKeyboard(char);
  }

  /**
   * Vizaton tastierën e vogël (tre rreshtat e shkronjave dhe hapësirën) me tastin aktual të ndriçuar.
   * @param {string} target - tasti që duhet shtypur
   * @returns {void}
   */
  renderKeyboard(target) {
    // Tastiera e zgjedhur; nëse s'gjendet, e para
    const layout = KEYBOARD_LAYOUTS.find((item) => item.id === this.layout) || KEYBOARD_LAYOUTS[0];
    // Fshijmë tastierën e vjetër
    this.keyboardEl.textContent = "";
    // slice(1) kapërcen rreshtin e numrave; shtojmë një rresht vetëm me hapësirën
    [...layout.rows.slice(1), " "].forEach((rowText) => {
      // Rreshti
      const row = document.createElement("div");
      // Klasa e rreshtit
      row.className = "mini-keyboard__row";
      // Një tast për çdo karakter të rreshtit
      Array.from(rowText).forEach((char) => {
        // <span class="mini-key">
        const key = document.createElement("span");
        // Klasa bazë
        key.className = "mini-key";
        // Hapësira është e gjerë dhe pa shkronjë; tastet e tjera tregojnë shkronjën
        if (char === " ") {
          // Klasa e tastit të gjerë
          key.classList.add("mini-key--wide");
        } else {
          // Shkronja e tastit
          key.textContent = char;
        }
        // F dhe J marrin vijën e ngritur
        if (BUMP_KEYS.has(char)) {
          // Klasa e vijës
          key.classList.add("mini-key--bump");
        }
        // Tasti aktual ndriçohet me ngjyrën e theksit
        if (char === target) {
          // Klasa e tastit të synuar
          key.classList.add("mini-key--target");
        }
        // Tasti futet te rreshti
        row.append(key);
      });
      // Rreshti futet te tastiera
      this.keyboardEl.append(row);
    });
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
    // normalize("NFC") bashkon shkronjën me shenjën e saj në një karakter (ë); Array.from i ndan në karaktere
    Array.from(value.normalize("NFC")).forEach((char) => this.pressKey(char));
  }

  /**
   * Përpunon një tast të shtypur: e krahason me katrorin aktual.
   * @param {string} char - karakteri i shtypur
   * @returns {void}
   */
  pressKey(char) {
    // Hapi aktual (undefined në ekranin e fundit)
    const step = this.steps[this.stepIndex];
    // Në ekranin e fundit, ose kur hapi ka mbaruar dhe po pritet kalimi, shtypjet injorohen
    if (!step || this.keyIndex >= step.keys.length) {
      return; // s'ka katror për të shtypur
    }
    // Katrori aktual
    const el = this.keyEls[this.keyIndex];
    // Krahasojmë me shkronja të vogla, që edhe "F" me Shift të pranohet
    if (char.toLowerCase() !== step.keys[this.keyIndex]) {
      // Tasti i gabuar: katrori bëhet i kuq dhe rreshti dridhet
      this.showWrong(el);
      // Mbetemi te i njëjti katror
      return;
    }
    // Tasti i saktë: katrori s'është më "aktual"
    el.classList.remove("guide-key--current", "guide-key--wrong");
    // Bëhet i gjelbër dhe kërcen (CSS)
    el.classList.add("guide-key--done");
    // Kalojmë te katrori tjetër
    this.keyIndex += 1;
    // Nëse ka ende katrorë në këtë hap
    if (this.keyIndex < step.keys.length) {
      // Shënojmë katrorin e ri aktual
      this.updateCurrent();
      // Dalim
      return;
    }
    // Hapi mbaroi: pas një pritjeje të shkurtër (që të shihet kërcimi i fundit) kalojmë te tjetri
    this.advanceTimeoutId = setTimeout(() => this.goTo(this.stepIndex + 1), GUIDE_ADVANCE_MS);
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
    // Leximi i offsetWidth e detyron shfletuesin të vërejë heqjen; pa këtë, animacioni s'do të rifillonte
    void this.keysEl.offsetWidth;
    // E shtojmë sërish: animacioni nis nga e para
    this.keysEl.classList.add("guide__keys--shake");
  }

  /**
   * Kur mbaron dridhja, heqim klasën e saj dhe të kuqen nga katrori.
   * @param {AnimationEvent} event - ngjarja e fundit të një animacioni
   * @returns {void}
   */
  handleAnimationEnd(event) {
    // Na intereson vetëm dridhja e rreshtit, jo animacionet e katrorëve (që "ngjiten" deri këtu)
    if (event.animationName !== "guide-shake") {
      return; // animacion tjetër
    }
    // Rreshti s'dridhet më
    this.keysEl.classList.remove("guide__keys--shake");
    // Katrorët kthehen në ngjyrën e tyre
    this.keyEls.forEach((el) => el.classList.remove("guide-key--wrong"));
  }

  /**
   * Keydown kudo në dritare. Nëse fokusi është te një buton dhe shtypet një shkronjë,
   * e çojmë fokusin te fusha e fshehur; shfletuesi e fut shkronjën aty dhe ajo numërohet.
   * @param {KeyboardEvent} event - ngjarja
   * @returns {void}
   */
  handleKeydown(event) {
    // Nëse fokusi është tashmë te fusha, ose jemi në ekranin e fundit, s'ka nevojë
    if (event.target === this.input || this.stepIndex >= this.steps.length) {
      return; // fusha e ka fokusin
    }
    // Vetëm tastet me një karakter; hapësira përjashtohet, sepse ajo aktivizon butonin e fokusuar
    const isCharacter = event.key.length === 1 && event.key !== " ";
    // Shkurtoret e shfletuesit (Ctrl ose Cmd) nuk preken; AltGr dërgon Ctrl+Alt dhe lejohet
    const isShortcut = event.metaKey || (event.ctrlKey && !event.altKey);
    // Nëse është shkronjë dhe jo shkurtore
    if (isCharacter && !isShortcut) {
      // Fokusi te fusha e fshehur
      this.input.focus({ preventScroll: true });
    }
  }

  // ---------------- TASTIERA ----------------

  /**
   * Ndërron tastierën e udhëzuesit, e ruan dhe rivizaton hapin aktual.
   * @param {string} layoutId - "sq" ose "us"
   * @returns {void}
   */
  setLayout(layoutId) {
    // Tastiera e re
    this.layout = layoutId;
    // E ruajmë (i njëjti cilësim si te harta e tastierës te historiku)
    this.storage.saveLayout(layoutId);
    // Hapat rillogariten (ë bëhet ; ose anasjelltas)
    this.steps = TypingGuide.buildSteps(layoutId);
    // Rivizatojmë të njëjtin hap nga fillimi i tij
    this.goTo(this.stepIndex);
  }
}
