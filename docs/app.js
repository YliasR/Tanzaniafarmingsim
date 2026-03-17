// ============================================================
// Day / Night cycle
// ============================================================
let dayTime = 0.35;           // 0 = midnight, 0.25 = sunrise, 0.5 = noon, 0.75 = sunset
const DAY_DURATION = 300;     // seconds per full cycle

// Sky keyframes: [time, skyHex, fogHex, ambientIntensity]
// sky = multiplicative tint on the sky dome texture
//   0xffffff = full texture colour (day), dark = night, warm = dawn/dusk
const SKY_KF = [
  { t: 0.00, sky: new THREE.Color(0x030320), fog: new THREE.Color(0x020215), amb: 0.08 },
  { t: 0.20, sky: new THREE.Color(0x080840), fog: new THREE.Color(0x060628), amb: 0.08 },
  { t: 0.25, sky: new THREE.Color(0xc06020), fog: new THREE.Color(0xc87030), amb: 0.22 },
  { t: 0.30, sky: new THREE.Color(0xffffff), fog: new THREE.Color(0xc8b890), amb: 0.55 },
  { t: 0.50, sky: new THREE.Color(0xffffff), fog: new THREE.Color(0xc8b890), amb: 0.55 },
  { t: 0.70, sky: new THREE.Color(0xffffff), fog: new THREE.Color(0xc8b890), amb: 0.55 },
  { t: 0.75, sky: new THREE.Color(0xe07020), fog: new THREE.Color(0xd09040), amb: 0.28 },
  { t: 0.82, sky: new THREE.Color(0x200408), fog: new THREE.Color(0x200008), amb: 0.10 },
  { t: 0.90, sky: new THREE.Color(0x030320), fog: new THREE.Color(0x020215), amb: 0.08 },
  { t: 1.00, sky: new THREE.Color(0x030320), fog: new THREE.Color(0x020215), amb: 0.08 },
];

function lerpKF(kf, t, prop) {
  for (let i = 0; i < kf.length - 1; i++) {
    if (t >= kf[i].t && t < kf[i + 1].t) {
      const a = (t - kf[i].t) / (kf[i + 1].t - kf[i].t);
      if (typeof kf[i][prop] === 'number') return kf[i][prop] + (kf[i + 1][prop] - kf[i][prop]) * a;
      return new THREE.Color().copy(kf[i][prop]).lerp(kf[i + 1][prop], a);
    }
  }
  const last = kf[kf.length - 1][prop];
  return typeof last === 'number' ? last : new THREE.Color().copy(last);
}

function updateDayNight(dt) {
  dayTime = (dayTime + dt / DAY_DURATION) % 1.0;

  // Sky dome tint + fog colour
  skyDome.material.color.copy(lerpKF(SKY_KF, dayTime, 'sky'));
  scene.fog.color.copy(lerpKF(SKY_KF, dayTime, 'fog'));

  // Sun elevation: +1 at noon, -1 at midnight
  const sunElev = Math.sin((dayTime - 0.25) * Math.PI * 2);
  const sunAz   = dayTime * Math.PI * 2;

  // Keep the sun far on the sky dome so it never appears to touch nearby terrain.
  sun.position.set(Math.cos(sunAz) * 520, sunElev * 280 + 110, Math.sin(sunAz) * -520);
  glow.position.copy(sun.position);
  glow2.position.copy(sun.position);
  const sunAbove = sunElev > 0;
  sun.visible   = sunAbove;
  glow.visible  = sunAbove;
  glow2.visible = sunAbove;

  // Move moon (roughly opposite)
  moon.position.set(-sun.position.x * 0.7, Math.abs(sun.position.y) * 0.7 + 15, -sun.position.z * 0.7);
  moonGlow.position.copy(moon.position);
  moon.visible     = !sunAbove;
  moonGlow.visible = !sunAbove;
  moonLight.position.copy(moon.position);
  moonLight.intensity = Math.max(0, -sunElev) * 0.35;

  // Stars
  starField.visible = sunElev < -0.25;

  // Directional light tracks sun
  sunLight.position.copy(sun.position);
  sunLight.intensity = Math.max(0, sunElev) * 1.4;
  farmLamp.intensity = Math.max(0, -sunElev) * 2.2;
  const warmth = 1 - Math.max(0, sunElev); // 1 at horizon, 0 at zenith
  sunLight.color.setRGB(1.0, 0.88 + warmth * 0.12, 0.55 + Math.max(0, sunElev) * 0.45);

  // Ambient + hemi
  const ambInt = lerpKF(SKY_KF, dayTime, 'amb');
  ambientLight.intensity = ambInt;
  if (sunElev > 0) {
    ambientLight.color.setHex(0xffe8c0);
    hemiLight.intensity = 0.45 * Math.max(0, sunElev);
  } else {
    ambientLight.color.setHex(0x102040);
    hemiLight.intensity = 0.04;
  }
}

