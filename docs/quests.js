// ============================================================
// Quest System
// ============================================================

// Neighbor NPC position (mirrors scene.js: _hX + 6.5, _hZ + 1.5)
const questNPCPos = new THREE.Vector3(-11.5, groundAt(-11.5, 13.5) + 1.0, 13.5);

// ---- Quest definitions ----
const QUESTS = [
  {
    id: 'first_harvest',
    title: 'First Harvest',
    desc: 'Harvest 3 maize crops to get started.',
    hint: 'Plant maize with [1] then [F], water with [F], wait, harvest with [F].',
    goal: 3,
    reward: 200,
    check: () => questProgress.first_harvest || 0,
  },
  {
    id: 'buy_watercan',
    title: 'Get a Watering Can',
    desc: 'Buy a watering can from the Duka shop.',
    hint: 'Walk to the shop and press [E] to open it.',
    goal: 1,
    reward: 150,
    check: () => ownedTools.wateringCan ? 1 : 0,
  },
  {
    id: 'earn_1000',
    title: 'Growing Wealth',
    desc: 'Save up 1,000 TSh.',
    hint: 'Sell crops at the Soko market to earn money.',
    goal: 1000,
    reward: 300,
    check: () => playerMoney,
  },
  {
    id: 'buy_chickens',
    title: 'Poultry Farmer',
    desc: 'Own at least 8 chickens.',
    hint: 'Buy chickens at the Duka shop.',
    goal: 8,
    reward: 250,
    check: () => ownedChickens,
  },
  {
    id: 'collect_eggs',
    title: 'Egg Collector',
    desc: 'Collect 10 eggs from your chickens.',
    hint: 'Chickens produce eggs over time. Keep the trough filled to speed it up.',
    goal: 10,
    reward: 300,
    check: () => questProgress.collect_eggs || 0,
  },
  {
    id: 'hunter',
    title: 'Safari Hunter',
    desc: 'Hunt animals and collect 5 pieces of meat.',
    hint: 'Press [G] to enter hunt mode, find impalas in the savanna.',
    goal: 5,
    reward: 400,
    check: () => questProgress.hunter || 0,
  },
  {
    id: 'expand_land',
    title: 'Land Baron',
    desc: 'Purchase a new land plot.',
    hint: 'Buy a plot from the Land section in the Duka shop.',
    goal: 1,
    reward: 500,
    check: () => {
      let count = 0;
      for (const k in ownedPlots) { if (ownedPlots[k]) count++; }
      return count;
    },
  },
  {
    id: 'build_barn',
    title: 'Storage Upgrade',
    desc: 'Build the Ghala storage barn.',
    hint: 'Buy the barn upgrade from the Duka shop.',
    goal: 1,
    reward: 600,
    check: () => UPGRADES.storageBarn.built ? 1 : 0,
  },
  {
    id: 'all_crops',
    title: 'Crop Diversity',
    desc: 'Harvest at least one of every crop type.',
    hint: 'Grow and harvest maize, beans, sorghum, cassava, and groundnuts.',
    goal: 5,
    reward: 800,
    check: () => cropInventory.filter(c => (questProgress.all_crops_seen || [])[cropInventory.indexOf(c)] > 0).length,
  },
  {
    id: 'earn_10000',
    title: 'Wealthy Farmer',
    desc: 'Accumulate 10,000 TSh.',
    hint: 'Keep farming, selling, and expanding your operation.',
    goal: 10000,
    reward: 1500,
    check: () => playerMoney,
  },
];

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

  const current = quest.check();
  if (current >= quest.goal) {
    completeQuest(quest);
  }
}

function completeQuest(quest) {
  questCompleted.push(quest.id);
  activeQuestId = null;

  // Give reward
  playerMoney += quest.reward;
  if (typeof updateMoneyHUD === 'function') updateMoneyHUD();

  // Show completion notification
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

  // Determine what to show
  const active = getActiveQuest();

  if (active) {
    // Show progress on current quest
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
      // Offer next quest
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
      // All quests done
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

// ---- Progress tracking hooks (called from other systems) ----
function onCropHarvested(seedType) {
  // Always track crop diversity (even before that quest is active)
  if (!questProgress.all_crops_seen) questProgress.all_crops_seen = [0, 0, 0, 0, 0];
  questProgress.all_crops_seen[seedType] = 1;

  if (!activeQuestId) return;

  if (activeQuestId === 'first_harvest' && seedType === 0) {
    questProgress.first_harvest = (questProgress.first_harvest || 0) + 1;
  }
}

function onEggCollected(count) {
  questProgress.collect_eggs = (questProgress.collect_eggs || 0) + count;
}

function onMeatCollected(count) {
  questProgress.hunter = (questProgress.hunter || 0) + count;
}

// Fix all_crops check to use the tracked data properly
QUESTS.find(q => q.id === 'all_crops').check = () => {
  if (!questProgress.all_crops_seen) return 0;
  return questProgress.all_crops_seen.filter(v => v > 0).length;
};
