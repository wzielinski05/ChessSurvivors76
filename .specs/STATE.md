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

## Handoff

- **Feature**: controls-settings-shop-fix / .specs/features/controls-settings-shop-fix/tasks.md
- **Phase / Task**: Verified / Weryfikacja niezależnego sub-agenta (author != verifier) - PASS ✅
- **Completed**:
  - T1: Izolacja wskaźników dotyku od myszki i odblokowanie kliknięć w lewej połowie modali
  - T2: Responsywny układ kart Sklepu Gambitu i jednolita detekcja kliknięć
  - T3: Klasyczne celowanie myszką na PC z celownikiem taktycznym i czyste Auto-Aim
  - T4: Inteligentna widoczność nakładki dotykowej (auto-ukrywanie przy myszy, auto-pokazywanie przy dotyku)
  - T5: Dedykowane modalne Menu Ustawień (`SETTINGS`) z persystencją w StorageEngine (IndexedDB/localStorage)
  - T6: Interaktywne, w pełni klikalne przyciski paska HUD na komputerach i telefonach
  - Weryfikacja niezależnego Verifiera (14/14 ACs ✅ PASS, sensor 3/3 zabitych mutantów, build 243 KB)
- **In-progress** (file:line): none
- **Next step**: Gotowe do testów użytkownika (UAT) lub wdrożenia
- **Blockers**: none
- **Uncommitted files**: none
- **Branch**: main

