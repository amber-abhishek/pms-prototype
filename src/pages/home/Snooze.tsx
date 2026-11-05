import { useState, type ReactNode } from 'react';
import { AlarmClock, CalendarBlank, Moon, Sun } from '../../components/icons';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from '../../components/shadcn/dropdown-menu';
import { Button, Field, Input } from '../../components/ui';
import { Modal } from '../residents/kit';
import type { HTask, Scope } from '../../data/home';
import { useChange } from './TaskSheet';

/* The prototype's "now" is Monday 14 September 2026, 10:00. */
const NOW = '2026-09-14T10:00';
const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const time = (d: Date) => `${d.getHours()}:${String(d.getMinutes()).padStart(2, '0')}`;
export const snoozeLabel = (iso: string) => {
  const d = new Date(iso);
  return d.toDateString() === new Date(NOW).toDateString() ? `Today, ${time(d)}` : `${DAYS[d.getDay()]} ${d.getDate()} ${MONTHS[d.getMonth()]}, ${time(d)}`;
};
const PRESETS = [
  { id: 'later', text: 'Later today', when: '2026-09-14T17:00', hint: '17:00', icon: Sun },
  { id: 'tomorrow', text: 'Tomorrow', when: '2026-09-15T09:00', hint: 'Tue, 9:00', icon: Moon },
  { id: 'week', text: 'Next week', when: '2026-09-21T09:00', hint: 'Mon, 9:00', icon: CalendarBlank },
] as const;

/** Snooze and unsnooze with an Undo toast. Snoozing hides the task until then; the due date doesn't move. */
export function useSnooze(scope: Scope) {
  const change = useChange(scope);
  const snooze = (t: HTask, until: string) =>
    change((rs) => rs.map((r) => (r.id === t.id ? { ...r, snoozed: { until, label: snoozeLabel(until) } } : r)), <span>Snoozed until {snoozeLabel(until)} · {t.title}</span>);
  const wake = (t: HTask) =>
    change((rs) => rs.map((r) => (r.id === t.id ? { ...r, snoozed: undefined } : r)), <span>Back in your list · {t.title}</span>);
  return { snooze, wake };
}

/** "Snooze until" menu: three presets and a picked date and time. `children` is the trigger. */
export function SnoozeMenu({ t, scope, children, align = 'end', onDone }: { t: HTask; scope: Scope; children: ReactNode; align?: 'start' | 'end'; onDone?: () => void }) {
  const { snooze } = useSnooze(scope);
  const [picking, setPicking] = useState(false);
  const [date, setDate] = useState('2026-09-16');
  const [at, setAt] = useState('09:00');
  const go = (iso: string) => { snooze(t, iso); onDone?.(); };
  const valid = !!date && !!at && new Date(`${date}T${at}`) > new Date(NOW);
  const dueSoon = t.due === 'overdue' || t.due === 'today';
  return (
    /* Keep clicks and keys off the row underneath: React portals still bubble to it. */
    <span onClick={(e) => e.stopPropagation()} onKeyDown={(e) => e.stopPropagation()} className="contents">
      <DropdownMenu modal={false}>
        <DropdownMenuTrigger asChild>{children}</DropdownMenuTrigger>
        <DropdownMenuContent align={align} className="w-64">
          <DropdownMenuLabel className="px-2 pt-1.5 pb-1 text-xs font-medium text-gray-500">Snooze until</DropdownMenuLabel>
          {PRESETS.map((p) => (
            <DropdownMenuItem key={p.id} onSelect={() => go(p.when)}>
              <p.icon /><span className="flex-1">{p.text}</span><span className="text-xs text-gray-500 tabular-nums">{p.hint}</span>
            </DropdownMenuItem>
          ))}
          <DropdownMenuSeparator />
          <DropdownMenuItem onSelect={() => setPicking(true)}><AlarmClock /><span>Pick a date and time</span></DropdownMenuItem>
          {dueSoon && <div className="px-2 pt-1 pb-1.5 text-xs text-gray-500">Still due {t.due === 'today' ? 'today' : 'now'}: snoozing hides it, it doesn’t move the date.</div>}
        </DropdownMenuContent>
      </DropdownMenu>
      <Modal open={picking} onClose={() => setPicking(false)} width={420} title="Snooze until" sub={t.title}
        footer={<><Button onClick={() => setPicking(false)}>Cancel</Button><Button variant="primary" icon={AlarmClock} disabled={!valid} onClick={() => { setPicking(false); go(`${date}T${at}`); }}>Snooze</Button></>}>
        <div className="grid grid-cols-[1fr_120px] gap-3">
          <Field label="Date"><Input type="date" min="2026-09-14" value={date} onChange={(e) => setDate(e.target.value)} /></Field>
          <Field label="Time"><Input type="time" value={at} onChange={(e) => setAt(e.target.value)} /></Field>
        </div>
        {!valid && date && at && <p className="text-xs text-[#B91C1C]">Pick a time later than now.</p>}
      </Modal>
    </span>
  );
}
