import * as React from 'react';
import * as SheetPrimitive from '@radix-ui/react-dialog';
import { X } from 'lucide-react';
import { cn } from '../../lib/cn';
import { GhostZone } from '../headerCtx'

/* shadcn Sheet (Radix Dialog) in the Amber Connect drawer look: 16px inset, r20,
   20px header (18px medium title, 30px bordered chevrons and close), 20px body padding, 64px footer, #E5E5E5 rules, and the same #0A0A0A 40% scrim as modals (Figma "Dim"), no blur.
   Radix gives it focus trapping, Escape to close, scroll lock and the dialog roles. */
const Sheet = SheetPrimitive.Root;
const SheetTrigger = SheetPrimitive.Trigger;
const SheetClose = SheetPrimitive.Close;
const SheetPortal = SheetPrimitive.Portal;

/** Set when the header chevrons step to another record. A sheet that remounts right after (pages key the sheet by
 *  record so its form resets) skips its slide-in and scrim fade, so stepping swaps content in place. */
export const sheetStep = { at: 0 };
const useStepped = () => React.useState(() => Date.now() - sheetStep.at < 500)[0];

const SheetOverlay = React.forwardRef<React.ElementRef<typeof SheetPrimitive.Overlay>, React.ComponentPropsWithoutRef<typeof SheetPrimitive.Overlay>>(
  ({ className, ...props }, ref) => (
    <SheetPrimitive.Overlay
      ref={ref}
      className={cn('fixed inset-0 z-50 bg-[#0A0A0A]/40 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0', className)}
      {...props}
    />
  ),
);
SheetOverlay.displayName = SheetPrimitive.Overlay.displayName;

const SheetContent = React.forwardRef<React.ElementRef<typeof SheetPrimitive.Content>, React.ComponentPropsWithoutRef<typeof SheetPrimitive.Content>>(
  ({ className, children, ...props }, ref) => {
    const stepped = useStepped();
    return (
    <GhostZone.Provider value={false}><SheetPortal>
      <SheetOverlay className={stepped ? 'data-[state=open]:!animate-none' : undefined} />
      <SheetPrimitive.Content
        ref={ref}
        className={cn(
          /* Amber Connect drawer: floats 16px in, r20, no border, the layered 4% shadow stack. */
          'fixed right-4 top-4 bottom-4 z-50 flex max-w-[calc(100vw-32px)] flex-col overflow-hidden rounded-[20px] bg-background shadow-sheet outline-none',
          'data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=open]:slide-in-from-right-4 data-[state=open]:fade-in-0 data-[state=closed]:slide-out-to-right-4 data-[state=closed]:fade-out-0 data-[state=open]:duration-200 data-[state=closed]:duration-150 ease-drawer',
          stepped && 'data-[state=open]:!animate-none',
          className,
        )}
        {...props}
        /* When stepping, don't jump focus into the new record's first field: ↑/↓ keep stepping. */
        onOpenAutoFocus={stepped ? (e) => e.preventDefault() : props.onOpenAutoFocus}
      >
        {children}
      </SheetPrimitive.Content>
    </SheetPortal></GhostZone.Provider>
    );
  },
);
SheetContent.displayName = SheetPrimitive.Content.displayName;

/** Connect drawer header: 20px padding, #E5E5E5 rule, the 30px bordered close button on the right. */
const SheetHeader = ({ className, children, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
  <header className={cn('shrink-0 p-5 flex items-center gap-3 border-b border-[#E5E5E5]', className)} {...props}>
    {children}
    <SheetPrimitive.Close className="ml-auto size-7 shrink-0 rounded-lg border border-[#E5E5E5] bg-white shadow-[0_1px_2px_rgba(0,0,0,0.05)] text-[#0A0A0A] hover:bg-[#F5F5F5] flex items-center justify-center focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
      <X size={16} strokeWidth={1.5} />
      <span className="sr-only">Close</span>
    </SheetPrimitive.Close>
  </header>
);
SheetHeader.displayName = 'SheetHeader';

const SheetBody = ({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) => <div className={cn('flex-1 overflow-auto p-5', className)} {...props} />;
SheetBody.displayName = 'SheetBody';

const SheetFooter = ({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
  <footer className={cn('h-16 shrink-0 px-5 flex items-center justify-end gap-2 border-t border-[#E5E5E5]', className)} {...props} />
);
SheetFooter.displayName = 'SheetFooter';

const SheetTitle = React.forwardRef<React.ElementRef<typeof SheetPrimitive.Title>, React.ComponentPropsWithoutRef<typeof SheetPrimitive.Title>>(
  ({ className, ...props }, ref) => <SheetPrimitive.Title ref={ref} className={cn('text-lg leading-7 font-medium text-[#0A0A0A] truncate', className)} {...props} />,
);
SheetTitle.displayName = SheetPrimitive.Title.displayName;

const SheetDescription = React.forwardRef<React.ElementRef<typeof SheetPrimitive.Description>, React.ComponentPropsWithoutRef<typeof SheetPrimitive.Description>>(
  ({ className, ...props }, ref) => <SheetPrimitive.Description ref={ref} className={cn('text-sm leading-5 text-[#737373] truncate', className)} {...props} />,
);
SheetDescription.displayName = SheetPrimitive.Description.displayName;

export { Sheet, SheetPortal, SheetOverlay, SheetTrigger, SheetClose, SheetContent, SheetHeader, SheetBody, SheetFooter, SheetTitle, SheetDescription };
