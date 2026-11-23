/**
 * ===========================================================================
 * result-image.js
 * ---------------------------------------------------------------------------
 * Çfarë bën: krijon një foto PNG të rezultatit të testit, që përdoruesi ta
 * ruajë ose ta ndajë. Karta vizatohet me Canvas 2D në një <canvas> që nuk
 * shfaqet në faqe, me ngjyrat e temës aktuale (lexohen nga variablat CSS):
 *   - emri TypeFast dhe data
 *   - WPM me numër të madh
 *   - saktësia dhe gabimet
 *   - gjuha, niveli dhe gjatësia e testit
 *   - "Rekord i ri personal", kur testi ishte rekord
 * Pastaj canvas.toDataURL("image/png") e kthen vizatimin në një adresë
 * "data:" me foton brenda, dhe një lidhje me atributin download e shkarkon.
 *
 * Çfarë eksporton: klasën ResultImage.
 * Kush e përdor: app.js (butoni "Shkarko rezultatin" te paneli i rezultatit).
 * ===========================================================================
 */

// Përmasat e fotos, listat për emrat shqip, formatimi dhe mesazhet
import {
  RESULT_IMAGE_WIDTH, // gjerësia: 1200
  RESULT_IMAGE_HEIGHT, // lartësia: 630
  LANGUAGES, // emrat e gjuhëve
  LEVEL_LABELS, // emrat e niveleve
  MESSAGES, // mesazhet
  findLabel, // gjen emrin shqip nga id-ja
  formatDecimal, // numër me presje dhjetore
  lengthDescription, // "30 sekonda" ose "25 fjalë në 41,3 sekonda"
} from "../config.js"; // skedari nga vijnë të gjitha

/**
 * Shton 0 para numrave njëshifrorë, p.sh. 9 -> "09".
 * @param {number} value - numri
 * @returns {string} numri me dy shifra
 */
function pad(value) {
  // Plotësim nga e majta me zero deri në 2 karaktere
  return String(value).padStart(2, "0");
}

/**
 * Fotoja e rezultatit.
 */
export class ResultImage {
  /**
   * Lexon ngjyrat, shkronjat dhe hapësirat nga variablat CSS të temës aktuale.
   * @returns {{bg: string, surface: string, border: string, text: string, muted: string, fontUi: string, fontMono: string, fsDisplay: number, fsTitle: number, fsBody: number, fsSmall: number, space: number}} vlerat
   */
  static readTheme() {
    // Stilet përfundimtare të <html>, ku janë variablat
    const styles = getComputedStyle(document.documentElement);
    // Funksion i shkurtër: lexon një variabël dhe heq hapësirat
    const read = (name) => styles.getPropertyValue(name).trim();
    // Kthejmë vlerat
    return {
      bg: read("--bg"), // sfondi i fotos
      surface: read("--surface"), // sfondi i kartës
      border: read("--border"), // korniza
      text: read("--text"), // teksti kryesor
      muted: read("--text-muted"), // teksti dytësor
      fontUi: read("--font-ui"), // shkronjat e ndërfaqes
      fontMono: read("--font-mono"), // shkronjat e numrave
      fsDisplay: parseFloat(read("--fs-display")), // 64 (ose 48 në tablet)
      fsTitle: parseFloat(read("--fs-title")), // 32
      fsBody: parseFloat(read("--fs-body")), // 16
      fsSmall: parseFloat(read("--fs-small")), // 13
      space: parseFloat(read("--space-1")), // 8, njësia e hapësirave
    };
  }

  /**
   * Data dhe ora e testit, p.sh. "23.11.2026, 17:30".
   * @param {string} iso - data ISO
   * @returns {string} teksti
   */
  static formatDate(iso) {
    // Objekt Date në orën lokale
    const date = new Date(iso);
    // Dita.muaji.viti, ora:minuta
    return `${pad(date.getDate())}.${pad(date.getMonth() + 1)}.${date.getFullYear()}, ${pad(date.getHours())}:${pad(date.getMinutes())}`;
  }

