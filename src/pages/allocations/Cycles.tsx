import { useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Calendar, CalendarCheck, CalendarDots, Plus, Warning } from '../../components/icons';
import { toast } from 'sonner';
import { Button, Empty, Field, Input, PageHeader, SheetSection, StatStrip, Tabs, Toolbar } from '../../components/ui';
import { TODAY, appCounts, fmtN, offerCounts, useAlloc, type Cycle } from '../../data/allocations';
import { useTab } from '../hooks';
import { EmptyArea, Foot, Grid, Modal, Radio, St } from './common';
import { filterToCycle } from './Applications';
import { useAllocActions } from './actions';
import { PanelModal } from '../inventory/common';

type TabId = 'All' | 'Live' | 'Closed';
const label = (c: Cycle) => ({ open: 'Applications open', tenancy: 'In tenancy', closed: 'Closed', upcoming: 'Not open yet' }[c.status]);
const isLive = (c: Cycle) => c.status !== 'closed';
const CycleIcon = () => <span className="size-7 rounded-lg bg-[#F5F5F5] flex items-center justify-center text-gray-500"><CalendarDots size={14} /></span>;

export function Cycles() {
  const d = useAlloc();
  const nav = useNavigate();
  const [raw, setTab] = useTab<TabId>('All');
  const tab: TabId = raw === 'Live' || raw === 'Closed' ? raw : 'All';
  /* ?new=1 (from the first-login overview's "Open a cycle") opens the new-cycle sheet straight away. */
  const [creating, setCreating] = useState(() => new URLSearchParams(window.location.hash.split('?')[1]).get('new') === '1');
  const [editing, setEditing] = useState<Cycle | null>(null);
  const [closing, setClosing] = useState<Cycle | null>(null);
  /* The open cycle's counts come from its applications, the same numbers the Applications tabs and overview show. */
  const ac = appCounts(d);
  const cycles = d.cycles.map((c) => (c.status === 'open' ? { ...c, apps: ac.all, allocated: ac.allocated } : c));
  const live = cycles.filter(isLive), closed = cycles.filter((c) => !isLive(c));
  const bar = (c: Cycle) => (
    <div className="flex items-center gap-2.5">
      <div className="w-[120px] h-1.5 rounded-full bg-[#F5F5F5] overflow-hidden"><div className="h-full rounded-full" style={{ width: `${(c.allocated / c.beds) * 100}%`, background: c.status === 'open' || c.status === 'upcoming' ? '#2563EB' : c.status === 'tenancy' ? '#0B8A4C' : '#A3A3A3' }} /></div>
      <span>{fmtN(c.allocated)} of {fmtN(c.beds)}</span>
    </div>
  );
  return (
    <>
      <PageHeader icon={CalendarDots} title="Terms" crumbs={['Allocations']}>{d.cycles.length > 0 && <Button variant="primary" icon={Plus} onClick={() => setCreating(true)}>New term</Button>}</PageHeader>
      {d.cycles.length > 0 && (
        <Toolbar>
          <Tabs value={tab} onChange={setTab} tabs={[{ id: 'All', label: 'All', count: d.cycles.length }, { id: 'Live', label: 'Live', count: d.cycles.filter(isLive).length }, { id: 'Closed', label: 'Closed', count: d.cycles.filter((c) => !isLive(c)).length }]} />
        </Toolbar>
      )}
      {!d.cycles.length ? (
        <EmptyArea art="cycles" icon={CalendarCheck} title="No terms yet" sub="A term is one letting year of allocations.">
          <Button variant="primary" icon={Plus} onClick={() => setCreating(true)}>New term</Button>
        </EmptyArea>
      ) : tab === 'All' ? (
        <div className="flex-1 min-h-0 flex flex-col">
          <div className="flex-1 overflow-auto">
            <Grid fill rows={cycles} onRow={(c) => setTab(isLive(c) ? 'Live' : 'Closed')} cols={[
              { key: 'n', label: 'Term', render: (c) => <span className="flex items-center gap-2.5"><CycleIcon /><span className="font-semibold">{c.name}</span></span> },
              { key: 'w', label: 'Window', render: (c) => <span className="text-gray-500">{c.opens} – {c.ends}</span> },
              { key: 'a', label: 'Applications', render: (c) => fmtN(c.apps) },
              { key: 'b', label: 'Beds allocated', render: bar },
              { key: 's', label: 'Status', render: (c) => <St s={label(c)} /> },
            ]} />
          </div>
        </div>
      ) : tab === 'Live' ? (
        <div className="flex-1 overflow-auto px-[var(--tx,16px)] pt-4 pb-5 space-y-4">
          {live.map((c) => <LiveCard key={c.id} c={c} onEdit={() => setEditing(c)} onClose={() => setClosing(c)} onOpenApps={() => { filterToCycle(c.name); nav('/allocations/applications?tab=To%20review'); }} />)}
          {!live.length && <EmptyArea art="cycles" icon={CalendarCheck} title="No live term" sub="Create next year’s term to open applications."><Button icon={Plus} onClick={() => setCreating(true)}>New term</Button></EmptyArea>}
        </div>
      ) : (
        <div className="flex-1 min-h-0 flex flex-col">
          <div className="flex-1 overflow-auto">
            <Grid fill rows={closed} empty={<Empty art="cycles" title="No closed terms" sub="Terms move here once they close." />} cols={[
              { key: 'n', label: 'Term', render: (c) => <span className="flex items-center gap-2.5"><CycleIcon /><span className="font-semibold">{c.name}</span></span> },
              { key: 'w', label: 'Window', render: (c) => <span className="text-gray-500">{c.opens} – {c.ends}</span> },
              { key: 'a', label: 'Applications', render: (c) => fmtN(c.apps) },
              { key: 'b', label: 'Beds allocated', render: (c) => `${fmtN(c.allocated)} of ${fmtN(c.beds)}` },
              { key: 'o', label: 'Occupancy', render: (c) => c.occupancy ?? `${((c.allocated / c.beds) * 100).toFixed(1)}%` },
              { key: 'c', label: 'Closed', render: (c) => <span className="text-gray-500">{c.closedOn}</span> },
            ]} />
          </div>
          <Foot>Closed terms are read-only · their bookings stay in residents’ history</Foot>
        </div>
      )}
      {creating && <NewCycleSheet onClose={() => setCreating(false)} onCreated={() => { setCreating(false); setTab('Live'); }} />}
      {editing && <EditDates c={editing} onClose={() => setEditing(null)} />}
      {closing && <CloseCycle c={closing} onClose={() => setClosing(null)} />}
    </>
  );
}

