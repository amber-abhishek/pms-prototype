import * as React from 'react';
import { cn } from '../../lib/cn';

/* shadcn NativeSelect: a styled <select> that keeps the browser's own option list (best on touch and for
   long lists). Chevrons-up-down, 14px #A3A3A3, 10px from the right edge, drawn as a background image so
   the select stays a single element and width classes land on it. */
const arrow = `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='14' height='14' viewBox='0 0 24 24' fill='none' stroke='%239CA3AF' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='m7 15 5 5 5-5'/%3E%3Cpath d='m7 9 5-5 5 5'/%3E%3C/svg%3E")`;

const NativeSelect = React.forwardRef<HTMLSelectElement, React.ComponentProps<'select'>>(({ className, style, ...props }, ref) => (
  <select
    ref={ref}
    className={cn(
      'h-data w-full appearance-none rounded-lg border border-input bg-background bg-no-repeat bg-[position:right_10px_center] pl-2.5 pr-8 text-sm text-[#0A0A0A] ' +
        'focus-visible:outline-none focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-primary/25 disabled:cursor-not-allowed disabled:opacity-50',
      className,
    )}
    style={{ backgroundImage: arrow, ...style }}
    {...props}
  />
));
NativeSelect.displayName = 'NativeSelect';

export { NativeSelect };
