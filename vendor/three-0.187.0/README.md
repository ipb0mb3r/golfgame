# Three.js 0.187.0 (vendored)

Unmodified files from the npm package `three@0.187.0` (MIT license, see `LICENSE` in this folder and
the header of the files). npm tarball integrity
`sha512-Qiu7R+Cmh8CstZsY1uJOSWnVlfo7ZtNLV7mF8Jltk3LB3AtDu9cRZlcnRKkAk8Y4z6KKw35z7Y7Urd7jWY8etA==`.

They are committed so the game never depends on a CDN (Gate A finding C1): it works offline, behind
filters that block unpkg, and in the agents' cloud containers. `index.html` loads them through the
import map:

```
"three":         "./vendor/three-0.187.0/three.module.js"
"three/addons/": "./vendor/three-0.187.0/addons/"
```

| File here | In the npm package | sha256 |
|---|---|---|
| `three.module.js` | `build/three.module.js` (the WebGL renderer; imports `three.core.js`) | `104f56145899722094556490d787aae0617cc2fc3382f31df02d724ea1aee341` |
| `three.core.js` | `build/three.core.js` (everything shared by the renderers) | `613e370f76638fdef83926642bf256dc9615684922de1ce1f63a8583e5d78578` |
| `LICENSE` | `LICENSE` | `8b378ebe60e2fe500158cb0ac71cb5e8b7d92953c2abcc63a0eb90499653b5bc` |
| `addons/loaders/GLTFLoader.js` | `examples/jsm/loaders/GLTFLoader.js` | `532ac726e120039acbcd6cf54328c57acbf7b438176afaa6951257126d11bff1` |
| `addons/utils/BufferGeometryUtils.js` | `examples/jsm/utils/BufferGeometryUtils.js` (used by GLTFLoader) | `7bda2a8ba836b2bcf67cb938d4b9e1bb5d1b1bc616817103ed858c0b58296ce7` |
| `addons/utils/SkeletonUtils.js` | `examples/jsm/utils/SkeletonUtils.js` (used by GLTFLoader) | `b1632a703206c3d830de9fcbe515696770d04b71a15ee6b50afa6d2c3298c86f` |
| `addons/libs/meshopt_decoder.module.js` | `examples/jsm/libs/meshopt_decoder.module.js` (meshoptimizer 1.1, MIT, WebAssembly inside) | `d428e73a000057c6c94bfcedc3412d0c2dc14ca8800e88553aab05113ad2bf19` |

`addons/` keeps the package's `examples/jsm/` layout, so an add-on's own relative imports work and
code imports it as `three/addons/<path>`, as in the Three.js docs. Only what the art pipeline needs is
here (AP2). Not vendored yet: `KTX2Loader` + the Basis transcoder (~0.7 MB, mostly WebAssembly), the
Draco decoder, post-processing. The r187 npm package has no minified build (`three.module.min.js` is gone), so none is used.

`tests/vendor.test.js` checks the import map, that only this folder is vendored, every hash above,
and that the add-ons import only `three` and files vendored with them. `tools/session-check.mjs` loads
the test models (`tests/fixtures/models/`) through the import map, draws and frees them.

**Upgrading (X6, done in AP2 for r160 → r187):** `npm pack three@<version>`, put the same files from it
in a new `vendor/three-<version>/` folder (plus any new file an add-on imports), point the import map
at it, update the version, files and hashes in `tests/vendor.test.js` and this README, delete the old
folder, then read the release notes / migration guide for every release in between and run every check
(AGENTS.md "Commands"), with before/after screenshots.
