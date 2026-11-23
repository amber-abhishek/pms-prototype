import { Fragment, useEffect, useMemo, useState, type ReactNode } from 'react';
import { Navigate, useParams, useSearchParams } from 'react-router-dom';
import { ArrowsLeftRight, CalendarBlank, Car, Check, CheckCircle, Clock, Envelope, Plus, SignOut, UserPlus, WarningCircle, Wrench, XCircle, type Icon, ClipboardText } from '../../components/icons';
import { toast } from 'sonner';
import { useDb } from '../../data/store';
import { useRms, type ReqKind, type ReqStatus, type ResRequest } from '../../data/residents';
import { Avatar, Button, Check as CheckBox, DL, Empty, Field, FilterButton, inFilter, type Filters, Input, Note, Pill, Select, Sheet, SheetHero, SheetRow, SheetSection, Table, Tabs, Textarea, Toolbar, cx, gbp, listNav, type SheetNav , type Fact } from '../../components/ui';
import { Modal, Person, RHeader, undoToast, useOnce } from './kit';
import { useTab } from '../hooks';
import { LineTabs, PanelModal } from '../inventory/common';

export const kindIcon: Record<ReqKind, Icon> = {
  'Room swap': ArrowsLeftRight, 'Leave early': SignOut, 'Overnight guest': UserPlus, 'Parking permit': Car, 'Room move': ArrowsLeftRight, Furniture: Wrench, 'Early arrival': CalendarBlank,
};
const checkIcon = (tone: string): Icon => (tone === 'green' ? Check : tone === 'red' ? XCircle : tone === 'grey' ? Clock : WarningCircle);

type Tab = 'Open' | 'Waiting' | 'Approved' | 'Declined';
const tabStatus: Record<Tab, ReqStatus> = { Open: 'Open', Waiting: 'Waiting on resident', Approved: 'Approved', Declined: 'Declined' };

