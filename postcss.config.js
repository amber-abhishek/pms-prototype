import dark from './postcss-dark.js';

/* postcss-dark runs after Tailwind: it adds a `:where(.dark)` twin of every colour rule (see the file). */
export default { plugins: [(await import('tailwindcss')).default, dark, (await import('autoprefixer')).default] };
