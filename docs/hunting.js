// ============================================================
// Hunting — Phase 5
// Selling is deferred to Phase 6
// ============================================================

let huntingMode = false;

// ---- Collected items (Phase 6 will add selling) ----
const inventory = { meat: 0, hide: 0, feathers: 0 };

// ---- Projectile config (rifle round) ----
const PROJ_SPEED    = 90;   // m/s — fast rifle round
const PROJ_GRAVITY  = -3;   // m/s² — barely any drop at this speed
const PROJ_LIFETIME = 1.0;  // seconds before despawn

const projectiles = [];
const lootPiles   = [];

// ============================================================
// Wild-animal meshes
// ============================================================
const wildAnimals = [];

function createImpala(x, z) {
  const g    = new THREE.Group();
  const col  = 0xc8903a;
  const mat  = new THREE.MeshLambertMaterial({ color: col });

  // Body
  const body = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.45, 0.35), mat);
  body.position.y = 0.72;
  g.add(body);

  // Head
  const head = new THREE.Mesh(
    new THREE.BoxGeometry(0.22, 0.22, 0.26),
    new THREE.MeshLambertMaterial({ color: col })
  );
  head.position.set(0.52, 0.86, 0);
  g.add(head);

  // Ears
  for (const s of [-1, 1]) {
    const ear = new THREE.Mesh(
      new THREE.ConeGeometry(0.055, 0.17, 4),
      new THREE.MeshLambertMaterial({ color: 0xddaa66 })
    );
    ear.position.set(0.46, 0.98, s * 0.14);
    ear.rotation.z = s * 0.4;
    g.add(ear);
  }

  // Horns (paired sticks swept back)
  for (const s of [-1, 1]) {
    const horn = new THREE.Mesh(
      new THREE.CylinderGeometry(0.012, 0.022, 0.32, 4),
      new THREE.MeshLambertMaterial({ color: 0x4a3010 })
    );
    horn.position.set(0.44, 1.08, s * 0.06);
    horn.rotation.set(0.15, 0, s * 0.28);
    g.add(horn);
  }

  // Slender legs (4)
  for (const [lx, lz] of [[-0.3,-0.15],[-0.3,0.15],[0.3,-0.15],[0.3,0.15]]) {
    const leg = new THREE.Mesh(
      new THREE.CylinderGeometry(0.022, 0.016, 0.5, 4),
      new THREE.MeshLambertMaterial({ color: 0xaa7030 })
    );
    leg.position.set(lx, 0.25, lz);
    g.add(leg);
  }

  // White rump patch
  const rump = new THREE.Mesh(
    new THREE.PlaneGeometry(0.28, 0.22),
    new THREE.MeshLambertMaterial({ color: 0xfff0d8, side: THREE.DoubleSide })
  );
  rump.position.set(-0.452, 0.72, 0);
  rump.rotation.y = Math.PI / 2;
  g.add(rump);

  g.position.set(x, groundAt(x, z), z);
  g.rotation.y = Math.random() * Math.PI * 2;
  g.castShadow = true;
  scene.add(g);

  wildAnimals.push({
    mesh:        g,
    type:        'impala',
    radius:      0.7,
    alive:       true,
    wanderAngle: Math.random() * Math.PI * 2,
    wanderSpeed: 0.005 + Math.random() * 0.004,
    walkSpeed:   2.8,
    fleeSpeed:   12,
  });
}

