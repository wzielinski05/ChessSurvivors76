# STATE

## Decisions

### AD-001
- **Decision**: Wprowadzenie dynamicznego viewportu 100% z zachowaniem kwadratowej geometrii szachownicy (Open Table Design)
- **Reason**: Sztywny kwadrat 4:3 z czarnymi pasami marnował przestrzeń na ekranach 16:9, panoramicznych i mobilnych.
- **Trade-off**: Wymaga procedur dynamicznego generowania tła i kotwiczenia HUD zamiast stałych współrzędnych ekranu.
- **Scope**: `src/main.js`, `src/boardRenderer.js`, `src/uiRenderer.js`
- **Date**: 2026-10-25
- **Status**: active

### AD-002
- **Decision**: Hybrydowe sterowanie dotykowe (Auto-Aim + Touch Focus) jako domyślne, z opcjonalnym Twin-Stick Touch
- **Reason**: Na ekranach dotykowych celowanie myszką nie istnieje; auto-aim zapewnia płynność roguelite, a twin-stick zadowoli graczy szukających pełnej kontroli manualnej.
- **Trade-off**: Wymaga obsługi dwóch równoległych logik celowania i wirtualnych gałek dotykowych.
- **Scope**: `src/input.js`, `src/game.js`, `src/sprites.js`
- **Date**: 2026-10-25
- **Status**: active

### AD-003
- **Decision**: Zróżnicowanie długości i dynamiki rozgrywki w zależności od wybranego tempa szachowego (Bullet, Blitz, Rapid)
- **Reason**: Tryb 5 fal po 22s był za krótki (<2 min) i zbyt chaotyczny w końcówce.
- **Trade-off**: Zmiana bazowej konfiguracji fal i konieczność zbalansowania przyrostu HP/pocisków pod różne czasy trwania partii.
- **Scope**: `src/chessData.js`, `src/game.js`
- **Date**: 2026-10-25
- **Status**: active

### AD-004
- **Decision**: Izolacja kontrolera dotykowego wg typu wskaźnika (`pointerType === 'touch'`) i stanu gry (`PLAYING`)
- **Reason**: Wirtualny joystick przechwytywał kliknięcia lewym przyciskiem myszy i blokował zakupy w lewej połowie sklepu oraz menu.
- **Trade-off**: Wymaga jawnego przekazywania flagi aktywności kontrolek ekranowych między Game a InputManager.
- **Scope**: `src/input.js`, `src/game.js`
- **Date**: 2026-10-25
- **Status**: active

### AD-005
- **Decision**: Dedykowane Menu Ustawień (`SETTINGS`) z wyborem trybu celowania (Myszka vs Auto-Aim vs Twin-Stick) i responsywny sklep
- **Reason**: Gracze PC potrzebują tradycyjnego celowania kursorem myszy z celownikiem, a gracze mobilni czystego ekranu i skalowalnych kart sklepu.
- **Trade-off**: Dodatkowy stan gry `SETTINGS` i responsywna siatka kart w `src/uiRenderer.js`.
- **Scope**: `src/uiRenderer.js`, `src/game.js`, `src/storage.js`
- **Date**: 2026-10-25
- **Status**: active

### AD-006
- **Decision**: Wdrożenie szachowych taktyk bojowych (Związanie, Widełki, Szach-Mat) przy zachowaniu Zero-GC
- **Reason**: Zwiększenie głębi i tożsamości szachowej rozgrywki bez wprowadzania spadków klatek poniżej 60 FPS.
- **Trade-off**: Wymaga rozszerzenia prealokowanych struktur wroga w pulach o pola statusów taktycznych (`pinTimer`, `mateStep`, `mateTimer`, `stunTimer`).
- **Scope**: `src/game.js`, `src/sprites.js`
- **Date**: 2026-10-25
- **Status**: active

### AD-007
- **Decision**: Wdrożenie 3 hybryd szachów baśniowych (Fairy Chess: Cesarka, Kardynał, Amazonka) w Sklepie Gambitu
- **Reason**: Zapewnienie szczytowej progresji archetypów postaci (Power Fantasy) z unikalnymi stylami walki i zachowaniem Zero-GC.
- **Trade-off**: Wymaga proceduralnych sylwetek wektorowych dla hybryd w Canvas 2D oraz rozbudowy mechanik dasha (Siege Leap, Translocation, Absolute Domain).
- **Scope**: `src/chessData.js`, `src/game.js`, `src/sprites.js`, `src/uiRenderer.js`
- **Date**: 2026-10-25
- **Status**: active

## Handoff

- **Feature**: chess-fusions-evolutions / .specs/features/chess-fusions-evolutions/tasks.md
- **Phase / Task**: Verified & Complete (T1..T10 ukończone, audyt niezależnego weryfikatora: PASS)
- **Completed**:
  - Walidacja formalna specyfikacji (validate_spec: 0 errors, 0 warnings)
  - Walidacja formalna zadań (validate_tasks: 0 errors, 0 warnings)
  - Faza 1: Fuzja klas i reset stanu gracza (T1, T2: `9acb8ec`, `774466f`)
  - Faza 2: Cesarka (Empress / Chancellor) - Kanonada oblężnicza, Taranujący Skok, Bastion (T3, T4: `f91c97a`, `18223ca`)
  - Faza 3: Kardynał (Cardinal / Archbishop) - Schodkowe lasery L, Błysk Translokacyjny, Aura Katedry (T5, T6: `aa85b75`, `b6cd427`)
  - Faza 4: Amazonka (Amazon) - 8-kierunkowa salwa chaosu, Władza Absolutna, Cesarski Mat (T7, T8: `014c2dc`, `445cfc3`)
  - Faza 5: Proceduralne wektory Fairy Chess & Karty Fuzji w Sklepie Gambitu (T9, T10: `dd28086`, `d662a59`)
  - Niezależny audyt weryfikatora: `.specs/features/chess-fusions-evolutions/validation.md` (**Result**: PASS)
- **In-progress** (file:line): Zakończono Krok 2
- **Next step**: Gotowość do przejścia do Kroku 3 (Domain 3 / Domain 4 z planu rozwoju)
- **Blockers**: none
- **Uncommitted files**: none
- **Branch**: main

