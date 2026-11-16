/* The demo user was renamed from Priya Shah to Arjun Mehta (2026-11-16). A tab that saved demo data before that still
   holds the old name (task owners, audit lines, "by …" history), so each store bumps its version and runs this once:
   it swaps the old name and email for the new one everywhere in the saved state. */
const OLD = [['Priya Shah', 'Arjun Mehta'], ['priya.shah@', 'arjun.mehta@']] as const;
export const renameMe = <T,>(state: T): T => {
  let s = JSON.stringify(state);
  for (const [a, b] of OLD) s = s.split(a).join(b);
  return JSON.parse(s) as T;
};
/** For a store that already had a version: older saves than `from` are dropped (seed reloads); `from` gets renamed. */
export const renameFrom = (from: number) => (state: unknown, version: number) => (version < from ? {} : renameMe(state));
