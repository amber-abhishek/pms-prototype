import { useRef, useState } from 'react';
import { ArrowsLeftRight, Bell, Check, CircleDashed, DownloadSimple, FileText, PaperPlaneTilt, Plus, Prohibit, Warning, WarningCircle } from '../../components/icons';
import { toast } from 'sonner';
import { Button, DL, Dialog, Field, FilterButton, Input, Note, PageHeader, SearchInput, Select, Sheet, Tabs, Toolbar, cx } from '../../components/ui';
import { HALLS, ROOMS, TODAY, bookingCounts, fmtN, firstName, hallFull, roomTerms, useAlloc, type Booking, type Conflict, type Data, type Offer } from '../../data/allocations';
import { useOpen, useTab } from '../hooks';
import { Caption, EmptyArea, Foot, Grid, Ini, Modal, Person, Radio, St, type C } from './common';
import { useAllocActions } from './actions';

type TabId = 'All' | 'Lease sent' | 'Drafts' | 'Conflicts' | 'Cancelled';
const TABS: TabId[] = ['All', 'Lease sent', 'Drafts', 'Conflicts', 'Cancelled'];
const LEGACY: Record<string, TabId> = { 'Lease unsigned': 'Lease sent', Confirmed: 'All', 'Checked in': 'All', Draft: 'Drafts' };
const unitOf = (b: Booking) => `${b.hall} · ${b.unit}`;
const leaseLabel = (b: Booking) => (b.cancelled ? 'Cancelled' : b.lease);

/** The unit goes to #1 on the waitlist for its room type, if anyone is waiting. */
function toWaitlist(d: Data, hall: string, room: string, unit: string): Partial<Data> & { who?: string } {
  const w = d.waitlist.find((x) => x.hall === hall && x.room === room);
  if (!w) return {};
  const o: Offer = { id: `o${Date.now()}b`, name: w.name, hall, room, unit, status: 'open', sent: TODAY, expires: '1 Nov 17:00', leftH: 120, reminders: 0, fromWaitlist: '#1', next: `From the waitlist · #1 for ${hall} ${room.toLowerCase()}`, recent: true };
  return { who: w.name, waitlist: d.waitlist.filter((x) => x.id !== w.id), offers: [o, ...d.offers], recent: [o.id, ...d.recent] };
}

