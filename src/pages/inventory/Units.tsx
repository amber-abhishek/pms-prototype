import { Fragment, useEffect, useMemo, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { toast } from 'sonner';
import {
  Archive, ArrowUUpLeft, Bed, CaretDown, CaretRight, CaretUpDown, MapPin, Door, DotsThree, Info, ListDashes, PencilSimple, Plus, Warning, WarningCircle, type Icon,
} from '../../components/icons';
import { PersonName, Button, Dropdown, Empty, Field, Input, MultiFilter, PageHeader, Pill, SearchInput, Sheet, SheetHero, SheetRow, SheetSection, cx, listNav, type SheetNav, PIN, SelectFilter } from '../../components/ui';
import { Checkbox } from '../../components/shadcn/checkbox';
import { allUnits, flatsOf, money, per, rentFor, useInv, type ArchivedRow, type Flat, type Property, type Structure, type Unit, type UStatus } from '../../data/inventory';
import { useOpen } from '../hooks';
import { EditLink, FieldErr, LineTabs, Menu, Modal, PanelModal, Picker, PropStatus, RadioCard, levelIcon } from './common';
import { GhostZone } from '../../components/headerCtx';
import { LevelFields, LevelSheet, layoutOf, type LevelKind } from './LevelSheet';
import { PHOTO } from './photos';
import { EmptyArea } from '../allocations/common';

/* The selection is a place in the tree: a property, a block, a floor or a flat. A null level means "the whole of the one above". */
type Sel = { pid: string; bi: number | null; floor: number | null; flat: number | null };
type TabId = 'all' | 'Active' | 'Draft' | 'Inactive' | 'Archived';
const ROOM_TYPES = ['Ensuite single', 'Standard single', 'Studio', 'Ensuite double', 'Accessible ensuite'];

/* Which levels the tree and table show come from the property's layout (Property layouts): floors and flats only when the
   layout has them. A houses layout (House › Room) keeps its houses as the data's flats, so they're named House n (2026-11-25). */
type Shape = { flats: boolean; house: boolean };
function shapeOf(p: Property, structures: Structure[]): Shape {
  const names = (structures.find((s) => s.name === layoutOf(p))?.levels ?? []).map((l) => l.name);
  const house = /house/i.test(names[0] ?? '') || (!names.length && p.structure === 'House');
  return { house, flats: !house && (names.length ? names.some((n) => /flat|apartment|cluster/i.test(n)) : true) };
}
/* Archiving works at any level: archivedFlats holds a block ("pid|bi"), floor ("pid|bi|floor") or flat id, and a flat is
   gone when it or anything above it is in the list (2026-11-25). */
const goneIn = (arch: string[]) => (id: string) => arch.some((a) => id === a || id.startsWith(`${a}|`));
/** Something to archive: a block, floor or flat (or house), with the flats it takes along. */
type ArchTarget = { id: string; name: string; kind: string; flats: Flat[] };
const nameOf = (f: Flat, sh: Shape) => (sh.house ? `House ${f.id.split('|')[3]}` : f.name);

function parseUnit(id: string): Sel | null {
  const m = /^([^:]+):(\d+):(\d+)\.(\d+)\./.exec(id);
  return m ? { pid: m[1], bi: +m[2], floor: +m[3], flat: +m[4] } : null;
}

export function UnitsPage() {
  const all = useInv((s) => s.properties);
  const props = useMemo(() => all.filter((p) => p.status !== 'Archived' && p.units > 0 && !p.build), [all]);
  if (!props.length) return (
    <>
      <PageHeader icon={ListDashes} title="Units" crumbs={['Properties']} />
      <EmptyArea art="getStarted" icon={ListDashes} title="No units yet" sub="Rooms show here once a property is built or imported.">
        <Button variant="primary" onClick={() => location.assign('#/inventory/properties')}>Create a property</Button>
      </EmptyArea>
    </>
  );
  return <UnitsView props={props} />;
}

function UnitsView({ props }: { props: Property[] }) {
  const [sp, setSp] = useSearchParams();
  const [open, setOpen] = useOpen();
  const edits = useInv((s) => s.unitEdits);
  const archived = useInv((s) => s.archived);
  const archivedFlats = useInv((s) => s.archivedFlats);
  const structures = useInv((s) => s.structures);
  /* Every property opens on its first block's Floor 1 (2026-11-23); a houses property on its list of houses. */
  const home = (pid: string): Sel => { const x = props.find((q) => q.id === pid); return x && shapeOf(x, structures).house ? { pid, bi: null, floor: null, flat: null } : { pid, bi: 0, floor: 1, flat: null }; };
  const [sel, setSel] = useState<Sel>(() => {
    const fromOpen = open ? parseUnit(open) : null;
    if (fromOpen) return fromOpen;
    return home(sp.get('p') ?? 'col');
  });
  const [tab, setTab] = useState<TabId>('all');
  const [typeF, setTypeF] = useState<string[]>([]);
  const [cursor, setCursor] = useState(0);
  /* The J/K cursor's grey shows only while moving by keyboard; a click (and closing the panel after it) leaves no grey behind. */
  const [kbd, setKbd] = useState(false);
  const [checked, setChecked] = useState<string[]>([]);
  const [archiveT, setArchiveT] = useState<ArchTarget | null>(null);
  const [restore, setRestore] = useState<ArchivedRow | null>(null);
  const [renaming, setRenaming] = useState<Flat | null>(null);
  const [adding, setAdding] = useState(false);
  /* The level panel (Block, Floor or Flat) for filling in custom fields; one panel at a time, so it closes the unit's. */
  const [level, setLevelRaw] = useState<LevelRef | null>(null);
  const setLevel = (l: LevelRef | null) => { if (l) setOpen(null); setLevelRaw(l); };

  const p = props.find((x) => x.id === sel.pid) ?? props[0];
  useEffect(() => { if (p && p.id !== sel.pid) setSel(home(p.id)); }, [p, sel.pid]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { const q = sp.get('p'); if (q && q !== sel.pid && !open) setSel(home(q)); }, [sp]); // eslint-disable-line react-hooks/exhaustive-deps

  /* What the table shows: a property or a block groups its units under block and floor rows; a floor or a flat under flat rows. */
  const mode: 'property' | 'block' | 'floor' | 'flat' = sel.bi == null ? 'property' : sel.floor == null ? 'block' : sel.flat == null ? 'floor' : 'flat';
  const sh = shapeOf(p, structures);
  const bi0 = sel.bi ?? 0;
  const fl0 = sel.floor ?? 1;
  const flats = useMemo(() => flatsOf(p, bi0, fl0, edits).filter((f) => !goneIn(archivedFlats)(f.id)), [p, bi0, fl0, edits, archivedFlats]);
  const shownFlats = sel.flat ? flats.filter((f) => f.id.endsWith(`|${sel.flat}`)) : flats;
  const all = useMemo(() => allUnits(p, edits), [p, edits]);
  const block = sel.bi != null ? p.blocks[sel.bi] : undefined;
  const curFlat = sel.flat ? flats.find((f) => f.id.endsWith(`|${sel.flat}`)) ?? null : null;
  const archRows = archived[p.id] ?? [];
  const archUnitIds = new Set(p.blocks.flatMap((b, bi) => Array.from({ length: b.floors }, (_, i) => flatsOf(p, bi, i + 1, edits)).flat()).filter((f) => goneIn(archivedFlats)(f.id)).flatMap((f) => f.units.map((u) => u.id)));
  const live = all.filter((u) => !archUnitIds.has(u.id) && u.status !== 'Archived');
  const counts = p.id === 'col'
    ? { all: p.counts.all, Active: p.counts.active - [...archUnitIds].filter((id) => all.find((u) => u.id === id)?.status === 'Active').length, Draft: p.counts.draft - [...archUnitIds].filter((id) => all.find((u) => u.id === id)?.status === 'Draft').length, Inactive: p.counts.inactive - [...archUnitIds].filter((id) => all.find((u) => u.id === id)?.status === 'Inactive').length, Archived: archRows.length }
    : { all: all.length, Active: live.filter((u) => u.status === 'Active').length, Draft: live.filter((u) => u.status === 'Draft').length, Inactive: live.filter((u) => u.status === 'Inactive').length, Archived: archRows.length };
  const [q, setQ] = useState('');
  const ql = q.trim().toLowerCase();
  const visible = (u: Unit) => u.status !== 'Archived' && (tab === 'all' || u.status === tab) && (!typeF.length || typeF.includes(u.type)) && (!ql || u.code.toLowerCase().includes(ql) || u.type.toLowerCase().includes(ql));
  const groups = shownFlats.map((f) => ({ f, units: f.units.filter(visible) })).filter((g) => g.units.length || tab === 'all');
  /* Block → floor → units, for the property and block views. */
  const blockGroups = useMemo(() => {
    if (sh.house || (mode !== 'property' && mode !== 'block')) return [];
    const bis = (mode === 'property' ? p.blocks.map((_, i) => i) : [sel.bi!]).filter((bi) => !goneIn(archivedFlats)(`${p.id}|${bi}`));
    return bis.map((bi) => {
      const b = p.blocks[bi];
      const floors = Array.from({ length: b.floors }, (_, i) => ({ floor: i + 1, gone: goneIn(archivedFlats)(`${p.id}|${bi}|${i + 1}`), units: flatsOf(p, bi, i + 1, edits).filter((f) => !goneIn(archivedFlats)(f.id)).flatMap((f) => f.units) }));
      return { bi, b, floors: floors.filter((f) => !f.gone) };
    });
  }, [mode, p, sel.bi, edits, archivedFlats, sh.house]);
  const shownBlocks = blockGroups.map((g) => ({ ...g, floors: g.floors.map((f) => ({ ...f, shown: f.units.filter(visible) })).filter((f) => f.shown.length || tab === 'all') }));
  /* Property/block: floor rows. Floor (with flats), or a houses property: flat (house) rows. Otherwise one straight list. */
  const grouped = !sh.house && (mode === 'property' || mode === 'block');
  const byFlat = sh.house ? mode !== 'flat' : mode === 'floor' && sh.flats;
  /* Place only where it says something the rows above don't: the flat under a floor row, or the full place in a flat view. */
  const showPlace = grouped ? sh.flats : mode === 'flat' && !sh.house;
  const flatList = grouped ? shownBlocks.flatMap((g) => g.floors.flatMap((f) => f.shown)) : groups.flatMap((g) => g.units);
  const totalHere = grouped ? blockGroups.reduce((n, g) => n + g.floors.reduce((m, f) => m + f.units.length, 0), 0) : shownFlats.reduce((n, f) => n + f.units.length, 0);
  const openUnit = open ? flats.flatMap((f) => f.units).find((u) => u.id === open) ?? all.find((u) => u.id === open) ?? null : null;
  const openAt = open ? parseUnit(open) : null;
  const placeOf = (u: Unit, flatOnly = false) => { const at = parseUnit(u.id); if (!at) return ''; const flat = `Flat ${at.floor}.${at.flat}`; return flatOnly ? flat : [p.blocks[at.bi ?? 0]?.name ?? '', `Floor ${at.floor}`, ...(sh.flats ? [flat] : [])].join(' · '); };

  // J/K move, Enter opens, X selects.
  const stateRef = useRef({ flatList, cursor });
  stateRef.current = { flatList, cursor };
  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement;
      if (/INPUT|TEXTAREA|SELECT/.test(t.tagName) || document.querySelector('[role=dialog]') || e.metaKey || e.ctrlKey) return;
      const { flatList: l, cursor: c } = stateRef.current;
      if (!l.length) return;
      if (e.key === 'j') { setKbd(true); setCursor(Math.min(l.length - 1, c + 1)); }
      else if (e.key === 'k') { setKbd(true); setCursor(Math.max(0, c - 1)); }
      else if (e.key === 'Enter') setOpen(l[c]?.id ?? null);
      else if (e.key === 'x') { const id = l[c]?.id; if (id) setChecked((x) => (x.includes(id) ? x.filter((y) => y !== id) : [...x, id])); }
    };
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, [setOpen]);

  const go = (s: Sel) => { setSel(s); setCursor(0); setChecked([]); if (s.pid !== sel.pid) setSp((q) => { const n = new URLSearchParams(q); n.set('p', s.pid); n.delete('open'); return n; }, { replace: true }); };
  const toProperty = () => go({ pid: p.id, bi: null, floor: null, flat: null });
  const toBlock = (bi: number) => go({ pid: p.id, bi, floor: null, flat: null });
  const toFloor = (bi: number, floor: number) => go({ pid: p.id, bi, floor, flat: null });
  /* Figma 4251:17646: the heading is the place, property · block · floor; each part above the current one goes back up. */
  const floorName = p.structure === 'House' ? 'Houses' : `Floor ${sel.floor}`;
  const place: { label: string; onClick?: () => void }[] = [
    { label: p.name, onClick: mode !== 'property' ? toProperty : undefined },
    ...(block && !sh.house ? [{ label: block.name, onClick: mode === 'floor' || mode === 'flat' ? () => toBlock(sel.bi!) : undefined }] : []),
    ...(sel.floor != null && !sh.house ? [{ label: floorName, onClick: mode === 'flat' ? () => toFloor(sel.bi!, sel.floor!) : undefined }] : []),
    ...(curFlat ? [{ label: nameOf(curFlat, sh) }] : []),
  ];
  const title = place[place.length - 1].label;
  const toggleIds = (ids: string[]) => setChecked((c) => (ids.every((id) => c.includes(id)) ? c.filter((x) => !ids.includes(x)) : [...new Set([...c, ...ids])]));
  const tri = (ids: string[]): boolean | 'indeterminate' => { const n = ids.filter((id) => checked.includes(id)).length; return !ids.length || !n ? false : n === ids.length ? true : 'indeterminate'; };
  const onOpenUnit = (id: string) => { setKbd(false); setOpen(id); setCursor(flatList.findIndex((u) => u.id === id)); };
  const unitRow = (u: Unit, place?: string) => <UnitRow key={u.id} u={u} place={place} cursor={kbd && flatList[cursor]?.id === u.id} open={open === u.id} checked={checked.includes(u.id)} onCheck={() => toggleIds([u.id])} onOpen={() => onOpenUnit(u.id)} />;

  /* A level's archive: from its panel (Archive in the control bar) or a flat's ⋯ menu. The panel closes and, if the table
     was showing what went, it steps up to the level above. */
  const doArchive = (t: ArchTarget) => {
    const st = useInv.getState();
    const units = t.flats.flatMap((f) => f.units);
    const rows: ArchivedRow[] = [{ id: t.id, name: t.name, type: t.kind, flat: true, units: units.length, who: 'Arjun Mehta', when: 'Just now' }, ...units.map((u) => ({ id: `${t.id}#${u.id}`, name: u.code, type: u.type, who: 'Arjun Mehta', when: 'Just now', parent: t.id }))];
    st.set('archivedFlats', (l) => [...l, t.id]);
    st.set('archived', (a) => ({ ...a, [p.id]: [...rows, ...(a[p.id] ?? [])] }));
    setArchiveT(null);
    setLevelRaw(null);
    const [, tb, tf] = t.id.split('|');
    const here = [p.id, sel.bi, sel.floor, sel.flat].filter((x) => x != null).join('|');
    if (here === t.id || here.startsWith(`${t.id}|`)) go(tf == null ? { pid: p.id, bi: null, floor: null, flat: null } : t.id.split('|').length === 3 ? { pid: p.id, bi: +tb, floor: null, flat: null } : sh.house ? { pid: p.id, bi: null, floor: null, flat: null } : { pid: p.id, bi: +tb, floor: +tf, flat: null });
    toast.success(`${t.name} and ${units.length} units archived`, { action: { label: 'Undo', onClick: () => undoArchive(t.id) } });
  };
  /* What archiving a level takes with it. */
  const targetOf = (l: LevelRef): ArchTarget | null => {
    const b = p.blocks[l.bi]; if (!b) return null;
    const live = (fs: Flat[]) => fs.filter((f) => !goneIn(archivedFlats)(f.id));
    if (l.kind === 'Block') return { id: `${p.id}|${l.bi}`, name: b.name, kind: 'Block', flats: live(Array.from({ length: b.floors }, (_, i) => flatsOf(p, l.bi, i + 1, edits)).flat()) };
    const fs = live(flatsOf(p, l.bi, l.floor, edits));
    if (l.kind === 'Floor') return { id: `${p.id}|${l.bi}|${l.floor}`, name: `Floor ${l.floor}`, kind: 'Floor', flats: fs };
    const f = fs.find((x) => +x.id.split('|')[3] === l.flat); if (!f) return null;
    return { id: f.id, name: nameOf(f, sh), kind: sh.house ? 'House' : 'Flat', flats: [f] };
  };
  const undoArchive = (fid: string) => {
    const st = useInv.getState();
    st.set('archivedFlats', (l) => l.filter((x) => x !== fid));
    st.set('archived', (a) => ({ ...a, [p.id]: (a[p.id] ?? []).filter((r) => r.id !== fid && r.parent !== fid) }));
  };

  return (
    <>
      <PageHeader icon={ListDashes} title="Units" crumbs={['Properties']}>
        <Button variant="primary" icon={Plus} onClick={() => addUnit()}>Add unit</Button>
      </PageHeader>
      <div className="flex-1 min-h-0 flex">
        <Tree props={props} structures={structures} sel={sel} go={go} archivedFlats={archivedFlats} onInfo={(pid, l) => { if (pid !== p.id) go({ pid, bi: l.bi, floor: l.kind === 'Block' ? null : l.floor, flat: l.flat ?? null }); setLevel(l); }} />
        <section className="flex-1 min-w-0 flex flex-col">
          {/* Heading band: the place as one 20px line, property · block · floor; the parts above the current level link back up. */}
          <div className="shrink-0 px-6 pt-5 pb-4 border-b border-[#E5E5E5] flex items-center gap-3">
            <h1 className="min-w-0 flex-1 text-xl leading-7 font-medium text-[#0A0A0A] truncate">
              {place.map((c, i) => (
                <span key={i}>{i > 0 && <span className="text-[#A3A3A3]"> · </span>}
                  {c.onClick ? <button type="button" onClick={c.onClick} className="text-[#737373] hover:text-[#0A0A0A] hover:underline underline-offset-4">{c.label}</button> : c.label}</span>
              ))}
            </h1>
            {/* No Details button (2026-11-25): a level's panel opens from its (i) in the tree or its name in a group row. */}
            {/* Rename and archive act on a flat, so the menu shows only when a flat is selected. */}
            {curFlat && sh.flats && (
              <Menu width={200} trigger={(o) => <Button icon={DotsThree} onClick={o} aria-label="More" />} items={[
                { label: 'Rename', icon: PencilSimple, onClick: () => setRenaming(curFlat) },
                'sep',
                { label: 'Archive flat', icon: Archive, danger: true, onClick: () => setArchiveT({ id: curFlat.id, name: curFlat.name, kind: 'Flat', flats: [curFlat] }) },
              ]} />
            )}
          </div>
          {/* Toolbar: search on the left; the status (was the tab strip) as a single-choice dropdown and the room-type filter on the right. */}
          <div {...PIN} className="shrink-0 px-6 py-4 flex items-center gap-2">
            <div className="w-[260px] min-w-[140px] shrink [&>label]:!w-full"><SearchInput value={q} onChange={(v) => { setQ(v); setCursor(0); }} placeholder={`Search ${title}`} /></div>
            <div className="ml-auto min-w-0 flex items-center gap-2">
              <SelectFilter prefix="Status" value={tab} onChange={(t) => { setTab(t as typeof tab); setCursor(0); }} width={220}
                options={[{ value: 'all', label: 'All', meta: counts.all }, { value: 'Active', meta: counts.Active }, { value: 'Draft', meta: counts.Draft }, { value: 'Inactive', meta: counts.Inactive }, { value: 'Archived', meta: counts.Archived }]} />
              <MultiFilter label="Room type" width={220} value={typeF} onChange={(v) => { setTypeF(v); setCursor(0); }} options={ROOM_TYPES.map((t) => ({ value: t }))} />
            </div>
          </div>

          {tab === 'Archived' ? (
            <ArchivedTable p={p} rows={archRows} onRestore={(r) => (r.flat ? setRestore(r) : restoreOne(p, r))} />
          ) : (
            <>
              <div data-fill className="flex-1 overflow-auto">
                {!flatList.length ? <Empty art="noResults" title={`No ${tab === 'all' ? '' : tab.toLowerCase() + ' '}units here`} sub={typeF.length ? `None of type ${typeF.join(' or ')}.` : undefined} /> : <table className="w-full text-sm">
                  <thead className="sticky top-0 z-[1]"><tr className="text-left">
                    <th className="w-12 pl-6"><Checkbox aria-label="Select all" checked={tri(flatList.map((u) => u.id))} onCheckedChange={() => toggleIds(flatList.map((u) => u.id))} /></th>
                    {/* Figma D1 4251:17819: Unit, Place, Room type, Rent, Status, Template. */}
                    {/* A floor's flat rows already say where each unit is, so the floor view drops Place. */}
                    {['Unit', 'Place', 'Room type', 'Rent', 'Status', 'Template'].filter((h) => showPlace || h !== 'Place').map((h) => <th key={h} className={cx('px-3', h === 'Template' && 'pr-6')}>{h}</th>)}
                  </tr></thead>
                  <tbody>
                    {/* Floor and flat views: one straight list, Place saying where each unit is (Figma D1). Block and property views split it by floor. */}
                    {grouped ? shownBlocks.flatMap((g) => g.floors.map((f) => {
                      /* A block (or a property) splits its list with a grey row per floor: tick it to take the floor, (i) for its panel.
                         Under it Place names only the flat, since the row says the rest (2026-11-25). */
                      const ids = f.shown.map((u) => u.id);
                      const name = `Floor ${f.floor}`;
                      return (
                        <Fragment key={`${g.bi}|${f.floor}`}>
                          <FloorRow name={name} pre={mode === 'property' ? { name: g.b.name, onClick: () => setLevel({ kind: 'Block', bi: g.bi, floor: 1 }) } : undefined} meta={`${f.units.length} units`} check={tri(ids)} onCheck={() => toggleIds(ids)}
                            active={level?.kind === 'Floor' && level.bi === g.bi && level.floor === f.floor} onInfo={() => setLevel({ kind: 'Floor', bi: g.bi, floor: f.floor })} />
                          {f.shown.map((u) => unitRow(u, sh.flats ? placeOf(u, true) : undefined))}
                        </Fragment>
                      );
                    })) : byFlat ? groups.map(({ f, units }) => {
                      /* A floor splits its list with a grey row per flat: tick it to take the flat, (i) for its panel (2026-11-25). */
                      const ids = units.map((u) => u.id);
                      const fn = +f.id.split('|')[3];
                      return (
                        <Fragment key={f.id}>
                          <FloorRow name={nameOf(f, sh)} meta={`${f.units.length} units`} check={tri(ids)} onCheck={() => toggleIds(ids)}
                            active={level?.kind === 'Flat' && level.bi === bi0 && level.floor === fl0 && level.flat === fn} onInfo={() => setLevel({ kind: 'Flat', bi: bi0, floor: fl0, flat: fn })} />
                          {units.map((u) => unitRow(u))}
                        </Fragment>
                      );
                    }) : flatList.map((u) => unitRow(u, showPlace ? placeOf(u) : undefined))}
                  </tbody>
                </table>}
              </div>
              {/* Footer (59px, lines up with the sidebar profile): the count, or the bulk action while rows are ticked. */}
              <div className="h-[59px] shrink-0 px-6 flex items-center gap-3 border-t border-[#E5E5E5] text-sm text-[#737373]">
                {checked.length > 0 ? <>
                  <span className="text-ink font-medium">{checked.length} selected</span>
                  {/* Actions on the right (2026-11-13): Clear in red, then the bulk action. */}
                  <span className="ml-auto flex items-center gap-2">
                    <Button size="sm" variant="danger-ghost" icon={null} onClick={() => setChecked([])}>Clear</Button>
                    <Menu align="right" width={160} trigger={(o) => <Button size="sm" onClick={o}>Set status</Button>} items={(['Active', 'Inactive', 'Draft'] as UStatus[]).map((s) => ({ label: s, onClick: () => bulkStatus(s) }))} />
                  </span>
                </> : <span>{flatList.length === totalHere ? `${totalHere} units in ${title}` : `Showing ${flatList.length} of ${totalHere} units in ${title}`}</span>}
              </div>
            </>
          )}
        </section>
      </div>

      <UnitSheet p={p} unit={openUnit} nav={listNav(flatList, (x) => x.id === open, (x) => setOpen(x.id))} onClose={() => setOpen(null)}
        path={openAt ? [p.name, p.blocks[openAt.bi ?? 0]?.name ?? '', `Floor ${openAt.floor}`, `Flat ${openAt.floor}.${openAt.flat}`] : [p.name]} />
      {level && <LevelSheetFor key={`${level.kind}${level.bi}${level.floor}${level.flat}`} p={p} l={level} onClose={() => setLevelRaw(null)} onArchive={() => setArchiveT(targetOf(level))} />}
      <ArchiveDialog t={archiveT} onClose={() => setArchiveT(null)} onConfirm={doArchive} />
      <RestoreDialog p={p} row={restore} onClose={() => setRestore(null)} />
      <RenameDialog flat={renaming} siblings={flats} onClose={() => setRenaming(null)} />
      {adding && <AddUnitsDialog props={props} start={sel} onClose={() => setAdding(false)} onAdded={(s) => { setAdding(false); go(s); }} />}
    </>
  );

  function addUnit() { setAdding(true); }
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
/* Figma 4251:17646: 264px, a location picker on top, a PROPERTIES mono label, then every property → blocks → floors → flats.
   32px r8 rows, 8px in on both sides, each level 22px in so a row's caret sits under its parent's icon; counts in Geist Mono 12 #A3A3A3; the selected row is raised white (1px #E5E5E5, soft drop)
   with its icon in blue. Picking a property or a block lists all its units, one straight list (2026-11-25). */
