import { useRef, useState, type ReactNode } from 'react';
import { useSearchParams } from 'react-router-dom';
import { ChatCenteredText, CheckCircle, ClipboardText, Eye, Info, LinkSimple, XCircle } from '../../components/icons';
import { toast } from 'sonner';
import { Button, listNav, Empty, PageHeader, SearchInput, Sheet, SheetHero, SheetSection, Status, Table, Tabs } from '../../components/ui';
import { useOpen, useTab } from '../hooks';
import { SIGNUP_LINK, stamp, useOc, type LandlordApp, type LandlordStatus } from '../../data/offcampus';
import { EmptyArt, NoteDialog, ODialog, RowLink, Tag, Title } from './parts';

type TabId = 'all' | 'submitted' | 'awaiting' | 'approved' | 'rejected' | 'suspended';
const TABS: { id: TabId; label: string; status?: LandlordStatus }[] = [
  { id: 'all', label: 'All' }, { id: 'submitted', label: 'Submitted', status: 'Submitted' }, { id: 'awaiting', label: 'Awaiting info', status: 'Awaiting info' },
  { id: 'approved', label: 'Approved', status: 'Approved' }, { id: 'rejected', label: 'Rejected', status: 'Rejected' }, { id: 'suspended', label: 'Suspended', status: 'Suspended' },
];

