# Electron Packaging Guide — Tanzania Farm Sim

## Step 1: Install Node.js
If you don't have it: go to **nodejs.org**, download the LTS version, install it. Verify:
```bash
node --version
npm --version
```

## Step 2: Install dependencies
In your repo root (`C:\Users\ylias\Documents\GitHub\Tanzaniafarmingsim`):
```bash
npm install
```
This installs Electron and electron-builder into `node_modules/`. Takes a few minutes first time.

## Step 3: Test the game in Electron
```bash
npm start
```
The game should open fullscreen. Press **F11** to toggle fullscreen, **Alt+F4** to close. If you want devtools for debugging:
```bash
npx electron . --dev
```

## Step 4: Generate the app icon
1. Open `scripts/generate-icon.html` in your browser
2. Right-click the canvas image → **Save image as** → save to `build/icon.png`
3. For Windows .exe you also need a `.ico` file:
   - Go to **convertio.co/png-ico** (or any PNG→ICO converter)
   - Upload your `icon.png`, convert, save as `build/icon.ico`

## Step 5: Build installers with electron-builder

**Windows .exe installer:**
```bash
npm run build:win
```
Output goes to `dist/` → you'll get a file like `Tanzania Farm Sim Setup 1.0.0.exe`

**Linux AppImage + .deb:**
```bash
npm run build:linux
```
> Building Linux on Windows may not work. You'd need to build on a Linux machine or use WSL.

**macOS .dmg:**
```bash
npm run build:mac
```
> macOS builds only work on macOS (Apple code signing requirement).

**Both Windows + Linux:**
```bash
npm run build:all
```

## Step 6: Find your builds
Everything lands in the `dist/` folder:
```
dist/
  Tanzania Farm Sim Setup 1.0.0.exe    ← Windows installer
  tanzania-farm-sim-1.0.0.AppImage     ← Linux portable
  tanzania-farm-sim_1.0.0_amd64.deb    ← Debian/Ubuntu
```

## Common issues

| Problem | Fix |
|---------|-----|
| `npm start` shows white screen | Check browser console (F12 in dev mode) — likely a script loading error |
| Build fails "icon not found" | Make sure `build/icon.png` exists (512x512 PNG) |
| Build fails on Windows for Linux | Cross-platform builds need Docker or the target OS — stick to `build:win` on Windows |
| Game is slow in Electron | Same perf as Chrome — make sure hardware acceleration is on (it's on by default) |
| Three.js won't load (offline) | The game loads Three.js from CDN — you need internet. See below to go offline |

## Offline Three.js (recommended for distribution)
Download Three.js locally so the game works without internet:
```bash
curl -o docs/three.min.js https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js
```
Then in `docs/index.html` change:
```html
<script src="https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js"></script>
```
to:
```html
<script src="three.min.js"></script>
```
