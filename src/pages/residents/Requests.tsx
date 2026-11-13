import { Fragment, useEffect, useMemo, useState, type ReactNode } from 'react';
import { Navigate, useParams, useSearchParams } from 'react-router-dom';
import { ArrowsLeftRight, CalendarBlank, Car, Check, CheckCircle, Clock, Envelope, Plus, SignOut, UserPlus, WarningCircle, Wrench, XCircle, type Icon } from '../../components/icons';
import { toast } from 'sonner';
import { useDb } from '../../data/store';
import { useRms, type ReqKind, type ReqStatus, type ResRequest } from '../../data/residents';
import { Button, Check as CheckBox, Empty, Field, FilterButton, inFilter, type Filters, Input, Note, Pill, Select, Sheet, SheetHero, SheetSection, Table, Tabs, Textarea, Toolbar, cx, gbp, listNav, type SheetNav } from '../../components/ui';
import { Modal, Person, RHeader, RoomMove, undoToast, useOnce } from './kit';
import { useTab } from '../hooks';

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
        <Button icon={Plus} onClick={() => setCreating(true)}>New request</Button>
      </RHeader>
      <Toolbar right={<>
        <FilterButton value={f} onChange={setF} defs={[{ id: 'hall', label: 'Hall', options: ['Collingwood', 'Ustinov College'] }, { id: 'kind', label: 'Type', options: Object.keys(kindIcon) }]} />
      </>}>
        <Tabs value={tab} onChange={setTab} tabs={[{ id: 'Open', label: 'Open', count: count('Open') }, { id: 'Waiting', label: 'Waiting on resident', count: count('Waiting') }, { id: 'Approved', label: 'Approved', count: count('Approved') }, { id: 'Declined', label: 'Declined', count: count('Declined') }]} />
      </Toolbar>
      {f.hall?.length === 1 && rows.length > 0 && <div className="shrink-0 -mt-1 pb-4 px-[calc(var(--gx,16px)+var(--cx,12px))] text-xs leading-4 text-[#737373]">Showing {f.hall[0]}, the halls you look after</div>}
      <Table rows={rows} onRow={(r) => setOpen(r.id)} selected={open ?? undefined} sort={{ key: 'wt', dir: oldest ? 'desc' : 'asc', onToggle: () => setOldest((o) => !o) }}
        empty={<Empty art="requests" icon={ArrowsLeftRight} title={tab === 'Open' ? 'No open requests' : `No ${tab === 'Waiting' ? 'requests waiting on a resident' : tab.toLowerCase() + ' requests'}`}
          sub="Room swaps, guests and early arrivals residents ask for."
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
    onCreate({ id: `rqn${n}`, ref: `RQ-${n}`, kind, who: r.name, hall: r.hall, detail: `${r.hall.replace(' College', '')} ${r.room} · ${detail.trim()}`, check: { label: 'Checking', tone: 'grey' }, waiting: 'Just now', waitDays: 0, status: 'Open', sub: `${r.hall} · logged by Priya Shah for ${r.name} today`, checks: [{ label: 'Logged by staff', sub: 'On behalf of the resident', ok: true }], history: [['Logged by Priya Shah', 'Just now']] });
    setWho(''); setDetail('');
  });
  return (
    <Modal open={open} onClose={onClose} title="New request" sub="Log a request for a resident who asked at the desk or by phone." footer={<><Button onClick={onClose}>Cancel</Button><Button variant="primary" icon={Check} onClick={submit}>Log request</Button></>}>
      <Field label="Type"><Select value={kind} onChange={(e) => setKind(e.target.value as ReqKind)}>{Object.keys(kindIcon).map((k) => <option key={k}>{k}</option>)}</Select></Field>
      <Field label="Resident"><Select value={who} onChange={(e) => setWho(e.target.value)}><option value="">Choose a resident</option>{residents.map((r) => <option key={r.id}>{r.name}</option>)}</Select></Field>
      <Field label="Detail"><Input value={detail} onChange={(e) => setDetail(e.target.value)} placeholder="e.g. 25–27 Sep" /></Field>
    </Modal>
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

  const title = r.arrears ? `${r.kind} · ${r.who}` : r.kind;
  const statusPill = decided ? <Pill tone={r.status === 'Approved' ? 'green' : 'red'} icon={r.status === 'Approved' ? Check : XCircle}>{r.status} by {r.decidedBy}</Pill>
    : held ? <Pill tone="amber">Needs a decision</Pill>
      : r.arrears?.paid ? <Pill tone="green" icon={Check}>Ready to approve</Pill>
        : r.due ? <Pill tone="orange" icon={CalendarBlank}>{r.due}</Pill> : <Pill tone="grey" icon={Clock}>Waiting {r.waiting}</Pill>;
  return (
    <>
      <Sheet open onClose={onClose} nav={nav} width={600} title="Request"
        footer={decided ? <Button onClick={onClose}>Close</Button> : <>
          <Button variant="danger-ghost" className="mr-auto" onClick={() => setDeclining(true)}>Decline</Button>
          <Button onClick={onClose}>Close</Button>
          <Button variant="primary" icon={Check} disabled={held} onClick={() => (isSwap ? setApproving(true) : approve())}>Approve</Button>
        </>}>
        <SheetHero avatar={false} name={title} meta={<><span className="font-mono">{r.ref}</span> · {r.hall}</>}>{statusPill}</SheetHero>
        <div className="space-y-2 empty:hidden mb-5">
          {held && r.arrears && !decided && (
            <Note tone="red" icon={XCircle} title={`Can’t approve while ${r.arrears.first} is in arrears`}>
              Swaps change the tenancy, so the rules hold them until rent is up to date. You can still decline or wait.
              <div className="mt-3"><Button size="sm" icon={Envelope} onClick={() => setMessaging(true)} disabled={paying}>{paying ? `Waiting for ${r.arrears.first} to pay…` : `Message ${r.arrears.first} about arrears`}</Button></div>
            </Note>
          )}
          {failing && !held && !decided && (
            <Note tone="amber" icon={WarningCircle} title="Some checks haven’t passed">You can still approve it if you have checked these yourself, or wait for the resident.</Note>
          )}
        </div>
        <Details r={r} />

          {isSwap && (
            <SheetSection title="Swap">
            <div className="space-y-5">
              {r.sides!.map((s) => (
                <div key={s.name}>
                  <div className="flex items-center gap-2.5 mb-3">
                    <Person name={s.name} />
                    <div className="flex-1"><div className="text-sm leading-5 font-semibold">{s.name}</div><div className="text-xs text-gray-500">{s.agreed}</div></div>
                    <Pill tone="green" icon={Check}>Agreed</Pill>
                  </div>
                  <RoomMove now={s.now} after={s.after} />
                  <div className="grid grid-cols-[92px_1fr] gap-y-3 text-sm leading-5 mt-4 px-1">
                    <span className="text-gray-500">Rent</span>
                    <span>{gbp(s.rentFrom)} → <b className="font-semibold">{gbp(s.rentTo)} / wk</b> {s.rentTo !== s.rentFrom && <span>({s.rentTo > s.rentFrom ? '+' : '−'}{gbp(Math.abs(s.rentTo - s.rentFrom))})</span>}</span>
                    <span className="text-gray-500">Reason</span><span>{s.reason}</span>
                  </div>
                </div>
              ))}
            </div>
            </SheetSection>
          )}

          {r.checks && (
            <SheetSection title="Checks">
              <div className="rounded-xl border border-line divide-y divide-line">
                {r.checks.map((c) => (
                  <div key={c.label} className="px-3.5 py-2.5 flex items-start gap-2.5">
                    {c.ok ? <CheckCircle size={16} className="text-[#0B8A4C] shrink-0 mt-0.5" /> : <XCircle size={16} className="text-[#B91C1C] shrink-0 mt-0.5" />}
                    <div className="min-w-0">
                      <div className="text-sm font-medium text-[#0A0A0A]">{c.label}</div>
                      <div className={cx('text-xs mt-0.5', c.ok ? 'text-[#737373]' : 'text-[#B91C1C]')}>{c.sub}</div>
                    </div>
                  </div>
                ))}
              </div>
            </SheetSection>
          )}

          {r.history && (
            <SheetSection title="History">
              <ol className="relative pl-5">
                <span aria-hidden className="absolute left-[5px] top-2 bottom-2 w-px bg-line" />
                {r.history.map(([w, t], i) => (
                  <li key={i} className="relative pb-3 last:pb-0">
                    <span aria-hidden className={cx('absolute -left-5 top-1.5 size-[11px] rounded-full border-2 border-white', i === 0 ? 'bg-primary' : 'bg-gray-300')} />
                    <div className="text-sm text-[#0A0A0A]">{w}</div>
                    <div className="text-xs text-[#737373] mt-0.5">{t}</div>
                  </li>
                ))}
              </ol>
            </SheetSection>
          )}
      </Sheet>
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
      <div className="rounded-lg border border-line px-3 py-1">
        {[a, b].map((s) => <div key={s.name} className="grid grid-cols-[120px_1fr] text-sm py-2"><span className="text-gray-500">{s.name}</span><span>{s.now[0]} → {s.after[0]} · {diff(s)}</span></div>)}
      </div>
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
