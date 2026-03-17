// ============================================================
// SoilSMS Farm World — 3D Scene Setup
// ============================================================

const container = document.getElementById('canvas-container');
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x87ceeb); // fallback — sky dome renders on top
scene.fog = new THREE.FogExp2(0xc8b890, 0.003);

const camera = new THREE.PerspectiveCamera(55, window.innerWidth / window.innerHeight, 0.1, 2000);

// ---- Farm layout constants (shared with farming.js & controls.js) ----
const FARM_COLS     = 10;
const FARM_ROWS     = 8;
const CELL_SIZE     = 1.5;
const FARM_ORIGIN_X = -7.5;
const FARM_ORIGIN_Z = 10.0;
const FLAT_FARM_Y   = 0.70;   // flattened plateau height for the farm area
const FARM_BLEND    = 8;      // blend zone width (m) between plateau and natural terrain

function _smoothstep(lo, hi, x) {
  const t = Math.max(0, Math.min(1, (x - lo) / (hi - lo)));
  return t * t * (3 - 2 * t);
}

// Top surface of the raised farm bed (15 cm above flattened terrain)
const FARM_SURFACE_Y = FLAT_FARM_Y + 0.15;

// Terrain height — returns raised-bed surface inside farm, natural curve outside
function groundAt(x, z) {
  const inX = x >= FARM_ORIGIN_X && x <= FARM_ORIGIN_X + FARM_COLS * CELL_SIZE;
  const inZ = z >= FARM_ORIGIN_Z && z <= FARM_ORIGIN_Z + FARM_ROWS * CELL_SIZE;
  if (inX && inZ) return FARM_SURFACE_Y;
  return Math.sin(x * 0.05) * 0.8 + Math.cos(z * 0.04) * 0.6;
}
camera.position.set(12, 8, 14);
camera.lookAt(0, 1, 0);

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
container.appendChild(renderer.domElement);

// --- Lights (hot equatorial sun) ---
const ambientLight = new THREE.AmbientLight(0xffe8c0, 0.55);
scene.add(ambientLight);

const sunLight = new THREE.DirectionalLight(0xfff0c0, 1.4);
sunLight.position.set(30, 50, 20);
sunLight.castShadow = true;
sunLight.shadow.mapSize.set(2048, 2048);
sunLight.shadow.camera.left = -50;
sunLight.shadow.camera.right = 50;
sunLight.shadow.camera.top = 50;
sunLight.shadow.camera.bottom = -50;
scene.add(sunLight);
// Warm hemisphere: hot sky above, red earth below
const hemiLight = new THREE.HemisphereLight(0xdec88a, 0x8b4513, 0.45);
scene.add(hemiLight);

// --- Ground (Tanzanian red laterite earth with dry savanna) ---
const groundGeo = new THREE.PlaneGeometry(600, 600, 100, 100);
const posAttr = groundGeo.attributes.position;
// Farm footprint extents for blend
const _fx1 = FARM_ORIGIN_X - FARM_BLEND, _fx2 = FARM_ORIGIN_X + FARM_COLS * CELL_SIZE + FARM_BLEND;
const _fz1 = FARM_ORIGIN_Z - FARM_BLEND, _fz2 = FARM_ORIGIN_Z + FARM_ROWS * CELL_SIZE + FARM_BLEND;
for (let i = 0; i < posAttr.count; i++) {
  const lx = posAttr.getX(i), ly = posAttr.getY(i);
  // PlaneGeometry rotated -π/2 around X: worldX=lx, worldZ=-ly
  const wx = lx, wz = -ly;
  const natural = Math.sin(wx * 0.05) * 0.8 + Math.cos(wz * 0.04) * 0.6 + Math.random() * 0.15;
  if (wx >= _fx1 && wx <= _fx2 && wz >= _fz1 && wz <= _fz2) {
    // Blend factor: 1 = full plateau, 0 = full natural terrain
    const bx = Math.min(
      _smoothstep(_fx1, FARM_ORIGIN_X, wx),
      _smoothstep(_fx2, FARM_ORIGIN_X + FARM_COLS * CELL_SIZE, wx)
    );
    const bz = Math.min(
      _smoothstep(_fz1, FARM_ORIGIN_Z, wz),
      _smoothstep(_fz2, FARM_ORIGIN_Z + FARM_ROWS * CELL_SIZE, wz)
    );
    const blend = Math.min(bx, bz);
    posAttr.setZ(i, natural * (1 - blend) + FLAT_FARM_Y * blend);
  } else {
    posAttr.setZ(i, natural);
  }
}
groundGeo.computeVertexNormals();
// Vertex colors: mix red earth and dry yellow grass
const groundColors = new Float32Array(posAttr.count * 3);
for (let i = 0; i < posAttr.count; i++) {
  const x = posAttr.getX(i), y = posAttr.getY(i);
  const dist = Math.sqrt(x * x + y * y);
  const noise = Math.sin(x * 0.3) * Math.cos(y * 0.2) * 0.5 + 0.5;
  // Near farm = darker tilled soil, far = dry savanna mix
  if (dist < 12) {
    // Red-brown tilled earth
    groundColors[i*3]   = 0.36 + noise * 0.06;
    groundColors[i*3+1] = 0.22 + noise * 0.04;
    groundColors[i*3+2] = 0.1 + noise * 0.02;
  } else {
    // Savanna: mix of dry yellow grass and red earth
    const grassMix = noise;
    groundColors[i*3]   = 0.55 * grassMix + 0.5 * (1-grassMix);
    groundColors[i*3+1] = 0.45 * grassMix + 0.28 * (1-grassMix);
    groundColors[i*3+2] = 0.15 * grassMix + 0.12 * (1-grassMix);
  }
}
groundGeo.setAttribute('color', new THREE.BufferAttribute(groundColors, 3));
const ground = new THREE.Mesh(groundGeo, new THREE.MeshLambertMaterial({ vertexColors: true }));
ground.rotation.x = -Math.PI / 2;
ground.receiveShadow = true;
scene.add(ground);

// Farm plot built by farming.js

// --- Dry grass tufts scattered across savanna ---
function createGrassTuft(x, z) {
  const blades = 4 + Math.floor(Math.random() * 5);
  for (let i = 0; i < blades; i++) {
    const h = 0.3 + Math.random() * 0.5;
    const blade = new THREE.Mesh(
      new THREE.PlaneGeometry(0.05, h),
      new THREE.MeshLambertMaterial({
        color: Math.random() > 0.3 ? 0xb8a050 : 0x8a7a30,
        side: THREE.DoubleSide
      })
    );
    blade.position.set(x + (Math.random()-0.5)*0.4, h/2, z + (Math.random()-0.5)*0.4);
    blade.rotation.y = Math.random() * Math.PI;
    blade.rotation.z = (Math.random()-0.5) * 0.3;
    scene.add(blade);
  }
}
for (let i = 0; i < 300; i++) {
  const angle = Math.random() * Math.PI * 2;
  const dist = 14 + Math.random() * 220;
  createGrassTuft(Math.cos(angle)*dist, Math.sin(angle)*dist);
}


// --- Kilimanjaro in the distance ---
const kiliGroup = new THREE.Group();
kiliGroup.position.set(-180, 0, -220);
// Main mountain body
const kiliGeo = new THREE.ConeGeometry(30, 22, 8);
const kiliMat = new THREE.MeshLambertMaterial({ color: 0x6a7a8a });
const kiliMountain = new THREE.Mesh(kiliGeo, kiliMat);
kiliMountain.position.y = 11;
kiliGroup.add(kiliMountain);
// Snow cap
const snowGeo = new THREE.ConeGeometry(12, 6, 8);
const snowMat = new THREE.MeshLambertMaterial({ color: 0xf0f0ff });
const snowCap = new THREE.Mesh(snowGeo, snowMat);
snowCap.position.y = 20;
kiliGroup.add(snowCap);
// Secondary peak (Mawenzi)
const mawenzi = new THREE.Mesh(
  new THREE.ConeGeometry(14, 14, 6),
  new THREE.MeshLambertMaterial({ color: 0x5a6a7a })
);
mawenzi.position.set(22, 7, 5);
kiliGroup.add(mawenzi);
scene.add(kiliGroup);

