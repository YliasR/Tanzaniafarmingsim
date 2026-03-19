# Electron + Three.js: CSP Gotchas

Things that broke and took ages to debug. Keep this for future projects.

## The Problem

GLB models loaded fine in browser (live server / GitHub Pages) but some models were invisible in the Electron build. No errors unless you knew where to look.

## What Happened

1. **`file://` blocks XHR/fetch** — Three.js GLTFLoader uses XHR to load `.glb` files. Modern Chromium (used by Electron) blocks `fetch()`/`XHR` from `file://` pages to other `file://` URLs.
   **Fix:** Use a custom protocol (`game://`) with `protocol.registerSchemesAsPrivileged` + `protocol.handle` that serves files via `fs.readFileSync`.

2. **CSP blocks `blob:` URLs** — GLTFLoader creates `blob:` URLs for embedded textures inside GLB files. If `blob:` isn't in `connect-src`, models **with textures fail silently** while models **without textures load fine**. This is the sneaky one — you'll think it's a per-model issue, not a CSP issue.
   **Fix:** Add `blob:` to `connect-src` in the CSP.

3. **CSP blocks CDN scripts** — If loading Three.js / GLTFLoader from a CDN (e.g. `cdn.jsdelivr.net`), that domain must be in `default-src` or `script-src`. If it's missing, the GLTFLoader script doesn't load, `THREE.GLTFLoader` is undefined, and ALL models silently fall back to primitive geometry.
   **Fix:** Add all CDN domains to the CSP.

## Working CSP

```
default-src 'self' 'unsafe-inline' 'unsafe-eval' https://cdnjs.cloudflare.com https://cdn.jsdelivr.net;
connect-src 'self' blob:;
img-src 'self' data: blob:;
```

## Key Takeaway

**Always test the Electron build, not just the browser.** The browser has none of these restrictions.
