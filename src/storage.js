// --- ASYNCHRONICZNA PERSYSTENCJA INDEXEDDB (AM76_CHESS_DB - ETAP 3) ---
// Zgodnie ze specyfikacją 8.3 i standardem AM76 GAS: zero wywołań google.script.run w pętli gry,
// w 100% nieblokujący zapis rekordów, odblokowanych klas, osiągnięć i wybranego stylu.

const DB_NAME = 'AM76_CHESS_DB';
const DB_VERSION = 1;
const STORE_NAME = 'profile_store';
const PROFILE_KEY = 'player_profile_v1';

function createDefaultProfile() {
  return {
    themeIndex: 0,
    tempoId: 'blitz',
    totalKills: 0,
    totalRuns: 0,
    bossesDefeated: 0,
    unlockedClasses: ['pawn', 'knight', 'bishop', 'rook', 'queen'],
    achievements: [],
    highScores: {
      rapid: { bestWave: 1, bestKills: 0, victories: 0 },
      blitz: { bestWave: 1, bestKills: 0, victories: 0 },
      bullet: { bestWave: 1, bestKills: 0, victories: 0 }
    }
  };
}

export const StorageEngine = {
  db: null,
  profile: createDefaultProfile(),
  ready: false,

  async init() {
    // 1. Szybki odczyt awaryjny z localStorage (natychmiastowa dostępność przed otwarciem IDB)
    try {
      const raw = localStorage.getItem(`${DB_NAME}_${PROFILE_KEY}`);
      if (raw) {
        const parsed = JSON.parse(raw);
        this._mergeProfile(parsed);
      }
    } catch (_) {
      // Ignoruj blokadę cookies/localStorage w restrykcyjnym iframe
    }

    // 2. Otwarcie bazy IndexedDB AM76_CHESS_DB
    if (typeof indexedDB === 'undefined') {
      this.ready = true;
      return this.profile;
    }

    return new Promise((resolve) => {
      try {
        const req = indexedDB.open(DB_NAME, DB_VERSION);

        req.onupgradeneeded = (e) => {
          const db = e.target.result;
          if (!db.objectStoreNames.contains(STORE_NAME)) {
            db.createObjectStore(STORE_NAME);
          }
        };

        req.onsuccess = (e) => {
          this.db = e.target.result;
          this._readFromIdb().then((idbData) => {
            if (idbData) {
              this._mergeProfile(idbData);
            }
            this.ready = true;
            resolve(this.profile);
          });
        };

        req.onerror = () => {
          this.ready = true;
          resolve(this.profile);
        };
      } catch (_) {
        this.ready = true;
        resolve(this.profile);
      }
    });
  },

  _mergeProfile(data) {
    if (!data || typeof data !== 'object') return;
    if (typeof data.themeIndex === 'number') this.profile.themeIndex = data.themeIndex;
    if (typeof data.tempoId === 'string') this.profile.tempoId = data.tempoId;
    if (typeof data.totalKills === 'number') this.profile.totalKills = data.totalKills;
    if (typeof data.totalRuns === 'number') this.profile.totalRuns = data.totalRuns;
    if (typeof data.bossesDefeated === 'number') this.profile.bossesDefeated = data.bossesDefeated;
    if (Array.isArray(data.achievements)) this.profile.achievements = data.achievements;
    if (data.highScores && typeof data.highScores === 'object') {
      for (const tid of ['rapid', 'blitz', 'bullet']) {
        if (data.highScores[tid]) {
          this.profile.highScores[tid] = {
            bestWave: Math.max(1, data.highScores[tid].bestWave || 1),
            bestKills: Math.max(0, data.highScores[tid].bestKills || 0),
            victories: Math.max(0, data.highScores[tid].victories || 0)
          };
        }
      }
    }
  },

  _readFromIdb() {
    return new Promise((resolve) => {
      if (!this.db) {
        resolve(null);
        return;
      }
      try {
        const tx = this.db.transaction(STORE_NAME, 'readonly');
        const store = tx.objectStore(STORE_NAME);
        const req = store.get(PROFILE_KEY);
        req.onsuccess = () => resolve(req.result || null);
        req.onerror = () => resolve(null);
      } catch (_) {
        resolve(null);
      }
    });
  },

  // Asynchroniczny zapis w tle (Fire-and-Forget — zero wpływu na klatki 60 FPS)
  saveAsync() {
    const snapshot = JSON.parse(JSON.stringify(this.profile));

    try {
      localStorage.setItem(`${DB_NAME}_${PROFILE_KEY}`, JSON.stringify(snapshot));
    } catch (_) {
      // Ignoruj błędy quota/sandbox
    }

    if (!this.db) return;
    try {
      const tx = this.db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      store.put(snapshot, PROFILE_KEY);
    } catch (_) {
      // Ignoruj błędy transakcji w tle
    }
  },

  recordTheme(themeIndex) {
    this.profile.themeIndex = themeIndex;
    this.saveAsync();
  },

  recordTempo(tempoId) {
    this.profile.tempoId = tempoId;
    this.saveAsync();
  },

  unlockAchievement(id, title) {
    if (!this.profile.achievements.includes(title)) {
      this.profile.achievements.push(title);
      this.saveAsync();
      return true;
    }
    return false;
  },

  recordRunResult(tempoId, wave, kills, isVictory = false) {
    this.profile.totalRuns++;
    this.profile.totalKills += kills;

    const hs = this.profile.highScores[tempoId] || this.profile.highScores.blitz;
    if (wave > hs.bestWave) hs.bestWave = wave;
    if (kills > hs.bestKills) hs.bestKills = kills;
    if (isVictory) hs.victories++;

    this.saveAsync();
  }
};

