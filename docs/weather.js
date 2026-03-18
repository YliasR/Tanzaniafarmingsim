// ============================================================
// Weather System — rain, storms, drought, wind
// ============================================================

// ---- Weather states ----
const WEATHER_TYPES = {
  clear:   { label: 'CLEAR',   icon: '☀', fogMult: 1.0, ambMult: 1.0, rainRate: 0 },
  cloudy:  { label: 'CLOUDY',  icon: '☁', fogMult: 1.3, ambMult: 0.85, rainRate: 0 },
  rain:    { label: 'RAIN',    icon: '🌧', fogMult: 1.8, ambMult: 0.65, rainRate: 1.0 },
  storm:   { label: 'STORM',   icon: '⛈', fogMult: 2.5, ambMult: 0.45, rainRate: 2.0 },
  drought: { label: 'DROUGHT', icon: '🌡', fogMult: 0.7, ambMult: 1.15, rainRate: 0 },
};

// ---- Current weather state ----
let currentWeather = 'clear';
let weatherTimer   = 0;         // seconds until next weather change
let weatherDuration = 0;        // total duration of current weather
let droughtDays    = 0;         // consecutive drought counter

// 3-day forecast (array of { type, tempHigh, rainMm })
let weatherForecast = [];

// ---- Transition weights from each weather type ----
// Higher number = more likely transition
const WEATHER_TRANSITIONS = {
  clear:   { clear: 3, cloudy: 4, rain: 1, storm: 0, drought: 2 },
  cloudy:  { clear: 3, cloudy: 2, rain: 4, storm: 1, drought: 0 },
  rain:    { clear: 2, cloudy: 3, rain: 3, storm: 2, drought: 0 },
  storm:   { clear: 1, cloudy: 4, rain: 3, storm: 1, drought: 0 },
  drought: { clear: 4, cloudy: 2, rain: 1, storm: 0, drought: 3 },
};

// ---- Rain particle system ----
let rainParticles = null;
let rainGeometry  = null;
let rainMaterial  = null;
const RAIN_COUNT  = 2000;
const RAIN_AREA   = 60;   // width/depth of rain volume around player
const RAIN_HEIGHT = 30;

function initRainParticles() {
  rainGeometry = new THREE.BufferGeometry();
  const positions  = new Float32Array(RAIN_COUNT * 3);
  const velocities = new Float32Array(RAIN_COUNT);

  for (let i = 0; i < RAIN_COUNT; i++) {
    positions[i * 3]     = (Math.random() - 0.5) * RAIN_AREA;
    positions[i * 3 + 1] = Math.random() * RAIN_HEIGHT;
    positions[i * 3 + 2] = (Math.random() - 0.5) * RAIN_AREA;
    velocities[i] = 12 + Math.random() * 8; // fall speed
  }

  rainGeometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  rainGeometry._velocities = velocities;

  rainMaterial = new THREE.PointsMaterial({
    color: 0xaaccff,
    size: 0.15,
    transparent: true,
    opacity: 0.6,
    depthWrite: false,
  });

  rainParticles = new THREE.Points(rainGeometry, rainMaterial);
  rainParticles.visible = false;
  scene.add(rainParticles);
}

function updateRainParticles(dt) {
  const wt = WEATHER_TYPES[currentWeather];
  const raining = wt.rainRate > 0;
  rainParticles.visible = raining;
  if (!raining) return;

  // Center rain around player
  rainParticles.position.x = player.pos.x;
  rainParticles.position.z = player.pos.z;

  const positions  = rainGeometry.attributes.position.array;
  const velocities = rainGeometry._velocities;
  const speed      = wt.rainRate;

  for (let i = 0; i < RAIN_COUNT; i++) {
    positions[i * 3 + 1] -= velocities[i] * speed * dt;
    if (positions[i * 3 + 1] < -1) {
      positions[i * 3]     = (Math.random() - 0.5) * RAIN_AREA;
      positions[i * 3 + 1] = RAIN_HEIGHT + Math.random() * 5;
      positions[i * 3 + 2] = (Math.random() - 0.5) * RAIN_AREA;
    }
  }

  rainGeometry.attributes.position.needsUpdate = true;

  // Adjust particle opacity for storms
  rainMaterial.opacity = currentWeather === 'storm' ? 0.8 : 0.5;
  rainMaterial.size    = currentWeather === 'storm' ? 0.2 : 0.15;
}

