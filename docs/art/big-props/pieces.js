// Big props, artist reference geometry (docs/art/big-props/SPEC.md). Pure: no Three.js, no DOM.
// Same format as docs/art/small-props/pieces.js: a look's build() returns parts { positions, indices, w, lo, hi };
// a vertex colour = mix(slot lo, slot hi, w); the look's `slots` map slot → palette key. Metres, y up, the
// prop's foot centre at the origin, its front facing +z. Drawn flat-shaded (crisp faces), toon ramp.
// Budget: ≤ 1,500 triangles (ART_STYLE §5); targets: windmill ~400, chalet ~700, beach hut ~200. — Agent: artist
import { lathe } from '../../../src/core/trees.js';

const TAU = Math.PI * 2;
const P = (p, lo, hi = lo) => ({ ...p, lo, hi });
// transform a part: scale, then turn about y (ry) and tip about x (rx, for the sails), then move
function xf(p, { x = 0, y = 0, z = 0, sx = 1, sy = 1, sz = 1, ry = 0, rz = 0 } = {}) {
  const pos = [], cy = Math.cos(ry), sy_ = Math.sin(ry), cz = Math.cos(rz), sz_ = Math.sin(rz);
  for (let i = 0; i < p.positions.length; i += 3) {
    let a = p.positions[i] * sx, b = p.positions[i + 1] * sy, c = p.positions[i + 2] * sz;
    [a, b] = [a * cz - b * sz_, a * sz_ + b * cz];          // about z (sails turn in the x–y plane)
    [a, c] = [a * cy + c * sy_, -a * sy_ + c * cy];         // about y
    pos.push(a + x, b + y, c + z);
  }
  return { ...p, positions: pos };
}
// a box centred at (x, y, z) of size w × h × d: 12 triangles
function box(x, y, z, w, h, d, ry = 0) {
  const v = [], idx = [];
  for (const [sx, sy, sz] of [[-1, -1, -1], [1, -1, -1], [1, 1, -1], [-1, 1, -1], [-1, -1, 1], [1, -1, 1], [1, 1, 1], [-1, 1, 1]]) v.push(sx * w / 2, sy * h / 2, sz * d / 2);
  idx.push(0, 2, 1, 0, 3, 2, 4, 5, 6, 4, 6, 7, 0, 1, 5, 0, 5, 4, 3, 7, 6, 3, 6, 2, 0, 4, 7, 0, 7, 3, 1, 2, 6, 1, 6, 5);
  return xf({ positions: v, indices: idx, w: [0, 0, 1, 1, 0, 0, 1, 1] }, { x, y, z, ry });
}
// a gable prism (roof volume) w across (x), d deep (z), from y0 to the ridge y0 + h: 8 triangles
function gable(x, y0, z, w, h, d, ry = 0) {
  const v = [-w / 2, 0, -d / 2, w / 2, 0, -d / 2, 0, h, -d / 2, -w / 2, 0, d / 2, w / 2, 0, d / 2, 0, h, d / 2];
  const idx = [0, 2, 1, 3, 4, 5, 0, 3, 5, 0, 5, 2, 1, 2, 5, 1, 5, 4, 0, 1, 4, 0, 4, 3];
  return xf({ positions: v, indices: idx, w: [0, 0, 1, 0, 0, 1] }, { x, y: y0, z, ry });
}
// a roof of two thick slabs over a gable: span w (x), depth d (z), pitch rise h, overhang o, slab t: 24 triangles
function slabRoof(x, y0, z, w, h, d, o = 0.6, t = 0.25, ry = 0) {
  const half = w / 2 + o, len = half / Math.cos(Math.atan2(h, w / 2)), a = Math.atan2(h, w / 2);
  // place each slab so its top inner edge meets the ridge
  const parts = [-1, 1].map(s => {
    const b = box(0, -t / 2, 0, len, t, d + 2 * o);
    const tipped = xf(b, { rz: -s * a });
    const cx = s * (len / 2) * Math.cos(a);
    return xf(tipped, { x: x + cx, y: y0 + h - (len / 2) * Math.sin(a) + 0.02, z, ry });
  });
  return parts;
}
// a pyramid roof (4 sides) of base w × d, apex h above y0, with overhang o: 4 triangles (+ 2 under)
function pyramid(x, y0, z, w, d, h, o = 0.4) {
  const W = w / 2 + o, D = d / 2 + o;
  return { positions: [x - W, y0, z - D, x + W, y0, z - D, x + W, y0, z + D, x - W, y0, z + D, x, y0 + h, z], indices: [0, 4, 1, 1, 4, 2, 2, 4, 3, 3, 4, 0, 0, 1, 2, 0, 2, 3], w: [0, 0, 0, 0, 1] };
}
// a cylinder / cone (open ends closed by lathe poles) between y0 and y1, radii r0 → r1, n sides
const tower = (r0, r1, y0, y1, n, cap = true) => lathe([...(cap ? [[0, y1, 1]] : []), [r1, y1, 1], [r0, y0, 0], [0, y0, 0]], n, Math.PI / n);
// a window: glass pane + 2 shutters either side (accent), on the face z = zf (facing +z), centred x, y
function windowPanes(out, x, y, zf, w, h, shutters, ry = 0, slots = { glass: 'glass', shut: 'shut', frame: 'frame' }) {
  out.push(P(box(x, y, zf, w, h, 0.08, 0), slots.glass));
  if (shutters) for (const s of [-1, 1]) out.push(P(box(x + s * (w * 0.5 + w * 0.28), y, zf + 0.03, w * 0.5, h * 1.05, 0.08), slots.shut));
}
// a sail: a spar from the hub out to `len`, with a lattice board (a flat box) on its trailing side
function sail(len, width, a, hubZ, slotSpar, slotSail, board = 'lattice') {
  const out = [];
  out.push(P(xf(box(len / 2, 0, 0, len, 0.22, 0.22), { rz: a, z: hubZ }), slotSpar));
  const bw = width, b0 = len * 0.22, bl = len * 0.78;
  if (board === 'lattice') {
    out.push(P(xf(box(b0 + bl / 2, bw / 2, 0, bl, bw, 0.08), { rz: a, z: hubZ }), slotSail));
    for (const t of [0.33, 0.66]) out.push(P(xf(box(b0 + bl * t, bw / 2, 0.06, 0.12, bw, 0.1), { rz: a, z: hubZ }), slotSpar));
  } else {
    // a cloth sail: a thin, slightly cupped board (2 boxes)
    out.push(P(xf(box(b0 + bl / 2, bw * 0.3, 0.05, bl, bw * 0.6, 0.06), { rz: a, z: hubZ }), slotSail));
    out.push(P(xf(box(b0 + bl / 2, bw * 0.75, 0.12, bl, bw * 0.42, 0.06), { rz: a, z: hubZ }), slotSail));
  }
  return out;
}
const sails = (len, width, hub, hubZ, spar, cloth, board, turn = 0.35) => {
  const out = [P(xf(lathe([[0, 0.5, 1], [0.45, 0.4, 1], [0.45, -0.3, 0], [0, -0.3, 0]], 8), { rz: 0 }), spar)];
  out[0] = P(xf(out[0], { x: 0, y: 0, z: 0 }), spar);
  // the hub: a short cylinder along z
  const hubPart = lathe([[0, 0.5, 1], [0.4, 0.5, 1], [0.4, -0.4, 0], [0, -0.4, 0]], 8);
  const rot = { positions: [], indices: hubPart.indices, w: hubPart.w };
  for (let i = 0; i < hubPart.positions.length; i += 3) rot.positions.push(hubPart.positions[i], -hubPart.positions[i + 2], hubPart.positions[i + 1] + hubZ);
  const parts = [P(rot, spar)];
  for (let k = 0; k < 4; k++) parts.push(...sail(len, width, turn + k * TAU / 4, hubZ + 0.45, spar, cloth, board));
  return parts.map(p => ({ ...p, positions: p.positions.map((v, i) => i % 3 === 1 ? v + hub : v) }));
};
const lift = (parts, dy) => parts.map(p => ({ ...p, positions: p.positions.map((v, i) => i % 3 === 1 ? v + dy : v) }));