// --- Distant hills (typical Tanzanian rolling landscape) ---
function createHill(x, z, radius, height, color) {
  const hill = new THREE.Mesh(
    new THREE.SphereGeometry(radius, 12, 8, 0, Math.PI * 2, 0, Math.PI / 2),
    new THREE.MeshLambertMaterial({ color })
  );
  hill.position.set(x, 0, z);
  hill.scale.y = height / radius;
  scene.add(hill);
}
createHill(120, -130, 35, 10, 0x7a8a5a);
createHill(-130, -150, 45, 14, 0x8a9060);
createHill(160, 100, 30, 8, 0x6a7a4a);
createHill(-140, 130, 40, 12, 0x7a8050);
createHill(80, 180, 28, 7, 0x7a8a5a);
createHill(-90, -190, 38, 11, 0x8a9060);

// --- Red rocks / boulders (laterite outcrops) ---
function createRock(x, z, s) {
  const rock = new THREE.Mesh(
    new THREE.DodecahedronGeometry(s, 0),
    new THREE.MeshLambertMaterial({ color: 0x8b4525 + Math.floor(Math.random() * 0x151515) })
  );
  rock.position.set(x, groundAt(x, z) + s * 0.4, z);
  rock.rotation.set(Math.random(), Math.random(), Math.random());
  rock.castShadow = true;
  scene.add(rock);
}
[[12,-8,0.5],[-10,-10,0.7],[14,7,0.4],[-8,10,0.6],[22,-5,0.3],[-14,-6,0.5],[8,14,0.35],
 [40,-20,0.8],[-35,15,0.6],[55,30,0.9],[-50,-30,0.7],[30,45,0.5],[-45,40,0.8],
 [65,-10,0.6],[70,25,1.0],[-60,-15,0.7],[80,-40,0.5],[-70,20,0.9]
].forEach(([x,z,s]) => createRock(x,z,s));

// ============================================================
// RPi Sensor Device — tall wooden stake with small computer box
// ============================================================
const rpiGroup = new THREE.Group();
rpiGroup.position.set(-3, 0, -2);

// Wooden stake (main structure)
const stake = new THREE.Mesh(
  new THREE.CylinderGeometry(0.04, 0.06, 2.4, 6),
  new THREE.MeshLambertMaterial({ color: 0x8B6914 })
);
stake.position.y = 1.2;
stake.castShadow = true;
rpiGroup.add(stake);

// Small RPi enclosure box on the stake
const rpiBox = new THREE.Mesh(
  new THREE.BoxGeometry(0.4, 0.25, 0.3),
  new THREE.MeshPhongMaterial({ color: 0x2c8c3c, specular: 0x222222 })
);
rpiBox.position.y = 2.0;
rpiBox.castShadow = true;
rpiGroup.add(rpiBox);

// Tiny solar panel on top of box
const solar = new THREE.Mesh(
  new THREE.BoxGeometry(0.5, 0.02, 0.35),
  new THREE.MeshPhongMaterial({ color: 0x1a1a4a, specular: 0x4444aa, shininess: 80 })
);
solar.position.y = 2.2;
solar.rotation.z = 0.15;
rpiGroup.add(solar);

// Thin antenna wire
const antenna = new THREE.Mesh(
  new THREE.CylinderGeometry(0.01, 0.01, 0.6, 4),
  new THREE.MeshLambertMaterial({ color: 0xcccccc })
);
antenna.position.set(0.15, 2.5, 0);
rpiGroup.add(antenna);

// Antenna tip (red bead)
const tip = new THREE.Mesh(
  new THREE.SphereGeometry(0.03, 8, 8),
  new THREE.MeshPhongMaterial({ color: 0xff3333, emissive: 0xff0000, emissiveIntensity: 0.5 })
);
tip.position.set(0.15, 2.85, 0);
rpiGroup.add(tip);

// Two soil probes going into ground
for (let i = -1; i <= 1; i += 2) {
  const probe = new THREE.Mesh(
    new THREE.CylinderGeometry(0.015, 0.015, 0.5, 6),
    new THREE.MeshLambertMaterial({ color: 0x666666 })
  );
  probe.position.set(i * 0.12, -0.05, 0.1);
  rpiGroup.add(probe);
}

// Tiny LED on box face
const ledGeo = new THREE.SphereGeometry(0.025, 8, 8);
const ledMat = new THREE.MeshPhongMaterial({ color: 0x00ff00, emissive: 0x00ff00, emissiveIntensity: 1 });
const led = new THREE.Mesh(ledGeo, ledMat);
led.position.set(-0.12, 2.02, 0.16);
rpiGroup.add(led);

// Thin wire from box down to probes
const wire = new THREE.Mesh(
  new THREE.CylinderGeometry(0.008, 0.008, 1.6, 4),
  new THREE.MeshLambertMaterial({ color: 0x444444 })
);
wire.position.set(0, 1.1, 0.1);
rpiGroup.add(wire);

scene.add(rpiGroup);
rpiGroup.visible = false; // hidden — unlockable shop item later

// --- Cell Tower ---
const towerGroup = new THREE.Group();
towerGroup.position.set(20, groundAt(20, -15), -15);

const legMat = new THREE.MeshLambertMaterial({ color: 0xaaaaaa });
for (let i = 0; i < 3; i++) {
  const angle = (i / 3) * Math.PI * 2;
  const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.15, 14, 6), legMat);
  leg.position.set(Math.cos(angle) * 0.8, 7, Math.sin(angle) * 0.8);
  leg.castShadow = true;
  towerGroup.add(leg);
}
for (let h = 2; h < 14; h += 2) {
  const bar = new THREE.Mesh(new THREE.BoxGeometry(2.0, 0.06, 0.06), legMat);
  bar.position.y = h;
  bar.rotation.y = h * 0.5;
  towerGroup.add(bar);
}
for (let i = 0; i < 3; i++) {
  const angle = (i / 3) * Math.PI * 2;
  const panel = new THREE.Mesh(
    new THREE.BoxGeometry(0.6, 1.2, 0.1),
    new THREE.MeshPhongMaterial({ color: 0xdddddd })
  );
  panel.position.set(Math.cos(angle) * 1.0, 14, Math.sin(angle) * 1.0);
  panel.rotation.y = angle;
  panel.castShadow = true;
  towerGroup.add(panel);
}
const towerLightMat = new THREE.MeshPhongMaterial({ color: 0xff0000, emissive: 0xff0000, emissiveIntensity: 0.8 });
const towerLight = new THREE.Mesh(new THREE.SphereGeometry(0.15, 8, 8), towerLightMat);
towerLight.position.y = 15;
towerGroup.add(towerLight);
scene.add(towerGroup);

// --- Server building ---
const serverGroup = new THREE.Group();
serverGroup.position.set(20, 0, 18);

const building = new THREE.Mesh(
  new THREE.BoxGeometry(4, 3, 3),
  new THREE.MeshPhongMaterial({ color: 0x4a4a6a })
);
building.position.y = 1.5;
building.castShadow = true;
serverGroup.add(building);

const roof = new THREE.Mesh(
  new THREE.BoxGeometry(4.4, 0.2, 3.4),
  new THREE.MeshLambertMaterial({ color: 0x3a3a5a })
);
roof.position.y = 3.1;
serverGroup.add(roof);