// ============================================================
// Signal rings
// ============================================================
const signalRings = [];
function createSignalRing() {
  const mat  = new THREE.MeshBasicMaterial({ color: 0xf1c40f, transparent: true, opacity: 0.8, side: THREE.DoubleSide });
  const ring = new THREE.Mesh(new THREE.RingGeometry(0.2, 0.24, 16), mat);
  ring.position.set(rpiGroup.position.x + 0.15, 2.85, rpiGroup.position.z);
  ring.lookAt(towerGroup.position.x, 15, towerGroup.position.z);
  scene.add(ring);
  signalRings.push({ mesh: ring, scale: 1, opacity: 0.8 });
}

// ============================================================
// In-game clock
// ============================================================
function updateClock() {
  const el = document.getElementById('game-clock');
  if (!el) return;
  const totalH = dayTime * 24;
  const h = Math.floor(totalH) % 24;
  const m = Math.floor(totalH * 60) % 60;
  el.textContent = String(h).padStart(2, '0') + ':' + String(m).padStart(2, '0');
}

// ============================================================
// Interaction tooltips (shop / market / house sleep)
// ============================================================
function updateInteractionTips() {
  if (typeof shopOpen !== 'undefined' && (shopOpen || marketOpen)) return;
  const tipEl = document.getElementById('farm-tooltip');

  // Shop proximity
  if (typeof shopPos !== 'undefined' && player.pos.distanceTo(shopPos) < 4.5) {
    if (tipEl) { tipEl.textContent = '[E] Open Shop'; tipEl.style.display = 'block'; }
    return;
  }
  // Market proximity
  if (typeof marketPos !== 'undefined' && player.pos.distanceTo(marketPos) < 4.5) {
    if (tipEl) { tipEl.textContent = '[E] Open Market'; tipEl.style.display = 'block'; }
    return;
  }
  // House door (sleep at night)
  if (typeof houseDoorPos !== 'undefined') {
    const isNight  = dayTime > 0.72 || dayTime < 0.24;
    if (player.pos.distanceTo(houseDoorPos) < 4.0 && isNight) {
      if (tipEl) { tipEl.textContent = '[E] Sleep until morning'; tipEl.style.display = 'block'; }
      return;
    }
  }
  // Feed troughs
  if (typeof feedTroughs !== 'undefined' && fencingOwned) {
    for (const t of feedTroughs) {
      const dx = player.pos.x - t.x;
      const dz = player.pos.z - t.z;
      const dist = Math.sqrt(dx * dx + dz * dz);
      if (dist < 3.0) {
        const full = troughFeedStored >= TROUGH_MAX_FEED;
        const empty = animalFeedCount <= 0;
        const fillPct = Math.round((troughFeedStored / TROUGH_MAX_FEED) * 100);
        if (full) {
          if (tipEl) { tipEl.textContent = `Trough full (${fillPct}%)`; tipEl.style.display = 'block'; }
        } else if (empty) {
          if (tipEl) { tipEl.textContent = `Trough ${fillPct}% — buy feed at Duka`; tipEl.style.display = 'block'; }
        } else {
          if (tipEl) { tipEl.textContent = `[E] Fill trough (${fillPct}%) — Feed: ${animalFeedCount}`; tipEl.style.display = 'block'; }
        }
        return;
      }
    }
  }
}

