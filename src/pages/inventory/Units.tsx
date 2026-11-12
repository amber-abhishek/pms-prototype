import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { toast } from 'sonner';
import {
  Archive, ArrowSquareOut, ArrowUUpLeft, ArrowsOutCardinal, Bed, Buildings, CaretDown, CaretRight, Door, DotsThree, Info, LinkSimple, ListDashes, PencilSimple, Plus, Stack, UploadSimple, Warning, WarningCircle,
} from '../../components/icons';
import { Button, Field, Input, MultiFilter, PageHeader, Pill, SearchInput, Sheet, SheetHero, SheetSection, Tabs, cx, listNav, type SheetNav } from '../../components/ui';
import { Checkbox } from '../../components/shadcn/checkbox';
import { allUnits, flatsOf, money, per, useInv, type ArchivedRow, type Flat, type Property, type Unit, type UStatus } from '../../data/inventory';
import { useOpen } from '../hooks';
import { FieldErr, Menu, Modal, Picker, PropStatus, RadioCard } from './common';
import { GhostZone } from '../../components/headerCtx';
import { EmptyArea } from '../allocations/common';

type Sel = { pid: string; bi: number; floor: number; flat: number | null };
type TabId = 'all' | 'Active' | 'Draft' | 'Inactive' | 'Archived';
const ROOM_TYPES = ['Ensuite single', 'Standard single', 'Studio', 'Ensuite double', 'Accessible ensuite'];

function parseUnit(id: string): Sel | null {
  const m = /^([^:]+):(\d+):(\d+)\.(\d+)\./.exec(id);
  return m ? { pid: m[1], bi: +m[2], floor: +m[3], flat: +m[4] } : null;
}

export function UnitsPage() {
  const all = useInv((s) => s.properties);
  const props = useMemo(() => all.filter((p) => p.status !== 'Archived' && p.units > 0 && !p.build), [all]);
  if (!props.length) return (
    <>
      <PageHeader icon={ListDashes} title="Units" crumbs={['Inventory']} />
      <EmptyArea art="beds" icon={ListDashes} title="No units yet" sub="Rooms show here once a property is built or imported.">
        <Button variant="primary" onClick={() => location.assign('#/inventory/properties')}>Add a property</Button>
      </EmptyArea>
    </>
  );
  return <UnitsView props={props} />;
}

