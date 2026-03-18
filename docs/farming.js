// ============================================================
// Farming — Phase 4
// ============================================================

// FARM_COLS, FARM_ROWS, CELL_SIZE, FARM_ORIGIN_X/Z, FLAT_FARM_Y, FARM_SURFACE_Y — defined in scene.js
const REACH       = 4.5;            // max plant/harvest distance (m)
const STAGE_TIMES = [20, 40, 60];   // real seconds between growth stages
const FARM_Y      = FARM_SURFACE_Y; // top face of the raised bed

const SEED_TYPES = [
  { name: 'MAIZE',      stalkColor: 0x4a8a28, leafColor: 0x5aaa38, matureH: 1.8 },
  { name: 'BEANS',      stalkColor: 0x2a7a3a, leafColor: 0x3aaa4a, matureH: 0.9 },
  { name: 'SORGHUM',    stalkColor: 0x9a7030, leafColor: 0xb8a840, matureH: 1.5 },
  { name: 'CASSAVA',    stalkColor: 0x5a7a28, leafColor: 0x6aaa38, matureH: 1.8 },
  { name: 'GROUNDNUTS', stalkColor: 0x8a7028, leafColor: 0xaaaa38, matureH: 0.5 },
];

const SOIL_RULES = [
  {
    thrive: { moisture: [45, 68], ph: [5.8, 7.0], n: [90, 180] },
    viable: { moisture: [28, 82], ph: [5.0, 7.8], n: [40, 260] },
    lockReason: 'soil too harsh for maize right now',
    thriveBonus: 0.15,
  },
  {
    thrive: { moisture: [42, 62], ph: [6.0, 7.2], n: [60, 140] },
    viable: { moisture: [30, 78], ph: [5.6, 7.8], n: [35, 220] },
    lockReason: 'beans need steadier pH/moisture',
    thriveBonus: 0.08,
  },
  {
    thrive: { moisture: [30, 52], ph: [5.6, 7.8], n: [45, 130] },
    viable: { moisture: [20, 72], ph: [5.0, 8.4], n: [25, 220] },
    lockReason: 'sorghum cannot establish in this soil state',
    thriveBonus: 0.20,
  },
  {
    thrive: { moisture: [34, 56], ph: [5.4, 7.2], n: [40, 130] },
    viable: { moisture: [24, 72], ph: [5.0, 8.0], n: [20, 220] },
    lockReason: 'cassava cuttings will fail in this soil',
    thriveBonus: 0.10,
  },
  {
    thrive: { moisture: [36, 58], ph: [5.8, 7.0], n: [40, 100] },
    viable: { moisture: [28, 75], ph: [5.4, 7.6], n: [20, 160] },
    lockReason: 'groundnuts need balanced soil to germinate',
    thriveBonus: 0.05,
  },
];

// ---- Economy (Phase 6) ----
const seedInventory = [5, 3, 3, 2, 2];   // starting seeds per type
const cropInventory = [0, 0, 0, 0, 0];   // harvested crops (sell at market)
const ownedTools    = { hoe: true, wateringCan: false, machete: false, axe: false };
let fertilizerCount = 0;

// ---- Animal farming (Phase 6 expanded) ----
let animalFeedCount = 0;
let fencingOwned    = false;
let ownedChickens   = 5;   // start with 5 chickens (matching scene spawns)
let ownedCows       = 4;   // start with 4 cows (matching scene spawns)
const animalProducts = { eggs: 0, milk: 0 };

// Egg / milk production timers (real seconds)
let eggTimer  = 0;
let milkTimer = 0;
const EGG_INTERVAL  = 45;  // seconds between egg layings (per chicken)
const MILK_INTERVAL = 70;  // seconds between milkings (per cow)
let eggCooldown  = EGG_INTERVAL;
let milkCooldown = MILK_INTERVAL;

let selectedSeed = 0;
let farmRealTime  = 0;

