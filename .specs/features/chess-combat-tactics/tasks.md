# Chess Combat Tactics Tasks

**Spec**: `.specs/features/chess-combat-tactics/spec.md`
**Design**: `.specs/features/chess-combat-tactics/design.md`
**Status**: Ready for Review

---

## Test Coverage Matrix

| Code Layer | Required Test Type | Coverage Expectation | Location Pattern | Run Command |
| --- | --- | --- | --- | --- |
| Tactical Status & Pools | unit | Entity reset and zero-GC status fields | `src/game.js` | `npm run build` |
| Pinning & Pin Shatter | integration | Cone raycasting, immobilize, and AoE burst | `src/game.js` | `npm run build` |
| Knight's Fork & Sparks | integration | Homing sparks, dual impact, and boss interrupt | `src/game.js` | `npm run build` |
| Checkmate Stacking Combo | integration | 3-step mark tracking, detonation, clock restore | `src/game.js` | `npm run build` |
| Faux-Glow Tactical Visuals | visual | Tactical base rings and crown combo markers | `src/sprites.js` | `npm run build` |

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

### Phase 1: Status Tracking and Związanie (Pinning)

```
T1 -> T2 -> T3
```

### Phase 2: Widełki Skoczka (Knight's Fork)

```
T4 -> T5
```

### Phase 3: Szach i Mat w 3 Ruchach (Checkmate Stacking)

```
T6 -> T7
```

### Phase 4: Procedural Visuals and Tactical Feedback

```
T8
```

---

## Task Breakdown

### Phase 1: Status Tracking and Związanie (Pinning)

#### T1: Implement tactical status fields and zero-GC lifecycle

**What**: Add `pinTimer`, `isPinned`, `pinVulnerability`, `mateStep`, `mateTimer`, and `stunTimer` to enemy entity lifecycle and pool resets.
**Where**: `src/game.js`
**Depends on**: None
**Reuses**: `this.pools.enemies` in `src/game.js`
**Requirement**: TAC-10

**Tools**:
- MCP: `filesystem`
- Skill: NONE

**Done when**:
- [x] Enemy entities initialize with tactical status fields reset to zero/false
- [x] Gate check passes: `npm run build`

**Tests**: unit
**Gate**: quick

---

#### T2: Implement Związanie (Pinning) raycast detection and status effects

**What**: On projectile hit, raycast cone behind target; apply Pin state (immobilize normal units, slow bosses, apply damage vulnerability).
**Where**: `src/game.js`
**Depends on**: T1
**Reuses**: `damageEnemy` in `src/game.js`
**Requirement**: TAC-01, TAC-02

**Tools**:
- MCP: `filesystem`
- Skill: NONE

**Done when**:
- [x] When enemy is hit with another enemy/wall behind it, Pin state is applied for 2.0s
- [x] Normal pinned enemies are immobilized; bosses receive 40% slow instead
- [x] Gate check passes: `npm run build`

**Tests**: integration
**Gate**: quick

---

#### T3: Implement Pin Shatter AoE burst on pinned enemy destruction

**What**: When a pinned enemy dies or is struck by En Passant Dash, trigger a 140px AoE burst dealing 150% damage to nearby enemies.
**Where**: `src/game.js`
**Depends on**: T2
**Reuses**: `_spawnParticles` in `src/game.js`
**Requirement**: TAC-03

**Tools**:
- MCP: `filesystem`
- Skill: NONE

**Done when**:
- [x] Destroying or dashing into a pinned enemy triggers Pin Shatter AoE explosion
- [x] Gate check passes: `npm run build`

**Tests**: integration
**Gate**: quick

---

### Phase 2: Widełki Skoczka (Knight's Fork)

#### T4: Implement Knight's Fork homing sparks on crits and special landings

**What**: Spawn up to 2 homing fork sparks towards nearest active enemies within 350px on critical hits or special landings.
**Where**: `src/game.js`
**Depends on**: T3
**Reuses**: `pools.bullets` in `src/game.js`
**Requirement**: TAC-04

**Tools**:
- MCP: `filesystem`
- Skill: NONE

**Done when**:
- [x] Critical hits and ability landings launch 2 homing fork sparks towards distinct targets
- [x] Gate check passes: `npm run build`

**Tests**: integration
**Gate**: quick

---

#### T5: Implement Royal Fork dual-hit detection, stun, token drop, and boss interrupt

**What**: Detect dual fork impacts within 0.2s; apply 1.2s stun, spawn +1 Gambit Token, and interrupt charging boss telegraphs.
**Where**: `src/game.js`
**Depends on**: T4
**Reuses**: `AudioEngine.playTokenPickup` in `src/audio.js`
**Requirement**: TAC-05, TAC-06

**Tools**:
- MCP: `filesystem`
- Skill: NONE

**Done when**:
- [x] Dual fork hits within 0.20s apply 1.2s stun and reward +1 Gambit Token
- [x] Fork hit interrupts charging boss telegraphs with 0.6s stun
- [x] Gate check passes: `npm run build`

**Tests**: integration
**Gate**: quick

---

### Phase 3: Szach i Mat w 3 Ruchach (Checkmate Stacking)

#### T6: Implement Checkmate Mark I and Mark II status stacking

**What**: Apply Mark I ("SZACH!") on initial hit (-30% telegraph speed) and Mark II ("SZACH PODWÓJNY!") on second hit within 4.0s (-50% speed, armor bypass).
**Where**: `src/game.js`
**Depends on**: T5
**Reuses**: `AudioEngine.playCheckShout` in `src/audio.js`
**Requirement**: TAC-07, TAC-08

**Tools**:
- MCP: `filesystem`
- Skill: NONE

**Done when**:
- [x] Hit 1 applies Mark I with telegraph slowdown for 4.0s
- [x] Hit 2 within 4.0s upgrades to Mark II with 50% movement slow
- [x] Gate check passes: `npm run build`

**Tests**: integration
**Gate**: quick

---

#### T7: Implement Checkmate Detonation finisher, bullet wipe, and clock bonus

**What**: On third consecutive hit within 4.0s, execute Checkmate Detonation dealing 400% + 25% max HP finisher, wipe bullets in 200px, and restore +2.0s to clock.
**Where**: `src/game.js`
**Depends on**: T6
**Reuses**: `chessClock` in `src/game.js`
**Requirement**: TAC-09

**Tools**:
- MCP: `filesystem`
- Skill: NONE

**Done when**:
- [ ] Third hit executes Checkmate Detonation dealing massive burst and wiping nearby enemy bullets
- [ ] Successful Checkmate adds +2.0s to Chess Clock
- [ ] Gate check passes: `npm run build`

**Tests**: integration
**Gate**: quick

---

### Phase 4: Procedural Visuals and Tactical Feedback

#### T8: Implement tactical status rendering with faux-glow rings and crown markers

**What**: Render cyan geometric base rings for Pinned enemies, Roman numeral crown markers for Szach I/II, and floating combat text banners.
**Where**: `src/sprites.js`
**Depends on**: T7
**Reuses**: `drawFauxGlow` in `src/sprites.js`
**Requirement**: TAC-10

**Tools**:
- MCP: `filesystem`
- Skill: NONE

**Done when**:
- [ ] Pinned enemies display cyan tactical ring at their base
- [ ] Enemies with Checkmate marks display crown indicators above their sprites
- [ ] Gate check passes: `npm run build && python3 scripts/bundle-singlefile.py`

**Tests**: visual
**Gate**: build

