// ============================================================
// Audio — fully procedural WebAudio (no asset files)
//   SFX:      footsteps, plant/water/harvest, shop, rifle, UI
//   Ambience: wind, rain, thunder, birds (day), crickets (night)
//   Music:    generative kalimba on a pentatonic scale
// Loaded last; hooks in by wrapping global functions.
// ============================================================

let _actx = null;
let _master, _musicBus, _sfxBus, _ambBus;
let _audioStarted = false;

// ---- Preferences ----
const _audioPrefs = {
  music: localStorage.getItem('farmsim_audio_music') !== '0',
  sfx:   localStorage.getItem('farmsim_audio_sfx') !== '0',
  vol:   parseFloat(localStorage.getItem('farmsim_audio_vol') ?? '0.8'),
};

function _ensureCtx() {
  if (_actx) return _actx;
  const AC = window.AudioContext || window.webkitAudioContext;
  if (!AC) return null;
  _actx = new AC();

  _master = _actx.createGain();
  _master.gain.value = _audioPrefs.vol;
  _master.connect(_actx.destination);

  _musicBus = _actx.createGain();
  _musicBus.gain.value = _audioPrefs.music ? 0.5 : 0;
  _musicBus.connect(_master);

  _sfxBus = _actx.createGain();
  _sfxBus.gain.value = _audioPrefs.sfx ? 1 : 0;
  _sfxBus.connect(_master);

  _ambBus = _actx.createGain();
  _ambBus.gain.value = _audioPrefs.sfx ? 1 : 0; // ambience follows the SFX toggle
  _ambBus.connect(_master);

  return _actx;
}

function applyAudioPrefs() {
  localStorage.setItem('farmsim_audio_music', _audioPrefs.music ? '1' : '0');
  localStorage.setItem('farmsim_audio_sfx', _audioPrefs.sfx ? '1' : '0');
  localStorage.setItem('farmsim_audio_vol', String(_audioPrefs.vol));
  if (!_actx) return;
  _musicBus.gain.value = _audioPrefs.music ? 0.5 : 0;
  _sfxBus.gain.value = _audioPrefs.sfx ? 1 : 0;
  _ambBus.gain.value = _audioPrefs.sfx ? 1 : 0;
  _master.gain.value = _audioPrefs.vol;
}

// ============================================================
// Synthesis primitives
// ============================================================
function _tone(freq, dur, { type = 'sine', gain = 0.2, dest = null, attack = 0.005, slideTo = null } = {}) {
  const ctx = _ensureCtx();
  if (!ctx || ctx.state !== 'running') return;
  const t = ctx.currentTime;
  const osc = ctx.createOscillator();
  const g = ctx.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, t);
  if (slideTo) osc.frequency.exponentialRampToValueAtTime(Math.max(1, slideTo), t + dur);
  g.gain.setValueAtTime(0, t);
  g.gain.linearRampToValueAtTime(gain, t + attack);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  osc.connect(g).connect(dest || _sfxBus);
  osc.start(t);
  osc.stop(t + dur + 0.05);
}

let _noiseBuf = null;
function _getNoiseBuf() {
  const ctx = _ensureCtx();
  if (_noiseBuf) return _noiseBuf;
  const len = ctx.sampleRate * 2;
  _noiseBuf = ctx.createBuffer(1, len, ctx.sampleRate);
  const d = _noiseBuf.getChannelData(0);
  for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
  return _noiseBuf;
}

function _noiseBurst(dur, { freq = 1000, q = 1, gain = 0.2, type = 'bandpass', dest = null, slideTo = null } = {}) {
  const ctx = _ensureCtx();
  if (!ctx || ctx.state !== 'running') return;
  const t = ctx.currentTime;
  const src = ctx.createBufferSource();
  src.buffer = _getNoiseBuf();
  src.loop = true;
  const f = ctx.createBiquadFilter();
  f.type = type;
  f.frequency.setValueAtTime(freq, t);
  if (slideTo) f.frequency.exponentialRampToValueAtTime(Math.max(10, slideTo), t + dur);
  f.Q.value = q;
  const g = ctx.createGain();
  g.gain.setValueAtTime(0, t);
  g.gain.linearRampToValueAtTime(gain, t + 0.008);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  src.connect(f).connect(g).connect(dest || _sfxBus);
  src.start(t);
  src.stop(t + dur + 0.05);
}

