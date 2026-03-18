// ============================================================
// Quest Definitions
// ============================================================
//
// HOW TO ADD A NEW QUEST
// ----------------------
// 1.  Copy the template below and paste it at the end of the
//     QUESTS array (before the closing bracket).
// 2.  Give it a unique `id` (lowercase, underscores).
// 3.  Set `goal` to the target number the player must reach.
// 4.  Write a `check` function that returns the player's
//     current progress toward that goal (0 … goal).
//
// The quest engine handles everything else: HUD tracker,
// NPC dialog, completion detection, reward payout, and saving.
//
// TEMPLATE — copy this block:
// ─────────────────────────────────────────────────────────────
//  {
//    id:     'my_quest_id',          // unique key (saved to localStorage)
//    title:  'Quest Title',          // shown in HUD + dialog
//    desc:   'What the player must do.',
//    hint:   'A helpful tip on how to do it.',
//    goal:   5,                      // target value
//    reward: 300,                    // TSh paid on completion
//    check:  () => {
//      // Return a number: 0 = no progress, >= goal = done.
//      // You can read ANY global game variable here:
//      //   playerMoney, ownedChickens, ownedCows,
//      //   cropInventory[0..4], inventory.meat/hide/feathers,
//      //   animalProducts.eggs/milk, ownedTools.hoe/wateringCan/machete/axe,
//      //   ownedPlots (object), UPGRADES.*.built,
//      //   fertilizerCount, animalFeedCount, fencingOwned,
//      //   questProgress.YOUR_KEY (for cumulative tracking via hooks)
//      return 0;
//    },
//  },
// ─────────────────────────────────────────────────────────────
//
// CUMULATIVE TRACKING (questProgress)
// If your quest tracks something that isn't a live game total
// (e.g. "harvest 3 maize" — cropInventory resets when you sell),
// use questProgress.your_key and increment it in the matching
// hook inside quests.js:
//   onCropHarvested(seedType)  — called when any crop is harvested
//   onEggCollected(count)      — called when eggs are produced
//   onMeatCollected(count)     — called when meat is picked up
//   onMilkCollected(count)     — called when milk is produced
//   onCropSold(seedType, qty)  — called when crops are sold
//   onHideSold(qty)            — called when hides are sold
//
// questProgress is auto-saved, so your counter persists.
// ============================================================

