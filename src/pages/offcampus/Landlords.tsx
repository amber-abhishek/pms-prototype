import { useEffect, useRef, useState, type ReactNode } from 'react';
import { useSearchParams } from 'react-router-dom';
import { ArrowCounterClockwise, ChatCenteredText, CheckCircle, ClipboardText, Eye, Hourglass, Info, LinkSimple, Pause, XCircle } from '../../components/icons';
import { toast } from 'sonner';
import { Avatar, Button, listNav, Empty, MultiFilter, Note, PageHeader, Pill, SearchInput, Sheet, SheetHero, SheetRow, SheetSection, Status, Table } from '../../components/ui';
import { LineTabs } from '../inventory/common';
import { useOpen, useTab } from '../hooks';
import { SIGNUP_LINK, stamp, useOc, type LandlordApp, type LandlordStatus } from '../../data/offcampus';
import { Checkbox } from '../../components/shadcn/checkbox';
import type { Tone } from '../../data/seed';
import { BulkAction, BulkBar, EmptyArt, NoteDialog, ODialog, QueueToolbar, Tag, Title, WHEN, whenOf } from './parts';

/* Approvals V3 (Figma 4159:17532, 2026-11-23): Needs action (to review) / All, plus Status and Applied filters. */
const STATUSES: { value: LandlordStatus; label: string; tone: Tone }[] = [
  { value: 'Submitted', label: 'To review', tone: 'blue' }, { value: 'Awaiting info', label: 'Waiting on owner', tone: 'amber' },
  { value: 'Approved', label: 'Approved', tone: 'green' }, { value: 'Rejected', label: 'Rejected', tone: 'red' }, { value: 'Suspended', label: 'Inactive', tone: 'grey' },
];

