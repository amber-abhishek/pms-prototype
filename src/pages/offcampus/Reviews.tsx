import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Alert } from '../org/parts';
import { PersonName, Empty, Note, PIN } from '../../components/ui';
import { Bike, Car, ChatCenteredText, Check, CheckCircle, Dumbbell, LampDesk, Sofa, Trees, Utensils, WashingMachine, Wifi, FileMagnifyingGlass, Image as ImageIcon, Warning, XCircle } from '../../components/icons';
import { toast } from 'sonner';
import { Button, listNav, PageHeader, Pill, SearchInput, Sheet, SheetHero, SheetRow, SheetSection, Tabs, cx } from '../../components/ui';
import { LineTabs } from '../inventory/common';
import type { Tone } from '../../data/seed';
import { Checkbox } from '../../components/shadcn/checkbox';
import { useOpen, useTab } from '../hooks';
import { useOc, type Review, type ReviewStatus } from '../../data/offcampus';
import { BulkAction, BulkBar, NoteDialog, ODialog, Tag, Thumb, Title, listingPhoto } from './parts';
import { LStatus } from './Landlords';
import { revertList } from '../../data/revert';
import { rowAttrs, useRowMotion } from '../../components/rowMotion';

type TabId = 'all' | 'review' | 'changes' | 'rejected';
const TABS: { id: TabId; label: string; status?: ReviewStatus }[] = [
  { id: 'all', label: 'All' }, { id: 'review', label: 'In review', status: 'Under review' },
  { id: 'changes', label: 'Changes requested', status: 'Changes requested' }, { id: 'rejected', label: 'Rejected', status: 'Rejected' },
];

export function RStatus({ s }: { s: ReviewStatus }) {
  if (s === 'Under review') return <Tag tone="blue">In review</Tag>;
  if (s === 'Changes requested') return <Tag tone="amber" icon={Warning}>Changes requested</Tag>;
  if (s === 'Rejected') return <Tag tone="red" icon={XCircle}>Rejected</Tag>;
  return <Tag tone="green" icon={CheckCircle}>Approved</Tag>;
}

