// ============================================================
// Quest Engine — state, HUD, dialog, progress hooks
// Quest definitions live in quest-data.js (loaded first).
// ============================================================

// Neighbor NPC position (mirrors scene.js: _hX + 6.5, _hZ + 1.5)
const questNPCPos = new THREE.Vector3(-11.5, groundAt(-11.5, 13.5) + 1.0, 13.5);

// ---- Quest state ----
let questCompleted = [];       // array of completed quest IDs
let activeQuestId = null;      // current quest ID or null
let questProgress = {};        // { quest_id: number } for cumulative tracking
let questDialogOpen = false;

// ---- Derived helpers ----
function getActiveQuest() {
  return QUESTS.find(q => q.id === activeQuestId) || null;
}

function getNextQuest() {
  return QUESTS.find(q => !questCompleted.includes(q.id) && q.id !== activeQuestId) || null;
}

// ---- Quest HUD ----
function updateQuestHUD() {
  const el = document.getElementById('quest-tracker');
  if (!el) return;

  const quest = getActiveQuest();
  if (!quest) {
    el.style.display = 'none';
    return;
  }

  const current = Math.min(quest.check(), quest.goal);
  const pct = Math.round((current / quest.goal) * 100);

  el.style.display = 'block';
  el.innerHTML =
    '<div class="qt-title">' + quest.title + '</div>' +
    '<div class="qt-desc">' + quest.desc + '</div>' +
    '<div class="qt-bar-bg"><div class="qt-bar-fill" style="width:' + pct + '%"></div></div>' +
    '<div class="qt-progress">' + current + ' / ' + quest.goal + '</div>';
}

// ---- Check quest completion (called in game loop) ----
function checkQuestCompletion() {
  const quest = getActiveQuest();
  if (!quest) return;

  if (quest.check() >= quest.goal) {
    completeQuest(quest);
  }
}

function completeQuest(quest) {
  questCompleted.push(quest.id);
  activeQuestId = null;

  playerMoney += quest.reward;
  if (typeof updateMoneyHUD === 'function') updateMoneyHUD();

  showQuestNotification('Quest Complete: ' + quest.title + '  +' + quest.reward + ' TSh');
  updateQuestHUD();
}

// ---- Notification toast ----
function showQuestNotification(text) {
  const el = document.getElementById('quest-notification');
  if (!el) return;
  el.textContent = text;
  el.classList.add('visible');
  clearTimeout(el._t);
  el._t = setTimeout(() => el.classList.remove('visible'), 4000);
}

// ---- Quest dialog (talk to NPC) ----
function openQuestDialog() {
  questDialogOpen = true;
  document.exitPointerLock();

  const overlay = document.getElementById('quest-dialog');
  const title   = document.getElementById('qd-title');
  const body    = document.getElementById('qd-body');
  const btn     = document.getElementById('qd-action');

  const active = getActiveQuest();

  if (active) {
    const current = Math.min(active.check(), active.goal);
    title.textContent = active.title;
    body.innerHTML =
      '<p class="qd-desc">' + active.desc + '</p>' +
      '<p class="qd-hint">' + active.hint + '</p>' +
      '<p class="qd-progress">Progress: ' + current + ' / ' + active.goal + '</p>';
    btn.textContent = 'OK';
    btn.onclick = closeQuestDialog;
  } else {
    const next = getNextQuest();
    if (next) {
      title.textContent = next.title;
      body.innerHTML =
        '<p class="qd-desc">' + next.desc + '</p>' +
        '<p class="qd-hint">' + next.hint + '</p>' +
        '<p class="qd-reward">Reward: ' + next.reward + ' TSh</p>';
      btn.textContent = 'ACCEPT';
      btn.onclick = () => {
        activeQuestId = next.id;
        updateQuestHUD();
        closeQuestDialog();
        showQuestNotification('New Quest: ' + next.title);
      };
    } else {
      title.textContent = 'All Done!';
      body.innerHTML = '<p class="qd-desc">You\'ve completed every quest I have. Impressive work, farmer!</p>';
      btn.textContent = 'OK';
      btn.onclick = closeQuestDialog;
    }
  }

  overlay.classList.remove('hidden');
}

function closeQuestDialog() {
  questDialogOpen = false;
  document.getElementById('quest-dialog').classList.add('hidden');
  container.requestPointerLock();
}

// ============================================================
// Progress tracking hooks — called from farming/hunting/shop
// ============================================================

function onCropHarvested(seedType) {
  // Always track crop diversity
  if (!questProgress.all_crops_seen) questProgress.all_crops_seen = [0, 0, 0, 0, 0];
  questProgress.all_crops_seen[seedType] = 1;

  // Total harvested (any type)
  questProgress.total_harvested = (questProgress.total_harvested || 0) + 1;

  // Specific crop quests
  if (activeQuestId === 'first_harvest' && seedType === 0) {
    questProgress.first_harvest = (questProgress.first_harvest || 0) + 1;
  }
  if (activeQuestId === 'harvest_beans' && seedType === 1) {
    questProgress.harvest_beans = (questProgress.harvest_beans || 0) + 1;
  }
}

function onEggCollected(count) {
  questProgress.collect_eggs = (questProgress.collect_eggs || 0) + count;
}

function onMilkCollected(count) {
  questProgress.collect_milk = (questProgress.collect_milk || 0) + count;
}

function onMeatCollected(count) {
  questProgress.hunter = (questProgress.hunter || 0) + count;
}

function onHideCollected(count) {
  questProgress.hide_collector = (questProgress.hide_collector || 0) + count;
}

function onCropSold(seedType, qty) {
  questProgress.sell_first_crops = (questProgress.sell_first_crops || 0) + qty;
}

function onLootSold(qty) {
  questProgress.sell_loot = (questProgress.sell_loot || 0) + qty;
}

function onFertilizerUsed() {
  questProgress.use_fertilizer = (questProgress.use_fertilizer || 0) + 1;
}

function onTroughFilled(amount) {
  questProgress.feed_animals = (questProgress.feed_animals || 0) + amount;
}
