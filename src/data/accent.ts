import { create } from 'zustand';

/* Theme colour (2026-11-23): the brand accent, picked in the account menu. Kept in localStorage and applied as
   `data-accent` on <body>; postcss-accent.js recolours every brand-blue rule under it, and styles.css swaps --primary. */
export type Accent = 'blue' | 'purple' | 'pink' | 'green' | 'orange';
export const ACCENTS: { id: Accent; label: string; swatch: string }[] = [
  { id: 'blue', label: 'Blue', swatch: '#2563EB' },
  { id: 'purple', label: 'Purple', swatch: '#7C3AED' },
  { id: 'pink', label: 'Pink', swatch: '#DB2777' },
  { id: 'green', label: 'Green', swatch: '#0B8A4C' },
  { id: 'orange', label: 'Orange', swatch: '#EA580C' },
];
const KEY = 'pms-accent';
const read = (): Accent => {
  try { const v = localStorage.getItem(KEY) as Accent | null; return v && ACCENTS.some((a) => a.id === v) ? v : 'blue'; } catch { return 'blue'; }
};
const apply = (a: Accent) => {
  if (typeof document === 'undefined') return;
  if (a === 'blue') delete document.body.dataset.accent; else document.body.dataset.accent = a;
};

export const useAccent = create<{ accent: Accent; setAccent: (a: Accent) => void }>((set) => ({
  accent: read(),
  setAccent: (accent) => {
    try { localStorage.setItem(KEY, accent); } catch { /* private window: still switches for this visit */ }
    apply(accent);
    set({ accent });
  },
}));
apply(useAccent.getState().accent);
