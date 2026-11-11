/**
 * ===========================================================================
 * texts.js
 * ---------------------------------------------------------------------------
 * Çfarë bën: lexon tekstet e testit nga data/texts.json (me fetch, vetëm
 * një herë) dhe krijon tekstin që shkruan përdoruesi, sipas gjuhës dhe
 * nivelit. Kujdeset që i njëjti element të mos dalë dy herë rresht.
 * Krijon edhe tekstin e praktikës: fjalë të zgjedhura sepse përmbajnë
 * tastet ku përdoruesi gabon më shumë (generatePractice).
 *
 * Çfarë eksporton: klasën TextGenerator.
 * Kush e përdor: app.js (klasa TypingTest).
 *
 * ---------------------------------------------------------------------------
 * STRUKTURA E data/texts.json (JSON nuk lejon komente, prandaj e shpjegojmë këtu):
 *
 * {
 *   "sq": {                          <- gjuha shqipe
 *     "easy":   { "words": [...] },  <- niveli i lehtë: listë fjalësh të shkurtra
 *     "medium": { "sentences": [...] }, <- niveli mesatar: fjali të zakonshme
 *     "hard":   { "sentences": [...] }  <- niveli i vështirë: fjali me numra,
 *                                         data, presje, pikëpresje, thonjëza,
 *                                         pikëpyetje, pikëçuditje dhe kllapa
 *   },
 *   "en": { ...e njëjta strukturë, në anglisht... }
 * }
 *
 * - "words" është një varg (array) me fjalë të veçanta, p.sh. ["është", "çaj"].
 * - "sentences" është një varg me fjali të plota, secila me pikë në fund.
 * - Niveli i lehtë ka të paktën 200 fjalë për gjuhë, niveli mesatar të
 *   paktën 40 fjali dhe niveli i vështirë të paktën 30 fjali.
 * - Të gjitha tekstet janë origjinale, të shkruara për këtë projekt.
 * ===========================================================================
 */

// Importojmë adresën e skedarit dhe mesazhet e gabimit nga konfigurimi
import { TEXTS_URL, MESSAGES, PRACTICE_TOKENS_PER_KEY } from "../config.js";

/**
 * Klasa që ngarkon dhe gjeneron tekstin e testit.
 */
export class TextGenerator {
  /**
   * Krijon gjeneratorin. Nuk ngarkon asgjë ende; ngarkimi bëhet me load().
   * @param {string} [url=TEXTS_URL] - adresa e skedarit JSON
   */
  constructor(url = TEXTS_URL) {
    // Ruajmë adresën e skedarit
    this.url = url;
    // Këtu do të ruhen të dhënat pasi të lexohen (cache); null = ende pa u lexuar
    this.data = null;
    // Premtimi (Promise) i ngarkimit, që dy thirrje njëkohësisht të mos bëjnë dy fetch
    this.loadingPromise = null;
    // Për çdo kombinim gjuhë-nivel mbajmë një radhë fjalish të përziera (Map: çelës -> varg)
    this.queues = new Map();
    // Për çdo kombinim gjuhë-nivel mbajmë elementin e fundit të dhënë, që të mos përsëritet
    this.lastItems = new Map();
    // Për çdo gjuhë: lista e të gjitha fjalëve të ndryshme (për praktikën), e llogaritur një herë
    this.practiceTokens = new Map();
  }

  /**
   * Lexon data/texts.json me fetch vetëm herën e parë. Herët e tjera kthen
   * të dhënat e ruajta. Nëse leximi dështon, hedh një gabim me mesazh shqip.
   * @returns {Promise<object>} të dhënat e teksteve
   */
  async load() {
    // Nëse të dhënat janë lexuar më parë, i kthejmë direkt pa fetch të ri
    if (this.data) {
      return this.data; // kthejmë këtë vlerë dhe dalim nga funksioni
    }
    // Nëse ngarkimi nuk ka nisur ende, e nisim dhe ruajmë premtimin
    if (!this.loadingPromise) {
      this.loadingPromise = this.fetchTexts(); // fetch nis vetëm këtu, një herë
    }
    // try: presim ngarkimin; nëse dështon, kapim gabimin te catch
    try {
      // Presim që fetch të mbarojë dhe ruajmë rezultatin
      this.data = await this.loadingPromise;
      // Kthejmë të dhënat
      return this.data;
    } catch (error) {
      // Fshijmë premtimin e dështuar, që një provë e mëvonshme të nisë fetch nga e para
      this.loadingPromise = null;
      // E hedhim gabimin më tej, që app.js ta shfaqë në faqe
      throw error;
    }
  }