// Kalimba-style pluck (also used for jingles)
function _pluck(freq, { gain = 0.16, dur = 1.1, dest = null } = {}) {
  const ctx = _ensureCtx();
  if (!ctx || ctx.state !== 'running') return;
  const t = ctx.currentTime;
  const osc = ctx.createOscillator();
  osc.type = 'triangle';
  osc.frequency.value = freq;
  const osc2 = ctx.createOscillator(); // soft overtone for the metallic tine feel
  osc2.type = 'sine';
  osc2.frequency.value = freq * 2.01;
  const g = ctx.createGain();
  g.gain.setValueAtTime(0, t);
  g.gain.linearRampToValueAtTime(gain, t + 0.004);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  const g2 = ctx.createGain();
  g2.gain.setValueAtTime(0, t);
  g2.gain.linearRampToValueAtTime(gain * 0.25, t + 0.002);
  g2.gain.exponentialRampToValueAtTime(0.0001, t + dur * 0.4);
  osc.connect(g).connect(dest || _musicBus);
  osc2.connect(g2).connect(dest || _musicBus);
  osc.start(t); osc.stop(t + dur + 0.1);
  osc2.start(t); osc2.stop(t + dur + 0.1);
}

// ============================================================
// SFX vocabulary (called from hooks below + other modules)
// ============================================================
function sfxStep(sprint) {
  _noiseBurst(0.07, { freq: 380 + Math.random() * 160, q: 0.8, gain: sprint ? 0.07 : 0.05, type: 'lowpass' });
}
function sfxPlant()   { _tone(130, 0.12, { type: 'sine', gain: 0.22 }); _noiseBurst(0.08, { freq: 500, gain: 0.06, type: 'lowpass' }); }
function sfxWater()   { _noiseBurst(0.4, { freq: 1400, q: 1.2, gain: 0.1, slideTo: 500 }); }
function sfxHarvest() { _pluck(523, { dest: _sfxBus, gain: 0.18, dur: 0.5 }); setTimeout(() => _pluck(659, { dest: _sfxBus, gain: 0.15, dur: 0.5 }), 70); }
function sfxFertilize(){ _noiseBurst(0.25, { freq: 700, gain: 0.07, slideTo: 300, type: 'lowpass' }); }
function sfxBuy()     { _tone(660, 0.1, { type: 'square', gain: 0.05 }); setTimeout(() => _tone(880, 0.12, { type: 'square', gain: 0.05 }), 80); }
function sfxSell()    { _tone(880, 0.09, { type: 'square', gain: 0.05 }); setTimeout(() => _tone(1318, 0.14, { type: 'square', gain: 0.05 }), 70); }
function sfxDenied()  { _tone(220, 0.15, { type: 'square', gain: 0.04, slideTo: 180 }); }
function sfxShoot()   { _noiseBurst(0.16, { freq: 2200, q: 0.5, gain: 0.25, type: 'highpass' }); _tone(95, 0.1, { type: 'sine', gain: 0.3, slideTo: 50 }); }
function sfxPickup()  { _tone(740, 0.08, { type: 'sine', gain: 0.12 }); setTimeout(() => _tone(988, 0.1, { type: 'sine', gain: 0.1 }), 55); }
function sfxProduce() { _tone(587, 0.09, { type: 'sine', gain: 0.08 }); }
function sfxClick()   { _tone(2000, 0.03, { type: 'sine', gain: 0.04 }); }
function sfxQuest()   { [523, 659, 784].forEach((f, i) => setTimeout(() => _pluck(f, { dest: _sfxBus, gain: 0.16, dur: 0.7 }), i * 110)); }
function sfxAchievement() { [523, 659, 784, 1046].forEach((f, i) => setTimeout(() => _pluck(f, { dest: _sfxBus, gain: 0.17, dur: 0.9 }), i * 130)); }
function sfxSeason()  { [392, 523, 659].forEach((f, i) => setTimeout(() => _pluck(f, { dest: _sfxBus, gain: 0.13, dur: 0.8 }), i * 150)); }
function sfxSleep()   { _tone(440, 0.8, { type: 'sine', gain: 0.06, slideTo: 220 }); }
function sfxThunder() {
  _noiseBurst(2.2, { freq: 120, q: 0.4, gain: 0.32, type: 'lowpass', slideTo: 45, dest: _ambBus });
  setTimeout(() => _noiseBurst(1.4, { freq: 90, q: 0.4, gain: 0.18, type: 'lowpass', slideTo: 40, dest: _ambBus }), 300);
}
function sfxBirdChirp() {
  const base = 2200 + Math.random() * 1400;
  const n = 2 + Math.floor(Math.random() * 3);
  for (let i = 0; i < n; i++) {
    setTimeout(() => _tone(base + Math.random() * 300, 0.07, { type: 'sine', gain: 0.035, slideTo: base * 0.75, dest: _ambBus }), i * (90 + Math.random() * 60));
  }
}
function sfxCricket() {
  for (let i = 0; i < 5; i++) {
    setTimeout(() => _tone(4100 + Math.random() * 250, 0.025, { type: 'sine', gain: 0.022, dest: _ambBus }), i * 42);
  }
}