function Tree({ props, structures, sel, go, archivedFlats, onInfo }: { props: Property[]; structures: Structure[]; sel: Sel; go: (s: Sel) => void; archivedFlats: string[]; onInfo: (pid: string, l: LevelRef) => void }) {
  const edits = useInv((s) => s.unitEdits);
  const [loc, setLoc] = useState<string | null>(null);
  const [open, setOpen] = useState<Record<string, boolean>>(() => ({ [sel.pid]: true, ...(sel.bi != null ? { [`${sel.pid}|${sel.bi}`]: true } : {}), ...(sel.floor != null ? { [`${sel.pid}|${sel.bi}|${sel.floor}`]: true } : {}) }));
  const tog = (k: string) => setOpen((o) => ({ ...o, [k]: !o[k] }));
  const expand = (...ks: string[]) => setOpen((o) => ({ ...o, ...Object.fromEntries(ks.map((k) => [k, true])) }));
  const campuses = [...new Set(props.map((x) => x.campus))];
  const shown = loc ? props.filter((x) => x.campus === loc) : props;
  const row = (depth: number, k: string, I: Icon | null, label: string, n: number | null, active: boolean, onClick: () => void, leaf = false, info?: () => void) => (
    <div key={k} aria-current={active || undefined} style={{ paddingLeft: 8 + depth * 22 }} onClick={onClick}
      className={cx('group h-8 shrink-0 flex items-center gap-1.5 rounded-lg border pr-2 text-sm leading-5 cursor-pointer transition-colors',
        depth === 0 || active ? 'font-medium' : 'font-normal',
        active ? 'bg-white border-[#E5E5E5] shadow-[0_1px_2px_rgba(10,13,20,0.06)] text-[#0A0A0A]' : 'border-transparent text-[#0A0A0A] hover:bg-black/[0.03]')}>
      {leaf ? <span className="w-4 shrink-0" /> : <button type="button" aria-label={open[k] ? 'Collapse' : 'Expand'} aria-expanded={!!open[k]} onClick={(e) => { e.stopPropagation(); tog(k); }} className="size-4 shrink-0 rounded flex items-center justify-center text-[#737373] hover:text-[#0A0A0A]">{open[k] ? <CaretDown size={14} strokeWidth={1.5} /> : <CaretRight size={14} strokeWidth={1.5} />}</button>}
      {I && <I size={16} strokeWidth={1.5} className={cx('shrink-0', active ? 'text-[#2563EB]' : 'text-[#404040]')} />}
      <span className="truncate flex-1">{label}</span>
      {/* Blocks, floors and flats open their own panel (custom fields), on hover or when it's the current one. */}
      {info && <button type="button" aria-label={`${label} details`} title="Details" onClick={(e) => { e.stopPropagation(); info(); }}
        className={cx('size-5 shrink-0 rounded flex items-center justify-center text-[#737373] hover:text-[#0A0A0A] hover:bg-black/[0.05]', active ? 'opacity-100' : 'opacity-0 group-hover:opacity-100 focus-visible:opacity-100')}><Info size={14} strokeWidth={1.5} /></button>}
      {n != null && <span className={cx('font-mono text-xs tabular-nums', active ? 'text-[#737373]' : 'text-[#A3A3A3]')}>{n}</span>}
    </div>
  );
  return (
    <aside className="w-[264px] shrink-0 border-r border-[#E5E5E5] bg-white overflow-auto px-3 pt-3 pb-4 flex flex-col">
      <Menu align="left" width={240} trigger={(o) => (
        <button type="button" onClick={o} className="w-full h-9 shrink-0 px-2.5 rounded-lg border border-[#E5E5E5] bg-white shadow-[0_1px_2px_rgba(0,0,0,0.05)] flex items-center gap-2 text-sm font-medium text-[#0A0A0A] hover:bg-[#FAFAFA]">
          <MapPin size={16} strokeWidth={1.5} className="text-[#404040] shrink-0" /><span className="flex-1 text-left truncate">{loc ?? 'All locations'}</span><CaretUpDown size={16} strokeWidth={1.5} className="text-[#737373]" />
        </button>
      )} items={[{ label: 'All locations', icon: MapPin, onClick: () => setLoc(null) }, ...campuses.map((c) => ({ label: c, icon: MapPin, onClick: () => setLoc(c) }))]} />
      <div className="h-9 shrink-0 px-2 pt-3.5 pb-1.5 flex items-center font-mono uppercase text-xs leading-4 font-medium tracking-[0.48px] text-[#737373]">Properties</div>
      {shown.map((p) => {
        const pActive = sel.pid === p.id && sel.bi == null;
        const sh = shapeOf(p, structures);
        return (
          <div key={p.id} className="flex flex-col gap-0.5 mb-0.5">
            {row(0, p.id, null, p.name, p.units, pActive, () => { expand(p.id); go({ pid: p.id, bi: null, floor: null, flat: null }); })}
            {/* A houses layout (House › Room): the houses sit straight under the property. */}
            {open[p.id] && sh.house && flatsOf(p, 0, 1, edits).filter((f) => !goneIn(archivedFlats)(f.id)).map((f) => { const fn = +f.id.split('|')[3]; return row(1, f.id, levelIcon('House'), nameOf(f, sh), f.units.length, sel.pid === p.id && sel.flat === fn, () => go({ pid: p.id, bi: 0, floor: 1, flat: fn }), true, () => onInfo(p.id, { kind: 'Flat', bi: 0, floor: 1, flat: fn })); })}
            {open[p.id] && !sh.house && p.blocks.map((b, bi) => {
              const bk = `${p.id}|${bi}`;
              if (goneIn(archivedFlats)(bk)) return null;
              const bActive = sel.pid === p.id && sel.bi === bi && sel.floor == null;
              return (
                <div key={bk} className="flex flex-col gap-0.5">
                  {row(1, bk, levelIcon('Building'), b.name, b.rooms, bActive, () => { expand(p.id, bk); go({ pid: p.id, bi, floor: null, flat: null }); }, false, () => onInfo(p.id, { kind: 'Block', bi, floor: 1 }))}
                  {open[bk] && Array.from({ length: b.floors }, (_, i) => {
                    const fk = `${bk}|${i + 1}`;
                    if (goneIn(archivedFlats)(fk)) return null;
                    const isFloor = sel.pid === p.id && sel.bi === bi && sel.floor === i + 1;
                    const fl = open[fk] && sh.flats ? flatsOf(p, bi, i + 1, edits).filter((f) => !goneIn(archivedFlats)(f.id)) : [];
                    return (
                      <div key={fk} className="flex flex-col gap-0.5">
                        {row(2, fk, levelIcon('Floor'), `Floor ${i + 1}`, Math.round(b.rooms / b.floors), isFloor && sel.flat == null, () => go({ pid: p.id, bi, floor: i + 1, flat: null }), !sh.flats, () => onInfo(p.id, { kind: 'Floor', bi, floor: i + 1 }))}
                        {open[fk] && fl.map((f) => { const fn = +f.id.split('|')[3]; return row(3, f.id, levelIcon('Flat'), f.name, f.units.length, isFloor && sel.flat === fn, () => go({ pid: p.id, bi, floor: i + 1, flat: fn }), true, () => onInfo(p.id, { kind: 'Flat', bi, floor: i + 1, flat: fn })); })}
                      </div>
                    );
                  })}
                </div>
              );
            })}
          </div>
        );
      })}
    </aside>
  );
}

