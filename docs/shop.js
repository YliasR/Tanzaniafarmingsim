// ============================================================
// Shop & Market — Phase 6 (expanded)
// ============================================================

// ---- Base prices (before fluctuation) ----
const BASE_SEED_PRICES  = [20, 25, 15, 30, 35];
const BASE_CROP_PRICES  = [50, 60, 40, 70, 80];
const BASE_LOOT_PRICES  = { meat: 35, hide: 45, feathers: 25 };
const BASE_PRODUCT_PRICES = { eggs: 18, milk: 28 };
const TOOL_PRICES       = { hoe: 100, wateringCan: 120, machete: 200, axe: 250 };
const FERTILIZER_BUY    = 40;
const FEED_BUY          = 25;
const FENCING_BUY       = 350;
const CHICKEN_BUY       = 80;
const COW_BUY           = 300;
const SEED_NAMES        = ['MAIZE', 'BEANS', 'SORGHUM', 'CASSAVA', 'G.NUTS'];

// ---- Fluctuating prices (recalculated each game day) ----
let SEED_PRICES   = [...BASE_SEED_PRICES];
let CROP_PRICES   = [...BASE_CROP_PRICES];
let LOOT_PRICES   = { ...BASE_LOOT_PRICES };
let PRODUCT_PRICES = { ...BASE_PRODUCT_PRICES };
let lastPriceDay  = -1;  // track which game day prices were last set

function fluctuatePrices() {
  // Each price gets a random multiplier between 0.7 and 1.4
  for (let i = 0; i < BASE_SEED_PRICES.length; i++) {
    SEED_PRICES[i] = Math.round(BASE_SEED_PRICES[i] * (0.7 + Math.random() * 0.7));
  }
  for (let i = 0; i < BASE_CROP_PRICES.length; i++) {
    CROP_PRICES[i] = Math.round(BASE_CROP_PRICES[i] * (0.7 + Math.random() * 0.7));
  }
  for (const key of Object.keys(BASE_LOOT_PRICES)) {
    LOOT_PRICES[key] = Math.round(BASE_LOOT_PRICES[key] * (0.7 + Math.random() * 0.7));
  }
  for (const key of Object.keys(BASE_PRODUCT_PRICES)) {
    PRODUCT_PRICES[key] = Math.round(BASE_PRODUCT_PRICES[key] * (0.7 + Math.random() * 0.7));
  }
}

// Called each frame from app.js — checks if a new game day started
function updatePriceFluctuation() {
  if (typeof DAY_DURATION === 'undefined') return;
  const currentDay = Math.floor(farmRealTime / DAY_DURATION);
  if (currentDay !== lastPriceDay) {
    lastPriceDay = currentDay;
    fluctuatePrices();
  }
}

let shopOpen   = false;
let marketOpen = false;