// ============================================================
// Continuous ambience — wind + rain beds with weather-driven levels
// ============================================================
let _windGain = null, _rainGain = null;

function _startAmbienceBeds() {
  const ctx = _ensureCtx();
  if (!ctx || _windGain) return;

  // Wind: looped noise -> gentle lowpass, slow random swells
  const wind = ctx.createBufferSource();
  wind.buffer = _getNoiseBuf();
  wind.loop = true;
  const windF = ctx.createBiquadFilter();
  windF.type = 'lowpass';
  windF.frequency.value = 320;
  _windGain = ctx.createGain();
  _windGain.gain.value = 0.018;
  wind.connect(windF).connect(_windGain).connect(_ambBus);
  wind.start();

  // Rain: looped noise -> bandpass, gain driven by weather each tick
  const rain = ctx.createBufferSource();
  rain.buffer = _getNoiseBuf();
  rain.loop = true;
  const rainF = ctx.createBiquadFilter();
  rainF.type = 'bandpass';
  rainF.frequency.value = 1700;
  rainF.Q.value = 0.6;
  _rainGain = ctx.createGain();
  _rainGain.gain.value = 0;
  rain.connect(rainF).connect(_rainGain).connect(_ambBus);
  rain.start();
}

let _lastLightning = 0;
let _nextBird = 0;
let _nextCricket = 0;

setInterval(() => {
  if (!_actx || _actx.state !== 'running' || !_windGain) return;
  const t = _actx.currentTime;
  const paused = typeof gamePaused !== 'undefined' && gamePaused;
  const menuUp = !document.getElementById('menu-overlay').classList.contains('hidden');

  // Weather-driven levels
  const w = (typeof currentWeather !== 'undefined') ? currentWeather : 'clear';
  const rainTarget = paused ? 0 : (w === 'storm' ? 0.16 : w === 'rain' ? 0.09 : 0);
  const windTarget = paused ? 0.008 : (w === 'storm' ? 0.07 : w === 'drought' ? 0.035 : 0.018 + Math.sin(t * 0.13) * 0.008);
  _rainGain.gain.setTargetAtTime(rainTarget, t, 0.8);
  _windGain.gain.setTargetAtTime(Math.max(0.004, windTarget), t, 1.2);

  // Thunder follows the lightning flash from weather.js
  if (typeof lightningFlash !== 'undefined') {
    if (lightningFlash > 0.9 && _lastLightning <= 0.9) {
      setTimeout(sfxThunder, 250 + Math.random() * 1200); // light arrives before sound
    }
    _lastLightning = lightningFlash;
  }

  // Day birds / night crickets
  if (!paused && !menuUp && typeof dayTime !== 'undefined') {
    const isNight = dayTime > 0.75 || dayTime < 0.23;
    const now = performance.now();
    if (!isNight && w !== 'storm' && w !== 'rain' && now > _nextBird) {
      sfxBirdChirp();
      _nextBird = now + 3500 + Math.random() * 9000;
    }
    if (isNight && now > _nextCricket) {
      sfxCricket();
      _nextCricket = now + 900 + Math.random() * 2200;
    }
  }
}, 250);