// ---- Farm cells ----
const farmCells = [];
for (let row = 0; row < FARM_ROWS; row++) {
  for (let col = 0; col < FARM_COLS; col++) {
    farmCells.push({
      seedType:    -1,
      stage:       -1,
      nextStageAt:  0,
      watered:      false,
      mesh:         null,
      cx: FARM_ORIGIN_X + col * CELL_SIZE + CELL_SIZE * 0.5,
      cz: FARM_ORIGIN_Z + row * CELL_SIZE + CELL_SIZE * 0.5,
    });
  }
}

// ---- Build tilled soil ground + furrow grid ----
(function buildFarmGround() {
  const farmW  = FARM_COLS * CELL_SIZE;
  const farmD  = FARM_ROWS * CELL_SIZE;
  const farmCX = FARM_ORIGIN_X + farmW * 0.5;
  const farmCZ = FARM_ORIGIN_Z + farmD * 0.5;

  // Raised bed box — extends from FLAT_FARM_Y - 0.3 up to FARM_SURFACE_Y
  // The box height ensures it always sits proud of the terrain with no z-fighting
  const bedH = FARM_SURFACE_Y - (FLAT_FARM_Y - 0.30); // = 0.45 m
  const soil = new THREE.Mesh(
    // +0.5 margin on each side so box edges hide the terrain transition
    new THREE.BoxGeometry(farmW + 0.5, bedH, farmD + 0.5),
    new THREE.MeshLambertMaterial({ color: 0x5a3010 })
  );
  soil.position.set(farmCX, FARM_SURFACE_Y - bedH * 0.5, farmCZ);
  soil.receiveShadow = true;
  scene.add(soil);

  // Darker row / column furrows
  const furrowMat = new THREE.MeshLambertMaterial({ color: 0x3a1a05 });
  for (let r = 0; r <= FARM_ROWS; r++) {
    const f = new THREE.Mesh(new THREE.PlaneGeometry(farmW, 0.05), furrowMat);
    f.rotation.x = -Math.PI / 2;
    f.position.set(farmCX, FARM_Y + 0.01, FARM_ORIGIN_Z + r * CELL_SIZE);
    scene.add(f);
  }
  for (let c = 0; c <= FARM_COLS; c++) {
    const f = new THREE.Mesh(new THREE.PlaneGeometry(0.05, farmD), furrowMat);
    f.rotation.x = -Math.PI / 2;
    f.position.set(FARM_ORIGIN_X + c * CELL_SIZE, FARM_Y + 0.01, farmCZ);
    scene.add(f);
  }
}());

// ---- Highlight tile (colour changes by cell state) ----
const _hlMat = new THREE.MeshBasicMaterial({
  color: 0x88ff88, transparent: true, opacity: 0.28, depthWrite: false,
});
const highlightTile = new THREE.Mesh(
  new THREE.PlaneGeometry(CELL_SIZE - 0.1, CELL_SIZE - 0.1),
  _hlMat
);
highlightTile.rotation.x = -Math.PI / 2;
highlightTile.visible    = false;
scene.add(highlightTile);

