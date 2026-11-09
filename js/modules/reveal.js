/**
 * ===========================================================================
 * reveal.js
 * ---------------------------------------------------------------------------
 * Çfarë bën: përdor IntersectionObserver për të vënë re kur një seksion
 * me klasën .reveal hyn në ekran. Atëherë i shton klasën .is-visible
 * (CSS e shfaq butë dhe e ngjit 16px lart) dhe ndalon së vëzhguari atë
 * seksion, pra animacioni ndodh vetëm një herë.
 * Nëse përdoruesi ka zgjedhur "lëvizje të reduktuar", nuk bën asgjë
 * (CSS i lë seksionet të dukshme që në fillim).
 *
 * Çfarë eksporton: klasën ScrollReveal.
 * Kush e përdor: js/pages/history-page.js dhe js/pages/about-page.js.
 * ===========================================================================
 */

/**
 * Shfaqja e seksioneve gjatë lëvizjes së faqes.
 */
export class ScrollReveal {
  /**
   * Krijon objektin.
   * @param {string} [selector=".reveal"] - përzgjedhësi CSS i seksioneve
   */
  constructor(selector = ".reveal") {
    // Ruajmë përzgjedhësin
    this.selector = selector;
    // Vëzhguesi; krijohet te init()
    this.observer = null;
  }

  /**
   * A ka kërkuar përdoruesi lëvizje të reduktuar në sistem?
   * @returns {boolean} true nëse po
   */
  static prefersReducedMotion() {
    // matchMedia kontrollon të njëjtën media query si CSS
    return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  }

  /**
   * Nis vëzhgimin e të gjitha seksioneve .reveal.
   * @returns {void}
   */
  init() {
    // Me lëvizje të reduktuar s'bëjmë asgjë: CSS i mban seksionet të dukshme
    if (ScrollReveal.prefersReducedMotion()) {
      return; // ndalojmë këtu, pjesa tjetër e funksionit nuk ekzekutohet
    }
    // Gjejmë të gjitha seksionet dhe i kthejmë në varg
    const elements = Array.from(document.querySelectorAll(this.selector));
    // Nëse shfletuesi është i vjetër dhe s'ka IntersectionObserver
    if (!("IntersectionObserver" in window)) {
      // I shfaqim të gjitha menjëherë, që asgjë të mos mbetet e padukshme
      elements.forEach((element) => element.classList.add("is-visible"));
      // Dalim
      return;
    }
    // Krijojmë vëzhguesin; funksioni thirret sa herë ndryshon dukshmëria e një elementi
    this.observer = new IntersectionObserver((entries) => this.handleEntries(entries), {
      threshold: 0.15, // elementi quhet "në ekran" kur duket të paktën 15% e tij
    });
    // Fillojmë të vëzhgojmë çdo seksion
    elements.forEach((element) => this.observer.observe(element));
  }

  /**
   * Përpunon ndryshimet e dukshmërisë.
   * @param {IntersectionObserverEntry[]} entries - elementët që ndryshuan
   * @returns {void}
   */
  handleEntries(entries) {
    // Kalojmë çdo element që ndryshoi
    entries.forEach((entry) => {
      // isIntersecting = true kur elementi hyn në ekran
      if (entry.isIntersecting) {
        // I shtojmë klasën që e shfaq
        entry.target.classList.add("is-visible");
        // Ndalojmë vëzhgimin, që animacioni të ndodhë vetëm një herë
        this.observer.unobserve(entry.target);
      }
    });
  }
}
