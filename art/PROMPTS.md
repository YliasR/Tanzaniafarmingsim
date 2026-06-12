# AI Image Generation Prompts — Tanzania Farm Sim

Prompts for Nano Banana Pro (Gemini image gen). Save each result with the
**exact filename** listed, in the folder shown, then ping Claude to wire
them into the game.

**Folders**
- `docs/img/gen/` → in-game textures (shipped with the game)
- `art/` → marketing / icon source files (NOT shipped)

**Heads-up:** itch.io requires tagging games that contain AI-generated
assets (account settings → AI generation disclosure). Tag it once any of
these go live.

**Style anchor** — paste this at the end of every prompt so everything
matches the game:

> Style: flat-shaded low-poly video game art, stylized and painterly, NOT
> photorealistic. Warm savanna palette: sunset orange #ff9d3e, golden
> amber #ffb648, cream #ffeed2, deep earth brown #2a160c, dusty sage
> green. Clean simple shapes, soft gradients, no noise, no watermark.

---

## 1. Skybox (biggest visual win)

**File:** `docs/img/gen/skybox-day.png` — aspect ratio **2:1**, ideally 4096×2048

> A seamless 360-degree equirectangular sky panorama for a video game
> skybox, 2:1 aspect ratio. Clear East African daytime sky: soft blue
> zenith fading to a warm pale-cream haze band at the horizon, scattered
> flat-bottomed cumulus clouds drifting at mid height, very distant
> purple-grey hills as a thin silhouette line exactly at the horizon.
> NO sun disc, NO lens flare (the game renders its own sun). The left
> and right edges must tile seamlessly into each other. Below the
> horizon line, plain warm sandy beige. [style anchor]

*Tip: after generating, check the left/right seam by scrolling the image
horizontally — regenerate or ask it to "fix the horizontal seam" if it
jumps. The game tints this texture through the day/night cycle, so keep
it neutral daylight.*

---

## 2. Shop & market sign boards

**File:** `docs/img/gen/sign-duka.png` — aspect ratio ~10:3 (e.g. 1024×308)

> A hand-painted wooden shop sign for a rural Tanzanian village kiosk.
> The word "DUKA" in bold cheerful hand-painted white letters with a
> slight wobble, on a weathered green painted wood board with visible
> plank seams, paint chips at the edges, small painted maize cob and
> watering can doodles in the corners. Front-facing, fills the frame
> completely, no background. [style anchor]

**File:** `docs/img/gen/sign-soko.png` — same ratio

> A hand-painted wooden market sign for an open-air Tanzanian produce
> market. The word "SOKO" in bold hand-painted cream letters on a
> weathered burnt-orange wood board, plank seams, painted basket and
> fruit doodles in the corners, paint wear at edges. Front-facing,
> fills the frame completely, no background. [style anchor]

**File:** `docs/img/gen/sign-forsale.png` — aspect ratio 2:1 (e.g. 1024×512)

> A rustic hand-painted "FOR SALE" land sign on pale cream board with a
> dark brown hand-drawn border, bold dark brown letters reading
> "FOR SALE" on the top half, empty space on the lower half (the game
> overlays plot details there). Slightly weathered, front-facing, fills
> the frame, no background. [style anchor]

---

## 3. UI kanga trim strip

**File:** `docs/img/gen/kanga-strip.png` — wide strip, e.g. 1024×64, must tile horizontally

> A seamless horizontally-tileable East African kanga / kitenge fabric
> border pattern strip. Repeating geometric motifs: triangles, diamonds
> and dots in burnt orange, golden amber, deep green and cream on a dark
> brown base. Flat 2D textile print look, crisp edges, the left and
> right edges must tile perfectly. [style anchor]

---

## 4. Title screen backdrop (optional — CSS scene already exists)

**File:** `docs/img/gen/menu-backdrop.png` — 16:9, e.g. 2560×1440

> A painterly video game title-screen backdrop of the Tanzanian savanna
> at dusk. Wide landscape: gradient sky from deep violet at the top
> through magenta to glowing sunset orange at the horizon, a large soft
> sun low on the left, silhouetted Mount Kilimanjaro with a pale snow
> cap on the right horizon, two flat-topped acacia trees silhouetted in
> the foreground corners, a dark ground band at the bottom, a few early
> stars at the top. Leave the center of the image calm and empty for
> menu buttons. [style anchor]

---

## 5. itch.io page art (marketing — goes in `art/`)

**File:** `art/itch-cover.png` — exactly **630×500**

> A video game cover for "Tanzania Farm Sim", a cozy low-poly farming
> game. A small Tanzanian farmstead at golden hour: tin-roofed house,
> neat green crop rows in raised soil beds, a chicken and a cow, an
> acacia tree, Kilimanjaro on the horizon, big warm sun. Inviting, cozy
> indie-game energy, room at the top for a title logo. [style anchor]

**File:** `art/itch-banner.png` — wide, e.g. 1920×620

> A wide panoramic banner of a low-poly Tanzanian farm at sunset: crop
> beds with maize and sorghum in the foreground, farmer silhouette
> watering plants, distant market stall and cell tower, giraffes far
> away on the savanna, Kilimanjaro on the horizon, warm orange sky with
> drifting clouds. Cozy, calm, spacious composition. [style anchor]

---

## 6. App icon source

**File:** `art/icon-source.png` — square, 1024×1024

> A minimal flat video game app icon: a single flat-topped acacia tree
> silhouette in deep brown centered in front of a large warm sun disc,
> golden amber sky background, one thin cream horizon line, subtle
> rounded-square framing. Bold simple shapes that stay readable at
> 16×16 pixels. No text. [style anchor]

---

## What gets wired where (once you drop the files in)

| File | Replaces |
|---|---|
| skybox-day.png | `docs/img/skybox.webp` (sky dome texture in scene.js) |
| sign-duka/soko.png | canvas-rendered DUKA/SOKO signs in scene.js |
| sign-forsale.png | canvas-rendered FOR SALE boards in land.js |
| kanga-strip.png | CSS `--kanga` gradient trim in style.css |
| menu-backdrop.png | (optional) CSS title scene in style.css |
| itch-cover/banner.png | itch.io page (manual upload) |
| icon-source.png | `build/icon.png` / `icon.ico` (needs resize pass) |

Skip AI textures for terrain, walls, and animals — the flat-shaded
low-poly look is the art style, and photo-ish textures would fight it.
