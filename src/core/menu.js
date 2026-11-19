// Menus (Phase 7, DESIGN §8 "Menus"): what the menus list, where each choice leads, how a dev link
// skips them, and the saved settings. Pure: no DOM, no Three.js. The data (SETS, HOLES, SCENARIOS)
// is passed in, so this file never imports src/holes and runs in Node tests.
//
// A "launch" is what the game starts when a menu item (or a dev link) is chosen:
//   { kind: 'round', setId }        Solo: a course (hole set), played as a round (Phase 6)
//   { kind: 'round', setId, mode: 'ai', difficulty }  vs AI (Phase T): the same round against 5 rivals
//   { kind: 'hole', holeId }        Practice: one hole, no scorecard
//   { kind: 'scenario', scenarioId } Practice: a designer test spot (X8), no scorecard

import { DIFFICULTIES } from './rivals.js';

// The address-bar shortcuts that skip the menu (dev and designer links, M2). Any one of them plays
// straight away, exactly as before Phase 7 (?tune= alone plays hole 1 with the tunes, for example).
// Phase T: ?ai=easy|normal|hard plays the ?set= round vs AI (alone: the first Solo course vs AI).
export const DEV_PARAMS = Object.freeze(['hole', 'scenario', 'set', 'ai', 'seed', 'tune', 'debug']);
// The ones that name what to play. Quitting to the menu drops these from the address, so a reload
// shows the menu; ?tune=, ?seed= and ?debug= stay for the whole visit.
export const PLAY_PARAMS = Object.freeze(['hole', 'scenario', 'set', 'ai']);

// params = anything with get(name) (URLSearchParams). True when the page should skip the menu.
export const skipsMenu = params => DEV_PARAMS.some(k => params.get(k) != null);

// The Solo course list, from sets.js (no hardcoded list, M2). A set is listed unless its `menu` says
// otherwise: 'practice' = the Practice holes list, 'hidden' = only reachable with ?set= (old test sets).
// `tag` (e.g. 'Prototype') is shown next to the name.
export function soloCourses(sets, holes) {
  return sets.filter(s => !s.menu).map(s => ({
    launch: { kind: 'round', setId: s.id },
    id: s.id, name: s.name, tag: s.tag ?? null,
    holes: s.holes.length, par: s.holes.reduce((p, id) => p + holes[id].par, 0),
  }));
}

// Phase T: the vs AI course list: the same courses as Solo, then a difficulty (course → difficulty →
// round). Each course's `launch` has no difficulty yet; difficultyItems() adds it.
export function aiCourses(sets, holes) {
  return soloCourses(sets, holes).map(c => ({ ...c, launch: { ...c.launch, mode: 'ai' } }));
}
export function difficultyItems(setId) {
  return DIFFICULTIES.map(d => ({ id: d.id, name: d.name, line: d.line, launch: { kind: 'round', setId, mode: 'ai', difficulty: d.id } }));
}

// The Practice list: the holes of every 'practice' set (each hole once, in order), then the test
// spots grouped under their hole, in the order scenarios.js lists them.
export function practiceItems(sets, holes, scenarios) {
  const ids = [];
  for (const s of sets) if (s.menu === 'practice') for (const id of s.holes) if (!ids.includes(id)) ids.push(id);
  const holeItems = ids.map(id => {
    const h = holes[id];
    return { launch: { kind: 'hole', holeId: id }, id, number: h.number, name: `Hole ${h.number}`, par: h.par, line: h.intro?.tagline ?? '' };
  });
  const spotItems = Object.entries(scenarios).map(([id, sc]) => ({
    launch: { kind: 'scenario', scenarioId: id }, id, holeId: sc.hole, holeNumber: holes[sc.hole].number,
    name: capitalize(sc.name.replace(/^Hole \d+:\s*/, '')), line: sc.text,
  }));
  return { holes: holeItems, spots: spotItems };
}

const capitalize = t => t.charAt(0).toUpperCase() + t.slice(1);

// The modes on the Play menu (M0). vs AI is on since Phase T.
export const MODES = Object.freeze([
  { id: 'solo', name: 'Solo', line: 'Play a course and keep score.', enabled: true },
  { id: 'ai', name: 'vs AI', line: 'A round against 5 rivals, with a leaderboard after every hole.', enabled: true },
  { id: 'practice', name: 'Practice', line: 'One hole, or a test spot. No scorecard.', enabled: true },
]);

// Every launch the menus can make, for the M6 test ("every menu path reaches a playable hole")
export function allLaunches(sets, holes, scenarios) {
  const p = practiceItems(sets, holes, scenarios);
  const ai = soloCourses(sets, holes).flatMap(c => difficultyItems(c.id));
  return [...soloCourses(sets, holes), ...ai, ...p.holes, ...p.spots].map(i => i.launch);
}

// Settings (M4), saved in localStorage by the game layer (read and written in try/catch).
//   debug     the debug overlay is open when a game starts (the backtick still toggles it)
//   puttGrid  'hole' = each hole's own green (hole 2 has a grid), 'on' = a grid on every green, 'off' = none
//   flightCam 'varied' = the flight camera changes view from shot to shot (Phase V, V3), 'classic' = always from behind
//   flyover   the hole flyover plays the first time a hole starts from its tee (V4)
export const SETTINGS_KEY = 'pocketlinks.settings.v1';
export const PUTT_GRID = Object.freeze(['hole', 'on', 'off']);
export const FLIGHT_CAM = Object.freeze(['varied', 'classic']);
export const DEFAULT_SETTINGS = Object.freeze({ debug: false, puttGrid: 'hole', flightCam: 'varied', flyover: true });

// Stored text → settings. Anything missing, broken or out of range falls back to the default, so a
// bad value can never stop the game from starting.
export function parseSettings(text) {
  let v = null;
  try { v = JSON.parse(text ?? 'null'); } catch { v = null; }
  const s = { ...DEFAULT_SETTINGS };
  if (v && typeof v === 'object') {
    if (typeof v.debug === 'boolean') s.debug = v.debug;
    if (PUTT_GRID.includes(v.puttGrid)) s.puttGrid = v.puttGrid;
    if (FLIGHT_CAM.includes(v.flightCam)) s.flightCam = v.flightCam;
    if (typeof v.flyover === 'boolean') s.flyover = v.flyover;
  }
  return s;
}
export const serializeSettings = s => JSON.stringify(parseSettings(JSON.stringify(s)));

// The green painting style for a hole under the putt-grid setting
export function greenStyle(holeStyle, puttGrid) {
  if (puttGrid === 'on') return 'grid';
  if (puttGrid === 'off') return holeStyle === 'grid' ? 'stripes' : holeStyle;
  return holeStyle;
}