/* ---------------- Level panel (Block, Floor, Flat): custom field values ---------------- */
type LevelRef = { kind: LevelKind; bi: number; floor: number; flat?: number };
function LevelSheetFor({ p, l, onClose, onArchive }: { p: Property; l: LevelRef; onClose: () => void; onArchive: () => void }) {
  const edits = useInv((s) => s.unitEdits);
  const b = p.blocks[l.bi];
  if (!b) return null;
  if (l.kind === 'Block') {
    return <LevelSheet p={p} kind="Block" onArchive={onArchive} id={`${p.id}|${l.bi}`} name={b.name} meta={p.name} onClose={onClose}
      facts={[['Floors', String(b.floors)], ['Units', String(b.rooms)], ['Room type', b.roomType]]} />;
  }
  const fl = flatsOf(p, l.bi, l.floor, edits);
  const unitsOf = (us: Unit[]) => [String(us.length), String(us.filter((u) => u.status === 'Active').length)];
  if (l.kind === 'Floor') {
    const us = fl.flatMap((f) => f.units);
    const [n, a] = unitsOf(us);
    return <LevelSheet p={p} kind="Floor" onArchive={onArchive} id={`${p.id}|${l.bi}|${l.floor}`} name={`Floor ${l.floor}`} meta={`${p.name} · ${b.name}`} onClose={onClose}
      facts={[['Flats', String(fl.length)], ['Units', n], ['Active', a]]} />;
  }
  const f = fl.find((x) => +x.id.split('|')[3] === l.flat);
  if (!f) return null;
  const [n, a] = unitsOf(f.units);
  const house = shapeOf(p, useInv.getState().structures).house;
  return <LevelSheet p={p} kind="Flat" onArchive={onArchive} label={house ? 'House' : undefined} id={f.id} name={house ? `House ${l.flat}` : f.name} meta={house ? p.name : `${p.name} · ${b.name} · Floor ${l.floor}`} onClose={onClose}
    facts={[['Units', n], ['Active', a], ['Room types', String(new Set(f.units.map((u) => u.type)).size)]]} />;
}

