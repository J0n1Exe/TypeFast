/**
 * ===========================================================================
 * speed-graph.js
 * ---------------------------------------------------------------------------
 * Çfarë bën: vizaton grafikun e shpejtësisë te paneli i rezultatit, direkt
 * me Canvas 2D API (pa Chart.js). Grafiku tregon për çdo sekondë të testit:
 *   - vijën e plotë: WPM mesatar nga fillimi deri në atë sekondë
 *   - vijën me ndërprerje: shpejtësinë e çastit (shtypjet e asaj sekonde)
 *   - një X të kuqe: sekondat ku pati gabime
 * Ngjyrat, shkronjat dhe hapësirat lexohen nga variablat CSS, pra grafiku
 * ndjek temën. Rivizatohet kur ndryshon tema ose madhësia e dritares.
 *
 * Si punon vizatimi në canvas, me pak fjalë:
 *   1. canvas është një sipërfaqe pikselash; marrim "penën" me getContext("2d")
 *   2. çdo vlerë kthehet në koordinatë: sekonda në x, shpejtësia në y
 *   3. vizatojmë vija me beginPath / moveTo / lineTo / stroke
 *   4. në ekrane të dendura (retina) canvas zmadhohet me devicePixelRatio,
 *      që vijat të mos dalin të turbullta
 *
 * Çfarë eksporton: klasën SpeedGraph.
 * Kush e përdor: ui.js (klasa TestUI), kur shfaq rezultatin.
 * ===========================================================================
 */

/**
 * Grafiku i shpejtësisë sekondë pas sekonde.
 */
export class SpeedGraph {
  /**
   * Krijon grafikun për një element <canvas>.
   * @param {HTMLCanvasElement} canvas - sipërfaqja e vizatimit
   */
  constructor(canvas) {
    // Elementi canvas
    this.canvas = canvas;
    // "Pena" 2D me të cilën vizatojmë
    this.context = canvas.getContext("2d");
    // Mostrat që vizatohen: { second, wpm, raw, errors }
    this.samples = [];
    // Id e requestAnimationFrame, që të mos rivizatojmë shumë herë gjatë ndryshimit të madhësisë
    this.frameId = null;
    // Kur ndryshon madhësia e dritares, canvas duhet rivizatuar me përmasat e reja
    window.addEventListener("resize", () => this.scheduleDraw());
    // Kur ndryshon tema, rivizatojmë me ngjyrat e reja
    document.addEventListener("themechange", () => this.draw());
  }

  /**
   * Vendos mostrat dhe vizaton.
   * @param {{second: number, wpm: number, raw: number, errors: number}[]} samples - mostrat e testit
   * @returns {void}
   */
  setSamples(samples) {
    // Ruajmë mostrat
    this.samples = samples;
    // Vizatojmë menjëherë
    this.draw();
  }

  /**
   * Planifikon një vizatim para kornizës (frame) së radhës. Nëse vijnë 20 ngjarje
   * "resize" brenda një kornize, vizatojmë vetëm një herë.
   * @returns {void}
   */
  scheduleDraw() {
    // Anulojmë kërkesën e mëparshme
    cancelAnimationFrame(this.frameId);
    // Kërkojmë një vizatim të ri
    this.frameId = requestAnimationFrame(() => this.draw());
  }

  /**
   * Lexon ngjyrat dhe madhësitë nga variablat CSS.
   * @returns {{text: string, muted: string, border: string, wrong: string, fontFamily: string, fontSize: number, space: number, lineWidth: number}} vlerat e temës
   */
  static readTheme() {
    // Stilet përfundimtare të <html>, ku janë variablat
    const styles = getComputedStyle(document.documentElement);
    // Funksion i shkurtër: lexon një variabël dhe heq hapësirat
    const read = (name) => styles.getPropertyValue(name).trim();
    // Kthejmë objektin me vlerat
    return {
      text: read("--text"), // vija e WPM
      muted: read("--text-muted"), // vija e shpejtësisë së çastit dhe etiketat
      border: read("--border"), // vijat e rrjetës
      wrong: read("--wrong"), // shenjat e gabimeve (ngjyra e statusit "gabim")
      fontFamily: read("--font-ui"), // shkronja e etiketave
      fontSize: parseFloat(read("--fs-small")), // 13
      space: parseFloat(read("--space-1")), // 8, njësia e hapësirave
      lineWidth: parseFloat(read("--focus-width")), // 2, trashësia e vijave kryesore
    };
  }

