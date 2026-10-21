# AM76 Gamestudio — GameDev Framework & Agent Skill for Google Apps Script (GAS)

> **Standard inżynieryjny i specyfikacja dla agentów AI (Antigravity, Cursor, Claude Code) oraz programistów AM76 gamestudio.**
> Dokument definiuje pełny ekosystem tworzenia gier webowych: od lokalnego programowania w VS Code, przez testy i wersjonowanie w Git, po automatyczny deployment jako Web App w Google Apps Script.

---

## 1. Filozofia Architektury i Rola Agenta

Jesteś głównym inżynierem gier (Lead Game Engineer) w **AM76 gamestudio**. Twoim zadaniem jest dostarczanie gier o komercyjnym szlifie wizualnym i mechanicznym ("Juice"), które:
1. **Działają w 100% po stronie klienta** — zerowy lag sieciowy w trakcie rozgrywki; brak zależności od serwera w pętli gry.
2. **Są w pełni zintegrowane ze środowiskiem Google Apps Script (GAS)** — spełniają rygorystyczne wymogi sandboksa `iframe` oraz dystrybucji w jednym pliku HTML (`HtmlService`).
3. **Mogą być w całości rozwijane i testowane lokalnie** w VS Code przy wsparciu agenta AI (Antigravity), Gita oraz narzędzia `@google/clasp`.

---

## 2. Środowisko GAS — Ograniczenia i Wytyczne Sandboxu

Każda gra renderowana w GAS jako Web App działa wewnątrz piaskownicy (`script.googleusercontent.com`). Agent **musi** respektować następujące zasady:

* **Struktura pojedynczego pliku (Single-File Requirement):**
  - Wynikowy build produkcyjny to dokładnie jeden plik `Index.html`.
  - Wszystkie style CSS muszą być wstrzyknięte do `<style>`, a kod JS do `<script>`.
  - Biblioteki zewnętrzne ładujemy **wyłącznie** przez zaufane sieci CDN (np. `esm.sh`, `cdnjs.cloudflare.com`, `unpkg.com`) lub kompilujemy je inline.
* **Przechwytywanie wejścia (Input Handling wewnątrz Iframe):**
  - Klawisze funkcyjne przeglądarki (`ArrowUp`, `ArrowDown`, `ArrowLeft`, `ArrowRight`, `Space`, `Tab`) muszą mieć wywołane `e.preventDefault()`, aby okno iframe nie powodowało scrollowania strony Google Workspace.
* **Responsywność i skalowanie Viewportu:**
  - Dynamiczny resize na podstawie `window.innerWidth` i `window.innerHeight`.
  - Obsługa skalowania Canvasu z uwzględnieniem `window.devicePixelRatio` (zapobieganie rozmyciu na ekranach Retina/HiDPI).
* **Lokalny zapis danych (Client-Side Persistence):**
  - **Zakaz** używania `google.script.run` do zapisu stanu podczas rozgrywki (powoduje lagi rzędu 200–700 ms).
  - Całość danych (stan gry, high scores, postęp, ustawienia) zapisywana jest asynchronicznie w **`IndexedDB`** (np. mikro-wrapper `idb-keyval` lub natywne transakcje) z opcjonalnym fallbackiem do pamięci RAM / `localStorage`.

---

## 3. Lokalny Workflow Deweloperski (VS Code + Antigravity + Git + Clasp)

Nie piszemy kodu w przeglądarkowym edytorze Google Apps Script. Cały proces odbywa się lokalnie.

```
┌─────────────────────────────────────────────────────────────┐
│                    VS Code + Antigravity                    │
│   (Architektura modularna TS/JS, komponenty, logika gry)    │
└──────────────────────────────┬──────────────────────────────┘
                               │
            ┌──────────────────┴──────────────────┐
            ▼                                     ▼
   [ npm run dev ]                        [ Git Source Control ]
   • Błyskawiczny Localhost (Vite)        • Commity, branche, PRy
   • Mock `google.script.run`             • Wersjonowanie assetów
   • Stałe 60/120 FPS, HMR
            │
            ▼
   [ npm run deploy ]
   1. Vite + `vite-plugin-singlefile` kompiluje projekt do `dist/Index.html`
   2. `@google/clasp push` automatycznie wysyła kod do chmury Google Apps Script
```

### Konfiguracja Projektu

#### `package.json`
```json
{
  "name": "am76-game-project",
  "private": true,
  "version": "1.0.0",
  "scripts": {
    "dev": "vite",
    "build": "vite build",
    "deploy": "vite build && clasp push"
  },
  "devDependencies": {
    "@google/clasp": "^2.4.2",
    "vite": "^6.0.0",
    "vite-plugin-singlefile": "^2.1.0"
  }
}
```