function createGuineaFowl(x, z) {
  const g = new THREE.Group();

  // Dark spotted body
  const body = new THREE.Mesh(
    new THREE.SphereGeometry(0.21, 8, 6),
    new THREE.MeshLambertMaterial({ color: 0x333333 })
  );
  body.position.y = 0.28;
  body.scale.set(1, 0.82, 1.12);
  g.add(body);

  // White spots on body
  for (let s = 0; s < 9; s++) {
    const a    = (s / 9) * Math.PI * 2;
    const spot = new THREE.Mesh(
      new THREE.SphereGeometry(0.028, 4, 3),
      new THREE.MeshLambertMaterial({ color: 0xffffff })
    );
    spot.position.set(Math.cos(a) * 0.19, 0.28 + Math.sin(a) * 0.07, 0.21);
    g.add(spot);
  }

  // Blue-grey head
  const head = new THREE.Mesh(
    new THREE.SphereGeometry(0.095, 6, 6),
    new THREE.MeshLambertMaterial({ color: 0x3355aa })
  );
  head.position.set(0, 0.5, 0.16);
  g.add(head);

  // Orange-red beak
  const beak = new THREE.Mesh(
    new THREE.ConeGeometry(0.028, 0.075, 4),
    new THREE.MeshLambertMaterial({ color: 0xff5500 })
  );
  beak.position.set(0, 0.48, 0.268);
  beak.rotation.x = -Math.PI / 2;
  g.add(beak);

  // Helmet casque
  const casque = new THREE.Mesh(
    new THREE.ConeGeometry(0.022, 0.095, 4),
    new THREE.MeshLambertMaterial({ color: 0xff6600 })
  );
  casque.position.set(0, 0.63, 0.14);
  g.add(casque);

  // Legs
  for (const s of [-1, 1]) {
    const leg = new THREE.Mesh(
      new THREE.CylinderGeometry(0.01, 0.01, 0.17, 4),
      new THREE.MeshLambertMaterial({ color: 0xaa7a40 })
    );
    leg.position.set(s * 0.08, 0.085, 0);
    g.add(leg);
  }

  g.position.set(x, groundAt(x, z), z);
  g.rotation.y = Math.random() * Math.PI * 2;
  scene.add(g);

  wildAnimals.push({
    mesh:        g,
    type:        'bird',
    radius:      0.34,
    alive:       true,
    wanderAngle: Math.random() * Math.PI * 2,
    wanderSpeed: 0.014 + Math.random() * 0.008,
    walkSpeed:   2.2,
    fleeSpeed:   9,
  });
}

// ---- Spawn wild animals in the savanna (well away from farm/hut) ----
[
  [52, -18], [-48, 32], [72,  16], [-62, -38], [38, 58], [-42, -28],
].forEach(([x, z]) => createImpala(x, z));

[
  [28, -25], [-22, 35], [45, -42], [-35, 20],
].forEach(([x, z]) => createGuineaFowl(x, z));

// ============================================================
// Loot
// ============================================================
function spawnLoot(pos, animalType) {
  const drops = animalType === 'bird'
    ? [{ type: 'feathers', color: 0xd8d8b0 }, { type: 'meat', color: 0xcc3322 }]
    : [{ type: 'meat',     color: 0xcc3322 }, { type: 'hide', color: 0x886644 }];

  for (const drop of drops) {
    const mesh = new THREE.Mesh(
      new THREE.SphereGeometry(0.18, 6, 4),
      new THREE.MeshBasicMaterial({ color: drop.color })
    );
    mesh.position.set(
      pos.x + (Math.random() - 0.5) * 0.6,
      groundAt(pos.x, pos.z) + 0.22,
      pos.z + (Math.random() - 0.5) * 0.6
    );
    scene.add(mesh);
    lootPiles.push({ mesh, type: drop.type });
  }
}

function killAnimal(animal) {
  if (!animal.alive) return;
  animal.alive = false;
  spawnLoot(animal.mesh.position, animal.type);
  scene.remove(animal.mesh);
}

// ============================================================
// Shooting
// ============================================================
function shoot() {
  if (!huntingMode) return;
  if (!document.getElementById('menu-overlay').classList.contains('hidden')) return;
  if (!document.pointerLockElement) return;

  const dir = new THREE.Vector3(0, 0, -1)
    .applyQuaternion(camera.quaternion)
    .normalize();

  // Tiny tracer round (much smaller than the old slingshot rock)
  const mesh = new THREE.Mesh(
    new THREE.SphereGeometry(0.04, 4, 4),
    new THREE.MeshBasicMaterial({ color: 0xffee88 })
  );
  mesh.position.copy(player.pos).addScaledVector(dir, 0.6);
  mesh.position.y -= 0.05;
  scene.add(mesh);

  projectiles.push({
    mesh,
    vel:      dir.clone().multiplyScalar(PROJ_SPEED),
    lifetime: PROJ_LIFETIME,
  });

  // Muzzle flash
  if (typeof muzzleFlash !== 'undefined') {
    muzzleFlash.visible = true;
    setTimeout(() => { muzzleFlash.visible = false; }, 55);
  }
}

document.addEventListener('mousedown', e => {
  if (e.button === 0) shoot();
});

// ============================================================
// Per-frame update — called from app.js
// ============================================================
let _huntClock = 0;