/** `bare`: rendered inside Approvals, which owns the page header and the Owners / Listings tabs. */
export function Landlords({ bare }: { bare?: boolean } = {}) {
  const all = useOc((s) => s.landlords);
  const set = useOc((s) => s.set);
  const [sp] = useSearchParams();
  const demoEmpty = sp.get('demo') === 'empty';
  const rows0 = demoEmpty ? [] : all;
  const [tabParam, setTabParam] = useTab<string>('needs');
  const view: 'needs' | 'all' = tabParam === 'all' ? 'all' : 'needs';
  const [statusF, setStatusF] = useState<string[]>([]);
  const [whenF, setWhenF] = useState<string[]>([]);
  /* After a decision the row leaves Needs action, so show everything to keep it in view. */
  const showAll = () => { setTabParam('all'); setStatusF([]); setWhenF([]); };
  const [open, setOpen] = useOpen();
  const [q, setQ] = useState('');
  const [dlg, setDlg] = useState<'info' | 'approve' | 'reject' | 'deactivate' | null>(null);
  const busy = useRef(false);
  const sel = all.find((l) => l.id === open);
  /* Ticked rows; a new tab or search starts a fresh selection. */
  const [ticked, setTicked] = useState<string[]>([]);
  useEffect(() => setTicked([]), [view, statusF, whenF, q]);

  const t = q.trim().toLowerCase();
  const rows = rows0.filter((l) => (view === 'all' || l.status === 'Submitted') && (!statusF.length || statusF.includes(l.status))
    && (!whenF.length || whenF.includes(whenOf(l.applied))) && (!t || `${l.name} ${l.email}`.toLowerCase().includes(t)));

  const patch = (id: string, p: Partial<LandlordApp>) => set('landlords', (ls) => ls.map((x) => (x.id === id ? { ...x, ...p } : x)));
  const guard = (fn: () => void) => { if (busy.current) return; busy.current = true; fn(); setTimeout(() => { busy.current = false; }, 400); };

  const requestInfo = (l: LandlordApp, note: string) => guard(() => {
    patch(l.id, { status: 'Awaiting info', lastNote: note, reviewed: stamp() });
    setDlg(null); setOpen(null); showAll();
    toast.success('Request sent', { description: `${l.name} was emailed your note.` });
  });
  /* Undo puts back this one application as it was; the email waits until the toast closes. */
  const undoFor = (l: LandlordApp) => () => { set('landlords', (ls) => ls.map((x) => (x.id === l.id ? l : x))); showAll(); };
  const approve = (l: LandlordApp) => guard(() => {
    patch(l.id, { status: 'Approved', reviewed: stamp() });
    setDlg(null); setOpen(null); showAll();
    toast.success('Owner approved', { description: 'Their invite to the owner portal goes when this closes.', duration: 8000, action: { label: 'Undo', onClick: undoFor(l) } });
  });
  const reject = (l: LandlordApp, note: string) => guard(() => {
    patch(l.id, { status: 'Rejected', lastNote: note, reviewed: stamp() });
    setDlg(null); setOpen(null); showAll();
    toast.success('Application rejected', { description: 'Your reason is emailed to the owner when this closes.', duration: 8000, action: { label: 'Undo', onClick: undoFor(l) } });
  });
  /* An approved owner can be switched off (their houses leave the resident site) and back on; both undo. */
  const deactivate = (l: LandlordApp, note: string) => guard(() => {
    const before = useOc.getState().hmos;
    patch(l.id, { status: 'Suspended', lastNote: note, reviewed: stamp() });
    /* Their live houses go inactive with the owner ("Inactive · owner is inactive" on Owner listings). */
    set('hmos', (hs) => hs.map((h) => (h.landlord === l.name && h.status === 'Active' ? { ...h, status: 'Paused' as const, pausedBy: 'revoked' as const } : h)));
    setDlg(null); setOpen(null); showAll();
    toast.success('Owner made inactive', { description: 'Their houses are off the resident site until you reactivate them.', duration: 8000, action: { label: 'Undo', onClick: () => { undoFor(l)(); set('hmos', () => before); } } });
  });
  const reactivate = (l: LandlordApp) => guard(() => {
    const before = useOc.getState().hmos;
    patch(l.id, { status: 'Approved', lastNote: undefined, reviewed: stamp() });
    set('hmos', (hs) => hs.map((h) => (h.landlord === l.name && h.pausedBy === 'revoked' ? { ...h, status: 'Active' as const, pausedBy: undefined } : h)));
    setOpen(null); showAll();
    toast.success('Owner reactivated', { description: 'Their houses are back on the resident site.', duration: 8000, action: { label: 'Undo', onClick: () => { undoFor(l)(); set('hmos', () => before); } } });
  });
  const simulateReply = (l: LandlordApp) => {
    patch(l.id, { portfolio: 5, areas: [...l.areas.filter((a) => a !== 'Claypath'), 'Claypath'], updated: true });
    toast.success(`${l.name} updated their application`, { description: 'Portfolio is now 5 properties.' });
  };

  /* Bulk approve takes the ticked applications still waiting on a decision; one Undo puts them all back. */
  const pending = (l: LandlordApp) => l.status === 'Submitted' || l.status === 'Awaiting info';
  const approvable = ticked.map((id) => all.find((x) => x.id === id)).filter((l): l is LandlordApp => !!l && pending(l));
  const bulkApprove = () => guard(() => {
    const before = approvable;
    const ids = new Set(before.map((l) => l.id));
    const at = stamp();
    set('landlords', (ls) => ls.map((x) => (ids.has(x.id) ? { ...x, status: 'Approved' as const, reviewed: at } : x)));
    setTicked([]);
    toast.success(`${before.length} ${before.length === 1 ? 'owner' : 'owners'} approved`, { description: before.length === 1 ? 'Their invite to the owner portal goes when this closes.' : 'Their invites to the owner portal go when this closes.', duration: 8000,
      action: { label: 'Undo', onClick: () => set('landlords', (ls) => ls.map((x) => before.find((b) => b.id === x.id) ?? x)) } });
  });
  const allTicked = rows.length > 0 && rows.every((l) => ticked.includes(l.id));
  const someTicked = rows.some((l) => ticked.includes(l.id));

  const search = <SearchInput value={q} onChange={setQ} placeholder="Search name or email" />;

  return (
    <>
      {!bare && <PageHeader icon={ClipboardText} crumbs={['Off-campus']} title="Owner applications" />}
      <div className="flex-1 min-h-0 flex flex-col relative">
        {!bare && <Title title="Owner applications" />}
        {rows0.length > 0 && <QueueToolbar search={search} view={view} onView={(v) => setTabParam(v)}
          needs={rows0.filter((l) => l.status === 'Submitted').length} all={rows0.length}
          filters={<>
            <MultiFilter label="Status" value={statusF} onChange={setStatusF} width={220} options={STATUSES} />
            <MultiFilter label="Applied" value={whenF} onChange={setWhenF} options={WHEN.map((w) => ({ value: w }))} />
          </>} />}
        {!rows0.length ? <NoLandlords /> : (
          <Table fill rows={rows} onRow={(l) => setOpen(l.id)} selected={open ?? undefined}
            footer={false}
            empty={q
              ? <Empty title="No owner matches that search" sub="Try another name or clear the search." />
              : view === 'needs' && !statusF.length && !whenF.length ? <Empty art="queueClear" title="Nothing to review" sub="New applications land here." />
              : <Empty icon={ClipboardText} title="No applications match these filters" sub="Clear a filter to see more." />}
            cols={[
              { key: 'sel', label: <Checkbox aria-label="Select all" checked={allTicked ? true : someTicked ? 'indeterminate' : false} onCheckedChange={(v) => setTicked(v === true ? rows.map((l) => l.id) : [])} />, className: 'w-12',
                render: (l) => <span onClick={(e) => e.stopPropagation()} className="inline-flex"><Checkbox aria-label={`Select ${l.name}`} checked={ticked.includes(l.id)} onCheckedChange={(v) => setTicked((ts) => (v === true ? [...ts, l.id] : ts.filter((x) => x !== l.id)))} /></span> },
              { key: 'n', label: 'Owner', render: (l) => <div className="flex items-center gap-3 min-w-0"><Avatar name={l.name} size={24} /><div className="leading-tight min-w-0"><div className="text-sm font-medium text-ink truncate">{l.name}</div><div className="text-xs text-gray-500 truncate">{l.email}</div></div></div> },
              { key: 'p', label: 'Portfolio', render: (l) => <div className="leading-tight"><div className="text-sm font-medium">{l.portfolio} {l.portfolio === 1 ? 'property' : 'properties'}</div><div className="text-xs text-gray-500">{l.areas.join(', ')}</div></div> },
              { key: 'a', label: 'Applied', render: (l) => <span className="text-gray-500">{l.applied}</span> },
              { key: 's', label: 'Status', render: (l) => <LStatus s={l.status} /> },
            ]} />
        )}
        <BulkBar count={ticked.length} onClear={() => setTicked([])}>
          {approvable.length > 0 && <BulkAction onClick={bulkApprove}>Approve {approvable.length}</BulkAction>}
        </BulkBar>
      </div>

      <Sheet open={!!sel} onClose={() => setOpen(null)} width={520} title="Owner application" nav={listNav(rows, (l) => l.id === open, (l) => setOpen(l.id))}
        onDelete={sel && (sel.status === 'Submitted' || sel.status === 'Awaiting info') ? { label: 'Reject application', icon: XCircle, onClick: () => setDlg('reject') } : undefined}
        footer={sel?.status === 'Approved' ? <Button icon={Pause} className="ml-auto" onClick={() => setDlg('deactivate')}>Make inactive</Button>
          : sel?.status === 'Suspended' ? <Button variant="primary" icon={ArrowCounterClockwise} className="ml-auto" onClick={() => reactivate(sel)}>Reactivate</Button>
          : sel && (sel.status === 'Submitted' || sel.status === 'Awaiting info') && (
          <>
            {sel.status === 'Submitted' && <Button icon={ChatCenteredText} className="ml-auto" onClick={() => setDlg('info')}>Request info</Button>}
            <Button variant="primary" icon={CheckCircle} className={sel.status === 'Submitted' ? undefined : 'ml-auto'} onClick={() => setDlg('approve')}>Approve</Button>
          </>
        )}>
        {sel && <LandlordDetail l={sel} onSimulateReply={() => simulateReply(sel)} />}
      </Sheet>

      <NoteDialog open={dlg === 'info' && !!sel} onClose={() => setDlg(null)} icon={ChatCenteredText} title="Request more information"
        sub="Your message is emailed to the owner. Their reply arrives as an updated application." label="What do you need from them?"
        initial="Your website also lists flats in Newcastle. Which of your properties are in Durham, and how many bedrooms does each have?"
        submit="Send request" onSubmit={(n) => sel && requestInfo(sel, n)} />
      <NoteDialog open={dlg === 'reject' && !!sel} onClose={() => setDlg(null)} icon={XCircle} danger title="Reject this application"
        sub="Your reason is emailed to the owner. They can apply again later." label="Why are you rejecting it?" placeholder="e.g. None of the properties are in Durham."
        submit="Reject" onSubmit={(n) => sel && reject(sel, n)} />
      <NoteDialog open={dlg === 'deactivate' && !!sel} onClose={() => setDlg(null)} icon={Pause} title="Make this owner inactive"
        sub="Their houses come off the resident site and they can’t submit new ones. You can reactivate them later." label="Why? (emailed to the owner)" placeholder="e.g. Gas safety certificate has lapsed."
        submit="Make inactive" onSubmit={(n) => sel && deactivate(sel, n)} />
      <ODialog confirm open={dlg === 'approve' && !!sel} onClose={() => setDlg(null)} icon={CheckCircle} tone="green" title="Approve this owner"
        sub="They will be invited to the owner portal and can submit properties to you."
        footer={<><Button onClick={() => setDlg(null)}>Cancel</Button><Button variant="primary" onClick={() => sel && approve(sel)}>Approve</Button></>} />
    </>
  );
}

