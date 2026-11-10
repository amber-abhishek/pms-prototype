import type { Tone } from '../data/seed';

/* Chips (3755:15780): vibrant ground, vivid text and a 1px border a shade darker than the ground. */
export const toneCls: Record<Tone, string> = {
  green: 'bg-[#E8F7EE] text-[#087A43] border-[#DDF3E6]',
  blue: 'bg-[#EFF6FF] text-[#1F45E0] border-[#E0EEFF]',
  amber: 'bg-[#FFF6E0] text-[#9A5B00] border-[#FFF2D1]',
  orange: 'bg-[#FFF0E0] text-[#C2410C] border-[#FFE9D2]',
  red: 'bg-[#FEEFEE] text-[#C11F14] border-[#FCE1E0]',
  purple: 'bg-[#F3EEFF] text-[#6E3BD8] border-[#E9E0FF]',
  grey: 'bg-[#F3F4F6] text-[#374151] border-[#ECEDF0]',
};
export const toneDot: Record<Tone, string> = { green: '#0B8A4C', blue: '#1F45E0', amber: '#C47A00', orange: '#E5530C', red: '#D92D20', purple: '#6E3BD8', grey: '#9CA3AF' };
/** Tag style: white ground, border in the text colour at 35%. */
export const toneLine: Record<Tone, string> = {
  green: 'border-[#087A43]/35 text-[#087A43]', blue: 'border-[#1F45E0]/35 text-[#1F45E0]', amber: 'border-[#9A5B00]/35 text-[#9A5B00]',
  orange: 'border-[#C2410C]/35 text-[#C2410C]', red: 'border-[#C11F14]/35 text-[#C11F14]', purple: 'border-[#6E3BD8]/35 text-[#6E3BD8]', grey: 'border-line text-[#374151]',
};
