# Chess Fusions and Evolutions Spec

**Feature**: `chess-fusions-evolutions`  
**Status**: Ready for Review  
**Date**: 2026-10-25  

---

## Problem Statement

W grze *Chess Survivors 76* wybór klasy figur kończy się obecnie na prostych figurach klasycznych (Pionek, Skoczek, Goniec, Wieża, Hetman). Po przetrwaniu kilku fal partii gracz gromadzi nadmiar Żetonów Gambitu, a rozgrywka staje się monotonna z uwagi na brak zaawansowanych ewolucji i unikalnych archetypów. Brakuje legendarnej gałęzi szachów baśniowych (*Fairy Chess*), w której gracz może dokonać fuzji dwóch różnych figur w hybrydę o potężnych, synergicznych zdolnościach bojowych.

Niniejsza specyfikacja definiuje 3 legendarne figury fuzji (Cesarka = Wieża+Skoczek, Kardynał = Goniec+Skoczek, Amazonka = Hetman+Skoczek), ich unikalne ataki i zdolności ruchowe, mechanizm transformacji klasy w Sklepie Gambitu oraz proceduralne renderowanie sylwetek w Canvas 2D w rygorze Zero-GC i Single-File.

---

## Out of Scope

- Zewnętrzne pliki grafik PNG/SVG (obowiązuje czysty Canvas 2D proceduralny render bez `ctx.shadowBlur`).
- Dynamiczne modyfikatory zapadających się pól szachownicy (należą do Działu IV: `chess-board-dynamics`).
- Zapisywanie rankingów ELO i szachowych debiutów w metaprogresji (należą do Działu I: `chess-metaprogression`).

---

## Assumptions & Open Questions

| Question / Assumption | Chosen default | Rationale |
| --- | --- | --- |
| W jaki sposób gracz odblokowuje fuzję w trakcie partii? | Zakup w Sklepie Gambitu po spełnieniu wymogów klasy bazowej i kosztu w żetonach | Zachowuje naturalną pętlę roguelite pomiędzy falami bez przerywania walki |
| Czy fuzja jest odwracalna w trakcie jednego biegu? | Nie, fuzja jest trwałą transformacją do końca danej sesji | Zapewnia poczucie osiągnięcia szczytowego archetypu (Power Fantasy) |
| Czy transformacja klasy generuje alokacje pamięci w pętli gry? | Nie, wykorzystywany jest istniejący obiekt `this.player` z podmianą właściwości | Bezwzględny wymóg Zero-GC dla 60/120 FPS |
| Jak zachowuje się Władza Absolutna (Absolute Domain) Amazonki? | Spowalnia wrogów o 85%, zamraża wrogie pociski na 4.0s i pozwala je odbijać dashem z clampem cooldownu 0.3s | Zapobiega nieograniczonej nietykalności, realizując wytyczne balansu z RFC Domain 2 |

**Open questions**: none (wszystkie pytania projektowe rozstrzygnięte w RFC Domain 2).

---

## User Stories

### P1: Fairy Chess Hybrids — Cesarka i Kardynał ⭐ MVP

As a player,  
I want to fuse my advanced chess pieces into legendary Fairy Chess hybrids (Empress and Cardinal),  
so that I can combine straight-line and diagonal bombardment with Knight leap agility.

**Acceptance Criteria**:

1. `FUS-01`: WHEN a player meets the fusion recipe criteria in Gambit Shop, THE Fusion System SHALL transform the player class into the selected hybrid piece (Empress, Cardinal, or Amazon), updating base stats (HP, speed, fireRate, dash cooldown) and sprite model without heap allocations.
2. `FUS-02`: WHILE controlling the Empress, THE Combat System SHALL fire siege cannonades piercing up to 2 targets and exploding on the 3rd target or arena border into 4 diagonal horseshoe shrapnels dealing 65% damage and applying Pin state.
3. `FUS-03`: WHEN the Empress executes Siege Leap (Space or RMB), THE Combat System SHALL launch the player into an invulnerable arc for 0.7s, detonating a 180px AoE earthquake dealing 350% damage, stunning enemies for 1.8s, and wiping enemy projectiles in the impact zone.
4. `FUS-04`: WHILE controlling the Empress, THE Combat System SHALL maintain a 180-degree frontal bulwark shield absorbing up to 4 enemy hits without player HP loss, regenerating 1 charge every 12.0s.
5. `FUS-05`: WHILE controlling the Cardinal, THE Combat System SHALL emit continuous diagonal zig-zag lasers that step 90 degrees every 120px in Knight-step vector offsets and bounce up to 2 times from arena edges with +30% damage per bounce.
6. `FUS-06`: WHEN the Cardinal triggers Translocation Dash, THE Combat System SHALL instantly teleport the player up to 320px towards the pointer and trigger simultaneous X-Cross laser bursts clearing diagonal lines up to 200px at origin and destination.
7. `FUS-07`: WHILE controlling the Cardinal, THE Combat System SHALL maintain Cathedral Aura (130px radius) slowing enemies by 20%, granting 60% Pinning chance on any hit, and parrying bullets into +0.2s Chess Clock increments (capped at 5/s).

### P2: Najwyższy Archetyp — Amazonka (Królowa Chaosu)

As an expert player,  
I want to unlock the Amazon hybrid by fusing Queen and Knight mastery,  
so that I can control time, unleash omnidirectional chaos, and execute automatic checkmates.

**Acceptance Criteria**:

1. `FUS-08`: WHILE controlling the Amazon, THE Combat System SHALL fire an 8-directional royal barrage alternating every second volley with 4 homing Chaos Horseshoes possessing 100% armor bypass, 3x knockback, and triggering Knight's Fork sparks.
2. `FUS-09`: WHEN the Amazon activates Absolute Domain, THE Combat System SHALL freeze time for 4.0s: slowing enemies by 85%, freezing enemy projectiles in place, allowing player dashes (with cooldown clamped to a minimum of 0.30s) to reflect frozen projectiles as friendly shots with 3x damage, and pausing the Chess Clock.
3. `FUS-10`: WHILE controlling the Amazon, THE Combat System SHALL trigger Imperial Checkmate, automatically executing Checkmate Detonation on the nearest champion, elite, or boss every 5th enemy kill.

### P3: Zero-GC Procedural Fairy Sprites & Visuals

As a player,  
I want distinct procedural visuals and HUD badges for each fusion class,  
so that my character looks majestic and readable without performance drops.

**Acceptance Criteria**:

1. `FUS-11`: THE Rendering System SHALL render procedural Fairy Chess pieces (Empress = fortress battlement with horse mane, Cardinal = bishop mitre with horseshoe crest, Amazon = winged royal crown) using Canvas 2D paths and Faux-Glow without `ctx.shadowBlur`.

---

## Requirement Traceability

| Requirement ID | Story | Phase | Status |
| --- | --- | --- | --- |
| FUS-01 | P1: Fairy Chess Hybrids | Design | pending |
| FUS-02 | P1: Fairy Chess Hybrids | Design | pending |
| FUS-03 | P1: Fairy Chess Hybrids | Design | pending |
| FUS-04 | P1: Fairy Chess Hybrids | Design | pending |
| FUS-05 | P1: Fairy Chess Hybrids | Design | pending |
| FUS-06 | P1: Fairy Chess Hybrids | Design | pending |
| FUS-07 | P1: Fairy Chess Hybrids | Design | pending |
| FUS-08 | P2: Najwyższy Archetyp | Design | pending |
| FUS-09 | P2: Najwyższy Archetyp | Design | pending |
| FUS-10 | P2: Najwyższy Archetyp | Design | pending |
| FUS-11 | P3: Procedural Fairy Sprites | Design | pending |

**Coverage:** 11 total, 11 mapped to design, 0 unmapped
