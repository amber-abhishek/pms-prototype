import { create } from 'zustand';

/* Which sidebar modules are open (2026-11-13): one at a time. The module you are in is open; opening another one just
   to look keeps it open beside it (a peek) until you move. Moving to a page in another module closes everything but
   that module, and opening a second module to look closes the first peek. */
type S = {
  open: string[];
  /** The module the current page belongs to. */
  active: string | null;
  /** The page moved into another module: only that module stays open. */
  arrive: (id: string) => void;
  /** Open (peek) or close a module from the sidebar. */
  set: (id: string, on: boolean) => void;
  /** ⌥-click: open this module and close every other one. */
  only: (id: string) => void;
};

export const useNavOpen = create<S>((set, get) => ({
  open: [],
  active: null,
  arrive: (id) => set({ active: id, open: [id] }),
  set: (id, on) => {
    const { open, active } = get();
    if (!on) { set({ open: open.filter((x) => x !== id) }); return; }
    /* Keep the module you are in (if it is open), drop any earlier peek, add this one. */
    set({ open: [...open.filter((x) => x === active && x !== id), id] });
  },
  only: (id) => set({ open: [id] }),
}));