// ============================================================
// Crop mesh factory — stage 0..3
// ============================================================
function buildCropMesh(seedType, stage) {
  const g  = new THREE.Group();
  const s  = SEED_TYPES[seedType];
  const gf = stage / 3;           // growth factor 0..1
  const h  = s.matureH * gf;

  if (stage === 0) {
    // Tiny dark mound — freshly planted
    const mound = new THREE.Mesh(
      new THREE.SphereGeometry(0.09, 6, 4),
      new THREE.MeshLambertMaterial({ color: 0x3a1a05 })
    );
    mound.scale.y = 0.4;
    mound.position.y = 0.05;
    g.add(mound);
    return g;
  }

  // Shared stalk
  const stalk = new THREE.Mesh(
    new THREE.CylinderGeometry(0.03, 0.07, h, 5),
    new THREE.MeshLambertMaterial({ color: s.stalkColor })
  );
  stalk.position.y = h * 0.5;
  g.add(stalk);

  if (seedType === 0) {
    // ── Maize ── draping leaves + yellow cob at stage 3
    for (let l = 0; l < 1 + stage; l++) {
      const leaf = new THREE.Mesh(
        new THREE.PlaneGeometry(0.65 * gf, 0.09),
        new THREE.MeshLambertMaterial({ color: s.leafColor, side: THREE.DoubleSide })
      );
      leaf.position.set(0, h * (0.3 + l * 0.18), 0);
      leaf.rotation.y = (l / (1 + stage)) * Math.PI * 2;
      leaf.rotation.z = 0.35;
      g.add(leaf);
    }
    if (stage === 3) {
      const cob = new THREE.Mesh(
        new THREE.CylinderGeometry(0.07, 0.07, 0.22, 6),
        new THREE.MeshLambertMaterial({ color: 0xddcc44 })
      );
      cob.position.set(0.12, h * 0.55, 0);
      cob.rotation.z = 0.4;
      g.add(cob);
    }

  } else if (seedType === 1 || seedType === 4) {
    // ── Beans / Groundnuts ── bushy sphere clusters
    const count = 2 + stage * 2;
    for (let c = 0; c < count; c++) {
      const a       = (c / count) * Math.PI * 2;
      const cluster = new THREE.Mesh(
        new THREE.SphereGeometry(0.07 + gf * 0.08, 6, 4),
        new THREE.MeshLambertMaterial({ color: s.leafColor })
      );
      cluster.position.set(
        Math.cos(a) * h * 0.4,
        h * 0.55 + Math.sin(a) * h * 0.18,
        Math.sin(a) * h * 0.4
      );
      g.add(cluster);
    }

  } else if (seedType === 2) {
    // ── Sorghum ── leaves + brown grain head at stage 3
    for (let l = 0; l < 2 + stage; l++) {
      const leaf = new THREE.Mesh(
        new THREE.PlaneGeometry(0.55 * gf, 0.08),
        new THREE.MeshLambertMaterial({ color: s.leafColor, side: THREE.DoubleSide })
      );
      leaf.position.set(0, h * (0.35 + l * 0.14), 0);
      leaf.rotation.y = (l / (2 + stage)) * Math.PI * 2;
      leaf.rotation.z = 0.3;
      g.add(leaf);
    }
    if (stage === 3) {
      const head = new THREE.Mesh(
        new THREE.ConeGeometry(0.14, 0.32, 8),
        new THREE.MeshLambertMaterial({ color: 0xaa6018 })
      );
      head.position.y = h + 0.16;
      g.add(head);
    }

  } else {
    // ── Cassava ── upright stalk, spreading leaf fans at top
    for (let f = 0; f < 1 + stage; f++) {
      const fan = new THREE.Mesh(
        new THREE.PlaneGeometry(0.55 * gf, 0.5 * gf),
        new THREE.MeshLambertMaterial({ color: s.leafColor, side: THREE.DoubleSide })
      );
      fan.position.set(0, h + f * 0.12, 0);
      fan.rotation.y = (f / (1 + stage)) * Math.PI;
      fan.rotation.z = 0.28;
      g.add(fan);
    }
  }

  return g;
}

function inRange(v, range) {
  return v >= range[0] && v <= range[1];
}

function getSoilSnapshot() {
  if (typeof getSoilState === 'function') return getSoilState();
  return null;
}

function hardModeOn() {
  if (typeof isHardModeEnabled === 'function') return isHardModeEnabled();
  return localStorage.getItem('farmsim_hard_mode') === '1';
}

function getLenientRange(metric, range) {
  if (metric === 'moisture') return [range[0] - 10, range[1] + 10];
  if (metric === 'ph') return [range[0] - 0.5, range[1] + 0.5];
  if (metric === 'n') return [range[0] - 40, range[1] + 40];
  return range;
}

function getRuleRange(rule, metric, kind, hardMode) {
  const r = rule[kind][metric];
  return hardMode ? r : getLenientRange(metric, r);
}

