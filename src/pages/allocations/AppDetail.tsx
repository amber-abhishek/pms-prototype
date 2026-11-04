import { Fragment, useState, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { CalendarBlank, CheckCircle, Clock, Eye, FileText, FirstAid, HourglassMedium, MagicWand, Person, Quotes, ShieldCheck, Tray, UploadSimple, UserCheck, Users, Warning, Wheelchair, XCircle, type Icon } from '../../components/icons';
import { toast } from 'sonner';
import { Button, Dialog, Pill, cx } from '../../components/ui';
import { available, firstName, hallFull, roomTerms, useAlloc, type App, type Req } from '../../data/allocations';
import { Ini, LineTabs, St } from './common';
import { useAllocActions } from './actions';

export const statusLabel: Record<App['status'], string> = { review: 'In review', manual: 'Manual review', allocated: 'Allocated', rejected: 'Rejected', waitlist: 'Waitlist', declined: 'Declined' };
const ord = ['1st', '2nd', '3rd'];
export type Pref = { rank: number; hall: string; room: string; sub: string; avail: number; weeks: number };

export function prefsOf(a: App, d: Parameters<typeof available>[0]): Pref[] {
  return a.prefs.map(([hall, room], i) => {
    const t = roomTerms(hall, room);
    return { rank: i + 1, hall, room, weeks: t.weeks, sub: `${room} · ${t.weeks} weeks · £${t.rate}/wk`, avail: stepFree(a) && hall === 'Hild Bede' ? 0 : available(d, hall, room) };
  });
}
const stepFree = (a: App) => a.reqs.includes('Step-free access');
export const bestPref = (ps: Pref[]) => ps.find((p) => p.avail > 0);
export const ordinal = (n: number) => ord[n - 1] ?? `${n}th`;

/** The right-hand detail of an application, with its five tabs and the action bar. */
export function AppDetail({ a, onAllocate, onReject, onAfter }: { a: App; onAllocate: (p: Pref) => void; onReject: () => void; onAfter: () => void }) {
  const d = useAlloc();
  const act = useAllocActions();
  const [tab, setTab] = useState<'Overview' | 'Preferences' | 'Requirements' | 'Documents' | 'Activity'>('Overview');
  const ps = prefsOf(a, d);
  const best = bestPref(ps);
  const canAct = a.status === 'review' || a.status === 'manual';
  return (
    <div className="flex-1 min-w-0 flex flex-col">
      <div className="flex-1 overflow-auto">
        <div className="px-6 pt-5">
          <div className="flex items-center gap-3">
            <Ini name={a.name} size={40} />
            <div className="min-w-0">
              <div className="flex items-center gap-2"><h2 className="text-xl font-semibold tracking-tight">{a.name}</h2><St s={statusLabel[a.status]} /></div>
              <div className="text-sm text-gray-500 mt-0.5">APP-{a.ref} · {a.year.toLowerCase()} · submitted {a.submitted}{a.status === 'review' || a.status === 'manual' ? ` · waiting ${a.waiting} ${a.waiting === 1 ? 'day' : 'days'}` : ''}</div>
            </div>
          </div>
          <div className="mt-4"><LineTabs value={tab} onChange={setTab} tabs={['Overview', 'Preferences', 'Requirements', 'Documents', 'Activity']} /></div>
        </div>
        <div className="px-6 py-5 grid grid-cols-[minmax(0,1fr)_260px] gap-6">
          {tab === 'Overview' && <Overview a={a} ps={ps} best={best} canAct={canAct} onAllocate={onAllocate} />}
          {tab === 'Preferences' && <Preferences a={a} ps={ps} />}
          {tab === 'Requirements' && <Requirements a={a} ps={ps} onVerify={(r) => act.verify(a, r)} />}
          {tab === 'Documents' && <Documents a={a} onVerify={(r) => act.verify(a, r)} />}
          {tab === 'Activity' && <Activity a={a} />}
        </div>
      </div>
      <div className="h-16 shrink-0 px-6 flex items-center gap-2 border-t border-line">
        {canAct ? (
          <>
            <span className="text-xs text-gray-500">After you allocate or reject, the next application opens</span>
            <div className="ml-auto flex gap-2">
              <Button className="!bg-[#FFF5F6] !border-[#FFC2CB] !text-[#E0243A] hover:!bg-[#FDECEC]" onClick={onReject}>Reject</Button>
              {a.status === 'review'
                ? <Button onClick={() => { act.manual(a); onAfter(); }}>Manual review</Button>
                : <Button onClick={() => act.toQueue(a)}>Back to To review</Button>}
              <Button variant="primary" icon={UserCheck} onClick={() => (best ? onAllocate(best) : toast.error(`No free unit in any of ${firstName(a.name)}’s choices`, { description: 'Pick a unit from another hall, or add them to the waitlist.' }))}>Allocate best match</Button>
            </div>
          </>
        ) : a.status === 'allocated' ? (
          <>
            <span className="text-xs text-gray-500">Allocated {a.unit} · by {a.allocBy} on {a.allocOn}</span>
            <div className="ml-auto"><Link to="/allocations/offers?tab=Open"><Button>View offer</Button></Link></div>
          </>
        ) : a.status === 'rejected' ? (
          <>
            <span className="text-xs text-gray-500">Rejected · {a.reason}</span>
            <div className="ml-auto"><Button onClick={() => act.toQueue(a)}>Reopen</Button></div>
          </>
        ) : (
          <>
            <span className="text-xs text-gray-500">{a.status === 'waitlist' ? 'On the waitlist · offered the next unit that frees up' : 'Declined the offer'}</span>
            <div className="ml-auto"><Link to="/allocations/offers?tab=Waitlist"><Button>Open waitlist</Button></Link></div>
          </>
        )}
      </div>
    </div>
  );
}

/* ---------- pieces ---------- */
const H = ({ title, right }: { title: string; right?: ReactNode }) => <div className="flex items-center justify-between mb-3"><h3 className="text-sm font-semibold">{title}</h3><span className="text-xs text-gray-500">{right}</span></div>;
const AsideH = ({ children }: { children: ReactNode }) => <div className="text-xs font-medium text-ink mb-3">{children}</div>;
function KV({ rows }: { rows: [string, ReactNode][] }) {
  return <dl className="grid grid-cols-[108px_1fr] gap-y-3 text-sm">{rows.map(([k, v]) => <Fragment key={k}><dt className="text-gray-500">{k}</dt><dd className="text-ink">{v}</dd></Fragment>)}</dl>;
}

function AppNote({ a }: { a: App }) {
  if (stepFree(a)) return <Callout icon={Wheelchair} tone="amber" title="Needs a ground-floor or lift-access room" sub="Verified by Disability Support on 20 Oct · only matching units are suggested" />;
  if (a.tag === 'No study offer') return <Callout icon={Warning} tone="amber" title="No offer to study at Durham" sub="UCAS shows no Durham offer for this applicant · checked 27 Oct" />;
  if (a.toCheck?.length) return <Callout icon={FirstAid} tone="amber" title="Medical evidence to check" sub="A GP note was uploaded · check it before a room is allocated" />;
  if (a.why) return <Callout icon={Warning} tone="amber" title={a.why} sub="Left out of auto-allocate until a person decides" />;
  return null;
}
function Callout({ icon: I, title, sub, tone }: { icon: Icon; title: string; sub: string; tone: 'amber' }) {
  return (
    <div className="rounded-lg border border-[#C47A00]/35 bg-white px-3.5 py-2.5 flex gap-2.5 mb-6">
      <I size={16} className={cx('shrink-0 mt-0.5', tone === 'amber' && 'text-[#C47A00]')} />
      <div><div className="text-sm font-medium text-[#C47A00]">{title}</div><div className="text-xs text-gray-500 mt-0.5">{sub}</div></div>
    </div>
  );
}

function Overview({ a, ps, best, canAct, onAllocate }: { a: App; ps: Pref[]; best?: Pref; canAct: boolean; onAllocate: (p: Pref) => void }) {
  return (
    <>
      <div>
        <AppNote a={a} />
        <H title="Hall preferences" right="Matched against live availability" />
        <div className="space-y-2.5">
          {ps.map((p) => {
            const isBest = canAct && best === p;
            return (
              <div key={p.rank} className={cx('rounded-xl border px-4 h-[60px] flex items-center gap-3', isBest ? 'border-[#B9CBFF] bg-[#EFF6FF]' : 'border-line bg-white')}>
                <span className={cx('size-5 rounded-full flex items-center justify-center text-xs font-semibold shrink-0', isBest ? 'bg-primary text-white' : 'bg-[#F3F4F6] text-gray-500')}>{p.rank}</span>
                <div className="min-w-0 flex-1"><div className="text-sm font-semibold">{hallFull[p.hall]}</div><div className="text-xs text-gray-500">{p.sub}</div></div>
                <span className={cx('text-xs', p.avail ? 'text-[#0B8A4C]' : 'text-gray-500')}>{p.avail ? `${p.avail} available` : 'Full'}</span>
                {canAct && (isBest ? <Button size="sm" variant="primary" onClick={() => onAllocate(p)}>Allocate</Button> : <Button size="sm" onClick={() => onAllocate(p)}>Pick unit</Button>)}
              </div>
            );
          })}
        </div>
      </div>
      <aside>
        <AsideH>Applicant</AsideH>
        <KV rows={[['Course', a.course], ['Fee status', a.fee], ['Arrival', a.arrival], ['Email', <span className="break-all">{a.email}</span>], ['Guarantee', a.guarantee ? <Pill tone="green">Guaranteed</Pill> : <Pill>Not guaranteed</Pill>]]} />
      </aside>
    </>
  );
}

function Preferences({ a, ps }: { a: App; ps: Pref[] }) {
  const t = roomTerms(a.hall, a.room);
  const words = a.ref === '11873' ? '“I use a wheelchair on some days, so a lift or a ground-floor room matters more to me than which college.”'
    : a.tag === 'No study offer' ? '“I’m waiting on my clearing place and hope to hear this week.”' : a.why ? `“${a.why}.”` : null;
  return (
    <>
      <div>
        <H title="Ranked choices" right={`In the order ${firstName(a.name)} listed them`} />
        <div className="rounded-xl border border-line divide-y divide-line">
          {ps.map((p) => (
            <div key={p.rank} className="px-4 h-[60px] flex items-center gap-3">
              <span className={cx('size-5 rounded-full flex items-center justify-center text-xs font-semibold', p.rank === 1 ? 'bg-primary text-white' : 'bg-[#F3F4F6] text-gray-500')}>{p.rank}</span>
              <div className="min-w-0 flex-1"><div className="text-sm font-semibold">{hallFull[p.hall]}</div><div className="text-xs text-gray-500">{p.sub}</div></div>
              {stepFree(a) && (p.hall === 'Hild Bede' ? <Pill tone="amber" icon={Warning}>No lift</Pill> : <Pill tone="green" icon={ShieldCheck}>Step-free</Pill>)}
              <span className={cx('text-xs w-20 text-right', p.avail ? 'font-medium text-[#0B8A4C]' : 'text-gray-500')}>{p.avail ? `${p.avail} available` : 'Full'}</span>
            </div>
          ))}
        </div>
        <h3 className="text-sm font-semibold mt-7 mb-3">Room and contract</h3>
        <div className="rounded-xl border border-line p-4">
          <KV rows={[['Room type', a.room === 'Accessible ensuite' ? 'Ensuite or better' : a.room], ['Contract', t.weeks === 51 ? '51 weeks, full year' : '44 weeks, term time'], ['Budget', `Up to £${t.rate + 8}/wk`], ['Catering', a.hall === 'Hild Bede' ? 'Catered' : 'Self-catered'], ['Quiet floor', a.ref === '11873' ? 'Yes, if available' : 'No preference']]} />
        </div>
      </div>
      <aside className="space-y-5">
        <div>
          <AsideH>In {firstName(a.name)}’s words</AsideH>
          <div className="rounded-[10px] bg-[#F9FAFB] p-3 text-sm text-ink"><Quotes size={14} className="text-gray-400 mb-1.5" />{words ?? <span className="text-gray-500">No note added.</span>}</div>
        </div>
        <div>
          <AsideH>Living with</AsideH>
          <div className="text-sm text-gray-500 flex items-center gap-2"><Users size={14} className="text-gray-400" />{a.why === 'Asks to live with a sibling' ? 'Asks to live with a sibling' : 'No flatmate request'}</div>
        </div>
        <div><AsideH>Changes</AsideH><KV rows={[['Last edited', a.submitted], ['Locked from', '1 Nov']]} /></div>
      </aside>
    </>
  );
}

function reqRows(a: App) {
  const st = (r: Req) => (a.toCheck?.includes(r) ? 'check' : a.reqs.includes(r) ? 'ok' : 'none');
  return [
    { r: 'Step-free access' as Req, icon: Wheelchair, sub: a.reqs.includes('Step-free access') ? 'Ground floor or lift · Disability Support, 20 Oct' : 'Not requested', s: st('Step-free access') },
    { r: 'Medication fridge' as Req, icon: FirstAid, sub: a.reqs.includes('Medication fridge') ? 'GP note uploaded 19 Oct' : 'Not requested', s: st('Medication fridge') },
    { r: 'Year-round stay' as Req, icon: CalendarBlank, sub: a.reqs.includes('Year-round stay') ? 'Care leaver · confirmed by Student Support' : 'Not requested', s: st('Year-round stay') },
  ];
}
function ReqPill({ s, onCheck }: { s: string; onCheck?: () => void }) {
  if (s === 'ok') return <Pill tone="green" icon={ShieldCheck}>Verified</Pill>;
  if (s === 'met') return <Pill tone="green" icon={CheckCircle}>Met</Pill>;
  if (s === 'check') return <button type="button" title="Mark as verified" onClick={onCheck}><Pill tone="amber" icon={Clock}>To check</Pill></button>;
  return <span className="text-xs text-gray-500">None</span>;
}
function Requirements({ a, ps, onVerify }: { a: App; ps: Pref[]; onVerify: (r: Req) => void }) {
  const rows = reqRows(a);
  const left = rows.filter((r) => r.s === 'check').length;
  const ok = ps.filter((p) => p.avail > 0);
  return (
    <>
      <div>
        <AppNote a={a} />
        <H title="Requirements" right={left ? `${left} still to check` : 'All checked'} />
        <div className="rounded-xl border border-line divide-y divide-line">
          {rows.map((x) => (
            <div key={x.r} className="px-4 h-[60px] flex items-center gap-3">
              <span className={cx('size-7 rounded-lg flex items-center justify-center', x.s === 'none' ? 'bg-[#F3F4F6] text-gray-500' : 'bg-[#FFF6E0] text-[#C47A00]')}><x.icon size={14} /></span>
              <div className="flex-1 min-w-0"><div className="text-sm font-medium">{x.r}</div><div className="text-xs text-gray-500">{x.sub}</div></div>
              <ReqPill s={x.s} onCheck={() => onVerify(x.r)} />
            </div>
          ))}
          <div className="px-4 h-[60px] flex items-center gap-3">
            <span className="size-7 rounded-lg flex items-center justify-center bg-[#F3F4F6] text-gray-500"><Person size={14} /></span>
            <div className="flex-1"><div className="text-sm font-medium">Age at arrival</div><div className="text-xs text-gray-500">{a.why === 'Under 18 at arrival' ? '17 on 19 Sep 2027 · guardian form needed' : '19 on 19 Sep 2027 · no guardian form'}</div></div>
            {a.why === 'Under 18 at arrival' ? <Pill tone="amber" icon={Clock}>To check</Pill> : <ReqPill s="met" />}
          </div>
        </div>
      </div>
      <aside className="space-y-5">
        <div>
          <AsideH>Where {firstName(a.name)} fits</AsideH>
          <KV rows={[['Matches', <span><span className="text-[#0B8A4C] font-semibold">{ok.reduce((s, p) => s + p.avail, 0) + (stepFree(a) ? 4 : 0)}</span> matching units</span>], ['Halls', ok.map((p) => p.hall).join(', ') || '—'], ['Ruled out', stepFree(a) && a.prefs.some((p) => p[0] === 'Hild Bede') ? 'Hild Bede (no lift)' : '—']]} />
        </div>
        <div>
          <AsideH>Checked by</AsideH>
          <KV rows={[['Access', stepFree(a) ? 'Disability Support' : '—'], ['Medical', a.toCheck?.includes('Medication fridge') ? 'Not yet' : a.reqs.includes('Medication fridge') ? 'Priya Shah' : '—']]} />
        </div>
      </aside>
    </>
  );
}

type Doc = { name: string; meta: string; s: 'ok' | 'check' | 'missing'; req?: Req };
function docsOf(a: App): Doc[] {
  const out: Doc[] = [];
  if (stepFree(a)) out.push({ name: 'Disability Support letter', meta: `PDF · 182 KB · ${a.submitted}`, s: 'ok' });
  if (a.reqs.includes('Medication fridge')) out.push({ name: 'GP note — medication fridge', meta: 'PDF · 96 KB · 19 Oct', s: a.toCheck?.includes('Medication fridge') ? 'check' : 'ok', req: 'Medication fridge' });
  out.push({ name: 'Passport', meta: `JPG · 1.2 MB · ${a.submitted}`, s: 'ok' });
  out.push(a.tag === 'No study offer' ? { name: 'Offer letter', meta: 'Not uploaded · UCAS shows no Durham offer', s: 'missing' } : { name: `Offer letter · ${a.course === '—' ? 'course' : a.course}`, meta: `PDF · 240 KB · ${a.submitted}`, s: 'ok' });
  return out;
}
function Documents({ a, onVerify }: { a: App; onVerify: (r: Req) => void }) {
  const docs = docsOf(a);
  const [view, setView] = useState<Doc | null>(null);
  const toCheck = docs.filter((x) => x.s !== 'ok').length;
  const checklist: [string, boolean][] = [['Proof of identity', true], ['Offer of study', a.tag !== 'No study offer'], ...(stepFree(a) ? [['Access evidence', true] as [string, boolean]] : []), ...(a.reqs.includes('Medication fridge') ? [['Medical evidence', !a.toCheck?.includes('Medication fridge')] as [string, boolean]] : [])];
  return (
    <>
      <div>
        <H title="Documents" right={`${docs.length} files${toCheck ? ` · ${toCheck} to check` : ''}`} />
        <div className="rounded-xl border border-line divide-y divide-line">
          {docs.map((x) => (
            <div key={x.name} className="px-4 h-[60px] flex items-center gap-3">
              <span className="size-8 rounded-lg bg-[#F3F4F6] text-gray-500 flex items-center justify-center"><FileText size={16} /></span>
              <div className="flex-1 min-w-0"><div className="text-sm font-medium truncate">{x.name}</div><div className="text-xs text-gray-500">{x.meta}</div></div>
              {x.s === 'ok' ? <Pill tone="green" icon={ShieldCheck}>Verified</Pill> : x.s === 'check' ? <Pill tone="amber" icon={Clock}>To check</Pill> : <Pill tone="red" icon={XCircle}>Missing</Pill>}
              <Button size="sm" disabled={x.s === 'missing'} onClick={() => setView(x)}>View</Button>
            </div>
          ))}
        </div>
      </div>
      <aside className="space-y-4">
        <div>
          <AsideH>Checklist</AsideH>
          <div className="space-y-2.5 text-sm">{checklist.map(([k, ok]) => <div key={k} className="flex items-center gap-2">{ok ? <CheckCircle size={14} className="text-[#0B8A4C]" /> : <HourglassMedium size={14} className="text-[#C47A00]" />}{k}</div>)}</div>
        </div>
        <div>
          <AsideH>Not needed</AsideH>
          <div className="text-sm">Guarantor form</div>
          <div className="text-xs text-gray-500 mt-1">Durham guarantees first-year rooms for {firstName(a.name)}’s course</div>
        </div>
      </aside>
      <Dialog open={!!view} onClose={() => setView(null)} title={view?.name ?? ''} width={560}
        footer={view && <>{view.s === 'check' && view.req && <Button variant="success" icon={ShieldCheck} onClick={() => { onVerify(view.req!); setView(null); }}>Mark verified</Button>}<Button onClick={() => setView(null)}>Close</Button></>}>
        <div className="rounded-lg border border-line bg-[#F9FAFB] h-72 flex flex-col items-center justify-center text-gray-400 gap-2"><FileText size={40} weight="duotone" /><span className="text-sm">{view?.meta}</span></div>
      </Dialog>
    </>
  );
}

function Activity({ a }: { a: App }) {
  type E = { icon: Icon; tone: string; t: string; when: string; chip?: string; sub?: string };
  const amira = a.ref === '11873';
  const items: E[] = [
    ...(a.log ?? []).map((l) => ({ icon: CheckCircle, tone: 'bg-[#E8F7EE] text-[#0B8A4C]', t: l.t, when: l.when, sub: l.sub })),
    ...(a.opened ? [{ icon: Eye, tone: 'bg-[#E6ECFF] text-[#1F45E0]', t: 'Priya Shah opened the application', when: '27 Oct, 10:42' }] : []),
    ...(a.tag ? [{ icon: MagicWand, tone: 'bg-[#F1E7FF] text-[#8B2CF5]', t: `Auto-allocate skipped ${firstName(a.name)}`, when: '22 Oct, 02:00', chip: a.tag === 'Requirements' ? 'Step-free requirement: a person picks the unit' : a.tag === 'No study offer' ? 'No study offer on record' : 'Flagged for manual review' }] : []),
    ...(stepFree(a) ? [{ icon: ShieldCheck, tone: 'bg-[#E8F7EE] text-[#0B8A4C]', t: 'Disability Support verified step-free access', when: '20 Oct, 15:18' }] : []),
    ...(a.reqs.includes('Medication fridge') ? [{ icon: UploadSimple, tone: 'bg-[#F3F4F6] text-gray-500', t: `${a.name} uploaded GP note — medication fridge`, when: '19 Oct, 09:05' }] : []),
    { icon: Tray, tone: 'bg-[#F3F4F6] text-gray-500', t: `${a.name} submitted the application`, when: `${a.submitted}, 21:37`, chip: `3 hall choices · ${docsOf(a).length - (amira ? 1 : 0)} documents` },
  ];
  return (
    <>
      <div>
        <H title="Activity" right="Newest first" />
        <ol className="relative">
          {items.map((e, i) => (
            <li key={i} className="flex gap-3 pb-5 relative">
              {i < items.length - 1 && <span className="absolute left-[11px] top-7 bottom-0 w-0.5 bg-gray-300" />}
              <span className={cx('size-6 rounded-full flex items-center justify-center shrink-0', e.tone)}><e.icon size={12} /></span>
              <div className="min-w-0">
                <div className="text-sm">{e.t}</div>
                <div className="text-xs text-gray-500 mt-0.5">{e.when}{e.sub ? ` · ${e.sub}` : ''}</div>
                {e.chip && <div className="mt-2 inline-flex px-2.5 h-7 items-center rounded-lg bg-[#F9FAFB] text-xs">{e.chip}</div>}
              </div>
            </li>
          ))}
        </ol>
      </div>
      <aside>
        <AsideH>Summary</AsideH>
        <KV rows={[['Submitted', a.submitted], ['Waiting', <span className={cx(a.waiting > 5 && 'text-[#E0243A] font-semibold')}>{a.waiting} {a.waiting === 1 ? 'day' : 'days'}</span>], ['Last opened', a.opened ?? '—']]} />
      </aside>
    </>
  );
}

