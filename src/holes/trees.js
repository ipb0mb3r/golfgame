// K8 (owner, PR #33): "anything that is not out of bounds" is a real tree. The trees that stood inside
// the OB line on holes 1 and 2 (random decoration until Phase K) are now obstacles with fixed
// positions in the hole data. Generated ONCE from the old decoration (scene.js addTrees, seed 42,
// same spots and sizes) and written out, so the physics and the 3D scene always match and a replay
// is identical. Trees outside OB stay decoration (drawn as pines, never touched by the ball).
//
// inPlayTree(x, z, s): a round tree of size s (0.8–1.5, the old decoration scale), about the old
// pine's height: trunk 0.3·s wide (radius), leaves centred 5.5·s up, 4·s across, 6·s tall.
export const inPlayTree = (x, z, s) => ({ type: 'tree', x, z, trunkR: 0.3 * s, trunkH: 5.5 * s, canopyR: 2 * s, canopyH: 6 * s });
export const treesFrom = list => list.map(([x, z, s]) => inPlayTree(x, z, s));