function UnitsView({ props }: { props: Property[] }) {
  const nav = useNavigate();
  const [sp, setSp] = useSearchParams();
  const [open, setOpen] = useOpen();
  const edits = useInv((s) => s.unitEdits);
  const archived = useInv((s) => s.archived);
  const archivedFlats = useInv((s) => s.archivedFlats);
  const [sel, setSel] = useState<Sel>(() => {
    const fromOpen = open ? parseUnit(open) : null;
    if (fromOpen) return fromOpen;
    const pid = sp.get('p') ?? 'col';
    return pid === 'col' ? { pid, bi: 0, floor: 3, flat: null } : { pid, bi: 0, floor: 1, flat: null };
  });
  const [tab, setTab] = useState<TabId>('all');
  const [typeF, setTypeF] = useState<string[]>([]);
  const [cursor, setCursor] = useState(0);
  const [checked, setChecked] = useState<string[]>([]);
  const [archiveFlat, setArchiveFlat] = useState<Flat | null>(null);
  const [restore, setRestore] = useState<ArchivedRow | null>(null);
  const [renaming, setRenaming] = useState(false);

  const p = props.find((x) => x.id === sel.pid) ?? props[0];
  useEffect(() => { if (p && p.id !== sel.pid) setSel({ pid: p.id, bi: 0, floor: 1, flat: null }); }, [p, sel.pid]);
  useEffect(() => { const q = sp.get('p'); if (q && q !== sel.pid && !open) setSel({ pid: q, bi: 0, floor: q === 'col' ? 3 : 1, flat: null }); }, [sp]); // eslint-disable-line react-hooks/exhaustive-deps

  const flats = useMemo(() => flatsOf(p, sel.bi, sel.floor, edits).filter((f) => !archivedFlats.includes(f.id)), [p, sel.bi, sel.floor, edits, archivedFlats]);
  const shownFlats = sel.flat ? flats.filter((f) => f.id.endsWith(`|${sel.flat}`)) : flats;
  const all = useMemo(() => allUnits(p, edits), [p, edits]);
  const block = p.blocks[sel.bi];
  const curFlat = sel.flat ? flats.find((f) => f.id.endsWith(`|${sel.flat}`)) ?? null : null;
  const archRows = archived[p.id] ?? [];
  const archUnitIds = new Set(archivedFlats.filter((f) => f.startsWith(`${p.id}|`)).flatMap((fid) => { const [, bi, fl] = fid.split('|'); return flatsOf(p, +bi, +fl, edits).find((f) => f.id === fid)?.units.map((u) => u.id) ?? []; }));
  const live = all.filter((u) => !archUnitIds.has(u.id) && u.status !== 'Archived');
  const counts = p.id === 'col'
    ? { all: p.counts.all, Active: p.counts.active - [...archUnitIds].filter((id) => all.find((u) => u.id === id)?.status === 'Active').length, Draft: p.counts.draft - [...archUnitIds].filter((id) => all.find((u) => u.id === id)?.status === 'Draft').length, Inactive: p.counts.inactive - [...archUnitIds].filter((id) => all.find((u) => u.id === id)?.status === 'Inactive').length, Archived: archRows.length }
    : { all: all.length, Active: live.filter((u) => u.status === 'Active').length, Draft: live.filter((u) => u.status === 'Draft').length, Inactive: live.filter((u) => u.status === 'Inactive').length, Archived: archRows.length };
  const [q, setQ] = useState('');
  const ql = q.trim().toLowerCase();
  const visible = (u: Unit) => u.status !== 'Archived' && (tab === 'all' || u.status === tab) && (!typeF.length || typeF.includes(u.type)) && (!ql || u.code.toLowerCase().includes(ql) || u.type.toLowerCase().includes(ql));
  const groups = shownFlats.map((f) => ({ f, units: f.units.filter(visible) })).filter((g) => g.units.length || tab === 'all');
  const flatList = groups.flatMap((g) => g.units);
  const openUnit = open ? flats.flatMap((f) => f.units).find((u) => u.id === open) ?? all.find((u) => u.id === open) ?? null : null;

  // J/K move, Enter opens, X selects.
  const stateRef = useRef({ flatList, cursor });
  stateRef.current = { flatList, cursor };
  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement;
      if (/INPUT|TEXTAREA|SELECT/.test(t.tagName) || document.querySelector('[role=dialog]') || e.metaKey || e.ctrlKey) return;
      const { flatList: l, cursor: c } = stateRef.current;
      if (!l.length) return;
      if (e.key === 'j') setCursor(Math.min(l.length - 1, c + 1));
      else if (e.key === 'k') setCursor(Math.max(0, c - 1));
      else if (e.key === 'Enter') setOpen(l[c]?.id ?? null);
      else if (e.key === 'x') { const id = l[c]?.id; if (id) setChecked((x) => (x.includes(id) ? x.filter((y) => y !== id) : [...x, id])); }
    };
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, [setOpen]);

  /* Figma 3884:43935: the top bar stays INVENTORY › UNITS; the place in the tree is the heading band's small crumb + 20px title. */
  const placeCrumbs: { label: string; onClick?: () => void }[] = [{ label: p.name }, ...(block ? [{ label: block.name, onClick: curFlat ? () => go({ flat: null }) : undefined }] : []), ...(curFlat ? [{ label: `Floor ${sel.floor}`, onClick: () => go({ flat: null }) }] : [])];
  const title = curFlat ? curFlat.name : `Floor ${sel.floor}`;
  const go = (s: Partial<Sel>) => { setSel((x) => ({ ...x, ...s })); setCursor(0); setChecked([]); if (s.pid) setSp((q) => { const n = new URLSearchParams(q); n.set('p', s.pid!); n.delete('open'); return n; }, { replace: true }); };

  const doArchiveFlat = (f: Flat) => {
    const st = useInv.getState();
    const rows: ArchivedRow[] = [{ id: f.id, name: f.name, type: 'Flat', flat: true, units: f.units.length, who: 'Priya Shah', when: 'Just now' }, ...f.units.map((u) => ({ id: `${f.id}#${u.code}`, name: u.code, type: u.type, who: 'Priya Shah', when: 'Just now', parent: f.id }))];
    st.set('archivedFlats', (l) => [...l, f.id]);
    st.set('archived', (a) => ({ ...a, [p.id]: [...rows, ...(a[p.id] ?? [])] }));
    setArchiveFlat(null);
    if (curFlat?.id === f.id) go({ flat: null });
    toast.success(`${f.name} and ${f.units.length} units archived`, { action: { label: 'Undo', onClick: () => undoArchive(f.id) } });
  };
  const undoArchive = (fid: string) => {
    const st = useInv.getState();
    st.set('archivedFlats', (l) => l.filter((x) => x !== fid));
    st.set('archived', (a) => ({ ...a, [p.id]: (a[p.id] ?? []).filter((r) => r.id !== fid && r.parent !== fid) }));
  };

  return (
    <>
      <PageHeader icon={ListDashes} title="Units" crumbs={['Inventory']}>
        <Button icon={UploadSimple} onClick={() => nav('/inventory/properties?import=1')}>Import</Button>
        <Button variant="primary" icon={Plus} onClick={() => addUnit()}>Add unit</Button>
      </PageHeader>
      <div className="flex-1 min-h-0 flex">
        <Tree props={props} p={p} sel={sel} go={go} archivedFlats={archivedFlats} />
        <section className="flex-1 min-w-0 flex flex-col">
          {/* Heading band (Figma "Heading", 20/24/4/24): 12px #737373 crumb over the 20px medium title, flat actions on the right. */}
          <div className="shrink-0 px-6 pt-5 pb-1 flex items-end gap-3">
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1 text-xs leading-4 text-[#737373]">
                {placeCrumbs.map((c, i) => (
                  <span key={i} className="flex items-center gap-1">{i > 0 && <CaretRight size={12} strokeWidth={1.5} />}
                    {c.onClick ? <button type="button" onClick={c.onClick} className="hover:text-[#0A0A0A] hover:underline underline-offset-2">{c.label}</button> : c.label}</span>
                ))}
              </div>
              <h1 className="mt-1 text-xl leading-7 font-medium text-[#0A0A0A] truncate">{title}</h1>
            </div>
            <Menu width={200} trigger={(o) => <Button icon={DotsThree} onClick={o} aria-label="More" />} items={[
              { label: 'Rename', icon: PencilSimple, onClick: () => setRenaming(true), disabled: !curFlat },
              { label: 'Move', icon: ArrowsOutCardinal, onClick: () => toast('Pick a new floor for the flat in the tree'), disabled: !curFlat },
              { label: 'Copy link', icon: LinkSimple, onClick: () => { void navigator.clipboard?.writeText(window.location.href); toast.success('Link copied'); } },
              'sep',
              { label: curFlat ? `Archive ${curFlat.name}…` : 'Archive…', icon: Archive, danger: true, disabled: !curFlat, onClick: () => curFlat && setArchiveFlat(curFlat) },
            ]} />
          </div>
          {/* Toolbar: status tabs on the left; search and the room-type dropdown together on the right. */}
          <div className="shrink-0 px-6 py-3 flex items-center gap-2">
            <Tabs value={tab} onChange={(t) => { setTab(t); setCursor(0); }} tabs={[
              { id: 'all', label: 'All', count: counts.all }, { id: 'Active', label: 'Active', count: counts.Active }, { id: 'Draft', label: 'Draft', count: counts.Draft }, { id: 'Inactive', label: 'Inactive', count: counts.Inactive }, { id: 'Archived', label: 'Archived', count: counts.Archived },
            ]} />
            <div className="ml-auto flex items-center gap-2">
              <SearchInput value={q} onChange={(v) => { setQ(v); setCursor(0); }} placeholder="Search units" />
              <MultiFilter label="Room type" width={220} value={typeF} onChange={(v) => { setTypeF(v); setCursor(0); }} options={ROOM_TYPES.map((t) => ({ value: t }))} />
            </div>
          </div>

          {tab === 'Archived' ? (
            <ArchivedTable p={p} rows={archRows} onRestore={(r) => (r.flat ? setRestore(r) : restoreOne(p, r))} />
          ) : (
            <>
              <div data-fill className="flex-1 overflow-auto">
                <table className="w-full text-sm">
                  <thead className="sticky top-0 z-[1]"><tr className="text-left">
                    <th className="w-12 pl-6"><Checkbox aria-label="Select all" checked={!!flatList.length && checked.length === flatList.length} onCheckedChange={(v) => setChecked((v === true) ? flatList.map((u) => u.id) : [])} /></th>
                    {['Unit', 'Room type', `Rent / ${per(p)}`, 'Status', 'Tenancy template'].map((h, i) => <th key={h} className={cx('px-3', i === 2 && 'text-right', i === 3 && 'pl-6', i === 4 && 'pr-6')}>{h}</th>)}
                  </tr></thead>
                  <tbody>
                    {groups.map(({ f, units }) => (
                      <FlatGroup key={f.id} f={f} units={units} cursorId={flatList[cursor]?.id} open={open} checked={checked} setChecked={setChecked} onOpen={(id) => { setOpen(id); setCursor(flatList.findIndex((u) => u.id === id)); }}
                        onFlat={() => go({ flat: +f.id.split('|')[3] })} onArchive={() => setArchiveFlat(f)} />
                    ))}
                    {!groups.length && <tr><td colSpan={6} className="h-32 text-center text-sm text-[#737373]">No {tab === 'all' ? '' : tab.toLowerCase() + ' '}units here{typeF.length ? ` of type ${typeF.join(' or ')}` : ''}.</td></tr>}
                  </tbody>
                </table>
              </div>
              {/* Footer (59px, lines up with the sidebar profile): the count, or the bulk action while rows are ticked. */}
              <div className="h-[59px] shrink-0 px-6 flex items-center gap-3 border-t border-[#E5E5E5] text-sm text-[#737373]">
                {checked.length > 0 ? <>
                  <span className="text-ink font-medium">{checked.length} selected</span>
                  <Menu align="left" width={160} trigger={(o) => <Button size="sm" onClick={o}>Set status</Button>} items={(['Active', 'Inactive', 'Draft'] as UStatus[]).map((s) => ({ label: s, onClick: () => bulkStatus(s) }))} />
                  <button type="button" className="text-primary" onClick={() => setChecked([])}>Clear</button>
                </> : <span>Showing {flatList.length} of {shownFlats.reduce((n, f) => n + f.units.length, 0)} units on {title}</span>}
              </div>
            </>
          )}
        </section>
      </div>

      <UnitSheet p={p} unit={openUnit} nav={listNav(flatList, (x) => x.id === open, (x) => setOpen(x.id))} onClose={() => setOpen(null)} path={[p.name, block?.name ?? '', `Floor ${sel.floor}`, flats.find((f) => f.units.some((u) => u.id === open))?.name ?? '']} />
      <ArchiveFlatDialog flat={archiveFlat} onClose={() => setArchiveFlat(null)} onConfirm={doArchiveFlat} />
      <RestoreDialog p={p} row={restore} onClose={() => setRestore(null)} />
      <RenameDialog flat={renaming ? curFlat : null} siblings={flats} onClose={() => setRenaming(false)} />
    </>
  );

  function addUnit() {
    const f = curFlat ?? flats[flats.length - 1];
    if (!f) return;
    const letters = 'ABCDEFGHIJKLMNOP';
    const code = `${f.name.replace('Flat ', '')}.${letters[f.units.length] ?? f.units.length + 1}`;
    const id = `${p.id}:${sel.bi}:${code}`;
    useInv.getState().editUnit(id, { status: 'Draft' });
    toast.success(`${code} added to ${f.name} as Draft`, { description: 'Open it to give it a room type and tenancy.' });
    setOpen(id);
  }
  function bulkStatus(s: UStatus) {
    const ed = useInv.getState().editUnit;
    let skipped = 0;
    checked.forEach((id) => { const u = all.find((x) => x.id === id); if (s === 'Active' && u && u.rent == null) { skipped++; return; } ed(id, { status: s }); });
    toast.success(`${checked.length - skipped} units set to ${s}${skipped ? ` · ${skipped} skipped, no tenancy` : ''}`);
    setChecked([]);
  }
}

