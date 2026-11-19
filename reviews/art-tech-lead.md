# Tech lead: art and engine feasibility (consult before the first art pass)

One-off consult for the owner, not the gate B review. Read: AGENTS.md, DESIGN (§5, §9, §11 "Stay on Three.js", "Future direction"), GENRE_NOTES, `index.html`, `vendor/`, `src/game/` (scene, coursePainter, props, camera, session, main, menus), `src/holes/` (mtn-course, hole2, sets). Numbers below were measured from the hole data with a small Node script (not on a real phone).

## Summary (plain language)
1. **Everything you asked for is possible with Three.js and a static site.** Nothing here needs a new engine.
2. The look today is "painted": each hole is one big picture stretched over the ground, and trees and rocks are simple shapes. That's why it looks basic, and it's also the first thing to change.
3. **Real textures and 3D models (Q1):** yes, after a medium engine job. The ground needs a new "material" (how a surface is drawn) that mixes repeating grass, sand and rock pictures.
4. **An animated golfer (Q2):** yes, a medium job. The swing timing stays exactly as today; the ball just leaves at the moment the club hits it in the animation.
5. **Menu sprites (Q3):** yes, small. The menus are web pages (HTML/CSS), which handle sprites, icons and fonts well.
6. **Retro look (Q4):** yes. Pixelation is almost free and even makes phones faster; outlines and CRT effects cost more.
7. **Biome kits (Q5):** half there. Sky, fog and light are already data per hole, but colours and tree shapes are fixed in the engine code. That needs a "biome kit" file format first.
8. **Recommendation (Q6): stay on Three.js, no build step for the site**, but add one offline "asset prep" tool (compresses models and textures before they are committed).
9. Before the Artist starts: 8 engine tasks (A-tasks below), most importantly the **phone budget** and the **biome kit format**.
10. Today's mountain holes are already near the phone limit (up to ~440 objects drawn separately, up to 500k triangles), so performance work comes before the art.

## Words used in this report
| Word | Meaning |
|---|---|
| Texture | A picture wrapped onto a 3D surface (grass, bark) |
| Tiling texture | A small picture that repeats seamlessly across a big area |
| Material / shader | The recipe the graphics card uses to colour a surface; a shader is that recipe as a small program |
| Triangle (tri) | The basic piece every 3D model is made of; more triangles = more detail = more work |
| Draw call | One "draw this object" order to the graphics card; phones slow down with too many, even small ones |
| Instancing | Drawing 500 copies of one tree in a single draw call |
| glTF / GLB | The standard 3D model file for the web (GLB = one binary file); Blender exports it |
| KTX2 / Basis | A compressed texture format the graphics card reads directly: ~4-8x less memory than PNG/JPG |
| Draco / Meshopt | Ways to shrink model files for download |
| Rig / AnimationMixer | A rig is the skeleton inside a character; AnimationMixer is the Three.js part that plays its animations |
| Post-processing | Effects applied to the finished picture (pixelation, outlines, colour filters) |
| Addon | Optional Three.js parts (model loader, effects) that live outside the main file |
| Build step | A tool that packs the code before publishing; we don't have one, files go online as written |
| Import map | The list in `index.html` that tells the browser where `three` lives |
| LOD | "Level of detail": a cheaper version of a model used when it's far away |

