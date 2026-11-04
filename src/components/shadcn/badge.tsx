import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '../../lib/cn';
import { toneCls, toneLine } from '../tones';
import type { Tone } from '../../data/seed';

/* shadcn Badge with the prototype's vibrant tones: 22px, 12px medium. `look` picks the filled pill (8px radius),
   the white tag with a tone border, or the fully round status pill. */
const tones = Object.keys(toneCls) as Tone[];
const badgeVariants = cva('inline-flex items-center gap-1 h-[22px] px-2 text-xs font-medium whitespace-nowrap', {
  variants: {
    tone: Object.fromEntries(tones.map((t) => [t, ''])) as Record<Tone, string>,
    look: { soft: 'rounded-lg', outline: 'rounded-lg border bg-white', status: 'rounded-full' },
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
