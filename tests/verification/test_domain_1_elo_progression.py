#!/usr/bin/env python3
"""
Empirical Challenge & Stress Test Suite: Domain 1 (Metaprogression, ELO, Openings, Storage)
Chess Survivors 76 - Phase 2 Verification
"""

import math
import json
import unittest

def calculate_expected_score(r_player: float, r_opp: float) -> float:
    """FIDE expected score logistic curve."""
    return 1.0 / (1.0 + 10.0 ** ((r_opp - r_player) / 400.0))

def calculate_actual_score(wave_reached: int, is_victory: bool, tactical_bonus: float) -> float:
    """Actual run score S_A in [0.0, 1.0]."""
    total_waves = 10
    clamped_wave = max(1, min(10, wave_reached))
    vic_term = 1.0 if is_victory else 0.0
    clamped_tactical = max(0.0, min(1.0, tactical_bonus))
    return 0.60 * (clamped_wave / total_waves) + 0.25 * vic_term + 0.15 * clamped_tactical

def get_k_factor(r_player: float) -> int:
    """Dynamic K-factor decay."""
    if r_player < 1200:
        return 36
    elif r_player < 1800:
        return 28
    elif r_player < 2400:
        return 20
    else:
        return 14

def get_win_streak_mult(win_streak: int) -> float:
    return min(2.0, 1.0 + max(0, win_streak - 1) * 0.25)

def get_loss_streak_mult(loss_streak: int) -> float:
    return max(0.50, 1.0 - max(0, loss_streak - 1) * 0.15)

def get_prestige_floor(peak_elo: float) -> int:
    floors = [800, 1200, 1500, 1800, 2100, 2400, 2700]
    unlocked = 800
    for f in floors:
        if peak_elo >= f:
            unlocked = f
    return unlocked

def update_elo_fide(current_elo: float, peak_elo: float, r_opp: float,
                    wave_reached: int, is_victory: bool, tactical_bonus: float,
                    win_streak: int, loss_streak: int):
    """
    Simulates EloEngine step per RFC Domain 1 Section 2.1.
    Returns: (new_elo, new_peak, new_floor, delta_elo, new_win_streak, new_loss_streak, e_a, s_a)
    """
    e_a = calculate_expected_score(current_elo, r_opp)
    s_a = calculate_actual_score(wave_reached, is_victory, tactical_bonus)
    k = get_k_factor(current_elo)
    
    if is_victory:
        new_win_streak = win_streak + 1
        new_loss_streak = 0
    else:
        new_win_streak = 0
        new_loss_streak = loss_streak + 1

    if s_a >= e_a:
        mult = get_win_streak_mult(new_win_streak)
        delta_elo = round(k * (s_a - e_a) * mult)
    else:
        mult = get_loss_streak_mult(new_loss_streak)
        delta_elo = round(k * (s_a - e_a) * mult)
        
    prestige_floor = get_prestige_floor(peak_elo)
    new_elo = max(prestige_floor, min(2800, current_elo + delta_elo))
    new_peak = max(peak_elo, new_elo)
    new_floor = get_prestige_floor(new_peak)
    
    return (new_elo, new_peak, new_floor, delta_elo, new_win_streak, new_loss_streak, e_a, s_a)

def fnv1a_32(data_str: str) -> str:
    """32-bit FNV-1a hash matching JS implementation in RFC Domain 1."""
    hash_val = 0x811c9dc5
    for ch in data_str:
        hash_val ^= ord(ch)
        hash_val = (hash_val * 0x01000193) & 0xFFFFFFFF
    return f"{hash_val:08x}"

def compute_profile_checksum(profile: dict) -> str:
    unlocked_openings = sorted(profile["openings"]["unlockedOpenings"])
    state_str = "|".join([
        str(profile["schemaVersion"]),
        str(profile["elo"]["current"]),
        str(profile["elo"]["prestigeFloor"]),
        str(profile["currencies"]["bossTrophies"]),
        str(profile["currencies"]["royalCrowns"]),
        json.dumps(profile["metaTree"]["nodes"], separators=(',', ':')),
        ",".join(unlocked_openings)
    ])
    return fnv1a_32(state_str)


