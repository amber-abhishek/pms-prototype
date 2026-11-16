import { create } from 'zustand';

/* Light, dark or follow the OS. The choice is kept in localStorage (index.html reads it before first paint, so there
   is no light flash) and the resolved look is applied as `class="dark"` on <html>, which postcss-dark.js keys every
   dark colour off. `theme` is what's on screen (light | dark); `mode` is the picker's choice. */
export type Theme = 'light' | 'dark';
export type ThemeMode = Theme | 'system';
const KEY = 'pms-theme';
const mq = typeof window !== 'undefined' ? window.matchMedia('(prefers-color-scheme: dark)') : undefined;

const readMode = (): ThemeMode => {
  try { const v = localStorage.getItem(KEY); return v === 'dark' || v === 'system' ? v : 'light'; } catch { return 'light'; }
};
const resolve = (m: ThemeMode): Theme => (m === 'system' ? (mq?.matches ? 'dark' : 'light') : m);
const apply = (t: Theme) => {
  const el = document.documentElement;
  el.classList.toggle('dark', t === 'dark');
  el.style.colorScheme = t;
};

export const useTheme = create<{ mode: ThemeMode; theme: Theme; setMode: (m: ThemeMode) => void; setTheme: (t: Theme) => void }>((set, get) => ({
  mode: readMode(),
  theme: resolve(readMode()),
  setMode: (mode) => {
    try { localStorage.setItem(KEY, mode); } catch { /* private window: still switches for this visit */ }
    const theme = resolve(mode);
    apply(theme);
    set({ mode, theme });
  },
  setTheme: (t) => get().setMode(t),
}));
apply(useTheme.getState().theme);

/* System: follow the OS live when it flips. */
mq?.addEventListener('change', () => {
  const { mode } = useTheme.getState();
  if (mode !== 'system') return;
  const theme = resolve(mode);
  apply(theme);
  useTheme.setState({ theme });
});
