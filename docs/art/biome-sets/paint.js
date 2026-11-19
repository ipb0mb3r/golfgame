// ART0 mock-up helper: the SAME greyscale course textures for every biome, coloured by a palette.
// detail(surface, x, z) returns 0..1 (texture value); stripe(surface, x, z) returns 0/1 (which of the
// palette's A/B colours). colourAt multiplies the palette colour by the texture: that is the whole
// "textures always the same, only recoloured" idea. Mock-up only, not engine code. — Agent: artist

const fract = v => v - Math.floor(v);
const hash = (x, z) => fract(Math.sin(x * 127.1 + z * 311.7) * 43758.5453);
function vnoise(x, z) {
  const xi = Math.floor(x), zi = Math.floor(z), xf = x - xi, zf = z - zi;
  const u = xf * xf * (3 - 2 * xf), v = zf * zf * (3 - 2 * zf);
  const a = hash(xi, zi), b = hash(xi + 1, zi), c = hash(xi, zi + 1), d = hash(xi + 1, zi + 1);
  return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v;
}
// short brush dabs: cells, each with one elongated dab at a random spot
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
  return best; // -1..1, 0 = no dab
}

export function detail(s, x, z) {
  switch (s) {
    case 'fairway': case 'tee': return 0.93 + 0.05 * vnoise(x / 6, z / 6) + 0.05 * dabs(x, z, 1.6, 0.7, 0.18, 1.2);
    case 'fringe': return 0.94 + 0.05 * dabs(x, z, 1.2, 0.5, 0.14, 1.0);
    case 'green': return 0.96 + 0.03 * vnoise(x / 3, z / 3);
    case 'rough': return 0.9 + 0.08 * vnoise(x / 9, z / 9) + 0.08 * dabs(x, z, 1.3, 0.9, 0.22, 1.5);
    case 'deepRough': return 0.88 + 0.1 * vnoise(x / 14, z / 14) + 0.09 * dabs(x, z, 1.5, 1.1, 0.26, 1.5);
    case 'sand': return 0.95 + 0.04 * vnoise(x / 2, z / 2) + (hash(Math.floor(x * 4), Math.floor(z * 4)) > 0.93 ? -0.07 : 0);
    case 'water': { const w = Math.sin(x * 0.9 + 2.2 * Math.sin(z * 0.35)) * Math.sin(z * 0.7); return w > 0.82 ? 1.16 : 0.97 + 0.03 * vnoise(x / 8, z / 8); }
    case 'rock': { const f = vnoise(x / 2.2, z / 2.2); return 0.86 + 0.18 * Math.floor(f * 4) / 4; }
    case 'path': return 0.95 + 0.04 * vnoise(x * 1.5, z * 1.5);
  }
  return 1;
}
export function stripe(s, x, z) {
  if (s === 'fairway') return (Math.floor(z / 7) & 1);
  if (s === 'green') return (Math.floor((x - z) / 2.5) & 1);
  return 0;
}
export const hex = h => [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)];
export function baseColour(P, s, x, z) {
  switch (s) {
    case 'fairway': return hex(stripe(s, x, z) ? P.fairwayA : P.fairwayB);
    case 'green': return hex(stripe(s, x, z) ? P.greenA : P.greenB);
    case 'water': return hex(P.water);
    default: return hex(P[s] ?? P.rough);
  }
}
export function colourAt(P, s, x, z) {
  const c = baseColour(P, s, x, z), d = detail(s, x, z);
  return [Math.min(255, c[0] * d), Math.min(255, c[1] * d), Math.min(255, c[2] * d)];
}

// readability: CIE L*a*b* and ΔE76
function lab(h) {
  const lin = c => { c /= 255; return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4; };
  const [r, g, b] = hex(h).map(lin);
  const X = (0.4124 * r + 0.3576 * g + 0.1805 * b) / 0.95047, Y = 0.2126 * r + 0.7152 * g + 0.0722 * b, Z = (0.0193 * r + 0.1192 * g + 0.9505 * b) / 1.08883;
  const f = t => t > 0.008856 ? Math.cbrt(t) : 7.787 * t + 16 / 116;
  return [116 * f(Y) - 16, 500 * (f(X) - f(Y)), 200 * (f(Y) - f(Z))];
}
export function delta(h1, h2) {
  const a = lab(h1), b = lab(h2);
  return { dE: Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]), dL: Math.abs(a[0] - b[0]), L1: a[0], L2: b[0] };
}
export function mixHex(h1, h2, t) {
  const a = hex(h1), b = hex(h2);
  return '#' + a.map((v, i) => Math.round(v + (b[i] - v) * t).toString(16).padStart(2, '0')).join('');
}
