# Gate A: decisions

Reports: `A-maintainability.md` (#18), `A-testing.md` (#19), `A-compatibility.md` (#20).
Triage by the PM, **approved by Alexis (owner) on 2026-11-16**. The tasks are in `docs/TASKS.md` → "Gate A fix passes".

| ID | Sev. | Finding (short) | Decision | Where |
|---|---|---|---|---|
| A1 | High | Hole flow rules live in `main.js`, untested | **APPROVED** | Fix pass 1 (with A8) |
| A2 | High | No way to unload a hole | **APPROVED** | Fix pass 1 |
| A3 | High | State lists copied 4×, one already wrong | **APPROVED** | Fix pass 1 |
| A4 | High | Rain can't go through one function as specified | **APPROVED** | PM rewrote DESIGN §7. Code in W2 |
| A5 | Med | Tunables in three lists | **APPROVED** | Fix pass 1 |
| A6 | Med | Round navigation / help text in hole files | SKIP for now | Phase 7 (menus) |
| A7 | Med | DESIGN/TASKS drift | **APPROVED** | Done by the PM |
| A8 | Med | Two ways to hit the ball | **APPROVED** | Fix pass 1 (with A1) |
| A9 | Low | Camera/animation numbers outside config | SKIP | |
| A10 | Low | DOM ids scattered | SKIP for now | Phase 7 (menus) |
| T1 | High | ~17% of hole 2 rolls end by the 40 s safety net | **APPROVED** | Fix pass 2 → P10 |
| T2 | High | v2 baseline barely covers swing feel | **APPROVED** | Fix pass 1 |
| T3 | Med | v2 re-record doesn't show what moved | **APPROVED** | Fix pass 1 |
| T4 | Med | No rule for intentional physics changes | **APPROVED** | Done by the PM (AGENTS rule 9) |
| T5 | Med | Putt accuracy untested | **APPROVED** | Fix pass 1 |
| T6 | Med | Cup rules half tested | **APPROVED** | Fix pass 1 |
| T7 | Med | Bad hole data fails silently | **APPROVED** | Fix pass 1 |
| T8 | Low | Tests read design values from config | SKIP | |
| T9 | Low | A test file changes global settings at import | **APPROVED** | Fix pass 1 |
| T10 | Low | Hole flow only in the game layer | = A1 | |
| C1 | High | Whole game depends on unpkg | **APPROVED** | Fix pass 1 (vendor Three.js) |
| C2 | Med | Failed start is silent | **APPROVED** | Fix pass 1 |
| C3 | Med | Meter reading depends on frame rate | **APPROVED** | Fix pass 2 → S16 |
| C4 | Med | No performance lever | **APPROVED (partial)** | Fix pass 1: DPR cap + antialias tunables only |
| C5 | Med | Debug overlay can't open on a phone | **APPROVED** | Fix pass 1 (`?debug=1`) |
| C6 | Low | iOS Safari viewport units | **APPROVED** | Fix pass 1 |
| C7 | Low | Any pointer/button starts a swing | **APPROVED** | Fix pass 1 |
| C8 | Low | Blurry minimap on high-DPI | SKIP | |
| C9 | Low | Browser floor not written down | **APPROVED** | Done by the PM (DESIGN §12) |
| C10 | Low | Frame-rate tests only use even frames | SKIP | Covered by S16's test |

**Rain design decision (owner, 2026-11-16):** wet bunker → cap +0.10 for all clubs incl. the sand wedge; wet rough → window ×0.85; other surfaces keep cap and window. See DESIGN §7.