for (let i = 0; i < 4; i++) {
  const sLed = new THREE.Mesh(
    new THREE.BoxGeometry(0.3, 0.08, 0.01),
    new THREE.MeshPhongMaterial({
      color: i % 2 === 0 ? 0x00ff88 : 0x3388ff,
      emissive: i % 2 === 0 ? 0x00ff88 : 0x3388ff,
      emissiveIntensity: 0.8
    })
  );
  sLed.position.set(-0.8 + i * 0.5, 1.5, 1.51);
  serverGroup.add(sLed);
}

// AI SERVER label
const aiCanvas = document.createElement('canvas');
aiCanvas.width = 150; aiCanvas.height = 60;
const aiCtx = aiCanvas.getContext('2d');
aiCtx.fillStyle = '#3498db';
aiCtx.fillRect(0, 0, 150, 60);
aiCtx.fillStyle = '#fff';
aiCtx.font = 'bold 30px monospace';
aiCtx.textAlign = 'center';
aiCtx.fillText('AI SERVER', 75, 40);
const aiLabel = new THREE.Mesh(
  new THREE.PlaneGeometry(1.5, 0.6),
  new THREE.MeshBasicMaterial({ map: new THREE.CanvasTexture(aiCanvas) })
);
aiLabel.position.set(0, 2.5, 1.52);
serverGroup.add(aiLabel);

const dish = new THREE.Mesh(
  new THREE.SphereGeometry(0.6, 12, 8, 0, Math.PI * 2, 0, Math.PI / 2),
  new THREE.MeshPhongMaterial({ color: 0xdddddd, side: THREE.DoubleSide })
);
dish.position.set(1.2, 3.3, 0);
dish.rotation.x = Math.PI * 0.7;
serverGroup.add(dish);
scene.add(serverGroup);
serverGroup.visible = false; // hidden — unlockable shop item later

// --- Small house (concrete block + mabati roof, Tanzania 2026) ---
const houseGroup = new THREE.Group();
const _hX = -18, _hZ = 12;
houseGroup.position.set(_hX, groundAt(_hX, _hZ), _hZ);

const _wallMat  = new THREE.MeshLambertMaterial({ color: 0xf0e8d0 });
const _metalMat = new THREE.MeshLambertMaterial({ color: 0x7a7a7a });
const _woodMat  = new THREE.MeshLambertMaterial({ color: 0x5a3010 });
const _winMat   = new THREE.MeshLambertMaterial({ color: 0x2a3a5a, transparent: true, opacity: 0.75 });
const _frameMat = new THREE.MeshLambertMaterial({ color: 0xbbbbbb });
const _concMat  = new THREE.MeshLambertMaterial({ color: 0x999999 });

// Main walls (5 m wide/X, 4 m deep/Z, 2.5 m tall)
const hWalls = new THREE.Mesh(new THREE.BoxGeometry(5, 2.5, 4), _wallMat);
hWalls.position.y = 1.25;
hWalls.castShadow = true;
hWalls.receiveShadow = true;
houseGroup.add(hWalls);

// Gable roof — two angled corrugated-iron panels
for (const s of [-1, 1]) {
  const panel = new THREE.Mesh(new THREE.BoxGeometry(5.6, 0.10, 2.3), _metalMat);
  panel.position.set(0, 2.78, s * 1.05);
  panel.rotation.x = s * 0.24;
  panel.castShadow = true;
  houseGroup.add(panel);
}
const hRidge = new THREE.Mesh(
  new THREE.BoxGeometry(5.5, 0.12, 0.2),
  new THREE.MeshLambertMaterial({ color: 0x555555 })
);
hRidge.position.y = 3.06;
houseGroup.add(hRidge);

// Door on +X face (east, facing the farm)
const hDoor = new THREE.Mesh(new THREE.BoxGeometry(0.08, 2.0, 0.9), _woodMat);
hDoor.position.set(2.54, 1.0, 0);
houseGroup.add(hDoor);
const hDoorFrame = new THREE.Mesh(new THREE.BoxGeometry(0.06, 2.18, 1.06), _frameMat);
hDoorFrame.position.set(2.52, 1.09, 0);
houseGroup.add(hDoorFrame);

// Concrete step
const hStep = new THREE.Mesh(new THREE.BoxGeometry(0.35, 0.18, 1.1), _concMat);
hStep.position.set(2.72, 0.09, 0);
houseGroup.add(hStep);

// Veranda overhang + two wooden posts
const hVeranda = new THREE.Mesh(new THREE.BoxGeometry(1.5, 0.09, 1.5), _metalMat);
hVeranda.position.set(3.24, 2.52, 0);
houseGroup.add(hVeranda);
for (const s of [-0.55, 0.55]) {
  const vPost = new THREE.Mesh(new THREE.CylinderGeometry(0.055, 0.065, 2.5, 6), _woodMat);
  vPost.position.set(3.90, 1.25, s);
  houseGroup.add(vPost);
}

// Windows on front face (flanking door)
for (const s of [-1.35, 1.35]) {
  const wf = new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.80, 1.0), _frameMat);
  wf.position.set(2.51, 1.65, s);
  houseGroup.add(wf);
  const wg = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.65, 0.85), _winMat);
  wg.position.set(2.525, 1.65, s);
  houseGroup.add(wg);
}
// Side windows
for (const s of [-1, 1]) {
  const wf = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.75, 0.07), _frameMat);
  wf.position.set(0.6, 1.65, s * 2.01);
  houseGroup.add(wf);
  const wg = new THREE.Mesh(new THREE.BoxGeometry(0.75, 0.60, 0.08), _winMat);
  wg.position.set(0.6, 1.65, s * 2.025);
  houseGroup.add(wg);
}

// Blue plastic water storage tank
const hTank = new THREE.Mesh(
  new THREE.CylinderGeometry(0.45, 0.45, 0.90, 10),
  new THREE.MeshLambertMaterial({ color: 0x2255bb })
);
hTank.position.set(-2.0, 0.45, -1.7);
houseGroup.add(hTank);
const hTankLid = new THREE.Mesh(
  new THREE.CylinderGeometry(0.46, 0.46, 0.06, 10),
  new THREE.MeshLambertMaterial({ color: 0x1a3a88 })
);
hTankLid.position.set(-2.0, 0.93, -1.7);
houseGroup.add(hTankLid);

// Wooden fence posts flanking the entrance gate
for (const s of [-1.8, 1.8]) {
  for (let i = 0; i < 3; i++) {
    const fp = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.05, 1.4, 5), _woodMat);
    fp.position.set(4.2 + i * 0.8, 0.7, s);
    houseGroup.add(fp);
    if (i < 2) {
      const rail = new THREE.Mesh(new THREE.BoxGeometry(0.76, 0.06, 0.04), _woodMat);
      rail.position.set(4.6 + i * 0.8, 0.92, s);
      houseGroup.add(rail);
    }
  }
}

scene.add(houseGroup);

