/**
 * ===========================================================================
 * timer.js
 * ---------------------------------------------------------------------------
 * Çfarë bën: numëron kohën e testit me saktësi. Koha matet gjithmonë me
 * performance.now() (ora e saktë e shfletuesit). setInterval përdoret
 * VETËM për të rifreskuar ekranin çdo 100ms, jo për të numëruar kohën.
 * Arsyeja: setInterval mund të vonohet (p.sh. kur shfletuesi është i zënë),
 * kështu që po të numëronim "tik-ët", testi do të zgjaste më shumë se duhet.
 *
 * Çfarë eksporton: klasën Timer.
 * Kush e përdor: app.js (klasa TypingTest).
 * ===========================================================================
 */

// Importojmë sa shpesh rifreskohet ekrani
import { TIMER_INTERVAL_MS } from "../config.js";

/**
 * Kohëmatësi i testit me thirrje (callbacks) për çdo tik dhe për fundin.
 */
export class Timer {
  /**
   * Krijon kohëmatësin.
   * @param {object} options - opsionet
   * @param {(remainingSeconds: number, elapsedSeconds: number) => void} options.onTick - thirret çdo 100ms
   * @param {() => void} options.onEnd - thirret një herë kur mbaron koha
   * @param {number} [options.intervalMs=TIMER_INTERVAL_MS] - sa shpesh thirret onTick
   */
  constructor({ onTick, onEnd, intervalMs = TIMER_INTERVAL_MS }) {
    // Funksioni që thirret në çdo tik
    this.onTick = onTick;
    // Funksioni që thirret kur mbaron koha
    this.onEnd = onEnd;
    // Intervali i rifreskimit në milisekonda
    this.intervalMs = intervalMs;
    // Kohëzgjatja e testit në sekonda (vendoset te start)
    this.durationSeconds = 0;
    // Momenti i nisjes sipas performance.now(); null = nuk ka nisur
    this.startTime = null;
    // Numri identifikues i setInterval, që ta ndalojmë më vonë; null = s'ka interval aktiv
    this.intervalId = null;
  }

  /**
   * A po ecën kohëmatësi tani?
   * @returns {boolean} true nëse ka një interval aktiv
   */
  get isRunning() {
    // Nëse kemi një id intervali, kohëmatësi po ecën
    return this.intervalId !== null;
  }

  /**
   * Nis kohëmatësin për një kohëzgjatje të caktuar.
   * @param {number} durationSeconds - sa sekonda zgjat testi
   * @returns {void}
   */
  start(durationSeconds) {
    // Sigurohemi që s'ka mbetur ndonjë interval i vjetër aktiv
    this.stop();
    // Ruajmë kohëzgjatjen
    this.durationSeconds = durationSeconds;
    // Ruajmë momentin e saktë të nisjes (milisekonda me presje dhjetore)
    this.startTime = performance.now();
    // Nisim rifreskimin periodik; arrow function ruan "this" e klasës
    this.intervalId = setInterval(() => this.tick(), this.intervalMs);
    // Thërrasim një tik menjëherë, që ekrani të përditësohet pa pritur 100ms
    this.tick();
  }

  /**
   * Llogarit sa sekonda kanë kaluar nga nisja, gjithmonë nga performance.now().
   * @returns {number} sekonda të kaluara (me presje dhjetore), 0 nëse s'ka nisur
   */
  getElapsedSeconds() {
    // Nëse s'ka nisur, kanë kaluar 0 sekonda
    if (this.startTime === null) {
      return 0; // kthejmë këtë vlerë dhe dalim nga funksioni
    }
    // Diferenca në milisekonda pjesëtuar me 1000 jep sekondat
    const elapsed = (performance.now() - this.startTime) / 1000;
    // Nuk e lejojmë të kalojë kohëzgjatjen e testit
    return Math.min(elapsed, this.durationSeconds);
  }

  /**
   * Një tik: llogarit kohën e mbetur, njofton onTick dhe, nëse koha mbaroi, ndalon dhe njofton onEnd.
   * @returns {void}
   */
  tick() {
    // Sa sekonda kanë kaluar
    const elapsed = this.getElapsedSeconds();
    // Koha e mbetur, kurrë nën zero
    const remaining = Math.max(0, this.durationSeconds - elapsed);
    // Njoftojmë ndërfaqen me kohën e mbetur dhe të kaluar
    this.onTick(remaining, elapsed);
    // Nëse koha mbaroi
    if (remaining <= 0) {
      // Ndalojmë intervalin
      this.stop();
      // Njoftojmë që testi mbaroi
      this.onEnd();
    }
  }

  /**
   * Ndalon rifreskimin. Koha e kaluar mbetet e lexueshme me getElapsedSeconds().
   * @returns {void}
   */
  stop() {
    // Vetëm nëse ka një interval aktiv
    if (this.intervalId !== null) {
      // clearInterval ndalon thirrjet e mëtejshme
      clearInterval(this.intervalId);
      // Shënojmë që s'ka më interval
      this.intervalId = null;
    }
  }

  /**
   * Ndalon dhe fshin gjithçka, si në fillim.
   * @returns {void}
   */
  reset() {
    // Ndalojmë intervalin nëse ka
    this.stop();
    // Harrojmë momentin e nisjes
    this.startTime = null;
  }
}