function restoreOne(p: Property, r: ArchivedRow) {
  useInv.getState().set('archived', (a) => ({ ...a, [p.id]: (a[p.id] ?? []).filter((x) => x.id !== r.id) }));
  toast.success(`${r.name} restored as Draft`);
}

/* ---------------- Left hierarchy tree ---------------- */
/* Figma 3884:43935 tree panel: 264px, a property picker on top, a "HIERARCHY · N UNITS" mono label, then the picked
   property's blocks → floors → flats. 32px r8 rows indented 4/20/36; counts in Geist Mono 12 #A3A3A3; the selected
   row is raised white (1px #E5E5E5, soft drop) with its icon and count in blue. */
function Tree({ props, p, sel, go, archivedFlats }: { props: Property[]; p: Property; sel: Sel; go: (s: Partial<Sel>) => void; archivedFlats: string[] }) {
  const edits = useInv((s) => s.unitEdits);
  const [open, setOpen] = useState<Record<string, boolean>>({ [`${sel.pid}|${sel.bi}`]: true, [`${sel.pid}|${sel.bi}|${sel.floor}`]: true });
  const tog = (k: string) => setOpen((o) => ({ ...o, [k]: !o[k] }));
  const row = (depth: number, k: string, I: typeof Bed, label: string, n: number | null, active: boolean, onClick: () => void, leaf = false) => (
    <div key={k} aria-current={active || undefined} style={{ paddingLeft: 4 + depth * 16 }} onClick={onClick}
      className={cx('h-8 shrink-0 flex items-center gap-1.5 rounded-lg border pr-2 text-sm leading-5 cursor-pointer transition-colors',
        depth === 0 || active ? 'font-medium' : 'font-normal',
        active ? 'bg-white border-[#E5E5E5] shadow-[0_1px_2px_rgba(10,13,20,0.06)] text-[#0A0A0A]' : 'border-transparent text-[#0A0A0A] hover:bg-black/[0.03]')}>
      {leaf ? <span className="w-4 shrink-0" /> : <button type="button" aria-label={open[k] ? 'Collapse' : 'Expand'} aria-expanded={!!open[k]} onClick={(e) => { e.stopPropagation(); tog(k); }} className="size-4 shrink-0 rounded flex items-center justify-center text-[#737373] hover:text-[#0A0A0A]">{open[k] ? <CaretDown size={14} strokeWidth={1.5} /> : <CaretRight size={14} strokeWidth={1.5} />}</button>}
      <I size={16} strokeWidth={1.5} className={cx('shrink-0', active ? 'text-[#2563EB]' : 'text-[#404040]')} />
      <span className="truncate flex-1">{label}</span>
      {n != null && <span className={cx('font-mono text-xs tabular-nums', active ? 'text-[#2563EB]' : 'text-[#A3A3A3]')}>{n}</span>}
    </div>
  );
  return (
    <aside className="w-[264px] shrink-0 border-r border-[#E5E5E5] bg-white overflow-auto px-3 pt-3 pb-4 flex flex-col">
      <Menu align="left" width={240} trigger={(o) => (
        <button type="button" onClick={o} className="h-9 shrink-0 px-2.5 rounded-lg border border-[#E5E5E5] bg-white shadow-[0_1px_2px_rgba(0,0,0,0.05)] flex items-center gap-2 text-sm font-medium text-[#0A0A0A] hover:bg-[#FAFAFA]">
          <Buildings size={16} strokeWidth={1.5} className="text-[#404040] shrink-0" /><span className="flex-1 text-left truncate">{p.name}</span><CaretDown size={16} strokeWidth={1.5} className="text-[#737373]" />
        </button>
      )} items={props.map((x) => ({ label: x.name, icon: Buildings, onClick: () => go({ pid: x.id, bi: 0, floor: x.id === 'col' ? 3 : 1, flat: null }) }))} />
      <div className="h-9 shrink-0 px-2 pt-3.5 pb-1.5 flex items-center justify-between font-mono uppercase text-xs leading-4 font-medium tracking-[0.48px] text-[#737373]">
        <span>Hierarchy</span><span>{p.units} units</span>
      </div>
      {p.blocks.map((b, bi) => {
        const bk = `${p.id}|${bi}`;
        return (
          <div key={bk} className="flex flex-col">
            {row(0, bk, Buildings, b.name, b.rooms, false, () => { tog(bk); go({ pid: p.id, bi, floor: 1, flat: null }); })}
            {open[bk] && Array.from({ length: b.floors }, (_, i) => {
              const fk = `${bk}|${i + 1}`;
              const isFloor = sel.pid === p.id && sel.bi === bi && sel.floor === i + 1;
              const fl = open[fk] || isFloor ? flatsOf(p, bi, i + 1, edits).filter((f) => !archivedFlats.includes(f.id)) : [];
              return (
                <div key={fk} className="flex flex-col">
                  {row(1, fk, Stack, p.structure === 'House' ? 'Houses' : `Floor ${i + 1}`, Math.round(b.rooms / b.floors), isFloor && sel.flat == null, () => { setOpen((o) => ({ ...o, [fk]: true })); go({ pid: p.id, bi, floor: i + 1, flat: null }); })}
                  {open[fk] && fl.map((f) => row(2, f.id, Door, f.name, f.units.length, isFloor && sel.flat === +f.id.split('|')[3], () => go({ pid: p.id, bi, floor: i + 1, flat: +f.id.split('|')[3] }), true))}
                </div>
              );
            })}
          </div>
        );
      })}
    </aside>
  );
}

