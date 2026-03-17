// ============================================================
// Upgrades — Phase 7B
// ============================================================

const UPGRADES = {
  storageBarn:  { name: 'GHALA (Storage Barn)',      price: 1200, built: false },
  waterPump:    { name: 'PAMPU (Water Pump)',        price: 900,  built: false },
  solarPanel:   { name: 'SOLA (Solar Panel)',        price: 1500, built: false },
  sensorNode:   { name: 'SENSORI (Sensor Node)',     price: 5000, built: false },
  houseUpgrade: { name: 'NYUMBA KUBWA (Big House)',  price: 2000, built: false },
};

// Upgrade 3D mesh groups (for cleanup)
const upgradeMeshes = {};

// ============================================================
// Storage Barn — at (-14, 5), between house and farm
// ============================================================
function buildStorageBarn() {
  const g = new THREE.Group();
  const bx = -14, bz = 5;
  const by = groundAt(bx, bz);
  g.position.set(bx, by, bz);

  const wallMat = new THREE.MeshLambertMaterial({ color: 0x6b4a1a });
  const roofMat = new THREE.MeshLambertMaterial({ color: 0x7a7a7a });

  // Walls (6 x 3.5 x 4.5m)
  const walls = new THREE.Mesh(new THREE.BoxGeometry(6, 3.5, 4.5), wallMat);
  walls.position.y = 1.75;
  walls.castShadow = true;
  g.add(walls);

  // Gable roof
  for (const s of [-1, 1]) {
    const panel = new THREE.Mesh(new THREE.BoxGeometry(6.6, 0.1, 2.8), roofMat);
    panel.position.set(0, 3.75, s * 1.2);
    panel.rotation.x = s * 0.28;
    panel.castShadow = true;
    g.add(panel);
  }
  const ridge = new THREE.Mesh(new THREE.BoxGeometry(6.5, 0.1, 0.2), roofMat);
  ridge.position.y = 4.12;
  g.add(ridge);

  // Big barn door
  const doorMat = new THREE.MeshLambertMaterial({ color: 0x4a2a08 });
  const door = new THREE.Mesh(new THREE.BoxGeometry(0.08, 2.8, 2.2), doorMat);
  door.position.set(3.04, 1.4, 0);
  g.add(door);

  // GHALA sign
  const canvas = document.createElement('canvas');
  canvas.width = 200; canvas.height = 60;
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = '#5a3a10';
  ctx.fillRect(0, 0, 200, 60);
  ctx.fillStyle = '#fff';
  ctx.font = 'bold 30px monospace';
  ctx.textAlign = 'center';
  ctx.fillText('GHALA', 100, 42);
  const sign = new THREE.Mesh(
    new THREE.PlaneGeometry(1.6, 0.5),
    new THREE.MeshBasicMaterial({ map: new THREE.CanvasTexture(canvas) })
  );
  sign.position.set(3.05, 3.2, 0);
  g.add(sign);

  scene.add(g);
  upgradeMeshes.storageBarn = g;
  worldColliders.push({ x1: bx - 3, x2: bx + 3, z1: bz - 2.25, z2: bz + 2.25, name: 'barn' });
}

// ============================================================
// Water Pump — at (-3, 8), just south of farm
// ============================================================
function buildWaterPump() {
  const g = new THREE.Group();
  const px = -3, pz = 8;
  const py = groundAt(px, pz);
  g.position.set(px, py, pz);

  // Concrete well base
  const baseMat = new THREE.MeshLambertMaterial({ color: 0x999999 });
  const base = new THREE.Mesh(new THREE.CylinderGeometry(0.6, 0.7, 0.5, 10), baseMat);
  base.position.y = 0.25;
  g.add(base);

  // Metal pump body
  const metalMat = new THREE.MeshPhongMaterial({ color: 0x4466aa, specular: 0x222244 });
  const pumpBody = new THREE.Mesh(new THREE.CylinderGeometry(0.15, 0.15, 1.0, 6), metalMat);
  pumpBody.position.y = 1.0;
  g.add(pumpBody);

  // Pump arm (lever)
  const armMat = new THREE.MeshLambertMaterial({ color: 0x333333 });
  const arm = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.06, 1.0), armMat);
  arm.position.set(0, 1.5, 0.3);
  arm.rotation.x = -0.3;
  g.add(arm);

  // Handle
  const handle = new THREE.Mesh(new THREE.SphereGeometry(0.08, 6, 4), armMat);
  handle.position.set(0, 1.4, 0.75);
  g.add(handle);

  // Spout
  const spout = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.06, 0.4, 5), metalMat);
  spout.position.set(0, 0.7, 0.45);
  spout.rotation.x = 0.5;
  g.add(spout);

  // Small water trough below spout
  const troughMat = new THREE.MeshLambertMaterial({ color: 0x555555 });
  const trough = new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.2, 0.5), troughMat);
  trough.position.set(0, 0.15, 0.6);
  g.add(trough);

  scene.add(g);
  upgradeMeshes.waterPump = g;
}

