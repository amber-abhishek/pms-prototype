import { useEffect, useRef, useState } from 'react';
import { ChatCenteredText, CheckCircle, FileMagnifyingGlass, Hourglass, Warning, XCircle } from '../../components/icons';
import { toast } from 'sonner';
import { Button, PageHeader, Sheet, Tabs, cx } from '../../components/ui';
import { Checkbox } from '../../components/shadcn/checkbox';
import { useOpen, useTab } from '../hooks';
import { useOc, type Review, type ReviewStatus } from '../../data/offcampus';
import { BulkBar, NoteDialog, ODialog, RowLink, Tag, Thumb, Title } from './parts';
import { rowAttrs, useRowMotion } from '../../components/rowMotion';

type TabId = 'all' | 'review' | 'changes' | 'rejected';
const TABS: { id: TabId; label: string; status?: ReviewStatus }[] = [
  { id: 'all', label: 'All' }, { id: 'review', label: 'Under review', status: 'Under review' },
  { id: 'changes', label: 'Changes requested', status: 'Changes requested' }, { id: 'rejected', label: 'Rejected', status: 'Rejected' },
];

export function RStatus({ s }: { s: ReviewStatus }) {
  if (s === 'Under review') return <Tag tone="blue" icon={Hourglass}>Under review</Tag>;
  if (s === 'Changes requested') return <Tag tone="amber" icon={Warning}>Changes requested</Tag>;
  if (s === 'Rejected') return <Tag tone="red" icon={XCircle}>Rejected</Tag>;
  return <Tag tone="green" icon={CheckCircle}>Approved</Tag>;
}

