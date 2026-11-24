// AP7e: the shapes of the big props (DESIGN §8b "Big props", the artist's owner-approved spec
// docs/art/big-props/SPEC.md, PR #127). Pure (no Three.js, no DOM), tested in tests/big-props.test.js.
// The numbers are the artist's reference geometry (docs/art/big-props/pieces.js: windmill C, chalet A,
// chalet B, hut A), tidied: same parts, same sizes, same triangle counts (328 / 404 / 404 / 114).
// A piece is one or more draw parts (the windmill: `body` and `sails`, kept apart so the sails could turn
// later; owner: still for now). A draw part is one merged indexed shape plus a colour pair per vertex:
//   { positions: [x, y, z, ...], indices, w, lo: [slot per vertex], hi: [slot per vertex] }
// a vertex's colour = mix(slot lo, slot hi, w) (sRGB). Metres, y up, the foot centre at the origin, the front
// facing +z. Drawn flat-shaded (crisp faces) with the toon ramp, from both sides (the artist's mock-up).
import { lathe } from './trees.js';
import { cowAssembled } from './cowShape.js';

const TAU = Math.PI * 2;
const P = (p, lo, hi = lo) => ({ ...p, lo, hi });
// a part scaled, turned about z (rz, the sails turn in the x–y plane) then about y (ry), then moved
function xf(p, { x = 0, y = 0, z = 0, sx = 1, sy = 1, sz = 1, ry = 0, rz = 0 } = {}) {
  const pos = [], cy = Math.cos(ry), sny = Math.sin(ry), cz = Math.cos(rz), snz = Math.sin(rz);
  for (let i = 0; i < p.positions.length; i += 3) {
    let a = p.positions[i] * sx, b = p.positions[i + 1] * sy, c = p.positions[i + 2] * sz;
    [a, b] = [a * cz - b * snz, a * snz + b * cz];
    [a, c] = [a * cy + c * sny, -a * sny + c * cy];
    pos.push(a + x, b + y, c + z);
  }
  return { ...p, positions: pos };
}
// a box centred at (x, y, z), w × h × d: 12 triangles
const BOX_CORNERS = [[-1, -1, -1], [1, -1, -1], [1, 1, -1], [-1, 1, -1], [-1, -1, 1], [1, -1, 1], [1, 1, 1], [-1, 1, 1]];
const BOX_INDICES = [0, 2, 1, 0, 3, 2, 4, 5, 6, 4, 6, 7, 0, 1, 5, 0, 5, 4, 3, 7, 6, 3, 6, 2, 0, 4, 7, 0, 7, 3, 1, 2, 6, 1, 6, 5];
function box(x, y, z, w, h, d) {
  const v = BOX_CORNERS.flatMap(([a, b, c]) => [a * w / 2, b * h / 2, c * d / 2]);
  return xf({ positions: v, indices: BOX_INDICES, w: [0, 0, 1, 1, 0, 0, 1, 1] }, { x, y, z });
}
// a gable prism (a roof volume) w across (x), d deep (z), from y0 to the ridge at y0 + h: 8 triangles
function gable(x, y0, z, w, h, d) {
  const v = [-w / 2, 0, -d / 2, w / 2, 0, -d / 2, 0, h, -d / 2, -w / 2, 0, d / 2, w / 2, 0, d / 2, 0, h, d / 2];
  return xf({ positions: v, indices: [0, 2, 1, 3, 4, 5, 0, 3, 5, 0, 5, 2, 1, 2, 5, 1, 5, 4, 0, 1, 4, 0, 4, 3], w: [0, 0, 1, 0, 0, 1] }, { x, y: y0, z });
}
// a roof of two thick slabs meeting at the ridge: span w (x), depth d (z), rise h, overhang o, slab t: 2 × 12 triangles
function slabRoof(x, y0, z, w, h, d, o, t) {
  const half = w / 2 + o, a = Math.atan2(h, w / 2), len = half / Math.cos(a);
  return [-1, 1].map(s => xf(xf(box(0, -t / 2, 0, len, t, d + 2 * o), { rz: -s * a }),
    { x: x + s * (len / 2) * Math.cos(a), y: y0 + h - (len / 2) * Math.sin(a) + 0.02, z }));
}
// a 4-sided pyramid roof over w × d (+ overhang o), apex h above y0: 6 triangles (4 sides + 2 under)
function pyramid(x, y0, z, w, d, h, o) {
  const W = w / 2 + o, D = d / 2 + o;
  return { positions: [x - W, y0, z - D, x + W, y0, z - D, x + W, y0, z + D, x - W, y0, z + D, x, y0 + h, z], indices: [0, 4, 1, 1, 4, 2, 2, 4, 3, 3, 4, 0, 0, 1, 2, 0, 2, 3], w: [0, 0, 0, 0, 1] };
}
// a tower (cylinder / cone) from y0 (radius r0) to y1 (r1), n sides, closed on top when cap
const tower = (r0, r1, y0, y1, n, cap) => lathe([...(cap ? [[0, y1, 1]] : []), [r1, y1, 1], [r0, y0, 0], [0, y0, 0]], n, Math.PI / n);
// a window on the face z = zf (facing +z) centred at (x, y): a glass pane, and a shutter either side when asked
function windowPanes(out, x, y, zf, w, h, shutters) {
  out.push(P(box(x, y, zf, w, h, 0.08), 'glass'));
  if (shutters) for (const s of [-1, 1]) out.push(P(box(x + s * (w * 0.5 + w * 0.28), y, zf + 0.03, w * 0.5, h * 1.05, 0.08), 'shut'));
}
// a cloth sail at angle a: a spar from the hub out to len, and a thin, slightly cupped board of 2 slabs
function sail(len, width, a, hubZ) {
  const at = { rz: a, z: hubZ }, b0 = len * 0.22, bl = len * 0.78;
  return [P(xf(box(len / 2, 0, 0, len, 0.22, 0.22), at), 'spar'),
    P(xf(box(b0 + bl / 2, width * 0.3, 0.05, bl, width * 0.6, 0.06), at), 'sail'),
    P(xf(box(b0 + bl / 2, width * 0.75, 0.12, bl, width * 0.42, 0.06), at), 'sail')];
}
// the hub (a short 8-sided cylinder along z, on the front) and 4 sails turned `turn` rad, all lifted to the hub height
function sails(len, width, hubY, hubZ, turn) {
  const h = lathe([[0, 0.5, 1], [0.4, 0.5, 1], [0.4, -0.4, 0], [0, -0.4, 0]], 8), hub = { positions: [], indices: h.indices, w: h.w };
  for (let i = 0; i < h.positions.length; i += 3) hub.positions.push(h.positions[i], -h.positions[i + 2], h.positions[i + 1] + hubZ);
  const parts = [P(hub, 'spar')];
  for (let k = 0; k < 4; k++) parts.push(...sail(len, width, turn + k * TAU / 4, hubZ + 0.45));
  return parts.map(p => xf(p, { y: hubY }));
}

