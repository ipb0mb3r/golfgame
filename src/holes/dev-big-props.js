// AP7e: dev only. A hole-data overlay that shows one of each big prop beyond OB on a mountain hole without editing a
// real hole file: its props are added to the hole's own scenery.bigProps ONLY when the visit is dressed in the
// dev set test-big-props (?hole=mtn-07&biome=test-big-props). Never used otherwise; no menu lists it. Each entry
// is checked like a hole's own list (tests/big-props.test.js: offered by test-big-props, the scale range, clear of
// OB + 5 m). Real holes get their props from the course designer, in their own scenery.bigProps.
export const DEV_BIG_PROPS_SET = 'test-big-props';
export const DEV_BIG_PROPS = Object.freeze({
  // mtn-07 (OB box x −70…72, z −475…16): the rough's trees in play line the left side and the back of the green, so
  // all four stand beyond the open right rough of the first 160 m, each front turned toward the tee (turn 0 = the
  // front faces +z): from the tee, aim right (▶) to see them all; on a phone they also show as the ball flies.
  'mtn-07': Object.freeze([
    Object.freeze({ id: 'chalet', x: 124, z: -50, turn: -1.3, scale: 1 }),
    Object.freeze({ id: 'chaletTall', x: 108, z: -84, turn: -1.0, scale: 0.95 }),
    Object.freeze({ id: 'windmill', x: 96, z: -112, turn: -0.8, scale: 1 }),
    Object.freeze({ id: 'beachHut', x: 82, z: -160, turn: -0.6, scale: 1.15 }),
  ]),
});

// The big props to draw on a hole with the set `biomeId`: the hole's own, plus the overlay's with the dev set
export const holeBigProps = (hole, biomeId) => [...(hole.scenery.bigProps ?? []), ...(biomeId === DEV_BIG_PROPS_SET ? DEV_BIG_PROPS[hole.id] ?? [] : [])];
