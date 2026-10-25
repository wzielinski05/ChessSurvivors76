# Mobile Viewport & Balance Tasks

## Execution Protocol (MANDATORY -- do not skip)

Implement these tasks with the `tlc-spec-driven` skill: **activate it by name and follow its Execute flow and Critical Rules.** Do not search for skill files by filesystem path. The skill is the source of truth for the full flow (per-task cycle, sub-agent delegation, adequacy review, Verifier, discrimination sensor).

**If the skill cannot be activated, STOP and tell the user - do not proceed without it.**

---

**Design**: `.specs/features/mobile-viewport-balance/design.md`
**Status**: Ready for Review

---

## Test Coverage Matrix

> Generated from codebase, project guidelines, and spec - confirm before Execute. Guidelines found: none - strong defaults applied.

| Code Layer | Required Test Type | Coverage Expectation | Location Pattern | Run Command |
| --- | --- | --- | --- | --- |
| Viewport & Canvas Layout | unit | Dynamic size, bounds recalculation, DPR scaling | `src/boardRenderer.js`, `src/main.js` | `python3 scripts/bundle-singlefile.py` |
| Touch Controller & Input | integration | Multi-touch, floating joystick vector, action buttons | `src/input.js`, `src/sprites.js` | `python3 scripts/bundle-singlefile.py` |
| Auto-Aim & Targeting | unit | Nearest enemy angle calculation, touch lock target | `src/game.js` | `python3 scripts/bundle-singlefile.py` |
| Modular HUD Layout | unit | Anchor positioning in Landscape & Portrait | `src/uiRenderer.js` | `python3 scripts/bundle-singlefile.py` |
| Wave Pacing & Boss Logic | integration | Wave duration per tempo, sequential boss telegraphs | `src/chessData.js`, `src/game.js` | `python3 scripts/bundle-singlefile.py` |

## Gate Check Commands

> Generated from codebase - confirm before Execute.

| Gate Level | When to Use | Command |
| --- | --- | --- |
| Quick | After single task implementation | `python3 scripts/bundle-singlefile.py` |
| Full | After phase completion | `python3 scripts/bundle-singlefile.py` |
| Build | After full implementation and verification | `python3 scripts/bundle-singlefile.py` |

---

## Execution Plan

Phases are ordered and run sequentially - each phase completes before the next begins, and tasks within a phase execute in order.

### Phase 1: Viewport and Board Canvas Foundation

```
T1 -> T2 -> T3
```

### Phase 2: Touch Input and Virtual Controls

```
T4 -> T5 -> T6
```

### Phase 3: Mobile Targeting and Adaptive HUD

```
T7 -> T8 -> T9
```

### Phase 4: Wave Pacing and Boss Balancer

```
T10 -> T11 -> T12
```

---

## Task Breakdown

### Phase 1: Viewport and Board Canvas Foundation

#### T1: Implement dynamic full-window canvas scaling and HiDPI handling

**What**: Adapt canvas width and height dynamically to 100% of window size with HiDPI DPR scaling.
**Where**: `src/main.js`
**Depends on**: None
**Reuses**: Existing `resizeViewport` in `src/main.js`
**Requirement**: VIEW-01, VIEW-05

**Tools**:
- MCP: `filesystem`
- Skill: NONE

**Done when**:
- [ ] Canvas dimensions dynamically match `window.innerWidth` and `window.innerHeight`
- [ ] Virtual resolution and DPR scaling updated on resize without letterboxing
- [ ] Gate check passes: `python3 scripts/bundle-singlefile.py`

**Tests**: unit
**Gate**: quick

---

#### T2: Implement responsive square chessboard positioning

**What**: Recalculate board size and center offsets based on dynamic viewport dimensions.
**Where**: `src/boardRenderer.js`
**Depends on**: T1
**Reuses**: `BoardRenderer.getBounds` in `src/boardRenderer.js`
**Requirement**: VIEW-02, VIEW-04

**Tools**:
- MCP: `filesystem`
- Skill: NONE

**Done when**:
- [ ] Chessboard scales to maximum available viewport space while preserving square aspect ratio
- [ ] `getBounds()` correctly reflects new dynamic screen boundaries
- [ ] Gate check passes: `python3 scripts/bundle-singlefile.py`

**Tests**: unit
**Gate**: quick

---

#### T3: Implement open table background rendering to viewport edges

**What**: Procedurally render theme background and textures to fill entire visible canvas.
**Where**: `src/boardRenderer.js`
**Depends on**: T2
**Reuses**: Procedural theme drawing in `src/boardRenderer.js`
**Requirement**: VIEW-03

**Tools**:
- MCP: `filesystem`
- Skill: NONE

**Done when**:
- [ ] Background textures cover entire canvas up to window boundaries
- [ ] No black letterbox bars appear in 16:9, 21:9 or mobile portrait modes
- [ ] Gate check passes: `python3 scripts/bundle-singlefile.py`

**Tests**: unit
**Gate**: quick

---

### Phase 2: Touch Input and Virtual Controls

#### T4: Implement pointer event listeners and multitouch tracking

