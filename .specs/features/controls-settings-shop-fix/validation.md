# controls-settings-shop-fix Validation

**Date**: 2026-10-25
**Spec**: `.specs/features/controls-settings-shop-fix/spec.md`
**Diff range**: `bf9edea..HEAD`
**Verifier**: independent sub-agent (author ≠ verifier, evidence-or-zero)

---

## Task Completion

| Task | Status | Notes |
| ---- | ------ | ----- |
| T1: Isolate pointer events and unblock left screen clicks in modals | ✅ Done | `src/input.js:93-98, 309-315`, `src/game.js:1048-1050` |
| T2: Enable responsive shop grid and seamless card purchasing | ✅ Done | `src/uiRenderer.js:402-468`, `src/game.js:853-934` |
| T3: Implement classic mouse aiming with visible crosshair and clean auto-aim | ✅ Done | `src/game.js:1743-1745, 3110-3118` |
| T4: Implement smart touch overlay visibility | ✅ Done | `src/input.js:257-259, 277-282`, `src/game.js:3087-3093` |
| T5: Implement dedicated Settings overlay and HUD gear icon | ✅ Done | `src/uiRenderer.js:883-1026, 1028-1138`, `src/game.js:937-1044, 1148-1152` |
| T6: Implement interactive clickable HUD buttons | ✅ Done | `src/uiRenderer.js:10-58, 223-248`, `src/game.js:1166-1199` |

---

## Spec-Anchored Acceptance Criteria

### P1: Odblokowanie Sklepu i Izolacja Wskaźników (Shop & Input Fix) ⭐ MVP

| Criterion (WHEN X THEN Y) | Spec-defined outcome | `file:line` + assertion | Result |
| ------------------------- | -------------------- | ----------------------- | ------ |
| SHOP-01: WHEN player clicks or taps perk card in Gambit Shop THEN system SHALL purchase item if tokens sufficient | Selected perk acquired, token cost deducted, active ability or passive updated | `src/game.js:886-907`, `src/game.js:750-776` - `if (this.gambitTokens < item.cost) return false; this.gambitTokens -= item.cost; AudioEngine.playShopBuy();` | ✅ PASS |
| SHOP-02: WHEN player clicks or taps figure promotion card THEN system SHALL promote player figure | Player class updated, class stats/radius/hp applied, tokens deducted | `src/game.js:872-883`, `src/game.js:713-739` - `if (this.gambitTokens < cData.cost) return false; this.gambitTokens -= cData.cost; this.player.classId = newClassId;` | ✅ PASS |
| SHOP-03: WHILE inside shop, tempo select, or settings overlay system SHALL disable virtual touch joysticks | Joystick and action touch buttons completely suppressed outside `PLAYING` state | `src/game.js:1049`, `src/input.js:93-98` - `this.input.touchControlsActive = (this.state === 'PLAYING'); if (!this.touchControlsActive \|\| !isTouch \|\| this.touchOverlayMode === 'off') return;` | ✅ PASS |
| SHOP-04: WHERE pointer type is mouse system SHALL process left clicks across all coordinates | Mouse clicks unblocked across 100% of screen width including `x < 52%` | `src/input.js:95-98, 309-315` - `const isTouch = pointer.type === 'touch' \|\| (this.touchOverlayMode === 'always'); if (e.button === 0 && !pointer.consumed) { this.mouseDownLeft = true; this.mouseJustLeft = true; }` | ✅ PASS |
| SHOP-05: System SHALL render responsive shop card layout with visible close button within bounds | 2 columns on mobile portrait (`w < 840`), 4 columns on desktop, visible `[X]` button, click-outside-to-close | `src/uiRenderer.js:402-468, 488-508`, `src/game.js:858-869, 923-933` - `panelW = Math.min(w - 20, 880); closeBtn = { x: px + panelW - 42, y: py + 12, w: 30, h: 30 };` | ✅ PASS |

### P2: Klasyczne Celowanie Myszką i Wybór Trybu Celowania (Aim Mode & Crosshair)

