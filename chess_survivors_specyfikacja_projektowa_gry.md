# GDD & Specyfikacja Techniczna: CHECKMATE: BULLET HELL (AM76 Gamestudio)

> **Instrukcja dla Agenta AI / System Prompt Context:**  
> Niniejszy dokument stanowi pełną specyfikację projektową i inżynieryjną gry. Podczas implementacji kodu agent MUSI bezwzględnie przestrzegać standardów architektonicznych studia AM76 (pojedynczy plik HTML, zero zewnętrznych plików graficznych/dźwiękowych, asynchroniczny zapis IndexedDB, obsługa iframe GAS oraz wysoki Game Feel).

---

## 1. Przegląd Gry (High Concept)

* **Tytuł roboczy:** *Checkmate: Bullet Hell* (lub *Pawn to Queen: Bullet Hell*)
* **Studio:** AM76 gamestudio
* **Gatunek:** Szybki 2D Real-Time Top-Down Action Roguelite / Bullet Hell Shooter
* **Platforma docelowa:** WebApp (Google Apps Script `HtmlService` / standalone HTML5)
* **Kluczowy haczyk (Core Hook):** Połączenie geometrii i reguł ruchu figur szachowych z piekielnie szybką akcją w czasie rzeczywistym, ewolucją pionka (Pawn Promotion), mechaniką tykającego Zegara Szachowego oraz możliwością przełączania stylów graficznych w locie.

```
+--------------------------------------------------------------------------+
|                              CORE GAME LOOP                              |
|                                                                          |
|  [ Wybór Tempa / Stylu ] ──> [ Faza Areny (Real-Time Bullet Hell) ]     |
|                                        │                                 |
|                               (Zbieranie Żetonów)                        |
|                               (Zabójstwa = Czas)                         |
|                                        ▼                                 |
|  [ Następna Arena / Boss ] <── [ Sklep Gambitu & Ewolucja Figury ]       |
+--------------------------------------------------------------------------+
```

---

## 2. Podstawowe Mechaniki Rozgrywki (Core Mechanics)

### 2.1. Sterowanie (Input Scheme)
Wszystkie klawisze akcji muszą mieć zablokowane domyślne zachowanie przeglądarki (`e.preventDefault()`), aby zapobiec przewijaniu iframe w Google Apps Script.
* **WSAD / Strzałki:** Płynny ruch postaci we wszystkich kierunkach (360°).
* **Kursor Myszy:** Celowanie (Crosshair) i orientacja broni.
* **LPM (Lewy Przycisk Myszy / Auto-fire):** Strzał główny figury.
* **PPM / Spacja:** Zdolność specjalna / Dash zależny od aktualnie wybranej figury.
* **Klawisz `E` / `Q`:** Użycie aktywnego przedmiotu (Gambit Power-up).
* **Klawisz `T`:** Błyskawiczne przełączanie stylu graficznego w locie (Palette Swap).

### 2.2. Mechanika Zegara Szachowego (Chess Clock & Time Trouble)
Zamiast tradycyjnego timera, na górze ekranu znajduje się klasyczny dwutarczowy Zegar Szachowy gracza:
1. **Początkowy czas:** 15.0 sekund.
2. **Inkrement szachowy (+dt):** Każde zabicie wrogiej figury dodaje bonusowy czas:
   * Zwykły Pionek: $+0.8$ s
   * Skoczek / Goniec: $+2.0$ s
   * Wieża: $+3.5$ s
   * Hetman / Boss: $+10.0$ s
3. **Maksymalny limit zegara:** 30.0 sekund (nagradza agresywną grę w zwarciu).
4. **Tryb „Niedoczasu” (Time Trouble):**
   * Gdy zegar spadnie do $0.0$ s, gracz NIE przegrywa natychmiast.
   * Cała plansza przechodzi w stan **Panic Mode**: wrogowie wpadają w szał (prędkość ruchu $+40\%$, szybkostrzelność $+50\%$, ich pociski stają się wściekle czerwone), a muzyka przyspiesza.
   * Gracz ma 5 sekund na zabicie dowolnego wroga i odzyskanie czasu – jeśli w tym czasie nikt nie zginie, następuje natychmiastowy Mat (Game Over).

### 2.3. Formaty i Poziomy Trudności (Chess Tempos)
* **Rapid (Standard):** Telegrafy ataków wrogów trwają $0.9$ s, bazowa prędkość pocisków umiarkowana. Polecany do nauki mechanik.
* **Blitz (Szybki – Domyślny):** Telegrafy skrócone do $0.45$ s, wrogowie szybsi o $25\%$, drop waluty $+35\%$.
* **Bullet (Nightmare / Chaos):** Piekielne tempo, telegrafy $0.25$ s, podwojona liczba figur na arenie, wrogowie strzelają gęstszymi wzorami bullet-hell.

