/**
 * ===========================================================================
 * course.js
 * ---------------------------------------------------------------------------
 * Çfarë bën: logjika e kursit "Mëso bazat", pa prekur faqen (pa DOM).
 *   - ndërton kapitujt dhe mësimet për tastierën e zgjedhur (shqipe ose amerikane)
 *   - mban listën e mësimeve të kryera dhe e ruan në localStorage
 *   - vendos cili mësim është i hapur dhe cili i kyçur: një mësim hapet
 *     vetëm kur është kryer mësimi para tij (rruga ndiqet me radhë)
 *   - gjen me cilin gisht shtypet çdo tast, nga pozicioni i tij në tastierë
 *   - ndan tekstin e një mësimi në pjesë të shkurtra (për katrorët)
 * Faqja e mësimeve (lessons-page.js) e përdor për të vizatuar rrugën,
 * dhe udhëzuesi (guide.js) për të zhvilluar mësimin.
 *
 * Çfarë eksporton: klasën Course.
 * Kush e përdor: js/modules/guide.js dhe js/pages/lessons-page.js.
 * ===========================================================================
 */

// Përmbajtja e kursit, tastierat dhe emrat e gishtave
import {
  GUIDE_CHAPTERS, // kapitujt dhe mësimet
  GUIDE_US_MAP, // si kthehet një mësim për tastierën amerikane
  GUIDE_FINGERS, // emri i gishtit sipas kolonës
  GUIDE_THUMB, // gishti i hapësirës
  KEYBOARD_LAYOUTS, // rreshtat e të dy tastierave
} from "../config.js"; // skedari nga vijnë të gjitha

/**
 * Kursi: kapitujt, mësimet, përparimi dhe rregullat e kyçjes.
 */
export class Course {
  /**
   * Krijon kursin për tastierën e ruajtur dhe lexon përparimin.
   * @param {import("./storage.js").StorageService} storage - shërbimi i ruajtjes
   */
  constructor(storage) {
    // Shërbimi i ruajtjes
    this.storage = storage;
    // Id-të e mësimeve të kryera; Set lejon kontroll të shpejtë me has()
    this.done = new Set(storage.getGuideProgress());
    // Tastiera e zgjedhur ("sq" ose "us")
    this.layout = storage.getLayout();
    // Kapitujt e ndërtuar për këtë tastierë
    this.chapters = Course.buildChapters(this.layout);
  }

  // ---------------- NDËRTIMI ----------------

  /**
   * Ndërton kapitujt për një tastierë (e pastër). Mësimet "vetëm shqip" hiqen në tastierën
   * amerikane, dhe teksti i çdo mësimi zgjidhet ose kthehet për atë tastierë.
   * @param {string} layoutId - "sq" ose "us"
   * @returns {{id: string, number: number, title: string, intro: string, lessons: {id: string, code: string, title: string, text: string, keys: string, chapterId: string}[]}[]} kapitujt
   */
  static buildChapters(layoutId) {
    // map krijon një kapitull të ri për çdo kapitull të konfigurimit
    return GUIDE_CHAPTERS.map((chapter, chapterIndex) => ({
      id: chapter.id, // id e kapitullit
      number: chapterIndex + 1, // numri (dhe vështirësia) nga 1 në 5
      title: chapter.title, // titulli
      intro: chapter.intro, // hyrja
      lessons: chapter.lessons
        // Në tastierën amerikane heqim mësimet që s'ekzistojnë aty (p.sh. Ç)
        .filter((lesson) => layoutId === "sq" || !lesson.onlySq)
        // Çdo mësim merr tekstin e duhur dhe disa fusha ndihmëse
        .map((lesson, lessonIndex) => ({
          id: lesson.id, // id e qëndrueshme, për përparimin
          code: `${chapterIndex + 1}.${lessonIndex + 1}`, // numri që shfaqet, p.sh. "1.3"
          title: lesson.title, // titulli
          text: lesson.text, // shpjegimi
          keys: Course.keysFor(lesson, layoutId), // teksti që shtypet
          chapterId: chapter.id, // kapitulli ku bën pjesë
        })),
    }));
  }

  /**
   * Teksti që shtypet në një mësim, për tastierën e zgjedhur (e pastër).
   * Në tastierën amerikane: keysUs nëse ekziston, përndryshe teksti shqip i kthyer tast për tast.
   * @param {{keys: string, keysUs?: string}} lesson - mësimi nga konfigurimi
   * @param {string} layoutId - "sq" ose "us"
   * @returns {string} teksti
   */
  static keysFor(lesson, layoutId) {
    // Në tastierën shqipe teksti mbetet ashtu siç është
    if (layoutId === "sq") {
      return lesson.keys; // teksti shqip
    }
    // Nëse mësimi ka tekst të veçantë për tastierën amerikane, e përdorim atë
    if (lesson.keysUs) {
      return lesson.keysUs; // p.sh. fjalë anglisht
    }
    // Përndryshe çdo karakter zëvendësohet me karakterin e të njëjtit tast fizik (?? = mbetet njësoj)
    return Array.from(lesson.keys, (char) => GUIDE_US_MAP[char] ?? char).join("");
  }