// ============================================================
// Solar Panel — at (-5, 8), next to pump
// ============================================================
function buildSolarPanel() {
  const g = new THREE.Group();
  const sx = -5, sz = 8;
  const sy = groundAt(sx, sz);
  g.position.set(sx, sy, sz);

  // Two metal legs
  const legMat = new THREE.MeshLambertMaterial({ color: 0x888888 });
  for (const lx of [-0.5, 0.5]) {
    const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.04, 1.8, 4), legMat);
    leg.position.set(lx, 0.9, 0);
    g.add(leg);
  }

  // Crossbar
  const bar = new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.04, 0.04), legMat);
  bar.position.y = 1.6;
  g.add(bar);

  // Panel (angled)
  const panelMat = new THREE.MeshPhongMaterial({ color: 0x1a1a4a, specular: 0x4444aa, shininess: 80 });
  const panel = new THREE.Mesh(new THREE.BoxGeometry(1.8, 0.05, 1.2), panelMat);
  panel.position.set(0, 1.85, 0);
  panel.rotation.x = 0.45; // tilted toward sun
  g.add(panel);

  // Frame around panel
  const frameMat = new THREE.MeshLambertMaterial({ color: 0xaaaaaa });
  const frame = new THREE.Mesh(new THREE.BoxGeometry(1.9, 0.06, 1.3), frameMat);
  frame.position.set(0, 1.84, 0);
  frame.rotation.x = 0.45;
  g.add(frame);

  // Small green LED
  const ledMat = new THREE.MeshPhongMaterial({ color: 0x00ff00, emissive: 0x00ff00, emissiveIntensity: 0.6 });
  const led = new THREE.Mesh(new THREE.SphereGeometry(0.03, 6, 6), ledMat);
  led.position.set(0.6, 1.65, -0.1);
  led.name = 'solarLed';
  g.add(led);

  scene.add(g);
  upgradeMeshes.solarPanel = g;
}

// ============================================================
// Sensor Node — unhide rpiGroup + serverGroup
// ============================================================
function buildSensorNode() {
  rpiGroup.visible = true;
  serverGroup.visible = true;

  // Show soil data HUD
  const hudEl = document.getElementById('soil-data-hud');
  if (hudEl) hudEl.style.display = 'block';
}