---

## 3. Drzewko Ewolucji Postaci (Pawn Promotion System)

Gracz rozpoczyna bieg jako drewniany **Pionek (Pawn)**. Po ukończeniu fal i uzbieraniu odpowiedniej liczby Punktów Gambitu może dokonać promocji w jedną z wyspecjalizowanych klas:

```
                    ┌─────────────────┐
                    │  PIONEK (Pawn)  │
                    │   (Tier Start)  │
                    └────────┬────────┘
         ┌───────────────────┼───────────────────┐
         ▼                   ▼                   ▼
┌─────────────────┐ ┌─────────────────┐ ┌─────────────────┐
│ SKOCZEK (Knight)│ │  GONIEC (Bishop)│ │  WIEŻA (Rook)   │
│ Mobilność & AoE │ │ Snajper/Rykoszet│ │  Tank / Brawler │
└────────┬────────┘ └────────┬────────┘ └────────┬────────┘
         └───────────────────┼───────────────────┘
                             ▼
                    ┌─────────────────┐
                    │ HETMAN (Queen)  │
                    │  (Tier 3 Boss)  │
                    └─────────────────┘
```

### Specyfikacja Figury Gracza:

| Klasa | Styl Ataku Podstawowego | Zdolność Specjalna (Spacja / PPM) | Pasywna Cecha |
| :--- | :--- | :--- | :--- |
| **Pionek** | Pojedynczy, precyzyjny strzał wiórem drewna o średnim zasięgu. | **En Passant Dash:** Krótki zryw po skosie; przejście przez pocisk kasuje go i daje $+1$ s do Zegara. | Mały hitbox ($8\times8$ px), wysoka zwrotność. |
| **Skoczek** | Podwójny strzał podkowami rozchodzący się wachlarzowo. | **Knight's Leap:** Skok w powietrze (nietykalność $0.6$ s); lądowanie w punkcie kursora tworzy falę uderzeniową AoE. | Może przeskakiwać przez ściany pocisków i przeszkody. |
| **Goniec** | Ciągły promień laserowy tnący po przekątnych; rykoszetuje $1\times$ od band planszy. | **Diagonal Cleave:** Wystrzeliwuje 4 krzyżowe lasery czyszczące całe linie widzenia. | $+20\%$ do obrażeń krytycznych przy strzale pod kątem $45^\circ$. |
| **Wieża** | Ciężkie, wolne kule artyleryjskie miażdżące wrogów w liniach prostych (kardynalnych). | **Rook Charge:** Błyskawiczna szarża przez całą planszę, rozbijająca wrogów o ściany stołu. | **Frontal Shield:** Pochłania do 3 pocisków uderzających od frontu. |
| **Hetman** | Ostrzał we wszystkich 8 kierunkach jednocześnie przy pełnej kontroli myszką. | **Royal Majesty:** Czasowe spowolnienie czasu o $75\%$ na 3 sekundy połączone z nielimitowanym dash'em. | Łączy ataki Wieży i Gońca; odblokowywana na finałowe fale. |

---

## 4. Wrogowie i Architektura Geometrii Szachowej

Wszyscy wrogowie operują na wyraźnych **telegrafach laserowych / strefach ostrzegawczych** przed wykonaniem ataku:

1. **Czarny Pionek (Grunt):**
   * *Zachowanie:* Porusza się powoli prosto w stronę gracza; atakuje szarżą po skosie na odległość 2 pól, gdy gracz znajdzie się na jego diagonali.
2. **Czarny Skoczek (Skoczek Chaosu):**
   * *Zachowanie:* Wyświetla cień lądowania w kształcie litery „L”. Wyskakuje z planszy i po 0.8 s spada na gracza, emitując 8 pierścieniowych pocisków.
3. **Czarny Goniec (Snajper Przekątnych):**
   * *Zachowanie:* Ustawia się w rogach areny, ładuje cienką czerwoną linię po przekątnej szachownicy, po czym wystrzeliwuje potężną wiązkę laserową.
4. **Czarna Wieża (Buggernaut):**
   * *Zachowanie:* Niezniszczalna od frontu. Szarżuje w linii poziomej lub pionowej przez całą planszę. Jeśli uderzy w bandę szachownicy, zostaje ogłuszona na 2 sekundy (okno do ataku w plecy).
5. **Mini-Boss: Czarny Król (The Mad King):**
   * *Zachowanie:* Otoczony tarczą z 4 orbitujących wokół niego pionków. Co 5 sekund emituje radialny bullet-hell (32 pociski po okręgu) i przyzywa posiłki.