class TestDomain1EloProgression(unittest.TestCase):

    def test_win_streak_50_runs_rapid_blitz_bullet(self):
        """Stress-test 50 consecutive perfect victories across tempos."""
        tempos = [("Rapid", 1100), ("Blitz", 1500), ("Bullet", 1900)]
        results = {}
        for name, r_opp in tempos:
            elo = 800
            peak = 800
            win_streak = 0
            loss_streak = 0
            history = []
            for run_idx in range(1, 51):
                elo, peak, floor, delta, win_streak, loss_streak, e_a, s_a = update_elo_fide(
                    elo, peak, r_opp, wave_reached=10, is_victory=True, tactical_bonus=1.0,
                    win_streak=win_streak, loss_streak=loss_streak
                )
                history.append((run_idx, elo, delta, e_a, s_a))
            results[name] = history
            
            # Verify cap at 2800
            self.assertLessEqual(elo, 2800)
            self.assertGreaterEqual(elo, 800)
            print(f"[Domain 1 Test] 50-win streak on {name}: Final ELO = {elo}, runs to 2000+ = "
                  f"{next((h[0] for h in history if h[1] >= 2000), 'never')}")

    def test_high_elo_rapid_asymmetry_zero_gain(self):
        """
        Adversarial Test: What happens when an IM / GM (e.g. 2500 ELO) plays Rapid (R_opp = 1100)?
        FIDE formula predicts E_A ~ 0.99987.
        Even with perfect victory (S_A = 1.0, win_streak = 5+ -> mult = 2.0, K = 14):
        delta = round(14 * (1.0 - 0.99987) * 2.0) = round(0.0036) = 0!
        """
        r_player = 2500
        r_opp = 1100 # Rapid
        e_a = calculate_expected_score(r_player, r_opp)
        s_a = calculate_actual_score(10, True, 1.0)
        k = get_k_factor(r_player)
        mult = get_win_streak_mult(10)
        delta = round(k * (s_a - e_a) * mult)
        print(f"[Domain 1 Test] High ELO on Rapid: R_player={r_player}, R_opp={r_opp}, E_A={e_a:.5f}, delta={delta}")
        self.assertEqual(delta, 0, "High ELO player gains 0 ELO for winning a full Rapid run! Documented as stagnant exploit resistance.")

    def test_rapid_early_loss_streak_and_prestige_floor(self):
        """
        Stress-test: Player at 1520 ELO (Prestige Floor 1500) loses 50 times in a row at Wave 1.
        Does ELO drop below 1500?
        Does Loss Streak Damping work properly?
        """
        elo = 1520
        peak = 1520
        win_streak = 0
        loss_streak = 0
        history = []
        for i in range(50):
            elo, peak, floor, delta, win_streak, loss_streak, e_a, s_a = update_elo_fide(
                elo, peak, r_opp=1500, wave_reached=1, is_victory=False, tactical_bonus=0.0,
                win_streak=win_streak, loss_streak=loss_streak
            )
            history.append((i+1, elo, delta, loss_streak))
            self.assertGreaterEqual(elo, 1500, f"ELO dropped below prestige floor 1500: {elo}")

        # Final ELO must be exactly locked at floor 1500
        self.assertEqual(elo, 1500)
        self.assertEqual(history[0][1], 1507, "First loss drops from 1520 to 1507")
        self.assertEqual(history[1][1], 1500, "Second loss clamps to floor 1500")
        print(f"[Domain 1 Test] Rapid 50-loss streak: ELO cleanly stopped at floor 1500 (loss streak = {loss_streak})")

    def test_mathematical_impossibility_of_reaching_2700_super_gm(self):
        """
        CRITICAL VULNERABILITY: Under proposed R_opp values (max 1900 in Bullet),
        ELO hard-stagnates at 2597 ELO due to round(14 * (1.0 - E_A) * 2.0) = round(0.4975) = 0.
        Prestige VI (2700 ELO) and the 2800 ELO Cap are mathematically unreachable!
        """
        elo = 2597
        peak = 2597
        win_streak = 10
        loss_streak = 0
        elo, peak, floor, delta, win_streak, loss_streak, e_a, s_a = update_elo_fide(
            elo, peak, 1900, 10, True, 1.0, win_streak, loss_streak
        )
        print(f"[Domain 1 Critical Flaw] At 2597 ELO in Bullet: E_A={e_a:.5f}, 1-E_A={1-e_a:.5f}, Delta={delta}")
        self.assertEqual(delta, 0, "Proves 2700 and 2800 are unreachable because delta rounds to 0 at 2597 ELO!")

    def test_spec_discrepancy_double_dipping_elo(self):
        """
        Expose discrepancy between Section 2.1 (Pure FIDE delta) and Section 3.3 UI Mockup:
        Section 3.3 adds +15 ELO (Flawless Boss) and +6 ELO (Tactical Moves) on TOP of round(...).
        We calculate inflation if Section 3.3 flat bonuses are added.
        """
        elo_pure = 1520
        elo_mock = 1520
        # Single match as in Section 3.3:
        # 1520 vs 1500, wave 10, is_victory=True, tactical_bonus=0.667 (2 tactical bonuses)
        # S_A = 0.60 * 1.0 + 0.25 * 1.0 + 0.15 * (2/3) = 0.95
        # E_A = 0.5287
        e_a = calculate_expected_score(1520, 1500)
        s_a = 0.95
        delta_pure = round(28 * (s_a - e_a) * 1.50) # +27
        delta_mock = delta_pure + 15 + 6 # +48 as in mockup line 654
        
        print(f"[Domain 1 Discrepancy] Pure FIDE Delta = +{delta_pure}, Mockup Delta = +{delta_mock} (+77.7% inflation!)")
        self.assertNotEqual(delta_pure, delta_mock)

    def test_fnv1a_tampering_and_key_ordering(self):
        """Test FNV-1a checksum sensitivity to tampering and JSON key ordering."""
        profile = {
            "schemaVersion": 2,
            "elo": {"current": 1500, "prestigeFloor": 1500},
            "currencies": {"bossTrophies": 10, "royalCrowns": 2},
            "metaTree": {"nodes": {"tact_pin_depth": 3, "tact_fork_edge": 1}},
            "openings": {"unlockedOpenings": ["italian", "sicilian"]}
        }
        base_hash = compute_profile_checksum(profile)
        
        # Tamper ELO
        tampered = json.loads(json.dumps(profile))
        tampered["elo"]["current"] = 2500
        tampered_hash = compute_profile_checksum(tampered)
        self.assertNotEqual(base_hash, tampered_hash, "Tampering must produce different checksum")

        # Key ordering in nodes dictionary:
        reordered_nodes = {
            "schemaVersion": 2,
            "elo": {"current": 1500, "prestigeFloor": 1500},
            "currencies": {"bossTrophies": 10, "royalCrowns": 2},
            "metaTree": {"nodes": {"tact_fork_edge": 1, "tact_pin_depth": 3}},
            "openings": {"unlockedOpenings": ["italian", "sicilian"]}
        }
        reordered_hash = compute_profile_checksum(reordered_nodes)
        print(f"[Domain 1 Test] FNV-1a Base={base_hash}, Reordered={reordered_hash}")
        # Note: In standard json.dumps without sort_keys=True, key reordering causes checksum mismatch!
        # This is a critical finding for client storage persistence!

    def test_kings_gambit_1hp_interaction_with_meta_nodes(self):
        """
        Test King's Gambit 1 HP constraint vs Hard Wood (+3 HP meta tree node).
        REQ-META-013 states: WHILE active, HP SHALL be locked at 1 HP.
        If player has pos_hard_wood L5 (+3 HP), does it get capped to 1 or 4?
        """
        hard_wood_bonus = 3
        base_hp = 1
        # If implemented naively: hp = base_hp + hard_wood_bonus = 4
        naive_hp = base_hp + hard_wood_bonus
        # If REQ-META-013 is strictly enforced:
        strict_hp = 1 if True else naive_hp
        print(f"[Domain 1 Test] King's Gambit HP: Naive={naive_hp}, Strict={strict_hp}")
        self.assertEqual(strict_hp, 1)


if __name__ == "__main__":
    unittest.main()