export function Bookings() {
  const d = useAlloc();
  const { withUndo } = useAllocActions();
  const [raw, setTab] = useTab<TabId>('All');
  const tab: TabId = LEGACY[raw] ?? (TABS.includes(raw) ? raw : 'All');
  const [open, setOpen] = useOpen();
  const [q, setQ] = useState('');
  const [f, setF] = useState<Record<string, string>>({ cycle: '2027/28' });
  const [creating, setCreating] = useState(false);
  const [resolving, setResolving] = useState<Conflict | null>(null);
  const c = bookingCounts(d);
  const match = (b: Booking) => (!q || `${b.name} ${b.ref} ${b.unit}`.toLowerCase().includes(q.toLowerCase())) && (!f.hall || hallFull[b.hall] === f.hall) && (!f.lease || b.lease === f.lease);
  const act = d.bookings.filter((b) => !b.cancelled && match(b));
  const sent = act.filter((b) => b.lease === 'Sent').sort((a, b) => (b.waiting ?? 0) - (a.waiting ?? 0));
  const drafts = act.filter((b) => b.lease === 'Draft');
  const cancelled = d.bookings.filter((b) => b.cancelled && match(b));
  const late = d.bookings.filter((b) => !b.cancelled && b.lease === 'Sent' && (b.waiting ?? 0) > 7);
  const sel = d.bookings.find((b) => b.id === open);

  const remind = (list: Booking[]) => {
    const ids = list.map((b) => b.id);
    d.up((x) => ({ bookings: x.bookings.map((b) => (ids.includes(b.id) ? { ...b, reminders: (b.reminders ?? 0) + 1, history: [{ t: 'Reminder to sign sent', when: `${TODAY} 10:44` }, ...b.history] } : b)) }));
    toast.success(list.length === 1 ? `Reminder sent to ${list[0].name}` : `Reminders sent to ${list.length} residents`, { description: list.length === 1 ? `${list[0].reminders ? list[0].reminders + 1 : 1} reminders so far` : 'Everyone who has waited more than 7 days to sign' });
  };
  const sendLease = (b: Booking) => {
    d.up((x) => ({ bookings: x.bookings.map((y) => (y.id === b.id ? { ...y, lease: 'Sent' as const, missing: undefined, leaseSent: TODAY, waiting: 0, reminders: 0, history: [{ t: 'Lease sent for signature', when: `${TODAY} 10:44`, sub: 'by Priya Shah' }, ...y.history] } : y)) }));
    toast.success(`Lease sent to ${b.name}`, { description: `${unitOf(b)} · ${firstName(b.name)} signs on the resident portal` });
  };
  const markSigned = (b: Booking) => {
    d.up((x) => ({ bookings: x.bookings.map((y) => (y.id === b.id ? { ...y, lease: 'Signed' as const, signedOn: TODAY, waiting: undefined, history: [{ t: `Lease signed by ${firstName(b.name)}`, when: `${TODAY} 10:44`, sub: 'recorded by Priya Shah · resident portal invite sent' }, ...y.history] } : y)), cycles: x.cycles.map((cy) => (cy.status === 'open' ? { ...cy, signed: (cy.signed ?? 0) + 1 } : cy)) }));
    toast.success(`${b.name}’s lease is signed`, { description: 'Resident portal invite sent' });
  };

  const cols: Record<'All' | 'Lease sent' | 'Drafts' | 'Cancelled', C<Booking>[]> = {
    All: [
      { key: 'n', label: 'Resident', render: (b) => <Person name={b.name} /> },
      { key: 'u', label: 'Unit', render: unitOf },
      { key: 't', label: 'Term', render: (b) => <span className="text-gray-500">{b.term}</span> },
      { key: 'l', label: 'Lease', render: (b) => <St s={leaseLabel(b)} /> },
      { key: 'd', label: 'Deposit', render: (b) => b.deposit.startsWith('Paid') ? <span className="inline-flex items-center gap-1 h-[22px] px-2 rounded-full bg-[#E8F7EE] text-xs font-medium text-[#0B8A4C]"><Check size={12} weight="bold" />{b.deposit}</span> : <span className="text-gray-500">{b.deposit}</span> },
      { key: 'c', label: 'Created', render: (b) => <span className="text-gray-500">{b.created}</span> },
    ],
    'Lease sent': [
      { key: 'n', label: 'Resident', render: (b) => <Person name={b.name} /> },
      { key: 'u', label: 'Unit', render: unitOf },
      { key: 's', label: 'Lease sent', render: (b) => <span className="text-gray-500">{b.leaseSent}</span> },
      { key: 'r', label: 'Reminders', render: (b) => <span className="text-gray-500">{b.reminders ? `${b.reminders} sent` : 'None yet'}</span> },
      { key: 'w', label: 'Waiting', render: (b) => <span className={cx((b.waiting ?? 0) > 7 ? 'text-[#E5530C] font-medium' : 'text-gray-500')}>{b.waiting} days</span> },
      { key: 'a', label: '', className: 'text-right', render: (b) => <Button size="sm" icon={Bell} onClick={(e) => { e.stopPropagation(); remind([b]); }}>Send reminder</Button> },
    ],
    Drafts: [
      { key: 'n', label: 'Resident', render: (b) => <Person name={b.name} /> },
      { key: 'u', label: 'Unit', render: unitOf },
      { key: 'm', label: 'What’s missing', render: (b) => <span className="inline-flex items-center gap-1.5 text-ink"><CircleDashed size={14} className="text-gray-400" />{b.missing ?? '—'}</span> },
      { key: 'c', label: 'Created', render: (b) => <span className="text-gray-500">{b.created}</span> },
      { key: 'a', label: '', className: 'text-right w-48', render: (b) => b.missing?.startsWith('Made by hand') ? <Button size="sm" variant="ghost" icon={PaperPlaneTilt} onClick={(e) => { e.stopPropagation(); sendLease(b); }}>Send lease</Button> : <Button size="sm" variant="ghost" onClick={(e) => { e.stopPropagation(); setOpen(b.id); }}>Open</Button> },
    ],
    Cancelled: [
      { key: 'n', label: 'Resident', render: (b) => <Person name={b.name} /> },
      { key: 'u', label: 'Unit', render: unitOf },
      { key: 'c', label: 'Cancelled', render: (b) => <span className="text-gray-500">{b.cancelled?.on}</span> },
      { key: 'r', label: 'Reason', render: (b) => b.cancelled?.reason },
      { key: 'm', label: 'Money', render: (b) => <span className="text-gray-500">{b.cancelled?.money}</span> },
    ],
  };
  const caption: Record<TabId, string> = {
    All: '', 'Lease sent': 'Waiting for the resident to sign · longest wait first', Drafts: 'Not sent yet · each one needs something before the lease can go out',
    Conflicts: '', Cancelled: 'Cancelled bookings stay here for the cycle report',
  };
  const foot: Record<TabId, string> = {
    All: `${fmtN(c.all)} bookings · ${fmtN(c.sent)} waiting to sign`, 'Lease sent': `${fmtN(c.sent)} leases waiting · ${late.length} for more than 7 days`, Drafts: `${c.drafts} drafts · nothing is charged until the lease is sent`,
    Conflicts: '', Cancelled: `${c.cancelled} cancelled this cycle`,
  };
  const rows = tab === 'All' ? act : tab === 'Lease sent' ? sent : tab === 'Drafts' ? drafts : tab === 'Cancelled' ? cancelled : [];
  const none = c.all === 0;

  return (
    <>
      <PageHeader icon={FileText} title="Bookings" crumbs={['Allocations']}>
        <Button icon={DownloadSimple} onClick={() => toast.success('Export started', { description: `${fmtN(tab === 'All' ? c.all : rows.length)} bookings · CSV · we’ll email you the file` })}>Export</Button>
        {tab === 'Lease sent' && late.length > 0 && <Button icon={Bell} onClick={() => remind(late)}>Remind all {late.length}</Button>}
        <Button variant="primary" icon={Plus} onClick={() => setCreating(true)}>New booking</Button>
      </PageHeader>
      <Toolbar right={<><SearchInput value={q} onChange={setQ} placeholder="Search" /><FilterButton value={f} onChange={setF} defs={[{ id: 'cycle', label: 'Cycle', options: d.cycles.map((x) => x.name) }, { id: 'hall', label: 'Hall', options: HALLS.map((h) => hallFull[h]) }, { id: 'lease', label: 'Lease', options: ['Signed', 'Sent', 'Draft'] }]} /></>}>
        <Tabs value={tab} onChange={setTab} tabs={[{ id: 'All', label: 'All', count: c.all }, { id: 'Lease sent', label: 'Lease sent', count: c.sent }, { id: 'Drafts', label: 'Drafts', count: c.drafts }, { id: 'Conflicts', label: 'Conflicts', count: c.conflicts }, { id: 'Cancelled', label: 'Cancelled', count: c.cancelled }]} />
      </Toolbar>
      {none ? (
        <EmptyArea icon={FileText} title="No bookings yet" sub="A booking is created when an applicant accepts an offer, and the lease goes out straight after. You can also make one by hand.">
          <Button icon={Plus} onClick={() => setCreating(true)}>New booking</Button>
        </EmptyArea>
      ) : tab === 'Conflicts' ? (
        d.conflicts.length === 0 ? (
          <EmptyArea icon={Check} title="No conflicts" sub="Every unit has one booking for any night. If two bookings ever overlap, they show up here before anything is charged or sent." />
        ) : (
          <div className="flex-1 overflow-auto p-5 space-y-4">
            <div className="rounded-lg border border-[#E0243A]/30 bg-white px-3.5 py-2.5 flex gap-2.5">
              <Warning size={16} className="text-[#E0243A] mt-0.5 shrink-0" />
              <div><div className="text-sm font-medium text-[#E0243A]">{d.conflicts.length} {d.conflicts.length === 1 ? 'unit has' : 'units have'} two bookings for the same nights</div><div className="text-xs text-gray-500 mt-0.5">Nothing is charged or sent for these until you resolve them. Moving one resident keeps their deposit and history.</div></div>
            </div>
            {d.conflicts.map((k) => (
              <div key={k.id} className="rounded-xl border border-line bg-white">
                <div className="h-14 px-4 flex items-center gap-2.5 border-b border-[#F3F4F6]">
                  <Warning size={16} className="text-[#E0243A] shrink-0" /><div className="min-w-0"><div className="text-sm font-semibold">{k.unit}</div><div className="text-xs text-gray-500">{k.overlap}</div></div>
                  <Button size="sm" className="ml-auto" onClick={() => setResolving(k)}>Resolve…</Button>
                </div>
                {[k.a, k.b].map((s, i) => (
                  <div key={s.ref} className={cx('h-[52px] px-4 flex items-center gap-3', i === 0 && 'border-b border-[#F3F4F6]')}>
                    <Ini name={s.name} size={24} />
                    <div><div className="text-sm font-medium">{s.name}</div><div className="font-mono text-xs text-gray-500">{s.note ? `${s.note} · ` : ''}{s.ref}</div></div>
                    <span className="ml-auto text-sm text-ink mr-12">{s.term}</span>
                    <span className="w-20 text-right"><St s={s.lease} /></span>
                  </div>
                ))}
              </div>
            ))}
          </div>
        )
      ) : (
        <div className="flex-1 min-h-0 flex flex-col">
          {caption[tab] && <Caption>{caption[tab]}</Caption>}
          <div className="flex-1 overflow-auto">
            {rows.length ? <Grid key={tab} cols={cols[tab]} rows={rows} onRow={(b) => setOpen(b.id)} selected={open} />
              : <EmptyArea icon={FileText} title={tab === 'Drafts' ? 'No drafts' : tab === 'Lease sent' ? 'Every lease is signed' : `No ${tab.toLowerCase()} bookings`} sub={q || f.hall || f.lease ? 'Clear the search or filter to see more.' : 'Nothing here right now.'} />}
          </div>
          <Foot>{foot[tab]}</Foot>
        </div>
      )}
      {sel && <BookingSheet b={sel} onClose={() => setOpen(null)} onSend={() => sendLease(sel)} onRemind={() => remind([sel])} onSigned={() => markSigned(sel)} withUndo={withUndo} />}
      {creating && <NewBooking onClose={() => setCreating(false)} onMade={(id) => { setCreating(false); setTab('Drafts'); setOpen(id); }} />}
      {resolving && <Resolve k={resolving} onClose={() => setResolving(null)} withUndo={withUndo} />}
    </>
  );
}

