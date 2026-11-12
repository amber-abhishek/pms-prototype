import { useEffect, useRef, useState } from 'react';
import { Empty } from '../../components/ui';
import { Link } from 'react-router-dom';
import { Archive, ArrowCounterClockwise, Buildings, CaretLeft, CaretRight, CheckCircle, EyeSlash, Pause, PauseCircle, WarningCircle } from '../../components/icons';
import { toast } from 'sonner';
import { Button, PageHeader, Table, Tabs } from '../../components/ui';
import { useTab } from '../hooks';
import { regionOf, stamp, useOc, type Hmo, type HmoStatus, type Pbsa } from '../../data/offcampus';
import { NoteDialog, Tag, Thumb, Title } from './parts';
import { GhostZone } from '../../components/headerCtx';

export function Listings() {
  const [src] = useTab<'hmo' | 'pbsa'>('hmo');
  return (
    <>
      <PageHeader icon={Buildings} crumbs={['Off-campus']} title="Listings" />
      <div className="flex-1 min-h-0 flex flex-col">
        {/* HMO and Amber PBSA live in the side panel under Listings. */}
        <Title title={src === 'pbsa' ? 'Partner halls' : 'Landlord listings'} />
        {src === 'pbsa' ? <PbsaTab /> : <HmoTab />}
      </div>
    </>
  );
}

/* ---------------- HMO ---------------- */
type HTab = 'all' | 'active' | 'paused' | 'archived';
function HmoTab() {
  const hmos = useOc((s) => s.hmos);
  const set = useOc((s) => s.set);
  const [tab, setTab] = useState<HTab>('active');
  const [pausing, setPausing] = useState<Hmo | null>(null);
  const [archiving, setArchiving] = useState<Hmo | null>(null);
  const busy = useRef(false);
  const want: Record<HTab, HmoStatus | null> = { all: null, active: 'Active', paused: 'Paused', archived: 'Archived' };
  const rows = hmos.filter((h) => !want[tab] || h.status === want[tab]);
  const n = (st: HmoStatus) => hmos.filter((h) => h.status === st).length;

  const patch = (id: string, p: Partial<Hmo>) => set('hmos', (hs) => hs.map((h) => (h.id === id ? { ...h, ...p } : h)));
  const pause = (h: Hmo, reason: string) => {
    if (busy.current) return; busy.current = true;
    patch(h.id, { status: 'Paused', pausedBy: 'you', reason: reason || undefined });
    setPausing(null); setTab('paused');
    toast.success('Listing paused', { description: `${h.title} is hidden from residents.` });
    setTimeout(() => { busy.current = false; }, 400);
  };
  const unpause = (h: Hmo) => { patch(h.id, { status: 'Active', pausedBy: undefined, reason: undefined }); toast.success('Listing unpaused', { description: `${h.title} is back on the resident site.` }); };

  const archive = (h: Hmo, reason: string) => {
    if (busy.current) return; busy.current = true;
    const before = { status: h.status, pausedBy: h.pausedBy, reason: h.reason };
    patch(h.id, { status: 'Archived', pausedBy: undefined, reason: reason || undefined });
    setArchiving(null);
    toast.success('Listing archived', { description: `${h.title} is off the resident site.`, action: { label: 'Undo', onClick: () => patch(h.id, before) } });
    setTimeout(() => { busy.current = false; }, 400);
  };
  const restore = (h: Hmo) => { patch(h.id, { status: 'Paused', pausedBy: 'you', reason: undefined }); toast.success('Listing restored', { description: `${h.title} is paused. Unpause it to go live.` }); };

  const pausedLine = (h: Hmo) => (h.pausedBy === 'you' ? `Paused by you${h.reason ? ` · ${h.reason}` : ''}` : h.pausedBy === 'landlord' ? `Paused by landlord${h.reason ? ` · ${h.reason}` : ''}` : 'Paused — application revoked');

  return (
    <>
      <div className="px-6 py-3 empty:hidden">
        <Tabs value={tab} onChange={setTab} tabs={[{ id: 'all', label: 'All', count: hmos.length }, { id: 'active', label: 'Active', count: n('Active') }, { id: 'paused', label: 'Paused', count: n('Paused') }, { id: 'archived', label: 'Archived', count: n('Archived') }]} />
      </div>
      <Table fill rows={rows} footer={false}
        empty={hmos.length ? <div className="py-16 text-center text-sm text-gray-500">No {tab === 'all' ? '' : `${tab} `}Landlord listings.</div> : <Empty art="properties" title="No landlord listings yet" sub="Listings show here once landlords are approved and add their houses." />}
        cols={[
          { key: 'p', label: 'Property', render: (h) => <div className="flex items-center gap-2.5 py-1"><Thumb tint={h.tint} /><div className="leading-tight"><div className="font-medium">{h.title}</div><div className="text-xs text-gray-500">{h.town} · {h.type} · {h.beds} bed</div></div></div> },
          { key: 'l', label: 'Landlord', render: (h) => h.landlord },
          { key: 's', label: 'Status', render: (h) => h.status === 'Paused'
            ? <div className="py-1"><Tag tone="amber" icon={PauseCircle}>Paused</Tag><div className="text-xs text-gray-500 mt-1">{pausedLine(h)}</div></div>
            : h.status === 'Active' ? <Tag tone="green">Active</Tag> : <Tag tone="grey">Archived</Tag> },
          { key: 'a', label: '', className: 'text-right w-48', render: (h) => (
            <div className="inline-flex items-center gap-1">
              {h.status === 'Active' && <Button size="sm" onClick={() => setPausing(h)}>Pause</Button>}
              {h.status === 'Paused' && h.pausedBy === 'you' && <Button size="sm" onClick={() => unpause(h)}>Unpause</Button>}
              {h.status === 'Archived'
                ? <Button size="sm" icon={ArrowCounterClockwise} onClick={() => restore(h)}>Restore</Button>
                : <Button size="sm" icon={Archive} onClick={() => setArchiving(h)}>Archive</Button>}
            </div>) },
        ]} />
      <NoteDialog open={!!pausing} onClose={() => setPausing(null)} icon={Pause} optional title="Pause this listing" sub="It is hidden from residents until you resume it."
        label="Reason (shown on the inventory page)" initial={pausing?.title === '9 Wanless Terrace' ? 'Damp reported in two bedrooms. Hidden until the landlord confirms repairs.' : ''}
        submit="Pause" onSubmit={(r) => pausing && pause(pausing, r)} />
      <NoteDialog open={!!archiving} onClose={() => setArchiving(null)} icon={Archive} optional danger title="Archive this listing" sub="It comes off the resident site and out of Active. You can restore it later."
        label="Reason" submit="Archive" onSubmit={(r) => archiving && archive(archiving, r)} />
    </>
  );
}

