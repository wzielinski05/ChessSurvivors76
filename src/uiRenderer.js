// --- RENDERER INTERFEJSU, ZEGARA SZACHOWEGO, WYBORU TEMPA I SKLEPU GAMBITU (ETAP 2 & 3) ---

import { CHESS_TEMPOS, PLAYER_CLASSES, GAMBIT_SHOP_ITEMS } from './chessData.js';
import { StorageEngine } from './storage.js';
import { clamp } from './math.js';
import { drawChessPiece, drawGambitToken } from './sprites.js';

export function renderGameHUD(ctx, game, theme) {
  ctx.save();
  const p = game.player;
  const cls = PLAYER_CLASSES[p.classId];

  const w = game.width;
  const h = game.height;
  const isPortrait = h > w;
  const hudMode = game.hudMode || 'top';
  const isBottom = hudMode === 'bottom';
  const isCompact = hudMode === 'compact' || w < 720;
  const bounds = game.board ? game.board.getBounds() : { left: 0, right: w, top: 0, bottom: h, size: Math.min(w, h) };
  const sideSpace = Math.max(0, bounds.left);
  const isWideSides = !isPortrait && sideSpace >= 165;

  // Skalowanie proporcjonalne czcionek (HUD-04)
  const fontScale = clamp(Math.min(w / 900, h / 680), 0.8, 1.15);
  const titleSize = Math.round(13 * fontScale);
  const bodySize = Math.round(11 * fontScale);

  // 1. Zegar Szachowy (Top lub Bottom w zależności od trybu) (HUD-01, HUD-02, HUD-03)
  const clockW = Math.min(isCompact ? 210 : 250, w - 24);
  const clockH = isCompact ? 46 : 52;
  const clockX = (w - clockW) / 2;
  const clockY = isBottom ? h - clockH - 12 : 8;

  ctx.fillStyle = theme.boardFrame;
  ctx.strokeStyle = game.timeTrouble ? theme.uiDanger : theme.boardFrameInner;
  ctx.lineWidth = 2.5;
  ctx.fillRect(clockX, clockY, clockW, clockH);
  ctx.strokeRect(clockX, clockY, clockW, clockH);

  // Pasek postępu czasu
  const timeRatio = clamp(game.chessClock / game.maxClock, 0, 1);
  ctx.fillStyle = game.timeTrouble ? theme.uiDanger : theme.uiAccent;
  ctx.globalAlpha = 0.24;
  ctx.fillRect(clockX + 3, clockY + 3, (clockW - 6) * timeRatio, clockH - 6);
  ctx.globalAlpha = 1;

  ctx.textAlign = 'center';
  ctx.font = `bold ${Math.max(9, Math.round(10 * fontScale))}px monospace`;
  ctx.fillStyle = theme.uiText;
  ctx.fillText(
    game.timeTrouble
      ? '⚠ NIEDOCZAS (PANIC +40%) ⚠'
      : `TEMPO: ${game.tempo.name} • ZEGAR`,
    w / 2,
    clockY + (isCompact ? 13 : 15)
  );

  ctx.font = `bold ${Math.max(16, Math.round(20 * fontScale))}px monospace`;
  ctx.fillStyle = game.timeTrouble ? theme.uiDanger : theme.uiAccent;
  const displayVal = game.timeTrouble ? game.panicTimer : game.chessClock;
  ctx.fillText(`${displayVal.toFixed(1)}s`, w / 2, clockY + (isCompact ? 33 : 36));

  // Pasek postępu fali lub Zdrowia Bossa
  const activeBoss = game.getActiveBoss ? game.getActiveBoss() : null;
  if (activeBoss) {
    const bossBarW = Math.min(w - 32, 400);
    const bossBarH = 16;
    const bossBarX = (w - bossBarW) / 2;
    const bossBarY = isBottom ? clockY - bossBarH - 5 : clockY + clockH + 5;
    const hpRatio = clamp(activeBoss.hp / activeBoss.maxHp, 0, 1);

    ctx.fillStyle = 'rgba(0, 0, 0, 0.78)';
    ctx.strokeStyle = theme.uiDanger;
    ctx.lineWidth = 2;
    ctx.fillRect(bossBarX, bossBarY, bossBarW, bossBarH);
    ctx.fillStyle = theme.uiDanger;
    ctx.fillRect(bossBarX + 2, bossBarY + 2, (bossBarW - 4) * hpRatio, bossBarH - 4);
    ctx.strokeRect(bossBarX, bossBarY, bossBarW, bossBarH);

    ctx.fillStyle = '#ffffff';
    ctx.font = `bold ${Math.max(9, Math.round(10 * fontScale))}px monospace`;
    const bossTitle =
      activeBoss.type === 'king'
        ? `👑 CZARNY KRÓL (TARCZA: ${game.kingShieldCount || 0}) 👑`
        : `👑 CZARNA KRÓLOWA (${game.board.activeGridSize}x${game.board.activeGridSize}) 👑`;
    ctx.fillText(bossTitle, w / 2, bossBarY + 11);
  } else {
    const waveProg = clamp(game.waveTimer / game.waveDuration, 0, 1);
    const waveBarY = isBottom ? clockY - 8 : clockY + clockH + 4;
    ctx.fillStyle = 'rgba(0,0,0,0.5)';
    ctx.fillRect(clockX, waveBarY, clockW, 5);
    ctx.fillStyle = theme.bulletPlayer;
    ctx.fillRect(clockX, waveBarY, clockW * waveProg, 5);
  }

  // 2. Lewy Panel: Klasa figury, Zdrowie, Tarcza, Zdolność, Perk (HUD-01, HUD-02)
  let leftX = 16;
  let leftY = isPortrait ? (isBottom ? 14 : clockY + clockH + 16) : (isWideSides ? 22 : 16);

  ctx.textAlign = 'left';
  ctx.font = `bold ${titleSize}px monospace`;
  ctx.fillStyle = theme.uiText;
  ctx.fillText(`FIGURA: ${cls.name} (T${cls.tier})`, leftX, leftY);

  // Ikony HP (Serduszka)
  const hpRadius = Math.max(5, Math.round(6.5 * fontScale));
  const hpGap = hpRadius * 3;
  for (let h = 0; h < p.maxHp; h++) {
    const hx = leftX + 4 + h * hpGap;
    const hy = leftY + 18;
    ctx.fillStyle = h < p.hp ? theme.bulletPlayer : 'rgba(255,255,255,0.18)';
    ctx.strokeStyle = theme.playerOutline;
    ctx.lineWidth = 1.4;
    ctx.beginPath();
    ctx.arc(hx, hy, hpRadius, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
  }

  // Dodatkowe wskaźniki klasy
  if (p.classId === 'rook') {
    ctx.font = `bold ${bodySize}px monospace`;
    ctx.fillStyle = '#55ddff';
    ctx.fillText(`TARCZA: ${p.rookShieldCharges}/3`, leftX + p.maxHp * hpGap + 10, leftY + 22);
  } else if (p.royalMajestyTimer > 0) {
    ctx.font = `bold ${bodySize}px monospace`;
    ctx.fillStyle = theme.uiAccent;
    ctx.fillText(`ROYAL: ${p.royalMajestyTimer.toFixed(1)}s`, leftX + p.maxHp * hpGap + 10, leftY + 22);
  }

  // Zdolność specjalna i Gambit (w trybie szerokim lub kompaktowym)
  if (!isPortrait) {
    const dashReady = p.dashCooldown <= 0 || p.royalMajestyTimer > 0;
    ctx.font = `bold ${bodySize}px monospace`;
    ctx.fillStyle = dashReady ? theme.uiAccent : 'rgba(255,255,255,0.45)';
    ctx.fillText(
      dashReady ? `[SPACJA] ${cls.abilityName}: GOTOWY` : `[SPACJA] ${cls.abilityName}: ${p.dashCooldown.toFixed(1)}s`,
      leftX,
      leftY + 42
    );

    if (game.activeAbilityId) {
      const actItem = GAMBIT_SHOP_ITEMS.find((it) => it.id === game.activeAbilityId);
      const actReady = game.activeAbilityCooldown <= 0;
      ctx.fillStyle = actReady ? '#55ff99' : 'rgba(255,255,255,0.45)';
      ctx.fillText(
        actReady ? `[E] ${actItem ? actItem.name : 'GAMBIT'}: GOTOWY` : `[E] GAMBIT: ${game.activeAbilityCooldown.toFixed(1)}s`,
        leftX,
        leftY + 58
      );
    } else {
      ctx.fillStyle = 'rgba(255,255,255,0.4)';
      ctx.fillText('[E] GAMBIT: BRAK', leftX, leftY + 58);
    }
  }

  // 3. Prawy Panel: Fala, Zbicia, Żetony, Skróty (HUD-01, HUD-02)
  let rightX = w - 16;
  let rightY = isPortrait ? (isBottom ? 14 : clockY + clockH + 16) : (isWideSides ? 22 : 16);

  ctx.textAlign = 'right';
  ctx.font = `bold ${titleSize}px monospace`;
  ctx.fillStyle = theme.uiText;
  ctx.fillText(
    `FALA: ${game.wave} | ZBICIA: ${game.kills} | ŻETONY: ${game.gambitTokens}`,
    rightX,
    rightY
  );

  ctx.font = `bold ${bodySize}px monospace`;
  if (!isPortrait) {
    ctx.fillStyle = theme.uiAccent;
    ctx.fillText(`[TAB] SKLEP & AWANS • [M] TEMPO`, rightX, rightY + 20);

    ctx.fillStyle = theme.uiText;
    ctx.fillText(`[T] STYL: ${theme.name} • [J] CEL: ${game.aimMode.toUpperCase()}`, rightX, rightY + 38);

    ctx.fillStyle = 'rgba(255,255,255,0.6)';
    ctx.fillText(`[H] HUD: ${hudMode.toUpperCase()} | [Q] AUTO-FIRE | ${game.fps} FPS`, rightX, rightY + 56);
  } else {
    // W orientacji Portrait: zwięzły wiersz statusu
    ctx.fillStyle = theme.uiAccent;
    ctx.fillText(`[TAB] SKLEP • [J] ${game.aimMode.toUpperCase()}`, rightX, rightY + 20);
  }

  // 4. Dolny pasek instrukcji (ukrywany lub zwięzły na dotyku)
  if (!isBottom) {
    ctx.textAlign = 'center';
    ctx.font = `${Math.max(9, Math.round(10 * fontScale))}px monospace`;
    ctx.fillStyle = theme.uiText;
    ctx.globalAlpha = 0.75;
    if (game.input.touchActive || game.input.isTouchDevice) {
      if (h - bounds.bottom >= 18) {
        const touchHelp = game.aimMode === 'twinstick'
          ? 'TWIN-STICK: Prawy drążek celuje i strzela • Lewy drążek: ruch'
          : 'AUTO-AIM: Dotknij wroga aby zablokować cel • Lewy kciuk: ruch';
        ctx.fillText(touchHelp, w / 2, h - 8);
      }
    } else {
      ctx.fillText(
        'WSAD: Ruch • LPM: Atak • SPACJA: Zryw • E: Gambit • TAB: Sklep • T: Styl • J: Celowanie • H: HUD',
        w / 2,
        h - 8
      );
    }
    ctx.globalAlpha = 1;
  }

  ctx.restore();
}

  ctx.restore();
}

