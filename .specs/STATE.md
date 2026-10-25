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
- **Phase / Task**: Specify / Tworzenie specyfikacji wymagań spec.md
- **Completed**: Diagnoza przyczyn problemów ze sklepem, myszką i przyciskami
- **In-progress** (file:line): `.specs/features/controls-settings-shop-fix/spec.md`
- **Next step**: Utworzenie i walidacja spec.md, design.md i tasks.md
- **Blockers**: none
- **Uncommitted files**: none
- **Branch**: main

