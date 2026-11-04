import { useRef, useState, type ReactNode } from 'react';
import { useSearchParams } from 'react-router-dom';
import { ChatCenteredText, CheckCircle, ClipboardText, Eye, Info, LinkSimple, Package, Warning, XCircle } from '../../components/icons';
import { toast } from 'sonner';
import { Button, DL, Empty, PageHeader, SearchInput, Sheet, Status, Table, Tabs } from '../../components/ui';
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
  const approve = (l: LandlordApp) => guard(() => {
    patch(l.id, { status: 'Approved', applied: 'Just now', reviewed: stamp() });
    setDlg(null); setOpen(null); setTab('approved');
    toast.success('Landlord approved', { description: 'They were invited to the landlord portal.' });
  });
  const reject = (l: LandlordApp, note: string) => guard(() => {
    patch(l.id, { status: 'Rejected', lastNote: note, reviewed: stamp() });
    setDlg(null); setOpen(null); setTab('rejected');
    toast.success('Application rejected', { description: 'The reason was emailed to the landlord.' });
  });
  const simulateReply = (l: LandlordApp) => {
    patch(l.id, { portfolio: 5, areas: [...l.areas.filter((a) => a !== 'Claypath'), 'Claypath'], updated: true });
    toast.success(`${l.name} updated his application`, { description: 'Portfolio is now 5 properties.' });
  };

  /* Every tab shows its count, selected or not, as on the other filter tabs. */
  const counted = (id: TabId) => { const st = TABS.find((x) => x.id === id)?.status; return rows0.filter((l) => !st || l.status === st).length; };

  return (
    <>
      <PageHeader icon={ClipboardText} crumbs={['Off-campus']} title="Landlord applications" />
      <div className="flex-1 min-h-0 flex flex-col">
        <Title title="Landlord applications" sub="Landlords who applied to list on your off-campus site." />
        <div className="px-6 pb-3 flex items-center gap-3 border-b border-line">
          <Tabs value={tab} onChange={setTab} tabs={TABS.map((x) => ({ id: x.id, label: x.label, count: counted(x.id) }))} />
          <div className="ml-auto w-[260px] [&>label]:!w-full"><SearchInput value={q} onChange={setQ} placeholder="Search name or email" /></div>
        </div>
        {!rows0.length ? <NoLandlords /> : (
          <Table rows={rows} onRow={(l) => setOpen(l.id)} selected={open ?? undefined}
            summary={`${rows.length} ${rows.length === 1 ? 'application' : 'applications'}`}
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

      <Sheet open={!!sel} onClose={() => setOpen(null)} width={600} title={sel?.name} sub={sel && `Applied ${sel.submitted}`}
        footer={sel && (sel.status === 'Submitted' || sel.status === 'Awaiting info') && (
          <>
            <Button className="!text-[#E0243A]" onClick={() => setDlg('reject')}>Reject</Button>
            {sel.status === 'Submitted' && <Button onClick={() => setDlg('info')}>Request more information</Button>}
            <Button variant="primary" onClick={() => setDlg('approve')}>Approve</Button>
          </>
        )}>
        {sel && (
          <div className="space-y-5 p-1">
            <div className="flex items-center gap-2 flex-wrap">
              <LStatus s={sel.status} />
              {sel.otherPortals > 0 && <Tag tone="grey" outline>Already a landlord on {sel.otherPortals} other {sel.otherPortals === 1 ? 'portal' : 'portals'}</Tag>}
            </div>
            {sel.lastNote && (
              <div className={`rounded-lg border px-3.5 py-2.5 flex gap-2.5 text-sm ${sel.status === 'Rejected' || sel.status === 'Suspended' ? 'border-[#E0243A]/30 text-[#E0243A]' : 'border-[#2B5CFF]/30 text-[#1F45E0]'}`}>
                <Info size={16} className="shrink-0 mt-px" /><span>Last decision: {sel.lastNote}</span>
              </div>
            )}
            <div className="[&_dl]:grid-cols-[150px_1fr] [&_dl]:gap-y-4 [&_dd]:text-sm [&_dt]:text-sm [&_dt]:text-gray-500">
              <DL rows={[
                ['Email', sel.email], ['Phone', sel.phone], ['Entity', sel.entity],
                ...(sel.company ? [['Company', sel.company] as [string, string]] : []),
                ['Portfolio size', String(sel.portfolio)], ['Coverage areas', sel.areas.join(', ')],
                ...(sel.website ? [['Website', <a key="w" href={`https://${sel.website}`} target="_blank" rel="noreferrer" className="font-medium text-primary hover:underline">{sel.website}</a>] as [string, ReactNode]] : []),
                ['Heard about us', sel.heard], ['Submitted', sel.submitted], ['Reviewed', sel.reviewed ?? '—'],
              ]} />
            </div>
            {sel.status === 'Awaiting info' && !sel.updated && (
              <div className="rounded-lg border border-dashed border-gray-300 p-3 text-sm text-gray-500 flex items-center gap-3">
                <span className="flex-1">Waiting for {sel.name.split(' ')[0]} to update his profile in the landlord portal.</span>
                <Button size="sm" onClick={() => simulateReply(sel)}>Simulate his reply</Button>
              </div>
            )}
          </div>
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
  if (s === 'Suspended') return <Tag tone="red" icon={Warning}>Suspended</Tag>;
  return <Status s={s} />;
}

function NoLandlords() {
  const copy = () => {
    navigator.clipboard?.writeText(SIGNUP_LINK).catch(() => undefined);
    toast.success('Sign-up link copied', { description: SIGNUP_LINK });
  };
  return (
    <div className="flex-1 flex flex-col items-center justify-center text-center px-6 py-16">
      <EmptyArt icon={Package} accent={<span className="size-6 rounded-md bg-[#F59E0B] text-white text-sm font-bold flex items-center justify-center">!</span>} />
      <div className="font-semibold mt-5">No landlord applications yet</div>
      <p className="text-sm text-gray-500 mt-1 max-w-[430px]">Landlords apply through the sign-up link. You approve them before they can list a house.</p>
      <div className="mt-4 flex gap-2">
        <Button variant="primary" icon={LinkSimple} onClick={copy}>Copy sign-up link</Button>
        <Button icon={Eye} onClick={() => window.open(SIGNUP_LINK, '_blank', 'noopener')}>Preview the sign-up page</Button>
      </div>
    </div>
  );
}
