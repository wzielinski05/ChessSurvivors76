// --- SYSTEM WEJŚCIA & OCHRONA FOCUSU W IFRAME GAS (BOTTLENECK #3 FIX) ---

import { AudioEngine } from './audio.js';

const PREVENT_KEYS = new Set([
  'KeyW', 'KeyA', 'KeyS', 'KeyD',
  'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight',
  'Space', 'Tab', 'Enter', 'KeyE', 'KeyQ', 'KeyT', 'KeyR', 'KeyM', 'KeyB',
  'Digit1', 'Digit2', 'Digit3', 'Digit4', 'Digit5', 'Digit6', 'Digit7'
]);

export class InputManager {
  constructor(canvas, virtualWidth, virtualHeight) {
    this.canvas = canvas;
    this.virtualWidth = virtualWidth;
    this.virtualHeight = virtualHeight;

    this.keys = Object.create(null);
    this.justPressed = Object.create(null);

    this.mouseX = virtualWidth / 2;
    this.mouseY = virtualHeight / 2;
    this.mouseDownLeft = false;
    this.mouseDownRight = false;
    this.mouseJustLeft = false;
    this.mouseJustRight = false;

    this.hasFocus = document.hasFocus ? document.hasFocus() : true;
    this.onBlurCallback = null;
    this.onFocusCallback = null;

    this._bindEvents();
  }

  _bindEvents() {
    window.addEventListener('keydown', (e) => {
      AudioEngine.init();
      this.hasFocus = true;

      if (PREVENT_KEYS.has(e.code)) {
        e.preventDefault();
      }

      if (!this.keys[e.code]) {
        this.justPressed[e.code] = true;
      }
      this.keys[e.code] = true;
    }, { passive: false });

    window.addEventListener('keyup', (e) => {
      if (PREVENT_KEYS.has(e.code)) {
        e.preventDefault();
      }
      this.keys[e.code] = false;
    }, { passive: false });

    // Przeliczanie pozycji kursora ze Screen Space na Virtual Canvas Space
    const updateMousePos = (e) => {
      const rect = this.canvas.getBoundingClientRect();
      if (rect.width <= 0 || rect.height <= 0) return;
      this.mouseX = ((e.clientX - rect.left) / rect.width) * this.virtualWidth;
      this.mouseY = ((e.clientY - rect.top) / rect.height) * this.virtualHeight;
    };

    window.addEventListener('pointermove', (e) => {
      updateMousePos(e);
    }, { passive: true });

    window.addEventListener('pointerdown', (e) => {
      AudioEngine.init();
      updateMousePos(e);

      // Wymuszenie focusu na canvasie wewnątrz iframe Google Apps Script
      if (document.activeElement !== this.canvas) {
        this.canvas.focus({ preventScroll: true });
      }
      if (!this.hasFocus) {
        this.hasFocus = true;
        if (this.onFocusCallback) this.onFocusCallback();
      }

      if (e.button === 0) {
        this.mouseDownLeft = true;
        this.mouseJustLeft = true;
      } else if (e.button === 2) {
        this.mouseDownRight = true;
        this.mouseJustRight = true;
      }
    });

    window.addEventListener('pointerup', (e) => {
      if (e.button === 0) {
        this.mouseDownLeft = false;
      } else if (e.button === 2) {
        this.mouseDownRight = false;
      }
    });

    // Blokada menu kontekstowego przy używaniu PPM do En Passant Dash
    window.addEventListener('contextmenu', (e) => {
      e.preventDefault();
    }, { passive: false });

    // Ochrona przed "zaciętymi klawiszami" po utracie focusu okna iframe
    const handleBlur = () => {
      this.clearState();
      this.hasFocus = false;
      if (this.onBlurCallback) this.onBlurCallback();
    };

    window.addEventListener('blur', handleBlur);
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) handleBlur();
    });
  }

  clearState() {
    for (const k in this.keys) this.keys[k] = false;
    for (const k in this.justPressed) this.justPressed[k] = false;
    this.mouseDownLeft = false;
    this.mouseDownRight = false;
    this.mouseJustLeft = false;
    this.mouseJustRight = false;
  }

  consumeJustPressed(code) {
    if (this.justPressed[code]) {
      this.justPressed[code] = false;
      return true;
    }
    return false;
  }

  consumeLeftClick() {
    if (this.mouseJustLeft) {
      this.mouseJustLeft = false;
      return true;
    }
    return false;
  }

  consumeRightClick() {
    if (this.mouseJustRight) {
      this.mouseJustRight = false;
      return true;
    }
    return false;
  }

  endFrame() {
    for (const k in this.justPressed) {
      this.justPressed[k] = false;
    }
    this.mouseJustLeft = false;
    this.mouseJustRight = false;
  }

  // Zwraca znormalizowany wektor ruchu 360° (WSAD + Strzałki)
  getMoveVector() {
    let dx = 0;
    let dy = 0;
    if (this.keys['KeyW'] || this.keys['ArrowUp']) dy -= 1;
    if (this.keys['KeyS'] || this.keys['ArrowDown']) dy += 1;
    if (this.keys['KeyA'] || this.keys['ArrowLeft']) dx -= 1;
    if (this.keys['KeyD'] || this.keys['ArrowRight']) dx += 1;

    if (dx !== 0 && dy !== 0) {
      const inv = 0.70710678; // 1 / sqrt(2)
      dx *= inv;
      dy *= inv;
    }
    return { x: dx, y: dy };
  }
}