// Door world position — used for sleep interaction in app.js
const houseDoorPos = new THREE.Vector3(_hX + 2.5, groundAt(_hX, _hZ) + 1.0, _hZ);
//oil lamp
// --- Farm oil lamp ---
    const lampGroup = new THREE.Group();
    const _lx = FARM_ORIGIN_X - 1.2, _lz = FARM_ORIGIN_Z + 2;
    lampGroup.position.set(_lx, groundAt(_lx, _lz), _lz);

    const lampPost = new THREE.Mesh(
      new THREE.CylinderGeometry(0.04, 0.055, 2.8, 6),
      new THREE.MeshLambertMaterial({ color: 0x6b4a1a })
    );
    lampPost.position.y = 1.4;
    lampGroup.add(lampPost);

    const lanternBody = new THREE.Mesh(
      new THREE.BoxGeometry(0.22, 0.28, 0.22),
      new THREE.MeshLambertMaterial({ color: 0x222222 })
    );
    lanternBody.position.y = 2.9;
    lampGroup.add(lanternBody);

    const glassMat = new THREE.MeshBasicMaterial({ color: 0xffaa22, transparent: true, opacity: 0.9 });
    for (let i = 0; i < 4; i++) {
      const pane = new THREE.Mesh(new THREE.PlaneGeometry(0.18, 0.22), glassMat);
      const a = (i / 4) * Math.PI * 2;
      pane.position.set(Math.cos(a) * 0.112, 2.9, Math.sin(a) * 0.112);
      pane.rotation.y = a;
      lampGroup.add(pane);
    }

    const lampCap = new THREE.Mesh(
      new THREE.ConeGeometry(0.18, 0.14, 4),
      new THREE.MeshLambertMaterial({ color: 0x111111 })
    );
    lampCap.position.y = 3.1;
    lampGroup.add(lampCap);
    scene.add(lampGroup);

    const farmLamp = new THREE.PointLight(0xffaa33, 0, 14);
    farmLamp.position.set(_lx, groundAt(_lx, _lz) + 2.9, _lz);
    scene.add(farmLamp);

// --- Village Shop (Duka) ---
const shopGroup = new THREE.Group();
const _shopX = 10, _shopZ = -6;
shopGroup.position.set(_shopX, groundAt(_shopX, _shopZ), _shopZ);

const shopWalls = new THREE.Mesh(
  new THREE.BoxGeometry(4, 2.5, 3.5),
  new THREE.MeshLambertMaterial({ color: 0xddcc88 })
);
shopWalls.position.y = 1.25;
shopWalls.castShadow = true;
shopGroup.add(shopWalls);

const shopRoof = new THREE.Mesh(
  new THREE.BoxGeometry(4.4, 0.1, 3.9),
  new THREE.MeshLambertMaterial({ color: 0x888888 })
);
shopRoof.position.y = 2.55;
shopGroup.add(shopRoof);

// Service counter on +Z face
const shopCounter = new THREE.Mesh(
  new THREE.BoxGeometry(2.4, 0.12, 0.3),
  new THREE.MeshLambertMaterial({ color: 0x5a3010 })
);
shopCounter.position.set(0, 1.1, 1.9);
shopGroup.add(shopCounter);

// Awning over counter
const shopAwning = new THREE.Mesh(
  new THREE.BoxGeometry(3.0, 0.06, 1.4),
  new THREE.MeshLambertMaterial({ color: 0xaa3322 })
);
shopAwning.position.set(0, 2.3, 2.3);
shopAwning.rotation.x = 0.15;
shopGroup.add(shopAwning);

// DUKA sign (canvas texture)
const dukaCanvas = document.createElement('canvas');
dukaCanvas.width = 200; dukaCanvas.height = 60;
const dukaCtx = dukaCanvas.getContext('2d');
dukaCtx.fillStyle = '#2a6a20';
dukaCtx.fillRect(0, 0, 200, 60);
dukaCtx.fillStyle = '#fff';
dukaCtx.font = 'bold 36px monospace';
dukaCtx.textAlign = 'center';
dukaCtx.fillText('DUKA', 100, 42);
const dukaSign = new THREE.Mesh(
  new THREE.PlaneGeometry(2, 0.6),
  new THREE.MeshBasicMaterial({ map: new THREE.CanvasTexture(dukaCanvas) })
);
dukaSign.position.set(0, 2.85, 1.76);
shopGroup.add(dukaSign);

scene.add(shopGroup);
const shopPos = new THREE.Vector3(_shopX, groundAt(_shopX, _shopZ) + 1.0, _shopZ + 1.9);

// --- Market Stall (Soko) — open-air stall down the road ---
const marketGroup = new THREE.Group();
const _mktX = 55, _mktZ = -10;
marketGroup.position.set(_mktX, groundAt(_mktX, _mktZ), _mktZ);

// Open wooden stall: 4 posts + corrugated-iron roof
const stallRoof = new THREE.Mesh(
  new THREE.BoxGeometry(5, 0.1, 3.5),
  new THREE.MeshLambertMaterial({ color: 0x8a7a5a })
);
stallRoof.position.y = 2.5;
marketGroup.add(stallRoof);

for (const [px, pz] of [[-2.2, -1.5], [-2.2, 1.5], [2.2, -1.5], [2.2, 1.5]]) {
  const post = new THREE.Mesh(
    new THREE.CylinderGeometry(0.08, 0.1, 2.5, 6),
    new THREE.MeshLambertMaterial({ color: 0x6b4a1a })
  );
  post.position.set(px, 1.25, pz);
  marketGroup.add(post);
}

// Sales table
const mktTable = new THREE.Mesh(
  new THREE.BoxGeometry(4.5, 0.12, 1.5),
  new THREE.MeshLambertMaterial({ color: 0x5a3a10 })
);
mktTable.position.set(0, 1.0, 0);
marketGroup.add(mktTable);

// Decorative produce crates on table
for (const [cx, cz, col] of [[-1.4, 0, 0xddaa22], [0, 0, 0x44aa33], [1.4, 0, 0xcc4422]]) {
  const crate = new THREE.Mesh(
    new THREE.BoxGeometry(0.7, 0.35, 0.5),
    new THREE.MeshLambertMaterial({ color: col })
  );
  crate.position.set(cx, 1.24, cz);
  marketGroup.add(crate);
}

// SOKO sign
const sokoCanvas = document.createElement('canvas');
sokoCanvas.width = 200; sokoCanvas.height = 60;
const sokoCtx = sokoCanvas.getContext('2d');
sokoCtx.fillStyle = '#aa5520';
sokoCtx.fillRect(0, 0, 200, 60);
sokoCtx.fillStyle = '#fff';
sokoCtx.font = 'bold 36px monospace';
sokoCtx.textAlign = 'center';
sokoCtx.fillText('SOKO', 100, 42);
const sokoSign = new THREE.Mesh(
  new THREE.PlaneGeometry(2, 0.6),
  new THREE.MeshBasicMaterial({ map: new THREE.CanvasTexture(sokoCanvas) })
);
sokoSign.position.set(0, 2.8, 0);
marketGroup.add(sokoSign);

scene.add(marketGroup);
const marketPos = new THREE.Vector3(_mktX, groundAt(_mktX, _mktZ) + 1.0, _mktZ);


// --- Acacia trees (flat-topped, iconic Tanzania) ---
function createAcacia(x, z, s) {
  const gY = groundAt(x, z);
  const trunkH = 3 * s;
  const trunk = new THREE.Mesh(
    new THREE.CylinderGeometry(0.08 * s, 0.18 * s, trunkH, 6),
    new THREE.MeshLambertMaterial({ color: 0x5a3a1a })
  );
  trunk.position.set(x, gY + trunkH / 2, z);
  trunk.castShadow = true;
  scene.add(trunk);

  const canopy = new THREE.Mesh(
    new THREE.CylinderGeometry(2.5 * s, 2.8 * s, 0.5 * s, 10),
    new THREE.MeshLambertMaterial({ color: 0x4a7a28 + Math.floor(Math.random() * 0x101000) })
  );
  canopy.position.set(x, gY + trunkH + 0.2 * s, z);
  canopy.castShadow = true;
  scene.add(canopy);

  for (let b = 0; b < 3; b++) {
    const bAngle = (b / 3) * Math.PI * 2 + Math.random() * 0.5;
    const branch = new THREE.Mesh(
      new THREE.CylinderGeometry(0.02 * s, 0.04 * s, 1.5 * s, 4),
      new THREE.MeshLambertMaterial({ color: 0x5a3a1a })
    );
    branch.position.set(
      x + Math.cos(bAngle) * 0.5 * s,
      gY + trunkH * 0.7,
      z + Math.sin(bAngle) * 0.5 * s
    );
    branch.rotation.z = Math.cos(bAngle) * 0.5;
    branch.rotation.x = Math.sin(bAngle) * 0.5;
    scene.add(branch);
  }
}

