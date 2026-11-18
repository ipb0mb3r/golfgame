# QA report: PR #40 "Phase 7: menus (Solo, Practice)" (`dev/M-menus`), tested after merge

| | |
|---|---|
| **Commit tested** | `main` @ `2ba7c26bd1fb9ec465cf8bbc801786284c5a5248` (merge of #40, PR head `79375eb`). The owner merged before QA and asked for this check afterwards |
| **Level** | LIGHT, after the merge (quick check). Time spent: about 15 min |
| **Main viewport** | Phone portrait 390x844 (touch, DPR 3). Also 320x568 and 568x320 for the controls and the pause card |
| **Environment** | Headless Chromium 153 (Playwright 1.63), SwiftShader WebGL, Node v22.23.4, `python3 -m http.server`, vendored Three.js |

## PASS / FAIL / NOT TESTED

| # | Item | Result | Notes |
|---|---|---|---|
| 1 | `node --test` | **PASS** | 286 pass, 0 fail |
| 1 | `baseline.mjs check` / v2 `--dry` / `session-check` | **PASS** | 19/19, 48/48, 12 cycles ok. No gameplay change |
| 1 | `node tools/menu-check.mjs` (dev's tool) | **PASS** | 154/154. Renderer memory back to 0 after each of 6 quits |
| 2 | Landing on the menu | **PASS** | `index.html` opens the main menu (Play · How to Play · Settings). No hole is loaded |
| 2 | Play screen | **PASS** | Solo · "vs AI · Coming soon" (disabled) · Practice |
| 2 | Solo course list | **PASS** | "Prototype 3 · Prototype · 3 holes · par 12" and "Test 9 · Prototype · 9 holes · par 36". `pl-1-2` and `slope-test` hidden, as the owner decided |
| 3 | Solo round from the menu | **PASS** | Prototype 3: hole 1 full intro, then hole 2 compact card. The round is `prototype3`, index 0 → 1 |
| 3 | QA R-1 fix: keys start the hole | **PASS** | **Space** starts hole 1 from the full intro. **Enter** starts hole 2 from the compact card |
| 3 | First-card wind = played wind | **PASS** | Hole 1: card (−1.0628, −1.6254) "4 mph" = played. Hole 2 compact: (−0.0069, −0.929) = played |
| 4 | Pause mid-swing | **PASS** | Pause shows "Prototype 3 · Hole 2 of 3". The meter goes back to `aim`. After Resume: strokes 0 → 0 (no stroke), as the owner decided |
| 4 | Pause mid-flight | **PASS** | Ball frozen while paused (same spot over 0.8 s). It moves on after Resume, and Esc closes the pause card |
| 4 | Restart hole | **PASS** | Ball back on the tee, Stroke 0, card shown. The round keeps hole 1's card (index 1, 1 card) |
| 4 | Quit to menu | **PASS** | Asks "Quit this round? Your score after 1 hole will be lost.". "Keep playing" goes back to the pause card. "Quit round" goes to the main menu with no hole, no HUD, no II button and no summary. The address becomes `index.html` |
| 5 | Practice | **PASS** | 16 items (3 holes + 13 test spots). Hole 3: full intro "Hole 3 · Par 4 · 408 yards", no round, no intro links. Result card: Play again · Menu. Menu → main menu, hole unloaded |
| 6 | Settings | **PASS** | Putt grid Off → "Settings are saved on this device. They apply from the next hole you start.". `localStorage pocketlinks.settings.v1 = {"debug":false,"puttGrid":"off"}`, still Off after a reload. Hole 2's intro has **no grid sentence** with the grid Off (owner fix 1) |
| 7 | Scorecard labels | **PASS** | `?set=test9&seed=42` (9 holes): one "**Out**" group, Tot 36 / 9 / −27, "Total 9 · par 36 · −27". Buttons: Play again · Menu. Menu → main menu |
| 8 | Dev links skip the menu | **PASS** | `?set=test9` → round test9 intro. `?hole=pl-03` and `?scenario=h3-rock-bounce` → single hole. `?debug=1` → hole 1 |
| 9 | 320x568 controls | **PASS** | SWING x 240–308 inside 320 (was cut off). ◀ ▶ ‹ › all on screen, II at the top left. Pause card 144–425 of 568 |
| 9 | 568x320 | **PASS** | Controls fit (SWING 461–556). II at the top centre (229–273). Pause card 46–275 of 320 |
| 10 | Console | **PASS** | No errors or warnings in any run |
| 11 | fps / desktop | **NOT TESTED** | Quick phone check only. Software WebGL |

No screenshots: no bugs were found.

## Notes (not filed as bugs)
1. **`window.__golf` throws while the menu is showing.** Reading `__golf.hole` (or any field that needs a hole) gives `TypeError: Cannot read properties of null (reading 'test')` at `main.js:299`. Players never see this. Test tools that read `__golf` right after loading `index.html` must first check that a game is running. Before #40 a hole was always loaded.
2. **Menu on a Practice result goes to the main menu, not the Practice list.** Practising several holes takes 2 extra taps each time (Play → Practice).
3. **After quitting from a seeded link**, the address keeps `?seed=42` (only `set`/`hole`/`scenario` are dropped), so the next Solo round from the menu uses seed 42 again.

## Verdict
**OK as merged**: every checked Phase 7 path works on phone portrait:
- menus, the Solo round and Practice;
- pause, restart and quit;
- settings and the scorecard labels;
- dev links and small screens.

The QA R-1 fix, the card-wind fix and both owner fixes are confirmed, gameplay is unchanged, and there are no console errors. The three notes are for the backlog.
