# Tech lead follow-up: owner answers, golfers, app (2026-11-19)

Recorded by the PM from the tech lead's hand-back (follow-up to `reviews/art-tech-lead.md`, PR #70). The tech lead made no commits.

## Owner's answers to the 5 questions
1. **Art direction:** "faux retro PS1 with a pixel effect" or "simple clean 3D shapes". Cartoony, **light colours**. Reference: Everybody's Golf (learn the idea, copy no look). **No realistic trees or textures.** He can provide examples.
2. **Phone:** Samsung S25 Ultra, but the game must be "relatively easy to run" → the target stays a **mid-range phone**.
3. **Golfers:** more than one, **later**. Rivals are never shown, only the player's golfer.
4. **Home:** the browser is fine, "just for fun". An app maybe someday.
5. **Placeholder packs** (CC0, Mixamo): fine if the quality fits the cartoony light style.

## Key finding: both directions share one base
"Clean simple 3D" = low-poly models, flat colours, no photo textures. "Faux PS1 + pixels" = the same models drawn at low resolution and scaled up (+ an optional colour / dither filter). So the artist makes **one** set of cartoony, light, flat-colour models, and the pixel effect is a **switch** to compare both looks on the real game (AP8). True PS1 extras (vertex wobble, tiny blurry textures) can come later.

## A. Golfers
| | 3D rigged golfer (PS1 / clean) | 2D sprite golfer (billboard) |
|---|---|---|
| Engine | M, once | S–M |
| Artist, first golfer | 1 low-poly model (~1.5–3k tris PS1 / 3–8k clean), rig, ~10 animations (Mixamo placeholders OK) | ~10 animations × ~12 frames × 1–2 angles = 120–240 drawings |
| Each extra golfer | **S** (new model, same skeleton, reuses all animations) | **L** (every drawing again) |
| Phone cost | very low / low | tiny |
| Side / front flight cameras, flyover | correct from every angle | wrong unless 4–8 angles are drawn, or the golfer is hidden in those views |
| Handedness | mirror, free | flip, free |
| Risk | first rig + animation quality, contact timing | angle problem, floats on slopes, lighting mismatch; clashes with clean 3D |

**Recommendation: a 3D low-poly rigged golfer.** With the pixel effect it already looks sprite-like and retro. First golfer ≈ same cost either way; extra golfers are much cheaper in 3D. **Fine to add later**, if these small things are done first (AP9a):
1. Split "the shot is decided" from "the ball leaves": a game-layer hook so the ball can leave at the animation's contact frame (physics and baselines unchanged; Skip and test hits bypass it).
2. Reserve the golfer's space: a grey mannequin by the ball in the aiming view, so camera checks and "never a blind shot" already include a body.
3. Stance data (where the golfer stands per club / putter), mirrored by handedness.
4. One standard skeleton (Mixamo-compatible bone names) for all golfers: a rule in `docs/ART_STYLE.md`, no code.
5. The base art direction: low-poly, flat colours, cartoony and light.

Can wait: how many golfers, selection menu, reactions, outfits, slopes under the feet, sounds, PS1 vs clean.

## B. An app someday
| Option | Effort | Notes |
|---|---|---|
| Installable web app (PWA: home-screen icon, full screen, offline) | **S** | No store, no fees, works on GitHub Pages |
| Store app wrapping the web game (Capacitor or similar) | **M** first release, then S per update | Icons, safe areas, orientation, pause in background, app storage for saves. Apple $99/year, Google $25 once, store review per update |
| Rewrite in a native engine (Godot, Unity) | **L–XL** | Rewrites the rules and ~300 tests; only for consoles or much heavier graphics |

Keep doing now so it stays easy: no files from other websites, relative paths, touch first, **all saving through one module**, pause when hidden, respect notches / safe areas, players use menus (dev links are fine), sound starts on the first tap, small downloads, only store-safe licences (CC0, Mixamo, OFL fonts) recorded in `assets/CREDITS.md`.

## Budget changes for the cartoony low-poly direction
Target unchanged: iPhone 12 / Pixel 6 class at 60 fps, never below 30 fps on an XR-class phone. The S25 Ultra checks the high-quality setting.

| Item | Before (#70) | Now |
|---|---|---|
| Draw calls per frame | ≤ 150 | ≤ 150 (still the real limit: AP1 stays urgent) |
| Triangles on screen | ≤ 500k | **≤ 300k** (terrain ≤ 200k, coarser far away, 1 m cells near the course) |
| Tree / rock model | ≤ 1.5k tris | **≤ 300–500** |
| Golfer | ≤ 15k tris | **≤ 3k (PS1) / ≤ 8k (clean)** |
| Textures | ≤ 2048², tiling 512–1024 | **mostly none**: flat colours or one small palette texture; PS1 ≤ 256² |
| Graphics memory per hole | ≤ 96 MB | **≤ 64 MB** |
| Download per course | ≤ 15 MB | **≤ 8 MB** |
| Shadows | real-time golfer, ball, flag | a **soft round shadow** under golfer and ball |

## New AP order
AP0 → AP1 → **AP8** (pixel switch, moved up: the tool to choose the direction) → AP2 (glTF loader; KTX2 optional) → AP5 (biome kit format) → AP3 (loader) → AP7 (models) → AP6 (simplified ground: flat / gradient colours, shader stripes and grid) → AP4 (small) → **AP9a** (golfer hooks) → AP9 (golfer).

## Open owner decisions
1. Golfer shape: cartoony big-head ("chibi") or normal proportions?
2. Agree the shared base (low-poly, flat colours, cartoony, light); pick PS1 or clean after trying the AP8 switch.
3. 3D golfer instead of sprites (AP9a assumes it; can be confirmed later).
4. Pixel effect: the game's fixed look, or a player setting?

— PM (recording the tech lead's answers; — Agent: tech-lead)
