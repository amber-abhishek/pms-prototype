import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import { makeSeed, type Seed } from './seed';

export type Role = 'admin' | 'offcampus';

type State = Seed & {
  role: Role;
  setRole: (r: Role) => void;
  reset: () => void;
  /** Replace one collection with a function of itself. */
  patch: <K extends keyof Seed>(key: K, fn: (v: Seed[K]) => Seed[K]) => void;
  /** Add a line to the activity log, as "You". */
  log: (what: string, area: string) => void;
};

export const useDb = create<State>()(
  persist(
    (set) => ({
      ...makeSeed(),
      role: 'admin',
      setRole: (role) => set({ role }),
      reset: () => { set({ ...makeSeed() }); try { sessionStorage.clear(); } catch { /* ignore */ } location.reload(); },
      patch: (key, fn) => set((st) => ({ [key]: fn(st[key]) }) as Partial<State>),
      log: (what, area) => set((st) => ({ activity: [{ id: `ac${Date.now()}`, who: 'You', what, when: 'Just now', area }, ...st.activity] })),
    }),
    { name: 'pms-prototype-v1', storage: createJSONStorage(() => sessionStorage) },
  ),
);

export const uid = (p: string) => `${p}${Math.random().toString(36).slice(2, 8)}`;

export function useProperty() {
  const properties = useDb((s) => s.properties);
  return (id: string) => properties.find((p) => p.id === id)?.name ?? '—';
}