## What the engine does today (the starting point)
- **Ground:** one triangle grid per hole from `heightAt` (1 m cells, 0.5 m on the green): **165k-506k triangles** (mtn-09 is the biggest).
- **Ground look:** `coursePainter.js` paints one canvas per hole from `surfaceAt` at 4-6 pixels per metre, flat colours plus noise, stretched over the grid. **3-14 MB of graphics memory per hole.** Close up it is blurry (one pixel = 17-25 cm). Simple `MeshLambertMaterial` (cheap, no shine).
- **Trees and rocks in play:** 2 separate meshes per tree with a copied material each (`scene.js addObstacles`). Decoration trees outside OB are already instanced (good). OB stakes, clouds (4 spheres each) and hills are separate meshes too.
- **Objects drawn separately (rough count before culling):** pl-01 ~160, mtn holes **200-440** (mtn-07: 265 for trees, 82 stakes, 56 cloud parts). A mid-range phone is comfortable under ~150.
- **Colours and shapes hard-coded in engine code:** trunk, leaf, rock, ground plane, hill and water colours (`scene.js`), surface colours (`coursePainter.js COLORS`), cone trees, sphere clouds. Per-hole data: sky colour, fog, sun, light strength, paint resolution, tree counts.
- **Three.js:** only `three.module.js` 0.160 is vendored (1.27 MB, ~300 KB as GitHub Pages sends it compressed). **No addons yet** (no glTF loader, no KTX2, no effects). Everything is built from code; no file is ever loaded.
- **Rendering:** one line, `renderSession()` in `main.js`. That's the natural hook for post-processing. No shadows, no tone mapping.
- **Load:** X12 says mtn-09 takes ~5.6 s headless to "Tee off", mostly the painter and the terrain mesh (X13 open).

## The six answers
| # | Question | Possible today? | Size | Phone cost | Main risk |
|---|---|---|---|---|---|
| 1 | Real textures, detailed models, richer terrain | **Yes with work** | M (ground material) + M (model loading) | +2-8 MB download per course, more GPU per pixel | Memory on older iPhones; the Artist making assets too big |
| 2 | Animated golfer hitting the ball | **Yes with work** | M | Small: 1 character ~1-3 MB, a few draw calls | Swing feel: the ball must leave on the click's result, not drift from it |
| 3 | Menu sprites, icons, fonts | **Yes** | S | Tiny (100-500 KB of images and fonts) | Text in pictures that can't be translated or resized |
| 4 | Retro post-processing | **Yes** (pixelation) / **Yes with work** (dither, palette, CRT, outlines, wobble) | S to M | Pixelation: faster. Dither/palette/CRT: small. Outlines: medium-high | Readability: the slope grid, aim dots and putting lines must stay clear |
| 5 | Modular biome kits | **Yes with work** | M | None by itself | Mixing looks and physics: a tree model must keep the size of its collider |
| 6 | Stay on Three.js + no build step? | **Yes, recommended** | - | Three.js is one of the lightest options | Doing the engine jobs ourselves (others have them built in) |

### 1. Textures, models, richer terrain
- **Ground:** replace the painted picture with a **surface mix**: the painter still draws the hole map, but as a *mask* ("here is fairway, here is sand"), and a new terrain shader repeats 4-6 tiling textures (grass, fairway, green, sand, rock, dirt) by that mask, plus mowing stripes and the putting grid drawn by the shader. Crisp up close at any resolution; less memory than today's big canvas. Size **M** (A4).
- **Models:** add the vendored `GLTFLoader` addon and load `.glb` files from `assets/`. Trees and rocks are drawn instanced (one draw call per model type), with a cheap far version (LOD) for the forest beyond OB. Size **M** (A1, A3).
- **Textures:** commit **KTX2** files (with the Basis transcoder, a ~200 KB file vendored with Three.js). A 1024x1024 texture is ~4 MB in memory as PNG/JPG, ~0.7-1 MB as KTX2. Without a build step we can't convert at publish time, so the asset prep tool converts before committing (A2).
- **Richer terrain:** the shape stays `heightAt` (the physics depends on it, DESIGN §5). Detail comes from textures and props, not more triangles; the grid is already dense. Cliffs and rock walls are steep terrain plus rock models placed on top.
- **Static site limits:** GitHub Pages refuses files over 100 MB and asks sites to stay under 1 GB; that's far above what we need. The real limit is phone download and memory (budget below). Each course should load only its own kit, with a loading screen (DESIGN "Future direction").