/** `bare`: rendered inside Approvals, which owns the page header. */
export function Reviews({ bare }: { bare?: boolean } = {}) {
  const all = useOc((s) => s.reviews);
  const set = useOc((s) => s.set);
  const [tab, setTab] = useTab<TabId>('review');
  const [open, setOpen] = useOpen();
  const [ticked, setTicked] = useState<string[]>([]);
  const [dlg, setDlg] = useState<'changes' | 'reject' | 'approve' | null>(null);
  const busy = useRef(false);
  const queue = all.filter((r) => r.status !== 'Approved');
  const st = TABS.find((t) => t.id === tab)?.status;
  const [q, setQ] = useState('');
  const qt = q.trim().toLowerCase();
  const rows = queue.filter((r) => (!st || r.status === st) && (!qt || `${r.title} ${r.landlord} ${r.town}`.toLowerCase().includes(qt)));
  const { items, bodyRef } = useRowMotion(rows);
  const sel = all.find((r) => r.id === open);
  const canTick = tab === 'review';
  useEffect(() => setTicked([]), [tab, q]);

  const guard = (fn: () => void) => { if (busy.current) return; busy.current = true; fn(); setTimeout(() => { busy.current = false; }, 400); };
  const nav = useNavigate();
  const blockOf = (r: Review) => blockFor(r, useOc.getState());
  const block = sel ? blockOf(sel) : null;
  const noPhotos = sel ? sel.rooms.filter((x) => !x.photos).map((x) => x.name) : [];
  const goLive = (ids: string[]) => {
    const st0 = useOc.getState();
    const picked = st0.reviews.filter((r) => ids.includes(r.id));
    set('reviews', (rs) => rs.map((r) => (ids.includes(r.id) ? { ...r, status: 'Approved' as const, resubmission: false } : r)));
    set('hmos', (hs) => [
      ...picked.filter((r) => !hs.some((h) => h.title === r.title)).map((r) => ({ id: `hm-${r.id}`, title: r.title, town: r.town, type: r.type, beds: r.beds, landlord: r.landlord, tint: r.tint, status: 'Active' as const })),
      ...hs.map((h) => (picked.some((r) => r.title === h.title) ? { ...h, status: 'Active' as const, pausedBy: undefined, reason: undefined } : h)),
    ]);
  };
  /* Undo puts back only the reviews and listings this action touched; later changes stay. */
  const snap = () => { const s = useOc.getState(); return { reviews: s.reviews, hmos: s.hmos }; };
  const undoSince = (before: ReturnType<typeof snap>) => {
    const after = snap();
    return () => { set('reviews', (rs) => revertList(before.reviews, after.reviews, rs)); set('hmos', (hs) => revertList(before.hmos, after.hmos, hs)); };
  };
  /* Bulk approve takes only listings that could go live on their own and have a photo of every room. */
  const whyNot = (r: Review) => { const b = blockOf(r); return b ? b.kind : r.rooms.some((x) => !x.photos) ? 'photos' : null; };
  const bulkApprove = () => guard(() => {
    const picked = ticked.map((id) => all.find((x) => x.id === id)).filter((r): r is Review => !!r);
    const ok = picked.filter((r) => !whyNot(r)).map((r) => r.id);
    const held = picked.filter((r) => whyNot(r));
    const count = (k: string) => held.filter((r) => whyNot(r) === k).length;
    const reasons = [
      count('landlord') && `${count('landlord')} ${count('landlord') === 1 ? 'needs' : 'need'} an approved landlord`,
      count('duplicate') && `${count('duplicate')} ${count('duplicate') === 1 ? 'is a duplicate address' : 'are duplicate addresses'}`,
      count('photos') && `${count('photos')} ${count('photos') === 1 ? 'has rooms' : 'have rooms'} without photos`,
    ].filter(Boolean).join(' · ');
    setTicked(held.map((r) => r.id));
    if (!ok.length) { toast.error('None approved', { description: `Left ticked: ${reasons}.` }); return; }
    const before = snap();
    goLive(ok);
    const n = ok.length;
    toast.success(`${n} ${n === 1 ? 'listing' : 'listings'} approved`, { description: held.length ? `Left ticked: ${reasons}.` : 'They are live on the resident site.', duration: 8000, action: { label: 'Undo', onClick: undoSince(before) } });
  });
  const approveOne = (r: Review) => guard(() => {
    if (blockOf(r)) return;
    const before = snap();
    goLive([r.id]); setDlg(null); setOpen(null);
    toast.success('Listing approved', { description: `${r.title} is live on the resident site.`, duration: 8000, action: { label: 'Undo', onClick: undoSince(before) } });
  });
  const requestChanges = (r: Review, note: string) => guard(() => {
    set('reviews', (rs) => rs.map((x) => (x.id === r.id ? { ...x, status: 'Changes requested' as const, note } : x)));
    setDlg(null); setOpen(null); setTab('changes');
    toast.success('Changes requested', { description: `${r.landlord} was emailed your note.` });
  });
  const reject = (r: Review, note: string) => guard(() => {
    const before = snap();
    set('reviews', (rs) => rs.map((x) => (x.id === r.id ? { ...x, status: 'Rejected' as const, note } : x)));
    setDlg(null); setOpen(null); setTab('rejected');
    const undo = undoSince(before);
    toast.success('Listing rejected', { description: 'Your reason is emailed to the landlord when this closes.', duration: 8000, action: { label: 'Undo', onClick: () => { undo(); setTab('review'); } } });
  });
  const resubmit = (r: Review) => {
    set('reviews', (rs) => rs.map((x) => (x.id === r.id ? { ...x, status: 'Under review' as const, received: '5 min ago', resubmission: true, rooms: x.rooms.map((rm) => ({ ...rm, photos: true })) } : x)));
    setOpen(null); setTab('review');
    toast.success(`${r.landlord} resubmitted ${r.title}`, { description: 'It is back in the In review queue.' });
  };

  const tick = (id: string, on: boolean) => setTicked((t) => (on ? [...t, id] : t.filter((x) => x !== id)));
  const allTicked = rows.length > 0 && rows.every((r) => ticked.includes(r.id));

  return (
    <>
      {!bare && <PageHeader icon={FileMagnifyingGlass} crumbs={['Off-campus']} title="Listing reviews" />}
      <div className="flex-1 min-h-0 flex flex-col relative">
        {!bare && <Title title="Listing reviews" />}
        <div {...PIN} className="px-[var(--tx,16px)] py-4 flex items-center gap-3">
          {/* Every off-campus list: search on the left, status tabs at the right edge. */}
          <div className="w-[280px] min-w-[140px] shrink [&>label]:!w-full"><SearchInput value={q} onChange={setQ} placeholder="Search landlord or property" /></div>
          <div className="ml-auto"><Tabs value={tab} onChange={setTab} tabs={TABS.map((x) => ({ id: x.id, label: x.label, count: queue.filter((r) => !x.status || r.status === x.status).length }))} /></div>
        </div>
        <div data-fill className="flex-1 overflow-auto px-[var(--gx,16px)]">
          {!rows.length ? (
            qt ? <Empty art="noResults" title="No listing matches that search" sub="Try another landlord or property." /> : (tab === 'review' ? <Empty art="queueClear" title="Nothing to review" sub="New landlord listings land here for checking." /> : <Empty art="nothingToShow" title={`No listings under ${TABS.find((x) => x.id === tab)?.label}`} />)
          ) : (
            <table className="w-full text-sm">
              <thead className="sticky top-0 bg-white z-[1]">
                <tr className="text-left text-xs text-gray-500 [&>th]:font-medium [&>th]:h-9 [&>th]:border-b [&>th]:border-line [&>th]:px-3">
                  {canTick && <th className="!pl-[var(--cx,12px)] w-12"><Checkbox aria-label="Select all" checked={allTicked} onCheckedChange={(v) => setTicked((v === true) ? rows.map((r) => r.id) : [])} /></th>}
                  <th className={cx(!canTick && '!pl-[var(--cx,12px)]')}>Property</th><th>Landlord</th><th>Submitted</th><th className="!pr-[var(--cx,12px)]">Status</th>
                </tr>
              </thead>
              <tbody ref={bodyRef}>
                {items.map(({ row: r, motion }) => {
                  const on = ticked.includes(r.id);
                  return (
                    <tr key={r.id} {...rowAttrs(r.id, motion)} onClick={() => setOpen(r.id)} className={cx('border-b border-[#F5F5F5] cursor-pointer [&>td]:h-10 [&>td]:px-3 [&>td]:py-[11px]', on ? 'bg-[#EFF6FF] shadow-[inset_2px_0_0_theme(colors.primary)]' : open === r.id ? 'bg-[#EFF6FF]' : 'hover:bg-[#FAFAFA]')}>
                      {canTick && <td className="!pl-[var(--cx,12px)]" onClick={(e) => e.stopPropagation()}><Checkbox aria-label={`Select ${r.title}`} checked={on} onCheckedChange={(v) => tick(r.id, (v === true))} /></td>}
                      <td className={cx(!canTick && '!pl-[var(--cx,12px)]')}>
                        {/* Same cell as the Properties list: 120×64 photo, 16px name, 14px grey line under it. */}
                        <div className="flex items-center gap-4 min-w-0"><Thumb src={listingPhoto(all.findIndex((x) => x.id === r.id))} w={120} h={64} /><div className="min-w-0 flex flex-col gap-1"><span className="text-base leading-6 font-medium text-[#0A0A0A] truncate max-w-[320px]" title={r.title}>{r.title}</span><span className="text-sm leading-5 text-[#737373] truncate max-w-[320px]">{r.town} · {r.type} · {r.beds} bed</span></div></div>
                      </td>
                      <td><PersonName name={r.landlord} size={24} /></td>
                      <td className="text-gray-500"><div className="leading-tight">{r.received}{r.resubmission && <div className="text-xs">Resubmission</div>}</div></td>
                      <td className="!pr-[var(--cx,12px)]"><RStatus s={r.status} /></td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
        <BulkBar count={canTick ? ticked.length : 0} onClear={() => setTicked([])}>
          <BulkAction onClick={bulkApprove}>Approve {ticked.length}</BulkAction>
        </BulkBar>
      </div>

      <Sheet open={!!sel} onClose={() => setOpen(null)} width={520} title="Listing review" nav={listNav(rows, (r) => r.id === open, (r) => setOpen(r.id))}
        onDelete={sel?.status === 'Under review' ? { label: 'Reject listing', icon: XCircle, onClick: () => setDlg('reject') } : undefined}
        footer={sel && (sel.status === 'Under review' ? (
          <>
            <Button icon={ChatCenteredText} className="ml-auto" onClick={() => setDlg('changes')}>Request changes</Button>
            <Button variant="primary" icon={CheckCircle} onClick={() => setDlg('approve')}>Approve</Button>
          </>
        ) : sel.status === 'Changes requested' ? (
          <Button variant="primary" icon={null} className="ml-auto" onClick={() => resubmit(sel)}>Simulate landlord resubmission</Button>
        ) : null)}>
        {sel && <ListingDetail r={sel} />}
      </Sheet>

      <NoteDialog open={dlg === 'changes' && !!sel} onClose={() => setDlg(null)} icon={ChatCenteredText} title="Request changes"
        sub="Your note is emailed to the landlord. Their edits are the reply." label="What needs to change?"
        initial={sel?.rooms.some((x) => !x.photos) ? `${sel.rooms.find((x) => !x.photos)?.name} has no photos. Add at least one photo of it before this goes live.` : ''}
        submit="Request changes" onSubmit={(n) => sel && requestChanges(sel, n)} />
      <NoteDialog open={dlg === 'reject' && !!sel} onClose={() => setDlg(null)} icon={XCircle} danger title="Reject this listing"
        sub="Your reason is emailed to the landlord. The listing won't go live." label="Why are you rejecting it?" placeholder="e.g. The property is outside the area we cover."
        initial={block?.kind === 'duplicate' ? 'This address is already listed on the site by another landlord.' : ''}
        submit="Reject" onSubmit={(n) => sel && reject(sel, n)} />
      <ODialog confirm width={480} open={dlg === 'approve' && !!sel} onClose={() => setDlg(null)} icon={CheckCircle} tone="green" title={block ? 'This listing can’t go live yet' : 'Approve this listing'}
        sub={block ? undefined : 'It goes live on your off-campus site straight away.'}
        footer={block?.kind === 'landlord'
          ? <><Button onClick={() => setDlg(null)}>Cancel</Button><Button variant="primary" onClick={() => { setDlg(null); nav(block.id ? `/offcampus/approvals?kind=landlords&tab=all&open=${block.id}` : '/offcampus/approvals?kind=landlords&tab=all'); }}>Open their application</Button></>
          : block?.kind === 'duplicate'
            ? <><Button onClick={() => setDlg(null)}>Cancel</Button><Button variant="primary" onClick={() => setDlg('reject')}>Reject as duplicate</Button></>
            : noPhotos.length
              ? <><Button onClick={() => setDlg('changes')}>Request changes</Button><Button variant="primary" onClick={() => sel && approveOne(sel)}>Approve anyway</Button></>
              : <><Button onClick={() => setDlg(null)}>Cancel</Button><Button variant="primary" onClick={() => sel && approveOne(sel)}>Approve</Button></>}>
        {block ? <Alert tone="red" icon={XCircle} title={block.title}>{block.sub}</Alert>
          : noPhotos.length ? <Alert tone="amber" icon={ImageIcon} title={`${noPhotos.join(', ')} ${noPhotos.length === 1 ? 'has' : 'have'} no photos`}>Residents see a blank tile for {noPhotos.length === 1 ? 'that room' : 'those rooms'}.</Alert> : null}
      </ODialog>
    </>
  );
}

/** The icon for an amenity by its wording; a tick when nothing fits. */
function amenityIcon(a: string) {
  const n = a.toLowerCase();
  if (/wi-?fi|internet|broadband/.test(n)) return Wifi;
  if (/washing|laundry/.test(n)) return WashingMachine;
  if (/dishwasher|kitchen/.test(n)) return Utensils;
  if (/desk|study/.test(n)) return LampDesk;
  if (/bike|cycle/.test(n)) return Bike;
  if (/garden|yard|outdoor/.test(n)) return Trees;
  if (/parking|car/.test(n)) return Car;
  if (/gym/.test(n)) return Dumbbell;
  if (/lounge|living|sofa/.test(n)) return Sofa;
  return Check;
}

/* Listing review panel (Figma "Side panel · Listing review" 4073:17187): Overview, Photos, Rooms. */
const PHOTO_COUNT = 8;
function billsFact(b: string): [string, string, Tone?] {
  const some = /included/i.test(b), none = /not included/i.test(b);
  const inc = b.replace(/not included/gi, '').match(/included/i);
  if (some && !none) return ['Bills', 'Included', 'green'];
  if (inc && none) return ['Bills', 'Some included'];
  return ['Bills', 'Not included'];
}
function ListingDetail({ r }: { r: Review }) {
  const n = useOc((s) => s.reviews.findIndex((x) => x.id === r.id));
  const ll = useOc((s) => s.landlords.find((l) => l.name === r.landlord));
  const [tab, setTab] = useState<'overview' | 'photos' | 'rooms'>('overview');
  useEffect(() => setTab('overview'), [r.id]);
  return (
    <>
      <SheetHero lead={<img src={listingPhoto(n)} alt="" className="size-14 shrink-0 rounded-xl object-cover bg-[#F5F5F5]" />} name={r.title} meta={`${r.address} · submitted ${r.submittedAt}`}
        facts={[['Rent', `£${r.from} / wk`], ['Rooms', `${r.beds} bed`], billsFact(r.bills)]}>
        <RStatus s={r.status} />{r.resubmission && <Tag tone="grey" outline>Resubmission</Tag>}
      </SheetHero>
      <div className="-mx-5 mb-5">
        <LineTabs value={tab} onChange={setTab} tabs={[{ id: 'overview', label: 'Overview' }, { id: 'photos', label: 'Photos' }, { id: 'rooms', label: 'Rooms' }]} />
      </div>
      {tab === 'overview' && <>
        {r.note && r.status !== 'Under review' && (
          <div className="mb-3"><Note tone={r.status === 'Rejected' ? 'red' : 'amber'} title="Your note">{r.note}</Note></div>
        )}
        <SheetSection title="Property" rows={[['Type', `${r.type} · ${r.beds} bed`], ['Let as', r.letAs], ['Size', `${r.size} m²`], ['From', `£${r.from} per week`]]} />
        <SheetSection title="Landlord">
          <SheetRow title={r.landlord} sub={ll ? (ll.company ?? ll.entity) : 'No landlord account'} end={ll ? <LStatus s={ll.status} /> : <Tag tone="grey">Not registered</Tag>} />
        </SheetSection>
        <SheetSection title="Terms" rows={[['Bills', r.bills], ['House rules', r.rules]]} />
        <SheetSection title={`Amenities · ${r.amenities.length}`}>
          {/* A plain two-column list, each amenity with its own icon, not tags (2026-11-19). */}
          <ul className="grid grid-cols-2 gap-x-4 gap-y-2.5">{r.amenities.map((a) => <li key={a} className="flex items-center gap-2 text-sm leading-5 text-[#0A0A0A] min-w-0">{(() => { const I = amenityIcon(a); return <I size={16} className="shrink-0 text-[#737373]" />; })()}<span className="truncate">{a}</span></li>)}</ul>
        </SheetSection>
      </>}
      {tab === 'photos' && (
        <SheetSection title={`Photos · ${PHOTO_COUNT}`}>
          <div className="grid grid-cols-3 gap-2">
            {Array.from({ length: PHOTO_COUNT }, (_, k) => <img key={k} src={listingPhoto(n, k)} alt="" loading="lazy" className="w-full aspect-[4/3] rounded-lg object-cover bg-[#F5F5F5]" />)}
          </div>
        </SheetSection>
      )}
      {tab === 'rooms' && (
        <SheetSection title={`Rooms · ${r.rooms.length}`}>
          {r.rooms.map((rm) => (
            <SheetRow key={rm.name} title={rm.name} sub={`${rm.kind} · ${rm.size} m² · ${rm.bath} · £${rm.rent} / wk`}
              end={rm.photos ? <Pill tone="green">Free</Pill> : <Pill tone="amber">No photos</Pill>} />
          ))}
        </SheetSection>
      )}
    </>
  );
}

/** Why a listing can't go live: its landlord isn't approved, or another landlord already lists the address. */
function blockFor(r: Review, st: { landlords: { id: string; name: string; status: string }[]; hmos: { title: string; landlord: string; status: string }[] }):
  { kind: 'landlord' | 'duplicate'; id?: string; title: string; sub: string } | null {
  const l = st.landlords.find((x) => x.name === r.landlord);
  if (!l) return { kind: 'landlord', title: `${r.landlord} isn’t an approved landlord`, sub: 'Only approved landlords can list here.' };
  if (l.status !== 'Approved') return { kind: 'landlord', id: l.id, title: `${r.landlord} ${({ Submitted: 'isn’t approved yet', 'Awaiting info': 'owes you more information', Rejected: 'was rejected', Suspended: 'is inactive' } as Record<string, string>)[l.status] ?? 'isn’t approved'}`, sub: 'Approve the landlord first, then their listings.' };
  const key = (t: string) => t.trim().toLowerCase().replace(/\s+/g, ' ');
  const twin = st.hmos.find((h) => key(h.title) === key(r.title) && h.landlord !== r.landlord && h.status !== 'Archived');
  if (twin) return { kind: 'duplicate', title: `${twin.title} is already listed by ${twin.landlord}`, sub: 'Two landlords can’t list the same address.' };
  return null;
}