| Criterion (WHEN X THEN Y) | Spec-defined outcome | `file:line` + assertion | Result |
| ------------------------- | -------------------- | ----------------------- | ------ |
| AIM-01: WHILE in Classic Mouse aim mode system SHALL aim projectiles at cursor and render crosshair | Projectile trajectories track mouse cursor `(mouseX, mouseY)` and crosshair sprite is visible | `src/game.js:1743-1745, 3110-3118` - `this.lastAimAngle = Math.atan2(this.input.mouseY - p.y, this.input.mouseX - p.x); drawCrosshair(ctx, this.input.mouseX, this.input.mouseY, theme, ...)` | ✅ PASS |
| AIM-02: WHILE in Auto-Aim mode system SHALL hide crosshair and target nearest enemy or touch-locked target | Mouse crosshair is suppressed, projectiles target nearest active enemy in `pools.enemies` or `lockedTarget` | `src/game.js:3110`, `src/game.js:1701-1741` - `if (this.aimMode === 'mouse' ...) // crosshair hidden; if (dSq < minDistSq) { minDistSq = dSq; nearest = e; }` | ✅ PASS |
| AIM-03: WHERE in Twin-Stick mode system SHALL aim projectiles using right virtual joystick direction | Right-side virtual joystick direction angle governs projectile fire | `src/game.js:1693-1698`, `src/input.js:133-143, 175-192` - `if (this.aimMode === 'twinstick' && this.input.rightStick.active) { return this.input.rightStick.angle; }` | ✅ PASS |
| AIM-04: WHEN mouse movement is detected system SHALL automatically hide on-screen touch buttons | Mouse movement sets `touchActive = false`, hiding touch overlay | `src/input.js:257-259`, `src/game.js:3087-3093` - `if (e.pointerType === 'mouse') { this.touchActive = false; } const showTouch = ... this.input.touchActive;` | ✅ PASS |
| AIM-05: WHEN touch input is detected system SHALL display on-screen touch action buttons | Touch interaction activates `touchActive = true`, displaying touch overlay | `src/input.js:277-282`, `src/game.js:3087-3093` - `if (e.pointerType === 'touch') { this.isTouchDevice = true; this.touchActive = true; }` | ✅ PASS |

### P3: Dedykowane Menu Ustawień i Klikalne Przyciski HUD (Settings Menu & HUD Interactivity)

| Criterion (WHEN X THEN Y) | Spec-defined outcome | `file:line` + assertion | Result |
| ------------------------- | -------------------- | ----------------------- | ------ |
| SETT-01: WHEN player presses ESC, KeyO or clicks HUD gear icon THEN system SHALL open Settings menu | State switches to `SETTINGS`, modal layout rendered, audio feedback played | `src/game.js:937-940, 1148-1152, 1181-1183` - `openSettings() { this.state = 'SETTINGS'; AudioEngine.playClockClick(); }` | ✅ PASS |
| SETT-02: WHILE in Settings menu system SHALL allow interactive selection of Aim, Touch, HUD, Theme, Audio | Interactive buttons for all 5 settings categories selectable via click/touch | `src/uiRenderer.js:883-1026, 1028-1138`, `src/game.js:971-1018` - `layout.aimRow, layout.touchRow, layout.hudRow, layout.themeRow, layout.soundRow` | ✅ PASS |
| SETT-03: WHEN settings are modified system SHALL immediately apply and persist preferences to storage | Immediate in-game state mutation and async persistence via `StorageEngine` | `src/game.js:974-975, 984-985, 994-995, 1004, 1013-1014`, `src/storage.js:160-167` - `StorageEngine.recordSettings({ aimMode, touchOverlayMode, hudMode, soundMuted }); this.saveAsync();` | ✅ PASS |
| SETT-04: WHEN player clicks or taps HUD buttons THEN system SHALL execute corresponding action | Direct click/tap on HUD shop, settings, aim, theme, tempo buttons executes action | `src/uiRenderer.js:10-58, 223-248`, `src/game.js:1166-1199` - `if (hitHudBtn && this.input.consumeLeftClick()) { if (hitHudBtn.id === 'settings') this.openSettings(); ... }` | ✅ PASS |

**Status**: ✅ All 14 ACs verified with precise `file:line` citations and verifiable assertions.

---

## Discrimination Sensor

Conducted in an isolated scratch environment with zero mutations to the working tree.

| Mutation | File:line | Description | Killed? |
| -------- | --------- | ----------- | ------- |
| 1 | `src/game.js:1049` | Set `this.input.touchControlsActive = true;` unconditionally, keeping virtual joystick active during `GAMBIT_SHOP` | ✅ Killed (AssertionError: `touchControlsActive must be false in GAMBIT_SHOP`) |
| 2 | `src/game.js:1744` | Inverted mouse aim calculation to constant `Math.PI`, breaking classic mouse targeting | ✅ Killed (AssertionError: `Classic mouse aim must calculate angle to mouse pos`) |
| 3 | `src/game.js:1723` | Inverted Auto-Aim nearest distance check (`dSq < minDistSq` → `dSq > minDistSq`), targeting farthest enemy | ✅ Killed (AssertionError: `Auto-aim must target nearest enemy`) |

**Sensor depth**: lightweight (3 targeted behavior-level mutations covering input isolation, mouse aim geometry, and auto-aim target selection).
**Result**: 3/3 killed - PASS ✅
**Isolation verification**: `git status --porcelain` verified before and after sensor run — working tree clean and identical.

---

## Code Quality

