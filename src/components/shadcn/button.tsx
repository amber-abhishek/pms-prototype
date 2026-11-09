import * as React from 'react';
import { Slot } from '@radix-ui/react-slot';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '../../lib/cn';

/* shadcn Button, restyled to the New elements sheet (Figma 3755:15780): 32px (14px medium) / 28px (12px medium).
   Actions are pills (r999): `default` is the blue gradient primary, `outline` the white secondary with a gradient edge,
   `tertiary` the grey quick action (Home action row), `destructive` the red primary. `control` is the bordered r8
   square for filters, sort pickers, Display and header pickers; it never becomes a pill. Ghosts stay r8. */
const pillOutline =
  'rounded-full border border-transparent text-[#111827] shadow-[0_1px_2px_rgba(17,24,39,0.06)] ' +
  '[background:linear-gradient(180deg,#FFFFFF,#F4F5F7)_padding-box,linear-gradient(180deg,#F7F8FA,#D3D7DE)_border-box] ' +
  'hover:[background:linear-gradient(180deg,#FAFAFB,#EDEFF2)_padding-box,linear-gradient(180deg,#F1F2F5,#C9CED7)_border-box]';
const buttonVariants = cva(
  /* Press feedback: a quick 0.97 scale on :active, so every button confirms the click. */
  'inline-flex items-center justify-center gap-1.5 whitespace-nowrap font-medium leading-5 transition-[color,background-color,border-color,transform,filter] duration-150 ease-snappy active:scale-[0.97] ' +
    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background ' +
    'disabled:pointer-events-none disabled:opacity-50',
  {
    variants: {
      variant: {
        default:
          'rounded-full border border-[#1D52D6] text-primary-foreground bg-[linear-gradient(180deg,#4A86F8_0%,#2563EB_55%,#1F58DD_100%)] hover:brightness-[0.95] ' +
          'shadow-[0_2px_6px_-2px_rgba(37,99,235,0.35),0_1px_2px_rgba(37,99,235,0.35),inset_0_1px_0_rgba(255,255,255,0.28)]',
        outline: pillOutline,
        tertiary:
          'rounded-full text-[#111827] bg-[linear-gradient(180deg,#F8F9FA,#EFF0F3)] hover:bg-[linear-gradient(180deg,#F1F2F4,#E6E8EC)] ' +
          'shadow-[inset_0_0_0_1px_rgba(17,24,39,0.05),inset_0_1px_0_rgba(255,255,255,0.9)]',
        control: 'rounded-lg border border-border bg-background text-[#111827] hover:bg-subtle shadow-[0_1px_2px_rgba(17,24,39,0.05)]',
        secondary: 'rounded-lg bg-secondary text-secondary-foreground hover:bg-secondary/80',
        /* 3783:47751: no border or fill at rest; hover = #F3F4F6 pill with a 1px #E5E7EB border. */
        ghost: 'rounded-full border border-transparent text-[#111827] hover:bg-[#F3F4F6] hover:border-[#E5E7EB]',
        'destructive-ghost': 'rounded-full border border-transparent text-[#B91C1C] hover:bg-[#FEF2F2] hover:border-[#FECACA] hover:text-[#991B1B]',
        destructive:
          'rounded-full border border-[#B91C30] text-destructive-foreground bg-[linear-gradient(180deg,#F04452_0%,#E0243A_55%,#C81E33_100%)] hover:brightness-[0.95] ' +
          'shadow-[0_2px_6px_-2px_rgba(224,36,58,0.35),0_1px_2px_rgba(224,36,58,0.35),inset_0_1px_0_rgba(255,255,255,0.28)]',
        'destructive-outline': pillOutline.replace('text-[#111827]', 'text-[#B91C1C]'),
        success: 'rounded-full bg-success text-success-foreground hover:bg-[#08703D] shadow-[inset_0_1px_0_rgba(255,255,255,0.2),0_1px_2px_rgba(11,138,76,0.3)]',
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