// ============================================================
// Render shop content
// ============================================================
function renderShop() {
  const moneyEl = document.getElementById('shop-money');
  if (moneyEl) moneyEl.textContent = playerMoney;

  // Seeds
  const seedsEl = document.getElementById('shop-seeds');
  if (seedsEl) {
    seedsEl.innerHTML = '';
    SEED_NAMES.forEach((name, i) => {
      seedsEl.innerHTML += `
        <div class="trade-row">
          <span class="trade-item">${name}</span>
          <span class="trade-price">TSh ${SEED_PRICES[i]}</span>
          <span class="trade-own">Own: ${seedInventory[i]}</span>
          <button class="trade-btn" onclick="buySeeds(${i})">BUY x5</button>
        </div>`;
    });
  }

  // Tools
  const toolsEl = document.getElementById('shop-tools');
  if (toolsEl) {
    const tools = [
      { key: 'hoe',         name: 'JEMBE (Hoe)',       price: TOOL_PRICES.hoe },
      { key: 'wateringCan', name: 'NDOO (Water Can)',   price: TOOL_PRICES.wateringCan },
      { key: 'machete',     name: 'PANGA (Machete)',    price: TOOL_PRICES.machete },
      { key: 'axe',         name: 'SHOKA (Axe)',        price: TOOL_PRICES.axe },
    ];
    toolsEl.innerHTML = '';
    tools.forEach(t => {
      const owned = ownedTools[t.key];
      toolsEl.innerHTML += `
        <div class="trade-row">
          <span class="trade-item">${t.name}</span>
          <span class="trade-price">TSh ${t.price}</span>
          <span class="trade-own">${owned ? 'OWNED' : ''}</span>
          <button class="trade-btn" onclick="buyTool('${t.key}')" ${owned ? 'disabled' : ''}>
            ${owned ? 'OWNED' : 'BUY'}
          </button>
        </div>`;
    });
  }

  // Supplies (fertilizer + feed + fencing)
  const suppliesEl = document.getElementById('shop-supplies');
  if (suppliesEl) {
    let html = `
      <div class="trade-row">
        <span class="trade-item">MBOLEA (Fertilizer)</span>
        <span class="trade-price">TSh ${FERTILIZER_BUY}</span>
        <span class="trade-own">Own: ${fertilizerCount}</span>
        <button class="trade-btn" onclick="buyFertilizer()">BUY x1</button>
      </div>
      <div class="trade-row">
        <span class="trade-item">CHAKULA (Animal Feed)</span>
        <span class="trade-price">TSh ${FEED_BUY}</span>
        <span class="trade-own">Own: ${animalFeedCount}</span>
        <button class="trade-btn" onclick="buyFeed()">BUY x5</button>
      </div>
      <div class="trade-row">
        <span class="trade-item">UZIO (Fencing)</span>
        <span class="trade-price">TSh ${FENCING_BUY}</span>
        <span class="trade-own">${fencingOwned ? 'BUILT' : ''}</span>
        <button class="trade-btn" onclick="buyFencing()" ${fencingOwned ? 'disabled' : ''}>
          ${fencingOwned ? 'BUILT' : 'BUY'}
        </button>
      </div>`;
    suppliesEl.innerHTML = html;
  }

  // Animals
  const animalsEl = document.getElementById('shop-animals');
  if (animalsEl) {
    animalsEl.innerHTML = `
      <div class="trade-row">
        <span class="trade-item">KUKU (Chicken)</span>
        <span class="trade-price">TSh ${CHICKEN_BUY}</span>
        <span class="trade-own">Own: ${ownedChickens}</span>
        <button class="trade-btn" onclick="buyChicken()">BUY x1</button>
      </div>
      <div class="trade-row">
        <span class="trade-item">NG'OMBE (Cow)</span>
        <span class="trade-price">TSh ${COW_BUY}</span>
        <span class="trade-own">Own: ${ownedCows}</span>
        <button class="trade-btn" onclick="buyCow()">BUY x1</button>
      </div>`;
  }

  // Land plots (Phase 7A) — rendered from land.js
  if (typeof renderShopLand === 'function') renderShopLand();
  // Upgrades (Phase 7B) — rendered from upgrades.js
  if (typeof renderShopUpgrades === 'function') renderShopUpgrades();
}

// ============================================================
// Render market content
// ============================================================
function renderMarket() {
  const moneyEl = document.getElementById('market-money');
  if (moneyEl) moneyEl.textContent = playerMoney;

  // Price fluctuation notice + barn bonus
  const noticeEl = document.getElementById('market-notice');
  if (noticeEl) {
    const hasBarn = typeof getSellMultiplier === 'function' && getSellMultiplier() > 1;
    noticeEl.textContent = hasBarn
      ? 'Prices change daily! Ghala bonus: +15%'
      : 'Prices change daily!';
  }

  // Crops
  const cropsEl = document.getElementById('market-crops');
  if (cropsEl) {
    cropsEl.innerHTML = '';
    SEED_NAMES.forEach((name, i) => {
      cropsEl.innerHTML += `
        <div class="trade-row">
          <span class="trade-item">${name}</span>
          <span class="trade-price">TSh ${CROP_PRICES[i]} ea</span>
          <span class="trade-own">Have: ${cropInventory[i]}</span>
          <button class="trade-btn" onclick="sellCrop(${i})" ${cropInventory[i] <= 0 ? 'disabled' : ''}>
            SELL ALL
          </button>
        </div>`;
    });
  }

  // Animal products
  const productsEl = document.getElementById('market-products');
  if (productsEl) {
    productsEl.innerHTML = `
      <div class="trade-row">
        <span class="trade-item">MAYAI (Eggs)</span>
        <span class="trade-price">TSh ${PRODUCT_PRICES.eggs} ea</span>
        <span class="trade-own">Have: ${animalProducts.eggs}</span>
        <button class="trade-btn" onclick="sellProduct('eggs')" ${animalProducts.eggs <= 0 ? 'disabled' : ''}>
          SELL ALL
        </button>
      </div>
      <div class="trade-row">
        <span class="trade-item">MAZIWA (Milk)</span>
        <span class="trade-price">TSh ${PRODUCT_PRICES.milk} ea</span>
        <span class="trade-own">Have: ${animalProducts.milk}</span>
        <button class="trade-btn" onclick="sellProduct('milk')" ${animalProducts.milk <= 0 ? 'disabled' : ''}>
          SELL ALL
        </button>
      </div>`;
  }

  // Hunting loot
  const lootEl = document.getElementById('market-loot');
  if (lootEl) {
    const items = [
      { key: 'meat',     name: 'MEAT',     price: LOOT_PRICES.meat },
      { key: 'hide',     name: 'HIDE',     price: LOOT_PRICES.hide },
      { key: 'feathers', name: 'FEATHERS', price: LOOT_PRICES.feathers },
    ];
    lootEl.innerHTML = '';
    items.forEach(l => {
      lootEl.innerHTML += `
        <div class="trade-row">
          <span class="trade-item">${l.name}</span>
          <span class="trade-price">TSh ${l.price} ea</span>
          <span class="trade-own">Have: ${inventory[l.key]}</span>
          <button class="trade-btn" onclick="sellLoot('${l.key}')" ${inventory[l.key] <= 0 ? 'disabled' : ''}>
            SELL ALL
          </button>
        </div>`;
    });
  }
}

