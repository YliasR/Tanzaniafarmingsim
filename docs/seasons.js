// ============================================================
// Seasons — Tanzanian seasonal cycle (Nice-to-Have)
// Loaded after app.js. Hooks in by wrapping global functions;
// season is derived from farmRealTime, so it needs no save state.
// ============================================================

// Crop order: MAIZE, BEANS, SORGHUM, CASSAVA, GROUNDNUTS
// growth: >1 grows faster this season, <1 slower.
// weatherBias: added to the weather transition weights (clamped at 0).
const SEASONS = [
  {
    id: 'kaskazi', name: 'KASKAZI', desc: 'hot & dry',
    icon: '\u{1F31E}', days: 2,
    growth: [0.85, 0.80, 1.10, 1.00, 0.90],
    weatherBias: { clear: 2, cloudy: 0, rain: -1, storm: -1, drought: 1 },
  },
  {
    id: 'masika', name: 'MASIKA', desc: 'long rains',
    icon: '\u{1F327}', days: 3,
    growth: [1.30, 1.25, 1.00, 1.10, 1.20],
    weatherBias: { clear: -1, cloudy: 1, rain: 3, storm: 1, drought: -3 },
  },
  {
    id: 'kiangazi', name: 'KIANGAZI', desc: 'dry season',
    icon: '☀', days: 4,
    growth: [0.60, 0.65, 1.05, 0.95, 0.80],
    weatherBias: { clear: 1, cloudy: 0, rain: -2, storm: -2, drought: 3 },
  },
  {
    id: 'vuli', name: 'VULI', desc: 'short rains',
    icon: '\u{1F326}', days: 3,
    growth: [1.15, 1.10, 1.00, 1.05, 1.10],
    weatherBias: { clear: 0, cloudy: 1, rain: 2, storm: 0, drought: -2 },
  },
];

const YEAR_DAYS = SEASONS.reduce((s, x) => s + x.days, 0);
const YEAR_SECONDS = YEAR_DAYS * DAY_DURATION;

function getSeasonInfo() {
  const totalDay = Math.floor(farmRealTime / DAY_DURATION);
  let dayInYear = totalDay % YEAR_DAYS;
  for (const season of SEASONS) {
    if (dayInYear < season.days) {
      return { season, dayInSeason: dayInYear + 1, totalDay };
    }
    dayInYear -= season.days;
  }
  return { season: SEASONS[0], dayInSeason: 1, totalDay };
}

function getCurrentSeason() {
  return getSeasonInfo().season;
}
window.getCurrentSeason = getCurrentSeason;

// ---- Hook: seasonal crop growth (wraps farming.js getStageDuration) ----
(function hookGrowth() {
  const orig = getStageDuration;
  getStageDuration = function (seedType, stageIdx, cellGrowMult) {
    const mult = getCurrentSeason().growth[seedType] || 1;
    return orig(seedType, stageIdx, cellGrowMult) / mult;
  };
})();

// ---- Hook: seasonal weather bias (wraps weather.js pickNextWeather) ----
(function hookWeather() {
  pickNextWeather = function () {
    const base = WEATHER_TRANSITIONS[currentWeather];
    const bias = getCurrentSeason().weatherBias;
    const entries = Object.entries(base).map(([type, w]) => [type, Math.max(0, w + (bias[type] || 0))]);
    const total = entries.reduce((s, [, w]) => s + w, 0);
    if (total <= 0) return 'clear';
    let roll = Math.random() * total;
    for (const [type, w] of entries) {
      roll -= w;
      if (roll <= 0) return type;
    }
    return 'clear';
  };
})();

// ---- Season HUD chip + change notifications ----
let _lastSeasonId = null;
setInterval(() => {
  const { season, dayInSeason } = getSeasonInfo();

  const el = document.getElementById('season-hud');
  if (el) {
    el.textContent = season.icon + ' ' + season.name + ' ' + dayInSeason + '/' + season.days;
    el.title = season.desc;
  }

  if (_lastSeasonId === null) {
    _lastSeasonId = season.id; // no toast on first tick
  } else if (season.id !== _lastSeasonId) {
    _lastSeasonId = season.id;
    if (typeof showQuestNotification === 'function') {
      showQuestNotification('Season change: ' + season.name + ' — ' + season.desc);
    }
    if (typeof sfxSeason === 'function') sfxSeason();
  }
}, 1000);

// ---- Hook: count harvests made during Masika (for the seasonal quest) ----
(function hookMasikaHarvest() {
  const orig = onCropHarvested;
  onCropHarvested = function (seedType) {
    orig(seedType);
    if (getCurrentSeason().id === 'masika') {
      questProgress.masika_harvest = (questProgress.masika_harvest || 0) + 1;
    }
  };
})();

// ---- Seasonal planting hint in the farm tooltip ----
// Shown via the seed toolbar title; the growth effect itself already
// speaks through the multipliers above.
function getSeasonCropHint(seedType) {
  const m = getCurrentSeason().growth[seedType] || 1;
  if (m >= 1.15) return ' (thrives now!)';
  if (m <= 0.7) return ' (bad season)';
  return '';
}
window.getSeasonCropHint = getSeasonCropHint;