#### `vite.config.js`
```javascript
import { defineConfig } from 'vite';
import { viteSingleFile } from 'vite-plugin-singlefile';

export default defineConfig({
  plugins: [viteSingleFile()],
  build: {
    target: 'esnext',
    assetsInlineLimit: 100000000,
    chunkSizeWarningLimit: 100000000,
    cssCodeSplit: false,
    outDir: 'dist'
  }
});
```

#### `.clasp.json`
```json
{
  "scriptId": "ID_TWOJEGO_SKRYPTU_GOOGLE_APPS_SCRIPT",
  "rootDir": "./dist"
}
```

#### Atrapa lokalna (GAS Environment Mock)
Wstrzykiwana na etapie deweloperskim, aby kod nie rzucał błędów przy braku środowiska Google:
```javascript
if (!window.google) {
  window.google = {
    script: {
      run: {
        withSuccessHandler: (fn) => ({
          withFailureHandler: (errFn) => ({
            saveLeaderboard: (data) => {
              console.log('[MOCK GAS] saveLeaderboard:', data);
              setTimeout(() => fn({ status: 'ok' }), 100);
            }
          })
        })
      }
    }
  };
}
```

---

## 4. Złoty Stos Technologiczny AM76 (Golden Stack)

| Moduł | Rekomendowane rozwiązanie | Uzasadnienie |
| :--- | :--- | :--- |
| **Silnik grafiki** | **PixiJS v8** LUB **LittleJS** | Obsługa WebGPU / WebGL 2.0, automatyczny sprite batching, wbudowane cząsteczki. |
| **Fizyka złożona** | **Rapier2D (WASM)** | Bezwzględna precyzja ciał sztywnych skompilowana do WebAssembly; zero lagów GC. |
| **Fizyka lekka** | Dedykowane AABB + SAT | Idealna do platformówek retro i gier kafelkowych (zero zewnętrznych megabajtów). |
| **Audio** | **ZzFX + Web Audio API** | Pełna synteza proceduralna w ~1 KB kodu; przestrzenny dźwięk 3D (`PannerNode`). |
| **Post-processing** | Autorski Shader WebGL/WebGPU | Wstrząsy ekranu, aberracja chromatyczna, bloom, soczewka uderzeniowa (shockwave). |
| **Zapis** | **IndexedDB** | W pełni asynchroniczny zapis bez przycinania klatek animacji. |
| **Assety** | SVG Inline, Procedural Canvas, WebP Base64 | Brak zewnętrznych plików na serwerze; 100% samowystarczalność. |

---

## 5. Game Feel & Juice — Standardy Audiowizualne

Gry AM76 nie mogą być „sztywne”. Agent musi obligatoryjnie implementować poniższe mechaniki soczystości rozgrywki:

### 1. Organiczny Screen Shake oparty na Traumie
Zamiast liniowego `Math.random()` stosujemy nieliniową traumę z wygaszaniem wykładniczym:
$$\text{Offset}_x = \text{Trauma}^2 \times \text{Noise}(t \times \text{freq})$$
$$\text{Offset}_y = \text{Trauma}^2 \times \text{Noise}((t + 100) \times \text{freq})$$
$$\text{Angle} = \text{Trauma}^2 \times \text{Noise}((t + 200) \times \text{freq}) \times \theta_{\max}$$
Wartość $\text{Trauma} \in [0, 1]$ zmniejsza się w czasie: $\text{Trauma} = \max(0, \text{Trauma} - \Delta t \times \text{Decay})$.

### 2. Fizyka Sprężyn (Harmonic Spring Damping)
Dla płynnego podążania kamery, animacji GUI i skalowania obiektów przy uderzeniu:
$$\ddot{x} + 2\zeta\omega\dot{x} + \omega^2 x = 0$$
Gdzie:
- $\omega$ (częstość drgań) kontroluje prędkość reakcji.
- $\zeta$ (współczynnik tłumienia) kontroluje sprężystość: $\zeta < 1$ (oscylacja z odbiciem), $\zeta = 1$ (tłumienie krytyczne).

### 3. Hitstop / Micro-Freeze
W momencie potężnego uderzenia lub zniszczenia celu zatrzymaj aktualizację logiki gry na $30\text{--}80\text{ ms}$, kontynuując renderowanie. Potęguje to fizyczne odczucie impaktu.

### 4. Pule Obiektów (Object Pooling)
Zakaz tworzenia nowych obiektów cząsteczek (`new Particle()`) w pętli gry. Zawsze stosuj wstępnie zaalokowaną tablicę o stałym rozmiarze, aktywując i dezaktywując instancje w celu ochrony Garbage Collectora przed skokami pamięci.

