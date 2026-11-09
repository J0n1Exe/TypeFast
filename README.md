# TypeFast

TypeFast është një test i shpejtësisë dhe saktësisë së shkrimit në tastierë, me tekste në shqip dhe anglisht. Është ndërtuar si projekt final në kurs, vetëm me HTML, CSS dhe JavaScript (pa framework). E vetmja librari e jashtme është Chart.js 4, e ruajtur lokalisht te `assets/libs/`.

Punoi: Jon Mjekiqi, 2026.

## Si ta hapësh

Projekti përdor module JavaScript (`import` / `export`) dhe lexon tekstet me `fetch`. Shfletuesit i bllokojnë të dyja kur faqja hapet me dyklik (adresa `file://`), prandaj duhet një server lokal. Mënyra më e thjeshtë është Live Server në VS Code:

1. Hap dosjen e projektit në VS Code (File, Open Folder).
2. Instalo shtesën **Live Server** (nga Ritwick Dey) te Extensions.
3. Kliko me të djathtën mbi `index.html` dhe zgjidh **Open with Live Server**.
4. Faqja hapet te `http://127.0.0.1:5500/index.html`.

Nëse faqja hapet gabimisht me dyklik, në vend të testit shfaqet një mesazh që shpjegon këta hapa.

**Për ta provuar në tablet:** tableti dhe kompjuteri duhet të jenë në të njëjtin rrjet Wi-Fi. Te cilësimet e VS Code vendos `liveServer.settings.host` në `0.0.0.0`, rinis Live Server dhe hap në tablet adresën IP të kompjuterit, p.sh. `http://192.168.1.20:5500`. Prekja e kutisë së tekstit hap tastierën në ekran.

Projekti punon edhe pa internet: shkronjat janë të sistemit dhe Chart.js është në projekt.

## Struktura e skedarëve

```
typefast/
  index.html              testi dhe paneli i rezultatit
  historiku.html          rekordet, grafiku i përparimit dhe tabela e testeve
  rreth.html              si funksionon: formulat, shembulli, shkurtoret, teknologjitë
  README.md               ky skedar
  css/
    variables.css         të gjitha vlerat e dizajnit: ngjyrat e dy temave, hapësirat, shkronjat, kohët
    base.css              pastrimi i stileve, trupi i faqes, shkronjat, lidhjet, fokusi
    layout.css            koka, navigimi, kontejneri, fundi, pikat e ndërprerjes
    components.css        butonat, zgjedhjet (chips), çelësi, kartat, tabelat, dialogu, gjendja bosh
    test.css              shiriti i cilësimeve, statistikat, kutia e tekstit, kursori, rezultati
    pages.css             stilet e historikut dhe të faqes "Si funksionon"
    animations.css        keyframes, shfaqja gjatë lëvizjes (.reveal), prefers-reduced-motion
  js/
    config.js             konstantet: kohët, nivelet, gjuhët, çelësat e ruajtjes, kufijtë, mesazhet
    protocol-check.js     kontrolli për file:// (skript i zakonshëm, shiko shënimin më poshtë)
    app.js                klasa TypingTest: kontrolluesi që lidh të gjitha modulet
    modules/
      texts.js            klasa TextGenerator: lexon dhe gjeneron tekstin
      timer.js            klasa Timer: kohëmatësi me performance.now()
      stats.js            klasa Stats: shtypjet, WPM, saktësia, gabimet
      storage.js          klasa StorageService: localStorage me try/catch
      ui.js               klasa TestUI: gjithçka që prek faqen gjatë testit
      theme.js            klasa ThemeManager: tema e errët dhe e çelët
      chart.js            klasa ProgressChart: mbështjell Chart.js
      reveal.js           klasa ScrollReveal: IntersectionObserver për seksionet
    pages/
      index-page.js       pika e hyrjes për index.html
      history-page.js     pika e hyrjes për historiku.html
      about-page.js       pika e hyrjes për rreth.html
  data/
    texts.json            tekstet e testit
  assets/
    libs/chart.umd.min.js Chart.js v4.4.7 (UMD)
```

