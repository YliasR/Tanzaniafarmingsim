// ============================================================
// Save / Load — v4 (land plots + upgrades)
// ============================================================

const SAVE_KEY     = 'farmsim_save_v4';
const SAVE_VERSION = 4;

// ---- Global economy state ----
let playerMoney = 500;   // starting balance (TSh)

// ============================================================
// Save
// ============================================================
function saveGame() {
  // Save all farmCells (original + expansion), recording their global index
  const cells = [];
  farmCells.forEach((c, idx) => {
    if (c.stage >= 0) {
      cells.push({
        idx, seedType: c.seedType, stage: c.stage,
        nextStageAt: c.nextStageAt, watered: c.watered,
      });
    }
  });

  const data = {
    version:        SAVE_VERSION,
    savedAt:        Date.now(),
    farmRealTime,
    money:          playerMoney,
    huntLoot:       { ...inventory },
    seedInventory:  [...seedInventory],
    cropInventory:  [...cropInventory],
    ownedTools:     { ...ownedTools },
    fertilizer:     fertilizerCount,
    animalFeed:     animalFeedCount,
    fencing:        fencingOwned,
    ownedChickens,
    ownedCows,
    animalProducts: { ...animalProducts },
    eggCooldown,
    milkCooldown,
    troughFeedStored,
    lastPriceDay,
    seedPrices:     [...SEED_PRICES],
    cropPrices:     [...CROP_PRICES],
    lootPrices:     { ...LOOT_PRICES },
    productPrices:  { ...PRODUCT_PRICES },
    cells,
    // Phase 7A — land plots
    ownedPlots:     { ...ownedPlots },
    plotCellRanges: { ...plotCellRanges },
    // Phase 7B — upgrades
    upgrades: {
      storageBarn:  UPGRADES.storageBarn.built,
      waterPump:    UPGRADES.waterPump.built,
      solarPanel:   UPGRADES.solarPanel.built,
      sensorNode:   UPGRADES.sensorNode.built,
      houseUpgrade: UPGRADES.houseUpgrade.built,
    },
    // Quests
    quests: {
      completed:    typeof questCompleted !== 'undefined' ? [...questCompleted] : [],
      activeId:     typeof activeQuestId !== 'undefined' ? activeQuestId : null,
      progress:     typeof questProgress !== 'undefined' ? { ...questProgress } : {},
    },
  };

  try {
    localStorage.setItem(SAVE_KEY, JSON.stringify(data));
    _flashSaveIndicator();
  } catch (e) {
    console.warn('Save failed:', e);
  }
}