export function renderTempoSelectOverlay(ctx, game, theme) {
  ctx.save();
  ctx.fillStyle = 'rgba(4, 4, 8, 0.84)';
  ctx.fillRect(0, 0, game.width, game.height);

  const panelW = 780;
  const panelH = 490;
  const px = (game.width - panelW) / 2;
  const py = (game.height - panelH) / 2;

  ctx.fillStyle = theme.boardFrame;
  ctx.strokeStyle = theme.boardFrameInner;
  ctx.lineWidth = 3;
  ctx.fillRect(px, py, panelW, panelH);
  ctx.strokeRect(px, py, panelW, panelH);

  ctx.textAlign = 'center';
  ctx.fillStyle = theme.uiAccent;
  ctx.font = 'bold 26px monospace';
  ctx.fillText('CHECKMATE: BULLET HELL — WYBÓR TEMPA PARTII', game.width / 2, py + 42);

  ctx.fillStyle = theme.uiText;
  ctx.font = '13px monospace';
  ctx.fillText(
    'Wybierz format Zegara Szachowego (Klawisze [1] [2] [3] lub Kliknięcie LPM)',
    game.width / 2,
    py + 68
  );

  const cardW = 228;
  const cardH = 290;
  const gap = 22;
  const startX = (game.width - (cardW * 3 + gap * 2)) / 2;
  const cardY = py + 94;

  for (let i = 0; i < CHESS_TEMPOS.length; i++) {
    const t = CHESS_TEMPOS[i];
    const cx = startX + i * (cardW + gap);
    const isSelected = game.tempo.id === t.id;
    const isHover =
      game.input.mouseX >= cx &&
      game.input.mouseX <= cx + cardW &&
      game.input.mouseY >= cardY &&
      game.input.mouseY <= cardY + cardH;

    ctx.fillStyle = isSelected || isHover ? theme.tileDark : 'rgba(0,0,0,0.45)';
    ctx.strokeStyle = isSelected
      ? theme.uiAccent
      : isHover
      ? theme.bulletPlayer
      : theme.boardFrameInner;
    ctx.lineWidth = isSelected ? 3 : 2;
    ctx.fillRect(cx, cardY, cardW, cardH);
    ctx.strokeRect(cx, cardY, cardW, cardH);

    // Ikona reprezentatywnej figury na karcie tempa
    const pieceIcon = i === 0 ? 'pawn' : i === 1 ? 'knight' : 'queen';
    drawChessPiece(
      ctx,
      pieceIcon,
      cx + cardW / 2,
      cardY + 62,
      0,
      1.25,
      1.25,
      theme.playerFill,
      theme.playerOutline,
      0,
      theme.glow ? theme.uiAccent : null
    );

    ctx.fillStyle = theme.uiAccent;
    ctx.font = 'bold 20px monospace';
    ctx.fillText(`[${t.key}] ${t.name}`, cx + cardW / 2, cardY + 112);

    ctx.fillStyle = theme.uiText;
    ctx.font = 'bold 11px monospace';
    ctx.fillText(t.subtitle, cx + cardW / 2, cardY + 134);

    ctx.font = '11px monospace';
    ctx.fillStyle = 'rgba(255,255,255,0.85)';
    ctx.fillText(`Telegrafy wrogów: ${t.telegraphBase.toFixed(2)}s`, cx + cardW / 2, cardY + 162);
    ctx.fillText(`Prędkość figur: ${Math.round(t.enemySpeedMult * 100)}%`, cx + cardW / 2, cardY + 182);
    ctx.fillText(`Gęstość fal: ${t.spawnCountMult}x`, cx + cardW / 2, cardY + 202);
    ctx.fillText(`Drop Żetonów: ${Math.round(t.tokenDropMult * 100)}%`, cx + cardW / 2, cardY + 222);

    // Rekord z IndexedDB (AM76_CHESS_DB)
    const hs = StorageEngine.profile.highScores[t.id] || { bestWave: 1, bestKills: 0, victories: 0 };
    ctx.fillStyle = '#55ff99';
    ctx.font = 'bold 10px monospace';
    ctx.fillText(
      `REKORD: FALA ${hs.bestWave} • ZBICIA ${hs.bestKills} • MATY ${hs.victories}`,
      cx + cardW / 2,
      cardY + 245
    );

    ctx.fillStyle = isSelected ? theme.bulletPlayer : theme.uiAccent;
    ctx.font = 'bold 12px monospace';
    ctx.fillText(
      isSelected ? '▶ AKTYWNE (KLIKNIJ = START) ◀' : '[ KLIKNIJ ABY WYBRAĆ ]',
      cx + cardW / 2,
      cardY + 272
    );
  }

  ctx.fillStyle = theme.uiAccent;
  ctx.font = 'bold 15px monospace';
  ctx.fillText(
    '[ NACIŚNIJ SPACJĘ / ENTER, ABY ROZPOCZĄĆ PARTIĘ W WYBRANYM TEMPIE ]',
    game.width / 2,
    py + panelH - 52
  );

  ctx.fillStyle = theme.uiText;
  ctx.font = '12px monospace';
  const achCount = StorageEngine.profile.achievements.length;
  ctx.fillText(
    `Styl [T]: ${theme.name}   •   Zapis IndexedDB: AM76_CHESS_DB (Osiągnięcia: ${achCount})`,
    game.width / 2,
    py + panelH - 22
  );

  ctx.restore();
}