  /**
   * Vizaton kartën e rezultatit në një canvas të ri (që nuk shfaqet në faqe).
   * Madhësitë e shkronjave nisin nga tokenat CSS dhe shumëzohen me 2, sepse fotoja
   * (1200 piksela) është shumë më e madhe se karta në faqe.
   * @param {{dateISO: string, lang: string, level: string, mode?: string, duration: number, words?: number, wpm: number, accuracy: number, errors: number}} entry - testi i ruajtur
   * @param {{isRecord: boolean}} flags - a ishte rekord
   * @returns {HTMLCanvasElement} canvas-i me vizatimin
   */
  static draw(entry, { isRecord }) {
    // Canvas i ri, vetëm në kujtesë
    const canvas = document.createElement("canvas");
    // Gjerësia në piksela
    canvas.width = RESULT_IMAGE_WIDTH;
    // Lartësia në piksela
    canvas.height = RESULT_IMAGE_HEIGHT;
    // "Pena" 2D
    const ctx = canvas.getContext("2d");
    // Vlerat e temës aktuale
    const t = ResultImage.readTheme();
    // Shkalla: fotoja është rreth dy herë më e madhe se faqja
    const scale = 2;
    // Hapësira e jashtme e kartës: 48 piksela
    const margin = t.space * 6;
    // Hapësira e brendshme: 64 piksela
    const pad = t.space * 8;

    // ---- Sfondi dhe karta ----
    // Ngjyra e sfondit
    ctx.fillStyle = t.bg;
    // Mbushim gjithë foton
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    // Ngjyra e kartës
    ctx.fillStyle = t.surface;
    // Ngjyra e kornizës
    ctx.strokeStyle = t.border;
    // Korniza 2 piksela (1 piksel i faqes x shkalla)
    ctx.lineWidth = scale;
    // Rruga e kartës
    ctx.beginPath();
    // Drejtkëndëshi me qoshe 8 x 2 = 16 piksela (roundRect s'ekziston në shfletues shumë të vjetër, atëherë qoshe të drejta)
    if (typeof ctx.roundRect === "function") {
      // Drejtkëndësh me qoshe të rrumbullakëta
      ctx.roundRect(margin, margin, canvas.width - margin * 2, canvas.height - margin * 2, t.space * scale);
    } else {
      // Drejtkëndësh i zakonshëm
      ctx.rect(margin, margin, canvas.width - margin * 2, canvas.height - margin * 2);
    }
    // Mbushim kartën
    ctx.fill();
    // Vizatojmë kornizën
    ctx.stroke();

    // Skajet e brendshme të kartës, ku nis dhe mbaron teksti
    const left = margin + pad;
    // Skaji i djathtë
    const right = canvas.width - margin - pad;
    // Skaji i sipërm
    const top = margin + pad;
    // Skaji i poshtëm
    const bottom = canvas.height - margin - pad;
    // Teksti vizatohet nga "vija bazë" poshtë shkronjave, si në një fletore
    ctx.textBaseline = "alphabetic";

    // ---- Rreshti i sipërm: TypeFast majtas, data djathtas ----
    // Shkronja e emrit
    ctx.font = `bold ${t.fsTitle * scale * 0.75}px ${t.fontMono}`;
    // Ngjyra e tekstit
    ctx.fillStyle = t.text;
    // Rreshtuar majtas
    ctx.textAlign = "left";
    // Emri
    ctx.fillText("TypeFast", left, top + t.fsTitle);
    // Shkronja e datës
    ctx.font = `${t.fsBody * scale}px ${t.fontUi}`;
    // Ngjyra dytësore
    ctx.fillStyle = t.muted;
    // Rreshtuar djathtas
    ctx.textAlign = "right";
    // Data e testit
    ctx.fillText(ResultImage.formatDate(entry.dateISO), right, top + t.fsTitle);

    // ---- WPM, numri i madh ----
    // Vija bazë e numrit të madh
    const wpmBaseline = top + t.fsTitle + t.fsDisplay * scale * 1.5;
    // Shkronja e madhe: 64 x 2,5 = 160 piksela
    ctx.font = `bold ${t.fsDisplay * scale * 1.25}px ${t.fontMono}`;
    // Ngjyra e tekstit
    ctx.fillStyle = t.text;
    // Rreshtuar majtas
    ctx.textAlign = "left";
    // Numri
    ctx.fillText(String(entry.wpm), left, wpmBaseline);
    // Gjerësia e numrit, që etiketa të dalë pas tij
    const wpmWidth = ctx.measureText(String(entry.wpm)).width;
    // Shkronja e etiketës
    ctx.font = `${t.fsTitle * scale * 0.75}px ${t.fontUi}`;
    // Ngjyra dytësore
    ctx.fillStyle = t.muted;
    // "WPM" pas numrit, me 16 piksela hapësirë
    ctx.fillText("WPM", left + wpmWidth + t.space * 2, wpmBaseline);

    // ---- Saktësia dhe gabimet, djathtas ----
    // Dy blloqe: [etiketa, vlera]
    const blocks = [
      ["SAKTËSIA", `${formatDecimal(entry.accuracy)}%`], // saktësia me presje
      ["GABIME", String(entry.errors)], // gabimet
    ];
    // Vizatojmë çdo bllok, njërin poshtë tjetrit
    blocks.forEach(([label, value], index) => {
      // Vija bazë e vlerës: blloku i parë nis 128 piksela poshtë datës (që etiketa të mos e prekë), blloqet ndahen me 120 piksela
      const baseline = top + t.fsTitle + t.space * 16 + index * t.space * 15;
      // Shkronja e etiketës
      ctx.font = `${t.fsSmall * scale}px ${t.fontUi}`;
      // Ngjyra dytësore
      ctx.fillStyle = t.muted;
      // Rreshtuar djathtas
      ctx.textAlign = "right";
      // Etiketa mbi vlerën
      ctx.fillText(label, right, baseline - t.fsTitle * scale);
      // Shkronja e vlerës
      ctx.font = `bold ${t.fsTitle * scale}px ${t.fontMono}`;
      // Ngjyra e tekstit
      ctx.fillStyle = t.text;
      // Vlera
      ctx.fillText(value, right, baseline);
    });

    // ---- Rreshti i poshtëm: gjuha, niveli, gjatësia ----
    // Teksti, p.sh. "Shqip · Mesatare · 30 sekonda" (· është pika e mesme)
    const meta = [findLabel(LANGUAGES, entry.lang), findLabel(LEVEL_LABELS, entry.level), lengthDescription(entry)].join(" · ");
    // Shkronja
    ctx.font = `${t.fsBody * scale}px ${t.fontUi}`;
    // Ngjyra dytësore
    ctx.fillStyle = t.muted;
    // Rreshtuar majtas
    ctx.textAlign = "left";
    // Teksti në fund të kartës
    ctx.fillText(meta, left, bottom);
    // Kur testi ishte rekord, e shënojmë djathtas poshtë
    if (isRecord) {
      // Shkronja e trashë
      ctx.font = `bold ${t.fsBody * scale}px ${t.fontUi}`;
      // Ngjyra e tekstit
      ctx.fillStyle = t.text;
      // Rreshtuar djathtas
      ctx.textAlign = "right";
      // "Rekord i ri personal"
      ctx.fillText(MESSAGES.resultImageRecord, right, bottom);
    }
    // Kthejmë canvas-in
    return canvas;
  }

