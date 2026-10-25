# Chess Fusions and Evolutions Tasks

**Spec**: `.specs/features/chess-fusions-evolutions/spec.md`  
**Design**: `.specs/features/chess-fusions-evolutions/design.md`  
**Status**: Ready for Review  

---

## Test Coverage Matrix

| Code Layer | Required Test Type | Coverage Expectation | Location Pattern | Run Command |
| --- | --- | --- | --- | --- |
| Fusion Data & Recipes | unit | Class stats and recipe definitions | `src/chessData.js` | `npm run build` |
| Class Transformation | integration | Zero-GC class transformation and reset | `src/game.js` | `npm run build` |
| Empress Combat & Shield | integration | Cannonade shrapnels, Siege Leap, Bulwark | `src/game.js` | `npm run build` |
| Cardinal Lasers & Aura | integration | Zig-zag lasers, Translocation, Cathedral Aura | `src/game.js` | `npm run build` |
| Amazon Stasis & Auto-Mat | integration | 8-way chaos barrage, Absolute Domain, Auto-Mat | `src/game.js` | `npm run build` |
| Procedural Fairy Sprites | visual | Vector piece rendering and Faux-Glow | `src/sprites.js` | `npm run build` |
| Shop UI & Interaction | integration | Fusion card display and purchase handling | `src/uiRenderer.js` | `npm run build` |

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

### Phase 1: Fusion Data and Class Transformation

```
T1 -> T2
```

### Phase 2: Cesarka (Empress / Chancellor)

```
T3 -> T4
```

### Phase 3: Kardynał (Cardinal / Archbishop)

```
T5 -> T6
```

### Phase 4: Amazonka (Queen-Knight)

```
T7 -> T8
```

### Phase 5: Procedural Sprites and Shop Integration

```
T9 -> T10
```

---

## Task Breakdown

### Phase 1: Fusion Data and Class Transformation

#### T1: Define fusion classes and recipes in chessData.js

**What**: Add `empress`, `cardinal`, and `amazon` class configurations and fusion recipe definitions.
**Where**: `src/chessData.js`
**Depends on**: None
**Reuses**: `PLAYER_CLASSES` in `src/chessData.js`
**Requirement**: FUS-01

**Tools**:
- MCP: `filesystem`
- Skill: NONE

**Done when**:
- [x] `PLAYER_CLASSES` contains entries for `empress`, `cardinal`, and `amazon` with all combat fields
- [x] `FUSION_RECIPES` defines base requirements, token costs, and descriptions
- [x] Gate check passes: `npm run build`

**Tests**: unit
**Gate**: quick

---

#### T2: Implement class transformation and player state reset in game.js

**What**: Implement `applyFusion(fusionId)` with zero-GC attribute mapping, token deduction, and stats recomputation.
**Where**: `src/game.js`
**Depends on**: T1
**Reuses**: `resetRun` in `src/game.js`
**Requirement**: FUS-01

**Tools**:
- MCP: `filesystem`
- Skill: NONE

**Done when**:
- [x] `applyFusion` updates player stats, radius, speed, fireRate, and special ability without allocations
- [x] Tokens are deducted and floating fanfare text is displayed
- [x] Gate check passes: `npm run build`

**Tests**: integration
**Gate**: quick

---

### Phase 2: Cesarka (Empress / Chancellor)

#### T3: Implement Empress Siege Cannonade and horseshoe shrapnels

**What**: Implement heavy siege cannon bullet that pierces 2 targets and shatters on 3rd target or wall into 4 diagonal horseshoe sparks.
**Where**: `src/game.js`
**Depends on**: T2
**Reuses**: `spawnBullet` in `src/game.js`
**Requirement**: FUS-02

**Tools**:
- MCP: `filesystem`
- Skill: NONE

**Done when**:
- [x] Empress primary fire shoots siege cannon ball piercing 2 targets
- [x] On third impact or wall collision, explodes into 4 diagonal horseshoe sparks with Pinning
- [x] Gate check passes: `npm run build`

**Tests**: integration
**Gate**: quick

---

#### T4: Implement Empress Siege Leap AoE and Bulwark Shield

**What**: Implement Siege Leap (0.7s invulnerable jump, 180px AoE, 1.8s stun, bullet wipe) and 4-charge 180° frontal Bulwark Shield.
**Where**: `src/game.js`
**Depends on**: T3
**Reuses**: `_triggerKnightLeapSlam` in `src/game.js`
**Requirement**: FUS-03, FUS-04

**Tools**:
- MCP: `filesystem`
- Skill: NONE

**Done when**:
- [x] Special leap creates 180px earthquake, wipes enemy bullets, and stuns enemies for 1.8s
- [x] Bulwark shield deflects incoming frontal bullets, consuming charges up to 4, regenerating every 12.0s
- [x] Gate check passes: `npm run build`

**Tests**: integration
**Gate**: quick

