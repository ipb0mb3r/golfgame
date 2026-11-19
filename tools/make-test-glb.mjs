// Writes the loader test model (AP2), dev only, plain Node:
//
//   node tools/make-test-glb.mjs
//
// tests/fixtures/models/cube.glb: one 1 m cube (24 vertices, 12 triangles, normals), one material,
// made from code here, so it has no licence beyond the repo's. tools/session-check.mjs loads it in the
// browser through the import map (three/addons/ GLTFLoader) and frees it.
// tests/fixtures/models/cube-meshopt.glb is the same cube with its index buffer compressed the
// EXT_meshopt_compression way (mode INDICES, the simplest of meshoptimizer's codecs, encoded here by
// hand so no outside tool is needed), so loading it goes through the vendored Meshopt decoder (its
// WebAssembly). Real models will be compressed by the asset prep tool (AP4). Same bytes every run.
import { writeFileSync, mkdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const DIR = join(dirname(fileURLToPath(import.meta.url)), '..', 'tests/fixtures/models');

// The 6 faces: normal and the two in-plane axes (u, v), so each face is a quad of 4 vertices
const FACES = [
  [[1, 0, 0], [0, 0, -1], [0, 1, 0]], [[-1, 0, 0], [0, 0, 1], [0, 1, 0]],
  [[0, 1, 0], [1, 0, 0], [0, 0, -1]], [[0, -1, 0], [1, 0, 0], [0, 0, 1]],
  [[0, 0, 1], [1, 0, 0], [0, 1, 0]], [[0, 0, -1], [-1, 0, 0], [0, 1, 0]],
];
const pos = [], nor = [], idx = [];
for (const [n, u, v] of FACES) {
  const base = pos.length / 3;
  for (const [a, b] of [[-1, -1], [1, -1], [1, 1], [-1, 1]]) {
    for (let k = 0; k < 3; k++) pos.push(0.5 * (n[k] + a * u[k] + b * v[k]));
    nor.push(...n);
  }
  idx.push(base, base + 1, base + 2, base, base + 2, base + 3);
}
const P = new Float32Array(pos), N = new Float32Array(nor), I = new Uint16Array(idx);
const bytes = a => Buffer.from(a.buffer, a.byteOffset, a.byteLength);
const pad4 = b => Buffer.concat([b, Buffer.alloc((4 - (b.length % 4)) % 4)]);
const [pB, nB, iB] = [bytes(P), bytes(N), pad4(bytes(I))];

const base = () => ({
  asset: { version: '2.0', generator: 'Pocket Links tools/make-test-glb.mjs' },
  scene: 0, scenes: [{ nodes: [0] }], nodes: [{ mesh: 0, name: 'cube' }],
  meshes: [{ name: 'cube', primitives: [{ attributes: { POSITION: 0, NORMAL: 1 }, indices: 2, material: 0 }] }],
  materials: [{ name: 'green', pbrMetallicRoughness: { baseColorFactor: [0.3, 0.7, 0.3, 1], metallicFactor: 0, roughnessFactor: 1 } }],
  accessors: [
    { bufferView: 0, componentType: 5126, count: 24, type: 'VEC3', min: [-0.5, -0.5, -0.5], max: [0.5, 0.5, 0.5] },
    { bufferView: 1, componentType: 5126, count: 24, type: 'VEC3' },
    { bufferView: 2, componentType: 5123, count: 36, type: 'SCALAR' },
  ],
  bufferViews: [
    { buffer: 0, byteOffset: 0, byteLength: pB.length, target: 34962 },
    { buffer: 0, byteOffset: pB.length, byteLength: nB.length, target: 34962 },
  ],
});

function writeGlb(name, gltf, bin) {
  let json = Buffer.from(JSON.stringify(gltf));
  json = Buffer.concat([json, Buffer.alloc((4 - (json.length % 4)) % 4, 0x20)]);
  const chunk = (type, data) => { const h = Buffer.alloc(8); h.writeUInt32LE(data.length, 0); h.writeUInt32LE(type, 4); return Buffer.concat([h, data]); };
  const body = Buffer.concat([chunk(0x4e4f534a, json), chunk(0x004e4942, bin)]);
  const head = Buffer.alloc(12); head.writeUInt32LE(0x46546c67, 0); head.writeUInt32LE(2, 4); head.writeUInt32LE(12 + body.length, 8);
  mkdirSync(DIR, { recursive: true });
  writeFileSync(join(DIR, name), Buffer.concat([head, body]));
  console.log(`wrote tests/fixtures/models/${name} (${12 + body.length} bytes)`);
}

// cube.glb: plain buffers
{
  const gltf = base(), bin = Buffer.concat([pB, nB, iB]);
  gltf.buffers = [{ byteLength: bin.length }];
  gltf.bufferViews.push({ buffer: 0, byteOffset: pB.length + nB.length, byteLength: I.byteLength, target: 34963 });
  writeGlb('cube.glb', gltf, bin);
}

// cube-meshopt.glb: the index buffer view is compressed (EXT_meshopt_compression, mode INDICES): a 0xd1
// header, then per index the zigzag delta from the previous one, shifted left by 1 (bit 0 = which of
// the two "last" values it is relative to; always 0 here), as LEB128 bytes, then a 4-byte zero tail.
// Its uncompressed bytes live in buffer 1, a fallback buffer with no data the decoder fills.
{
  const enc = [0xd1];
  let last = 0;
  for (const v of idx) {
    const d = v - last, zig = ((d << 1) ^ (d >> 31)) >>> 0;
    last = v;
    for (let n = zig << 1; ; n >>>= 7) { if (n < 0x80) { enc.push(n); break; } enc.push((n & 0x7f) | 0x80); }
  }
  enc.push(0, 0, 0, 0);
  const cB = pad4(Buffer.from(enc)), gltf = base(), bin = Buffer.concat([pB, nB, cB]);
  gltf.buffers = [{ byteLength: bin.length }, { byteLength: iB.length, extensions: { EXT_meshopt_compression: { fallback: true } } }];
  gltf.bufferViews.push({ buffer: 1, byteOffset: 0, byteLength: I.byteLength, target: 34963, extensions: {
    EXT_meshopt_compression: { buffer: 0, byteOffset: pB.length + nB.length, byteLength: enc.length, byteStride: 2, mode: 'INDICES', count: idx.length } } });
  gltf.extensionsUsed = gltf.extensionsRequired = ['EXT_meshopt_compression'];
  writeGlb('cube-meshopt.glb', gltf, bin);
}
