import { create } from 'zustand';

/* Which navigation shell the prototype shows, picked from the account menu and kept in localStorage:
   v1 = the single Connect sidebar, v2 = the Connect rail + page panel inside the content card (Figma 3966:17148). */
export type ShellVersion = 'v1' | 'v2';
export const SHELL_VERSIONS: ShellVersion[] = ['v1', 'v2'];
const KEY = 'pms-shell-version';

const read = (): ShellVersion => {
  try {
    const v = localStorage.getItem(KEY);
    return v === 'v1' || v === 'v2' ? v : 'v2';
  } catch { return 'v2'; }
};

export const useShellVersion = create<{ version: ShellVersion; setVersion: (v: ShellVersion) => void }>((set) => ({
  version: read(),
  setVersion: (version) => {
    try { localStorage.setItem(KEY, version); } catch { /* private window: still switches for this visit */ }
    set({ version });
  },
}));
