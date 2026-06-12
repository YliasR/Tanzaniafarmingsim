# Tanzania Farm Sim

A low-poly, open-world farming simulator set in rural Tanzania. Explore the savanna, tend crops, raise livestock, hunt wild game, and build your farm beneath the shadow of Kilimanjaro — all rendered in the browser with Three.js and packaged as a desktop app with Electron.

## Features

### Farming
- **5 crop types** — Maize, Beans, Sorghum, Cassava, and Groundnuts, each with unique growth rates and optimal soil conditions
- **3 growth stages** — plant, water, fertilize, and harvest through a full crop lifecycle
- **Soil simulation** — moisture, pH, nitrogen, phosphorus, and potassium levels affect growth speed
- **Hard Mode** — soil quality gates what you can plant and dramatically shifts growth multipliers

### Animals
- **Chickens & Cows** — buy livestock, keep them fed, and collect eggs and milk for sale
- **Feed troughs & fencing** — build a pen and keep the trough filled to double production rates
- **Goats** — roam the farm (cosmetic / future expansion)

### Hunting
- **Toggle hunt mode** with a bolt-action rifle
- **Impalas & Guinea Fowl** roam the distant savanna — hunt them for meat, hides, and feathers
- Sell loot at the market for extra income

### Economy
- **Duka (Shop)** — buy seeds, tools, supplies, animals, land, and upgrades
- **Soko (Market)** — sell crops, animal products, and hunting loot
- **Daily price fluctuations** (0.7x – 1.4x) keep the market interesting
- Currency: **Tanzanian Shillings (TSh)**

### Land Expansion
- Start with a home plot and unlock **5 additional plots**: East Field, South Savanna, North Strip, Riverside, and Far East Savanna
- Each plot type affects growth — **Riverside** auto-waters and grows 40% faster, **Savanna** is 30% slower but cheap
- Unlock chains gate progression (e.g. East → North → Riverside)

### Upgrades & Buildings
| Building | Effect |
|----------|--------|
| **Ghala (Storage Barn)** | +15% sell prices at market |
| **Pampu (Water Pump)** | Auto-waters nearby crops during the day |
| **Sola (Solar Panel)** | Pump works 24/7 |
| **Sensori (Sensor Node)** | Live soil data HUD + AI SMS analysis |
| **Nyumba Kubwa (Big House)** | Upgraded house model |

### Weather & Seasons
- **5 weather types** — Clear, Cloudy, Rain, Storm, and Drought
- Rain auto-waters crops; drought dries soil and slows growth
- Storms bring heavy fog, reduced visibility, lightning flashes, and thunder
- Weather shifts on weighted transitions every 1–3 minutes
- **4 Tanzanian seasons** — Kaskazi (hot & dry), Masika (long rains), Kiangazi (dry season), Vuli (short rains)
- Seasons bias the weather and change per-crop growth speed — maize loves Masika, sorghum shrugs off Kiangazi

### Sound & Music
- **Fully procedural audio** — every sound is synthesized live with WebAudio, zero audio files
- Footsteps, planting, watering, harvest, shop chimes, rifle, pickups, quest/achievement jingles
- Ambience that follows the world: wind, rain, thunder, birdsong by day, crickets by night
- **Generative kalimba soundtrack** — sparse pentatonic plucks that slow down after dark
- Music/SFX toggles + volume in settings

### Wandering Trader
- **Mfanyabiashara** patrols the road between the Duka and the Soko
- Daily rotating deals: discounted seeds and one crop he'll buy well over market rate

### Achievements
- **20 achievements** — farming, hunting, wealth, land, quests, and a full year survived
- Unlock toasts in-game + achievements page on the title screen

### Day / Night Cycle
- Full 24-hour cycle in ~5 real minutes
- Dynamic sky colors, sun/moon tracking, star field, and ambient lighting shifts
- Sleep at your house door to skip the night

### Nokia Phone & AI Soil Analysis
- Press **N** to pull out a retro Nokia phone with SMS interface
- Purchase the Sensor Node upgrade and add an [OpenRouter](https://openrouter.ai) API key in settings
- Receive **AI-generated soil reports** with planting advice, nutrient analysis, and weather forecasts
- Auto-triggers once per in-game day; press **R** for a manual report

### Other
- **Inventory panel** — track seeds, tools, fertilizer, feed, and loot
- **Auto-save** every 30 seconds + on tab close
- **Pause menu** — ESC to pause, return to main menu, or exit
- **NPC idle animations** — characters sway and look around
- **Graphics quality setting** — Low / Medium / High (pixel ratio + shadow quality)
- **Filmic rendering** — ACES tone mapping, sRGB output, player-following shadows
- **Night ambience** — fireflies around the farm, twinkling stars, oil-lamp glow

## Controls

| Key | Action |
|-----|--------|
| `W A S D` / Arrows | Move |
| `Mouse` | Look around |
| `Shift` | Sprint |
| `Space` | Jump |
| `1` – `5` | Select seed |
| `F` | Plant / Water / Harvest |
| `T` | Apply fertilizer |
| `G` | Toggle hunting mode |
| `E` | Interact (shop, market, sleep, feed trough) |
| `I` | Inventory |
| `N` | Nokia phone |
| `R` | Request AI soil report (Nokia open) |
| `Esc` | Pause menu |
| `F11` | Toggle fullscreen |

## Getting Started

### Prerequisites
- [Node.js](https://nodejs.org/) (v18+)
- npm

### Install & Run
```bash
git clone https://github.com/your-username/Tanzaniafarmingsim.git
cd Tanzaniafarmingsim
npm install
npm start
```

### Build Installers
```bash
npm run build:win      # Windows (.exe)
npm run build:linux    # Linux (.AppImage / .deb)
npm run build:mac      # macOS (.dmg)
npm run build:all      # Windows + Linux
```

Installers output to the `release/` directory.

## Tech Stack

| | |
|---|---|
| **3D Engine** | [Three.js](https://threejs.org/) r128 |
| **Desktop** | [Electron](https://www.electronjs.org/) 33 |
| **Build** | [electron-builder](https://www.electron.build/) 25 |
| **AI** | [OpenRouter](https://openrouter.ai/) (optional, for soil analysis) |
| **Storage** | localStorage (auto-save v4 format) |

All 3D assets are procedurally generated — no external models or textures required (aside from a single sky dome image).

## Project Structure

```
├── main.js                 # Electron main process
├── package.json
├── electron-builder.yml    # Installer configuration
├── build/
│   ├── icon.png
│   └── icon.ico
└── docs/
    ├── index.html          # Single-page app shell
    ├── style.css           # All UI styles
    ├── scene.js            # Three.js scene, terrain, 3D objects
    ├── controls.js         # First-person controller
    ├── app.js              # Game loop, day/night, menu system
    ├── farming.js          # Crop mechanics
    ├── hunting.js          # Rifle & wild animal systems
    ├── shop.js             # Shop & market economy
    ├── land.js             # Land plot expansion
    ├── upgrades.js         # Building/upgrade system
    ├── weather.js          # Weather state machine
    ├── sms.js              # Nokia phone & AI integration
    └── save.js             # localStorage persistence
```

## License

This project is licensed under [CC BY-NC-SA 4.0](https://creativecommons.org/licenses/by-nc-sa/4.0/).

You're free to fork, modify, and redistribute — but you **must give credit**, share under the same license, and **may not sell it** without permission. For commercial licensing, contact [Me via mail](mailto:admin@mystic.gay).