const STEPS = ['Draft', 'Sent', 'Signed', 'Active'] as const;
/** F2·09: the booking, its lease stepper and history; cancel with the E4 cooling-off path. */
function BookingSheet({ b, onClose, onSend, onRemind, onSigned, withUndo }: { b: Booking; onClose: () => void; onSend: () => void; onRemind: () => void; onSigned: () => void; withUndo: () => { label: string; onClick: () => void } }) {
  const [cancelling, setCancelling] = useState(false);
  const [after, setAfter] = useState<null | { cooling: boolean; who?: string }>(null);
  const { weeks, rate } = roomTerms(b.hall, b.room);
  const step = b.cancelled ? -1 : STEPS.indexOf(b.lease);
  return (
    <Sheet open onClose={onClose} width={520} title={<span className="flex items-center gap-2.5"><Ini name={b.name} size={28} />{b.name}</span>}
      sub={<span className="pl-[38px] font-mono text-[12px]">{b.ref}</span>}
      footer={b.cancelled ? <Button onClick={onClose}>Close</Button> : <>
        <Button variant="ghost" icon={Prohibit} className="mr-auto text-[#E0243A]" onClick={() => setCancelling(true)}>Cancel booking</Button>
        {b.lease === 'Draft' && <Button variant="primary" icon={PaperPlaneTilt} disabled={b.missing === 'Deposit not paid'} onClick={onSend}>Send lease</Button>}
        {b.lease === 'Sent' && <><Button icon={Bell} onClick={onRemind}>Send reminder</Button><Button variant="primary" icon={Check} onClick={onSigned}>Mark signed</Button></>}
        {b.lease === 'Signed' && <Button onClick={() => toast.success('Lease downloaded', { description: `${b.ref}.pdf` })}>Download lease</Button>}
      </>}>
      <div className="space-y-5">
        {after && (
          <Note tone="green" icon={Check} title={`Booking cancelled${after.cooling ? ' · deposit refunded £250' : ''}`}>
            {after.who ? `${b.hall} ${b.unit} was offered to ${after.who}, next on the waitlist.` : `${b.hall} ${b.unit} is back in search.`}
          </Note>
        )}
        {b.cancelled ? (
          <Note tone="red" icon={Prohibit} title={`Cancelled ${b.cancelled.on}`}>{b.cancelled.reason} · {b.cancelled.money}</Note>
        ) : (
          <ol className="flex items-center gap-2" aria-label="Lease progress">
            {STEPS.map((s, i) => (
              <li key={s} className="flex items-center gap-2 flex-1 last:flex-none">
                <span className={cx('flex items-center gap-1.5 text-sm', i <= step ? 'text-ink font-medium' : 'text-gray-400')}>
                  <span className={cx('size-5 rounded-full flex items-center justify-center text-[11px]', i < step || (i === step && s === 'Signed') ? 'bg-[#0B8A4C] text-white' : i === step ? 'bg-primary text-white' : 'bg-gray-100 text-gray-500')}>{i < step || (i === step && s === 'Signed') ? <Check size={11} weight="bold" /> : i + 1}</span>
                  {s === 'Active' ? 'Active on 19 Sep' : s}
                </span>
                {i < STEPS.length - 1 && <span className={cx('flex-1 h-px', i < step ? 'bg-[#0B8A4C]' : 'bg-line')} />}
              </li>
            ))}
          </ol>
        )}
        {b.missing && !b.cancelled && <Note tone="amber" icon={WarningCircle} title={b.missing}>{b.missing === 'Deposit not paid' ? 'The lease goes out once the £250 deposit is paid.' : 'Sort this before you send the lease.'}</Note>}
        <DL rows={[['Unit', `${hallFull[b.hall]} · ${b.unit}`], ['Room type', b.room], ['Term', `${b.term} · ${weeks} weeks`], ['Rent', `£${rate}/wk · £${fmtN(rate * weeks)}`], ['Deposit', b.deposit], ['Lease', <St s={leaseLabel(b)} />], ...(b.signedOn ? [['Signed', b.signedOn] as [string, string]] : []), ...(b.leaseSent && b.lease === 'Sent' ? [['Lease sent', `${b.leaseSent} · ${b.reminders ?? 0} reminders`] as [string, string]] : [])]} />
        <div>
          <div className="text-sm font-semibold mb-2">History</div>
          <ol className="space-y-3 border-l border-line ml-1.5 pl-4">
            {b.history.map((h, i) => (
              <li key={i} className="relative"><span className="absolute -left-[21px] top-1.5 size-2 rounded-full bg-gray-300" /><div className="text-sm">{h.t}</div><div className="text-xs text-gray-500">{h.when}{h.sub ? ` · ${h.sub}` : ''}</div></li>
            ))}
          </ol>
        </div>
      </div>
      {cancelling && <CancelBooking b={b} onClose={() => setCancelling(false)} onDone={(r) => { setCancelling(false); setAfter(r); }} withUndo={withUndo} />}
    </Sheet>
  );
}

