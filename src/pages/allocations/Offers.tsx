import { useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { CalendarPlus, CheckCircle, Clock, DotsSixVertical, HourglassMedium, PaperPlaneTilt, Plus, Tray, XCircle } from '../../components/icons';
import { toast } from 'sonner';
import { Button, DL, Dialog, Field, FilterButton, Input, Note, PageHeader, SearchInput, Select, Sheet, Tabs, Toolbar, cx } from '../../components/ui';
import { HALLS, ROOMS, TODAY, addDays, fmtLeft, fmtN, hallFull, offerCounts, useAlloc, type Booking, type Data, type Offer, type Wait } from '../../data/allocations';
import { useOpen, useTab } from '../hooks';
import { Caption, EmptyArea, Foot, Grid, Ini, Kbd, Person, St, type C } from './common';
import { useAllocActions } from './actions';

type TabId = 'Recent' | 'Open' | 'Accepted' | 'Declined' | 'Lapsed' | 'Waitlist';
const LEGACY: Record<string, TabId> = { Sent: 'Open', Expired: 'Lapsed' };
const ST: Record<Offer['status'], string> = { open: 'Open', accepted: 'Accepted', declined: 'Declined', lapsed: 'Lapsed' };
const unitOf = (o: { hall: string; unit: string }) => `${o.hall} · ${o.unit}`;
const leftCls = (h?: number) => (h === undefined ? '' : h <= 24 ? 'font-semibold text-[#E5530C]' : 'text-ink');
const Left = ({ h, text }: { h?: number; text: string }) => <span className={cx('inline-flex items-center gap-1', leftCls(h))}>{h !== undefined && h <= 24 && <Clock size={14} />}{text}</span>;

/** Next on the waitlist for a room type, and the data with them taken off and offered the unit. */
function offerToWaitlist(d: Data, hall: string, room: string, unit: string): { name: string; patch: Partial<Data> } | null {
  const w = d.waitlist.find((x) => x.hall === hall && x.room === room);
  if (!w) return null;
  const o: Offer = { id: `o${Date.now()}w`, name: w.name, hall, room, unit, status: 'open', sent: TODAY, expires: '1 Nov 17:00', leftH: 120, reminders: 0, fromWaitlist: '#1', next: `From the waitlist · #1 for ${hall} ${room.toLowerCase()}`, recent: true };
  return { name: w.name, patch: { waitlist: d.waitlist.filter((x) => x.id !== w.id), offers: [o, ...d.offers], recent: [o.id, ...d.recent] } };
}

export function Offers() {
  const d = useAlloc();
  const nav = useNavigate();
  const { withUndo } = useAllocActions();
  const [raw, setTab] = useTab<TabId>('Recent');
  const tab: TabId = LEGACY[raw] ?? (['Recent', 'Open', 'Accepted', 'Declined', 'Lapsed', 'Waitlist'].includes(raw) ? raw : 'Recent');
  const [open, setOpen] = useOpen();
  const [q, setQ] = useState('');
  const [f, setF] = useState<Record<string, string>>({ cycle: '2027/28' });
  const [adding, setAdding] = useState(false);
  const [offering, setOffering] = useState<Wait | null>(null);
  const c = offerCounts(d);
  const match = (x: { name: string; hall: string }) => (!q || x.name.toLowerCase().includes(q.toLowerCase())) && (!f.hall || hallFull[x.hall] === f.hall);
  const rowsFor = (s: Offer['status']) => d.offers.filter((o) => o.status === s && match(o));
  const recent = d.recent.map((id) => d.offers.find((o) => o.id === id)).filter((o): o is Offer => !!o && match(o)).filter((o, i, a) => a.indexOf(o) === i);
  const sel = d.offers.find((o) => o.id === open);
  const booking = (name: string) => d.bookings.find((b) => b.name === name && !b.cancelled);
  const openBooking = (name: string) => { const b = booking(name); nav(b ? `/allocations/bookings?open=${b.id}` : '/allocations/bookings'); };

  const remind = () => {
    const due = d.offers.filter((o) => o.status === 'open' && (o.leftH ?? 99) < 48);
    d.up((x) => ({ offers: x.offers.map((o) => (due.includes(o) ? { ...o, reminders: o.reminders + 1, next: 'Reminder sent today' } : o)) }));
    toast.success(`Reminders sent to ${9 + due.length} applicants`, { description: 'Everyone whose offer expires in the next 48 hours' });
  };
  const extend = (o: Offer) => {
    d.up((x) => ({ offers: x.offers.map((y) => (y.id === o.id ? { ...y, expires: addDays(y.expires ?? '', 2), leftH: (y.leftH ?? 0) + 48 } : y)) }));
    toast.success(`${o.name}’s offer extended by 2 days`, { description: `Now expires ${addDays(o.expires ?? '', 2)} · ${o.name.split(' ')[0]} has been emailed` });
  };
  const accept = (o: Offer) => {
    const undo = withUndo();
    const exist = booking(o.name);
    const id = exist?.id ?? `b${Date.now()}`;
    const b: Booking = { id, ref: `BKG-2027-00${4900 + d.bookings.length}`, name: o.name, hall: o.hall, room: o.room, unit: o.unit, term: '19 Sep 2027 – 9 Sep 2028', lease: 'Sent', deposit: 'Paid £250', created: TODAY, leaseSent: TODAY, reminders: 0, waiting: 0,
      history: [{ t: 'Offer accepted · deposit paid £250', when: `${TODAY} 10:46` }, { t: 'Lease sent for signature', when: `${TODAY} 10:46`, sub: 'automatic' }, { t: `Offer email sent to ${o.name.split(' ')[0]}`, when: `${o.sent} 10:42` }] };
    d.up((x) => ({
      offers: x.offers.map((y) => (y.id === o.id ? { ...y, status: 'accepted', accepted: TODAY, deposit: 'Paid £250', next: 'Booking created · lease sent', recent: true } : y)),
      recent: [o.id, ...x.recent.filter((r) => r !== o.id)],
      bookings: [b, ...x.bookings.filter((y) => y.id !== id)],
      apps: x.apps.map((a) => (a.name === o.name && a.status === 'allocated' ? { ...a, offer: 'Accepted' } : a)),
      cycles: x.cycles.map((cy) => (cy.status === 'open' ? { ...cy, accepted: (cy.accepted ?? 0) + 1 } : cy)),
    }));
    toast.success(`${o.name} accepted ${o.hall} ${o.unit} · booking sent to sign`, { action: { label: 'Open booking', onClick: () => nav(`/allocations/bookings?open=${id}`) }, cancel: { label: 'Undo', onClick: undo.onClick } });
  };
  /** E2: the offer lapses and the unit goes to the next on the waitlist. */
  const lapse = (o: Offer) => {
    const undo = withUndo();
    let to: string | null = null;
    d.up((x) => {
      const r = offerToWaitlist(x, o.hall, o.room, o.unit);
      to = r?.name ?? null;
      const base = { ...x, ...(r?.patch ?? {}) };
      return {
        ...(r?.patch ?? {}),
        offers: (base.offers ?? x.offers).map((y) => (y.id === o.id ? { ...y, status: 'lapsed' as const, lapsed: TODAY, leftH: undefined, wentTo: r ? `${r.name} · waitlist #1` : 'No one waiting · back in search', next: `No reply in 5 days · ${r ? `unit offered to ${r.name}` : 'unit back in search'}`, recent: true } : y)),
        recent: [...(r ? [(base.recent ?? x.recent)[0]] : []), o.id, ...x.recent.filter((id) => id !== o.id)],
        waitlist: [...(base.waitlist ?? x.waitlist), { id: `w${Date.now()}`, name: o.name, hall: o.hall, room: o.room, note: `Lapsed ${TODAY} · asked to stay on the list`, joined: TODAY }],
      };
    });
    toast(`${o.name.split(' ')[0]}’s offer lapsed · ${o.hall} ${o.unit} ${to ? `offered to ${to}, next on the waitlist` : 'is back in search'}`, { action: undo });
    setOpen(null);
  };
  const decline = (o: Offer, reason: string) => {
    const undo = withUndo();
    let to: string | null = null;
    d.up((x) => {
      const r = offerToWaitlist(x, o.hall, o.room, o.unit);
      to = r?.name ?? null;
      const offers = (r?.patch.offers ?? x.offers).map((y) => (y.id === o.id ? { ...y, status: 'declined' as const, declined: TODAY, reason, leftH: undefined, unitNow: r ? `Offered to ${r.name}` : 'Back in search', next: `${reason} · unit ${r ? 're-offered' : 'back in search'}`, recent: true } : y));
      return { ...(r?.patch ?? {}), offers, recent: [...(r ? [(r.patch.recent ?? [])[0]] : []), o.id, ...x.recent.filter((id) => id !== o.id)], apps: x.apps.map((a) => (a.name === o.name && a.status === 'allocated' ? { ...a, offer: 'Declined' as const } : a)) };
    });
    toast(`${o.name} declined ${o.hall} ${o.unit}`, { description: to ? `Offered to ${to}, next on the waitlist` : 'The unit is back in search', action: undo });
    setOpen(null);
  };
  const offerAgain = (o: Offer) => {
    d.up((x) => ({ offers: x.offers.map((y) => (y.id === o.id ? { ...y, status: 'open' as const, sent: TODAY, expires: '1 Nov 17:00', leftH: 120, reminders: 0, lapsed: undefined, wentTo: undefined, next: 'Offered again · from the lapsed list', recent: true } : y)), recent: [o.id, ...x.recent.filter((id) => id !== o.id)], waitlist: x.waitlist.filter((w) => w.name !== o.name) }));
    toast.success(`New offer sent to ${o.name}`, { description: `${o.hall} · ${o.room} · expires in 5 days` });
  };

  const cols: Record<Exclude<TabId, 'Waitlist'>, C<Offer>[]> = {
    Recent: [
      { key: 'n', label: 'Applicant', render: (o) => <Person name={o.name} /> },
      { key: 'u', label: 'Unit', render: (o) => unitOf(o) },
      { key: 's', label: 'Status', render: (o) => <St s={ST[o.status]} /> },
      { key: 't', label: 'Time left', render: (o) => o.status === 'open' && o.leftH !== undefined ? <Left h={o.leftH} text={fmtLeft(o.leftH)} /> : <span className="text-gray-500">—</span> },
      { key: 'x', label: 'What happened next', render: (o) => <span className="text-gray-500">{o.next ?? '—'}</span> },
    ],
    Open: [
      { key: 'n', label: 'Applicant', render: (o) => <Person name={o.name} /> },
      { key: 'u', label: 'Unit', render: (o) => unitOf(o) },
      { key: 's', label: 'Sent', render: (o) => <span className="text-gray-500">{o.sent}</span> },
      { key: 'e', label: 'Expires', render: (o) => <span className="text-gray-500">{o.expires}</span> },
      { key: 't', label: 'Time left', render: (o) => <Left h={o.leftH ?? 0} text={fmtLeft(o.leftH ?? 0)} /> },
      { key: 'r', label: 'Reminders', render: (o) => <span className="text-gray-500">{o.reminders ? `${o.reminders} sent` : 'None yet'}</span> },
      { key: 'a', label: '', className: 'text-right', render: (o) => <Button size="sm" variant="ghost" icon={CalendarPlus} onClick={(e) => { e.stopPropagation(); extend(o); }}>Extend</Button> },
    ],
    Accepted: [
      { key: 'n', label: 'Applicant', render: (o) => <Person name={o.name} /> },
      { key: 'u', label: 'Unit', render: (o) => unitOf(o) },
      { key: 'd', label: 'Accepted', render: (o) => <span className="text-gray-500">{o.accepted}</span> },
      { key: 'p', label: 'Deposit', render: (o) => <span className="text-[#0B8A4C]">{o.deposit}</span> },
      { key: 'l', label: 'Lease', render: (o) => <St s={booking(o.name)?.lease ?? 'Draft'} /> },
      { key: 'a', label: '', className: 'text-right', render: (o) => <Button size="sm" onClick={(e) => { e.stopPropagation(); openBooking(o.name); }}>Open booking</Button> },
    ],
    Declined: [
      { key: 'n', label: 'Applicant', render: (o) => <Person name={o.name} /> },
      { key: 'u', label: 'Unit', render: (o) => unitOf(o) },
      { key: 'd', label: 'Declined', render: (o) => <span className="text-gray-500">{o.declined}</span> },
      { key: 'r', label: 'Their reason', render: (o) => o.reason },
      { key: 'x', label: 'The unit now', render: (o) => <span className={cx(o.unitNow?.startsWith('Offered') ? 'text-ink' : 'text-gray-500')}>{o.unitNow}</span> },
    ],
    Lapsed: [
      { key: 'n', label: 'Applicant', render: (o) => <Person name={o.name} /> },
      { key: 'u', label: 'Unit', render: (o) => unitOf(o) },
      { key: 'd', label: 'Lapsed', render: (o) => <span className="text-gray-500">{o.lapsed}</span> },
      { key: 'r', label: 'Reminders', render: (o) => <span className="text-gray-500">{o.reminders} sent</span> },
      { key: 'x', label: 'The unit went to', render: (o) => o.wentTo },
      { key: 'a', label: '', className: 'text-right', render: (o) => <Button size="sm" icon={PaperPlaneTilt} onClick={(e) => { e.stopPropagation(); offerAgain(o); }}>Offer again</Button> },
    ],
  };
  const caption: Record<TabId, string> = {
    Recent: 'Everything that changed in the last 7 days', Open: 'Sorted by time left · lapsed offers go to the waitlist', Accepted: 'A booking is created when an offer is accepted, with the lease sent straight after',
    Declined: 'The unit is re-offered or goes back into search', Lapsed: 'An offer lapses after its deadline with no reply', Waitlist: 'When a unit frees up it goes to #1 for that room type',
  };
  const open48 = 9 + d.offers.filter((o) => o.status === 'open' && (o.leftH ?? 99) < 48).length;
  const foot: Record<TabId, string> = {
    Recent: `${recent.length} offers changed in the last 7 days`, Open: `${fmtN(c.open)} open · ${open48} expire in the next 48 h`, Accepted: `${fmtN(c.accepted)} accepted · a booking is created when an offer is accepted`,
    Declined: `${fmtN(c.declined)} declined`, Lapsed: `${c.lapsed} lapsed · the applicant moves to the waitlist and can be offered again`, Waitlist: `${c.waitlist} waiting across 14 room types`,
  };
  const rows = tab === 'Recent' ? recent : tab === 'Open' ? rowsFor('open').sort((a, b) => (a.leftH ?? 0) - (b.leftH ?? 0)) : tab === 'Waitlist' ? [] : rowsFor(tab.toLowerCase() as Offer['status']);
  const noOffers = c.open + c.accepted + c.declined + c.lapsed === 0;
  return (
    <>
      <PageHeader icon={PaperPlaneTilt} title="Offers & waitlist" crumbs={['Allocations']}>
        {tab === 'Waitlist' ? <Button icon={Plus} onClick={() => setAdding(true)}>Add to waitlist</Button> : !noOffers && <Button icon={PaperPlaneTilt} onClick={remind}>Send reminders</Button>}
      </PageHeader>
      <Toolbar right={<><SearchInput value={q} onChange={setQ} placeholder="Search offers" /><FilterButton value={f} onChange={setF} defs={[{ id: 'cycle', label: 'Cycle', options: d.cycles.map((x) => x.name) }, { id: 'hall', label: 'Hall', options: HALLS.map((h) => hallFull[h]) }]} /></>}>
        <Tabs value={tab} onChange={setTab} tabs={[{ id: 'Recent', label: 'Recent' }, { id: 'Open', label: 'Open', count: c.open }, { id: 'Accepted', label: 'Accepted', count: c.accepted }, { id: 'Declined', label: 'Declined', count: c.declined }, { id: 'Lapsed', label: 'Lapsed', count: c.lapsed }, { id: 'Waitlist', label: 'Waitlist', count: c.waitlist }]} />
      </Toolbar>
      {noOffers && tab !== 'Waitlist' ? (
        <EmptyArea icon={PaperPlaneTilt} title="No offers yet" sub="An offer is made when you allocate a unit to an application. Start with the review queue.">
          <Button variant="primary" icon={Tray} onClick={() => nav('/allocations/applications')}>Open applications</Button>
        </EmptyArea>
      ) : tab === 'Waitlist' ? (
        c.waitlist === 0 ? (
          <EmptyArea icon={HourglassMedium} title="No one is waiting" sub="When an offer lapses or a hall is full, the applicant can join the waitlist for that room type. The first in line gets the next unit that frees up.">
            <Button variant="primary" icon={Plus} onClick={() => setAdding(true)}>Add to waitlist</Button>
          </EmptyArea>
        ) : <Waitlist rows={d.waitlist.filter(match)} onOffer={setOffering} caption={caption.Waitlist} foot={foot.Waitlist} />
      ) : (
        <div className="flex-1 min-h-0 flex flex-col">
          <Caption>{caption[tab]}</Caption>
          <div className="flex-1 overflow-auto">
            {rows.length ? <Grid cols={cols[tab]} rows={rows} onRow={(o) => setOpen(o.id)} selected={open} /> : <EmptyArea icon={PaperPlaneTilt} title={`No ${tab.toLowerCase()} offers`} sub={q || f.hall ? 'Clear the search or filter to see more.' : 'Nothing here right now.'} />}
          </div>
          <Foot right={<><Kbd>↵</Kbd><span>open</span></>}>{foot[tab]}</Foot>
        </div>
      )}
      {sel && <OfferSheet o={sel} onClose={() => setOpen(null)} onAccept={() => accept(sel)} onLapse={() => lapse(sel)} onDecline={(r) => decline(sel, r)} onExtend={() => extend(sel)} onBooking={() => openBooking(sel.name)} />}
      {adding && <AddToWaitlist onClose={() => setAdding(false)} />}
      {offering && <OfferUnit w={offering} onClose={() => setOffering(null)} />}
    </>
  );
}

function Waitlist({ rows, onOffer, caption, foot }: { rows: Wait[]; onOffer: (w: Wait) => void; caption: string; foot: string }) {
  const up = useAlloc((s) => s.up);
  const groups = [...new Set(rows.map((w) => `${w.hall}|${w.room}`))];
  const moveUp = (w: Wait) => up((d) => {
    const same = d.waitlist.filter((x) => x.hall === w.hall && x.room === w.room);
    const i = same.findIndex((x) => x.id === w.id);
    if (i <= 0) return {};
    const prev = same[i - 1];
    const list = [...d.waitlist];
    const a = list.findIndex((x) => x.id === prev.id), b = list.findIndex((x) => x.id === w.id);
    [list[a], list[b]] = [list[b], list[a]];
    return { waitlist: list };
  });
  return (
    <div className="flex-1 min-h-0 flex flex-col">
      <Caption>{caption}</Caption>
      <div className="flex-1 overflow-auto">
        <table className="w-full text-sm">
          <thead className="sticky top-0 bg-white z-[1]"><tr className="text-left text-xs text-gray-500"><th className="w-12 h-9 border-b border-line" /><th className="font-medium border-b border-line px-3">Applicant</th><th className="font-medium border-b border-line px-3">Note</th><th className="font-medium border-b border-line px-3">Joined</th><th className="border-b border-line pr-5" /></tr></thead>
          <tbody>
            {groups.map((g) => {
              const [hall, room] = g.split('|');
              const list = rows.filter((w) => w.hall === hall && w.room === room);
              return [
                <tr key={g} className="bg-[#F9FAFB] border-b border-[#F3F4F6]"><td colSpan={5} className="h-8 px-5 text-xs"><span className="font-medium">{hall} · {room}</span><span className="text-gray-500"> · {list.length} waiting</span></td></tr>,
                ...list.map((w, i) => (
                  <tr key={w.id} className="border-b border-[#F3F4F6] text-sm">
                    <td className="h-10 pl-5 font-semibold">{i + 1}</td>
                    <td className="px-3"><span className="flex items-center gap-2 font-medium"><Ini name={w.name} size={24} />{w.name}</span></td>
                    <td className="px-3 text-gray-500">{w.note}</td>
                    <td className="px-3 text-gray-500">{w.joined}</td>
                    <td className="pr-5 text-right">
                      {i === 0 ? <Button size="sm" icon={PaperPlaneTilt} onClick={() => onOffer(w)}>Offer a unit</Button>
                        : <button type="button" aria-label={`Move ${w.name} up`} title="Move up" onClick={() => moveUp(w)} className="size-7 rounded-lg hover:bg-[#F3F4F6] inline-flex items-center justify-center text-gray-400"><DotsSixVertical size={16} /></button>}
                    </td>
                  </tr>
                )),
              ];
            })}
          </tbody>
        </table>
      </div>
      <Foot>{foot}</Foot>
    </div>
  );
}

function OfferSheet({ o, onClose, onAccept, onLapse, onDecline, onExtend, onBooking }: { o: Offer; onClose: () => void; onAccept: () => void; onLapse: () => void; onDecline: (r: string) => void; onExtend: () => void; onBooking: () => void }) {
  const [declining, setDeclining] = useState(false);
  const [reason, setReason] = useState('Chose another university');
  return (
    <Sheet open onClose={onClose} width={500} title={<span className="flex items-center gap-2.5"><Ini name={o.name} size={28} />{o.name}</span>} sub={<span className="pl-[38px]">Offer · {o.hall} {o.unit}</span>}
      footer={o.status === 'open' ? (declining ? <><Button onClick={() => setDeclining(false)}>Back</Button><Button variant="danger" onClick={() => onDecline(reason)}>Record decline</Button></> : <>
        <Button variant="ghost" onClick={onLapse}>Let it lapse now</Button>
        <Button icon={XCircle} onClick={() => setDeclining(true)}>Declined</Button>
        <Button onClick={onExtend}>Extend 2 days</Button>
        <Button variant="success" icon={CheckCircle} onClick={() => { onAccept(); onClose(); }}>Accepted</Button>
      </>) : o.status === 'accepted' ? <Button variant="primary" onClick={onBooking}>Open booking</Button> : <Button onClick={onClose}>Close</Button>}>
      <div className="space-y-4">
        {o.status === 'open' && (o.leftH ?? 99) < 24 && <Note tone="red" icon={HourglassMedium} title={`Expires in ${fmtLeft(o.leftH ?? 0)}`}>Reminded at 48h and 24h. If {o.name.split(' ')[0]} doesn’t reply, the offer lapses at {o.expires?.split(' ').slice(-1)[0]} and the unit goes to the next on the waitlist.</Note>}
        {declining ? (
          <Field label="Their reason"><Select value={reason} onChange={(e) => setReason(e.target.value)}>{['Chose another university', 'Too expensive', 'Living at home', 'Wanted a different hall', 'No reason given'].map((r) => <option key={r}>{r}</option>)}</Select></Field>
        ) : (
          <DL rows={[['Status', <St s={ST[o.status]} />], ['Unit', `${hallFull[o.hall]} · ${o.unit}`], ['Room type', o.room], ['Sent', o.sent], ...(o.status === 'open' ? [['Expires', `${o.expires} · ${fmtLeft(o.leftH ?? 0)} left`] as [string, string], ['Reminders', o.reminders ? `${o.reminders} sent` : 'None yet'] as [string, string]] : []),
            ...(o.accepted ? [['Accepted', `${o.accepted} · deposit ${o.deposit?.toLowerCase()}`] as [string, string]] : []), ...(o.declined ? [['Declined', `${o.declined} · ${o.reason}`] as [string, string], ['The unit now', o.unitNow ?? '—'] as [string, string]] : []),
            ...(o.lapsed ? [['Lapsed', o.lapsed] as [string, string], ['Unit went to', o.wentTo ?? '—'] as [string, string]] : []), ...(o.fromWaitlist ? [['From', `Waitlist ${o.fromWaitlist}`] as [string, string]] : [])]} />
        )}
      </div>
    </Sheet>
  );
}

function AddToWaitlist({ onClose }: { onClose: () => void }) {
  const d = useAlloc();
  const [name, setName] = useState('');
  const [hall, setHall] = useState<string>('John Snow');
  const [room, setRoom] = useState<string>('Ensuite single');
  const [note, setNote] = useState('');
  const busy = useRef(false);
  const people = [...new Set(d.apps.filter((a) => a.status === 'review' || a.status === 'manual' || a.status === 'rejected').map((a) => a.name))].slice(0, 60);
  return (
    <Dialog open onClose={onClose} title="Add to waitlist" footer={<><Button onClick={onClose}>Cancel</Button><Button variant="primary" disabled={!name.trim()} onClick={() => {
      if (busy.current) return; busy.current = true;
      d.up((x) => ({ waitlist: [...x.waitlist, { id: `w${Date.now()}`, name: name.trim(), hall, room, note: note.trim() || '—', joined: TODAY }], apps: x.apps.map((a) => (a.name === name.trim() && a.status === 'review' ? { ...a, status: 'waitlist' as const } : a)) }));
      const pos = d.waitlist.filter((w) => w.hall === hall && w.room === room).length + 1;
      toast.success(`${name.trim()} added to the waitlist`, { description: `${hall} · ${room} · #${pos} in line` }); onClose();
    }}>Add to waitlist</Button></>}>
      <div className="space-y-3">
        <Field label="Applicant"><Input list="wl-people" value={name} onChange={(e) => setName(e.target.value)} placeholder="Name or APP- reference" /><datalist id="wl-people">{people.map((p) => <option key={p} value={p} />)}</datalist></Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Hall"><Select value={hall} onChange={(e) => setHall(e.target.value)}>{HALLS.map((h) => <option key={h}>{h}</option>)}</Select></Field>
          <Field label="Room type"><Select value={room} onChange={(e) => setRoom(e.target.value)}>{ROOMS.map((r) => <option key={r}>{r}</option>)}</Select></Field>
        </div>
        <Field label="Note" hint="Shown to whoever offers the next unit"><Input value={note} onChange={(e) => setNote(e.target.value)} placeholder="Optional" /></Field>
      </div>
    </Dialog>
  );
}

function OfferUnit({ w, onClose }: { w: Wait; onClose: () => void }) {
  const up = useAlloc((s) => s.up);
  const units = ['1.1.A', '2.3.C', '4.2.B'].map((u, i) => (w.room === 'Accessible ensuite' ? `G.0${i + 1}.A` : u));
  const [unit, setUnit] = useState(units[0]);
  const [days, setDays] = useState('5');
  const busy = useRef(false);
  return (
    <Dialog open onClose={onClose} title={`Offer a unit to ${w.name}`} footer={<><Button onClick={onClose}>Cancel</Button><Button variant="primary" icon={PaperPlaneTilt} onClick={() => {
      if (busy.current) return; busy.current = true;
      const o: Offer = { id: `o${Date.now()}`, name: w.name, hall: w.hall, room: w.room, unit, status: 'open', sent: TODAY, expires: addDays('27 Oct 17:00', +days), leftH: +days * 24, reminders: 0, fromWaitlist: '#1', next: `From the waitlist · #1 for ${w.hall} ${w.room.toLowerCase()}`, recent: true };
      up((d) => ({ offers: [o, ...d.offers], recent: [o.id, ...d.recent], waitlist: d.waitlist.filter((x) => x.id !== w.id) }));
      toast.success(`${w.hall} ${unit} offered to ${w.name}`, { description: `#1 on the waitlist · expires in ${days} days` }); onClose();
    }}>Send offer</Button></>}>
      <div className="space-y-3">
        <Note tone="blue" title={`#1 for ${w.hall} · ${w.room}`}>{w.note !== '—' ? w.note : 'No note'} · joined {w.joined}</Note>
        <Field label="Unit"><Select value={unit} onChange={(e) => setUnit(e.target.value)}>{units.map((u) => <option key={u} value={u}>{w.hall} · {u}</option>)}</Select></Field>
        <Field label="Offer expires in"><Select value={days} onChange={(e) => setDays(e.target.value)}>{['3', '5', '7'].map((x) => <option key={x} value={x}>{x} days</option>)}</Select></Field>
      </div>
    </Dialog>
  );
}