  /**
   * Ndan tekstin e një mësimi në pjesë me jo më shumë se `size` karaktere (e pastër).
   * Ndarja bëhet te hapësirat, që fjalët të mos priten; një fjalë më e gjatë se `size`
   * pritet me forcë. Hapësira mes dy pjesëve nuk shtypet.
   * @param {string} text - teksti
   * @param {number} size - sa karaktere ka një pjesë, më së shumti
   * @returns {string[][]} pjesët, secila si varg karakteresh
   */
  static splitChunks(text, size) {
    // Pjesët e gatshme
    const chunks = [];
    // Pjesa që po mbushim
    let current = "";
    // Kalojmë fjalë pas fjale
    text.split(" ").forEach((word) => {
      // Si do të dukej pjesa nëse shtojmë këtë fjalë
      const candidate = current ? `${current} ${word}` : word;
      // Nëse nxë, e shtojmë dhe vazhdojmë
      if (Array.from(candidate).length <= size) {
        // Pjesa rritet
        current = candidate;
        // Fjala tjetër
        return;
      }
      // Nuk nxë: pjesa aktuale mbyllet (nëse s'është bosh)
      if (current) {
        // E ruajmë
        chunks.push(current);
      }
      // Karakteret e fjalës së re
      let rest = Array.from(word);
      // Një fjalë më e gjatë se një pjesë pritet në copa
      while (rest.length > size) {
        // Copa e plotë
        chunks.push(rest.slice(0, size).join(""));
        // Pjesa që mbetet
        rest = rest.slice(size);
      }
      // Ajo që mbetet nis pjesën e re
      current = rest.join("");
    });
    // Pjesa e fundit
    if (current) {
      // E ruajmë
      chunks.push(current);
    }
    // Çdo pjesë kthehet në varg karakteresh (Array.from numëron ë si një karakter)
    return chunks.map((chunk) => Array.from(chunk));
  }

  // ---------------- RENDI DHE KYÇJA ----------------

  /**
   * Të gjitha mësimet e tastierës aktuale në një listë të vetme, me radhë.
   * @returns {object[]} mësimet
   */
  get lessons() {
    // flatMap bashkon mësimet e të gjithë kapitujve në një varg
    return this.chapters.flatMap((chapter) => chapter.lessons);
  }

  /**
   * Gjen një mësim sipas id-së.
   * @param {string} id - id e mësimit
   * @returns {object|undefined} mësimi, ose undefined nëse s'ekziston në këtë tastierë
   */
  findLesson(id) {
    // find kthen mësimin e parë me këtë id
    return this.lessons.find((lesson) => lesson.id === id);
  }

  /**
   * Gjen kapitullin sipas id-së.
   * @param {string} id - id e kapitullit
   * @returns {object|undefined} kapitulli
   */
  findChapter(id) {
    // find kthen kapitullin me këtë id
    return this.chapters.find((chapter) => chapter.id === id);
  }

  /**
   * A është kryer një mësim.
   * @param {string} id - id e mësimit
   * @returns {boolean} true nëse po
   */
  isDone(id) {
    // Kontrollojmë te bashkësia e mësimeve të kryera
    return this.done.has(id);
  }

  /**
   * RREGULLI I KYÇJES: një mësim është i hapur nëse është i pari, nëse është kryer,
   * ose nëse është kryer mësimi para tij. Kështu rruga ndiqet me radhë.
   * @param {string} id - id e mësimit
   * @returns {boolean} true nëse mund të niset
   */
  isUnlocked(id) {
    // Lista e mësimeve me radhë
    const lessons = this.lessons;
    // Pozicioni i mësimit në listë
    const index = lessons.findIndex((lesson) => lesson.id === id);
    // Mësim që s'ekziston: i kyçur
    if (index === -1) {
      return false; // s'ka çfarë të hapet
    }
    // I pari është gjithmonë i hapur; të tjerët kur janë kryer ose kur është kryer ai para tyre
    return index === 0 || this.isDone(id) || this.isDone(lessons[index - 1].id);
  }

  /**
   * Mësimi i radhës: i pari që s'është kryer ende. Ky është "ku je" në rrugë.
   * @returns {object|null} mësimi, ose null kur kursi ka mbaruar
   */
  nextLesson() {
    // find kthen mësimin e parë që s'është kryer; || null kur s'ka asnjë
    return this.lessons.find((lesson) => !this.isDone(lesson.id)) || null;
  }