/* Owner application panel (Figma "Side panel · Owner" 4073:17182): Overview, Documents, Activity. */
const day = (stampText: string) => stampText.split(',')[0].replace(/ \d{4}$/, '');
/** Prototype dummy documents per application, stable by id; the backend sends the real uploads later. */
function landlordDocs(l: LandlordApp) {
  const on = day(l.submitted);
  const h = [...l.id].reduce((n, c) => n + c.charCodeAt(0), 0);
  const docs = l.entity === 'Company'
    ? [{ name: 'Company registration', sub: `PDF · ${on}`, state: 'Checked' }, { name: 'Property insurance', sub: `PDF · ${on}`, state: 'Checked' }, { name: 'Gas safety certificate', sub: h % 2 ? 'PDF · expires 2 Dec' : `PDF · ${on}`, state: h % 2 ? 'Expiring' : 'Checked' }]
    : [{ name: 'Photo ID', sub: `PDF · ${on}`, state: 'Checked' }, { name: 'Proof of address', sub: `PDF · ${on}`, state: 'Checked' }, { name: 'Property insurance', sub: h % 2 ? 'PDF · expires 2 Dec' : `PDF · ${on}`, state: h % 2 ? 'Expiring' : 'Checked' }];
  return l.status === 'Submitted' ? docs.map((d) => (d.state === 'Checked' ? { ...d, state: 'To check' } : d)) : docs;
}
const DOC_TONE = { Checked: 'green', 'To check': 'grey', Expiring: 'orange' } as const;

