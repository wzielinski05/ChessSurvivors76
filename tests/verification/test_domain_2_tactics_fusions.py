#!/usr/bin/env python3
"""
Empirical Challenge & Stress Test Suite: Domain 2 (Tactics, Fusions, Synergies, Pool Sizing)
Chess Survivors 76 - Phase 2 Verification
"""

import math
import unittest

def calculate_hyperbolic_cdr(bonus_list: list[float]) -> float:
    """Hyperbolic cooldown reduction: 1 - 1 / (1 + sum(bonuses))."""
    sum_bonus = sum(bonus_list)
    return 1.0 - (1.0 / (1.0 + sum_bonus))

def simulate_dash_invulnerability(base_cd: float, real_cdr: float, dash_duration: float, simulation_time: float):
    """
    Simulates dash uptime.
    Returns: (invulnerability_ratio, dashes_executed)
    """
    effective_cd = max(0.0, base_cd * (1.0 - real_cdr))
    cycle_time = dash_duration + effective_cd
    if cycle_time <= 0:
        return 1.0, math.inf
    dashes = simulation_time / cycle_time
    total_invuln_time = min(simulation_time, dashes * dash_duration)
    return total_invuln_time / simulation_time, dashes


class TestDomain2TacticsFusions(unittest.TestCase):

    def test_hyperbolic_cdr_never_reaches_100_percent_finite(self):
        """
        Verify that hyperbolic CDR strictly prevents 100% CDR for any finite stack.
        Even with 8 stacked perks (+25% each) + Meta Tree (32%) + Synergy (25%) = +257% nominal.
        """
        perks = [0.25] * 8
        meta_tree = 0.32
        synergy = 0.25
        all_bonuses = perks + [meta_tree, synergy]
        nominal_sum = sum(all_bonuses)
        real_cdr = calculate_hyperbolic_cdr(all_bonuses)

        print(f"[Domain 2 Test] Nominal CDR = +{nominal_sum*100:.1f}%, Real Hyperbolic CDR = {real_cdr*100:.2f}%")
        self.assertLess(real_cdr, 1.0)
        self.assertAlmostEqual(real_cdr, 1.0 - 1.0 / (1.0 + 2.57), places=4)
        self.assertLessEqual(real_cdr, 0.75, "Under 257% nominal CDR, real CDR is ~72.0%, never exceeding 75%")

        # Test extreme stacking of 100 perks:
        insane_bonuses = [0.25] * 100 # +2500%
        insane_cdr = calculate_hyperbolic_cdr(insane_bonuses)
        print(f"[Domain 2 Test] 100 Stacked Perks (+2500% nominal): Real CDR = {insane_cdr*100:.3f}%")
        self.assertLess(insane_cdr, 1.0)

    def test_amazon_absolute_domain_bypasses_cdr_infinite_invulnerability(self):
        """
        Adversarial Finding: Spec states:
        'Dash Amazonki traci czas odnowienia (zerowy cooldown, nieograniczone zrywy).'
        This is an explicit bypass of the hyperbolic formula!
        If cooldown = 0, player has 100% invulnerability for the full 4.0s duration!
        """
        # Knight/Amazon Dash duration = 0.35s (or En Passant dash = 0.22s)
        # If effective_cd = 0:
        invuln_ratio, dashes = simulate_dash_invulnerability(base_cd=0.0, real_cdr=0.0, dash_duration=0.25, simulation_time=4.0)
        print(f"[Domain 2 Finding] Amazon Absolute Domain invulnerability ratio: {invuln_ratio*100:.1f}%, dashes={dashes}")
        self.assertEqual(invuln_ratio, 1.0, "Absolute Domain enables 100% continuous invulnerability frames!")

    def test_clock_inflation_cascade_amazon_checkmate(self):
        """
        Stress-test: Amazon 'Imperial Checkmate' triggers automatically every 5 kills.
        Each Checkmate Detonation adds +3.0s to the Chess Clock.
        If a player slays 35 swarm pawns during a 4-second Absolute Domain:
        Kills = 35 -> 7 Detonations -> 7 * +3.0s = +21.0s added!
        Clock cap in spec is 40.0s (Section 2.3.4 Hard Caps).
        """
        kills = 35
        auto_detonations = kills // 5
        clock_gained = auto_detonations * 3.0
        time_elapsed = 4.0
        net_clock = clock_gained - time_elapsed

        # Hitstop stacking check:
        # Each detonation triggers 60ms hitstop
        total_hitstop_ms = auto_detonations * 60
        print(f"[Domain 2 Test] Clock Cascade: Kills={kills}, Detonations={auto_detonations}, "
              f"Clock Gained=+{clock_gained:.1f}s, Net Clock=+{net_clock:.1f}s, Hitstop={total_hitstop_ms}ms")
        self.assertGreater(net_clock, 15.0, "Clock accumulates 5x faster than real-time consumption!")
        self.assertGreaterEqual(total_hitstop_ms, 420, "Cumulative hitstop exceeds 420ms (nearly half a second)")

    def test_pool_size_inconsistency_domain2_vs_domain3(self):
        """
        Discrepancy test:
        Domain 2 specifies bullets: FixedPool(1536) in Section 4.2 line 851.
        Domain 3 specifies bullets: 1024 in Section 4.2 line 663 and Section 5 REQ line 788.
        This test documents the 50% mismatch between the two RFCs!
        """
        domain_2_bullets = 1536
        domain_3_bullets = 1024
        print(f"[Domain 2 vs 3 Discrepancy] Bullet Pool: Domain 2 = {domain_2_bullets}, Domain 3 = {domain_3_bullets}")
        self.assertNotEqual(domain_2_bullets, domain_3_bullets, "Pool size contract violated between Domain 2 and Domain 3")

    def test_theoretical_maximum_bullet_burst_saturation(self):
        """
        Empirical simulation of bullet pool occupancy during peak endgame burst:
        Scenario: Amazon (8-way + 4 chaos horseshoes = 12 bullets/shot) at cap (14 shots/s).
        Fork Shards: 2 homing shards per critical hit. At 50% crit, 14 * 12 * 0.5 * 2 = 168 fork shards/s.
        Player active bullets = (168 primary + 168 shards) * 2.0s lifetime = 672 active player bullets.
        Boss: Arbiter Phase 2 Lorentz Vortex = 160 active bullets.
        Boss Salvo: 16 bullets/s * 3.0s = 48 bullets.
        Elite enemies: Twin Rooks (16) + Shadow Knights (12) + 20 minions firing (60) = 88 bullets.
        Amazon Absolute Domain reflection burst: dashes through 60 frozen bullets -> converts into 60 player bullets.
        Total active bullets = 672 + 160 + 48 + 88 + 60 = 1028 bullets!
        Compare against Domain 3 pool (1024) -> OVERFLOW (1028 > 1024)!
        """
        player_primary_rate = 14 * 12 # 168 bullets/s
        fork_shard_rate = 14 * 12 * 0.50 * 2 # 168 shards/s
        player_active = (player_primary_rate + fork_shard_rate) * 2.0 # 672
        arbiter_vortex = 160
        arbiter_salvo = 48
        elite_and_minions = 88
        reflected_burst = 60

        total_simulated_bullets = player_active + arbiter_vortex + arbiter_salvo + elite_and_minions + reflected_burst
        print(f"[Domain 2 Test] Peak Bullet Saturation: {total_simulated_bullets} bullets vs Pool 1024 (Dom 3) & 1536 (Dom 2)")
        
        # Verify overflow against Domain 3
        self.assertGreater(total_simulated_bullets, 1024, "Peak combat exceeds Domain 3 pool of 1024 bullets!")
        self.assertLessEqual(total_simulated_bullets, 1536, "Domain 2 pool of 1536 barely accommodates peak burst")

    def test_particle_pool_burst_saturation(self):
        """
        Stress-test particle pool (1024) under Amazon burst fire.
        Each bullet impact spawns 4 wood splinters / sparks.
        At 336 bullet impacts/sec, 336 * 4 = 1344 particles/sec.
        With life = 0.5s: 1344 * 0.5 = 672 active particles.
        Add Finger-Slam shockwave (42 particles) + King Crown Detonation (48 particles) + Acid tiles (200 particles)
        Total = 672 + 42 + 48 + 200 = 962 particles.
        Safety headroom is only 62 particles (6% margin of error)!
        """
        impact_rate = 336 # impacts/s
        particles_per_impact = 4
        active_impact_particles = (impact_rate * particles_per_impact) * 0.5
        boss_events = 42 + 48 + 200
        total_particles = active_impact_particles + boss_events
        print(f"[Domain 2 Test] Peak Particle Saturation: {total_particles} particles vs Pool 1024 (headroom = {1024 - total_particles})")
        self.assertLess(total_particles, 1024)
        self.assertGreater(total_particles, 900, "Safety margin under 10% during peak combat")


if __name__ == "__main__":
    unittest.main()
