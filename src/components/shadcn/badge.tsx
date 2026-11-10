import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '../../lib/cn';
import { toneCls, toneLine } from '../tones';
import type { Tone } from '../../data/seed';

/* shadcn Badge as the 3755:15780 chip: 22px, r8, 8px sides, 5px gap, 12px medium, tone ground with a 1px border.
   `outline` is the white tag (r6, tone border); `status` is the same chip as `soft` (kept for call sites). */
const tones = Object.keys(toneCls) as Tone[];
/* 2026-11-09: no icon in any pill, on any screen — a leading svg passed by older call sites is hidden here. */
const badgeVariants = cva('inline-flex items-center gap-1 h-[22px] px-2 border text-xs font-medium whitespace-nowrap [&>svg]:hidden', {
  variants: {
    tone: Object.fromEntries(tones.map((t) => [t, ''])) as Record<Tone, string>,
    look: { soft: 'rounded-lg', outline: 'rounded-md bg-white', status: 'rounded-lg' },
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