**What**: Add pointer event listeners with touch-action none and active pointer tracking.
**Where**: `src/input.js`
**Depends on**: T3
**Reuses**: Event binding in `src/input.js`
**Requirement**: TOUCH-01

**Tools**:
- MCP: `filesystem`
- Skill: NONE

**Done when**:
- [ ] Pointerdown, pointermove, pointerup track multiple simultaneous touches
- [ ] Default touch scrolling and gestures prevented on canvas
- [ ] Gate check passes: `python3 scripts/bundle-singlefile.py`

**Tests**: integration
**Gate**: quick

---

#### T5: Implement floating virtual movement joystick

**What**: Anchor a dynamic virtual joystick under left thumb and output 360-degree movement vector.
**Where**: `src/input.js`
**Depends on**: T4
**Reuses**: `getMoveVector` in `src/input.js`
**Requirement**: TOUCH-02

**Tools**:
- MCP: `filesystem`
- Skill: NONE

**Done when**:
- [ ] Virtual joystick anchors on touch in left half of screen
- [ ] Drag offset produces normalized `x, y` movement vector consumed by player
- [ ] Gate check passes: `python3 scripts/bundle-singlefile.py`

**Tests**: integration
**Gate**: quick

---

#### T6: Implement on-screen touch action buttons and overlay rendering

**What**: Render vector controls for Dash, Perk [E] and Shop with touch hit-testing.
**Where**: `src/sprites.js`
**Depends on**: T5
**Reuses**: `drawFauxGlow` in `src/sprites.js`
**Requirement**: TOUCH-06

**Tools**:
- MCP: `filesystem`
- Skill: NONE

**Done when**:
- [ ] Virtual joystick and action buttons rendered cleanly with opacity
- [ ] Tapping Dash button triggers player figure ability with cooldown visual
- [ ] Gate check passes: `python3 scripts/bundle-singlefile.py`

**Tests**: integration
**Gate**: quick

---

### Phase 3: Mobile Targeting and Adaptive HUD

#### T7: Implement hybrid auto-aim and touch focus targeting

**What**: Automatically target nearest enemy with optional touch tap focus.
**Where**: `src/game.js`
**Depends on**: T6
**Reuses**: `pools.enemies` and `_firePlayerWeapon` in `src/game.js`
**Requirement**: TOUCH-03, TOUCH-04

**Tools**:
- MCP: `filesystem`
- Skill: NONE

**Done when**:
- [ ] Player weapon aims at nearest enemy when touch input is active
- [ ] Tapping an enemy locks crosshair onto it as priority target
- [ ] Gate check passes: `python3 scripts/bundle-singlefile.py`

**Tests**: unit
**Gate**: quick

---

#### T8: Implement optional twin-stick touch controls

**What**: Add right-side virtual aiming joystick toggleable in settings.
**Where**: `src/input.js`
**Depends on**: T7
**Reuses**: Left joystick logic in `src/input.js`
**Requirement**: TOUCH-05

**Tools**:
- MCP: `filesystem`
- Skill: NONE

**Done when**:
- [ ] Right stick activates in right half of screen when Twin-Stick mode is active
- [ ] Right stick direction overrides auto-aim with manual 360-degree shooting
- [ ] Gate check passes: `python3 scripts/bundle-singlefile.py`

**Tests**: unit
**Gate**: quick

---

#### T9: Implement modular anchor-based HUD for landscape and portrait

**What**: Dynamically position chess clock, HP, wave info based on orientation and layout mode.
**Where**: `src/uiRenderer.js`
**Depends on**: T8
**Reuses**: `renderGameHUD` in `src/uiRenderer.js`
**Requirement**: HUD-01, HUD-02, HUD-03, HUD-04

**Tools**:
- MCP: `filesystem`
- Skill: NONE

**Done when**:
- [ ] HUD adapts seamlessly to landscape (side anchors) and portrait (top/bottom split)
- [ ] Bottom HUD option positions clock and health along lower screen margin
- [ ] Gate check passes: `python3 scripts/bundle-singlefile.py`

**Tests**: unit
**Gate**: quick

---

### Phase 4: Wave Pacing and Boss Balancer

#### T10: Configure extended wave structure across chess tempos

**What**: Update CHESS_TEMPOS with 6 waves for Bullet, 8 waves for Blitz, and 10 waves for Rapid.
**Where**: `src/chessData.js`
**Depends on**: T9
**Reuses**: `CHESS_TEMPOS` in `src/chessData.js`
**Requirement**: BAL-01, BAL-02, BAL-03

**Tools**:
- MCP: `filesystem`
- Skill: NONE

**Done when**:
- [ ] Bullet configured for 6 waves of 30s (~3.5 min run)
- [ ] Blitz configured for 8 waves of 45s (~6 min run) with Mini-Boss at wave 4
- [ ] Rapid configured for 10 waves of 50s (~8.5 min run) with Mini-Boss at wave 5 and Queen at wave 10
- [ ] Gate check passes: `python3 scripts/bundle-singlefile.py`

**Tests**: integration
**Gate**: quick

---

#### T11: Integrate extended progression and tempo pacing in game loop

