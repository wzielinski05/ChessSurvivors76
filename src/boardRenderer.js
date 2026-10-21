// --- OFFSCREEN CACHE SZACHOWNICY (BOTTLENECK #2 FIX) ---
// Zamiast rysować 64 kafelki, faktury i notację A-H / 1-8 w każdej klatce (60 FPS),
// wypalamy planszę na buforze pomocniczym wyłącznie przy zmianie stylu (klawisz T).

export class BoardRenderer {
  constructor(virtualWidth, virtualHeight) {
    this.virtualWidth = virtualWidth;
    this.virtualHeight = virtualHeight;

    // Wymiary szachownicy 8x8 (8 * 68 = 544x544 px)
    this.gridCount = 8;
    this.activeGridSize = 8; // Może skurczyć się do 6 (6x6) oraz 4 (4x4) przez Rękę Arcymistrza
    this.tileSize = 68;
    this.boardSize = this.gridCount * this.tileSize; // 544 px
    this.boardX = Math.floor((virtualWidth - this.boardSize) / 2); // 208
    this.boardY = Math.floor((virtualHeight - this.boardSize) / 2) + 22; // 110 (miejsce na Zegar Szachowy u góry)

    this.cacheCanvas = document.createElement('canvas');
    this.cacheCanvas.width = virtualWidth;
    this.cacheCanvas.height = virtualHeight;
    this.cacheCtx = this.cacheCanvas.getContext('2d');

    this.cachedThemeId = null;
    this.cachedGridSize = 8;
  }

  setActiveGridSize(newSize, theme = null) {
    this.activeGridSize = newSize;
    if (theme) {
      this.rebuildCache(theme);
    } else {
      this.cachedThemeId = null;
    }
  }

  getBounds() {
    const insetTiles = Math.floor((this.gridCount - this.activeGridSize) / 2);
    const insetPx = insetTiles * this.tileSize;
    const activeSize = this.activeGridSize * this.tileSize;
    return {
      left: this.boardX + insetPx,
      top: this.boardY + insetPx,
      right: this.boardX + insetPx + activeSize,
      bottom: this.boardY + insetPx + activeSize,
      size: activeSize,
      tileSize: this.tileSize,
      gridCount: this.activeGridSize,
      fullLeft: this.boardX,
      fullTop: this.boardY,
      fullSize: this.boardSize
    };
  }

  // Konwersja współrzędnych świata na indeksy pola szachownicy (0..7, 0..7)
  worldToTile(x, y) {
    const col = Math.floor((x - this.boardX) / this.tileSize);
    const row = Math.floor((y - this.boardY) / this.tileSize);
    return { col, row };
  }

  // Środek wskazanego kafelka
  tileToWorldCenter(col, row) {
    return {
      x: this.boardX + (col + 0.5) * this.tileSize,
      y: this.boardY + (row + 0.5) * this.tileSize
    };
  }