export function renderGambitShopOverlay(ctx, game, theme) {
  ctx.save();
  ctx.fillStyle = 'rgba(5, 5, 10, 0.86)';
  ctx.fillRect(0, 0, game.width, game.height);

  const panelW = 880;
  const panelH = 620;
  const px = (game.width - panelW) / 2;
  const py = (game.height - panelH) / 2;

  ctx.fillStyle = theme.boardFrame;
  ctx.strokeStyle = theme.uiAccent;
  ctx.lineWidth = 3;
  ctx.fillRect(px, py, panelW, panelH);
  ctx.strokeRect(px, py, panelW, panelH);

  // Nagłówek Sklepu Gambitu
  ctx.textAlign = 'left';
  ctx.fillStyle = theme.uiAccent;
  ctx.font = 'bold 22px monospace';
  ctx.fillText(`SKLEP GAMBITU & PROMOCJA FIGURY (FALA ${game.wave})`, px + 24, py + 36);

  // Licznik Czarnych Żetonów
  drawGambitToken(ctx, px + panelW - 185, py + 29, 0, theme);
  ctx.textAlign = 'right';
  ctx.fillStyle = theme.bulletPlayer;
  ctx.font = 'bold 18px monospace';
  ctx.fillText(`CZARNE ŻETONY: ${game.gambitTokens}`, px + panelW - 24, py + 35);

  // --- SEKCJA 1: DRZEWKO EWOLUCJI (PAWN PROMOTION) ---
  ctx.textAlign = 'left';
  ctx.fillStyle = theme.uiText;
  ctx.font = 'bold 14px monospace';
  ctx.fillText(
    '1. AWANS FIGURY SZACHOWEJ (PAWN PROMOTION — Klawisze [1]-[4] lub Kliknięcie):',
    px + 24,
    py + 70
  );

  const promoClasses = ['knight', 'bishop', 'rook', 'queen'];
  const promoW = 196;
  const promoH = 172;
  const promoGap = 16;
  const promoStartX = px + 24;
  const promoY = py + 84;

  for (let i = 0; i < promoClasses.length; i++) {
    const cid = promoClasses[i];
    const cData = PLAYER_CLASSES[cid];
    const cx = promoStartX + i * (promoW + promoGap);

    const isCurrent = game.player.classId === cid;
    const canUnlockQueen = cid !== 'queen' || game.player.classId !== 'pawn';
    const canAfford = game.gambitTokens >= cData.cost && !isCurrent && canUnlockQueen;

    const isHover =
      game.input.mouseX >= cx &&
      game.input.mouseX <= cx + promoW &&
      game.input.mouseY >= promoY &&
      game.input.mouseY <= promoY + promoH;

    ctx.fillStyle = isCurrent
      ? theme.tileDark
      : isHover && canAfford
      ? 'rgba(255,255,255,0.12)'
      : 'rgba(0,0,0,0.45)';
    ctx.strokeStyle = isCurrent
      ? theme.bulletPlayer
      : canAfford
      ? theme.uiAccent
      : 'rgba(255,255,255,0.22)';
    ctx.lineWidth = isCurrent || (isHover && canAfford) ? 2.5 : 1.5;
    ctx.fillRect(cx, promoY, promoW, promoH);
    ctx.strokeRect(cx, promoY, promoW, promoH);

    // Sylwetka figury
    drawChessPiece(
      ctx,
      cid,
      cx + 34,
      promoY + 42,
      0,
      1.05,
      1.05,
      theme.playerFill,
      theme.playerOutline,
      0,
      null,
      { facingAngle: 0, shieldCharges: cid === 'rook' ? 3 : 0 }
    );

    ctx.textAlign = 'left';
    ctx.fillStyle = theme.uiAccent;
    ctx.font = 'bold 14px monospace';
    ctx.fillText(`[${i + 1}] ${cData.name}`, cx + 66, promoY + 26);

    ctx.fillStyle = isCurrent
      ? theme.bulletPlayer
      : canAfford
      ? '#55ff99'
      : theme.uiDanger;
    ctx.font = 'bold 12px monospace';
    const statusTxt = isCurrent
      ? 'AKTYWNA KLASA'
      : !canUnlockQueen
      ? 'WYMAGA TIER 2'
      : `KOSZT: ${cData.cost} ŻET.`;
    ctx.fillText(statusTxt, cx + 66, promoY + 46);

    ctx.fillStyle = theme.uiText;
    ctx.font = 'bold 10px monospace';
    ctx.fillText(`Atak: ${cData.attackDesc.slice(0, 27)}`, cx + 10, promoY + 82);
    ctx.fillStyle = theme.uiAccent;
    ctx.fillText(`PPM: ${cData.abilityName}`, cx + 10, promoY + 102);
    ctx.fillStyle = 'rgba(255,255,255,0.78)';
    ctx.font = '10px monospace';
    ctx.fillText(cData.abilityDesc.slice(0, 30), cx + 10, promoY + 120);
    ctx.fillText(cData.passiveDesc.slice(0, 30), cx + 10, promoY + 138);

    ctx.textAlign = 'center';
    ctx.fillStyle = canAfford ? theme.bulletPlayer : 'rgba(255,255,255,0.4)';
    ctx.font = 'bold 11px monospace';
    ctx.fillText(
      isCurrent ? '✓ WYBRANO' : canAfford ? '[ KLIKNIJ = AWANSUJ ]' : 'NIEDOSTĘPNE',
      cx + promoW / 2,
      promoY + 160
    );
  }

  // --- SEKCJA 2: PERKI PASYWNE & ZDOLNOŚCI AKTYWNE POD [E] ---
  ctx.textAlign = 'left';
  ctx.fillStyle = theme.uiText;
  ctx.font = 'bold 14px monospace';
  ctx.fillText(
    '2. PERKI PASYWNE & GAMBITY AKTYWNE POD [E] (Kliknij kartę, aby kupić):',
    px + 24,
    py + 282
  );

  const itemCols = 4;
  const itemW = 196;
  const itemH = 114;
  const itemGapX = 16;
  const itemGapY = 14;
  const itemStartX = px + 24;
  const itemStartY = py + 296;

  // 7 przedmiotów ze specyfikacji + 8. karta: Naprawa Figury (+2 HP)
  for (let i = 0; i < 8; i++) {
    const col = i % itemCols;
    const row = Math.floor(i / itemCols);
    const ix = itemStartX + col * (itemW + itemGapX);
    const iy = itemStartY + row * (itemH + itemGapY);

    const isHover =
      game.input.mouseX >= ix &&
      game.input.mouseX <= ix + itemW &&
      game.input.mouseY >= iy &&
      game.input.mouseY <= iy + itemH;

    if (i < GAMBIT_SHOP_ITEMS.length) {
      const item = GAMBIT_SHOP_ITEMS[i];
      const currentLvl = game.perks[item.id] || 0;
      const isActiveType = item.type === 'active';
      const isEquippedActive = isActiveType && game.activeAbilityId === item.id;
      const isMaxed = !isActiveType && currentLvl >= item.maxLevel;
      const canBuy =
        game.gambitTokens >= item.cost && !isMaxed && !isEquippedActive;

      ctx.fillStyle = isEquippedActive || isMaxed
        ? theme.tileDark
        : isHover && canBuy
        ? 'rgba(255,255,255,0.12)'
        : 'rgba(0,0,0,0.45)';
      ctx.strokeStyle = isEquippedActive || isMaxed
        ? theme.bulletPlayer
        : canBuy
        ? theme.uiAccent
        : 'rgba(255,255,255,0.22)';
      ctx.lineWidth = isHover && canBuy ? 2.5 : 1.5;
      ctx.fillRect(ix, iy, itemW, itemH);
      ctx.strokeRect(ix, iy, itemW, itemH);

      ctx.textAlign = 'left';
      ctx.fillStyle = isActiveType ? '#55ff99' : theme.uiAccent;
      ctx.font = 'bold 12px monospace';
      ctx.fillText(item.name, ix + 10, iy + 20);

      ctx.fillStyle = canBuy ? '#55ff99' : theme.uiDanger;
      ctx.font = 'bold 11px monospace';
      const costLabel = isEquippedActive
        ? 'AKTYWNY [E]'
        : isMaxed
        ? `MAKS (${currentLvl}/${item.maxLevel})`
        : isActiveType
        ? `KOSZT: ${item.cost} ŻET. [AKTYWNY]`
        : `KOSZT: ${item.cost} ŻET. (POZ. ${currentLvl}/${item.maxLevel})`;
      ctx.fillText(costLabel, ix + 10, iy + 38);

      // Opis w 2 wierszach
      ctx.fillStyle = 'rgba(255,255,255,0.82)';
      ctx.font = '10px monospace';
      ctx.fillText(item.desc.slice(0, 31), ix + 10, iy + 62);
      ctx.fillText(item.desc.slice(31, 62), ix + 10, iy + 78);

      ctx.textAlign = 'center';
      ctx.fillStyle = canBuy ? theme.bulletPlayer : 'rgba(255,255,255,0.4)';
      ctx.font = 'bold 11px monospace';
      ctx.fillText(
        isEquippedActive || isMaxed ? '✓ POSIADANE' : canBuy ? '[ KUP TERAZ ]' : 'ZA DROGO',
        ix + itemW / 2,
        iy + 102
      );
    } else {
      // Karta #8: Rekonstrukcja Drewna (Leczenie +2 HP)
      const healCost = 4;
      const needsHeal = game.player.hp < game.player.maxHp;
      const canHeal = game.gambitTokens >= healCost && needsHeal;

      ctx.fillStyle = isHover && canHeal ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.45)';
      ctx.strokeStyle = canHeal ? '#55ff99' : 'rgba(255,255,255,0.22)';
      ctx.lineWidth = isHover && canHeal ? 2.5 : 1.5;
      ctx.fillRect(ix, iy, itemW, itemH);
      ctx.strokeRect(ix, iy, itemW, itemH);

      ctx.textAlign = 'left';
      ctx.fillStyle = '#55ff99';
      ctx.font = 'bold 12px monospace';
      ctx.fillText('Rekonstrukcja (+2 HP)', ix + 10, iy + 20);

      ctx.fillStyle = canHeal ? '#55ff99' : theme.uiDanger;
      ctx.font = 'bold 11px monospace';
      ctx.fillText(
        needsHeal ? `KOSZT: ${healCost} ŻET. (HP ${game.player.hp}/${game.player.maxHp})` : 'PEŁNE ZDROWIE',
        ix + 10,
        iy + 38
      );

      ctx.fillStyle = 'rgba(255,255,255,0.82)';
      ctx.font = '10px monospace';
      ctx.fillText('Skleja pęknięcia figury i', ix + 10, iy + 62);
      ctx.fillText('przywraca 2 punkty życia.', ix + 10, iy + 78);

      ctx.textAlign = 'center';
      ctx.fillStyle = canHeal ? theme.bulletPlayer : 'rgba(255,255,255,0.4)';
      ctx.font = 'bold 11px monospace';
      ctx.fillText(canHeal ? '[ NAPRAW FIGURĘ ]' : 'NIEDOSTĘPNE', ix + itemW / 2, iy + 102);
    }
  }

  // Przycisk kontynuacji do następnej fali na dole okna
  const btnW = 460;
  const btnH = 44;
  const bx = (game.width - btnW) / 2;
  const by = py + panelH - 58;

  ctx.fillStyle = theme.tileDark;
  ctx.strokeStyle = theme.bulletPlayer;
  ctx.lineWidth = 2.5;
  ctx.fillRect(bx, by, btnW, btnH);
  ctx.strokeRect(bx, by, btnW, btnH);

  ctx.textAlign = 'center';
  ctx.fillStyle = theme.bulletPlayer;
  ctx.font = 'bold 15px monospace';
  ctx.fillText(
    '▶ [SPACJA / TAB / KLIKNIJ] WRÓĆ NA SZACHOWNICĘ ◀',
    game.width / 2,
    by + 27
  );

  ctx.restore();
}

