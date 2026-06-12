// ============================================================
// Achievements — stats tracking, unlock toasts, menu page
// Loaded after app.js. Hooks in by wrapping global functions.
// ============================================================

const STATS_KEY = 'farmsim_stats_v1';
const ACH_KEY   = 'farmsim_achievements_v1';

// ---- Lifetime stats (persisted separately from the world save) ----
const gameStats = {
  totalHarvested: 0,
  totalEarned:    0,
  totalSpent:     0,
  kills:          0,
  itemsSold:      0,
  traderTrades:   0,
};
window.gameStats = gameStats;

(function loadStats() {
  try {
    const raw = localStorage.getItem(STATS_KEY);
    if (raw) Object.assign(gameStats, JSON.parse(raw));
  } catch (e) { /* corrupted stats are not worth crashing over */ }
})();

function saveStats() {
  try { localStorage.setItem(STATS_KEY, JSON.stringify(gameStats)); } catch (e) {}
}
setInterval(saveStats, 30_000);
window.addEventListener('beforeunload', saveStats);

// ---- Achievement definitions ----
const ACHIEVEMENTS = [
  { id: 'first_harvest',  icon: '\u{1F33D}', name: 'Mavuno ya Kwanza', desc: 'Harvest your first crop',            check: () => gameStats.totalHarvested >= 1 },
  { id: 'harvest_25',     icon: '\u{1F33E}', name: 'Field Hand',       desc: 'Harvest 25 crops',                   check: () => gameStats.totalHarvested >= 25 },
  { id: 'harvest_100',    icon: '\u{1F69C}', name: 'Mkulima',          desc: 'Harvest 100 crops',                  check: () => gameStats.totalHarvested >= 100 },
  { id: 'harvest_250',    icon: '\u{1F3C6}', name: 'Harvest Legend',   desc: 'Harvest 250 crops',                  check: () => gameStats.totalHarvested >= 250 },
  { id: 'first_sale',     icon: '\u{1FA99}', name: 'Open for Business', desc: 'Sell something at the Soko',        check: () => gameStats.itemsSold >= 1 },
  { id: 'sold_100',       icon: '\u{1F4B0}', name: 'Market Regular',   desc: 'Sell 100 items',                     check: () => gameStats.itemsSold >= 100 },
  { id: 'earn_5k',        icon: '\u{1F4B5}', name: 'First Fortune',    desc: 'Earn 5,000 TSh lifetime',            check: () => gameStats.totalEarned >= 5000 },
  { id: 'earn_25k',       icon: '\u{1F4B8}', name: 'Shilling Stacker', desc: 'Earn 25,000 TSh lifetime',           check: () => gameStats.totalEarned >= 25000 },
  { id: 'earn_100k',      icon: '\u{1F451}', name: 'Tajiri',           desc: 'Earn 100,000 TSh lifetime',          check: () => gameStats.totalEarned >= 100000 },
  { id: 'tool_collector', icon: '\u{1F6E0}', name: 'Fully Equipped',   desc: 'Own every tool',                     check: () => ownedTools.hoe && ownedTools.wateringCan && ownedTools.machete && ownedTools.axe },
  { id: 'chicken_baron',  icon: '\u{1F414}', name: 'Chicken Baron',    desc: 'Own 10 chickens',                    check: () => ownedChickens >= 10 },
  { id: 'cattle_king',    icon: '\u{1F404}', name: 'Cattle King',      desc: 'Own 8 cows',                         check: () => ownedCows >= 8 },
  { id: 'land_empire',    icon: '\u{1F5FA}', name: 'Land Empire',      desc: 'Own all 5 expansion plots',          check: () => { let c = 0; for (const k in ownedPlots) { if (ownedPlots[k]) c++; } return c >= 5; } },
  { id: 'fully_upgraded', icon: '⚡',    name: 'Modern Farm',      desc: 'Build all 5 upgrades',               check: () => Object.values(UPGRADES).every(u => u.built) },
  { id: 'marksman',       icon: '\u{1F3AF}', name: 'Marksman',         desc: 'Hunt 10 wild animals',               check: () => gameStats.kills >= 10 },
  { id: 'apex_hunter',    icon: '\u{1F981}', name: 'Apex Hunter',      desc: 'Hunt 50 wild animals',               check: () => gameStats.kills >= 50 },
  { id: 'quest_runner',   icon: '\u{1F4DC}', name: 'Helping Hand',     desc: 'Complete 5 quests',                  check: () => (typeof questCompleted !== 'undefined' ? questCompleted.length : 0) >= 5 },
  { id: 'quest_master',   icon: '⭐',    name: 'Village Hero',     desc: 'Complete every quest',               check: () => typeof questCompleted !== 'undefined' && typeof QUESTS !== 'undefined' && questCompleted.length >= QUESTS.length },
  { id: 'year_farmer',    icon: '\u{1F389}', name: 'A Full Year',      desc: 'Farm through all four seasons',      check: () => typeof YEAR_SECONDS !== 'undefined' && farmRealTime >= YEAR_SECONDS },
  { id: 'trader_friend',  icon: '\u{1F42A}', name: 'Trader’s Friend', desc: 'Trade with the wandering trader', check: () => gameStats.traderTrades >= 1 },
];