### 2. A golfer with a swing animation
- **How:** a rigged `.glb` character (idle, address, backswing, downswing/hit, follow-through, putt, 3-4 reactions: happy, sad, "nooo", holed) played with Three.js `AnimationMixer`. Built in, no extra library.
- **Sync with the 3-click swing:** the meter stays the boss. Click 1 starts the backswing (paced to the meter), click 2 (power) holds the top, click 3 plays a short downswing (~0.2 s). The shot is still decided **at the click** (S16, real click time, deterministic physics unchanged); the game layer only waits until the animation's "contact" moment to show the ball leaving. ⏩ Skip and `testHit` ignore the wait, so baselines don't move. Size **M** (A6).
- **Where assets come from:** (a) **Mixamo** (free with an Adobe account, characters and animations usable in games; a golf swing exists but needs cleaning in Blender), (b) CC0 packs (e.g. Quaternius, Kenney: low-poly characters and props, free for any use), (c) made by the Artist in Blender. For an original look, (c) on a Mixamo-style rig is the usual path. Record every licence in `assets/CREDITS.md`.
- **Camera:** a right-handed golfer stands on the left of the ball, so the aiming camera moves a little right/up so he never hides the aim line or the landing marker ("no blind shots"). Handedness (BC) mirrors him. Flight cameras are unchanged. The minimap and the aim warning don't care.
- **Cost:** one character ~10-15k triangles, 1-2 materials, one 1024 texture: fine on phones. 5 rivals shown at once on the leaderboard would be pictures (portraits), not 3D.

### 3. Menu sprites, icons, fonts
- **Keep the menus in HTML/CSS.** They're sharp at any screen size, easy to tap, and already tested (`menu-check.mjs`). Canvas menus would mean rebuilding text, taps and scrolling ourselves.
- **Animated sprites:** a CSS sprite sheet (one PNG/WebP strip, animated with `steps()`) or an animated WebP; both work on every supported browser, no code library.
- **Icons:** SVG (sharp, tiny, colour changeable from CSS). **Fonts:** self-hosted WOFF2 files in `assets/fonts/` (no CDN, as for Three.js), 20-60 KB each, OFL licence (e.g. Google Fonts files). The HUD today uses system fonts.
- **What the UI designer needs from the Artist:** a palette (hex values), icons as SVG, sprite sheets with frame size, frame count and speed, at 2x for phone screens, and a font choice with its licence. Size **S** (A7).

### 4. Retro post-processing
| Look | How | Phone cost | Verdict |
|---|---|---|---|
| **Pixelation / low-res** | Draw the 3D at e.g. 1/3 resolution, scale up with CSS `image-rendering: pixelated`; the HUD stays sharp | **Cheaper than today** (fewer pixels) | Best value; easy to tune live with `?tune=` |
| Colour palette limit | One full-screen pass mapping colours to the kit's palette | Low (one pass) | Cheap, strong style |
| Dithering (ordered, Bayer) | Same pass as the palette | Low | Cheap; pairs with pixelation |
| CRT / scanlines | Full-screen pass, lines + slight blur | Low at low-res, medium at full | Optional setting, can tire eyes on small screens |
| PS1 vertex wobble / snapping | Small change in each material's shader | Low | Hurts readability of greens and the aim line: menus or scenery only |
| Toon shading (flat bands of light) | Material choice per kit | Low | Cheap, good for an arcade look |
| Outlines | Edge detection pass (needs an extra depth/normal render) or "inverted hull" on selected models | **Medium-high** (pass) / low (hull) | Use hulls on the golfer, ball, flag only |
| Bloom, depth of field, ambient occlusion | Extra passes at full res | **High** | Avoid on phones, desktop-only setting |
- **How it plugs in:** a single post-processing hook replaces `renderSession()` (A5), with the effect list coming from the biome kit (a "post preset") and a quality setting. `EffectComposer` (an addon) works; for 1-2 passes a small custom pass is lighter. Note: pixelation and effects turn off the built-in edge smoothing (MSAA), which doesn't matter at low-res.
- **Rule for every look:** the putting grid, aim dots, landing marker and slope must read at phone size. QA should check `h2-green-step` and a mountain green for every preset.