function LandlordDetail({ l, onSimulateReply }: { l: LandlordApp; onSimulateReply: () => void }) {
  const [tab, setTab] = useState<'overview' | 'documents' | 'activity'>('overview');
  useEffect(() => setTab('overview'), [l.id]);
  const pending = l.status === 'Submitted' || l.status === 'Awaiting info';
  const docs = landlordDocs(l);
  const areas = l.areas.length > 1 ? `${l.areas[0]} +${l.areas.length - 1}` : l.areas[0] ?? '—';
  const activity: { who: string; t: string; when: string }[] = [
    ...(l.reviewed ? [{ who: 'Arjun Mehta', t: l.status === 'Approved' ? 'Arjun Mehta approved the application' : l.status === 'Rejected' ? 'Arjun Mehta rejected the application' : l.status === 'Suspended' ? 'Arjun Mehta made the owner inactive' : 'Arjun Mehta asked for more information', when: day(l.reviewed) }] : []),
    ...(l.updated ? [{ who: l.name, t: `${l.name} updated their application`, when: 'Today' }] : []),
    ...(pending && !l.reviewed ? [{ who: 'System', t: 'Reminder sent to review the application', when: 'Today' }] : []),
    { who: l.name, t: `${l.name} uploaded ${docs.length} documents`, when: day(l.submitted) },
    { who: l.name, t: `${l.name} submitted the application`, when: day(l.submitted) },
  ];
  return (
    <>
      <SheetHero name={l.name} meta={`${l.company ?? l.entity} · Submitted ${day(l.submitted)}`}
        facts={[['Properties', String(l.portfolio)], ['Areas', areas], pending ? ['Waiting', l.applied.replace(/ ago$/, ''), 'amber'] : ['Applied', l.applied]]}>
        <LStatus s={l.status} />
        {l.otherPortals > 0 && <Tag tone="grey" outline>On {l.otherPortals} other {l.otherPortals === 1 ? 'portal' : 'portals'}</Tag>}
      </SheetHero>
      <div className="-mx-5 mb-5">
        <LineTabs value={tab} onChange={setTab} tabs={[{ id: 'overview', label: 'Overview' }, { id: 'documents', label: 'Documents' }, { id: 'activity', label: 'Activity' }]} />
      </div>
      {tab === 'overview' && <>
        {(l.lastNote || (l.status === 'Awaiting info' && !l.updated)) && (
          <div className="mb-3 space-y-2">
            {l.lastNote && <Note tone={l.status === 'Rejected' || l.status === 'Suspended' ? 'red' : 'grey'} icon={Info} title="Last decision">{l.lastNote}</Note>}
            {l.status === 'Awaiting info' && !l.updated && (
              <Note tone="grey" icon={Hourglass} title={`Waiting for ${l.name.split(' ')[0]} to update their profile`}>
                <div className="mt-2"><Button size="sm" icon={null} onClick={onSimulateReply}>Simulate reply</Button></div>
              </Note>
            )}
          </div>
        )}
        <SheetSection title="Contact" rows={[['Email', l.email], ['Phone', l.phone]]} />
        <SheetSection title="Portfolio" rows={[
          ['Entity', l.entity],
          ...(l.company ? [['Company', l.company] as [string, string]] : []),
          ['Properties', String(l.portfolio)], ['Areas', l.areas.join(', ')],
          ...(l.website ? [['Website', <a key="w" href={`https://${l.website}`} target="_blank" rel="noreferrer" className="text-primary hover:underline">{l.website}</a>] as [string, ReactNode]] : []),
        ]} />
        <SheetSection title="Application" rows={[['Submitted', l.submitted], ['Reviewed', l.reviewed ?? 'Not yet'], ['Heard about us', l.heard]]} />
      </>}
      {tab === 'documents' && (
        <SheetSection title={`Documents · ${docs.length}`}>
          {docs.map((d) => <SheetRow key={d.name} title={d.name} sub={d.sub} end={<Pill tone={DOC_TONE[d.state as keyof typeof DOC_TONE]}>{d.state}</Pill>} />)}
        </SheetSection>
      )}
      {tab === 'activity' && (
        <SheetSection title="Activity">
          {activity.map((a, i) => <SheetRow key={i} lead={<Avatar name={a.who} size={24} />} title={a.t} sub={a.when} />)}
        </SheetSection>
      )}
    </>
  );
}