**Shënim për `protocol-check.js`:** kur faqja hapet me `file://`, Chrome dhe Edge bllokojnë çdo `<script type="module">`. Po ta vendosnim kontrollin brenda modulit hyrës, ai nuk do të ekzekutohej kurrë dhe faqja do të dukej e prishur pa asnjë shpjegim. Prandaj kontrolli është një skript i vogël i zakonshëm, i ngarkuar me `defer`. Çdo faqe ka përsëri vetëm një skript hyrës me `type="module"`.

## Si punon testi

- Testi nis vetë me shkronjën e parë. Para kësaj, koha tregon kohëzgjatjen e plotë.
- Shkrimi lexohet nga një `<textarea>` e padukshme që mbulon kutinë e tekstit. Përdoret ngjarja `input`, që punon saktë me ë dhe ç (AltGr, taste të vdekura) dhe me tastierat e tabletit. `keydown` përdoret vetëm për Backspace, Tab, Esc dhe për të bllokuar shigjetat.
- Çdo karakter krahasohet me karakterin në të njëjtin vend në tekst. I sakti bëhet i gjelbër, i gabuari i kuq dhe i nënvizuar (që të dallohet edhe pa ngjyra).
- Kur kursori arrin rreshtin e tretë, teksti ngjitet lart një rresht, që rreshti aktual të jetë gjithmonë në mes.
- Teksti fillestar mjafton për dikë që shkruan 150 WPM. Kur mbeten më pak se 30 karaktere, shtohet tekst i ri automatikisht.
- Kur mbaron koha, shkrimi bllokohet, rezultati ruhet në historik dhe kontrollohet nëse është rekord i ri për atë kombinim gjuhe, niveli dhe kohe.

## Formulat

**Shpejtësia (WPM):**

```
WPM = (karaktere të sakta në tekst / 5) / minuta
```

Një "fjalë" llogaritet si 5 karaktere (hapësirat përfshihen). Në fund, minutat janë gjithmonë kohëzgjatja e plotë e testit. Rezultati rrumbullakohet në numër të plotë. Gjatë sekondës së parë WPM i drejtpërdrejtë tregon 0, që të mos dalin numra të mëdhenj pa kuptim.

**Saktësia:**

```
Saktësia = (shtypje të sakta / të gjitha shtypjet) x 100
```

Rrumbullakohet me një shifër pas presjes. Nëse nuk është shtypur asgjë, saktësia është 0.

**Shembull:** test 30 sekonda, 160 shtypje, 10 të gabuara (4 prej tyre të fshira me Backspace dhe të rishkruara saktë), 150 karaktere të sakta në tekst në fund.

- Minutat: 30 / 60 = 0,5
- WPM: (150 / 5) / 0,5 = 30 / 0,5 = **60**
- Saktësia: (160 - 10) / 160 x 100 = 93,75, pra **93,8%**
- Gabime: **10**

**Gabimet:** çdo shtypje e gabuar numërohet në momentin që ndodh. Backspace e kthen karakterin në gjendjen e pashkruar, por nuk e fshin gabimin nga numërimi. Backspace nuk numërohet si shtypje.

**Ë dhe ç:** me çelësin "Prano e për ë dhe c për ç" të ndezur, `e` pranohet për `ë` dhe `c` për `ç` (edhe shkronjat e mëdha). Krahasimi është te funksioni `TypingTest.charsMatch()` në `js/app.js`.

## Shkurtoret

| Tasti | Çfarë bën |
| --- | --- |
| Tab | Test i ri me tekst të ri (testi i papërfunduar nuk ruhet) |
| Esc | Anulon testin dhe kthen të njëjtin tekst në fillim |
| Backspace | Një karakter mbrapa (gabimi mbetet i numëruar) |
| Shift + Tab | Del nga fusha e testit për navigim me tastierë |
| Çdo tast | Kur teksti është i turbullt, rikthen fokusin te testi |

