// --- PROCEDURALNY RENDERER FIGUR SZACHOWYCH & FAUX-GLOW (BOTTLENECK #2 FIX) ---
// Zero plików .png oraz całkowity zakaz używania kosztownego ctx.shadowBlur!
// Poświata w stylu Cyber-Grid realizowana jest przez wielowarstwowy Faux-Glow.

export function drawFauxGlow(ctx, x, y, radius, color, alpha = 0.22) {
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.arc(x, y, radius * 1.9, 0, Math.PI * 2);
  ctx.fill();
  ctx.globalAlpha = alpha * 1.6;
  ctx.beginPath();
  ctx.arc(x, y, radius * 1.35, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

// Rysowanie sylwetki Pionka Szachowego (Gracz oraz Czarny Pionek)
export function drawPawnPiece(ctx, x, y, scaleX, scaleY, fill, outline, hitFlash, glowColor = null) {
  ctx.save();
  ctx.translate(x, y);

  // Cień rzucany na szachownicę
  ctx.fillStyle = 'rgba(0, 0, 0, 0.36)';
  ctx.beginPath();
  ctx.ellipse(0, 10, 12 * scaleX, 5.5, 0, 0, Math.PI * 2);
  ctx.fill();

  if (glowColor) {
    drawFauxGlow(ctx, 0, -2, 13, glowColor, 0.18);
  }

  ctx.scale(scaleX, scaleY);

  const mainFill = hitFlash > 0 ? '#ffffff' : fill;
  const mainStroke = hitFlash > 0 ? '#ffffff' : outline;

  ctx.fillStyle = mainFill;
  ctx.strokeStyle = mainStroke;
  ctx.lineWidth = 2.4;
  ctx.lineJoin = 'round';

  // 1. Szeroka podstawa (pedestał figury)
  ctx.beginPath();
  ctx.ellipse(0, 8, 11, 4.5, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();

  // 2. Trzon pionka (zwężający się ku górze)
  ctx.beginPath();
  ctx.moveTo(-8.5, 7);
  ctx.quadraticCurveTo(-4.5, 0, -4, -6);
  ctx.lineTo(4, -6);
  ctx.quadraticCurveTo(4.5, 0, 8.5, 7);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  // 3. Kołnierz pod główką
  ctx.beginPath();
  ctx.ellipse(0, -6.5, 6, 2.2, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();

  // 4. Kulista główka pionka
  ctx.beginPath();
  ctx.arc(0, -13, 6.2, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();

  // Subtelny blik światła na główce i trzonie
  if (hitFlash <= 0) {
    ctx.fillStyle = 'rgba(255, 255, 255, 0.28)';
    ctx.beginPath();
    ctx.arc(-2.2, -14.8, 2.1, 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.restore();
}

// Rysowanie sylwetki Skoczka Szachowego (Czarny Skoczek Chaosu z obsługą wysokości skoku zHeight)
export function drawKnightPiece(ctx, x, y, zHeight, scaleX, scaleY, fill, outline, hitFlash, glowColor = null) {
  ctx.save();

  // Cień na ziemi (kurczy się przy wysokim skoku, ale pozostaje widoczny w miejscu figury)
  const shadowScale = Math.max(0.45, 1 - zHeight / 140);
  ctx.fillStyle = 'rgba(0, 0, 0, 0.42)';
  ctx.beginPath();
  ctx.ellipse(x, y + 11, 15 * shadowScale, 6.5 * shadowScale, 0, 0, Math.PI * 2);
  ctx.fill();

  // Przesunięcie ciała o wysokość skoku zHeight
  ctx.translate(x, y - zHeight);

  if (glowColor) {
    drawFauxGlow(ctx, 0, -4, 16, glowColor, 0.2);
  }

  ctx.scale(scaleX, scaleY);

  const mainFill = hitFlash > 0 ? '#ffffff' : fill;
  const mainStroke = hitFlash > 0 ? '#ffffff' : outline;

  ctx.fillStyle = mainFill;
  ctx.strokeStyle = mainStroke;
  ctx.lineWidth = 2.5;
  ctx.lineJoin = 'round';

  // 1. Podstawa skoczka
  ctx.beginPath();
  ctx.ellipse(0, 9, 13, 5, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();

  // 2. Rzeźbiony profil głowy konia szachowego
  ctx.beginPath();
  ctx.moveTo(-10, 8);
  ctx.lineTo(-8, -4);
  ctx.quadraticCurveTo(-9, -14, -2, -20); // Grzywa i kark
  ctx.lineTo(1, -24); // Ucho
  ctx.lineTo(3.5, -19);
  ctx.lineTo(11, -13); // Pysk konia
  ctx.lineTo(9, -8);
  ctx.lineTo(3, -9); // Wcięcie szczęki
  ctx.quadraticCurveTo(6, -1, 10, 8);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  // 3. Świecące oko Skoczka Chaosu
  ctx.fillStyle = hitFlash > 0 ? '#000000' : outline;
  ctx.beginPath();
  ctx.arc(2.5, -15, 1.8, 0, Math.PI * 2);
  ctx.fill();

  ctx.restore();
}

// Rysowanie sylwetki Gońca Szachowego (Bishop — Snajper Przekątnych)
export function drawBishopPiece(ctx, x, y, scaleX, scaleY, fill, outline, hitFlash, glowColor = null) {
  ctx.save();
  ctx.translate(x, y);

  ctx.fillStyle = 'rgba(0, 0, 0, 0.38)';
  ctx.beginPath();
  ctx.ellipse(0, 11, 13 * scaleX, 5.8, 0, 0, Math.PI * 2);
  ctx.fill();

  if (glowColor) {
    drawFauxGlow(ctx, 0, -4, 15, glowColor, 0.2);
  }

  ctx.scale(scaleX, scaleY);

  const mainFill = hitFlash > 0 ? '#ffffff' : fill;
  const mainStroke = hitFlash > 0 ? '#ffffff' : outline;

  ctx.fillStyle = mainFill;
  ctx.strokeStyle = mainStroke;
  ctx.lineWidth = 2.4;
  ctx.lineJoin = 'round';

  // 1. Podstawa
  ctx.beginPath();
  ctx.ellipse(0, 9, 12, 4.8, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();

  // 2. Smukły korpus Gońca
  ctx.beginPath();
  ctx.moveTo(-9, 8);
  ctx.quadraticCurveTo(-5, 0, -4.5, -7);
  ctx.lineTo(4.5, -7);
  ctx.quadraticCurveTo(5, 0, 9, 8);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  // 3. Kołnierz pod infułą
  ctx.beginPath();
  ctx.ellipse(0, -7.5, 6.5, 2.2, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();

  // 4. Infuła (mitra) ze skośnym wcięciem
  ctx.beginPath();
  ctx.moveTo(-6, -8);
  ctx.quadraticCurveTo(-7.5, -16, 0, -23);
  ctx.quadraticCurveTo(7.5, -16, 6, -8);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  // Skośne nacięcie infuły (znak rozpoznawczy Gońca)
  ctx.beginPath();
  ctx.moveTo(1.5, -17.5);
  ctx.lineTo(5.8, -13.2);
  ctx.stroke();

  // 5. Kulka (finial) na szczycie
  ctx.beginPath();
  ctx.arc(0, -25, 2.3, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();

  ctx.restore();
}

// Rysowanie sylwetki Wieży Szachowej (Rook — Tank / Buggernaut z Tarczą Frontalną)
export function drawRookPiece(
  ctx,
  x,
  y,
  scaleX,
  scaleY,
  fill,
  outline,
  hitFlash,
  glowColor = null,
  facingAngle = 0,
  shieldCharges = 0,
  isStunned = false,
  timeSec = 0
) {
  ctx.save();
  ctx.translate(x, y);

  ctx.fillStyle = 'rgba(0, 0, 0, 0.44)';
  ctx.beginPath();
  ctx.ellipse(0, 12, 15.5 * scaleX, 6.5, 0, 0, Math.PI * 2);
  ctx.fill();

  if (glowColor) {
    drawFauxGlow(ctx, 0, -3, 18, glowColor, 0.22);
  }

  ctx.save();
  ctx.scale(scaleX, scaleY);

  const mainFill = hitFlash > 0 ? '#ffffff' : fill;
  const mainStroke = hitFlash > 0 ? '#ffffff' : outline;

  ctx.fillStyle = mainFill;
  ctx.strokeStyle = mainStroke;
  ctx.lineWidth = 2.6;
  ctx.lineJoin = 'round';

  // 1. Masywna podstawa
  ctx.beginPath();
  ctx.ellipse(0, 9.5, 13.5, 5, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();

  // 2. Kolumna muru obronnego + korona z 3 blankami (crenellations)
  ctx.beginPath();
  ctx.moveTo(-11, 8.5);
  ctx.lineTo(-9, -9);
  ctx.lineTo(-11.5, -11);
  ctx.lineTo(-11.5, -19.5);
  ctx.lineTo(-6.5, -19.5);
  ctx.lineTo(-6.5, -15);
  ctx.lineTo(-2.8, -15);
  ctx.lineTo(-2.8, -19.5);
  ctx.lineTo(2.8, -19.5);
  ctx.lineTo(2.8, -15);
  ctx.lineTo(6.5, -15);
  ctx.lineTo(6.5, -19.5);
  ctx.lineTo(11.5, -19.5);
  ctx.lineTo(11.5, -11);
  ctx.lineTo(9, -9);
  ctx.lineTo(11, 8.5);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  // Poziome żłobienie kamienne
  ctx.beginPath();
  ctx.moveTo(-8.5, -8.5);
  ctx.lineTo(8.5, -8.5);
  ctx.stroke();

  ctx.restore();

  // 3. Wizualna Tarcza Frontalna (Frontal Shield)
  if (shieldCharges > 0 && !isStunned) {
    ctx.save();
    ctx.translate(0, -2);
    ctx.strokeStyle = glowColor || outline;
    ctx.lineWidth = 3.5;
    ctx.beginPath();
    ctx.arc(0, 0, 22, facingAngle - 1.15, facingAngle + 1.15);
    ctx.stroke();

    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 1.4;
    ctx.globalAlpha = 0.7;
    ctx.beginPath();
    ctx.arc(0, 0, 22, facingAngle - 0.85, facingAngle + 0.85);
    ctx.stroke();
    ctx.restore();
  }

  // 4. Wirujące gwiazdki ogłuszenia (gdy Wieża uderzy w bandę)
  if (isStunned) {
    ctx.save();
    ctx.fillStyle = '#ffdd33';
    for (let s = 0; s < 3; s++) {
      const ang = timeSec * 7 + (s * Math.PI * 2) / 3;
      const sx = Math.cos(ang) * 12;
      const sy = -25 + Math.sin(ang) * 4;
      ctx.beginPath();
      ctx.arc(sx, sy, 2.8, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }

  ctx.restore();
}

// Rysowanie sylwetki Hetmana / Królowej (Queen — Tier 3 Boss Class)
export function drawQueenPiece(ctx, x, y, scaleX, scaleY, fill, outline, hitFlash, glowColor = null) {
  ctx.save();
  ctx.translate(x, y);

  ctx.fillStyle = 'rgba(0, 0, 0, 0.42)';
  ctx.beginPath();
  ctx.ellipse(0, 11.5, 14.5 * scaleX, 6, 0, 0, Math.PI * 2);
  ctx.fill();

  if (glowColor) {
    drawFauxGlow(ctx, 0, -5, 19, glowColor, 0.25);
  }

  ctx.scale(scaleX, scaleY);

  const mainFill = hitFlash > 0 ? '#ffffff' : fill;
  const mainStroke = hitFlash > 0 ? '#ffffff' : outline;

  ctx.fillStyle = mainFill;
  ctx.strokeStyle = mainStroke;
  ctx.lineWidth = 2.4;
  ctx.lineJoin = 'round';

  // 1. Podstawa królewska
  ctx.beginPath();
  ctx.ellipse(0, 9, 13, 5, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();

  // 2. Smukła suknia i korona o 5 szczytach
  ctx.beginPath();
  ctx.moveTo(-10.5, 8);
  ctx.quadraticCurveTo(-5, 0, -6.5, -9);
  ctx.lineTo(-11.5, -19);
  ctx.lineTo(-5, -13);
  ctx.lineTo(-4.5, -22);
  ctx.lineTo(0, -14);
  ctx.lineTo(0, -24);
  ctx.lineTo(4.5, -14);
  ctx.lineTo(4.5, -22);
  ctx.lineTo(5, -13);
  ctx.lineTo(11.5, -19);
  ctx.lineTo(6.5, -9);
  ctx.quadraticCurveTo(5, 0, 10.5, 8);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  // 3. Perły na szczytach korony
  const peaks = [
    [-11.5, -20.5],
    [-4.5, -23.5],
    [0, -25.5],
    [4.5, -23.5],
    [11.5, -20.5]
  ];
  for (let i = 0; i < peaks.length; i++) {
    ctx.beginPath();
    ctx.arc(peaks[i][0], peaks[i][1], 1.8, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
  }

  ctx.restore();
}

// Uniwersalny dispatcher rysowania dowolnej figury szachowej (Gracza, Wroga, Poświaty, Ikon UI)
export function drawChessPiece(
  ctx,
  type,
  x,
  y,
  zHeight,
  scaleX,
  scaleY,
  fill,
  outline,
  hitFlash,
  glowColor = null,
  extra = null
) {
  if (type === 'knight') {
    drawKnightPiece(ctx, x, y, zHeight, scaleX, scaleY, fill, outline, hitFlash, glowColor);
  } else if (type === 'bishop') {
    drawBishopPiece(ctx, x, y - zHeight, scaleX, scaleY, fill, outline, hitFlash, glowColor);
  } else if (type === 'rook') {
    const facing = extra ? extra.facingAngle || 0 : 0;
    const shield = extra ? extra.shieldCharges || 0 : 0;
    const stunned = extra ? extra.isStunned || false : false;
    const tSec = extra ? extra.timeSec || 0 : 0;
    drawRookPiece(ctx, x, y - zHeight, scaleX, scaleY, fill, outline, hitFlash, glowColor, facing, shield, stunned, tSec);
  } else if (type === 'queen') {
    drawQueenPiece(ctx, x, y - zHeight, scaleX, scaleY, fill, outline, hitFlash, glowColor);
  } else {
    drawPawnPiece(ctx, x, y - zHeight, scaleX, scaleY, fill, outline, hitFlash, glowColor);
  }
}

// Rysowanie fizycznego Czarnego Żetonu Gambitu na szachownicy
export function drawGambitToken(ctx, x, y, bobOffset, theme) {
  ctx.save();
  ctx.translate(x, y + bobOffset);

  ctx.fillStyle = 'rgba(0, 0, 0, 0.35)';
  ctx.beginPath();
  ctx.ellipse(0, 7 - bobOffset * 0.5, 7, 3, 0, 0, Math.PI * 2);
  ctx.fill();

  if (theme.glow) {
    drawFauxGlow(ctx, 0, 0, 8, theme.uiAccent, 0.22);
  }

  // Czarny rdzeń żetonu ze złotym/akcentowym rantem
  ctx.fillStyle = '#141118';
  ctx.strokeStyle = theme.uiAccent;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(0, 0, 7, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();

  // Wewnętrzny romb szachowy
  ctx.fillStyle = theme.uiAccent;
  ctx.beginPath();
  ctx.moveTo(0, -3.5);
  ctx.lineTo(3.5, 0);
  ctx.lineTo(0, 3.5);
  ctx.lineTo(-3.5, 0);
  ctx.closePath();
  ctx.fill();

  ctx.restore();
}

// Celownik taktyczny (Crosshair)
export function drawCrosshair(ctx, x, y, theme, dashReady) {
  ctx.save();
  ctx.translate(x, y);

  ctx.strokeStyle = theme.uiAccent;
  ctx.lineWidth = 1.8;

  // Zewnętrzny pierścień celownika
  ctx.beginPath();
  ctx.arc(0, 0, 9, 0, Math.PI * 2);
  ctx.stroke();

  // 4 znaczniki kierunkowe
  const gap = 5;
  const len = 14;
  ctx.beginPath();
  ctx.moveTo(-len, 0); ctx.lineTo(-gap, 0);
  ctx.moveTo(gap, 0);  ctx.lineTo(len, 0);
  ctx.moveTo(0, -len); ctx.lineTo(0, -gap);
  ctx.moveTo(0, gap);  ctx.lineTo(0, len);
  ctx.stroke();

  // Punkt centralny (sygnalizuje gotowość En Passant Dash)
  ctx.fillStyle = dashReady ? theme.bulletPlayer : theme.uiDanger;
  ctx.beginPath();
  ctx.arc(0, 0, 2.2, 0, Math.PI * 2);
  ctx.fill();

  ctx.restore();
}

