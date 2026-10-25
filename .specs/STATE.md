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
- **Phase / Task**: Tasks / Przygotowano spec.md, design.md i tasks.md (gotowe do zatwierdzenia / wykonania)
- **Completed**:
  - Walidacja formalna specyfikacji (validate_spec: 0 errors, 0 warnings)
  - Walidacja formalna zadań (validate_tasks: 0 errors, 0 warnings)
- **In-progress** (file:line): `.specs/features/chess-fusions-evolutions/tasks.md`
- **Next step**: Faza 1 (T1: Definicje klas fuzji i receptur w chessData.js)
- **Blockers**: none
- **Uncommitted files**: `.specs/features/chess-fusions-evolutions/`
- **Branch**: main

