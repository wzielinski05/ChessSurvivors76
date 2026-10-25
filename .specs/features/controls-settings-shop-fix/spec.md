# Controls, Settings & Shop Fix Specification

## Problem Statement

W grze Checkmate: Bullet Hell wykryto błędy w obsłudze interfejsu i sterowania:
1. Wirtualny joystick dotykowy przechwytywał lewą połowę ekranu (`x < 52%`) bez weryfikacji typu wskaźnika (mysz vs dotyk) i stanu gry, co blokowało możliwość zakupu 4 z 8 kart perków oraz promocji figur w lewej kolumnie Sklepu Gambitu.
2. Wykrywanie urządzeń dotykowych wymuszało Auto-Aim i chowało celownik myszy na komputerach z ekranami dotykowymi (np. laptopy 2w1), uniemożliwiając klasyczne celowanie myszką.
3. Brak dedykowanego Menu Ustawień oraz brak klikalnych przycisków w HUD utrudniał zmianę opcji bez klawiatury na telefonach i dla graczy preferujących mysz.
4. Stałe wymiary modalu sklepu (880px) wystawały poza ekran na urządzeniach mobilnych w układzie pionowym.

## Goals

- [ ] Pełna izolacja kontrolera dotykowego: wirtualny joystick i przyciski dotykowe działają wyłącznie w stanie gry (`PLAYING`) i wyłącznie dla dotyku (`pointerType === 'touch'`), odblokowując 100% klikalność wszystkich perków i kart w sklepie i menu.
- [ ] Przywrócenie klasycznego celowania myszką z widocznym celownikiem jako domyślnego na komputerach, z możliwością wyboru Auto-Aim (bez celownika) lub Twin-Stick.
- [ ] Wprowadzenie dedykowanego Menu Ustawień (`SETTINGS`) dostępnego pod ESC, O oraz klikalną ikoną zębatki ⚙ w HUD.
- [ ] Zapewnienie pełnej responsywności Sklepu Gambitu na smartfonach w układzie pionowym z wyraźnym przyciskiem zamknięcia [X].

## Out of Scope

Explicitly excluded. Documented to prevent scope creep.

| Feature | Reason |
| --- | --- |
| Zmiana balansu cen perków lub statystyk figur | Celem jest naprawa dostępności i interakcji, nie zmiana ekonomii gry. |
| Globalne mapowanie dowolnych klawiszy klawiatury | Wystarczą predefiniowane, intuicyjne profile sterowania (Myszka / Auto-Aim / Twin-Stick). |
| Chmura kont użytkownika | Ustawienia są trwale zapisywane lokalnie w `localStorage` / `IndexedDB`. |

---

## Assumptions & Open Questions

Every ambiguity is resolved or recorded here - nothing is left silently unclear.

| Assumption / decision | Chosen default | Rationale | Confirmed? |
| --- | --- | --- | --- |
| Domyślny tryb celowania na komputerze (mysz) | Klasyczne celowanie myszką (Mouse Aim) | Standard PC: gracz celuje kursorem myszy z widocznym celownikiem crosshair. | yes |
| Domyślny tryb celowania na telefonie (dotyk) | Inteligentne Auto-Aim + Touch Focus | Standard mobilny: gracz steruje ruchem kciukiem, broń namierza cele automatycznie. | yes |
| Widoczność przycisków dotykowych na ekranie | Auto (tylko gdy wykryto dotyk) | Na PC z myszką ekran pozostaje czysty bez zbędnych nakładek. | yes |
| Dostęp do Menu Ustawień | Klawisz ESC, O oraz klikalna ikona ⚙ w HUD | Pełna dostępność zarówno dla klawiatury, myszki, jak i dotyku mobilnego. | yes |

**Open questions:** none - all resolved or logged above (required before the spec is confirmed).

---

## User Stories

### P1: Odblokowanie Sklepu i Izolacja Wskaźników (Shop & Input Fix) ⭐ MVP

**User Story**: Jako gracz chcę bez przeszkód kupować wszystkie perki i awanse figur w Sklepie Gambitu myszką i dotykiem, aby rozwijać postać bez blokowania kliknięć w lewej połowie ekranu.

**Why P1**: Błąd przechwytywania dotyku przez wirtualny joystick uniemożliwiał zakup 4 z 8 perków oraz promocji figury na Skoczka i Gońca, uniemożliwiając progresję.

**Acceptance Criteria**:

1. WHEN a player clicks or taps any perk card in the Gambit Shop THEN the system SHALL purchase the selected item if tokens are sufficient. <!-- event-driven -->
2. WHEN a player clicks or taps any figure promotion card in the Gambit Shop THEN the system SHALL promote the player figure to that class if tokens and tier conditions are met. <!-- event-driven -->
3. WHILE inside shop, tempo select, or settings overlay states the system SHALL disable virtual touch joysticks and action buttons. <!-- state-driven -->
4. WHERE pointer type is mouse the system SHALL process left clicks across all screen coordinates without virtual joystick consumption. <!-- optional-feature -->
5. The system SHALL render a responsive shop card layout with visible close button fitting within screen bounds on mobile and desktop viewports. <!-- ubiquitous -->

**Independent Test**: Kliknięcie w dowolną kartę po lewej lub prawej stronie w Sklepie Gambitu myszką lub dotykiem natychmiast kupuje perk lub awans.