// ============================================================
// Buy functions
// ============================================================
function buySeeds(idx) {
  const cost = SEED_PRICES[idx] * 5;
  if (playerMoney < cost) return;
  playerMoney -= cost;
  seedInventory[idx] += 5;
  renderShop();
  updateMoneyHUD();
  updateSeedHUD();
}

function buyTool(key) {
  if (ownedTools[key]) return;
  if (playerMoney < TOOL_PRICES[key]) return;
  playerMoney -= TOOL_PRICES[key];
  ownedTools[key] = true;
  renderShop();
  updateMoneyHUD();
}

function buyFertilizer() {
  if (playerMoney < FERTILIZER_BUY) return;
  playerMoney -= FERTILIZER_BUY;
  fertilizerCount++;
  renderShop();
  updateMoneyHUD();
}

function buyFeed() {
  const cost = FEED_BUY * 5;
  if (playerMoney < cost) return;
  playerMoney -= cost;
  animalFeedCount += 5;
  renderShop();
  updateMoneyHUD();
}

function buyFencing() {
  if (fencingOwned) return;
  if (playerMoney < FENCING_BUY) return;
  playerMoney -= FENCING_BUY;
  fencingOwned = true;
  buildFence();
  renderShop();
  updateMoneyHUD();
}

function buyChicken() {
  if (playerMoney < CHICKEN_BUY) return;
  playerMoney -= CHICKEN_BUY;
  ownedChickens++;
  // Spawn a new chicken inside the pen
  const cx = -30 + (Math.random() - 0.5) * 10;
  const cz = -2 + (Math.random() - 0.5) * 8;
  createChicken(cx, cz);
  renderShop();
  updateMoneyHUD();
}

function buyCow() {
  if (playerMoney < COW_BUY) return;
  playerMoney -= COW_BUY;
  ownedCows++;
  // Spawn a new cow inside the pen
  const cx = -30 + (Math.random() - 0.5) * 10;
  const cz = -2 + (Math.random() - 0.5) * 8;
  createCow(cx, cz);
  renderShop();
  updateMoneyHUD();
}

// ============================================================
// Sell functions
// ============================================================
function sellCrop(idx) {
  if (cropInventory[idx] <= 0) return;
  const qty = cropInventory[idx];
  const mult = typeof getSellMultiplier === 'function' ? getSellMultiplier() : 1;
  playerMoney += Math.round(qty * CROP_PRICES[idx] * mult);
  cropInventory[idx] = 0;
  if (typeof onCropSold === 'function') onCropSold(idx, qty);
  renderMarket();
  updateMoneyHUD();
}

function sellProduct(key) {
  if (animalProducts[key] <= 0) return;
  const mult = typeof getSellMultiplier === 'function' ? getSellMultiplier() : 1;
  playerMoney += Math.round(animalProducts[key] * PRODUCT_PRICES[key] * mult);
  animalProducts[key] = 0;
  renderMarket();
  updateMoneyHUD();
}

function sellLoot(key) {
  if (inventory[key] <= 0) return;
  const qty = inventory[key];
  const mult = typeof getSellMultiplier === 'function' ? getSellMultiplier() : 1;
  playerMoney += Math.round(qty * LOOT_PRICES[key] * mult);
  inventory[key] = 0;
  if (typeof onLootSold === 'function') onLootSold(qty);
  renderMarket();
  updateMoneyHUD();
  updateInventoryHUD();
}