### 5. Modular biome kits
- **Today:** per hole, `scenery` has sky, fog, sun, light, tree counts, hills and clouds (and the mountain holes share one `SCENERY`). That's a good start. Missing: colours, textures, models, props and post-processing are fixed in `scene.js` / `coursePainter.js`; a course (`sets.js`) has no look of its own.
- **Proposed shape (A3):** a kit is a data file made of swappable parts, which the owner can mix:
  `biome: { palette: 'alpine', ground: 'grass-mtn', trees: 'pines', props: 'mtn-rocks', sky: 'clear-day', post: 'none' }`
  - **palette**: the colours for every surface id (fairway, green, sand...) and sky/fog
  - **ground**: a tiling texture per surface id + stripe/grid style
  - **trees / props**: models with their size, and which obstacle type they can stand for
  - **sky / weather**: sky colours or a sky picture, fog, sun, clouds, distant hills
  - **post**: the retro preset
  A course sets a default biome, a hole may override a part ("this hole uses `sky: 'sunset'`").
- **Physics stays out of the kit.** Surfaces keep their ids and physics in `surfaces.js`; colliders stay in hole data. A model is **scaled to fit its collider** (trunk radius, canopy size, boulder radius), so the ball still hits what the player sees (K5). New surface types (D5) remain engine work.
- **Checked like holes:** `validateKit` in core (node --test) catches a missing texture, a wrong surface id or a model over budget, so the Artist gets an error message instead of a broken page. Then a new kit = new files in `assets/biomes/<id>/` plus one data file, no engine change.

### 6. Stay on Three.js and no build step?
**Recommendation: yes, stay.** Add an offline **asset prep tool** (A2) and keep the site build-free.
| Option | For | Against |
|---|---|---|
| **Three.js, no build (today)** | Lightest download, all code already works and is tested, phones start fast, every agent knows it | We build terrain material, kit loader, post hook ourselves (~8 tasks below) |
| Three.js + build step (e.g. Vite) | Smaller code download, easier addons | Adds a tool to install and a publish step; not needed until the code grows a lot. The same gain comes from vendoring `three.module.min.js` |
| Babylon.js | Effects, loaders, audio, inspector built in | Bigger download, rewrite all of `src/game/` (~2,300 lines), no gain we can't add |
| PlayCanvas | Visual editor an artist would like | Built around its online editor; same rewrite |
| Godot web export | Real editor, animation tools | 30-40 MB download, slow start on phones, the core rules must be rewritten in GDScript and all tests and baselines lost |
| Unity WebGL | Huge asset store | Heavy on phone browsers, long loading, licence, same rewrite |
The core rules (`src/core/`, ~300 tests, the baselines) are plain JS and never touch the engine. That's the most valuable part, and only a JavaScript engine keeps it.

**What would change my mind:** (1) the game moves to the app stores or consoles as the main target (then Godot); (2) the Artist needs to place everything by hand in a visual editor instead of data and the engine work slows him down for months (then a PlayCanvas test); (3) after A0-A5 a typical phone can't hold 30 fps on a real course within the budget. DESIGN §11 already says how to test: one hole + character + sound in the other engine.

## Engine work before the Artist and UI designer produce assets
Suggested IDs. **Note for the PM:** "A1"-"A8" are already used for Gate A findings and fix passes in TASKS.md, so I suggest **AP** (art pipeline); rename if you prefer.
| ID | Task | Size | Why first |
|---|---|---|---|
| **AP0** | **Phone budget + measuring:** expose draw calls/triangles/texture memory in the debug overlay and `window.__golf`; a `tools/perf-check.mjs` that loads each hole and fails over budget; one fps check on the owner's phone | S | Everyone needs the same yardstick before making assets |
| **AP1** | **Fewer draw calls today:** instance in-play trees, rocks and OB stakes; merge cloud puffs; share materials (also helps X13) | S-M | Mountain holes are at 200-440 objects before any art |
| **AP2** | **Upgrade Three.js (X6) and vendor the addons** (glTF loader, KTX2 loader + Basis transcoder, Meshopt decoder, minified build) under `vendor/`, with `three/addons/` in the import map | S | Addons must match the Three.js version; do the upgrade once, before assets depend on it |
| **AP3** | **Asset loader + loading screen:** load a course's files in the background with progress, cache them across holes of the round, free them at the end (session-check must still pass); a clear message when a file is missing | M | Today nothing is loaded from files |
| **AP4** | **Asset prep tool** (`tools/`, dev/Artist only, never at publish): converts PNG → KTX2, shrinks GLB (Meshopt), checks sizes against the budget | S-M | No build step means compressing before committing |
| **AP5** | **Biome kit format + `validateKit`:** data shape above, parts mixable per course and per hole, today's mountain look rewritten as the first kit (`mtn-default`) so nothing changes on screen | M | The Artist delivers kits without engine changes |
| **AP6** | **Terrain material:** surface mask + tiling textures per surface, stripes and putting grid in the shader, one quality level for slow phones | M | The biggest visual gain; replaces the blurry painted canvas |
| **AP7** | **Models for obstacles and scenery:** a kit model replaces the cone/sphere/cylinder, scaled to its collider; instanced; far LOD for the forest | M | Trees and rocks are the most visible objects |
| **AP8** | **Post-processing hook + presets:** replaces `renderSession()`, presets from the kit, first preset = pixelation (render scale tunable), a Settings switch | S-M | Lets the owner try retro looks early with the current art |
| AP9 | Character: load a rigged GLB, AnimationMixer, contact-frame launch delay (game layer only), aiming camera offset, handedness mirror | M | After AP3; can start with a free placeholder character |
| AP10 | UI assets: self-hosted fonts, SVG icon set, sprite-sheet CSS helper; the UI designer's spec decides the rest (Phase U) | S | Small, can run with Phase U |
Order: AP0 → AP1 → AP2 → AP3/AP4 → AP5 → AP6/AP7 → AP8 (AP8 can come earlier as a quick experiment). AP9 and AP10 when the owner wants them. Sound (Web Audio) fits the same loader (AP3).