/* ---------------- Grouped table rows ---------------- */
/* Group row: 40px #FAFAFA divider — a floor in a block's list, or a flat in a floor's. The name starts on the Unit column's line
   and opens its panel; no (i) icon (2026-11-25). */
function FloorRow({ name, pre, meta, check, onCheck, onInfo, active }: { name: string; /** The block before the floor in a property's list; its name opens the block's panel. */ pre?: { name: string; onClick: () => void }; meta: string; check: boolean | 'indeterminate'; onCheck: () => void; onInfo: () => void; active?: boolean }) {
  return (
    <tr className={cx('border-b border-[#E5E5E5]', active ? 'bg-[#EFF6FF] shadow-[inset_2px_0_0_#2563EB]' : 'bg-[#FAFAFA]')}>
      <td className="h-10 pl-6"><Checkbox aria-label={`Select ${pre ? `${pre.name} ` : ''}${name}`} checked={check} onCheckedChange={onCheck} /></td>
      <td colSpan={6} className="pl-3 pr-4">
        <div className="flex items-center gap-2">
          <span className="text-sm leading-5 font-medium text-[#0A0A0A]">
            {pre && <><button type="button" onClick={pre.onClick} className="hover:underline underline-offset-2">{pre.name}</button><span className="text-[#A3A3A3]"> · </span></>}
            <button type="button" onClick={onInfo} className="hover:underline underline-offset-2">{name}</button>
          </span>
          <span className="text-xs leading-4 text-[#737373]">{meta}</span>
        </div>
      </td>
    </tr>
  );
}

