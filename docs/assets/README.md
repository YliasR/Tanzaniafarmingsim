# 3D Assets Layout

This folder is for runtime game assets loaded by files in `docs/`.

## Current structure

- `models/trees/acacia/`
- `models/trees/baobab/`
- `models/trees/misc/` (extra tree/foliage packs)
- `models/animals/chicken/`
- `models/animals/goat/`
- `models/animals/cow/`
- `models/animals/giraffe/`
- `models/animals/elephant/`
- `textures/`
- `materials/`
- `animations/`

## Supported model formats (Three.js)

With the current setup (`three.min.js` only), model loaders are not yet included.
To load external 3D files, add the matching loader script(s).

Common supported formats after adding loaders:

- `.glb` / `.gltf` (GLTFLoader, recommended)
- `.fbx` (FBXLoader)
- `.obj` + `.mtl` (OBJLoader + MTLLoader)
- `.dae` (ColladaLoader)
- `.stl` (STLLoader)

## Recommendation

Use `.glb` for most assets (single file, fast loading, animation/material friendly).
Keep textures in `textures/` and shared clips in `animations/` when possible.

## Wired model paths (current code)

These are now loaded automatically in-game when present:

- `models/animals/chicken/Chicken.glb`
- `models/animals/goat/Goat.glb`
- `models/animals/cow/Cow.glb`
- `models/animals/giraffe/Giraffe.glb`
- `models/animals/elephant/Elephant.glb`

Trees are model-first with fallback candidates:

- Acacia tries `models/trees/acacia/Acacia.glb`, then misc tree packs.
- Baobab tries `models/trees/baobab/Baobab.glb`, then misc tree packs.

If a file is missing or fails to load, the game falls back to procedural meshes.

First-person weapon model:

- `models/Sniper Rifle.glb` is now used for the hunting viewmodel when present.

Animation support:

- If a loaded `.glb` contains animation clips, the game now creates an `AnimationMixer` and plays a suitable clip (`walk`/`run`/`idle` match, otherwise first clip).