export function Reviews() {
  const all = useOc((s) => s.reviews);
  const set = useOc((s) => s.set);
  const [tab, setTab] = useTab<TabId>('review');
  const [open, setOpen] = useOpen();
  const [ticked, setTicked] = useState<string[]>([]);
  const [dlg, setDlg] = useState<'changes' | 'reject' | 'approve' | null>(null);
  const busy = useRef(false);
  const queue = all.filter((r) => r.status !== 'Approved');
  const st = TABS.find((t) => t.id === tab)?.status;
  const rows = queue.filter((r) => !st || r.status === st);
  const { items, bodyRef } = useRowMotion(rows);
  const sel = all.find((r) => r.id === open);
  const canTick = tab === 'review';
  useEffect(() => setTicked([]), [tab]);

  const guard = (fn: () => void) => { if (busy.current) return; busy.current = true; fn(); setTimeout(() => { busy.current = false; }, 400); };
  const goLive = (ids: string[]) => {
    const st0 = useOc.getState();
    const picked = st0.reviews.filter((r) => ids.includes(r.id));
    set('reviews', (rs) => rs.map((r) => (ids.includes(r.id) ? { ...r, status: 'Approved' as const, resubmission: false } : r)));
    set('hmos', (hs) => [
      ...picked.filter((r) => !hs.some((h) => h.title === r.title)).map((r) => ({ id: `hm-${r.id}`, title: r.title, town: r.town, type: r.type, beds: r.beds, landlord: r.landlord, tint: r.tint, status: 'Active' as const })),
      ...hs.map((h) => (picked.some((r) => r.title === h.title) ? { ...h, status: 'Active' as const, pausedBy: undefined, reason: undefined } : h)),
    ]);
  };
  const bulkApprove = () => guard(() => {
    const n = ticked.length;
    goLive(ticked); setTicked([]);
    toast.success(`${n} ${n === 1 ? 'listing' : 'listings'} approved`, { description: 'They are live on the student site.' });
  });
  const approveOne = (r: Review) => guard(() => { goLive([r.id]); setDlg(null); setOpen(null); toast.success('Listing approved', { description: `${r.title} is live on the student site.` }); });
  const requestChanges = (r: Review, note: string) => guard(() => {
    set('reviews', (rs) => rs.map((x) => (x.id === r.id ? { ...x, status: 'Changes requested' as const, note } : x)));
    setDlg(null); setOpen(null); setTab('changes');
    toast.success('Changes requested', { description: `${r.landlord} was emailed your note.` });
  });
  const reject = (r: Review, note: string) => guard(() => {
    set('reviews', (rs) => rs.map((x) => (x.id === r.id ? { ...x, status: 'Rejected' as const, note } : x)));
    setDlg(null); setOpen(null); setTab('rejected');
    toast.success('Listing rejected', { description: 'The reason was emailed to the landlord.' });
  });
  const resubmit = (r: Review) => {
    set('reviews', (rs) => rs.map((x) => (x.id === r.id ? { ...x, status: 'Under review' as const, received: '5 min ago', resubmission: true, rooms: x.rooms.map((rm) => ({ ...rm, photos: true })) } : x)));
    setOpen(null); setTab('review');
    toast.success(`${r.landlord} resubmitted ${r.title}`, { description: 'It is back in the Under review queue.' });
  };

  const tick = (id: string, on: boolean) => setTicked((t) => (on ? [...t, id] : t.filter((x) => x !== id)));
  const allTicked = rows.length > 0 && rows.every((r) => ticked.includes(r.id));

  return (
    <>
      <PageHeader icon={FileMagnifyingGlass} crumbs={['Off-campus']} title="Listing reviews" />
      <div className="flex-1 min-h-0 flex flex-col relative">
        <Title title="Listing reviews" sub="Properties waiting to go live on your off-campus site." />
        <div className="px-6 pb-3 border-b border-line">
          <Tabs value={tab} onChange={setTab} tabs={TABS.map((x) => ({ id: x.id, label: x.label, count: queue.filter((r) => !x.status || r.status === x.status).length }))} />
        </div>
        <div className="flex-1 overflow-auto">
          {!rows.length ? (
            <div className="py-16 text-center text-sm text-gray-500">{tab === 'review' ? 'Nothing waiting for review. You are all caught up.' : `No listings under ${TABS.find((x) => x.id === tab)?.label}.`}</div>
          ) : (
            <table className="w-full text-sm">
              <thead className="sticky top-0 bg-white z-[1]">
                <tr className="text-left text-xs text-gray-500 [&>th]:font-medium [&>th]:h-9 [&>th]:border-b [&>th]:border-line [&>th]:px-3">
                  {canTick && <th className="!pl-5 w-12"><Checkbox aria-label="Select all" checked={allTicked} onCheckedChange={(v) => setTicked((v === true) ? rows.map((r) => r.id) : [])} /></th>}
                  <th className={cx(!canTick && '!pl-5')}>Property</th><th>Landlord</th><th>Submitted</th><th>Status</th><th className="w-32" />
                </tr>
              </thead>
              <tbody ref={bodyRef}>
                {items.map(({ row: r, motion }) => {
                  const on = ticked.includes(r.id);
                  return (
                    <tr key={r.id} {...rowAttrs(r.id, motion)} onClick={() => setOpen(r.id)} className={cx('border-b border-[#F3F4F6] cursor-pointer [&>td]:h-10 [&>td]:px-3 [&>td]:py-1.5', on ? 'bg-[#EFF6FF] shadow-[inset_2px_0_0_theme(colors.primary)]' : open === r.id ? 'bg-[#EFF6FF]' : 'hover:bg-[#F9FAFB]')}>
                      {canTick && <td className="!pl-5" onClick={(e) => e.stopPropagation()}><Checkbox aria-label={`Select ${r.title}`} checked={on} onCheckedChange={(v) => tick(r.id, (v === true))} /></td>}
                      <td className={cx(!canTick && '!pl-5')}>
                        <div className="flex items-center gap-2.5"><Thumb tint={r.tint} /><div className="leading-tight"><div className="font-medium">{r.title}</div><div className="text-xs text-gray-500">{r.town} · {r.type} · {r.beds} bed</div></div></div>
                      </td>
                      <td>{r.landlord}</td>
                      <td className="text-gray-500"><div className="leading-tight">{r.received}{r.resubmission && <div className="text-xs">Resubmission</div>}</div></td>
                      <td><RStatus s={r.status} /></td>
                      <td className="text-right !pr-5"><RowLink onClick={() => setOpen(r.id)} /></td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
        <div className="h-10 shrink-0 px-5 flex items-center border-t border-line text-sm text-gray-500">
          <span>{rows.length} {rows.length === 1 ? 'listing' : 'listings'}</span>
        </div>
        <BulkBar count={canTick ? ticked.length : 0} onClear={() => setTicked([])}>
          <Button size="sm" variant="primary" onClick={bulkApprove}>Approve {ticked.length}</Button>
        </BulkBar>
      </div>

      <Sheet open={!!sel} onClose={() => setOpen(null)} width={780} title={sel?.title} sub={sel && `Submitted ${sel.submittedAt}`}
        footer={sel && (sel.status === 'Under review' ? (
          <>
            <Button className="!text-[#E0243A]" onClick={() => setDlg('reject')}>Reject</Button>
            <Button onClick={() => setDlg('changes')}>Request changes</Button>
            <Button variant="primary" onClick={() => setDlg('approve')}>Approve</Button>
          </>
        ) : sel.status === 'Changes requested' ? (
          <><Button onClick={() => setOpen(null)}>Close</Button><Button variant="primary" onClick={() => resubmit(sel)}>Simulate landlord resubmission</Button></>
        ) : <Button onClick={() => setOpen(null)}>Close</Button>)}>
        {sel && <ListingDetail r={sel} />}
      </Sheet>

      <NoteDialog open={dlg === 'changes' && !!sel} onClose={() => setDlg(null)} icon={ChatCenteredText} title="Request changes"
        sub="Your note is emailed to the landlord. Their edits are the reply." label="What needs to change?"
        initial={sel?.rooms.some((x) => !x.photos) ? `${sel.rooms.find((x) => !x.photos)?.name} has no photos. Add at least one photo of it before this goes live.` : ''}
        submit="Request changes" onSubmit={(n) => sel && requestChanges(sel, n)} />
      <NoteDialog open={dlg === 'reject' && !!sel} onClose={() => setDlg(null)} icon={XCircle} danger title="Reject this listing"
        sub="Your reason is emailed to the landlord. The listing won't go live." label="Why are you rejecting it?" placeholder="e.g. The property is outside the area we cover."
        submit="Reject" onSubmit={(n) => sel && reject(sel, n)} />
      <ODialog open={dlg === 'approve' && !!sel} onClose={() => setDlg(null)} icon={CheckCircle} tone="green" title="Approve this listing"
        sub="It goes live on your off-campus site straight away."
        footer={<><Button onClick={() => setDlg(null)}>Cancel</Button><Button variant="primary" onClick={() => sel && approveOne(sel)}>Approve</Button></>} />
    </>
  );
}

function ListingDetail({ r }: { r: Review }) {
  const tagTones = ['border-[#9DBEFB] text-[#1D4ED8]', 'border-[#86D3A8] text-[#0B7A43]', 'border-[#C9A5F5] text-[#7E22CE]', 'border-[#86D3A8] text-[#0B7A43]', 'border-[#F5A3A3] text-[#DB2777]'];
  return (
    <div className="space-y-5 p-1">
      <div className="flex items-center gap-2"><RStatus s={r.status} />{r.resubmission && <Tag tone="grey" outline>Resubmission</Tag>}</div>
      {r.note && r.status !== 'Under review' && (
        <div className={cx('rounded-lg border px-3.5 py-2.5 text-sm', r.status === 'Rejected' ? 'border-[#E0243A]/30 text-[#E0243A]' : 'border-[#C47A00]/35 text-[#C47A00]')}>Your note: {r.note}</div>
      )}
      <div className="flex gap-3">
        <Thumb tint="#E3E9F3" w={220} h={132} size={20} />
        <div className="grid grid-cols-2 gap-3">
          {['#EFEBE3', '#ECE6EE', '#E6EEE8', '#EAECEF'].map((t) => <Thumb key={t} tint={t} w={96} h={60} size={18} />)}
        </div>
      </div>
      <div className="grid grid-cols-2 gap-8">
        <dl className="grid grid-cols-[128px_1fr] gap-y-4 text-sm items-center">
          <dt className="text-gray-500 text-sm">Landlord status</dt><dd><Tag tone="green">Active</Tag></dd>
          <dt className="text-gray-500 text-sm">Address</dt><dd>{r.address}</dd>
          <dt className="text-gray-500 text-sm">Type</dt><dd>{r.type} · {r.beds} bed</dd>
          <dt className="text-gray-500 text-sm">Let as</dt><dd>{r.letAs}</dd>
          <dt className="text-gray-500 text-sm">Size</dt><dd>{r.size} m²</dd>
          <dt className="text-gray-500 text-sm">From</dt><dd>£{r.from} per week</dd>
          <dt className="text-gray-500 text-sm">Landlord</dt><dd>{r.landlord}</dd>
        </dl>
        <div className="space-y-4">
          <div>
            <div className="text-sm font-semibold text-ink mb-2">Amenities</div>
            <div className="flex flex-wrap gap-1.5">{r.amenities.map((a, i) => <span key={a} className={cx('h-[22px] px-2 rounded-md border bg-white text-xs inline-flex items-center', tagTones[i % tagTones.length])}>{a}</span>)}</div>
          </div>
          <div><div className="text-sm font-semibold text-ink mb-1.5">Bills</div><p className="text-sm text-gray-500">{r.bills}</p></div>
          <div><div className="text-sm font-semibold text-ink mb-1.5">House rules</div><p className="text-sm text-gray-500">{r.rules}</p></div>
        </div>
      </div>
      <div>
        <div className="text-sm font-semibold text-ink mb-2">Rooms ({r.rooms.length})</div>
        <div className="space-y-2">
          {r.rooms.map((rm, i) => (
            <div key={rm.name} className="rounded-xl border border-line px-3 py-2.5 flex items-center gap-3">
              {rm.photos ? <Thumb tint={['#EFEBE3', '#E6EEE8', '#ECE6EE', '#EAECEF'][i % 4]} w={56} h={40} size={16} />
                : <span className="w-14 h-10 rounded-md border border-dashed border-gray-300 text-[11px] leading-tight text-gray-400 flex items-center px-1">No photos</span>}
              <div className="flex-1 leading-tight">
                <div className="flex items-center gap-2 text-sm font-medium">{rm.name}<Tag tone="green">Active</Tag></div>
                <div className="text-xs text-gray-500 mt-0.5">{rm.kind} · {rm.size} m² · {rm.bath}</div>
              </div>
              <div className="text-sm font-medium">£{rm.rent} / wk</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