function canPlantSeed(seedType) {
  const hardMode = hardModeOn();
  const soil = getSoilSnapshot();
  if (!soil) return { ok: true, reason: '' };
  const rule = SOIL_RULES[seedType];
  if (!rule) return { ok: true, reason: '' };

  const moistureOk = inRange(soil.moisture, getRuleRange(rule, 'moisture', 'viable', hardMode));
  const phOk = inRange(soil.ph, getRuleRange(rule, 'ph', 'viable', hardMode));
  const nOk = inRange(soil.n, getRuleRange(rule, 'n', 'viable', hardMode));

  if (hardMode) {
    if (moistureOk && phOk && nOk) return { ok: true, reason: '' };
  } else {
    const okCount = (moistureOk ? 1 : 0) + (phOk ? 1 : 0) + (nOk ? 1 : 0);
    if (okCount >= 2) return { ok: true, reason: '' };
  }

  return { ok: false, reason: rule.lockReason };
}

function getGrowthSpeedMultiplier(seedType) {
  const hardMode = hardModeOn();
  const soil = getSoilSnapshot();
  if (!soil) return 1;
  const rule = SOIL_RULES[seedType];
  if (!rule) return 1;

  const metrics = [
    {
      value: soil.moisture,
      thrive: getRuleRange(rule, 'moisture', 'thrive', hardMode),
      viable: getRuleRange(rule, 'moisture', 'viable', hardMode),
    },
    {
      value: soil.ph,
      thrive: getRuleRange(rule, 'ph', 'thrive', hardMode),
      viable: getRuleRange(rule, 'ph', 'viable', hardMode),
    },
    {
      value: soil.n,
      thrive: getRuleRange(rule, 'n', 'thrive', hardMode),
      viable: getRuleRange(rule, 'n', 'viable', hardMode),
    },
  ];

  let score = 0;
  let badCount = 0;
  for (const m of metrics) {
    if (inRange(m.value, m.thrive)) {
      score += 1;
    } else if (inRange(m.value, m.viable)) {
      score += 0.5;
    } else {
      score += hardMode ? 0.08 : 0.30;
      badCount++;
    }
  }

  let mult;
  if (hardMode) {
    mult = 0.45 + score / metrics.length + rule.thriveBonus;
    if (badCount >= 2) mult *= 0.2;
    return Math.max(0.08, Math.min(1.9, mult));
  }

  mult = 0.78 + (score / metrics.length) * 0.35 + rule.thriveBonus * 0.35;
  if (badCount >= 2) mult *= 0.85;
  return Math.max(0.65, Math.min(1.3, mult));
}

function getStageDuration(seedType, stageIdx, cellGrowMult) {
  const base = STAGE_TIMES[stageIdx] * 3;
  const mult = getGrowthSpeedMultiplier(seedType);
  const landMult = cellGrowMult || 1.0; // land type bonus (0.7 savanna, 1.4 riverside)
  return base / (mult * landMult);
}

// ============================================================
// Plant / Harvest
// ============================================================
function plantCell(idx) {
  const cell = farmCells[idx];
  if (cell.stage !== -1) return;
  cell.seedType    = selectedSeed;
  cell.stage       = 0;
  cell.watered     = false;
  cell.nextStageAt = farmRealTime + getStageDuration(selectedSeed, 0, cell.growMult);
  if (cell.mesh) scene.remove(cell.mesh);
  cell.mesh = buildCropMesh(selectedSeed, 0);
  cell.mesh.position.set(cell.cx, FARM_Y, cell.cz);
  scene.add(cell.mesh);
}

function harvestCell(idx) {
  const cell = farmCells[idx];
  if (cell.stage !== 3) return;
  if (cell.mesh) { scene.remove(cell.mesh); cell.mesh = null; }
  cell.stage    = -1;
  cell.seedType = -1;
  cell.watered  = false;
}

// ============================================================
// Raycasting helpers
// ============================================================
const _farmRaycaster = new THREE.Raycaster();
const _farmPlane     = new THREE.Plane(new THREE.Vector3(0, 1, 0), -FARM_Y);
const _farmHit       = new THREE.Vector3();
const _farmCenter    = new THREE.Vector2(0, 0);
let   hoveredCell    = -1;