// ---- Lightning flash (storm only) ----
let lightningTimer   = 0;
let lightningFlash   = 0; // 0 = off, decays from 1

function updateLightning(dt) {
  if (currentWeather !== 'storm') { lightningFlash = 0; return; }

  lightningTimer -= dt;
  if (lightningTimer <= 0) {
    lightningTimer = 3 + Math.random() * 8; // 3-11 seconds between flashes
    lightningFlash = 1.0;
  }

  if (lightningFlash > 0) {
    lightningFlash -= dt * 4; // quick fade
    if (lightningFlash < 0) lightningFlash = 0;
  }
}

// ---- Fog overlay for weather ----
const baseFogDensity = 0.003; // matches scene.js default

function applyWeatherFog() {
  const wt = WEATHER_TYPES[currentWeather];
  const targetDensity = baseFogDensity * wt.fogMult;
  // Smooth transition
  scene.fog.density += (targetDensity - scene.fog.density) * 0.02;

  // Lightning flash: briefly brighten fog
  if (lightningFlash > 0) {
    scene.fog.density *= (1 - lightningFlash * 0.5);
  }
}

// ---- Pick next weather ----
function pickNextWeather() {
  const weights = WEATHER_TRANSITIONS[currentWeather];
  const entries = Object.entries(weights);
  const total   = entries.reduce((s, [, w]) => s + w, 0);
  let roll      = Math.random() * total;

  for (const [type, w] of entries) {
    roll -= w;
    if (roll <= 0) return type;
  }
  return 'clear';
}

function generateForecast() {
  weatherForecast = [];
  let simWeather = currentWeather;
  for (let d = 0; d < 3; d++) {
    // Simulate forward
    const weights = WEATHER_TRANSITIONS[simWeather];
    const entries = Object.entries(weights);
    const total   = entries.reduce((s, [, w]) => s + w, 0);
    let roll      = Math.random() * total;
    for (const [type, w] of entries) {
      roll -= w;
      if (roll <= 0) { simWeather = type; break; }
    }

    const wt = WEATHER_TYPES[simWeather];
    const baseTemp = 26 + Math.random() * 6; // 26-32 C base
    const tempAdj  = simWeather === 'drought' ? 4 : simWeather === 'storm' ? -4 : simWeather === 'rain' ? -2 : 0;
    const rainMm   = wt.rainRate > 0 ? Math.round(wt.rainRate * (3 + Math.random() * 15)) : 0;

    weatherForecast.push({
      type: simWeather,
      label: wt.label,
      tempHigh: Math.round(baseTemp + tempAdj),
      rainMm,
    });
  }
}

// ---- Sensor influence ----
function applyWeatherToSensors() {
  const wt = WEATHER_TYPES[currentWeather];

  if (wt.rainRate > 0) {
    // Rain increases moisture and humidity
    S.moisture = Math.min(95, S.moisture + wt.rainRate * 0.15);
    S.humid    = Math.min(98, S.humid + wt.rainRate * 0.1);
    S.airTemp  -= 0.02 * wt.rainRate;
    S.soilTemp -= 0.01 * wt.rainRate;
  }

  if (currentWeather === 'drought') {
    // Drought dries soil, heats air
    S.moisture = Math.max(8, S.moisture - 0.12);
    S.humid    = Math.max(15, S.humid - 0.08);
    S.airTemp  += 0.03;
    S.soilTemp += 0.02;
  }

  if (currentWeather === 'clear') {
    // Gentle drying
    S.moisture = Math.max(15, S.moisture - 0.02);
  }

  // Clamp to sensor limits
  S.moisture = Math.max(SENSOR_LIMITS.moisture.min, Math.min(SENSOR_LIMITS.moisture.max, S.moisture));
  S.humid    = Math.max(SENSOR_LIMITS.humid.min,    Math.min(SENSOR_LIMITS.humid.max, S.humid));
  S.airTemp  = Math.max(SENSOR_LIMITS.airTemp.min,  Math.min(SENSOR_LIMITS.airTemp.max, S.airTemp));
  S.soilTemp = Math.max(SENSOR_LIMITS.soilTemp.min, Math.min(SENSOR_LIMITS.soilTemp.max, S.soilTemp));
}

