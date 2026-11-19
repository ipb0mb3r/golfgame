// Phase 7 (M0–M6): what the menus list, where each item leads, dev links skipping the menu, settings.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { HOLES, SETS, resolveSet, getHole } from '../src/holes/sets.js';
import { SCENARIOS, resolveScenario } from '../src/holes/scenarios.js';
import { createRound } from '../src/core/round.js';
import { createHolePlay } from '../src/core/play.js';
import {
  soloCourses, practiceItems, allLaunches, MODES, skipsMenu, DEV_PARAMS, parseSettings, serializeSettings,
  DEFAULT_SETTINGS, greenStyle,
} from '../src/core/menu.js';

const q = s => new URLSearchParams(s);

test('M2: the Solo courses come from sets.js: every set except practice and hidden ones, in order, with tags', () => {
  const c = soloCourses(SETS, HOLES);
  assert.deepEqual(c.map(x => x.id), SETS.filter(s => !s.menu).map(s => s.id));
  assert.ok(c.some(x => x.id === 'prototype3' && x.tag === 'Prototype'));
  assert.ok(c.some(x => x.id === 'test9' && x.tag === 'Prototype' && x.holes === 9));
  assert.ok(!c.some(x => x.id === 'practice'));
  for (const x of c) assert.equal(x.par, resolveSet(x.id).holes.reduce((p, id) => p + HOLES[id].par, 0));
});

test('M2: a new set shows up on the Solo menu with no code change; menu: hidden keeps it off', () => {
  const sets = [...SETS, { id: 'new18', name: 'New 18', holes: Array(18).fill('pl-01') }, { id: 'dev', name: 'Dev', menu: 'hidden', holes: ['pl-02'] }];
  const c = soloCourses(sets, HOLES);
  assert.equal(c.at(-1).id, 'new18');
  assert.equal(c.at(-1).holes, 18);
  assert.ok(!c.some(x => x.id === 'dev'));
});

test('M0: Practice lists each practice hole once, then every test spot under its hole', () => {
  const p = practiceItems(SETS, HOLES, SCENARIOS);
  assert.deepEqual(p.holes.map(h => h.id), ['pl-01', 'pl-02', 'pl-03']);
  assert.equal(p.spots.length, Object.keys(SCENARIOS).length);
  for (const s of p.spots) {
    assert.equal(s.holeId, SCENARIOS[s.id].hole);
    assert.ok(!/^Hole \d/.test(s.name), `${s.id}: the hole prefix is dropped (it's the heading)`);
  }
});

test('M0 + Phase T: modes are Solo, vs AI (enabled since Phase T) and Practice', () => {
  assert.deepEqual(MODES.map(m => [m.id, m.enabled]), [['solo', true], ['ai', true], ['practice', true]]);
});

test('M6: every menu path reaches a playable hole (the launch resolves and the hole can be hit)', () => {
  const launches = allLaunches(SETS, HOLES, SCENARIOS);
  assert.ok(launches.length >= 3 + Object.keys(SCENARIOS).length);
  for (const l of launches) {
    let hole, start = null;
    if (l.kind === 'round') {
      const round = createRound(resolveSet(l.setId), { seed: 1, getHole, mode: l.mode, difficulty: l.difficulty });
      if (l.mode === 'ai') assert.equal(round.rivals.length, 5, `${l.setId}: vs AI has 5 rivals`);
      hole = round.current.hole;
    } else if (l.kind === 'hole') hole = HOLES[l.holeId];
    else {
      const { scenario } = resolveScenario(l.scenarioId);
      assert.ok(scenario, l.scenarioId);
      hole = getHole(scenario.hole); start = scenario;
    }
    assert.ok(hole, JSON.stringify(l));
    const play = createHolePlay(hole, { seed: 1 });
    play.reset(start);
    assert.ok(play.canSwing, `${JSON.stringify(l)}: ready to swing`);
    assert.ok(play.swing({ power: 0.5, acc: 0, outcome: 'normal' }), `${JSON.stringify(l)}: a shot is hit`);
  }
});

test('M2: any dev link skips the menu; no options (or unrelated ones) show it', () => {
  for (const k of DEV_PARAMS) assert.equal(skipsMenu(q(`?${k}=1`)), true, k);
  assert.equal(skipsMenu(q('?seed=0')), true);
  assert.equal(skipsMenu(q('')), false);
  assert.equal(skipsMenu(q('?utm_source=x')), false);
});

test('M4: settings: defaults, valid values kept, anything broken falls back', () => {
  assert.deepEqual(parseSettings(null), DEFAULT_SETTINGS);
  assert.deepEqual(parseSettings('not json'), DEFAULT_SETTINGS);
  assert.deepEqual(parseSettings('[1,2]'), DEFAULT_SETTINGS);
  // Phase V: flightCam (V3) and flyover (V4) default to varied / on, so older saved settings get them
  assert.deepEqual(parseSettings('{"debug":true,"puttGrid":"on"}'), { debug: true, puttGrid: 'on', flightCam: 'varied', flyover: true });
  assert.deepEqual(parseSettings('{"flightCam":"classic","flyover":false}'), { ...DEFAULT_SETTINGS, flightCam: 'classic', flyover: false });
  assert.deepEqual(parseSettings('{"debug":"yes","puttGrid":"sideways","flightCam":"drone","flyover":"no"}'), DEFAULT_SETTINGS);
  assert.equal(serializeSettings({ debug: true, puttGrid: 'off', junk: 1 }), '{"debug":true,"puttGrid":"off","flightCam":"varied","flyover":true}');
});

test('M4: putt grid: hole default keeps each green, on = grid everywhere, off = no grid', () => {
  assert.equal(greenStyle('stripes', 'hole'), 'stripes');
  assert.equal(greenStyle('grid', 'hole'), 'grid');
  assert.equal(greenStyle('stripes', 'on'), 'grid');
  assert.equal(greenStyle('grid', 'off'), 'stripes');
  assert.equal(greenStyle('stripes', 'off'), 'stripes');
});
