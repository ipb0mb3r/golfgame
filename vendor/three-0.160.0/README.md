# Three.js 0.160.0 (vendored)

`three.module.js` is the unmodified `build/three.module.js` from the npm package `three@0.160.0`
(MIT license, see `LICENSE` in this folder and the header of the file).

It is committed so the game never depends on a CDN (Gate A finding C1): it works offline, behind
filters that block unpkg, and in the agents' cloud containers. `index.html` loads it through the
import map (`"three": "./vendor/three-0.160.0/three.module.js"`).

sha256 `76dea8151bc9352aef3528b4262e249b2604f62543828328db978d060d61a495`

**Upgrading (X6):** add a new `vendor/three-<version>/` folder with that version's `build/three.module.js`
and `LICENSE`, point the import map at it, update the version and hash in `tests/vendor.test.js`, and delete the old folder.