// ---- Crop effects ----
function applyWeatherToCrops(dt) {
  const wt = WEATHER_TYPES[currentWeather];

  if (wt.rainRate > 0) {
    // Rain auto-waters growing crops (like a free watering can)
    for (const cell of farmCells) {
      if (cell.stage < 0 || cell.stage >= 3 || cell.watered) continue;
      // Rain has a chance per frame to water — heavier = higher chance
      if (Math.random() < wt.rainRate * 0.3 * dt) {
        cell.watered = true;
        const remaining = cell.nextStageAt - farmRealTime;
        if (remaining > 0) cell.nextStageAt = farmRealTime + remaining / 3;
      }
    }
  }

  if (currentWeather === 'drought') {
    // Drought slows growing crops (extends their timer slightly each frame)
    for (const cell of farmCells) {
      if (cell.stage < 0 || cell.stage >= 3) continue;
      cell.nextStageAt += dt * 0.15; // 15% slowdown per second
    }
  }
}

// ---- Weather change logic ----
function changeWeather() {
  const prev = currentWeather;
  currentWeather = pickNextWeather();

  // Duration: 60-180 real seconds (= roughly 0.2–0.6 game days)
  weatherDuration = 60 + Math.random() * 120;
  weatherTimer    = weatherDuration;

  // Track drought streaks
  if (currentWeather === 'drought') {
    droughtDays++;
  } else {
    droughtDays = 0;
  }

  // Cap drought at 3 consecutive — force rain
  if (droughtDays >= 3) {
    currentWeather = 'rain';
    droughtDays = 0;
  }

  generateForecast();
}

// ---- Master update (called each frame from app.js) ----
function updateWeather(dt) {
  weatherTimer -= dt;
  if (weatherTimer <= 0) {
    changeWeather();
  }

  updateRainParticles(dt);
  updateLightning(dt);
  applyWeatherFog();
  applyWeatherToSensors();
  applyWeatherToCrops(dt);
}

// ---- HUD ----
function updateWeatherHUD() {
  const el = document.getElementById('weather-hud');
  if (!el) return;
  const wt = WEATHER_TYPES[currentWeather];
  el.textContent = wt.icon + ' ' + wt.label;
}

// ---- Forecast string for AI SMS ----
function getWeatherForecastString() {
  if (weatherForecast.length === 0) generateForecast();
  let str = '';
  for (let i = 0; i < weatherForecast.length; i++) {
    const f = weatherForecast[i];
    str += `Day ${i + 1}: ${f.tempHigh}C, ${f.label.toLowerCase()}, ${f.rainMm}mm rain\n`;
  }
  return str.trim();
}

// Expose for other modules
window.getWeatherForecastString = getWeatherForecastString;

// ---- Ambient light modifier (used by app.js day/night) ----
function getWeatherAmbientMult() {
  const wt = WEATHER_TYPES[currentWeather];
  const base = wt.ambMult;
  // Lightning flash adds brief brightness
  return base + lightningFlash * 0.6;
}

// ---- Init ----
function initWeather() {
  initRainParticles();
  // Start with a random weather
  const types = ['clear', 'clear', 'cloudy', 'rain']; // bias toward clear at start
  currentWeather = types[Math.floor(Math.random() * types.length)];
  weatherDuration = 60 + Math.random() * 120;
  weatherTimer    = weatherDuration;
  generateForecast();
}
