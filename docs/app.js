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

  // Stars (gentle global twinkle)
  starField.visible = sunElev < -0.25;
  if (starField.visible) {
    starField.material.opacity = 0.72 + Math.sin(time * 1.7) * 0.18;
  }

  // Fireflies around the farm at night
  fireflies.visible = sunElev < -0.08;
  if (fireflies.visible) {
    const fp = fireflyGeo.attributes.position.array;
    for (let i = 0; i < FIREFLY_COUNT; i++) {
      const b = _ffBase[i];
      const t = time * b.speed + b.phase;
      fp[i * 3]     = b.x + Math.sin(t * 0.9) * 1.4;
      fp[i * 3 + 1] = b.y + Math.sin(t * 1.7) * 0.5;
      fp[i * 3 + 2] = b.z + Math.cos(t * 0.7) * 1.4;
    }
    fireflyGeo.attributes.position.needsUpdate = true;
    fireflies.material.opacity = 0.55 + Math.sin(time * 3.1) * 0.35;
  }

  // Directional light follows the sun's direction but stays anchored near the
  // player so the shadow frustum keeps usable resolution across the whole map.
  // (The visual sun mesh sits ~520 m out on the sky dome — far outside the
  // shadow camera's far plane, so shadows were breaking up at distance.)
  sunLight.position.set(
    player.pos.x + Math.cos(sunAz) * 60,
    Math.max(10, sunElev * 90 + 35),
    player.pos.z + Math.sin(sunAz) * -60
  );
  sunLight.target.position.set(player.pos.x, 0, player.pos.z);
  sunLight.target.updateMatrixWorld();
  // Intensities retuned for ACES filmic tone mapping
  sunLight.intensity = Math.max(0, sunElev) * 1.9;
  farmLamp.intensity = Math.max(0, -sunElev) * 3.0;
  moonLight.intensity = Math.max(0, -sunElev) * 0.5;
  const warmth = 1 - Math.max(0, sunElev); // 1 at horizon, 0 at zenith
  sunLight.color.setRGB(1.0, 0.88 + warmth * 0.12, 0.55 + Math.max(0, sunElev) * 0.45);

  // Ambient + hemi (weather modifier)
  const ambInt = lerpKF(SKY_KF, dayTime, 'amb');
  const wAmbMult = typeof getWeatherAmbientMult === 'function' ? getWeatherAmbientMult() : 1;
  ambientLight.intensity = ambInt * wAmbMult * 1.35;
  if (sunElev > 0) {
    ambientLight.color.setHex(0xffe8c0);
    hemiLight.intensity = 0.6 * Math.max(0, sunElev);
  } else {
    ambientLight.color.setHex(0x102040);
    hemiLight.intensity = 0.06;
  }
}

// ============================================================
// Signal rings (pooled — shared geometry, meshes reused)
// ============================================================
const signalRings = [];
const _ringGeo = new THREE.RingGeometry(0.2, 0.24, 16);
const _ringPool = [];
function createSignalRing() {
  let r = _ringPool.pop();
  if (!r) {
    const mat = new THREE.MeshBasicMaterial({ color: 0xf1c40f, transparent: true, opacity: 0.8, side: THREE.DoubleSide });
    r = { mesh: new THREE.Mesh(_ringGeo, mat), scale: 1, opacity: 0.8 };
    scene.add(r.mesh);
  }
  r.scale = 1;
  r.opacity = 0.8;
  r.mesh.visible = true;
  r.mesh.scale.set(1, 1, 1);
  r.mesh.material.opacity = 0.8;
  r.mesh.position.set(rpiGroup.position.x + 0.15, 2.85, rpiGroup.position.z);
  r.mesh.lookAt(towerGroup.position.x, 15, towerGroup.position.z);
  signalRings.push(r);
}

