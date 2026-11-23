/* Theme colour (account menu → Theme colour, 2026-11-23) without touching the ~100 hard-coded brand blues.

   After Tailwind runs, every rule that uses a brand-blue shade gets one twin per accent, scoped to
   `:where([data-accent="<name>"])` (zero specificity, placed straight after the original, so variants and cascade order
   behave as before). `data-accent` sits on <body> (src/data/accent.ts), which keeps it a descendant of `html.dark`:
   postcss-dark runs next and gives each twin its own `:where(.dark)` twin, so dark mode follows the accent too.
   Only the brand-blue ramp is mapped (one Tailwind-like shade per step); other blues are left alone. */

const BLUE = {
  '600': '#2563EB', '700': '#1D4ED8', '500': '#3B82F6', '300': '#93C5FD', '200': '#BFDBFE', '100': '#DBEAFE', '50': '#EFF6FF', soft: '#EAF2FF',
};
export const ACCENTS = {
  purple: { '600': '#7C3AED', '700': '#6D28D9', '500': '#8B5CF6', '300': '#C4B5FD', '200': '#DDD6FE', '100': '#EDE9FE', '50': '#F5F3FF', soft: '#F1EDFF' },
  pink: { '600': '#DB2777', '700': '#BE185D', '500': '#EC4899', '300': '#F9A8D4', '200': '#FBCFE8', '100': '#FCE7F3', '50': '#FDF2F8', soft: '#FDEEF6' },
  green: { '600': '#0B8A4C', '700': '#047857', '500': '#10B981', '300': '#6EE7B7', '200': '#A7F3D0', '100': '#D1FAE5', '50': '#ECFDF5', soft: '#E8F8F0' },
  orange: { '600': '#EA580C', '700': '#C2410C', '500': '#F97316', '300': '#FDBA74', '200': '#FED7AA', '100': '#FFEDD5', '50': '#FFF7ED', soft: '#FFF1E6' },
};

const rgb = (hex) => [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16));
/* Other brand blues in the code (the pager, focus edges, selected rows…). Each borrows the ramp step closest in lightness.
   Left out on purpose: the blue status tone #1F45E0 (tags mean "sent / in progress", not the brand) and illustration navies. */
const EXTRA = ['#0C63F8', '#1A6CF8', '#1B6DF8', '#0A56D9', '#2B5CFF', '#5B8DFF', '#1E40AF', '#EAF0FF', '#EDF3FF', '#EEF4FF', '#EEF2FF', '#D3E0FF', '#DCE6FF', '#D9E3FF', '#C7D6FE', '#A9C1FC'];
const light = (hex) => { const c = rgb(hex).map((v) => v / 255); return (Math.max(...c) + Math.min(...c)) / 2; };
for (const hex of EXTRA) {
  const step = Object.keys(BLUE).reduce((best, k) => (Math.abs(light(BLUE[k]) - light(hex)) < Math.abs(light(BLUE[best]) - light(hex)) ? k : best), '600');
  BLUE[`x${hex}`] = hex;
  for (const ramp of Object.values(ACCENTS)) ramp[`x${hex}`] = ramp[step];
}
const esc = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
/* Each blue as #hex, rgb(r g b …) and rgb(r, g, b …), the forms Tailwind and hand-written CSS use. */
const PATTERNS = Object.entries(BLUE).map(([step, hex]) => {
  const [r, g, b] = rgb(hex);
  return { step, re: new RegExp(`${esc(hex)}|rgba?\\(\\s*${r}[\\s,]+${g}[\\s,]+${b}(?=[\\s,/)])`, 'gi') };
});
const has = (v) => PATTERNS.some((p) => { p.re.lastIndex = 0; return p.re.test(v); });
const swap = (v, ramp) => PATTERNS.reduce((out, { step, re }) => out.replace(re, (m) => {
  if (m.startsWith('#')) return ramp[step];
  const [r, g, b] = rgb(ramp[step]);
  return m.includes(',') ? `${m.slice(0, m.indexOf('('))}(${r}, ${g}, ${b}` : `${m.slice(0, m.indexOf('('))}(${r} ${g} ${b}`;
}), v);

export default function accent() {
  return {
    postcssPlugin: 'pms-accent',
    OnceExit(root) {
      root.walkRules((rule) => {
        if (rule.parent?.type === 'atrule' && /keyframes/i.test(rule.parent.name)) return;
        if (rule.selectors.some((s) => s.includes('[data-accent'))) return;
        const decls = rule.nodes.filter((n) => n.type === 'decl' && has(n.value));
        if (!decls.length) return;
        const sels = rule.selectors.filter((s) => !/:root|^html\b|^body\b/.test(s));
        if (!sels.length) return;
        let after = rule;
        for (const [name, ramp] of Object.entries(ACCENTS)) {
          const twin = rule.clone({ selectors: sels.map((s) => `:where([data-accent="${name}"]) ${s}`) });
          twin.removeAll();
          decls.forEach((d) => twin.append(d.clone({ value: swap(d.value, ramp) })));
          after.after(twin);
          after = twin;
        }
      });
    },
  };
}
accent.postcss = true;