**What**: Update wave transition, token drop curve, and boss trigger schedule.
**Where**: `src/game.js`
**Depends on**: T10
**Reuses**: `spawnBossForCurrentWave` in `src/game.js`
**Requirement**: BAL-01, BAL-02, BAL-03

**Tools**:
- MCP: `filesystem`
- Skill: NONE

**Done when**:
- [ ] Wave timer and progression smoothly advance through 6/8/10 waves
- [ ] Mini-Boss and Final Boss spawn according to tempo configuration
- [ ] Gate check passes: `python3 scripts/bundle-singlefile.py`

**Tests**: integration
**Gate**: quick

---

#### T12: Implement sequential boss telegraphs and projectile cleanup

**What**: Refactor boss attack patterns to execute in sequential series and clear ambient bullets on phase change.
**Where**: `src/game.js`
**Depends on**: T11
**Reuses**: `_updateBlackKing`, `_updateBlackQueen` in `src/game.js`
**Requirement**: BAL-04, BAL-05

**Tools**:
- MCP: `filesystem`
- Skill: NONE

**Done when**:
- [ ] King and Queen telegraphs trigger in distinct, readable intervals
- [ ] Grid shrinkage by Grandmaster Hand clears ambient non-boss projectiles
- [ ] Gate check passes: `python3 scripts/bundle-singlefile.py`

**Tests**: integration
**Gate**: build

---

## Phase Execution Map

```
Phase 1 -> Phase 2 -> Phase 3 -> Phase 4

Phase 1:  T1 ------> T2 ------> T3
Phase 2:  T4 ------> T5 ------> T6
Phase 3:  T7 ------> T8 ------> T9
Phase 4:  T10 -----> T11 -----> T12
```

---

## Task Granularity Check

| Task | Scope | Status |
| --- | --- | --- |
| T1: Full-window canvas scaling | 1 file change (`src/main.js`) | ✅ Granular |
| T2: Responsive chessboard positioning | 1 component method (`src/boardRenderer.js`) | ✅ Granular |
| T3: Open table background rendering | 1 render method (`src/boardRenderer.js`) | ✅ Granular |
| T4: Pointer event listeners | 1 input subsystem (`src/input.js`) | ✅ Granular |
| T5: Floating virtual joystick | 1 input controller (`src/input.js`) | ✅ Granular |
| T6: Touch action buttons & overlay | 1 sprite module (`src/sprites.js`) | ✅ Granular |
| T7: Hybrid auto-aim & touch focus | 1 targeting method (`src/game.js`) | ✅ Granular |
| T8: Twin-stick touch controls | 1 input mode (`src/input.js`) | ✅ Granular |
| T9: Modular anchor-based HUD | 1 UI renderer (`src/uiRenderer.js`) | ✅ Granular |
| T10: Configure wave structure in chess tempos | 1 data config (`src/chessData.js`) | ✅ Granular |
| T11: Integrate progression in game loop | 1 loop integration (`src/game.js`) | ✅ Granular |
| T12: Sequential boss telegraphs | 1 boss attack logic (`src/game.js`) | ✅ Granular |

---

## Diagram-Definition Cross-Check

| Task | Depends On (task body) | Diagram Shows | Status |
| --- | --- | --- | --- |
| T1 | None | Start of Phase 1 | ✅ Match |
| T2 | T1 | T1 -> T2 | ✅ Match |
| T3 | T2 | T2 -> T3 | ✅ Match |
| T4 | T3 (Phase 1) | Start of Phase 2 | ✅ Match |
| T5 | T4 | T4 -> T5 | ✅ Match |
| T6 | T5 | T5 -> T6 | ✅ Match |
| T7 | T6 (Phase 2) | Start of Phase 3 | ✅ Match |
| T8 | T7 | T7 -> T8 | ✅ Match |
| T9 | T8 | T8 -> T9 | ✅ Match |
| T10 | T9 (Phase 3) | Start of Phase 4 | ✅ Match |
| T11 | T10 | T10 -> T11 | ✅ Match |
| T12 | T11 | T11 -> T12 | ✅ Match |

---

## Test Co-location Validation

| Task | Code Layer Created/Modified | Matrix Requires | Task Says | Status |
| --- | --- | --- | --- | --- |
| T1 | Viewport & Canvas Layout | unit | unit | ✅ OK |
| T2 | Viewport & Canvas Layout | unit | unit | ✅ OK |
| T3 | Viewport & Canvas Layout | unit | unit | ✅ OK |
| T4 | Touch Controller & Input | integration | integration | ✅ OK |
| T5 | Touch Controller & Input | integration | integration | ✅ OK |
| T6 | Touch Controller & Input | integration | integration | ✅ OK |
| T7 | Auto-Aim & Targeting | unit | unit | ✅ OK |
| T8 | Touch Controller & Input | unit | unit | ✅ OK |
| T9 | Modular HUD Layout | unit | unit | ✅ OK |
| T10 | Wave Pacing & Boss Logic | integration | integration | ✅ OK |
| T11 | Wave Pacing & Boss Logic | integration | integration | ✅ OK |
| T12 | Wave Pacing & Boss Logic | integration | integration | ✅ OK |