export function renderBlurOverlay(ctx, game, theme) {
  ctx.save();
  ctx.fillStyle = 'rgba(0, 0, 0, 0.65)';
  ctx.fillRect(0, 0, game.width, game.height);

  ctx.strokeStyle = theme.uiAccent;
  ctx.lineWidth = 2;
  ctx.fillStyle = theme.boardFrame;
  ctx.fillRect(game.width / 2 - 230, game.height / 2 - 60, 460, 120);
  ctx.strokeRect(game.width / 2 - 230, game.height / 2 - 60, 460, 120);

  ctx.textAlign = 'center';
  ctx.fillStyle = theme.uiAccent;
  ctx.font = 'bold 20px monospace';
  ctx.fillText('PAUZA — UTRACONO FOCUS OKNA', game.width / 2, game.height / 2 - 14);

  ctx.fillStyle = theme.uiText;
  ctx.font = '14px monospace';
  ctx.fillText(
    'Kliknij w obszar szachownicy, aby wznowić grę',
    game.width / 2,
    game.height / 2 + 22
  );
  ctx.restore();
}

export function renderGameOverOverlay(ctx, game, theme) {
  ctx.save();
  ctx.fillStyle = 'rgba(0, 0, 0, 0.80)';
  ctx.fillRect(0, 0, game.width, game.height);

  const boxW = 540;
  const boxH = 260;
  const bx = (game.width - boxW) / 2;
  const by = (game.height - boxH) / 2;

  ctx.fillStyle = theme.boardFrame;
  ctx.strokeStyle = theme.uiDanger;
  ctx.lineWidth = 3;
  ctx.fillRect(bx, by, boxW, boxH);
  ctx.strokeRect(bx, by, boxW, boxH);

  ctx.textAlign = 'center';
  ctx.fillStyle = theme.uiDanger;
  ctx.font = 'bold 28px monospace';
  ctx.fillText('SZACH I MAT!', game.width / 2, by + 46);

  ctx.fillStyle = theme.uiText;
  ctx.font = '14px monospace';
  ctx.fillText(game.gameOverReason, game.width / 2, by + 82);

  const cls = PLAYER_CLASSES[game.player.classId];
  const hs = StorageEngine.profile.highScores[game.tempo.id] || { bestWave: 1, bestKills: 0 };
  ctx.fillStyle = theme.uiAccent;
  ctx.font = 'bold 14px monospace';
  ctx.fillText(
    `TEMPO: ${game.tempo.name}  •  FIGURA: ${cls.name}  •  FALA: ${game.wave}  •  ZBICIA: ${game.kills}`,
    game.width / 2,
    by + 122
  );

  ctx.fillStyle = '#55ff99';
  ctx.font = 'bold 12px monospace';
  ctx.fillText(
    `REKORD (${game.tempo.name}): FALA ${hs.bestWave}  •  ZBICIA ${hs.bestKills}  •  ZAPISANO W AM76_CHESS_DB`,
    game.width / 2,
    by + 155
  );

  ctx.fillStyle = theme.uiText;
  ctx.font = 'bold 14px monospace';
  ctx.fillText(
    '[ SPACJA / R / LPM: ZAGRAJ PONOWNIE ]     [ M: ZMIEŃ TEMPO PARTII ]',
    game.width / 2,
    by + 205
  );
  ctx.restore();
}

