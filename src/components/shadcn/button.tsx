import * as React from 'react';
import { Slot } from '@radix-ui/react-slot';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '../../lib/cn';

/* shadcn Button, restyled to the A8 frames: 32px (14px medium) / 28px (12px medium), 8px radius.
   `outline` is the white bordered secondary button; `destructive-outline` is Settings → Danger zone. */
const buttonVariants = cva(
  /* Press feedback: a quick 0.97 scale on :active, so every button confirms the click. */
  'inline-flex items-center justify-center gap-1.5 whitespace-nowrap rounded-lg font-medium leading-5 transition-[color,background-color,border-color,transform] duration-150 ease-snappy active:scale-[0.97] ' +
    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background ' +
    'disabled:pointer-events-none disabled:opacity-50',
  {
    variants: {
      variant: {
        default: 'bg-primary text-primary-foreground hover:bg-primary-hover shadow-[inset_0_1px_0_rgba(255,255,255,0.14),0_1px_2px_rgba(37,99,235,0.28)]',
        outline: 'border border-border bg-background text-[#111827] hover:bg-subtle shadow-[0_1px_2px_rgba(0,0,0,0.05)]',
        secondary: 'bg-secondary text-secondary-foreground hover:bg-secondary/80',
        ghost: 'text-gray-700 hover:bg-secondary hover:text-[#111827]',
        'destructive-ghost': 'text-[#B91C1C] hover:bg-[#FEF2F2] hover:text-[#991B1B]',
        destructive: 'bg-destructive text-destructive-foreground hover:bg-[#C81E33] shadow-[inset_0_1px_0_rgba(255,255,255,0.14),0_1px_2px_rgba(224,36,58,0.28)]',
        'destructive-outline': 'border border-border bg-background text-[#B91C1C] hover:bg-[#FEF2F2] shadow-[0_1px_2px_rgba(0,0,0,0.05)]',
        success: 'bg-success text-success-foreground hover:bg-[#08703D]',
      },
      size: { sm: 'h-compact px-2.5 text-xs', default: 'h-data px-3 text-sm', lg: 'h-10 px-4 text-sm' },
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
