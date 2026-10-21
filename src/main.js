// --- BOOTSTRAPPER & RESPONSIVE VIEWPORT (AM76 GAS FRAMEWORK) ---

import { InputManager } from './input.js';
import { Game } from './game.js';

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
canvas.width = V_WIDTH;
canvas.height = V_HEIGHT;

// Responsywne dopasowanie z zachowaniem proporcji 4:3 (Letterboxing w iframe GAS)
function resizeViewport() {
  const winW = window.innerWidth;
  const winH = window.innerHeight;
  const scale = Math.min(winW / V_WIDTH, winH / V_HEIGHT);

  const displayW = Math.floor(V_WIDTH * scale);
  const displayH = Math.floor(V_HEIGHT * scale);

  canvas.style.width = `${displayW}px`;
  canvas.style.height = `${displayH}px`;
}

window.addEventListener('resize', resizeViewport, { passive: true });
resizeViewport();

const input = new InputManager(canvas, V_WIDTH, V_HEIGHT);
const game = new Game(canvas, input);

let lastTime = performance.now();

function mainLoop(now) {
  // Ograniczenie maksymalnego kroku delta-time do 50 ms (ochrona przed skokiem po alt-tabie)
  const dt = Math.min((now - lastTime) / 1000, 0.05);
  lastTime = now;

  game.update(dt);
  game.render();

  requestAnimationFrame(mainLoop);
}

requestAnimationFrame((t) => {
  lastTime = t;
  mainLoop(t);
});