export function renderVictoryOverlay(ctx, game, theme) {
  ctx.save();
  ctx.fillStyle = 'rgba(0, 0, 0, 0.82)';
  ctx.fillRect(0, 0, game.width, game.height);

  const boxW = 580;
  const boxH = 290;
  const bx = (game.width - boxW) / 2;
  const by = (game.height - boxH) / 2;

  ctx.fillStyle = theme.boardFrame;
  ctx.strokeStyle = theme.bulletPlayer;
  ctx.lineWidth = 3.5;
  ctx.fillRect(bx, by, boxW, boxH);
  ctx.strokeRect(bx, by, boxW, boxH);

  ctx.textAlign = 'center';
  ctx.fillStyle = theme.bulletPlayer;
  ctx.font = 'bold 26px monospace';
  ctx.fillText('👑 ZWYCIĘSTWO — MAT ARCYMISTRZA! 👑', game.width / 2, by + 48);

  ctx.fillStyle = theme.uiText;
  ctx.font = '13px monospace';
  ctx.fillText(
    'Pokonałeś Czarną Królową i przetrwałeś uderzenia Ręki Arcymistrza!',
    game.width / 2,
    by + 82
  );

  const cls = PLAYER_CLASSES[game.player.classId];
  ctx.fillStyle = theme.uiAccent;
  ctx.font = 'bold 14px monospace';
  ctx.fillText(
    `TEMPO: ${game.tempo.name}  •  KLASA: ${cls.name}  •  ZBICIA: ${game.kills}  •  ŻETONY: ${game.gambitTokens}`,
    game.width / 2,
    by + 124
  );

  ctx.fillStyle = '#55ff99';
  ctx.font = 'bold 12px monospace';
  const achs = StorageEngine.profile.achievements.slice(-2).join(' • ') || 'Mistrz Szachownicy';
  ctx.fillText(`OSIĄGNIĘCIA (AM76_CHESS_DB): ${achs}`, game.width / 2, by + 160);

  ctx.fillStyle = theme.bulletPlayer;
  ctx.font = 'bold 14px monospace';
  ctx.fillText(
    '[ SPACJA / LPM: KONTYNUUJ W TRYBIE ENDLESS (ODBUDOWA 8x8) ]',
    game.width / 2,
    by + 212
  );

  ctx.fillStyle = theme.uiText;
  ctx.font = '13px monospace';
  ctx.fillText(
    '[ R: NOWA PARTIA ]          [ M: WYBÓR TEMPA ]',
    game.width / 2,
    by + 250
  );
  ctx.restore();
}