function LiveCard({ c, onEdit, onClose, onOpenApps }: { c: Cycle; onEdit: () => void; onClose: () => void; onOpenApps: () => void }) {
  const d = useAlloc();
  const nav = useNavigate();
  const ac = appCounts(d), oc = offerCounts(d);
  const open = c.status === 'open', ten = c.status === 'tenancy';
  const tiles: [string, string, string?][] = open ? [
    ['Applications', fmtN(ac.all), `${ac.review} to review`], ['Allocated', fmtN(ac.allocated), `of ${fmtN(c.beds)} beds`], ['Offers open', fmtN(oc.open), '12 expire in 48h'],
    ['Accepted', fmtN(c.accepted ?? 0), `£${fmtN((c.accepted ?? 0) * 250)} deposits`], ['Leases signed', fmtN(c.signed ?? 0), `${(c.accepted ?? 0) - (c.signed ?? 0)} waiting`],
  ] : ten ? [
    ['Applications', fmtN(c.apps), 'closed'], ['Allocated', fmtN(c.allocated), `of ${fmtN(c.beds)} beds`], ['Offers open', '0'], ['Accepted', fmtN(c.accepted ?? 0)], ['Leases signed', fmtN(c.signed ?? 0), '25 ended early'],
  ] : [
    ['Applications', '0', `form opens ${c.opens}`], ['Allocated', '0', `of ${fmtN(c.beds)} beds`], ['Offers open', '0', `from ${c.offersFrom}`], ['Accepted', '0'], ['Leases signed', '0'],
  ];
  const dates: [string, string][] = ten ? [['Tenancies end', '9 Sep 2027'], ['Closes', '30 Sep 2027']] : [['Applications close', c.closes ?? '—'], ['Tenancies start', c.starts ?? '—']];
  return (
    <div className="rounded-xl border border-line bg-white p-5">
      <div className="flex items-start gap-3">
        <span className="size-9 rounded-[10px] bg-[#F5F5F5] flex items-center justify-center text-gray-500"><CalendarDots size={16} /></span>
        <div className="flex-1">
          <div className="flex items-center gap-2"><span className="text-sm font-semibold">{c.name}</span><St s={label(c)} /></div>
          <div className="text-xs text-gray-500 mt-0.5">{c.opens} – {c.ends} · {ten ? 'residents in their rooms' : c.from ? `duplicated from ${c.from}` : 'set up by hand'}</div>
        </div>
        <div className="flex gap-2">
          {open && <Button size="sm" variant="ghost" onClick={onClose}>Close term</Button>}
          {!ten && <Button size="sm" variant="ghost" icon={Calendar} onClick={onEdit}>Edit dates</Button>}
          {ten ? <Button size="sm" onClick={() => nav('/allocations/bookings')}>Open bookings</Button> : <Button size="sm" onClick={onOpenApps}>Open applications</Button>}
        </div>
      </div>
      <StatStrip className="mt-4" items={tiles.map(([k, v, s]) => ({ label: k, value: v, sub: s }))} />
      <div className="mt-4 flex gap-6 text-xs">
        {dates.map(([k, v]) => <span key={k} className="flex items-center gap-1.5 text-gray-500"><Calendar size={12} className="text-gray-400" />{k}<span className="text-ink font-medium ml-1">{v}</span></span>)}
      </div>
    </div>
  );
}