// ============================================================
// Sleep (fade to black, skip to morning)
// ============================================================
let sleepFading = false;
function sleepUntilMorning() {
  if (sleepFading) return;
  sleepFading = true;
  const tipEl = document.getElementById('farm-tooltip');
  if (tipEl) tipEl.style.display = 'none';
  const fade = document.getElementById('sleep-fade');
  if (!fade) { dayTime = 0.27; sleepFading = false; return; }
  fade.classList.add('active');
  setTimeout(() => {
    dayTime = 0.27;
    setTimeout(() => {
      fade.classList.remove('active');
      sleepFading = false;
    }, 500);
  }, 700);
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
  if (typeof questDialogOpen !== 'undefined' && questDialogOpen) return;
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
  // Quest NPC (neighbor)
  if (typeof questNPCPos !== 'undefined' && player.pos.distanceTo(questNPCPos) < 4.0) {
    if (tipEl) { tipEl.textContent = '[E] Talk to Neighbor'; tipEl.style.display = 'block'; }
    return;
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
  // Nothing nearby — hide tooltip
  if (tipEl) tipEl.style.display = 'none';
}

window.addEventListener('keydown', e => {
  if (!document.getElementById('menu-overlay').classList.contains('hidden')) return;
  if (gamePaused) return;

  if (e.code === 'KeyE') {
    // Close quest dialog
    if (typeof questDialogOpen !== 'undefined' && questDialogOpen) { closeQuestDialog(); return; }
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
    // Sleep at house door (night only — matches the tooltip)
    if (typeof houseDoorPos !== 'undefined' && player.pos.distanceTo(houseDoorPos) < 4.0) {
      const isNight = dayTime > 0.72 || dayTime < 0.24;
      if (isNight) sleepUntilMorning();
      return;
    }
    // Talk to quest NPC
    if (typeof questNPCPos !== 'undefined' && player.pos.distanceTo(questNPCPos) < 4.0) {
      openQuestDialog(); return;
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
          if (typeof onTroughFilled === 'function') onTroughFilled(toAdd);
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
let hudTimer      = 0;
let lastTimestamp = performance.now();

// Reused per-frame temps (avoid allocating in the hot loop)
const _camEuler = new THREE.Euler(0, 0, 0, 'YXZ');
const _vFwd   = new THREE.Vector3();
const _vRight = new THREE.Vector3();
const _vUp    = new THREE.Vector3();

function animate() {
  requestAnimationFrame(animate);

  const now = performance.now();
  const rawDt = Math.min((now - lastTimestamp) / 1000, 0.05); // cap at 50 ms
  lastTimestamp = now;
  const dt = gamePaused ? 0 : rawDt;
  if (!gamePaused) time += 0.016; // fixed step for animation cycles

  // DOM updates are throttled to ~8 Hz — layout work is wasted at 60 fps
  hudTimer += rawDt;
  const hudTick = hudTimer >= 0.12;
  if (hudTick) hudTimer = 0;

  // ---- First person camera ----
  updatePlayer(dt);
  camera.position.copy(player.pos);
  camera.quaternion.setFromEuler(_camEuler.set(player.pitch, player.yaw, 0));

  // Subtle FOV kick while sprinting (hands off while the rifle scope owns the FOV)
  if (typeof scopeActive === 'undefined' || !scopeActive) {
    const _moving = keys['KeyW'] || keys['KeyS'] || keys['KeyA'] || keys['KeyD'] ||
                    keys['ArrowUp'] || keys['ArrowDown'] || keys['ArrowLeft'] || keys['ArrowRight'];
    const _targetFov = (!gamePaused && _moving && (keys['ShiftLeft'] || keys['ShiftRight'])) ? 62 : 55;
    if (Math.abs(camera.fov - _targetFov) > 0.05) {
      camera.fov += (_targetFov - camera.fov) * Math.min(1, rawDt * 6);
      camera.updateProjectionMatrix();
    }
  }

  const shadowGround = getGroundHeight(player.pos.x, player.pos.z);
  playerShadow.position.set(player.pos.x, shadowGround + 0.03, player.pos.z);
  playerShadow.scale.set(1, 1, 1).multiplyScalar(player.onGround ? 1 : 0.75);
  playerShadow.material.opacity = player.onGround ? 0.22 : 0.14;

  // ---- Clouds ----
  particleTimer += dt;
  signalTimer   += dt;

  clouds.forEach((c, i) => {
    c.position.x += 0.48 * dt * (i % 2 === 0 ? 1 : -1);
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
      r.scale   += 4.8 * dt;
      r.opacity -= 0.48 * dt;
      r.mesh.scale.set(r.scale, r.scale, r.scale);
      r.mesh.material.opacity = Math.max(0, r.opacity);
      if (r.opacity <= 0) {
        r.mesh.visible = false;
        _ringPool.push(r);
        signalRings.splice(i, 1);
      }
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
    _vFwd.set(0,  0, -1).applyQuaternion(camQuat);
    _vRight.set(1, 0,  0).applyQuaternion(camQuat);
    _vUp.set(0,  1,  0).applyQuaternion(camQuat);
    const bob = Math.sin(time * 9) * 0.003;
    rifleModel.position
      .copy(camera.position)
      .addScaledVector(_vFwd,   0.42)
      .addScaledVector(_vRight, 0.20)
      .addScaledVector(_vUp,   -0.14 + bob);
    rifleModel.quaternion.copy(camQuat);
  }

  // ---- HUD / DOM updates (throttled) ----
  if (hudTick) {
    updateInteractionTips();
    if (typeof updateSoilHUD === 'function') updateSoilHUD();
    updateClock();
    if (typeof updateWeatherHUD === 'function') updateWeatherHUD();
  }

  // ---- Day / Night cycle ----
  updateDayNight(dt);

  // ---- Weather ----
  if (typeof updateWeather === 'function') updateWeather(dt);

  // ---- Sensor drift ----
  if (Math.floor(time * 60) % 60 === 0) updateSensors();

  // ---- Auto SMS analysis (once per game day) ----
  if (typeof checkAutoAnalysis === 'function') checkAutoAnalysis();

  // ---- Quests ----
  if (typeof checkQuestCompletion === 'function') checkQuestCompletion();
  if (typeof updateQuestHUD === 'function') updateQuestHUD();

  // ---- Scene animations ----
  rpiGroup.rotation.z = Math.sin(time * 0.8) * 0.01;

  const isNight = dayTime > 0.72 || dayTime < 0.24;
  const groundOffsetOf = (mesh) => (mesh && mesh.userData && typeof mesh.userData.groundOffset === 'number')
    ? mesh.userData.groundOffset
    : 0;

  // Fence bounds for containing animals when fencing is owned
  const _fX1 = FENCE_X, _fZ1 = FENCE_Z, _fX2 = FENCE_X + FENCE_W, _fZ2 = FENCE_Z + FENCE_D;

  const stepRoam = (a, dt, active) => {
    if (!a || !a.roam) return;
    const roam = a.roam;
    if (!active) return;

    if (roam.pauseTimer > 0) {
      roam.pauseTimer -= dt;
      return;
    }

    const dx = roam.targetX - a.mesh.position.x;
    const dz = roam.targetZ - a.mesh.position.z;
    const dist = Math.sqrt(dx * dx + dz * dz);

    if (dist < 0.18) {
      const ang = Math.random() * Math.PI * 2;
      const r = Math.random() * roam.roamRadius;
      // Clamp the TARGET out of farmland too — a target inside a reserved
      // plot made animals walk in and get pushed out every frame (jitter).
      const safeT = moveOutOfReservedPlots(
        a.baseX + Math.cos(ang) * r,
        a.baseZ + Math.sin(ang) * r,
        1.2
      );
      roam.targetX = safeT.x;
      roam.targetZ = safeT.z;
      roam.pauseTimer = roam.pauseMin + Math.random() * (roam.pauseMax - roam.pauseMin);
      return;
    }

    const step = Math.min(dist, roam.moveSpeed * dt);
    a.mesh.position.x += (dx / dist) * step;
    a.mesh.position.z += (dz / dist) * step;

    const targetYaw = Math.atan2(dx, dz);
    a.mesh.rotation.y += (targetYaw - a.mesh.rotation.y) * Math.min(1, dt * 6);
  };

  chickens.forEach(c => {
    if (c.anim && c.anim.mixer) c.anim.mixer.update(dt);
    if (isNight) {
      c.mesh.rotation.x = 0.35;
    } else {
      stepRoam(c, dt, true);
      c.peckTimer   -= dt;
      const cSafe = moveOutOfReservedPlots(c.mesh.position.x, c.mesh.position.z, 0.8);
      c.mesh.position.x = cSafe.x;
      c.mesh.position.z = cSafe.z;
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
    c.mesh.position.y = getGroundHeight(c.mesh.position.x, c.mesh.position.z)
      + groundOffsetOf(c.mesh)
      + Math.abs(Math.sin(time * 6 + c.wanderAngle * 3)) * (isNight ? 0.005 : 0.03);
  });

  goats.forEach(g => {
    if (g.anim && g.anim.mixer) g.anim.mixer.update(dt);
    if (!isNight) {
      stepRoam(g, dt, true);
      const gSafe = moveOutOfReservedPlots(g.mesh.position.x, g.mesh.position.z, 1.0);
      g.mesh.position.x = gSafe.x;
      g.mesh.position.z = gSafe.z;
    }
    g.mesh.position.y = getGroundHeight(g.mesh.position.x, g.mesh.position.z)
      + groundOffsetOf(g.mesh)
      + Math.sin(time * 3 + g.mesh.rotation.y) * (isNight ? 0.004 : 0.02);
  });

  cows.forEach(c => {
    if (c.anim && c.anim.mixer) c.anim.mixer.update(dt);
    if (!isNight) {
      stepRoam(c, dt, true);
      c.headBob += 0.02;
      const cowHead = c.headNode || c.mesh.children[1];
      if (cowHead) cowHead.rotation.x = Math.sin(c.headBob) * 0.15;
    } else {
      const cowHead = c.headNode || c.mesh.children[1];
      if (cowHead) cowHead.rotation.x = -0.08;
    }
    // Keep cows inside fence if built
    if (fencingOwned) {
      c.mesh.position.x = Math.max(_fX1 + 0.8, Math.min(_fX2 - 0.8, c.mesh.position.x));
      c.mesh.position.z = Math.max(_fZ1 + 0.8, Math.min(_fZ2 - 0.8, c.mesh.position.z));
    }
    c.mesh.position.y = getGroundHeight(c.mesh.position.x, c.mesh.position.z)
      + groundOffsetOf(c.mesh)
      + Math.sin(time * 2.2 + c.headBob) * (isNight ? 0.003 : 0.012);
  });

  [giraffe1, giraffe2].forEach(g => {
    if (!g || !g.visible) return;
    g.rotation.y += 0.018 * dt;
    if (g.children[1]) g.children[1].rotation.x = Math.sin(time * 0.5) * 0.05;
  });

  if (hippo) {
    hippo.scale.y = 1 + Math.sin(time * 0.8) * 0.02;
    if (hippo.children[5]) hippo.children[5].rotation.z = Math.sin(time * 2) * 0.1;
    if (hippo.children[6]) hippo.children[6].rotation.z = Math.sin(time * 2 + 1) * 0.1;
  }

  if (elephant && elephant.visible) {
    elephant.rotation.y += 0.012 * dt;
    if (elephant.children[6]) elephant.children[6].rotation.y = Math.sin(time * 1.5) * 0.2 - 0.3;
    if (elephant.children[7]) elephant.children[7].rotation.y = Math.sin(time * 1.5 + 0.5) * 0.2 + 0.3;
  }

  birds.forEach(b => {
    b.angle += b.speed * 60 * dt;
    b.mesh.position.x = Math.cos(b.angle) * b.radius;
    b.mesh.position.z = Math.sin(b.angle) * b.radius;
    b.mesh.position.y = b.height + Math.sin(time * 0.5 + b.angle) * 1.5;
    b.mesh.rotation.y = b.angle + Math.PI / 2;
  });

  // ---- NPC idle animations ----
  if (typeof npcs !== 'undefined') {
    npcs.forEach(npc => {
      const t = time + npc.idlePhase;
      // Gentle body sway
      npc.mesh.position.y = npc.baseY + Math.sin(t * 1.2) * 0.01;
      // Head look-around
      const head = npc.mesh.getObjectByName('head');
      if (head) {
        head.rotation.y = Math.sin(t * 0.7) * 0.2;
        head.rotation.x = Math.sin(t * 0.5) * 0.05;
      }
      // Arm sway
      const armL = npc.mesh.getObjectByName('armL');
      const armR = npc.mesh.getObjectByName('armR');
      if (armL) armL.rotation.x = Math.sin(t * 0.9) * 0.08;
      if (armR) armR.rotation.x = Math.sin(t * 0.9 + 1.5) * 0.08;
    });
  }

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

let gamePaused = false;

function startGame() {
  document.getElementById('menu-overlay').classList.add('hidden');
  document.getElementById('pause-overlay').classList.add('hidden');
  gamePaused = false;
  container.requestPointerLock();
}

function pauseGame() {
  if (gamePaused) return;
  gamePaused = true;
  document.exitPointerLock();
  document.getElementById('pause-overlay').classList.remove('hidden');
}

function resumeGame() {
  gamePaused = false;
  document.getElementById('pause-overlay').classList.add('hidden');
  container.requestPointerLock();
}

function returnToMenu() {
  gamePaused = false;
  document.getElementById('pause-overlay').classList.add('hidden');
  document.getElementById('menu-overlay').classList.remove('hidden');
  showPage('title');
  document.exitPointerLock();
}

function exitGame() {
  // Save before exiting
  if (typeof saveGame === 'function') saveGame();
  window.close();
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
  const uiScale = document.getElementById('uiscale-slider').value;
  const qualityEl = document.getElementById('quality-select');
  const quality = qualityEl ? qualityEl.value : 'high';
  localStorage.setItem('farmsim_openrouter_key', key);
  localStorage.setItem('farmsim_hard_mode', hardMode ? '1' : '0');
  localStorage.setItem('farmsim_dev_mode', devMode ? '1' : '0');
  localStorage.setItem('farmsim_ui_scale', uiScale);
  localStorage.setItem('farmsim_quality', quality);
  applyQuality(quality);
  applyUIScale(parseFloat(uiScale));
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

// UI scale
function applyUIScale(scale) {
  document.documentElement.style.setProperty('--ui-scale', scale);
}

// ============================================================
// Graphics quality (pixel ratio + shadows, applied live)
// ============================================================
function applyQuality(q) {
  if (q === 'low') {
    renderer.setPixelRatio(1);
    renderer.shadowMap.enabled = false;
  } else if (q === 'medium') {
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
    renderer.shadowMap.enabled = true;
    sunLight.shadow.mapSize.set(1024, 1024);
  } else {
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    sunLight.shadow.mapSize.set(2048, 2048);
  }
  // Force shadow map + materials to rebuild with the new settings
  if (sunLight.shadow.map) {
    sunLight.shadow.map.dispose();
    sunLight.shadow.map = null;
  }
  scene.traverse(o => {
    if (o.material) {
      const mats = Array.isArray(o.material) ? o.material : [o.material];
      mats.forEach(m => { m.needsUpdate = true; });
    }
  });
}

// Live preview when dragging the slider
(function initUIScaleSlider() {
  const slider = document.getElementById('uiscale-slider');
  const label  = document.getElementById('uiscale-value');
  if (!slider || !label) return;
  slider.addEventListener('input', () => {
    const v = parseFloat(slider.value);
    label.textContent = v.toFixed(1) + 'x';
    applyUIScale(v);
  });
})();

// Load persisted settings into the input on startup
(function loadSettings() {
  const key = localStorage.getItem('farmsim_openrouter_key') || '';
  const hardMode = localStorage.getItem('farmsim_hard_mode') === '1';
  const devMode  = localStorage.getItem('farmsim_dev_mode') === '1';
  const el  = document.getElementById('apikey-input');
  const hardModeEl = document.getElementById('hardmode-toggle');
  const devModeEl  = document.getElementById('devmode-toggle');
  const uiScale = parseFloat(localStorage.getItem('farmsim_ui_scale')) || 1;
  const uiSlider = document.getElementById('uiscale-slider');
  const uiLabel  = document.getElementById('uiscale-value');
  const quality  = localStorage.getItem('farmsim_quality') || 'high';
  const qualityEl = document.getElementById('quality-select');
  if (el) el.value = key;
  if (hardModeEl) hardModeEl.checked = hardMode;
  if (devModeEl)  devModeEl.checked = devMode;
  if (uiSlider) uiSlider.value = uiScale;
  if (uiLabel)  uiLabel.textContent = uiScale.toFixed(1) + 'x';
  if (qualityEl) qualityEl.value = quality;
  applyUIScale(uiScale);
  if (quality !== 'high') applyQuality(quality);
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
if (typeof initWeather === 'function') initWeather();
if (typeof updateMoneyHUD === 'function') updateMoneyHUD();
animate();
