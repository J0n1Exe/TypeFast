/**
 * ===========================================================================
 * theme.js
 * ---------------------------------------------------------------------------
 * Çfarë bën: menaxhon temën e errët dhe të çelët. Lexon temën e ruajtur,
 * vendos atributin data-theme te <html> (CSS ndërron ngjyrat sipas tij),
 * e ndërron me butonin, e ruan dhe lëshon ngjarjen "themechange" që e
 * dëgjon grafiku (chart.js) për t'u rivizatuar me ngjyrat e reja.
 *
 * Çfarë eksporton: klasën ThemeManager.
 * Kush e përdor: të tri skriptet hyrëse te js/pages/ (e para gjë që bëjnë).
 * ===========================================================================
 */

// Importojmë tekstet e aria-label për butonin
import { MESSAGES } from "../config.js";

/**
 * Menaxheri i temës.
 */
export class ThemeManager {
  /**
   * Krijon menaxherin dhe lexon temën e ruajtur.
   * @param {import("./storage.js").StorageService} storage - shërbimi i ruajtjes
   */
  constructor(storage) {
    // Ruajmë shërbimin e ruajtjes
    this.storage = storage;
    // Lexojmë temën e ruajtur ("dark" si parazgjedhje)
    this.theme = storage.getTheme();
    // Butoni i temës; vendoset te bindToggle
    this.button = null;
  }

  /**
   * Vendos temën te <html>. Nëse s'jepet tema, përdor atë të ruajtur.
   * @param {string} [theme=this.theme] - "dark" ose "light"
   * @returns {void}
   */
  apply(theme = this.theme) {
    // Ruajmë temën aktuale
    this.theme = theme;
    // document.documentElement është <html>; dataset.theme shkruan atributin data-theme
    document.documentElement.dataset.theme = theme;
    // Përditësojmë tekstin e butonit nëse butoni ekziston
    this.updateButton();
  }

  /**
   * Ndërron temën: e errët bëhet e çelët dhe anasjelltas. E ruan dhe njofton faqen.
   * @returns {void}
   */
  toggle() {
    // Operatori ternar: nëse është "dark" bëhet "light", përndryshe "dark"
    const next = this.theme === "dark" ? "light" : "dark";
    // E vendosim te faqja
    this.apply(next);
    // E ruajmë në localStorage
    this.storage.saveTheme(next);
    // Lëshojmë ngjarjen që e dëgjon grafiku; detail mban emrin e temës së re
    document.dispatchEvent(new CustomEvent("themechange", { detail: { theme: next } }));
  }

  /**
   * Lidh butonin e temës: klikimi ndërron temën.
   * @param {HTMLButtonElement|null} button - butoni te koka
   * @returns {void}
   */
  bindToggle(button) {
    // Nëse butoni nuk ekziston në këtë faqe, s'bëjmë asgjë
    if (!button) {
      return; // ndalojmë këtu, pjesa tjetër e funksionit nuk ekzekutohet
    }
    // Ruajmë butonin
    this.button = button;
    // Dëgjojmë klikimin dhe thërrasim toggle
    button.addEventListener("click", () => this.toggle());
    // Vendosim tekstin e saktë që në fillim
    this.updateButton();
  }

  /**
   * Përditëson aria-label të butonit sipas temës (ikona ndërrohet vetëm me CSS).
   * @returns {void}
   */
  updateButton() {
    // Pa buton s'ka çfarë përditësojmë
    if (!this.button) {
      return; // ndalojmë këtu, pjesa tjetër e funksionit nuk ekzekutohet
    }
    // Butoni përshkruan veprimin: në temën e errët "Kalo në temën e çelët" dhe anasjelltas
    const label = this.theme === "dark" ? MESSAGES.themeToLight : MESSAGES.themeToDark;
    // Vendosim tekstin për lexuesit e ekranit
    this.button.setAttribute("aria-label", label);
    // title: i njëjti tekst shfaqet kur miu qëndron mbi buton
    this.button.title = label;
  }
}
