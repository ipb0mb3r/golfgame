// ART0b round 2 mock-up helper, direction B "Sunny postcard": the shared course textures, coloured by the palette.
// Texture recipe B (owner: "between a and b"): a fine speckle everywhere + a few light brush dabs, broad mowing
// stripes, soft darker patches in the rough, a sparkle pattern on water. Mock-up only, not engine code.
// — Agent: artist

const fract = v => v - Math.floor(v);
const hash = (x, z) => fract(Math.sin(x * 127.1 + z * 311.7) * 43758.5453);
export function vnoise(x, z) {
  const xi = Math.floor(x), zi = Math.floor(z), xf = x - xi, zf = z - zi;
  const u = xf * xf * (3 - 2 * xf), v = zf * zf * (3 - 2 * zf);
  const a = hash(xi, zi), b = hash(xi + 1, zi), c = hash(xi, zi + 1), d = hash(xi + 1, zi + 1);
  return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v;
}
function dabs(x, z, cell, len, wid, angle) {
  const cx = Math.floor(x / cell), cz = Math.floor(z / cell);
  let best = 0;
  for (let i = -1; i <= 1; i++) for (let j = -1; j <= 1; j++) {
    const h = hash(cx + i, cz + j), h2 = hash(cz + j + 7.3, cx + i - 3.1);
    const px = (cx + i + h) * cell, pz = (cz + j + h2) * cell, a = angle + (h - 0.5) * 0.8;
    const dx = x - px, dz = z - pz, u = dx * Math.cos(a) + dz * Math.sin(a), w = -dx * Math.sin(a) + dz * Math.cos(a);
    const d = (u / len) ** 2 + (w / wid) ** 2;
    if (d < 1) { const v = (1 - d) * (h2 > 0.5 ? 1 : -1); if (Math.abs(v) > Math.abs(best)) best = v; }
  }
  return best;
}
const speck = (x, z, k) => (hash(Math.floor(x * k), Math.floor(z * k)) - 0.5);

// texture value (multiplies the palette colour): 1 = the palette colour itself
export function detail(s, x, z) {
  switch (s) {
    case 'fairway': case 'tee': return 0.97 + 0.04 * speck(x, z, 3) + 0.03 * dabs(x, z, 2.2, 0.8, 0.2, 1.2);
    case 'fringe': case 'edge': return 0.98 + 0.04 * speck(x, z, 3);
    case 'green': return 0.99 + 0.025 * speck(x, z, 4);
    case 'rough': return 0.9 + 0.1 * vnoise(x / 22, z / 22) + 0.05 * speck(x, z, 2.5) + 0.05 * dabs(x, z, 1.6, 1.0, 0.25, 1.5);
    case 'deepRough': return 0.88 + 0.12 * vnoise(x / 28, z / 28) + 0.05 * speck(x, z, 2) + 0.06 * dabs(x, z, 1.8, 1.2, 0.3, 1.5);
    case 'sand': return 0.98 + 0.05 * speck(x, z, 5) + 0.02 * vnoise(x / 3, z / 3);
    case 'lip': case 'bank': return 0.96 + 0.06 * speck(x, z, 4);
    case 'rock': { const f = vnoise(x / 2.4, z / 2.4); return 0.88 + 0.16 * Math.floor(f * 3) / 3; }
    case 'path': return 0.97 + 0.05 * speck(x, z, 4);
  }
  return 1;
}
export function stripe(s, x, z) {
  if (s === 'fairway') return (Math.floor((z + 0.25 * x) / 8) & 1);
  if (s === 'green') return (Math.floor((x - z) / 3) & 1);
  return 0;
}
export const hex = h => [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)];
export function mixHex(h1, h2, t) {
  const a = hex(h1), b = hex(h2);
  return '#' + a.map((v, i) => Math.round(v + (b[i] - v) * t).toString(16).padStart(2, '0')).join('');
}
// depth: 0 at the water's edge, 1 in the middle (for the water gradient)
export function colourAt(P, s, x, z, depth = 0) {
  let c;
  if (s === 'fairway') c = hex(stripe(s, x, z) ? P.fairwayA : P.fairwayB);
  else if (s === 'green') c = hex(stripe(s, x, z) ? P.greenA : P.greenB);
  else if (s === 'water') {
    c = hex(mixHex(P.water, P.waterDeep, Math.min(1, depth * 1.3)));
    const w = Math.sin(x * 1.1 + 2.4 * Math.sin(z * 0.42)) * Math.sin(z * 0.9 + 1.3 * Math.sin(x * 0.3));
    if (w > 0.8) c = c.map(v => v + (255 - v) * 0.45);           // sparkle ripples
    else if (w > 0.6) c = c.map(v => v + (255 - v) * 0.15);
    return c;
  } else c = hex(P[s] ?? P.rough);
  const d = detail(s, x, z);
  return [Math.min(255, c[0] * d), Math.min(255, c[1] * d), Math.min(255, c[2] * d)];
}
