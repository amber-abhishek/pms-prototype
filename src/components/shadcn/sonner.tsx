import { Toaster as Sonner, type ToasterProps } from 'sonner';
import { Check, CircleNotch, Info, X } from '../icons';

/* shadcn's Sonner wrapper, restyled as a dark snackbar (the pattern Jasper, Gmail and Linear use for action
   feedback): a near-black 12px-radius bar at the bottom centre, so it reads apart from the white cards and menus
   it floats over. Each type gets a small solid tone dot with a white glyph; the action (Undo) is a light-on-dark
   text button and every toast has a close ×. Matches the dark tooltip. */

const dot = (bg: string, glyph: React.ReactNode) => (
  <span className={`size-[18px] rounded-full ${bg} text-white flex items-center justify-center`}>{glyph}</span>
);

export function Toaster(props: ToasterProps) {
  return (
    <Sonner
      position="bottom-center"
      offset={20}
      gap={8}
      visibleToasts={3}
      closeButton
      icons={{
        success: dot('bg-[#12A15A]', <Check size={11} strokeWidth={3} />),
        error: dot('bg-[#F0384C]', <X size={11} strokeWidth={3} />),
        warning: dot('bg-[#F59E0B]', <span className="text-[11px] leading-none font-bold">!</span>),
        info: dot('bg-[#3B82F6]', <Info size={11} strokeWidth={2.5} />),
        loading: <CircleNotch size={16} className="animate-spin text-white/60" />,
        close: <X size={14} />,
      }}
      /* --width is the widest a toast can get; each toast fits its text and stays centred, so a normal message is one line. */
      style={{ '--width': '560px' } as React.CSSProperties}
      toastOptions={{
        unstyled: true,
        classNames: {
          toast:
            'group !w-fit max-w-[var(--width)] !left-0 !right-0 mx-auto flex items-center gap-2.5 min-h-11 rounded-xl bg-[#111827] py-2 pl-3.5 pr-1.5 font-sans text-sm text-white ' +
            'shadow-[0_2px_4px_rgba(17,24,39,0.12),0_12px_32px_-8px_rgba(17,24,39,0.40)]',
          content: 'flex-1 min-w-0 flex flex-col gap-0.5 py-0.5',
          title: 'font-medium leading-5',
          description: 'text-xs leading-[18px] text-white/65',
          icon: 'shrink-0 flex items-center justify-center size-[18px] [&>*]:shrink-0',
          actionButton:
            'shrink-0 h-7 px-2.5 rounded-lg bg-white/10 text-sm font-medium text-white hover:bg-white/20 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/50',
          cancelButton: 'shrink-0 h-7 px-2.5 rounded-lg text-sm font-medium text-white/70 hover:bg-white/10',
          /* Sonner renders the close button first; order-last moves it to the right end of the bar. */
          closeButton:
            'order-last shrink-0 size-7 rounded-lg flex items-center justify-center text-white/50 hover:text-white hover:bg-white/10 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/50',
        },
      }}
      {...props}
    />
  );
}
