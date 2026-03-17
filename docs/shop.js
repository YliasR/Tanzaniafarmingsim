// ============================================================
// Shop & Market — Phase 6
// ============================================================

// ---- Prices ----
const SEED_PRICES    = [20, 25, 15, 30, 35];
const CROP_PRICES    = [50, 60, 40, 70, 80];
const TOOL_PRICES    = { hoe: 100, wateringCan: 120 };
const FERTILIZER_BUY = 40;
const LOOT_PRICES    = { meat: 35, hide: 45, feathers: 25 };
const SEED_NAMES     = ['MAIZE', 'BEANS', 'SORGHUM', 'CASSAVA', 'G.NUTS'];

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
      { key: 'hoe',         name: 'JEMBE (Hoe)',      price: TOOL_PRICES.hoe },
      { key: 'wateringCan', name: 'NDOO (Water Can)',  price: TOOL_PRICES.wateringCan },
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

  // Fertilizer
  const suppliesEl = document.getElementById('shop-supplies');
  if (suppliesEl) {
    suppliesEl.innerHTML = `
      <div class="trade-row">
        <span class="trade-item">MBOLEA (Fertilizer)</span>
        <span class="trade-price">TSh ${FERTILIZER_BUY}</span>
        <span class="trade-own">Own: ${fertilizerCount}</span>
        <button class="trade-btn" onclick="buyFertilizer()">BUY x1</button>
      </div>`;
  }
}

// ============================================================
// Render market content
// ============================================================
function renderMarket() {
  const moneyEl = document.getElementById('market-money');
  if (moneyEl) moneyEl.textContent = playerMoney;

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

// ============================================================
// Sell functions
// ============================================================
function sellCrop(idx) {
  if (cropInventory[idx] <= 0) return;
  playerMoney += cropInventory[idx] * CROP_PRICES[idx];
  cropInventory[idx] = 0;
  renderMarket();
  updateMoneyHUD();
}

function sellLoot(key) {
  if (inventory[key] <= 0) return;
  playerMoney += inventory[key] * LOOT_PRICES[key];
  inventory[key] = 0;
  renderMarket();
  updateMoneyHUD();
  updateInventoryHUD();
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
  html += '</div><div class="inv-section"><span class="inv-title">TOOLS</span>';
  if (ownedTools.hoe) html += '<span>Jembe (Hoe)</span>';
  if (ownedTools.wateringCan) html += '<span>Ndoo (Water Can)</span>';
  html += `<span>Mbolea: ${fertilizerCount}</span>`;
  html += '</div><div class="inv-section"><span class="inv-title">HUNTING LOOT</span>';
  html += `<span>Meat: ${inventory.meat}</span>`;
  html += `<span>Hide: ${inventory.hide}</span>`;
  html += `<span>Feathers: ${inventory.feathers}</span>`;
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
