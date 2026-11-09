/* Dark mode for the prototype without touching its ~950 hard-coded colours.

   After Tailwind runs, every rule that sets a colour gets a twin scoped to `:where(.dark)` (zero specificity, placed
   straight after the original, so variants and cascade order behave exactly as in light mode). Colours are remapped
   by role, not by a lookup table:
   - surfaces (backgrounds, borders): neutral greys flip to dark greys and keep their order (white card darkest,
     #F3F4F6 hover a step lighter, #E5E7EB lines lighter again); pale tints (#EFF6FF, #E8F7EE) become deep tints of
     the same hue; solid brand fills (#2563EB, #0B8A4C) stay as they are.
   - text: neutral greys invert (ink → near white, #646A78 → mid grey); saturated text is lifted so it reads on dark.
   - shadows: dark shadows deepen; white highlights (the 0 1px 0 #fff on inset rows) all but vanish.
   OVERRIDES pins the few colours the formula gets wrong (the page chrome must sit below the cards).

   Tuned on Mercury's dark mode (2026-11-09), in our own hues:
   - neutrals carry real tint (13% saturation on our 222° grey hue), not flat grey;
   - elevation is a lightness ladder: chrome 7.5% < card 11.5% < subtle 14% < hover 18% < raised 24%;
   - lines sit only a few points above the surface they divide, so cards and rows separate quietly;
   - text is off-white (ink ≈ 88%), secondary ≈ 77%, muted ≈ 63%;
   - colour is desaturated and lifted: vivid text goes pastel, tints become deep low-chroma washes, brand fills
     soften a little so white text still reads. */

const NEUTRAL_HUE = 222;
const NEUTRAL_SAT = 0.13;

const OVERRIDES = {
  bg: { '#f7f7f8': '#101217' },
};

const KIND = (prop) => {
  if (['color', 'fill', 'stroke', 'caret-color', '-webkit-text-fill-color', 'text-decoration-color'].includes(prop)) return 'text';
  if (['box-shadow', '--tw-shadow', '--tw-shadow-colored'].includes(prop)) return 'shadow';
  if (prop.startsWith('border') || prop.startsWith('outline') || prop === '--tw-ring-color' || prop === '--tw-ring-offset-color') return 'border';
  if (prop.startsWith('background') || prop.startsWith('--tw-gradient')) return 'bg';
  return null;
};

const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));

function rgbToHsl(r, g, b) {
  r /= 255; g /= 255; b /= 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  const l = (max + min) / 2;
  if (max === min) return [0, 0, l, 0];
  const d = max - min;
  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
  const h = max === r ? (g - b) / d + (g < b ? 6 : 0) : max === g ? (b - r) / d + 2 : (r - g) / d + 4;
  return [h * 60, s, l, d];
}
function hslToRgb(h, s, l) {
  const k = (n) => (n + h / 30) % 12;
  const a = s * Math.min(l, 1 - l);
  const f = (n) => l - a * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1)));
  return [Math.round(f(0) * 255), Math.round(f(8) * 255), Math.round(f(4) * 255)];
}
const toHex = (r, g, b) => '#' + [r, g, b].map((v) => v.toString(16).padStart(2, '0')).join('');

/** Map one colour for a role. Returns [r, g, b], or null to leave it alone. */
function mapColor(kind, r, g, b) {
  const pinned = OVERRIDES[kind]?.[toHex(r, g, b)];
  if (pinned) return parseHex(pinned.slice(1)).slice(0, 3);
  const [h, s, l, chroma] = rgbToHsl(r, g, b);
  /* Tailwind's cool greys (#111827, #374151, #646A78) carry some chroma, so low saturation counts as neutral too;
     pale tints (#EFF6FF, #E8F7EE) have little chroma but high saturation, so they stay tints. */
  const neutral = chroma < 0.04 || (s < 0.45 && chroma < 0.14) || (l < 0.12 && chroma < 0.1); // last: ink #030712
  const N = (L) => hslToRgb(NEUTRAL_HUE, NEUTRAL_SAT, clamp(L));
  if (kind === 'bg') {
    /* Near-white greys are hover and selected grounds: spread them out so a hover reads against the card. */
    if (neutral) return l >= 0.9 ? N(0.115 + (1 - l) * 1.4) : l >= 0.5 ? N(0.26 + (0.9 - l) * 0.8) : N(0.22 + l * 0.35);
    if (l >= 0.85) return hslToRgb(h, Math.min(s, 0.6) * 0.5, 0.155);
    if (l >= 0.7) return hslToRgb(h, Math.min(s, 0.6) * 0.6, 0.24);
    /* Brand fills (primary buttons, toggles, bars): a touch softer and lighter, as Mercury's periwinkle. */
    if (s > 0.45) return hslToRgb(h, Math.min(s, 0.9) * 0.78, clamp(l + 0.06, 0.38, 0.6));
    return null;
  }
  if (kind === 'border') {
    if (neutral) return l >= 0.5 ? N(0.13 + (1 - l) * 0.6) : N(0.95 - l * 0.8);
    if (l >= 0.75) return hslToRgb(h, Math.min(s, 0.5) * 0.6, 0.235);
    if (l < 0.5) return hslToRgb(h, Math.min(s, 0.9) * 0.7, 0.62);
    return null;
  }
  if (kind === 'text') {
    if (neutral) return l >= 0.85 ? null : N(0.97 - l * 0.75);
    if (l < 0.62) return hslToRgb(h, Math.min(s, 0.9) * 0.5, 0.67 + l * 0.05);
    return null;
  }
  return null;
}