/* ---------- Flow 2 · 02: duplicate last year ---------- */
const MONTHS = ['Oct', 'Nov', 'Dec', 'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep'];
const plusYear = (s: string) => s.replace(/(\d{4})$/, (y) => String(+y + 1));
function NewCycleSheet({ onClose, onCreated }: { onClose: () => void; onCreated: () => void }) {
  const d = useAlloc();
  const latest = [...d.cycles].sort((a, b) => b.name.localeCompare(a.name))[0];
  const nextName = latest ? `${+latest.name.slice(0, 4) + 1}/${String(+latest.name.slice(5) + 1).padStart(2, '0')}` : '2027/28';
  const [name, setName] = useState(nextName);
  const [from, setFrom] = useState<'dup' | 'empty'>(latest ? 'dup' : 'empty');
  const [dates, setDates] = useState({ opens: plusYear(latest?.opens ?? '1 Oct 2025'), closes: plusYear(latest?.closes ?? '31 Mar 2026'), offers: plusYear(latest?.offersFrom ?? '20 Oct 2025'), starts: plusYear(latest?.starts ?? latest?.ends ?? '19 Sep 2026') });
  const busy = useRef(false);
  const valid = /^\d{4}\/\d{2}$/.test(name.trim()) && !d.cycles.some((c) => c.name === name.trim());
  const create = () => {
    if (!valid || busy.current) return;
    busy.current = true;
    const n = name.trim();
    d.up((x) => ({ cycles: [{ id: `cy${Date.now()}`, name: n, opens: dates.opens, ends: dates.starts, closes: dates.closes, offersFrom: dates.offers, starts: dates.starts, apps: 0, allocated: 0, beds: latest?.beds ?? 2893, status: 'upcoming', from: from === 'dup' ? latest?.name : undefined }, ...x.cycles] }));
    toast.success(`Term ${n} created`, { description: from === 'dup' ? `Copied properties, room types, rules, offer emails and the form from ${latest?.name}` : 'Empty · set up the form and rules next' });
    onCreated();
  };
  const bars: [string, number, number, string][] = [['Applications', 0, 6, '#2563EB'], ['Review & allocate', 0.6, 7.5, '#7C3AED'], ['Offers open', 0.65, 10, '#B45309'], ['Move-in', 11.4, 12, '#0A8046']];
  return (
    /* Creating something opens a centred modal; side sheets are for reading and editing a record. */
    <PanelModal open onClose={onClose} eyebrow="New term" width={600}
      right={<><Button onClick={onClose}>Cancel</Button><Button variant="primary" icon={null} disabled={!valid} onClick={create}>Create term</Button></>}>
        <SheetSection title="Term">
        <Field label="Name" hint={!valid && name.trim() ? (d.cycles.some((c) => c.name === name.trim()) ? 'That term already exists' : 'Use the form 2028/29') : undefined}><Input value={name} onChange={(e) => setName(e.target.value)} /></Field>
        </SheetSection>
        <SheetSection title="Start from">
          <div role="radiogroup" aria-label="Start from">
            {([...(latest ? [['dup', `Duplicate ${latest.name}`, 'Properties, room types, rules, offer emails and form']] : []), ['empty', 'Start empty', undefined]] as ['dup' | 'empty', string, string | undefined][]).map(([id, t, sub]) => (
              <label key={id} className="py-2.5 flex items-start gap-3 border-t border-[#EBEBEB] first:border-t-0 first:pt-0 last:pb-0 cursor-pointer">
                <input type="radio" name="cycle-from" checked={from === id} onChange={() => setFrom(id)} className="mt-0.5 size-4 accent-[#2563EB]" />
                <span className="min-w-0"><span className="block text-sm leading-5 text-[#0A0A0A]">{t}</span>{sub && <span className="block text-[13px] leading-5 text-[#737373]">{sub}</span>}</span>
              </label>
            ))}
          </div>
        </SheetSection>
        <SheetSection title="Dates">
        <div className="grid grid-cols-2 gap-3">
          <Field label="Applications open"><Input value={dates.opens} onChange={(e) => setDates({ ...dates, opens: e.target.value })} /></Field>
          <Field label="Applications close"><Input value={dates.closes} onChange={(e) => setDates({ ...dates, closes: e.target.value })} /></Field>
          <Field label="Offers from"><Input value={dates.offers} onChange={(e) => setDates({ ...dates, offers: e.target.value })} /></Field>
          <Field label="Tenancies start"><Input value={dates.starts} onChange={(e) => setDates({ ...dates, starts: e.target.value })} /></Field>
        </div>
        </SheetSection>
        <SheetSection title="Timeline">
          <div className="grid grid-cols-12 text-xs text-gray-400 mb-2">{MONTHS.map((m) => <span key={m}>{m}</span>)}</div>
          <div className="space-y-2">
            {bars.map(([l, s, e, c]) => (
              <div key={l} className="relative h-6">
                <div className="absolute h-6 rounded-md flex items-center px-2 text-[11px] font-medium text-white whitespace-nowrap overflow-hidden" style={{ left: `${(s / 12) * 100}%`, width: `${((e - s) / 12) * 100}%`, background: c }}>{l}</div>
              </div>
            ))}
          </div>
        </SheetSection>
    </PanelModal>
  );
}