export function Landlords() {
  const all = useOc((s) => s.landlords);
  const set = useOc((s) => s.set);
  const [sp] = useSearchParams();
  const demoEmpty = sp.get('demo') === 'empty';
  const rows0 = demoEmpty ? [] : all;
  const [tab, setTab] = useTab<TabId>('submitted');
  const [open, setOpen] = useOpen();
  const [q, setQ] = useState('');
  const [dlg, setDlg] = useState<'info' | 'approve' | 'reject' | null>(null);
  const busy = useRef(false);
  const sel = all.find((l) => l.id === open);

  const st = TABS.find((t) => t.id === tab)?.status;
  const t = q.trim().toLowerCase();
  const rows = rows0.filter((l) => (!st || l.status === st) && (!t || `${l.name} ${l.email}`.toLowerCase().includes(t)));

  const patch = (id: string, p: Partial<LandlordApp>) => set('landlords', (ls) => ls.map((x) => (x.id === id ? { ...x, ...p } : x)));
  const guard = (fn: () => void) => { if (busy.current) return; busy.current = true; fn(); setTimeout(() => { busy.current = false; }, 400); };

  const requestInfo = (l: LandlordApp, note: string) => guard(() => {
    patch(l.id, { status: 'Awaiting info', lastNote: note, reviewed: stamp() });
    setDlg(null); setOpen(null); setTab('awaiting');
    toast.success('Request sent', { description: `${l.name} was emailed your note.` });
  });
  /* Undo puts back this one application as it was; the email waits until the toast closes. */
  const undoFor = (l: LandlordApp) => () => { set('landlords', (ls) => ls.map((x) => (x.id === l.id ? l : x))); setTab(TABS.find((x) => x.status === l.status)?.id ?? 'all'); };
  const approve = (l: LandlordApp) => guard(() => {
    patch(l.id, { status: 'Approved', reviewed: stamp() });
    setDlg(null); setOpen(null); setTab('approved');
    toast.success('Landlord approved', { description: 'Their invite to the landlord portal goes when this closes.', duration: 8000, action: { label: 'Undo', onClick: undoFor(l) } });
  });
  const reject = (l: LandlordApp, note: string) => guard(() => {
    patch(l.id, { status: 'Rejected', lastNote: note, reviewed: stamp() });
    setDlg(null); setOpen(null); setTab('rejected');
    toast.success('Application rejected', { description: 'Your reason is emailed to the landlord when this closes.', duration: 8000, action: { label: 'Undo', onClick: undoFor(l) } });
  });
  const simulateReply = (l: LandlordApp) => {
    patch(l.id, { portfolio: 5, areas: [...l.areas.filter((a) => a !== 'Claypath'), 'Claypath'], updated: true });
    toast.success(`${l.name} updated their application`, { description: 'Portfolio is now 5 properties.' });
  };

  /* Every tab shows its count, selected or not, as on the other filter tabs. */
  const counted = (id: TabId) => { const st = TABS.find((x) => x.id === id)?.status; return rows0.filter((l) => !st || l.status === st).length; };

  return (
    <>
      <PageHeader icon={ClipboardText} crumbs={['Off-campus']} title="Landlord applications" />
      <div className="flex-1 min-h-0 flex flex-col">
        <Title title="Landlord applications" />
        <div className="px-[var(--tx,16px)] pt-6 pb-4 flex items-center gap-3">
          <Tabs value={tab} onChange={setTab} tabs={TABS.map((x) => ({ id: x.id, label: x.label, count: counted(x.id) }))} />
          <div className="ml-auto w-[320px] min-w-[140px] shrink [&>label]:!w-full"><SearchInput value={q} onChange={setQ} placeholder="Search name or email" /></div>
        </div>
        {!rows0.length ? <NoLandlords /> : (
          <Table fill rows={rows} onRow={(l) => setOpen(l.id)} selected={open ?? undefined}
            footer={false}
            empty={q
              ? <Empty title="No landlord matches that search" sub="Try another name or clear the search." />
              : <Empty icon={ClipboardText} title={`No ${TABS.find((x) => x.id === tab)?.label.toLowerCase()} applications`} sub="Try another tab." />}
            cols={[
              { key: 'n', label: 'Landlord', render: (l) => <div className="leading-tight"><div className="text-sm font-medium text-ink">{l.name}</div><div className="text-xs text-gray-500">{l.email}</div></div> },
              { key: 'p', label: 'Portfolio', render: (l) => <div className="leading-tight"><div className="text-sm font-medium">{l.portfolio} {l.portfolio === 1 ? 'property' : 'properties'}</div><div className="text-xs text-gray-500">{l.areas.join(', ')}</div></div> },
              { key: 'a', label: 'Applied', render: (l) => <span className="text-gray-500">{l.applied}</span> },
              { key: 's', label: 'Status', render: (l) => <LStatus s={l.status} /> },
              { key: 'x', label: '', className: 'text-right w-32', render: (l) => <RowLink onClick={() => setOpen(l.id)} /> },
            ]} />
        )}
      </div>

      <Sheet open={!!sel} onClose={() => setOpen(null)} width={560} title="Landlord application" nav={listNav(rows, (l) => l.id === open, (l) => setOpen(l.id))}
        footer={sel && (sel.status === 'Submitted' || sel.status === 'Awaiting info') && (
          <>
            <Button variant="danger-ghost" className="mr-auto" onClick={() => setDlg('reject')}>Reject</Button>
            {sel.status === 'Submitted' && <Button onClick={() => setDlg('info')}>Request more information</Button>}
            <Button variant="primary" onClick={() => setDlg('approve')}>Approve</Button>
          </>
        )}>
        {sel && (
          <>
            <SheetHero name={sel.name} meta={sel.company ?? sel.entity}>
              <LStatus s={sel.status} />
              {sel.otherPortals > 0 && <Tag tone="grey" outline>On {sel.otherPortals} other {sel.otherPortals === 1 ? 'portal' : 'portals'}</Tag>}
            </SheetHero>
            {sel.lastNote && (
              <div className={`mb-5 rounded-lg border px-3.5 py-2.5 flex gap-2.5 text-sm ${sel.status === 'Rejected' || sel.status === 'Suspended' ? 'border-[#E0243A]/30 text-[#E0243A]' : 'border-[#2B5CFF]/30 text-[#1F45E0]'}`}>
                <Info size={16} className="shrink-0 mt-px" /><span>Last decision: {sel.lastNote}</span>
              </div>
            )}
            {sel.status === 'Awaiting info' && !sel.updated && (
              <div className="mb-5 rounded-lg border border-dashed border-gray-300 p-3 text-sm text-gray-500 flex items-center gap-3">
                <span className="flex-1">Waiting for {sel.name.split(' ')[0]} to update their profile.</span>
                <Button size="sm" onClick={() => simulateReply(sel)}>Simulate reply</Button>
              </div>
            )}
            <SheetSection title="Contact" rows={[['Email', sel.email], ['Phone', sel.phone]]} />
            <SheetSection title="Portfolio" rows={[
              ['Entity', sel.entity],
              ...(sel.company ? [['Company', sel.company] as [string, string]] : []),
              ['Properties', String(sel.portfolio)], ['Areas', sel.areas.join(', ')],
              ...(sel.website ? [['Website', <a key="w" href={`https://${sel.website}`} target="_blank" rel="noreferrer" className="font-medium text-primary hover:underline">{sel.website}</a>] as [string, ReactNode]] : []),
            ]} />
            <SheetSection title="Application" rows={[['Submitted', sel.submitted], ['Reviewed', sel.reviewed ?? '—'], ['Heard about us', sel.heard]]} />
          </>
        )}
      </Sheet>

      <NoteDialog open={dlg === 'info' && !!sel} onClose={() => setDlg(null)} icon={ChatCenteredText} title="Request more information"
        sub="Your message is emailed to the landlord. Their reply arrives as an updated application." label="What do you need from them?"
        initial="Your website also lists flats in Newcastle. Which of your properties are in Durham, and how many bedrooms does each have?"
        submit="Send request" onSubmit={(n) => sel && requestInfo(sel, n)} />
      <NoteDialog open={dlg === 'reject' && !!sel} onClose={() => setDlg(null)} icon={XCircle} danger title="Reject this application"
        sub="Your reason is emailed to the landlord. They can apply again later." label="Why are you rejecting it?" placeholder="e.g. None of the properties are in Durham."
        submit="Reject" onSubmit={(n) => sel && reject(sel, n)} />
      <ODialog open={dlg === 'approve' && !!sel} onClose={() => setDlg(null)} icon={CheckCircle} tone="green" title="Approve this landlord"
        sub="They will be invited to the landlord portal and can submit properties to you."
        footer={<><Button onClick={() => setDlg(null)}>Cancel</Button><Button variant="primary" onClick={() => sel && approve(sel)}>Approve</Button></>} />
    </>
  );
}

export function LStatus({ s }: { s: LandlordStatus }) {
  if (s === 'Approved') return <Tag tone="green">Approved</Tag>;
  if (s === 'Suspended') return <Tag tone="red">Suspended</Tag>;
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
      <div className="font-semibold mt-5">No landlord applications yet</div>
      <p className="text-sm text-gray-500 mt-1 max-w-[430px]">Landlords apply through your sign-up link.</p>
      <div className="mt-4 flex gap-2">
        <Button variant="primary" icon={LinkSimple} onClick={copy}>Copy sign-up link</Button>
        <Button icon={Eye} onClick={() => window.open(SIGNUP_LINK, '_blank', 'noopener')}>Preview the sign-up page</Button>
      </div>
    </div>
  );
}
