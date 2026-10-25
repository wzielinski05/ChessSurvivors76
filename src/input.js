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

    this.activePointers = new Map();
    this.isTouchDevice = ('ontouchstart' in window) || (navigator.maxTouchPoints > 0);
    this.touchActive = false;

    // Pływający wirtualny joystick (TOUCH-02)
    this.joystick = {
      active: false,
      pointerId: null,
      startX: 0,
      startY: 0,
      currentX: 0,
      currentY: 0,
      maxRadius: 54,
      vx: 0,
      vy: 0
    };

    // Przyciski akcji dotykowych (TOUCH-06)
    this.touchDashPressed = false;
    this.touchPerkPressed = false;
    this.touchShopPressed = false;
    this.lastTap = null;

    this.hasFocus = document.hasFocus ? document.hasFocus() : true;
    this.onBlurCallback = null;
    this.onFocusCallback = null;

    this._bindEvents();
  }

  getTouchButtonLayout() {
    const w = this.virtualWidth;
    const h = this.virtualHeight;
    const isPortrait = h > w;
    if (isPortrait) {
      return {
        dash: { x: w - 58, y: h - 68, radius: 34, label: 'DASH' },
        ability: { x: w - 58, y: h - 146, radius: 26, label: 'PERK' },
        shop: { x: w - 132, y: h - 68, radius: 25, label: 'SKLEP' }
      };
    }
    return {
      dash: { x: w - 74, y: h - 74, radius: 36, label: 'DASH' },
      ability: { x: w - 74, y: h - 160, radius: 28, label: 'PERK' },
      shop: { x: w - 156, y: h - 74, radius: 26, label: 'SKLEP' }
    };
  }

  _handlePointerDown(pointer) {
    // 1. Sprawdzenie kliknięć w przyciski akcji dotykowych (TOUCH-06)
    const btns = this.getTouchButtonLayout();
    if (Math.hypot(pointer.x - btns.dash.x, pointer.y - btns.dash.y) <= btns.dash.radius + 10) {
      this.touchDashPressed = true;
      pointer.consumed = true;
      return;
    }
    if (Math.hypot(pointer.x - btns.ability.x, pointer.y - btns.ability.y) <= btns.ability.radius + 8) {
      this.touchPerkPressed = true;
      pointer.consumed = true;
      return;
    }
    if (Math.hypot(pointer.x - btns.shop.x, pointer.y - btns.shop.y) <= btns.shop.radius + 8) {
      this.touchShopPressed = true;
      pointer.consumed = true;
      return;
    }

    // 2. Lewa strefa ekranu (< 52% szerokości) rezerwowana dla wirtualnego joysticka ruchu (TOUCH-02)
    if (pointer.x < this.virtualWidth * 0.52 && !this.joystick.active) {
      this.joystick.active = true;
      this.joystick.pointerId = pointer.id;
      this.joystick.startX = pointer.x;
      this.joystick.startY = pointer.y;
      this.joystick.currentX = pointer.x;
      this.joystick.currentY = pointer.y;
      this.joystick.vx = 0;
      this.joystick.vy = 0;
      pointer.consumed = true;
      return;
    }

    // 3. Rejestracja pojedynczego tapnięcia / kliknięcia do blokowania celu wroga (TOUCH-04)
    this.lastTap = { x: pointer.x, y: pointer.y, consumed: false };
  }

  _handlePointerMove(pointer) {
    if (this.joystick.active && pointer.id === this.joystick.pointerId) {
      const dx = pointer.x - this.joystick.startX;
      const dy = pointer.y - this.joystick.startY;
      const dist = Math.hypot(dx, dy);
      const maxR = this.joystick.maxRadius;

      if (dist > maxR) {
        this.joystick.currentX = this.joystick.startX + (dx / dist) * maxR;
        this.joystick.currentY = this.joystick.startY + (dy / dist) * maxR;
      } else {
        this.joystick.currentX = pointer.x;
        this.joystick.currentY = pointer.y;
      }

      const deadzone = 8;
      if (dist > deadzone) {
        const intensity = Math.min(1, (dist - deadzone) / (maxR - deadzone));
        this.joystick.vx = (dx / (dist || 1)) * intensity;
        this.joystick.vy = (dy / (dist || 1)) * intensity;
      } else {
        this.joystick.vx = 0;
        this.joystick.vy = 0;
      }
    }
  }

  _handlePointerUp(pointer) {
    if (this.joystick.active && pointer.id === this.joystick.pointerId) {
      this.joystick.active = false;
      this.joystick.pointerId = null;
      this.joystick.vx = 0;
      this.joystick.vy = 0;
    }
  }

  _resetTouchControls() {
    this.joystick.active = false;
    this.joystick.pointerId = null;
    this.joystick.vx = 0;
    this.joystick.vy = 0;
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
    const screenToVirtual = (clientX, clientY) => {
      const rect = this.canvas.getBoundingClientRect();
      if (rect.width <= 0 || rect.height <= 0) return { x: this.virtualWidth / 2, y: this.virtualHeight / 2 };
      return {
        x: ((clientX - rect.left) / rect.width) * this.virtualWidth,
        y: ((clientY - rect.top) / rect.height) * this.virtualHeight
      };
    };

    const updateMousePos = (e) => {
      const pos = screenToVirtual(e.clientX, e.clientY);
      this.mouseX = pos.x;
      this.mouseY = pos.y;
    };

    window.addEventListener('pointermove', (e) => {
      updateMousePos(e);
      if (this.activePointers.has(e.pointerId)) {
        const p = this.activePointers.get(e.pointerId);
        const pos = screenToVirtual(e.clientX, e.clientY);
        p.x = pos.x;
        p.y = pos.y;
        if (this._handlePointerMove) {
          this._handlePointerMove(p);
        }
      }
    }, { passive: true });

    window.addEventListener('pointerdown', (e) => {
      AudioEngine.init();
      const pos = screenToVirtual(e.clientX, e.clientY);
      this.mouseX = pos.x;
      this.mouseY = pos.y;

      if (e.pointerType === 'touch') {
        this.isTouchDevice = true;
        this.touchActive = true;
      }

      const pointer = {
        id: e.pointerId,
        type: e.pointerType,
        x: pos.x,
        y: pos.y,
        startX: pos.x,
        startY: pos.y,
        startTime: performance.now(),
        consumed: false
      };
      this.activePointers.set(e.pointerId, pointer);

      if (this._handlePointerDown) {
        this._handlePointerDown(pointer);
      }

      // Wymuszenie focusu na canvasie wewnątrz iframe Google Apps Script
      if (document.activeElement !== this.canvas) {
        this.canvas.focus({ preventScroll: true });
      }
      if (!this.hasFocus) {
        this.hasFocus = true;
        if (this.onFocusCallback) this.onFocusCallback();
      }

      if (e.button === 0 && !pointer.consumed) {
        this.mouseDownLeft = true;
        this.mouseJustLeft = true;
      } else if (e.button === 2 && !pointer.consumed) {
        this.mouseDownRight = true;
        this.mouseJustRight = true;
      }
    });

    const handlePointerEnd = (e) => {
      if (this.activePointers.has(e.pointerId)) {
        const p = this.activePointers.get(e.pointerId);
        if (this._handlePointerUp) {
          this._handlePointerUp(p);
        }
        this.activePointers.delete(e.pointerId);
      }

      if (e.button === 0 || this.activePointers.size === 0) {
        this.mouseDownLeft = false;
      }
      if (e.button === 2) {
        this.mouseDownRight = false;
      }
      if (this.activePointers.size === 0) {
        if (this._resetTouchControls) this._resetTouchControls();
      }
    };

    window.addEventListener('pointerup', handlePointerEnd);
    window.addEventListener('pointercancel', handlePointerEnd);

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
    this.touchDashPressed = false;
    this.touchPerkPressed = false;
    this.touchShopPressed = false;
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

  consumeTouchDash() {
    if (this.touchDashPressed) {
      this.touchDashPressed = false;
      return true;
    }
    return false;
  }

  consumeTouchPerk() {
    if (this.touchPerkPressed) {
      this.touchPerkPressed = false;
      return true;
    }
    return false;
  }

  consumeTouchShop() {
    if (this.touchShopPressed) {
      this.touchShopPressed = false;
      return true;
    }
    return false;
  }

  consumeTap() {
    if (this.lastTap && !this.lastTap.consumed) {
      this.lastTap.consumed = true;
      return { x: this.lastTap.x, y: this.lastTap.y };
    }
    return null;
  }

  endFrame() {
    for (const k in this.justPressed) {
      this.justPressed[k] = false;
    }
    this.mouseJustLeft = false;
    this.mouseJustRight = false;
    this.touchDashPressed = false;
    this.touchPerkPressed = false;
    this.touchShopPressed = false;
    if (this.lastTap) {
      this.lastTap.consumed = true;
    }
  }

  // Zwraca znormalizowany wektor ruchu 360° (Klawiatura WSAD/Strzałki lub Wirtualny Joystick Dotykowy)
  getMoveVector() {
    if (this.joystick && this.joystick.active && (this.joystick.vx !== 0 || this.joystick.vy !== 0)) {
      return { x: this.joystick.vx, y: this.joystick.vy };
    }

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

