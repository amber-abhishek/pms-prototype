import { useState, type ReactNode } from 'react';
import { ArrowsLeftRight, Buildings, ChartBar, Check, CheckCircle, FileText, Gear, Lock, MagnifyingGlass, Megaphone, ShieldCheck, Tray, UserMinus, Wrench, type Icon } from '../../components/icons';
import { Avatar, Button, cx } from '../../components/ui';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '../../components/shadcn/dropdown-menu';
import { Illustration } from '../../components/Illustration';
import { PEOPLE, type DueTone, type FromIcon, type HTask } from '../../data/home';

export const fromIcon: Record<FromIcon, Icon> = {
  maintenance: Wrench, requests: ArrowsLeftRight, bookings: FileText, notices: Megaphone, applications: Tray,
  properties: Buildings, roles: ShieldCheck, reports: ChartBar, settings: Gear, task: CheckCircle,
};

const dueCls: Record<DueTone, string> = {
  red: 'bg-[#FEEFEE] text-[#C11F14] border-[#FCE1E0]', orange: 'bg-[#FFF0E0] text-[#C2410C] border-[#FFE9D2]', amber: 'bg-[#FFF6E0] text-[#9A5B00] border-[#FFF2D1]', grey: 'bg-[#F3F4F6] text-[#374151] border-[#ECEDF0]', plain: '',
};
/** Due pill: calendar icon on My tasks, clock icon on the team board. "This week" is plain text. */
export function DuePill({ t }: { t: Pick<HTask, 'dueLabel' | 'dueTone'>; clock?: boolean }) {
  if (t.dueTone === 'plain') return <span className="text-xs text-gray-500">{t.dueLabel}</span>;
  return <span className={cx('inline-flex items-center gap-1 h-[22px] px-2 rounded-lg border text-xs font-medium whitespace-nowrap', dueCls[t.dueTone])}>{t.dueLabel}</span>;
}

/** Person avatar: the shared toned Avatar (Figma 3770:15786) in each person's colour (PS orange, TB teal, AK purple); muted is grey. `grad` is kept for callers. */
export function Who({ name, size = 22, muted }: { name: string; size?: number; muted?: boolean; grad?: boolean }) {
  return <Avatar name={name} size={size} color={muted ? '#9CA3AF' : PEOPLE[name]?.color} />;
}

/** Square checkbox drawn to the design (16px, blue when on), inside a 24px hit area that doesn't move the layout. */
export function Box({ checked, onChange, label, disabled }: { checked: boolean; onChange: (v: boolean) => void; label: string; disabled?: boolean }) {
  return (
    <button type="button" role="checkbox" aria-checked={checked} aria-label={label} disabled={disabled}
      onClick={(e) => { e.stopPropagation(); onChange(!checked); }}
      className="group/box size-6 -m-1 flex items-center justify-center shrink-0 rounded-md outline-none focus-visible:ring-2 focus-visible:ring-primary/30 disabled:opacity-40">
      <span className={cx('size-4 rounded-[4px] border flex items-center justify-center transition-colors', checked ? 'bg-primary border-primary text-white' : 'bg-white border-input group-hover/box:border-gray-500')}>
        {checked && <Check size={12} weight="bold" className="animate-[pop_.15s_cubic-bezier(0.23,1,0.32,1)]" />}
      </span>
    </button>
  );
}

/** A secondary button that opens a small list of choices. */
export function MenuButton({ icon, value, options, onChange }: { icon: Icon; value: string; options: string[]; onChange: (v: string) => void }) {
  /* shadcn DropdownMenu. */
  return (
    <DropdownMenu modal={false}>
      <DropdownMenuTrigger asChild><Button variant="control" icon={icon}>{value}</Button></DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="min-w-44">
        {options.map((o) => (
          <DropdownMenuItem key={o} onSelect={() => onChange(o)} className="px-2.5 justify-between gap-3 focus:bg-gray-50">
            {o}{o === value && <Check size={14} className="text-primary" />}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

/** Blue tonal illustration for "all caught up". */
export function CaughtUp({ children }: { children?: ReactNode }) {
  return (
    /* data-inset: same 120px gutter as the task table on the other tabs, so the heading and tabs don’t jump when switching. */
    <div data-inset className="flex-1 flex flex-col items-center justify-center text-center py-16 px-6">
      <Illustration name="caughtUp" className="block w-[203px] h-[160px] mb-6" />
      <div className="text-sm font-semibold">You’re all caught up</div>
      <p className="text-sm leading-5 text-gray-500 mt-1.5 max-w-[440px]">Nothing is overdue or due today. New tasks arrive here from Applications, Requests, Maintenance and Bookings.</p>
      {children && <div className="mt-5 flex gap-2">{children}</div>}
    </div>
  );
}

/** "Hand it to" picker: people who can take the task, and locked people with the reason. */
export function Picker({ title, can, cant, onPick }: {
  title: string; can: { name: string; load: string }[]; cant: { name: string; role?: string; reason?: string }[]; onPick: (name: string) => void;
}) {
  const [q, setQ] = useState('');
  const m = (n: string) => n.toLowerCase().includes(q.trim().toLowerCase());
  const canShown = can.filter((p) => m(p.name));
  const cantShown = cant.filter((p) => m(p.name));
  return (
    <div className="rounded-xl border border-line p-1.5">
      <label className="h-9 flex items-center gap-2 px-2.5 rounded-lg border border-gray-300 bg-white text-sm focus-within:border-primary focus-within:ring-2 focus-within:ring-primary/25">
        <MagnifyingGlass size={14} className="text-gray-500" />
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search people" aria-label="Search people" className="flex-1 bg-transparent outline-none placeholder:text-gray-400" />
      </label>
      <div className="px-2 pt-3 pb-1 text-xs font-medium text-gray-500">{title}</div>
      {can.length === 0 ? (
        <div className="h-10 px-2 rounded-lg bg-[#F9FAFB] flex items-center gap-2 text-sm text-gray-500"><UserMinus size={14} className="text-gray-400" />Nobody else</div>
      ) : canShown.length === 0 ? (
        <div className="h-9 px-2 flex items-center text-sm text-gray-400">No one matches “{q}”</div>
      ) : canShown.map((p) => (
        <button key={p.name} type="button" onClick={() => onPick(p.name)} className="w-full h-8 px-2 rounded-lg flex items-center gap-2 text-sm hover:bg-gray-100 focus-visible:bg-gray-100 outline-none">
          <Who name={p.name} size={18} /><span className="text-ink">{p.name}</span><span className="ml-auto text-xs text-gray-500">{p.load}</span>
        </button>
      ))}
      {cantShown.length > 0 && (
        <div className="mt-1.5 pt-1.5 border-t border-[#F3F4F6]">
          <div className="px-2 pt-1.5 pb-1 text-xs font-medium text-gray-500">Can’t {title.startsWith('Can approve') ? 'approve' : 'take this'} here</div>
          {cantShown.map((p) => (
            <div key={p.name} aria-disabled="true" className="h-10 px-2 flex items-center gap-2 text-sm text-gray-400 cursor-not-allowed">
              <Who name={p.name} size={24} muted /><span>{p.name}</span>{p.role && <span className="text-gray-500 text-xs ml-1">{p.role}</span>}
              <span className="ml-auto flex items-center gap-2 text-xs text-gray-500">{p.reason}<Lock size={14} className="text-gray-400" /></span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