  /**
   * Bën kërkesën fetch dhe kontrollon që përgjigja të jetë e saktë.
   * @returns {Promise<object>} objekti JSON i kontrolluar
   */
  async fetchTexts() {
    // Ruajmë përgjigjen këtu, që të jetë e dukshme jashtë try
    let response;
    // try: fetch hedh gabim nëse nuk ka lidhje ose nëse faqja është në file://
    try {
      // Kërkojmë skedarin; cache "no-cache" kontrollon me serverin që të marrim versionin e fundit
      response = await fetch(this.url, { cache: "no-cache" });
    } catch {
      // Gabim rrjeti: e kthejmë në mesazh të kuptueshëm shqip
      throw new Error(MESSAGES.textsError);
    }
    // response.ok është false për kode si 404 (skedari mungon) ose 500
    if (!response.ok) {
      // Hedhim të njëjtin mesazh të qartë
      throw new Error(MESSAGES.textsError);
    }
    // Ruajmë JSON-in e lexuar këtu
    let json;
    // try: response.json() hedh gabim nëse skedari nuk është JSON i vlefshëm
    try {
      // Kthejmë tekstin e përgjigjes në objekt JavaScript
      json = await response.json();
    } catch {
      // JSON i prishur (p.sh. mungon një presje)
      throw new Error(MESSAGES.textsInvalid);
    }
    // Kontrollojmë që struktura të jetë ajo që presim
    if (!TextGenerator.isValid(json)) {
      // Struktura e gabuar
      throw new Error(MESSAGES.textsInvalid);
    }
    // Gjithçka në rregull: kthejmë objektin
    return json;
  }

  /**
   * Kontrollon që JSON-i të ketë "sq" dhe "en", secila me tre nivelet
   * dhe me vargje jo bosh.
   * @param {any} json - objekti i lexuar
   * @returns {boolean} true nëse struktura është e saktë
   */
  static isValid(json) {
    // Duhet të jetë objekt dhe jo null
    if (!json || typeof json !== "object") {
      return false; // kthejmë këtë vlerë dhe dalim nga funksioni
    }
    // every kthen true vetëm nëse çdo gjuhë kalon kontrollin
    return ["sq", "en"].every((lang) => {
      // Marrim pjesën e gjuhës
      const langData = json[lang];
      // Gjuha duhet të ekzistojë
      if (!langData) {
        return false; // kthejmë këtë vlerë dhe dalim nga funksioni
      }
      // Niveli i lehtë duhet të ketë varg "words" jo bosh
      const easyOk = Array.isArray(langData.easy?.words) && langData.easy.words.length > 0;
      // Niveli mesatar duhet të ketë varg "sentences" jo bosh
      const mediumOk = Array.isArray(langData.medium?.sentences) && langData.medium.sentences.length > 0;
      // Niveli i vështirë duhet të ketë varg "sentences" jo bosh
      const hardOk = Array.isArray(langData.hard?.sentences) && langData.hard.sentences.length > 0;
      // Gjuha është e vlefshme vetëm nëse të tre nivelet janë në rregull
      return easyOk && mediumOk && hardOk;
    });
  }

  /**
   * Kthen vargun e duhur (fjalë ose fjali) për gjuhën dhe nivelin.
   * @param {string} lang - "sq" ose "en"
   * @param {string} level - "easy", "medium" ose "hard"
   * @returns {string[]} vargu me elementë
   */
  getPool(lang, level) {
    // Të dhënat duhet të jenë ngarkuar më parë me load()
    if (!this.data) {
      throw new Error(MESSAGES.textsError); // hedhim gabimin me mesazh të qartë në shqip
    }
    // Marrim nivelin brenda gjuhës
    const levelData = this.data[lang][level];
    // Niveli i lehtë ka fjalë, të tjerët kanë fjali
    return level === "easy" ? levelData.words : levelData.sentences;
  }

