import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '../../lib/cn';
import { toneCls, toneLine } from '../tones';
import type { Tone } from '../../data/seed';

/* shadcn Badge as the 3755:15780 chip: 22px, r8, 8px sides, 5px gap, 12px medium, tone ground with a 1px border.
   `outline` is the white tag (r6, tone border); `status` is the same chip as `soft` (kept for call sites). */
const tones = Object.keys(toneCls) as Tone[];
/* 2026-11-09: no icon in any pill, on any screen — a leading svg passed by older call sites is hidden here. */
/* Amber Connect tag: 20px, r6, 6px sides, Geist Mono medium 12 uppercase. */
const badgeVariants = cva('inline-flex items-center gap-1 h-5 px-1.5 rounded-[6px] border-0 font-mono text-xs leading-4 font-medium uppercase whitespace-nowrap [&>svg]:hidden', {
  variants: {
    tone: Object.fromEntries(tones.map((t) => [t, ''])) as Record<Tone, string>,
    look: { soft: '', outline: '', status: '' },
  },
  compoundVariants: tones.flatMap((t) => [
    { tone: t, look: 'soft' as const, className: toneCls[t] },
    { tone: t, look: 'status' as const, className: toneCls[t] },
    { tone: t, look: 'outline' as const, className: toneLine[t] },
  ]),
  defaultVariants: { tone: 'grey', look: 'soft' },
});

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement>, VariantProps<typeof badgeVariants> {}

function Badge({ className, tone, look, ...props }: BadgeProps) {
  return <span className={cn(badgeVariants({ tone, look }), className)} {...props} />;
}

export { Badge, badgeVariants };