/** E4: cancel inside the 14-day cooling-off period refunds the deposit; then offer the unit to the waitlist. */
function CancelBooking({ b, onClose, onDone, withUndo }: { b: Booking; onClose: () => void; onDone: (r: { cooling: boolean; who?: string }) => void; withUndo: () => { label: string; onClick: () => void } }) {
  const up = useAlloc((s) => s.up);
  const waitlist = useAlloc((s) => s.waitlist);
  const waiting = waitlist.filter((w) => w.hall === b.hall && w.room === b.room);
  const cooling = b.lease === 'Signed' || b.lease === 'Sent';
  const [reason, setReason] = useState('Withdrew · private halls');
  const [step, setStep] = useState<1 | 2>(1);
  const busy = useRef(false);
  const undo = useRef<{ label: string; onClick: () => void } | null>(null);
  const cancel = () => {
    if (busy.current) return; busy.current = true;
    undo.current = withUndo();
    up((x) => ({ bookings: x.bookings.map((y) => (y.id === b.id ? { ...y, cancelled: { on: TODAY, reason, money: cooling && b.deposit.startsWith('Paid') ? 'Deposit refunded £250' : 'Nothing paid', cooling }, history: [{ t: `Booking cancelled · ${reason}`, when: `${TODAY} 10:44`, sub: cooling ? 'inside the cooling-off period · deposit refunded' : undefined }, ...y.history] } : y))}));
    setStep(2);
  };
  const finish = (offer: boolean) => {
    let who: string | undefined;
    if (offer) up((x) => { const r = toWaitlist(x, b.hall, b.room, b.unit); who = r.who; delete r.who; return { ...r, bookings: x.bookings.map((y) => (y.id === b.id && y.cancelled ? { ...y, cancelled: { ...y.cancelled, offered: true } } : y)) }; });
    toast(`${b.name}’s booking cancelled`, { description: who ? `${b.hall} ${b.unit} offered to ${who}` : `${b.hall} ${b.unit} is back in search`, action: undo.current ?? undefined });
    onDone({ cooling, who });
  };
  if (step === 2) {
    return (
      <Modal open onClose={() => finish(false)} tone="green" icon={Check} title="Booking cancelled" width={500}
        sub={cooling ? `${firstName(b.name)} cancelled inside the 14-day cooling-off period, so the £250 deposit is refunded in full. Nothing else is owed.` : `${firstName(b.name)} hadn’t paid anything, so nothing is refunded.`}
        footer={<><Button onClick={() => finish(false)}>Put it back in search</Button><Button variant="primary" icon={PaperPlaneTilt} disabled={!waiting.length} onClick={() => finish(true)}>Offer {b.unit} to the waitlist</Button></>}>
        {waiting.length ? <Note tone="blue" title={`${waiting.length} waiting for ${b.hall} · ${b.room}`}>#1 is {waiting[0].name} · {waiting[0].note}</Note>
          : <Note tone="amber" title="No one is waiting for this room type">The unit goes back into search for the next allocation.</Note>}
      </Modal>
    );
  }
  return (
    <Modal open onClose={onClose} icon={Prohibit} title={`Cancel ${b.name}’s booking`} width={520}
      sub={`${b.hall} · ${b.unit} · ${b.term}. The lease is voided and ${firstName(b.name)} is emailed.`}
      footer={<><Button onClick={onClose}>Keep booking</Button><Button variant="danger" onClick={cancel}>Cancel booking</Button></>}>
      {cooling && <div className="mb-3"><Note tone="green" icon={Check} title="Inside the cooling-off period">Signed or sent less than 14 days ago · the £250 deposit is refunded in full.</Note></div>}
      <div className="space-y-2">{['Withdrew · private halls', 'Didn’t meet study offer', 'Duplicate booking', 'Moved to another unit', 'Other'].map((r) => <Radio key={r} checked={reason === r} onChange={() => setReason(r)} title={r} />)}</div>
    </Modal>
  );
}

