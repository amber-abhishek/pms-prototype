// Small pieces the Organisation, Reports and Settings screens share that the kit doesn't have.
import { Fragment, type ReactNode } from 'react';
import { Illustration, type Illo } from '../../components/Illustration';
import { DotsThree, type Icon } from '../../components/icons';
import { CrumbLink, Dropdown, cx } from '../../components/ui';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '../../components/shadcn/dropdown-menu';
import { Dialog, DialogBody, DialogContent, DialogDescription, DialogFooter, DialogTitle } from '../../components/shadcn/dialog';
import { X } from '../../components/icons';
import { DialogClose } from '../../components/shadcn/dialog';
import { GhostZone, headerZone, usePublishTitle } from '../../components/headerCtx';

/** The 52px header row with clickable breadcrumbs ("Organisation › Roles and access › New role"). */
export function Header({ icon: I, crumbs, title, children }: { icon?: Icon; crumbs: { label: string; to?: string }[]; title: string; children?: ReactNode }) {
  usePublishTitle(title);
  return (
    <div data-page-head className="h-[52px] shrink-0 border-b border-line bg-white flex items-center gap-2 px-4">
      {I && <I size={16} className="text-[#646A78]" />}
      <div className="flex items-center gap-1.5 text-sm leading-5">{crumbs.map((c) => <CrumbLink key={c.label} c={c} />)}</div>
      <h1 className="text-sm font-normal text-ink">{title}</h1>
      <div className="ml-auto flex items-center gap-1"><GhostZone.Provider value={headerZone(children)}>{children}</GhostZone.Provider></div>
    </div>
  );
}

/** The ⋯ row menu (shadcn DropdownMenu): arrow keys, typeahead, Escape. Items with `danger` are red. */
export function RowMenu({ items, label = 'More actions' }: { items: { label: string; onClick: () => void; danger?: boolean; disabled?: boolean; icon?: Icon }[]; label?: string }) {
  return (
    <span className="inline-block" onClick={(e) => e.stopPropagation()}>
      <DropdownMenu modal={false}>
        <DropdownMenuTrigger aria-label={label} className="size-7 rounded-md hover:bg-gray-100 data-[state=open]:bg-gray-100 flex items-center justify-center text-[#646A78] outline-none focus-visible:ring-2 focus-visible:ring-ring">
          <DotsThree size={18} weight="bold" />
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="min-w-48">
          {items.map((it, i) => (
            <Fragment key={it.label}>
              {it.danger && i > 0 && !items[i - 1].danger && <DropdownMenuSeparator />}
              <DropdownMenuItem disabled={it.disabled} onSelect={() => it.onClick()} variant={it.danger ? 'destructive' : 'default'} className="px-2.5">
                {it.icon && <it.icon size={16} />}{it.label}
              </DropdownMenuItem>
            </Fragment>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>
    </span>
  );
}

/** Dialog as the designs draw it (shadcn Dialog): title + one-line sub at the top, grey footer bar. */
export function ODialog({ open, onClose, title, sub, children, footer, width = 500 }: { open: boolean; onClose: () => void; title: string; sub?: ReactNode; children?: ReactNode; footer?: ReactNode; width?: number }) {
  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent style={{ maxWidth: width }} {...(sub ? {} : { 'aria-describedby': undefined })}>
        <DialogClose aria-label="Close" className="absolute right-3 top-3 size-7 rounded-lg hover:bg-gray-100 flex items-center justify-center text-[#646A78]"><X size={14} /></DialogClose>
        <div className="px-5 pt-5 pr-12"><DialogTitle className="text-[15px] leading-5">{title}</DialogTitle>{sub && <DialogDescription>{sub}</DialogDescription>}</div>
        <DialogBody>{children}</DialogBody>
        {footer && <DialogFooter>{footer}</DialogFooter>}
      </DialogContent>
    </Dialog>
  );
}

/** Alert with an action on the right: white ground, tone border, coloured title, grey body. */
export function Alert({ tone, icon: I, title, children, action }: { tone: 'red' | 'amber' | 'blue' | 'green'; icon?: Icon; title: ReactNode; children?: ReactNode; action?: ReactNode }) {
  /* 3056:2 / 3031:2: white ground, tone border at 30%, 16px icon and 14px title in the tone, 12px #646A78 sub. */
  const c = { amber: ['#A16207', '#A16207'], red: ['#E0243A', '#E0243A'], blue: ['#2563EB', '#2563EB'], green: ['#0B8A4C', '#0B8A4C'] }[tone];
  return (
    <div className="rounded-lg bg-white border px-4 py-2.5 flex items-center gap-3" style={{ borderColor: c[0] + '4D' }}>
      {I && <I size={16} style={{ color: c[0] }} className="shrink-0" />}
      <div className="flex-1 min-w-0"><div className="text-sm leading-5" style={{ color: c[1] }}>{title}</div>{children && <div className="text-xs text-[#646A78] mt-0.5">{children}</div>}</div>
      {action}
    </div>
  );
}

/** Centred empty state for a whole page: blue tonal illustration box, title, sub, actions. No card. */
export function EmptyState({ icon: I, title, sub, children, art }: { icon: Icon; title: string; sub: string; children?: ReactNode; art?: Illo }) {
  return (
    <div className="flex flex-col items-center text-center py-16 px-6">
      {art ? <Illustration name={art} className="block w-[203px] h-[160px] mb-5" /> : <div className="relative w-[150px] h-[112px] rounded-2xl bg-[#EFF6FF] flex items-center justify-center mb-5">
        <span className="absolute left-4 top-5 size-2 rounded-full bg-[#93C5FD]" /><span className="absolute right-5 top-4 size-1.5 rounded-full bg-[#F87171]" /><span className="absolute right-6 bottom-5 size-2 rounded-full bg-[#86EFAC]" />
        <div className="size-16 rounded-full bg-[#BFDBFE] flex items-center justify-center"><I size={34} weight="duotone" className="text-[#2563EB]" /></div>
      </div>}
      <div className="text-sm font-semibold">{title}</div>
      <p className="text-sm text-[#646A78] mt-1.5 max-w-[420px] leading-5">{sub}</p>
      {children && <div className="mt-4 flex items-center gap-2">{children}</div>}
    </div>
  );
}

/** Small select with a leading icon, on the kit's Dropdown (our menu, not the browser's). */
export function IconSelect({ icon, value, onChange, options, className, ariaLabel }: { icon?: Icon; value: string; onChange: (v: string) => void; options: { value: string; label: string }[]; className?: string; ariaLabel?: string }) {
  return <Dropdown icon={icon} value={value} onChange={onChange} options={options} ariaLabel={ariaLabel} className={cx('h-8 border-gray-300', className)} />;
}
