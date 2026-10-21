// --- SYSTEM PUL OBIEKTÓW (OBJECT POOLING - BOTTLENECK #1 FIX) ---
// Zero alokacji pamięci (new Object / Array.filter / splice) w pętli 60/144 FPS.
// Chroni Garbage Collector przed mikro-ścinkami w trakcie gęstego bullet-hella.

export class FixedPool {
  constructor(size, factoryFn) {
    this.size = size;
    this.items = new Array(size);
    this.activeCount = 0;
    for (let i = 0; i < size; i++) {
      const item = factoryFn();
      item.active = false;
      this.items[i] = item;
    }
  }

  acquire() {
    for (let i = 0; i < this.size; i++) {
      const item = this.items[i];
      if (!item.active) {
        item.active = true;
        this.activeCount++;
        return item;
      }
    }
    return null; // Pula pełna - bezpieczne odrzucenie nadmiarowej cząsteczki bez crasha
  }

  release(item) {
    if (item.active) {
      item.active = false;
      this.activeCount--;
    }
  }

  clear() {
    for (let i = 0; i < this.size; i++) {
      this.items[i].active = false;
    }
    this.activeCount = 0;
  }
}

// Predefiniowane struktury danych bez zagnieżdżonych obiektów (przyjazne dla CPU cache)
export function createPools() {
  return {
    // Pula pocisków (gracza i wrogów)
    bullets: new FixedPool(512, () => ({
      active: false,
      isEnemy: false,
      kind: 'normal', // 'normal' | 'horseshoe' | 'laser_bolt' | 'artillery' | 'fork_shard'
      x: 0,
      y: 0,
      prevX: 0,
      prevY: 0,
      vx: 0,
      vy: 0,
      radius: 5,
      damage: 1,
      life: 0,
      maxLife: 2,
      rotation: 0,
      bouncesLeft: 0,
      pierceLeft: 0,
      isCrit: false,
      knockbackMult: 1
    })),

    // Pula cząsteczek (wióry drewna, neonowe iskry, piksele 1-bit, pył kredowy)
    particles: new FixedPool(640, () => ({
      active: false,
      x: 0,
      y: 0,
      vx: 0,
      vy: 0,
      size: 4,
      rotation: 0,
      vRot: 0,
      alpha: 1,
      life: 0,
      maxLife: 0.5,
      color: '#ffffff',
      kind: 'wood_splinters' // 'wood_splinters' | 'neon_sparks' | 'bit_squares' | 'chalk_dust'
    })),

    // Pula wrogów na szachownicy
    enemies: new FixedPool(128, () => ({
      active: false,
      type: 'pawn', // 'pawn' | 'knight' | 'bishop' | 'rook'
      x: 0,
      y: 0,
      vx: 0,
      vy: 0,
      radius: 14,
      hp: 3,
      maxHp: 3,
      speed: 75,
      state: 'chase', // 'chase' | 'telegraph' | 'attack' | 'stunned' | 'cooldown'
      stateTimer: 0,
      targetX: 0,
      targetY: 0,
      startX: 0,
      startY: 0,
      facingAngle: 0,
      laserX1: 0,
      laserY1: 0,
      laserX2: 0,
      laserY2: 0,
      pinnedTimer: 0,
      frozenTimer: 0,
      stunTimer: 0,
      hitFlash: 0,
      animPhase: 0,
      scaleX: 1,
      scaleY: 1,
      zHeight: 0 // Wysokość nad szachownicą (dla skoku Skoczka)
    })),

    // Pula fizycznych Czarnych Żetonów Gambitu wypadających z wrogów
    tokens: new FixedPool(128, () => ({
      active: false,
      x: 0,
      y: 0,
      vx: 0,
      vy: 0,
      value: 1,
      life: 0,
      maxLife: 16,
      bobPhase: 0
    })),

    // Pula wiązek laserowych i fal uderzeniowych AoE (Goniec, Skoczek, Okrzyk Szach!)
    lasers: new FixedPool(48, () => ({
      active: false,
      isRing: false,
      isEnemy: false,
      x1: 0,
      y1: 0,
      x2: 0,
      y2: 0,
      width: 8,
      maxRadius: 100,
      life: 0,
      maxLife: 0.35,
      color: '#ffffff'
    })),

    // Pula pływających tekstów (+0.8s, EN PASSANT!, CRIT)
    floatingTexts: new FixedPool(64, () => ({
      active: false,
      text: '',
      x: 0,
      y: 0,
      vy: -40,
      life: 0,
      maxLife: 0.8,
      color: '#ffffff',
      scale: 1
    })),

    // Pula śladów poświaty (Afterimages podczas Dasha / Szarży)
    afterimages: new FixedPool(48, () => ({
      active: false,
      pieceType: 'pawn',
      x: 0,
      y: 0,
      alpha: 0.6,
      life: 0,
      maxLife: 0.22
    }))
  };
}