  /**
   * Krijon një tekst të paktën minChars karaktere të gjatë.
   * Niveli i lehtë: fjalë të rastësishme. Nivelet e tjera: fjali të përziera.
   * Elementët ndahen me një hapësirë.
   * @param {string} lang - gjuha
   * @param {string} level - niveli
   * @param {number} minChars - gjatësia minimale e tekstit
   * @returns {string} teksti i gatshëm
   */
  generate(lang, level, minChars) {
    // Marrim vargun e elementëve
    const pool = this.getPool(lang, level);
    // Çelësi unik i kombinimit, p.sh. "sq-easy"
    const key = `${lang}-${level}`;
    // Këtu mbledhim pjesët e tekstit
    const parts = [];
    // Numërojmë sa karaktere kemi mbledhur
    let length = 0;
    // Vazhdojmë të shtojmë elementë derisa të arrijmë gjatësinë e kërkuar
    while (length < minChars) {
      // Zgjedhim elementin e radhës sipas nivelit
      const item = level === "easy" ? this.nextRandomWord(key, pool) : this.nextSentence(key, pool);
      // E shtojmë te pjesët
      parts.push(item);
      // Shtojmë gjatësinë e tij plus 1 për hapësirën ndarëse
      length += item.length + 1;
    }
    // Bashkojmë pjesët me hapësirë dhe kthejmë tekstin
    return parts.join(" ");
  }

  /**
   * Zgjedh një fjalë të rastësishme, por jo të njëjtën me fjalën e fundit.
   * @param {string} key - çelësi gjuhë-nivel
   * @param {string[]} pool - lista e fjalëve
   * @returns {string} fjala e zgjedhur
   */
  nextRandomWord(key, pool) {
    // Fjala e fundit që dhamë për këtë kombinim (mund të jetë undefined)
    const last = this.lastItems.get(key);
    // Ruajmë fjalën e zgjedhur këtu
    let word;
    // do...while: zgjedhim të paktën një herë dhe përsërisim nëse del e njëjta me të fundit
    do {
      // Math.random() jep numër nga 0 deri në 0.999...; e shumëzojmë me gjatësinë dhe e rrumbullakojmë poshtë
      word = pool[Math.floor(Math.random() * pool.length)];
      // Nëse lista ka vetëm 1 fjalë, nuk mund të shmangim përsëritjen, prandaj dalim
    } while (word === last && pool.length > 1);
    // Ruajmë fjalën si "e fundit"
    this.lastItems.set(key, word);
    // E kthejmë
    return word;
  }

  /**
   * Jep fjalinë e radhës nga një radhë e përzier. Kur radha mbaron,
   * përziejmë sërish të gjitha fjalitë, duke u siguruar që e para e radhës
   * së re të mos jetë e njëjtë me të fundit të radhës së vjetër.
   * @param {string} key - çelësi gjuhë-nivel
   * @param {string[]} pool - lista e fjalive
   * @returns {string} fjalia e radhës
   */
  nextSentence(key, pool) {
    // Marrim radhën ekzistuese, ose një varg bosh nëse s'ka ende
    let queue = this.queues.get(key) || [];
    // Nëse radha është bosh, krijojmë një të re
    if (queue.length === 0) {
      // Kopje e përzier e të gjitha fjalive
      queue = TextGenerator.shuffle(pool);
      // Fjalia e fundit që dhamë
      const last = this.lastItems.get(key);
      // Nëse e para e radhës së re është e njëjtë me të fundit, e këmbejmë me të dytën
      if (queue.length > 1 && queue[0] === last) {
        // Shkëmbim me destrukturim: [a, b] = [b, a]
        [queue[0], queue[1]] = [queue[1], queue[0]];
      }
      // Ruajmë radhën e re
      this.queues.set(key, queue);
    }
    // shift() heq dhe kthen elementin e parë të radhës
    const sentence = queue.shift();
    // Ruajmë fjalinë si "e fundit"
    this.lastItems.set(key, sentence);
    // E kthejmë
    return sentence;
  }

  // ---------------- PRAKTIKA E TASTEVE TË DOBËTA ----------------