/** Move one resident of a double-booked unit to a free unit; the conflict goes away. */
function Resolve({ k, onClose, withUndo }: { k: Conflict; onClose: () => void; withUndo: () => { label: string; onClick: () => void } }) {
  const up = useAlloc((s) => s.up);
  const [who, setWho] = useState<'a' | 'b'>(k.b.lease === 'Sent' || k.b.note ? 'b' : 'a');
  const hall = k.unit.split(' · ')[0];
  const units = hall === 'Collingwood' ? ['3.2.D', '3.3.A', '2.4.C'] : ['4.2.D', '4.3.A', '3.1.B'];
  const [unit, setUnit] = useState(units[0]);
  const busy = useRef(false);
  const side = k[who];
  return (
    <Modal open onClose={onClose} tone="amber" icon={ArrowsLeftRight} title={`Resolve ${k.unit}`} width={540}
      sub={`${k.overlap}. Move one resident to a free unit. Their deposit, lease and history move with them.`}
      footer={<><Button onClick={onClose}>Cancel</Button><Button variant="primary" onClick={() => {
        if (busy.current) return; busy.current = true;
        const undo = withUndo();
        up((x) => ({ conflicts: x.conflicts.filter((y) => y.id !== k.id), bookings: x.bookings.map((y) => (y.name === side.name && !y.cancelled ? { ...y, unit, history: [{ t: `Moved from ${k.unit.split(' · ')[1]} to ${unit}`, when: `${TODAY} 10:44`, sub: 'double booking resolved by Priya Shah' }, ...y.history] } : y)) }));
        toast.success(`${side.name} moved to ${hall} · ${unit}`, { description: `${k.unit} has one booking again · ${firstName(side.name)} has been emailed`, action: undo });
        onClose();
      }}>Move {firstName(side.name)}</Button></>}>
      <div className="text-xs font-medium text-gray-500 mb-2">Who moves</div>
      <div className="space-y-2">{(['a', 'b'] as const).map((s) => <Radio key={s} checked={who === s} onChange={() => setWho(s)} title={`${k[s].name}${k[s].note ? ` · ${k[s].note}` : ''}`} sub={`${k[s].ref} · ${k[s].term} · lease ${k[s].lease.toLowerCase()}`} />)}</div>
      <div className="mt-3"><Field label="Move to"><Select value={unit} onChange={(e) => setUnit(e.target.value)}>{units.map((u) => <option key={u} value={u}>{hall} · {u} · free for the whole term</option>)}</Select></Field></div>
    </Modal>
  );
}