/* ---------------- Grouped table rows ---------------- */
function FlatGroup({ f, units, cursorId, open, checked, setChecked, onOpen, onFlat, onArchive }: {
  f: Flat; units: Unit[]; cursorId?: string; open: string | null; checked: string[]; setChecked: (fn: (c: string[]) => string[]) => void; onOpen: (id: string) => void; onFlat: () => void; onArchive: () => void;
}) {
  const active = f.units.filter((u) => u.status === 'Active').length;
  return (
    <>
      {/* Group row (Figma "Group · Flat 3.1"): 36px #FAFAFA, 24/16 sides; flat name 14 medium, count line 12 #737373. */}
      <tr className="bg-[#FAFAFA]">
        <td colSpan={6} className="h-9 pl-6 pr-4 border-b border-[#E5E5E5]">
          <div className="flex items-center gap-2">
            <CaretDown size={16} strokeWidth={1.5} className="text-[#737373]" /><button type="button" onClick={onFlat} className="text-sm leading-5 font-medium text-[#0A0A0A] hover:underline underline-offset-2">{f.name}</button><span className="text-xs leading-4 text-[#737373]">{f.units.length} units · {active} active</span>
            <span className="ml-auto"><Menu width={180} trigger={(o) => <button type="button" aria-label={`More for ${f.name}`} onClick={o} className="size-6 rounded-md hover:bg-black/[0.05] flex items-center justify-center text-[#404040]"><DotsThree size={16} weight="bold" /></button>}
              items={[{ label: 'Open flat', icon: ArrowSquareOut, onClick: onFlat }, 'sep', { label: `Archive ${f.name}…`, icon: Archive, danger: true, onClick: onArchive }]} /></span>
          </div>
        </td>
      </tr>
      {units.map((u) => (
        <tr key={u.id} onClick={() => onOpen(u.id)} aria-selected={open === u.id} className={cx('border-b border-[#E5E5E5] cursor-pointer', open === u.id ? 'bg-[#EFF6FF] shadow-[inset_2px_0_0_#2563EB]' : cursorId === u.id ? 'bg-[#FAFAFA]' : 'hover:bg-[#FAFAFA]/70')}>
          <td className="pl-6 h-12" onClick={(e) => e.stopPropagation()}><Checkbox aria-label={`Select ${u.code}`} checked={checked.includes(u.id)} onCheckedChange={() => setChecked((c) => (c.includes(u.id) ? c.filter((x) => x !== u.id) : [...c, u.id]))} /></td>
          <td className="px-3 font-mono font-medium text-[13px] text-[#0A0A0A]">{u.code}</td>
          <td className="px-3 text-sm text-[#0A0A0A]">{u.type}</td>
          <td className="px-3 text-right text-sm text-[#0A0A0A] tabular-nums">{u.rent != null ? money(u.rent) : <span className="text-[#737373]">No tenancy</span>}</td>
          <td className="px-3 pl-6"><PropStatus s={u.status} /></td>
          <td className="pl-3 pr-6 text-[#737373]">{u.template ?? <span className="text-[#737373]">—</span>}</td>
        </tr>
      ))}
    </>
  );
}