  /**
   * Të gjitha "fjalët" e ndryshme të një gjuhe: fjalët e nivelit të lehtë plus
   * çdo pjesë të fjalive të ndarë me hapësirë. Pjesët e fjalive mbajnë shenjat
   * e pikësimit dhe numrat (p.sh. "(20%)," ose "07:45"), që praktika të mund
   * të synojë edhe taste si presja, kllapat ose shifrat.
   * @param {string} lang - gjuha
   * @returns {string[]} lista pa përsëritje
   */
  getPracticeTokens(lang) {
    // Nëse e kemi llogaritur më parë, e kthejmë direkt
    if (this.practiceTokens.has(lang)) {
      return this.practiceTokens.get(lang); // lista e ruajtur
    }
    // Të dhënat e gjuhës
    const langData = this.data[lang];
    // flatMap: çdo fjali ndahet në pjesë dhe të gjitha pjesët bashkohen në një listë të vetme
    const sentenceTokens = [...langData.medium.sentences, ...langData.hard.sentences].flatMap((sentence) => sentence.split(" "));
    // Set heq përsëritjet; filter heq pjesët bosh
    const tokens = Array.from(new Set([...langData.easy.words, ...sentenceTokens])).filter((token) => token.length > 0);
    // Ruajmë listën për herët e tjera
    this.practiceTokens.set(lang, tokens);
    // E kthejmë
    return tokens;
  }

  /**
   * Krijon tekstin e praktikës nga tastet e dobëta.
   * Si funksionon:
   * 1. Për çdo tast të dobët gjejmë fjalët që e përmbajnë.
   * 2. I renditim sipas "dendësisë": sa pjesë e shkronjave të fjalës janë taste të dobëta.
   *    Mbajmë 30 më të dendurat, që teksti të ketë sa më shumë taste të dobëta.
   * 3. Çdo herë zgjedhim një tast me short, ku tasti me shkallë gabimi më të lartë
   *    ka më shumë mundësi, dhe një fjalë të rastësishme nga fjalët e tij.
   * Tastet që nuk gjenden në asnjë fjalë të kësaj gjuhe (p.sh. ë në anglisht) kapërcehen.
   * @param {string} lang - gjuha
   * @param {{key: string, rate: number}[]} weakKeys - tastet e dobëta (nga Stats.rankWeakKeys)
   * @param {number} minChars - gjatësia minimale e tekstit
   * @returns {{text: string, keys: string[]}} teksti dhe tastet që u përdorën vërtet; text bosh nëse asnjë tast s'u gjet
   */
  generatePractice(lang, weakKeys, minChars) {
    // Të gjitha fjalët e gjuhës
    const tokens = this.getPracticeTokens(lang);
    // Bashkësi me tastet e dobëta, për kontroll të shpejtë me has()
    const weakSet = new Set(weakKeys.map((item) => item.key));
    // Këtu mbledhim një grup fjalësh për çdo tast
    const groups = [];
    // Kalojmë çdo tast të dobët
    weakKeys.forEach(({ key, rate }) => {
      // Fjalët që e përmbajnë tastin (krahasim me shkronja të vogla, që "Ë" të gjendet si "ë")
      const matching = tokens
        // Mbajmë vetëm fjalët me këtë tast
        .filter((token) => token.toLowerCase().includes(key))
        // I japim çdo fjale dendësinë e saj
        .map((token) => ({ token, density: TextGenerator.weakDensity(token, weakSet) }))
        // Më e dendura e para
        .sort((a, b) => b.density - a.density)
        // Mbajmë vetëm më të dendurat
        .slice(0, PRACTICE_TOKENS_PER_KEY)
        // Kthehemi te vetë fjala
        .map((entry) => entry.token);
      // Tasti përdoret vetëm nëse u gjet të paktën një fjalë
      if (matching.length > 0) {
        // Pesha = shkalla e gabimit: tasti më i dobët zgjidhet më shpesh
        groups.push({ key, weight: rate, tokens: matching });
      }
    });
    // Asnjë tast s'u gjet në këtë gjuhë: kthejmë tekst bosh, app.js e shpjegon
    if (groups.length === 0) {
      return { text: "", keys: [] }; // asgjë për të praktikuar në këtë gjuhë
    }
    // Çelësi për të mbajtur mend fjalën e fundit të praktikës në këtë gjuhë
    const lastKey = `${lang}-practice`;
    // Fjala e fundit e dhënë (që të mos përsëritet menjëherë)
    let last = this.lastItems.get(lastKey);
    // Pjesët e tekstit
    const parts = [];
    // Gjatësia e mbledhur deri tani
    let length = 0;
    // Shtojmë fjalë derisa teksti të jetë mjaft i gjatë
    while (length < minChars) {
      // Zgjedhim një tast sipas peshës
      const group = TextGenerator.weightedPick(groups);
      // Fjala e zgjedhur
      let token;
      // Zgjedhim një fjalë të rastësishme të këtij tasti; përsërisim nëse del e njëjta me të fundit
      do {
        // Pozicion i rastësishëm në listë
        token = group.tokens[Math.floor(Math.random() * group.tokens.length)];
        // Me vetëm një fjalë s'mund ta shmangim përsëritjen
      } while (token === last && group.tokens.length > 1);
      // E shtojmë te teksti
      parts.push(token);
      // Gjatësia plus hapësira
      length += token.length + 1;
      // Mbajmë mend fjalën e fundit
      last = token;
    }
    // Ruajmë fjalën e fundit për shtesat e ardhshme
    this.lastItems.set(lastKey, last);
    // Kthejmë tekstin dhe tastet që u përdorën
    return { text: parts.join(" "), keys: groups.map((group) => group.key) };
  }

