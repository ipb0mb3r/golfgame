// AP7g: dev only. A hole-data overlay that dresses pl-01 as a "tournament" hole (the artist's picture
// docs/art/tee-props/03-tournament-tee-all-biomes.jpg) without editing a real hole file: its props are added to the
// hole's own scenery.eventProps ONLY when the visit is dressed in the dev set test-event-props
// (?hole=pl-01&biome=test-event-props). Never used otherwise; no menu lists it. Each entry is checked like a hole's own
// list (tests/event-props.test.js: offered by test-event-props, every zone rule). Real holes get their props from the
// course designer, in their own scenery.eventProps.
export const DEV_EVENT_PROPS_SET = 'test-event-props';
export const DEV_EVENT_PROPS = Object.freeze({
  // pl-01: tee (0, 0), tee box |x| < 3.5, |z| < 4, plays toward −z; green (3, −150) 15 × 12 m; OB |x| > 55.
  'pl-01': Object.freeze([
    // the dressed tee: the tent beside and behind on the left, front toward the tee box; flags at the tee box's
    // front corners (2.8 m ahead, so the footprint's front stays within 4 m) and one behind on the right
    Object.freeze({ id: 'popupTent', x: -10.5, z: 5, turn: 1.93 }),
    Object.freeze({ id: 'featherFlag', x: 6.3, z: -2.8, turn: -0.35 }),
    Object.freeze({ id: 'featherFlag', x: -6.3, z: -2.8, turn: 0.35 }),
    Object.freeze({ id: 'featherFlag', x: 7, z: 7, turn: -0.6 }),
    // the side of the course: a tent beyond the left OB line (its footprint 5 m clear of the rough), front toward the fairway
    Object.freeze({ id: 'popupTent', x: -64, z: -70, turn: 1.57 }),
    // two flags behind the green, framing the hole flag in the approach view (≥ 8 m from the green's edge)
    Object.freeze({ id: 'featherFlag', x: -6, z: -172, turn: 0.25 }),
    Object.freeze({ id: 'featherFlag', x: 13, z: -172, turn: -0.25 }),
  ]),
});

// The event props to draw on a hole with the set `biomeId`: the hole's own, plus the overlay's with the dev set
export const holeEventProps = (hole, biomeId) => [...(hole.scenery.eventProps ?? []), ...(biomeId === DEV_EVENT_PROPS_SET ? DEV_EVENT_PROPS[hole.id] ?? [] : [])];