/* ---------------- Amber PBSA ---------------- */
const PER = 5;
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
  const rows = region ? pbsa.filter((p) => p.region === region) : [];
  const pages = Math.max(1, Math.ceil(rows.length / PER));
  const shown = rows.slice(page * PER, page * PER + PER);
  const isHidden = (ref: string) => hidden.some((h) => h.ref === ref);

  const hide = (p: Pbsa, reason: string) => {
    if (busy.current) return; busy.current = true;
    set('hidden', (hs) => [{ ref: p.ref, reason: reason || '—', at: stamp() }, ...hs]);
    setHiding(null); setView('hidden');
    toast.success('Listing hidden', { description: `${p.name} no longer shows on your site.` });
    setTimeout(() => { busy.current = false; }, 400);
  };
  const unhide = (ref: string) => { set('hidden', (hs) => hs.filter((h) => h.ref !== ref)); toast.success('Listing shown again', { description: `${pbsa.find((p) => p.ref === ref)?.name ?? ref} is back on your site.` }); };

  return (
    <div className="flex-1 min-h-0 flex flex-col">
      <div className="px-6 pt-3 space-y-3">
        <div className="flex items-center gap-2 text-sm">
          {portal.showPbsa ? <CheckCircle size={16} className="text-[#16A34A]" /> : <WarningCircle size={16} className="text-[#F59E0B]" />}
          <span>Partner halls are {portal.showPbsa ? 'shown' : 'not shown'} on your portal.</span>
          <Link to="/offcampus/portal" className="text-primary hover:underline">{portal.showPbsa ? 'Change this in Off-campus portal' : 'Turn it on in Off-campus portal'}</Link>
        </div>
        <Tabs value={view} onChange={setView} tabs={[{ id: 'all', label: 'All', count: pbsa.filter((p) => campuses.some((x) => x.ticked && regionOf(x) === p.region)).length }, { id: 'hidden', label: 'Hidden', count: hidden.length }]} />
        <div className="text-sm font-semibold pt-1">{view === 'all' ? 'Partner catalogue' : 'Hidden partner hall listings'}</div>
        {view === 'all' && (
          <Tabs value={campus} onChange={setCampus} tabs={campuses.map((x) => ({ id: x.id, label: x.name, count: x.ticked ? pbsa.filter((p) => p.region === regionOf(x)).length : 0 }))} />
        )}
      </div>
      <div className="mt-3 flex-1 min-h-0 flex flex-col">
        {view === 'hidden' ? (
          <Table fill rows={hidden.map((h) => ({ ...h, id: h.ref }))}
            empty={<div className="py-16 text-center text-sm text-gray-500">No partner hall listings are hidden.</div>}
            cols={[
              { key: 'r', label: 'Partner hall listing', render: (h) => <div className="leading-tight py-1"><div className="font-mono text-sm">{h.ref}</div><div className="text-xs text-gray-500">Partner halls</div></div> },
              { key: 'w', label: 'Reason', render: (h) => h.reason },
              { key: 'a', label: 'Marked at', render: (h) => <span className="text-gray-500">{h.at}</span> },
              { key: 'x', label: '', className: 'text-right w-28', render: (h) => <Button size="sm" onClick={() => unhide(h.ref)}>Unhide</Button> },
            ]} />
        ) : !region ? (
          <div className="py-16 text-center text-sm text-gray-500">
            {c.ticked ? `${c.name} has no partner region yet.` : `${c.name} isn't ticked for this portal.`} <Link to="/offcampus/portal" className="text-primary hover:underline">Choose campuses in Off-campus portal</Link>
          </div>
        ) : !rows.length ? (
          <div className="py-16 text-center text-sm text-gray-500">No partner halls are listed in {region} yet.</div>
        ) : (
          <>
            <div data-fill className="flex-1 overflow-auto px-[var(--gx,16px)]">
              <table className="w-full text-sm">
                <thead className="sticky top-0 bg-white"><tr className="text-left text-xs text-gray-500 [&>th]:font-medium [&>th]:h-9 [&>th]:border-b [&>th]:border-line [&>th]:px-3">
                  <th className="!pl-[var(--cx,12px)]">Listing</th><th>Region</th><th className="text-right">From</th><th /><th>Status</th><th className="w-24" />
                </tr></thead>
                <GhostZone.Provider value><tbody>
                  {shown.map((p) => {
                    const h = isHidden(p.ref);
                    return (
                      <tr key={p.id} className="border-b border-[#F5F5F5] last:border-0 [&>td]:h-10 [&>td]:px-3 [&>td]:py-1">
                        <td className="!pl-[var(--cx,12px)]"><div className="leading-tight"><div className="font-medium">{p.name}</div><div className="font-mono text-xs text-gray-500">{p.ref}</div></div></td>
                        <td>{p.region === 'Newcastle upon Tyne' ? 'Newcastle' : p.region}</td>
                        <td className="text-right">£{p.from} / week</td>
                        <td><a href={`https://partnerhalls.example/places/${p.ref}`} target="_blank" rel="noreferrer" className="text-primary hover:underline">View listing</a></td>
                        <td>{h ? <Tag tone="grey" icon={EyeSlash}>Hidden</Tag> : <Tag tone="green" icon={CheckCircle}>Shown</Tag>}</td>
                        <td className="text-right !pr-[var(--cx,12px)]">{h ? <Button size="sm" onClick={() => unhide(p.ref)}>Unhide</Button> : <Button size="sm" onClick={() => setHiding(p)}>Hide</Button>}</td>
                      </tr>
                    );
                  })}
                </tbody></GhostZone.Provider>
              </table>
            </div>
            {pages > 1 && <div data-foot className="h-10 shrink-0 px-5 flex items-center justify-end gap-1.5 border-t border-line bg-white text-xs text-[#737373]">
              <span className="mr-1">{page * PER + 1}–{Math.min(rows.length, (page + 1) * PER)} of {rows.length}</span>
              <button type="button" aria-label="Previous page" disabled={page === 0} onClick={() => setPage(page - 1)} className="size-7 rounded-lg border border-line bg-white text-[#0A0A0A] shadow-[0_1px_2px_rgba(17,24,39,0.05)] hover:bg-subtle disabled:opacity-40 disabled:pointer-events-none flex items-center justify-center transition-[background-color,transform] duration-150 ease-snappy active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"><CaretLeft size={13} /></button>
              <button type="button" aria-label="Next page" disabled={page >= pages - 1} onClick={() => setPage(page + 1)} className="size-7 rounded-lg border border-line bg-white text-[#0A0A0A] shadow-[0_1px_2px_rgba(17,24,39,0.05)] hover:bg-subtle disabled:opacity-40 disabled:pointer-events-none flex items-center justify-center transition-[background-color,transform] duration-150 ease-snappy active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"><CaretRight size={13} /></button>
            </div>}
          </>
        )}
      </div>
      <NoteDialog open={!!hiding} onClose={() => setHiding(null)} icon={EyeSlash} optional title="Hide this listing"
        sub="It stops showing on your off-campus site. It stays listed everywhere else." label="Reason (shown on this page)"
        initial={hiding?.name === 'The Sidings' ? 'Too far from the city centre for first-year residents.' : ''}
        submit="Hide" onSubmit={(r) => hiding && hide(hiding, r)} />
    </div>
  );
}
