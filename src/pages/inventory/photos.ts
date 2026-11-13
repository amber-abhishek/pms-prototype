/* Dummy property photos (the backend has none yet). The Properties list, the property header and its Photos tab share
   them: a property's own photo is its cover, and the rest of the set stands in for its other photos. */
export const PHOTO: Record<string, string> = { col: '/properties/p1.jpg', jb: '/properties/p2.jpg', ust: '/properties/p3.jpg', ste: '/properties/p4.jpg', hb: '/properties/p5.jpg', js: '/properties/p6.jpg', erh: '/properties/p7.jpg' };
const ALL = Object.values(PHOTO);

/** The i-th photo of a property: 0 is its cover, later ones cycle through the other stock photos. Undefined if it has none. */
export function photoOf(id: string, i = 0): string | undefined {
  const cover = PHOTO[id];
  if (!cover) return undefined;
  if (i === 0) return cover;
  const rest = ALL.filter((x) => x !== cover);
  return rest[(i - 1) % rest.length];
}
