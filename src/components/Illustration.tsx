import { useMemo } from 'react';
import { useTheme } from '../data/theme';

/* Empty-state illustrations from the PMS Figma file (IconScout "Free Empty States", recoloured to the PMS blue
   with contextual accents; e.g. Workspace › Inventory · Empty states, 3706:18973). Exported from Figma, 203×160.
   Dark mode remaps every fill the way postcss-dark.js treats colour: the pale ground sinks to a deep blue wash,
   the rest is desaturated and lifted a touch, so the art sits quietly on the dark canvas. */
const files = import.meta.glob('../assets/empty/*.svg', { query: '?raw', import: 'default', eager: true }) as Record<string, string>;
const art: Record<string, string> = Object.fromEntries(Object.entries(files).map(([p, s]) => [p.split('/').pop()!.replace('.svg', ''), s]));

export type Illo = 'applications' | 'beds' | 'bookings' | 'campuses' | 'caughtUp' | 'conflicts' | 'cycles' | 'enquiries' | 'faults'
  | 'landlords' | 'notices' | 'offers' | 'properties' | 'queueClear' | 'requests' | 'rooms' | 'schedule' | 'team' | 'waitlist';

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
    const s = art[name] ?? '';
    return theme === 'dark' ? s.replace(/#[0-9A-Fa-f]{6}\b/g, dark) : s;
  }, [name, theme]);
  return <span aria-hidden className={className ?? 'block w-[203px] h-[160px] mx-auto shrink-0'} dangerouslySetInnerHTML={{ __html: svg }} />;
}