/* ---------------- F4-04/05: unit side panel ---------------- */
function UnitSheet({ p, unit, onClose, path, nav }: { nav?: SheetNav; p: Property; unit: (Unit & { block?: string }) | null; onClose: () => void; path: string[] }) {
  const editUnit = useInv((s) => s.editUnit);
  const [blocked, setBlocked] = useState(false);
  const [size, setSize] = useState('');
  useEffect(() => { setBlocked(false); setSize(unit ? String(unit.size) : ''); }, [unit?.id]); // eslint-disable-line react-hooks/exhaustive-deps
  const [confirmArchive, setConfirmArchive] = useState(false);
  if (!unit) return null;
  const archive = () => { editUnit(unit.id, { status: 'Archived' }); toast.success(`${unit.code} archived`, { action: { label: 'Undo', onClick: () => editUnit(unit.id, { status: unit.status }) } }); onClose(); };
  const sizeErr = !size.trim() ? 'Enter a room size.' : !/^\d+(\.\d{1,2})?$/.test(size) || +size <= 0 ? 'Room size must be a number above 0, e.g. 14.' : '';
  const setStatus = (s: UStatus) => {
    if (s === unit.status) return;
    if (s === 'Active' && unit.rent == null) { setBlocked(true); return; }
    setBlocked(false);
    editUnit(unit.id, { status: s });
    toast.success(`${unit.code} is ${s.toLowerCase()}`);
  };
  const applyTenancy = (andActivate: boolean) => {
    const rt = p.roomTypes.find((r) => r.name === unit.type);
    const weeks = unit.type.startsWith('Ensuite') || unit.type === 'Studio' ? 51 : 44;
    const rent = rt?.rent ?? rt?.next?.rent ?? (unit.type === 'Studio' ? 246 : unit.type.startsWith('Ensuite') ? 212 : 168);
    editUnit(unit.id, { rent, weeks, template: `${unit.type} · ${weeks} wk`, ...(andActivate ? { status: 'Active' as UStatus } : {}) });
    setBlocked(false);
    toast.success(andActivate ? `${unit.type} · ${weeks} wk applied · ${unit.code} is active` : `${unit.type} · ${weeks} wk applied to ${unit.code}`);
  };
  return (
    <Sheet open onClose={onClose} nav={nav} width={420} title="Unit"
      footer={<Button className="mr-auto" icon={Archive} variant="danger-ghost" onClick={() => (unit.rent != null ? setConfirmArchive(true) : archive())}>Archive unit</Button>}>
      <Modal open={confirmArchive} onClose={() => setConfirmArchive(false)} icon={Archive} width={420} title={`Archive ${unit.code}?`} sub={`It has a ${unit.template ?? 'tenancy'} linked. Archiving takes it off sale; the tenancy stays on record.`}
        footer={<><Button onClick={() => setConfirmArchive(false)}>Keep</Button><Button variant="danger" icon={null} onClick={() => { setConfirmArchive(false); archive(); }}>Archive unit</Button></>}>{null}</Modal>
      <SheetHero avatar={false} name={<span className="font-mono">{unit.code}</span>} meta={path.filter(Boolean).join(' › ')}>
        <PropStatus s={unit.status} />
        <Pill outline icon={Bed}>Room · BSU{unit.note ? ` · ${unit.note}` : ''}</Pill>
      </SheetHero>
      {blocked && (
        <div className="mb-5 rounded-xl border border-[#EF44444D] p-3.5">
          <div className="flex gap-2.5"><WarningCircle size={18} weight="fill" className="text-[#EF4444] shrink-0" /><div><div className="text-sm font-semibold text-[#E0243A]">{unit.code} can’t be active</div><div className="text-sm text-[#737373] mt-0.5">Apply the {unit.type} tenancy first, then it goes active.</div></div></div>
          <div className="mt-3 flex gap-2 justify-end"><Button size="sm" onClick={() => setBlocked(false)}>Keep as Draft</Button><Button size="sm" variant="primary" onClick={() => applyTenancy(true)}>Apply tenancy</Button></div>
        </div>
      )}
      <SheetSection title="Status">
        <Picker value={unit.status === 'Archived' ? 'Inactive' : unit.status} onChange={(v) => setStatus(v as UStatus)} options={[{ id: 'Draft', label: 'Draft' }, { id: 'Active', label: 'Active' }, { id: 'Inactive', label: 'Inactive' }]} />
      </SheetSection>
      <SheetSection title="Room">
        <div className="space-y-4">
          <Field label="Room type"><Picker value={unit.type} onChange={(v) => { editUnit(unit.id, { type: v }); toast.success(`${unit.code} is now ${v}`); }} icon={Bed} options={ROOM_TYPES.map((t) => ({ id: t, label: t }))} /></Field>
          <Field label="Room size *">
            <label className="h-8 flex items-center rounded-lg border border-gray-300 px-2.5 text-sm"><input aria-label="Room size" value={size} onChange={(e) => setSize(e.target.value.replace(/[^0-9.]/g, ''))} onBlur={() => !sizeErr && +size !== unit.size && (editUnit(unit.id, { size: +size }), toast.success(`${unit.code} room size saved · ${+size} m²`))} className="flex-1 outline-none" /><span className="text-[#737373] text-xs">m²</span></label>
            <FieldErr>{sizeErr && `${sizeErr} Not saved.`}</FieldErr>
          </Field>
        </div>
      </SheetSection>
      <SheetSection title="Tenancy">
        {unit.rent != null ? (
          <div className="rounded-xl border border-line p-3.5"><div className="text-sm font-medium">{unit.template}</div><div className="text-xs text-[#737373]">{money(unit.rent)} / {per(p)} · linked to the template</div></div>
        ) : (
          <div className="rounded-xl border border-dashed border-gray-300 p-3.5 flex items-center gap-3"><span className="text-sm text-[#737373] flex-1">No tenancy</span><Button size="sm" onClick={() => applyTenancy(false)}>Apply tenancy</Button></div>
        )}
      </SheetSection>
    </Sheet>
  );
}