  /**
   * Vizaton foton dhe e shkarkon si PNG.
   * @param {object} entry - testi i ruajtur
   * @param {{isRecord: boolean}} flags - a ishte rekord
   * @returns {string} emri i skedarit të shkarkuar
   */
  static download(entry, flags) {
    // Vizatimi
    const canvas = ResultImage.draw(entry, flags);
    // toDataURL: e kthen vizatimin në tekst "data:image/png;base64,..." me foton brenda
    const url = canvas.toDataURL("image/png");
    // Data e testit për emrin e skedarit
    const date = new Date(entry.dateISO);
    // Emri, p.sh. "typefast-rezultati-2026-11-23-1730.png"
    const filename = `typefast-rezultati-${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}-${pad(date.getHours())}${pad(date.getMinutes())}.png`;
    // Lidhja që shkarkon
    const link = document.createElement("a");
    // Adresa me foton
    link.href = url;
    // download: shfletuesi e ruan si skedar me këtë emër
    link.download = filename;
    // E shtojmë në faqe (disa shfletues klikojnë vetëm lidhje që janë në faqe)
    document.body.append(link);
    // Klikimi nga kodi nis shkarkimin
    link.click();
    // E heqim lidhjen
    link.remove();
    // Kthejmë emrin për mesazhin
    return filename;
  }
}