/* ---------------- List: 3009, 3120 (empty), 3206 ---------------- */
export function RequestsList() {
  const [sp, setSp] = useSearchParams();
  const open = sp.get('open');
  const setOpen = (id: string | null) => setSp((p) => { const x = new URLSearchParams(p); if (id) x.set('open', id); else x.delete('open'); return x; }, { replace: !id });
  const { requests, patch } = useRms();
  const [tab, setTab] = useTab<Tab>('Open');
  const [f, setF] = useState<Filters>({ hall: ['Collingwood'] });
  const [oldest, setOldest] = useState(true);
  const [creating, setCreating] = useState(false);
  const inHall = useMemo(() => requests.filter((r) => inFilter(f.hall, r.hall) && inFilter(f.kind, r.kind)), [requests, f]);
  const rows = useMemo(() => inHall.filter((r) => r.status === tabStatus[tab]).sort((a, b) => (oldest ? b.waitDays - a.waitDays : a.waitDays - b.waitDays)), [inHall, tab, oldest]);
  const count = (t: Tab) => inHall.filter((r) => r.status === tabStatus[t]).length;
  return (
    <>
      <RHeader icon={ArrowsLeftRight} crumbs={[['Residents']]} title="Requests">
        <Button variant="primary" icon={Plus} onClick={() => setCreating(true)}>New request</Button>
      </RHeader>
      {requests.length > 0 && (
        <Toolbar right={<>
          <FilterButton value={f} onChange={setF} defs={[{ id: 'hall', label: 'Hall', options: ['Collingwood', 'Ustinov College'] }, { id: 'kind', label: 'Type', options: Object.keys(kindIcon) }]} />
        </>}>
          <Tabs value={tab} onChange={setTab} tabs={[{ id: 'Open', label: 'Open', count: count('Open') }, { id: 'Waiting', label: 'Waiting on resident', count: count('Waiting') }, { id: 'Approved', label: 'Approved', count: count('Approved') }, { id: 'Declined', label: 'Declined', count: count('Declined') }]} />
        </Toolbar>
      )}
      {f.hall?.length === 1 && rows.length > 0 && <div className="shrink-0 -mt-1 pb-4 px-[calc(var(--gx,16px)+var(--cx,12px))] text-xs leading-4 text-[#737373]">Showing {f.hall[0]}, the halls you look after</div>}
      <Table rows={rows} onRow={(r) => setOpen(r.id)} selected={open ?? undefined} sort={{ key: 'wt', dir: oldest ? 'desc' : 'asc', onToggle: () => setOldest((o) => !o) }}
        empty={<Empty art="requests" icon={ArrowsLeftRight} title={tab === 'Open' ? 'No open requests' : `No ${tab === 'Waiting' ? 'requests waiting on a resident' : tab.toLowerCase() + ' requests'}`}
          sub="Room swaps, guests and early arrivals show here."
          action={tab !== 'Approved' && <Button icon={Check} onClick={() => setTab('Approved')}>See approved</Button>} />}
        cols={[
          { key: 'ref', label: 'Ref', className: 'w-[90px]', render: (r) => <span className="font-mono text-xs text-gray-500">{r.ref}</span> },
          { key: 'k', label: 'Type', render: (r) => { const I = kindIcon[r.kind]; return <span className="flex items-center gap-2 font-medium"><I size={14} className="text-gray-500" />{r.kind}</span>; } },
          { key: 'w', label: 'Resident', render: (r) => <span className="flex items-center gap-2.5 min-w-0"><Person name={r.who} /><span className="font-medium truncate">{r.who}</span></span> },
          { key: 'd', label: 'Detail', render: (r) => <span className="text-gray-500">{r.detail}</span> },
          { key: 'c', label: 'Checks', render: (r) => <Pill tone={r.check.tone} icon={checkIcon(r.check.tone)}>{r.check.label}</Pill> },
          { key: 'wt', label: 'Waiting', render: (r) => <span className="text-gray-500">{r.status === 'Approved' || r.status === 'Declined' ? (r.decidedBy ? `${r.status} by ${r.decidedBy.split(' ')[0]}` : r.status) : r.waiting}</span> },
        ]} />
      {open && requests.some((x) => x.id === open) && <RequestSheet key={open} id={open} nav={listNav(rows, (x) => x.id === open, (x) => setOpen(x.id))} onClose={() => setOpen(null)} />}
      <NewRequest open={creating} onClose={() => setCreating(false)} onCreate={(r) => { patch('requests', (rs) => [r, ...rs]); toast.success(`${r.ref} logged`, { description: 'It shows in Open and in My tasks.' }); setCreating(false); }} />
    </>
  );
}

function NewRequest({ open, onClose, onCreate }: { open: boolean; onClose: () => void; onCreate: (r: ResRequest) => void }) {
  const residents = useRms((s) => s.residents);
  const once = useOnce();
  const [kind, setKind] = useState<ReqKind>('Overnight guest');
  const [who, setWho] = useState('');
  const [detail, setDetail] = useState('');
  const submit = () => once(() => {
    const r = residents.find((x) => x.name === who);
    if (!r || !detail.trim()) { toast.error('Pick a resident and add the detail'); return; }
    const n = 123 + Math.floor(Math.random() * 800);
    onCreate({ id: `rqn${n}`, ref: `RQ-${n}`, kind, who: r.name, hall: r.hall, detail: `${r.hall.replace(' College', '')} ${r.room} · ${detail.trim()}`, check: { label: 'Checking', tone: 'grey' }, waiting: 'Just now', waitDays: 0, status: 'Open', sub: `${r.hall} · logged by Arjun Mehta for ${r.name} today`, checks: [{ label: 'Logged by staff', sub: 'On behalf of the resident', ok: true }], history: [['Logged by Arjun Mehta', 'Just now']] });
    setWho(''); setDetail('');
  });
  return (
    <PanelModal open={open} onClose={onClose} eyebrow="New request" width={560}
      right={<><Button onClick={onClose}>Cancel</Button><Button variant="primary" icon={null} onClick={submit}>Create request</Button></>}>
      <SheetSection title="Request">
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <Field label="Type"><Select value={kind} onChange={(e) => setKind(e.target.value as ReqKind)}>{Object.keys(kindIcon).map((k) => <option key={k}>{k}</option>)}</Select></Field>
            <Field label="Resident"><Select value={who} onChange={(e) => setWho(e.target.value)}><option value="">Choose a resident</option>{residents.map((r) => <option key={r.id}>{r.name}</option>)}</Select></Field>
          </div>
          <Field label="Detail"><Input value={detail} onChange={(e) => setDetail(e.target.value)} placeholder="e.g. 25–27 Sep" /></Field>
        </div>
      </SheetSection>
    </PanelModal>
  );
}