// ============================================================
// Generative music — sparse kalimba over a pentatonic scale
// ============================================================
const _SCALE = [261.63, 293.66, 329.63, 392.0, 440.0, 523.25, 587.33, 659.25, 784.0]; // C maj pentatonic, 2 octaves
let _melodyPos = 4;
let _musicSlot = 0;

setInterval(() => {
  if (!_actx || _actx.state !== 'running' || !_audioPrefs.music) return;
  if (typeof gamePaused !== 'undefined' && gamePaused) return;

  const isNight = (typeof dayTime !== 'undefined') && (dayTime > 0.75 || dayTime < 0.23);
  const density = isNight ? 0.3 : 0.5;
  _musicSlot++;

  if (Math.random() < density) {
    // Random-walk melody over the scale
    _melodyPos += Math.floor(Math.random() * 5) - 2;
    _melodyPos = Math.max(0, Math.min(_SCALE.length - 1, _melodyPos));
    _pluck(_SCALE[_melodyPos], { gain: 0.12, dur: isNight ? 1.6 : 1.1 });

    // Occasional harmony a third (two scale steps) below
    if (Math.random() < 0.22 && _melodyPos >= 2) {
      setTimeout(() => _pluck(_SCALE[_melodyPos - 2], { gain: 0.07, dur: 1.2 }), 40);
    }
  }

  // Slow root drone every 16 slots
  if (_musicSlot % 16 === 0) {
    _tone(130.81, 5.5, { type: 'sine', gain: 0.03, dest: _musicBus, attack: 1.8 });
    _tone(196.0, 5.5, { type: 'sine', gain: 0.018, dest: _musicBus, attack: 2.2 });
  }
}, 520);

// ============================================================
// Boot — WebAudio needs a user gesture before it can play
// ============================================================
function _startAudio() {
  if (_audioStarted) return;
  const ctx = _ensureCtx();
  if (!ctx) return;
  ctx.resume().then(() => {
    _audioStarted = true;
    _startAmbienceBeds();
  });
}
window.addEventListener('pointerdown', _startAudio, { once: true });
window.addEventListener('keydown', _startAudio, { once: true });

// ============================================================
// Hooks into gameplay (wrap global functions; zero edits elsewhere)
// ============================================================

// Footsteps via the player update
(function hookSteps() {
  const orig = updatePlayer;
  let stepTimer = 0;
  updatePlayer = function (dt) {
    orig(dt);
    if (dt <= 0 || !player.onGround) return;
    const speed = Math.hypot(player.vel.x, player.vel.z);
    if (speed < 0.5) { stepTimer = 0.12; return; }
    const sprint = speed > 10;
    stepTimer -= dt;
    if (stepTimer <= 0) {
      sfxStep(sprint);
      stepTimer = sprint ? 0.3 : 0.46;
    }
  };
})();

// Rifle
(function hookShoot() {
  const orig = shoot;
  shoot = function () {
    const before = projectiles.length;
    orig();
    if (projectiles.length > before) sfxShoot();
  };
})();