/* Unit row (Figma D1 4251:17819): 48px; ticked rows take a light blue; Place says where the unit is (block · floor · flat). */
function UnitRow({ u, place, cursor, open, checked, onCheck, onOpen }: { u: Unit; place?: string; cursor?: boolean; open: boolean; checked: boolean; onCheck: () => void; onOpen: () => void }) {
  return (
    <tr onClick={onOpen} aria-selected={open} className={cx('border-b border-[#E5E5E5] cursor-pointer', open ? 'bg-[#EFF6FF] shadow-[inset_2px_0_0_#2563EB]' : checked ? 'bg-[#F5F9FF]' : cursor ? 'bg-[#FAFAFA]' : 'hover:bg-[#FAFAFA]/70')}>
      <td className="pl-6 h-12" onClick={(e) => e.stopPropagation()}><Checkbox aria-label={`Select ${u.code}`} checked={checked} onCheckedChange={onCheck} /></td>
      <td className="px-3 text-sm font-medium text-[#0A0A0A] whitespace-nowrap">{u.code}</td>
      {place != null && <td className="px-3 text-sm text-[#404040] whitespace-nowrap">{place}</td>}
      <td className="px-3 text-sm text-[#404040] whitespace-nowrap">{u.type}</td>
      <td className="px-3 text-sm text-[#404040] tabular-nums">{u.rent != null ? money(u.rent) : <span className="text-[#A3A3A3]">—</span>}</td>
      <td className="px-3"><PropStatus s={u.status} /></td>
      <td className="pl-3 pr-6 text-sm text-[#404040] whitespace-nowrap">{u.template && u.weeks ? `${u.type.split(' ')[0]} · ${u.weeks} wk` : <span className="text-[#A3A3A3]">—</span>}</td>
    </tr>
  );
}