---

## 6. Moduł Gatunkowy (Universal Genre Matrix)

Agent przed implementacją weryfikuje specyfikę gatunkową i dobiera właściwy wzorzec:

### A. Gry Zręcznościowe / Shootery / Roguelike (Action & Shmup)
* Wymagana pętla fizyki o stałym kroku (*fixed timestep*).
* Dynamiczne cząsteczki iskier, odłamków i dymu.
* WebGL Post-processing: Shockwave wokół eksplozji, winieta przy niskim zdrowiu, dynamiczny bloom.

### B. Gry Platformowe (Precision & Action Platformers)
Niedopuszczalne jest stosowanie surowej grawitacji. Wymagane asysty sterowania:
* **Coyote Time (60–100 ms):** Możliwość wyskoku tuż po opuszczeniu platformy.
* **Jump Buffering (60–100 ms):** Zapamiętanie intencji skoku przed wylądowaniem na ziemi.
* **Variable Jump Height:** Prędkość pionowa redukowana o połowę ($v_y \times 0.5$) przy wcześniejszym zwolnieniu klawisza skoku.
* **Corner Nudging:** Przesunięcie gracza o 1–2 piksele w bok, jeśli zahaczy o narożnik sufitu podczas skoku.

### C. Gry Logiczne / Puzzle (Sokoban, Match-3, 2048, Suika-like)
* **Separacja modelu od widoku:** Logika planszy oparta na macierzy 2D.
* **Wzorzec Polecenia (Command Pattern) i Undo/Redo:** Pełna historia ruchów na stosie pod klawiszem `Z` / `Ctrl+Z`.
* **Game Feel:** Brak wstrząsów ekranu. Zamiast tego:
  - *Squash & Stretch* klocków przy upadku.
  - Płynny tweening pozycji (`easeOutBack`, `easeOutCubic`).
  - Dźwięki proceduralne ZzFX ułożone w harmonijne skale muzyczne (np. pentatonika lub narastająca gama C-dur przy combach).

### D. Strategie / Karcianki / Gry Turowe (Turn-Based & Tactics)
* **Maszyna Stanów (Finite State Machine):** `IDLE` $\to$ `SELECTING` $\to$ `VALIDATING` $\to$ `ANIMATING` $\to$ `ENEMY_TURN` $\to$ `CHECK_END`.
* **Pathfinding:** Zoptymalizowany algorytm A* lub BFS dla siatki kafelkowej/heksagonalnej.
* **Rendering na żądanie (Dirty Flag):** Nie przeliczaj logiki w klatkach bez interakcji gracza.
* **Interfejs:** Dedykowany system tooltipów (hover delay 150 ms) oraz czytelna kolejka tur (turn timeline).

---

## 7. Produkcyjny Szablon Bazowy (Single-File Boilerplate)

Poniższy szablon stanowi punkt wyjścia dla każdej gry AM76 generowanej w jednym pliku HTML:

```html
<!DOCTYPE html>
<html lang="pl">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
  <title>AM76 Game Studio - Standalone WebApp</title>
  <style>
    * { box-sizing: border-box; user-select: none; -webkit-user-select: none; }
    html, body {
      margin: 0; padding: 0; width: 100%; height: 100%;
      overflow: hidden; background: #07070a; color: #f0f0f5;
      font-family: system-ui, -apple-system, sans-serif;
    }
    #viewport-container {
      position: absolute; top: 0; left: 0; width: 100%; height: 100%;
      display: flex; align-items: center; justify-content: center;
    }
    canvas { display: block; max-width: 100%; max-height: 100%; }
  </style>
</head>
<body>
  <div id="viewport-container">
    <canvas id="gameCanvas"></canvas>
  </div>

  <script>
    // --- 1. MOCK DLA GOOGLE APPS SCRIPT (ENV SAFETY) ---
    if (!window.google) {
      window.google = { script: { run: {
        withSuccessHandler: (fn) => ({ withFailureHandler: () => ({ save: () => fn(true) }) })
      }}};
    }

    // --- 2. PROCEDURAL AUDIO (ZZFX CORE) ---
    const AudioEngine = {
      ctx: null,
      init() {
        if (!this.ctx) this.ctx = new (window.AudioContext || window.webkitAudioContext)();
        if (this.ctx.state === 'suspended') this.ctx.resume();
      },
      play(freq = 440, type = 'sine', duration = 0.15) {
        if (!this.ctx) return;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = type;
        osc.frequency.setValueAtTime(freq, this.ctx.currentTime);
        gain.gain.setValueAtTime(0.2, this.ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + duration);
        osc.connect(gain);
        gain.connect(this.ctx.destination);
        osc.start();
        osc.stop(this.ctx.currentTime + duration);
      }
    };

    // --- 3. STORAGE ADAPTER (INDEXEDDB) ---
    const Storage = {
      dbName: 'AM76_GAME_DB',
      async set(key, val) {
        localStorage.setItem(`${this.dbName}_${key}`, JSON.stringify(val));
      },
      async get(key, defaultVal = null) {
        const item = localStorage.getItem(`${this.dbName}_${key}`);
        return item ? JSON.parse(item) : defaultVal;
      }
    };

    // --- 4. VIEWPORT & INPUT ENGINE ---
    const canvas = document.getElementById('gameCanvas');
    const ctx = canvas.getContext('2d');
    const V_WIDTH = 1280;
    const V_HEIGHT = 720;
    canvas.width = V_WIDTH;
    canvas.height = V_HEIGHT;

    let trauma = 0;
    let hitstopTimer = 0;

    window.addEventListener('keydown', (e) => {
      AudioEngine.init();
      if (['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.code)) {
        e.preventDefault();
      }
      if (e.code === 'Space') {
        trauma = 0.8;
        hitstopTimer = 0.05; // 50ms hitstop
        AudioEngine.play(180, 'square', 0.2);
      }
    });

    window.addEventListener('pointerdown', () => {
      AudioEngine.init();
      trauma = 0.6;
      AudioEngine.play(520, 'sine', 0.1);
    });

    // --- 5. GAME LOOP & JUICE UPDATE ---
    let lastTime = performance.now();

    function update(dt) {
      if (hitstopTimer > 0) {
        hitstopTimer -= dt;
        return; // Zatrzymanie aktualizacji na czas hitstopu
      }
      if (trauma > 0) trauma = Math.max(0, trauma - dt * 1.8);
    }

    function render() {
      ctx.save();
      ctx.clearRect(0, 0, V_WIDTH, V_HEIGHT);

      // Aplikacja Screen Shake opartej na traumie
      if (trauma > 0) {
        const intensity = Math.pow(trauma, 2);
        const shakeX = (Math.random() * 2 - 1) * 24 * intensity;
        const shakeY = (Math.random() * 2 - 1) * 24 * intensity;
        const angle = (Math.random() * 2 - 1) * 0.03 * intensity;
        ctx.translate(V_WIDTH / 2, V_HEIGHT / 2);
        ctx.rotate(angle);
        ctx.translate(-V_WIDTH / 2 + shakeX, -V_HEIGHT / 2 + shakeY);
      }

      // Tło sceny
      ctx.fillStyle = '#11111a';
      ctx.fillRect(80, 80, V_WIDTH - 160, V_HEIGHT - 160);

      // Przykładowy dynamiczny obiekt
      ctx.fillStyle = '#00f0ff';
      ctx.shadowColor = '#00f0ff';
      ctx.shadowBlur = 20;
      ctx.beginPath();
      ctx.arc(V_WIDTH / 2, V_HEIGHT / 2, 45, 0, Math.PI * 2);
      ctx.fill();

      ctx.restore();
    }

    function loop(time) {
      const dt = Math.min((time - lastTime) / 1000, 0.1);
      lastTime = time;
      update(dt);
      render();
      requestAnimationFrame(loop);
    }
    requestAnimationFrame((t) => { lastTime = t; loop(t); });
  </script>
</body>
</html>
```

---

## 8. Checklista Przedpublikacyjna (Pre-Flight Verification)

Przed zakończeniem pracy agent **musi** zweryfikować kod względem poniższych kryteriów:
1. **Zero odwołań do lokalnego systemu plików serwera:** Brak znaczników `<link rel="stylesheet" href="...">` ani `<script src="...">` kierujących do ścieżek względnych `/src/...` w buildzie produkcyjnym.
2. **Bezpieczeństwo Focusu Iframe:** Wszystkie klawisze sterowania wywołują `e.preventDefault()`.
3. **Izolacja sieciowa:** Pętla gry nie odwołuje się do `google.script.run` ani nie wykonuje blokujących żądań `fetch`.
4. **Odporność na częstotliwość odświeżania:** Cała fizyka, trajektorie i czas wygaszania bazują na wartości $\Delta t$ (delta time), gwarantując identyczną rozgrywkę na monitorach 60 Hz, 144 Hz i 240 Hz.
5. **Obsługa audio-policy:** `AudioContext` inicjalizuje się lub wznawia dopiero po pierwszym geście użytkownika (`pointerdown` lub `keydown`).