function updateHunting(dt) {
  _huntClock += dt;

  // ---- Projectiles ----
  for (let i = projectiles.length - 1; i >= 0; i--) {
    const p = projectiles[i];
    p.vel.y += PROJ_GRAVITY * dt;
    p.mesh.position.addScaledVector(p.vel, dt);
    p.lifetime -= dt;

    const gh = getGroundHeight(p.mesh.position.x, p.mesh.position.z);
    if (p.mesh.position.y <= gh + 0.08 || p.lifetime <= 0) {
      scene.remove(p.mesh);
      projectiles.splice(i, 1);
      continue;
    }

    // Hit test against every living animal
    let hit = false;
    for (const animal of wildAnimals) {
      if (!animal.alive) continue;
      if (p.mesh.position.distanceTo(animal.mesh.position) < animal.radius) {
        killAnimal(animal);
        scene.remove(p.mesh);
        projectiles.splice(i, 1);
        hit = true;
        break;
      }
    }
    if (hit) continue;
  }

  // ---- Wild animals: wander / flee ----
  for (const animal of wildAnimals) {
    if (!animal.alive) continue;

    const dx2p = animal.mesh.position.x - player.pos.x;
    const dz2p = animal.mesh.position.z - player.pos.z;
    const dist  = Math.sqrt(dx2p * dx2p + dz2p * dz2p);
    const flee  = huntingMode && dist < 22;

    if (flee) {
      const len = dist || 1;
      animal.mesh.position.x += (dx2p / len) * animal.fleeSpeed * dt;
      animal.mesh.position.z += (dz2p / len) * animal.fleeSpeed * dt;
      animal.mesh.rotation.y  = Math.atan2(dx2p, dz2p);
    } else {
      animal.wanderAngle += animal.wanderSpeed;
      animal.mesh.position.x += Math.cos(animal.wanderAngle) * animal.walkSpeed * dt;
      animal.mesh.position.z += Math.sin(animal.wanderAngle) * animal.walkSpeed * dt;
      animal.mesh.rotation.y  = animal.wanderAngle + Math.PI / 2;
    }

    // Keep in world bounds
    animal.mesh.position.x = Math.max(-250, Math.min(250, animal.mesh.position.x));
    animal.mesh.position.z = Math.max(-250, Math.min(250, animal.mesh.position.z));

    // Stick to terrain
    animal.mesh.position.y = groundAt(animal.mesh.position.x, animal.mesh.position.z);
  }

  // ---- Loot collection: walk within 1.5 m ----
  let nearLoot = false;
  for (let i = lootPiles.length - 1; i >= 0; i--) {
    const loot = lootPiles[i];
    const d    = player.pos.distanceTo(loot.mesh.position);

    if (d < 1.5) {
      inventory[loot.type]++;
      scene.remove(loot.mesh);
      lootPiles.splice(i, 1);
      updateInventoryHUD();
    } else if (d < 3.5) {
      nearLoot = true;
    }
  }

  // Loot tooltip (reuse farm-tooltip element)
  const tipEl = document.getElementById('farm-tooltip');
  if (nearLoot && lootPiles.length > 0) {
    if (tipEl && tipEl.style.display === 'none') {
      tipEl.textContent  = 'Walk closer to collect';
      tipEl.style.display = 'block';
    }
  }
}

// ============================================================
// Hunting mode toggle
// ============================================================
function toggleHunting() {
  huntingMode = !huntingMode;

  const indicator = document.getElementById('hunt-indicator');
  if (indicator) indicator.style.display = huntingMode ? 'flex' : 'none';

  // Dim the seed toolbar when hunting
  const toolbar = document.getElementById('seed-toolbar');
  if (toolbar) toolbar.style.opacity = huntingMode ? '0.25' : '1';

  // Show/hide rifle viewmodel
  if (typeof rifleModel !== 'undefined') rifleModel.visible = huntingMode;
}

window.addEventListener('keydown', e => {
  if (!document.getElementById('menu-overlay').classList.contains('hidden')) return;
  if (e.code === 'KeyG') toggleHunting();
});

// ============================================================
// Inventory HUD
// ============================================================
function updateInventoryHUD() {
  const m = document.getElementById('inv-meat');
  const h = document.getElementById('inv-hide');
  const f = document.getElementById('inv-feathers');
  if (m) m.textContent = inventory.meat;
  if (h) h.textContent = inventory.hide;
  if (f) f.textContent = inventory.feathers;
}
