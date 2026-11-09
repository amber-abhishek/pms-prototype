import type { Tone } from '../data/seed';

/* Chips (3755:15780): vibrant ground, vivid text and a 1px border a shade darker than the ground. */
export const toneCls: Record<Tone, string> = {
  green: 'bg-[#E8F7EE] text-[#0B8A4C] border-[#DDF3E6]',
  blue: 'bg-[#EFF6FF] text-[#1F45E0] border-[#E0EEFF]',
  amber: 'bg-[#FFF6E0] text-[#C47A00] border-[#FFF2D1]',
  orange: 'bg-[#FFF0E0] text-[#E5530C] border-[#FFE9D2]',
  red: 'bg-[#FEEFEE] text-[#D92D20] border-[#FCE1E0]',
  purple: 'bg-[#F3EEFF] text-[#6E3BD8] border-[#E9E0FF]',
  grey: 'bg-[#F3F4F6] text-[#374151] border-[#ECEDF0]',
};
export const toneDot: Record<Tone, string> = { green: '#0B8A4C', blue: '#1F45E0', amber: '#C47A00', orange: '#E5530C', red: '#D92D20', purple: '#6E3BD8', grey: '#9CA3AF' };
/** Tag style: white ground, border in the text colour at 35%. */
export const toneLine: Record<Tone, string> = {
  green: 'border-[#0B8A4C]/35 text-[#0B8A4C]', blue: 'border-[#1F45E0]/35 text-[#1F45E0]', amber: 'border-[#C47A00]/35 text-[#C47A00]',
  orange: 'border-[#E5530C]/35 text-[#E5530C]', red: 'border-[#D92D20]/35 text-[#D92D20]', purple: 'border-[#6E3BD8]/35 text-[#6E3BD8]', grey: 'border-line text-[#374151]',
};