  /**
   * Gjen një hap "të rrumbullakët" për vijat horizontale (1, 2, 5, 10, 20, 50, ...),
   * që etiketat të jenë numra të lehtë për t'u lexuar.
   * @param {number} maxValue - vlera më e madhe e grafikut
   * @param {number} [targetLines=4] - rreth sa vija duam
   * @returns {number} hapi
   */
  static niceStep(maxValue, targetLines = 4) {
    // Hapi i papërpunuar, p.sh. 87 / 4 = 21.75
    const rough = maxValue / targetLines;
    // Fuqia e 10-ës poshtë tij, p.sh. 10 për 21.75 (Math.log10(21.75) = 1.33, poshtë = 1)
    const power = 10 ** Math.floor(Math.log10(rough));
    // Provojmë 1x, 2x, 5x, 10x të fuqisë dhe marrim të parin që mjafton
    const candidate = [1, 2, 5, 10].find((multiplier) => multiplier * power >= rough);
    // Kthejmë hapin, p.sh. 5 x 10 = 50
    return candidate * power;
  }

  /**
   * Çdo sa sekonda vendoset një etiketë në boshtin horizontal, që të mos mbivendosen.
   * @param {number} count - sa sekonda ka grafiku
   * @param {number} [maxLabels=8] - sa etiketa nxë boshti
   * @returns {number} intervali, p.sh. 5 (etiketa te 5, 10, 15, ...)
   */
  static labelEvery(count, maxLabels = 8) {
    // Intervalet e lejuara; find merr të parin me të cilin etiketat nxënë
    const interval = [1, 2, 5, 10, 15, 20, 30, 60].find((step) => count / step <= maxLabels);
    // Rezervë: nëse asnjë s'mjafton, përdorim më të madhin
    return interval || 60;
  }

