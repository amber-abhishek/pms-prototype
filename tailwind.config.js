import animate from 'tailwindcss-animate';

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
        ink: '#030712',
        chrome: '#F7F7F8', // A8 frame 3355:117310 page background
        line: '#E5E7EB',
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
        pop: '0 12px 32px -4px rgba(0,0,0,0.14), 0 4px 8px -4px rgba(0,0,0,0.06)',
        overlay: '0 8px 16px rgba(0,0,0,0.10), 0 24px 48px rgba(0,0,0,0.24)',
        'elevation-0': 'none',
        'elevation-1': '0 1px 2px rgba(17,24,39,0.05)',
        'elevation-2': '0 12px 32px -4px rgba(0,0,0,0.14), 0 4px 8px -4px rgba(0,0,0,0.06)',
      },
    },
  },
  plugins: [animate],
};
