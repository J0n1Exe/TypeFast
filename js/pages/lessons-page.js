/**
 * ===========================================================================
 * lessons-page.js
 * ---------------------------------------------------------------------------
 * Çfarë bën: skripti hyrës i mesimet.html. Vendos temën, pastaj vizaton:
 *   - përmbledhjen e kursit (sa mësime janë kryer, butoni "Vazhdo")
 *   - rrugën e mësimeve: një seksion për çdo kapitull, me vështirësinë,
 *     mësimet si katrorë që gjarpërojnë dhe një vijë SVG që i lidh
 * Mësimet e kryera janë jeshile, mësimi i radhës ka ngjyrën e theksit dhe
 * mësimet e tjera janë të kyçura. Klikimi i një mësimi të hapur e nis në
 * dritaren e mësimit (TypingGuide). Kur kryhet një mësim, rruga rivizatohet.
 *
 * Çfarë eksporton: asgjë (pikë hyrjeje).
 * Kush e përdor: mesimet.html, me <script type="module">.
 * ===========================================================================
 */

// Ruajtja e të dhënave
import { StorageService } from "../modules/storage.js";
// Menaxheri i temës
import { ThemeManager } from "../modules/theme.js";
// Logjika e kursit: rendi, kyçja, përparimi
import { Course } from "../modules/course.js";
// Dritarja ku zhvillohet një mësim
import { TypingGuide } from "../modules/guide.js";
// Mesazhet në shqip
import { MESSAGES } from "../config.js";

// Shërbimi i ruajtjes për gjithë faqen
const storage = new StorageService();
// Menaxheri i temës
const themeManager = new ThemeManager(storage);
// E PARA: tema e ruajtur te <html>
themeManager.apply();
// Butoni i temës
themeManager.bindToggle(document.getElementById("theme-toggle"));

/**
 * Zhvendosja horizontale e mësimeve, me radhë: 0 = në mes, 2 = dy hapa djathtas, -2 = dy hapa majtas.
 * Kjo radhë e bën rrugën të gjarpërojë si një "S"; pas 8 mësimesh rinis.
 * @type {number[]}
 */
const PATH_OFFSETS = [0, 1, 2, 1, 0, -1, -2, -1];

/** @type {string} Hapësira e emrave për elementet SVG (pa të, shfletuesi i krijon si HTML dhe s'i vizaton). */
const SVG_NS = "http://www.w3.org/2000/svg";

/**
 * Krijon një ikonë SVG të vogël me vija (stroke="currentColor", pra merr ngjyrën e tekstit).
 * @param {"check"|"lock"} name - cila ikonë
 * @returns {SVGSVGElement} ikona
 */
function createIcon(name) {
  // <svg> duhet krijuar me createElementNS, që shfletuesi ta njohë si SVG
  const svg = document.createElementNS(SVG_NS, "svg");
  // Përmasat e brendshme të vizatimit
  svg.setAttribute("viewBox", "0 0 24 24");
  // Gjerësia në faqe
  svg.setAttribute("width", "16");
  // Lartësia në faqe
  svg.setAttribute("height", "16");
  // Pa mbushje, vetëm vija
  svg.setAttribute("fill", "none");
  // Vija merr ngjyrën e tekstit të prindit
  svg.setAttribute("stroke", "currentColor");
  // Trashësia e vijës
  svg.setAttribute("stroke-width", "2");
  // Skajet e vijave të rrumbullakëta
  svg.setAttribute("stroke-linecap", "round");
  // Këndet e vijave të rrumbullakëta
  svg.setAttribute("stroke-linejoin", "round");
  // Ikona është zbukurim: kuptimin e jep aria-label i butonit
  svg.setAttribute("aria-hidden", "true");
  // Klasa e stilit
  svg.setAttribute("class", "path-node__icon");
  // Vizatimi: shenja e kryer, ose dryni (trupi dhe harku)
  const shapes = name === "check" ? ["M5 12l4 4 10-10"] : ["M6 11h12v9H6z", "M8 11V8a4 4 0 0 1 8 0v3"];
  // Një <path> për çdo formë
  shapes.forEach((d) => {
    // Elementi i formës
    const path = document.createElementNS(SVG_NS, "path");
    // Rruga e vizatimit
    path.setAttribute("d", d);
    // E shtojmë te ikona
    svg.append(path);
  });
  // E kthejmë
  return svg;
}