// ============================================================
// Load
// ============================================================
function loadGame() {
  const raw = localStorage.getItem(SAVE_KEY);
  if (!raw) return;

  let data;
  try { data = JSON.parse(raw); } catch (e) { return; }
  if (!data || data.version !== SAVE_VERSION) return;

  // Timing + money
  farmRealTime = data.farmRealTime || 0;
  playerMoney  = data.money ?? 500;

  // Hunting inventory
  if (data.huntLoot) {
    inventory.meat     = data.huntLoot.meat     || 0;
    inventory.hide     = data.huntLoot.hide     || 0;
    inventory.feathers = data.huntLoot.feathers || 0;
    updateInventoryHUD();
  }

  // Seed & crop inventories
  if (data.seedInventory) {
    for (let i = 0; i < seedInventory.length; i++) {
      seedInventory[i] = data.seedInventory[i] ?? 0;
    }
  }
  if (data.cropInventory) {
    for (let i = 0; i < cropInventory.length; i++) {
      cropInventory[i] = data.cropInventory[i] ?? 0;
    }
  }

  // Tools
  if (data.ownedTools) {
    ownedTools.hoe         = data.ownedTools.hoe ?? true;
    ownedTools.wateringCan = data.ownedTools.wateringCan ?? false;
    ownedTools.machete     = data.ownedTools.machete ?? false;
    ownedTools.axe         = data.ownedTools.axe ?? false;
  }
  fertilizerCount = data.fertilizer ?? 0;

  // Animal farming
  animalFeedCount = data.animalFeed ?? 0;
  fencingOwned    = data.fencing ?? false;
  ownedChickens   = data.ownedChickens ?? 5;
  ownedCows       = data.ownedCows ?? 4;

  if (data.animalProducts) {
    animalProducts.eggs = data.animalProducts.eggs ?? 0;
    animalProducts.milk = data.animalProducts.milk ?? 0;
  }
  eggCooldown  = data.eggCooldown ?? EGG_INTERVAL;
  milkCooldown = data.milkCooldown ?? MILK_INTERVAL;
  troughFeedStored = data.troughFeedStored ?? 0;

  // Price fluctuation state
  if (data.lastPriceDay != null) lastPriceDay = data.lastPriceDay;
  if (data.seedPrices) {
    for (let i = 0; i < SEED_PRICES.length; i++) {
      SEED_PRICES[i] = data.seedPrices[i] ?? BASE_SEED_PRICES[i];
    }
  }
  if (data.cropPrices) {
    for (let i = 0; i < CROP_PRICES.length; i++) {
      CROP_PRICES[i] = data.cropPrices[i] ?? BASE_CROP_PRICES[i];
    }
  }
  if (data.lootPrices) {
    for (const k of Object.keys(LOOT_PRICES)) {
      LOOT_PRICES[k] = data.lootPrices[k] ?? BASE_LOOT_PRICES[k];
    }
  }
  if (data.productPrices) {
    for (const k of Object.keys(PRODUCT_PRICES)) {
      PRODUCT_PRICES[k] = data.productPrices[k] ?? BASE_PRODUCT_PRICES[k];
    }
  }

  // Rebuild fencing + troughs if owned
  if (fencingOwned) {
    buildFence();
    if (typeof updateTroughVisuals === 'function') updateTroughVisuals();
  }

  // Spawn extra animals beyond defaults
  const defaultChickens = 5;
  const defaultCows = 4;
  for (let i = defaultChickens; i < ownedChickens; i++) {
    const cx = -30 + (Math.random() - 0.5) * 10;
    const cz = -2 + (Math.random() - 0.5) * 8;
    createChicken(cx, cz);
  }
  for (let i = defaultCows; i < ownedCows; i++) {
    const cx = -30 + (Math.random() - 0.5) * 10;
    const cz = -2 + (Math.random() - 0.5) * 8;
    createCow(cx, cz);
  }

  // ---- Phase 7A: Restore land plots ----
  if (data.ownedPlots) {
    // Rebuild plots in the right order so farmCells indices match
    for (const plot of LAND_PLOTS) {
      if (data.ownedPlots[plot.id]) {
        ownedPlots[plot.id] = true;
        addPlotCells(plot);
        rebuildOwnedPlot(plot.id);
      }
    }
    refreshSaleSigns();
  }

  // ---- Phase 7B: Restore upgrades ----
  if (data.upgrades) {
    UPGRADES.storageBarn.built  = data.upgrades.storageBarn ?? false;
    UPGRADES.waterPump.built    = data.upgrades.waterPump ?? false;
    UPGRADES.solarPanel.built   = data.upgrades.solarPanel ?? false;
    UPGRADES.sensorNode.built   = data.upgrades.sensorNode ?? false;
    UPGRADES.houseUpgrade.built = data.upgrades.houseUpgrade ?? false;
    rebuildUpgrades();
  }

  // ---- Quests ----
  if (data.quests) {
    if (typeof questCompleted !== 'undefined') {
      questCompleted.length = 0;
      (data.quests.completed || []).forEach(id => questCompleted.push(id));
      activeQuestId = data.quests.activeId || null;
      Object.assign(questProgress, data.quests.progress || {});
    }
  }

  // Restore planted cells (must be after land plots are added so indices exist)
  for (const saved of (data.cells || [])) {
    const cell = farmCells[saved.idx];
    if (!cell) continue;

    cell.seedType    = saved.seedType;
    cell.stage       = saved.stage;
    cell.nextStageAt = saved.nextStageAt;
    cell.watered     = saved.watered ?? false;

    if (cell.mesh) scene.remove(cell.mesh);
    cell.mesh = buildCropMesh(cell.seedType, cell.stage);
    cell.mesh.position.set(cell.cx, FARM_Y, cell.cz);
    scene.add(cell.mesh);
  }

  updateSeedHUD();
  if (typeof updateMoneyHUD === 'function') updateMoneyHUD();
}

// ============================================================
// Auto-save: every 30 s + on page hide/close
// ============================================================
setInterval(saveGame, 30_000);
window.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'hidden') saveGame();
});
window.addEventListener('beforeunload', saveGame);

// ---- Visual flash ----
function _flashSaveIndicator() {
  const el = document.getElementById('save-indicator');
  if (!el) return;
  el.classList.add('visible');
  clearTimeout(el._t);
  el._t = setTimeout(() => el.classList.remove('visible'), 2000);
}

// ---- Load on startup ----
loadGame();