---

### P2: Klasyczne Celowanie Myszką i Wybór Trybu Celowania (Aim Mode & Crosshair)

**User Story**: Jako gracz na komputerze chcę celować myszką z widocznym celownikiem tak jak dawniej, a na telefonie lub wedle uznania móc włączyć Auto-Aim bez celownika.

**Why P2**: Błędne wykrywanie ekranów dotykowych na laptopach wyłączało celownik myszy i uniemożliwiało manualne celowanie graczom PC.

**Acceptance Criteria**:

1. WHILE in Classic Mouse aim mode the system SHALL aim player projectiles at mouse cursor coordinates and render an on-screen crosshair. <!-- state-driven -->
2. WHILE in Auto-Aim mode the system SHALL hide the mouse crosshair and automatically target the nearest enemy or touch-locked target. <!-- state-driven -->
3. WHERE in Twin-Stick mode the system SHALL aim projectiles using right virtual joystick direction on touch screens. <!-- optional-feature -->
4. WHEN mouse movement is detected the system SHALL automatically hide on-screen touch control buttons. <!-- event-driven -->
5. WHEN touch input is detected during gameplay the system SHALL display on-screen touch action buttons. <!-- event-driven -->

**Independent Test**: Na komputerze kursor celuje precyzyjnie za myszką z widocznym celownikiem, a przełączenie na Auto-Aim chowa celownik i samoczynnie namierza wrogów.

---

### P3: Dedykowane Menu Ustawień i Klikalne Przyciski HUD (Settings Menu & HUD Interactivity)

**User Story**: Jako gracz chcę mieć czytelne menu ustawień i klikalne przyciski w interfejsie, abym na smartfonie i komputerze mógł zmieniać opcje bez znajomości skrótów klawiszowych.

**Why P3**: Klawisze T, M, H, J są niedostępne na telefonach i nieintuicyjne dla graczy casualowych; menu ustawień i klikalny HUD dają 100% dostępności.

**Acceptance Criteria**:

1. WHEN the player presses ESC, KeyO or clicks the HUD settings gear icon THEN the system SHALL open the Settings menu overlay. <!-- event-driven -->
2. WHILE in the Settings menu the system SHALL allow interactive selection of Aim Mode, Touch Controls visibility, HUD layout, Visual Theme, and Audio toggle. <!-- state-driven -->
3. WHEN settings are modified the system SHALL immediately apply changes to active gameplay state and persist preferences to storage. <!-- event-driven -->
4. WHEN the player clicks or taps HUD buttons for Shop, Settings, Theme, or Aim Mode THEN the system SHALL execute the corresponding action. <!-- event-driven -->

**Independent Test**: Kliknięcie ikony zębatki otwiera modal z opcjami, w którym można kliknąć i natychmiast zmienić styl, HUD lub tryb celowania.

---

## Edge Cases

- **Laptop z ekranem dotykowym i podłączoną myszą**: Ruch myszką przywraca klasyczny kursor i ukrywa przyciski dotykowe; dotknięcie ekranu uaktywnia nakładkę dotykową bez resetowania gry.
- **Wąski ekran smartfona w pionie (360px - 400px)**: Sklep Gambitu automatycznie przełącza siatkę na 2 kolumny, a karty skalują się tak, by nie wychodzić poza ekran.
- **Kliknięcie poza modalem lub przycisk powrotu**: Kliknięcie przycisku `[X]` lub w tło poza oknem sklepu/ustawień bezpiecznie wznawia rozgrywkę i zamyka modal.
- **Równoczesny dotyk i ruch myszy**: Priorytet ma ostatnie zarejestrowane źródło zdarzenia, zapobiegając konfliktom stanów wejścia.

---

## Requirement Traceability

Each requirement gets a unique ID for tracking across design, tasks, and validation.

| Requirement ID | Story | Phase | Status |
| --- | --- | --- | --- |
| SHOP-01 | P1: Odblokowanie Sklepu i Izolacja Wskaźników | Design | Pending |
| SHOP-02 | P1: Odblokowanie Sklepu i Izolacja Wskaźników | Design | Pending |
| SHOP-03 | P1: Odblokowanie Sklepu i Izolacja Wskaźników | Design | Pending |
| SHOP-04 | P1: Odblokowanie Sklepu i Izolacja Wskaźników | Design | Pending |
| SHOP-05 | P1: Odblokowanie Sklepu i Izolacja Wskaźników | Design | Pending |
| AIM-01 | P2: Klasyczne Celowanie Myszką | Design | Pending |
| AIM-02 | P2: Klasyczne Celowanie Myszką | Design | Pending |
| AIM-03 | P2: Klasyczne Celowanie Myszką | Design | Pending |
| AIM-04 | P2: Klasyczne Celowanie Myszką | Design | Pending |
| AIM-05 | P2: Klasyczne Celowanie Myszką | Design | Pending |
| SETT-01 | P3: Dedykowane Menu Ustawień | Design | Pending |
| SETT-02 | P3: Dedykowane Menu Ustawień | Design | Pending |
| SETT-03 | P3: Dedykowane Menu Ustawień | Design | Pending |
| SETT-04 | P3: Dedykowane Menu Ustawień | Design | Pending |

**Coverage:** 14 total, 14 mapped to design, 0 unmapped
