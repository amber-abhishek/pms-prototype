import * as React from 'react';
import * as DialogPrimitive from '@radix-ui/react-dialog';
import { X } from 'lucide-react';
import { cn } from '../../lib/cn';
import { GhostZone } from '../headerCtx'

/* shadcn Dialog (Radix) in the Amber Connect modal look (127.0.0.1:5180, "Add Member" / "Commission Table"):
   - scrim: #0A0A0A at 40% with a 2px blur;
   - box: white, 1px #EBEBEB, r16, shadow 0 16 32 -12 rgba(14,18,27,0.1);
   - header band: #FAFAFA, 16px padding, bottom rule, 14px medium title, 30px bordered close button;
   - body: 20px padding;
   - footer: 16/20 padding, top rule, 12px gap; the secondary action sits left and the primary (the last button) fills the rest.
   Most dialogs use DialogFrame, which lays those three parts out. */
const Dialog = DialogPrimitive.Root;
const DialogTrigger = DialogPrimitive.Trigger;
const DialogPortal = DialogPrimitive.Portal;
const DialogClose = DialogPrimitive.Close;

const DialogOverlay = React.forwardRef<React.ElementRef<typeof DialogPrimitive.Overlay>, React.ComponentPropsWithoutRef<typeof DialogPrimitive.Overlay> & { instant?: boolean }>(
  ({ className, instant, ...props }, ref) => (
    <DialogPrimitive.Overlay
      ref={ref}
      className={cn('fixed inset-0 z-50 bg-[#0A0A0A]/40 backdrop-blur-[2px]', !instant && 'data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0', className)}
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
          /* Centred with inset + auto margins, not translate: the enter animation sets transform and would knock a translate-centred box off to the right. */ 'fixed inset-0 m-auto h-fit z-50 flex w-[calc(100%-2rem)] max-w-lg max-h-[90vh] flex-col overflow-hidden rounded-[20px] border border-[#EBEBEB] bg-background shadow-[0_16px_32px_-12px_rgba(14,18,27,0.1)] outline-none',
          /* Modals stay centred (no origin); enter 180ms strong ease-out, exit faster at 120ms. */
          !instant && 'data-[state=open]:duration-[180ms] data-[state=closed]:duration-[120ms] ease-snappy data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-[0.95] data-[state=open]:zoom-in-[0.95]',
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

/** Connect 2.0 modal header (3134:66031): white, 16px padding, #EBEBEB rule; whatever it holds on the left, the close button on the right. */
const DialogHeader = ({ className, children, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
  <header className={cn('shrink-0 p-4 flex items-center gap-3.5 bg-white border-b border-[#EBEBEB]', className)} {...props}>{children}</header>
);
DialogHeader.displayName = 'DialogHeader';

/** Connect's close button: 28px, white, 1px #E5E5E5, r8, xs shadow, 16px ✕. */
const DialogCloseButton = ({ className }: { className?: string }) => (
  <DialogPrimitive.Close className={cn('size-7 shrink-0 rounded-lg border border-[#E5E5E5] bg-white shadow-[0_1px_2px_rgba(0,0,0,0.05)] text-[#0A0A0A] hover:bg-[#F5F5F5] flex items-center justify-center outline-none focus-visible:ring-2 focus-visible:ring-ring', className)}>
    <X size={16} strokeWidth={1.5} />
    <span className="sr-only">Close</span>
  </DialogPrimitive.Close>
);

const DialogBody = ({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) => <div className={cn('flex-1 min-h-0 overflow-auto p-5', className)} {...props} />;
DialogBody.displayName = 'DialogBody';

const DialogFooter = ({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
  <footer className={cn('shrink-0 px-5 py-4 flex items-center gap-3 bg-white border-t border-[#EBEBEB] [&>button]:shrink-0 [&>button:last-child]:flex-1', className)} {...props} />
);
DialogFooter.displayName = 'DialogFooter';

const DialogTitle = React.forwardRef<React.ElementRef<typeof DialogPrimitive.Title>, React.ComponentPropsWithoutRef<typeof DialogPrimitive.Title>>(
  ({ className, ...props }, ref) => <DialogPrimitive.Title ref={ref} className={cn('flex-1 min-w-0 text-sm leading-5 font-medium text-[#0A0A0A]', className)} {...props} />,
);
DialogTitle.displayName = DialogPrimitive.Title.displayName;

const DialogDescription = React.forwardRef<React.ElementRef<typeof DialogPrimitive.Description>, React.ComponentPropsWithoutRef<typeof DialogPrimitive.Description>>(
  ({ className, ...props }, ref) => <DialogPrimitive.Description ref={ref} className={cn('text-sm leading-5 text-[#737373]', className)} {...props} />,
);
DialogDescription.displayName = DialogPrimitive.Description.displayName;

/** Header band with the title, then the body (the one-line `sub` first, in grey), then the footer. */
function DialogFrame({ title, sub, children, footer, close = true }: { title: React.ReactNode; sub?: React.ReactNode; children?: React.ReactNode; footer?: React.ReactNode; close?: boolean }) {
  return (
    <>
      <DialogHeader><DialogTitle>{title}</DialogTitle>{close && <DialogCloseButton />}</DialogHeader>
      {(sub || children) && (
        <DialogBody>
          {sub && <DialogDescription>{sub}</DialogDescription>}
          {children && <div className={sub ? 'mt-4' : undefined}>{children}</div>}
        </DialogBody>
      )}
      {footer && <DialogFooter>{footer}</DialogFooter>}
    </>
  );
}

export { Dialog, DialogPortal, DialogOverlay, DialogTrigger, DialogClose, DialogCloseButton, DialogContent, DialogHeader, DialogBody, DialogFooter, DialogFrame, DialogTitle, DialogDescription };