function cellAt(wx, wz) {
  const col = Math.floor((wx - FARM_ORIGIN_X) / CELL_SIZE);
  const row = Math.floor((wz - FARM_ORIGIN_Z) / CELL_SIZE);
  if (col < 0 || col >= FARM_COLS || row < 0 || row >= FARM_ROWS) return -1;
  return row * FARM_COLS + col;
}

// ============================================================
// Per-frame update  (called from app.js animate loop)
// ============================================================
function updateFarming(dt) {
  farmRealTime += dt;

  // ---- Auto-water from upgrades ----
  if (typeof applyWaterPump === 'function') applyWaterPump();
  if (typeof applyRiversideWater === 'function') applyRiversideWater();

  // ---- Grow crops ----
  for (const cell of farmCells) {
    if (cell.stage < 0 || cell.stage >= 3) continue;
    if (farmRealTime >= cell.nextStageAt) {
      cell.stage++;
      cell.watered = false;
      if (cell.mesh) scene.remove(cell.mesh);
      cell.mesh = buildCropMesh(cell.seedType, cell.stage);
      cell.mesh.position.set(cell.cx, FARM_Y, cell.cz);
      scene.add(cell.mesh);
      if (cell.stage < 3) cell.nextStageAt = farmRealTime + getStageDuration(cell.seedType, cell.stage, cell.growMult);
    }
  }

  // ---- Raycast from camera centre to farm plane ----
  _farmRaycaster.setFromCamera(_farmCenter, camera);
  const hit = _farmRaycaster.ray.intersectPlane(_farmPlane, _farmHit);

  hoveredCell = -1;
  highlightTile.visible = false;

  const tooltipEl   = document.getElementById('farm-tooltip');
  const menuVisible = !document.getElementById('menu-overlay').classList.contains('hidden');

  if (!menuVisible && hit && player.pos.distanceTo(_farmHit) < REACH) {
    const idx = cellAt(_farmHit.x, _farmHit.z);
    if (idx >= 0) {
      hoveredCell = idx;
      const cell  = farmCells[idx];
      highlightTile.position.set(cell.cx, FARM_Y + 0.02, cell.cz);
      highlightTile.visible = true;

      if (cell.stage === -1) {
        _hlMat.color.setHex(0x88ff88);
        const hasSeed = seedInventory[selectedSeed] > 0;
        const plantCheck = canPlantSeed(selectedSeed);
        const tip = !hasSeed
          ? `No ${SEED_TYPES[selectedSeed].name} seeds!`
          : !plantCheck.ok
            ? `Soil lock: ${plantCheck.reason}`
            : `[F] Plant ${SEED_TYPES[selectedSeed].name}  (${seedInventory[selectedSeed]} left)`;
        if (tooltipEl) { tooltipEl.textContent = tip; tooltipEl.style.display = 'block'; }
      } else if (cell.stage === 3) {
        _hlMat.color.setHex(0xffff44);
        if (tooltipEl) { tooltipEl.textContent = `[F] Harvest ${SEED_TYPES[cell.seedType].name}`; tooltipEl.style.display = 'block'; }
      } else if (!cell.watered) {
        _hlMat.color.setHex(0xff8844);
        const tip = ownedTools.wateringCan
          ? `[F] Water ${SEED_TYPES[cell.seedType].name}`
          : 'Needs water — buy Ndoo at the Duka';
        if (tooltipEl) { tooltipEl.textContent = tip; tooltipEl.style.display = 'block'; }
      } else {
        _hlMat.color.setHex(0x88aaff);
        const stageNames = ['Planted', 'Sprouting', 'Growing'];
        if (tooltipEl) { tooltipEl.textContent = `${stageNames[cell.stage]} (watered)`; tooltipEl.style.display = 'block'; }
      }
      return;
    }
  }

  if (tooltipEl) tooltipEl.style.display = 'none';
}