/* ---------------- F6: archive a flat ---------------- */
function ArchiveFlatDialog({ flat, onClose, onConfirm }: { flat: Flat | null; onClose: () => void; onConfirm: (f: Flat) => void }) {
  const busy = useRef(false);
  useEffect(() => { if (flat) busy.current = false; }, [flat]);
  if (!flat) return null;
  const withT = flat.units.filter((u) => u.rent != null).length;
  return (
    <Modal open onClose={onClose} icon={Archive} tone="red" title={`Archive ${flat.name}?`} sub={`${flat.name} and its ${flat.units.length} units leave every list and can’t be let. You can restore them from Archived.`} width={500}
      footer={<><Button onClick={onClose}>Cancel</Button><Button variant="danger" onClick={() => { if (busy.current) return; busy.current = true; onConfirm(flat); }}>Archive flat and {flat.units.length} units</Button></>}>
      <div className="rounded-xl border border-line divide-y divide-line">
        {flat.units.map((u) => <div key={u.id} className="h-10 px-3.5 flex items-center gap-3 text-sm"><span className="font-mono w-14">{u.code}</span><span className="flex-1 text-[#737373]">{u.type}</span><PropStatus s={u.status} /></div>)}
      </div>
      <div className="mt-3 rounded-xl border border-[#3B82F64D] p-3 flex gap-2.5 text-sm"><Info size={17} weight="fill" className="text-[#3B82F6] shrink-0" /><span><b className="font-semibold text-[#1D4ED8]">{withT} tenancies keep their status</b><span className="block text-[#737373]">Signed residents stay in their rooms; nobody new can book them.</span></span></div>
    </Modal>
  );
}