/* ---------------- Detail: 3010, 3011, 3012, 3207, 3208 ---------------- */
/** /residents/requests/:id now opens the list with the request in a side sheet. */
export function RequestDetail() {
  const { id } = useParams();
  return <Navigate to={`/residents/requests?open=${id}`} replace />;
}

function RequestSheet({ id, onClose , nav }: { nav?: SheetNav;  id: string; onClose: () => void }) {
  const { requests, update } = useRms();
  const { patch: patchDb, log } = useDb();
  const r = requests.find((x) => x.id === id);
  const [approving, setApproving] = useState(false);
  const [declining, setDeclining] = useState(false);
  const [messaging, setMessaging] = useState(false);
  const [paying, setPaying] = useState(false);
  const [talking, setTalking] = useState(false);
  const [tab, setTab] = useState<'overview' | 'history'>('overview');
  const once = useOnce();

  // E1 · 03: once the arrears are paid the PMS re-runs the checks and says it's ready.
  useEffect(() => {
    if (!paying || !r?.arrears) return;
    const t = setTimeout(() => {
      update('requests', r.id, {
        arrears: { ...r.arrears!, paid: `${r.arrears!.first} paid £340 just now` }, check: { label: 'Both agreed', tone: 'green' }, status: 'Open',
        checks: r.checks?.map((c) => (c.label === 'No arrears' ? { ...c, ok: true, sub: `${r.arrears!.first} paid £340 just now` } : c)),
        history: [[`${r.arrears!.first} paid £340 · checks re-run`, 'Just now'], ...(r.history ?? [])],
      });
      toast.success(`${r.arrears!.first} paid £340`, { description: 'The checks ran again. The swap is ready to approve.' });
      setPaying(false);
    }, 3500);
    return () => clearTimeout(t);
  }, [paying, r, update]);

  if (!r) return null;
  const decided = r.status === 'Approved' || r.status === 'Declined';
  const failing = !!r.checks?.some((c) => !c.ok);
  const held = failing && r.kind === 'Room swap';
  const isSwap = r.kind === 'Room swap' && r.sides;

  const approve = (swapOn?: string) => once(() => {
    const undo = update('requests', r.id, {
      status: 'Approved', decidedBy: 'Tom Baker', due: undefined,
      history: [[isSwap ? `Approved by Tom Baker · lease addendums sent to both${swapOn && swapOn !== 'Monday 21 September' ? ` · swap on ${swapOn}` : ''}` : 'Approved by Tom Baker', '14 Sep, 11:20'], ...(r.history ?? [])],
    });
    const t2 = r.id === 'rq1' && useDb.getState().tasks.find((t) => t.id === 't2' && !t.done);
    if (t2) patchDb('tasks', (ts) => ts.map((t) => (t.id === 't2' ? { ...t, done: true } : t)));
    log(`approved ${r.ref} · ${r.kind.toLowerCase()} (${r.who})`, 'Residents');
    setApproving(false);
    const [a, b] = r.who.split(' ↔ ').map((n) => n.split(' ')[0]);
    undoToast(isSwap ? `Swap approved · addendums sent to ${a} and ${b}${t2 ? ' · task closed' : ''}` : `${r.ref} approved · ${r.who.split(' ')[0]} has been told`, () => {
      undo();
      if (t2) patchDb('tasks', (ts) => ts.map((t) => (t.id === 't2' ? { ...t, done: false } : t)));
    });
  });
  const decline = (reason: string) => once(() => {
    const undo = update('requests', r.id, { status: 'Declined', decidedBy: 'Tom Baker', due: undefined, history: [[`Declined by Tom Baker${reason ? ` · ${reason}` : ''}`, '14 Sep, 11:20'], ...(r.history ?? [])] });
    log(`declined ${r.ref} · ${r.kind.toLowerCase()} (${r.who})`, 'Residents');
    setDeclining(false);
    undoToast(`${r.ref} declined · the resident has been told by email`, undo);
    onClose();
  });

  const title = r.who.includes(' ↔ ') ? r.kind : `${r.kind} · ${r.who}`;
  /* Figma "Side panel · Request" 4073:17191: one state pill top-right, no icons. */
  const statusPill = decided ? <Pill tone={r.status === 'Approved' ? 'green' : 'red'}>{r.status}</Pill>
    : held ? <Pill tone="amber">Needs a decision</Pill>
      : r.arrears?.paid ? <Pill tone="green">Ready to approve</Pill>
        : r.due ? <Pill tone="orange">{r.due}</Pill> : <Pill tone="orange">Waiting</Pill>;
  const rentDiff = isSwap ? r.sides![0].rentTo - r.sides![0].rentFrom : 0;
  const checksFact: Fact = r.checks ? ['Checks', `${r.checks.filter((c) => c.ok).length} / ${r.checks.length}`, r.checks.every((c) => c.ok) ? 'green' : 'amber'] : ['Check', r.check.label, r.check.tone];
  const whoOf = (w: string) => w.match(/by ([A-Z][a-z]+ [A-Z][a-z]+)/)?.[1] ?? r.who.split(' ↔ ').find((n) => w.startsWith(n) || w.startsWith(n.split(' ')[0])) ?? 'System';
  return (
    <>
      <Sheet open onClose={onClose} nav={nav} width={520} title="Request"
        onDelete={decided ? undefined : { label: 'Decline request', icon: XCircle, onClick: () => setDeclining(true) }}
        footer={decided ? <Button icon={null} className="ml-auto" onClick={() => setTalking(true)}>Message</Button> : <>
          <Button icon={null} className="ml-auto" onClick={() => setTalking(true)}>Message</Button>
          <Button variant="primary" icon={null} disabled={held} onClick={() => (isSwap ? setApproving(true) : approve())}>{isSwap ? 'Approve swap' : 'Approve'}</Button>
        </>}>
        <SheetHero icon={r.kind === 'Room swap' || r.kind === 'Room move' ? ArrowsLeftRight : ClipboardText} name={title} meta={r.detail}
          facts={[['Asked', /now/i.test(r.waiting) ? r.waiting : `${r.waiting} ago`], isSwap ? ['Rent', rentDiff ? `${rentDiff > 0 ? '+' : '−'}${gbp(Math.abs(rentDiff))} / wk` : 'Same', rentDiff > 0 ? 'orange' : rentDiff < 0 ? 'green' : undefined] : ['Kind', r.kind], checksFact]}>{statusPill}</SheetHero>
        <div className="-mx-5 mb-5">
          <LineTabs value={tab} onChange={setTab} tabs={[{ id: 'overview', label: 'Overview' }, { id: 'history', label: 'History' }]} />
        </div>
        {tab === 'overview' && <>
          <div className="space-y-2 empty:hidden mb-3">
            {held && r.arrears && !decided && (
              <Note tone="red" icon={XCircle} title={`Can’t approve while ${r.arrears.first} is in arrears`}>
                <div className="mt-2"><Button size="sm" icon={Envelope} onClick={() => setMessaging(true)} disabled={paying}>{paying ? `Waiting for ${r.arrears.first} to pay…` : `Message ${r.arrears.first} about arrears`}</Button></div>
              </Note>
            )}
            {failing && !held && !decided && (
              <Note tone="amber" icon={WarningCircle} title="Some checks haven’t passed">Approve only if you have checked them yourself.</Note>
            )}
          </div>
          {isSwap ? (
            <SheetSection title="Swap">
              {r.sides!.map((sd) => (
                <SheetRow key={sd.name} lead={<Person name={sd.name} />} title={`${sd.name} · ${sd.now[0]} → ${sd.after[0]}`}
                  sub={`${gbp(sd.rentFrom)} → ${gbp(sd.rentTo)} / wk · ${sd.reason}`} end={<Pill tone="green">Agreed</Pill>} />
              ))}
            </SheetSection>
          ) : <Details r={r} />}
          {r.checks && (
            <SheetSection title={`Checks · ${r.checks.filter((c) => c.ok).length} / ${r.checks.length}`}>
              {r.checks.map((c) => (
                <SheetRow key={c.label} title={c.label} sub={<span className={c.ok ? undefined : 'text-[#B91C1C]'}>{c.sub}</span>}
                  lead={c.ok ? <CheckCircle size={20} weight="fill" className="text-[#16A34A] shrink-0" /> : <span aria-hidden className="size-5 shrink-0 rounded-full border-[1.5px] border-dashed border-[#A3A3A3]" />} />
              ))}
            </SheetSection>
          )}
        </>}
        {tab === 'history' && (r.history?.length
          ? <SheetSection title="History">{r.history.map(([w, t], i) => <SheetRow key={i} lead={<Avatar name={whoOf(w)} size={24} />} title={w} sub={t} />)}</SheetSection>
          : <Empty art="requests" title="No history yet" sub="Checks, messages and decisions show here." />)}
      </Sheet>
      <Modal open={talking} onClose={() => setTalking(false)} title={`Message ${r.who.split(' ↔ ').join(' and ')}`} sub="By email and in the resident portal."
        footer={<><Button onClick={() => setTalking(false)}>Cancel</Button><Button variant="primary" icon={Envelope} onClick={() => { setTalking(false); update('requests', r.id, { history: [[`Messaged about ${r.ref}`, 'Just now'], ...(r.history ?? [])] }); toast.success('Message sent'); }}>Send</Button></>}>
        <Textarea rows={4} placeholder="Write a message…" />
      </Modal>
      {isSwap && <ApproveSwap open={approving} r={r} onClose={() => setApproving(false)} onApprove={approve} />}
      <DeclineDialog open={declining} r={r} onClose={() => setDeclining(false)} onDecline={decline} />
      {r.arrears && <MessageDialog open={messaging} to={r.who.split(' ↔ ').find((n) => n.startsWith(r.arrears!.first)) ?? r.arrears.first} owes={r.arrears.owes} onClose={() => setMessaging(false)}
        onSend={() => { setMessaging(false); setPaying(true); update('requests', r.id, { history: [[`Messaged ${r.arrears!.first} about arrears`, 'Just now'], ...(r.history ?? [])] }); toast.success(`Message sent to ${r.arrears!.first}`, { description: 'You’ll be told when the payment lands.' }); }} />}
    </>
  );
}