  /**
   * Dendësia e tasteve të dobëta në një fjalë: sa nga shkronjat e saj janë taste të dobëta.
   * P.sh. "çaj" me tastet {ç, j}: 2 nga 3 shkronja, pra 0.67.
   * @param {string} token - fjala
   * @param {Set<string>} weakSet - tastet e dobëta
   * @returns {number} numër nga 0 deri në 1
   */
  static weakDensity(token, weakSet) {
    // Shkronjat e fjalës me shkronja të vogla
    const chars = Array.from(token.toLowerCase());
    // Sa prej tyre janë taste të dobëta
    const weakCount = chars.filter((char) => weakSet.has(char)).length;
    // Pjesa që zënë
    return weakCount / chars.length;
  }

  /**
   * Zgjedhje me short sipas peshës: një grup me peshë 0.4 zgjidhet dy herë
   * më shpesh se një me peshë 0.2.
   * @param {{weight: number}[]} groups - grupet me peshë
   * @returns {{weight: number}} grupi i zgjedhur
   */
  static weightedPick(groups) {
    // Shuma e të gjitha peshave
    const total = groups.reduce((sum, group) => sum + group.weight, 0);
    // Një numër i rastësishëm nga 0 deri te shuma
    let roll = Math.random() * total;
    // Ecim nëpër grupe dhe zbresim peshën e secilit
    for (const group of groups) {
      // Zbresim peshën e këtij grupi
      roll -= group.weight;
      // Kur numri bie nën zero, ky është grupi i zgjedhur
      if (roll < 0) {
        return group; // kthejmë grupin e zgjedhur
      }
    }
    // Rezervë për gabimet e vogla të rrumbullakimit: grupi i fundit
    return groups[groups.length - 1];
  }

  /**
   * Përzierja Fisher-Yates: çdo renditje ka të njëjtën mundësi.
   * Kthen një varg të ri, origjinali nuk ndryshohet.
   * @param {string[]} items - vargu origjinal
   * @returns {string[]} kopje e përzier
   */
  static shuffle(items) {
    // Bëjmë kopje me spread (...) që të mos prishim vargun origjinal
    const copy = [...items];
    // Nisim nga fundi dhe ecim drejt fillimit
    for (let i = copy.length - 1; i > 0; i -= 1) {
      // Zgjedhim një pozicion të rastësishëm nga 0 deri te i (përfshirë)
      const j = Math.floor(Math.random() * (i + 1));
      // Këmbejmë elementin i me elementin j
      [copy[i], copy[j]] = [copy[j], copy[i]];
    }
    // Kthejmë kopjen e përzier
    return copy;
  }
}
