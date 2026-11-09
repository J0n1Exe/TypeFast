/**
 * ===========================================================================
 * protocol-check.js
 * ---------------------------------------------------------------------------
 * Çfarë bën: kontrollon nëse faqja është hapur me dyklik nga dosja
 * (adresa fillon me "file:"). Në atë rast i shton <html> klasën
 * "is-file-protocol" (CSS fsheh përmbajtjen që s'do të punonte) dhe
 * shfaq kutinë #file-warning me udhëzimet për Live Server.
 *
 * Pse ky skedar është skript i zakonshëm dhe JO modul:
 * kur faqja hapet me file://, Chrome dhe Edge bllokojnë çdo
 * <script type="module"> (për arsye sigurie, rregulli CORS). Pra, po ta
 * vendosnim këtë kontroll brenda index-page.js, ai nuk do të ekzekutohej
 * kurrë dhe përdoruesi do të shihte një faqe të prishur pa asnjë shpjegim.
 * Skriptet e zakonshme ekzekutohen edhe në file://, prandaj kontrolli
 * duhet të jetë këtu.
 *
 * Çfarë eksporton: asgjë (skript i zakonshëm, pa import/export).
 * Kush e përdor: index.html, historiku.html dhe rreth.html, me atributin defer.
 * ===========================================================================
 */

/**
 * Funksion që thirret menjëherë (IIFE). Gjithçka brenda tij është lokale,
 * pra nuk krijon asnjë variabël globale.
 * @returns {void}
 */
(function checkProtocol() {
  // "use strict": modalitet i rreptë, gabimet e zakonshme bëhen gabime të dukshme
  "use strict";
  // Nëse adresa NUK fillon me file:, faqja është hapur siç duhet dhe s'bëjmë asgjë
  if (window.location.protocol !== "file:") {
    return; // ndalojmë këtu, pjesa tjetër e funksionit nuk ekzekutohet
  }
  // Klasa te <html>: CSS fsheh <main> sepse nuk do të punonte
  document.documentElement.classList.add("is-file-protocol");
  // Me defer, HTML është lexuar i gjithi, pra kutia e paralajmërimit ekziston
  var warning = document.getElementById("file-warning");
  // Nëse kutia ekziston në këtë faqe
  if (warning) {
    // E shfaqim (heqim atributin hidden)
    warning.hidden = false;
  }
})(); // mbyllim funksionin dhe e thërrasim menjëherë me ()
