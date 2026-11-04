import { create } from 'zustand';

/* Light or dark. Kept in localStorage (index.html reads it before first paint, so there is no light flash) and
   applied as `class="dark"` on <html>, which postcss-dark.js keys every dark colour off. */
export type Theme = 'light' | 'dark';
const KEY = 'pms-theme';

const read = (): Theme => {
  try { return localStorage.getItem(KEY) === 'dark' ? 'dark' : 'light'; } catch { return 'light'; }
};
const apply = (t: Theme) => {
  const el = document.documentElement;
  el.classList.toggle('dark', t === 'dark');
  el.style.colorScheme = t;
};

export const useTheme = create<{ theme: Theme; setTheme: (t: Theme) => void }>((set) => ({
  theme: read(),
  setTheme: (theme) => {
    try { localStorage.setItem(KEY, theme); } catch { /* private window: still switches for this visit */ }
    apply(theme);
    set({ theme });
  },
}));
apply(useTheme.getState().theme);