// --- Baobab trees (fat trunk, sparse crown) ---
function createBaobab(x, z, s) {
  const gY = groundAt(x, z);
  // Massive trunk
  const trunk = new THREE.Mesh(
    new THREE.CylinderGeometry(0.8 * s, 1.2 * s, 3.5 * s, 8),
    new THREE.MeshLambertMaterial({ color: 0x8a7a6a })
  );
  trunk.position.set(x, gY + 1.75 * s, z);
  trunk.castShadow = true;
  scene.add(trunk);

  // Sparse gnarly branches at top
  for (let b = 0; b < 6; b++) {
    const bAngle = (b / 6) * Math.PI * 2;
    const bLen = (1.0 + Math.random() * 1.0) * s;
    const branch = new THREE.Mesh(
      new THREE.CylinderGeometry(0.06 * s, 0.15 * s, bLen, 5),
      new THREE.MeshLambertMaterial({ color: 0x7a6a5a })
    );
    branch.position.set(
      x + Math.cos(bAngle) * 0.6 * s,
      gY + 3.5 * s + bLen * 0.2,
      z + Math.sin(bAngle) * 0.6 * s
    );
    branch.rotation.z = Math.cos(bAngle) * 0.7;
    branch.rotation.x = Math.sin(bAngle) * 0.7;
    scene.add(branch);

    if (Math.random() > 0.3) {
      const leafCluster = new THREE.Mesh(
        new THREE.SphereGeometry(0.4 * s, 6, 4),
        new THREE.MeshLambertMaterial({ color: 0x5a8a30 })
      );
      leafCluster.position.set(
        x + Math.cos(bAngle) * (0.6 + bLen * 0.35) * s,
        gY + 3.5 * s + bLen * 0.6,
        z + Math.sin(bAngle) * (0.6 + bLen * 0.35) * s
      );
      scene.add(leafCluster);
    }
  }
}

// Place acacias (scattered across savanna)
[
  [-25,-8,1.2],[-22,-5,1],[-28,2,1.3],[28,-10,1.3],[30,5,1],[25,12,1.1],
  [-12,-18,1.1],[15,-20,1.2],[-8,20,1],[10,22,1.1],[-30,-15,1.3],
  [32,-18,1.0],[-15,22,0.9],[35,20,1.2],[18,25,1.0],[-35,-10,1.1],
  [40,-15,0.9],[-25,18,1.0],
  // Extended savanna
  [60,-30,1.1],[70,10,1.3],[-65,20,1.0],[55,50,1.2],[-55,-50,1.4],
  [80,-60,1.0],[-75,40,1.1],[90,30,1.3],[-80,-25,1.0],[100,-10,1.2],
  [45,-80,1.0],[-90,60,1.1],[110,50,0.9],[-100,-70,1.2],[75,80,1.0],
  [-60,90,1.1],[120,-30,1.0],[-110,10,1.3],[95,-90,0.9],[65,-110,1.1]
].forEach(([x,z,s]) => createAcacia(x,z,s));

// Place baobabs (fewer, they're rare and iconic)
[
  [-20,8,1.4],[38,8,1.2],[-40,-20,1.5],[45,25,1.1],
  [85,-45,1.3],[-90,55,1.4],[110,-80,1.2],[-105,70,1.3]
].forEach(([x,z,s]) => createBaobab(x,z,s));

// --- African sun (big, hot, golden) ---
const sun = new THREE.Mesh(
  new THREE.SphereGeometry(4, 16, 16),
  new THREE.MeshBasicMaterial({ color: 0xffdd33 })
);
sun.position.set(60, 45, -40);
scene.add(sun);
// Heat haze glow
const glow = new THREE.Mesh(
  new THREE.SphereGeometry(8, 16, 16),
  new THREE.MeshBasicMaterial({ color: 0xffcc22, transparent: true, opacity: 0.12 })
);
glow.position.copy(sun.position);
scene.add(glow);
// Second glow ring (heat shimmer)
const glow2 = new THREE.Mesh(
  new THREE.SphereGeometry(14, 16, 16),
  new THREE.MeshBasicMaterial({ color: 0xffaa00, transparent: true, opacity: 0.04 })
);
glow2.position.copy(sun.position);
scene.add(glow2);

// --- Moon ---
const moon = new THREE.Mesh(
  new THREE.SphereGeometry(2.2, 12, 12),
  new THREE.MeshBasicMaterial({ color: 0xddeeff })
);
moon.position.set(-60, 50, 40);
moon.visible = false;
scene.add(moon);
const moonGlow = new THREE.Mesh(
  new THREE.SphereGeometry(5, 12, 12),
  new THREE.MeshBasicMaterial({ color: 0x8899cc, transparent: true, opacity: 0.08 })
);
moonGlow.position.copy(moon.position);
moonGlow.visible = false;
scene.add(moonGlow);

// --- Stars ---
const starGeo = new THREE.BufferGeometry();
const starPositions = new Float32Array(800 * 3);
for (let i = 0; i < 800; i++) {
  const theta = Math.random() * Math.PI * 2;
  const phi   = Math.acos(2 * Math.random() - 1);
  const r     = 380;
  starPositions[i * 3]     = r * Math.sin(phi) * Math.cos(theta);
  starPositions[i * 3 + 1] = Math.abs(r * Math.cos(phi)) + 20; // upper hemisphere only
  starPositions[i * 3 + 2] = r * Math.sin(phi) * Math.sin(theta);
}
starGeo.setAttribute('position', new THREE.BufferAttribute(starPositions, 3));
const starField = new THREE.Points(
  starGeo,
  new THREE.PointsMaterial({ color: 0xffffff, size: 2, sizeAttenuation: false })
);
starField.visible = false;
scene.add(starField);

// --- Sky dome — panoramic texture tinted by day/night cycle in app.js ---
const skyDomeMat = new THREE.MeshBasicMaterial({
  side: THREE.BackSide,
  depthWrite: false,
  fog: false,
  color: 0x87ceeb, // placeholder until texture loads
});
const skyDome = new THREE.Mesh(new THREE.SphereGeometry(1900,40, 20), skyDomeMat);
skyDome.renderOrder = -1;
scene.add(skyDome);
new THREE.TextureLoader().load('../img/skybox.jpg', tex => {
  skyDomeMat.map = tex;
  skyDomeMat.needsUpdate = true;
});

// --- Clouds (sparse, bright tropical cumulus) ---
function createCloud(x,y,z) {
  const g = new THREE.Group();
  const mat = new THREE.MeshLambertMaterial({color: 0xfff8f0, transparent:true, opacity:0.8});
  const count = 3 + Math.floor(Math.random()*3);
  for (let i=0;i<count;i++) {
    const m = new THREE.Mesh(new THREE.SphereGeometry(1.2+Math.random()*2,8,6), mat);
    m.position.set(i*2-count, Math.random()*0.8, Math.random()*1.5-0.75);
    g.add(m);
  }
  g.position.set(x,y,z);
  scene.add(g);
  return g;
}
const clouds = [createCloud(-20,28,-30), createCloud(25,32,-25), createCloud(50,26,15), createCloud(-40,30,20)];

