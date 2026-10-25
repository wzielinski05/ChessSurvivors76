// --- BOOTSTRAPPER & RESPONSIVE VIEWPORT (AM76 GAS FRAMEWORK) ---

import { InputManager } from './input.js';
import { Game } from './game.js';
import { StorageEngine } from './storage.js';

// 1. Atrapa bezpieczeństwa dla środowiska lokalnego poza Google Apps Script
if (!window.google) {
  window.google = {
    script: {
      run: {
        withSuccessHandler: (fn) => ({
          withFailureHandler: () => ({
            saveLeaderboard: (data) => {
              if (fn) setTimeout(() => fn({ status: 'ok', data }), 50);
            }
          })
        })
      }
    }
  };
}

const canvas = document.getElementById('gameCanvas');
let currentDpr = 1;

let initW = window.innerWidth || 960;
let initH = window.innerHeight || 720;

const input = new InputManager(canvas, initW, initH);
const game = new Game(canvas, input);

// Responsywne dopasowanie 100% okna (VIEW-01) z obsługą HiDPI/Retina do 2x (VIEW-05)
function resizeViewport() {
  const winW = window.innerWidth;
  const winH = window.innerHeight;
  const dpr = Math.min(window.devicePixelRatio || 1, 2);

  canvas.width = Math.round(winW * dpr);
  canvas.height = Math.round(winH * dpr);
  currentDpr = dpr;

  canvas.style.width = `${winW}px`;
  canvas.style.height = `${winH}px`;

  game.width = winW;
  game.height = winH;
  game.dpr = dpr;

  input.virtualWidth = winW;
  input.virtualHeight = winH;

  if (game.handleResize) {
    game.handleResize(winW, winH, dpr);
  } else if (game.board && game.board.resize) {
    game.board.resize(winW, winH, dpr, game.theme);
  }
}

window.addEventListener('resize', resizeViewport, { passive: true });
window.addEventListener('orientationchange', resizeViewport, { passive: true });
resizeViewport();

// Asynchroniczne wczytanie profilu gracza z IndexedDB (AM76_CHESS_DB)
StorageEngine.init().then((profile) => {
  game.applySavedProfile(profile);
});

let lastTime = performance.now();

function mainLoop(now) {
  // Ograniczenie maksymalnego kroku delta-time do 50 ms (ochrona przed skokiem po alt-tabie)
  const dt = Math.min((now - lastTime) / 1000, 0.05);
  lastTime = now;

  game.dpr = currentDpr;
  game.update(dt);
  game.render();

  requestAnimationFrame(mainLoop);
}

requestAnimationFrame((t) => {
  lastTime = t;
  mainLoop(t);
});

