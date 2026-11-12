import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';

import { cn } from '../../lib/cn';

const inputVariants = cva(
  /* 3054:2: 32px, 8px radius, #D4D4D4 border, 14px text; focus is a blue edge with a 25% ring */
  'flex w-full rounded-lg border border-input bg-background px-2.5 text-sm text-[#0A0A0A] shadow-[0_1px_2px_rgba(0,0,0,0.04)] transition-colors ' +
    'file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-gray-400 ' +
    'focus-visible:outline-none focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-primary/25 ' +
    'disabled:cursor-not-allowed disabled:opacity-50',
  { variants: { size: { data: 'h-data', input: 'h-input' } }, defaultVariants: { size: 'input' } },
);

export interface InputProps
  extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'size'>,
    VariantProps<typeof inputVariants> {}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, size, type, ...props }, ref) => (
    <input ref={ref} type={type} className={cn(inputVariants({ size }), className)} {...props} />
  ),
);
Input.displayName = 'Input';