// --- Birds circling (simple dark triangles high up) ---
const birds = [];
for (let i = 0; i < 5; i++) {
  const birdGeo = new THREE.BufferGeometry();
  const verts = new Float32Array([0,0,0, -0.3,0,-0.15, 0.3,0,-0.15]);
  birdGeo.setAttribute('position', new THREE.BufferAttribute(verts, 3));
  const bird = new THREE.Mesh(birdGeo, new THREE.MeshBasicMaterial({color:0x222222, side:THREE.DoubleSide}));
  const angle = (i/5) * Math.PI * 2;
  const radius = 15 + Math.random() * 10;
  bird.position.set(Math.cos(angle)*radius, 18+Math.random()*8, Math.sin(angle)*radius);
  scene.add(bird);
  birds.push({ mesh: bird, angle, radius, speed: 0.003 + Math.random()*0.002, height: bird.position.y });
}

// ============================================================
// Silly Animals
// ============================================================

// --- Chickens (near the hut, little round bodies with tiny heads) ---
const chickens = [];
function createChicken(x, z) {
  const g = new THREE.Group();
  // Body (round boi)
  const body = new THREE.Mesh(
    new THREE.SphereGeometry(0.25, 8, 6),
    new THREE.MeshLambertMaterial({ color: 0xddaa55 })
  );
  body.position.y = 0.3;
  body.scale.set(1, 0.8, 1.2);
  g.add(body);
  // Head
  const head = new THREE.Mesh(
    new THREE.SphereGeometry(0.12, 6, 6),
    new THREE.MeshLambertMaterial({ color: 0xddaa55 })
  );
  head.position.set(0, 0.5, 0.2);
  g.add(head);
  // Beak
  const beak = new THREE.Mesh(
    new THREE.ConeGeometry(0.04, 0.1, 4),
    new THREE.MeshLambertMaterial({ color: 0xff8800 })
  );
  beak.position.set(0, 0.48, 0.33);
  beak.rotation.x = -Math.PI / 2;
  g.add(beak);
  // Comb (red wobbly bit)
  const comb = new THREE.Mesh(
    new THREE.BoxGeometry(0.02, 0.08, 0.1),
    new THREE.MeshLambertMaterial({ color: 0xee2222 })
  );
  comb.position.set(0, 0.6, 0.2);
  g.add(comb);
  // Legs (two sticks)
  for (let i = -1; i <= 1; i += 2) {
    const leg = new THREE.Mesh(
      new THREE.CylinderGeometry(0.015, 0.015, 0.2, 4),
      new THREE.MeshLambertMaterial({ color: 0xcc8800 })
    );
    leg.position.set(i * 0.08, 0.1, 0);
    g.add(leg);
  }
  g.position.set(x, groundAt(x, z), z);
  g.rotation.y = Math.random() * Math.PI * 2;
  scene.add(g);
  chickens.push({
    mesh: g,
    baseX: x, baseZ: z,
    wanderAngle: Math.random() * Math.PI * 2,
    wanderSpeed: 0.005 + Math.random() * 0.01,
    peckTimer: Math.random() * 5
  });
}
// Scatter chickens near the hut
[[-16, 10], [-17, 13], [-19, 11], [-15, 14], [-20, 10]].forEach(([x, z]) => createChicken(x, z));

// --- Goats (derpy rectangles with horns, wandering the savanna) ---
const goats = [];
function createGoat(x, z) {
  const g = new THREE.Group();
  // Body (long box)
  const body = new THREE.Mesh(
    new THREE.BoxGeometry(0.8, 0.5, 0.4),
    new THREE.MeshLambertMaterial({ color: Math.random() > 0.5 ? 0xeeeeee : 0x888877 })
  );
  body.position.y = 0.55;
  g.add(body);
  // Head (smaller box, tilted forward)
  const head = new THREE.Mesh(
    new THREE.BoxGeometry(0.25, 0.25, 0.3),
    new THREE.MeshLambertMaterial({ color: 0xddddcc })
  );
  head.position.set(0.45, 0.7, 0);
  g.add(head);
  // Horns (two tiny cones going backwards)
  for (let i = -1; i <= 1; i += 2) {
    const horn = new THREE.Mesh(
      new THREE.ConeGeometry(0.03, 0.2, 4),
      new THREE.MeshLambertMaterial({ color: 0x999988 })
    );
    horn.position.set(0.45, 0.9, i * 0.1);
    horn.rotation.z = 0.4;
    g.add(horn);
  }
  // Legs (4 sticks)
  [[-0.25, -0.15], [-0.25, 0.15], [0.25, -0.15], [0.25, 0.15]].forEach(([lx, lz]) => {
    const leg = new THREE.Mesh(
      new THREE.CylinderGeometry(0.03, 0.03, 0.35, 4),
      new THREE.MeshLambertMaterial({ color: 0x665544 })
    );
    leg.position.set(lx, 0.17, lz);
    g.add(leg);
  });
  // Tiny tail (sticking up)
  const tail = new THREE.Mesh(
    new THREE.CylinderGeometry(0.015, 0.02, 0.15, 4),
    new THREE.MeshLambertMaterial({ color: 0xddddcc })
  );
  tail.position.set(-0.45, 0.75, 0);
  tail.rotation.z = -0.6;
  g.add(tail);
  g.position.set(x, groundAt(x, z), z);
  g.rotation.y = Math.random() * Math.PI * 2;
  g.castShadow = true;
  scene.add(g);
  goats.push({
    mesh: g,
    baseX: x, baseZ: z,
    wanderAngle: Math.random() * Math.PI * 2,
    wanderSpeed: 0.003 + Math.random() * 0.005,
    wanderRadius: 2 + Math.random() * 3
  });
}
[[15, 8], [13, 12], [-12, -14], [18, -8], [-25, 5], [8, -12]].forEach(([x, z]) => createGoat(x, z));

// --- Cows (chonky bois, grazing lazily) ---
const cows = [];
function createCow(x, z) {
  const g = new THREE.Group();
  const isSpotted = Math.random() > 0.5;
  const bodyColor = isSpotted ? 0xfaf0e6 : 0x6b4226;
  // Body (big chonk)
  const body = new THREE.Mesh(
    new THREE.BoxGeometry(1.4, 0.8, 0.7),
    new THREE.MeshLambertMaterial({ color: bodyColor })
  );
  body.position.y = 0.9;
  g.add(body);
  // Spots (if spotted)
  if (isSpotted) {
    for (let s = 0; s < 3; s++) {
      const spot = new THREE.Mesh(
        new THREE.CircleGeometry(0.12 + Math.random() * 0.1, 6),
        new THREE.MeshLambertMaterial({ color: 0x3a2010, side: THREE.DoubleSide })
      );
      spot.position.set(-0.3 + Math.random() * 0.6, 0.9 + (Math.random() - 0.5) * 0.3, 0.351);
      g.add(spot);
    }
  }
  // Head
  const head = new THREE.Mesh(
    new THREE.BoxGeometry(0.35, 0.35, 0.45),
    new THREE.MeshLambertMaterial({ color: bodyColor })
  );
  head.position.set(0.8, 1.0, 0);
  g.add(head);
  // Snout (pink-ish)
  const snout = new THREE.Mesh(
    new THREE.BoxGeometry(0.2, 0.15, 0.3),
    new THREE.MeshLambertMaterial({ color: 0xddaaaa })
  );
  snout.position.set(0.97, 0.9, 0);
  g.add(snout);
  // Horns
  for (let i = -1; i <= 1; i += 2) {
    const horn = new THREE.Mesh(
      new THREE.ConeGeometry(0.035, 0.25, 5),
      new THREE.MeshLambertMaterial({ color: 0xccbb99 })
    );
    horn.position.set(0.75, 1.3, i * 0.18);
    horn.rotation.z = i * 0.3;
    g.add(horn);
  }
  // Legs (4 chunky sticks)
  [[-0.45, -0.25], [-0.45, 0.25], [0.45, -0.25], [0.45, 0.25]].forEach(([lx, lz]) => {
    const leg = new THREE.Mesh(
      new THREE.CylinderGeometry(0.06, 0.06, 0.55, 5),
      new THREE.MeshLambertMaterial({ color: bodyColor })
    );
    leg.position.set(lx, 0.27, lz);
    g.add(leg);
  });
  // Tail (dangly)
  const tail = new THREE.Mesh(
    new THREE.CylinderGeometry(0.015, 0.025, 0.6, 4),
    new THREE.MeshLambertMaterial({ color: bodyColor })
  );
  tail.position.set(-0.75, 0.8, 0);
  tail.rotation.z = 0.5;
  g.add(tail);
  g.position.set(x, groundAt(x, z), z);
  g.rotation.y = Math.random() * Math.PI * 2;
  g.castShadow = true;
  scene.add(g);
  cows.push({
    mesh: g,
    wanderAngle: Math.random() * Math.PI * 2,
    wanderSpeed: 0.001 + Math.random() * 0.002,
    headBob: Math.random() * Math.PI
  });
}
[[-30, 2], [-28, -3], [25, 20], [28, 22]].forEach(([x, z]) => createCow(x, z));

