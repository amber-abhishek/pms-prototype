import type { Tone } from '../data/seed';

/* One pill everywhere (2026-11-13): the Properties tag pill — the tone at 10% over white, deep tone text
   (the tag palette, not the brighter status hues), no border, no icon.
   green = booked/active, red = unpaid/overdue, amber = processing, blue = sky (sent, in progress), purple = upcoming.
   Written out in full so Tailwind can see every class. */
export const toneCls: Record<Tone, string> = {
  green: 'bg-[linear-gradient(#087A431A,#087A431A),linear-gradient(#fff,#fff)] text-[#087A43] border-transparent',
  blue: 'bg-[linear-gradient(#1F45E01A,#1F45E01A),linear-gradient(#fff,#fff)] text-[#1F45E0] border-transparent',
  amber: 'bg-[linear-gradient(#9A5B001A,#9A5B001A),linear-gradient(#fff,#fff)] text-[#9A5B00] border-transparent',
  orange: 'bg-[linear-gradient(#C2410C1A,#C2410C1A),linear-gradient(#fff,#fff)] text-[#C2410C] border-transparent',
  red: 'bg-[linear-gradient(#C8102E1A,#C8102E1A),linear-gradient(#fff,#fff)] text-[#C8102E] border-transparent',
  purple: 'bg-[linear-gradient(#6E3BD81A,#6E3BD81A),linear-gradient(#fff,#fff)] text-[#6E3BD8] border-transparent',
  grey: 'bg-[linear-gradient(#4040401A,#4040401A),linear-gradient(#fff,#fff)] text-[#404040] border-transparent',
};
export const toneDot: Record<Tone, string> = { green: '#087A43', blue: '#1F45E0', amber: '#9A5B00', orange: '#C2410C', red: '#C8102E', purple: '#6E3BD8', grey: '#A3A3A3' };
/** Older "outline" tag call sites get the same Connect tag. */
export const toneLine: Record<Tone, string> = toneCls;