/**
 * Nis faqen e mësimeve.
 * @returns {void}
 */
function initLessonsPage() {
  // Kursi (lexon përparimin dhe tastierën nga localStorage)
  const course = new Course(storage);

  // Elementët e faqes
  const elements = {
    count: document.getElementById("course-count"), // "12 nga 28 mësime të kryera"
    bar: document.getElementById("course-bar"), // vija e përparimit
    continueButton: document.getElementById("course-continue"), // "Vazhdo mësimin e radhës"
    resetButton: document.getElementById("course-reset"), // "Rinis kursin"
    doneNote: document.getElementById("course-done-note"), // shënimi kur kursi mbaron
    layoutButtons: Array.from(document.querySelectorAll("[data-layout]")), // dy butonat e tastierës
    path: document.getElementById("path"), // mbështjellësi i rrugës
    resetDialog: document.getElementById("reset-dialog"), // konfirmimi i rinisjes
  };

  // Dritarja e mësimit; kur kryhet një mësim, rruga rivizatohet
  const guide = new TypingGuide({ course, onProgress: () => render() });

  // Id e requestAnimationFrame për vizatimin e vijave
  let lineFrameId = null;

  /**
   * Vizaton gjithë faqen nga e para: përmbledhjen dhe rrugën.
   * @returns {void}
   */
  function render() {
    // Përmbledhja sipër
    renderSummary();
    // Rruga
    renderPath();
    // Vijat vizatohen pasi shfletuesi të ketë vendosur katrorët (duhen pozicionet e tyre)
    scheduleLines();
  }

  /**
   * Përmbledhja: numri i mësimeve të kryera, vija, butoni kryesor dhe tastiera aktive.
   * @returns {void}
   */
  function renderSummary() {
    // Mësime të kryera
    const done = course.doneCount();
    // Mësime gjithsej në tastierën aktuale
    const total = course.lessons.length;
    // Mësimi i radhës (null kur kursi ka mbaruar)
    const next = course.nextLesson();
    // "12 nga 28 mësime të kryera"
    elements.count.textContent = MESSAGES.guideCourseProgress(done, total);
    // Vija: pjesa e kryer nga 0 në 1
    elements.bar.style.setProperty("--progress", String(done / total));
    // Teksti i butonit: "Fillo" kur s'ka nisur, "Vazhdo" përndryshe
    elements.continueButton.textContent = done === 0 ? MESSAGES.guideStart : MESSAGES.guideContinue;
    // Pa mësim të radhës, butoni s'ka çfarë të nisë
    elements.continueButton.disabled = !next;
    // Shënimi "Kursi u krye" vetëm kur s'ka mësim të radhës
    elements.doneNote.hidden = Boolean(next);
    // Butoni i tastierës aktive
    elements.layoutButtons.forEach((button) => {
      // aria-pressed="true" vetëm për tastierën e zgjedhur (CSS e shënon me theksin)
      button.setAttribute("aria-pressed", String(button.dataset.layout === course.layout));
    });
  }

  /**
   * Rruga: një seksion për çdo kapitull.
   * @returns {void}
   */
  function renderPath() {
    // Fshijmë rrugën e vjetër
    elements.path.textContent = "";
    // Kapitulli që mund të kapërcehet me provë (ai i mësimit të radhës)
    const current = course.currentChapter();
    // Një seksion për çdo kapitull
    course.chapters.forEach((chapter) => elements.path.append(createChapter(chapter, chapter === current)));
  }

  /**
   * Krijon seksionin e një kapitulli.
   * @param {object} chapter - kapitulli
   * @param {boolean} isCurrent - true kur ky është kapitulli i mësimit të radhës
   * @returns {HTMLElement} seksioni
   */
  function createChapter(chapter, isCurrent) {
    // <section class="path-chapter">
    const section = document.createElement("section");
    // Klasa e stilit
    section.className = "path-chapter";
    // Id e titullit, që seksioni ta marrë emrin prej tij
    const titleId = `chapter-${chapter.id}-title`;
    // aria-labelledby: lexuesi i ekranit e njeh seksionin me titullin e tij
    section.setAttribute("aria-labelledby", titleId);

    // ---- Koka: "KAPITULLI 1", titulli dhe vështirësia ----
    const head = document.createElement("div");
    // Klasa e stilit
    head.className = "path-chapter__head";
    // Mbështjellësi i titujve
    const titles = document.createElement("div");
    // "KAPITULLI 1"
    const kicker = document.createElement("p");
    // Klasa e stilit
    kicker.className = "path-chapter__kicker";
    // Teksti
    kicker.textContent = `Kapitulli ${chapter.number}`;
    // Titulli h2
    const title = document.createElement("h2");
    // Klasa e stilit
    title.className = "path-chapter__title";
    // Id për aria-labelledby
    title.id = titleId;
    // Teksti
    title.textContent = chapter.title;
    // Titujt brenda mbështjellësit
    titles.append(kicker, title);
    // Koka merr titujt dhe vështirësinë
    head.append(titles, createDifficulty(chapter.number, course.chapters.length));

    // ---- Hyrja dhe përparimi ----
    const intro = document.createElement("p");
    // Klasa e stilit
    intro.className = "path-chapter__intro";
    // Teksti
    intro.textContent = chapter.intro;
    // "3 nga 8 mësime"
    const progress = document.createElement("p");
    // Klasa e stilit
    progress.className = "path-chapter__progress";
    // Numrat realë
    progress.textContent = MESSAGES.guideChapterProgress(course.chapterDoneCount(chapter), chapter.lessons.length);
    // I shtojmë te seksioni
    section.append(head, intro, progress);

    // ---- Prova për ta kapërcyer kapitullin (vetëm te kapitulli aktual) ----
    if (isCurrent) {
      // Butoni
      const skip = document.createElement("button");
      // Pamja e butonit
      skip.className = "button path-chapter__skip";
      // Nuk dërgon formular
      skip.type = "button";
      // Teksti
      skip.textContent = "Kapërce kapitullin me provë";
      // Klikimi nis provën
      skip.addEventListener("click", () => guide.openCheckpoint(chapter.id));
      // E shtojmë
      section.append(skip);
    }

    // ---- Mësimet ----
    // <ol>: mësimet janë të renditura
    const list = document.createElement("ol");
    // Klasa e stilit
    list.className = "path-steps";
    // role="list": Safari e humb kuptimin "listë" kur CSS heq numrat
    list.setAttribute("role", "list");
    // Vizatimi SVG i vijës, pas mësimeve
    const svg = document.createElementNS(SVG_NS, "svg");
    // Klasa e stilit
    svg.setAttribute("class", "path-line");
    // Zbukurim: lexuesi i ekranit e kapërcen
    svg.setAttribute("aria-hidden", "true");
    // Vija hyn e para te lista
    list.append(svg);
    // Një hap për çdo mësim
    chapter.lessons.forEach((lesson, index) => list.append(createStep(lesson, index)));
    // Lista te seksioni
    section.append(list);
    // Kthejmë seksionin
    return section;
  }

  /**
   * Krijon treguesin e vështirësisë: pesë shtylla, të mbushura deri te niveli.
   * @param {number} level - vështirësia e kapitullit
   * @param {number} max - vështirësia më e lartë
   * @returns {HTMLElement} treguesi
   */
  function createDifficulty(level, max) {
    // Mbështjellësi
    const wrap = document.createElement("div");
    // Klasa e stilit
    wrap.className = "difficulty";
    // Etiketa e dukshme
    const label = document.createElement("span");
    // Klasa e stilit
    label.className = "difficulty__label";
    // Teksti
    label.textContent = "Vështirësia";
    // aria-hidden: lexuesi i ekranit e merr gjithë informacionin nga aria-label i shtyllave
    label.setAttribute("aria-hidden", "true");
    // Shtyllat
    const bars = document.createElement("span");
    // Klasa e stilit
    bars.className = "difficulty__bars";
    // role="img" + aria-label: lexuesi i ekranit lexon "Vështirësia 2 nga 5"
    bars.setAttribute("role", "img");
    // Teksti për lexuesin e ekranit
    bars.setAttribute("aria-label", MESSAGES.guideDifficulty(level, max));
    // Një shtyllë për çdo nivel të mundshëm (1 deri 5)
    for (let bar = 1; bar <= max; bar += 1) {
      // Shtylla
      const el = document.createElement("span");
      // Shtyllat deri te niveli janë të mbushura
      el.className = bar <= level ? "difficulty__bar difficulty__bar--filled" : "difficulty__bar";
      // Numri i shtyllës: CSS e përdor për lartësinë (sa më lart, aq më e gjatë)
      el.style.setProperty("--bar", String(bar));
      // E shtojmë
      bars.append(el);
    }
    // Etiketa dhe shtyllat te mbështjellësi
    wrap.append(label, bars);
    // E kthejmë
    return wrap;
  }

  /**
   * Krijon një hap të rrugës: katrori i mësimit dhe titulli poshtë tij.
   * @param {object} lesson - mësimi
   * @param {number} index - pozicioni në kapitull (për gjarpërimin)
   * @returns {HTMLLIElement} hapi
   */
  function createStep(lesson, index) {
    // Gjendja: i kryer, i radhës (i hapur por jo i kryer) ose i kyçur
    const state = course.isDone(lesson.id) ? "done" : course.isUnlocked(lesson.id) ? "current" : "locked";
    // <li>
    const step = document.createElement("li");
    // Klasa e stilit, plus gjendja
    step.className = `path-step path-step--${state}`;
    // Zhvendosja e gjarpërimit sipas pozicionit (% rinis pas 8 mësimesh)
    step.style.setProperty("--path-offset", String(PATH_OFFSETS[index % PATH_OFFSETS.length]));
    // Butoni i mësimit
    const node = document.createElement("button");
    // Klasa e stilit, plus gjendja
    node.className = `path-node path-node--${state}`;
    // Nuk dërgon formular
    node.type = "button";
    // Emri për lexuesin e ekranit: numri, titulli dhe gjendja
    node.setAttribute("aria-label", MESSAGES.guideNodeLabel(lesson.code, lesson.title, state));
    // Mësimet e kyçura s'klikohen
    node.disabled = state === "locked";
    // Id e mësimit, që ta gjejmë pas rivizatimit
    node.dataset.lesson = lesson.id;
    // Numri i mësimit, p.sh. "1.3"
    const code = document.createElement("span");
    // Teksti
    code.textContent = lesson.code;
    // Numri te butoni
    node.append(code);
    // Ikona: shenja e kryer ose dryni (mësimi i radhës s'ka ikonë)
    if (state !== "current") {
      // E shtojmë
      node.append(createIcon(state === "done" ? "check" : "lock"));
    }
    // Klikimi nis mësimin
    node.addEventListener("click", () => guide.openLesson(lesson.id));
    // Titulli poshtë katrorit (aria-hidden: titulli është tashmë te aria-label i butonit)
    const title = document.createElement("span");
    // Klasa e stilit
    title.className = "path-step__title";
    // Teksti
    title.textContent = lesson.title;
    // aria-hidden që lexuesi i ekranit të mos e lexojë dy herë
    title.setAttribute("aria-hidden", "true");
    // Butoni dhe titulli te hapi
    step.append(node, title);
    // E kthejmë
    return step;
  }

  /**
   * Planifikon vizatimin e vijave para kornizës (frame) së radhës: atëherë katrorët
   * kanë pozicionet e tyre përfundimtare, dhe disa thirrje njëra pas tjetrës bëhen një.
   * @returns {void}
   */
  function scheduleLines() {
    // Anulojmë kërkesën e mëparshme
    cancelAnimationFrame(lineFrameId);
    // Kërkojmë një vizatim të ri
    lineFrameId = requestAnimationFrame(drawLines);
  }

  /**
   * Vizaton vijat që lidhin mësimet në çdo kapitull. Për çdo dy mësime njëri pas tjetrit
   * vizatohet një kurbë (Bézier) nga qendra e të parit te qendra e të dytit.
   * Copa është "e arritur" (e plotë) kur mësimi pas saj është i kryer ose i radhës.
   * @returns {void}
   */
  function drawLines() {
    // Çdo listë mësimesh ka vijën e vet
    elements.path.querySelectorAll(".path-steps").forEach((list) => {
      // Vizatimi SVG i kësaj liste
      const svg = list.querySelector(".path-line");
      // Pozicioni i listës në ekran; qendrat llogariten në raport me të
      const box = list.getBoundingClientRect();
      // Qendra dhe gjendja e çdo katrori
      const points = Array.from(list.querySelectorAll(".path-node"), (node) => {
        // Pozicioni i katrorit në ekran
        const rect = node.getBoundingClientRect();
        // Qendra në raport me listën, dhe nëse mësimi është arritur
        return {
          x: rect.left + rect.width / 2 - box.left, // qendra horizontale
          y: rect.top + rect.height / 2 - box.top, // qendra vertikale
          reached: !node.classList.contains("path-node--locked"), // i kryer ose i radhës
        };
      });
      // Fshijmë vijat e vjetra
      svg.textContent = "";
      // Një copë vije për çdo dy mësime njëri pas tjetrit
      for (let i = 1; i < points.length; i += 1) {
        // Pika e nisjes
        const from = points[i - 1];
        // Pika e mbërritjes
        const to = points[i];
        // Lartësia në mes të dy pikave: aty kthehet kurba
        const middle = (from.y + to.y) / 2;
        // Elementi <path>
        const segment = document.createElementNS(SVG_NS, "path");
        // Kurba: nis te "from", tërhiqet vertikalisht dhe mbërrin te "to" (C = kurbë Bézier kubike)
        segment.setAttribute("d", `M ${from.x} ${from.y} C ${from.x} ${middle}, ${to.x} ${middle}, ${to.x} ${to.y}`);
        // Klasa e stilit; e arritura është e plotë, tjetra e ndërprerë
        segment.setAttribute("class", to.reached ? "path-line__segment path-line__segment--reached" : "path-line__segment");
        // E shtojmë te vizatimi
        svg.append(segment);
      }
    });
  }

  // ---------------- NGJARJET ----------------

  // "Fillo" / "Vazhdo": nis mësimin e radhës
  elements.continueButton.addEventListener("click", () => {
    // Mësimi i radhës
    const next = course.nextLesson();
    // Nëse ka, e nisim
    if (next) {
      // Nisja
      guide.openLesson(next.id);
    }
  });

  // Butonat e tastierës
  elements.layoutButtons.forEach((button) => {
    // Klikimi ndërron tastierën dhe rivizaton gjithçka
    button.addEventListener("click", () => {
      // Tastiera e re (e ruan edhe në localStorage)
      course.setLayout(button.dataset.layout);
      // Rivizatimi
      render();
    });
  });

  // "Rinis kursin" hap dritaren e konfirmimit
  elements.resetButton.addEventListener("click", () => {
    // Fshijmë përgjigjen e mëparshme (Esc e mbyll pa e ndryshuar këtë vlerë)
    elements.resetDialog.returnValue = "";
    // Dritare modale
    elements.resetDialog.showModal();
  });

  // Kur mbyllet konfirmimi
  elements.resetDialog.addEventListener("close", () => {
    // Vetëm "Po, rinise" ka value="confirm"
    if (elements.resetDialog.returnValue !== "confirm") {
      return; // u anulua
    }
    // Fshijmë përparimin
    course.reset();
    // Rivizatojmë
    render();
    // Fokusi te butoni kryesor
    elements.continueButton.focus();
  });

  // Kur mbyllet dritarja e mësimit: katrori i klikuar mund të jetë rikrijuar, prandaj
  // e çojmë fokusin te mësimi i radhës (ose te butoni kryesor kur kursi ka mbaruar)
  guide.dialog.addEventListener("close", () => {
    // Mësimi i radhës
    const next = course.nextLesson();
    // Katrori i tij në rrugë
    const node = next ? elements.path.querySelector(`[data-lesson="${next.id}"]`) : null;
    // Fokusi te katrori, ose te butoni kryesor
    (node || elements.continueButton).focus();
  });

  // Ndryshimi i madhësisë: katrorët lëvizin, prandaj vijat rivizatohen
  window.addEventListener("resize", scheduleLines);

  // Vizatimi i parë
  render();
}

// Nisim faqen vetëm kur nuk është hapur si skedar (file://)
if (window.location.protocol !== "file:") {
  // Nisja
  initLessonsPage();
}
