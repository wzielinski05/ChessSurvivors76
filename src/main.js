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

const V_WIDTH = 960;
const V_HEIGHT = 720;

const canvas = document.getElementById('gameCanvas');
let currentDpr = 1;

// Responsywne dopasowanie z zachowaniem proporcji 4:3 oraz obsługą HiDPI/Retina (devicePixelRatio)
function resizeViewport() {
  const winW = window.innerWidth;
  const winH = window.innerHeight;
  const scale = Math.min(winW / V_WIDTH, winH / V_HEIGHT);

  const displayW = Math.floor(V_WIDTH * scale);
  const displayH = Math.floor(V_HEIGHT * scale);

  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  if (canvas.width !== Math.round(V_WIDTH * dpr) || canvas.height !== Math.round(V_HEIGHT * dpr)) {
    canvas.width = Math.round(V_WIDTH * dpr);
    canvas.height = Math.round(V_HEIGHT * dpr);
    currentDpr = dpr;
  }

  canvas.style.width = `${displayW}px`;
  canvas.style.height = `${displayH}px`;
}

window.addEventListener('resize', resizeViewport, { passive: true });
resizeViewport();

const input = new InputManager(canvas, V_WIDTH, V_HEIGHT);
const game = new Game(canvas, input);

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