export function LStatus({ s }: { s: LandlordStatus }) {
  if (s === 'Approved') return <Tag tone="green">Approved</Tag>;
  /* Shared wording (2026-11-23): To review = your move; Waiting on owner = their move; Inactive = switched off, can come back. */
  if (s === 'Submitted') return <Tag tone="blue">To review</Tag>;
  if (s === 'Awaiting info') return <Tag tone="amber">Waiting on owner</Tag>;
  if (s === 'Suspended') return <Status s="Inactive" />;
  return <Status s={s} />;
}

function NoLandlords() {
  const copy = () => {
    navigator.clipboard?.writeText(SIGNUP_LINK).catch(() => undefined);
    toast.success('Sign-up link copied', { description: SIGNUP_LINK });
  };
  return (
    <div className="flex-1 flex flex-col items-center justify-center text-center px-6 py-16">
      <EmptyArt art="landlords" />
      <div className="text-base leading-6 font-medium mt-5">No owner applications yet</div>
      <p className="text-sm text-gray-500 mt-1 max-w-[430px]">Owners apply through your sign-up link.</p>
      <div className="mt-4 flex gap-2">
        <Button variant="primary" icon={LinkSimple} onClick={copy}>Copy sign-up link</Button>
        <Button icon={Eye} onClick={() => window.open(SIGNUP_LINK, '_blank', 'noopener')}>Preview the sign-up page</Button>
      </div>
    </div>
  );
}