export const PIECES = {
  windmill: {
    A: { name: 'A · Wooden tower mill', sub: 'round wooden tower, red cone cap, lattice sails', size: '11 m tall',
      slots: { wall: 'wood', wallTop: 'wood', cap: 'roof', spar: 'trunk', sail: 'propSnow', glass: 'glass', door: 'trunk' },
      build() { const out = [P(tower(2.4, 1.6, 0, 8, 10, false), 'wall', 'wallTop'),
        P(lathe([[0, 10.6, 1], [1.9, 8.4, 0.5], [1.9, 8.0, 0], [0, 8.0, 0]], 10, Math.PI / 10), 'cap'),
        P(box(0, 1.1, 2.35, 1.0, 2.2, 0.2), 'door'), P(box(0, 5, 1.95, 0.7, 0.9, 0.12), 'glass')];
        return [...out, ...sails(6.2, 1.3, 8.6, 1.9, 'spar', 'sail', 'lattice')]; } },
    B: { name: 'B · Post mill', sub: 'wooden box body on a trestle, red pitched roof', size: '10 m tall',
      slots: { wall: 'wood', wallTop: 'wood', cap: 'roof', spar: 'trunk', sail: 'propSnow', glass: 'glass', door: 'trunk' },
      build() { const out = [];
        for (const [x, z] of [[-1.6, -1.6], [1.6, -1.6], [1.6, 1.6], [-1.6, 1.6]]) out.push(P(xf(box(0, 1.2, 0, 0.3, 2.8, 0.3), { rz: x > 0 ? 0.35 : -0.35, x: x * 0.75, z: z * 0.75 }), 'spar'));
        out.push(P(box(0, 2.6, 0, 0.6, 1.6, 0.6), 'spar'));
        out.push(P(box(0, 5.3, 0, 3.4, 4.0, 4.2), 'wall', 'wallTop'));
        out.push(P(gable(0, 7.3, 0, 3.9, 1.8, 4.8), 'cap'));
        out.push(P(box(0, 3.9, -2.4, 1.2, 0.2, 1.6), 'spar'), P(xf(box(0, 2.3, -3.6, 0.6, 0.15, 3.2), { rz: 0 }), 'spar'));
        out.push(P(box(0, 5.0, 2.12, 0.8, 1.0, 0.1), 'glass'));
        return [...out, ...sails(5.6, 1.2, 6.2, 2.15, 'spar', 'sail', 'lattice')]; } },
    C: { name: 'C · White smock mill', sub: 'tall 8-sided white tower, wooden gallery, red cap', size: '13 m tall',
      slots: { wall: 'propSnow', wallTop: 'propSnow', cap: 'roof', spar: 'wood', sail: 'propSnow', glass: 'glass', door: 'wood', base: 'rock' },
      build() { const out = [P(tower(3.0, 2.9, 0, 2.6, 8, false), 'base'), P(tower(2.7, 1.7, 2.6, 10, 8, false), 'wall', 'wallTop'),
        P(tower(3.6, 3.6, 3.6, 3.85, 8, true), 'spar'),
        P(lathe([[0, 12.2, 1], [1.4, 11.6, 0.7], [2.0, 10.4, 0.4], [2.0, 10.0, 0], [0, 10.0, 0]], 8, Math.PI / 8), 'cap'),
        P(box(0, 1.2, 2.95, 1.1, 2.2, 0.2), 'door'), P(box(0, 6.6, 2.25, 0.7, 1.0, 0.12), 'glass')];
        return [...out, ...sails(6.8, 1.4, 10.7, 2.0, 'spar', 'sail', 'cloth')]; } },
  },
  chalet: {
    A: { name: 'A · Classic chalet', sub: 'stone ground floor, wood upper floor, wide low roof, balcony', size: '12 × 9 m, 8.5 m tall',
      slots: { stone: 'propSnow', wood: 'wood', roof: 'roof', shut: 'accent', glass: 'glass', flower: 'accent', leaf: 'leaf' },
      build() { const out = [P(box(0, 1.5, 0, 12, 3, 9), 'stone'), P(box(0, 4.6, 0, 11.6, 3.2, 8.6), 'wood'),
        ...slabRoof(0, 6.2, 0, 11.6, 2.3, 8.6, 1.1, 0.35).map(p => P(p, 'roof')),
        P(gable(0, 6.2, 0, 11.6, 2.3, 8.6), 'wood')];
        // balcony along the front (z+) of the upper floor: floor slab + rail + flower boxes
        out.push(P(box(0, 3.2, 5.2, 11.2, 0.25, 1.6), 'wood'), P(box(0, 4.0, 5.95, 11.2, 0.9, 0.12), 'wood'));
        for (const x of [-3.6, 0, 3.6]) { out.push(P(box(x, 4.55, 6.05, 2.0, 0.3, 0.35), 'leaf'), P(box(x, 4.78, 6.05, 1.8, 0.22, 0.3), 'flower')); }
        for (const x of [-3.6, 0, 3.6]) windowPanes(out, x, 4.9, 4.33, 1.2, 1.3, true);
        for (const x of [-3.6, 3.6]) windowPanes(out, x, 1.6, 4.53, 1.1, 1.1, true);
        out.push(P(box(0, 1.15, 4.53, 1.3, 2.3, 0.1), 'wood'));
        for (const x of [-3.6, 3.6]) { out.push(P(box(x, 0.95, 4.75, 1.4, 0.25, 0.35), 'leaf'), P(box(x, 1.13, 4.75, 1.25, 0.2, 0.3), 'flower')); }
        out.push(P(box(3.2, 8.4, -1.5, 0.8, 2.0, 0.8), 'stone'));
        return out; } },
    B: { name: 'B · Tall chalet', sub: 'three floors, two balconies, steeper roof', size: '10 × 9 m, 11 m tall',
      slots: { stone: 'propSnow', wood: 'wood', roof: 'roof', shut: 'accent', glass: 'glass', flower: 'accent', leaf: 'leaf' },
      build() { const out = [P(box(0, 1.5, 0, 10, 3, 9), 'stone'), P(box(0, 4.6, 0, 9.6, 3.2, 8.6), 'wood'), P(box(0, 7.6, 0, 9.6, 2.8, 8.6), 'wood'),
        ...slabRoof(0, 9.0, 0, 9.6, 3.0, 8.6, 1.0, 0.35).map(p => P(p, 'roof')), P(gable(0, 9.0, 0, 9.6, 3.0, 8.6), 'wood')];
        for (const yb of [3.2, 6.2]) { out.push(P(box(0, yb, 5.1, 9.2, 0.25, 1.4), 'wood'), P(box(0, yb + 0.8, 5.75, 9.2, 0.9, 0.12), 'wood'));
          for (const x of [-2.6, 2.6]) { out.push(P(box(x, yb + 1.35, 5.85, 2.0, 0.3, 0.35), 'leaf'), P(box(x, yb + 1.58, 5.85, 1.8, 0.22, 0.3), 'flower')); } }
        for (const y of [4.9, 7.8]) for (const x of [-2.6, 2.6]) windowPanes(out, x, y, 4.33, 1.2, 1.3, true);
        windowPanes(out, -2.6, 1.6, 4.53, 1.1, 1.1, true); out.push(P(box(1.8, 1.15, 4.53, 1.3, 2.3, 0.1), 'wood'));
        return out; } },
    C: { name: 'C · Long low chalet', sub: 'one long wood floor over stone, deep eaves, chimney', size: '16 × 8 m, 7 m tall',
      slots: { stone: 'propSnow', wood: 'wood', roof: 'roof', shut: 'accent', glass: 'glass', flower: 'accent', leaf: 'leaf' },
      build() { const out = [P(box(0, 1.3, 0, 8, 2.6, 16), 'stone'), P(box(0, 4.0, 0, 7.8, 2.8, 15.8), 'wood'),
        ...slabRoof(0, 5.4, 0, 7.8, 1.6, 15.8, 1.3, 0.35).map(p => P(p, 'roof')), P(gable(0, 5.4, 0, 7.8, 1.6, 15.8), 'wood')];
        // the long side faces +x here: turn the whole chalet so it faces +z
        const longSide = [];
        for (const z of [-5.2, -1.8, 1.8, 5.2]) { longSide.push(P(box(3.93, 4.2, z, 0.08, 1.2, 1.1), 'glass')); for (const s of [-1, 1]) longSide.push(P(box(3.98, 4.2, z + s * 0.86, 0.08, 1.26, 0.55), 'shut'));
          longSide.push(P(box(4.2, 3.35, z, 0.35, 0.3, 1.8), 'leaf'), P(box(4.2, 3.55, z, 0.3, 0.22, 1.6), 'flower')); }
        for (const z of [-3.5, 3.5]) { longSide.push(P(box(4.03, 1.4, z, 0.08, 1.0, 1.0), 'glass')); }
        longSide.push(P(box(4.03, 1.1, 0, 0.1, 2.2, 1.3), 'wood'), P(box(-1.6, 7.3, 4.5, 0.9, 2.2, 0.9), 'stone'));
        return [...out, ...longSide].map(p => xf(p, { ry: -Math.PI / 2 })); } },
  },
  hut: {
    A: { name: 'A · Thatched stilt hut', sub: 'wooden hut on short stilts, palm-thatch roof, turquoise door', size: '3.6 × 3.6 m, 4.6 m tall',
      slots: { wall: 'wood', post: 'trunk', roof: 'roof', door: 'water', trim: 'propSnow' },
      build() { const out = [];
        for (const [x, z] of [[-1.5, -1.5], [1.5, -1.5], [1.5, 1.5], [-1.5, 1.5]]) out.push(P(box(x, 0.4, z, 0.25, 0.8, 0.25), 'post'));
        out.push(P(box(0, 0.85, 0.3, 3.6, 0.15, 4.2), 'wall'), P(box(0, 2.0, 0, 3.2, 2.2, 3.2), 'wall'));
        out.push(P(pyramid(0, 3.0, 0, 3.2, 3.2, 1.7, 0.7), 'roof'));
        out.push(P(box(0, 1.85, 1.62, 0.9, 1.8, 0.08), 'door'), P(box(-1.62, 2.1, 0, 0.08, 0.7, 0.9), 'door'));
        out.push(P(box(0, 0.55, 2.3, 1.0, 0.12, 0.5), 'wall'));
        return out; } },
    B: { name: 'B · Painted beach hut', sub: 'little white hut with a turquoise door and pink trim', size: '2.6 × 2.4 m, 3.2 m tall',
      slots: { wall: 'propSnow', post: 'wood', roof: 'propA', door: 'water', trim: 'propA' },
      build() { const out = [P(box(0, 0.12, 0, 2.9, 0.24, 2.8), 'post'), P(box(0, 1.3, 0, 2.6, 2.2, 2.4), 'wall'),
        ...slabRoof(0, 2.4, 0, 2.6, 0.8, 2.4, 0.25, 0.14).map(p => P(p, 'roof')), P(gable(0, 2.4, 0, 2.6, 0.8, 2.4), 'wall'),
        P(box(0, 1.2, 1.22, 1.0, 1.8, 0.08), 'door')];
        for (const x of [-1.3, 1.3]) out.push(P(box(x, 1.3, 1.21, 0.12, 2.2, 0.1), 'trim'));
        return out; } },
    C: { name: 'C · Open beach shack', sub: 'four posts, a thatch roof and a little counter', size: '4 × 3.4 m, 3.8 m tall',
      slots: { wall: 'wood', post: 'trunk', roof: 'roof', door: 'water', trim: 'propSnow' },
      build() { const out = [];
        for (const [x, z] of [[-1.8, -1.5], [1.8, -1.5], [1.8, 1.5], [-1.8, 1.5]]) out.push(P(box(x, 1.3, z, 0.22, 2.6, 0.22), 'post'));
        out.push(P(pyramid(0, 2.6, 0, 3.6, 3.0, 1.2, 0.8), 'roof'), P(box(0, 0.55, 1.4, 3.4, 1.1, 0.4), 'wall'), P(box(0, 1.14, 1.4, 3.6, 0.1, 0.6), 'door'),
          P(box(0, 1.1, -1.4, 3.4, 2.2, 0.15), 'wall'));
        for (const x of [-1.0, 0, 1.0]) out.push(P(box(x, 0.4, 2.1, 0.35, 0.8, 0.35), 'post'));
        return out; } },
  },
};
export const tris = parts => parts.reduce((n, p) => n + p.indices.length / 3, 0);
