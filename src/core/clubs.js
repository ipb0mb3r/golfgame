// Club table (DESIGN.md §3). carry = meters a full, straight shot carries on flat ground.
export const CLUBS = {
  driver: { id: 'driver', name: 'Driver',  carry: 215, loft: 12 },
  '3w':   { id: '3w',     name: '3 Wood',  carry: 195, loft: 17 },
  '5i':   { id: '5i',     name: '5 Iron',  carry: 170, loft: 21 },
  '7i':   { id: '7i',     name: '7 Iron',  carry: 150, loft: 26 },
  '9i':   { id: '9i',     name: '9 Iron',  carry: 125, loft: 32 },
  pw:     { id: 'pw',     name: 'P Wedge', carry: 105, loft: 38 },
  sw:     { id: 'sw',     name: 'S Wedge', carry: 75,  loft: 46,
            lieOverrides: { sand: { maxPower: 0.85, sweetScale: 0.7 } } }, // the sand wedge is made for bunkers
  putter: { id: 'putter', name: 'Putter',  carry: 0,   loft: 0,  putter: true },
};
export const FULL_BAG = ['driver', '3w', '5i', '7i', '9i', 'pw', 'sw', 'putter'];

// A hole's bag, longest club first, putter last.
export function makeBag(ids = FULL_BAG) {
  const bag = FULL_BAG.filter(id => ids.includes(id)).map(id => CLUBS[id]);
  if (!bag.length || !bag[bag.length - 1].putter) throw new Error('a bag must end with the putter');
  return bag;
}

// The lie for hitting this club from this surface (S11): { maxPower, sweetScale }.
// The surface's values, unless the club overrides them for that surface (the sand wedge in a bunker).
export function lieFor(club, surfaceId, surfaces) {
  const s = surfaces[surfaceId], o = club.lieOverrides?.[surfaceId] ?? {};
  return { maxPower: o.maxPower ?? s.maxPower ?? 1, sweetScale: o.sweetScale ?? s.sweetScale ?? 1 };
}
