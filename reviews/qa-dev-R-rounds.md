# QA report: PR #38 "Phase 6: rounds and scoring (any-length courses)" (`dev/R-rounds`)

| | |
|---|---|
| **Commit tested** | `6b1b41d6709ae98fca90fae5d001c4d254e7cdbc` (push 3: the compact hole card). I started on `308e690`; push 3 landed during the run, so I re-ran everything on `6b1b41d` except the 20-hole scorecard check. That code (`roundUi.js`, the scorecard CSS) is unchanged by push 3 |
| **Level** | FULL (budget 30 min). Time spent: about 30 min |
| **Main viewport** | Phone portrait 390x844 (touch, DPR 3). Also 844x390 (hole card) and 568x320 / 320x640 (20-hole scorecard) |
| **Environment** | Headless Chromium 153 (Playwright 1.63), SwiftShader WebGL, Node v22.23.4, `python3 -m http.server`, vendored Three.js |

## PASS / FAIL / NOT TESTED

| # | Item | Result | Notes |
|---|---|---|---|
| 1 | `node --test` | **PASS** | 277 pass, 0 fail |
| 1 | `node tools/baseline.mjs check`, v2 `--dry`, `session-check` | **PASS** | 19/19, 48/48, 12 cycles ok. No physics change |
| 2 | Full `?set=test9&seed=42` round, phone portrait | **PASS** | 9 holes played one after another in one page, no reload. Planned: hole 2 **picked up** (12 tiny shots), hole 3 **OB** off the tee, hole 4 into the **water**, the rest at the ⚑ |
| 2 | No leftovers between holes | **PASS** | Holes 2, 5 and 9 of the round compared with a fresh `?hole=<id>&seed=<that hole's seed>` load after Tee off: same ball, wind, wind text, meter, Skip and flash state, and same HUD apart from the "HOLE n/9" title. Rendered screenshots differ by **0.13–0.14%** of pixels (the title), with no trail or extra trees. While the summary card sat for 2.6 s, nothing changed except the previous flash fading out |
| 2 | Summary card after each hole | **PASS** | All 9 match what was played. Examples: "Picked up · You reached the 12-stroke limit on this par 5, so you picked up. It counts as 12. · Test 9: +6 after 2 of 9 holes · 14 strokes". "Double bogey … Includes 1 penalty stroke. · +8 after 3 of 9 · 20 strokes". The button reads "Next hole: Hole N · par P", then "See the scorecard" after hole 9 |
| 2 | Final scorecard | **PASS (with note)** | Par 3 5 4 3 5 4 3 5 4 = **36**. Score 2 **12** 6 5 4 3 3 4 4 = **43**. ± −1 +7 +2 +2 −1 −1 E −1 E = **+7**. "Total 43 · par 36 · +7". "n = picked up (1 hole) · 2 penalty strokes". The picked-up 12 is marked, and penalty holes are boxed by result. No cell overflows, no sideways scroll at 390. **A 9-hole round shows one table titled "Holes 1–9" with a "Tot" column, not "Front 9" + subtotal**: that's the design for a one-group round. 18+ holes get "Front 9 / Back 9 / Holes 19–20" with "Sub" (see the 20-hole row) |
| 3 | Totals with a picked-up hole and a penalty | **PASS** | As above: the pick-up counts as 12, and both penalties are included in 5 and 6 |
| 3 | Personal best saved and shown | **PASS** | 1st round: "First round on this course: that's your personal best." `localStorage pocketlinks.best.v1.test9` = `{"strokes":43,"toPar":7,"seed":42,…}`. 2nd round (9 holes-in-one): "**New personal best! (was +7)**", saved as 9 / −27. Per course: `prototype3` showed its own "first round" message |
| 3 | Play again = fresh round | **PASS** | Scorecard hidden, round index 0, **cards []**, totals 0, hole 1 with the **full intro**, "HOLE 1/9", Stroke 0, ball on the tee |
| 3 | `&seed=42` twice = same winds | **PASS** | Round seed 42 both times. The 9 hole seeds and tee-off winds are identical across the two rounds, and all 9 hole seeds differ (the same hole 3 times gets 3 winds). Play again with `?seed=42` gives the same hole 1 seed again. Without `?seed`, Play again gives a new round seed (3955731090 → 3955738373) |
| 4 | Full intro on hole 1 | **PASS** | Hole 1 of a round: "Pocket Links · Hole 1 of 9 · Par 3 · 166 yards · Aim with ◀ ▶ …". Still open after 3 s (no auto-dismiss) |
| 4 | Compact hole card on holes 2+ | **PASS (with note)** | "Hole 2 of 9 · Par 5 · 491 yd · A long, rolling par 5 with a pond on the left and a two-level green. · Tap to tee off". It closes by itself (from the tap on "Next hole" to `aim`: 3.2 s, including about 0.7 s of hole loading). A tap on the card starts at once: Stroke 0, meter `aim`, no swing. A shot hit right after the tap is still in flight when the 2.5 s timer fires, and nothing happens. Fits in landscape 844x390 (card x 242–602, y 118–272). **Space and Enter don't close it** (R-1) |
| 4 | `?hole=` and `?scenario=` play a single hole | **PASS** | `?hole=pl-02`, `?hole=pl-03&seed=1` and `?scenario=h1-green`: `__golf.round` is null, the full intro stays (3 s), and the old result card with its "Next: Hole 3 →" / "← Back to Hole 1" links appears. No summary card. `?set=nope` → "There is no course "nope", so you're playing Hole 1 on its own." plus a console warning |
| 5 | Hole 3 tee shows "plays 408 yd" | **PASS** | To pin "**310 yd · plays 408 yd**" in a round (holes 3, 6, 9) and in `?hole=pl-03`. The compact card reads "Par 4 · 310 yd · plays 408 yd". The single-hole intro says 408 yards |
| 6 | SHOULD: 20-hole scorecard on a small phone | **PASS** | Using a 20-hole test set (`pl-01..03` repeated) injected into `sets.js` in my browser only, not committed: "Front 9 · Sub 36/10/−26", "Back 9 · Sub 36/10/−26", "Holes 19–20 · Sub 8/2/−6", "Total 22 · par 80 · −58". **568x320**: tables 482 px wide in a 568 px screen, 0 cells overflow, no sideways scroll, the card scrolls vertically, and Play again / Menu stay on screen (sticky). Also fine at 390x844 and 320x640 |
| 7 | Console | **PASS** | No errors. The only warning is for `?set=nope` |
| 8 | fps | **NOT TESTED** | Software WebGL |

