// Course designer helper (not part of the game): paint a hole top-down from surfaceAt with the Meadow palette into a
// PNG-ready raw RGB file (2 px per m), e.g. to mock a colour or check shapes without the browser.
//   node docs/course/scripts/top-down.mjs <hole-id> '#deepRoughHex' out.rgb   → prints "W H"
//   python3 -c "from PIL import Image; Image.frombytes('RGB',(W,H),open('out.rgb','rb').read()).save('out.png')"
import { writeFileSync } from 'node:fs';
import { HOLES, DEV_HOLES } from '../../../src/holes/sets.js';
import meadow from '../../../src/biomes/meadow-day.js';
const [, , id, tint, out] = process.argv;
const h = HOLES[id] ?? DEV_HOLES[id], P = meadow.palette, m = h.map, S = 2;
const hex = c => [1, 3, 5].map(i => parseInt(c.slice(i, i + 2), 16));
const col = { ob: hex(P.deepRough), rough: hex(P.rough), deepRough: hex(tint ?? P.roughDeep), fairway: hex(P.fairwayA), fringe: hex(P.fringe), green: hex(P.greenA), sand: hex(P.sand), water: hex(P.water), tee: hex(P.tee), rock: hex(P.rock) };
const W = Math.round((m.x1 - m.x0) * S), H = Math.round((m.z1 - m.z0) * S), buf = Buffer.alloc(W * H * 3);
for (let j = 0; j < H; j++) for (let i = 0; i < W; i++) {
  const x = m.x0 + i / S, z = m.z0 + j / S, s = h.surfaceAt(x, z);
  let c = s === 'fairway' && (Math.floor(z / 7) & 1) ? hex(P.fairwayB) : col[s] ?? col.rough;
  for (const o of h.obstacles) if (o.type === 'tree' && Math.hypot(x - o.x, z - o.z) < o.canopyR) { c = hex(P.leafLow); break; }
  buf.set(c, (j * W + i) * 3);
}
writeFileSync(out, buf); console.log(W, H);
