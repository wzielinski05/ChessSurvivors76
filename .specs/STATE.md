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

## Handoff

- **Feature**: mobile-viewport-balance / .specs/features/mobile-viewport-balance/tasks.md
- **Phase / Task**: Phase 4 / T1-T12 W pełni zrealizowane i zweryfikowane
- **Completed**: T1 (dynamic viewport 100% canvas), T2 (responsive board geometry), T3 (procedural edge-to-edge tabletop), T4 (PointerEvent multitouch tracker), T5 (floating movement joystick), T6 (on-screen action buttons), T7 (hybrid auto-aim & touch focus), T8 (optional twin-stick touch), T9 (modular adaptive HUD), T10 (extended wave pacing per tempo), T11 (tempo progression in loop), T12 (sequential boss telegraphs & arena projectile cleanup)
- **In-progress** (file:line): none
- **Next step**: Testy przez użytkownika w przeglądarce i na urządzeniach mobilnych
- **Blockers**: none
- **Uncommitted files**: none
- **Branch**: main