// ============================================================
// Big House — replace house meshes with larger version
// ============================================================
function buildBigHouse() {
  // Clear existing house children
  while (houseGroup.children.length > 0) {
    houseGroup.remove(houseGroup.children[0]);
  }

  const wallMat  = new THREE.MeshLambertMaterial({ color: 0xe8dcc0 });
  const metalMat = new THREE.MeshLambertMaterial({ color: 0x666666 });
  const woodMat  = new THREE.MeshLambertMaterial({ color: 0x5a3010 });
  const winMat   = new THREE.MeshLambertMaterial({ color: 0x2a3a5a, transparent: true, opacity: 0.75 });
  const frameMat = new THREE.MeshLambertMaterial({ color: 0xbbbbbb });
  const concMat  = new THREE.MeshLambertMaterial({ color: 0x999999 });

  // Bigger walls (7 x 3.2 x 5.5m)
  const walls = new THREE.Mesh(new THREE.BoxGeometry(7, 3.2, 5.5), wallMat);
  walls.position.y = 1.6;
  walls.castShadow = true;
  walls.receiveShadow = true;
  houseGroup.add(walls);

  // Gable roof
  for (const s of [-1, 1]) {
    const panel = new THREE.Mesh(new THREE.BoxGeometry(7.8, 0.12, 3.2), metalMat);
    panel.position.set(0, 3.5, s * 1.35);
    panel.rotation.x = s * 0.25;
    panel.castShadow = true;
    houseGroup.add(panel);
  }
  const ridge = new THREE.Mesh(new THREE.BoxGeometry(7.6, 0.12, 0.22), new THREE.MeshLambertMaterial({ color: 0x555555 }));
  ridge.position.y = 3.82;
  houseGroup.add(ridge);

  // Front door (+X face)
  const door = new THREE.Mesh(new THREE.BoxGeometry(0.08, 2.2, 1.1), woodMat);
  door.position.set(3.54, 1.1, 0);
  houseGroup.add(door);
  const doorFrame = new THREE.Mesh(new THREE.BoxGeometry(0.06, 2.4, 1.3), frameMat);
  doorFrame.position.set(3.52, 1.2, 0);
  houseGroup.add(doorFrame);

  // Concrete porch
  const porch = new THREE.Mesh(new THREE.BoxGeometry(2.0, 0.2, 3.0), concMat);
  porch.position.set(4.5, 0.1, 0);
  houseGroup.add(porch);

  // Veranda overhang + posts
  const veranda = new THREE.Mesh(new THREE.BoxGeometry(2.2, 0.09, 3.5), metalMat);
  veranda.position.set(4.6, 3.0, 0);
  houseGroup.add(veranda);
  for (const sz of [-1.4, 1.4]) {
    const vp = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.07, 3.0, 6), woodMat);
    vp.position.set(5.5, 1.5, sz);
    houseGroup.add(vp);
  }

  // Front windows (flanking door)
  for (const sz of [-1.8, 1.8]) {
    const wf = new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.9, 1.1), frameMat);
    wf.position.set(3.51, 1.8, sz);
    houseGroup.add(wf);
    const wg = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.75, 0.95), winMat);
    wg.position.set(3.525, 1.8, sz);
    houseGroup.add(wg);
  }

  // Side windows (2 per side)
  for (const s of [-1, 1]) {
    for (const wx of [-1.5, 1.5]) {
      const wf = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.8, 0.07), frameMat);
      wf.position.set(wx, 1.8, s * 2.76);
      houseGroup.add(wf);
      const wg = new THREE.Mesh(new THREE.BoxGeometry(0.75, 0.65, 0.08), winMat);
      wg.position.set(wx, 1.8, s * 2.78);
      houseGroup.add(wg);
    }
  }

  // Water tank (bigger)
  const tankMat = new THREE.MeshLambertMaterial({ color: 0x2255bb });
  const tank = new THREE.Mesh(new THREE.CylinderGeometry(0.6, 0.6, 1.2, 10), tankMat);
  tank.position.set(-2.8, 0.6, -2.2);
  houseGroup.add(tank);
  const lid = new THREE.Mesh(new THREE.CylinderGeometry(0.62, 0.62, 0.06, 10), new THREE.MeshLambertMaterial({ color: 0x1a3a88 }));
  lid.position.set(-2.8, 1.23, -2.2);
  houseGroup.add(lid);

  // Update collider
  for (let i = 0; i < worldColliders.length; i++) {
    if (worldColliders[i].name === 'house') {
      worldColliders[i] = { x1: -22, x2: -14.5, z1: 9.25, z2: 14.75, name: 'house' };
      break;
    }
  }
}

// ============================================================
// Buy an upgrade
// ============================================================
function buyUpgrade(key) {
  const upg = UPGRADES[key];
  if (!upg || upg.built) return;
  if (playerMoney < upg.price) return;

  playerMoney -= upg.price;
  upg.built = true;

  switch (key) {
    case 'storageBarn':  buildStorageBarn();  break;
    case 'waterPump':    buildWaterPump();    break;
    case 'solarPanel':   buildSolarPanel();   break;
    case 'sensorNode':   buildSensorNode();   break;
    case 'houseUpgrade': buildBigHouse();     break;
  }

  renderShop();
  updateMoneyHUD();
}

