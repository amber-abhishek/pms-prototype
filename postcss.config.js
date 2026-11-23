import accent from './postcss-accent.js';
import dark from './postcss-dark.js';

/* After Tailwind: postcss-accent adds a `[data-accent]` twin of every brand-blue rule (theme colour), then postcss-dark
   adds a `:where(.dark)` twin of every colour rule, accent twins included (see each file). */
export default { plugins: [(await import('tailwindcss')).default, accent, dark, (await import('autoprefixer')).default] };