window.addEventListener('keydown', e => {
  if (!document.getElementById('menu-overlay').classList.contains('hidden')) return;

  if (e.code === 'KeyE') {
    // Close open panels first
    if (typeof shopOpen !== 'undefined' && shopOpen)   { closeShop();   return; }
    if (typeof marketOpen !== 'undefined' && marketOpen) { closeMarket(); return; }

    // Open shop
    if (typeof shopPos !== 'undefined' && player.pos.distanceTo(shopPos) < 4.5) {
      openShop(); return;
    }
    // Open market
    if (typeof marketPos !== 'undefined' && player.pos.distanceTo(marketPos) < 4.5) {
      openMarket(); return;
    }
    // Sleep at house door
    if (typeof houseDoorPos !== 'undefined' && player.pos.distanceTo(houseDoorPos) < 4.0) {
      dayTime = 0.27;
      const tipEl = document.getElementById('farm-tooltip');
      if (tipEl) tipEl.style.display = 'none';
      return;
    }
    // Fill feed trough
    if (typeof feedTroughs !== 'undefined' && fencingOwned) {
      for (const t of feedTroughs) {
        const dx = player.pos.x - t.x;
        const dz = player.pos.z - t.z;
        const dist = Math.sqrt(dx * dx + dz * dz);
        if (dist < 3.0 && animalFeedCount > 0 && troughFeedStored < TROUGH_MAX_FEED) {
          // Pour feed into trough — dump as much as fits
          const space = TROUGH_MAX_FEED - troughFeedStored;
          const toAdd = Math.min(animalFeedCount, space);
          troughFeedStored += toAdd;
          animalFeedCount -= toAdd;
          updateTroughVisuals();
          return;
        }
      }
    }
  }

  if (e.code === 'KeyI') {
    if (typeof toggleInventoryPanel === 'function') toggleInventoryPanel();
  }
});

// ============================================================
// Animation loop
// ============================================================
let time          = 0;
let particleTimer = 0;
let signalTimer   = 0;
let lastTimestamp = performance.now();

