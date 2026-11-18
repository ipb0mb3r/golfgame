// X12: a hole whose heavy data is built on first use. The menus, the round and the rivals only read
// the light fields (id, number, name, par, difficulty, maxStrokes, intro, ...), so listing a course
// builds nothing; the first read of a heavy field (heightAt, surfaceAt, map, obstacles, ...) builds
// the whole hole once, and from then on the hole is a plain object with plain fields.
//   meta  = the light fields (copied onto the hole at once)
//   heavy = the names of every other field the built hole has
//   build = () => the full hole (must have every `heavy` field and nothing else beyond `meta`)
const pending = new WeakSet();
const build0 = new WeakMap();

export function lazyHole(meta, heavy, build) {
  const hole = { ...meta };
  const materialize = () => {
    if (!pending.has(hole)) return;
    const full = build(); // a throw leaves the hole unbuilt (the next read tries again and throws again)
    for (const k of Object.keys(full)) {
      if (!Object.hasOwn(meta, k) && !heavy.includes(k)) throw new Error(`hole "${meta.id}": built field "${k}" is not listed as light or heavy (src/holes/lazy.js)`);
    }
    for (const k of heavy) Object.defineProperty(hole, k, { value: full[k], writable: true, enumerable: true, configurable: true });
    pending.delete(hole);
  };
  build0.set(hole, materialize);
  for (const k of heavy) {
    Object.defineProperty(hole, k, {
      get() { materialize(); return hole[k]; },
      set(v) { materialize(); hole[k] = v; },
      enumerable: true, configurable: true,
    });
  }
  pending.add(hole);
  return hole;
}

// True once the hole's heavy data exists (always true for a plain hole object)
export const isBuilt = hole => !pending.has(hole);
// Builds it now (e.g. before timing-sensitive work); returns the hole
export function buildHole(hole) { build0.get(hole)?.(); return hole; }