  rebuildCache(theme) {
    this.cachedThemeId = theme.id;
    const ctx = this.cacheCtx;
    const { boardX, boardY, boardSize, tileSize, gridCount } = this;

    ctx.clearRect(0, 0, this.virtualWidth, this.virtualHeight);

    // 1. Tło stołu / przestrzeni wokół areny
    ctx.fillStyle = theme.bg;
    ctx.fillRect(0, 0, this.virtualWidth, this.virtualHeight);

    // Subtelna siatka tła poza planszą
    ctx.strokeStyle = theme.gridLines;
    ctx.lineWidth = 1;
    ctx.globalAlpha = 0.25;
    const bgStep = 34;
    ctx.beginPath();
    for (let x = 0; x < this.virtualWidth; x += bgStep) {
      ctx.moveTo(x, 0);
      ctx.lineTo(x, this.virtualHeight);
    }
    for (let y = 0; y < this.virtualHeight; y += bgStep) {
      ctx.moveTo(0, y);
      ctx.lineTo(this.virtualWidth, y);
    }
    ctx.stroke();
    ctx.globalAlpha = 1;

    // 2. Cień pod stołem szachowym
    ctx.fillStyle = 'rgba(0, 0, 0, 0.45)';
    ctx.fillRect(boardX - 24, boardY - 18, boardSize + 56, boardSize + 52);

    // 3. Rama zewnętrzna stołu szachowego
    const framePad = 22;
    ctx.fillStyle = theme.boardFrame;
    ctx.fillRect(
      boardX - framePad,
      boardY - framePad,
      boardSize + framePad * 2,
      boardSize + framePad * 2
    );

    ctx.strokeStyle = theme.boardFrameInner;
    ctx.lineWidth = 3;
    ctx.strokeRect(
      boardX - framePad + 3,
      boardY - framePad + 3,
      boardSize + framePad * 2 - 6,
      boardSize + framePad * 2 - 6
    );

    ctx.strokeRect(
      boardX - 2,
      boardY - 2,
      boardSize + 4,
      boardSize + 4
    );

    // 4. Rysowanie 64 kafelków szachownicy z obsługą skruszonych krawędzi (Ręka Arcymistrza)
    const insetTiles = Math.floor((gridCount - this.activeGridSize) / 2);

    for (let row = 0; row < gridCount; row++) {
      for (let col = 0; col < gridCount; col++) {
        const isDark = (row + col) % 2 === 1;
        const tx = boardX + col * tileSize;
        const ty = boardY + row * tileSize;

        const isShattered =
          col < insetTiles ||
          col >= gridCount - insetTiles ||
          row < insetTiles ||
          row >= gridCount - insetTiles;

        if (isShattered) {
          // Zniszczony kafelek (przepaść po uderzeniu Ręki Arcymistrza)
          ctx.fillStyle = 'rgba(0, 0, 0, 0.78)';
          ctx.fillRect(tx, ty, tileSize, tileSize);

          ctx.strokeStyle = theme.uiDanger;
          ctx.globalAlpha = 0.28;
          ctx.lineWidth = 1.5;
          ctx.strokeRect(tx + 2, ty + 2, tileSize - 4, tileSize - 4);
          ctx.beginPath();
          ctx.moveTo(tx + 8, ty + 8);
          ctx.lineTo(tx + tileSize - 12, ty + tileSize - 10);
          ctx.moveTo(tx + tileSize - 10, ty + 12);
          ctx.lineTo(tx + 14, ty + tileSize - 8);
          ctx.stroke();
          ctx.globalAlpha = 1;
          continue;
        }

        ctx.fillStyle = isDark ? theme.tileDark : theme.tileLight;
        ctx.fillRect(tx, ty, tileSize, tileSize);

        // Detale proceduralne zależne od wybranego stylu
        if (theme.id === 'woodcraft') {
          ctx.fillStyle = isDark ? 'rgba(0,0,0,0.09)' : 'rgba(120,72,36,0.08)';
          ctx.fillRect(tx, ty + 14, tileSize, 3);
          ctx.fillRect(tx, ty + 42, tileSize, 2);
          ctx.fillRect(tx, ty + 55, tileSize, 4);
        } else if (theme.id === 'cyber_grid') {
          ctx.strokeStyle = isDark ? 'rgba(0, 255, 255, 0.14)' : 'rgba(0, 255, 255, 0.24)';
          ctx.lineWidth = 1;
          ctx.strokeRect(tx + 0.5, ty + 0.5, tileSize - 1, tileSize - 1);
          ctx.fillStyle = 'rgba(0, 255, 255, 0.25)';
          ctx.fillRect(tx + 3, ty + 3, 3, 3);
        } else if (theme.id === 'one_bit') {
          if (isDark) {
            ctx.fillStyle = theme.tileLight;
            for (let dy = 4; dy < tileSize - 4; dy += 8) {
              for (let dx = 4; dx < tileSize - 4; dx += 8) {
                if ((dx + dy) % 16 === 0) {
                  ctx.fillRect(tx + dx, ty + dy, 2, 2);
                }
              }
            }
          }
          ctx.strokeStyle = theme.gridLines;
          ctx.lineWidth = 2;
          ctx.strokeRect(tx + 1, ty + 1, tileSize - 2, tileSize - 2);
        } else if (theme.id === 'blackboard') {
          if (!isDark) {
            ctx.strokeStyle = 'rgba(255, 255, 255, 0.06)';
            ctx.lineWidth = 1.5;
            ctx.beginPath();
            for (let i = 12; i < tileSize * 2; i += 14) {
              const x1 = Math.max(tx, tx + i - tileSize);
              const y1 = Math.min(ty + tileSize, ty + i);
              const x2 = Math.min(tx + tileSize, tx + i);
              const y2 = Math.max(ty, ty + i - tileSize);
              ctx.moveTo(x1, y1);
              ctx.lineTo(x2, y2);
            }
            ctx.stroke();
          }
          ctx.strokeStyle = theme.gridLines;
          ctx.lineWidth = 1;
          ctx.strokeRect(tx + 0.5, ty + 0.5, tileSize - 1, tileSize - 1);
        }
      }
    }

    // Jeśli szachownica została skurczona (6x6 lub 4x4), obrysuj aktywną krawędź przepaści
    if (insetTiles > 0) {
      const bounds = this.getBounds();
      ctx.strokeStyle = theme.uiDanger;
      ctx.lineWidth = 3.5;
      ctx.strokeRect(bounds.left, bounds.top, bounds.size, bounds.size);
    }

    // 5. Notacja algebraiczna na ramie szachownicy (A-H, 1-8)
    ctx.fillStyle = theme.uiText;
    ctx.globalAlpha = 0.75;
    ctx.font = 'bold 11px monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    const files = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H'];
    for (let col = 0; col < gridCount; col++) {
      const cx = boardX + (col + 0.5) * tileSize;
      ctx.fillText(files[col], cx, boardY + boardSize + 11);
      ctx.fillText(files[col], cx, boardY - 11);
    }

    for (let row = 0; row < gridCount; row++) {
      const rank = String(gridCount - row);
      const cy = boardY + (row + 0.5) * tileSize;
      ctx.fillText(rank, boardX - 11, cy);
      ctx.fillText(rank, boardX + boardSize + 11, cy);
    }
    ctx.globalAlpha = 1;
    this.cachedGridSize = this.activeGridSize;
  }

  render(ctx, theme) {
    if (this.cachedThemeId !== theme.id || this.cachedGridSize !== this.activeGridSize) {
      this.rebuildCache(theme);
    }
    ctx.drawImage(this.cacheCanvas, 0, 0);
  }
}

