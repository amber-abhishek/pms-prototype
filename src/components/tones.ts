import type { Tone } from '../data/seed';

/* Amber Connect status tags (getStatusBadge): the tone at 10% over white, tone text, no border, no icon.
   green = booked/active, red = unpaid/overdue, amber = processing, blue = sky (sent, in progress), purple = upcoming.
   Written out in full so Tailwind can see every class. */
export const toneCls: Record<Tone, string> = {
  green: 'bg-[linear-gradient(#16A34A1A,#16A34A1A),linear-gradient(#fff,#fff)] text-[#16A34A] border-transparent',
  blue: 'bg-[linear-gradient(#0284C71A,#0284C71A),linear-gradient(#fff,#fff)] text-[#0284C7] border-transparent',
  amber: 'bg-[linear-gradient(#E392191A,#E392191A),linear-gradient(#fff,#fff)] text-[#D97706] border-transparent',
  orange: 'bg-[linear-gradient(#EA580C1A,#EA580C1A),linear-gradient(#fff,#fff)] text-[#EA580C] border-transparent',
  red: 'bg-[linear-gradient(#E034341A,#E034341A),linear-gradient(#fff,#fff)] text-[#DC2626] border-transparent',
  purple: 'bg-[linear-gradient(#9333EA1A,#9333EA1A),linear-gradient(#fff,#fff)] text-[#9333EA] border-transparent',
  grey: 'bg-[linear-gradient(#7373731A,#7373731A),linear-gradient(#fff,#fff)] text-[#525252] border-transparent',
};
export const toneDot: Record<Tone, string> = { green: '#16A34A', blue: '#0284C7', amber: '#D97706', orange: '#EA580C', red: '#DC2626', purple: '#9333EA', grey: '#A3A3A3' };
/** Older "outline" tag call sites get the same Connect tag. */
export const toneLine: Record<Tone, string> = toneCls;
