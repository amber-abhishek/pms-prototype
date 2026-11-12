// Prototype sign-in state. Mirrors apps/accounts: email → 6-digit code → (operator picker) → in.
// No real auth: any 6 digits sign you in, except the demo codes below.
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

export type Remembered = { email: string; name: string; tenantId?: string };
export type Tenant = { id: string; name: string; host: string };

/** Demo codes: 000000 is a wrong code, 999999 an expired one. Anything else signs you in. */
export const WRONG_CODE = '000000';
export const EXPIRED_CODE = '999999';
export const RESEND_SECONDS = 60;

/** Amber staff accounts reach several operators, so they get the picker; everyone else goes straight in. */
export const TENANTS: Tenant[] = [
  { id: 'durham', name: 'Durham Residences', host: 'durham.pms.app' },
  { id: 'newcastle', name: 'Newcastle Residences', host: 'newcastle.pms.app' },
  { id: 'york', name: 'York Residences', host: 'york.pms.app' },
];
export const needsPicker = (email: string) => /@pms\.app$/i.test(email.trim());

/** A display name from an email, for the "You're in" line: priya.shah@… → Priya Shah. */
export const nameFrom = (email: string) =>
  email.split('@')[0].split(/[._-]+/).filter(Boolean).map((w) => w[0].toUpperCase() + w.slice(1)).join(' ') || email;

type Auth = {
  signedIn: boolean;
  remembered?: Remembered;
  signIn: (r: Remembered) => void;
  signOut: () => void;
  forget: () => void;
};

export const useAuth = create<Auth>()(
  persist(
    (set) => ({
      signedIn: true,
      remembered: { email: 'priya.shah@durham.ac.uk', name: 'Priya Shah', tenantId: 'durham' },
      signIn: (remembered) => set({ signedIn: true, remembered }),
      signOut: () => set({ signedIn: false }),
      forget: () => set({ remembered: undefined }),
    }),
    { name: 'pms-prototype-auth', storage: createJSONStorage(() => sessionStorage) },
  ),
);