  /**
   * Vizaton gjithë grafikun nga e para.
   * @returns {void}
   */
  draw() {
    // Përmasat e canvas-it në faqe (piksela CSS)
    const width = this.canvas.clientWidth;
    // Lartësia në faqe
    const height = this.canvas.clientHeight;
    // Pa mostra, ose kur paneli është i fshehur (përmasa 0), s'ka çfarë të vizatojmë
    if (this.samples.length === 0 || width === 0 || height === 0) {
      return; // dalim pa vizatuar
    }
    // Shkurtim për penën
    const ctx = this.context;
    // Sa piksela realë ka ekrani për një piksel CSS (2 në ekrane retina)
    const ratio = window.devicePixelRatio || 1;
    // Madhësia e brendshme e canvas-it në piksela realë (kjo edhe e fshin canvas-in)
    this.canvas.width = Math.round(width * ratio);
    // E njëjta për lartësinë
    this.canvas.height = Math.round(height * ratio);
    // Shkallëzojmë penën, që ne të vizatojmë në piksela CSS dhe rezultati të dalë i mprehtë
    ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
    // Pastrojmë gjithë sipërfaqen
    ctx.clearRect(0, 0, width, height);

    // Ngjyrat dhe madhësitë e temës aktuale
    const theme = SpeedGraph.readTheme();
    // Vendi bosh rreth zonës së vizatimit: majtas për numrat, poshtë për sekondat
    const left = theme.space * 5;
    // Pak vend djathtas, që pika e fundit të mos pritet
    const right = theme.space * 2;
    // Pak vend lart
    const top = theme.space * 2;
    // Vend poshtë për etiketat e sekondave
    const bottom = theme.space * 4;
    // Gjerësia e zonës ku vizatohen vijat
    const plotWidth = width - left - right;
    // Lartësia e zonës ku vizatohen vijat
    const plotHeight = height - top - bottom;

    // Vlera më e madhe mes WPM dhe shpejtësisë së çastit (të paktën 10, që boshti të mos jetë bosh)
    const maxValue = Math.max(10, ...this.samples.map((sample) => Math.max(sample.wpm, sample.raw)));
    // Hapi i rrumbullakët i vijave horizontale
    const step = SpeedGraph.niceStep(maxValue);
    // Maja e boshtit: shumëfishi i parë i hapit mbi vlerën më të madhe
    const topValue = Math.ceil(maxValue / step) * step;
    // Numri i mostrave
    const count = this.samples.length;

    /**
     * Kthen pozicionin (indeksin) e një mostre në koordinatën x.
     * @param {number} index - pozicioni i mostrës (0 = sekonda e parë)
     * @returns {number} x në piksela
     */
    const xOf = (index) => (count === 1 ? left + plotWidth / 2 : left + (index / (count - 1)) * plotWidth);

    /**
     * Kthen një vlerë shpejtësie në koordinatën y. Në canvas y rritet POSHTË,
     * prandaj vlera zbritet nga fundi i zonës.
     * @param {number} value - shpejtësia
     * @returns {number} y në piksela
     */
    const yOf = (value) => top + plotHeight - (value / topValue) * plotHeight;

    // ---- Rrjeta horizontale dhe numrat e boshtit vertikal ----
    // Shkronja e etiketave
    ctx.font = `${theme.fontSize}px ${theme.fontFamily}`;
    // Ngjyra e etiketave
    ctx.fillStyle = theme.muted;
    // Numrat rreshtohen djathtas, ngjitur me boshtin
    ctx.textAlign = "right";
    // Numri qendërzohet vertikalisht te vija e vet
    ctx.textBaseline = "middle";
    // Ngjyra e vijave të rrjetës
    ctx.strokeStyle = theme.border;
    // Vija të holla 1px
    ctx.lineWidth = 1;
    // Vija pa ndërprerje
    ctx.setLineDash([]);
    // Një vijë për çdo hap, nga 0 deri te maja
    for (let value = 0; value <= topValue; value += step) {
      // Lartësia e kësaj vije
      const y = yOf(value);
      // Fillojmë një rrugë të re
      ctx.beginPath();
      // Nisim nga e majta e zonës
      ctx.moveTo(left, y);
      // Deri në të djathtë
      ctx.lineTo(left + plotWidth, y);
      // E vizatojmë
      ctx.stroke();
      // Numri majtas vijës
      ctx.fillText(String(value), left - theme.space, y);
    }

    // ---- Etiketat e sekondave në boshtin horizontal ----
    // Çdo sa sekonda vendoset etiketë
    const every = SpeedGraph.labelEvery(count);
    // Etiketa qendërzohet te pika e vet
    ctx.textAlign = "center";
    // Teksti nis poshtë vijës
    ctx.textBaseline = "top";
    // Kalojmë çdo mostër
    this.samples.forEach((sample, index) => {
      // Vetëm sekondat që pjesëtohen me intervalin (p.sh. 5, 10, 15)
      if (sample.second % every === 0) {
        // Etiketa "5 s" poshtë zonës
        ctx.fillText(`${sample.second} s`, xOf(index), top + plotHeight + theme.space);
      }
    });

    // ---- Vija e shpejtësisë së çastit (me ndërprerje, gri) ----
    // Ngjyra gri
    ctx.strokeStyle = theme.muted;
    // Trashësia e vijës
    ctx.lineWidth = theme.lineWidth;
    // Ndërprerjet: 8px vijë, 4px bosh
    ctx.setLineDash([theme.space, theme.space / 2]);
    // Vizatojmë vijën nëpër të gjitha mostrat
    this.strokeLine(this.samples.map((sample, index) => [xOf(index), yOf(sample.raw)]));

    // ---- Vija e WPM (e plotë, me ngjyrën e tekstit) ----
    // Ngjyra e tekstit
    ctx.strokeStyle = theme.text;
    // Pa ndërprerje
    ctx.setLineDash([]);
    // Vizatojmë vijën
    this.strokeLine(this.samples.map((sample, index) => [xOf(index), yOf(sample.wpm)]));

    // ---- Shenjat e gabimeve: një X e kuqe te sekondat me gabime ----
    // Ngjyra e statusit "gabim"
    ctx.strokeStyle = theme.wrong;
    // Gjysma e madhësisë së X-it
    const half = theme.space / 2;
    // Kalojmë çdo mostër
    this.samples.forEach((sample, index) => {
      // Vetëm sekondat me të paktën një gabim
      if (sample.errors > 0) {
        // Qendra e X-it: mbi vijën e WPM në atë sekondë
        const x = xOf(index);
        // Lartësia e qendrës
        const y = yOf(sample.wpm);
        // Rrugë e re
        ctx.beginPath();
        // Vija e parë e X-it: nga lart majtas
        ctx.moveTo(x - half, y - half);
        // deri poshtë djathtas
        ctx.lineTo(x + half, y + half);
        // Vija e dytë: nga lart djathtas
        ctx.moveTo(x + half, y - half);
        // deri poshtë majtas
        ctx.lineTo(x - half, y + half);
        // I vizatojmë të dyja
        ctx.stroke();
      }
    });
  }

  /**
   * Vizaton një vijë që kalon nëpër një listë pikash.
   * Me vetëm një pikë, vizaton një rreth të vogël, që të shihet diçka.
   * @param {number[][]} points - pikat si [x, y]
   * @returns {void}
   */
  strokeLine(points) {
    // Shkurtim për penën
    const ctx = this.context;
    // Rrugë e re
    ctx.beginPath();
    // Rasti i veçantë: një pikë e vetme
    if (points.length === 1) {
      // Rreth me rreze sa trashësia e vijës, rreth pikës (2 x PI = rreth i plotë)
      ctx.arc(points[0][0], points[0][1], ctx.lineWidth, 0, Math.PI * 2);
    }
    // Kalojmë çdo pikë
    points.forEach(([x, y], index) => {
      // Pika e parë: vetëm e çojmë penën aty, pa vizatuar
      if (index === 0) {
        // Lëviz pa vizatuar
        ctx.moveTo(x, y);
      } else {
        // Pikat e tjera: vijë nga pika e mëparshme
        ctx.lineTo(x, y);
      }
    });
    // Vizatojmë rrugën
    ctx.stroke();
  }
}
