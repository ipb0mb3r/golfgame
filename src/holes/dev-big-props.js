// AP7e: dev only. A hole-data overlay that shows one of each big prop beyond OB on a mountain hole without editing a
// real hole file: its props are added to the hole's own scenery.bigProps ONLY when the visit is dressed in the
// dev set test-big-props (?hole=mtn-07&biome=test-big-props). Never used otherwise; no menu lists it. Each entry
// is checked like a hole's own list (tests/big-props.test.js: offered by test-big-props, the scale range, clear of
// OB + 5 m). Real holes get their props from the course designer, in their own scenery.bigProps.
export const DEV_BIG_PROPS_SET = 'test-big-props';
export const DEV_BIG_PROPS = Object.freeze({
  // mtn-07 (OB box x −70…72, z −475…16; the rough's trees line the left side and the green's back): the windmill and
  // the beach hut beyond the open right rough, the two chalets on the slope behind the green, so the tee view shows
  // all four (a wide screen; on a phone, aim right or watch the flyover). Each front turned toward the tee (turn 0 = +z).
  'mtn-07': Object.freeze([
    Object.freeze({ id: 'windmill', x: 96, z: -100, turn: -0.8, scale: 1 }),
    Object.freeze({ id: 'beachHut', x: 82, z: -160, turn: -0.6, scale: 1.15 }),
    Object.freeze({ id: 'chalet', x: -45, z: -495, turn: 0.1, scale: 1 }),
    Object.freeze({ id: 'chaletTall', x: 32, z: -506, turn: -0.1, scale: 1.1 }),
  ]),
});

// The big props to draw on a hole with the set `biomeId`: the hole's own, plus the overlay's with the dev set
export const holeBigProps = (hole, biomeId) => [...(hole.scenery.bigProps ?? []), ...(biomeId === DEV_BIG_PROPS_SET ? DEV_BIG_PROPS[hole.id] ?? [] : [])];
