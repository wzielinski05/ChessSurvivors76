// --- PROCEDURALNA SYNTEZA AUDIO (ZzFX + WEB AUDIO API) ---
// Zero zewnętrznych plików .wav/.mp3. Zgodność z Autoplay Policy w Iframe GAS.

export const AudioEngine = {
  ctx: null,
  muted: false,
  volume: 0.35,
  sampleRate: 44100,

  init() {
    if (this.muted) return;
    try {
      if (!this.ctx) {
        const AudioCtx = window.AudioContext || window.webkitAudioContext;
        if (AudioCtx) {
          this.ctx = new AudioCtx();
        }
      }
      if (this.ctx && this.ctx.state === 'suspended') {
        this.ctx.resume();
      }
    } catch (_) {
      // Ignoruj blokadę przed pierwszym gestem
    }
  },

  // Rdzeń syntezatora ZzFX (Frank Force, MIT) zoptymalizowany pod kątem braku alokacji zewnętrznych
  zzfx(
    volume = 1,
    randomness = 0.05,
    frequency = 220,
    attack = 0,
    sustain = 0,
    release = 0.1,
    shape = 0,
    shapeCurve = 1,
    slide = 0,
    deltaSlide = 0,
    pitchJump = 0,
    pitchJumpTime = 0,
    repeatTime = 0,
    noise = 0,
    modulation = 0,
    bitCrush = 0,
    delay = 0,
    sustainVolume = 1,
    decay = 0,
    tremolo = 0
  ) {
    if (this.muted) return;
    this.init();
    if (!this.ctx || this.ctx.state !== 'running') return;

    const PI2 = Math.PI * 2;
    const sampleRate = this.sampleRate;
    const sign = (v) => (v > 0 ? 1 : -1);

    let startSlide = (slide *= (500 * PI2) / sampleRate / sampleRate);
    let startFrequency = (frequency *=
      ((1 + randomness * 2 * Math.random() - randomness) * PI2) / sampleRate);

    attack = attack * sampleRate + 9;
    decay *= sampleRate;
    sustain *= sampleRate;
    release *= sampleRate;
    delay *= sampleRate;
    deltaSlide *= (500 * PI2) / sampleRate ** 3;
    modulation *= PI2 / sampleRate;
    pitchJump *= PI2 / sampleRate;
    pitchJumpTime *= sampleRate;
    repeatTime = (repeatTime * sampleRate) | 0;

    const length = (attack + decay + sustain + release + delay) | 0;
    if (length <= 0) return;

    const b = new Float32Array(length);
    let t = 0;
    let tm = 0;
    let i = 0;
    let j = 1;
    let r = 0;
    let c = 0;
    let s = 0;
    let f;

    for (; i < length; b[i++] = s) {
      if (++c >= (bitCrush * 100) | 0) {
        c = 0;
        f =
          frequency *
          Math.cos(
            modulation * tm++
          );
        s = shape
          ? shape > 1
            ? shape > 2
              ? shape > 3
                ? Math.sin((t % PI2) ** 3)
                : Math.max(Math.min(Math.tan(t), 1), -1)
              : 1 - (((((2 * t) / PI2) % 2) + 2) % 2)
            : 1 - 4 * Math.abs(Math.round(t / PI2) - t / PI2)
          : Math.sin(t);

        s =
          (repeatTime
            ? 1 - tremolo + tremolo * Math.sin((PI2 * i) / repeatTime)
            : 1) *
          sign(s) *
          Math.abs(s) ** shapeCurve *
          volume *
          this.volume *
          (i < attack
            ? i / attack
            : i < attack + decay
            ? 1 - ((i - attack) / decay) * (1 - sustainVolume)
            : i < attack + decay + sustain
            ? sustainVolume
            : i < length - delay
            ? ((length - i - delay) / release) * sustainVolume
            : 0);

        s = delay
          ? s / 2 +
            (delay > i
              ? 0
              : ((i < length - delay ? 1 : (length - i) / delay) *
                  b[(i - delay) | 0]) /
                2)
          : s;
      }

      f =
        (frequency += slide += deltaSlide) *
        Math.cos(modulation * tm);
      t += f + f * noise * (1 - (((Math.sin(i) + 1) * 1e9) % 2));

      if (j && ++j > pitchJumpTime) {
        frequency += pitchJump;
        startFrequency += pitchJump;
        j = 0;
      }

      if (repeatTime && !(++r % repeatTime)) {
        frequency = startFrequency;
        slide = startSlide;
        j = j || 1;
      }
    }

    const buffer = this.ctx.createBuffer(1, length, sampleRate);
    buffer.getChannelData(0).set(b);
    const source = this.ctx.createBufferSource();
    source.buffer = buffer;
    source.connect(this.ctx.destination);
    source.start();
  },

  // --- BANK DŹWIĘKÓW TEMATYCZNYCH (AM76 SIGNATURE SFX) ---

  // Wystrzał Pionka: suchy stuk lakierowanego drewna (wg specyfikacji 7.1)
  playPawnShoot() {
    this.zzfx(0.85, 0.04, 261.6, 0.005, 0.02, 0.07, 1, 1.2, -7, 0, 0, 0, 0, 0.15, 0, 0, 0, 0.7, 0.01);
  },

  // Trafienie we wrogą figurę (krótki drewniano-ceramiczny impakt)
  playHitEnemy() {
    this.zzfx(0.7, 0.08, 190, 0.002, 0.015, 0.05, 3, 1.4, -12, 0, 0, 0, 0, 0.35, 0, 0.05);
  },

  // Zniszczenie figury: pęknięcie drewna połączone z basowym dropem (crack-shatter)
  playPieceShatter() {
    this.zzfx(1.1, 0.06, 145, 0.005, 0.06, 0.22, 4, 1.8, -4.5, 0, -40, 0.04, 0, 0.5, 0, 0.1, 0.02, 0.6, 0.03);
  },

  // Klik Zegara Szachowego: metaliczny podwójny klik przy zabójstwie / inkremencie
  playClockClick() {
    this.zzfx(0.65, 0.02, 1180, 0.001, 0.01, 0.045, 1, 2.2, 0, 0, 320, 0.022, 0, 0.05);
  },

  // En Passant Dash: świst powietrza z harmonicznym podbiciem
  playDash() {
    this.zzfx(0.8, 0.03, 320, 0.01, 0.04, 0.12, 0, 0.8, 18, 0, 0, 0, 0, 0.25, 0, 0, 0, 0.75);
  },

  // Zbicie pocisku w locie (En Passant Parry)
  playParryBullet() {
    this.zzfx(0.95, 0.02, 587.3, 0.002, 0.03, 0.14, 1, 1.5, 6, 0, 293.6, 0.035, 0, 0.05);
  },

  // Telegraf wroga / ostrzeżenie przed szarżą
  playTelegraphWarn() {
    this.zzfx(0.45, 0.01, 520, 0.01, 0.03, 0.06, 2, 1.1, 4, 0, 120, 0.03);
  },

  // Uderzenie Skoczka o ziemię (basowe THUD)
  playKnightSlam() {
    this.zzfx(1.0, 0.05, 72, 0.005, 0.05, 0.24, 3, 1.6, -2.5, 0, 0, 0, 0, 0.4, 0, 0.08, 0, 0.65);
  },

  // Obrażenia gracza
  playPlayerHurt() {
    this.zzfx(1.1, 0.05, 130, 0.005, 0.08, 0.28, 2, 2.1, -6, 0, -35, 0.05, 0, 0.6, 0, 0.2);
  },

  // Przełączenie stylu graficznego (klawisz T)
  playThemeSwap() {
    this.zzfx(0.6, 0.01, 440, 0.002, 0.02, 0.08, 1, 1.2, 0, 0, 220, 0.025);
  },

  // Laser Gońca: wysokie, narastające glissando z lekkim pogłosem (Specyfikacja 7.1)
  playBishopLaser() {
    this.zzfx(0.9, 0.02, 540, 0.015, 0.07, 0.24, 1, 1.35, 16, 1.8, 180, 0.04, 0, 0.08, 0, 0, 0.04, 0.75, 0.02);
  },

  // Uderzenie Wieży w bandę: potężne basowe THUD oparte na niskiej częstotliwości 45 Hz (Specyfikacja 7.1)
  playRookThud() {
    this.zzfx(1.35, 0.03, 45, 0.004, 0.09, 0.36, 3, 1.9, -1.2, 0, 0, 0, 0, 0.45, 0, 0.06, 0.02, 0.8, 0.04);
  },

  // Rykoszet od Tarczy Frontalnej Wieży lub bandy szachownicy
  playShieldDeflect() {
    this.zzfx(0.75, 0.03, 920, 0.001, 0.015, 0.09, 2, 1.6, 22, 0, -310, 0.02, 0, 0.1);
  },

  // Zebranie Czarnego Żetonu Gambitu
  playTokenPickup() {
    this.zzfx(0.55, 0.02, 784, 0.001, 0.015, 0.07, 0, 1.1, 0, 0, 261.6, 0.022);
  },

  // Awans figury (Pawn Promotion)
  playPromotion() {
    this.zzfx(1.0, 0.01, 440, 0.01, 0.08, 0.32, 1, 1.2, 0, 0, 220, 0.06, 0.06, 0, 0, 0, 0.03, 0.85);
  },

  // Zakup w Sklepie Gambitu
  playShopBuy() {
    this.zzfx(0.8, 0.01, 523.25, 0.005, 0.03, 0.14, 1, 1.3, 0, 0, 130.8, 0.035);
  },

  // Aktywacja Okrzyku "Szach!" lub Royal Majesty Hetmana
  playCheckShout() {
    this.zzfx(1.15, 0.02, 220, 0.01, 0.12, 0.38, 2, 1.5, 8, -0.5, 440, 0.045, 0, 0.2, 12, 0, 0.05, 0.8);
  },

  // Roszada (Castling) — błyskawiczna zamiana pozycji z klonem
  playCastling() {
    this.zzfx(0.9, 0.02, 360, 0.005, 0.05, 0.18, 0, 1.1, 28, 0, -180, 0.04, 0, 0.1, 0, 0, 0.02);
  }
};

