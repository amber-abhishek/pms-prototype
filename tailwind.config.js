import animate from 'tailwindcss-animate';
import colors from 'tailwindcss/colors';

/* shadcn/ui token names (the same ones packages/ui's preset defines), set to the A8 prototype's values in
   src/styles.css. Unlike the preset, this extends Tailwind's radius and shadow scales instead of replacing them. */
const hsl = (v) => `hsl(var(--${v}))`;

/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      fontFamily: { sans: ['Geist', 'ui-sans-serif', 'system-ui', 'sans-serif'], mono: ['Geist Mono', 'ui-monospace', 'monospace'] },
      colors: {
        ink: '#0A0A0A',
        /* Amber Connect neutrals: every gray-* class reads as neutral-*. */
        gray: colors.neutral,
        chrome: '#FAFAFA', // sidebar, card strips
        band: '#F5F5F5', // page header band
        line: '#E5E5E5',
        background: hsl('background'),
        foreground: hsl('foreground'),
        card: { DEFAULT: hsl('card'), foreground: hsl('card-foreground') },
        popover: { DEFAULT: hsl('popover'), foreground: hsl('popover-foreground') },
        primary: { DEFAULT: hsl('primary'), foreground: hsl('primary-foreground'), hover: hsl('primary-hover'), soft: '#EAF2FF' },
        secondary: { DEFAULT: hsl('secondary'), foreground: hsl('secondary-foreground') },
        muted: { DEFAULT: hsl('muted'), foreground: hsl('muted-foreground') },
        accent: { DEFAULT: hsl('accent'), foreground: hsl('accent-foreground') },
        destructive: { DEFAULT: hsl('destructive'), foreground: hsl('destructive-foreground') },
        success: { DEFAULT: hsl('success'), foreground: hsl('success-foreground') },
        subtle: hsl('subtle'),
        border: hsl('border'),
        input: hsl('input'),
        ring: hsl('ring'),
      },
      height: { data: 'var(--density-data)', input: 'var(--density-input)', compact: 'var(--control-compact)' },
      /* Motion curves. `ease-snappy` (strong ease-out) for things entering or responding; `ease-drawer` (iOS-like)
         for side sheets. tailwindcss-animate reads these too, so `ease-*` works on animate-in/out as well. */
      transitionTimingFunction: { snappy: 'cubic-bezier(0.23, 1, 0.32, 1)', drawer: 'cubic-bezier(0.32, 0.72, 0, 1)' },
      boxShadow: {
        card: '0 1px 2px rgba(17,24,39,0.04)',
        tile: '0 1px 1px rgba(17,24,39,0.04)',
        inset: 'inset 0 1px 2px rgba(17,24,39,0.08), inset 0 0 0 1px rgba(17,24,39,0.06), 0 1px 0 #fff',
        pop: '0 6px 16px -4px rgba(17,24,39,0.08), 0 2px 4px -2px rgba(17,24,39,0.04)',
        overlay: '0 8px 16px rgba(0,0,0,0.10), 0 24px 48px rgba(0,0,0,0.24)',
        /* Amber Connect overlays: centre modal, and the layered side-sheet stack. */
        modal: '0 16px 32px -12px rgba(14,18,27,0.1), 0 0 0 1px rgba(14,18,27,0.02)',
        sheet: '0 0 0 1px rgba(51,51,51,0.04), 0 1px 1px 0.5px rgba(51,51,51,0.04), 0 6px 6px -3px rgba(51,51,51,0.04), 0 12px 12px -6px rgba(51,51,51,0.04), 0 24px 24px -12px rgba(51,51,51,0.04), 0 48px 48px -24px rgba(51,51,51,0.04)',
        menu: '0 4px 6px -1px rgba(0,0,0,0.1), 0 2px 4px -2px rgba(0,0,0,0.1)',
        raised: '0 1px 3px rgba(0,0,0,0.1), 0 1px 2px -1px rgba(0,0,0,0.1)',
        'elevation-0': 'none',
        'elevation-1': '0 1px 2px rgba(17,24,39,0.05)',
        'elevation-2': '0 6px 16px -4px rgba(17,24,39,0.08), 0 2px 4px -2px rgba(17,24,39,0.04)',
      },
    },
  },
  plugins: [animate],
};