const HEX = /#([0-9a-fA-F]{8}|[0-9a-fA-F]{6}|[0-9a-fA-F]{3,4})\b/g;
const RGB = /rgba?\(\s*(\d{1,3})[\s,]+(\d{1,3})[\s,]+(\d{1,3})\s*(?:([,/])\s*([^)]*?))?\s*\)/g;

function parseHex(h) {
  if (h.length <= 4) h = [...h].map((c) => c + c).join('');
  return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16), h.length === 8 ? h.slice(6, 8) : ''];
}

function shadowColor(r, g, b, a) {
  const [, , l] = rgbToHsl(r, g, b);
  return l > 0.8 ? `rgba(255,255,255,${(a * 0.04).toFixed(3)})` : `rgba(0,0,0,${clamp(a * 2.5).toFixed(3)})`;
}

function mapValue(kind, value) {
  if (kind === 'shadow') {
    return value
      .replace(RGB, (m, r, g, b, sep, a) => {
        if (!sep) return shadowColor(+r, +g, +b, 1);
        return /^[\d.]+$/.test(a) ? shadowColor(+r, +g, +b, parseFloat(a)) : m;
      })
      .replace(HEX, (m, hx) => { const [r, g, b, aa] = parseHex(hx); return shadowColor(r, g, b, aa ? parseInt(aa, 16) / 255 : 1); });
  }
  return value
    .replace(RGB, (m, r, g, b, sep, a) => {
      /* A faint black wash (hover:bg-black/[0.05]) vanishes on dark: make it a slightly stronger white wash. */
      if (kind === 'bg' && sep && /^[\d.]+$/.test(a) && +a < 0.3 && rgbToHsl(+r, +g, +b)[2] < 0.1) return `rgba(255, 255, 255, ${Math.min(0.3, +a * 1.6)})`;
      const c = mapColor(kind, +r, +g, +b);
      if (!c) return m;
      if (!sep) return `rgb(${c[0]} ${c[1]} ${c[2]})`;
      return sep === ',' ? `rgba(${c[0]}, ${c[1]}, ${c[2]}, ${a})` : `rgb(${c[0]} ${c[1]} ${c[2]} / ${a})`;
    })
    .replace(HEX, (m, hx) => {
      const [r, g, b, aa] = parseHex(hx);
      const c = mapColor(kind, r, g, b);
      return c ? toHex(c[0], c[1], c[2]) + aa : m;
    });
}

const inSkippedAtRule = (node) => {
  for (let p = node.parent; p; p = p.parent) if (p.type === 'atrule' && /keyframes|font-face/.test(p.name)) return true;
  return false;
};

/** @type {import('postcss').PluginCreator} */
const plugin = () => ({
  postcssPlugin: 'prototype-dark',
  OnceExit(root) {
    root.walkRules((rule) => {
      if (rule.__dark || inSkippedAtRule(rule)) return;
      const sels = rule.selectors.filter((s) => !/:root|^html\b|\.dark\b/.test(s));
      if (!sels.length) return;
      const decls = [];
      rule.each((d) => {
        if (d.type !== 'decl') return;
        const kind = KIND(d.prop);
        if (!kind) return;
        const v = mapValue(kind, d.value);
        if (v !== d.value) decls.push(d.clone({ value: v }));
      });
      if (!decls.length) return;
      const twin = rule.clone({ selectors: sels.map((s) => `:where(.dark) ${s}`) });
      twin.removeAll();
      decls.forEach((d) => twin.append(d));
      twin.__dark = true;
      rule.after(twin);
    });
  },
});
plugin.postcss = true;
export default plugin;
