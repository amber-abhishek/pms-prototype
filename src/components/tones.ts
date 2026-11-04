import type { Tone } from '../data/seed';

/* Vibrant tones (2820:111, 3055:2): green #0B8A4C on #E8F7EE, blue #1F45E0 on #EFF6FF, grey #374151 on #F3F4F6,
   purple #6E3BD8, orange #E5530C, amber #A16207, red #E0243A. */
export const toneCls: Record<Tone, string> = {
  green: 'bg-[#E8F7EE] text-[#0B8A4C]',
  blue: 'bg-[#EFF6FF] text-[#1F45E0]',
  amber: 'bg-[#FFF6E0] text-[#A16207]',
  orange: 'bg-[#FFF0E0] text-[#E5530C]',
  red: 'bg-[#FFE3E7] text-[#E0243A]',
  purple: 'bg-[#F3EEFF] text-[#6E3BD8]',
  grey: 'bg-[#F3F4F6] text-[#374151]',
};
export const toneDot: Record<Tone, string> = { green: '#0B8A4C', blue: '#1F45E0', amber: '#C47A00', orange: '#E5530C', red: '#E0243A', purple: '#6E3BD8', grey: '#9CA3AF' };
/** Tag style: white ground, border in the text colour at 35%. */
export const toneLine: Record<Tone, string> = {
  green: 'border-[#0B8A4C]/35 text-[#0B8A4C]', blue: 'border-[#1F45E0]/35 text-[#1F45E0]', amber: 'border-[#A16207]/35 text-[#A16207]',
  orange: 'border-[#E5530C]/35 text-[#E5530C]', red: 'border-[#E0243A]/35 text-[#E0243A]', purple: 'border-[#6E3BD8]/35 text-[#6E3BD8]', grey: 'border-line text-[#374151]',
};