function animate() {
  requestAnimationFrame(animate);

  const now = performance.now();
  const dt  = Math.min((now - lastTimestamp) / 1000, 0.05); // cap at 50 ms
  lastTimestamp = now;
  time         += 0.016; // fixed step for animation cycles

  // ---- First person camera ----
  updatePlayer(dt);
  camera.position.copy(player.pos);
  camera.quaternion.setFromEuler(new THREE.Euler(player.pitch, player.yaw, 0, 'YXZ'));
  const shadowGround = getGroundHeight(player.pos.x, player.pos.z);
  playerShadow.position.set(player.pos.x, shadowGround + 0.03, player.pos.z);
  playerShadow.scale.set(1, 1, 1).multiplyScalar(player.onGround ? 1 : 0.75);
  playerShadow.material.opacity = player.onGround ? 0.22 : 0.14;

  // ---- Clouds ----
  particleTimer += dt;
  signalTimer   += dt;

  clouds.forEach((c, i) => {
    c.position.x += 0.008 * (i % 2 === 0 ? 1 : -1);
    if (c.position.x >  60) c.position.x = -60;
    if (c.position.x < -60) c.position.x =  60;
  });

  // ---- RPi LED blink ----
  led.material.emissiveIntensity = Math.sin(time * 4) > 0 ? 1 : 0.1;
  led.material.color.setHex(Math.sin(time * 4) > 0 ? 0x00ff00 : 0x004400);
  towerLight.material.emissiveIntensity = Math.sin(time * 2) > 0 ? 0.8 : 0.1;

  // ---- Signal rings (only when RPi sensor is deployed) ----
  if (rpiGroup.visible) {
    if (signalTimer > 2.0) { signalTimer = 0; createSignalRing(); }
    for (let i = signalRings.length - 1; i >= 0; i--) {
      const r = signalRings[i];
      r.scale   += 0.08;
      r.opacity -= 0.008;
      r.mesh.scale.set(r.scale, r.scale, r.scale);
      r.mesh.material.opacity = Math.max(0, r.opacity);
      if (r.opacity <= 0) { scene.remove(r.mesh); signalRings.splice(i, 1); }
    }
  }

  // ---- SMS particles (only when RPi sensor is deployed) ----
  if (rpiGroup.visible && particleTimer > 1.5) {
    particleTimer = 0;
    const p = particles.find(p => !p.active);
    if (p) { p.active = true; p.t = 0; p.mesh.visible = true; }
  }
  particles.forEach(p => {
    if (!p.active) return;
    p.t += p.speed;
    if (p.t >= 1) { p.active = false; p.mesh.visible = false; p.t = 0; return; }
    p.mesh.position.copy(getPointOnPath(p.path, p.t));
    const s = 1 + Math.sin(p.t * 20) * 0.3;
    p.mesh.scale.set(s, s, s);
  });

  // ---- Farming ----
  updateFarming(dt);

  // ---- Animal production (eggs & milk) ----
  if (typeof updateAnimalProduction === 'function') updateAnimalProduction(dt);

  // ---- Price fluctuation ----
  if (typeof updatePriceFluctuation === 'function') updatePriceFluctuation();

  // ---- Hunting ----
  updateHunting(dt);

  // ---- Rifle viewmodel (follows camera) ----
  if (huntingMode && typeof rifleModel !== 'undefined') {
    const camQuat = camera.quaternion;
    const fwd   = new THREE.Vector3(0,  0, -1).applyQuaternion(camQuat);
    const right = new THREE.Vector3(1,  0,  0).applyQuaternion(camQuat);
    const up    = new THREE.Vector3(0,  1,  0).applyQuaternion(camQuat);
    const bob   = Math.sin(time * 9) * 0.003;
    rifleModel.position
      .copy(camera.position)
      .addScaledVector(fwd,   0.42)
      .addScaledVector(right, 0.20)
      .addScaledVector(up,   -0.14 + bob);
    rifleModel.quaternion.copy(camQuat);
  }

  // ---- Interaction tooltips (shop/market/sleep) ----
  updateInteractionTips();

  // ---- Soil data HUD (sensor node upgrade) ----
  if (typeof updateSoilHUD === 'function') updateSoilHUD();

  // ---- Clock ----
  updateClock();

  // ---- Day / Night cycle ----
  updateDayNight(dt);

  // ---- Sensor drift ----
  if (Math.floor(time * 60) % 60 === 0) updateSensors();

  // ---- Scene animations ----
  rpiGroup.rotation.z = Math.sin(time * 0.8) * 0.01;

  const isNight = dayTime > 0.72 || dayTime < 0.24;

  // Fence bounds for containing animals when fencing is owned
  const _fX1 = FENCE_X, _fZ1 = FENCE_Z, _fX2 = FENCE_X + FENCE_W, _fZ2 = FENCE_Z + FENCE_D;

  chickens.forEach(c => {
    if (isNight) {
      c.mesh.rotation.x = 0.35;
    } else {
      c.wanderAngle += c.wanderSpeed;
      c.peckTimer   -= dt;
      c.mesh.position.x = c.baseX + Math.cos(c.wanderAngle) * 1.5;
      c.mesh.position.z = c.baseZ + Math.sin(c.wanderAngle) * 1.5;
      c.mesh.rotation.y = c.wanderAngle + Math.PI / 2;
      if (c.peckTimer < 0.5 && c.peckTimer > 0) {
        c.mesh.rotation.x = Math.sin(c.peckTimer * 12) * 0.3;
      } else {
        c.mesh.rotation.x = 0;
      }
      if (c.peckTimer < 0) c.peckTimer = 2 + Math.random() * 4;
    }
    // Keep chickens inside fence if built
    if (fencingOwned) {
      c.mesh.position.x = Math.max(_fX1 + 0.5, Math.min(_fX2 - 0.5, c.mesh.position.x));
      c.mesh.position.z = Math.max(_fZ1 + 0.5, Math.min(_fZ2 - 0.5, c.mesh.position.z));
    }
    c.mesh.position.y = getGroundHeight(c.mesh.position.x, c.mesh.position.z) + Math.abs(Math.sin(time * 6 + c.wanderAngle * 3)) * (isNight ? 0.005 : 0.03);
  });

  goats.forEach(g => {
    if (!isNight) {
      g.wanderAngle += g.wanderSpeed;
      g.mesh.position.x = g.baseX + Math.cos(g.wanderAngle) * g.wanderRadius;
      g.mesh.position.z = g.baseZ + Math.sin(g.wanderAngle) * g.wanderRadius;
      g.mesh.rotation.y = g.wanderAngle + Math.PI / 2;
    }
    g.mesh.position.y = getGroundHeight(g.mesh.position.x, g.mesh.position.z) + Math.sin(time * 3 + g.wanderAngle) * (isNight ? 0.004 : 0.02);
  });

  cows.forEach(c => {
    if (!isNight) {
      c.wanderAngle += c.wanderSpeed;
      c.mesh.rotation.y += c.wanderSpeed * 0.5;
      c.headBob += 0.02;
      c.mesh.children[1].rotation.x = Math.sin(c.headBob) * 0.15;
    } else {
      c.mesh.children[1].rotation.x = -0.08;
    }
    // Keep cows inside fence if built
    if (fencingOwned) {
      c.mesh.position.x = Math.max(_fX1 + 0.8, Math.min(_fX2 - 0.8, c.mesh.position.x));
      c.mesh.position.z = Math.max(_fZ1 + 0.8, Math.min(_fZ2 - 0.8, c.mesh.position.z));
    }
  });

  [giraffe1, giraffe2].forEach(g => {
    g.rotation.y += 0.0003;
    g.children[1].rotation.x = Math.sin(time * 0.5) * 0.05;
  });

  hippo.scale.y = 1 + Math.sin(time * 0.8) * 0.02;
  hippo.children[5].rotation.z = Math.sin(time * 2) * 0.1;
  hippo.children[6].rotation.z = Math.sin(time * 2 + 1) * 0.1;

  elephant.rotation.y += 0.0002;
  elephant.children[6].rotation.y = Math.sin(time * 1.5) * 0.2 - 0.3;
  elephant.children[7].rotation.y = Math.sin(time * 1.5 + 0.5) * 0.2 + 0.3;

  birds.forEach(b => {
    b.angle += b.speed;
    b.mesh.position.x = Math.cos(b.angle) * b.radius;
    b.mesh.position.z = Math.sin(b.angle) * b.radius;
    b.mesh.position.y = b.height + Math.sin(time * 0.5 + b.angle) * 1.5;
    b.mesh.rotation.y = b.angle + Math.PI / 2;
  });

  renderer.render(scene, camera);
}

