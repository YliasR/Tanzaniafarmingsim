# SoilSMS Farm Game — Game Plan

> Forked from the SoilSMS demo. Strip the site, keep the world, make it a game.

---

## Phase 1: Fork & Clean

- [x] Fork the repo into a new project (e.g. `soilsms-farm-game`)
- [x] Delete all non-game files: `index.html`, `contact.html`, `support.html`, server code, IoT code
- [x] Keep: `demo.html`, `style.css`, `scene.js`, `controls.js`, `app.js`, `sms.js`
- [x] Rename `demo.html` → `index.html`
- [x] Strip the sensor panel, AI panel, Nokia phone, SMS logic, and HUD overlays
- [x] Remove helpdesk/contact links and footer
- [x] Result: clean Three.js scene with terrain, animals, trees, buildings, sky

---

## Phase 2: First Person Controller

- [x] Replace the orbit camera with a first-person camera (pointer lock)
- [x] WASD movement, mouse look, spacebar jump
- [x] Collision detection with ground (walk on terrain, follow height map)
- [x] Basic collision with buildings/trees (don't walk through them)
- [x] Sprint (shift key), crouch if needed later
- [x] Player "body" — shadow on ground, maybe visible hands/tool

---

## Phase 3: Day/Night Cycle

- [x] Sun moves across the sky over time (rotate directional light)
- [x] Sky color transitions: dawn (orange) → day (blue) → dusk (red) → night (dark blue)
- [x] Moonlight at night (dim blue directional light)
- [x] Stars at night (particle system or skybox)
- [x] Ambient light dims at night, fog changes color
- [x] Game clock: 1 real minute = 1 game hour (24 min full cycle), tweak to feel right
- [x] Animals sleep at night / different behavior

---

## Phase 4: Farming & Planting

- [x] Inventory system (hotbar at bottom of screen)
- [x] Seeds: maize, beans, cassava, sorghum
- [x] Planting: look at tilled soil + click to plant
- [x] Growth stages: seed → sprout → half-grown → ready (time-based, tied to game clock)
- [x] Watering: optional, speeds up growth (carry water bucket from well/river)
- [x] Harvesting: click mature crop to collect into inventory
- [x] Crop sell value varies (simple economy)
- [x] Soil quality affects yield (tie into the existing sensor data concept)

---

## Phase 5: Hunting

- [x] Some animals become huntable (not the cows/chickens — those are farm animals)
- [x] Huntable: wild birds, maybe distant animals that spawn in the savanna
- [x] Simple tool: slingshot or spear (click to throw/shoot)
- [x] Projectile physics (arc trajectory)
- [x] Drops: meat, hide, feathers
- [x] Sell at market or use for crafting
- [x] Animals flee when approached — need stealth/distance shots
- [x] Don't hunt farm animals (penalty? they're yours!)

---

## Phase 6: Economy — Buying Stuff

- [x] Currency: Tanzanian Shillings (TSh) or simplified "coins"
- [x] Market/shop: interact with a building to open buy/sell menu
- [ ] Buyable items:
  - Seeds (different crop types)
  - Tools (hoe, watering can, slingshot, better versions)
  - Animal feed
  - Building materials
  - Fencing
- [ ] Sell: crops, animal products, hunted items
- [ ] Prices fluctuate slightly (simple random daily market)

---

## Phase 7A: Land Expansion

- [x] Start with a small plot near the hut
- [x] Buy adjacent land plots to expand farm (5 plots: East, North, South, Riverside, Far East)
- [x] Land types: fertile (1.0x), savanna (0.7x + dry grass), riverside (1.4x + auto-water + water channel)
- [x] Each plot adds farmable cells to the global grid
- [x] "For Sale" sign posts with corner stakes mark available plots in the world
- [x] Visual terrain per type (soil color, water channel on riverside, dry grass on savanna)
- [x] Plot prerequisites (unlock chain: East/South → North → Riverside, East → Far East)

## Phase 7B: Upgrades

- [x] Upgrades buyable at the shop, each spawns a visible 3D structure:
  - Storage Barn (Ghala) → +15% sell bonus at market
  - Water Pump (Pampu) → auto-waters crops within 14m range (daytime only without solar)
  - Solar Panel (Sola) → powers water pump 24/7
  - Sensor Node (Sensori) → unhides RPi + AI server, shows soil data HUD
  - Big House (Nyumba Kubwa) → cosmetic prestige upgrade (bigger house model)
- [x] Chicken coop → eggs income (done in Phase 6)
- [x] Cow pasture → milk income (done in Phase 6)
- [x] Fenced areas to keep animals in/out (done in Phase 6)

---

## Phase 8: Electron Packaging

- [x] `npm init` + install `electron` (package.json created)
- [x] Create `main.js` (Electron entry point, loads `index.html`)
- [x] Window config: fullscreen by default, resizable, title "Tanzania Farm Sim"
- [ ] Test on Windows + Linux (run `npm start`)
- [x] Use `electron-builder` to create installers:
  - `.exe` for Windows
  - `.AppImage` / `.deb` for Linux
  - `.dmg` for macOS (if possible)
- [x] Add app icon (pixel art farm icon — generator at `scripts/generate-icon.html`)
- [x] Optimize: disable devtools in production, set CSP headers

---

## Phase 9: itch.io Upload

- [ ] Create itch.io account + game page
- [ ] Upload two versions:
  - **HTML5** (browser playable) — zip the game files, upload as HTML
  - **Downloadable** — Electron builds per platform
- [ ] Set up game page:
  - Title: "SoilSMS Farm" (or new name)
  - Cover image / screenshots from the game
  - Description: low-poly Tanzanian farm sim
  - Tags: farming, low-poly, simulation, survival, indie
  - Price: free (or pay-what-you-want)
- [ ] Embed the HTML5 version for instant browser play
- [ ] Link downloadable builds for people who want the full experience

---

## Nice-to-Have (Later)

- [x] Save/load system (localStorage for HTML5, file system for Electron)
- [ ] Sound effects: footsteps, ambient birds, wind, crop harvesting, animal sounds
- [ ] Music: chill lo-fi African-inspired ambient soundtrack
- [ ] Weather system: rain (boosts crops), drought (damages them), wind
- [ ] Seasons that affect what you can grow
- [ ] NPCs: other farmers, traders passing through
- [ ] Quests: "grow 10 maize", "build a chicken coop", "hunt 3 birds"
- [ ] Achievements / unlockables
- [ ] Multiplayer (way later, big scope)
- [ ] Mobile touch controls (if HTML5 version gets popular)
- [ ] Steam port (if itch.io does well — $100 fee, Steamworks SDK integration)

---

## Tech Stack

| Layer | Tool |
|-------|------|
| 3D Engine | Three.js (already in use) |
| UI | HTML/CSS overlays (already in use) |
| Desktop wrapper | Electron |
| Build tool | electron-builder |
| Distribution | itch.io (HTML5 + downloadable) |
| Version control | Git (forked repo) |

---

## Rough Priority Order

1. Clean fork (Phase 1)
2. First person (Phase 2) — this makes it feel like a game instantly
3. Day/night (Phase 3) — massive vibe boost
4. Planting (Phase 4) — core gameplay loop
5. Economy (Phase 6) — gives planting a purpose
6. Land & upgrades (Phase 7) — progression
7. Hunting (Phase 5) — secondary gameplay
8. Electron (Phase 8) — packaging
9. itch.io (Phase 9) — ship it!