  /**
   * Mësimi pas një mësimi tjetër, në rendin e rrugës.
   * @param {string} id - id e mësimit aktual
   * @returns {object|null} mësimi tjetër, ose null kur ky ishte i fundit
   */
  lessonAfter(id) {
    // Lista e mësimeve
    const lessons = this.lessons;
    // Pozicioni i mësimit aktual
    const index = lessons.findIndex((lesson) => lesson.id === id);
    // Mësimi pasardhës, ose null
    return lessons[index + 1] || null;
  }

  /**
   * Kapitulli ku ndodhet mësimi i radhës (kapitulli që mund të kapërcehet me provë).
   * @returns {object|null} kapitulli, ose null kur kursi ka mbaruar
   */
  currentChapter() {
    // Mësimi i radhës
    const next = this.nextLesson();
    // Kapitulli i tij, ose null
    return next ? this.findChapter(next.chapterId) : null;
  }

  /**
   * Sa mësime të një kapitulli janë kryer.
   * @param {object} chapter - kapitulli
   * @returns {number} numri
   */
  chapterDoneCount(chapter) {
    // filter mban vetëm të kryerat; length i numëron
    return chapter.lessons.filter((lesson) => this.isDone(lesson.id)).length;
  }

  /**
   * Sa mësime të kursit (për tastierën aktuale) janë kryer.
   * @returns {number} numri
   */
  doneCount() {
    // Numërojmë mësimet e tastierës aktuale që janë kryer
    return this.lessons.filter((lesson) => this.isDone(lesson.id)).length;
  }

  // ---------------- NDRYSHIMET ----------------

  /**
   * Shënon mësime si të kryera dhe e ruan.
   * @param {string[]} ids - id-të e mësimeve
   * @returns {void}
   */
  markDone(ids) {
    // Shtojmë çdo id te bashkësia (Set nuk lejon dublikata)
    ids.forEach((id) => this.done.add(id));
    // Ruajmë si varg në localStorage
    this.storage.saveGuideProgress(Array.from(this.done));
  }

  /**
   * Fshin gjithë përparimin e kursit.
   * @returns {void}
   */
  reset() {
    // Bashkësia bosh
    this.done = new Set();
    // Ruajmë vargun bosh
    this.storage.saveGuideProgress([]);
  }

  /**
   * Ndërron tastierën: rindërton kapitujt dhe e ruan zgjedhjen.
   * @param {string} layoutId - "sq" ose "us"
   * @returns {void}
   */
  setLayout(layoutId) {
    // Tastiera e re
    this.layout = layoutId;
    // E ruajmë (e njëjta zgjedhje si te harta e tastierës te historiku)
    this.storage.saveLayout(layoutId);
    // Kapitujt rindërtohen me tekstin e duhur
    this.chapters = Course.buildChapters(layoutId);
  }

  // ---------------- GISHTAT ----------------

  /**
   * Me cilin gisht shtypet një karakter, në tastierën aktuale.
   * Gjendet rreshti dhe kolona e tastit; kolona tregon gishtin (GUIDE_FINGERS).
   * Për shkronjat e mëdha tregohet edhe Shift-i i dorës tjetër.
   * @param {string} char - karakteri
   * @returns {{finger: string, shift: string|null, shiftSide: "left"|"right"|null}} gishti dhe Shift-i (null kur s'duhet)
   */
  fingerFor(char) {
    // Hapësira shtypet me gishtin e madh
    if (char === " ") {
      return { finger: GUIDE_THUMB, shift: null, shiftSide: null }; // pa Shift
    }
    // Tastiera aktuale
    const layout = KEYBOARD_LAYOUTS.find((item) => item.id === this.layout) || KEYBOARD_LAYOUTS[0];
    // Tasti fizik është shkronja e vogël
    const lower = char.toLowerCase();
    // Rreshti ku ndodhet tasti
    const row = layout.rows.find((text) => text.includes(lower));
    // Kolona e tastit në atë rresht (Array.from që ë të numërohet si një karakter)
    const column = row ? Array.from(row).indexOf(lower) : -1;
    // Gishti sipas kolonës; nga kolona 9 e tutje është gishti i vogël i djathtë
    const finger = column === -1 ? "" : GUIDE_FINGERS[Math.min(column, GUIDE_FINGERS.length - 1)];
    // Shkronjë e madhe: ndryshon nga versioni i saj i vogël
    const isUpper = char !== lower;
    // Pa Shift: kthejmë vetëm gishtin
    if (!isUpper || column === -1) {
      return { finger, shift: null, shiftSide: null }; // pa Shift
    }
    // Kolonat 0 deri 4 janë të dorës së majtë, prandaj Shift-i shtypet me të djathtën
    const shiftSide = column <= 4 ? "right" : "left";
    // Fjalia për Shift-in
    const shift = shiftSide === "right" ? "Shift-in e djathtë me gishtin e vogël të djathtë" : "Shift-in e majtë me gishtin e vogël të majtë";
    // Kthejmë gishtin dhe Shift-in
    return { finger, shift, shiftSide };
  }
}
