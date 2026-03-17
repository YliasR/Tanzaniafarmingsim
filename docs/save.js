// ============================================================
// Save / Load — persistent game data via localStorage
// Covers: farm state, money (Phase 6 placeholder), timestamps
// ============================================================

const SAVE_KEY     = 'farmsim_save_v1';
const SAVE_VERSION = 1;

// ---- Global economy state (used by Phase 6) ----
let playerMoney = 0;

// ============================================================
// Save
// ============================================================
function saveGame() {
  // Only save cells that have a crop
  const cells = [];
  farmCells.forEach((c, idx) => {
    if (c.stage >= 0) {
      cells.push({ idx, seedType: c.seedType, stage: c.stage, nextStageAt: c.nextStageAt });
    }
  });

  const data = {
    version:      SAVE_VERSION,
    savedAt:      Date.now(),
    farmRealTime,
    money:        playerMoney,
    inventory:    { ...inventory },
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

  // Restore timing + economy
  farmRealTime = data.farmRealTime || 0;
  playerMoney  = data.money        || 0;

  // Restore hunting inventory
  if (data.inventory) {
    inventory.meat     = data.inventory.meat     || 0;
    inventory.hide     = data.inventory.hide     || 0;
    inventory.feathers = data.inventory.feathers || 0;
    updateInventoryHUD();
  }

  // Restore planted cells
  for (const saved of (data.cells || [])) {
    const cell = farmCells[saved.idx];
    if (!cell) continue;

    cell.seedType    = saved.seedType;
    cell.stage       = saved.stage;
    cell.nextStageAt = saved.nextStageAt;

    if (cell.mesh) scene.remove(cell.mesh);
    cell.mesh = buildCropMesh(cell.seedType, cell.stage);
    cell.mesh.position.set(cell.cx, FARM_Y, cell.cz);
    scene.add(cell.mesh);
  }
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