// ============================================================
// Rebuild upgrades from save
// ============================================================
function rebuildUpgrades() {
  if (UPGRADES.storageBarn.built)  buildStorageBarn();
  if (UPGRADES.waterPump.built)    buildWaterPump();
  if (UPGRADES.solarPanel.built)   buildSolarPanel();
  if (UPGRADES.sensorNode.built)   buildSensorNode();
  if (UPGRADES.houseUpgrade.built) buildBigHouse();
}

// ============================================================
// Shop section for upgrades
// ============================================================
function renderShopUpgrades() {
  const el = document.getElementById('shop-upgrades');
  if (!el) return;
  el.innerHTML = '';

  for (const [key, upg] of Object.entries(UPGRADES)) {
    const built = upg.built;
    // Water pump hint
    let hint = '';
    if (key === 'waterPump') hint = ' <small style="color:#888">(auto-water crops)</small>';
    if (key === 'solarPanel') hint = ' <small style="color:#888">(powers pump 24/7)</small>';
    if (key === 'storageBarn') hint = ' <small style="color:#888">(+15% sell price)</small>';
    if (key === 'sensorNode') hint = ' <small style="color:#888">(soil data + AI SMS)</small>';

    el.innerHTML += `
      <div class="trade-row">
        <span class="trade-item">${upg.name}${hint}</span>
        <span class="trade-price">TSh ${upg.price}</span>
        <span class="trade-own">${built ? 'BUILT' : ''}</span>
        <button class="trade-btn" onclick="buyUpgrade('${key}')" ${built ? 'disabled' : ''}>
          ${built ? 'BUILT' : 'BUY'}
        </button>
      </div>`;
  }
}

// ============================================================
// Gameplay hooks — called from updateFarming / app.js
// ============================================================

// Water pump: auto-water crops within range
const PUMP_POS = { x: -3, z: 8 };
const PUMP_RANGE = 14; // meters

function applyWaterPump() {
  if (!UPGRADES.waterPump.built) return;

  // Without solar: only works during daytime
  if (!UPGRADES.solarPanel.built) {
    const sunElev = Math.sin((dayTime - 0.25) * Math.PI * 2);
    if (sunElev <= 0) return;
  }

  for (const cell of farmCells) {
    if (cell.stage < 0 || cell.stage >= 3 || cell.watered) continue;
    const dx = cell.cx - PUMP_POS.x;
    const dz = cell.cz - PUMP_POS.z;
    if (dx * dx + dz * dz < PUMP_RANGE * PUMP_RANGE) {
      cell.watered = true;
      const remaining = cell.nextStageAt - farmRealTime;
      if (remaining > 0) cell.nextStageAt = farmRealTime + remaining / 3;
    }
  }
}

// Riverside auto-water: water cells on riverside plots each growth tick
function applyRiversideWater() {
  for (const cell of farmCells) {
    if (!cell.autoWater) continue;
    if (cell.stage < 0 || cell.stage >= 3 || cell.watered) continue;
    cell.watered = true;
    const remaining = cell.nextStageAt - farmRealTime;
    if (remaining > 0) cell.nextStageAt = farmRealTime + remaining / 3;
  }
}

// Storage barn: sell price multiplier
function getSellMultiplier() {
  return UPGRADES.storageBarn.built ? 1.15 : 1.0;
}

// ============================================================
// Soil data HUD update (when sensor node is owned)
// ============================================================
function updateSoilHUD() {
  if (!UPGRADES.sensorNode.built) return;
  const el = document.getElementById('soil-data-hud');
  if (!el) return;
  const s = getSoilState();
  el.innerHTML =
    `<span>M:${s.moisture.toFixed(0)}%</span>` +
    `<span>pH:${s.ph.toFixed(1)}</span>` +
    `<span>N:${Math.round(s.n)}</span>`;
}
