import * as React from 'react';
import { Slot } from '@radix-ui/react-slot';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '../../lib/cn';

/* shadcn Button in the Amber Connect style (2026-11-12): 32px (14px medium) / 28px (12px medium), r8.
   `default` is the #0C63F8 primary with a white top sheen and a 1px blue ring; `outline`, `tertiary` and `control`
   are the white secondary with a #E5E5E5 edge and a 1px drop; ghosts have no edge until hover. */
/* Connect outline: 1px #E5E5E5, r8, white, xs drop. Primary: r10, white 16% sheen over #0C63F8, a 12% white edge,
   a 1px #1B6DF8 ring and a cool 24% drop; hover dims to 90%. */
const pillOutline = 'rounded-lg border border-[#E5E5E5] bg-white text-[#0A0A0A] shadow-[0_1px_2px_rgba(0,0,0,0.05)] hover:bg-[#F5F5F5]';
/* Figma 3884:39809 "Add property": r8, 32px inside the ring. */
const sheen = 'rounded-lg border border-white/[0.12] text-white hover:opacity-90 ';
const buttonVariants = cva(
  /* Press feedback: a quick 0.97 scale on :active, so every button confirms the click. */
  'inline-flex items-center justify-center gap-1.5 whitespace-nowrap font-medium leading-5 transition-[color,background-color,border-color,transform,filter] duration-150 ease-snappy active:scale-[0.97] ' +
    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background ' +
    'disabled:pointer-events-none disabled:opacity-50',
  {
    variants: {
      variant: {
        default:
          sheen + 'bg-[linear-gradient(180deg,rgba(255,255,255,0.16),rgba(255,255,255,0)),linear-gradient(#0C63F8,#0C63F8)] ' +
          'shadow-[0_1px_2px_rgba(14,18,27,0.24),0_0_0_1px_#1B6DF8]',
        outline: pillOutline,
        tertiary: pillOutline,
        control: pillOutline,
        secondary: 'rounded-lg bg-secondary text-secondary-foreground hover:bg-[#EBEBEB]',
        ghost: 'rounded-lg border border-transparent text-[#0A0A0A] hover:bg-[#F5F5F5]',
        'destructive-ghost': 'rounded-lg border border-transparent text-[#DC2626] hover:bg-[#FEF2F2]',
        destructive:
          sheen + 'bg-[linear-gradient(180deg,rgba(255,255,255,0.16),rgba(255,255,255,0)),linear-gradient(#DC2626,#DC2626)] ' +
          'shadow-[0_1px_2px_rgba(14,18,27,0.24),0_0_0_1px_#DC2626]',
        'destructive-outline': pillOutline.replace('text-[#0A0A0A]', 'text-[#DC2626]'),
        success: 'rounded-lg bg-[#16A34A] text-success-foreground hover:bg-[#15803D] shadow-[0_0_0_1px_#16A34A,0_1px_2px_rgba(0,0,0,0.12)]',
      },
      /* Connect: 34px buttons with 6/12 padding (primary 6/20), 14px medium; sm for in-row actions. */
      size: { sm: 'h-7 px-2.5 text-[13px]', default: 'h-[34px] px-3 text-sm', lg: 'h-9 px-5 text-sm' },
    },
    defaultVariants: { variant: 'default', size: 'default' },
  },
);

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement>, VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(({ className, variant, size, asChild = false, ...props }, ref) => {
  const Comp = asChild ? Slot : 'button';
  return <Comp ref={ref} className={cn(buttonVariants({ variant, size, className }))} {...props} />;
});
Button.displayName = 'Button';

export { buttonVariants };
