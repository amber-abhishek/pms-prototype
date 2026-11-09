import * as React from 'react';
import * as SheetPrimitive from '@radix-ui/react-dialog';
import { X } from 'lucide-react';
import { cn } from '../../lib/cn';
import { GhostZone } from '../headerCtx'

/* shadcn Sheet (Radix Dialog), restyled to the one side-sheet look (2824:497): 8px inset, 12px radius,
   #E5E7EB border, 56px header, 20px body padding, 64px footer, #F3F4F6 rules, #111827 at 20% scrim with a light blur.
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
      className={cn('fixed inset-0 z-50 bg-[#111827]/20 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0', className)}
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
          'fixed right-2 top-2 bottom-2 z-50 flex max-w-[calc(100vw-16px)] flex-col overflow-hidden rounded-xl border border-line bg-background shadow-overlay outline-none',
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

/** 56px header with the close button on the right. */
const SheetHeader = ({ className, children, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
  <header className={cn('min-h-14 shrink-0 px-5 py-2 flex items-center gap-2.5 border-b border-[#F3F4F6]', className)} {...props}>
    {children}
    <SheetPrimitive.Close className="ml-auto size-7 shrink-0 rounded-lg text-gray-700 hover:bg-secondary flex items-center justify-center focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
      <X size={16} />
      <span className="sr-only">Close</span>
    </SheetPrimitive.Close>
  </header>
);
SheetHeader.displayName = 'SheetHeader';

const SheetBody = ({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) => <div className={cn('flex-1 overflow-auto p-5', className)} {...props} />;
SheetBody.displayName = 'SheetBody';

const SheetFooter = ({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
  <footer className={cn('h-16 shrink-0 px-5 flex items-center justify-end gap-2 border-t border-[#F3F4F6]', className)} {...props} />
);
SheetFooter.displayName = 'SheetFooter';

const SheetTitle = React.forwardRef<React.ElementRef<typeof SheetPrimitive.Title>, React.ComponentPropsWithoutRef<typeof SheetPrimitive.Title>>(
  ({ className, ...props }, ref) => <SheetPrimitive.Title ref={ref} className={cn('text-sm leading-5 font-semibold text-[#111827] truncate', className)} {...props} />,
);
SheetTitle.displayName = SheetPrimitive.Title.displayName;

const SheetDescription = React.forwardRef<React.ElementRef<typeof SheetPrimitive.Description>, React.ComponentPropsWithoutRef<typeof SheetPrimitive.Description>>(
  ({ className, ...props }, ref) => <SheetPrimitive.Description ref={ref} className={cn('mt-1 text-xs text-muted-foreground truncate', className)} {...props} />,
);
SheetDescription.displayName = SheetPrimitive.Description.displayName;

export { Sheet, SheetPortal, SheetOverlay, SheetTrigger, SheetClose, SheetContent, SheetHeader, SheetBody, SheetFooter, SheetTitle, SheetDescription };