// --- Giraffe (tall lanky boi in the distance) ---
function createGiraffe(x, z) {
  const g = new THREE.Group();
  // Body
  const body = new THREE.Mesh(
    new THREE.BoxGeometry(1.6, 0.7, 0.6),
    new THREE.MeshLambertMaterial({ color: 0xdaa520 })
  );
  body.position.y = 2.8;
  g.add(body);
  // Neck (long!!)
  const neck = new THREE.Mesh(
    new THREE.CylinderGeometry(0.15, 0.2, 2.5, 6),
    new THREE.MeshLambertMaterial({ color: 0xdaa520 })
  );
  neck.position.set(0.6, 4.2, 0);
  neck.rotation.z = 0.2;
  g.add(neck);
  // Head (smol)
  const head = new THREE.Mesh(
    new THREE.BoxGeometry(0.5, 0.2, 0.25),
    new THREE.MeshLambertMaterial({ color: 0xdaa520 })
  );
  head.position.set(0.9, 5.5, 0);
  g.add(head);
  // Ossicones (cute lil horns)
  for (let i = -1; i <= 1; i += 2) {
    const oss = new THREE.Mesh(
      new THREE.CylinderGeometry(0.025, 0.025, 0.25, 4),
      new THREE.MeshLambertMaterial({ color: 0x8b6914 })
    );
    oss.position.set(0.85, 5.75, i * 0.08);
    g.add(oss);
    // Tip
    const ossTip = new THREE.Mesh(
      new THREE.SphereGeometry(0.04, 6, 6),
      new THREE.MeshLambertMaterial({ color: 0x3a2010 })
    );
    ossTip.position.set(0.85, 5.88, i * 0.08);
    g.add(ossTip);
  }
  // Spots on body
  for (let s = 0; s < 6; s++) {
    const spot = new THREE.Mesh(
      new THREE.CircleGeometry(0.1 + Math.random() * 0.08, 5),
      new THREE.MeshLambertMaterial({ color: 0x8b4513, side: THREE.DoubleSide })
    );
    spot.position.set(-0.5 + Math.random() * 1.0, 2.6 + Math.random() * 0.4, 0.301);
    g.add(spot);
  }
  // Legs (4 long stilts)
  [[-0.5, -0.2], [-0.5, 0.2], [0.5, -0.2], [0.5, 0.2]].forEach(([lx, lz]) => {
    const leg = new THREE.Mesh(
      new THREE.CylinderGeometry(0.06, 0.07, 2.5, 5),
      new THREE.MeshLambertMaterial({ color: 0xdaa520 })
    );
    leg.position.set(lx, 1.25, lz);
    g.add(leg);
  });
  // Tail
  const tail = new THREE.Mesh(
    new THREE.CylinderGeometry(0.015, 0.03, 0.8, 4),
    new THREE.MeshLambertMaterial({ color: 0xdaa520 })
  );
  tail.position.set(-0.9, 2.7, 0);
  tail.rotation.z = 0.6;
  g.add(tail);
  // Tail tuft
  const tuft = new THREE.Mesh(
    new THREE.SphereGeometry(0.06, 5, 5),
    new THREE.MeshLambertMaterial({ color: 0x3a2010 })
  );
  tuft.position.set(-1.3, 2.3, 0);
  g.add(tuft);
  g.position.set(x, groundAt(x, z), z);
  g.rotation.y = Math.random() * Math.PI * 2;
  g.castShadow = true;
  scene.add(g);
  return g;
}
const giraffe1 = createGiraffe(-55, -45);
const giraffe2 = createGiraffe(65, -50);

// --- Hippo (chunky potato in the distance, maybe near a puddle) ---
function createHippo(x, z) {
  const g = new THREE.Group();
  // Body (absolute unit)
  const body = new THREE.Mesh(
    new THREE.SphereGeometry(0.9, 8, 6),
    new THREE.MeshLambertMaterial({ color: 0x8a7070 })
  );
  body.position.y = 0.7;
  body.scale.set(1.4, 0.9, 1);
  g.add(body);
  // Head (big snout)
  const head = new THREE.Mesh(
    new THREE.SphereGeometry(0.5, 8, 6),
    new THREE.MeshLambertMaterial({ color: 0x8a7070 })
  );
  head.position.set(1.1, 0.8, 0);
  head.scale.set(1.2, 0.8, 1);
  g.add(head);
  // Nostrils (two bumps on top of snout)
  for (let i = -1; i <= 1; i += 2) {
    const nostril = new THREE.Mesh(
      new THREE.SphereGeometry(0.08, 6, 6),
      new THREE.MeshLambertMaterial({ color: 0x6a5555 })
    );
    nostril.position.set(1.5, 1.0, i * 0.12);
    g.add(nostril);
  }
  // Eyes (on top of head, peeking)
  for (let i = -1; i <= 1; i += 2) {
    const eye = new THREE.Mesh(
      new THREE.SphereGeometry(0.06, 6, 6),
      new THREE.MeshLambertMaterial({ color: 0x111111 })
    );
    eye.position.set(1.0, 1.15, i * 0.2);
    g.add(eye);
  }
  // Ears (tiny)
  for (let i = -1; i <= 1; i += 2) {
    const ear = new THREE.Mesh(
      new THREE.SphereGeometry(0.07, 5, 5),
      new THREE.MeshLambertMaterial({ color: 0x7a6060 })
    );
    ear.position.set(0.7, 1.2, i * 0.35);
    g.add(ear);
  }
  // Stubby legs
  [[-0.4, -0.35], [-0.4, 0.35], [0.5, -0.35], [0.5, 0.35]].forEach(([lx, lz]) => {
    const leg = new THREE.Mesh(
      new THREE.CylinderGeometry(0.12, 0.12, 0.35, 6),
      new THREE.MeshLambertMaterial({ color: 0x7a6565 })
    );
    leg.position.set(lx, 0.17, lz);
    g.add(leg);
  });
  // Tiny puddle underneath
  const puddle = new THREE.Mesh(
    new THREE.CircleGeometry(2, 12),
    new THREE.MeshLambertMaterial({ color: 0x5a7a6a, transparent: true, opacity: 0.4 })
  );
  puddle.rotation.x = -Math.PI / 2;
  puddle.position.y = 0.02;
  g.add(puddle);
  g.position.set(x, groundAt(x, z), z);
  g.rotation.y = Math.random() * Math.PI * 2;
  scene.add(g);
  return g;
}
const hippo = createHippo(55, 22);