6. **Boss Finałowy: Ręka Arcymistrza & Czarna Królowa:**
   * *Faza 1:* Czarna Królowa teleportuje się po kafelkach, łącząc ataki laserowe Gońca z salwami Wieży.
   * *Faza 2:* Nad planszą pojawia się gigantyczny cień Dłoni, która fizycznie uderza w stół, niszcząc zewnętrzne kafelki szachownicy (zmniejszając arenę z $8\times8$ do $6\times6$ i $4\times4$).

---

## 5. Ekonomia i Sklep Gambitu (The Gambit Shop)

Waluta gry: **Czarne Żetony (Gambit Points)** wypadające z rozbitych figur. Sklep otwiera się między kolejnymi falami.

### Perki Pasywne:
* **Widełki Skoczka (Knight's Fork):** Trafienie krytyczne wysyła 2 dodatkowe odłamki rykoszetujące w stronę najbliższych wrogów.
* **Związanie (Pinning Shot):** Pociski gracza mają $25\%$ szansy na unieruchomienie wroga w miejscu na $1.5$ s.
* **Poświęcenie Pionka (Sacrifice Drone):** Mały dron-pionek krąży wokół gracza. Przyjmuje jeden śmiertelny cios, po czym eksploduje, czyszcząc ekran z pocisków.
* **Polerowane Drewno:** $+15\%$ do bazowej prędkości poruszania się.
* **Ołowiany Ciężarek:** Pociski zyskują dodatkową siłę odrzutu (knockback).

### Zdolności Aktywne (Konsumowalne pod `E`):
* **Roszada (Castling):** Natychmiastowa zamiana miejsc ze specjalnym klonem rozstawionym na przeciwległym rogu szachownicy.
* **Okrzyk „Szach!”:** Fala dźwiękowa kasuje wszystkie wrogie pociski na ekranie i zamraża wrogów na $1.5$ s.

---

## 6. System 4 Wymiennych Stylów Wizualnych (Palette Swapping)

Gra NIE używa plików graficznych `.png`. Cała grafika renderowana jest proceduralnie na obiekcie `CanvasRenderingContext2D` przy użyciu **Palette Swappingu** i przełączalnych filtrów. Gracz może w każdej chwili zmienić styl klawiszem `T`.

```javascript
const GRAPHIC_THEMES = {
  WOODCRAFT: {
    id: 'woodcraft',
    name: 'Royal Woodcraft (16-bit SNES)',
    bg: '#2e1f14',
    tileLight: '#d8b88d',
    tileDark: '#784824',
    playerFill: '#f7ebd2',
    playerOutline: '#3d2314',
    enemyFill: '#1a110b',
    enemyOutline: '#b83b28',
    bulletPlayer: '#f1b82d',
    bulletEnemy: '#d93625',
    particle: 'wood_splinters',
    gridLines: '#452915',
    glow: false
  },
  CYBER_GRID: {
    id: 'cyber_grid',
    name: 'Cyber-Grid 2084 (Synthwave)',
    bg: '#05050b',
    tileLight: '#0d1224',
    tileDark: '#070913',
    playerFill: '#00ffff',
    playerOutline: '#0088aa',
    enemyFill: '#ff0055',
    enemyOutline: '#aa0033',
    bulletPlayer: '#39ff14',
    bulletEnemy: '#ff0077',
    particle: 'neon_sparks',
    gridLines: '#00ffff33',
    glow: true
  },
  ONE_BIT: {
    id: 'one_bit',
    name: '1-Bit Handheld (Game Boy Noir)',
    bg: '#0f380f',
    tileLight: '#8bac0f',
    tileDark: '#306230',
    playerFill: '#9bbc0f',
    playerOutline: '#0f380f',
    enemyFill: '#0f380f',
    enemyOutline: '#8bac0f',
    bulletPlayer: '#9bbc0f',
    bulletEnemy: '#0f380f',
    particle: 'bit_squares',
    gridLines: '#1f481f',
    glow: false
  },
  BLACKBOARD: {
    id: 'blackboard',
    name: 'Tactical Blackboard (Kreda)',
    bg: '#1c2826',
    tileLight: '#233330',
    tileDark: '#172220',
    playerFill: '#ffffff',
    playerOutline: '#aaaaaa',
    enemyFill: '#ff5555',
    enemyOutline: '#882222',
    bulletPlayer: '#ffff77',
    bulletEnemy: '#ff6666',
    particle: 'chalk_dust',
    gridLines: '#ffffff22',
    glow: false
  }
};
```

---

## 7. Warstwa Audio & Game Feel (AM76 Signature Polish)

### 7.1. Proceduralna Synteza SFX (ZzFX)
Brak plików `.wav`/`.mp3`. Wszystkie dźwięki generowane w locie przez funkcję `zzfx(...)`:
* **Wystrzał Pionka:** `zzfx(...[,0,261.6,.02,.03,.08,1,1.2,-7,,-150,,,,.1])` (suchy stuk lakierowanego drewna).
* **Zniszczenie Figury:** Pęknięcie drewna połączone z basowym dropem (`crack-shatter`).
* **Klik Zegara Szachowego:** Metaliczny podwójny klik przy każdym zabójstwie.
* **Laser Gońca:** Wysokie, narastające glissando z lekkim pogłosem.
* **Uderzenie Wieży:** Potężne basowe *THUD* oparte na niskiej częstotliwości ($45\text{ Hz}$).

### 7.2. Sprężynowy Wstrząs Kamery (Trauma-Based Screen Shake)
Wstrząsy kamery NIE mogą być czystym `Math.random()`. Obliczane na podstawie wartości $\text{Trauma} \in [0, 1]$ z wykładniczym zanikiem i szumem harmonicznym:
$$\text{offset}_x = \text{Trauma}^2 \times \text{MaxShake} \times \sin(t \times 45)$$
$$\text{offset}_y = \text{Trauma}^2 \times \text{MaxShake} \times \cos(t \times 37)$$
$$\text{Trauma}_{t+dt} = \max(0, \text{Trauma}_t - 1.6 \times dt)$$

### 7.3. Hitstop (Frame-Freeze)
Przy każdym trafieniu krytycznym, zbiciu wrogiej figury lub użyciu zdolności obszarowej, pętla gry zatrzymuje aktualizację pozycji (`update`) na **$45\text{ ms}$**, kontynuując renderowanie. Zapewnia to natychmiastowe poczucie ciężaru i siły ataku.

---

## 8. Wymogi Techniczne i Architektura Pliku

1. **Wymóg Pojedynczego Pliku (Single-File Mandate):**  
   Cała gra (HTML, style CSS, silnik cząsteczek, syntezator ZzFX, renderer canvasu, logika szachowa, maszyna stanów) musi być dostarczona w **jednym, samodzielnym pliku HTML** (`Index.html`).
2. **Bezpieczeństwo w kontenerze iframe GAS:**
   * Dynamiczny rozmiar canvasu dostosowany do `window.innerWidth` i `window.innerHeight`.
   * Skalowanie z zachowaniem wirtualnej rozdzielczości $960 \times 720$ lub responsywnego dopasowania z letterboxingiem.
   * `image-rendering: pixelated;` na elemencie `<canvas>`.
3. **Lokalna Persystencja (IndexedDB):**
   * Stan gracza (odblokowane figury, osiągnięcia, high-scores w trybach Rapid/Blitz/Bullet, wybrany styl graficzny) zapisywany asynchronicznie w bazie `AM76_CHESS_DB`.
4. **Wydajność:**
   * Stałe $60$ klatek na sekundę na słabszym sprzęcie.
   * Object Pooling dla wszystkich pocisków, cząsteczek i wskaźników telegrafów.

---

## 9. Harmonogram Wdrożenia dla Agenta AI (Krok po Kroku)

Gdy agent przystępuje do pisania kodu, implementacja powinna przebiegać w następującej kolejności:

1. **Etap 1: Shell & Render Siatki Szachownicy**  
   Skonfigurowanie pojedynczego pliku HTML, canvasu, obsługi skalowania okna, wdrożenie palet `GRAPHIC_THEMES` oraz rysowanie dynamicznej szachownicy z obramowaniem.
2. **Etap 2: Ruch Gracza i Strzelanie**  
   Implementacja kontrolera WSAD, celowania myszką, mechaniki wystrzału pocisków oraz wstrzyknięcie syntezatora ZzFX.
3. **Etap 3: Wrogowie i Kolizje**  
   Dodanie Czarnych Pionków i Skoczków z telegrafami stref rażenia, obsługa hitboksów kołowych, system zadawania obrażeń i pętla cząsteczek drewna.
4. **Etap 4: Zegar Szachowy i Poziomy Trudności**  
   Wdrożenie licznika czasu z dodawaniem sekund za zabójstwa, stanu Time Trouble oraz wyboru tempa (Rapid / Blitz / Bullet).
5. **Etap 5: Ewolucja Klas i Sklep Gambitu**  
   Drzewko awansu (Pionek $\to$ Skoczek/Goniec/Wieża $\to$ Hetman) oraz modal sklepu z perkami między falami.
6. **Etap 6: Polski szlif (Juice) i Zapis IndexedDB**  
   Dodanie wstrząsów kamery opartych na traumie, hitstopów $45\text{ ms}$, przełączania stylów pod klawiszem `T` oraz autozapisu najlepszych wyników.