/* ---------------- F4-04/05: unit side panel (Figma "Side panel · Unit" 4073:17181: Overview, Tenancy, History) ---------------- */
/* Prototype dummy history per unit, stable by id: residents, past tenancies and jobs. The backend fills these later. */
const U_FIRST = ['Priya', 'Leo', 'Sam', 'Ella', 'Josh', 'Aisha', 'Noah', 'Mia', 'Omar', 'Freya', 'Ravi', 'Isla'];
const U_LAST = ['Shah', 'Grant', 'Patel', 'Hughes', 'Okafor', 'Khan', 'Bell', 'Ward', 'Ahmed', 'Lowe', 'Rao', 'Ford'];
const U_JOBS: [string, string][] = [['Shower dripping', 'Plumbing'], ['Loose socket', 'Electrical'], ['Window seal', 'Joinery'], ['Radiator cold', 'Heating'], ['Door closer', 'Joinery'], ['Mould on wall', 'Damp']];
const hashOf = (k: string) => [...k].reduce((h, c) => (h * 31 + c.charCodeAt(0)) >>> 0, 7);
function unitHistory(u: Unit) {
  const h = hashOf(u.id);
  const name = (i: number) => `${U_FIRST[(h + i * 5) % U_FIRST.length]} ${U_LAST[(h + i * 7) % U_LAST.length]}`;
  const rent = u.rent ?? 0;
  const let_ = u.rent != null && u.status === 'Active' && h % 6 !== 0;
  const past = [1, 2].map((i) => ({ who: name(i), year: `${2026 - i}/${String(27 - i).padStart(2, '0')}`, rent: Math.max(0, rent - i * 7), ended: i === 1 ? '13 Sep' : `${12 + i} Sep ${2026 - i}` }));
  const jobs = U_JOBS.slice(h % 3, h % 3 + 3).map(([what, kind], i) => ({ what, kind, when: ['18 Nov', '3 Feb', '2 Oct 2025'][i], open: i === 0 && h % 2 === 0 }));
  return { current: let_ ? { who: name(0), rent } : null, past, jobs };
}
const STOCK = Object.values(PHOTO);
/** Dummy unit photos: 3 stock photos picked by the unit id, so a unit always shows the same ones. */
const unitPhotos = (id: string) => { const h = [...id].reduce((n, c) => n + c.charCodeAt(0), 0); return [0, 1, 2].map((i) => STOCK[(h + i * 2) % STOCK.length]); };
const STATE_TONE = { Current: 'green', Past: 'grey', Open: 'orange', Fixed: 'green' } as const;
const State = ({ s }: { s: keyof typeof STATE_TONE }) => <Pill tone={STATE_TONE[s]}>{s}</Pill>;
function UnitSheet({ p, unit, onClose, path, nav }: { nav?: SheetNav; p: Property; unit: (Unit & { block?: string }) | null; onClose: () => void; path: string[] }) {
  const editUnit = useInv((s) => s.editUnit);
  const [blocked, setBlocked] = useState(false);
  const [size, setSize] = useState('');
  const [tab, setTab] = useState<'overview' | 'tenancy' | 'history'>('overview');
  const [editing, setEditing] = useState(false);
  const [dType, setDType] = useState('');
  const [dCode, setDCode] = useState('');
  const unitEdits = useInv((s) => s.unitEdits);
  const [dStatus, setDStatus] = useState<UStatus>('Draft');
  useEffect(() => { setBlocked(false); setEditing(false); setSize(unit ? String(unit.size) : ''); }, [unit?.id]); // eslint-disable-line react-hooks/exhaustive-deps
  const [confirmArchive, setConfirmArchive] = useState(false);
  if (!unit) return null;
  const hist = unitHistory(unit);
  const archive = () => { editUnit(unit.id, { status: 'Archived' }); toast.success(`${unit.code} archived`, { action: { label: 'Undo', onClick: () => editUnit(unit.id, { status: unit.status }) } }); onClose(); };
  const codeErr = !dCode.trim() ? 'Enter a unit name.' : allUnits(p, unitEdits).some((x) => x.id !== unit.id && x.id.split(':')[1] === unit.id.split(':')[1] && x.code.toLowerCase() === dCode.trim().toLowerCase()) ? `${dCode.trim()} is already used in ${path[1] || 'this block'}.` : '';
  const sizeErr = !size.trim() ? 'Enter a room size.' : !/^\d+(\.\d{1,2})?$/.test(size) || +size <= 0 ? 'Room size must be a number above 0, e.g. 14.' : '';
  /* Room card edits are drafts until Save, like every other in-place edit; Cancel throws them away (2026-11-20). */
  const startEdit = () => { setDCode(unit.code); setSize(String(unit.size)); setDType(unit.type); setDStatus(unit.status === 'Archived' ? 'Inactive' as UStatus : unit.status); setEditing(true); };
  const saveRoom = () => {
    if (sizeErr || codeErr) return;
    const ch: Partial<Unit> = {};
    if (dCode.trim() !== unit.code) ch.code = dCode.trim();
    if (dType !== unit.type) ch.type = dType;
    if (+size !== unit.size) ch.size = +size;
    const wantActive = dStatus !== unit.status && dStatus === 'Active' && unit.rent == null;
    if (dStatus !== unit.status && !wantActive) ch.status = dStatus;
    if (Object.keys(ch).length) { editUnit(unit.id, ch); toast.success(`${ch.code ?? unit.code} saved`); }
    setBlocked(wantActive);
    setEditing(false);
  };
  const applyTenancy = (andActivate: boolean) => {
    const rt = p.roomTypes.find((r) => r.name === unit.type);
    const weeks = unit.type.startsWith('Ensuite') || unit.type === 'Studio' ? 51 : 44;
    const rent = rt?.rent ?? rt?.next?.rent ?? (unit.type === 'Studio' ? 246 : unit.type.startsWith('Ensuite') ? 212 : 168);
    editUnit(unit.id, { rent, weeks, template: `${unit.type} · ${weeks} wk`, ...(andActivate ? { status: 'Active' as UStatus } : {}) });
    setBlocked(false);
    toast.success(andActivate ? `${unit.type} · ${weeks} wk applied · ${unit.code} is active` : `${unit.type} · ${weeks} wk applied to ${unit.code}`);
  };
  const rentTxt = unit.rent != null ? `${money(unit.rent)} / ${per(p)}` : '—';
  const flat = path[3] || '';
  return (
    <Sheet open onClose={onClose} nav={nav} width={520} title="Unit"
      onDelete={{ label: `Archive ${unit.code}`, text: 'Archive', icon: Archive, onClick: () => (unit.rent != null ? setConfirmArchive(true) : archive()) }}>
      <Modal open={confirmArchive} onClose={() => setConfirmArchive(false)} icon={Archive} width={420} title={`Archive ${unit.code}?`} sub={`It has a ${unit.template ?? 'tenancy'} linked. Archiving takes it off sale; the tenancy stays on record.`}
        footer={<><Button onClick={() => setConfirmArchive(false)}>Keep</Button><Button variant="danger" icon={null} onClick={() => { setConfirmArchive(false); archive(); }}>Archive unit</Button></>}>{null}</Modal>
      <SheetHero icon={Door} tone="blue" name={unit.code} meta={path.filter(Boolean).join(' · ')}
        facts={[['Rent', rentTxt], ['Size', `${unit.size} m²`], ['Resident', hist.current ? hist.current.who : 'Vacant']]}>
        <PropStatus s={unit.status} />
        <Pill tone="blue">{unit.type}</Pill>
      </SheetHero>
      <div className="-mx-5 mb-5">
        <LineTabs value={tab} onChange={setTab} tabs={[{ id: 'overview', label: 'Overview' }, { id: 'tenancy', label: 'Tenancy' }, { id: 'history', label: 'History' }]} />
      </div>
      {blocked && (
        <div className="mb-3 rounded-xl border border-[#EF44444D] p-3.5">
          <div className="flex gap-2.5"><WarningCircle size={18} weight="fill" className="text-[#EF4444] shrink-0" /><div><div className="text-sm font-semibold text-[#E0243A]">{unit.code} can’t be active</div><div className="text-sm text-[#737373] mt-0.5">Apply the {unit.type} tenancy first, then it goes active.</div></div></div>
          <div className="mt-3 flex gap-2 justify-end"><Button size="sm" onClick={() => setBlocked(false)}>Keep as Draft</Button><Button size="sm" variant="primary" onClick={() => applyTenancy(true)}>Apply tenancy</Button></div>
        </div>
      )}
      {tab === 'overview' && <>
        {/* Edit opens a centred modal with the form; the card stays read-only (2026-11-20, user asked for a modal here). */}
        <SheetSection title="Room" action={<EditLink onClick={startEdit}>Edit</EditLink>} rows={[['Room type', unit.type], ['Size', `${unit.size} m²`], ['Location', [path[1], flat].filter(Boolean).join(' · ') || '—'], ['Status', unit.status]]} />
        <PanelModal open={editing} onClose={() => setEditing(false)} width={480} eyebrow="Edit room" title={unit.code} icon={Door} meta={path.filter(Boolean).slice(1).join(' · ')}
          right={<><Button onClick={() => setEditing(false)}>Cancel</Button><Button variant="primary" onClick={saveRoom}>Save</Button></>}>
          <div className="space-y-4">
            <Field label="Unit name"><Input aria-label="Unit name" value={dCode} onChange={(e) => setDCode(e.target.value)} className="w-full font-mono" /><FieldErr>{codeErr}</FieldErr></Field>
            <Field label="Room type"><Picker className="w-full" value={dType} onChange={setDType} icon={Bed} options={ROOM_TYPES.map((t) => ({ id: t, label: t }))} /></Field>
            <Field label="Size">
              <label className="w-full h-input flex items-center rounded-lg border border-gray-300 px-2.5 text-sm"><input aria-label="Room size" value={size} onChange={(e) => setSize(e.target.value.replace(/[^0-9.]/g, ''))} className="flex-1 min-w-0 outline-none" /><span className="text-[#737373] text-xs">m²</span></label>
              <FieldErr>{sizeErr}</FieldErr>
            </Field>
            <Field label="Status"><Picker className="w-full" value={dStatus} onChange={(v) => setDStatus(v as UStatus)} options={[{ id: 'Draft', label: 'Draft' }, { id: 'Active', label: 'Active' }, { id: 'Inactive', label: 'Inactive' }]} /></Field>
          </div>
        </PanelModal>
        {/* Custom fields attached to rooms in this layout (Accessible room, Ensuite type…), filled per room (2026-11-20). */}
        <LevelFields p={p} kind="Room" id={unit.id} />
        {/* Photos of this unit (2026-11-19). Prototype: stock photos stand in, stable by unit id; Add is a stub. */}
        <SheetSection title={`Photos · ${unitPhotos(unit.id).length}`} action={<EditLink onClick={() => toast('Photo upload arrives with the backend')}>Add photos</EditLink>}>
          <div className="grid grid-cols-3 gap-2">
            {unitPhotos(unit.id).map((src, i) => <div key={i} className="aspect-[4/3] rounded-lg bg-[#F5F5F5] bg-cover bg-center border border-[#EBEBEB]" style={{ backgroundImage: `url(${src})` }} role="img" aria-label={`${unit.code} photo ${i + 1}`} />)}
          </div>
        </SheetSection>
        <SheetSection title="Tenancy">
          {unit.rent == null ? (
            <div className="flex items-center gap-3"><span className="text-sm text-[#737373] flex-1">No tenancy</span><Button size="sm" onClick={() => applyTenancy(false)}>Apply tenancy</Button></div>
          ) : <>
            {hist.current && <SheetRow title={hist.current.who} sub={`21 Sep 2026 – 12 Sep 2027 · ${money(hist.current.rent)} / ${per(p)}`} end={<State s="Current" />} />}
            <SheetRow title={hist.past[0].who} sub={`${hist.past[0].year} · ended ${hist.past[0].ended}`} end={<State s="Past" />} />
          </>}
        </SheetSection>
      </>}
      {tab === 'tenancy' && <>
        {hist.current ? (
          <SheetSection title="Current tenancy" rows={[['Resident', hist.current.who], ['Term', '21 Sep 2026 – 12 Sep 2027'], ['Rent', rentTxt], ['Balance', <span className="text-[#0B8A4C]">£0.00</span>], ['Template', unit.template ?? '—']]} />
        ) : (
          <SheetSection title="Current tenancy">
            {unit.rent == null
              ? <div className="flex items-center gap-3"><span className="text-sm text-[#737373] flex-1">No tenancy</span><Button size="sm" onClick={() => applyTenancy(false)}>Apply tenancy</Button></div>
              : <p className="text-sm text-[#737373]">Vacant · {unit.template} at {rentTxt}</p>}
          </SheetSection>
        )}
        <SheetSection title="Next year">
          <SheetRow title="2027/28" sub={`Not let yet${unit.rent != null ? ` · ${money(unit.rent + 8)} / ${per(p)}` : ''}`} end={<EditLink onClick={() => toast('Offers live in Allocations › Offers')}>Offer</EditLink>} />
        </SheetSection>
      </>}
      {tab === 'history' && <>
        <SheetSection title={`Tenancies · ${hist.past.length + (hist.current ? 1 : 0)}`}>
          {hist.current && <SheetRow title={hist.current.who} sub={`2026/27 · ${money(hist.current.rent)} / ${per(p)}`} end={<State s="Current" />} />}
          {hist.past.map((t) => <SheetRow key={t.year} title={t.who} sub={`${t.year} · ${money(t.rent)} / ${per(p)}`} end={<State s="Past" />} />)}
        </SheetSection>
        <SheetSection title={`Jobs · ${hist.jobs.length}`}>
          {hist.jobs.map((j) => <SheetRow key={j.what} title={j.what} sub={`${j.kind} · ${j.when}`} end={<State s={j.open ? 'Open' : 'Fixed'} />} />)}
        </SheetSection>
      </>}
    </Sheet>
  );
}

