import { useMemo } from 'react';
import { useTheme } from '../data/theme';

/* Empty-state illustrations from the PMS Figma file (Workspace › "Empty states · Illustrations", 4002:18207):
   semi-flat IconScout objects, mostly by the profile-avatar illustrator, partly recoloured to the PMS palette. Shown at 254×200; the SVGs fill their box.
   Dark mode remaps every fill the way postcss-dark.js treats colour: the pale ground sinks to a deep blue wash,
   the rest is desaturated and lifted a touch, so the art sits quietly on the dark canvas. */
const files = import.meta.glob('../assets/empty/*.svg', { query: '?raw', import: 'default', eager: true }) as Record<string, string>;
const art: Record<string, string> = Object.fromEntries(Object.entries(files).map(([p, s]) => [p.split('/').pop()!.replace('.svg', ''), s]));

export type Illo = 'applications' | 'beds' | 'bookings' | 'campuses' | 'caughtUp' | 'conflicts' | 'cycles' | 'enquiries' | 'faults'
  | 'landlords' | 'notices' | 'offers' | 'properties' | 'queueClear' | 'requests' | 'rooms' | 'schedule' | 'team' | 'waitlist'
  /* General-purpose set, semi-flat objects by the profile-avatar illustrator (Figma "Empty states · Illustrations",
     4002:18207), recoloured to the PMS palette: search/filter misses, an empty tab, a 404, scheduling, record lists. */
  | 'noResults' | 'nothingHere' | 'nothingToShow' | 'notFound' | 'calendar' | 'records' | 'noData' | 'getStarted';

/* The older per-module names now draw from the general set, so every empty state uses the one illustration style. */
const ALIAS: Partial<Record<Illo, Illo>> = {
  /* Spread out, so neighbouring pages (and modules) don't all show the same picture. */
  applications: 'nothingToShow', offers: 'nothingHere', bookings: 'records', cycles: 'calendar', waitlist: 'noData', conflicts: 'noResults', queueClear: 'getStarted',
  requests: 'nothingHere', notices: 'calendar', faults: 'getStarted',
  landlords: 'notFound', enquiries: 'nothingToShow',
  properties: 'nothingHere', beds: 'noData', rooms: 'noData',
  team: 'notFound', campuses: 'getStarted', schedule: 'calendar', caughtUp: 'getStarted',
};

/** The illustration for an empty state that doesn't name one: a search/filter miss gets the magnifier, anything else one of a mix, picked by title. */
const MIX: Illo[] = ['nothingHere', 'nothingToShow', 'noData', 'records', 'calendar'];
export const artFor = (title: string): Illo => {
  if (/\bmatch/i.test(title)) return 'noResults';
  let h = 0; for (const ch of title) h = (h * 31 + ch.charCodeAt(0)) >>> 0; // stable per title, varied across pages
  return MIX[h % MIX.length];
};

const hsl = (hex: string) => {
  const n = parseInt(hex.slice(1), 16), r = (n >> 16) / 255, g = ((n >> 8) & 255) / 255, b = (n & 255) / 255;
  const mx = Math.max(r, g, b), mn = Math.min(r, g, b), l = (mx + mn) / 2, d = mx - mn;
  const s = d === 0 ? 0 : d / (1 - Math.abs(2 * l - 1));
  const h = d === 0 ? 0 : mx === r ? ((g - b) / d) % 6 : mx === g ? (b - r) / d + 2 : (r - g) / d + 4;
  return [((h * 60) + 360) % 360, s, l];
};
const toHex = (h: number, s: number, l: number) => {
  const c = (1 - Math.abs(2 * l - 1)) * s, x = c * (1 - Math.abs(((h / 60) % 2) - 1)), m = l - c / 2;
  const [r, g, b] = h < 60 ? [c, x, 0] : h < 120 ? [x, c, 0] : h < 180 ? [0, c, x] : h < 240 ? [0, x, c] : h < 300 ? [x, 0, c] : [c, 0, x];
  return '#' + [r, g, b].map((v) => Math.round((v + m) * 255).toString(16).padStart(2, '0')).join('');
};
const dark = (hex: string) => {
  const [h, s, l] = hsl(hex);
  if (l > 0.9) return toHex(h, s * 0.35, 0.17); // grounds (#EFF6FF, #F9FAFB) → deep wash on the card
  return toHex(h, s * 0.6, 0.22 + l * 0.5); // bodies and accents: calmer, kept readable
};

export function Illustration({ name, className }: { name: Illo; className?: string }) {
  const theme = useTheme((s) => s.theme);
  const svg = useMemo(() => {
    const s = art[ALIAS[name] ?? name] ?? '';
    return theme === 'dark' ? s.replace(/#[0-9A-Fa-f]{6}\b/g, dark) : s;
  }, [name, theme]);
  return <span aria-hidden className={className ?? 'block w-[254px] h-[200px] mx-auto shrink-0'} dangerouslySetInnerHTML={{ __html: svg }} />;
}