const QUESTS = [

  // ---- EARLY GAME ----
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
    id: 'sell_first_crops',
    title: 'First Sale',
    desc: 'Sell 5 crops at the Soko market.',
    hint: 'Harvest crops, then walk to the market stall and press [E].',
    goal: 5,
    reward: 200,
    check: () => questProgress.sell_first_crops || 0,
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

  // ---- ANIMALS ----
  {
    id: 'buy_fencing',
    title: 'Build a Pen',
    desc: 'Buy fencing to contain your animals.',
    hint: 'Purchase Uzio (Fencing) from the Supplies section in the Duka.',
    goal: 1,
    reward: 200,
    check: () => fencingOwned ? 1 : 0,
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
    id: 'buy_cows',
    title: 'Cattle Rancher',
    desc: 'Own at least 6 cows.',
    hint: 'Buy cows at the Duka shop. They produce milk.',
    goal: 6,
    reward: 400,
    check: () => ownedCows,
  },
  {
    id: 'collect_milk',
    title: 'Dairy Farmer',
    desc: 'Collect 15 milk from your cows.',
    hint: 'Cows produce milk over time. Feed them to double output.',
    goal: 15,
    reward: 350,
    check: () => questProgress.collect_milk || 0,
  },
  {
    id: 'feed_animals',
    title: 'Well Fed',
    desc: 'Fill the feed trough with 20 units of feed.',
    hint: 'Buy Chakula (feed) at the Duka, then press [E] at the trough.',
    goal: 20,
    reward: 250,
    check: () => questProgress.feed_animals || 0,
  },

  // ---- HUNTING ----
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
    id: 'hide_collector',
    title: 'Hide Collector',
    desc: 'Collect 5 animal hides.',
    hint: 'Hunt impalas in the savanna — they drop hides.',
    goal: 5,
    reward: 350,
    check: () => questProgress.hide_collector || 0,
  },
  {
    id: 'sell_loot',
    title: 'Bush Trader',
    desc: 'Sell 10 pieces of hunting loot at the market.',
    hint: 'Sell meat, hides, or feathers at the Soko.',
    goal: 10,
    reward: 500,
    check: () => questProgress.sell_loot || 0,
  },

  // ---- FARMING MASTERY ----
  {
    id: 'use_fertilizer',
    title: 'Green Thumb',
    desc: 'Use fertilizer on 5 crops.',
    hint: 'Buy Mbolea (fertilizer) at the Duka, then press [T] on a growing crop.',
    goal: 5,
    reward: 250,
    check: () => questProgress.use_fertilizer || 0,
  },
  {
    id: 'harvest_beans',
    title: 'Bean Counter',
    desc: 'Harvest 10 bean crops.',
    hint: 'Select beans with [2], plant with [F], and grow them to maturity.',
    goal: 10,
    reward: 400,
    check: () => questProgress.harvest_beans || 0,
  },
  {
    id: 'all_crops',
    title: 'Crop Diversity',
    desc: 'Harvest at least one of every crop type.',
    hint: 'Grow and harvest maize, beans, sorghum, cassava, and groundnuts.',
    goal: 5,
    reward: 800,
    check: () => {
      if (!questProgress.all_crops_seen) return 0;
      return questProgress.all_crops_seen.filter(v => v > 0).length;
    },
  },
  {
    id: 'harvest_50',
    title: 'Seasoned Farmer',
    desc: 'Harvest 50 crops total.',
    hint: 'Keep planting and harvesting — any crop type counts.',
    goal: 50,
    reward: 1000,
    check: () => questProgress.total_harvested || 0,
  },

  // ---- EXPANSION & UPGRADES ----
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
    hint: 'Buy the barn upgrade from the Duka shop — gives +15% sell prices.',
    goal: 1,
    reward: 600,
    check: () => UPGRADES.storageBarn.built ? 1 : 0,
  },
  {
    id: 'build_pump',
    title: 'Irrigation',
    desc: 'Build the Pampu water pump.',
    hint: 'Buy the pump upgrade — it auto-waters nearby crops during the day.',
    goal: 1,
    reward: 500,
    check: () => UPGRADES.waterPump.built ? 1 : 0,
  },
  {
    id: 'go_solar',
    title: 'Solar Power',
    desc: 'Install the Sola solar panel.',
    hint: 'The solar panel lets the pump work at night too.',
    goal: 1,
    reward: 700,
    check: () => UPGRADES.solarPanel.built ? 1 : 0,
  },
  {
    id: 'sensor_node',
    title: 'Smart Farm',
    desc: 'Install the Sensori soil sensor node.',
    hint: 'The sensor shows live soil data and enables AI crop reports on the Nokia.',
    goal: 1,
    reward: 1000,
    check: () => UPGRADES.sensorNode.built ? 1 : 0,
  },
  {
    id: 'expand_3_plots',
    title: 'Land Empire',
    desc: 'Own 3 additional land plots.',
    hint: 'Keep buying plots as you unlock them.',
    goal: 3,
    reward: 1200,
    check: () => {
      let count = 0;
      for (const k in ownedPlots) { if (ownedPlots[k]) count++; }
      return count;
    },
  },
  {
    id: 'big_house',
    title: 'Dream Home',
    desc: 'Upgrade to the Nyumba Kubwa.',
    hint: 'Buy the house upgrade from the Duka.',
    goal: 1,
    reward: 800,
    check: () => UPGRADES.houseUpgrade.built ? 1 : 0,
  },

  // ---- ENDGAME ----
  {
    id: 'earn_10000',
    title: 'Wealthy Farmer',
    desc: 'Accumulate 10,000 TSh.',
    hint: 'Keep farming, selling, and expanding your operation.',
    goal: 10000,
    reward: 1500,
    check: () => playerMoney,
  },
  {
    id: 'earn_50000',
    title: 'Tycoon',
    desc: 'Accumulate 50,000 TSh.',
    hint: 'Diversify — crops, animals, and hunting all bring income.',
    goal: 50000,
    reward: 5000,
    check: () => playerMoney,
  },
  {
    id: 'harvest_100',
    title: 'Master Farmer',
    desc: 'Harvest 100 crops total.',
    hint: 'You have the land, the tools, and the skill. Keep going.',
    goal: 100,
    reward: 3000,
    check: () => questProgress.total_harvested || 0,
  },
];