// Farming actions
(function hookFarm() {
  const origPlant = plantCell;
  plantCell = function (idx) { origPlant(idx); sfxPlant(); };
  const origHarvest = harvestCell;
  harvestCell = function (idx) { origHarvest(idx); sfxHarvest(); };
  const origFert = onFertilizerUsed;
  onFertilizerUsed = function () { origFert(); sfxFertilize(); };
})();

// Watering has no dedicated function — listen for the same key path
window.addEventListener('keydown', e => {
  if (e.code !== 'KeyF' || typeof hoveredCell === 'undefined' || hoveredCell < 0) return;
  const cell = farmCells[hoveredCell];
  if (cell && cell.stage >= 0 && cell.stage < 3 && !cell.watered && ownedTools.wateringCan) sfxWater();
});

// Shop / market — success or denied beep
(function hookShop() {
  const wrap = (fnName, sound) => {
    const orig = window[fnName];
    if (typeof orig !== 'function') return;
    window[fnName] = function (...args) {
      const before = playerMoney;
      orig(...args);
      if (playerMoney !== before) sound(); else sfxDenied();
    };
  };
  for (const f of ['buySeeds', 'buyTool', 'buyFertilizer', 'buyFeed', 'buyFencing', 'buyChicken', 'buyCow']) wrap(f, sfxBuy);
  for (const f of ['sellCrop', 'sellProduct', 'sellLoot']) wrap(f, sfxSell);
})();

// Loot pickup — detect inventory growth
(function hookPickup() {
  const orig = updateInventoryHUD;
  let lastTotal = inventory.meat + inventory.hide + inventory.feathers;
  updateInventoryHUD = function () {
    orig();
    const total = inventory.meat + inventory.hide + inventory.feathers;
    if (total > lastTotal) sfxPickup();
    lastTotal = total;
  };
})();

// Eggs / milk
(function hookProduce() {
  const orig = _flashAnimalProduct;
  _flashAnimalProduct = function (type, amount) { orig(type, amount); sfxProduce(); };
})();

// Quests
(function hookQuests() {
  const orig = completeQuest;
  completeQuest = function (quest) { orig(quest); sfxQuest(); };
})();

// Sleep
(function hookSleep() {
  const orig = sleepUntilMorning;
  sleepUntilMorning = function () { orig(); sfxSleep(); };
})();

// Menu buttons — soft click
document.addEventListener('click', e => {
  if (e.target.closest('.menu-btn, .trade-btn, .toggle-key-btn')) sfxClick();
});

// ============================================================
// Settings integration (Audio section added in index.html)
// ============================================================
(function hookSettings() {
  const origSave = saveSettings;
  saveSettings = function () {
    origSave();
    const musicEl = document.getElementById('music-toggle');
    const sfxEl = document.getElementById('sfx-toggle');
    const volEl = document.getElementById('audiovol-slider');
    if (musicEl) _audioPrefs.music = musicEl.checked;
    if (sfxEl) _audioPrefs.sfx = sfxEl.checked;
    if (volEl) _audioPrefs.vol = parseFloat(volEl.value);
    applyAudioPrefs();
  };

  // Initialize the controls from stored prefs
  const musicEl = document.getElementById('music-toggle');
  const sfxEl = document.getElementById('sfx-toggle');
  const volEl = document.getElementById('audiovol-slider');
  const volLabel = document.getElementById('audiovol-value');
  if (musicEl) musicEl.checked = _audioPrefs.music;
  if (sfxEl) sfxEl.checked = _audioPrefs.sfx;
  if (volEl) {
    volEl.value = _audioPrefs.vol;
    if (volLabel) volLabel.textContent = Math.round(_audioPrefs.vol * 100) + '%';
    volEl.addEventListener('input', () => {
      _audioPrefs.vol = parseFloat(volEl.value);
      if (volLabel) volLabel.textContent = Math.round(_audioPrefs.vol * 100) + '%';
      applyAudioPrefs();
    });
  }
})();
