// --- DANE SZACHOWE ETAPU 2: TEMPA GRY, DRZEWKO EWOLUCJI I SKLEP GAMBITU ---

export const CHESS_TEMPOS = [
  {
    id: 'rapid',
    key: '1',
    name: 'RAPID',
    subtitle: 'Standard (8.5 min • Spokojny Rozwój)',
    totalWaves: 10,
    waveDuration: 50.0,
    miniBossWave: 5,
    councilWave: 8,
    finalBossWave: 10,
    telegraphBase: 0.85,
    enemySpeedMult: 1.0,
    bulletSpeedMult: 0.92,
    spawnCountMult: 1.0,
    tokenDropMult: 1.0,
    bulletHellDensity: 1,
    desc: '10 Fal po 50s (~8.5 min) • Mini-Boss: Fala 5 • Królowa: Fala 10'
  },
  {
    id: 'blitz',
    key: '2',
    name: 'BLITZ',
    subtitle: 'Rekomendowany (6 min • Optymalny Balans)',
    totalWaves: 8,
    waveDuration: 45.0,
    miniBossWave: 4,
    councilWave: 6,
    finalBossWave: 8,
    telegraphBase: 0.50,
    enemySpeedMult: 1.20,
    bulletSpeedMult: 1.10,
    spawnCountMult: 1.2,
    tokenDropMult: 1.35,
    bulletHellDensity: 1,
    desc: '8 Fal po 45s (~6 min) • Mini-Boss: Fala 4 • Królowa: Fala 8'
  },
  {
    id: 'bullet',
    key: '3',
    name: 'BULLET',
    subtitle: 'Szybki Chaos (3.5 min • Bullet Hell)',
    totalWaves: 6,
    waveDuration: 30.0,
    miniBossWave: 3,
    councilWave: null,
    finalBossWave: 6,
    telegraphBase: 0.28,
    enemySpeedMult: 1.40,
    bulletSpeedMult: 1.25,
    spawnCountMult: 1.9,
    tokenDropMult: 1.75,
    bulletHellDensity: 2,
    desc: '6 Fal po 30s (~3.5 min) • Mini-Boss: Fala 3 • Królowa: Fala 6'
  }
];

export const PLAYER_CLASSES = {
  pawn: {
    id: 'pawn',
    name: 'PIONEK',
    tier: 1,
    cost: 0,
    radius: 8,
    speed: 235,
    fireRate: 0.17,
    dashCooldown: 0.95,
    abilityName: 'EN PASSANT DASH',
    attackDesc: 'Pojedynczy precyzyjny strzał wiórem drewna',
    abilityDesc: 'Zryw po skosie; kasuje pocisk (+1.0s do Zegara)',
    passiveDesc: 'Mały hitbox (8x8 px), wysoka zwrotność'
  },
  knight: {
    id: 'knight',
    name: 'SKOCZEK',
    tier: 2,
    cost: 10,
    radius: 11,
    speed: 255,
    fireRate: 0.22,
    dashCooldown: 1.25,
    abilityName: "KNIGHT'S LEAP",
    attackDesc: 'Podwójny strzał podkowami (wachlarz)',
    abilityDesc: 'Skok (0.6s nietykalności) + fala uderzeniowa AoE',
    passiveDesc: 'Przeskakuje nad pociskami, laserami i wrogami'
  },
  bishop: {
    id: 'bishop',
    name: 'GONIEC',
    tier: 2,
    cost: 10,
    radius: 10,
    speed: 235,
    fireRate: 0.19,
    dashCooldown: 1.35,
    abilityName: 'DIAGONAL CLEAVE',
    attackDesc: 'Wiązka laserowa rykoszetująca 1x od bandy',
    abilityDesc: '4 krzyżowe lasery po przekątnych czyszczące linie',
    passiveDesc: '+20% CRIT przy strzale pod kątem ~45°'
  },
  rook: {
    id: 'rook',
    name: 'WIEŻA',
    tier: 2,
    cost: 10,
    radius: 13,
    speed: 205,
    fireRate: 0.30,
    dashCooldown: 1.30,
    abilityName: 'ROOK CHARGE',
    attackDesc: 'Ciężkie kule artyleryjskie miażdżące wrogów',
    abilityDesc: 'Szarża przez planszę rozbijająca wrogów o bandy',
    passiveDesc: 'Frontal Shield: pochłania do 3 pocisków od frontu'
  },
  queen: {
    id: 'queen',
    name: 'HETMAN',
    tier: 3,
    cost: 24,
    radius: 12,
    speed: 255,
    fireRate: 0.20,
    dashCooldown: 4.20,
    abilityName: 'ROYAL MAJESTY',
    attackDesc: 'Królewski ostrzał w 8 kierunkach jednocześnie',
    abilityDesc: 'Spowolnienie czasu o 75% na 3s + nielimitowany Dash',
    passiveDesc: 'Łączy rykoszety Gońca i siłę obalającą Wieży'
  }
};

export const GAMBIT_SHOP_ITEMS = [
  {
    id: 'knights_fork',
    type: 'passive',
    name: 'Widełki Skoczka',
    cost: 6,
    maxLevel: 3,
    desc: 'Krytyk wysyła 2 dodatkowe odłamki w najbliższych wrogów (+15% szansy CRIT).'
  },
  {
    id: 'pinning_shot',
    type: 'passive',
    name: 'Związanie (Pinning Shot)',
    cost: 7,
    maxLevel: 2,
    desc: 'Pociski mają 25% szansy na unieruchomienie wroga w miejscu na 1.5s.'
  },
  {
    id: 'sacrifice_drone',
    type: 'passive',
    name: 'Poświęcenie Pionka',
    cost: 8,
    maxLevel: 1,
    desc: 'Dron-pionek krąży wokół Ciebie; przyjmuje cios i wybucha czyszcząc ekran.'
  },
  {
    id: 'polished_wood',
    type: 'passive',
    name: 'Polerowane Drewno',
    cost: 5,
    maxLevel: 3,
    desc: '+15% do bazowej prędkości poruszania się na szachownicy.'
  },
  {
    id: 'lead_weight',
    type: 'passive',
    name: 'Ołowiany Ciężarek',
    cost: 6,
    maxLevel: 3,
    desc: 'Pociski zyskują silny odrzut (knockback) oraz +25% obrażeń.'
  },
  {
    id: 'castling',
    type: 'active',
    name: 'Roszada [Klawisz E]',
    cost: 7,
    cooldown: 7.0,
    desc: 'Natychmiastowa zamiana miejsc z klonem w przeciwległym rogu szachownicy.'
  },
  {
    id: 'check_shout',
    type: 'active',
    name: 'Okrzyk „Szach!” [Klawisz E]',
    cost: 8,
    cooldown: 8.5,
    desc: 'Fala dźwiękowa kasuje wrogie pociski i zamraża wszystkie figury na 1.5s.'
  }
];

