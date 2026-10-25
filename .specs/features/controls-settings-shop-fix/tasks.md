# Controls, Settings & Shop Fix Tasks

**Spec**: `.specs/features/controls-settings-shop-fix/spec.md`
**Design**: `.specs/features/controls-settings-shop-fix/design.md`
**Status**: Ready

---

## Test Coverage Matrix

| Code Layer | Required Test Type | Coverage Expectation | Location Pattern | Run Command |
| --- | --- | --- | --- | --- |
| Pointer Filtering & Input | integration | Pointer type isolation, modal click unblocking | `src/input.js` | `npm run build` |
| Shop UI & Responsive Grid | unit | Card purchasing in columns 0-3, close button | `src/uiRenderer.js` | `npm run build` |
| Aim Engine & Crosshair | unit | Classic mouse aim with crosshair, clean auto-aim | `src/game.js` | `npm run build` |
| Settings Menu & HUD Buttons | integration | Settings modal interaction, HUD gear click | `src/uiRenderer.js` | `npm run build` |

---

## Gate Check Commands

| Gate Level | When to Use | Command |
| --- | --- | --- |
| Quick | After single task implementation | `npm run build` |
| Full | After phase completion | `npm run build && python3 scripts/bundle-singlefile.py` |
| Build | After full implementation and verification | `npm run build && python3 scripts/bundle-singlefile.py` |

---

## Execution Plan

Phases are ordered and run sequentially. Each phase completes before the next begins.

### Phase 1: Input Isolation and Shop Unblocking

```
T1 -> T2
```

### Phase 2: Aim Mode and Crosshair Controls

```
T3 -> T4
```

### Phase 3: Settings Menu and Interactive HUD

```
T5 -> T6
```

---

## Task Breakdown

### Phase 1: Input Isolation and Shop Unblocking

#### T1: Isolate pointer events and unblock left screen clicks in modals

**What**: Restrict virtual joystick and touch buttons strictly to `PLAYING` state and `pointerType === 'touch'`, allowing 100% free mouse clicks everywhere.
**Where**: `src/input.js`
**Depends on**: None
**Reuses**: `activePointers` in `src/input.js`
**Requirement**: SHOP-03, SHOP-04

**Tools**:
- MCP: `filesystem`
- Skill: NONE

**Done when**:
- [x] Virtual movement joystick never activates on mouse clicks
- [x] Inside modal overlays (Shop, Tempo, Settings) clicks in left half of screen trigger UI actions
- [x] Gate check passes: `npm run build`

**Tests**: integration
**Gate**: quick

---

#### T2: Enable responsive shop grid and seamless card purchasing

**What**: Render responsive card grid for mobile and desktop, allowing immediate purchase of all 8 perks and 4 promotions.
**Where**: `src/uiRenderer.js`
**Depends on**: T1
**Reuses**: `GAMBIT_SHOP_ITEMS` in `src/chessData.js`
**Requirement**: SHOP-01, SHOP-02, SHOP-05

**Tools**:
- MCP: `filesystem`
- Skill: NONE

**Done when**:
- [x] All 8 perk cards and 4 class promotion cards are clickable and buyable
- [x] Shop modal fits within window width on mobile portrait with visible [X] button
- [x] Gate check passes: `npm run build`

**Tests**: unit
**Gate**: quick

---

### Phase 2: Aim Mode and Crosshair Controls

#### T3: Implement classic mouse aiming with visible crosshair and clean auto-aim

**What**: Enable true mouse-directed shooting with visible crosshair on PC, and hide crosshair in Auto-Aim mode.
**Where**: `src/game.js`
**Depends on**: T2
**Reuses**: `drawCrosshair` in `src/sprites.js`
**Requirement**: AIM-01, AIM-02, AIM-03

**Tools**:
- MCP: `filesystem`
- Skill: NONE

**Done when**:
- [x] In Classic Mouse mode player shoots exactly towards mouse cursor with visible crosshair
- [x] In Auto-Aim mode mouse crosshair is hidden and weapon auto-targets nearest enemy
- [x] Gate check passes: `npm run build`

**Tests**: unit
**Gate**: quick

---

#### T4: Implement smart touch overlay visibility

**What**: Auto-show touch buttons on touch input and auto-hide on mouse movement.
**Where**: `src/input.js`
**Depends on**: T3
**Reuses**: `drawTouchControls` in `src/sprites.js`
**Requirement**: AIM-04, AIM-05

**Tools**:
- MCP: `filesystem`
- Skill: NONE

**Done when**:
- [x] Moving mouse automatically hides on-screen virtual buttons
- [x] Touching screen during gameplay brings up on-screen touch buttons
- [x] Gate check passes: `npm run build`

**Tests**: integration
**Gate**: quick

---

### Phase 3: Settings Menu and Interactive HUD

#### T5: Implement dedicated Settings overlay and HUD gear icon

**What**: Add settings menu modal with options for Aim Mode, Touch Buttons, HUD Layout, Theme, Audio.
**Where**: `src/uiRenderer.js`
**Depends on**: T4
**Reuses**: `StorageEngine` in `src/storage.js`
**Requirement**: SETT-01, SETT-02, SETT-03

**Tools**:
- MCP: `filesystem`
- Skill: NONE

**Done when**:
- [x] Pressing ESC, O or clicking gear icon opens Settings menu
- [x] Selecting Aim Mode, Touch, HUD, Theme, or Audio immediately applies and saves choice
- [x] Gate check passes: `npm run build`

**Tests**: integration
**Gate**: quick

---

#### T6: Implement interactive clickable HUD buttons

**What**: Enable direct clicking or tapping on HUD items (Shop, Settings, Theme, Aim).
**Where**: `src/game.js`
**Depends on**: T5
**Reuses**: `renderGameHUD` in `src/uiRenderer.js`
**Requirement**: SETT-04

**Tools**:
- MCP: `filesystem`
- Skill: NONE

**Done when**:
- [x] Clicking or tapping HUD buttons triggers corresponding menu or action
- [x] Gate check passes: `npm run build && python3 scripts/bundle-singlefile.py`

**Tests**: integration
**Gate**: build

---

## Phase Execution Map

```
Phase 1 -> Phase 2 -> Phase 3

Phase 1:  T1 ------> T2
Phase 2:  T3 ------> T4
Phase 3:  T5 ------> T6
```

---

## Task Granularity Check

| Task | Scope | Status |
| --- | --- | --- |
| T1 | Input filter and modal unblocking | Done |
| T2 | Responsive shop grid and purchase flow | Done |
| T3 | Classic mouse aim and crosshair toggle | Done |
| T4 | Smart touch overlay visibility | Done |
| T5 | Settings menu overlay and preferences | Done |
| T6 | Interactive clickable HUD buttons | Done |
