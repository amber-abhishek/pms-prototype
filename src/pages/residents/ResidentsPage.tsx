import { useState, type ChangeEvent } from 'react';
import { Navigate, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { Camera, CheckCircle, DeviceMobile, Envelope, Key, Lightning, ShieldCheck, SignOut, Users } from '../../components/icons';
import { toast } from 'sonner';
import { useDb } from '../../data/store';
import { hallShort, useRms, type Resident } from '../../data/residents';
import { Avatar, Button, Empty, Field, FilterButton, inFilter, type Filters, Input, Pill, SearchInput, SelectFilter, Table, Textarea, Toolbar, gbp, listNav, SheetHero, SheetRow, SheetSection, Sheet as RecordSheet } from '../../components/ui';
import { LineTabs, PanelModal, TagPicker, Tags, addTagChip } from '../inventory/common';
import type { Tag } from '../../data/inventory';
import { Modal, Photo, RHeader, RadioCard, RadioRow, ToggleRow, undoToast, useOnce } from './kit';
import { useTab } from '../hooks';

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
/** The Residents rows in their on-screen order, so the resident modal's ⌃ ⌄ steps through what the list shows. */
const shownResidents: { ids: string[] } = { ids: [] };
export function ResidentsList() {
  const [sp] = useSearchParams();
  const open = sp.get('open');
  const residents = useRms((s) => s.residents);
  const nav = useNavigate();
  const [tab, setTab] = useTab<Tab>('All');
  const [q, setQ] = useState('');
  const [f, setF] = useState<Filters>({});
  const checkIn = useCheckIn();
  if (open) return <Navigate to={`/residents/${open}`} replace />;
  const inTab = (r: Resident, t: Tab) => t === 'All' || (t === 'Arriving' ? !!r.arrivingThisWeek : r.status === t);
  const scoped = residents.filter((r) => inFilter(f.hall, r.hall) && inFilter(f.deposit, r.deposit) && (!f.week?.length || f.week.some((w) => (w === 'Arriving today' ? r.arrives === 'Today' && !r.checkedIn : w === 'Arriving this week' ? !!r.arrivingThisWeek : r.status === 'Leaving'))) && (!q.trim() || `${r.name} ${r.email} ${r.room} ${r.hall}`.toLowerCase().includes(q.trim().toLowerCase())));
  const rows = scoped.filter((r) => inTab(r, tab)).sort((a, b) => (tab === 'Arriving' ? Number(b.arrives === 'Today') - Number(a.arrives === 'Today') : 0));
  shownResidents.ids = rows.map((r) => r.id);
  return (
    <>
      <RHeader icon={Users} crumbs={[]} title="Residents" />
      {/* Toolbar, as Bookings: search on the left; on the right the view (was the tab strip) as a single-choice dropdown, then the filters. */}
      {residents.length > 0 && (
        <Toolbar right={<>
          <SelectFilter prefix="Status" value={tab} onChange={(v) => setTab(v as Tab)} width={220}
            options={(['All', 'In residence', 'Arriving', 'Leaving'] as Tab[]).map((t) => ({ value: t, meta: scoped.filter((r) => inTab(r, t)).length }))} />
          <FilterButton value={f} onChange={setF} defs={[{ id: 'hall', label: 'Property', options: [...new Set(residents.map((r) => r.hall))] }, { id: 'deposit', label: 'Deposit', options: ['Paid', 'Not paid'] }, { id: 'week', label: 'This week', chips: true, options: ['Arriving today', 'Arriving this week', 'Leaving'] }]} />
        </>}>
          <div className="w-[260px] min-w-[140px] shrink [&>label]:!w-full"><SearchInput value={q} onChange={setQ} placeholder="Search name or room" /></div>
        </Toolbar>
      )}
      <Table rows={rows} onRow={(r) => nav(`/residents/${r.id}`)}
        summary={`${rows.length} ${rows.length === 1 ? 'resident' : 'residents'}${tab === 'Arriving' ? ` · ${rows.filter((r) => r.checkedIn).length} checked in so far` : ''}`}
        empty={residents.length ? <Empty art="noResults" icon={Users} title="No residents match" sub="Try clearing the search or the filters." /> : <Empty art="records" icon={Users} title="No residents yet" sub="Residents show here once their bookings are confirmed." />}
        cols={[
          /* Row number: the resident's place in the filtered list, so it carries on across pages. */
          { key: 'no', label: 'S.No.', className: 'w-[56px]', render: (r) => <span className="font-mono text-[#737373] tabular-nums">{rows.indexOf(r) + 1}</span> },
          { key: 'n', label: 'Resident', render: (r) => <span className="flex items-center gap-2.5 min-w-0"><Avatar name={r.name} size={28} /><span className="font-medium truncate">{r.name}</span></span> },
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

/* ---------------- Resident detail (Figma "Side panel · Resident" 4073:17177: Overview, Payments, Requests, Messages, Activity) ---------------- */
/* Prototype dummy data per resident, stable by id (the backend fills these later). */
const hashOf = (k: string) => [...k].reduce((h, c) => (h * 31 + c.charCodeAt(0)) >>> 0, 7);
/** Tags put on residents in this session (residents carry no tags in the seed). */
const resTags: Record<string, Tag[]> = {};
const yearTone = (y: string): Tag['tone'] => (/post/i.test(y) ? 'purple' : /first/i.test(y) ? 'blue' : 'green');
const reqPill = (st: string) => (st === 'Approved' ? <Pill tone="green">Approved</Pill> : st === 'Declined' ? <Pill tone="red">Declined</Pill> : <Pill tone="orange">Waiting</Pill>);
const Tick = ({ ok }: { ok: boolean }) => (ok ? <CheckCircle size={20} weight="fill" className="text-[#16A34A] shrink-0" /> : <span aria-hidden className="size-5 shrink-0 rounded-full border-[1.5px] border-dashed border-[#A3A3A3]" />);
export function ResidentDetail() {
  const { id } = useParams();
  const nav = useNavigate();
  const { residents, requests, faults, update } = useRms();
  const r = residents.find((x) => x.id === id);
  const stepper = listNav(shownResidents.ids.length ? shownResidents.ids : residents.map((x) => x.id), (x) => x === id, (x) => nav(`/residents/${x}`));
  const [msg, setMsg] = useState(false);
  const [ending, setEnding] = useState(false);
  const [, bump] = useState(0);
  const checkIn = useCheckIn();
  const [sTab, setSTab] = useState<'Overview' | 'Payments' | 'Requests' | 'Messages' | 'Activity'>('Overview');
  if (!r) return <Navigate to="/residents" replace />;
  const h = hashOf(r.id);
  const first = r.name.split(' ')[0];
  const reqs = requests.filter((q) => q.who.includes(r.name));
  const mts = faults.filter((m) => m.reporter === r.name);
  const arriving = r.status === 'Arriving';
  const tags = resTags[r.id] ?? (resTags[r.id] = [{ label: r.year, tone: yearTone(r.year) }]);
  const setTags = (t: Tag[]) => { resTags[r.id] = t; bump((x) => x + 1); };
  const addTag = (t: Tag, created: boolean) => { setTags([...tags, t]); toast.success(created ? `${t.label} created and added` : `Tagged ${t.label}`); };
  const removeTag = (t: Tag) => { const before = tags; setTags(tags.filter((x) => x.label !== t.label)); toast.success(`${t.label} removed`, { action: { label: 'Undo', onClick: () => setTags(before) } }); };
  const guarantor = r.emergency && r.emergency !== 'On file' ? r.emergency.replace(/\s*\(.*\)/, '') : 'On file';
  const items = [
    { t: 'ID checked', s: arriving ? 'Passport or BRP, seen at the desk' : `Passport · ${['2 Sep', '4 Sep', '19 Sep'][h % 3]}`, ok: !arriving },
    { t: 'Contract signed', s: r.leaseNote ?? (r.lease === 'Signed' ? 'DocuSign · 28 Aug' : 'Sent, not signed yet'), ok: r.lease === 'Signed' },
    { t: 'Deposit paid', s: r.depositNote ?? (r.deposit === 'Paid' ? `${gbp(250)} · 28 Aug` : `${gbp(250)} due`), ok: r.deposit === 'Paid' },
    ...(r.plan ? [{ t: 'Accessibility plan agreed', s: r.plan, ok: true }] : []),
    { t: 'Guarantor', s: `UK guarantor · ${guarantor}`, ok: true },
  ];
  const done = items.filter((i) => i.ok).length;
  const inst = r.rent * 10;
  const owes = r.deposit === 'Paid' ? 0 : 250;
  const paidSoFar = (r.deposit === 'Paid' ? 250 : 0) + (arriving ? 0 : inst);
  const checkInDay = arriving ? (r.arrives ?? '—') : r.checkedIn ? r.checkedIn.split(/,| by /)[0] : '21 Sep';
  const openReqs = reqs.filter((q) => q.status !== 'Approved' && q.status !== 'Declined');
  const closedReqs = reqs.filter((q) => !openReqs.includes(q));
  const staff = ['Arjun Mehta', 'Tom Baker', 'Kim Lowe'][h % 3];
  const msgs: [string, string, string][] = [
    [r.name, 'Today 08:40', ['Hi, the shower in my room drips all night. Could someone take a look this week?', 'Could I get a second key fob for my room, please?', 'Is it OK if my sister stays over on Saturday?'][h % 3]],
    [staff, 'Today 09:05', [`Thanks ${first}, I’ve logged it and Dave will visit tomorrow morning.`, `Of course ${first}, it’s ready to collect at reception.`, `Yes ${first}, please register her in the portal by Friday.`][h % 3]],
  ];
  const activity: [string, string, string][] = [
    ...(!arriving ? [[r.name, `${r.name} paid instalment 1 · ${gbp(inst)}`, '21 Sep'] as [string, string, string]] : []),
    ...(r.checkedIn ? [[r.checkedIn.split(' by ')[1] ?? 'Arjun Mehta', `${r.checkedIn.split(' by ')[1] ?? 'Arjun Mehta'} checked ${first} in`, r.checkedIn.split(/,| by /)[0]] as [string, string, string]] : []),
    [r.name, r.lease === 'Signed' ? `${r.name} signed the contract` : 'Contract sent to sign', '28 Aug'],
    ['System', r.deposit === 'Paid' ? `Deposit of ${gbp(250)} received` : `Deposit of ${gbp(250)} requested`, '28 Aug'],
    ['System', 'Offer accepted in Allocations', '28 Jul'],
  ];
  const endTenancy = () => {
    setEnding(false);
    const undo = update('residents', r.id, { status: 'Leaving', leaves: '18 Jun 2027' });
    toast.success(`${first}’s tenancy ends 18 Jun 2027`, { description: 'They show under Leaving.', action: { label: 'Undo', onClick: () => undo() } });
  };
  const msgUi = (
    <Modal open={msg} onClose={() => setMsg(false)} title={`Message ${r.name}`} sub={`${r.email} · and the resident portal`}
      footer={<><Button onClick={() => setMsg(false)}>Cancel</Button><Button variant="primary" icon={Envelope} onClick={() => { setMsg(false); toast.success(`Message sent to ${first}`); }}>Send</Button></>}>
      <Textarea rows={4} placeholder={`Write to ${first}…`} />
    </Modal>
  );
  /* The resident opens as a right-hand side sheet over the list: hero, underline tabs, card sections. */
  return (
    <>
      <RecordSheet open onClose={() => nav('/residents')} title="Resident" width={520} nav={stepper}
        onDelete={r.status === 'In residence' ? { label: 'End tenancy', icon: SignOut, onClick: () => setEnding(true) } : undefined}
        footer={<>
          <Button icon={null} className="ml-auto" onClick={() => setMsg(true)}>Message</Button>
          {arriving && <Button variant="primary" icon={null} disabled={!!r.pending} onClick={() => checkIn.start(r)}>{r.pending === 'payment' ? 'Waiting for payment' : r.pending ? 'Waiting for sign-off' : 'Check in'}</Button>}
        </>}>
        <SheetHero name={r.name} meta={`${r.room} · ${r.hall} · 2026/27`}
          tags={<>
            {arriving ? <Pill tone="blue">Arriving {r.arrives}</Pill> : <ResStatusPill r={r} />}
            {r.plan && <Pill tone="purple">Accessibility plan</Pill>}
            {tags.map((t) => (
              <Tags key={t.label} tags={[t]} />
            ))}
            <TagPicker have={tags} onPick={addTag} onRemove={removeTag} trigger={addTagChip()} />
          </>}
          facts={[['Balance', gbp(owes) + (owes ? '' : '.00'), owes ? 'red' : 'green'], ['Rent', `£${r.rent} / wk`], [arriving ? 'Arrives' : 'Check-in', checkInDay]]} />
        <div className="-mx-5 mb-5">
          <LineTabs value={sTab} onChange={setSTab} tabs={[{ id: 'Overview', label: 'Overview' }, { id: 'Payments', label: 'Payments' }, { id: 'Requests', label: 'Requests' }, { id: 'Messages', label: 'Messages' }, { id: 'Activity', label: 'Activity' }]} />
        </div>
        {sTab === 'Overview' && <>
          <SheetSection title={`Before keys · ${done} / ${items.length}`}>
            {items.map((i) => <SheetRow key={i.t} lead={<Tick ok={i.ok} />} title={i.t} sub={i.s}
              end={!i.ok && (i.t === 'ID checked' ? <Pill tone="amber">At the desk</Pill> : <Pill tone="red">Outstanding</Pill>)} />)}
          </SheetSection>
          <SheetSection title="Details" rows={[['Resident ID', r.studentId], ['Email', r.email], ['Phone', r.phone], ['Emergency', r.emergency], ['Application', r.application]]} />
        </>}
        {sTab === 'Payments' && <>
          <SheetSection title="Balance" rows={[['Balance', <span className={owes ? 'text-[#DC2626]' : 'text-[#0B8A4C]'}>{gbp(owes)}{owes ? '' : '.00'}</span>], ['Paid so far', gbp(paidSoFar)], ['Next due', arriving ? `Instalment 1 · ${gbp(inst)} · 19 Sep` : `Instalment 2 · ${gbp(inst)} · 6 Jan`]]} />
          <SheetSection title="Payments · 3">
            <SheetRow title="Instalment 2" sub={`${gbp(inst)} · due 6 Jan`} end={<Pill tone="grey">Upcoming</Pill>} />
            <SheetRow title="Instalment 1" sub={arriving ? `${gbp(inst)} · due 19 Sep` : `${gbp(inst)} · paid 21 Sep · card`} end={arriving ? <Pill tone="grey">Upcoming</Pill> : <Pill tone="green">Paid</Pill>} />
            <SheetRow title="Deposit" sub={r.deposit === 'Paid' ? `${gbp(250)} · paid 28 Aug` : `${gbp(250)} · not paid`} end={r.deposit === 'Paid' ? <Pill tone="blue">Held</Pill> : <Pill tone="red">Not paid</Pill>} />
          </SheetSection>
        </>}
        {sTab === 'Requests' && (reqs.length + mts.length === 0
          ? <Empty art="requests" title="Nothing raised yet" sub={`Requests and faults ${first} reports in the portal show here.`} />
          : <>
            {openReqs.length > 0 && <SheetSection title={`Open · ${openReqs.length}`}>
              {openReqs.map((q) => <SheetRow key={q.id} onClick={() => nav(`/residents/requests?open=${q.id}`)} title={q.kind} sub={`Asked ${q.waiting} ago`} end={reqPill(q.status)} />)}
            </SheetSection>}
            {closedReqs.length > 0 && <SheetSection title={`Closed · ${closedReqs.length}`}>
              {closedReqs.map((q) => <SheetRow key={q.id} onClick={() => nav(`/residents/requests?open=${q.id}`)} title={q.kind} sub={`${q.status}${q.decidedBy ? ` by ${q.decidedBy}` : ''}`} end={reqPill(q.status)} />)}
            </SheetSection>}
            {mts.length > 0 && <SheetSection title={`Faults · ${mts.length}`}>
              {mts.map((m) => <SheetRow key={m.id} onClick={() => nav(`/residents/maintenance?job=${m.id}`)} title={m.title} sub={`${m.ref} · ${m.category}`} end={m.status === 'Fixed' ? <Pill tone="green">Fixed</Pill> : <Pill tone="orange">Open</Pill>} />)}
            </SheetSection>}
          </>)}
        {sTab === 'Messages' && (
          <SheetSection title={`Messages · ${msgs.length}`}>
            {msgs.map(([who, when, body]) => (
              <div key={when} className="py-3 border-t border-[#EBEBEB] first:border-t-0 first:pt-0 last:pb-0">
                <div className="flex items-baseline gap-2"><span className="text-sm font-medium text-[#0A0A0A]">{who}</span><span className="text-[13px] text-[#737373]">{when}</span></div>
                <p className="mt-1 text-sm leading-5 text-[#0A0A0A]">{body}</p>
              </div>
            ))}
          </SheetSection>
        )}
        {sTab === 'Activity' && (
          <SheetSection title="Activity">
            {activity.map(([who, what, when]) => <SheetRow key={what} lead={<Avatar name={who} size={24} />} title={what} sub={when} />)}
          </SheetSection>
        )}
      </RecordSheet>
      <Modal open={ending} onClose={() => setEnding(false)} title={`End ${first}’s tenancy?`} sub={`${r.room} · ${r.hall}. ${first} moves to Leaving and the room comes free on 18 Jun 2027.`}
        footer={<><Button onClick={() => setEnding(false)}>Keep</Button><Button variant="danger" icon={null} onClick={endTenancy}>End tenancy</Button></>}>{null}</Modal>
      {checkIn.ui}
      {msgUi}
    </>
  );
}

/* ---------------- Check-in sheet: 3006 ---------------- */
const IconInput = ({ icon: I, invalid, ...p }: { icon: typeof Key; invalid?: boolean; value: string; onChange: (e: ChangeEvent<HTMLInputElement>) => void; 'aria-label': string }) => (
  <div className="relative"><I size={15} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[#737373]" /><Input className={invalid ? 'pl-8 border-[#C11F14] focus-visible:border-[#C11F14]' : 'pl-8'} aria-invalid={invalid || undefined} {...p} /></div>
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
    const when = isAmira ? 'Sat 19 Sep, 10:42 by Arjun Mehta' : 'Today, 11:20 by Arjun Mehta';
    const undo = update('residents', r.id, { status: 'In residence', checkedIn: when, fob: f, checkInNote: `Fob ${f} · room condition recorded with ${photos} photos${welcome ? ' · welcome email sent' : ''}` });
    log(`checked in ${r.name} to ${hallShort(r.hall)} ${r.room}`, 'Residents');
    onClose();
    undoToast(isAmira ? 'Amira Rahman checked in · Ustinov is 62% in residence' : `${r.name} checked in to ${r.room}`, undo);
  });
  return (
    <PanelModal open onClose={onClose} eyebrow="Check in" title={r.name} person={r.name} width={600}
      meta={`${r.room} · ${r.hall} · ${(r.lease === 'Signed' ? 1 : 0) + (r.deposit === 'Paid' ? 1 : 0) + (r.plan ? 1 : 0)} of ${total} done`}
      right={<><Button onClick={onClose}>Cancel</Button><Button variant="primary" icon={null} onClick={submit}>Check in</Button></>}>
      <SheetSection title="ID checked">
        <div role="radiogroup" aria-label="ID checked">
          {['Passport', 'BRP', 'Other'].map((t) => <RadioRow key={t} checked={idType === t} onClick={() => setIdType(t)} title={t} sub={t === 'Passport' && isAmira ? 'Number ends 4471 · expires 2031' : undefined} />)}
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
    </PanelModal>
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
      setTimeout(() => finish('payment', { deposit: 'Paid', depositNote: '£250 · card · today', status: 'In residence', checkedIn: 'Today, 11:24 by Arjun Mehta', checkInNote: 'Deposit paid by link at the desk · keys handed over' }, `${r.name} paid £250 and is checked in to ${r.room}`), 3000);
    } else {
      useRms.getState().update('residents', r.id, { pending: 'override' });
      toast(`Asked Aisha Khan to override`, { description: 'Property managers can check a resident in with the deposit unpaid.' });
      setTimeout(() => finish('override', { depositNote: '£250 · now arrears', status: 'In residence', checkedIn: 'Today, 11:24 by Arjun Mehta', checkInNote: 'Checked in by Aisha Khan’s override · the £250 deposit is now arrears' }, `${r.name} checked in · the £250 deposit is now arrears`), 2200);
    }
  });
  return (
    <Modal open onClose={onClose} title={`${first} can’t be checked in yet`} sub={`${first}’s £250 deposit isn’t paid. Keys are handed over only once it is.`}
      footer={<><Button onClick={onClose}>Cancel</Button><Button variant="primary" icon={choice === 'pay' ? DeviceMobile : ShieldCheck} onClick={submit}>{choice === 'pay' ? 'Send payment link' : 'Ask a property manager'}</Button></>}>
      <div role="radiogroup" className="space-y-2">
        <RadioCard checked={choice === 'pay'} onClick={() => setChoice('pay')} title="Take payment now" sub={`Card at the desk or a payment link to ${first}’s phone.`} />
        <RadioCard checked={choice === 'override'} onClick={() => setChoice('override')} title="Check in anyway" sub="Needs a property manager; the deposit becomes arrears." />
      </div>
    </Modal>
  );
}