/* ---------------- F6: archive a flat ---------------- */
function ArchiveDialog({ t, onClose, onConfirm }: { t: ArchTarget | null; onClose: () => void; onConfirm: (t: ArchTarget) => void }) {
  const busy = useRef(false);
  useEffect(() => { if (t) busy.current = false; }, [t]);
  if (!t) return null;
  const units = t.flats.flatMap((f) => f.units);
  const withT = units.filter((u) => u.rent != null).length;
  const shown = units.slice(0, 6);
  return (
    <Modal open onClose={onClose} icon={Archive} tone="red" title={`Archive ${t.name}?`} sub={`${t.name} and its ${units.length} units leave every list and can’t be let. You can restore them from Archived.`} width={500}
      footer={<><Button onClick={onClose}>Cancel</Button><Button variant="danger" onClick={() => { if (busy.current) return; busy.current = true; onConfirm(t); }}>Archive {t.kind.toLowerCase()} and {units.length} units</Button></>}>
      <div className="rounded-xl border border-line divide-y divide-line">
        {shown.map((u) => <div key={u.id} className="h-10 px-3.5 flex items-center gap-3 text-sm"><span className="font-mono w-14">{u.code}</span><span className="flex-1 text-[#737373]">{u.type}</span><PropStatus s={u.status} /></div>)}
        {units.length > shown.length && <div className="h-10 px-3.5 flex items-center text-sm text-[#737373]">and {units.length - shown.length} more</div>}
      </div>
      {withT > 0 && <div className="mt-3 rounded-xl border border-[#3B82F64D] p-3 flex gap-2.5 text-sm"><Info size={17} weight="fill" className="text-[#3B82F6] shrink-0" /><span><b className="font-semibold text-[#1D4ED8]">{withT} tenancies keep their status</b><span className="block text-[#737373]">Signed residents stay in their rooms; nobody new can book them.</span></span></div>}
    </Modal>
  );
}

