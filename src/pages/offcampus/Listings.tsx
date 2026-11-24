import { useEffect, useRef, useState } from 'react';
import { PersonName, Empty, PIN, Tabs } from '../../components/ui';
import { Link } from 'react-router-dom';
import { Buildings, Pause } from '../../components/icons';
import { toast } from 'sonner';
import { Button, PageHeader, Pager, SearchInput, Table } from '../../components/ui';
import { Foot } from '../allocations/common';
import { useTab } from '../hooks';
import { regionOf, stamp, useOc, type Hmo, type HmoStatus, type Pbsa } from '../../data/offcampus';
import { NoteDialog, StatusTabsBar, Tag, Thumb, Title, listingPhoto } from './parts';
import { Picker } from '../inventory/common';
import { GhostZone } from '../../components/headerCtx';

const openListing = (ref: string) => window.open(`https://partnerhalls.example/places/${ref}`, '_blank', 'noopener');

export function Listings() {
  const [src, setSrc] = useTab<'hmo' | 'pbsa'>('hmo');
  const owners = useOc((s) => s.hmos.length);
  /* Partners: every hall in the regions of the campuses on the portal (the view itself narrows to one campus). */
  const partners = useOc((s) => { const rs = new Set(s.portal.campuses.filter((c) => c.ticked).map(regionOf)); return s.pbsa.filter((p) => rs.has(p.region)).length; });
  return (
    <>
      <PageHeader icon={Buildings} crumbs={['Off-campus']} title="Listings" />
      <div className="flex-1 min-h-0 flex flex-col">
        <Title title="Listings" />
        {/* One Listings page (2026-11-23): Owners / Partners are underline tabs, like the status tabs on Approvals; each keeps its own toolbar below. */}
        <StatusTabsBar value={src} onChange={setSrc} tabs={[{ id: 'hmo', label: 'Owners', count: owners }, { id: 'pbsa', label: 'Partners', count: partners }]} />
        {src === 'pbsa' ? <PbsaTab key="pbsa" /> : <HmoTab key="hmo" />}
      </div>
    </>
  );
}

