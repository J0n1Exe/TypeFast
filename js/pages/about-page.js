/**
 * ===========================================================================
 * about-page.js
 * ---------------------------------------------------------------------------
 * Çfarë bën: skripti hyrës i rreth.html. Vendos temën e ruajtur, lidh
 * butonin e temës dhe nis animacionin e shfaqjes së seksioneve
 * (ScrollReveal). Përmbajtja e faqes është statike në HTML.
 *
 * Çfarë eksporton: asgjë (pikë hyrjeje).
 * Kush e përdor: rreth.html, me <script type="module">.
 * ===========================================================================
 */

// Ruajtja e të dhënave (për temën)
import { StorageService } from "../modules/storage.js";
// Menaxheri i temës
import { ThemeManager } from "../modules/theme.js";
// Animacioni i shfaqjes së seksioneve
import { ScrollReveal } from "../modules/reveal.js";

// Krijojmë menaxherin e temës me një shërbim ruajtjeje
const themeManager = new ThemeManager(new StorageService());
// E PARA: vendosim temën e ruajtur te <html>
themeManager.apply();
// Lidhim butonin e temës
themeManager.bindToggle(document.getElementById("theme-toggle"));
// Nisim vëzhgimin e seksioneve .reveal
new ScrollReveal().init();