let unlockedAchievements = [];
(function loadAchievements() {
  try {
    const raw = localStorage.getItem(ACH_KEY);
    if (raw) unlockedAchievements = JSON.parse(raw) || [];
  } catch (e) { unlockedAchievements = []; }
})();

function saveAchievements() {
  try { localStorage.setItem(ACH_KEY, JSON.stringify(unlockedAchievements)); } catch (e) {}
}

// ---- Unlock toast ----
function showAchievementToast(a) {
  const el = document.getElementById('achievement-toast');
  if (!el) return;
  el.innerHTML = '<span class="ach-toast-ico">' + a.icon + '</span>' +
    '<span class="ach-toast-text"><b>ACHIEVEMENT</b>' + a.name + '</span>';
  el.classList.add('visible');
  clearTimeout(el._t);
  el._t = setTimeout(() => el.classList.remove('visible'), 4500);
}

// ---- Periodic unlock check ----
setInterval(() => {
  for (const a of ACHIEVEMENTS) {
    if (unlockedAchievements.includes(a.id)) continue;
    let ok = false;
    try { ok = a.check(); } catch (e) { /* dependent globals not ready yet */ }
    if (ok) {
      unlockedAchievements.push(a.id);
      saveAchievements();
      showAchievementToast(a);
      if (typeof sfxAchievement === 'function') sfxAchievement();
    }
  }
}, 2000);

// ---- Achievements menu page ----
function renderAchievements() {
  const list = document.getElementById('ach-list');
  const counter = document.getElementById('ach-counter');
  if (!list) return;
  if (counter) counter.textContent = unlockedAchievements.length + ' / ' + ACHIEVEMENTS.length + ' unlocked';
  let html = '';
  for (const a of ACHIEVEMENTS) {
    const got = unlockedAchievements.includes(a.id);
    html += '<div class="ach-row' + (got ? ' unlocked' : '') + '">' +
      '<span class="ach-ico">' + (got ? a.icon : '\u{1F512}') + '</span>' +
      '<span class="ach-body"><span class="ach-name">' + a.name + '</span>' +
      '<span class="ach-desc">' + a.desc + '</span></span>' +
      (got ? '<span class="ach-check">✓</span>' : '') +
      '</div>';
  }
  list.innerHTML = html;
}

// Render whenever the achievements page is shown
(function hookShowPage() {
  const orig = showPage;
  showPage = function (name) {
    orig(name);
    if (name === 'achievements') renderAchievements();
  };
})();

// ============================================================
// Stat hooks — wrap existing gameplay functions
// ============================================================

// Harvests
(function hookHarvest() {
  const orig = onCropHarvested;
  onCropHarvested = function (seedType) {
    orig(seedType);
    gameStats.totalHarvested++;
  };
})();

// Hunting kills
(function hookKill() {
  const orig = killAnimal;
  killAnimal = function (animal) {
    const wasAlive = animal && animal.alive;
    orig(animal);
    if (wasAlive) gameStats.kills++;
  };
})();

// Sales — track items sold + money earned via balance delta
(function hookSales() {
  const wrapSell = (fnName, countFn) => {
    const orig = window[fnName];
    if (typeof orig !== 'function') return;
    window[fnName] = function (...args) {
      const before = playerMoney;
      const qty = countFn(...args);
      orig(...args);
      const gained = playerMoney - before;
      if (gained > 0) {
        gameStats.totalEarned += gained;
        gameStats.itemsSold += qty;
      }
    };
  };
  wrapSell('sellCrop',    (idx) => cropInventory[idx] || 0);
  wrapSell('sellProduct', (key) => animalProducts[key] || 0);
  wrapSell('sellLoot',    (key) => inventory[key] || 0);
})();

// Purchases — money spent
(function hookBuys() {
  for (const fnName of ['buySeeds', 'buyTool', 'buyFertilizer', 'buyFeed', 'buyFencing', 'buyChicken', 'buyCow']) {
    const orig = window[fnName];
    if (typeof orig !== 'function') continue;
    window[fnName] = function (...args) {
      const before = playerMoney;
      orig(...args);
      const spent = before - playerMoney;
      if (spent > 0) gameStats.totalSpent += spent;
    };
  }
})();

// Quest rewards count as earnings
(function hookQuestReward() {
  const orig = completeQuest;
  completeQuest = function (quest) {
    orig(quest);
    gameStats.totalEarned += quest.reward || 0;
  };
})();

// Reset also wipes stats + achievements
(function hookReset() {
  resetGame = function () {
    if (!confirm('Reset all progress? This cannot be undone!')) return;
    localStorage.removeItem(SAVE_KEY);
    localStorage.removeItem(STATS_KEY);
    localStorage.removeItem(ACH_KEY);
    location.reload();
  };
})();
