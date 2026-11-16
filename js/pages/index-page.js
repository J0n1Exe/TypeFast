/**
 * ===========================================================================
 * index-page.js
 * ---------------------------------------------------------------------------
 * Çfarë bën: skripti hyrës i index.html. E para gjë që bën është të
 * vendosë temën e ruajtur te <html>. Pastaj lidh butonin e temës, nis
 * testin (klasa TypingTest nga app.js) dhe përgatit udhëzuesin për
 * fillestarët (klasa TypingGuide nga guide.js).
 * Nëse faqja është hapur me file://, nuk nis testin: paralajmërimin e
 * shfaq protocol-check.js (shiko komentin te ai skedar pse).
 *
 * Çfarë eksporton: asgjë (është pikë hyrjeje, jo modul i ripërdorshëm).
 * Kush e përdor: index.html, me <script type="module">.
 * ===========================================================================
 */

// Ruajtja e të dhënave (tema dhe testi e përdorin të njëjtin objekt)
import { StorageService } from "../modules/storage.js";
// Menaxheri i temës
import { ThemeManager } from "../modules/theme.js";
// Kontrolluesi i testit
import { TypingTest } from "../app.js";
// Udhëzuesi "Mëso bazat" për fillestarët
import { TypingGuide } from "../modules/guide.js";

// Krijojmë shërbimin e ruajtjes një herë për gjithë faqen
const storage = new StorageService();
// Krijojmë menaxherin e temës me këtë shërbim
const themeManager = new ThemeManager(storage);
// E PARA: vendosim temën e ruajtur te <html>, që ngjyrat të jenë të sakta sa më shpejt
themeManager.apply();
// Lidhim butonin e temës në kokë
themeManager.bindToggle(document.getElementById("theme-toggle"));

// Nëse faqja është hapur si skedar (file://), fetch nuk punon, prandaj nuk nisim testin
if (window.location.protocol !== "file:") {
  // Krijojmë testin
  const typingTest = new TypingTest(storage);
  // E nisim (lexon tekstet dhe përgatit testin e parë).
  // Lidhja "Praktiko" te historiku hap index.html#praktike: atëherë testi i parë është praktikë.
  typingTest.init({ startInPractice: window.location.hash === "#praktike" });

  // Udhëzuesi "Mëso bazat". Dy funksionet e lidhin me testin pa i përzier dy klasat:
  const guide = new TypingGuide({
    storage, // për tastierën e zgjedhur (shqipe ose amerikane)
    onOpen: () => typingTest.cancel(), // kur hapet udhëzuesi, testi anulohet që koha të mos ecë pas dritares
    onClose: () => typingTest.focusIfActive(), // kur mbyllet, fokusi kthehet te testi
  });
  /**
   * Hap udhëzuesin kur adresa mbaron me #bazat (lidhja "Mëso bazat" te faqja "Si funksionon").
   * @returns {void}
   */
  const openGuideFromHash = () => {
    // location.hash është pjesa e adresës pas shenjës #
    if (window.location.hash === "#bazat") {
      // E hapim udhëzuesin
      guide.open();
    }
  };
  // Kontrolli i parë: faqja sapo u hap me #bazat
  openGuideFromHash();
  // "hashchange": adresa ndryshoi vetëm pas shenjës # (faqja nuk ringarkohet), p.sh. kur je tashmë te testi
  window.addEventListener("hashchange", openGuideFromHash);
}
