// ============================================================
// Wandering Trader — patrols the road between Duka and Soko,
// offers rotating daily deals. (Nice-to-Have: passing traders)
// Loaded after app.js; hooks in by wrapping global functions.
// ============================================================

let traderOpen = false;

// ---- The trader NPC (createNPC comes from scene.js, joins npc sway loop) ----
const traderNPC = createNPC({
  x: 20, z: -8,
  facing: Math.PI / 2,
  skinColor: 0x6b3a1a,
  shirtColor: 0x7a3aaa,   // purple kanzu — stands out from villagers
  pantsColor: 0x2a2a2a,
  hatColor: 0xddc070,     // straw hat
  role: 'trader',
});

// Patrol waypoints along the dirt road between shop (10,-6) and market (55,-10)
const TRADER_PATH = [
  { x: 16, z: -8 },
  { x: 28, z: -9 },
  { x: 40, z: -10 },
  { x: 50, z: -10 },
];
let _tpIndex = 0;
let _tpDir = 1;
let _tpPause = 2;
const TRADER_SPEED = 1.1;

// Own animation loop so no app.js edits are needed
let _tLast = performance.now();
(function traderWalk() {
  requestAnimationFrame(traderWalk);
  const now = performance.now();
  const dt = Math.min((now - _tLast) / 1000, 0.05);
  _tLast = now;
  if (typeof gamePaused !== 'undefined' && gamePaused) return;
  if (traderOpen) return; // stands still while trading

  const m = traderNPC.mesh;
  if (_tpPause > 0) { _tpPause -= dt; return; }

  const target = TRADER_PATH[_tpIndex];
  const dx = target.x - m.position.x;
  const dz = target.z - m.position.z;
  const dist = Math.sqrt(dx * dx + dz * dz);

  if (dist < 0.2) {
    // Reached waypoint — reverse at the ends, pause briefly
    if (_tpIndex === TRADER_PATH.length - 1) _tpDir = -1;
    if (_tpIndex === 0 && _tpDir === -1) _tpDir = 1;
    _tpIndex = Math.max(0, Math.min(TRADER_PATH.length - 1, _tpIndex + _tpDir));
    _tpPause = 1.5 + Math.random() * 3;
    return;
  }

  const step = Math.min(dist, TRADER_SPEED * dt);
  m.position.x += (dx / dist) * step;
  m.position.z += (dz / dist) * step;
  const targetYaw = Math.atan2(dx, dz);
  m.rotation.y += (targetYaw - m.rotation.y) * Math.min(1, dt * 5);

  // Keep the npc sway loop's ground reference in sync while he walks
  traderNPC.baseY = groundAt(m.position.x, m.position.z);
})();