/* ---------------- HMO ---------------- */
type HTab = 'all' | 'active' | 'paused';
function HmoTab() {
  const hmos = useOc((s) => s.hmos);
  const set = useOc((s) => s.set);
  const [tab, setTab] = useState<HTab>('all');
  const [pausing, setPausing] = useState<Hmo | null>(null);
  const busy = useRef(false);
  const want: Record<HTab, HmoStatus | null> = { all: null, active: 'Active', paused: 'Paused' };
  const [q, setQ] = useState('');
  const t = q.trim().toLowerCase();
  const rows = hmos.filter((h) => (!want[tab] || h.status === want[tab]) && (!t || `${h.title} ${h.landlord} ${h.town}`.toLowerCase().includes(t)));
  const n = (st: HmoStatus) => hmos.filter((h) => h.status === st).length;

  const patch = (id: string, p: Partial<Hmo>) => set('hmos', (hs) => hs.map((h) => (h.id === id ? { ...h, ...p } : h)));
  const pause = (h: Hmo, reason: string) => {
    if (busy.current) return; busy.current = true;
    patch(h.id, { status: 'Paused', pausedBy: 'you', reason: reason || undefined });
    setPausing(null); setTab('paused');
    toast.success('Listing made inactive', { description: `${h.title} is off the resident site.` });
    setTimeout(() => { busy.current = false; }, 400);
  };
  const unpause = (h: Hmo) => { patch(h.id, { status: 'Active', pausedBy: undefined, reason: undefined }); toast.success('Listing reactivated', { description: `${h.title} is back on the resident site.` }); };


  const pausedLine = (h: Hmo) => (h.pausedBy === 'you' ? `Made inactive by you${h.reason ? ` · ${h.reason}` : ''}` : h.pausedBy === 'landlord' ? `Made inactive by the owner${h.reason ? ` · ${h.reason}` : ''}` : 'Inactive · owner is inactive');

  return (
    <>
      {hmos.length > 0 && (<div {...PIN} data-subbar className="px-6 py-4 flex items-center gap-3 empty:hidden">
                {/* Every off-campus list: search on the left, status tabs at the right edge. */}
                <div className="w-[280px] min-w-[140px] shrink [&>label]:!w-full"><SearchInput value={q} onChange={setQ} placeholder="Search owner or property" /></div>
                <div className="ml-auto"><Tabs variant="segmented" value={tab} onChange={setTab} tabs={[{ id: 'all', label: 'All', count: hmos.length }, { id: 'active', label: 'Active', count: n('Active') }, { id: 'paused', label: 'Inactive', count: n('Paused') }]} /></div>
      </div>)}
      <Table fill rows={rows} footer={false}
        empty={hmos.length ? (t ? <Empty art="noResults" title="No listing matches that search" /> : <Empty art="nothingToShow" title={`No ${tab === 'paused' ? 'inactive' : tab} listings`} />) : <Empty art="properties" title="No owner listings yet" sub="Approved owners’ houses show here." />}
        cols={[
          { key: 'no', label: 'S.No.', className: 'w-14', render: (h) => <span className="font-mono text-[#737373] tabular-nums">{rows.indexOf(h) + 1}</span> },
          /* Same cell as Properties and Listing reviews: 120×64 photo, 16px medium name, 14px grey line under it. */
          { key: 'p', label: 'Property', className: 'py-[11px]', render: (h) => <div className="flex items-center gap-4 min-w-0"><Thumb src={listingPhoto(hmos.findIndex((x) => x.id === h.id))} w={120} h={64} /><div className="min-w-0 flex flex-col gap-1"><span className="text-base leading-6 font-medium text-[#0A0A0A] truncate max-w-[320px]" title={h.title}>{h.title}</span><span className="text-sm leading-5 text-[#737373] truncate max-w-[320px]">{h.town} · {h.type} · {h.beds} bed</span></div></div> },
          { key: 'l', label: 'Owner', render: (h) => <PersonName name={h.landlord} size={24} /> },
          { key: 's', label: 'Status', render: (h) => h.status === 'Paused'
            ? <div className="py-1"><Tag tone="grey">Inactive</Tag><div className="text-xs text-gray-500 mt-1">{pausedLine(h)}</div></div>
            : <Tag tone="green">Active</Tag> },
          { key: 'a', label: '', className: 'text-right w-32', render: (h) => (
            h.status === 'Active' ? <Button size="sm" onClick={() => setPausing(h)}>Make inactive</Button>
              : h.pausedBy === 'you' ? <Button size="sm" onClick={() => unpause(h)}>Reactivate</Button> : null) },
        ]} />
      <NoteDialog open={!!pausing} onClose={() => setPausing(null)} icon={Pause} optional title="Make this listing inactive" sub="It comes off the resident site until you reactivate it."
        label="Reason (shown on the inventory page)" initial={pausing?.title === '9 Wanless Terrace' ? 'Damp reported in two bedrooms. Inactive until the owner confirms repairs.' : ''}
        submit="Make inactive" onSubmit={(r) => pausing && pause(pausing, r)} />
    </>
  );
}

