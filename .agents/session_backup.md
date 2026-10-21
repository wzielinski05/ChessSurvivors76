Ran find specification files
Analyzed am76_game_studio_gas_gamedev_framework.md:L1-364
Analyzed chess_survivors_specyfikacja_projektowa_gry.md:L1-262
Analyzed package.json:L1-15
Ran list project directory
Ran inspect hidden directories
Ran find skill files

Cześć! Jako **Główny Architekt Oprogramowania w AM76 gamestudio**, przeanalizowałem obie specyfikacje ([`am76_game_studio_gas_gamedev_framework.md`](file:///home/wiktor/projects/am76_game_studio/ChessSurvivors76/am76_game_studio_gas_gamedev_framework.md) oraz [`chess_survivors_specyfikacja_projektowa_gry.md`](file:///home/wiktor/projects/am76_game_studio/ChessSurvivors76/chess_survivors_specyfikacja_projektowa_gry.md)).

Zgodnie z Twoim poleceniem: **nie piszę teraz kodu gry**, lecz przedstawiam analizę techniczną, modularną architekturę systemu, 3-etapowy plan wdrożenia oraz identyfikację wąskich gardeł, po czym czekam na Twój feedback.

---

### 1. Analiza rygorów technicznych

Gra powstaje w bezwzględnym standardzie AM76 zoptymalizowanym pod kątem piaskownicy Google Apps Script (GAS):

* **Single-File HTML & Zero Zewnętrznych Assetów:**
  * Całość (kod JS, style CSS, procedury rysujące, synteza audio) musi zamknąć się w pojedynczym pliku produkcyjnym `dist/Index.html` (Vite + `vite-plugin-singlefile`).
  * Zakaz odwołań do relatywnych plików grafik (`.png`, `.svg`) oraz audio (`.wav`, `.mp3`). Wszystkie elementy graficzne generujemy wektorowo na Canvas 2D, a dźwięki syntetyzujemy matematycznie w locie.
* **Canvas 2D & Skalowanie:**
  * Wirtualna przestrzeń renderowania o stałych proporcjach (np. $960 \times 720$), skalowana dynamicznie z uwzględnieniem `devicePixelRatio` (ostrość na ekranach Retina/HiDPI) oraz letterboxingiem chroniącym pole widzenia na panoramicznych i ultrawide ekranach.
  * `image-rendering: pixelated;` zapewniający ostry, retro styl.
* **Proceduralne Audio (ZzFX + Web Audio API):**
  * ZzFX o wadze ~1 KB wbudowany bezpośrednio w plik.
  * Zgodność z przeglądarkową polityką *Autoplay Policy*: `AudioContext` inicjalizowany w stanie uśpienia i odblokowywany dopiero po pierwszym geście użytkownika (`pointerdown` / `keydown`).
* **Specyfika kontenera Iframe GAS (`script.googleusercontent.com`):**
  * **Input Trap:** Blokowanie domyślnych zdarzeń (`e.preventDefault()`) dla `WSAD`, strzałek, `Spacji`, `Tab` i `PPM`, aby gra nie scrollowała strony nadrzędnej Google Workspace ani nie wywoływała menu kontekstowego.
  * **Zero Network Lag:** Pętla gry jest całkowicie odcięta od `google.script.run` i requestów sieciowych. 
  * **Asynchroniczna Persystencja:** Zapis stanu (rekordy, odblokowane klasy, preferowany styl) realizowany w `IndexedDB` (`AM76_CHESS_DB`) w tle, bez przycinania klatek renderowania.

---

### 2. Architektura modularna silnika

Mimo że wynikowy build to pojedynczy plik HTML, w strukturze źródłowej stosujemy ścisły podział odpowiedzialności na modularne podsystemy:

```
┌────────────────────────────────────────────────────────────────────────┐
│                               CORE LOOP                                │
│          Fixed Timestep Update (Fizyka) + Render (Interpolacja)        │
└───────┬────────────────────────────────┬───────────────────────────────┘
        │                                │
        ▼                                ▼
┌──────────────────┐            ┌──────────────────┐
│   STATE MACHINE  │            │   INPUT ENGINE   │
│ Menu/Arena/Shop/ │            │ WSAD, Mouse Aim, │
│ TimeTrouble/Over │            │ PreventDefault   │
└───────┬──────────┘            └────────┬─────────┘
        │                                │
        ├────────────────────────────────┤
        ▼                                ▼
┌──────────────────┐            ┌──────────────────┐
│ PHYSICS/ENTITIES │            │  RENDER & THEMES │
│ Object Pooling   │            │ Palette Swapper  │
│ AABB/Circle Coll.│            │ Vector Sprites   │
│ Lasery & Dash    │            │ Trauma Shake     │
└───────┬──────────┘            └────────┬─────────┘
        │                                │
        ├────────────────────────────────┤
        ▼                                ▼
┌──────────────────┐            ┌──────────────────┐
│   CHESS ENGINE   │            │   AUDIO SYSTEM   │
│ Zegar + Inkrement│            │ Procedural ZzFX  │
│ Geometria Szach. │            │ SFX Trigger      │
└──────────────────┘            └──────────────────┘
```

1. **State Machine (Maszyna Stanów):**
   * Stany: `MENU` $\to$ `SELECT_TEMPO` $\to$ `ARENA_RUN` $\to$ `TIME_TROUBLE` $\to$ `GAMBIT_SHOP` $\to$ `GAME_OVER` / `VICTORY`.
   * Odpowiada za wstrzymywanie świata gry podczas wizyty w Sklepie Gambitu oraz przełączanie zasad w fazie Panic Mode.
2. **Input System:**
   * Agreguje wejście z klawiatury i myszy; przelicza pozycję kursora ze współrzędnych ekranu na znormalizowane współrzędne wirtualnego canvasu ($X, Y$).
   * Zarządza focusowaniem iframe przy kliknięciu w obszar gry.
3. **Physics & Entities System (Object Pooling):**
   * Architektura bezalokacyjna: prealokowane pule obiektów (`Pool<Projectile>`, `Pool<Particle>`, `Pool<Telegraph>`).
   * Detekcja kolizji: szybkie testy koło-koło (pocisk vs postać), AABB (szarża Wieży) oraz promienie ciągłe (laser Gońca).
   * Obsługa właściwości szachowych (nietykalność podczas skoku Skoczka, tarcza frontalna Wieży).
4. **Chess Board & Clock Engine:**
   * Dedykowany moduł reguł szachowych: plansza $8 \times 8$ pól z możliwością skurczenia do $6 \times 6$ i $4 \times 4$ w finałowym starciu.
   * Mechanika Zegara Szachowego: odliczanie czasu, dodawanie bonusu inkrementu za zbicia figur, aktywacja 5-sekundowego stanu Time Trouble przy $0.0$ s.
5. **Render & Palette System:**
   * Warstwowy renderer Canvas 2D: Tło $\to$ Siatka Szachownicy $\to$ Telegrafy $\to$ Cienie/Postacie $\to$ Pociski $\to$ Cząsteczki $\to$ HUD/Zegar.
   * Moduł `GRAPHIC_THEMES`: dynamiczny słownik 4 stylów (Woodcraft, Cyber-Grid, 1-Bit, Blackboard) z natychmiastowym przełączaniem barw, konturów i cząsteczek.
   * `Camera & Screen Shake`: organiczny wstrząs na bazie nieliniowej traumy ($\text{Trauma}^2$) z tłumieniem wykładniczym.
6. **Audio System:**
   * Izolowany syntezator ZzFX z presetami dla stuków drewna, metalicznego kliku zegara, basowego *THUD* wieży i świstu laserów.

---

### 3. Plan wdrożenia (3 Etapy)

#### Etap 1: MVP & Core Loop (Fundament mechaniczny)
* **Cel:** Grywalny prototyp "Pionek na arenie" w jednym pliku HTML.
* **Zakres:**
  * Kontener HTML, skalowanie canvasu z letterboxingiem, blokada klawiszy funkcyjnych przeglądarki.
  * Pętla gry z pomiarem $\Delta t$ i obsługa stanu gry (`PLAYING`, `GAME_OVER`).
  * Ruch gracza (Pionek 360°), celowanie myszą, strzał podstawowy oparty na Object Poolu.
  * Bazowy wróg (Czarny Pionek) poruszający się w stronę gracza, proste kolizje kołowe, zadawanie obrażeń.
  * ZzFX: dźwięk strzału, trafienia i śmierci postaci.

#### Etap 2: Mechaniki Szachowe & Ewolucja Figury (Głębia rozgrywki)
* **Cel:** Pełna tożsamość szachowa gry roguelite.
* **Zakres:**
  * Zegar Szachowy (start 15 s, inkrementy za kille, tryb Panic Mode / Time Trouble).
  * Trzy tempa gry: Rapid (standard), Blitz (szybkie telegrafy), Bullet (chaos).
  * Przeciwnicy z unikalnymi zachowaniami i telegrafami:
    * Skoczek (skok „L” z lądowaniem AoE),
    * Goniec (ładowane lasery diagonalne),
    * Wieża (szarża kardynalna z ogłuszeniem po uderzeniu w bandę).
  * Drzewo Ewolucji (Pawn Promotion) w Skoczka, Gońca, Wieżę i Hetmana z dedykowanymi zdolnościami (En Passant, Knight's Leap, Diagonal Cleave, Rook Charge).
  * Zbieranie Czarnych Żetonów i interfejs Sklepu Gambitu (perki pasywne i umiejętności pod `E`).

#### Etap 3: Polish, Game Feel & Style Graficzne (Komercyjny szlif AM76)
* **Cel:** „Juice” na poziomie komercyjnym i bezbłędna dystrybucja GAS.
* **Zakres:**
  * Implementacja 4 stylów graficznych pod klawiszem `T` (Woodcraft, Cyber-Grid, 1-Bit, Blackboard).
  * System Game Feel: trauma-based camera shake, mikro-zamrożenia (Hitstop 45 ms) przy krytykach i zniszczeniu figur, cząsteczki dedykowane paletom (wióry, neony, piksele, pył kredowy).
  * Faza Bossów: Czarny Król z orbitującą tarczą oraz Ręka Arcymistrza fizycznie krusząca krawędzie szachownicy.
  * Asynchroniczny zapis postępów w `IndexedDB` (`AM76_CHESS_DB`).

---

### 4. Wąskie gardła i ryzyka inżynieryjne

1. **Garbage Collection (GC Stutter) w Canvas 2D:**
   * *Ryzyko:* Tworzenie obiektów (`new Vector`, `new Particle`, `new Projectile`) wewnątrz pętli 60 FPS wywoła mikro-ścinki GC, co w bullet-hellu niszczy precyzję gracza.
   * *Rozwiązanie:* 100% alokacji obiektów pocisków, cząsteczek i telegrafów na etapie inicjalizacji (sztywny Object Pooling z flagami `alive`).
2. **Koszty wydajnościowe efektu Glow (`shadowBlur`):**
   * *Ryzyko:* W motywie `CYBER_GRID` użycie `ctx.shadowBlur` przy 200+ pociskach na ekranie drastycznie dławi Canvas 2D na słabszych zintegrowanych kartach graficznych.
   * *Rozwiązanie:* Zamiast `shadowBlur` – warstwowe renderowanie okręgów o malejącej kryjącej przezroczystości (faux-glow) lub wykorzystanie off-screen canvasu.
3. **Utrata focusu klawiatury w Iframe GAS:**
   * *Ryzyko:* Kliknięcie poza ramkę iframe powoduje natychmiastową utratę sterowania WSAD bez wiedzy gracza.
   * *Rozwiązanie:* Globalny listener kliknięcia na canvas wymuszający `canvas.focus()` oraz graficzny wskaźnik „Click to Resume”, jeśli okno utraci focus (`window.onblur`).
4. **Matematyka ciągłych telegrafów i kolizji laserowych Gońca:**
   * *Ryzyko:* Sprawdzanie kolizji cienkiego lasera z szybko poruszającym się graczem może powodować przenikanie ("tunneling").
   * *Rozwiązanie:* Zastosowanie segmentowego testu odległości punktu (gracz) od odcinka (promień lasera) zamiast dyskretnych pocisków.

---

### Co myślisz o takim podejściu?
Jeśli zatwierdzasz ten podział i architekturę, przejdziemy do konfiguracji środowiska i realizacji **Etapu 1 (MVP & Core Loop)**. Czekam na Twoje uwagi lub ewentualne modyfikacje założeń!

Created themes.js
Created audio.js
Created math.js
Created pool.js
Created input.js
Created boardRenderer.js
Created sprites.js
Created game.js
Created main.js
Created index.html
Created bundle-singlefile.py
Ran build single-file Index.html
Ran verify single-file Index.html integrity
Analyzed Index.html:L1-120
Analyzed Index.html:L1350-1500
Analyzed Index.html:L2450-2517
Ran check module line numbers in Index.html
Ran count lines in source modules
Analyzed game.js:L660-760
Analyzed game.js:L1-250
Analyzed game.js:L1100-1379
Ran check method definitions in game.js
Ran check line counts in game.js and Index.html
Analyzed game.js:L450-650
Ran check git status

Wdrożyłem **Etap 1 (MVP & Core Loop)** wraz z inżynieryjnym rozwiązaniem wszystkich czterech wąskich gardeł. Projekt posiada teraz pełną architekturę modularną ES (`src/`) kompatybilną z Vite oraz gotowy, samowystarczalny build produkcyjny dla Google Apps Script w jednym pliku [`dist/Index.html`](file:///home/wiktor/projects/am76_game_studio/ChessSurvivors76/dist/Index.html).

---

### 1. Jak rozwiązaliśmy wąskie gardła (Bottlenecks)

1. **Zero-GC Object Pooling ([`src/pool.js`](file:///home/wiktor/projects/am76_game_studio/ChessSurvivors76/src/pool.js)):**
   * Klasa [`FixedPool`](file:///home/wiktor/projects/am76_game_studio/ChessSurvivors76/src/pool.js#L5-L42) oraz fabryka [`createPools`](file:///home/wiktor/projects/am76_game_studio/ChessSurvivors76/src/pool.js#L45-L129) prealokują na starcie płaskie struktury pamięci dla pocisków (`512`), cząsteczek (`640`), wrogów (`128`), pływających tekstów (`64`) i śladów poświaty (`48`).
   * W pętli `update(dt)` nie występuje ani jedno wywołanie `new`, `.filter()` czy `.splice()`, co całkowicie eliminuje mikro-ścinki Garbage Collectora.
2. **Offscreen Board Caching & Faux-Glow bez `shadowBlur` ([`src/boardRenderer.js`](file:///home/wiktor/projects/am76_game_studio/ChessSurvivors76/src/boardRenderer.js), [`src/sprites.js`](file:///home/wiktor/projects/am76_game_studio/ChessSurvivors76/src/sprites.js)):**
   * Klasa [`BoardRenderer`](file:///home/wiktor/projects/am76_game_studio/ChessSurvivors76/src/boardRenderer.js#L5-L199) wypala całą szachownicę $8 \times 8$, obramowanie stołu, notację algebraiczną (`A-H`, `1-8`) oraz proceduralne faktury stylu (słoje drewna, siatka synthwave, dithering 1-bit, kreskowanie kredą) na ukrytym buforze `cacheCanvas` tylko przy zmianie motywu (`T`). W pętli 60 FPS plansza renderuje się pojedynczym wywołaniem `ctx.drawImage(...)`.
   * Funkcja [`drawFauxGlow`](file:///home/wiktor/projects/am76_game_studio/ChessSurvivors76/src/sprites.js#L5-L16) zastępuje kosztowny `ctx.shadowBlur` wielowarstwowym rysowaniem koncentrycznych okręgów z kontrolowanym `globalAlpha`.
3. **Ochrona Focusu i Blokada Scrolla w Iframe GAS ([`src/input.js`](file:///home/wiktor/projects/am76_game_studio/ChessSurvivors76/src/input.js)):**
   * Klasa [`InputManager`](file:///home/wiktor/projects/am76_game_studio/ChessSurvivors76/src/input.js#L11-L161) przechwytuje klawisze sterowania (`WSAD`, strzałki, `Space`, `Tab`, `E`, `Q`, `T`, `R`) z `e.preventDefault()` oraz blokuje `contextmenu` pod `PPM`.
   * Po utracie focusu przez ramkę (`blur` / `visibilitychange`) stan klawiszy jest natychmiast zerowany ([`clearState`](file:///home/wiktor/projects/am76_game_studio/ChessSurvivors76/src/input.js#L115-L121)), a gra wyświetla pauzę z komunikatem wznowienia po kliknięciu.
4. **Ciągła detekcja kolizji Anty-Tunelowych ([`src/math.js`](file:///home/wiktor/projects/am76_game_studio/ChessSurvivors76/src/math.js)):**
   * Funkcje [`distToSegmentSq`](file:///home/wiktor/projects/am76_game_studio/ChessSurvivors76/src/math.js#L19-L28) oraz [`sweptCircleCollision`](file:///home/wiktor/projects/am76_game_studio/ChessSurvivors76/src/math.js#L31-L34) badają kolizję pocisku jako odcinka $(x_{\text{prev}}, y_{\text{prev}}) \to (x, y)$ względem kołowego hitboxa celu, zapobiegając przenikaniu szybkich pocisków przez mały hitbox Pionka ($r = 8\text{ px}$).

---

### 2. Co zostało zaimplementowane w Etapie 1

* **Shell, Viewport & 4 Style Graficzne ([`src/themes.js`](file:///home/wiktor/projects/am76_game_studio/ChessSurvivors76/src/themes.js), [`src/main.js`](file:///home/wiktor/projects/am76_game_studio/ChessSurvivors76/src/main.js)):**
  * Skalowanie $960 \times 720$ z zachowaniem proporcji 4:3 (letterboxing) w [`index.html`](file:///home/wiktor/projects/am76_game_studio/ChessSurvivors76/index.html).
  * Błyskawiczny Palette Swap pod klawiszem `T`: *Royal Woodcraft*, *Cyber-Grid 2084*, *1-Bit Handheld*, *Tactical Blackboard* wraz z dedykowanymi cząsteczkami (`wood_splinters`, `neon_sparks`, `bit_squares`, `chalk_dust`).
* **Kontroler Gracza — Biały Pionek ([`src/game.js`](file:///home/wiktor/projects/am76_game_studio/ChessSurvivors76/src/game.js)):**
  * Płynny ruch 360° (`WSAD` / Strzałki), celowanie kursorem myszy, strzał główny (`LPM` lub przełączany auto-fire pod `Q`).
  * **En Passant Dash (`Spacja` / `PPM`):** szybki zryw zostawiający poświatę; przejście przez wrogi pocisk kasuje go i dodaje $+1.0\text{ s}$ do Zegara Szachowego.
* **Wrogowie, Telegrafy i Zegar Szachowy ([`src/game.js`](file:///home/wiktor/projects/am76_game_studio/ChessSurvivors76/src/game.js)):**
  * **Czarny Pionek:** pościg i telegrafowana szarża po skosie na 2 pola ([`_updateBlackPawn`](file:///home/wiktor/projects/am76_game_studio/ChessSurvivors76/src/game.js#L541-L601)).
  * **Czarny Skoczek:** telegraf skoku po literze „L”, paraboliczny lot nad szachownicą (nietykalność w powietrzu) i uderzenie w ziemię z falą 8 pocisków radialnych ([`_updateBlackKnight`](file:///home/wiktor/projects/am76_game_studio/ChessSurvivors76/src/game.js#L604-L680)).
  * **Zegar Szachowy:** start od $15.0\text{ s}$ (limit $30.0\text{ s}$), inkrementy za zbicia ($+0.8\text{ s}$ Pionek, $+2.0\text{ s}$ Skoczek) oraz 5-sekundowy tryb **Time Trouble (Panic Mode)** po spadku czasu do zera.
* **Proceduralne Audio ZzFX & Juice ([`src/audio.js`](file:///home/wiktor/projects/am76_game_studio/ChessSurvivors76/src/audio.js)):**
  * Syntezator [`AudioEngine.zzfx`](file:///home/wiktor/projects/am76_game_studio/ChessSurvivors76/src/audio.js#L25-L141) z presetami dla stuku drewna, rozbicia figury, kliku zegara i parowania pocisków, wstrząs kamery [`computeTraumaShake`](file:///home/wiktor/projects/am76_game_studio/ChessSurvivors76/src/math.js#L39-L49) oraz $45\text{ ms}$ Hitstop.

---

### Jak uruchomić i przetestować

* **Bezpośrednio (Single-File GAS Build):** Otwórz w przeglądarce plik [`dist/Index.html`](file:///home/wiktor/projects/am76_game_studio/ChessSurvivors76/dist/Index.html) (generowany skryptem [`scripts/bundle-singlefile.py`](file:///home/wiktor/projects/am76_game_studio/ChessSurvivors76/scripts/bundle-singlefile.py) lub przez `npm run build`).
* **Dewelopersko z HMR:** Uruchom `npm run dev` (konfiguracja w [`vite.config.js`](file:///home/wiktor/projects/am76_game_studio/ChessSurvivors76/vite.config.js)).

Sprawdź jak leży sterowanie, responsywność En Passant Dasha i przełączanie stylów pod `T` — po Twoim zielonym świetle przechodzimy do **Etapu 2 (Pełne Mechaniki Szachowe, Goniec/Wieża, Drzewko Ewolucji i Sklep Gambitu)**!

### Modern Web Guidance
Próbowałem wyszukać wytyczne dotyczące wydajności animacji Canvas (`"canvas animation performance"`) w narzędziu `modern-web-guidance`, jednak w tym środowisku nie miało ono zastosowania do niskopoziomowej pętli gry Canvas 2D bez komponentów DOM.



---

## Status po wdrożeniu Etapu 2 (Mechaniki Szachowe, Ewolucja Figury & Sklep Gambitu)

Wdrożono pełny zakres **Etapu 2**:
1. **3 Formaty Tempa Szachowego (`src/chessData.js`, `src/uiRenderer.js`):**
   * Ekran wyboru tempa `SELECT_TEMPO` (klawisze `1`/`2`/`3` lub kliknięcie karty; dostępne w każdej chwili pod `M`): **Rapid** ($0.90\text{ s}$ telegrafy), **Blitz** ($0.45\text{ s}$ telegrafy, $+25\%$ prędkości wrogów, $+35\%$ waluty), **Bullet** ($0.25\text{ s}$ telegrafy, $2\times$ liczba figur, podwójna gęstość bullet-hell, $+75\%$ waluty).
2. **Pełny Bestiariusz Figur i Geometria Szachowa (`src/game.js`, `src/sprites.js`):**
   * **Czarny Pionek (`pawn`):** szarża diagonalna na 2 pola ($+0.8\text{ s}$).
   * **Czarny Skoczek (`knight`):** skok po literze „L” z lądowaniem AoE ($+2.0\text{ s}$).
   * **Czarny Goniec (`bishop`):** zajmowanie narożników i ładowanie przekątnej wiązki laserowej przez całą szachownicę z ciągłą detekcją `distToSegmentSq` ($+2.0\text{ s}$).
   * **Czarna Wieża (`rook`):** pancerz czołowy odbijający pociski od frontu, szarża kardynalna przez całą planszę i ogłuszenie na $2.0\text{ s}$ po uderzeniu w bandę stołu z basowym *THUD* $45\text{ Hz}$ ($+3.5\text{ s}$).
3. **Drzewko Ewolucji (Pawn Promotion — `src/chessData.js`, `src/game.js`):**
   * Awans z **Pionka** (Tier 1) w **Skoczka** (*Podwójny strzał podkowami* + *Knight's Leap AoE*), **Gońca** (*Laser rykoszetujący $1\times$ od bandy* + *Diagonal Cleave 4 lasery X* + *$+20\%$ CRIT pod kątem $45^\circ$*) lub **Wieżę** (*Ciężkie kule artyleryjskie* + *Rook Charge* + *Tarcza Frontalna 3 ładunki*), aż do **Hetmana** (Tier 3: *Ostrzał w 8 kierunkach* + *Royal Majesty spowalniające czas o $75\%$ na $3\text{ s}$ z nielimitowanym dashem*).
4. **Fizyczne Czarne Żetony & Sklep Gambitu (`src/uiRenderer.js`, `src/game.js`):**
   * Magnetycznie zbierane Czarne Żetony Gambitu z puli `tokens`.
   * Modal `GAMBIT_SHOP` otwierany po każdej fali oraz pod klawiszem `TAB`/`B`: 5 perków pasywnych (*Widełki Skoczka*, *Związanie*, *Poświęcenie Pionka*, *Polerowane Drewno*, *Ołowiany Ciężarek*), 2 zdolności aktywne pod klawiszem `E` (*Roszada* z klonem na przeciwległym rogu, *Okrzyk „Szach!”* zamrażający wrogów na $1.5\text{ s}$ i czyszczący pociski) oraz *Rekonstrukcja (+2 HP)*.
5. **Single-File Build:** Wygenerowano i zweryfikowano `dist/Index.html`. Gotowość do **Etapu 3 (Bossowie: Czarny Król + Ręka Arcymistrza krusząca szachownicę do 6x6 i 4x4 oraz zapis IndexedDB `AM76_CHESS_DB`)**.
