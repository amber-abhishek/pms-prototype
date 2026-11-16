// Small pieces the Organisation, Reports and Settings screens share that the kit doesn't have.
import { Fragment, type ReactNode } from 'react';
import { Illustration, artFor, type Illo } from '../../components/Illustration';
import { DotsThree, type Icon } from '../../components/icons';
import { Dropdown, PageHeader, cx } from '../../components/ui';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '../../components/shadcn/dropdown-menu';
import { Dialog, DialogContent, DialogFrame } from '../../components/shadcn/dialog';

/** The 52px header row with clickable breadcrumbs ("Organisation › Roles and access › New role"). */
export function Header({ icon, crumbs, title, children }: { icon?: Icon; crumbs: { label: string; to?: string }[]; title: string; children?: ReactNode }) {
  /* The shared top bar (Figma 3884:39270). */
  return <PageHeader icon={icon} title={title} crumbs={crumbs}>{children}</PageHeader>;
}

/** The ⋯ row menu (shadcn DropdownMenu): arrow keys, typeahead, Escape. Items with `danger` are red. */
export function RowMenu({ items, label = 'More actions' }: { items: { label: string; onClick: () => void; danger?: boolean; disabled?: boolean; icon?: Icon }[]; label?: string }) {
  return (
    <span className="inline-block" onClick={(e) => e.stopPropagation()}>
      <DropdownMenu modal={false}>
        <DropdownMenuTrigger aria-label={label} className="size-7 rounded-md hover:bg-gray-100 data-[state=open]:bg-gray-100 flex items-center justify-center text-[#737373] outline-none focus-visible:ring-2 focus-visible:ring-ring">
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
        <DialogFrame title={title} sub={sub} footer={footer}>{children}</DialogFrame>
      </DialogContent>
    </Dialog>
  );
}

/** Alert with an action on the right: white ground, tone border, coloured title, grey body. */
export function Alert({ tone, icon: I, title, children, action }: { tone: 'red' | 'amber' | 'blue' | 'green'; icon?: Icon; title: ReactNode; children?: ReactNode; action?: ReactNode }) {
  /* 3056:2 / 3031:2: white ground, tone border at 30%, 16px icon and 14px title in the tone, 12px #737373 sub. */
  const c = { amber: ['#A16207', '#A16207'], red: ['#E0243A', '#E0243A'], blue: ['#2563EB', '#2563EB'], green: ['#0B8A4C', '#0B8A4C'] }[tone];
  return (
    <div className="rounded-lg bg-white border px-4 py-2.5 flex items-center gap-3" style={{ borderColor: c[0] + '4D' }}>
      {I && <I size={16} style={{ color: c[0] }} className="shrink-0" />}
      <div className="flex-1 min-w-0"><div className="text-sm leading-5" style={{ color: c[1] }}>{title}</div>{children && <div className="text-xs text-[#737373] mt-0.5">{children}</div>}</div>
      {action}
    </div>
  );
}

/** Centred empty state for a whole page: blue tonal illustration box, title, sub, actions. No card. */
export function EmptyState({ title, sub, children, art }: { icon: Icon; title: string; sub: string; children?: ReactNode; art?: Illo }) {
  return (
    <div className="flex flex-col items-center text-center py-16 px-6">
      <Illustration name={art ?? artFor(title)} className="block w-[254px] h-[200px] mb-5" />
      <div className="text-sm font-semibold">{title}</div>
      <p className="text-sm text-[#737373] mt-1.5 max-w-[420px] leading-5">{sub}</p>
      {children && <div className="mt-4 flex items-center gap-2">{children}</div>}
    </div>
  );
}

/** Small select with a leading icon, on the kit's Dropdown (our menu, not the browser's). */
export function IconSelect({ icon, value, onChange, options, className, ariaLabel }: { icon?: Icon; value: string; onChange: (v: string) => void; options: { value: string; label: string }[]; className?: string; ariaLabel?: string }) {
  return <Dropdown icon={icon} value={value} onChange={onChange} options={options} ariaLabel={ariaLabel} className={cx('h-8 border-gray-300', className)} />;
}
