#!/usr/bin/env python3
"""
Empirical Challenge & Stress Test Suite: Domain 3 (Bosses, Laser Math, Lorentz Trajectories, State Machines)
Chess Survivors 76 - Phase 2 Verification
"""

import math
import unittest

def lorentz_acceleration_raw(x: float, y: float, vx: float, vy: float,
                            omega: float = 1.85, gm: float = 28000.0, eps: float = 25.0) -> tuple[float, float]:
    """
    Computes acceleration per RFC Domain 3 Section 2.4.1:
    a_lorentz = omega * (-vy, vx) - (GM / (r^2 + eps^2)) * (r_vec / r)
    """
    r = math.hypot(x, y)
    if r == 0:
        # Division by zero occurs if r_vec / r is computed naively
        r_unit_x = x / r if r > 0 else float('nan')
        r_unit_y = y / r if r > 0 else float('nan')
    else:
        r_unit_x = x / r
        r_unit_y = y / r

    grav_factor = -gm / (r * r + eps * eps)
    ax = omega * (-vy) + grav_factor * r_unit_x
    ay = omega * vx + grav_factor * r_unit_y
    return ax, ay

def lorentz_acceleration_plummer(x: float, y: float, vx: float, vy: float,
                               omega: float = 1.85, gm: float = 28000.0, eps: float = 25.0) -> tuple[float, float]:
    """Standard singularity-free Plummer sphere acceleration."""
    denom = (x * x + y * y + eps * eps) ** 1.5
    ax = omega * (-vy) - (gm * x) / denom
    ay = omega * vx - (gm * y) / denom
    return ax, ay

def swept_segment_circle_collision(x1: float, y1: float, x2: float, y2: float,
                                   px: float, py: float, r_beam: float, r_player: float) -> tuple[bool, float]:
    """
    Computes swept-segment collision per RFC Domain 3 Section 4.1.
    Returns: (is_colliding, squared_distance)
    """
    dx = x2 - x1
    dy = y2 - y1
    l2 = dx * dx + dy * dy
    if l2 < 0.0001:
        # Degenerate segment: point collision
        dist2 = (px - x1) ** 2 + (py - y1) ** 2
        max_dist = r_player + r_beam
        return (dist2 <= max_dist * max_dist, dist2)

    t = ((px - x1) * dx + (py - y1) * dy) / l2
    t = max(0.0, min(1.0, t))
    qx = x1 + t * dx
    qy = y1 + t * dy
    dist2 = (px - qx) ** 2 + (py - qy) ** 2
    max_dist = r_player + r_beam
    return (dist2 <= max_dist * max_dist, dist2)

def ray_box_exit_rfc(x0: float, y0: float, dx: float, dy: float,
                     xmin: float, xmax: float, ymin: float, ymax: float) -> tuple[float, float, float]:
    """
    Computes ray-box exit per RFC Domain 3 Section 4.1:
    tx1 = (xmin - x0)/dx, tx2 = (xmax - x0)/dx
    ty1 = (ymin - y0)/dy, ty2 = (ymax - y0)/dy
    texit = min(max(tx1, tx2), max(ty1, ty2))
    xhit = x0 + dx * texit, yhit = y0 + dy * texit
    """
    try:
        tx1 = (xmin - x0) / dx if dx != 0 else (float('inf') if (xmin - x0) > 0 else (float('-inf') if (xmin - x0) < 0 else float('nan')))
        tx2 = (xmax - x0) / dx if dx != 0 else (float('inf') if (xmax - x0) > 0 else (float('-inf') if (xmax - x0) < 0 else float('nan')))
    except ZeroDivisionError:
        tx1 = float('nan')
        tx2 = float('nan')

    try:
        ty1 = (ymin - y0) / dy if dy != 0 else (float('inf') if (ymin - y0) > 0 else (float('-inf') if (ymin - y0) < 0 else float('nan')))
        ty2 = (ymax - y0) / dy if dy != 0 else (float('inf') if (ymax - y0) > 0 else (float('-inf') if (ymax - y0) < 0 else float('nan')))
    except ZeroDivisionError:
        ty1 = float('nan')
        ty2 = float('nan')

    max_x = max(tx1, tx2)
    max_y = max(ty1, ty2)
    t_exit = min(max_x, max_y)
    x_hit = x0 + dx * t_exit
    y_hit = y0 + dy * t_exit
    return t_exit, x_hit, y_hit


