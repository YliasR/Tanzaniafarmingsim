// ============================================================
// Save / Load — Phase 6 expanded
// ============================================================

const SAVE_KEY     = 'farmsim_save_v2';
const SAVE_VERSION = 2;

// ---- Global economy state ----
let playerMoney = 500;   // starting balance (TSh)

// ============================================================
// Save
// ============================================================
function saveGame() {
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
    version:       SAVE_VERSION,
    savedAt:       Date.now(),
    farmRealTime,
    money:         playerMoney,
    huntLoot:      { ...inventory },
    seedInventory: [...seedInventory],
    cropInventory: [...cropInventory],
    ownedTools:    { ...ownedTools },
    fertilizer:    fertilizerCount,
    cells,
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
  }
  fertilizerCount = data.fertilizer ?? 0;

  // Restore planted cells
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