// ============================================================
// Input — seed selection (1-5) and planting (F)
// ============================================================
window.addEventListener('keydown', e => {
  const menuVisible = !document.getElementById('menu-overlay').classList.contains('hidden');
  if (menuVisible) return;

  const n = parseInt(e.key);
  if (n >= 1 && n <= SEED_TYPES.length) {
    selectedSeed = n - 1;
    updateSeedHUD();
  }

  if (e.code === 'KeyF' && hoveredCell >= 0) {
    const cell = farmCells[hoveredCell];
    if (cell.stage === -1) {
      // Plant — need hoe + seeds
      if (!ownedTools.hoe) return;
      if (seedInventory[selectedSeed] <= 0) return;
      if (!canPlantSeed(selectedSeed).ok) return;
      seedInventory[selectedSeed]--;
      plantCell(hoveredCell);
      updateSeedHUD();
    } else if (cell.stage >= 0 && cell.stage < 3 && !cell.watered && ownedTools.wateringCan) {
      // Water — reduces remaining grow time to 1/3
      cell.watered = true;
      const remaining = cell.nextStageAt - farmRealTime;
      if (remaining > 0) cell.nextStageAt = farmRealTime + remaining / 3;
    } else if (cell.stage === 3) {
      // Harvest
      cropInventory[cell.seedType]++;
      if (typeof onCropHarvested === 'function') onCropHarvested(cell.seedType);
      harvestCell(hoveredCell);
      if (typeof updateMoneyHUD === 'function') updateMoneyHUD();
    }
  }

  if (e.code === 'KeyT' && hoveredCell >= 0) {
    const cell = farmCells[hoveredCell];
    if (cell.stage >= 0 && cell.stage < 3 && fertilizerCount > 0) {
      fertilizerCount--;
      if (typeof onFertilizerUsed === 'function') onFertilizerUsed();
      cell.stage++;
      cell.watered = false;
      if (cell.mesh) scene.remove(cell.mesh);
      cell.mesh = buildCropMesh(cell.seedType, cell.stage);
      cell.mesh.position.set(cell.cx, FARM_Y, cell.cz);
      scene.add(cell.mesh);
      if (cell.stage < 3) cell.nextStageAt = farmRealTime + getStageDuration(cell.seedType, cell.stage);
    }
  }
});

// ============================================================
// Seed HUD
// ============================================================
function updateSeedHUD() {
  document.querySelectorAll('.seed-slot').forEach((el, i) => {
    el.classList.toggle('active', i === selectedSeed);
    const countEl = el.querySelector('.seed-count');
    if (countEl) countEl.textContent = 'x' + seedInventory[i];
  });
}
updateSeedHUD();

// ============================================================
// Animal production — eggs & milk
// ============================================================
function updateAnimalProduction(dt) {
  // Feed bonus: 2x production speed when troughs have feed in them
  const fed = (typeof troughFeedStored !== 'undefined') && troughFeedStored > 0;
  const feedBonus = fed ? 2.0 : 1.0;

  // Eggs from chickens
  if (ownedChickens > 0) {
    eggCooldown -= dt * feedBonus;
    if (eggCooldown <= 0) {
      const laid = ownedChickens;
      animalProducts.eggs += laid;
      if (typeof onEggCollected === 'function') onEggCollected(laid);
      eggCooldown = EGG_INTERVAL;
      _flashAnimalProduct('eggs', laid);
    }
  }

  // Milk from cows
  if (ownedCows > 0) {
    milkCooldown -= dt * feedBonus;
    if (milkCooldown <= 0) {
      const milked = ownedCows;
      animalProducts.milk += milked;
      if (typeof onMilkCollected === 'function') onMilkCollected(milked);
      milkCooldown = MILK_INTERVAL;
      _flashAnimalProduct('milk', milked);
    }
  }

  // Update feed troughs (depletion + visuals)
  if (typeof updateFeedTroughs === 'function') updateFeedTroughs(dt);
}

// Quick floating text for egg/milk collection
function _flashAnimalProduct(type, amount) {
  const tipEl = document.getElementById('farm-tooltip');
  if (!tipEl) return;
  const label = type === 'eggs' ? 'Eggs' : 'Milk';
  tipEl.textContent = `+${amount} ${label} collected!`;
  tipEl.style.display = 'block';
  clearTimeout(tipEl._apTimer);
  tipEl._apTimer = setTimeout(() => { tipEl.style.display = 'none'; }, 2500);
}
