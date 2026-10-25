# Mobile Viewport & Balance Specification

## Problem Statement

Gra Checkmate: Bullet Hell była zablokowana na sztywnym oknie 4:3 (960x720) z czarnymi pasami letterboxingu, co marnowało ekran na nowoczesnych monitorach i uniemożliwiało komfortową rozgrywkę na urządzeniach mobilnych. Ponadto brak obsługi dotyku wykluczał graczy smartfonowych, a cała gra zamykała się w zaledwie 5 krótkich falach (mniej niż 2 minuty), generując w końcówce nieczytelny chaos bez czasu na rozwój strategii szachowej i ewolucję figury.

## Goals

- [ ] Dynamiczne wypełnienie 100% okna przeglądarki na dowolnych proporcjach (16:9, 21:9, mobile) z proceduralnym tłem otwartego stołu i zachowaniem szachownicy.
- [ ] Zapewnienie pełnego wsparcia dla urządzeń mobilnych w orientacji poziomej (Landscape) oraz pionowej (Portrait) wraz z wirtualnym joystickiem dotykowym i dwoma trybami celowania (Hybryda Auto-Aim oraz Twin-Stick).
- [ ] Przebudowa HUD na układ modularny i responsywny z możliwością wyboru umiejscowienia (Góra, Dół pod kciukami, Kompaktowy).
- [ ] Rebalans długości i krzywej trudności rozgrywki dopasowany do formatów szachowych (Bullet ~3.5 min, Blitz ~6 min, Rapid ~8.5 min) z czytelnymi, sekwencyjnymi telegrafami ataków bossów.

## Out of Scope

Explicitly excluded. Documented to prevent scope creep.

| Feature | Reason |
| --- | --- |
| Zmiana kształtu szachownicy na prostokątny | Szachownica musi pozostać kwadratem 8x8 dla zachowania geometrii ruchów szachowych (skoczek, goniec, wieża). |
| Backendowy sieciowy multiplayer | Gra pozostaje single-player client-side roguelite z zapisem w IndexedDB `AM76_CHESS_DB`. |
| Natywna aplikacja mobilna (Android APK / iOS IPA) | Wdrożenie skupia się na Web App / PWA uruchamianym w przeglądarce mobilnej. |

---

## Assumptions & Open Questions

Every ambiguity is resolved or recorded here - nothing is left silently unclear.

| Assumption / decision | Chosen default | Rationale | Confirmed? |
| --- | --- | --- | --- |
| Domyślny tryb celowania na dotyku | Hybryda Auto-Aim + Touch Focus | Najbardziej ergonomiczne i płynne doświadczenie na ekranach smartfonów (jak w Vampire Survivors / Brotato). | yes |
| Wsparcie orientacji pionowej (Portrait) | Dedykowany layout Portrait | Szachownica wyśrodkowana na środku/górze, cała dolna strefa dedykowana na wirtualny joystick i przyciski. | yes |
| Różnicowanie długości i dynamiki partii | Powiązanie z formatami tempa szachowego | Format Bullet staje się szybki i intensywny (6 fal), Blitz zbalansowany (8 fal), Rapid głęboki i taktyczny (10 fal). | yes |
| Opcjonalne sterowanie Twin-Stick Touch | Przełącznik w ustawieniach i menu tempa | Umożliwia graczom zaawansowanym precyzyjne manualne celowanie drugą gałką dotykową. | yes |

**Open questions:** none - all resolved or logged above (required before the spec is confirmed).

---

## User Stories

### P1: Responsywny Viewport i Otwarty Stół Szachowy ⭐ MVP

**User Story**: Jako gracz na dowolnym ekranie chcę, aby gra wypełniała całe okno przeglądarki bez czarnych pasów, zachowując kwadratową szachownicę i spójne tło stołu.

**Why P1**: Fundament dla wszystkich platform (desktop widescreen, laptopy, smartfony) eliminujący sztywne okno 960x720.

**Acceptance Criteria**:

1. The system SHALL resize the rendering canvas to match 100% of the browser window width and height. <!-- ubiquitous -->
2. WHEN the window size or orientation changes THEN the system SHALL recalculate the board position and scale to maximize arena size while preserving square proportions. <!-- event-driven -->
3. The system SHALL render procedural theme background textures across all exposed area outside the chessboard to the canvas boundaries. <!-- ubiquitous -->
4. WHILE the game is running the system SHALL constrain player and enemy physics coordinates to the active chessboard bounds. <!-- state-driven -->
5. IF devicePixelRatio is greater than 1 THEN the system SHALL scale the canvas buffer up to 2x for sharp rendering. <!-- unwanted-behavior -->

**Independent Test**: Zmiana rozmiaru okna w przeglądarce od 320px do 3440px płynnie dostosowuje szachownicę i wypełnia tło bez czarnych pasów letterboxingu.

---

### P2: Dotykowe Sterowanie Mobilne (Touch Controls & Auto-Aim)

**User Story**: Jako gracz mobilny chcę sterować postacią kciukami za pomocą wirtualnego joysticka i przycisków akcji z inteligentnym celowaniem, aby wygodnie grać na telefonie.

**Why P2**: Otwiera grę na rynek smartfonów i tabletów bez potrzeby podłączania klawiatury i myszy.

**Acceptance Criteria**:

1. WHERE touch input is detected the system SHALL display an on-screen touch overlay with a virtual movement joystick and action buttons. <!-- optional-feature -->
2. WHEN a touch begins in the movement zone THEN the system SHALL anchor a dynamic virtual joystick and translate touch drag into 360-degree player movement. <!-- event-driven -->
3. WHILE in default Auto-Aim mode the system SHALL automatically aim player projectiles at the nearest active enemy on the chessboard. <!-- state-driven -->
4. WHEN the player taps a specific enemy on screen THEN the system SHALL lock aim onto that target until it is defeated. <!-- event-driven -->
5. WHERE Twin-Stick mode is enabled in settings the system SHALL render a secondary right-side aiming joystick for manual 360-degree shooting. <!-- optional-feature -->
6. WHEN the Dash button is pressed THEN the system SHALL trigger the figure special ability. <!-- event-driven -->

**Independent Test**: Uruchomienie gry w emulacji dotyku w DevTools pozwala na płynne sterowanie ruchem, uniki i automatyczne/manualne celowanie.

---

### P3: Modularny i Adaptacyjny HUD

**User Story**: Jako gracz chcę, aby interfejs gry (zegar, życie, fala) był czytelny i ergonomicznie rozmieszczony niezależnie od orientacji ekranu.

**Why P3**: Na ekranach pionowych i smartfonach górny pasek zasłania widok lub jest trudno dostępny dla kciuków.

**Acceptance Criteria**:

1. WHILE in Landscape orientation the system SHALL anchor HUD elements across the screen perimeter outside the main chessboard focus area. <!-- state-driven -->
2. WHILE in Portrait orientation the system SHALL position chess clock and wave stats at the top and vital action feedback in the lower thumb zone. <!-- state-driven -->
3. WHERE the player selects Bottom HUD mode the system SHALL render health and chess clock along the bottom edge of the screen. <!-- optional-feature -->
4. The system SHALL scale HUD typography and status icons proportionally to the screen resolution. <!-- ubiquitous -->

**Independent Test**: Przełączanie między widokiem poziomym a pionowym przestawia elementy HUD na odpowiednie pozycje bez nachodzenia na kafelki szachownicy.

---

### P4: Zrównoważony Pacing, Długość Runu i Czytelność Finału

**User Story**: Jako gracz chcę, aby gra trwała od 3.5 do 8.5 minut z płynną krzywą trudności, dając czas na rozwój buildu i czytelną walkę z bossami bez niekontrolowanego spamu pocisków.

**Why P4**: Obecna gra kończyła się w 110 sekund i przytłaczała chaosem; nowa struktura zapewnia satysfakcjonującą głębię roguelite.

**Acceptance Criteria**:

1. WHEN the player selects Bullet tempo THEN the system SHALL configure a 6-wave run with 30-second waves and high-tempo chaos. <!-- event-driven -->
2. WHEN the player selects Blitz tempo THEN the system SHALL configure an 8-wave run with 45-second waves and a mini-boss at Wave 4. <!-- event-driven -->
3. WHEN the player selects Rapid tempo THEN the system SHALL configure a 10-wave run with 50-second waves, mini-boss at Wave 5 and royal council at Wave 8. <!-- event-driven -->
4. WHILE a boss is executing a special attack the system SHALL display distinct telegraphs with sequential rather than simultaneous firing intervals. <!-- state-driven -->
5. WHEN the final boss transitions chessboard grid size THEN the system SHALL clear ambient non-boss projectiles to prevent unavoidable damage. <!-- event-driven -->

**Independent Test**: Przejście gry w trybie Blitz trwa około 6 minut, zawiera czytelną progresję figur i zrozumiałą walkę z Królową i Ręką Arcymistrza.

---

## Edge Cases

- IF the browser window has an extreme aspect ratio such as ultra-wide 32:9 or tall foldables THEN the system SHALL clamp board size to visible area while extending background textures to infinity.
- IF multi-touch occurs with more than 3 simultaneous fingers THEN the system SHALL prioritize movement and ability button touches while discarding accidental palm contacts.
- IF orientation changes mid-wave during gameplay THEN the system SHALL adjust bounds and reposition player inside the valid board without triggering out-of-bounds damage.
- IF the player switches between keyboard/mouse and touch during the same session THEN the system SHALL dynamically show or hide on-screen virtual controls based on the last active input method.

---

## Requirement Traceability

Each requirement gets a unique ID for tracking across design, tasks, and validation.

| Requirement ID | Story | Phase | Status |
| --- | --- | --- | --- |
| VIEW-01 | P1: Responsywny Viewport | Design | Pending |
| VIEW-02 | P1: Responsywny Viewport | Design | Pending |
| VIEW-03 | P1: Responsywny Viewport | Design | Pending |
| VIEW-04 | P1: Responsywny Viewport | Design | Pending |
| VIEW-05 | P1: Responsywny Viewport | Design | Pending |
| TOUCH-01 | P2: Dotykowe Sterowanie Mobilne | Design | Pending |
| TOUCH-02 | P2: Dotykowe Sterowanie Mobilne | Design | Pending |
| TOUCH-03 | P2: Dotykowe Sterowanie Mobilne | Design | Pending |
| TOUCH-04 | P2: Dotykowe Sterowanie Mobilne | Design | Pending |
| TOUCH-05 | P2: Dotykowe Sterowanie Mobilne | Design | Pending |
| TOUCH-06 | P2: Dotykowe Sterowanie Mobilne | Design | Pending |
| HUD-01 | P3: Modularny i Adaptacyjny HUD | Design | Pending |
| HUD-02 | P3: Modularny i Adaptacyjny HUD | Design | Pending |
| HUD-03 | P3: Modularny i Adaptacyjny HUD | Design | Pending |
| HUD-04 | P3: Modularny i Adaptacyjny HUD | Design | Pending |
| BAL-01 | P4: Zrównoważony Pacing | Design | Pending |
| BAL-02 | P4: Zrównoważony Pacing | Design | Pending |
| BAL-03 | P4: Zrównoważony Pacing | Design | Pending |
| BAL-04 | P4: Zrównoważony Pacing | Design | Pending |
| BAL-05 | P4: Zrównoważony Pacing | Design | Pending |

**Coverage:** 20 total, 20 mapped to design, 0 unmapped

---

## Success Criteria

How we know the feature is successful:

- [ ] Gra uruchamia się i płynnie skaluje na ekranach desktopowych (16:9, 21:9) oraz telefonach w układzie pionowym i poziomym bez jakichkolwiek czarnych pasów letterboxingu.
- [ ] Gracz na telefonie dotykowym jest w stanie ukończyć pełny bieg gry używając wyłącznie kciuków (joystick + auto-aim / dash).
- [ ] Czas przejścia trybu Blitz wynosi od 5 do 7 minut, a walka finałowa jest sprawiedliwa i czytelna dzięki sekwencyjnym telegrafom.
- [ ] 60 FPS na urządzeniach mobilnych dzięki bezalokacyjnemu renderowaniu i poolingowi obiektów.