| Principle | Status | Notes |
| --------- | ------ | ----- |
| Minimum code | ✅ | Surgical changes strictly covering input isolation, settings, shop layout, and HUD interactivity |
| Surgical changes | ✅ | 6 files modified (`src/input.js`, `src/uiRenderer.js`, `src/game.js`, `src/storage.js`, `src/audio.js`, docs) |
| No scope creep | ✅ | Custom key remapping and cloud sync explicitly kept out of scope as planned |
| Matches patterns | ✅ | Follows existing object pooling (`FixedPool`), canvas rendering, and `StorageEngine` conventions |
| Zero-GC 60 FPS compliance | ✅ | Settings and shop overlay layouts compute coordinates on demand without lingering closures or array leaks |
| Spec-anchored outcome check | ✅ | 14/14 criteria verify exact values and state transitions defined in spec.md |
| Every test maps to spec requirement | ✅ | 1:1 traceability from spec ACs to tasks and independent verification tests |
| Documented guidelines followed | ✅ | Single-File HTML bundle and GAS iframe focus management respected |

---

## Edge Cases

- [x] **Laptop with touchscreen and connected mouse**: Pointermove with mouse immediately clears `touchActive`, restoring classic mouse aim and hiding virtual buttons; touch down restores mobile buttons without resetting game state (`src/input.js:257-259, 277-282`).
- [x] **Narrow smartphone portrait (360px - 400px)**: `getGambitShopLayout` and `getSettingsLayout` dynamically collapse into 2-column grids with bounded heights and scroll/thumb-friendly proportions (`src/uiRenderer.js:403-452, 884-986`).
- [x] **Click outside modal or close button**: Clicking the visible `[X]` button, return button, or dark background outside the modal panel safely returns to `PLAYING` state (`src/game.js:858-869, 910-933, 960-969, 1021-1042`).
- [x] **Concurrent touch and mouse input**: Prioritizes the latest pointer event type to prevent conflicting input states (`src/input.js:257-282`).

---

## Gate Check

- **Gate command**: `npm run build && python3 scripts/bundle-singlefile.py`
- **Result**: Build passed cleanly; single-file HTML bundle generated at `dist/index.html` (243,025 bytes).
- **Exit code**: 0

---

## Fix Plans

No blocker, major, or minor defects detected. All requirements and edge cases are fully satisfied.

---

## Requirement Traceability Update

| Requirement ID | Story | Previous Status | New Status |
| -------------- | ----- | --------------- | ---------- |
| SHOP-01 | P1: Odblokowanie Sklepu i Izolacja Wskaźników | Pending | ✅ Verified |
| SHOP-02 | P1: Odblokowanie Sklepu i Izolacja Wskaźników | Pending | ✅ Verified |
| SHOP-03 | P1: Odblokowanie Sklepu i Izolacja Wskaźników | Pending | ✅ Verified |
| SHOP-04 | P1: Odblokowanie Sklepu i Izolacja Wskaźników | Pending | ✅ Verified |
| SHOP-05 | P1: Odblokowanie Sklepu i Izolacja Wskaźników | Pending | ✅ Verified |
| AIM-01 | P2: Klasyczne Celowanie Myszką | Pending | ✅ Verified |
| AIM-02 | P2: Klasyczne Celowanie Myszką | Pending | ✅ Verified |
| AIM-03 | P2: Klasyczne Celowanie Myszką | Pending | ✅ Verified |
| AIM-04 | P2: Klasyczne Celowanie Myszką | Pending | ✅ Verified |
| AIM-05 | P2: Klasyczne Celowanie Myszką | Pending | ✅ Verified |
| SETT-01 | P3: Dedykowane Menu Ustawień | Pending | ✅ Verified |
| SETT-02 | P3: Dedykowane Menu Ustawień | Pending | ✅ Verified |
| SETT-03 | P3: Dedykowane Menu Ustawień | Pending | ✅ Verified |
| SETT-04 | P3: Dedykowane Menu Ustawień | Pending | ✅ Verified |

---

## Summary

## Validation: controls-settings-shop-fix - PASS ✅

**Overall**: ✅ Ready

**Spec-anchored check**: 14/14 ACs matched spec outcome (0 gaps, 0 spec-precision gaps)
**Sensor**: 3/3 mutations killed
**Gate**: `npm run build && python3 scripts/bundle-singlefile.py` passed (exit code 0)

**What works**:
- Left-screen mouse clicks across the entire Gambit Shop unblocked (perks and promotions 100% clickable).
- Virtual touch joystick restricted strictly to touch pointer events during `PLAYING` state.
- Classic Mouse aim with visible crosshair restored on PC; Auto-Aim hides crosshair and targets enemies cleanly.
- Smart touch overlay auto-hides on mouse move and auto-shows on touch tap.
- Dedicated Settings menu (`SETTINGS`) accessible via ESC, KeyO, and HUD gear icon.
- Interactive HUD buttons for Shop, Settings, Aim mode, and Theme cycle.
- Fully responsive shop and settings overlays on desktop and mobile portrait viewports.