Screenshots: `R-rounds/scorecard-test9-390x844.png` (the final card of the scripted round), `R-rounds/scorecard-qa20-568x320.png` (20 holes on a small landscape phone).

## Bugs

**R-1. The compact hole card ignores Space and Enter.** Low.
- Steps: `?set=prototype3` on a computer, finish hole 1, press "Next hole", then press Space (or Enter) on the compact card.
- Expected: the keyboard can start the hole like a tap. The card says "Tap to tee off", and Space and Enter are the game's keys everywhere else (swing, skip).
- Actual: nothing happens until the 2.5 s timer starts the hole. The arrow keys don't start it either. Touch and mouse (pointerdown) work.

## Feel notes for the game designer
1. **The round rhythm is good:** card, auto start, play, summary, next. Each hole start costs about 3 s on my slow renderer, mostly the card.
2. **A 9-hole round's card is titled "Holes 1–9" with "Tot"**, not "Front 9" with "Sub". It reads fine, but a 9-hole course on a real scorecard would usually say "Out".
3. **On 568x320 the sticky Play again / Menu row** covers about a sixth of the screen over the tables. Scrolling shows everything, but you only see about 5 table rows at once.
4. **Picked-up and penalty holes are easy to spot:** a red italic 12 and boxed double bogeys.
5. **The wind on hole 1's full intro isn't the wind you play** (the intro shows 3 mph, then Tee off re-rolls it). This was already the case before this PR.

## Verdict
**READY TO MERGE**: the full 9-hole round works on phone portrait with no reload and no leftovers, the summary cards, totals (pick-up and penalties included), personal best, Play again and seeded winds are all correct, the compact card works by tap and timer, single-hole modes are unchanged, and hole 3 shows "plays 408 yd". R-1 (no keyboard start on the compact card) is Low.