/* ---------------- Archived view + restore ---------------- */
function ArchivedTable({ p, rows, onRestore }: { p: Property; rows: ArchivedRow[]; onRestore: (r: ArchivedRow) => void }) {
  const top = rows.filter((r) => !r.parent);
  return (
    <>
      <div data-fill className="flex-1 overflow-auto px-[var(--gx,16px)]">
        <table className="w-full text-sm">
          <thead className="sticky top-0 bg-white"><tr className="text-left text-xs text-[#737373]">{['Entity', 'Type', 'Status', 'Archived', ''].map((h, i) => <th key={i} className={cx('font-medium h-9 border-b border-line px-3', i === 0 && 'pl-[var(--cx,12px)]', i === 4 && 'pr-[var(--cx,12px)]')}>{h}</th>)}</tr></thead>
          <GhostZone.Provider value><tbody>
            {top.map((r) => (
              <tr key={r.id} className="border-b border-line">
                <td className="pl-[var(--cx,12px)] pr-3 h-10"><span className="flex items-center gap-2">{r.flat ? <Door size={14} className="text-[#737373]" /> : <Bed size={14} className="text-[#737373]" />}<span className={r.flat ? 'font-medium' : 'font-mono text-sm'}>{r.name}</span>{r.flat && <span className="text-xs text-[#737373]">+ {r.units} units</span>}</span></td>
                <td className="px-3 text-[#737373]">{r.flat ? 'Flat' : r.type}</td>
                <td className="px-3"><PropStatus s="Archived" /></td>
                <td className="px-3 text-[#737373]">{r.who} · {r.when}</td>
                <td className="pl-3 pr-[var(--cx,12px)] text-right"><Button size="sm" icon={ArrowUUpLeft} onClick={() => onRestore(r)}>Restore…</Button></td>
              </tr>
            ))}
            {!top.length && <tr><td colSpan={5} className="h-32 text-center text-sm text-[#737373]">Nothing archived in {p.name}.</td></tr>}
          </tbody></GhostZone.Provider>
        </table>
      </div>
      <div className="h-10 shrink-0 px-5 flex items-center border-t border-line text-sm text-[#737373]">{rows.length} archived in {p.name}</div>
    </>
  );
}
function RestoreDialog({ p, row, onClose }: { p: Property; row: ArchivedRow | null; onClose: () => void }) {
  const edits = useInv((s) => s.unitEdits);
  const [to, setTo] = useState<UStatus>('Active');
  const busy = useRef(false);
  useEffect(() => { if (row) { setTo('Active'); busy.current = false; } }, [row]);
  if (!row) return null;
  const [, bi, fl] = row.id.split('|');
  const flat = flatsOf(p, +bi, +fl, edits).find((f) => f.id === row.id);
  const units = flat?.units ?? [];
  const noT = units.filter((u) => u.rent == null);
  const go = () => {
    if (busy.current) return;
    busy.current = true;
    const st = useInv.getState();
    st.set('archivedFlats', (l) => l.filter((x) => x !== row.id));
    st.set('archived', (a) => ({ ...a, [p.id]: (a[p.id] ?? []).filter((r) => r.id !== row.id && r.parent !== row.id) }));
    units.forEach((u) => st.editUnit(u.id, { status: to === 'Active' && u.rent == null ? 'Draft' : to }));
    onClose();
    toast.success(to === 'Active' ? `${row.name} restored · ${units.length - noT.length + 1} active${noT.length ? `, ${noT.map((u) => u.code).join(', ')} draft` : ''}` : `${row.name} restored · ${units.length + 1} ${to.toLowerCase()}`);
  };
  return (
    <Modal open onClose={onClose} icon={ArrowUUpLeft} title={`Restore ${row.name}?`} sub={`${row.name} and its ${units.length} units come back where they were.`} width={520}
      footer={<><Button onClick={onClose}>Cancel</Button><Button variant="primary" onClick={go}>Restore {units.length + 1}</Button></>}>
      <div className="text-sm font-medium text-gray-700 mb-1.5">Restore as</div>
      <div className="space-y-2">
        <RadioCard checked={to === 'Draft'} onClick={() => setTo('Draft')} title="Draft" sub="Nobody can book them until you make them active" />
        <RadioCard checked={to === 'Active'} onClick={() => setTo('Active')} title="Active" sub="Bookable straight away" />
        <RadioCard checked={to === 'Inactive'} onClick={() => setTo('Inactive')} title="Inactive" sub="Kept, not bookable" />
      </div>
      <div className="mt-4 rounded-xl border border-line divide-y divide-line">
        {units.map((u) => {
          const res: UStatus = to === 'Active' && u.rent == null ? 'Draft' : to;
          return <div key={u.id} className="h-10 px-3.5 flex items-center gap-3 text-sm"><span className="font-mono w-14">{u.code}</span><span className="flex-1 text-[#737373]">{res !== to ? 'No tenancy · comes back Draft' : u.type}</span><PropStatus s={res} /></div>;
        })}
      </div>
      {to === 'Active' && noT.length > 0 && <div className="mt-3 flex gap-2 text-xs text-[#737373]"><Warning size={14} className="text-[#F59E0B] shrink-0" />{noT.map((u) => u.code).join(', ')} has no tenancy, so it comes back Draft.</div>}
    </Modal>
  );
}
function RenameDialog({ flat, siblings, onClose }: { flat: Flat | null; siblings: Flat[]; onClose: () => void }) {
  const [v, setV] = useState('');
  useEffect(() => { if (flat) setV(flat.name); }, [flat]);
  if (!flat) return null;
  const name = v.trim();
  const err = !name ? 'Enter a name.' : siblings.some((f) => f.id !== flat.id && f.name.trim().toLowerCase() === name.toLowerCase()) ? `This floor already has ${name}.` : '';
  const save = () => {
    if (err) return;
    /* Flat names live with the unit edits under a "flat|" key, so flatsOf picks them up. */
    useInv.getState().set('unitEdits', (e) => ({ ...e, [`flat|${flat.id}`]: { code: name } }));
    onClose();
    toast.success(`${flat.name} renamed to ${name}`);
  };
  return (
    <Modal open onClose={onClose} icon={PencilSimple} title={`Rename ${flat.name}`} width={420} footer={<><Button onClick={onClose}>Cancel</Button><Button variant="primary" disabled={!!err || name === flat.name} onClick={save}>Rename</Button></>}>
      <Field label="Name"><Input value={v} onChange={(e) => setV(e.target.value)} /><FieldErr>{err}</FieldErr></Field>
    </Modal>
  );
}