/* ---------------- Amber PBSA ---------------- */
const PER = 8;
function PbsaTab() {
  const { pbsa, hidden, portal, set } = useOc();
  const [view, setView] = useState<'all' | 'hidden'>('all');
  const campuses = portal.campuses;
  const [campus, setCampus] = useState(campuses[0].id);
  const [page, setPage] = useState(0);
  const [hiding, setHiding] = useState<Pbsa | null>(null);
  const busy = useRef(false);
  useEffect(() => setPage(0), [campus]);
  const c = campuses.find((x) => x.id === campus) ?? campuses[0];
  const region = c.ticked ? regionOf(c) : null;
  /* Search by hall name or reference, within the picked campus. */
  const [q, setQ] = useState('');
  const qt = q.trim().toLowerCase();
  const match = (name?: string, ref?: string) => !qt || `${name ?? ''} ${ref ?? ''}`.toLowerCase().includes(qt);
  useEffect(() => setPage(0), [q]);
  const inRegion = region ? pbsa.filter((p) => p.region === region) : [];
  const rows = inRegion.filter((p) => match(p.name, p.ref));
  const pages = Math.max(1, Math.ceil(rows.length / PER));
  const shown = rows.slice(page * PER, page * PER + PER);
  const isHidden = (ref: string) => hidden.some((h) => h.ref === ref);
  /* Hidden is per campus too: only the hidden halls in the selected campus's region. */
  const regionOfRef = (ref: string) => pbsa.find((p) => p.ref === ref)?.region;
  const hiddenAll = region ? hidden.filter((h) => regionOfRef(h.ref) === region) : [];
  const hiddenHere = hiddenAll.filter((h) => match(pbsa.find((p) => p.ref === h.ref)?.name, h.ref));

  const hide = (p: Pbsa, reason: string) => {
    if (busy.current) return; busy.current = true;
    set('hidden', (hs) => [{ ref: p.ref, reason: reason || '—', at: stamp() }, ...hs]);
    setHiding(null); setView('hidden');
    toast.success('Listing made inactive', { description: `${p.name} no longer shows on your site.` });
    setTimeout(() => { busy.current = false; }, 400);
  };
  const unhide = (ref: string) => { set('hidden', (hs) => hs.filter((h) => h.ref !== ref)); toast.success('Listing reactivated', { description: `${pbsa.find((p) => p.ref === ref)?.name ?? ref} is back on your site.` }); };

  /* No partners in this campus at all: just the empty state, no view tabs or status note. */
  const nothing = view === 'all' && !!region && !inRegion.length && !hiddenAll.length;
  return (
    <div className="flex-1 min-h-0 flex flex-col">
      <div {...PIN} data-subbar className="px-6 py-4 empty:hidden">
        {/* One row: search on the left; the campus dropdown and All / Inactive on the right edge. */}
        <div className="flex items-center gap-3">
          <div className="w-[280px] min-w-[140px] shrink [&>label]:!w-full"><SearchInput value={q} onChange={setQ} placeholder="Search hall name or reference" /></div>
          <div className="ml-auto w-[220px] shrink-0"><Picker value={campus} onChange={setCampus} icon={Buildings}
            options={campuses.map((x) => ({ id: x.id, label: <span className="flex items-center gap-2"><span className="flex-1 truncate">{x.name}</span><span className="font-mono text-xs text-[#A3A3A3] tabular-nums">{!x.ticked ? 0 : pbsa.filter((p) => p.region === regionOf(x)).length}</span></span> }))} /></div>
          {!nothing && <div><Tabs variant="segmented" value={view} onChange={setView} tabs={[{ id: 'all', label: 'All', count: rows.length }, { id: 'hidden', label: 'Inactive', count: hiddenHere.length }]} /></div>}
        </div>
      </div>
      <div className="flex-1 min-h-0 flex flex-col">
        {view === 'hidden' ? (
          <Table fill rows={hiddenHere.map((h) => ({ ...h, id: h.ref }))}
            empty={qt ? <Empty art="noResults" title="No inactive hall matches that search" /> : <Empty art="getStarted" title="No inactive partners" sub="All partners show on your portal." />}
            cols={[
              { key: 'no', label: 'S.No.', className: 'w-14', render: (h) => <span className="font-mono text-[#737373] tabular-nums">{hiddenHere.findIndex((x) => x.ref === h.ref) + 1}</span> },
              { key: 'r', label: 'Partner listing', render: (h) => {
                /* Same photo and name as the catalogue row it was hidden from. */
                const p = pbsa.find((x) => x.ref === h.ref);
                const i = p ? pbsa.filter((x) => x.region === p.region).indexOf(p) : 0;
                return (
                  <div className="flex items-center gap-4 min-w-0 py-2">
                    <Thumb src={listingPhoto(i + 3)} w={120} h={64} />
                    <div className="min-w-0 flex flex-col gap-1"><span className="text-base leading-6 font-medium text-[#0A0A0A] truncate max-w-[320px]" title={p?.name}>{p?.name ?? h.ref}</span><span className="text-sm leading-5 text-[#737373]">{h.ref}</span></div>
                  </div>
                );
              } },
              { key: 'w', label: 'Reason', render: (h) => h.reason },
              { key: 'a', label: 'Marked at', render: (h) => <span className="text-gray-500">{h.at}</span> },
              { key: 'x', label: '', className: 'text-right w-32', render: (h) => <Button size="sm" onClick={() => unhide(h.ref)}>Reactivate</Button> },
            ]} />
        ) : !region ? (
          <div className="flex-1 flex items-center justify-center">
            <Empty art="notFound" title={c.ticked ? `${c.name} has no partner region yet` : `${c.name} isn’t on your portal`} sub="Choose which campuses your portal covers."
              action={<Link to="/offcampus/portal"><Button>Open Off-campus portal</Button></Link>} />
          </div>
        ) : !rows.length && qt ? (
          <div className="flex-1 flex items-center justify-center"><Empty art="noResults" title="No hall matches that search" sub="Try another name or reference." /></div>
                ) : !rows.length ? (
          <div className="flex-1 flex items-center justify-center">
            <Empty art="nothingHere" title="No partners yet" sub={`Halls listed with Amber in ${region} show here.`}
              action={<Link to="/offcampus/portal"><Button>Open Off-campus portal</Button></Link>} />
          </div>
        ) : (
          <>
            <div data-fill className="flex-1 overflow-auto px-[var(--gx,16px)]">
              <table className="w-full text-sm">
                <thead className="sticky top-0 bg-white"><tr className="text-left text-xs text-gray-500 [&>th]:font-medium [&>th]:h-9 [&>th]:border-b [&>th]:border-line [&>th]:px-3">
                  <th className="!pl-[var(--cx,12px)] w-14">S.No.</th><th>Listing</th><th>Region</th><th>From</th><th>Status</th><th className="w-32" />
                </tr></thead>
                <GhostZone.Provider value><tbody>
                  {shown.map((p) => {
                    const h = isHidden(p.ref);
                    return (
                      /* The whole row opens the hall's public listing in a new tab; Make inactive / Reactivate stop the click. */
                      <tr key={p.id} tabIndex={0} title="Open listing" onClick={() => openListing(p.ref)} onKeyDown={(e) => { if (e.key === 'Enter') openListing(p.ref); }}
                        className="cursor-pointer hover:bg-[#FAFAFA] focus-visible:outline-none focus-visible:bg-[#F5F5F5] border-b border-[#F5F5F5] last:border-0 [&>td]:h-10 [&>td]:px-3 [&>td]:py-[11px]">
                        <td className="!pl-[var(--cx,12px)] font-mono text-[#737373] tabular-nums">{rows.indexOf(p) + 1}</td>
                        <td><div className="flex items-center gap-4 min-w-0"><Thumb src={listingPhoto(inRegion.indexOf(p) + 3)} w={120} h={64} /><div className="min-w-0 flex flex-col gap-1"><span className="text-base leading-6 font-medium text-[#0A0A0A] truncate max-w-[320px]" title={p.name}>{p.name}</span><span className="text-sm leading-5 text-[#737373]">{p.ref}</span></div></div></td>
                        <td>{p.region === 'Newcastle upon Tyne' ? 'Newcastle' : p.region}</td>
                        <td>£{p.from} / week</td>
                        <td>{h ? <Tag tone="grey">Inactive</Tag> : <Tag tone="green">Active</Tag>}</td>
                        <td className="row-act text-right !pr-[var(--cx,12px)]" onClick={(e) => e.stopPropagation()} onKeyDown={(e) => e.stopPropagation()}>{h ? <Button size="sm" onClick={() => unhide(p.ref)}>Reactivate</Button> : <Button size="sm" onClick={() => setHiding(p)}>Make inactive</Button>}</td>
                      </tr>
                    );
                  })}
                </tbody></GhostZone.Provider>
              </table>
            </div>
            <Foot right={pages > 1 && <Pager pages={pages} page={page} onPage={setPage} />}>{pages > 1 && `Showing ${shown.length} of ${rows.length} entries`}</Foot>
          </>
        )}
      </div>
      <NoteDialog open={!!hiding} onClose={() => setHiding(null)} icon={Pause} optional title="Make this listing inactive"
        sub="It stops showing on your off-campus site. It stays listed everywhere else." label="Reason (shown on this page)"
        initial={hiding?.name === 'The Sidings' ? 'Too far from the city centre for first-year residents.' : ''}
        submit="Make inactive" onSubmit={(r) => hiding && hide(hiding, r)} />
    </div>
  );
}