// ---- Daily deals (seeded by game day — same offers all day) ----
function _mulberry32(seed) {
  return function () {
    seed |= 0; seed = (seed + 0x6D2B79F5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function getTraderDeals() {
  const day = Math.floor(farmRealTime / DAY_DURATION);
  const rng = _mulberry32(day * 7919 + 13);
  const buySeed  = Math.floor(rng() * SEED_NAMES.length);   // discounted seeds
  const sellCropIdx = Math.floor(rng() * SEED_NAMES.length); // premium crop buy-out
  const buyDiscount = 0.5 + rng() * 0.15;   // pays 50–65% of market seed price
  const sellPremium = 1.45 + rng() * 0.35;  // pays 145–180% of market crop price
  return {
    day,
    buySeed,
    buySeedPrice: Math.max(5, Math.round(SEED_PRICES[buySeed] * 5 * buyDiscount)),
    sellCropIdx,
    sellCropPrice: Math.round(CROP_PRICES[sellCropIdx] * sellPremium),
  };
}

// ---- Trade actions (referenced from the overlay's onclick) ----
function traderBuySeeds() {
  const deal = getTraderDeals();
  if (playerMoney < deal.buySeedPrice) return;
  playerMoney -= deal.buySeedPrice;
  seedInventory[deal.buySeed] += 5;
  gameStats.traderTrades++;
  if (typeof updateMoneyHUD === 'function') updateMoneyHUD();
  if (typeof updateSeedHUD === 'function') updateSeedHUD();
  if (typeof sfxBuy === 'function') sfxBuy();
  renderTrader();
}

function traderSellCrop() {
  const deal = getTraderDeals();
  const qty = cropInventory[deal.sellCropIdx];
  if (qty <= 0) return;
  const earned = qty * deal.sellCropPrice;
  playerMoney += earned;
  cropInventory[deal.sellCropIdx] = 0;
  gameStats.traderTrades++;
  gameStats.totalEarned += earned;
  gameStats.itemsSold += qty;
  if (typeof onCropSold === 'function') onCropSold(deal.sellCropIdx, qty);
  if (typeof updateMoneyHUD === 'function') updateMoneyHUD();
  if (typeof sfxSell === 'function') sfxSell();
  renderTrader();
}

// ---- Overlay ----
function renderTrader() {
  const moneyEl = document.getElementById('trader-money');
  if (moneyEl) moneyEl.textContent = playerMoney;

  const deal = getTraderDeals();
  const body = document.getElementById('trader-deals');
  if (!body) return;

  const haveCrops = cropInventory[deal.sellCropIdx] || 0;
  body.innerHTML =
    '<div class="trade-row">' +
      '<span class="trade-item">' + SEED_NAMES[deal.buySeed] + ' SEEDS x5<br><small>trader discount!</small></span>' +
      '<span class="trade-price">TSh ' + deal.buySeedPrice + '</span>' +
      '<span class="trade-own">Own: ' + seedInventory[deal.buySeed] + '</span>' +
      '<button class="trade-btn" onclick="traderBuySeeds()" ' + (playerMoney < deal.buySeedPrice ? 'disabled' : '') + '>BUY</button>' +
    '</div>' +
    '<div class="trade-row">' +
      '<span class="trade-item">WANTED: ' + SEED_NAMES[deal.sellCropIdx] + '<br><small>pays over market rate</small></span>' +
      '<span class="trade-price">TSh ' + deal.sellCropPrice + ' ea</span>' +
      '<span class="trade-own">Have: ' + haveCrops + '</span>' +
      '<button class="trade-btn" onclick="traderSellCrop()" ' + (haveCrops <= 0 ? 'disabled' : '') + '>SELL ALL</button>' +
    '</div>';
}

function openTrader() {
  traderOpen = true;
  document.exitPointerLock();
  document.getElementById('trader-overlay').classList.remove('hidden');
  renderTrader();
}

function closeTrader() {
  traderOpen = false;
  document.getElementById('trader-overlay').classList.add('hidden');
  container.requestPointerLock();
}

function _playerNearTrader() {
  const m = traderNPC.mesh;
  const dx = player.pos.x - m.position.x;
  const dz = player.pos.z - m.position.z;
  return Math.sqrt(dx * dx + dz * dz) < 4.0;
}

// [E] interaction — runs alongside app.js's handler; the trader patrols the
// road far from the shop/market/house trigger zones so they never overlap.
window.addEventListener('keydown', e => {
  if (e.code !== 'KeyE') return;
  if (!document.getElementById('menu-overlay').classList.contains('hidden')) return;
  if (typeof gamePaused !== 'undefined' && gamePaused) return;
  if (traderOpen) { closeTrader(); return; }
  if (typeof shopOpen !== 'undefined' && (shopOpen || marketOpen)) return;
  if (typeof questDialogOpen !== 'undefined' && questDialogOpen) return;
  if (_playerNearTrader()) openTrader();
});

// Tooltip — piggyback on app.js's interaction tips
(function hookTips() {
  const orig = updateInteractionTips;
  updateInteractionTips = function () {
    orig();
    if (traderOpen) return;
    if (typeof shopOpen !== 'undefined' && (shopOpen || marketOpen)) return;
    const tipEl = document.getElementById('farm-tooltip');
    if (tipEl && tipEl.style.display === 'none' && _playerNearTrader()) {
      tipEl.textContent = '[E] Trade with Mfanyabiashara';
      tipEl.style.display = 'block';
    }
  };
})();