class TestDomain3BossesAndPatterns(unittest.TestCase):

    def test_lorentz_singularity_at_origin_nan_generation(self):
        """
        Adversarial Test: Check if RFC Lorentz formula produces NaN when r = 0 or near 0.
        RFC formula has r in the denominator: (GM / (r^2 + eps^2)) * (r_vec / r)
        At r = 0, (x/r, y/r) = (0/0, 0/0) -> NaN!
        """
        ax, ay = lorentz_acceleration_raw(0.0, 0.0, 100.0, 50.0)
        print(f"[Domain 3 Test] Lorentz at origin (0, 0): ax={ax}, ay={ay}")
        self.assertTrue(math.isnan(ax) or math.isnan(ay), "RFC formula produces NaN at r = 0 because of r_vec / r unit vector division!")

    def test_lorentz_simulation_60fps_stability(self):
        """
        Simulate a bullet starting at (100, 0) with initial velocity (0, 150) orbiting for 3 seconds.
        Check if bullet escapes bounds, collapses to NaN, or gets properly annihilated at r <= 12px.
        """
        dt = 1.0 / 60.0
        x, y = 100.0, 0.0
        vx, vy = 0.0, 150.0
        annihilated = False
        trajectory = []

        for step in range(180): # 3.0 seconds at 60 FPS
            r = math.hypot(x, y)
            if r <= 12.0:
                annihilated = True
                print(f"[Domain 3 Test] Lorentz Vortex: Bullet successfully annihilated at r={r:.2f}px on step {step}")
                break

            # Calculate acceleration using Plummer fix to compare stability
            ax, ay = lorentz_acceleration_plummer(x, y, vx, vy)
            vx += ax * dt
            vy += ay * dt
            x += vx * dt
            y += vy * dt
            trajectory.append((x, y, vx, vy, r))

        self.assertFalse(any(math.isnan(p[0]) or math.isnan(p[1]) for p in trajectory))
        print(f"[Domain 3 Test] Final bullet position after orbit: x={x:.2f}, y={y:.2f}, r={math.hypot(x, y):.2f}")

    def test_ray_box_exit_vertical_ray_and_boundary_nan(self):
        """
        Adversarial Test: Inquisitor Bishop shoots a vertical ray (dx = 0, dy = 1) from the arena border (x0 = xmin).
        RFC formula computes:
        tx1 = (xmin - x0) / dx = (xmin - xmin) / 0 = 0 / 0 = NaN!
        Then t_exit = NaN, and x_hit, y_hit = NaN!
        """
        xmin, xmax = 0.0, 512.0
        ymin, ymax = 0.0, 512.0
        
        # Test 1: Vertical shot from center (x0 = 256, y0 = 256, dx = 0, dy = 1)
        t_exit, x_hit, y_hit = ray_box_exit_rfc(256.0, 256.0, 0.0, 1.0, xmin, xmax, ymin, ymax)
        print(f"[Domain 3 Test] Vertical Ray from center: t_exit={t_exit}, x_hit={x_hit}, y_hit={y_hit}")
        
        # Test 2: Border vertical shot (x0 = 0.0, y0 = 100.0, dx = 0.0, dy = 1.0)
        t_exit_edge, x_hit_edge, y_hit_edge = ray_box_exit_rfc(0.0, 100.0, 0.0, 1.0, xmin, xmax, ymin, ymax)
        print(f"[Domain 3 Test] Border Vertical Ray (x0=xmin): t_exit={t_exit_edge}, x_hit={x_hit_edge}, y_hit={y_hit_edge}")
        self.assertTrue(math.isnan(x_hit_edge) or math.isnan(y_hit_edge),
                        "Ray-Box formula produces NaN when ray originates on bounding box edge with axis-aligned direction!")

    def test_swept_segment_laser_rotating_tunneling_risk(self):
        """
        Test Apex Queen 360-degree rotating laser.
        Rotational speed omega = 1.45 rad/s.
        Beam length = 450 px, beam width = 16 px (r_beam = 8 px).
        Player radius = 10 px. Combined collision radius = 18 px.
        At 60 FPS: dt = 1/60 = 0.0167s. Angle delta = 1.45 * 0.0167 = 0.0242 rad (~1.38 deg).
        Arc length swept at r = 400 px: s = 400 * 0.0242 = 9.67 px.
        Since 9.67 px < 18 px, discrete per-frame testing catches the player at 60 FPS.
        HOWEVER, what if FPS drops to 20 FPS (dt = 0.050s)?
        Arc length swept at r = 400 px: s = 400 * 1.45 * 0.050 = 29.0 px!
        Since 29.0 px > 18 px (combined radius), the laser TUNNELS through the player between frames!
        """
        r_player = 10.0
        r_beam = 8.0
        combined_r = r_player + r_beam # 18 px

        # 60 FPS
        dt_60 = 1.0 / 60.0
        arc_60 = 400.0 * 1.45 * dt_60
        # 20 FPS (mobile frame drop / throttle)
        dt_20 = 1.0 / 20.0
        arc_20 = 400.0 * 1.45 * dt_20

        print(f"[Domain 3 Test] Apex Queen Laser Sweep at r=400px: 60 FPS arc = {arc_60:.2f}px, 20 FPS arc = {arc_20:.2f}px (Hitbox={combined_r}px)")
        self.assertLess(arc_60, combined_r, "At 60 FPS, beam cannot tunnel")
        self.assertGreater(arc_20, combined_r, "At 20 FPS, beam tunnels past player without detection!")

    def test_black_king_p2_cannibalism_state_machine_softlock_risk(self):
        """
        Simulate Black King Phase 2 state transitions:
        When all 4 sacrificial pawns are killed by player before reaching King:
        Does the state machine specify timeout / reset condition?
        """
        class MockBlackKingP2:
            def __init__(self):
                self.hp = 100
                self.state = "RUSH_COMBO"
                self.rush_count = 0
                self.pawn_timer = 14.0
                self.pawns = []
                self.invuln_timer = 0.0
                self.feasted = False

            def update(self, dt, player_kills_all_pawns=False):
                if self.invuln_timer > 0:
                    self.invuln_timer -= dt

                if self.state == "RUSH_COMBO":
                    self.rush_count += 1
                    if self.rush_count >= 4:
                        self.rush_count = 0
                        self.state = "SUMMON_MINIONS"
                        self.pawns = [{"dist": 200.0} for _ in range(4)]
                elif self.state == "SUMMON_MINIONS":
                    if player_kills_all_pawns:
                        self.pawns.clear() # Player eliminated all pawns!

                    if len(self.pawns) == 0:
                        # Ambiguity in spec: If no explicit handler, King stays in SUMMON_MINIONS indefinitely
                        # Correct implementation must transition back to RUSH_COMBO
                        self.state = "RUSH_COMBO"
                    else:
                        for p in self.pawns:
                            p["dist"] -= 65.0 * dt
                            if p["dist"] <= 25.0:
                                self.hp = min(100, self.hp + 8)
                                self.invuln_timer = 1.5
                                self.feasted = True
                                self.pawns.remove(p)
                                self.state = "RUSH_COMBO"
                                break

        king = MockBlackKingP2()
        # Step through until summon
        for _ in range(5):
            king.update(0.1)
        self.assertEqual(king.state, "SUMMON_MINIONS")
        
        # Player wipes all pawns immediately
        king.update(0.1, player_kills_all_pawns=True)
        print(f"[Domain 3 Test] Black King after pawns exterminated: state={king.state}, HP={king.hp}, feasted={king.feasted}")
        self.assertEqual(king.state, "RUSH_COMBO", "King must gracefully recover to RUSH_COMBO when all pawns are eliminated")
        self.assertFalse(king.feasted, "King must not heal if all pawns were killed")


if __name__ == "__main__":
    unittest.main()