// --- Elephant (big gentle giant far away) ---
function createElephant(x, z) {
  const g = new THREE.Group();
  const eMat = new THREE.MeshLambertMaterial({ color: 0x7a7a7a });
  // Body
  const body = new THREE.Mesh(new THREE.SphereGeometry(1.2, 8, 6), eMat);
  body.position.y = 1.6;
  body.scale.set(1.3, 1, 1);
  g.add(body);
  // Head
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.65, 8, 6), eMat);
  head.position.set(1.4, 2.0, 0);
  g.add(head);
  // Trunk (curved cylinder-ish, made of a few segments)
  const trunkParts = [
    { y: 1.5, z: 0, rx: 0.3 },
    { y: 1.1, z: 0.15, rx: 0.6 },
    { y: 0.7, z: 0.4, rx: 0.9 },
  ];
  trunkParts.forEach(tp => {
    const seg = new THREE.Mesh(
      new THREE.CylinderGeometry(0.08, 0.12, 0.5, 6),
      eMat
    );
    seg.position.set(1.9, tp.y, tp.z);
    seg.rotation.x = tp.rx;
    g.add(seg);
  });
  // Ears (big floppy discs)
  for (let i = -1; i <= 1; i += 2) {
    const ear = new THREE.Mesh(
      new THREE.CircleGeometry(0.6, 8),
      new THREE.MeshLambertMaterial({ color: 0x8a8080, side: THREE.DoubleSide })
    );
    ear.position.set(1.0, 2.2, i * 0.65);
    ear.rotation.y = i * 0.3;
    g.add(ear);
  }
  // Tusks
  for (let i = -1; i <= 1; i += 2) {
    const tusk = new THREE.Mesh(
      new THREE.ConeGeometry(0.04, 0.5, 5),
      new THREE.MeshLambertMaterial({ color: 0xfffff0 })
    );
    tusk.position.set(1.7, 1.5, i * 0.2);
    tusk.rotation.z = 0.2;
    tusk.rotation.x = i * 0.15;
    g.add(tusk);
  }
  // Legs (4 pillars)
  [[-0.5, -0.4], [-0.5, 0.4], [0.7, -0.4], [0.7, 0.4]].forEach(([lx, lz]) => {
    const leg = new THREE.Mesh(
      new THREE.CylinderGeometry(0.18, 0.2, 1.2, 6),
      eMat
    );
    leg.position.set(lx, 0.6, lz);
    g.add(leg);
  });
  // Tail
  const tail = new THREE.Mesh(
    new THREE.CylinderGeometry(0.02, 0.04, 0.7, 4),
    eMat
  );
  tail.position.set(-1.4, 1.5, 0);
  tail.rotation.z = 0.7;
  g.add(tail);
  g.position.set(x, groundAt(x, z), z);
  g.rotation.y = Math.random() * Math.PI * 2;
  g.castShadow = true;
  scene.add(g);
  return g;
}
const elephant = createElephant(-70, -60);

// ============================================================
// SMS data flow particles
// ============================================================
const particles = [];
const particleGeo = new THREE.SphereGeometry(0.15, 6, 6);
const particleSendMat = new THREE.MeshBasicMaterial({ color: 0xf1c40f });
const particleRecvMat = new THREE.MeshBasicMaterial({ color: 0x7cfc00 });

const sendPath = [
  new THREE.Vector3(-3, 2.85, -2),
  new THREE.Vector3(8, 10, -8),
  new THREE.Vector3(20, 15, -15),
];
const recvPath = [
  new THREE.Vector3(20, 3, 18),
  new THREE.Vector3(20, 15, -15),
  new THREE.Vector3(0, 10, 0),
  new THREE.Vector3(-18, 3, 12),
];

function createParticle(path, mat, speed) {
  const mesh = new THREE.Mesh(particleGeo, mat);
  mesh.visible = false;
  scene.add(mesh);
  return { mesh, path, t: 0, speed, active: false };
}
for (let i = 0; i < 5; i++) {
  particles.push(createParticle(sendPath, particleSendMat, 0.008 + Math.random() * 0.004));
  particles.push(createParticle(recvPath, particleRecvMat, 0.007 + Math.random() * 0.003));
}

function getPointOnPath(path, t) {
  const segs = path.length - 1;
  const seg = Math.min(Math.floor(t * segs), segs - 1);
  return new THREE.Vector3().lerpVectors(path[seg], path[seg + 1], (t * segs) - seg);
}

// ============================================================
// Building collision boxes (AABB, XZ plane)
// Used by controls.js updatePlayer()
// ============================================================
const worldColliders = [
  { x1: -21, x2: -15, z1: 10, z2: 14, name: 'house'   },  // (-18, 12), 5×4 m
  { x1:  16, x2:  24, z1: -19, z2: -11, name: 'tower'  },  // (20, -15)
  { x1:   8, x2:  12, z1: -8, z2: -4,   name: 'shop'   },  // (10, -6), 4×3.5 m
  { x1:  52, x2:  58, z1: -12, z2: -8,  name: 'market'  },  // (55, -10), 5×3.5 m
];

// Sky dome background is handled above — day/night tints it in app.js

// ============================================================
// Rifle viewmodel (positioned relative to camera each frame in app.js)
// ============================================================
const rifleModel = new THREE.Group();

const _rfStockMat = new THREE.MeshLambertMaterial({ color: 0x4a2a0e });
const _rfMetMat   = new THREE.MeshLambertMaterial({ color: 0x1a1a1a });

// Wooden stock (butt end)
const _rfStock = new THREE.Mesh(new THREE.BoxGeometry(0.034, 0.042, 0.24), _rfStockMat);
_rfStock.position.z = 0.17;
rifleModel.add(_rfStock);

// Metal receiver / action
const _rfReceiver = new THREE.Mesh(new THREE.BoxGeometry(0.034, 0.044, 0.20), _rfMetMat);
_rfReceiver.position.z = -0.02;
rifleModel.add(_rfReceiver);

// Barrel (long thin cylinder pointing -Z = forward)
const _rfBarrel = new THREE.Mesh(new THREE.CylinderGeometry(0.007, 0.008, 0.42, 8), _rfMetMat);
_rfBarrel.rotation.x = Math.PI / 2;
_rfBarrel.position.set(0, 0.010, -0.25);
rifleModel.add(_rfBarrel);

// Scope tube
const _rfScope = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.012, 0.18, 8), _rfMetMat);
_rfScope.rotation.x = Math.PI / 2;
_rfScope.position.set(0, 0.040, -0.01);
rifleModel.add(_rfScope);

// Scope objective lens (wider front end)
const _rfScopeObj = new THREE.Mesh(new THREE.CylinderGeometry(0.016, 0.012, 0.04, 8), _rfMetMat);
_rfScopeObj.rotation.x = Math.PI / 2;
_rfScopeObj.position.set(0, 0.040, -0.12);
rifleModel.add(_rfScopeObj);

// Pistol grip
const _rfGrip = new THREE.Mesh(new THREE.BoxGeometry(0.024, 0.055, 0.030), _rfMetMat);
_rfGrip.position.set(0.002, -0.025, 0.06);
_rfGrip.rotation.x = -0.35;
rifleModel.add(_rfGrip);

// Wooden forestock (under barrel)
const _rfFore = new THREE.Mesh(new THREE.BoxGeometry(0.022, 0.025, 0.22), _rfStockMat);
_rfFore.position.set(0, -0.014, -0.12);
rifleModel.add(_rfFore);

// Muzzle flash (briefly shown on shoot via hunting.js)
const muzzleFlash = new THREE.Mesh(
  new THREE.SphereGeometry(0.024, 6, 4),
  new THREE.MeshBasicMaterial({ color: 0xffee44 })
);
muzzleFlash.position.set(0, 0.010, -0.468);
muzzleFlash.visible = false;
rifleModel.add(muzzleFlash);

rifleModel.visible = false;
scene.add(rifleModel);

// ============================================================
// Nokia 3D Viewmodel — REMOVED (using 2D HTML widget instead)
// ============================================================
// nokia3D intentionally null — 2D HTML Nokia widget is used instead
