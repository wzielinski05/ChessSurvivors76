// --- GŁÓWNY SILNIK GRY & MASZYNA STANÓW (ETAP 3: BOSSOWIE, RĘKA ARCYMISTRZA & INDEXEDDB) ---

import { THEME_ORDER } from './themes.js';
import { CHESS_TEMPOS, PLAYER_CLASSES, GAMBIT_SHOP_ITEMS } from './chessData.js';
import { StorageEngine } from './storage.js';
import { AudioEngine } from './audio.js';
import { createPools } from './pool.js';
import {
  clamp,
  distSq,
  distToSegmentSq,
  sweptCircleCollision,
  computeTraumaShake,
  angleDiff,
  isNearDiagonalAngle,
  rayBoxExitPoint
} from './math.js';
import { BoardRenderer } from './boardRenderer.js';
import {
  drawChessPiece,
  drawGrandmasterHand,
  drawGambitToken,
  drawCrosshair,
  drawFauxGlow,
  drawTouchControls,
  drawLockOnTarget
} from './sprites.js';
import {
  renderGameHUD,
  renderTempoSelectOverlay,
  renderGambitShopOverlay,
  renderBlurOverlay,
  renderGameOverOverlay,
  renderVictoryOverlay
} from './uiRenderer.js';

export class Game {
  constructor(canvas, input) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d', { alpha: false });
    this.input = input;

    this.width = 960;
    this.height = 720;
    this.dpr = 1;

    this.themeIndex = 0;
    this.theme = THEME_ORDER[this.themeIndex];

    // Domyślne tempo: BLITZ (indeks 1 wg Specyfikacji 2.3)
    this.tempo = CHESS_TEMPOS[1];

    this.board = new BoardRenderer(this.width, this.height);
    this.pools = createPools();

    // Globalne liczniki czasu, traumy i hitstopu
    this.time = 0;
    this.trauma = 0;
    this.hitstopTimer = 0;

    // Telemetria FPS do weryfikacji braku wąskich gardeł
    this.fps = 60;
    this._frameCounter = 0;
    this._fpsTimer = 0;

    // Maszyna Stanów: 'SELECT_TEMPO' | 'PLAYING' | 'GAMBIT_SHOP' | 'GAME_OVER' | 'VICTORY'
    this.state = 'SELECT_TEMPO';
    this.autoFire = false;
    this.lockedTarget = null;
    this.aimMode = 'hybrid'; // 'hybrid' | 'twinstick' (TOUCH-03, TOUCH-05)
    this.lastAimAngle = 0;

    this.player = {
      classId: 'pawn', // 'pawn' | 'knight' | 'bishop' | 'rook' | 'queen'
      x: 480,
      y: 380,
      vx: 0,
      vy: 0,
      radius: 8,
      speed: 235,
      hp: 5,
      maxHp: 5,
      invulnTimer: 0,
      hitFlash: 0,
      fireCooldown: 0,
      fireRate: 0.17,
      dashTimer: 0,
      dashCooldown: 0,
      dashVx: 0,
      dashVy: 0,
      leapStartX: 0,
      leapStartY: 0,
      leapTargetX: 0,
      leapTargetY: 0,
      zHeight: 0,
      rookShieldCharges: 3,
      rookShieldRegenTimer: 0,
      royalMajestyTimer: 0,
      afterimageTick: 0,
      scaleX: 1,
      scaleY: 1,
      walkPhase: 0
    };

    // Perki pasywne oraz aktywna zdolność Gambitu pod klawiszem [E]
    this.perks = {
      knights_fork: 0,
      pinning_shot: 0,
      sacrifice_drone: 0,
      polished_wood: 0,
      lead_weight: 0
    };
    this.droneActive = false;
    this.droneAngle = 0;
    this.activeAbilityId = null; // 'castling' | 'check_shout'
    this.activeAbilityCooldown = 0;
    this.castlingCloneX = 0;
    this.castlingCloneY = 0;

    // Tarcza z 4 orbitujących pionków dla Mini-Bossa: Czarnego Króla (Spec 4.5, prealokowana Zero-GC)
    this.kingShieldPawns = [
      { active: false, angle: 0, hp: 3, x: 0, y: 0, hitFlash: 0 },
      { active: false, angle: Math.PI * 0.5, hp: 3, x: 0, y: 0, hitFlash: 0 },
      { active: false, angle: Math.PI, hp: 3, x: 0, y: 0, hitFlash: 0 },
      { active: false, angle: Math.PI * 1.5, hp: 3, x: 0, y: 0, hitFlash: 0 }
    ];
    this.kingShieldCount = 0;

    // Ręka Arcymistrza dla Fazy 2 Bossa Finałowego (Spec 4.6)
    this.grandmasterHand = {
      active: false,
      state: 'shadow', // 'shadow' | 'slam' | 'recover'
      timer: 0,
      x: 480,
      y: 380,
      zHeight: 260,
      targetGridSize: 6
    };
    this.queenShrinkStage = 0; // 0 = 8x8, 1 = 6x6, 2 = 4x4

    // Zegar Szachowy (Specyfikacja 2.2)
    this.chessClock = 15.0;
    this.maxClock = 30.0;
    this.timeTrouble = false;
    this.panicTimer = 5.0;

    // Statystyki sesji i fale
    this.wave = 1;
    this.waveDuration = 22.0;
    this.bossSpawnedForWave = 0;
    this.kills = 0;
    this.gambitTokens = 0;
    this.tokenResidual = 0;
    this.spawnTimer = 0.8;
    this.waveTimer = 0;
    this.gameOverReason = '';

