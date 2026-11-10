/** Undo for list stores: put back only the records an action touched (by id), so a later
 *  change made in between survives. `before`/`after` bracket the action; `cur` is the list now. */
export function revertList<T extends { id: string }>(before: T[], after: T[], cur: T[]): T[] {
  const was = new Map(before.map((r) => [r.id, r]));
  const afterIds = new Set(after.map((r) => r.id));
  const touched = new Set(after.filter((r) => was.get(r.id) !== r).map((r) => r.id));
  const out = cur.flatMap((r) => (touched.has(r.id) ? (was.has(r.id) ? [was.get(r.id)!] : []) : [r]));
  before.forEach((r, i) => { if (!afterIds.has(r.id) && !out.some((x) => x.id === r.id)) out.splice(Math.min(i, out.length), 0, r); });
  return out;
}