function ApproveSwap({ open, r, onClose, onApprove }: { open: boolean; r: ResRequest; onClose: () => void; onApprove: (on: string) => void }) {
  const [on, setOn] = useState('Monday 21 September');
  const [lease, setLease] = useState(true);
  const [keys, setKeys] = useState(true);
  const [a, b] = r.sides!;
  const diff = (s: typeof a) => (s.rentTo === s.rentFrom ? 'same rent' : `rent ${s.rentTo > s.rentFrom ? '+' : '−'}${gbp(Math.abs(s.rentTo - s.rentFrom))} / wk`);
  return (
    <Modal open={open} onClose={onClose} title="Approve the room swap?" sub={`${a.name} and ${b.name} swap rooms at ${r.hall}.`}
      footer={<><Button onClick={onClose}>Cancel</Button><Button variant="primary" icon={Check} onClick={() => onApprove(on)}>Approve swap</Button></>}>
      <Field label="Swap on"><Select value={on} onChange={(e) => setOn(e.target.value)}>{['Monday 21 September', 'Saturday 19 September', 'Monday 28 September'].map((d) => <option key={d}>{d}</option>)}</Select></Field>
      <DL rows={[a, b].map((s) => [s.name, `${s.now[0]} → ${s.after[0]} · ${diff(s)}`] as [string, ReactNode])} />
      <div className="space-y-2.5 pt-1">
        <CheckBox checked={lease} onChange={setLease} label="Update both tenancies and send lease addendums to sign" />
        <div><CheckBox checked={keys} onChange={setKeys} label="Book the key swap with reception" /></div>
      </div>
    </Modal>
  );
}

