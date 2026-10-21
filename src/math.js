// --- SZYBKA MATEMATYKA I DETEKCJA KOLIZJI ANTY-TUNELOWYCH (BOTTLENECK #4 FIX) ---

export function clamp(val, min, max) {
  return val < min ? min : val > max ? max : val;
}

export function lerp(a, b, t) {
  return a + (b - a) * t;
}

// Kwadrat odległości między dwoma punktami (brak kosztownego Math.sqrt)
export function distSq(x1, y1, x2, y2) {
  const dx = x2 - x1;
  const dy = y2 - y1;
  return dx * dx + dy * dy;
}

// Kwadrat odległości punktu (px, py) od odcinka (x1, y1) -> (x2, y2)
// Rozwiązuje wąskie gardło #4: eliminuje przenikanie (tunneling) szybkich pocisków i laserów
export function distToSegmentSq(px, py, x1, y1, x2, y2) {
  const l2 = distSq(x1, y1, x2, y2);
  if (l2 === 0) return distSq(px, py, x1, y1);
  let t = ((px - x1) * (x2 - x1) + (py - y1) * (y2 - y1)) / l2;
  t = t < 0 ? 0 : t > 1 ? 1 : t;
  const projX = x1 + t * (x2 - x1);
  const projY = y1 + t * (y2 - y1);
  return distSq(px, py, projX, projY);
}

// Ciągły test kolizji poruszającego się pocisku (od prevX,prevY do x,y) z okręgiem (cx,cy,r)
export function sweptCircleCollision(prevX, prevY, x, y, r1, cx, cy, r2) {
  const totalR = r1 + r2;
  return distToSegmentSq(cx, cy, prevX, prevY, x, y) <= totalR * totalR;
}

// Organiczny Screen Shake oparty na Traumie (specyfikacja 7.2)
// offset_x = Trauma^2 * MaxShake * sin(t * 45)
// offset_y = Trauma^2 * MaxShake * cos(t * 37)
export function computeTraumaShake(trauma, timeSec, maxShake = 18) {
  if (trauma <= 0.001) {
    return { x: 0, y: 0, angle: 0 };
  }
  const intensity = trauma * trauma;
  return {
    x: intensity * maxShake * Math.sin(timeSec * 45),
    y: intensity * maxShake * Math.cos(timeSec * 37),
    angle: intensity * 0.022 * Math.sin(timeSec * 31)
  };
}

// Najkrótsza różnica kątowa w przedziale [-PI, PI]
export function angleDiff(a, b) {
  let d = (b - a) % (Math.PI * 2);
  if (d > Math.PI) d -= Math.PI * 2;
  if (d < -Math.PI) d += Math.PI * 2;
  return d;
}

// Sprawdza, czy kąt strzału jest zbliżony do przekątnej 45° (cecha pasywna Gońca)
export function isNearDiagonalAngle(angle, toleranceRad = 0.28) {
  const diagonals = [
    Math.PI * 0.25,
    Math.PI * 0.75,
    -Math.PI * 0.25,
    -Math.PI * 0.75
  ];
  for (let i = 0; i < 4; i++) {
    if (Math.abs(angleDiff(angle, diagonals[i])) <= toleranceRad) {
      return true;
    }
  }
  return false;
}

// Punkt przecięcia promienia wychodzącego z (ox, oy) w kierunku (dx, dy) z bandą szachownicy
export function rayBoxExitPoint(ox, oy, dx, dy, bounds) {
  let tMin = 2000;
  if (Math.abs(dx) > 0.0001) {
    const tx = dx > 0 ? (bounds.right - ox) / dx : (bounds.left - ox) / dx;
    if (tx > 0 && tx < tMin) tMin = tx;
  }
  if (Math.abs(dy) > 0.0001) {
    const ty = dy > 0 ? (bounds.bottom - oy) / dy : (bounds.top - oy) / dy;
    if (ty > 0 && ty < tMin) tMin = ty;
  }
  return {
    x: ox + dx * tMin,
    y: oy + dy * tMin
  };
}