## Proposed phone performance budget (for the Artist)
Target: **60 fps on a mid-range phone from ~2021 (iPhone 12 / Pixel 6 class), never below 30 fps on a ~2019 phone (iPhone XR class)** with `DPR_CAP:1`. To be confirmed by AP0 on the owner's phone.
| Item | Budget | Today (worst hole) |
|---|---|---|
| Draw calls per frame (from the tee view) | **≤ 150** (≤ 100 for low quality) | ~200-440 objects (mtn-07) |
| Triangles on screen | **≤ 500k** total, terrain ≤ 300k | terrain alone up to 506k (mtn-09) |
| Graphics memory (textures + models) per hole | **≤ 96 MB** (older iPhones kill a tab at a few hundred MB for the whole page) | 3-14 MB painted ground |
| Any single texture | **≤ 2048x2048**, KTX2; tiling ground textures 512 or 1024 | canvas up to 1056x2320 |
| Tree / rock model (instanced) | ≤ 1,500 tris near, ≤ 200 far (or a flat picture); ≤ 8 tree/rock types per kit | 1 cone (7 sides) |
| Golfer | ≤ 15k tris, ≤ 2 materials, one 1024 texture, ≤ 60 bones, all animations in one GLB ≤ 3 MB | - |
| Download: first visit to the menu | **≤ 3 MB** (code + menu art + fonts) | ~0.5 MB |
| Download: one course kit (all holes) | **≤ 15 MB**, ≤ 3 MB extra for any one hole | 0 (all built from code) |
| Time to "Tee off" on a phone | **≤ 4 s** first hole, ≤ 2 s next holes | mtn-09 5.6 s headless (X13) |
| Lights and shadows | 1 sun + 1 sky light; real-time shadows only for the golfer, ball and flag (small area); tree shadows painted into the ground | none |
| Post-processing | ≤ 1 full-screen pass on phones (pixelation is free) | none |
| Transparent leaves (cut-out) | Allowed, but they cost the most on phones: prefer solid low-poly canopies | solid |

## Questions for the owner
1. **Art direction:** realistic-ish (Hot Shots), stylised low-poly, or retro (PS1/pixel)? It changes the budget a lot: retro is the cheapest, realistic textures the heaviest.
2. **Your phone:** which model? The budget is set against it (AP0).
3. **Golfer:** one golfer, or several to choose from? Do rivals ever appear in 3D, or only as portraits?
4. **Store or web?** Is the browser (GitHub Pages) the final home, or could it become an app later? (My Three.js recommendation assumes the browser.)
5. **Paid assets:** OK to use free CC0 packs and Mixamo as placeholders, or must everything be made by us?

— Agent: tech-lead
