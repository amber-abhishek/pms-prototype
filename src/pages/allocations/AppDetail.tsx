import { useState, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { CheckCircle, Eye, FileText, FirstAid, MagicWand, ShieldCheck, Tray, UploadSimple, UserCheck, Warning, Wheelchair, type Icon } from '../../components/icons';
import { toast } from 'sonner';
import { Button, Dialog, Pill, SheetHero, SheetSection, cx } from '../../components/ui';
import { available, firstName, hallFull, roomTerms, useAlloc, type App, type Req } from '../../data/allocations';
import { St } from './common';
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
  const ps = prefsOf(a, d);
  const best = bestPref(ps);
  const canAct = a.status === 'review' || a.status === 'manual';
  /* Mercury drawer (2026-11-09): one column, no tabs. Hero, the flag note, then titled sections in reading order. */
  return (
    <div className="flex-1 min-w-0 flex flex-col">
      <div className="flex-1 overflow-auto px-5 py-5">
        <SheetHero name={a.name} meta={`APP-${a.ref} · ${a.year.toLowerCase()} · submitted ${a.submitted}${canAct ? ` · waiting ${a.waiting} ${a.waiting === 1 ? 'day' : 'days'}` : ''}`}>
          <St s={statusLabel[a.status]} />{a.tag && <Pill tone="amber">{a.tag}</Pill>}
        </SheetHero>
        <AppNote a={a} />
        <Preferences a={a} ps={ps} best={best} canAct={canAct} onAllocate={onAllocate} />
        <SheetSection title="Applicant" rows={[['Course', a.course], ['Fee status', a.fee], ['Arrival', a.arrival], ['Email', <span className="break-all">{a.email}</span>], ['Guarantee', a.guarantee ? <Pill tone="green">Guaranteed</Pill> : <Pill>Not guaranteed</Pill>]]} />
        <RoomAndContract a={a} />
        <Requirements a={a} onVerify={(r) => act.verify(a, r)} />
        <Documents a={a} onVerify={(r) => act.verify(a, r)} />
        <Activity a={a} />
      </div>
      <div className="h-16 shrink-0 px-5 flex items-center gap-2 border-t border-line">
        {canAct ? (
          <>
            <Button variant="danger-ghost" onClick={onReject}>Reject</Button>
            <div className="ml-auto flex gap-2">
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
/** A flat list row inside a section: leading slot, title + grey sub, trailing slot. Rows split by #F3F4F6 hairlines. */
function Row({ lead, title, sub, children }: { lead?: ReactNode; title: ReactNode; sub?: ReactNode; children?: ReactNode }) {
  return (
    <div className="min-h-[52px] py-2 flex items-center gap-3 border-b border-[#F3F4F6] last:border-b-0">
      {lead}
      <div className="min-w-0 flex-1"><div className="text-sm font-medium text-ink truncate">{title}</div>{sub && <div className="text-xs text-gray-500 truncate">{sub}</div>}</div>
      {children}
    </div>
  );
}
const Rank = ({ n, on }: { n: number; on?: boolean }) => <span className={cx('size-5 rounded-full flex items-center justify-center text-xs font-semibold shrink-0', on ? 'bg-primary text-white' : 'bg-[#F3F4F6] text-[#646A78]')}>{n}</span>;

function AppNote({ a }: { a: App }) {
  if (stepFree(a)) return <Callout icon={Wheelchair} title="Needs a ground-floor or lift-access room" sub="Verified by Disability Support, 20 Oct" />;
  if (a.tag === 'No study offer') return <Callout icon={Warning} title="No offer to study at Durham" sub="UCAS checked 27 Oct" />;
  if (a.toCheck?.length) return <Callout icon={FirstAid} title="Medical evidence to check" sub="GP note uploaded" />;
  if (a.why) return <Callout icon={Warning} title={a.why} sub="Left out of auto-allocate" />;
  return null;
}
function Callout({ icon: I, title, sub }: { icon: Icon; title: string; sub: string }) {
  return (
    <div className="rounded-lg border border-[#C47A00]/35 bg-white px-3.5 py-2.5 flex gap-2.5 mb-5">
      <I size={16} className="shrink-0 mt-0.5 text-[#C47A00]" />
      <div><div className="text-sm font-medium text-[#9A5B00]">{title}</div><div className="text-xs text-gray-500 mt-0.5">{sub}</div></div>
    </div>
  );
}

function Preferences({ a, ps, best, canAct, onAllocate }: { a: App; ps: Pref[]; best?: Pref; canAct: boolean; onAllocate: (p: Pref) => void }) {
  return (
    <SheetSection title="Hall preferences">
      {ps.map((p) => {
        const isBest = canAct && best === p;
        return (
          <Row key={p.rank} lead={<Rank n={p.rank} on={isBest} />} title={hallFull[p.hall]} sub={p.sub}>
            {stepFree(a) && (p.hall === 'Hild Bede' ? <Pill tone="amber">No lift</Pill> : <Pill tone="green">Step-free</Pill>)}
            <span className={cx('text-xs whitespace-nowrap', p.avail ? 'text-[#0B8A4C]' : 'text-gray-500')}>{p.avail ? `${p.avail} free` : 'Full'}</span>
            {canAct && (isBest ? <Button size="sm" variant="secondary" className="w-[104px]" onClick={() => onAllocate(p)}>Allocate</Button> : <Button size="sm" variant="ghost" className="w-[104px]" onClick={() => onAllocate(p)}>Pick unit</Button>)}
          </Row>
        );
      })}
    </SheetSection>
  );
}

function RoomAndContract({ a }: { a: App }) {
  const t = roomTerms(a.hall, a.room);
  const words = a.ref === '11873' ? '“I use a wheelchair on some days, so a lift or a ground-floor room matters more to me than which college.”'
    : a.tag === 'No study offer' ? '“I’m waiting on my clearing place and hope to hear this week.”' : a.why ? `“${a.why}.”` : null;
  return (
    <SheetSection title="Room and contract" rows={[
      ['Room type', a.room === 'Accessible ensuite' ? 'Ensuite or better' : a.room],
      ['Contract', t.weeks === 51 ? '51 weeks' : '44 weeks, term time'],
      ['Budget', `Up to £${t.rate + 8}/wk`],
      ['Catering', a.hall === 'Hild Bede' ? 'Catered' : 'Self-catered'],
      ['Living with', a.why === 'Asks to live with a sibling' ? 'A sibling' : 'No request'],
      ...(words ? [[`In ${firstName(a.name)}’s words`, <span className="text-gray-700">{words}</span>] as [string, ReactNode]] : []),
    ]} />
  );
}

function reqRows(a: App) {
  const st = (r: Req) => (a.toCheck?.includes(r) ? 'check' : a.reqs.includes(r) ? 'ok' : 'none');
  return [
    { r: 'Step-free access' as Req, sub: a.reqs.includes('Step-free access') ? 'Disability Support, 20 Oct' : 'Not requested', s: st('Step-free access') },
    { r: 'Medication fridge' as Req, sub: a.reqs.includes('Medication fridge') ? 'GP note, 19 Oct' : 'Not requested', s: st('Medication fridge') },
    { r: 'Year-round stay' as Req, sub: a.reqs.includes('Year-round stay') ? 'Care leaver · Student Support' : 'Not requested', s: st('Year-round stay') },
  ];
}
function ReqPill({ s, onCheck }: { s: string; onCheck?: () => void }) {
  if (s === 'ok') return <Pill tone="green">Verified</Pill>;
  if (s === 'met') return <Pill tone="green">Met</Pill>;
  if (s === 'check') return <button type="button" title="Mark as verified" onClick={onCheck}><Pill tone="amber">To check</Pill></button>;
  return <span className="text-xs text-gray-500">None</span>;
}
function Requirements({ a, onVerify }: { a: App; onVerify: (r: Req) => void }) {
  return (
    <SheetSection title="Requirements">
      {reqRows(a).map((x) => <Row key={x.r} title={x.r} sub={x.sub}><ReqPill s={x.s} onCheck={() => onVerify(x.r)} /></Row>)}
      <Row title="Age at arrival" sub={a.why === 'Under 18 at arrival' ? '17 on 19 Sep 2027 · guardian form needed' : '19 on 19 Sep 2027'}>
        {a.why === 'Under 18 at arrival' ? <Pill tone="amber">To check</Pill> : <ReqPill s="met" />}
      </Row>
    </SheetSection>
  );
}

type Doc = { name: string; meta: string; s: 'ok' | 'check' | 'missing'; req?: Req };
function docsOf(a: App): Doc[] {
  const out: Doc[] = [];
  if (stepFree(a)) out.push({ name: 'Disability Support letter', meta: `PDF · 182 KB · ${a.submitted}`, s: 'ok' });
  if (a.reqs.includes('Medication fridge')) out.push({ name: 'GP note — medication fridge', meta: 'PDF · 96 KB · 19 Oct', s: a.toCheck?.includes('Medication fridge') ? 'check' : 'ok', req: 'Medication fridge' });
  out.push({ name: 'Passport', meta: `JPG · 1.2 MB · ${a.submitted}`, s: 'ok' });
  out.push(a.tag === 'No study offer' ? { name: 'Offer letter', meta: 'Not uploaded', s: 'missing' } : { name: `Offer letter · ${a.course === '—' ? 'course' : a.course}`, meta: `PDF · 240 KB · ${a.submitted}`, s: 'ok' });
  return out;
}
function Documents({ a, onVerify }: { a: App; onVerify: (r: Req) => void }) {
  const docs = docsOf(a);
  const [view, setView] = useState<Doc | null>(null);
  return (
    <SheetSection title="Documents">
      {docs.map((x) => (
        <Row key={x.name} lead={<span className="size-8 rounded-lg bg-[#F3F4F6] text-gray-500 flex items-center justify-center shrink-0"><FileText size={16} /></span>} title={x.name} sub={x.meta}>
          {x.s === 'ok' ? <Pill tone="green">Verified</Pill> : x.s === 'check' ? <Pill tone="amber">To check</Pill> : <Pill tone="red">Missing</Pill>}
          <Button size="sm" disabled={x.s === 'missing'} onClick={() => setView(x)}>View</Button>
        </Row>
      ))}
      <Dialog open={!!view} onClose={() => setView(null)} title={view?.name ?? ''} width={560}
        footer={view && <>{view.s === 'check' && view.req && <Button variant="success" icon={ShieldCheck} onClick={() => { onVerify(view.req!); setView(null); }}>Mark verified</Button>}<Button onClick={() => setView(null)}>Close</Button></>}>
        <div className="rounded-lg border border-line bg-[#F9FAFB] h-72 flex flex-col items-center justify-center text-gray-400 gap-2"><FileText size={40} weight="duotone" /><span className="text-sm">{view?.meta}</span></div>
      </Dialog>
    </SheetSection>
  );
}

function Activity({ a }: { a: App }) {
  type E = { icon: Icon; tone: string; t: string; when: string; sub?: string };
  const items: E[] = [
    ...(a.log ?? []).map((l) => ({ icon: CheckCircle, tone: 'bg-[#E8F7EE] text-[#0B8A4C]', t: l.t, when: l.when, sub: l.sub })),
    ...(a.opened ? [{ icon: Eye, tone: 'bg-[#E6ECFF] text-[#1F45E0]', t: 'Priya Shah opened the application', when: '27 Oct, 10:42' }] : []),
    ...(a.tag ? [{ icon: MagicWand, tone: 'bg-[#F1E7FF] text-[#8B2CF5]', t: `Auto-allocate skipped ${firstName(a.name)}`, when: '22 Oct, 02:00', sub: a.tag === 'Requirements' ? 'Step-free requirement' : a.tag === 'No study offer' ? 'No study offer' : 'Flagged' }] : []),
    ...(stepFree(a) ? [{ icon: ShieldCheck, tone: 'bg-[#E8F7EE] text-[#0B8A4C]', t: 'Disability Support verified step-free access', when: '20 Oct, 15:18' }] : []),
    ...(a.reqs.includes('Medication fridge') ? [{ icon: UploadSimple, tone: 'bg-[#F3F4F6] text-gray-500', t: `${a.name} uploaded a GP note`, when: '19 Oct, 09:05' }] : []),
    { icon: Tray, tone: 'bg-[#F3F4F6] text-gray-500', t: `${a.name} submitted the application`, when: `${a.submitted}, 21:37` },
  ];
  return (
    <SheetSection title="Activity">
      <ol>
        {items.map((e, i) => (
          <li key={i} className="flex gap-3 pb-4 last:pb-0 relative">
            {i < items.length - 1 && <span className="absolute left-[11px] top-7 bottom-0 w-px bg-line" />}
            <span className={cx('size-6 rounded-full flex items-center justify-center shrink-0', e.tone)}><e.icon size={12} /></span>
            <div className="min-w-0">
              <div className="text-sm text-ink">{e.t}</div>
              <div className="text-xs text-gray-500 mt-0.5">{e.when}{e.sub ? ` · ${e.sub}` : ''}</div>
            </div>
          </li>
        ))}
      </ol>
    </SheetSection>
  );
}
