# Chess Combat Tactics Spec

**Feature**: `chess-combat-tactics`
**Status**: Verified
**Date**: 2026-10-25

---

## Problem Statement

In the current version of *Chess Survivors 76*, combat revolves primarily around basic kiting and continuous projectile fire. While player classes (Knight, Bishop, Rook, Queen) have distinct abilities, real-time tactical chess depth is limited:
1. Enemies do not react to line-of-sight positioning, making spatial maneuvering feel generic rather than chess-like.
2. Targeting multiple enemies does not reward tactical geometry (forks, pins, skewering).
3. Eliminating enemies lacks combination chains (Check $\to$ Double Check $\to$ Checkmate), reducing the sense of chess mastery.

Introducing the 3 core Chess Combat Tactics (**Związanie / Pinning**, **Widełki / Knight's Fork**, and **Szach-Mat Combo Stacking**) transforms real-time survival into deliberate, high-reward tactical chess play while strictly honoring the Zero-GC 60 FPS performance envelope.

---

## Out of Scope

- Fairy Chess hybrid piece promotions (Empress, Cardinal, Amazon) — planned for subsequent feature phases.
- Permanent Metaprogression / ELO persistent saves — covered under Domain 1.
- Environmental board shrinking / crumbling tile hazards — covered under Domain 4.
- External audio file assets — all sound effects must use procedural Web Audio API / ZzFX.

---

## Assumptions & Open Questions

- **Assumptions**:
  - The existing `FixedPool` implementation in `src/pool.js` and entity tracking in `src/game.js` have sufficient capacity to track status timers (`pinTimer`, `mateStep`, `mateTimer`).
  - Detection of line-of-fire targets for Związanie (Pinning) can be executed efficiently in $O(N)$ with squared distance tests without frame drops.
  - Checkmate combo timers (4.0s window) provide enough room for players to complete combinations across both mouse and mobile touch controls.
- **Open Questions**: None. The mathematical formulas and balance values were audited and validated in `RFC-DOM-02`.

---

## User Stories

### P1: Związanie (Pinning & Skewer) ⭐ MVP

As a player,  
I want positioning enemies in a straight line behind each other to pin and immobilize the front enemy,  
so that I can strategically control enemy hordes and create devastating choke points.

**Acceptance Criteria**:

1. `TAC-01`: WHEN a player projectile strikes an enemy unit AND another active enemy or arena border is aligned behind it within a 250px cone, the system SHALL apply Pin state for 2.0s, locking movement to (0,0) and applying +35% damage vulnerability.
2. `TAC-02`: IF the pinned target is an elite unit or boss, the system SHALL NOT lock movement to (0,0), and SHALL instead apply a 40% movement speed reduction and +20% damage vulnerability for 2.0s.
3. `TAC-03`: WHEN a pinned enemy is struck by En Passant Dash, heavy charge, or is destroyed, the system SHALL trigger Pin Shatter dealing 150% attack damage to all enemies within a 140px radius.

### P2: Widełki Skoczka (Knight's Fork & Royal Fork)

As a player,  
I want critical strikes and special maneuvers to fork lightning sparks to multiple enemies,  
so that fighting while surrounded yields massive burst damage and extra resources.

**Acceptance Criteria**:

1. `TAC-04`: WHEN the player inflicts a critical strike or executes an ability slam/landing, the system SHALL launch homing fork sparks towards up to 2 nearest active enemies within 350px.
2. `TAC-05`: WHEN two fork sparks impact distinct targets within 0.20s of each other, the system SHALL stun both targets for 1.2s and spawn +1 bonus Gambit Token.
3. `TAC-06`: WHILE a boss is charging an attack telegraph, WHEN struck by a Royal Fork spark, the system SHALL interrupt the charging telegraph and stun the boss for 0.6s.

### P3: Szach i Mat w 3 Ruchach (Checkmate Stacking Combo)

As a player,  
I want attacking an enemy consecutively to build up Check and Checkmate marks,  
so that landing full tactical sequences triggers a screen-clearing detonation and rewards bonus clock time.

**Acceptance Criteria**:

1. `TAC-07`: WHEN an enemy is struck by an attack, the system SHALL apply Mark I ("SZACH!") slowing enemy telegraph charge rates by 30% for 4.0s.
2. `TAC-08`: WHILE an enemy has Mark I, WHEN struck by a consecutive attack within 4.0s, the system SHALL upgrade to Mark II ("SZACH PODWÓJNY!") reducing enemy movement speed by 50% and bypassing armor for 4.0s.
3. `TAC-09`: WHILE an enemy has Mark II, WHEN struck by a third consecutive attack within 4.0s, the system SHALL trigger Checkmate Detonation dealing 400% finisher damage + 25% max HP (capped at 250 HP on bosses), clearing enemy bullets within a 200px radius, and adding +2.0s to the Chess Clock.
4. `TAC-10`: The system SHALL execute all tactic state tracking, raycasts, and visual feedback using pre-allocated entity fields and faux-glow canvas rendering without heap allocations during gameplay.

---

## Requirement Traceability

| Requirement ID | Story | Phase | Status |
| --- | --- | --- | --- |
| TAC-01 | P1: Związanie (Pinning & Skewer) | Verification | passed |
| TAC-02 | P1: Związanie (Pinning & Skewer) | Verification | passed |
| TAC-03 | P1: Związanie (Pinning & Skewer) | Verification | passed |
| TAC-04 | P2: Widełki Skoczka (Knight's Fork) | Verification | passed |
| TAC-05 | P2: Widełki Skoczka (Knight's Fork) | Verification | passed |
| TAC-06 | P2: Widełki Skoczka (Knight's Fork) | Verification | passed |
| TAC-07 | P3: Szach i Mat w 3 Ruchach | Verification | passed |
| TAC-08 | P3: Szach i Mat w 3 Ruchach | Verification | passed |
| TAC-09 | P3: Szach i Mat w 3 Ruchach | Verification | passed |
| TAC-10 | P3: Szach i Mat w 3 Ruchach | Verification | passed |

**Coverage:** 10 total, 10 verified passed, 0 defects