function DeclineDialog({ open, r, onClose, onDecline }: { open: boolean; r: ResRequest; onClose: () => void; onDecline: (reason: string) => void }) {
  const [reason, setReason] = useState('');
  return (
    <Modal open={open} onClose={onClose} title={`Decline ${r.ref}?`} sub={`${r.who} will be told by email and in the resident portal.`}
      footer={<><Button onClick={onClose}>Cancel</Button><Button variant="danger" icon={XCircle} onClick={() => onDecline(reason.trim())}>Decline</Button></>}>
      <Field label="Reason (shown to the resident)"><Textarea rows={3} value={reason} onChange={(e) => setReason(e.target.value)} placeholder="e.g. Rooms on that floor are held for first years" /></Field>
    </Modal>
  );
}

function MessageDialog({ open, to, owes, onClose, onSend }: { open: boolean; to: string; owes: string; onClose: () => void; onSend: () => void }) {
  const first = to.split(' ')[0];
  const [body, setBody] = useState(`Hi ${first}, your room swap is on hold because your rent account shows £340 outstanding. Once it’s paid in the portal we can approve the swap straight away.`);
  return (
    <Modal open={open} onClose={onClose} title={`Message ${to}`} sub={owes}
      footer={<><Button onClick={onClose}>Cancel</Button><Button variant="primary" icon={Envelope} onClick={onSend}>Send message</Button></>}>
      <Textarea rows={5} value={body} onChange={(e) => setBody(e.target.value)} />
      <div className={cx('text-xs text-gray-500 flex items-center gap-1.5')}><CheckCircle size={14} className="text-[#16A34A]" /> Includes a payment link · email and resident portal</div>
    </Modal>
  );
}

/** The request sheet's Details section: who, what, where, when. */
function Details({ r }: { r: ResRequest }) {
  const I = kindIcon[r.kind];
  const asked = r.sub?.match(/ on ((?:Mon|Tue|Wed|Thu|Fri|Sat|Sun) \d{1,2} \w{3})/)?.[1];
  const decided = r.status === 'Approved' || r.status === 'Declined';
  const rows: [string, ReactNode][] = [
    ['Resident', <span className="flex items-center gap-2 flex-wrap">{r.who.split(' ↔ ').map((n, i) => <Fragment key={n}>{i > 0 && <ArrowsLeftRight size={14} className="text-gray-400" />}<span className="flex items-center gap-2"><Person name={n} />{n}</span></Fragment>)}</span>],
    ['Request', <span className="flex items-center gap-2"><I size={14} className="text-gray-500" />{r.kind}</span>],
    ['Details', r.detail],
    ['Asked', asked ? `${asked} · waiting ${r.waiting}` : `Waiting ${r.waiting}`],
  ];
  if (decided && r.decidedBy) rows.push([r.status, `by ${r.decidedBy}`]);
  return <SheetSection title="Details" rows={rows} />;
}
