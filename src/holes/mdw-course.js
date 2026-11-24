// Buttercup Meadows (the first real course, biome meadow-day): the course kit. Data only.
// Plan: docs/COURSE_PLAN_MEADOW.md (owner, 2026-11-24): a field course with some windmills, no gimmick;
// holes 1–3 fairly flat (not literally flat), then bigger hills and water; front nine not too hard.
// Every hole is built by the shared hole builder (mtn-course.js makeMtnHole: hollow bunkers, water with a
// lip, greens with fringe, trees on rough, banks beyond the fairway); this file only sets the course's
// biome, its in-play round trees and its intro card.
import { makeMtnHole, pine } from './mtn-course.js';

export const MDW_BIOME = 'meadow-day';

export const makeMdwHole = spec => makeMtnHole({ biome: MDW_BIOME, ...spec });

// A round meadow tree in play (the set's roundCanopy look): lower and wider than a pine. s = size.
export const oak = (x, z, s = 1) => ({ type: 'tree', x, z, trunkR: 0.38 * s, trunkH: 3.6 * s, canopyR: 3.4 * s, canopyH: 6 * s, look: 'roundCanopy' });
export { pine };

// The intro card text every Buttercup Meadows hole shares
export function mdwIntro({ par, tagline, steps, blurb, next = null, prev = null }) {
  return {
    subtitle: `Par ${par} · {yards} yards · <i>Buttercup Meadows</i>`,
    tagline, steps, blurb,
    ...(prev ? { link: { hole: prev, text: '← Previous hole' } } : {}),
    ...(next ? { resultLink: { hole: next, text: 'Next hole →' } } : {}),
  };
}

// The tournament tee (tee-props SPEC §4 zone 1, for a tee at (0, 0) with the standard 7 × 8 m box, playing
// toward −z): pick the pieces a hole wants. Same spots as the validated dev overlay (src/holes/dev-event-props.js).
export const TEE_DRESS = {
  tent: { id: 'popupTent', x: -10.5, z: 5, turn: 1.93 },
  flagR: { id: 'featherFlag', x: 6.3, z: -2.8, turn: -0.35 },
  flagL: { id: 'featherFlag', x: -6.3, z: -2.8, turn: 0.35 },
  flagBack: { id: 'featherFlag', x: 7, z: 7, turn: -0.6 },
  bench: { id: 'parkBench', x: 7.5, z: 3.5, turn: -1.57 },
};
