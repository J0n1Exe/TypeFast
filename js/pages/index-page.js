/**
 * ===========================================================================
 * index-page.js
 * ---------------------------------------------------------------------------
 * Çfarë bën: skripti hyrës i index.html. E para gjë që bën është të
 * vendosë temën e ruajtur te <html>. Pastaj lidh butonin e temës dhe
 * nis testin (klasa TypingTest nga app.js).
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
  // E nisim (lexon tekstet dhe përgatit testin e parë)
  typingTest.init();
}