/** A booking made by hand: starts as a Draft, the lease isn't sent. */
function NewBooking({ onClose, onMade }: { onClose: () => void; onMade: (id: string) => void }) {
  const up = useAlloc((s) => s.up);
  const n = useAlloc((s) => s.bookings.length);
  const [name, setName] = useState('');
  const [hall, setHall] = useState<string>('Collingwood');
  const [room, setRoom] = useState<string>('Standard single');
  const [unit, setUnit] = useState('');
  const [deposit, setDeposit] = useState('Due £250');
  const busy = useRef(false);
  const ok = name.trim() && unit.trim();
  return (
    <Dialog open onClose={onClose} title="New booking" footer={<><Button onClick={onClose}>Cancel</Button><Button variant="primary" disabled={!ok} onClick={() => {
      if (busy.current) return; busy.current = true;
      const id = `b${Date.now()}`;
      const b: Booking = { id, ref: `BKG-2027-00${5000 + n}`, name: name.trim(), hall, room, unit: unit.trim(), term: '19 Sep 2027 – 9 Sep 2028', lease: 'Draft', deposit, created: TODAY, missing: 'Made by hand · lease not sent', history: [{ t: 'Booking made by hand by Priya Shah', when: `${TODAY} 10:44` }] };
      up((x) => ({ bookings: [b, ...x.bookings] }));
      toast.success(`Draft booking made for ${b.name}`, { description: `${hall} · ${b.unit} · send the lease when you’re ready` });
      onMade(id);
    }}>Create draft</Button></>}>
      <div className="space-y-3">
        <Field label="Resident"><Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Full name" /></Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Hall"><Select value={hall} onChange={(e) => setHall(e.target.value)}>{HALLS.map((h) => <option key={h}>{h}</option>)}</Select></Field>
          <Field label="Room type"><Select value={room} onChange={(e) => setRoom(e.target.value)}>{ROOMS.map((r) => <option key={r}>{r}</option>)}</Select></Field>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Unit"><Input value={unit} onChange={(e) => setUnit(e.target.value)} placeholder="e.g. 2.4.C" /></Field>
          <Field label="Deposit"><Select value={deposit} onChange={(e) => setDeposit(e.target.value)}>{['Due £250', 'Paid £250', 'Waived'].map((x) => <option key={x}>{x}</option>)}</Select></Field>
        </div>
        <p className="text-xs text-gray-500">Term 19 Sep 2027 – 9 Sep 2028 · it starts as a draft and nothing is sent until you send the lease.</p>
      </div>
    </Dialog>
  );
}