## Struktura e `data/texts.json`

JSON nuk lejon komente, prandaj struktura shpjegohet këtu dhe në krye të `js/modules/texts.js`:

```
{
  "sq": {
    "easy":   { "words": ["është", "çaj", "për", ...] },
    "medium": { "sentences": ["Çdo mëngjes pi një gotë ujë ...", ...] },
    "hard":   { "sentences": ["Më 15 mars 2026, klasa jonë (gjithsej 28 nxënës) ...", ...] }
  },
  "en": { ...e njëjta strukturë në anglisht... }
}
```

- `easy.words`: fjalë të shkurtra të zakonshme (272 në shqip, 292 në anglisht). Niveli i lehtë krijon një varg fjalësh të rastësishme.
- `medium.sentences`: fjali të plota për jetën e përditshme, shkollën dhe teknologjinë (43 për gjuhë).
- `hard.sentences`: fjali me numra, data, presje, pikëpresje, thonjëza, pikëpyetje, pikëçuditje dhe kllapa (32 në shqip, 31 në anglisht).
- Nivelet mesatar dhe i vështirë përziejnë fjalitë. I njëjti element nuk del kurrë dy herë rresht.
- Të gjitha tekstet janë origjinale, të shkruara për këtë projekt.

## Ku ruhen të dhënat

Gjithçka ruhet në `localStorage` të shfletuesit, me çelësa që nisin me `typefast:`:

| Çelësi | Përmbajtja |
| --- | --- |
| `typefast:history` | deri në 200 testet e fundit: data, gjuha, niveli, koha, WPM, saktësia, gabimet, karakteret, karakteret më të gabuara |
| `typefast:records` | rekordi më i mirë për çdo kombinim `gjuha-niveli-koha` |
| `typefast:settings` | cilësimet e fundit të testit |
| `typefast:theme` | tema e zgjedhur |

Nëse `localStorage` është plot ose i bllokuar, testi punon njësoj dhe faqja thotë qartë që rezultati nuk u ruajt. Asnjë e dhënë nuk dërgohet askund.

## Teknologjitë dhe API-t e shfletuesit

- **HTML** semantik: `header`, `nav`, `main`, `section`, `footer`, tabela me `th` dhe `scope`, `dialog` vendas.
- **CSS** me variabla: çdo ngjyrë, hapësirë (vetëm shumëfisha të 8px), madhësi shkronje (vetëm 5) dhe kohë animacioni është te `variables.css`.
- **JavaScript ES6+**: klasa dhe module, një klasë për çdo modul.
- **fetch**: lexon `data/texts.json` një herë dhe e mban në kujtesë.
- **localStorage**: historiku, rekordet, cilësimet, tema.
- **performance.now**: koha e saktë. Koha e mbetur llogaritet gjithmonë nga kjo orë; `setInterval` (100ms) përdoret vetëm për të rifreskuar ekranin.
- **IntersectionObserver**: shfaq butë seksionet e historikut dhe të faqes "Si funksionon" kur hyjnë në ekran.
- **Canvas**: sipërfaqja ku Chart.js vizaton grafikun.

## Aksesueshmëria

- Fokusi me tastierë ka një vijë 2px me ngjyrën e theksit.
- Gabimet nënvizohen, jo vetëm ngjyrosen, për përdoruesit që nuk dallojnë ngjyrat.
- Statistikat e drejtpërdrejta nuk lexohen në çdo ndryshim nga lexuesi i ekranit; rezultati përfundimtar njoftohet me `aria-live="polite"`.
- Me "prefers-reduced-motion: reduce" animacionet fiken dhe kursori nuk pulson.
- Kontrasti i tekstit arrin WCAG AA në të dyja temat. Për këtë, dy ngjyra të temës së çelët janë errësuar pak nga paleta fillestare: `--correct` nga `#2E8B57` (3,89:1) në `#237A4B` (4,86:1) dhe `--accent` nga `#B7860B` (2,99:1) në `#A67A0A` (3,55:1).