/* ---------------- Archived view + restore ---------------- */
function ArchivedTable({ p, rows, onRestore }: { p: Property; rows: ArchivedRow[]; onRestore: (r: ArchivedRow) => void }) {
  const top = rows.filter((r) => !r.parent);
  return (
    <>
      <div data-fill className="flex-1 overflow-auto px-[var(--gx,16px)]">
        {!top.length ? <Empty art="nothingToShow" title="Nothing archived" sub={`Archived blocks, floors, flats and units in ${p.name} show here.`} /> : <table className="w-full text-sm">
          <thead className="sticky top-0 bg-white"><tr className="text-left text-xs text-[#737373]">{['Entity', 'Type', 'Status', 'Archived', ''].map((h, i) => <th key={i} className={cx('font-medium h-9 border-b border-line px-3', i === 0 && 'pl-[var(--cx,12px)]', i === 4 && 'pr-[var(--cx,12px)]')}>{h}</th>)}</tr></thead>
          <GhostZone.Provider value><tbody>
            {top.map((r) => (
              <tr key={r.id} className="border-b border-line">
                <td className="pl-[var(--cx,12px)] pr-3 h-10"><span className="flex items-center gap-2">{(() => { const I = r.flat ? levelIcon(r.type === 'Block' ? 'Building' : r.type) : Bed; return <I size={14} className="text-[#737373]" />; })()}<span className={r.flat ? 'font-medium' : 'font-mono text-sm'}>{r.name}</span>{r.flat && <span className="text-xs text-[#737373]">+ {r.units} units</span>}</span></td>
                <td className="px-3 text-[#737373]">{r.type}</td>
                <td className="px-3"><PropStatus s="Archived" /></td>
                <td className="px-3"><PersonName name={r.who}><span className="text-[#737373] whitespace-nowrap">· {r.when}</span></PersonName></td>
                <td className="row-act pl-3 pr-[var(--cx,12px)] text-right"><Button size="sm" icon={ArrowUUpLeft} onClick={() => onRestore(r)}>Restore</Button></td>
              </tr>
            ))}
          </tbody></GhostZone.Provider>
        </table>}
      </div>
      {rows.length > 0 && <div className="h-10 shrink-0 px-5 flex items-center border-t border-line text-sm text-[#737373]">{rows.length} archived in {p.name}</div>}
    </>
  );
}
function RestoreDialog({ p, row, onClose }: { p: Property; row: ArchivedRow | null; onClose: () => void }) {
  const edits = useInv((s) => s.unitEdits);
  const [to, setTo] = useState<UStatus>('Active');
  const busy = useRef(false);
  useEffect(() => { if (row) { setTo('Active'); busy.current = false; } }, [row]);
  if (!row) return null;
  const units = p.blocks.flatMap((b, bi) => Array.from({ length: b.floors }, (_, i) => flatsOf(p, bi, i + 1, edits)).flat()).filter((f) => goneIn([row.id])(f.id)).flatMap((f) => f.units);
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
/* ---------------- Add units (centred dialog, Figma 4238:18166, 2026-11-25) ----------------
   The create-modal frame every other "New …" uses (PanelModal): Where (property, then the layout's own levels, starting at
   the place picked in the tree, with the path spelled out), then Units (room type, rent template, how many, and the next
   free names). New units start as Draft. */
function AddUnitsDialog({ props, start, onClose, onAdded }: { props: Property[]; start: Sel; onClose: () => void; onAdded: (s: Sel) => void }) {
  const edits = useInv((s) => s.unitEdits);
  const archivedFlats = useInv((s) => s.archivedFlats);
  const structures = useInv((s) => s.structures);
  const templates = useInv((s) => s.templates);
  const [pid, setPid] = useState(start.pid);
  const p = props.find((x) => x.id === pid) ?? props[0];
  const sh = shapeOf(p, structures);
  const [bi, setBi] = useState(start.bi ?? 0);
  const [floor, setFloor] = useState(start.floor ?? 1);
  const flatsHere = flatsOf(p, bi, floor, edits).filter((f) => !goneIn(archivedFlats)(f.id));
  const [flat, setFlat] = useState<number>(start.flat ?? +(flatsHere[0]?.id.split('|')[3] ?? 1));
  const f = flatsHere.find((x) => +x.id.split('|')[3] === flat) ?? flatsHere[0];
  const types = p.roomTypes.length ? p.roomTypes.map((t) => t.name) : ROOM_TYPES;
  const [type, setType] = useState(p.blocks[bi]?.roomType ?? types[0]);
  const tpls = templates.filter((t) => t.propertyId === p.id && t.status === 'Active');
  const [tplPick, setTpl] = useState<string | null>(null);
  const tpl = tplPick === 'none' ? null : tpls.find((t) => t.id === tplPick) ?? tpls.find((t) => t.name === type) ?? null;
  const [n, setN] = useState('1');
  const count = Math.floor(Number(n));
  const err = !Number.isFinite(count) || count < 1 ? 'Enter 1 or more.' : count > 20 ? 'Add up to 20 at a time.' : '';
  const [, , fl, fn] = (f?.id ?? '').split('|');
  const taken = new Set(f?.units.map((x) => x.code) ?? []);
  const codes: string[] = [];
  for (let k = 0; codes.length < (err ? 0 : count) && k < 52; k++) { const c = `${fl}.${fn}.${'ABCDEFGHIJKLMNOPQRSTUVWXYZ'[k] ?? k}`; if (!taken.has(c)) codes.push(c); }
  const fname = f ? (sh.house ? `House ${fn}` : f.name) : '';
  /* A typed name for a single unit; null means "use the next free one". */
  const [name, setName] = useState<string | null>(null);
  useEffect(() => setName(null), [pid, bi, floor, flat]);
  const typed = codes.length === 1 && name != null ? name.trim() : null;
  const nameErr = typed == null ? '' : !typed ? 'Enter a name.' : taken.has(typed) ? `${fname || 'This place'} already has ${typed}.` : '';
  const path = sh.house ? [p.name, fname] : [p.name, p.blocks[bi]?.name ?? '', `Floor ${floor}`, ...(sh.flats ? [fname] : [])];
  const reset = (nextBi: number, nextP = p) => { setBi(nextBi); setFloor(1); setFlat(1); setType(nextP.blocks[nextBi]?.roomType ?? types[0]); setTpl(null); };
  /* Custom field values are filled on a draft record, then copied onto each new unit when they're added. */
  const DRAFT = 'draft:add-units';
  const clearDraft = () => useInv.getState().set('fieldValues', (m) => { const { [DRAFT]: _, ...rest } = m; return rest; });
  useEffect(() => clearDraft, []); // eslint-disable-line react-hooks/exhaustive-deps
  const busy = useRef(false);
  const add = () => {
    if (err || nameErr || !f || busy.current) return;
    busy.current = true;
    const draftVals = useInv.getState().fieldValues[DRAFT];
    if (draftVals) useInv.getState().set('fieldValues', (m) => ({ ...m, ...Object.fromEntries(codes.map((code) => [`${p.id}:${bi}:${code}`, { ...draftVals }])) }));
    const rt = p.roomTypes.find((t) => t.name === type);
    useInv.getState().set('unitEdits', (e) => ({ ...e, ...Object.fromEntries(codes.map((code) => {
      const id = `${p.id}:${bi}:${code}`;
      const unit: Unit = { id, code: typed || code, type, status: 'Draft', size: p.blocks[bi]?.size ?? 12, added: true,
        weeks: tpl ? tpl.weeks : null, rent: tpl ? tpl.rent : p.tenancies !== false ? rt?.rent ?? rentFor(type) : null, template: tpl ? `${tpl.name} · ${tpl.weeks} wk` : null };
      return [id, unit];
    })) }));
    toast.success(`${codes.length} ${codes.length === 1 ? 'unit' : 'units'} added to ${fname || path[path.length - 1]} as Draft`);
    onAdded(sh.house ? { pid: p.id, bi: 0, floor: 1, flat: +fn } : { pid: p.id, bi, floor, flat: sh.flats ? +fn : null });
  };
  const opt = (value: string, label: string) => ({ value, label });
  const many = !err && codes.length > 1;
  return (
    <PanelModal open onClose={onClose} eyebrow="Add units" width={560}
      right={<><Button onClick={onClose}>Cancel</Button><Button variant="primary" icon={null} disabled={!!err || !!nameErr || !f} onClick={add}>{many ? `Add ${codes.length} units` : 'Add unit'}</Button></>}>
      {/* Draft is said up front, before the form, as one quiet grey line (2026-11-25), not in the footer. */}
      <div className="mb-3 flex items-center gap-2 text-sm leading-5 text-[#737373]"><Info size={16} className="shrink-0" />New units start as Draft</div>
      <SheetSection title="Where">
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <Field label="Property"><Dropdown value={p.id} onChange={(v) => { const np = props.find((x) => x.id === v) ?? p; setPid(v); reset(0, np); }} options={props.map((x) => opt(x.id, x.name))} /></Field>
            {sh.house ? (
              <Field label="House"><Dropdown value={String(flat)} onChange={(v) => setFlat(+v)} options={flatsHere.map((x) => opt(x.id.split('|')[3], `House ${x.id.split('|')[3]} · ${x.units.length} rooms`))} /></Field>
            ) : <>
              <Field label="Block"><Dropdown value={String(bi)} onChange={(v) => reset(+v)} options={p.blocks.map((b, i) => opt(String(i), b.name))} /></Field>
              <Field label="Floor"><Dropdown value={String(floor)} onChange={(v) => { setFloor(+v); setFlat(1); }} options={Array.from({ length: p.blocks[bi]?.floors ?? 1 }, (_, i) => opt(String(i + 1), `Floor ${i + 1}`))} /></Field>
              {sh.flats && <Field label="Flat"><Dropdown value={String(flat)} onChange={(v) => setFlat(+v)} options={flatsHere.map((x) => opt(x.id.split('|')[3], `${x.name} · ${x.units.length} units`))} /></Field>}
            </>}
          </div>
          {/* The place in one line, as the tree spells it (Figma 4238:18166). */}
          <div className="h-10 px-3 rounded-lg bg-[#EFF6FF] flex items-center gap-1.5 text-sm text-[#1D4ED8] min-w-0">
            <MapPin size={16} weight="fill" className="shrink-0 text-[#2563EB]" />
            {path.map((c, i) => <span key={i} className="flex items-center gap-1.5 min-w-0">{i > 0 && <CaretRight size={12} strokeWidth={2} className="shrink-0 text-[#60A5FA]" />}<span className="truncate">{c}</span></span>)}
          </div>
        </div>
      </SheetSection>
      <SheetSection title="Units">
        <div className="space-y-4">
          <div className="grid grid-cols-[1fr_120px] gap-3">
            <Field label="Room type"><Dropdown value={type} onChange={(v) => { setType(v); setTpl(null); }} options={types.map((t) => opt(t, t))} /></Field>
            <Field label="How many"><Input type="number" min={1} max={20} value={n} onChange={(e) => setN(e.target.value)} /><FieldErr>{err}</FieldErr></Field>
          </div>
          <Field label="Rent template"><Dropdown value={tpl?.id ?? 'none'} onChange={(v) => setTpl(v)} options={[...tpls.map((t) => opt(t.id, `${t.name} · ${money(t.rent)} / wk · ${t.weeks} wk`)), opt('none', 'No template yet')]} /></Field>
          {!err && codes.length > 0 && (
            <div>
              {/* One unit: its name, filled with the next free one and editable (Figma 4238:18166). Several: the run they'll get. */}
              {codes.length === 1 ? (
                <Field label="Unit name"><Input value={name ?? codes[0]} onChange={(e) => setName(e.target.value)} /><FieldErr>{nameErr}</FieldErr></Field>
              ) : (
                <Field label="Unit names"><Input readOnly value={`${codes[0]} to ${codes[codes.length - 1]}`} className="bg-[#FAFAFA] text-[#404040]" /></Field>
              )}
              {!nameErr && <p className="text-xs text-[#737373] mt-1.5">{codes.length === 1 ? (name != null && name.trim() !== codes[0] ? `Next free name is ${codes[0]}` : `Next free name in ${fname || path[path.length - 1]}`) : `The next ${codes.length} free names in ${fname || path[path.length - 1]}`}</p>}
            </div>
          )}
        </div>
      </SheetSection>
      {/* The room's custom fields, as in the unit panel: fill values for the new units, or add a field to the level. */}
      <LevelFields p={p} kind="Room" id={DRAFT} local />
    </PanelModal>
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