    this.resetRun('SELECT_TEMPO');
  }

  applySavedProfile(profile) {
    if (!profile) return;
    if (typeof profile.themeIndex === 'number' && THEME_ORDER[profile.themeIndex]) {
      this.themeIndex = profile.themeIndex;
      this.theme = THEME_ORDER[this.themeIndex];
      this.board.rebuildCache(this.theme);
    }
    if (profile.tempoId) {
      const found = CHESS_TEMPOS.find((t) => t.id === profile.tempoId);
      if (found) this.tempo = found;
    }
  }

  handleResize(winW, winH, dpr) {
    this.width = winW;
    this.height = winH;
    this.dpr = dpr;
    if (this.board) {
      this.board.resize(winW, winH, dpr, this.theme);
      const bounds = this.board.getBounds();
      const margin = this.player.radius + 6;
      this.player.x = clamp(this.player.x, bounds.left + margin, bounds.right - margin);
      this.player.y = clamp(this.player.y, bounds.top + margin, bounds.bottom - margin);
      this._updateCastlingClonePos();
    }
  }

  resetRun(initialState = 'PLAYING') {
    this.pools.bullets.clear();
    this.pools.particles.clear();
    this.pools.enemies.clear();
    this.pools.tokens.clear();
    this.pools.lasers.clear();
    this.pools.floatingTexts.clear();
    this.pools.afterimages.clear();

    this.board.setActiveGridSize(8, this.theme);
    const bounds = this.board.getBounds();
    const pawnCfg = PLAYER_CLASSES.pawn;

    this.player.classId = 'pawn';
    this.player.x = bounds.left + bounds.size / 2;
    this.player.y = bounds.top + bounds.size / 2;
    this.player.vx = 0;
    this.player.vy = 0;
    this.player.radius = pawnCfg.radius;
    this.player.speed = pawnCfg.speed;
    this.player.fireRate = pawnCfg.fireRate;
    this.player.maxHp = 5;
    this.player.hp = this.player.maxHp;
    this.player.invulnTimer = 0;
    this.player.hitFlash = 0;
    this.player.fireCooldown = 0;
    this.player.dashTimer = 0;
    this.player.dashCooldown = 0;
    this.player.zHeight = 0;
    this.player.rookShieldCharges = 3;
    this.player.rookShieldRegenTimer = 0;
    this.player.royalMajestyTimer = 0;
    this.player.scaleX = 1;
    this.player.scaleY = 1;

    this.perks.knights_fork = 0;
    this.perks.pinning_shot = 0;
    this.perks.sacrifice_drone = 0;
    this.perks.polished_wood = 0;
    this.perks.lead_weight = 0;
    this.droneActive = false;
    this.activeAbilityId = null;
    this.activeAbilityCooldown = 0;
    this._updateCastlingClonePos();

    for (let i = 0; i < 4; i++) {
      this.kingShieldPawns[i].active = false;
    }
    this.kingShieldCount = 0;
    this.grandmasterHand.active = false;
    this.queenShrinkStage = 0;

    this.chessClock = 15.0;
    this.timeTrouble = false;
    this.panicTimer = 5.0;

    this.wave = 1;
    this.bossSpawnedForWave = 0;
    this.kills = 0;
    this.gambitTokens = 0;
    this.tokenResidual = 0;
    this.spawnTimer = 0.6;
    this.waveTimer = 0;
    this.trauma = 0;
    this.hitstopTimer = 0;
    this.lockedTarget = null;
    this.state = initialState;

    // Spawnowanie pierwszych wrogów na otwarcie partii
    this.spawnEnemy('pawn');
    this.spawnEnemy('pawn');
    this.spawnEnemy('pawn');
    if (this.tempo.id === 'bullet') {
      this.spawnEnemy('knight');
      this.spawnEnemy('pawn');
    }
  }

  _updateCastlingClonePos() {
    const bounds = this.board.getBounds();
    const cx = bounds.left + bounds.size / 2;
    const cy = bounds.top + bounds.size / 2;
    const pad = 42;
    this.castlingCloneX = this.player.x < cx ? bounds.right - pad : bounds.left + pad;
    this.castlingCloneY = this.player.y < cy ? bounds.bottom - pad : bounds.top + pad;
  }

  cycleTheme() {
    this.themeIndex = (this.themeIndex + 1) % THEME_ORDER.length;
    this.theme = THEME_ORDER[this.themeIndex];
    this.board.rebuildCache(this.theme);
    StorageEngine.recordTheme(this.themeIndex);
    AudioEngine.playThemeSwap();
    this.spawnFloatingText(
      `STYL: ${this.theme.name.toUpperCase()}`,
      this.player.x,
      this.player.y - 28,
      this.theme.uiAccent,
      1.1
    );
  }

  addTrauma(amount) {
    this.trauma = Math.min(1, this.trauma + amount);
  }

  triggerHitstop(duration = 0.045) {
    this.hitstopTimer = Math.max(this.hitstopTimer, duration);
  }

  spawnFloatingText(text, x, y, color = '#ffffff', scale = 1) {
    const ft = this.pools.floatingTexts.acquire();
    if (!ft) return;
    ft.text = text;
    ft.x = x;
    ft.y = y;
    ft.vy = -42;
    ft.life = 0;
    ft.maxLife = 0.85;
    ft.color = color;
    ft.scale = scale;
  }

  spawnParticles(x, y, count, color, speedMin = 45, speedMax = 190) {
    const kind = this.theme.particle;
    for (let i = 0; i < count; i++) {
      const p = this.pools.particles.acquire();
      if (!p) break;
      const angle = Math.random() * Math.PI * 2;
      const spd = speedMin + Math.random() * (speedMax - speedMin);
      p.x = x;
      p.y = y;
      p.vx = Math.cos(angle) * spd;
      p.vy = Math.sin(angle) * spd;
      p.size = 3 + Math.random() * 4.5;
      p.rotation = Math.random() * Math.PI * 2;
      p.vRot = (Math.random() - 0.5) * 14;
      p.alpha = 1;
      p.life = 0;
      p.maxLife = 0.28 + Math.random() * 0.32;
      p.color = color;
      p.kind = kind;
    }
  }

  spawnLaserBeam(x1, y1, x2, y2, isEnemy, width = 8, color = '#ffffff', maxLife = 0.28) {
    const l = this.pools.lasers.acquire();
    if (!l) return;
    l.isRing = false;
    l.isEnemy = isEnemy;
    l.x1 = x1;
    l.y1 = y1;
    l.x2 = x2;
    l.y2 = y2;
    l.width = width;
    l.color = color;
    l.life = 0;
    l.maxLife = maxLife;
  }

  spawnShockwaveRing(x, y, maxRadius, color = '#ffffff', maxLife = 0.38) {
    const l = this.pools.lasers.acquire();
    if (!l) return;
    l.isRing = true;
    l.isEnemy = false;
    l.x1 = x;
    l.y1 = y;
    l.maxRadius = maxRadius;
    l.color = color;
    l.life = 0;
    l.maxLife = maxLife;
  }

  spawnToken(x, y, value = 1) {
    const tk = this.pools.tokens.acquire();
    if (!tk) {
      this.gambitTokens += value;
      return;
    }
    const ang = Math.random() * Math.PI * 2;
    const spd = 45 + Math.random() * 65;
    tk.x = x;
    tk.y = y;
    tk.vx = Math.cos(ang) * spd;
    tk.vy = Math.sin(ang) * spd;
    tk.value = value;
    tk.life = 0;
    tk.maxLife = 16;
    tk.bobPhase = Math.random() * Math.PI * 2;
  }

  spawnBullet(
    x,
    y,
    vx,
    vy,
    isEnemy,
    radius = 5,
    damage = 1,
    maxLife = 2.0,
    kind = 'normal',
    bouncesLeft = 0,
    pierceLeft = 0,
    isCrit = false,
    knockbackMult = 1
  ) {
    const b = this.pools.bullets.acquire();
    if (!b) return null;
    b.isEnemy = isEnemy;
    b.kind = kind;
    b.x = x;
    b.y = y;
    b.prevX = x;
    b.prevY = y;
    b.vx = vx;
    b.vy = vy;
    b.radius = radius;
    b.damage = damage;
    b.life = 0;
    b.maxLife = maxLife;
    b.rotation = Math.atan2(vy, vx);
    b.bouncesLeft = bouncesLeft;
    b.pierceLeft = pierceLeft;
    b.isCrit = isCrit;
    b.knockbackMult = knockbackMult;
    return b;
  }

  spawnEnemy(forcedType = null) {
    const e = this.pools.enemies.acquire();
    if (!e) return;

    const bounds = this.board.getBounds();
    const pad = 28;

    let sx = bounds.left + pad;
    let sy = bounds.top + pad;
    for (let attempt = 0; attempt < 10; attempt++) {
      const edge = (Math.random() * 4) | 0;
      if (edge === 0) {
        sx = bounds.left + pad + Math.random() * (bounds.size - pad * 2);
        sy = bounds.top + pad;
      } else if (edge === 1) {
        sx = bounds.left + pad + Math.random() * (bounds.size - pad * 2);
        sy = bounds.bottom - pad;
      } else if (edge === 2) {
        sx = bounds.left + pad;
        sy = bounds.top + pad + Math.random() * (bounds.size - pad * 2);
      } else {
        sx = bounds.right - pad;
        sy = bounds.top + pad + Math.random() * (bounds.size - pad * 2);
      }
      if (distSq(sx, sy, this.player.x, this.player.y) > 155 * 155) break;
    }

    let type = forcedType;
    if (!type) {
      const roll = Math.random();
      if (this.wave >= 2 && roll < 0.16 + Math.min(0.12, this.wave * 0.02)) {
        type = 'rook';
      } else if (this.wave >= 1 && roll < 0.34 + Math.min(0.14, this.wave * 0.02)) {
        type = 'bishop';
      } else if (roll < 0.56 + Math.min(0.12, this.wave * 0.02)) {
        type = 'knight';
      } else {
        type = 'pawn';
      }
    }

    e.type = type;
    e.x = sx;
    e.y = sy;
    e.vx = 0;
    e.vy = 0;
    e.state = 'chase';
    e.stateTimer = 0.75 + Math.random() * 0.9;
    e.facingAngle = Math.atan2(this.player.y - sy, this.player.x - sx);
    e.pinnedTimer = 0;
    e.frozenTimer = 0;
    e.stunTimer = 0;
    e.hitFlash = 0;
    e.animPhase = Math.random() * Math.PI * 2;
    e.scaleX = 1;
    e.scaleY = 1;
    e.zHeight = 0;

    const spdMult = this.tempo.enemySpeedMult;

    if (type === 'king') {
      // Mini-Boss: Czarny Król (The Mad King — Spec 4.5)
      e.radius = 22;
      e.maxHp = Math.round((45 + this.wave * 8) * (this.tempo.id === 'bullet' ? 1.2 : 1.0));
      e.hp = e.maxHp;
      e.speed = 46 * spdMult;
      e.stateTimer = 2.5;
      // Aktywacja 4 orbitujących pionków-tarcz wokół Czarnego Króla
      for (let i = 0; i < 4; i++) {
        this.kingShieldPawns[i].active = true;
        this.kingShieldPawns[i].angle = (i * Math.PI) / 2;
        this.kingShieldPawns[i].hp = 3;
        this.kingShieldPawns[i].hitFlash = 0;
        this.kingShieldPawns[i].x = e.x + Math.cos(this.kingShieldPawns[i].angle) * 46;
        this.kingShieldPawns[i].y = e.y + Math.sin(this.kingShieldPawns[i].angle) * 46;
      }
      this.kingShieldCount = 4;
    } else if (type === 'black_queen') {
      // Boss Finałowy: Czarna Królowa & Ręka Arcymistrza (Spec 4.6)
      e.radius = 21;
      e.maxHp = Math.round((75 + this.wave * 10) * (this.tempo.id === 'bullet' ? 1.25 : 1.0));
      e.hp = e.maxHp;
      e.speed = 88 * spdMult;
      e.stateTimer = 1.6;
      this.queenShrinkStage = 0;
    } else if (type === 'rook') {
      e.radius = 17;
      e.maxHp = 8 + Math.floor(this.wave * 1.1);
      e.hp = e.maxHp;
      e.speed = 62 * spdMult;
    } else if (type === 'bishop') {
      e.radius = 14;
      e.maxHp = 4 + Math.floor(this.wave * 0.7);
      e.hp = e.maxHp;
      e.speed = 76 * spdMult;
    } else if (type === 'knight') {
      e.radius = 15;
      e.maxHp = 5 + Math.floor(this.wave * 0.7);
      e.hp = e.maxHp;
      e.speed = 68 * spdMult;
    } else {
      e.radius = 13;
      e.maxHp = 2 + Math.floor(this.wave * 0.45);
      e.hp = e.maxHp;
      e.speed = (82 + Math.min(38, this.wave * 4)) * spdMult;
    }
  }

  getActiveBoss() {
    const items = this.pools.enemies.items;
    const size = this.pools.enemies.size;
    for (let i = 0; i < size; i++) {
      const e = items[i];
      if (e.active && (e.type === 'king' || e.type === 'black_queen')) {
        return e;
      }
    }
    return null;
  }

  spawnBossForCurrentWave() {
    if (this.bossSpawnedForWave === this.wave) return;
    if (this.wave === 3) {
      this.bossSpawnedForWave = this.wave;
      this.spawnEnemy('king');
      AudioEngine.playBossWarning();
      this.addTrauma(0.6);
      this.spawnFloatingText(
        '👑 MINI-BOSS: CZARNY KRÓL (THE MAD KING)! 👑',
        this.width / 2,
        this.board.getBounds().top + 54,
        this.theme.uiDanger,
        1.25
      );
    } else if (this.wave === 5) {
      this.bossSpawnedForWave = this.wave;
      this.spawnEnemy('black_queen');
      AudioEngine.playBossWarning();
      this.addTrauma(0.75);
      this.spawnFloatingText(
        '👑 BOSS FINAŁOWY: CZARNA KRÓLOWA & RĘKA ARCYMISTRZA! 👑',
        this.width / 2,
        this.board.getBounds().top + 54,
        this.theme.uiDanger,
        1.25
      );
    }
  }

  addClockIncrement(seconds, x, y) {
    this.chessClock = Math.min(this.maxClock, this.chessClock + seconds);
    if (this.timeTrouble && this.chessClock > 0) {
      this.timeTrouble = false;
      this.panicTimer = 5.0;
    }
    AudioEngine.playClockClick();
    this.spawnFloatingText(
      `+${seconds.toFixed(1)}s`,
      x,
      y - 16,
      this.theme.uiAccent,
      1.05
    );
  }

  // Automatyczne zebranie wszystkich leżących Żetonów pod koniec fali
  collectAllBoardTokens() {
    const items = this.pools.tokens.items;
    const size = this.pools.tokens.size;
    for (let i = 0; i < size; i++) {
      const tk = items[i];
      if (!tk.active) continue;
      this.gambitTokens += tk.value;
      this.pools.tokens.release(tk);
    }
  }

  openGambitShop() {
    this.collectAllBoardTokens();
    if (this.perks.sacrifice_drone > 0) {
      this.droneActive = true;
    }
    this.state = 'GAMBIT_SHOP';
    AudioEngine.playThemeSwap();
  }

  promotePlayerClass(newClassId) {
    const cData = PLAYER_CLASSES[newClassId];
    if (!cData || this.player.classId === newClassId) return false;
    if (newClassId === 'queen' && this.player.classId === 'pawn') return false;
    if (this.gambitTokens < cData.cost) return false;

    this.gambitTokens -= cData.cost;
    this.player.classId = newClassId;
    this.player.radius = cData.radius;
    this.player.fireRate = cData.fireRate;
    this.player.maxHp = Math.max(this.player.maxHp, newClassId === 'rook' ? 7 : newClassId === 'queen' ? 7 : 6);
    this.player.hp = Math.min(this.player.maxHp, this.player.hp + 2);
    this.player.rookShieldCharges = 3;
    this.player.dashCooldown = 0;
    this._recalcPlayerStats();

    StorageEngine.unlockAchievement(`promo_${newClassId}`, `Promocja: ${cData.name}`);
    AudioEngine.playPromotion();
    this.addTrauma(0.45);
    this.spawnParticles(this.player.x, this.player.y, 28, this.theme.uiAccent, 60, 240);
    this.spawnFloatingText(
      `PROMOCJA: ${cData.name}!`,
      this.player.x,
      this.player.y - 34,
      this.theme.uiAccent,
      1.3
    );
    return true;
  }

  _recalcPlayerStats() {
    const baseCfg = PLAYER_CLASSES[this.player.classId];
    const speedBonus = 1 + (this.perks.polished_wood || 0) * 0.15;
    this.player.speed = baseCfg.speed * speedBonus;
    this.player.fireRate = baseCfg.fireRate;
  }

  buyGambitItem(item) {
    if (this.gambitTokens < item.cost) return false;

    if (item.type === 'active') {
      if (this.activeAbilityId === item.id) return false;
      this.gambitTokens -= item.cost;
      this.activeAbilityId = item.id;
      this.activeAbilityCooldown = 0;
      this._updateCastlingClonePos();
      AudioEngine.playShopBuy();
      return true;
    }

    const cur = this.perks[item.id] || 0;
    if (cur >= item.maxLevel) return false;

    this.gambitTokens -= item.cost;
    this.perks[item.id] = cur + 1;
    if (item.id === 'sacrifice_drone') {
      this.droneActive = true;
    }
    this._recalcPlayerStats();
    AudioEngine.playShopBuy();
    return true;
  }

  _handleTempoSelectInput() {
    if (this.input.consumeJustPressed('Digit1')) {
      this.tempo = CHESS_TEMPOS[0];
      StorageEngine.recordTempo(this.tempo.id);
      this.resetRun('PLAYING');
      return;
    }
    if (this.input.consumeJustPressed('Digit2')) {
      this.tempo = CHESS_TEMPOS[1];
      StorageEngine.recordTempo(this.tempo.id);
      this.resetRun('PLAYING');
      return;
    }
    if (this.input.consumeJustPressed('Digit3')) {
      this.tempo = CHESS_TEMPOS[2];
      StorageEngine.recordTempo(this.tempo.id);
      this.resetRun('PLAYING');
      return;
    }
    if (
      this.input.consumeJustPressed('Space') ||
      this.input.consumeJustPressed('Enter')
    ) {
      StorageEngine.recordTempo(this.tempo.id);
      this.resetRun('PLAYING');
      return;
    }

    if (this.input.consumeLeftClick()) {
      const panelH = 490;
      const py = (this.height - panelH) / 2;
      const cardW = 228;
      const cardH = 290;
      const gap = 22;
      const startX = (this.width - (cardW * 3 + gap * 2)) / 2;
      const cardY = py + 94;

      for (let i = 0; i < CHESS_TEMPOS.length; i++) {
        const cx = startX + i * (cardW + gap);
        if (
          this.input.mouseX >= cx &&
          this.input.mouseX <= cx + cardW &&
          this.input.mouseY >= cardY &&
          this.input.mouseY <= cardY + cardH
        ) {
          this.tempo = CHESS_TEMPOS[i];
          StorageEngine.recordTempo(this.tempo.id);
          AudioEngine.playShopBuy();
          this.resetRun('PLAYING');
          return;
        }
      }
    }
  }

  _handleGambitShopInput() {
    if (
      this.input.consumeJustPressed('Space') ||
      this.input.consumeJustPressed('Tab') ||
      this.input.consumeJustPressed('Enter')
    ) {
      this.state = 'PLAYING';
      this.spawnBossForCurrentWave();
      AudioEngine.playClockClick();
      return;
    }

    // Skróty klawiszowe [1]-[4] do szybkiego awansu figury
    const promoClasses = ['knight', 'bishop', 'rook', 'queen'];
    const digitKeys = ['Digit1', 'Digit2', 'Digit3', 'Digit4'];
    for (let i = 0; i < 4; i++) {
      if (this.input.consumeJustPressed(digitKeys[i])) {
        this.promotePlayerClass(promoClasses[i]);
      }
    }

    if (this.input.consumeLeftClick()) {
      const panelW = 880;
      const panelH = 620;
      const px = (this.width - panelW) / 2;
      const py = (this.height - panelH) / 2;

      // 1. Kliknięcie kart promocji figury
      const promoW = 196;
      const promoH = 172;
      const promoGap = 16;
      const promoStartX = px + 24;
      const promoY = py + 84;

      for (let i = 0; i < promoClasses.length; i++) {
        const cx = promoStartX + i * (promoW + promoGap);
        if (
          this.input.mouseX >= cx &&
          this.input.mouseX <= cx + promoW &&
          this.input.mouseY >= promoY &&
          this.input.mouseY <= promoY + promoH
        ) {
          this.promotePlayerClass(promoClasses[i]);
          return;
        }
      }

      // 2. Kliknięcie kart perków i zdolności aktywnych
      const itemCols = 4;
      const itemW = 196;
      const itemH = 114;
      const itemGapX = 16;
      const itemGapY = 14;
      const itemStartX = px + 24;
      const itemStartY = py + 296;

      for (let i = 0; i < 8; i++) {
        const col = i % itemCols;
        const row = Math.floor(i / itemCols);
        const ix = itemStartX + col * (itemW + itemGapX);
        const iy = itemStartY + row * (itemH + itemGapY);

        if (
          this.input.mouseX >= ix &&
          this.input.mouseX <= ix + itemW &&
          this.input.mouseY >= iy &&
          this.input.mouseY <= iy + itemH
        ) {
          if (i < GAMBIT_SHOP_ITEMS.length) {
            this.buyGambitItem(GAMBIT_SHOP_ITEMS[i]);
          } else {
            // Karta #8: Rekonstrukcja (+2 HP za 4 żetony)
            if (this.gambitTokens >= 4 && this.player.hp < this.player.maxHp) {
              this.gambitTokens -= 4;
              this.player.hp = Math.min(this.player.maxHp, this.player.hp + 2);
              AudioEngine.playShopBuy();
            }
          }
          return;
        }
      }

      // 3. Przycisk powrotu na szachownicę na dole modala
      const btnW = 460;
      const btnH = 44;
      const bx = (this.width - btnW) / 2;
      const by = py + panelH - 58;
      if (
        this.input.mouseX >= bx &&
        this.input.mouseX <= bx + btnW &&
        this.input.mouseY >= by &&
        this.input.mouseY <= by + btnH
      ) {
        this.state = 'PLAYING';
        this.spawnBossForCurrentWave();
        AudioEngine.playClockClick();
      }
    }
  }

  update(dt) {
    // Pomiar FPS
    this._frameCounter++;
    this._fpsTimer += dt;
    if (this._fpsTimer >= 0.5) {
      this.fps = Math.round(this._frameCounter / this._fpsTimer);
      this._frameCounter = 0;
      this._fpsTimer = 0;
    }

    // Przełączanie palet graficznych w locie pod klawiszem T (dostępne zawsze)
    if (this.input.consumeJustPressed('KeyT')) {
      this.cycleTheme();
    }

    // Wywołanie ekranu wyboru Tempa pod klawiszem M
    if (this.input.consumeJustPressed('KeyM')) {
      this.state = 'SELECT_TEMPO';
      this.input.endFrame();
      return;
    }

    // Obsługa stanu wyboru Tempa (Rapid / Blitz / Bullet)
    if (this.state === 'SELECT_TEMPO') {
      this._handleTempoSelectInput();
      this.input.endFrame();
      return;
    }

    // Obsługa stanu Sklepu Gambitu i Drzewka Ewolucji
    if (this.state === 'GAMBIT_SHOP') {
      this._handleGambitShopInput();
      this.input.endFrame();
      return;
    }

    // Obsługa stanu VICTORY (po pokonaniu Czarnej Królowej / Hetmana i Ręki Arcymistrza)
    if (this.state === 'VICTORY') {
      this.time += dt;
      if (this.trauma > 0) this.trauma = Math.max(0, this.trauma - 1.6 * dt);
      if (this.victoryLockTimer > 0) this.victoryLockTimer -= dt;
      this._updateLasers(dt);
      this._updateParticles(dt);
      this._updateFloatingTexts(dt);
      this._updateAfterimages(dt);

      if (this.input.consumeJustPressed('KeyR')) {
        this.resetRun('PLAYING');
      } else if (
        (this.victoryLockTimer || 0) <= 0 &&
        (this.input.consumeJustPressed('Space') ||
          this.input.consumeJustPressed('Enter') ||
          this.input.consumeLeftClick())
      ) {
        // Odbudowa szachownicy do 8x8 i kontynuacja w trybie Endless
        this.board.setActiveGridSize(8, this.theme);
        this.grandmasterHand.active = false;
        this.hitstopTimer = 0;
        this.wave++;
        this.waveTimer = 0;
        this.state = 'PLAYING';
        AudioEngine.playPromotion();
      }
      this.input.endFrame();
      return;
    }

    // Przełączanie Auto-Fire pod klawiszem Q
    if (this.input.consumeJustPressed('KeyQ')) {
      this.autoFire = !this.autoFire;
      this.spawnFloatingText(
        this.autoFire ? 'AUTO-FIRE: ON' : 'AUTO-FIRE: OFF',
        this.player.x,
        this.player.y - 24,
        this.theme.uiAccent,
        0.95
      );
    }

    // Otwarcie Sklepu Gambitu i Awansu Figury w dowolnej chwili pod klawiszem TAB lub B (lub przyciskiem dotykowym)
    if (
      this.input.consumeJustPressed('Tab') ||
      this.input.consumeJustPressed('KeyB') ||
      (this.input.consumeTouchShop && this.input.consumeTouchShop())
    ) {
      this.openGambitShop();
      this.input.endFrame();
      return;
    }

    // Obsługa stanu GAME_OVER
    if (this.state === 'GAME_OVER') {
      this.time += dt;
      if (this.trauma > 0) this.trauma = Math.max(0, this.trauma - 1.6 * dt);
      this._updateLasers(dt);
      this._updateParticles(dt);
      this._updateFloatingTexts(dt);
      this._updateAfterimages(dt);

      if (
        this.input.consumeJustPressed('Space') ||
        this.input.consumeJustPressed('KeyR') ||
        this.input.consumeLeftClick()
      ) {
        this.resetRun('PLAYING');
      }
      this.input.endFrame();
      return;
    }

    // Jeśli okno iframe straciło focus (Bottleneck #3 Fix), zatrzymaj symulację
    if (!this.input.hasFocus) {
      this.input.endFrame();
      return;
    }

    // Wygaszanie Traumy kamery
    if (this.trauma > 0) {
      this.trauma = Math.max(0, this.trauma - 1.6 * dt);
    }

    // Hitstop (Frame-Freeze 45 ms wg specyfikacji 7.3)
    if (this.hitstopTimer > 0) {
      this.hitstopTimer -= dt;
      this.input.endFrame();
      return;
    }

    // Obsługa dotknięcia wroga w celu zablokowania namierzania (TOUCH-04: Touch Focus)
    if (this.state === 'PLAYING' && this.input.consumeTap) {
      const tap = this.input.consumeTap();
      if (tap) {
        const enemies = this.pools.enemies.items;
        const size = this.pools.enemies.size;
        let tappedEnemy = null;
        let minTDist = Infinity;
        for (let i = 0; i < size; i++) {
          const e = enemies[i];
          if (!e.active || e.hp <= 0) continue;
          const dist = Math.hypot(e.x - tap.x, e.y - tap.y);
          if (dist <= e.radius + 22 && dist < minTDist) {
            minTDist = dist;
            tappedEnemy = e;
          }
        }

        if (tappedEnemy) {
          this.lockedTarget = this.lockedTarget === tappedEnemy ? null : tappedEnemy;
          if (this.lockedTarget) {
            this.spawnFloatingText('CEL!', tappedEnemy.x, tappedEnemy.y - 20, '#ff4455', 0.6);
          }
        } else {
          // Tapnięcie w puste pole planszy usuwa blokadę celu
          const bounds = this.board.getBounds();
          if (tap.x >= bounds.left && tap.x <= bounds.right && tap.y >= bounds.top && tap.y <= bounds.bottom) {
            this.lockedTarget = null;
          }
        }
      }
    }

    this.time += dt;

    // Podczas walki z aktywnym Bossem licznik końca fali czeka na zbicie Bossa
    const activeBoss = this.getActiveBoss();
    if (!activeBoss) {
      this.waveTimer += dt;
      if (this.waveTimer >= this.waveDuration) {
        this.waveTimer = 0;
        this.wave++;
        StorageEngine.recordRunResult(this.tempo.id, this.wave, this.kills, false);
        this.spawnFloatingText(
          `FALA ${this.wave} — SKLEP GAMBITU!`,
          this.width / 2,
          this.board.getBounds().top + 40,
          this.theme.uiAccent,
          1.35
        );
        this.openGambitShop();
        this.input.endFrame();
        return;
      }
    }

    // Spowolnienie świata o 75% podczas zdolności Hetmana (Royal Majesty)
    const worldDt = this.player.royalMajestyTimer > 0 ? dt * 0.25 : dt;

    this._updateChessClock(worldDt);
    this._updatePlayer(dt);
    this._updateSpawner(worldDt);
    this._updateEnemies(worldDt);
    this._updateGrandmasterHand(worldDt);
    this._updateBullets(dt, worldDt);
    this._updateTokens(dt);
    this._updateLasers(dt);
    this._updateParticles(dt);
    this._updateFloatingTexts(dt);
    this._updateAfterimages(dt);

    this.input.endFrame();
  }

  _updateChessClock(dt) {
    if (!this.timeTrouble) {
      this.chessClock -= dt;
      if (this.chessClock <= 0) {
        this.chessClock = 0;
        this.timeTrouble = true;
        this.panicTimer = 5.0;
        this.addTrauma(0.5);
        AudioEngine.playTelegraphWarn();
        this.spawnFloatingText(
          'NIEDOCZAS! ZBIJ FIGURĘ W 5s!',
          this.player.x,
          this.player.y - 30,
          this.theme.uiDanger,
          1.2
        );
      }
    } else {
      this.panicTimer -= dt;
      if (this.panicTimer <= 0) {
        this.panicTimer = 0;
        this.triggerGameOver('FLAGA OPADŁA — MAT NA CZAS (TIME TROUBLE)');
      }
    }
  }

  _updatePlayer(dt) {
    const p = this.player;
    const bounds = this.board.getBounds();
    const cls = PLAYER_CLASSES[p.classId];

    if (p.invulnTimer > 0) p.invulnTimer -= dt;
    if (p.hitFlash > 0) p.hitFlash -= dt;
    if (p.fireCooldown > 0) p.fireCooldown -= dt;
    if (p.dashCooldown > 0) p.dashCooldown -= dt;
    if (p.royalMajestyTimer > 0) p.royalMajestyTimer -= dt;
    if (this.activeAbilityCooldown > 0) this.activeAbilityCooldown -= dt;

    // Regeneracja Tarczy Frontalnej Wieży (do 3 ładunków)
    if (p.classId === 'rook' && p.rookShieldCharges < 3) {
      p.rookShieldRegenTimer += dt;
      if (p.rookShieldRegenTimer >= 4.2) {
        p.rookShieldRegenTimer = 0;
        p.rookShieldCharges++;
        this.spawnFloatingText('+1 TARCZA', p.x, p.y - 24, '#55ddff', 0.9);
      }
    }

    // Obrót drona-pionka (Poświęcenie Pionka)
    this.droneAngle += dt * 3.8;

    // Powrót skali Squash & Stretch do 1.0
    p.scaleX += (1 - p.scaleX) * Math.min(1, dt * 16);
    p.scaleY += (1 - p.scaleY) * Math.min(1, dt * 16);

    // Użycie aktywnej zdolności Gambitu pod klawiszem [E] lub przyciskiem dotykowym
    if (
      (this.input.consumeJustPressed('KeyE') || (this.input.consumeTouchPerk && this.input.consumeTouchPerk())) &&
      this.activeAbilityId &&
      this.activeAbilityCooldown <= 0
    ) {
      this._triggerActiveGambit();
    }

    const move = this.input.getMoveVector();

    // Aktywacja zdolności specjalnej figury (Spacja, PPM lub przycisk ZRYW)
    const wantsSpecial =
      this.input.consumeJustPressed('Space') ||
      this.input.consumeRightClick() ||
      (this.input.consumeTouchDash && this.input.consumeTouchDash());
    const canSpecial =
      (p.dashCooldown <= 0 || p.royalMajestyTimer > 0) && p.dashTimer <= 0;

    if (wantsSpecial && canSpecial) {
      this._triggerClassSpecial(move, bounds, cls);
    }

    if (p.dashTimer > 0) {
      p.dashTimer -= dt;

      if (p.classId === 'knight') {
        // Knight's Leap: lot paraboliczny (nietykalność 0.6s) + lądowanie z falą uderzeniową AoE
        const progress = clamp(1 - p.dashTimer / 0.6, 0, 1);
        p.x = p.leapStartX + (p.leapTargetX - p.leapStartX) * progress;
        p.y = p.leapStartY + (p.leapTargetY - p.leapStartY) * progress;
        p.zHeight = Math.sin(progress * Math.PI) * 105;

        if (p.dashTimer <= 0) {
          p.zHeight = 0;
          p.scaleX = 1.4;
          p.scaleY = 0.65;
          this._triggerKnightLeapSlam(p.x, p.y);
        }
      } else {
        p.x += p.dashVx * dt;
        p.y += p.dashVy * dt;

        // Rook Charge: taranowanie wrogów na drodze i wbijanie ich w bandy stołu
        if (p.classId === 'rook') {
          this._updateRookChargeRamming(bounds);
        }
      }

      // Ślad poświaty (Afterimage) z aktualną sylwetką figury
      p.afterimageTick -= dt;
      if (p.afterimageTick <= 0) {
        p.afterimageTick = 0.025;
        const aft = this.pools.afterimages.acquire();
        if (aft) {
          aft.pieceType = p.classId;
          aft.x = p.x;
          aft.y = p.y - p.zHeight;
          aft.life = 0;
          aft.maxLife = 0.22;
          aft.alpha = 0.55;
        }
      }
    } else {
      p.zHeight = 0;
      const targetVx = move.x * p.speed;
      const targetVy = move.y * p.speed;
      const accel = 18;
      p.vx += (targetVx - p.vx) * Math.min(1, accel * dt);
      p.vy += (targetVy - p.vy) * Math.min(1, accel * dt);
      p.x += p.vx * dt;
      p.y += p.vy * dt;

      if (move.x !== 0 || move.y !== 0) {
        p.walkPhase += dt * 14;
      } else {
        p.walkPhase = 0;
      }
    }

    // Ograniczenie pozycji gracza do granic szachownicy
    const margin = p.radius + 6;
    p.x = clamp(p.x, bounds.left + margin, bounds.right - margin);
    p.y = clamp(p.y, bounds.top + margin, bounds.bottom - margin);

    // Strzał główny (LPM, Auto-Fire lub Auto-Aim na urządzeniach dotykowych)
    const isTouchShooting =
      (this.input.touchActive || this.input.isTouchDevice) &&
      (this.aimMode !== 'twinstick' || (this.input.rightStick && this.input.rightStick.active));
    if ((this.input.mouseDownLeft || this.autoFire || isTouchShooting) && p.fireCooldown <= 0) {
      this._firePlayerWeapon();
    }
  }

  _triggerActiveGambit() {
    const p = this.player;
    const bounds = this.board.getBounds();

    if (this.activeAbilityId === 'castling') {
      // ROSZADA (Spec 5): Natychmiastowa zamiana miejsc z klonem na przeciwległym rogu
      this.activeAbilityCooldown = 7.0;
      const oldX = p.x;
      const oldY = p.y;
      p.x = this.castlingCloneX;
      p.y = this.castlingCloneY;
      this.castlingCloneX = oldX;
      this.castlingCloneY = oldY;
      p.invulnTimer = Math.max(p.invulnTimer, 0.55);

      AudioEngine.playCastling();
      this.addTrauma(0.4);
      this.spawnShockwaveRing(oldX, oldY, 85, this.theme.uiAccent, 0.35);
      this.spawnShockwaveRing(p.x, p.y, 95, this.theme.bulletPlayer, 0.38);
      this.spawnParticles(oldX, oldY, 16, this.theme.uiAccent, 50, 190);
      this.spawnParticles(p.x, p.y, 18, this.theme.bulletPlayer, 50, 210);
      this.spawnFloatingText('ROSZADA!', p.x, p.y - 28, '#55ff99', 1.25);
    } else if (this.activeAbilityId === 'check_shout') {
      // OKRZYK "SZACH!" (Spec 5): Kasuje wszystkie wrogie pociski i zamraża wrogów na 1.5s
      this.activeAbilityCooldown = 8.5;
      AudioEngine.playCheckShout();
      this.addTrauma(0.65);
      this.triggerHitstop(0.05);
      this.spawnShockwaveRing(p.x, p.y, bounds.size * 0.85, '#55ff99', 0.45);
      this.spawnFloatingText('SZACH! (ZAMROŻENIE 1.5s)', p.x, p.y - 32, '#55ff99', 1.3);

      // Kasowanie wszystkich wrogich pocisków
      const bullets = this.pools.bullets.items;
      for (let i = 0; i < this.pools.bullets.size; i++) {
        const b = bullets[i];
        if (b.active && b.isEnemy) {
          this.spawnParticles(b.x, b.y, 4, this.theme.bulletPlayer, 30, 110);
          this.pools.bullets.release(b);
        }
      }

      // Zamrożenie wszystkich wrogów na 1.5s
      const enemies = this.pools.enemies.items;
      for (let i = 0; i < this.pools.enemies.size; i++) {
        const e = enemies[i];
        if (e.active) {
          e.frozenTimer = Math.max(e.frozenTimer, 1.5);
        }
      }
    }
  }

  _triggerClassSpecial(move, bounds, cls) {
    const p = this.player;
    let dx = move.x;
    let dy = move.y;
    if (dx === 0 && dy === 0) {
      const aimDx = this.input.mouseX - p.x;
      const aimDy = this.input.mouseY - p.y;
      const len = Math.hypot(aimDx, aimDy) || 1;
      dx = aimDx / len;
      dy = aimDy / len;
    }

    if (p.classId === 'knight') {
      // KNIGHT'S LEAP (Spec 3): Skok w powietrze (nietykalność 0.6s) + lądowanie w punkcie kursora z AoE
      p.leapStartX = p.x;
      p.leapStartY = p.y;
      const aimDx = this.input.mouseX - p.x;
      const aimDy = this.input.mouseY - p.y;
      const dist = Math.min(220, Math.hypot(aimDx, aimDy));
      const ang = Math.atan2(aimDy, aimDx);
      p.leapTargetX = clamp(p.x + Math.cos(ang) * dist, bounds.left + 22, bounds.right - 22);
      p.leapTargetY = clamp(p.y + Math.sin(ang) * dist, bounds.top + 22, bounds.bottom - 22);
      p.dashTimer = 0.6;
      p.dashCooldown = cls.dashCooldown;
      p.invulnTimer = Math.max(p.invulnTimer, 0.62);
      AudioEngine.playDash();
      this.spawnFloatingText("KNIGHT'S LEAP!", p.x, p.y - 26, this.theme.uiAccent, 1.1);
    } else if (p.classId === 'bishop') {
      // DIAGONAL CLEAVE (Spec 3): 4 krzyżowe lasery po przekątnych czyszczące linie widzenia
      p.dashVx = dx * 520;
      p.dashVy = dy * 520;
      p.dashTimer = 0.14;
      p.dashCooldown = cls.dashCooldown;
      this._fireDiagonalCleave(p.x, p.y, bounds);
    } else if (p.classId === 'rook') {
      // ROOK CHARGE (Spec 3): Błyskawiczna szarża przez planszę taranująca wrogów o ściany
      p.dashVx = dx * 760;
      p.dashVy = dy * 760;
      p.dashTimer = 0.28;
      p.dashCooldown = cls.dashCooldown;
      p.invulnTimer = Math.max(p.invulnTimer, 0.32);
      p.scaleX = 1.4;
      p.scaleY = 0.68;
      AudioEngine.playRookThud();
      this.addTrauma(0.35);
      this.spawnFloatingText('ROOK CHARGE!', p.x, p.y - 26, this.theme.uiAccent, 1.15);
    } else if (p.classId === 'queen') {
      // ROYAL MAJESTY (Spec 3): Spowolnienie czasu o 75% na 3s + nielimitowany dash
      if (p.royalMajestyTimer <= 0) {
        p.royalMajestyTimer = 3.0;
        p.dashCooldown = cls.dashCooldown;
        AudioEngine.playCheckShout();
        this.addTrauma(0.5);
        this.spawnShockwaveRing(p.x, p.y, 130, this.theme.uiAccent, 0.4);
        this.spawnFloatingText('ROYAL MAJESTY! (SLOW-MO 75%)', p.x, p.y - 32, this.theme.uiAccent, 1.25);
      }
      p.dashVx = dx * 680;
      p.dashVy = dy * 680;
      p.dashTimer = 0.15;
      AudioEngine.playDash();
    } else {
      // PIONEK: EN PASSANT DASH
      p.dashVx = dx * 620;
      p.dashVy = dy * 620;
      p.dashTimer = 0.16;
      p.dashCooldown = cls.dashCooldown;
      p.scaleX = 1.35;
      p.scaleY = 0.72;
      AudioEngine.playDash();
    }
  }

  _triggerKnightLeapSlam(x, y) {
    const slamRadius = 96;
    AudioEngine.playKnightSlam();
    this.addTrauma(0.55);
    this.triggerHitstop(0.045);
    this.spawnShockwaveRing(x, y, slamRadius, this.theme.bulletPlayer, 0.36);
    this.spawnParticles(x, y, 22, this.theme.bulletPlayer, 60, 220);

    // Kasowanie pobliskich pocisków wrogów
    const bullets = this.pools.bullets.items;
    for (let i = 0; i < this.pools.bullets.size; i++) {
      const b = bullets[i];
      if (b.active && b.isEnemy && distSq(x, y, b.x, b.y) <= slamRadius * slamRadius) {
        this.pools.bullets.release(b);
      }
    }

    // Obrażenia obszarowe AoE dla wrogów w zasięgu lądowania
    const enemies = this.pools.enemies.items;
    for (let i = 0; i < this.pools.enemies.size; i++) {
      const e = enemies[i];
      if (!e.active) continue;
      const rSum = slamRadius + e.radius;
      if (distSq(x, y, e.x, e.y) <= rSum * rSum) {
        const dx = e.x - x;
        const dy = e.y - y;
        this.damageEnemy(e, 3.5, dx * 4, dy * 4, true, true);
      }
    }
  }

  _fireDiagonalCleave(ox, oy, bounds) {
    AudioEngine.playBishopLaser();
    this.addTrauma(0.48);
    this.triggerHitstop(0.045);
    this.spawnFloatingText('DIAGONAL CLEAVE!', ox, oy - 28, this.theme.bulletPlayer, 1.2);

    const dirs = [
      [0.7071, 0.7071],
      [-0.7071, 0.7071],
      [0.7071, -0.7071],
      [-0.7071, -0.7071]
    ];

    const enemies = this.pools.enemies.items;
    const bullets = this.pools.bullets.items;

    for (let d = 0; d < 4; d++) {
      const exit = rayBoxExitPoint(ox, oy, dirs[d][0], dirs[d][1], bounds);
      this.spawnLaserBeam(ox, oy, exit.x, exit.y, false, 10, this.theme.bulletPlayer, 0.32);

      // Kolizja ciągła promienia z wrogami (Bottleneck #4 Fix)
      for (let i = 0; i < this.pools.enemies.size; i++) {
        const e = enemies[i];
        if (!e.active) continue;
        const hitR = e.radius + 10;
        if (distToSegmentSq(e.x, e.y, ox, oy, exit.x, exit.y) <= hitR * hitR) {
          this.damageEnemy(e, 3.0, dirs[d][0] * 300, dirs[d][1] * 300, true, true);
        }
      }

      // Kasowanie pocisków wrogów na linii przekątnej
      for (let i = 0; i < this.pools.bullets.size; i++) {
        const b = bullets[i];
        if (b.active && b.isEnemy) {
          if (distToSegmentSq(b.x, b.y, ox, oy, exit.x, exit.y) <= 22 * 22) {
            this.pools.bullets.release(b);
          }
        }
      }
    }
  }

  _updateRookChargeRamming(bounds) {
    const p = this.player;
    const enemies = this.pools.enemies.items;
    for (let i = 0; i < this.pools.enemies.size; i++) {
      const e = enemies[i];
      if (!e.active || e.hitFlash > 0) continue;
      const rSum = p.radius + e.radius + 8;
      if (distSq(p.x, p.y, e.x, e.y) <= rSum * rSum) {
        // Taranowanie i wbijanie wroga w stronę bandy stołu
        e.x += p.dashVx * 0.08;
        e.y += p.dashVy * 0.08;
        const hitWall =
          e.x <= bounds.left + 28 ||
          e.x >= bounds.right - 28 ||
          e.y <= bounds.top + 28 ||
          e.y >= bounds.bottom - 28;
        if (hitWall) {
          e.stunTimer = Math.max(e.stunTimer, 2.0);
          e.state = 'stunned';
          this.spawnFloatingText('WBITY W BANDĘ!', e.x, e.y - 22, this.theme.uiAccent, 1.1);
        }
        this.damageEnemy(e, hitWall ? 4.5 : 2.5, p.dashVx, p.dashVy, true, true);
      }
    }
  }

  _getAimAngle() {
    const p = this.player;

    // 1. Opcjonalny Twin-Stick Touch (TOUCH-05)
    if (this.aimMode === 'twinstick' && this.input.rightStick && this.input.rightStick.active) {
      this.lastAimAngle = this.input.rightStick.angle;
      return this.lastAimAngle;
    }

    // 2. Cel zablokowany przez tapnięcie / touch-focus (TOUCH-04)
    if (this.lockedTarget) {
      if (this.lockedTarget.active && this.lockedTarget.hp > 0) {
        this.lastAimAngle = Math.atan2(this.lockedTarget.y - p.y, this.lockedTarget.x - p.x);
        return this.lastAimAngle;
      }
      this.lockedTarget = null;
    }

    // 3. Auto-Aim na urządzeniach dotykowych lub przy aktywnym dotyku (TOUCH-03)
    if (this.input.isTouchDevice || this.input.touchActive) {
      let nearest = null;
      let minDistSq = Infinity;
      const enemies = this.pools.enemies.items;
      const size = this.pools.enemies.size;
      const px = p.x;
      const py = p.y;

      for (let i = 0; i < size; i++) {
        const e = enemies[i];
        if (!e.active || e.hp <= 0) continue;
        const dx = e.x - px;
        const dy = e.y - py;
        const dSq = dx * dx + dy * dy;
        if (dSq < minDistSq) {
          minDistSq = dSq;
          nearest = e;
        }
      }

      if (nearest) {
        this.lastAimAngle = Math.atan2(nearest.y - py, nearest.x - px);
        return this.lastAimAngle;
      }

      // W razie braku wrogów, celujemy w kierunku poruszania się
      const move = this.input.getMoveVector();
      if (move.x !== 0 || move.y !== 0) {
        this.lastAimAngle = Math.atan2(move.y, move.x);
        return this.lastAimAngle;
      }

      return this.lastAimAngle || 0;
    }

    // 4. Standardowe celowanie kursorem myszy na desktopie
    return Math.atan2(this.input.mouseY - p.y, this.input.mouseX - p.x);
  }

  _firePlayerWeapon() {
    const p = this.player;
    p.fireCooldown = p.fireRate;

    const angle = this._getAimAngle();
    const muzzleX = p.x + Math.cos(angle) * 14;
    const muzzleY = p.y - 6 + Math.sin(angle) * 14;

    const leadLvl = this.perks.lead_weight || 0;
    const forkLvl = this.perks.knights_fork || 0;
    const dmgMult = 1 + leadLvl * 0.25;
    const kbMult = 1 + leadLvl * 1.1;

    // Cecha pasywna Gońca i Hetmana: +20% CRIT przy strzale pod kątem ~45°
    const diagBonus =
      (p.classId === 'bishop' || p.classId === 'queen') && isNearDiagonalAngle(angle);
    const critChance = (diagBonus ? 0.35 : 0.08) + forkLvl * 0.15;
    const isCrit = Math.random() < critChance;
    const critMult = isCrit ? (diagBonus ? 1.7 : 1.5) : 1.0;

    if (p.classId === 'knight') {
      // SKOCZEK: Podwójny strzał podkowami rozchodzący się wachlarzowo
      const spd = 540;
      const spread = 0.15;
      for (let s = -1; s <= 1; s += 2) {
        const a = angle + s * spread;
        this.spawnBullet(
          muzzleX,
          muzzleY,
          Math.cos(a) * spd,
          Math.sin(a) * spd,
          false,
          6.0,
          1.15 * dmgMult * critMult,
          1.15,
          'horseshoe',
          0,
          0,
          isCrit,
          kbMult * 1.2
        );
      }
    } else if (p.classId === 'bishop') {
      // GONIEC: Szybki promień laserowy rykoszetujący 1x od bandy szachownicy
      const spd = 720;
      this.spawnBullet(
        muzzleX,
        muzzleY,
        Math.cos(angle) * spd,
        Math.sin(angle) * spd,
        false,
        5.0,
        1.35 * dmgMult * critMult,
        1.8,
        'laser_bolt',
        1,
        0,
        isCrit,
        kbMult
      );
    } else if (p.classId === 'rook') {
      // WIEŻA: Ciężkie, wolne kule artyleryjskie miażdżące wrogów
      const spd = 430;
      this.spawnBullet(
        muzzleX,
        muzzleY,
        Math.cos(angle) * spd,
        Math.sin(angle) * spd,
        false,
        8.5,
        2.6 * dmgMult * critMult,
        1.6,
        'artillery',
        0,
        1,
        isCrit,
        kbMult * 2.4
      );
    } else if (p.classId === 'queen') {
      // HETMAN: Ostrzał we wszystkich 8 kierunkach jednocześnie + rykoszet 1x
      const spd = 640;
      for (let d = 0; d < 8; d++) {
        const a = angle + (d * Math.PI) / 4;
        const isMain = d === 0;
        this.spawnBullet(
           p.x + Math.cos(a) * 14,
          p.y - 6 + Math.sin(a) * 14,
          Math.cos(a) * spd,
          Math.sin(a) * spd,
          false,
          isMain ? 6.5 : 4.8,
          (isMain ? 1.8 : 1.0) * dmgMult * critMult,
          1.45,
          'laser_bolt',
          isMain ? 1 : 0,
          0,
          isCrit && isMain,
          kbMult * 1.4
        );
      }
    } else {
      // PIONEK: Pojedynczy precyzyjny strzał wiórem drewna
      const spd = 590;
      this.spawnBullet(
        muzzleX,
        muzzleY,
        Math.cos(angle) * spd,
        Math.sin(angle) * spd,
        false,
        4.5,
        1.0 * dmgMult * critMult,
        1.3,
        'normal',
        0,
        0,
        isCrit,
        kbMult
      );
    }

    p.scaleX = 0.86;
    p.scaleY = 1.16;
    AudioEngine.playPawnShoot();
  }

  _updateSpawner(dt) {
    this.spawnTimer -= dt;
    if (this.spawnTimer <= 0) {
      const maxActive = Math.min(
        42,
        Math.round((6 + this.wave * 3) * this.tempo.spawnCountMult)
      );
      if (this.pools.enemies.activeCount < maxActive) {
        this.spawnEnemy();
      }
      const baseInterval =
        Math.max(0.45, 1.75 - this.wave * 0.12) / this.tempo.spawnCountMult;
      this.spawnTimer = this.timeTrouble ? baseInterval * 0.72 : baseInterval;
    }
  }

  _updateEnemies(dt) {
    const enemies = this.pools.enemies.items;
    const size = this.pools.enemies.size;
    const bounds = this.board.getBounds();
    const panicMult = this.timeTrouble ? 1.4 : 1.0; // Spec 2.2: +40% prędkości w Panic Mode
    const p = this.player;

    for (let i = 0; i < size; i++) {
      const e = enemies[i];
      if (!e.active) continue;

      if (e.hitFlash > 0) e.hitFlash -= dt;
      e.scaleX += (1 - e.scaleX) * Math.min(1, dt * 14);
      e.scaleY += (1 - e.scaleY) * Math.min(1, dt * 14);

      // Zamrożenie z Okrzyku "Szach!"
      if (e.frozenTimer > 0) {
        e.frozenTimer -= dt;
        continue;
      }

      // Przyszpilenie w miejscu z perka "Związanie" (Pinning Shot)
      if (e.pinnedTimer > 0) {
        e.pinnedTimer -= dt;
      }

      e.animPhase += dt * 8 * panicMult;

      if (e.type === 'pawn') {
        this._updateBlackPawn(e, dt, panicMult, bounds);
      } else if (e.type === 'knight') {
        this._updateBlackKnight(e, dt, panicMult, bounds);
      } else if (e.type === 'bishop') {
        this._updateBlackBishop(e, dt, panicMult, bounds);
      } else if (e.type === 'rook') {
        this._updateBlackRook(e, dt, panicMult, bounds);
      } else if (e.type === 'king') {
        this._updateBlackKing(e, dt, panicMult, bounds);
      } else if (e.type === 'black_queen') {
        this._updateBlackQueen(e, dt, panicMult, bounds);
      }

      // Kolizja kontaktowa wroga z graczem (tylko gdy wróg i gracz są na ziemi)
      if (e.zHeight < 20 && p.zHeight < 20) {
        const hitDist = e.radius + p.radius;
        if (distSq(e.x, e.y, p.x, p.y) <= hitDist * hitDist) {
          this.damagePlayer(1, e.x, e.y);
        }
      }
    }
  }

  // 1. Czarny Pionek (Spec 4.1: ruch ku graczowi + telegraf i szarża po skosie na 2 pola)
  _updateBlackPawn(e, dt, panicMult, bounds) {
    const p = this.player;
    const dx = p.x - e.x;
    const dy = p.y - e.y;
    const dist = Math.hypot(dx, dy) || 1;
    const moveScale = e.pinnedTimer > 0 ? 0 : 1;

    if (e.state === 'chase') {
      e.x += (dx / dist) * e.speed * panicMult * moveScale * dt;
      e.y += (dy / dist) * e.speed * panicMult * moveScale * dt;
      e.stateTimer -= dt * panicMult;

      const nearDiagonal = Math.abs(Math.abs(dx) - Math.abs(dy)) < 42;
      if (e.stateTimer <= 0 && (nearDiagonal || dist < 155)) {
        e.state = 'telegraph';
        e.stateTimer = this.tempo.telegraphBase / panicMult;
        e.startX = e.x;
        e.startY = e.y;

        const diagSignX = dx >= 0 ? 1 : -1;
        const diagSignY = dy >= 0 ? 1 : -1;
        const chargeDist = this.board.tileSize * 2;
        e.targetX = clamp(
          e.x + diagSignX * chargeDist * 0.7071,
          bounds.left + 18,
          bounds.right - 18
        );
        e.targetY = clamp(
          e.y + diagSignY * chargeDist * 0.7071,
          bounds.top + 18,
          bounds.bottom - 18
        );
        e.scaleX = 1.2;
        e.scaleY = 0.8;
      }
    } else if (e.state === 'telegraph') {
      e.stateTimer -= dt;
      if (e.stateTimer <= 0) {
        e.state = 'attack';
        e.stateTimer = 0.24;
        const tx = e.targetX - e.x;
        const ty = e.targetY - e.y;
        e.vx = tx / 0.24;
        e.vy = ty / 0.24;
        e.scaleX = 0.78;
        e.scaleY = 1.28;
      }
    } else if (e.state === 'attack') {
      e.x += e.vx * moveScale * dt;
      e.y += e.vy * moveScale * dt;
      e.stateTimer -= dt;
      if (e.stateTimer <= 0) {
        e.state = 'chase';
        e.stateTimer = 1.3 + Math.random() * 0.7;
      }
    }

    e.x = clamp(e.x, bounds.left + 16, bounds.right - 16);
    e.y = clamp(e.y, bounds.top + 16, bounds.bottom - 16);
  }

  // 2. Czarny Skoczek (Spec 4.2: cień w kształcie "L", skok 0.8s i pociski radialne)
  _updateBlackKnight(e, dt, panicMult, bounds) {
    const p = this.player;
    const tile = this.board.tileSize;
    const moveScale = e.pinnedTimer > 0 ? 0 : 1;

    if (e.state === 'chase') {
      const dx = p.x - e.x;
      const dy = p.y - e.y;
      const dist = Math.hypot(dx, dy) || 1;
      e.x += (dx / dist) * e.speed * panicMult * moveScale * dt;
      e.y += (dy / dist) * e.speed * panicMult * moveScale * dt;
      e.stateTimer -= dt * panicMult;

      if (e.stateTimer <= 0 && e.pinnedTimer <= 0) {
        e.state = 'telegraph';
        e.stateTimer = (this.tempo.telegraphBase * 1.1) / panicMult;
        e.startX = e.x;
        e.startY = e.y;

        const signX = p.x >= e.x ? 1 : -1;
        const signY = p.y >= e.y ? 1 : -1;
        const horizMajor = Math.abs(p.x - e.x) > Math.abs(p.y - e.y);
        const offsetX = (horizMajor ? 2 : 1) * tile * signX;
        const offsetY = (horizMajor ? 1 : 2) * tile * signY;

        e.targetX = clamp(e.x + offsetX, bounds.left + 24, bounds.right - 24);
        e.targetY = clamp(e.y + offsetY, bounds.top + 24, bounds.bottom - 24);
        AudioEngine.playTelegraphWarn();
      }
    } else if (e.state === 'telegraph') {
      e.stateTimer -= dt;
      e.scaleX = 1.22;
      e.scaleY = 0.76;
      if (e.stateTimer <= 0) {
        e.state = 'attack';
        e.stateTimer = 0.8;
        e.startX = e.x;
        e.startY = e.y;
      }
    } else if (e.state === 'attack') {
      e.stateTimer -= dt;
      const progress = clamp(1 - e.stateTimer / 0.8, 0, 1);
      e.x = e.startX + (e.targetX - e.startX) * progress;
      e.y = e.startY + (e.targetY - e.startY) * progress;
      e.zHeight = Math.sin(progress * Math.PI) * 115;

      if (e.stateTimer <= 0) {
        e.zHeight = 0;
        e.state = 'chase';
        e.stateTimer = 1.5 + Math.random() * 0.7;
        e.scaleX = 1.38;
        e.scaleY = 0.68;

        AudioEngine.playKnightSlam();
        this.addTrauma(0.42);
        this.spawnParticles(e.x, e.y, 14, this.theme.enemyOutline, 50, 170);

        const bulletCount = 8 * this.tempo.bulletHellDensity;
        const bulletSpeed = (this.timeTrouble ? 275 : 210) * this.tempo.bulletSpeedMult;
        for (let b = 0; b < bulletCount; b++) {
          const ang = (b / bulletCount) * Math.PI * 2;
          this.spawnBullet(
            e.x,
            e.y,
            Math.cos(ang) * bulletSpeed,
            Math.sin(ang) * bulletSpeed,
            true,
            5.5,
            1,
            3.0
          );
        }
      }
    }
  }

  // 3. Czarny Goniec (Spec 4.3: Snajper Przekątnych — ustawia się w narożnikach i ładuje laser diagonalny)
  _updateBlackBishop(e, dt, panicMult, bounds) {
    const p = this.player;
    const moveScale = e.pinnedTimer > 0 ? 0 : 1;

    if (e.state === 'chase') {
      const cornerX = e.x < bounds.left + bounds.size / 2 ? bounds.left + 44 : bounds.right - 44;
      const cornerY = e.y < bounds.top + bounds.size / 2 ? bounds.top + 44 : bounds.bottom - 44;
      const dx = cornerX - e.x;
      const dy = cornerY - e.y;
      const dist = Math.hypot(dx, dy) || 1;
      if (dist > 12) {
        e.x += (dx / dist) * e.speed * panicMult * moveScale * dt;
        e.y += (dy / dist) * e.speed * panicMult * moveScale * dt;
      }

      e.stateTimer -= dt * panicMult;
      if (e.stateTimer <= 0) {
        e.state = 'telegraph';
        e.stateTimer = (this.tempo.telegraphBase * 1.15) / panicMult;

        const signX = p.x >= e.x ? 0.7071 : -0.7071;
        const signY = p.y >= e.y ? 0.7071 : -0.7071;
        const exit = rayBoxExitPoint(e.x, e.y, signX, signY, bounds);
        e.laserX1 = e.x;
        e.laserY1 = e.y;
        e.laserX2 = exit.x;
        e.laserY2 = exit.y;
        AudioEngine.playTelegraphWarn();
      }
    } else if (e.state === 'telegraph') {
      e.stateTimer -= dt;
      e.scaleX = 0.88;
      e.scaleY = 1.18;
      if (e.stateTimer <= 0) {
        e.state = 'chase';
        e.stateTimer = 1.7 + Math.random() * 0.8;
        e.scaleX = 1.3;
        e.scaleY = 0.75;

        AudioEngine.playBishopLaser();
        this.addTrauma(0.36);
        this.spawnLaserBeam(
          e.laserX1,
          e.laserY1,
          e.laserX2,
          e.laserY2,
          true,
          12,
          this.timeTrouble ? '#ff1a1a' : this.theme.bulletEnemy,
          0.32
        );

        if (p.zHeight < 20) {
          const hitR = p.radius + 7;
          if (
            distToSegmentSq(p.x, p.y, e.laserX1, e.laserY1, e.laserX2, e.laserY2) <=
            hitR * hitR
          ) {
            if (p.dashTimer > 0 && p.classId === 'pawn') {
              AudioEngine.playParryBullet();
              this.addClockIncrement(1.0, p.x, p.y - 12);
              this.spawnFloatingText('EN PASSANT LASER!', p.x, p.y - 32, this.theme.bulletPlayer, 1.15);
            } else {
              this.damagePlayer(1, e.x, e.y);
            }
          }
        }
      }
    }
  }

  // 4. Czarna Wieża (Spec 4.4: Niezniszczalna od frontu, szarża kardynalna + ogłuszenie 2s po uderzeniu w bandę)
  _updateBlackRook(e, dt, panicMult, bounds) {
    const p = this.player;
    const moveScale = e.pinnedTimer > 0 ? 0 : 1;

    if (e.state === 'stunned') {
      e.stunTimer -= dt;
      if (e.stunTimer <= 0) {
        e.state = 'chase';
        e.stateTimer = 1.1;
      }
      return;
    }

    if (e.state === 'chase') {
      const dx = p.x - e.x;
      const dy = p.y - e.y;
      const dist = Math.hypot(dx, dy) || 1;
      e.x += (dx / dist) * e.speed * panicMult * moveScale * dt;
      e.y += (dy / dist) * e.speed * panicMult * moveScale * dt;

      e.facingAngle = Math.atan2(dy, dx);
      e.stateTimer -= dt * panicMult;

      if (e.stateTimer <= 0 && e.pinnedTimer <= 0) {
        e.state = 'telegraph';
        e.stateTimer = (this.tempo.telegraphBase * 1.1) / panicMult;
        e.startX = e.x;
        e.startY = e.y;

        if (Math.abs(dx) >= Math.abs(dy)) {
          const dirX = dx >= 0 ? 1 : -1;
          e.facingAngle = dirX > 0 ? 0 : Math.PI;
          e.targetX = dirX > 0 ? bounds.right - 18 : bounds.left + 18;
          e.targetY = e.y;
          e.vx = dirX * 490 * panicMult;
          e.vy = 0;
        } else {
          const dirY = dy >= 0 ? 1 : -1;
          e.facingAngle = dirY > 0 ? Math.PI / 2 : -Math.PI / 2;
          e.targetX = e.x;
          e.targetY = dirY > 0 ? bounds.bottom - 18 : bounds.top + 18;
          e.vx = 0;
          e.vy = dirY * 490 * panicMult;
        }
        AudioEngine.playTelegraphWarn();
      }
    } else if (e.state === 'telegraph') {
      e.stateTimer -= dt;
      e.scaleX = 1.25;
      e.scaleY = 0.78;
      if (e.stateTimer <= 0) {
        e.state = 'attack';
        e.stateTimer = 1.4;
      }
    } else if (e.state === 'attack') {
      e.x += e.vx * moveScale * dt;
      e.y += e.vy * moveScale * dt;

      const hitHorizontal = e.vx !== 0 && (e.x <= bounds.left + 19 || e.x >= bounds.right - 19);
      const hitVertical = e.vy !== 0 && (e.y <= bounds.top + 19 || e.y >= bounds.bottom - 19);

      if (hitHorizontal || hitVertical) {
        e.x = clamp(e.x, bounds.left + 19, bounds.right - 19);
        e.y = clamp(e.y, bounds.top + 19, bounds.bottom - 19);
        e.state = 'stunned';
        e.stunTimer = 2.0;
        e.scaleX = 1.42;
        e.scaleY = 0.62;
        AudioEngine.playRookThud();
        this.addTrauma(0.52);
        this.spawnParticles(e.x, e.y, 18, this.theme.enemyOutline, 50, 190);
        this.spawnFloatingText('OGŁUSZONA! (2.0s)', e.x, e.y - 26, '#ffdd33', 1.05);
      }
    }
  }

  // 5. Mini-Boss: Czarny Król (Spec 4.5: tarcza z 4 orbitujących pionków + 32 pociski po okręgu co 5s + posiłki)
  _updateBlackKing(e, dt, panicMult, bounds) {
    const p = this.player;
    const dx = p.x - e.x;
    const dy = p.y - e.y;
    const dist = Math.hypot(dx, dy) || 1;
    const moveScale = e.pinnedTimer > 0 ? 0 : 1;

    e.x = clamp(
      e.x + (dx / dist) * e.speed * panicMult * moveScale * dt,
      bounds.left + 32,
      bounds.right - 32
    );
    e.y = clamp(
      e.y + (dy / dist) * e.speed * panicMult * moveScale * dt,
      bounds.top + 32,
      bounds.bottom - 32
    );

    // Aktualizacja 4 orbitujących pionków-tarcz
    let activeShields = 0;
    for (let i = 0; i < 4; i++) {
      const sp = this.kingShieldPawns[i];
      if (!sp.active) continue;
      activeShields++;
      if (sp.hitFlash > 0) sp.hitFlash -= dt;
      sp.angle += dt * 2.4 * panicMult;
      sp.x = e.x + Math.cos(sp.angle) * 48;
      sp.y = e.y + Math.sin(sp.angle) * 48;

      if (p.zHeight < 20 && distSq(sp.x, sp.y, p.x, p.y) <= (11 + p.radius) * (11 + p.radius)) {
        this.damagePlayer(1, sp.x, sp.y);
      }
    }
    this.kingShieldCount = activeShields;

    e.stateTimer -= dt * panicMult;
    if (e.stateTimer <= 0) {
      e.stateTimer = 5.0; // Spec 4.5: co 5 sekund radialny bullet-hell (32 pociski) i posiłki!
      e.scaleX = 1.35;
      e.scaleY = 0.72;
      AudioEngine.playKnightSlam();
      this.addTrauma(0.55);
      this.spawnFloatingText('KRÓLEWSKA SALWA (32 POCISKI)!', e.x, e.y - 34, this.theme.uiDanger, 1.15);

      const bulletCount = 32;
      const spd = (this.timeTrouble ? 255 : 195) * this.tempo.bulletSpeedMult;
      for (let b = 0; b < bulletCount; b++) {
        const ang = (b / bulletCount) * Math.PI * 2;
        this.spawnBullet(e.x, e.y, Math.cos(ang) * spd, Math.sin(ang) * spd, true, 5.5, 1, 3.8);
      }

      // Przyzwanie posiłków
      if (this.pools.enemies.activeCount < 18) {
        this.spawnEnemy('pawn');
        this.spawnEnemy('knight');
      }
    }
  }

  // 6. Boss Finałowy: Czarna Królowa & Ręka Arcymistrza (Spec 4.6)
  _updateBlackQueen(e, dt, panicMult, bounds) {
    const p = this.player;
    const hpRatio = e.hp / e.maxHp;

    // Faza 2: Przywołanie Ręki Arcymistrza niszczącej zewnętrzne kafelki (8x8 -> 6x6 -> 4x4)
    if (hpRatio <= 0.72 && this.queenShrinkStage === 0 && !this.grandmasterHand.active) {
      this.queenShrinkStage = 1;
      this._summonGrandmasterHand(6);
    } else if (hpRatio <= 0.38 && this.queenShrinkStage === 1 && !this.grandmasterHand.active) {
      this.queenShrinkStage = 2;
      this._summonGrandmasterHand(4);
    }

    if (e.state === 'chase') {
      const dx = p.x - e.x;
      const dy = p.y - e.y;
      const dist = Math.hypot(dx, dy) || 1;
      e.x = clamp(e.x + (dx / dist) * e.speed * dt, bounds.left + 26, bounds.right - 26);
      e.y = clamp(e.y + (dy / dist) * e.speed * dt, bounds.top + 26, bounds.bottom - 26);

      e.stateTimer -= dt * panicMult;
      if (e.stateTimer <= 0) {
        e.state = 'telegraph';
        e.stateTimer = (this.tempo.telegraphBase * 0.95) / panicMult;
        // Wybór losowego kafelka wewnątrz aktywnej szachownicy do teleportacji
        const pad = 42;
        e.targetX = bounds.left + pad + Math.random() * Math.max(40, bounds.size - pad * 2);
        e.targetY = bounds.top + pad + Math.random() * Math.max(40, bounds.size - pad * 2);
        AudioEngine.playTelegraphWarn();
      }
    } else if (e.state === 'telegraph') {
      e.stateTimer -= dt;
      e.scaleX = 0.8;
      e.scaleY = 1.25;
      if (e.stateTimer <= 0) {
        // Teleportacja na kafelek docelowy + kombinacja laserów Gońca i salwy Wieży!
        this.spawnParticles(e.x, e.y, 16, this.theme.enemyOutline, 50, 180);
        e.x = e.targetX;
        e.y = e.targetY;
        e.state = 'chase';
        e.stateTimer = 1.85;
        e.scaleX = 1.35;
        e.scaleY = 0.72;

        AudioEngine.playBishopLaser();
        this.addTrauma(0.5);

        // 1) Lasery diagonalne Gońca z nowej pozycji Królowej
        const diagDirs = [
          [0.7071, 0.7071],
          [-0.7071, 0.7071],
          [0.7071, -0.7071],
          [-0.7071, -0.7071]
        ];
        for (let d = 0; d < 4; d++) {
          const exit = rayBoxExitPoint(e.x, e.y, diagDirs[d][0], diagDirs[d][1], bounds);
          this.spawnLaserBeam(e.x, e.y, exit.x, exit.y, true, 10, this.theme.bulletEnemy, 0.3);
          if (p.zHeight < 20) {
            const hitR = p.radius + 6;
            if (distToSegmentSq(p.x, p.y, e.x, e.y, exit.x, exit.y) <= hitR * hitR) {
              this.damagePlayer(1, e.x, e.y);
            }
          }
        }

        // 2) Salwa kardynalna + pośrednia (12 pocisków)
        const count = 12 * this.tempo.bulletHellDensity;
        const spd = 230 * this.tempo.bulletSpeedMult;
        for (let b = 0; b < count; b++) {
          const ang = (b / count) * Math.PI * 2;
          this.spawnBullet(e.x, e.y, Math.cos(ang) * spd, Math.sin(ang) * spd, true, 5.5, 1, 3.2);
        }
      }
    }
  }

  _summonGrandmasterHand(targetGridSize) {
    const bounds = this.board.getBounds();
    this.grandmasterHand.active = true;
    this.grandmasterHand.state = 'shadow';
    this.grandmasterHand.timer = 1.35;
    this.grandmasterHand.x = bounds.left + bounds.size / 2;
    this.grandmasterHand.y = bounds.top + bounds.size / 2;
    this.grandmasterHand.zHeight = 260;
    this.grandmasterHand.targetGridSize = targetGridSize;
    AudioEngine.playBossWarning();
    this.spawnFloatingText(
      `✋ RĘKA ARCYMISTRZA NADCHODZI (${targetGridSize}x${targetGridSize})! ✋`,
      this.width / 2,
      bounds.top + 32,
      this.theme.uiDanger,
      1.3
    );
  }

  _updateGrandmasterHand(dt) {
    const h = this.grandmasterHand;
    if (!h.active) return;

    h.timer -= dt;
    if (h.state === 'shadow') {
      // Dłoń opada znad szachownicy
      h.zHeight = Math.max(0, (h.timer / 1.35) * 260);
      if (h.timer <= 0) {
        h.state = 'slam';
        h.timer = 0.65;
        h.zHeight = 0;

        // Fizyczne uderzenie w stół i skruszenie zewnętrznych kafelków szachownicy!
        this.board.setActiveGridSize(h.targetGridSize, this.theme);
        const newBounds = this.board.getBounds();

        AudioEngine.playGrandmasterSlam();
        this.addTrauma(0.95);
        this.triggerHitstop(0.07);
        this.spawnShockwaveRing(h.x, h.y, newBounds.size * 0.75, this.theme.uiDanger, 0.5);
        this.spawnParticles(h.x, h.y, 42, this.theme.tileLight, 80, 290);
        this.spawnFloatingText(
          `SZACHOWNICA SKRUSZONA DO ${h.targetGridSize}x${h.targetGridSize}!`,
          h.x,
          h.y - 30,
          this.theme.uiDanger,
          1.35
        );

        // Wepchnięcie gracza i wrogów do wnętrza zmniejszonej areny
        const margin = this.player.radius + 8;
        this.player.x = clamp(this.player.x, newBounds.left + margin, newBounds.right - margin);
        this.player.y = clamp(this.player.y, newBounds.top + margin, newBounds.bottom - margin);
        this._updateCastlingClonePos();

        const enemies = this.pools.enemies.items;
        for (let i = 0; i < this.pools.enemies.size; i++) {
          const e = enemies[i];
          if (!e.active) continue;
          e.x = clamp(e.x, newBounds.left + 22, newBounds.right - 22);
          e.y = clamp(e.y, newBounds.top + 22, newBounds.bottom - 22);
        }
      }
    } else if (h.state === 'slam') {
      if (h.timer <= 0) {
        h.state = 'recover';
        h.timer = 0.7;
      }
    } else if (h.state === 'recover') {
      h.zHeight = (1 - h.timer / 0.7) * 280;
      if (h.timer <= 0) {
        h.active = false;
      }
    }
  }

  _updateBullets(dt, worldDt = dt) {
    const bullets = this.pools.bullets.items;
    const bSize = this.pools.bullets.size;
    const enemies = this.pools.enemies.items;
    const eSize = this.pools.enemies.size;
    const bounds = this.board.getBounds();
    const p = this.player;
    const playerAimAngle = Math.atan2(this.input.mouseY - p.y, this.input.mouseX - p.x);

    for (let i = 0; i < bSize; i++) {
      const b = bullets[i];
      if (!b.active) continue;

      const stepDt = b.isEnemy ? worldDt : dt;
      b.prevX = b.x;
      b.prevY = b.y;
      b.x += b.vx * stepDt;
      b.y += b.vy * stepDt;
      b.life += stepDt;

      // Rykoszet pocisków Gońca i Hetmana od band szachownicy (1x odbicie wg Spec 3)
      if (!b.isEnemy && b.bouncesLeft > 0) {
        let bounced = false;
        if (b.x <= bounds.left + 6 || b.x >= bounds.right - 6) {
          b.vx = -b.vx;
          b.x = clamp(b.x, bounds.left + 7, bounds.right - 7);
          bounced = true;
        }
        if (b.y <= bounds.top + 6 || b.y >= bounds.bottom - 6) {
          b.vy = -b.vy;
          b.y = clamp(b.y, bounds.top + 7, bounds.bottom - 7);
          bounced = true;
        }
        if (bounced) {
          b.bouncesLeft--;
          b.rotation = Math.atan2(b.vy, b.vx);
          AudioEngine.playShieldDeflect();
          this.spawnParticles(b.x, b.y, 5, this.theme.bulletPlayer, 35, 110);
        }
      }

      if (
        b.life >= b.maxLife ||
        b.x < bounds.left - 18 ||
        b.x > bounds.right + 18 ||
        b.y < bounds.top - 18 ||
        b.y > bounds.bottom + 18
      ) {
        this.spawnParticles(
          b.x,
          b.y,
          3,
          b.isEnemy ? this.theme.bulletEnemy : this.theme.bulletPlayer,
          25,
          80
        );
        this.pools.bullets.release(b);
        continue;
      }

      if (b.isEnemy) {
        if (p.zHeight > 22) continue;

        const hitPlayer = sweptCircleCollision(
          b.prevX,
          b.prevY,
          b.x,
          b.y,
          b.radius,
          p.x,
          p.y,
          p.radius + (p.dashTimer > 0 ? 6 : 0)
        );

        if (hitPlayer) {
          if (p.dashTimer > 0) {
            this.pools.bullets.release(b);
            AudioEngine.playParryBullet();
            this.triggerHitstop(0.035);
            this.addTrauma(0.25);
            this.addClockIncrement(1.0, p.x, p.y - 12);
            this.spawnFloatingText(
              'EN PASSANT!',
              p.x,
              p.y - 32,
              this.theme.bulletPlayer,
              1.15
            );
            this.spawnParticles(b.x, b.y, 12, this.theme.bulletPlayer, 60, 200);
          } else if (p.classId === 'rook' && p.rookShieldCharges > 0) {
            const incAngle = Math.atan2(b.prevY - p.y, b.prevX - p.x);
            if (Math.abs(angleDiff(incAngle, playerAimAngle)) <= 1.25) {
              p.rookShieldCharges--;
              p.rookShieldRegenTimer = 0;
              this.pools.bullets.release(b);
              AudioEngine.playShieldDeflect();
              this.addTrauma(0.18);
              this.spawnParticles(b.x, b.y, 10, '#55ddff', 40, 150);
              this.spawnFloatingText(
                `TARCZA! (${p.rookShieldCharges}/3)`,
                p.x,
                p.y - 26,
                '#55ddff',
                1.0
              );
              continue;
            }
            this.pools.bullets.release(b);
            this.damagePlayer(b.damage, b.x, b.y);
          } else {
            this.pools.bullets.release(b);
            this.damagePlayer(b.damage, b.x, b.y);
          }
        }
      } else {
        // 1. Sprawdzenie kolizji pocisku gracza z 4 orbitującymi pionkami-tarczami Czarnego Króla (Spec 4.5)
        let blockedByKingShield = false;
        for (let s = 0; s < 4; s++) {
          const sp = this.kingShieldPawns[s];
          if (!sp.active) continue;
          if (sweptCircleCollision(b.prevX, b.prevY, b.x, b.y, b.radius, sp.x, sp.y, 12)) {
            sp.hp -= b.damage;
            sp.hitFlash = 0.1;
            this.pools.bullets.release(b);
            blockedByKingShield = true;
            if (sp.hp <= 0) {
              sp.active = false;
              AudioEngine.playPieceShatter();
              this.spawnParticles(sp.x, sp.y, 14, this.theme.enemyFill, 50, 190);
              this.addClockIncrement(0.8, sp.x, sp.y);
            } else {
              AudioEngine.playShieldDeflect();
              this.spawnParticles(b.x, b.y, 6, this.theme.bulletPlayer, 35, 110);
            }
            break;
          }
        }
        if (blockedByKingShield) continue;

        // 2. Pocisk gracza vs Wrogowie
        for (let j = 0; j < eSize; j++) {
          const e = enemies[j];
          if (!e.active || e.zHeight > 28) continue;

          if (
            sweptCircleCollision(
              b.prevX,
              b.prevY,
              b.x,
              b.y,
              b.radius,
              e.x,
              e.y,
              e.radius
            )
          ) {
            if (e.type === 'rook' && e.state !== 'stunned' && e.frozenTimer <= 0) {
              const hitFromAngle = Math.atan2(b.prevY - e.y, b.prevX - e.x);
              if (Math.abs(angleDiff(hitFromAngle, e.facingAngle)) < 1.2) {
                this.pools.bullets.release(b);
                AudioEngine.playShieldDeflect();
                this.spawnParticles(b.x, b.y, 7, '#ffffff', 40, 130);
                this.spawnFloatingText('PANCERZ CZOŁOWY!', e.x, e.y - 22, '#cccccc', 0.85);
                break;
              }
            }

            this.damageEnemy(
              e,
              b.damage,
              b.vx,
              b.vy,
              b.isCrit,
              b.kind === 'fork_shard',
              b.knockbackMult
            );

            if (b.pierceLeft > 0) {
              b.pierceLeft--;
            } else {
              this.pools.bullets.release(b);
              break;
            }
          }
        }
      }
    }
  }

  damageEnemy(
    e,
    dmg,
    bulletVx,
    bulletVy,
    isCrit = false,
    isShard = false,
    knockbackMult = 1
  ) {
    if (!e || !e.active) return;
    const isBoss = e.type === 'king' || e.type === 'black_queen';
    const stunBonus = e.type === 'rook' && e.state === 'stunned' ? 1.5 : 1.0;
    // Czarny Król otrzymuje zredukowane obrażenia, dopóki żyją jego pionki-tarcze
    const kingShieldResist = e.type === 'king' && this.kingShieldCount > 0 ? 0.5 : 1.0;
    const finalDmg = dmg * stunBonus * kingShieldResist;
    e.hp -= finalDmg;
    e.hitFlash = 0.09;
    e.scaleX = 1.22;
    e.scaleY = 0.8;

    const bounds = this.board.getBounds();
    const len = Math.hypot(bulletVx, bulletVy) || 1;
    const kbDist = (isBoss ? 2.0 : 6.5) * knockbackMult;
    e.x = clamp(e.x + (bulletVx / len) * kbDist, bounds.left + 20, bounds.right - 20);
    e.y = clamp(e.y + (bulletVy / len) * kbDist, bounds.top + 20, bounds.bottom - 20);

    if (isCrit) {
      this.triggerHitstop(0.035);
      this.spawnFloatingText('CRIT!', e.x, e.y - 22, this.theme.uiAccent, 1.05);
    }

    const pinLvl = this.perks.pinning_shot || 0;
    if (!isBoss && pinLvl > 0 && Math.random() < 0.25 * pinLvl && e.pinnedTimer <= 0) {
      e.pinnedTimer = 1.5;
      this.spawnFloatingText('ZWIĄZANIE!', e.x, e.y - 30, '#55ddff', 0.95);
    }

    const forkLvl = this.perks.knights_fork || 0;
    if (isCrit && !isShard && forkLvl > 0) {
      this._spawnKnightForkShards(e, forkLvl);
    }

    if (e.hp <= 0) {
      // Inkrement Zegara Szachowego wg Specyfikacji 2.2:
      // Pionek +0.8s, Skoczek/Goniec +2.0s, Wieża +3.5s, Boss +10.0s
      const inc = isBoss
        ? 10.0
        : e.type === 'rook'
        ? 3.5
        : e.type === 'knight' || e.type === 'bishop'
        ? 2.0
        : 0.8;
      const baseTokens = isBoss
        ? 14
        : e.type === 'rook'
        ? 4
        : e.type === 'knight' || e.type === 'bishop'
        ? 2
        : 1;

      this.kills++;
      this.tokenResidual += baseTokens * this.tempo.tokenDropMult;
      const dropCount = Math.floor(this.tokenResidual);
      this.tokenResidual -= dropCount;

      for (let t = 0; t < dropCount; t++) {
        this.spawnToken(e.x, e.y, 1);
      }

      this.addClockIncrement(inc, e.x, e.y);
      this.triggerHitstop(isBoss ? 0.08 : 0.045);
      this.addTrauma(isBoss ? 0.95 : e.type === 'rook' ? 0.65 : e.type === 'pawn' ? 0.34 : 0.52);
      AudioEngine.playPieceShatter();

      this.spawnParticles(
        e.x,
        e.y,
        isBoss ? 48 : e.type === 'pawn' ? 15 : 24,
        this.theme.enemyFill,
        50,
        260
      );
      this.spawnParticles(e.x, e.y, isBoss ? 24 : 10, this.theme.enemyOutline, 70, 230);

      const defeatedType = e.type;
      this.pools.enemies.release(e);

      if (defeatedType === 'king') {
        for (let i = 0; i < 4; i++) this.kingShieldPawns[i].active = false;
        this.kingShieldCount = 0;
        StorageEngine.profile.bossesDefeated++;
        StorageEngine.unlockAchievement('mad_king', 'Pogromca Szalonego Króla');
        StorageEngine.recordRunResult(this.tempo.id, this.wave, this.kills, false);
        this.spawnFloatingText('👑 CZARNY KRÓL ZBITY! (+10.0s) 👑', e.x, e.y - 36, '#55ff99', 1.35);
      } else if (defeatedType === 'black_queen') {
        this.grandmasterHand.active = false;
        this.hitstopTimer = 0;
        this.victoryLockTimer = 0.65;
        this.spawnShockwaveRing(e.x, e.y, 260, '#55ff99', 0.55);
        this.spawnFloatingText('👑 MAT ARCYMISTRZA! (+10.0s) 👑', e.x, e.y - 36, '#55ff99', 1.4);

        const bullets = this.pools.bullets.items;
        for (let bIdx = 0; bIdx < this.pools.bullets.size; bIdx++) {
          if (bullets[bIdx].active && bullets[bIdx].isEnemy) {
            this.pools.bullets.release(bullets[bIdx]);
          }
        }

        StorageEngine.profile.bossesDefeated++;
        StorageEngine.unlockAchievement('grandmaster', 'Arcymistrz Szachownicy');
        if (this.tempo.id === 'bullet') {
          StorageEngine.unlockAchievement('bullet_god', 'Bóg Tempa Bullet');
        }
        StorageEngine.recordRunResult(this.tempo.id, this.wave, this.kills, true);
        this.collectAllBoardTokens();
        this.state = 'VICTORY';
      }
    } else {
      AudioEngine.playHitEnemy();
      this.addTrauma(0.12);
      this.spawnParticles(e.x, e.y, 6, this.theme.bulletPlayer, 40, 140);
    }
  }

  _spawnKnightForkShards(sourceEnemy, forkLvl) {
    const enemies = this.pools.enemies.items;
    const size = this.pools.enemies.size;
    let spawned = 0;

    for (let i = 0; i < size && spawned < 2; i++) {
      const target = enemies[i];
      if (!target.active || target === sourceEnemy) continue;
      const dx = target.x - sourceEnemy.x;
      const dy = target.y - sourceEnemy.y;
      const len = Math.hypot(dx, dy) || 1;
      if (len < 320) {
        const spd = 620;
        this.spawnBullet(
          sourceEnemy.x,
          sourceEnemy.y,
          (dx / len) * spd,
          (dy / len) * spd,
          false,
          4.0,
          0.85 * forkLvl,
          0.9,
          'fork_shard',
          1,
          0,
          false,
          1
        );
        spawned++;
      }
    }
  }

  damagePlayer(dmg, sourceX, sourceY) {
    const p = this.player;
    if (p.invulnTimer > 0 || p.dashTimer > 0 || p.zHeight > 20) return;

    // Perk: Poświęcenie Pionka (Sacrifice Drone) — przyjmuje śmiertelny/dowolny cios i wybucha czyszcząc ekran!
    if (this.droneActive) {
      this.droneActive = false;
      p.invulnTimer = 1.1;
      AudioEngine.playCheckShout();
      this.addTrauma(0.7);
      this.triggerHitstop(0.055);
      this.spawnShockwaveRing(p.x, p.y, 260, this.theme.uiAccent, 0.45);
      this.spawnParticles(p.x, p.y, 28, this.theme.bulletPlayer, 70, 250);
      this.spawnFloatingText(
        'POŚWIĘCENIE PIONKA! (EKRAN CZYSTY)',
        p.x,
        p.y - 34,
        this.theme.uiAccent,
        1.25
      );

      const bullets = this.pools.bullets.items;
      for (let i = 0; i < this.pools.bullets.size; i++) {
        const b = bullets[i];
        if (b.active && b.isEnemy) {
          this.pools.bullets.release(b);
        }
      }
      return;
    }

    p.hp -= dmg;
    p.invulnTimer = 0.85;
    p.hitFlash = 0.2;
    p.scaleX = 1.35;
    p.scaleY = 0.65;

    const dx = p.x - sourceX;
    const dy = p.y - sourceY;
    const len = Math.hypot(dx, dy) || 1;
    p.vx = (dx / len) * 280;
    p.vy = (dy / len) * 280;

    AudioEngine.playPlayerHurt();
    this.addTrauma(0.75);
    this.triggerHitstop(0.06);
    this.spawnParticles(p.x, p.y, 18, this.theme.uiDanger, 60, 230);

    if (p.hp <= 0) {
      p.hp = 0;
      const cls = PLAYER_CLASSES[p.classId];
      this.triggerGameOver(`TWOJA FIGURA (${cls.name}) ZOSTAŁA ZBITA — SZACH I MAT`);
    }
  }

  triggerGameOver(reason) {
    this.state = 'GAME_OVER';
    this.gameOverReason = reason;
    this.addTrauma(0.9);
    AudioEngine.playPieceShatter();
    StorageEngine.recordRunResult(this.tempo.id, this.wave, this.kills, false);
  }

  _updateTokens(dt) {
    const items = this.pools.tokens.items;
    const size = this.pools.tokens.size;
    const bounds = this.board.getBounds();
    const p = this.player;

    for (let i = 0; i < size; i++) {
      const tk = items[i];
      if (!tk.active) continue;

      tk.life += dt;
      tk.bobPhase += dt * 7;
      if (tk.life >= tk.maxLife) {
        this.pools.tokens.release(tk);
        continue;
      }

      // Przyciąganie magnetyczne żetonów w stronę gracza
      const dx = p.x - tk.x;
      const dy = p.y - tk.y;
      const d2 = dx * dx + dy * dy;
      if (d2 < 145 * 145) {
        const d = Math.sqrt(d2) || 1;
        tk.vx += (dx / d) * 950 * dt;
        tk.vy += (dy / d) * 950 * dt;
      } else {
        tk.vx *= 1 - Math.min(1, 5 * dt);
        tk.vy *= 1 - Math.min(1, 5 * dt);
      }

      tk.x = clamp(tk.x + tk.vx * dt, bounds.left + 12, bounds.right - 12);
      tk.y = clamp(tk.y + tk.vy * dt, bounds.top + 12, bounds.bottom - 12);

      if (d2 <= (p.radius + 14) * (p.radius + 14)) {
        this.gambitTokens += tk.value;
        AudioEngine.playTokenPickup();
        this.pools.tokens.release(tk);
      }
    }
  }

  _updateLasers(dt) {
    const items = this.pools.lasers.items;
    const size = this.pools.lasers.size;
    for (let i = 0; i < size; i++) {
      const l = items[i];
      if (!l.active) continue;
      l.life += dt;
      if (l.life >= l.maxLife) {
        this.pools.lasers.release(l);
      }
    }
  }

  _updateParticles(dt) {
    const items = this.pools.particles.items;
    const size = this.pools.particles.size;
    for (let i = 0; i < size; i++) {
      const p = items[i];
      if (!p.active) continue;
      p.life += dt;
      if (p.life >= p.maxLife) {
        this.pools.particles.release(p);
        continue;
      }
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.vx *= 1 - Math.min(1, 5.5 * dt);
      p.vy *= 1 - Math.min(1, 5.5 * dt);
      p.rotation += p.vRot * dt;
      p.alpha = 1 - p.life / p.maxLife;
    }
  }

  _updateFloatingTexts(dt) {
    const items = this.pools.floatingTexts.items;
    const size = this.pools.floatingTexts.size;
    for (let i = 0; i < size; i++) {
      const ft = items[i];
      if (!ft.active) continue;
      ft.life += dt;
      if (ft.life >= ft.maxLife) {
        this.pools.floatingTexts.release(ft);
        continue;
      }
      ft.y += ft.vy * dt;
      ft.vy *= 1 - Math.min(1, 3.5 * dt);
    }
  }

  _updateAfterimages(dt) {
    const items = this.pools.afterimages.items;
    const size = this.pools.afterimages.size;
    for (let i = 0; i < size; i++) {
      const aft = items[i];
      if (!aft.active) continue;
      aft.life += dt;
      if (aft.life >= aft.maxLife) {
        this.pools.afterimages.release(aft);
        continue;
      }
      aft.alpha = 0.55 * (1 - aft.life / aft.maxLife);
    }
  }

  // --- WARSTWOWY RENDERING CANVAS 2D ---
  render() {
    const ctx = this.ctx;
    const theme = this.theme;
    const dpr = this.dpr || 1;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    ctx.save();

    // 1. Aplikacja sprężynowego wstrząsu kamery (Trauma-Based Screen Shake)
    const shake = computeTraumaShake(this.trauma, this.time, 18);
    if (shake.x !== 0 || shake.y !== 0) {
      ctx.translate(this.width / 2, this.height / 2);
      ctx.rotate(shake.angle);
      ctx.translate(-this.width / 2 + shake.x, -this.height / 2 + shake.y);
    }

    // 2. Renderowanie zbuforowanej szachownicy (1 wywołanie drawImage - Bottleneck #2 Fix)
    this.board.render(ctx, theme);

    // Pulsująca ramka w trybie Time Trouble (Panic Mode) lub Royal Majesty Hetmana
    if (this.timeTrouble || this.player.royalMajestyTimer > 0) {
      const bounds = this.board.getBounds();
      const pulse = 0.35 + 0.25 * Math.sin(this.time * 16);
      ctx.strokeStyle = this.timeTrouble ? theme.uiDanger : theme.uiAccent;
      ctx.lineWidth = 6;
      ctx.globalAlpha = pulse;
      ctx.strokeRect(bounds.left, bounds.top, bounds.size, bounds.size);
      ctx.globalAlpha = 1;
    }

    // 3. Warstwa telegrafów wrogów (Pionek, Skoczek "L", Goniec przekątna, Wieża korytarz)
    this._renderTelegraphs(ctx, theme);

    // 4. Warstwa fizycznych Czarnych Żetonów Gambitu
    this._renderTokens(ctx, theme);

    // 5. Warstwa śladów poświaty (Afterimages)
    this._renderAfterimages(ctx, theme);

    // 6. Warstwa postaci (Gracz, Klon Roszady, Dron Poświęcenia i Wrogowie)
    this._renderEntities(ctx, theme);

    // 7. Warstwa wiązek laserowych i fal uderzeniowych AoE
    this._renderLasers(ctx);

    // 8. Warstwa pocisków (Faux-Glow bez użycia shadowBlur)
    this._renderBullets(ctx, theme);

    // 9. Warstwa cząsteczek
    this._renderParticles(ctx);

    // 10. Pływające napisy (+0.8s, EN PASSANT!, CRIT!)
    this._renderFloatingTexts(ctx);

    ctx.restore();

    // 11. Warstwa HUD, Zegara Szachowego, Celownika oraz ekranów modalnych
    renderGameHUD(ctx, this, theme);

    // Nakładka sterowania dotykowego na telefonach (TOUCH-02, TOUCH-06)
    if (this.state === 'PLAYING' && (this.input.isTouchDevice || this.input.touchActive)) {
      drawTouchControls(ctx, this.input, theme, this.player, this.activeAbilityCooldown);
    }

    if (this.state === 'SELECT_TEMPO') {
      renderTempoSelectOverlay(ctx, this, theme);
    } else if (this.state === 'GAMBIT_SHOP') {
      renderGambitShopOverlay(ctx, this, theme);
    } else if (!this.input.hasFocus && this.state === 'PLAYING') {
      renderBlurOverlay(ctx, this, theme);
    } else if (this.state === 'GAME_OVER') {
      renderGameOverOverlay(ctx, this, theme);
    } else if (this.state === 'VICTORY') {
      renderVictoryOverlay(ctx, this, theme);
    }

    // Celownik myszki rysowany wyłącznie na urządzeniach ze wskaźnikiem myszy (nie w trybie czysto dotykowym)
    if (!this.input.touchActive) {
      drawCrosshair(
        ctx,
        this.input.mouseX,
        this.input.mouseY,
        theme,
        this.player.dashCooldown <= 0 || this.player.royalMajestyTimer > 0
      );
    }
  }

  _renderTelegraphs(ctx, theme) {
    const enemies = this.pools.enemies.items;
    const size = this.pools.enemies.size;

    for (let i = 0; i < size; i++) {
      const e = enemies[i];
      if (!e.active) continue;

      if (e.type === 'pawn' && e.state === 'telegraph') {
        ctx.save();
        ctx.strokeStyle = theme.telegraphStroke;
        ctx.lineWidth = 3;
        ctx.setLineDash([6, 5]);
        ctx.beginPath();
        ctx.moveTo(e.x, e.y);
        ctx.lineTo(e.targetX, e.targetY);
        ctx.stroke();

        ctx.fillStyle = theme.telegraphWarn;
        ctx.beginPath();
        ctx.arc(e.targetX, e.targetY, 14, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      } else if (
        e.type === 'knight' &&
        (e.state === 'telegraph' || e.state === 'attack')
      ) {
        ctx.save();
        const cornerX = e.targetX;
        const cornerY = e.startY;

        ctx.strokeStyle = theme.telegraphStroke;
        ctx.lineWidth = 2.5;
        ctx.setLineDash([5, 5]);
        ctx.beginPath();
        ctx.moveTo(e.startX, e.startY);
        ctx.lineTo(cornerX, cornerY);
        ctx.lineTo(e.targetX, e.targetY);
        ctx.stroke();
        ctx.setLineDash([]);

        ctx.fillStyle = theme.telegraphWarn;
        ctx.beginPath();
        ctx.arc(e.targetX, e.targetY, 24, 0, Math.PI * 2);
        ctx.fill();

        ctx.strokeStyle = theme.telegraphStroke;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(e.targetX, e.targetY, 24, 0, Math.PI * 2);
        ctx.stroke();
        ctx.restore();
      } else if (e.type === 'bishop' && e.state === 'telegraph') {
        // Cienka czerwona linia celownicza po przekątnej (Specyfikacja 4.3)
        ctx.save();
        ctx.strokeStyle = theme.telegraphStroke;
        ctx.lineWidth = 2.5;
        ctx.setLineDash([8, 6]);
        ctx.beginPath();
        ctx.moveTo(e.laserX1, e.laserY1);
        ctx.lineTo(e.laserX2, e.laserY2);
        ctx.stroke();
        ctx.restore();
      } else if (e.type === 'rook' && e.state === 'telegraph') {
        // Szeroki korytarz szarży kardynalnej Czarnej Wieży (Specyfikacja 4.4)
        ctx.save();
        ctx.strokeStyle = theme.telegraphStroke;
        ctx.lineWidth = 24;
        ctx.globalAlpha = 0.25;
        ctx.beginPath();
        ctx.moveTo(e.x, e.y);
        ctx.lineTo(e.targetX, e.targetY);
        ctx.stroke();

        ctx.globalAlpha = 0.9;
        ctx.lineWidth = 2.5;
        ctx.setLineDash([7, 5]);
        ctx.beginPath();
        ctx.moveTo(e.x, e.y);
        ctx.lineTo(e.targetX, e.targetY);
        ctx.stroke();
        ctx.restore();
      } else if (e.type === 'black_queen' && e.state === 'telegraph') {
        // Telegraf teleportacji Czarnej Królowej + krzyżowe wiązki laserowe
        ctx.save();
        ctx.strokeStyle = theme.telegraphStroke;
        ctx.lineWidth = 2.5;
        ctx.setLineDash([6, 4]);
        ctx.beginPath();
        ctx.moveTo(e.x, e.y);
        ctx.lineTo(e.targetX, e.targetY);
        ctx.stroke();

        ctx.fillStyle = theme.telegraphWarn;
        ctx.beginPath();
        ctx.arc(e.targetX, e.targetY, 30, 0, Math.PI * 2);
        ctx.fill();

        ctx.strokeStyle = theme.uiDanger;
        ctx.setLineDash([]);
        ctx.lineWidth = 2.5;
        ctx.beginPath();
        ctx.arc(e.targetX, e.targetY, 30, 0, Math.PI * 2);
        ctx.stroke();
        ctx.restore();
      }
    }
  }

  _renderTokens(ctx, theme) {
    const items = this.pools.tokens.items;
    const size = this.pools.tokens.size;
    for (let i = 0; i < size; i++) {
      const tk = items[i];
      if (!tk.active) continue;
      const bob = Math.sin(tk.bobPhase) * 2.5;
      drawGambitToken(ctx, tk.x, tk.y, bob, theme);
    }
  }

  _renderLasers(ctx) {
    const items = this.pools.lasers.items;
    const size = this.pools.lasers.size;
    for (let i = 0; i < size; i++) {
      const l = items[i];
      if (!l.active) continue;
      const progress = l.life / l.maxLife;
      const alpha = 1 - progress;

      ctx.save();
      ctx.globalAlpha = alpha;
      if (l.isRing) {
        const curR = l.maxRadius * progress;
        ctx.strokeStyle = l.color;
        ctx.lineWidth = 5 * (1 - progress * 0.5);
        ctx.beginPath();
        ctx.arc(l.x1, l.y1, curR, 0, Math.PI * 2);
        ctx.stroke();
      } else {
        ctx.strokeStyle = l.color;
        ctx.lineWidth = l.width * alpha;
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.moveTo(l.x1, l.y1);
        ctx.lineTo(l.x2, l.y2);
        ctx.stroke();

        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = Math.max(1.5, l.width * 0.4 * alpha);
        ctx.beginPath();
        ctx.moveTo(l.x1, l.y1);
        ctx.lineTo(l.x2, l.y2);
        ctx.stroke();
      }
      ctx.restore();
    }
  }

  _renderAfterimages(ctx, theme) {
    const items = this.pools.afterimages.items;
    const size = this.pools.afterimages.size;
    for (let i = 0; i < size; i++) {
      const aft = items[i];
      if (!aft.active) continue;
      ctx.save();
      ctx.globalAlpha = aft.alpha;
      drawChessPiece(
        ctx,
        aft.pieceType,
        aft.x,
        aft.y,
        0,
        1,
        1,
        theme.bulletPlayer,
        theme.playerOutline,
        0,
        null
      );
      ctx.restore();
    }
  }

  _renderEntities(ctx, theme) {
    const p = this.player;
    const enemies = this.pools.enemies.items;
    const eSize = this.pools.enemies.size;
    const aimAngle = this._getAimAngle();

    // 1. Klon Roszady na przeciwległym narożniku szachownicy (jeśli wykupiono Roszadę)
    if (this.activeAbilityId === 'castling') {
      ctx.save();
      ctx.globalAlpha = this.activeAbilityCooldown <= 0 ? 0.55 : 0.22;
      drawChessPiece(
        ctx,
        'rook',
        this.castlingCloneX,
        this.castlingCloneY,
        0,
        0.92,
        0.92,
        '#55ff99',
        theme.playerOutline,
        0,
        null
      );
      ctx.restore();
    }

    // 2. Rysowanie wrogów
    for (let i = 0; i < eSize; i++) {
      const e = enemies[i];
      if (!e.active) continue;

      const wobble = e.frozenTimer > 0 ? 0 : Math.sin(e.animPhase) * 0.06;
      const sx = e.scaleX + wobble;
      const sy = e.scaleY - wobble;
      const glow = theme.glow ? theme.enemyOutline : null;
      const fill = e.frozenTimer > 0 ? '#66ccff' : theme.enemyFill;

      drawChessPiece(
        ctx,
        e.type,
        e.x,
        e.y,
        e.zHeight,
        sx,
        sy,
        fill,
        theme.enemyOutline,
        e.hitFlash,
        glow,
        {
          facingAngle: e.facingAngle,
          shieldCharges: e.type === 'rook' && e.state !== 'stunned' ? 1 : 0,
          isStunned: e.state === 'stunned',
          timeSec: this.time
        }
      );

      // Wizualny pierścień Związania (Pinning Shot)
      if (e.pinnedTimer > 0) {
        ctx.save();
        ctx.strokeStyle = '#55ddff';
        ctx.lineWidth = 2;
        ctx.setLineDash([4, 3]);
        ctx.beginPath();
        ctx.arc(e.x, e.y + 4, e.radius + 5, 0, Math.PI * 2);
        ctx.stroke();
        ctx.restore();
      }
    }

    // Wskaźnik zablokowanego celu wroga (TOUCH-04: Touch Focus)
    if (this.lockedTarget && this.lockedTarget.active && this.lockedTarget.hp > 0) {
      drawLockOnTarget(
        ctx,
        this.lockedTarget.x,
        this.lockedTarget.y,
        this.lockedTarget.radius,
        this.time,
        theme
      );
    }

    // 2B. Tarcza 4 orbitujących Pionków wokół Czarnego Króla (Mini-Boss)
    for (let s = 0; s < 4; s++) {
      const sp = this.kingShieldPawns[s];
      if (!sp.active) continue;
      drawChessPiece(
        ctx,
        'pawn',
        sp.x,
        sp.y,
        0,
        0.78,
        0.78,
        theme.enemyFill,
        theme.uiAccent,
        sp.hitFlash,
        theme.glow ? theme.uiAccent : null
      );
    }

    // 3. Rysowanie Gracza (zgodnie z aktualną klasą z Drzewka Ewolucji)
    const blink = p.invulnTimer > 0 && Math.floor(this.time * 20) % 2 === 0;
    if (!blink) {
      const walkBob = Math.sin(p.walkPhase) * 0.05;
      const glow = theme.glow ? theme.playerFill : null;
      drawChessPiece(
        ctx,
        p.classId,
        p.x,
        p.y,
        p.zHeight,
        p.scaleX + walkBob,
        p.scaleY - walkBob,
        theme.playerFill,
        theme.playerOutline,
        p.hitFlash,
        glow,
        {
          facingAngle: aimAngle,
          shieldCharges: p.classId === 'rook' ? p.rookShieldCharges : 0,
          isStunned: false,
          timeSec: this.time
        }
      );
    }

    // 4. Orbitujący Dron-Pionek (Perk: Poświęcenie Pionka)
    if (this.droneActive) {
      const dx = p.x + Math.cos(this.droneAngle) * 28;
      const dy = p.y + Math.sin(this.droneAngle) * 28;
      drawChessPiece(
        ctx,
        'pawn',
        dx,
        dy,
        0,
        0.58,
        0.58,
        theme.bulletPlayer,
        theme.playerOutline,
        0,
        null
      );
    }

    // 5. Wskaźnik kierunku celowania wokół Figury Gracza
    ctx.save();
    ctx.translate(p.x, p.y - p.zHeight - 4);
    ctx.rotate(aimAngle);
    ctx.fillStyle = theme.bulletPlayer;
    ctx.beginPath();
    ctx.moveTo(20, 0);
    ctx.lineTo(13, -4);
    ctx.lineTo(13, 4);
    ctx.closePath();
    ctx.fill();
    ctx.restore();

    // 6. Ręka Arcymistrza opadająca znad stołu (Faza 2 Finałowego Bossa)
    if (this.grandmasterHand && this.grandmasterHand.active) {
      drawGrandmasterHand(
        ctx,
        this.grandmasterHand.x,
        this.grandmasterHand.y,
        this.grandmasterHand.zHeight,
        theme
      );
    }
  }

  _renderBullets(ctx, theme) {
    const bullets = this.pools.bullets.items;
    const size = this.pools.bullets.size;

    for (let i = 0; i < size; i++) {
      const b = bullets[i];
      if (!b.active) continue;

      const color = b.isEnemy
        ? this.timeTrouble
          ? '#ff1a1a'
          : theme.bulletEnemy
        : b.isCrit
        ? '#ffffff'
        : theme.bulletPlayer;

      if (theme.glow || b.isCrit) {
        drawFauxGlow(ctx, b.x, b.y, b.radius, color, 0.25);
      }

      if (b.kind === 'horseshoe') {
        // Obracająca się podkowa Skoczka
        ctx.save();
        ctx.translate(b.x, b.y);
        ctx.rotate(b.life * 18);
        ctx.strokeStyle = color;
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.arc(0, 0, b.radius, -Math.PI * 0.75, Math.PI * 0.75);
        ctx.stroke();
        ctx.restore();
      } else if (b.kind === 'laser_bolt') {
        // Wydłużony impuls laserowy Gońca / Hetmana
        ctx.save();
        ctx.translate(b.x, b.y);
        ctx.rotate(b.rotation);
        ctx.fillStyle = color;
        ctx.fillRect(-b.radius * 1.8, -b.radius * 0.55, b.radius * 3.6, b.radius * 1.1);
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(-b.radius * 1.2, -b.radius * 0.25, b.radius * 2.4, b.radius * 0.5);
        ctx.restore();
      } else {
        ctx.fillStyle = color;
        ctx.beginPath();
        ctx.arc(b.x, b.y, b.radius, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.arc(b.x, b.y, b.radius * 0.45, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  }

  _renderParticles(ctx) {
    const items = this.pools.particles.items;
    const size = this.pools.particles.size;

    for (let i = 0; i < size; i++) {
      const p = items[i];
      if (!p.active) continue;

      ctx.save();
      ctx.globalAlpha = p.alpha;
      ctx.translate(p.x, p.y);
      ctx.rotate(p.rotation);
      ctx.fillStyle = p.color;

      if (p.kind === 'wood_splinters') {
        ctx.fillRect(-p.size, -p.size * 0.35, p.size * 2, p.size * 0.7);
      } else if (p.kind === 'neon_sparks') {
        ctx.fillRect(-p.size * 1.4, -1.2, p.size * 2.8, 2.4);
      } else if (p.kind === 'bit_squares') {
        ctx.fillRect(-p.size * 0.6, -p.size * 0.6, p.size * 1.2, p.size * 1.2);
      } else {
        ctx.beginPath();
        ctx.arc(0, 0, p.size * 0.65, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();
    }
  }

  _renderFloatingTexts(ctx) {
    const items = this.pools.floatingTexts.items;
    const size = this.pools.floatingTexts.size;

    ctx.save();
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    for (let i = 0; i < size; i++) {
      const ft = items[i];
      if (!ft.active) continue;

      const alpha = 1 - ft.life / ft.maxLife;
      ctx.globalAlpha = alpha;
      ctx.font = `bold ${Math.round(13 * ft.scale)}px monospace`;
      ctx.fillStyle = '#000000';
      ctx.fillText(ft.text, ft.x + 1, ft.y + 1);
      ctx.fillStyle = ft.color;
      ctx.fillText(ft.text, ft.x, ft.y);
    }
    ctx.restore();
  }
}