function EditDates({ c, onClose }: { c: Cycle; onClose: () => void }) {
  const up = useAlloc((s) => s.up);
  const [v, setV] = useState({ opens: c.opens, closes: c.closes ?? '', offers: c.offersFrom ?? '', starts: c.starts ?? c.ends });
  return (
    <PanelModal open onClose={onClose} eyebrow="Edit dates" title={c.name} icon={CalendarDots} width={560}
      right={<><Button onClick={onClose}>Cancel</Button><Button variant="primary" icon={null} onClick={() => {
      up((d) => ({ cycles: d.cycles.map((x) => (x.id === c.id ? { ...x, opens: v.opens, closes: v.closes, offersFrom: v.offers, starts: v.starts, ends: v.starts } : x)) }));
      toast.success(`${c.name} dates saved`, { description: 'Residents who already applied are emailed if a deadline moved' }); onClose();
    }}>Save</Button></>}>
      <SheetSection title="Dates">
        <div className="grid grid-cols-2 gap-3">
          <Field label="Applications open"><Input value={v.opens} onChange={(e) => setV({ ...v, opens: e.target.value })} /></Field>
          <Field label="Applications close"><Input value={v.closes} onChange={(e) => setV({ ...v, closes: e.target.value })} /></Field>
          <Field label="Offers from"><Input value={v.offers} onChange={(e) => setV({ ...v, offers: e.target.value })} /></Field>
          <Field label="Tenancies start"><Input value={v.starts} onChange={(e) => setV({ ...v, starts: e.target.value })} /></Field>
        </div>
      </SheetSection>
    </PanelModal>
  );
}