// Each piece → { <draw part>: [parts] } (the artist's build(), slots renamed to the library's: the windmill's
// wallTop is `wall` and its door `spar`, as in SPEC §3)
const SHAPES = {
  // C · white smock mill: 13 m tall (cap tip 12.2 m), sails to 6.8 m from the hub (still, a part of their own)
  windmill: () => ({
    body: [P(tower(3.0, 2.9, 0, 2.6, 8, false), 'base'), P(tower(2.7, 1.7, 2.6, 10, 8, false), 'wall'),
      P(tower(3.6, 3.6, 3.6, 3.85, 8, true), 'spar'),                                              // the gallery ring
      P(lathe([[0, 12.2, 1], [1.4, 11.6, 0.7], [2.0, 10.4, 0.4], [2.0, 10.0, 0], [0, 10.0, 0]], 8, Math.PI / 8), 'cap'),
      P(box(0, 1.2, 2.95, 1.1, 2.2, 0.2), 'spar'), P(box(0, 6.6, 2.25, 0.7, 1.0, 0.12), 'glass')],   // door, window
    sails: sails(6.8, 1.4, 10.7, 2.0, 0.35),
  }),
  // A · classic chalet: 12 × 9 m, 8.5 m tall (+ chimney)
  chalet: () => {
    const out = [P(box(0, 1.5, 0, 12, 3, 9), 'stone'), P(box(0, 4.6, 0, 11.6, 3.2, 8.6), 'wood'),
      ...slabRoof(0, 6.2, 0, 11.6, 2.3, 8.6, 1.1, 0.35).map(p => P(p, 'roof')), P(gable(0, 6.2, 0, 11.6, 2.3, 8.6), 'wood')];
    out.push(P(box(0, 3.2, 5.2, 11.2, 0.25, 1.6), 'wood'), P(box(0, 4.0, 5.95, 11.2, 0.9, 0.12), 'wood')); // balcony floor + rail
    for (const x of [-3.6, 0, 3.6]) out.push(P(box(x, 4.55, 6.05, 2.0, 0.3, 0.35), 'leaf'), P(box(x, 4.78, 6.05, 1.8, 0.22, 0.3), 'flower'));
    for (const x of [-3.6, 0, 3.6]) windowPanes(out, x, 4.9, 4.33, 1.2, 1.3, true);
    for (const x of [-3.6, 3.6]) windowPanes(out, x, 1.6, 4.53, 1.1, 1.1, true);
    out.push(P(box(0, 1.15, 4.53, 1.3, 2.3, 0.1), 'wood'));                                            // the door
    for (const x of [-3.6, 3.6]) out.push(P(box(x, 0.95, 4.75, 1.4, 0.25, 0.35), 'leaf'), P(box(x, 1.13, 4.75, 1.25, 0.2, 0.3), 'flower'));
    out.push(P(box(3.2, 8.4, -1.5, 0.8, 2.0, 0.8), 'stone'));                                         // the chimney
    return { body: out };
  },
  // B · tall chalet: 10 × 9 m, 11 m tall, three floors, two balconies, steeper roof
  chaletTall: () => {
    const out = [P(box(0, 1.5, 0, 10, 3, 9), 'stone'), P(box(0, 4.6, 0, 9.6, 3.2, 8.6), 'wood'), P(box(0, 7.6, 0, 9.6, 2.8, 8.6), 'wood'),
      ...slabRoof(0, 9.0, 0, 9.6, 3.0, 8.6, 1.0, 0.35).map(p => P(p, 'roof')), P(gable(0, 9.0, 0, 9.6, 3.0, 8.6), 'wood')];
    for (const yb of [3.2, 6.2]) {
      out.push(P(box(0, yb, 5.1, 9.2, 0.25, 1.4), 'wood'), P(box(0, yb + 0.8, 5.75, 9.2, 0.9, 0.12), 'wood'));
      for (const x of [-2.6, 2.6]) out.push(P(box(x, yb + 1.35, 5.85, 2.0, 0.3, 0.35), 'leaf'), P(box(x, yb + 1.58, 5.85, 1.8, 0.22, 0.3), 'flower'));
    }
    for (const y of [4.9, 7.8]) for (const x of [-2.6, 2.6]) windowPanes(out, x, y, 4.33, 1.2, 1.3, true);
    windowPanes(out, -2.6, 1.6, 4.53, 1.1, 1.1, true);
    out.push(P(box(1.8, 1.15, 4.53, 1.3, 2.3, 0.1), 'wood'));
    return { body: out };
  },
  // A · thatched stilt hut: 3.6 × 3.6 m (+ deck), 4.7 m tall, on 0.8 m stilts
  beachHut: () => {
    const out = [];
    for (const [x, z] of [[-1.5, -1.5], [1.5, -1.5], [1.5, 1.5], [-1.5, 1.5]]) out.push(P(box(x, 0.4, z, 0.25, 0.8, 0.25), 'post'));
    out.push(P(box(0, 0.85, 0.3, 3.6, 0.15, 4.2), 'wall'), P(box(0, 2.0, 0, 3.2, 2.2, 3.2), 'wall'));  // deck, room
    out.push(P(pyramid(0, 3.0, 0, 3.2, 3.2, 1.7, 0.7), 'roof'));
    out.push(P(box(0, 1.85, 1.62, 0.9, 1.8, 0.08), 'door'), P(box(-1.62, 2.1, 0, 0.08, 0.7, 0.9), 'door')); // door, side shutter
    out.push(P(box(0, 0.55, 2.3, 1.0, 0.12, 0.5), 'wall'));                                            // the step
    return { body: out };
  },
  // AP7i: the cow (core/cowShape.js, docs/art/cow/SPEC.md; look C): its 3 part groups body / head / tail, assembled
  // standing with patch layout 0 (the drawing places each group about its pivot itself: src/game/bigProps.js)
  cow: () => cowAssembled(),
};
// AP7i: a piece whose footprint must cover more than its standing shape: the grazing cow's head reaches lower and forward
const REACH = { cow: () => [cowAssembled({ pose: 'graze' })] };
export const BIG_PROP_PIECES = Object.freeze(Object.keys(SHAPES));