---

### Phase 3: Kardynał (Cardinal / Archbishop)

#### T5: Implement Cardinal Holy Zig-zag Lasers and bounce scaling

**What**: Implement diagonal laser bolts that step 90° every 120px in Knight-step vectors and bounce up to 2 times with +30% damage per bounce.
**Where**: `src/game.js`
**Depends on**: T4
**Reuses**: `_updateBullets` in `src/game.js`
**Requirement**: FUS-05

**Tools**:
- MCP: `filesystem`
- Skill: NONE

**Done when**:
- [ ] Cardinal primary fire launches zig-zag lasers performing 90° Knight-step turns every 120px
- [ ] Bouncing from arena borders increments damage multiplier by +30% up to 2 bounces
- [ ] Gate check passes: `npm run build`

**Tests**: integration
**Gate**: quick

---

#### T6: Implement Cardinal Translocation Dash and Cathedral Aura

**What**: Implement 320px instant teleportation with dual X-Cross laser bursts and 130px Cathedral Aura with slow, pin, and parry clock bonus.
**Where**: `src/game.js`
**Depends on**: T5
**Reuses**: `_fireDiagonalCleave` in `src/game.js`
**Requirement**: FUS-06, FUS-07

**Tools**:
- MCP: `filesystem`
- Skill: NONE

**Done when**:
- [ ] Translocation dash instantly moves player and fires diagonal laser crosses at origin and target
- [ ] Cathedral Aura slows enemies by 20% and parrying crossing bullets adds +0.2s to Chess Clock
- [ ] Gate check passes: `npm run build`

**Tests**: integration
**Gate**: quick

---

### Phase 4: Amazonka (Queen-Knight)

#### T7: Implement Amazon 8-directional barrage and Chaos Horseshoes

**What**: Implement 8-directional royal barrage with every second volley replacing diagonals with armor-piercing Chaos Horseshoes.
**Where**: `src/game.js`
**Depends on**: T6
**Reuses**: `_spawnKnightForkSparks` in `src/game.js`
**Requirement**: FUS-08

**Tools**:
- MCP: `filesystem`
- Skill: NONE

**Done when**:
- [ ] Amazon fires in all 8 cardinal and diagonal directions simultaneously
- [ ] Alternating volleys launch Chaos Horseshoes with armor bypass, 3x knockback, and fork sparks
- [ ] Gate check passes: `npm run build`

**Tests**: integration
**Gate**: quick

---

#### T8: Implement Amazon Absolute Domain stasis and Imperial Checkmate

**What**: Implement Absolute Domain (4.0s time freeze, 85% enemy slow, bullet reflection, clock freeze) and Imperial Checkmate every 5 kills.
**Where**: `src/game.js`
**Depends on**: T7
**Reuses**: `_triggerCheckmateDetonation` in `src/game.js`
**Requirement**: FUS-09, FUS-10

**Tools**:
- MCP: `filesystem`
- Skill: NONE

**Done when**:
- [ ] Absolute Domain freezes enemy projectiles, slows enemies by 85%, and reflects bullets on dash
- [ ] Every 5th enemy kill automatically triggers Checkmate Detonation on nearest elite/boss
- [ ] Gate check passes: `npm run build`

**Tests**: integration
**Gate**: quick

---

### Phase 5: Procedural Sprites and Shop Integration

#### T9: Implement procedural Canvas 2D vector sprites for Fairy pieces

**What**: Implement procedural rendering for Empress, Cardinal, and Amazon in `src/sprites.js` with Faux-Glow and Zero-GC.
**Where**: `src/sprites.js`
**Depends on**: T8
**Reuses**: `drawFauxGlow` in `src/sprites.js`
**Requirement**: FUS-11

**Tools**:
- MCP: `filesystem`
- Skill: NONE

**Done when**:
- [ ] Empress renders fortress battlement with equine crest and frontal shield arc
- [ ] Cardinal renders elongated bishop mitre with golden horseshoe clasp
- [ ] Amazon renders royal crown flanked by winged pegasus crest
- [ ] Gate check passes: `npm run build`

**Tests**: visual
**Gate**: quick

---

#### T10: Implement Gambit Shop fusion cards and purchase interaction

**What**: Render fusion cards in Gambit Shop overlay when player qualifies, and wire purchase click handlers.
**Where**: `src/uiRenderer.js`
**Depends on**: T9
**Reuses**: `renderGambitShopOverlay` in `src/uiRenderer.js`
**Requirement**: FUS-01

**Tools**:
- MCP: `filesystem`
- Skill: NONE

**Done when**:
- [ ] Available fusion cards render in Gambit Shop with recipes, costs, and badges
- [ ] Clicking fusion card triggers purchase and applies transformation
- [ ] Gate check passes: `npm run build && python3 scripts/bundle-singlefile.py`

**Tests**: integration
**Gate**: build