/* ---------- Edge case E3: close a cycle with work left ---------- */
function CloseCycle({ c, onClose }: { c: Cycle; onClose: () => void }) {
  const d = useAlloc();
  const { withUndo } = useAllocActions();
  const left = d.apps.filter((a) => a.status === 'review' && a.cycle === c.name);
  const [choice, setChoice] = useState<'wait' | 'decline' | 'keep'>('wait');
  const busy = useRef(false);
  const close = () => {
    if (choice === 'keep') return onClose();
    if (busy.current) return; busy.current = true;
    const undo = withUndo();
    const ids = new Set(left.map((a) => a.id));
    d.up((x) => ({
      cycles: x.cycles.map((y) => (y.id === c.id ? { ...y, status: 'closed', closedOn: `${TODAY} 2026`, occupancy: `${((y.allocated / y.beds) * 100).toFixed(1)}%` } : y)),
      apps: x.apps.map((a) => (ids.has(a.id) ? (choice === 'wait' ? { ...a, status: 'waitlist' as const } : { ...a, status: 'rejected' as const, reason: 'Term closed · standard email', rejBy: 'Arjun Mehta', rejOn: TODAY, emailed: true }) : a)),
      waitlist: choice === 'wait' ? [...x.waitlist, ...left.map((a) => ({ id: `w${Date.now()}${a.ref}`, name: a.name, appId: a.id, hall: a.hall, room: a.room, note: `Term ${c.name} closed`, joined: TODAY }))] : x.waitlist,
    }));
    toast.success(`Term closed · ${left.length} residents ${choice === 'wait' ? 'moved to the waitlist' : 'declined'} and emailed`, { action: undo });
    onClose();
  };
  if (!left.length) {
    return (
      <Modal open onClose={onClose} tone="blue" icon={CalendarCheck} title={`Close the ${c.name} term?`} sub="Closing stops new offers; bookings carry on." footer={<><Button onClick={onClose}>Cancel</Button><Button variant="primary" icon={null} onClick={close}>Close term</Button></>}>
        <div className="text-sm text-gray-500">Closed terms are read-only.</div>
      </Modal>
    );
  }
  return (
    <Modal open onClose={onClose} tone="amber" icon={Warning} title={`${left.length} applications aren’t reviewed`} sub={`Closing the ${c.name} term stops new offers.`}
      footer={<><Button onClick={onClose}>Cancel</Button><Button variant={choice === 'decline' ? 'danger' : 'primary'} icon={null} onClick={close}>{choice === 'wait' ? `Close and waitlist ${left.length}` : choice === 'decline' ? `Close and decline ${left.length}` : 'Keep it open'}</Button></>}>
      <div className="space-y-2">
      <Radio checked={choice === 'wait'} onChange={() => setChoice('wait')} title="Move them to the waitlist" sub="In the order they applied; they get an email saying so." />
      <Radio checked={choice === 'decline'} onChange={() => setChoice('decline')} title="Decline with the standard email" sub="They can apply to off-campus housing from the resident site." />
      <Radio checked={choice === 'keep'} onChange={() => setChoice('keep')} title="Keep the term open" sub="Review them first." />
      </div>
    </Modal>
  );
}
