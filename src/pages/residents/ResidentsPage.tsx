import { useState, type ChangeEvent } from 'react';
import { Navigate, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { Buildings, Camera, CheckCircle, Circle, Clock, DeviceMobile, DotsThree, Envelope, FileText, Info, Key, Lightning, ListChecks, ShieldCheck, SignIn, Users, WarningCircle } from '../../components/icons';
import { toast } from 'sonner';
import { useDb } from '../../data/store';
import { hallShort, useRms, type Resident } from '../../data/residents';
import { TitleH1, Avatar, Button, Empty, Field, FilterButton, Input, Note, Pill, SearchInput, Table, Tabs, Textarea, Toolbar, gbp, SheetHero, SheetSection } from '../../components/ui';
import { KV, Modal, Panel, Photo, RHeader, RadioCard, SideSheet, ToggleRow, undoToast, useOnce } from './kit';
import { useTab } from '../hooks';
import { kindIcon } from './Requests';

const statusOf = (r: Resident) => (r.status === 'In residence' && r.arrivingThisWeek && r.checkedIn ? 'Checked in' : r.status);
export function ResStatusPill({ r }: { r: Resident }) {
  const s = statusOf(r);
  /* 3218: status pills carry no icon. */
  return s === 'Arriving' ? <Pill tone="blue">Arriving</Pill> : s === 'Leaving' ? <Pill tone="amber">Leaving</Pill> : <Pill tone="green">{s}</Pill>;
}
const DepositPill = ({ r }: { r: Resident }) => (r.deposit === 'Paid' ? <Pill tone="green">Paid</Pill> : <Pill tone="red">Not paid</Pill>);

/** Check in from anywhere: the deposit dialog when it's unpaid (E4), else the check-in sheet (3006). */
export function useCheckIn() {
  const [who, setWho] = useState<Resident | null>(null);
  const ui = who && (who.deposit === 'Paid'
    ? <CheckInSheet key={who.id} r={who} onClose={() => setWho(null)} />
    : <DepositDialog key={who.id} r={who} onClose={() => setWho(null)} />);
  return { start: (r: Resident) => { if (!r.pending) setWho(r); }, ui };
}

/* ---------------- List (no frame: same style as the other lists; 3218, 3219, 3221) ---------------- */
type Tab = 'All' | 'In residence' | 'Arriving' | 'Leaving';
export function ResidentsList() {
  const [sp] = useSearchParams();
  const open = sp.get('open');
  const residents = useRms((s) => s.residents);
  const nav = useNavigate();
  const [tab, setTab] = useTab<Tab>('All');
  const [q, setQ] = useState('');
  const [f, setF] = useState<Record<string, string>>({});
  const checkIn = useCheckIn();
  if (open) return <Navigate to={`/residents/${open}`} replace />;
  const inTab = (r: Resident, t: Tab) => t === 'All' || (t === 'Arriving' ? !!r.arrivingThisWeek : r.status === t);
  const scoped = residents.filter((r) => (!f.hall || r.hall === f.hall) && (!f.deposit || r.deposit === f.deposit) && (!f.week || (f.week === 'Arriving today' ? r.arrives === 'Today' && !r.checkedIn : f.week === 'Arriving this week' ? !!r.arrivingThisWeek : r.status === 'Leaving')) && (!q.trim() || `${r.name} ${r.email} ${r.room} ${r.hall}`.toLowerCase().includes(q.trim().toLowerCase())));
  const rows = scoped.filter((r) => inTab(r, tab)).sort((a, b) => (tab === 'Arriving' ? Number(b.arrives === 'Today') - Number(a.arrives === 'Today') : 0));
  return (
    <>
      <RHeader icon={Users} crumbs={[]} title="Residents" />
      <Toolbar right={<>
        <SearchInput value={q} onChange={setQ} placeholder="Search name or room" />
        <FilterButton value={f} onChange={setF} defs={[{ id: 'hall', label: 'Hall', options: [...new Set(residents.map((r) => r.hall))] }, { id: 'deposit', label: 'Deposit', options: ['Paid', 'Not paid'] }, { id: 'week', label: 'This week', chips: true, options: ['Arriving today', 'Arriving this week', 'Leaving'] }]} />
      </>}>
        <Tabs value={tab} onChange={setTab} tabs={(['All', 'In residence', 'Arriving', 'Leaving'] as Tab[]).map((t) => ({ id: t, label: t, count: scoped.filter((r) => inTab(r, t)).length }))} />
      </Toolbar>
      <Table rows={rows} paginate={false} footer={false} onRow={(r) => nav(`/residents/${r.id}`)}
        summary={`${rows.length} ${rows.length === 1 ? 'resident' : 'residents'}${tab === 'Arriving' ? ` · ${rows.filter((r) => r.checkedIn).length} checked in so far` : ''}`}
        empty={residents.length ? <Empty icon={Users} title="No residents match" sub="Try clearing the search or the filters." /> : <Empty art="team" icon={Users} title="No residents yet" sub="Residents show here once their bookings are confirmed." />}
        cols={[
          { key: 'n', label: 'Resident', render: (r) => <span className="font-medium">{r.name}</span> },
          { key: 'rm', label: 'Room', render: (r) => <span className="text-gray-500">{hallShort(r.hall)} {r.room}</span> },
          { key: 'a', label: tab === 'Leaving' ? 'Leaves' : 'Arrives', render: (r) => <span className="text-gray-500">{r.status === 'Leaving' ? r.leaves : r.arrivingThisWeek ? r.arrives : 'In since Sep'}</span> },
          { key: 'd', label: 'Deposit', render: (r) => <DepositPill r={r} /> },
          { key: 's', label: 'Status', render: (r) => <ResStatusPill r={r} /> },
          { key: 'x', label: '', className: 'text-right w-[110px]', render: (r) => r.status === 'Arriving' && <span onClick={(e) => e.stopPropagation()}><Button size="sm" icon={Key} disabled={!!r.pending} onClick={() => checkIn.start(r)}>{r.pending ? 'Waiting' : 'Check in'}</Button></span> },
        ]} />
      {checkIn.ui}
    </>
  );
}

/* ---------------- Resident detail: 3005, 3006, 3007 ---------------- */
type DTab = 'Overview' | 'Tenancy' | 'Payments' | 'Requests' | 'Maintenance' | 'Documents' | 'Activity';
export function ResidentDetail() {
  const { id } = useParams();
  const nav = useNavigate();
  const { residents, requests, faults } = useRms();
  const r = residents.find((x) => x.id === id);
  const [tab, setTab] = useState<DTab>('Overview');
  const [msg, setMsg] = useState(false);
  const checkIn = useCheckIn();
  if (!r) return <Navigate to="/residents" replace />;
  const first = r.name.split(' ')[0];
  const reqs = requests.filter((q) => q.who.includes(r.name));
  const mts = faults.filter((m) => m.reporter === r.name);
  const arriving = r.status === 'Arriving';
  const items = [
    { t: 'Lease signed', s: r.leaseNote ?? '', ok: r.lease === 'Signed' },
    { t: 'Deposit paid', s: r.depositNote ?? '', ok: r.deposit === 'Paid' },
    ...(r.plan ? [{ t: 'Accessibility plan agreed', s: r.plan, ok: true }] : []),
    { t: 'ID checked', s: 'Passport or BRP, seen at the desk on arrival', ok: !arriving },
  ];
  const done = items.filter((i) => i.ok).length;
  return (
    <>
      <RHeader icon={Users} crumbs={[['Residents', '/residents']]} title={r.name}>
        <Button icon={Envelope} onClick={() => setMsg(true)}>Message</Button>
        {arriving ? <Button variant="primary" icon={r.pending ? Clock : SignIn} disabled={!!r.pending} onClick={() => checkIn.start(r)}>{r.pending === 'payment' ? 'Waiting for payment' : r.pending ? 'Waiting for sign-off' : 'Check in'}</Button>
          : <Button icon={DotsThree} onClick={() => toast('More actions', { description: 'Move room, start move-out, or add a note.' })}>More</Button>}
      </RHeader>
      <div className="flex-1 overflow-auto">
        <div className="px-6 pt-6 pb-5 flex items-start gap-3 border-b border-line">
          <Avatar name={r.name} size={36} />
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <TitleH1 className="text-[20px] font-medium tracking-tight mr-1">{r.name}</TitleH1>
              {arriving ? <Pill tone="blue" outline icon={Buildings}>Arriving {r.arrives}</Pill> : <ResStatusPill r={r} />}
              {r.plan && <Pill tone="purple" outline>Accessibility plan</Pill>}
              <Pill tone="blue" outline>{r.year}</Pill>
            </div>
            <p className="text-sm text-gray-500 mt-1">{r.hall} · {r.room} {r.roomType} · tenancy 19 Sep 2026 – 18 Jun 2027 · {gbp(r.rent)} / wk</p>
          </div>
        </div>
        <div className="px-6 py-3 border-b border-line">
          <Tabs value={tab} onChange={setTab} tabs={[{ id: 'Overview', label: 'Overview' }, { id: 'Tenancy', label: 'Tenancy' }, { id: 'Payments', label: 'Payments' }, { id: 'Requests', label: 'Requests', count: reqs.length }, { id: 'Maintenance', label: 'Maintenance', count: mts.length }, { id: 'Documents', label: 'Documents', count: 4 }, { id: 'Activity', label: 'Activity' }]} />
        </div>
        <div className={['Payments', 'Requests', 'Maintenance', 'Documents'].includes(tab) ? 'pt-2' : 'p-6 max-w-[1200px]'}>
          {tab === 'Overview' && (
            <div className="grid grid-cols-2 gap-5 items-start">
              <div className="space-y-4">
                <Panel title="Before keys" right={`${done} of ${items.length} done`}>
                  <div>
                    {items.map((i) => (
                      <div key={i.t} className="flex items-center gap-3 py-2.5 border-b border-line last:border-0">
                        {i.ok ? <CheckCircle size={20} weight="fill" className="text-[#16A34A] shrink-0" /> : <Circle size={20} className="text-gray-300 shrink-0" />}
                        <div className="flex-1"><div className="text-sm">{i.t}</div><div className="text-xs text-gray-500">{i.s}</div></div>
                        {!i.ok && (i.t === 'ID checked' ? <Pill tone="amber" icon={Clock}>At the desk</Pill> : i.t === 'Deposit paid' && r.pending ? <Pill tone="amber" icon={Clock}>{r.pending === 'payment' ? 'Link sent' : 'Override asked'}</Pill> : <Pill tone="red" icon={WarningCircle}>Outstanding</Pill>)}
                      </div>
                    ))}
                  </div>
                </Panel>
                {arriving ? <Note tone="blue" icon={Info} title="Keys are released at check-in">Check-in confirms the last item, records the keys and starts {r.plan ? 'her' : 'the'} tenancy in the PMS.</Note>
                  : r.checkedIn ? <Note tone="green" icon={CheckCircle} title={`Checked in ${r.checkedIn}`}>{r.checkInNote ?? 'Keys handed over · room condition recorded'}</Note> : null}
              </div>
              <Panel title="Details">
                <KV rows={[['Student ID', <span className="font-mono text-xs">{r.studentId}</span>], ['Email', r.email], ['Phone', r.phone], ['Course', r.course], ['Emergency contact', r.emergency], ['Application', r.application]]} />
              </Panel>
            </div>
          )}
          {tab === 'Tenancy' && <Panel title="Tenancy" className="max-w-[640px]"><KV rows={[['Room', `${r.hall} · ${r.room} ${r.roomType}`], ['Dates', '19 Sep 2026 – 18 Jun 2027 · 39 weeks'], ['Rent', `${gbp(r.rent)} / wk · ${gbp(r.rent * 39)} a year`], ['Lease', r.lease === 'Signed' ? (r.leaseNote ?? 'Signed') : 'Not signed yet'], ['Status', <ResStatusPill r={r} />]]} /></Panel>}
          {tab === 'Payments' && (
            <Table fill paginate={false} footer={false} rows={[
              { id: 'dep', item: 'Deposit', due: '2 Aug', amount: 250, status: r.deposit === 'Paid' ? 'Paid' : 'Not paid' },
              { id: 't1', item: 'Rent · term 1', due: '19 Sep', amount: r.rent * 12, status: 'Due' },
              { id: 't2', item: 'Rent · term 2', due: '9 Jan', amount: r.rent * 13, status: 'Upcoming' },
              { id: 't3', item: 'Rent · term 3', due: '24 Apr', amount: r.rent * 14, status: 'Upcoming' },
            ]} cols={[
              { key: 'i', label: 'Item', render: (x) => x.item },
              { key: 'd', label: 'Due', render: (x) => <span className="text-gray-500">{x.due}</span> },
              { key: 'a', label: 'Amount', className: 'text-right', render: (x) => <span className="tabular-nums">{gbp(x.amount)}</span> },
              { key: 's', label: 'Status', render: (x) => <Pill tone={x.status === 'Paid' ? 'green' : x.status === 'Not paid' ? 'red' : x.status === 'Due' ? 'amber' : 'grey'}>{x.status}</Pill> },
            ]} />
          )}
          {tab === 'Requests' && (reqs.length ? (
            <Table fill paginate={false} footer={false} rows={reqs} onRow={(q) => nav(`/residents/requests?open=${q.id}`)} cols={[
              { key: 'r', label: 'Ref', className: 'w-28', render: (q) => <span className="font-mono text-xs text-gray-500">{q.ref}</span> },
              { key: 'k', label: 'Type', render: (q) => { const I = kindIcon[q.kind]; return <span className="flex items-center gap-2"><I size={16} className="text-gray-500" />{q.kind}</span>; } },
              { key: 'd', label: 'Detail', render: (q) => <span className="text-gray-500 truncate block">{q.detail}</span> },
              { key: 's', label: 'Status', render: (q) => <Pill tone={q.status === 'Approved' ? 'green' : q.status === 'Declined' ? 'red' : 'amber'}>{q.status}</Pill> },
            ]} />
          ) : <Empty art="requests" icon={ListChecks} title="No requests" sub={`Room swaps, guests and early arrivals ${first} asks for in the portal show here.`} />)}
          {tab === 'Maintenance' && (mts.length ? (
            <Table fill paginate={false} footer={false} rows={mts} onRow={(m) => nav(`/residents/maintenance?job=${m.id}`)} cols={[
              { key: 'r', label: 'Ref', className: 'w-28', render: (m) => <span className="font-mono text-xs text-gray-500">{m.ref}</span> },
              { key: 't', label: 'Fault', render: (m) => m.title },
              { key: 's', label: 'Status', render: (m) => <Pill tone={m.status === 'Fixed' ? 'green' : 'amber'}>{m.status === 'New' ? 'Open' : m.status}</Pill> },
            ]} />
          ) : <Empty art="faults" icon={ListChecks} title="No faults reported" sub={`Faults ${first} reports in the portal show here.`} />)}
          {tab === 'Documents' && (
            <Table fill paginate={false} footer={false} rows={['Lease · signed 2 Aug', 'Deposit receipt', r.plan ? 'Accessibility plan' : 'Guarantor form', 'Offer letter · 2026/27'].map((d) => ({ id: d, d }))} cols={[
              { key: 'd', label: 'Document', render: (x) => <span className="flex items-center gap-2"><FileText size={16} className="text-gray-500" />{x.d}</span> },
              { key: 'v', label: '', className: 'text-right w-32', render: (x) => <Button size="sm" variant="ghost" icon={null} onClick={() => toast(`Opening ${x.d}`)}>View</Button> },
            ]} />
          )}
          {tab === 'Activity' && (
            <ul className="space-y-2 max-w-[760px] text-sm">
              {[...(r.checkedIn ? [[`Checked in by ${r.checkedIn.split(' by ')[1] ?? 'Priya Shah'}`, r.checkedIn.split(' by ')[0]]] : []), ['Deposit ' + (r.deposit === 'Paid' ? 'paid' : 'requested'), '2 Aug'], ['Lease ' + (r.lease === 'Signed' ? 'signed online' : 'sent'), '2 Aug'], ['Offer accepted in Allocations', '28 Jul']].map(([w, t]) => (
                <li key={w} className="flex items-center gap-3"><span className="size-1.5 rounded-full bg-gray-300" /><span className="flex-1">{w}</span><span className="text-gray-500">{t}</span></li>
              ))}
            </ul>
          )}
        </div>
      </div>
      {checkIn.ui}
      <Modal open={msg} onClose={() => setMsg(false)} title={`Message ${r.name}`} sub={`${r.email} · and the resident portal`}
        footer={<><Button onClick={() => setMsg(false)}>Cancel</Button><Button variant="primary" icon={Envelope} onClick={() => { setMsg(false); toast.success(`Message sent to ${first}`); }}>Send</Button></>}>
        <Textarea rows={4} placeholder={`Write to ${first}…`} />
      </Modal>
    </>
  );
}

/* ---------------- Check-in sheet: 3006 ---------------- */
const IconInput = ({ icon: I, invalid, ...p }: { icon: typeof Key; invalid?: boolean; value: string; onChange: (e: ChangeEvent<HTMLInputElement>) => void; 'aria-label': string }) => (
  <div className="relative"><I size={15} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[#646A78]" /><Input className={invalid ? 'pl-8 border-[#C11F14] focus-visible:border-[#C11F14]' : 'pl-8'} aria-invalid={invalid || undefined} {...p} /></div>
);
function CheckInSheet({ r, onClose }: { r: Resident; onClose: () => void }) {
  const { update } = useRms();
  const { log } = useDb();
  const once = useOnce();
  const isAmira = r.id === 'r1';
  const [idType, setIdType] = useState('Passport');
  const [fob, setFob] = useState(isAmira ? '40418' : '');
  const [meter, setMeter] = useState(isAmira ? '01284.6 kWh' : '');
  const [photos, setPhotos] = useState(isAmira ? 6 : 0);
  const [welcome, setWelcome] = useState(true);
  const total = r.plan ? 4 : 3;
  const [tried, setTried] = useState(false);
  const residents = useRms((s) => s.residents);
  /* A fob is 5 digits and belongs to one resident; the meter reading is a number, kWh optional. */
  const f = fob.trim();
  const holder = residents.find((x) => x.id !== r.id && x.fob === f);
  const fobError = !f ? 'Record the key fob number' : !/^\d{5}$/.test(f) ? 'A fob number is 5 digits' : holder ? `Fob ${f} is already ${holder.name}’s` : undefined;
  const meterError = meter.trim() && !/^\d+(\.\d+)?\s*(kwh)?$/i.test(meter.trim()) ? 'Numbers only, e.g. 01284.6' : undefined;
  const submit = () => once(() => {
    setTried(true);
    if (fobError || meterError) return;
    const when = isAmira ? 'Sat 19 Sep, 10:42 by Priya Shah' : 'Today, 11:20 by Priya Shah';
    const undo = update('residents', r.id, { status: 'In residence', checkedIn: when, fob: f, checkInNote: `Fob ${f} · room condition recorded with ${photos} photos${welcome ? ' · welcome email sent' : ''}` });
    log(`checked in ${r.name} to ${hallShort(r.hall)} ${r.room}`, 'Residents');
    onClose();
    undoToast(isAmira ? 'Amira Rahman checked in · Ustinov is 62% in residence' : `${r.name} checked in to ${r.room}`, undo);
  });
  return (
    <SideSheet open onClose={onClose} icon={SignIn} tone="green" title="Check in"
      footer={<><Button onClick={onClose}>Cancel</Button><Button variant="primary" icon={SignIn} onClick={submit}>Check in</Button></>}>
      <SheetHero name={r.name} meta={`${r.room} · ${r.hall}`}>
        <Pill tone="amber" icon={ListChecks}>{(r.lease === 'Signed' ? 1 : 0) + (r.deposit === 'Paid' ? 1 : 0) + (r.plan ? 1 : 0)} of {total} done</Pill>
      </SheetHero>
      <SheetSection title="ID checked">
        <div role="radiogroup" className="space-y-2">
          {['Passport', 'BRP', 'Other'].map((t) => <RadioCard key={t} checked={idType === t} onClick={() => setIdType(t)} title={<span className="flex items-center gap-2">{t}{t === 'Passport' && isAmira && <span className="text-xs text-gray-500 font-normal">Number ends 4471 · expires 2031</span>}</span>} />)}
        </div>
      </SheetSection>
      <SheetSection title="Keys and meter">
      <div className="grid grid-cols-2 gap-3 items-start">
        <Field label="Key fob" error={tried ? fobError : undefined}><IconInput icon={Key} aria-label="Key fob" invalid={tried && !!fobError} value={fob} onChange={(e) => setFob(e.target.value)} /></Field>
        <Field label="Electricity meter" error={tried ? meterError : undefined}><IconInput icon={Lightning} aria-label="Electricity meter" invalid={tried && !!meterError} value={meter} onChange={(e) => setMeter(e.target.value)} /></Field>
      </div>
      </SheetSection>
      <SheetSection title="Room condition">
        <div className="flex gap-2">
          {Array.from({ length: Math.min(photos, 4) }, (_, i) => <Photo key={i} size={64} />)}
          <button type="button" aria-label="Take a photo" onClick={() => setPhotos((p) => p + 1)} className="w-16 h-12 rounded-lg border border-dashed border-gray-300 flex items-center justify-center text-gray-500 hover:bg-gray-50"><Camera size={16} /></button>
        </div>
        <p className="text-xs text-gray-500 mt-2">{photos ? `${photos} photos${isAmira ? ' · matches the move-out record from June' : ''}` : 'No photos yet'}</p>
      </SheetSection>
      <SheetSection title="Welcome">
        <ToggleRow title="Send the welcome email" sub="House rules, Wi-Fi, how to report a fault" checked={welcome} onChange={setWelcome} />
      </SheetSection>
    </SideSheet>
  );
}

/* ---------------- Deposit not paid: 3219, 3221 ---------------- */
function DepositDialog({ r, onClose }: { r: Resident; onClose: () => void }) {
  const once = useOnce();
  const [choice, setChoice] = useState<'pay' | 'override'>('pay');
  const first = r.name.split(' ')[0];
  /* The record shows the wait straight away and refuses a second link; the reply lands once. */
  const finish = (kind: 'payment' | 'override', ch: Partial<Resident>, msg: string) => {
    const cur = useRms.getState().residents.find((x) => x.id === r.id);
    if (!cur || cur.pending !== kind) return;
    const { update } = useRms.getState();
    const undo = update('residents', r.id, { ...ch, pending: undefined });
    useDb.getState().log(`checked in ${r.name} to ${hallShort(r.hall)} ${r.room}`, 'Residents');
    undoToast(msg, () => { undo(); useRms.getState().update('residents', r.id, { pending: undefined }); });
  };
  const submit = () => once(() => {
    onClose();
    if (useRms.getState().residents.find((x) => x.id === r.id)?.pending) return;
    if (choice === 'pay') {
      useRms.getState().update('residents', r.id, { pending: 'payment' });
      toast(`Payment link sent to ${first}’s phone`, { description: 'Keys stay at the desk until it is paid.' });
      setTimeout(() => finish('payment', { deposit: 'Paid', depositNote: '£250 · card · today', status: 'In residence', checkedIn: 'Today, 11:24 by Priya Shah', checkInNote: 'Deposit paid by link at the desk · keys handed over' }, `${r.name} paid £250 and is checked in to ${r.room}`), 3000);
    } else {
      useRms.getState().update('residents', r.id, { pending: 'override' });
      toast(`Asked Aisha Khan to override`, { description: 'Hall managers can check a resident in with the deposit unpaid.' });
      setTimeout(() => finish('override', { depositNote: '£250 · now arrears', status: 'In residence', checkedIn: 'Today, 11:24 by Priya Shah', checkInNote: 'Checked in by Aisha Khan’s override · the £250 deposit is now arrears' }, `${r.name} checked in · the £250 deposit is now arrears`), 2200);
    }
  });
  return (
    <Modal open onClose={onClose} title={`${first} can’t be checked in yet`} sub={`${first}’s £250 deposit isn’t paid. Keys are handed over only once it is.`}
      footer={<><Button onClick={onClose}>Cancel</Button><Button variant="primary" icon={choice === 'pay' ? DeviceMobile : ShieldCheck} onClick={submit}>{choice === 'pay' ? 'Send payment link' : 'Ask a hall manager'}</Button></>}>
      <div role="radiogroup" className="space-y-2">
        <RadioCard checked={choice === 'pay'} onClick={() => setChoice('pay')} title="Take payment now" sub={`Card at the desk or a payment link to ${first}’s phone.`} />
        <RadioCard checked={choice === 'override'} onClick={() => setChoice('override')} title="Check in anyway" sub="Needs a hall manager; the deposit becomes arrears." />
      </div>
    </Modal>
  );
}