// ============================================================
// Fencing — build visible fence around animal pen
// ============================================================
const fencePosts = [];

// Fence pen bounds (south-west of the house at -18,12)
const FENCE_X = -36, FENCE_Z = -8, FENCE_W = 18, FENCE_D = 14;

// Gate opening on the east wall (closest to house) — 3m wide centered
const GATE_CENTER_Z = FENCE_Z + FENCE_D / 2;  // middle of east wall
const GATE_HALF = 1.8;  // half-width of gate opening
const GATE_Z1 = GATE_CENTER_Z - GATE_HALF;
const GATE_Z2 = GATE_CENTER_Z + GATE_HALF;

// ---- Feed troughs ----
const feedTroughs = [];
let troughFillLevel = 0;   // 0–1, visual fill
const TROUGH_MAX_FEED = 10; // how many feed units a full trough holds
let troughFeedStored = 0;   // actual feed units in the trough
const FEED_DEPLETE_RATE = 1 / 60; // deplete 1 unit per 60 real seconds

function buildFeedTroughs() {
  // Two big wooden troughs inside the pen
  const troughPositions = [
    { x: FENCE_X + 5,  z: FENCE_Z + 4 },   // left trough (chicken side)
    { x: FENCE_X + 13, z: FENCE_Z + 10 },   // right trough (cow side)
  ];

  const woodMat = new THREE.MeshLambertMaterial({ color: 0x6b4a1a });
  const feedMat = new THREE.MeshLambertMaterial({ color: 0xc8a840 }); // grain color

  for (const tp of troughPositions) {
    const g = new THREE.Group();
    const py = groundAt(tp.x, tp.z);

    // Outer trough (open-top box)
    // Bottom
    const bottom = new THREE.Mesh(
      new THREE.BoxGeometry(1.8, 0.06, 0.8), woodMat
    );
    bottom.position.y = 0.3;
    g.add(bottom);

    // 4 walls
    const wallFront = new THREE.Mesh(new THREE.BoxGeometry(1.8, 0.35, 0.06), woodMat);
    wallFront.position.set(0, 0.48, 0.37);
    g.add(wallFront);
    const wallBack = new THREE.Mesh(new THREE.BoxGeometry(1.8, 0.35, 0.06), woodMat);
    wallBack.position.set(0, 0.48, -0.37);
    g.add(wallBack);
    const wallLeft = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.35, 0.8), woodMat);
    wallLeft.position.set(-0.87, 0.48, 0);
    g.add(wallLeft);
    const wallRight = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.35, 0.8), woodMat);
    wallRight.position.set(0.87, 0.48, 0);
    g.add(wallRight);

    // 4 stubby legs
    for (const [lx, lz] of [[-0.7, -0.3], [-0.7, 0.3], [0.7, -0.3], [0.7, 0.3]]) {
      const leg = new THREE.Mesh(
        new THREE.CylinderGeometry(0.04, 0.05, 0.3, 5), woodMat
      );
      leg.position.set(lx, 0.15, lz);
      g.add(leg);
    }

    // Feed fill (scales with fill level)
    const fill = new THREE.Mesh(
      new THREE.BoxGeometry(1.68, 0.25, 0.68), feedMat
    );
    fill.position.y = 0.45;
    fill.scale.y = 0;  // starts empty visually
    fill.visible = false;
    g.add(fill);

    g.position.set(tp.x, py, tp.z);
    scene.add(g);

    feedTroughs.push({ group: g, fillMesh: fill, x: tp.x, z: tp.z });
  }
}

// Update trough visuals based on stored feed
function updateTroughVisuals() {
  const fillFrac = troughFeedStored / TROUGH_MAX_FEED;
  for (const t of feedTroughs) {
    t.fillMesh.visible = fillFrac > 0.01;
    t.fillMesh.scale.y = Math.max(0.05, fillFrac);
    // Color shifts from golden (full) to brown (low)
    const r = 0.78 - fillFrac * 0.1;
    const g = 0.66 * fillFrac + 0.3 * (1 - fillFrac);
    const b = 0.15;
    t.fillMesh.material.color.setRGB(r, g, b);
  }
}

// Called each frame from app.js
function updateFeedTroughs(dt) {
  if (feedTroughs.length === 0) return;

  // Deplete feed over time (animals eating)
  if (troughFeedStored > 0 && (ownedChickens > 0 || ownedCows > 0)) {
    const totalAnimals = ownedChickens + ownedCows;
    troughFeedStored -= FEED_DEPLETE_RATE * totalAnimals * dt;
    if (troughFeedStored < 0) troughFeedStored = 0;
  }

  updateTroughVisuals();
}

