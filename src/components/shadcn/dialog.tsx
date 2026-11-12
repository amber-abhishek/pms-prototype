import * as React from 'react';
import * as DialogPrimitive from '@radix-ui/react-dialog';
import { X } from 'lucide-react';
import { cn } from '../../lib/cn';
import { GhostZone } from '../headerCtx'

/* shadcn Dialog (Radix), restyled to 3032:2 / 2825:897: 12px radius, #E5E7EB border, 20px header padding with no rule,
   16px semibold title, 64px #F9FAFB footer with a #F3F4F6 rule, #111827 at 28% scrim. */
const Dialog = DialogPrimitive.Root;
const DialogTrigger = DialogPrimitive.Trigger;
const DialogPortal = DialogPrimitive.Portal;
const DialogClose = DialogPrimitive.Close;

const DialogOverlay = React.forwardRef<React.ElementRef<typeof DialogPrimitive.Overlay>, React.ComponentPropsWithoutRef<typeof DialogPrimitive.Overlay> & { instant?: boolean }>(
  ({ className, instant, ...props }, ref) => (
    <DialogPrimitive.Overlay
      ref={ref}
      className={cn('fixed inset-0 z-50 bg-[#111827]/[.28]', !instant && 'data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0', className)}
      {...props}
    />
  ),
);
DialogOverlay.displayName = DialogPrimitive.Overlay.displayName;

/** `instant`: no open/close animation, for dialogs opened from the keyboard many times a day (the ⌘K search). */
const DialogContent = React.forwardRef<React.ElementRef<typeof DialogPrimitive.Content>, React.ComponentPropsWithoutRef<typeof DialogPrimitive.Content> & { instant?: boolean }>(
  ({ className, children, instant, ...props }, ref) => (
    <GhostZone.Provider value={false}><DialogPortal>
      <DialogOverlay instant={instant} />
      <DialogPrimitive.Content
        ref={ref}
        className={cn(
          /* Centred with inset + auto margins, not translate: the enter animation sets transform and would knock a translate-centred box off to the right. */ 'fixed inset-0 m-auto h-fit z-50 flex w-[calc(100%-2rem)] max-w-lg max-h-[90vh] flex-col overflow-hidden rounded-xl border border-line bg-background shadow-overlay outline-none',
          /* Modals stay centred (no origin); enter 180ms strong ease-out, exit faster at 120ms. */
          !instant && 'data-[state=open]:duration-[180ms] data-[state=closed]:duration-[120ms] ease-snappy data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-[0.97] data-[state=open]:zoom-in-[0.97]',
          className,
        )}
        {...props}
      >
        {children}
      </DialogPrimitive.Content>
    </DialogPortal></GhostZone.Provider>
  ),
);
DialogContent.displayName = DialogPrimitive.Content.displayName;

/** Header row: optional icon tile, the title, and the close button; `sub` text goes under it. */
const DialogHeader = ({ className, children, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
  <header className={cn('shrink-0 px-5 pt-5', className)} {...props}>{children}</header>
);
DialogHeader.displayName = 'DialogHeader';

const DialogCloseButton = () => (
  <DialogPrimitive.Close className="size-7 -my-0.5 shrink-0 rounded-lg text-gray-700 hover:bg-secondary flex items-center justify-center focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
    <X size={16} />
    <span className="sr-only">Close</span>
  </DialogPrimitive.Close>
);

const DialogBody = ({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) => <div className={cn('flex-1 overflow-auto px-5 pt-4 pb-5', className)} {...props} />;
DialogBody.displayName = 'DialogBody';

const DialogFooter = ({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
  <footer className={cn('h-16 shrink-0 px-5 flex items-center justify-end gap-2 bg-subtle border-t border-[#F3F4F6]', className)} {...props} />
);
DialogFooter.displayName = 'DialogFooter';

const DialogTitle = React.forwardRef<React.ElementRef<typeof DialogPrimitive.Title>, React.ComponentPropsWithoutRef<typeof DialogPrimitive.Title>>(
  ({ className, ...props }, ref) => <DialogPrimitive.Title ref={ref} className={cn('flex-1 min-w-0 text-base leading-6 font-semibold tracking-[-0.1px] text-[#111827]', className)} {...props} />,
);
DialogTitle.displayName = DialogPrimitive.Title.displayName;

const DialogDescription = React.forwardRef<React.ElementRef<typeof DialogPrimitive.Description>, React.ComponentPropsWithoutRef<typeof DialogPrimitive.Description>>(
  ({ className, ...props }, ref) => <DialogPrimitive.Description ref={ref} className={cn('mt-1 text-sm leading-5 text-muted-foreground', className)} {...props} />,
);
DialogDescription.displayName = DialogPrimitive.Description.displayName;

export { Dialog, DialogPortal, DialogOverlay, DialogTrigger, DialogClose, DialogCloseButton, DialogContent, DialogHeader, DialogBody, DialogFooter, DialogTitle, DialogDescription };