// One merged draw part from a list of parts (also used by core/fenceShapes.js and core/eventPropShapes.js)
export function merge(parts) {
  const out = { positions: [], indices: [], w: [], lo: [], hi: [] };
  for (const p of parts) {
    const base = out.positions.length / 3, n = p.positions.length / 3;
    out.positions.push(...p.positions); out.w.push(...p.w);
    for (const i of p.indices) out.indices.push(i + base);
    for (let i = 0; i < n; i++) { out.lo.push(p.lo); out.hi.push(p.hi); }
  }
  return { ...out, tris: out.indices.length / 3 };
}
// → { parts: { <name>: { positions, indices, w, lo, hi, tris } }, tris, radius (m: the farthest point from the
// foot's vertical axis, the footprint used by the OB rule and the drop onto the terrain), height }. Built once.
const cache = new Map();
export function bigPropShape(id) {
  if (!SHAPES[id]) throw new Error(`no big-prop shape "${id}" (core/bigPropShapes.js)`);
  if (!cache.has(id)) {
    const parts = Object.fromEntries(Object.entries(SHAPES[id]()).map(([k, v]) => [k, Array.isArray(v) ? merge(v) : v])); // the cow's groups come merged
    let radius = 0, height = 0;
    for (const p of [parts, ...(REACH[id]?.() ?? [])].flatMap(Object.values)) for (let i = 0; i < p.positions.length; i += 3) {
      radius = Math.max(radius, Math.hypot(p.positions[i], p.positions[i + 2]));
      height = Math.max(height, p.positions[i + 1]);
    }
    cache.set(id, Object.freeze({ parts, tris: Object.values(parts).reduce((n, p) => n + p.tris, 0), radius, height }));
  }
  return cache.get(id);
}