window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

// ============================================================
// Menu system
// ============================================================
function showPage(name) {
  document.querySelectorAll('.menu-page').forEach(p => p.classList.add('hidden'));
  document.getElementById('page-' + name).classList.remove('hidden');
}

function startGame() {
  document.getElementById('menu-overlay').classList.add('hidden');
  container.requestPointerLock();
}

function isHardModeEnabled() {
  return localStorage.getItem('farmsim_hard_mode') === '1';
}

window.isHardModeEnabled = isHardModeEnabled;

function saveSettings() {
  const key = document.getElementById('apikey-input').value.trim();
  const hardModeEl = document.getElementById('hardmode-toggle');
  const devModeEl  = document.getElementById('devmode-toggle');
  const hardMode = !!(hardModeEl && hardModeEl.checked);
  const devMode  = !!(devModeEl && devModeEl.checked);
  const wasDevMode = localStorage.getItem('farmsim_dev_mode') === '1';
  localStorage.setItem('farmsim_openrouter_key', key);
  localStorage.setItem('farmsim_hard_mode', hardMode ? '1' : '0');
  localStorage.setItem('farmsim_dev_mode', devMode ? '1' : '0');
  if (devMode && !wasDevMode) {
    // Turning dev mode ON — stash real money, then grant max
    localStorage.setItem('farmsim_pre_dev_money', String(playerMoney));
    playerMoney = 9999999;
    if (typeof updateMoneyHUD === 'function') updateMoneyHUD();
  } else if (!devMode && wasDevMode) {
    // Turning dev mode OFF — restore stashed money
    const stashed = localStorage.getItem('farmsim_pre_dev_money');
    playerMoney = stashed != null ? parseInt(stashed, 10) : 500;
    localStorage.removeItem('farmsim_pre_dev_money');
    if (typeof updateMoneyHUD === 'function') updateMoneyHUD();
  }
  const msg = document.getElementById('settings-saved-msg');
  msg.textContent = devMode ? 'Saved. Dev Mode ON — 9,999,999 TSh!' : hardMode ? 'Saved. Hard Mode ON.' : (key ? 'Saved.' : 'Cleared.');
  setTimeout(() => { msg.textContent = ''; }, 2000);
}

function toggleApiKeyVisibility() {
  const input = document.getElementById('apikey-input');
  const btn   = document.querySelector('.toggle-key-btn');
  if (input.type === 'password') {
    input.type = 'text';
    btn.textContent = 'HIDE';
  } else {
    input.type = 'password';
    btn.textContent = 'SHOW';
  }
}

// Load persisted settings into the input on startup
(function loadSettings() {
  const key = localStorage.getItem('farmsim_openrouter_key') || '';
  const hardMode = localStorage.getItem('farmsim_hard_mode') === '1';
  const devMode  = localStorage.getItem('farmsim_dev_mode') === '1';
  const el  = document.getElementById('apikey-input');
  const hardModeEl = document.getElementById('hardmode-toggle');
  const devModeEl  = document.getElementById('devmode-toggle');
  if (el) el.value = key;
  if (hardModeEl) hardModeEl.checked = hardMode;
  if (devModeEl)  devModeEl.checked = devMode;
  if (devMode) {
    // On load with dev mode active, stash current money if not already stashed, then grant max
    if (localStorage.getItem('farmsim_pre_dev_money') == null) {
      localStorage.setItem('farmsim_pre_dev_money', String(playerMoney));
    }
    playerMoney = 9999999;
    if (typeof updateMoneyHUD === 'function') updateMoneyHUD();
  }
})();

// Init
updateSensors();
if (typeof updateMoneyHUD === 'function') updateMoneyHUD();
animate();
