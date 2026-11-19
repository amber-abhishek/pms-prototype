import * as React from 'react';
import * as SheetPrimitive from '@radix-ui/react-dialog';
import { X } from 'lucide-react';
import { cn } from '../../lib/cn';
import { FooterZone, GhostZone } from '../headerCtx'
import { keepOpenOnToast } from './dialog';

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

/** Most pages mount a record's sheet only while the record is open ({sel && <BookingSheet/>}), so closing unmounts it
 *  before Radix can play the exit. On such an unmount, a copy of the panel and its scrim stays behind just long enough
 *  to slide out and fade, then is removed. Stepping to another record (which remounts) and a normal close skip it. */
function leaveGhost(panel: HTMLElement, scrim: HTMLElement | null) {
  for (const el of [scrim, panel]) {
    if (!el) continue;
    const c = el.cloneNode(true) as HTMLElement;
    c.removeAttribute('id');
    c.setAttribute('aria-hidden', 'true');
    c.style.pointerEvents = 'none';
    c.dataset.state = 'closed';
    document.body.appendChild(c);
    const done = () => c.remove();
    c.addEventListener('animationend', done, { once: true });
    setTimeout(done, 400);
  }
}

const SheetContent = React.forwardRef<React.ElementRef<typeof SheetPrimitive.Content>, React.ComponentPropsWithoutRef<typeof SheetPrimitive.Content>>(
  ({ className, children, ...props }, ref) => {
    const stepped = useStepped();
    const panel = React.useRef<HTMLDivElement | null>(null);
    const scrim = React.useRef<HTMLDivElement | null>(null);
    const setRef = (el: HTMLDivElement | null) => {
      panel.current = el;
      if (typeof ref === 'function') ref(el); else if (ref) ref.current = el;
    };
    React.useLayoutEffect(() => () => {
      const el = panel.current;
      if (!el || el.dataset.state !== 'open' || Date.now() - sheetStep.at < 500) return;
      leaveGhost(el, scrim.current);
    }, []);
    return (
    <GhostZone.Provider value={false}><FooterZone.Provider value={false}><SheetPortal>
      <SheetOverlay ref={scrim} className={stepped ? 'data-[state=open]:!animate-none' : undefined} />
      <SheetPrimitive.Content
        ref={setRef}
        className={cn(
          /* Amber Connect drawer: floats 16px in, r20, no border, the layered 4% shadow stack. */
          'fixed right-4 top-4 bottom-4 z-50 flex max-w-[calc(100vw-32px)] flex-col overflow-hidden rounded-[20px] bg-background shadow-sheet outline-none',
          /* Slides in from fully off the right edge, no fade, as Connect's side panels (measured ~300ms, gentle start, long settle). */
          'data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=open]:slide-in-from-right-full data-[state=closed]:slide-out-to-right-full data-[state=open]:duration-300 data-[state=closed]:duration-200 ease-panel data-[state=closed]:ease-[cubic-bezier(0.4,0,1,1)] motion-reduce:data-[state=open]:slide-in-from-right-0 motion-reduce:data-[state=closed]:slide-out-to-right-0',
          stepped && 'data-[state=open]:!animate-none',
          className,
        )}
        {...props}
        /* When stepping, don't jump focus into the new record's first field: ↑/↓ keep stepping. */
        onOpenAutoFocus={stepped ? (e) => e.preventDefault() : props.onOpenAutoFocus}
        onInteractOutside={keepOpenOnToast(props.onInteractOutside)}
      >
        {children}
      </SheetPrimitive.Content>
    </SheetPortal></FooterZone.Provider></GhostZone.Provider>
    );
  },
);
SheetContent.displayName = SheetPrimitive.Content.displayName;

/** Connect drawer header: 20px padding, #E5E5E5 rule, the 30px bordered close button on the right. */
const SheetHeader = ({ className, children, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
  <header className={cn('shrink-0 p-5 flex items-center gap-3 border-b border-[#E5E5E5]', className)} {...props}>
    {children}
    <SheetPrimitive.Close className="ml-auto size-7 shrink-0 rounded-lg text-[#0A0A0A] hover:bg-[#F5F5F5] flex items-center justify-center focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
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