function buildFence() {
  if (fencePosts.length > 0) return; // already built
  const postSpacing = 2.5;
  const postMat = new THREE.MeshLambertMaterial({ color: 0x6b4a1a });
  const railMat = new THREE.MeshLambertMaterial({ color: 0x8b6a3a });

  const corners = [
    [FENCE_X, FENCE_Z],
    [FENCE_X + FENCE_W, FENCE_Z],
    [FENCE_X + FENCE_W, FENCE_Z + FENCE_D],
    [FENCE_X, FENCE_Z + FENCE_D],
  ];

  for (let side = 0; side < 4; side++) {
    const [x1, z1] = corners[side];
    const [x2, z2] = corners[(side + 1) % 4];
    const dx = x2 - x1;
    const dz = z2 - z1;
    const len = Math.sqrt(dx * dx + dz * dz);
    const steps = Math.ceil(len / postSpacing);

    for (let i = 0; i <= steps; i++) {
      const t = i / steps;
      const px = x1 + dx * t;
      const pz = z1 + dz * t;

      // Skip posts & rails inside the gate gap (east wall = side 1)
      if (side === 1) {
        if (pz >= GATE_Z1 && pz <= GATE_Z2) continue;
      }

      const py = groundAt(px, pz);

      // Post
      const post = new THREE.Mesh(
        new THREE.CylinderGeometry(0.04, 0.06, 1.2, 5),
        postMat
      );
      post.position.set(px, py + 0.6, pz);
      post.castShadow = true;
      scene.add(post);
      fencePosts.push(post);

      // Horizontal rails between posts
      if (i < steps) {
        const nt = (i + 1) / steps;
        const nx = x1 + dx * nt;
        const nz = z1 + dz * nt;

        // Skip rail segments that cross the gate
        if (side === 1) {
          const segMinZ = Math.min(pz, nz);
          const segMaxZ = Math.max(pz, nz);
          if (segMaxZ >= GATE_Z1 && segMinZ <= GATE_Z2) continue;
        }

        const ny = groundAt(nx, nz);
        const midX = (px + nx) / 2;
        const midZ = (pz + nz) / 2;
        const midY = (py + ny) / 2;
        const segLen = Math.sqrt((nx - px) ** 2 + (nz - pz) ** 2);
        const angle = Math.atan2(nz - pz, nx - px);

        for (const rh of [0.4, 0.8]) {
          const rail = new THREE.Mesh(
            new THREE.BoxGeometry(segLen, 0.04, 0.04),
            railMat
          );
          rail.position.set(midX, midY + rh, midZ);
          rail.rotation.y = -angle;
          scene.add(rail);
          fencePosts.push(rail);
        }
      }
    }
  }

  // Gate posts (thicker, mark the entrance)
  const gatePostMat = new THREE.MeshLambertMaterial({ color: 0x5a3a10 });
  for (const gz of [GATE_Z1, GATE_Z2]) {
    const gx = FENCE_X + FENCE_W;
    const gy = groundAt(gx, gz);
    const gp = new THREE.Mesh(
      new THREE.CylinderGeometry(0.08, 0.10, 1.5, 6),
      gatePostMat
    );
    gp.position.set(gx, gy + 0.75, gz);
    gp.castShadow = true;
    scene.add(gp);
    fencePosts.push(gp);
  }

  // Colliders — east wall split into two segments around the gate
  const T = 0.3;
  worldColliders.push({ x1: FENCE_X - T, x2: FENCE_X,          z1: FENCE_Z, z2: FENCE_Z + FENCE_D, name: 'fence-w' });
  // East wall: south segment (up to gate)
  worldColliders.push({ x1: FENCE_X + FENCE_W, x2: FENCE_X + FENCE_W + T, z1: FENCE_Z, z2: GATE_Z1, name: 'fence-e-s' });
  // East wall: north segment (after gate)
  worldColliders.push({ x1: FENCE_X + FENCE_W, x2: FENCE_X + FENCE_W + T, z1: GATE_Z2, z2: FENCE_Z + FENCE_D, name: 'fence-e-n' });
  worldColliders.push({ x1: FENCE_X, x2: FENCE_X + FENCE_W,   z1: FENCE_Z - T, z2: FENCE_Z,          name: 'fence-s' });
  worldColliders.push({ x1: FENCE_X, x2: FENCE_X + FENCE_W,   z1: FENCE_Z + FENCE_D, z2: FENCE_Z + FENCE_D + T, name: 'fence-n' });

  // Build feed troughs inside the pen
  buildFeedTroughs();
}

// ============================================================
// Open / Close
// ============================================================
function openShop() {
  shopOpen = true;
  document.exitPointerLock();
  document.getElementById('shop-overlay').classList.remove('hidden');
  renderShop();
}

function closeShop() {
  shopOpen = false;
  document.getElementById('shop-overlay').classList.add('hidden');
  container.requestPointerLock();
}

function openMarket() {
  marketOpen = true;
  document.exitPointerLock();
  document.getElementById('market-overlay').classList.remove('hidden');
  renderMarket();
}

function closeMarket() {
  marketOpen = false;
  document.getElementById('market-overlay').classList.add('hidden');
  container.requestPointerLock();
}

// ============================================================
// Money HUD (top-left, always visible)
// ============================================================
function updateMoneyHUD() {
  const el = document.getElementById('money-amount');
  if (el) el.textContent = playerMoney;
}

// ============================================================
// Inventory panel (toggle with I key)
// ============================================================
function toggleInventoryPanel() {
  const el = document.getElementById('inv-panel');
  if (!el) return;
  const vis = el.style.display !== 'block';
  el.style.display = vis ? 'block' : 'none';
  if (vis) renderInventoryPanel();
}

function renderInventoryPanel() {
  const el = document.getElementById('inv-panel-body');
  if (!el) return;
  let html = '<div class="inv-section"><span class="inv-title">SEEDS</span>';
  SEED_NAMES.forEach((n, i) => {
    html += `<span>${n}: ${seedInventory[i]}</span>`;
  });
  html += '</div><div class="inv-section"><span class="inv-title">CROPS (sell at Soko)</span>';
  SEED_NAMES.forEach((n, i) => {
    html += `<span>${n}: ${cropInventory[i]}</span>`;
  });
  html += '</div><div class="inv-section"><span class="inv-title">ANIMAL PRODUCTS</span>';
  html += `<span>Eggs: ${animalProducts.eggs}</span>`;
  html += `<span>Milk: ${animalProducts.milk}</span>`;
  html += '</div><div class="inv-section"><span class="inv-title">ANIMALS</span>';
  html += `<span>Chickens: ${ownedChickens}</span>`;
  html += `<span>Cows: ${ownedCows}</span>`;
  html += `<span>Feed: ${animalFeedCount}</span>`;
  html += `<span>Fencing: ${fencingOwned ? 'Built' : 'None'}</span>`;
  html += '</div><div class="inv-section"><span class="inv-title">TOOLS</span>';
  if (ownedTools.hoe) html += '<span>Jembe (Hoe)</span>';
  if (ownedTools.wateringCan) html += '<span>Ndoo (Water Can)</span>';
  if (ownedTools.machete) html += '<span>Panga (Machete)</span>';
  if (ownedTools.axe) html += '<span>Shoka (Axe)</span>';
  html += `<span>Mbolea: ${fertilizerCount}</span>`;
  html += '</div><div class="inv-section"><span class="inv-title">HUNTING LOOT</span>';
  html += `<span>Meat: ${inventory.meat}</span>`;
  html += `<span>Hide: ${inventory.hide}</span>`;
  html += `<span>Feathers: ${inventory.feathers}</span>`;
  // Land plots
  if (typeof LAND_PLOTS !== 'undefined') {
    html += '</div><div class="inv-section"><span class="inv-title">LAND</span>';
    html += '<span>Home Plot (10x8)</span>';
    for (const p of LAND_PLOTS) {
      if (ownedPlots[p.id]) html += `<span>${p.name} (${p.cols}x${p.rows})</span>`;
    }
  }
  // Upgrades
  if (typeof UPGRADES !== 'undefined') {
    html += '</div><div class="inv-section"><span class="inv-title">UPGRADES</span>';
    for (const [k, u] of Object.entries(UPGRADES)) {
      if (u.built) html += `<span>${u.name}</span>`;
    }
    if (!Object.values(UPGRADES).some(u => u.built)) html += '<span>None yet</span>';
  }
  html += '</div>';
  el.innerHTML = html;
}

// ============================================================
// Game reset
// ============================================================
function resetGame() {
  if (!confirm('Reset all progress? This cannot be undone!')) return;
  localStorage.removeItem(SAVE_KEY);
  location.reload();
}
