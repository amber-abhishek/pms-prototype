import { memo, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { flushSync } from 'react-dom';
import { useSearchParams } from 'react-router-dom';
import { toast } from 'sonner';
import {
  Archive, ArrowRight, CheckCircle, CaretDown, CurrencyGbp, Hash, TextT, ToggleLeft, Tag, ArrowUUpLeft, Bank, Bed, Buildings, Stack, CaretRight, MapPin, Door, DotsThree, Info, ListDashes, PencilSimple, Plus, Warning, X, WarningCircle, ChevronsUpDown,
} from '../../components/icons';
import { Popover, PopoverContent, PopoverTrigger } from '../../components/shadcn/popover';
import { PersonName, Button, Dropdown, Empty, Field, Input, PageHeader, Pill, SearchInput, Sheet, SheetHero, SheetRow, SheetSection, cx, listNav, type SheetNav, PIN, SelectFilter } from '../../components/ui';
import { Checkbox } from '../../components/shadcn/checkbox';
import { allUnits, choicesOf, flatsOf, money, per, rentFor, useInv, type ArchivedRow, type Field as CustomField, type Flat, type Property, type Structure, type Unit, type UStatus } from '../../data/inventory';
import { ROOM_TYPES } from '../../data/inventory';
import { useOpen } from '../hooks';
import { EditLink, FieldErr, LineTabs, Menu, Modal, MultiPicker, PanelModal, Picker, PropStatus, RadioCard, levelIcon, ruleMatch, type RuleField, type RuleKind } from './common';
import { ColumnHead, ColumnsMenu, type SortState } from './tableKit';
import { FilterChips, FilterGroupButton } from './viewFilter';
import { GhostZone } from '../../components/headerCtx';
import { LevelFields, LevelSheet, New, Old, attachKey, layoutOf, useDraftValues, useFilledFields, type LevelKind } from './LevelSheet';
import { PHOTO, photoOf } from './photos';
import { PropertyDetail } from './PropertyDetail';
import { UnitsV2, VersionToggle, useUnitsVersion } from './UnitsV2';
import { UnitsTree } from './UnitsTree';
import { EmptyArea } from '../allocations/common';
import { StatusTabsBar } from '../offcampus/parts';

/* The selection is a place in the tree: a property, a block, a floor or a flat. A null level means "the whole of the one above". */
type Sel = { pid: string; bi: number | null; floor: number | null; flat: number | null };
type TabId = 'all' | 'Active' | 'Draft' | 'Inactive' | 'Archived';
/* Room amenities (2026-11-26): what's in the room itself. A unit with none set has its room type's usual set. */
const UNIT_AMENITIES = ['Desk', 'Wardrobe', 'Sink', 'Ensuite bathroom', 'Kitchenette', 'Double bed', 'Grab rails', 'Blackout blinds', 'Smart TV'];
const TYPE_AMENITIES: Record<string, string[]> = {
  'Ensuite single': ['Desk', 'Wardrobe', 'Ensuite bathroom'], 'Standard single': ['Desk', 'Wardrobe', 'Sink'],
  Studio: ['Desk', 'Wardrobe', 'Ensuite bathroom', 'Kitchenette'], 'Ensuite double': ['Desk', 'Wardrobe', 'Ensuite bathroom', 'Double bed'],
  'Accessible ensuite': ['Desk', 'Wardrobe', 'Ensuite bathroom', 'Grab rails'],
};
const amenitiesOf = (u: Unit) => u.amenities ?? TYPE_AMENITIES[u.type] ?? ['Desk', 'Wardrobe'];
/* The bookable level (BSU) of a property's layout: Room, Studio… Bulk edit works within one BSU type (2026-11-26). */
const bsuOf = (pp: Property, structures: Structure[]) => structures.find((x) => x.name === layoutOf(pp))?.levels.find((l) => l.bsu && !/tenancy/i.test(l.name))?.name ?? 'Room';
const bsuPlural = (t: string) => `${t.toLowerCase()}${/s$/i.test(t) ? 'es' : 's'}`;

/* Which levels the tree and table show come from the property's layout (Property layouts): floors and flats only when the
   layout has them. A houses layout (House › Room) keeps its houses as the data's flats, so they're named House n (2026-11-25). */
type Shape = { flats: boolean; house: boolean };
export function shapeOf(p: Property, structures: Structure[]): Shape {
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

/** Units table column widths; Template takes what's left. */
/* Block and Floor carry a group checkbox on hover, so they're 20px wider; Room type gives some back. Every column is a
   fixed width (custom field columns 150) and a blank last column takes what's left. */
/* Tightened (2026-11-27) so a block or floor fits beside the V2 tree without a sideways scroll. */
const COL_W: Record<string, number> = { Property: 180, House: 92, Unit: 88, Block: 120, Floor: 96, Flat: 88, 'Room type': 132, Rent: 88, Status: 104, Template: 136 };
const colW = (h: string) => COL_W[h] ?? (h.startsWith('cf:') ? 150 : undefined);
/** The optional columns, in their order; custom fields join as cf:<id> (Columns, 2026-11-26). */
const BASE_COLS = ['Room type', 'Rent', 'Status', 'Template'];
/** The custom fields that sit on a property's units: its layout's bookable level (Room, Studio). */
export const unitFieldKeys = (pp: Property, structures: Structure[]) => {
  const lv = structures.find((x) => x.name === layoutOf(pp))?.levels.filter((l) => l.bsu && !/tenancy/i.test(l.name)).map((l) => `${layoutOf(pp)} › ${l.name}`) ?? [];
  return [...new Set([...lv, attachKey(pp, 'Room')])];
};
const fieldShown = (f: CustomField | undefined, v: string | undefined) => (!v ? '' : f?.type === 'Yes / no' ? (v === 'yes' ? 'Yes' : v === 'no' ? 'No' : '') : v);

/** The breadcrumb's Properties is the sidebar section, not a page, so it isn't a link (as Occupancy). */
const SECTION = { label: 'Properties', plain: true };
/** The Property picker's All: every property's units in one table. */
const ALL = 'all';
function parseUnit(id: string): Sel | null {
  const m = /^([^:]+):(\d+):(\d+)\.(\d+)\./.exec(id);
  return m ? { pid: m[1], bi: +m[2], floor: +m[3], flat: +m[4] } : null;
}

export function UnitsPage() {
  const all = useInv((s) => s.properties);
  const props = useMemo(() => all.filter((p) => p.status !== 'Archived' && p.units > 0 && !p.build), [all]);
  if (!props.length) return (
    <>
      <PageHeader icon={ListDashes} title="Units" crumbs={[SECTION]} />
      <EmptyArea art="getStarted" icon={ListDashes} title="No units yet" sub="Rooms show here once a property is built or imported.">
        <Button variant="primary" onClick={() => location.assign('#/properties')}>Create a property</Button>
      </EmptyArea>
    </>
  );
  return <UnitsSwitch props={props} />;
}
/* V1 (the flat table), V2 (V1 with the left property tree, 2026-11-27) or V3 (tree table + side panel, 2026-11-26), picked
   by the floating switch at the bottom. V2 and V3 swapped places on 2026-11-27. */
function UnitsSwitch({ props }: { props: Property[] }) {
  const [v, setV] = useUnitsVersion();
  return <>{v === 3 ? <UnitsV2 props={props} /> : <UnitsView key={v} props={props} tree={v === 2} />}<VersionToggle value={v} onChange={setV} /></>;
}

function UnitsView({ props, tree = false }: { props: Property[]; /** V2: the left property tree picks the place, and holds Location. */ tree?: boolean }) {
  const [sp, setSp] = useSearchParams();
  const [open, setOpen] = useOpen();
  const edits = useInv((s) => s.unitEdits);
  const archived = useInv((s) => s.archived);
  const archivedFlats = useInv((s) => s.archivedFlats);
  const structures = useInv((s) => s.structures);
  /* Every property opens on its first block's Floor 1 (2026-11-23); a houses property on its list of houses. */
  /* A property opens on all of it, split by block · floor rows (no tree to pick a level from, 2026-11-26). */
  const home = (pid: string): Sel => ({ pid, bi: null, floor: null, flat: null });
  const [sel, setSel] = useState<Sel>(() => {
    const fromOpen = open ? parseUnit(open) : null;
    if (fromOpen) return fromOpen;
    return home(sp.get('p') ?? ALL);
  });
  const [tab, setTab] = useState<TabId>('all');
  const [typeF, setTypeF] = useState<string[]>([]);
  /* Block, Floor and Status tick several at once (2026-11-26). Block holds names in All, block numbers in one property. */
  const [floorF, setFloorF] = useState<string[]>([]);
  const [blockF, setBlockF] = useState<string[]>([]);
  const [statusF, setStatusF] = useState<string[]>([]);
  useEffect(() => { setFloorF([]); setBlockF([]); }, [sel.pid]);
  /* Database-style table (2026-11-26): the shown columns in order (Columns), a sort from a header's menu, a Group by
     field with collapsible groups, and typed filters (Rent, Template, custom fields at every level) beside the plain ones. */
  const [cols, setCols] = useState<string[]>(BASE_COLS);
  const [sort, setSort] = useState<SortState>(null);
  /* Group by is gone from V1 and V2 (2026-11-27), as from V3; rows stay grouped by place. */
  const gbKey = null as string | null;
  const [collapsed, setCollapsed] = useState<string[]>([]);
  const [xF, setXF] = useState<Record<string, string[]>>({});
  const fieldsAll = useInv((s) => s.fields);
  const fieldValues = useInv((s) => s.fieldValues);
  const [bulkEdit, setBulkEdit] = useState(false);
  const [cursor, setCursor] = useState(0);
  /* The J/K cursor's grey shows only while moving by keyboard; a click (and closing the panel after it) leaves no grey behind. */
  const [kbd, setKbd] = useState(false);
  const [checked, setChecked] = useState<string[]>([]);
  const [archiveT, setArchiveT] = useState<ArchTarget | null>(null);
  const [restore, setRestore] = useState<ArchivedRow | null>(null);
  const [renaming, setRenaming] = useState<Flat | null>(null);
  /* The level panel (Block, Floor or Flat) for filling in custom fields; one panel at a time, so it closes the unit's. */
  const [level, setLevelRaw] = useState<LevelRef | null>(null);
  const setLevel = (l: LevelRef | null) => { if (l) { setOpen(null); setPropOpen(null); } setLevelRaw(l); };
  /* All properties: a property's name opens its own panel (2026-11-26), the same one the Properties list opens. */
  const [propOpen, setPropOpenRaw] = useState<string | null>(null);
  const setPropOpen = (id: string | null) => { if (id) { setOpen(null); setLevelRaw(null); } setPropOpenRaw(id); };

  /* All properties (2026-11-26): every unit, led by a Property column. A unit opened from it brings its own property along. */
  const allMode = sel.pid === ALL;
  const [loc, setLoc] = useState('');
  /* Property is a checkbox filter (2026-11-26): one ticked opens that property's own view; none or several show All, narrowed to them. */
  const [propF, setPropF] = useState<string[]>([]);
  const locProps = props.filter((x) => !loc || x.campus === loc);
  const scopeProps = locProps.filter((x) => !propF.length || propF.includes(x.id));
  const openPid = open ? parseUnit(open)?.pid : undefined;
  const p = props.find((x) => x.id === (allMode ? openPid ?? props[0].id : sel.pid)) ?? props[0];
  useEffect(() => { if (!allMode && p && p.id !== sel.pid) setSel(home(p.id)); }, [p, sel.pid, allMode]); // eslint-disable-line react-hooks/exhaustive-deps
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
  const allBase = useMemo(() => !allMode ? [] : scopeProps.flatMap((pp) => {
    const s = shapeOf(pp, structures);
    return allUnits(pp, edits).flatMap((u) => {
      const at = parseUnit(u.id);
      if (!at || goneIn(archivedFlats)(`${pp.id}|${at.bi}|${at.floor}|${at.flat}`)) return [];
      /* Block, Floor, Flat columns; a level the property's layout doesn't have is a dash, a house sits in Flat. */
      const fname = edits[`flat|${pp.id}|${at.bi}|${at.floor}|${at.flat}`]?.code ?? `Flat ${at.floor}.${at.flat}`;
      const where = s.house ? ['', '', `House ${at.flat}`] : [pp.blocks[at.bi ?? 0]?.name ?? '', `Floor ${at.floor}`, s.flats ? fname : ''];
      const lk = `L:${pp.id}|${at.bi ?? 0}|${at.floor}|${at.flat}`;
      const gk = s.house ? [undefined, undefined, lk] : [`B:${pp.id}|${at.bi ?? 0}`, `F:${pp.id}|${at.bi ?? 0}|${at.floor}`, s.flats ? lk : undefined];
      const bi = at.bi ?? 0;
      const opens = [() => setLevel({ pid: pp.id, kind: 'Block', bi, floor: 1 }), () => setLevel({ pid: pp.id, kind: 'Floor', bi, floor: at.floor ?? 1 }), () => setLevel({ pid: pp.id, kind: 'Flat', bi, floor: at.floor ?? 1, flat: at.flat ?? undefined })];
      /* A flat (or house) name is plain text (2026-11-26); Block and Floor open their panels. */
      return [{ u, place: where.map((v, i) => ({ v, g: gk[i], open: i < 2 ? opens[i] : undefined })), lead: { key: pp.id, name: pp.name, g: `P:${pp.id}`, photo: photoOf(pp.id) } }];
    });
  }), [allMode, loc, propF, props, edits, archivedFlats, structures]); // eslint-disable-line react-hooks/exhaustive-deps
  const allCount = (st: string) => allBase.filter((r) => r.u.status === st).length;
  const counts = allMode
    ? { all: allBase.filter((r) => r.u.status !== 'Archived').length, Active: allCount('Active'), Draft: allCount('Draft'), Inactive: allCount('Inactive'), Archived: 0 }
    : p.id === 'col'
    ? { all: p.counts.all, Active: p.counts.active - [...archUnitIds].filter((id) => all.find((u) => u.id === id)?.status === 'Active').length, Draft: p.counts.draft - [...archUnitIds].filter((id) => all.find((u) => u.id === id)?.status === 'Draft').length, Inactive: p.counts.inactive - [...archUnitIds].filter((id) => all.find((u) => u.id === id)?.status === 'Inactive').length, Archived: archRows.length }
    : { all: all.length, Active: live.filter((u) => u.status === 'Active').length, Draft: live.filter((u) => u.status === 'Draft').length, Inactive: live.filter((u) => u.status === 'Inactive').length, Archived: archRows.length };
  const [q, setQ] = useState('');
  const ql = q.trim().toLowerCase();
  /* Houses have no floors of their own, so a floor filter leaves them out. */
  const floorOk = (u: Unit) => !floorF.length || (!(allMode ? shapeOf(props.find((x) => x.id === parseUnit(u.id)?.pid) ?? p, structures) : sh).house && floorF.includes(String(parseUnit(u.id)?.floor)));
  const blockOk = (u: Unit) => {
    if (!blockF.length) return true;
    const at = parseUnit(u.id);
    if (!allMode) return blockF.includes(String(at?.bi ?? 0));
    const pp = props.find((x) => x.id === at?.pid);
    return !!pp && !shapeOf(pp, structures).house && blockF.includes(pp.blocks[at?.bi ?? 0]?.name ?? '');
  };
  const statusOk = (u: Unit) => !statusF.length || tab !== 'all' || statusF.includes(u.status);
  /* Custom fields by level (2026-11-26): a unit's value for a level's field is on its block, floor or flat record. */
  const LEVELS = ['Unit', 'Flat', 'Floor', 'Block'] as const;
  type Lv = (typeof LEVELS)[number];
  const levelId = (u: Unit, lv: Lv) => {
    if (lv === 'Unit') return u.id;
    const at = parseUnit(u.id); if (!at) return '';
    return lv === 'Block' ? `${at.pid}|${at.bi}` : lv === 'Floor' ? `${at.pid}|${at.bi}|${at.floor}` : `${at.pid}|${at.bi}|${at.floor}|${at.flat}`;
  };
  const kindOf = (t: string): RuleKind => (t === 'Number' ? 'number' : t === 'Yes / no' ? 'yesno' : t.startsWith('Pick one') ? 'choice' : 'text');
  const fieldProps = allMode ? scopeProps : [p];
  const levelFields = LEVELS.flatMap((lv) => fieldsAll
    .filter((f) => fieldProps.some((pp) => (lv === 'Unit' ? unitFieldKeys(pp, structures) : [attachKey(pp, lv)]).some((k) => f.attached.includes(k))))
    .map((f) => ({ key: `cf:${lv}:${f.id}`, lv, f, kind: kindOf(f.type) })));
  const xVal = (id: string, u: Unit): string | number | null | undefined => {
    if (id === 'rent') return u.rent;
    if (id === 'template') return u.template ? u.template.split(' · ')[0] : '';
    const lf = levelFields.find((x) => x.key === id);
    return lf ? fieldValues[levelId(u, lf.lv)]?.[lf.f.id] : undefined;
  };
  const xKind = (id: string): RuleKind => (id === 'rent' ? 'number' : id === 'template' ? 'choice' : levelFields.find((x) => x.key === id)?.kind ?? 'text');
  const xRules = Object.entries(xF).filter(([, v]) => v.length);
  const xOk = (u: Unit) => xRules.every(([id, r]) => (id === 'template' ? r.includes(String(xVal(id, u) ?? '')) : ruleMatch(xKind(id), r, xVal(id, u))));
  const visible = (u: Unit) => xOk(u) && statusOk(u) && floorOk(u) && blockOk(u) && u.status !== 'Archived' && (tab === 'all' || u.status === tab) && (!typeF.length || typeF.includes(u.type)) && (!ql || u.code.toLowerCase().includes(ql) || u.type.toLowerCase().includes(ql));
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
  /* Each level below the lead column is its own column (2026-11-26, was one Place column): only the levels the lead
     doesn't already name and the layout has. */
  const gb = gbKey != null;
  /* Sorted or grouped, the table is one flat list: the place levels become plain columns and nothing pins (2026-11-26). */
  /* A sort keeps the table's shape (2026-11-27): Block or Floor reorders blocks, or floors, inside their parent; any
     other column sorts the units inside their own group. Only Group by flattens the table. */
  const placeSort = !gb && (sort?.col === 'Block' || sort?.col === 'Floor');
  const flatView = gb;
  const placeCols: string[] = flatView ? (allMode ? ['Property', 'Block', 'Floor', 'Flat'] : sh.house ? ['House'] : ['Block', 'Floor', ...(sh.flats ? ['Flat'] : [])])
    : allMode ? ['Block', 'Floor', 'Flat']
    : grouped ? (mode === 'property' ? ['Floor', ...(sh.flats ? ['Flat'] : [])] : sh.flats ? ['Flat'] : [])
    : mode === 'flat' && !sh.house ? ['Block', 'Floor', ...(sh.flats ? ['Flat'] : [])] : [];
  const allRows = allBase.filter((r) => visible(r.u));
  const flatList = allMode ? allRows.map((r) => r.u) : grouped ? shownBlocks.flatMap((g) => g.floors.flatMap((f) => f.shown)) : groups.flatMap((g) => g.units);
  const totalHere = allMode ? allBase.filter((r) => r.u.status !== 'Archived').length : grouped ? blockGroups.reduce((n, g) => n + g.floors.reduce((m, f) => m + f.units.length, 0), 0) : shownFlats.reduce((n, f) => n + f.units.length, 0);
  const openUnit = open ? flats.flatMap((f) => f.units).find((u) => u.id === open) ?? all.find((u) => u.id === open) ?? null : null;
  const openAt = open ? parseUnit(open) : null;
  /* Each place cell opens its level's panel (Block, Floor, Flat), so a flat can be edited from the table (2026-11-26). */
  const placeOf = (u: Unit, from: 'block' | 'floor' | 'flat' = 'block'): Place[] => {
    const at = parseUnit(u.id); if (!at) return [];
    const bi = at.bi ?? 0, floor = at.floor ?? 1, fl = at.flat ?? 1;
    const flat: Place[] = sh.flats ? [{ v: edits[`flat|${p.id}|${bi}|${floor}|${fl}`]?.code ?? `Flat ${floor}.${fl}`, g: `L:${p.id}|${bi}|${floor}|${fl}` }] : [];
    const fc: Place = { v: `Floor ${floor}`, g: sh.house ? undefined : `F:${p.id}|${bi}|${floor}`, open: () => setLevel({ kind: 'Floor', bi, floor }) };
    return from === 'flat' ? flat : from === 'floor' ? [fc, ...flat] : [{ v: p.blocks[bi]?.name ?? '', g: `B:${p.id}|${bi}`, open: () => setLevel({ kind: 'Block', bi, floor: 1 }) }, fc, ...flat];
  };

  // J/K move, Enter opens, X selects.
  const stateRef = useRef({ flatList, cursor });
  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement;
      if (/INPUT|TEXTAREA|SELECT/.test(t.tagName) || document.querySelector('[role=dialog]') || e.metaKey || e.ctrlKey) return;
      const { flatList: l, cursor: c } = stateRef.current;
      if (!l.length) return;
      if (e.key === 'j') { setKbd(true); setCursor(Math.min(l.length - 1, c + 1)); }
      else if (e.key === 'k') { setKbd(true); setCursor(Math.max(0, c - 1)); }
      else if (e.key === 'Enter') setOpen(l[c]?.id ?? null);
      else if (e.key === 'x' || e.key === 'X') { const id = l[c]?.id; if (id) handlers.current.check(id, e.key === 'X'); }
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
  const place: { label: string; onClick?: () => void }[] = /* Not "All properties" (2026-11-26): that's the Properties page's own name, so here it reads as units. */
    allMode ? [{ label: propF.length ? (scopeProps.length === 1 ? `Units in ${scopeProps[0].name}` : `Units in ${scopeProps.length} properties`) : loc ? `Units in ${loc}` : 'All units' }] : [
    { label: p.name, onClick: mode !== 'property' ? toProperty : undefined },
    ...(block && !sh.house ? [{ label: block.name, onClick: mode === 'floor' || mode === 'flat' ? () => toBlock(sel.bi!) : undefined }] : []),
    ...(sel.floor != null && !sh.house ? [{ label: floorName, onClick: mode === 'flat' ? () => toFloor(sel.bi!, sel.floor!) : undefined }] : []),
    ...(curFlat ? [{ label: nameOf(curFlat, sh) }] : []),
  ];
  const title = place[place.length - 1].label;
  const toggleIds = (ids: string[]) => setChecked((c) => (ids.every((id) => c.includes(id)) ? c.filter((x) => !ids.includes(x)) : [...new Set([...c, ...ids])]));
  const tri = (ids: string[]): boolean | 'indeterminate' => { const n = ids.filter((id) => checked.includes(id)).length; return !ids.length || !n ? false : n === ids.length ? true : 'indeterminate'; };
  const onOpenUnit = (id: string) => { setKbd(false); setOpen(id); setCursor(navList.findIndex((u) => u.id === id)); };
  type Row = { u: Unit; place?: Place[]; lead?: { key: string; name: string; g?: string; onOpen?: () => void; photo?: string } };
  const rows0: Row[] = flatView ? (allMode
      ? allRows.map((r) => ({ u: r.u, place: [{ v: r.lead.name }, ...r.place] }))
      : flatList.map((u) => ({ u, place: sh.house ? [{ v: `House ${parseUnit(u.id)?.flat}` }] : placeOf(u) })))
    : allMode ? allRows : grouped
    ? shownBlocks.flatMap((g) => g.floors.flatMap((f) => f.shown.map((u) => mode === 'property'
      ? { u, place: placeOf(u, 'floor'), lead: { key: `${g.bi}`, name: g.b.name, g: `B:${p.id}|${g.bi}`, onOpen: () => setLevel({ kind: 'Block', bi: g.bi, floor: 1 }) } }
      : { u, place: sh.flats ? placeOf(u, 'flat') : undefined, lead: { key: `${g.bi}|${f.floor}`, name: `Floor ${f.floor}`, g: `F:${p.id}|${g.bi}|${f.floor}`, onOpen: () => setLevel({ kind: 'Floor', bi: g.bi, floor: f.floor }) } })))
    : byFlat ? groups.flatMap(({ f, units }) => units.map((u) => ({ u, lead: { key: f.id, name: nameOf(f, sh), g: `L:${f.id}` } })))
    : flatList.map((u) => ({ u, place: placeCols.length ? placeOf(u) : undefined }));
  /* Columns whose cells carry a group checkbox; their headers start where the names do. Grouped by a field, none. */
  const leadLabel = flatView ? null : allMode ? 'Property' : grouped ? (mode === 'property' ? 'Block' : 'Floor') : byFlat ? (sh.house ? 'House' : 'Flat') : null;
  /* Pinned level columns after the lead: Block and Floor in All, Floor inside a property (2026-11-26). */
  /* Block and Floor pin; Flat is back in the table beside Unit (2026-11-26). */
  const subCols = flatView ? [] : allMode ? ['Block', 'Floor'] : grouped && mode === 'property' && !sh.house ? ['Floor'] : [];
  /* Sort (a header's menu): across the whole list, inside each group when grouped by a field. Empty values go last. */
  const sortVal = (u: Unit, col: string): string | number | null | undefined => {
    if (col === 'Unit') return u.code;
    if (col === 'Room type') return u.type;
    if (col === 'Rent') return u.rent;
    if (col === 'Status') return u.status;
    if (col === 'Template') return xVal('template', u);
    /* Block and Floor sort too (2026-11-27): by the block's name, then by floor number. */
    if (col === 'Block' || col === 'Floor') { const at = parseUnit(u.id); if (!at) return undefined; return col === 'Floor' ? at.floor : props.find((x) => x.id === at.pid)?.blocks[at.bi ?? 0]?.name; }
    if (col.startsWith('cf:')) return fieldValues[u.id]?.[col.slice(3)];
    return undefined;
  };
  const cmp = (a: Unit, b: Unit) => {
    if (!sort) return 0;
    const x = sortVal(a, sort.col), y = sortVal(b, sort.col);
    const ex = x == null || x === '', ey = y == null || y === '';
    if (ex || ey) return ex === ey ? 0 : ex ? 1 : -1;
    const d = typeof x === 'number' && typeof y === 'number' ? x - y : String(x).localeCompare(String(y), undefined, { numeric: true });
    return sort.dir === 'asc' ? d : -d;
  };
  const sorted: Row[] = (() => {
    if (!sort) return rows0;
    if (placeSort) {
      /* Properties keep their order; blocks (by name) or floors (by number, inside their block) flip. */
      const pIdx = new Map<string, number>();
      const key = (u: Unit) => { const at = parseUnit(u.id); if (!at) return null; if (!pIdx.has(at.pid)) pIdx.set(at.pid, pIdx.size); return at; };
      const dir = sort.dir === 'asc' ? 1 : -1;
      return rows0.map((r, i) => ({ r, i, at: key(r.u) })).sort((a, b) => {
        if (!a.at || !b.at) return a.i - b.i;
        const pd = pIdx.get(a.at.pid)! - pIdx.get(b.at.pid)!; if (pd) return pd;
        const bn = (x: Sel) => props.find((q) => q.id === x.pid)?.blocks[x.bi ?? 0]?.name ?? '';
        if (sort.col === 'Block') return dir * bn(a.at).localeCompare(bn(b.at), undefined, { numeric: true }) || a.i - b.i;
        return (a.at.bi ?? 0) - (b.at.bi ?? 0) || dir * ((a.at.floor ?? 0) - (b.at.floor ?? 0)) || a.i - b.i;
      }).map((x) => x.r);
    }
    if (!gb) {
      /* Units sort inside their innermost pinned group (the lead and pinned level cells they sit under; Flat is a plain column), so groups stay whole and in place. */
      const gIdx = new Map<string, number>();
      const chain = (r: Row) => { const k = [r.lead?.g ?? r.lead?.key ?? '', ...(r.place ?? []).slice(0, subCols.length).map((c) => c.g ?? '')].join('/'); if (!gIdx.has(k)) gIdx.set(k, gIdx.size); return gIdx.get(k)!; };
      return rows0.map((r, i) => ({ r, i, g: chain(r) })).sort((a, b) => a.g - b.g || cmp(a.r.u, b.r.u) || a.i - b.i).map((x) => x.r);
    }
    return rows0.map((r, i) => ({ r, i })).sort((a, b) => cmp(a.r.u, b.r.u) || a.i - b.i).map((x) => x.r);
  })();
  /* Group by a field (2026-11-26): a 48px header row per value, with its count, a box to tick the group and a caret to fold it. */
  const STATUS_ORDER = ['Active', 'Draft', 'Inactive'];
  const gbLabel = (u: Unit): string => {
    if (!gbKey) return '';
    if (gbKey === 'status') return u.status;
    if (gbKey === 'type') return u.type;
    const v = xVal(gbKey, u);
    if (v == null || v === '') return gbKey === 'template' ? 'No template' : 'No value';
    return xKind(gbKey) === 'yesno' ? (v === 'yes' ? 'Yes' : 'No') : String(v);
  };
  type Item = { h: true; key: string; label: string; ids: string[]; folded: boolean } | { h: false; i: number };
  const { rows, items } = (() => {
    if (!gb) return { rows: sorted, items: sorted.map((_, i): Item => ({ h: false, i })) };
    const by = new Map<string, Row[]>();
    for (const r of sorted) { const k = gbLabel(r.u); const l = by.get(k); if (l) l.push(r); else by.set(k, [r]); }
    const empty = (k: string) => k === 'No value' || k === 'No template';
    const keys = [...by.keys()].sort((a, b) => gbKey === 'status' ? STATUS_ORDER.indexOf(a) - STATUS_ORDER.indexOf(b)
      : (empty(a) ? 1 : 0) - (empty(b) ? 1 : 0) || a.localeCompare(b, undefined, { numeric: true }));
    const rs: Row[] = [], its: Item[] = [];
    for (const k of keys) {
      const g = by.get(k)!, folded = collapsed.includes(k);
      its.push({ h: true, key: k, label: k, ids: g.map((r) => r.u.id), folded });
      if (!folded) for (const r of g) { its.push({ h: false, i: rs.length }); rs.push(r); }
    }
    return { rows: rs, items: its };
  })();
  const navList = rows.map((r) => r.u);
  stateRef.current = { flatList: navList, cursor };
  /* Only the rows in view are drawn (2026-11-26): drawing all 2,779 units in All made opening and leaving Units lag.
     Rows are a fixed 48px, with spacer rows above and below standing in for the rest. */
  const ROW_H = 48;
  const scroller = useRef<HTMLDivElement>(null);
  const [view, setView] = useState({ top: 0, h: 900 });
  /* Sideways scrolling only marks the pinned columns' edge (data-sx); it doesn't re-render the rows. */
  const onScroll = (e?: unknown) => { const el = scroller.current; if (!el) return; el.toggleAttribute('data-sx', el.scrollLeft > 0);
    /* Synchronous, so the pinned labels and their push move in the same frame as the rows. */
    const next = { top: el.scrollTop, h: el.clientHeight };
    const put = () => setView((v) => (v.top === next.top && v.h === next.h ? v : next));
    if (e) flushSync(put); else put(); };
  const headRef = useRef<HTMLTableSectionElement>(null);
  const headH = headRef.current?.offsetHeight ?? 42;
  useEffect(() => { onScroll(); const el = scroller.current; if (!el) return; const ro = new ResizeObserver(() => onScroll()); ro.observe(el); return () => ro.disconnect(); }, [tab === 'Archived']); // eslint-disable-line react-hooks/exhaustive-deps
  const vStart = Math.max(0, Math.floor(view.top / ROW_H) - 8);
  const vEnd = Math.min(items.length, Math.ceil((view.top + view.h) / ROW_H) + 8);
  /* A changed list starts at the top; the J/K cursor and the open unit are scrolled into view. */
  useEffect(() => { scroller.current?.scrollTo(0, 0); }, [sel, tab, typeF, floorF, blockF, statusF, q, loc, propF, xF, gbKey, sort]); // eslint-disable-line react-hooks/exhaustive-deps
  const focusId = (kbd ? navList[cursor]?.id : undefined) ?? open;
  useEffect(() => {
    const el = scroller.current; const i = focusId ? items.findIndex((it) => !it.h && rows[it.i].u.id === focusId) : -1;
    if (!el || i < 0) return;
    const head = headH, y = i * ROW_H;
    if (y < el.scrollTop) el.scrollTop = y; else if (y + ROW_H > el.scrollTop + el.clientHeight - head) el.scrollTop = y + ROW_H - el.clientHeight + head;
  }, [focusId]); // eslint-disable-line react-hooks/exhaustive-deps
  /* A quiet skeleton while the units load: on opening the page and on switching property or location. Prototype data is
     instant, so it holds for 450ms to stand in for the fetch. */
  const [loading, setLoading] = useState(true);
  useEffect(() => { setLoading(true); const t = setTimeout(() => setLoading(false), 900); return () => clearTimeout(t); }, [sel.pid, loc, propF]);
  /* Rows are memoised, so scrolling renders only the rows coming into view; their handlers go through a ref to stay stable. */
  /* Group selection (2026-11-26): a property, block or floor's checkbox ticks every unit of it the table shows. */
  const groupIds = new Map<string, string[]>();
  for (const r of rows) for (const g of [r.lead?.g, ...(r.place ?? []).map((c) => c.g)]) if (g) { const l = groupIds.get(g); if (l) l.push(r.u.id); else groupIds.set(g, [r.u.id]); }
  const rowIndex = new Map(rows.map((r, i) => [r.u.id, i]));
  const checkedSet = new Set(checked);
  /* How much of a group is ticked, worked out once per render for the groups on screen. */
  const gsCache = new Map<string, { s: GState; n: number; on: number }>();
  const gcount = (g?: string) => {
    if (!g) return { s: 'none' as GState, n: 0, on: 0 };
    let v = gsCache.get(g);
    if (!v) { const ids = groupIds.get(g) ?? []; const on = ids.filter((id) => checkedSet.has(id)).length; v = { s: !on ? 'none' : on === ids.length ? 'all' : 'some', n: ids.length, on }; gsCache.set(g, v); }
    return v;
  };
  /* Shift-click ticks a range (2026-11-26): from the last unit (or group) clicked to this one, the way the clicked one goes. */
  const anchor = useRef<{ id?: string; g?: string }>({});
  const setRange = (ids: string[], on: boolean) => setChecked((c) => { const out = new Set(c); ids.forEach((id) => (on ? out.add(id) : out.delete(id))); return [...out]; });
  const handlers = useRef({ check: (_id: string, _shift?: boolean) => {}, open: (_id: string) => {} });
  handlers.current = {
    check: (id, shift) => {
      const a = anchor.current.id;
      if (shift && a && a !== id && rowIndex.has(a) && rowIndex.has(id)) {
        const [i, j] = [rowIndex.get(a)!, rowIndex.get(id)!].sort((x, y) => x - y);
        setRange(rows.slice(i, j + 1).map((r) => r.u.id), !checkedSet.has(id));
      } else toggleIds([id]);
      anchor.current = { ...anchor.current, id };
    },
    open: onOpenUnit,
  };
  const onCheckId = useMemo(() => (id: string, shift?: boolean) => handlers.current.check(id, shift), []);
  const onOpenId = useMemo(() => (id: string) => handlers.current.open(id), []);
  const cursorId = kbd ? navList[cursor]?.id : undefined;
  /* Pinned columns (2026-11-26): the lead, the checkbox and Unit stay put when the table scrolls sideways. */
  /* +16 (2026-11-26): 24px between the name and the row checkbox. In All, Block is a second pinned column beside Property. */
  const propW = leadLabel ? (leadLabel === 'Property' ? 224 : 120) : 0; /* tighter once the group boxes went; Property +52 for its photo (2026-11-26), then 40 less to sit closer to Block (2026-11-27) */
  /* The Notion-style Filter's rules map onto the page's own filter state. */
  const floorMax = Math.max(0, ...(allMode ? scopeProps.filter((x) => !shapeOf(x, structures).house).flatMap((x) => x.blocks) : sel.bi != null ? [p.blocks[sel.bi]] : p.blocks).map((b) => b?.floors ?? 0));
  const ruleFields: RuleField[] = [
    /* V2 (2026-11-27): the tree replaces the toolbar's property picker, so Property is a filter on All units. It's apart
       from navigation: picking a place in the tree doesn't set it, and it doesn't open a property. */
    ...(tree && allMode ? [{ id: 'property', label: 'Property', group: 'Place', icon: Bank, /* not Block's building (2026-11-27) */ multi: true, options: locProps.map((x) => ({ value: x.id, label: x.name })) }] : []),
    ...(allMode ? [{ id: 'block', label: 'Block', group: 'Place', icon: Buildings, multi: true, options: [...new Set(scopeProps.filter((x) => !shapeOf(x, structures).house).flatMap((x) => x.blocks.map((b) => b.name)))].map((n) => ({ value: n })) }]
      : !sh.house && p.blocks.length > 1 ? [{ id: 'block', label: 'Block', group: 'Place', icon: Buildings, multi: true, options: p.blocks.map((b, i) => ({ value: String(i), label: b.name })).filter((o) => !goneIn(archivedFlats)(`${p.id}|${o.value}`)) }] : []),
    ...(allMode || !sh.house ? [{ id: 'floor', label: 'Floor', group: 'Place', icon: Stack, multi: true, options: Array.from({ length: floorMax }, (_, i) => ({ value: String(i + 1), label: `Floor ${i + 1}` })) }] : []),
    ...(tab !== 'Inactive' ? [{ id: 'status', label: 'Status', group: 'Unit', icon: CheckCircle, multi: true, options: [{ value: 'Active', meta: counts.Active }, { value: 'Draft', meta: counts.Draft }, ...(allMode ? [] : [{ value: 'Archived', meta: counts.Archived }])] }] : []),
    { id: 'type', label: 'Room type', group: 'Unit', icon: Bed, multi: true, options: ROOM_TYPES.map((t) => ({ value: t })) },
    { id: 'rent', label: 'Rent', group: 'Unit', icon: CurrencyGbp, kind: 'number', options: [] },
    /* Template is a plain tick list (2026-11-26): no is / is not / empty conditions. */
    { id: 'template', label: 'Template', group: 'Unit', icon: Tag, multi: true, options: ROOM_TYPES.map((t) => ({ value: t })) },
    ...levelFields.map((x): RuleField => ({ id: x.key, label: x.f.name, group: x.lv, nest: 'Custom fields', kind: x.kind,
      icon: x.kind === 'number' ? Hash : x.kind === 'yesno' ? ToggleLeft : x.kind === 'choice' ? CheckCircle : TextT,
      options: x.kind === 'choice' ? choicesOf(x.f).map((c) => ({ value: c })) : [] })),
  ];
  const ruleValue: Record<string, string[]> = {
    property: allMode ? propF : [],
    block: blockF,
    floor: floorF,
    status: tab === 'Archived' ? ['Archived'] : tab === 'all' ? statusF : [],
    type: typeF,
    ...xF,
  };
  const onRule = (id: string, v: string[]) => {
    /* Narrows All units to the ticked properties (one or several); none, or every one, is all of them. */
    if (id === 'property') { setPropF(v.length >= locProps.length ? [] : v); setCursor(0); return; }
    if (id === 'block') setBlockF(v);
    if (id === 'floor') setFloorF(v);
    /* Archived is its own table, so ticking it shows that alone; Active and Draft narrow the list. */
    if (id === 'status') { if (v.includes('Archived')) { setTab('Archived'); setStatusF([]); } else { if (tab === 'Archived') setTab('all'); setStatusF(v); } }
    if (id === 'type') setTypeF(v);
    if (!['block', 'floor', 'status', 'type', 'property'].includes(id)) setXF((m) => ({ ...m, [id]: v }));
    setCursor(0);
  };
  /* Columns: the fixed ones and the custom fields on units. */
  const colOptions = [...BASE_COLS.map((c) => ({ id: c, label: c })), ...levelFields.filter((x) => x.lv === 'Unit').map((x) => ({ id: `cf:${x.f.id}`, label: x.f.name, group: 'Custom' }))];
  const head = (h: string) => {
    const label = colLabel(h);
    /* Block and Floor are the layout's own columns but sort and filter like the rest (2026-11-27); they can't be hidden. Flat, House, Property stay plain. */
    const place = h === 'Block' || h === 'Floor';
    if (h !== 'Unit' && !place && !cols.includes(h)) return label;
    /* Room type and Template are names, not an order: no sort (2026-11-26); filter them instead. */
    return <ColumnHead label={label} col={h} sort={sort} onSort={h === 'Room type' || h === 'Template' ? undefined : setSort}
      /* No Filter in the column menu and no filtered dot (2026-11-27): filters live in the toolbar's Filter menu and chips. */
      onHide={h === 'Unit' || place ? undefined : () => setCols((c) => c.filter((x) => x !== h))} />;
  };
  const subW = subCols.map((h) => SUB_W[h]);
  const subLeft = (j: number) => propW + subW.slice(0, j).reduce((a, b) => a + b, 0);
  const leadW = subLeft(subCols.length);
  const colsKey = cols.join('|');
  const nCols = (leadLabel ? 1 : 0) + subCols.length + 2 + placeCols.filter((h) => !subCols.includes(h)).length + cols.length + 1;
  const countOf = (c: { n: number; on: number }) => (c.on ? `${c.on}/${c.n}` : String(c.n));
  const unitRow = (u: Unit, place?: Place[], lead?: Lead) => {
    const lc = gcount(lead?.g);
    const pc = (place ?? []).map((c) => gcount(c.g));
    return <UnitRow key={u.id} u={u} leadW={leadW} cols={colsKey} fv={fieldValues[u.id]} place={place?.map((c, i) => ({ ...c, n: pc[i].n }))} lead={lead && { ...lead, n: countOf(lc) }}
      gs={[lc.s, ...pc.map((c) => c.s)].join(',')} cursor={cursorId === u.id} open={open === u.id} checked={checkedSet.has(u.id)} onCheck={onCheckId} onOpen={onOpenId} />;
  };
  /* The group the top row belongs to stays named under the header while its first row is scrolled away (2026-11-26);
     the next group's first row pushes it up. */
  const topI = Math.min(rows.length - 1, Math.floor(view.top / ROW_H));
  const topR = rows[topI];
  /* The top run's labels are always the pinned copy (2026-11-26), even before any scroll, so nothing swaps when scrolling starts. */
  const pinLead = !loading && topR?.lead ? topR.lead : null;
  const pinPush = pinLead && rows[topI + 1] && rows[topI + 1].lead?.key !== pinLead.key ? -(view.top % ROW_H) : 0;
  /* Block and Floor in All pin the same way (2026-11-26): the top row's run stays named. */
  const runKey = (r: (typeof rows)[number] | undefined, j: number) => (r ? [r.lead?.key, ...(r.place ?? []).slice(0, j + 1).map((c) => c.v)].join('|') : '');
  const pinSubs = !subCols.length || loading || !topR ? [] : subCols.map((_, j) => {
    const c = topR.place?.[j];
    if (!c?.v) return null;
    return { c, j, push: rows[topI + 1] && runKey(rows[topI + 1], j) !== runKey(topR, j) ? -(view.top % ROW_H) : 0 };
  }).filter((x): x is { c: Place; j: number; push: number } => !!x);
  /* What's ticked, said plainly: the one floor, block or property it's all in, and any ticked units the filters hide. */
  const hiddenSel = checked.filter((id) => !rowIndex.has(id));
  const scopeText = (() => {
    const at = checked.map(parseUnit).filter((x): x is Sel => !!x);
    const pids = new Set(at.map((x) => x.pid));
    if (pids.size > 1) return `across ${pids.size} properties`;
    const pp = props.find((x) => x.id === at[0]?.pid); if (!pp) return '';
    const house = shapeOf(pp, structures).house;
    const bis = new Set(at.map((x) => x.bi)), fls = new Set(at.map((x) => `${x.bi}|${x.floor}`));
    const parts = [...(!house && fls.size === 1 ? [`Floor ${at[0].floor}`] : []), ...(!house && bis.size === 1 ? [pp.blocks[at[0].bi ?? 0]?.name ?? ''] : []), pp.name];
    return `in ${parts.join(', ')}`;
  })();
  /* Ticked units of more than one bookable type (rooms and studios) can't be edited together. */
  const bsuTypes = [...new Set(checked.map((id) => props.find((x) => x.id === parseUnit(id)?.pid)).filter((x): x is Property => !!x).map((pp) => bsuOf(pp, structures)))];
  const n = (x: number) => x.toLocaleString('en-GB');
  const subline = allMode
    ? [`${n(counts.all)} units`, `${scopeProps.length} ${scopeProps.length === 1 ? 'property' : 'properties'}`, ...(loc ? [] : [((k) => `${k} ${k === 1 ? 'location' : 'locations'}`)(new Set(scopeProps.map((x) => x.campus)).size)])].join(' · ')
    : [`${n(counts.all)} units`, ...(sh.house ? [] : [`${p.blocks.length} ${p.blocks.length === 1 ? 'block' : 'blocks'}`]), p.campus].join(' · ');
  /* Column headings; a custom field column (cf:<id>) shows the field's name. */
  const colLabel = (h: string) => (h.startsWith('cf:') ? fieldsAll.find((f) => `cf:${f.id}` === h)?.name ?? '' : h);

  /* A level's archive: from its panel (Archive in the control bar) or a flat's ⋯ menu. The panel closes and, if the table
     was showing what went, it steps up to the level above. */
  const doArchive = (t: ArchTarget) => {
    const st = useInv.getState();
    const units = t.flats.flatMap((f) => f.units);
    const rows: ArchivedRow[] = [{ id: t.id, name: t.name, type: t.kind, flat: true, units: units.length, who: 'Arjun Mehta', when: 'Just now' }, ...units.map((u) => ({ id: `${t.id}#${u.id}`, name: u.code, type: u.type, who: 'Arjun Mehta', when: 'Just now', parent: t.id }))];
    st.set('archivedFlats', (l) => [...l, t.id]);
    const pid = t.id.split('|')[0];
    st.set('archived', (a) => ({ ...a, [pid]: [...rows, ...(a[pid] ?? [])] }));
    setArchiveT(null);
    setLevelRaw(null);
    const [, tb, tf] = t.id.split('|');
    const here = [p.id, sel.bi, sel.floor, sel.flat].filter((x) => x != null).join('|');
    if (here === t.id || here.startsWith(`${t.id}|`)) go(tf == null ? { pid: p.id, bi: null, floor: null, flat: null } : t.id.split('|').length === 3 ? { pid: p.id, bi: +tb, floor: null, flat: null } : sh.house ? { pid: p.id, bi: null, floor: null, flat: null } : { pid: p.id, bi: +tb, floor: +tf, flat: null });
    toast.success(`${t.name} and ${units.length} units archived`, { action: { label: 'Undo', onClick: () => undoArchive(t.id) } });
  };
  /* What archiving a level takes with it. */
  const targetOf = (l: LevelRef): ArchTarget | null => targetIn((l.pid && props.find((x) => x.id === l.pid)) || p, l);
  const targetIn = (p: Property, l: LevelRef): ArchTarget | null => {
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
      {/* Inside one property the breadcrumb goes on to it (2026-11-26); Units goes back to all units. */}
      <PageHeader icon={ListDashes} title={allMode ? 'Units' : p.name} crumbs={allMode ? [SECTION] : [SECTION, { label: 'Units', onClick: () => go(home(ALL)) }]} />
      {/* No Add unit here (2026-11-26): units come from building or importing a property. */}
      <div className="flex-1 min-h-0 flex">
        {/* V1 has no side tree (2026-11-26): the table alone, scoped by the toolbar pickers. V2 brings the tree back (2026-11-27). */}
        {tree && <UnitsTree props={props} all={ALL} structures={structures} shapeOf={shapeOf} sel={sel} go={go} loc={loc} setLoc={setLoc} onInfo={setLevel} />}
        <section className="flex-1 min-w-0 flex flex-col">
          {/* Heading band: the place as one 20px line, property · block · floor; the parts above the current level link back up. */}
          {/* Spaced as the page intros (Occupancy): 24px above (the tab band gives 16 of it) and below, 4px between title and sub line, controls on the sub line's baseline. */}
          <div className="shrink-0 px-6 pt-6 pb-2 bg-[#F5F5F5] flex items-end gap-3">
            {/* Headline with a sub line of plain facts (2026-11-26, asked for): how many units, where, how many active. */}
            <div className="min-w-0 flex-1">
              <h1 className="text-xl leading-7 font-medium text-[#0A0A0A] truncate">
                {place.map((c, i) => (
                  <span key={i}>{i > 0 && <span className="text-[#A3A3A3]"> · </span>}
                    {c.onClick ? <button type="button" onClick={c.onClick} className="text-[#737373] hover:text-[#0A0A0A] hover:underline underline-offset-4">{c.label}</button> : c.label}</span>
                ))}
              </h1>
              <p className="mt-1 text-sm leading-5 text-[#737373] truncate">{subline}</p>
            </div>
            {/* No Details button (2026-11-25): a level's panel opens from its (i) in the tree or its name in a group row. */}
          </div>
          {/* All / Inactive folder tabs (2026-11-26), as Pricing, under the headline; Location and Property ride on the right of the band.
              All is every unit; Inactive only the inactive ones. The Status filter narrows All. */}
          <StatusTabsBar value={tab === 'Inactive' ? 'Inactive' : 'all'} onChange={(t) => { setTab(t); setCursor(0); }}
            tabs={[{ id: 'all', label: 'All', count: counts.all }, { id: 'Inactive', label: 'Inactive', count: counts.Inactive }]}
            aside={<div className="flex items-center gap-2">
              {/* Rename and archive act on a flat, so the menu shows only when a flat is selected. */}
              {curFlat && sh.flats && (
                <Menu width={200} trigger={(o) => <Button icon={DotsThree} onClick={o} aria-label="More" />} items={[
                  { label: 'Rename', icon: PencilSimple, onClick: () => setRenaming(curFlat) },
                  'sep',
                  { label: 'Archive flat', icon: Archive, danger: true, onClick: () => setArchiveT({ id: curFlat.id, name: curFlat.name, kind: 'Flat', flats: [curFlat] }) },
                ]} />
              )}
            </div>} />
          {/* Toolbar: search on the left; the status (was the tab strip) as a single-choice dropdown and the room-type filter on the right. */}
          {/* The tab band leaves 16px of white under it only when a table follows (styles.css); with the empty state the toolbar adds it. */}
          <div {...PIN} className={cx('shrink-0 px-6 pb-4', tab === 'Archived' || flatList.length ? 'pt-0' : 'pt-4')}>
          <div className="flex items-center gap-2">
            <div className="w-[260px] min-w-[140px] shrink [&>label]:!w-full"><SearchInput value={q} onChange={(v) => { setQ(v); setCursor(0); }} placeholder={allMode ? 'Search units' : `Search ${title}`} /></div>
            {/* Scope (2026-11-26): Location narrows the Property list; picking one that leaves the shown property out goes back to All.
                Then one Notion-style Filter for Block, Floor, Status and Room type. */}
            <div className="ml-auto min-w-0 flex items-center gap-2">
              {!tree && <>
              <SelectFilter label="Location" value={loc} width={220} onChange={(v) => { setLoc(v); if (v && !allMode && p.campus !== v) go(home(ALL)); }}
                options={[...new Set(props.map((x) => x.campus))].map((c) => ({ value: c, meta: props.filter((x) => x.campus === c).reduce((n, x) => n + x.units, 0) }))} />
              <div className="shrink-0"><MultiPicker icon={Buildings} all="All properties" noun={['property', 'properties']} value={allMode ? propF : [p.id]} onChange={(v) => { setPropF(v.length > 1 ? v : []); go(home(v.length === 1 ? v[0] : ALL)); }} options={locProps.map((x) => ({ id: x.id, label: x.name }))} /></div>
              <span aria-hidden className="w-px h-5 bg-[#E5E5E5] shrink-0" />
              </>}
              {/* V1 and V2 filter as V3 (2026-11-27): the compact Filter menu with values in a flyout, and the applied ones as
                  chips under the toolbar. */}
              <FilterGroupButton fields={ruleFields} value={ruleValue} onChange={onRule} />
              <ColumnsMenu options={colOptions} value={cols} onChange={setCols} />
            </div>
          </div>
          <div className="empty:hidden mt-3"><FilterChips fields={ruleFields} value={ruleValue} onChange={onRule} /></div>
          </div>

          {tab === 'Archived' ? (
            <ArchivedTable p={p} rows={archRows} onRestore={(r) => (r.flat ? setRestore(r) : restoreOne(p, r))} />
          ) : (
            <>
              <div data-fill ref={scroller} onScroll={onScroll} className="flex-1 overflow-auto">
                {pinSubs.map(({ c, j, push }) => (
                  <div key={j} className="sticky left-0 z-[2] h-0" style={{ top: headH }}>
                    <div className="absolute h-12 pr-3 flex items-center bg-white text-sm whitespace-nowrap overflow-hidden" style={{ left: subLeft(j), width: subW[j], transform: `translateY(${push}px)` }}>
                      <div className="min-w-0"><SubName c={c} /><GroupCount n={gcount(c.g).n} /></div>
                    </div>
                  </div>
                ))}
                {pinLead && (
                  <div className="sticky left-0 z-[2] h-0" style={{ top: headH }}>
                    <div className="absolute left-0 h-12 pl-6 pr-4 flex items-center bg-white" style={{ width: propW, transform: `translateY(${pinPush}px)` }}>
                      <LeadLabel lead={{ ...pinLead, first: true, last: false, n: countOf(gcount(pinLead.g)) }} s={gcount(pinLead.g).s} />
                    </div>
                  </div>
                )}
                {!flatList.length ? <Empty art="noResults" title={`No ${tab === 'all' ? '' : tab.toLowerCase() + ' '}units here`} sub={typeF.length ? `None of type ${typeF.join(' or ')}.` : undefined} /> : <table className="w-full text-sm table-fixed border-separate border-spacing-0">
                  <thead ref={headRef} className="sticky top-0 z-[3]"><tr className="text-left">
                    {leadLabel && <th style={{ width: propW, minWidth: propW, left: 0 }} className="pl-6 sticky z-[1]">{leadLabel === 'Block' || leadLabel === 'Floor' ? head(leadLabel) : leadLabel}</th>}
                    {subCols.map((h, j) => <th key={h} style={{ width: subW[j], minWidth: subW[j], left: subLeft(j) }} className="pr-3 sticky z-[1]">{head(h)}</th>)}
                    <th style={{ left: leadW, width: cbW(leadW), minWidth: cbW(leadW) }} className={cx('sticky z-[1]', leadLabel ? 'pl-3' : 'pl-6')}><Checkbox aria-label="Select all" className="size-4 rounded-[4px] [&_svg]:size-3" checked={tri(flatList.map((u) => u.id))} onCheckedChange={() => toggleIds(flatList.map((u) => u.id))} /></th>
                    {/* Figma D1 4251:17819: Unit, Place, Room type, Rent, Status, Template. */}
                    {/* Fixed column widths (2026-11-26) so spare width goes to Template at the end, not into gaps between columns. */}
                    {['Unit', ...placeCols.filter((h) => !subCols.includes(h)), ...cols].map((h) => <th key={h} style={{ width: colW(h), minWidth: colW(h), ...(h === 'Unit' ? { left: leadW + cbW(leadW) } : {}) }} className={cx('px-3 whitespace-nowrap overflow-hidden text-ellipsis', h === 'Unit' && 'sticky z-[1] pin-edge')}>{head(h)}</th>)}
                    <th className="pr-6" />
                  </tr></thead>
                  <tbody>
                    {/* The level below the one shown is a leading column, as the Activity log's Date (2026-11-26): its name on the
                        first row of each run, blank below; row lines inside a run start after it, a full line closes the run. */}
                    {loading ? <SkeletonRows cols={(leadLabel ? 1 : 0) + 2 + placeCols.length + cols.length} lead={!!leadLabel} /> : <>
                      {vStart > 0 && <tr aria-hidden style={{ height: vStart * ROW_H }} />}
                      {items.slice(vStart, vEnd).map((it) => {
                        if (it.h) return <GroupHeadRow key={`g:${it.key}`} label={it.label} status={gbKey === 'status'} n={it.ids.length} folded={it.folded} span={nCols}
                          checked={tri(it.ids)} onCheck={() => toggleIds(it.ids)} onFold={() => setCollapsed((c) => (c.includes(it.key) ? c.filter((x) => x !== it.key) : [...c, it.key]))} />;
                        const i = it.i, r = rows[i], prev = rows[i - 1];
                        /* Block, Floor and Flat read in the body grey on every row (2026-11-26: repeats are no longer greyed). */
                        const same = !!prev && (!r.lead || prev.lead?.key === r.lead.key);
                        /* Block and Floor in All (2026-11-26) are named once per run, as Property is; pinned labels keep them named while their rows scroll. */
                        const once = (j: number) => subCols.includes(placeCols[j]);
                        const next = rows[i + 1];
                        const place = r.place?.map((c, j) => ({ ...c, once: once(j), w: once(j) ? SUB_W[placeCols[j]] : undefined, end: once(j) && (!next || next.lead?.key !== r.lead?.key || next.place!.slice(0, j + 1).some((x, m) => x.v !== r.place![m].v)), dim: same && (once(j) || !!c.v) && r.place!.slice(0, j + 1).every((x, m) => prev.place?.[m]?.v === x.v) }));
                        return unitRow(r.u, place, r.lead && { ...r.lead, first: i === 0 || prev.lead?.key !== r.lead.key, last: i === rows.length - 1 || rows[i + 1].lead?.key !== r.lead.key });
                      })}
                      {vEnd < items.length && <tr aria-hidden style={{ height: (items.length - vEnd) * ROW_H }} />}
                    </>}
                  </tbody>
                </table>}
              </div>
              {/* Footer (59px, lines up with the sidebar profile): the count, or the bulk action while rows are ticked. */}
              <div className="h-[59px] shrink-0 px-6 flex items-center gap-3 border-t border-[#E5E5E5] text-sm text-[#737373]">
                {checked.length > 0 ? <>
                  <span className="min-w-0 truncate"><span className="text-ink font-medium">{checked.length} selected</span> {scopeText}</span>
                  {hiddenSel.length > 0 && <span className="shrink-0 flex items-center gap-2"><span className="text-[#A3A3A3]">·</span><span className="text-[#B45309]">{hiddenSel.length} hidden by filters</span>
                    <button type="button" onClick={() => setChecked((c) => c.filter((id) => rowIndex.has(id)))} className="text-[#404040] underline underline-offset-2 hover:text-ink">Unselect hidden</button></span>}
                  {/* Why Edit units is off sits with the selection on the left, so the buttons stay together on the right. */}
                  {bsuTypes.length > 1 && <span className="min-w-0 shrink truncate flex items-center gap-2"><span className="text-[#A3A3A3]">·</span><span className="truncate text-[#B45309]">{bsuTypes.map(bsuPlural).join(' and ').replace(/^./, (c) => c.toUpperCase())} can’t be edited together</span></span>}
                  {/* Actions on the right (2026-11-13): Clear in red, then the bulk actions. */}
                  <span className="ml-auto shrink-0 flex items-center gap-2">
                    <Button size="sm" variant="danger-ghost" icon={null} onClick={() => setChecked([])}>Clear</Button>
                    <Menu align="right" width={160} trigger={(o) => <Button size="sm" onClick={o}>Set status</Button>} items={(['Active', 'Inactive', 'Draft'] as UStatus[]).map((s) => ({ label: s, onClick: () => bulkStatus(s) }))} />
                    <Button size="sm" variant="primary" icon={null} disabled={bsuTypes.length > 1} onClick={() => setBulkEdit(true)}>Edit units</Button>
                  </span>
                </> : <span>{(() => { const where = allMode ? '' : ` in ${title}`; return flatList.length === totalHere ? `${totalHere} units${where}` : `Showing ${flatList.length} of ${totalHere} units${where}`; })()}</span>}
              </div>
            </>
          )}
        </section>
      </div>

      <UnitSheet p={p} unit={openUnit} nav={listNav(navList, (x) => x.id === open, (x) => setOpen(x.id))} onClose={() => setOpen(null)}
        path={openAt ? [p.name, sh.house ? '' : p.blocks[openAt.bi ?? 0]?.name ?? '', sh.house ? '' : `Floor ${openAt.floor}`, sh.house ? `House ${openAt.flat}` : sh.flats ? edits[`flat|${p.id}|${openAt.bi ?? 0}|${openAt.floor}|${openAt.flat}`]?.code ?? `Flat ${openAt.floor}.${openAt.flat}` : ''] : [p.name]} />
      {propOpen && <PropertyDetail id={propOpen} onClose={() => setPropOpenRaw(null)} />}
      {level && <LevelSheetFor key={`${level.pid}${level.kind}${level.bi}${level.floor}${level.flat}`} p={(level.pid && props.find((x) => x.id === level.pid)) || p} l={level} onClose={() => setLevelRaw(null)} onArchive={() => setArchiveT(targetOf(level))} />}
      <ArchiveDialog t={archiveT} onClose={() => setArchiveT(null)} onConfirm={doArchive} />
      {bulkEdit && <BulkEditDialog ids={[...checked].sort((a, b) => (rowIndex.get(a) ?? 1e9) - (rowIndex.get(b) ?? 1e9))} props={props} scope={scopeText} onClose={() => setBulkEdit(false)} onDone={() => { setBulkEdit(false); setChecked([]); }} />}
      <RestoreDialog p={p} row={restore} onClose={() => setRestore(null)} />
      <RenameDialog flat={renaming} siblings={flats} onClose={() => setRenaming(null)} />
    </>
  );

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

/* ---------------- Level panel (Block, Floor, Flat): custom field values ---------------- */
type LevelRef = { pid?: string; kind: LevelKind; bi: number; floor: number; flat?: number };
function LevelSheetFor({ p, l, onClose, onArchive }: { p: Property; l: LevelRef; onClose: () => void; onArchive: () => void }) {
  const edits = useInv((s) => s.unitEdits);
  const b = p.blocks[l.bi];
  if (!b) return null;
  if (l.kind === 'Block') {
    return <>
      <LevelSheet p={p} kind="Block" onArchive={onArchive} id={`${p.id}|${l.bi}`} name={b.name} meta={p.name} onClose={onClose}
        facts={[['Floors', String(b.floors)], ['Units', String(b.rooms)], ['Room type', b.roomType]]}
        details={{ rows: [['Name', b.name], ['Room type', b.roomType]], edit: {
          fields: [{ label: 'Name' }, { label: 'Room type', options: [...ROOM_TYPES] }],
          validate: (v) => blockNameErr(p, l.bi, v.Name),
          save: (v) => saveBlock(p, l.bi, v.Name.trim(), v['Room type']) } }} />
    </>;
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
  return <>
    <LevelSheet p={p} kind="Flat" onArchive={onArchive} label={house ? 'House' : undefined} id={f.id} name={house ? `House ${l.flat}` : f.name} meta={house ? p.name : `${p.name} · ${b.name} · Floor ${l.floor}`} onClose={onClose}
      facts={[['Units', n], ['Active', a], ['Room types', String(new Set(f.units.map((u) => u.type)).size)]]}
      details={house ? undefined : { rows: [['Name', f.name], ['Block', b.name], ['Floor', `Floor ${l.floor}`]], edit: {
        fields: [{ label: 'Name' }],
        validate: (v) => flatNameErr(f, fl, v.Name),
        save: (v) => saveFlatName(f, v.Name.trim()) } }} />
  </>;
}

/* Name checks and saves shared by the inline Details card and the edit modals. A block's name is unique in its property;
   a flat's on its floor (stored as edits["flat|<id>"].code). */
export function blockNameErr(p: Property, bi: number, v: string) {
  const n = v.trim();
  return !n ? 'Enter a name.' : p.blocks.some((x, i) => i !== bi && x.name.trim().toLowerCase() === n.toLowerCase()) ? `${p.name} already has ${n}.` : '';
}
/** The room types a block can take (2026-11-27): the ones its property prices, so a change never invents a rent. A
 *  property with no price list yet falls back to the org-wide list. */
export function roomTypesOf(p: Property) { return p.roomTypes.length ? p.roomTypes.map((r) => r.name) : [...ROOM_TYPES]; }
/** What changing a block's room type does to its units (2026-11-27): how many follow it, what they pay now and will pay,
 *  and how many carry their own type, rent or term that the change resets. */
export function roomTypeImpact(p: Property, bi: number, roomType: string) {
  const edits = useInv.getState().unitEdits;
  const units = allUnits(p, edits).filter((u) => u.id.startsWith(`${p.id}:${bi}:`));
  const rt = p.roomTypes.find((r) => r.name === roomType);
  const rents = [...new Set(units.map((u) => u.rent).filter((r): r is number => r != null))].sort((a, b) => a - b);
  const now = !rents.length ? '' : rents.length === 1 ? `${money(rents[0], true)} / wk` : `${money(rents[0], true)}–${money(rents[rents.length - 1], true)} / wk`;
  const own = units.filter((u) => { const e = edits[u.id]; return !!e && (e.type != null || e.rent != null || e.weeks != null || e.template != null); }).length;
  return { units: units.length, now, to: rt ? `${money(rt.rent ?? rentFor(roomType), true)} / wk for ${rt.weeks ?? 39} weeks` : '', own };
}
/* A block's room type is what its units are (2026-11-27): changing it resets any unit's own type, rent, term and
   template, so no unit is left on the new type at the old price or the reverse. Units added by hand hold their values
   in the edits, so they're set to the new type's instead. */
function resetBlockUnits(p: Property, bi: number, roomType: string) {
  const rt = p.roomTypes.find((r) => r.name === roomType);
  const pre = `${p.id}:${bi}:`;
  useInv.getState().set('unitEdits', (m) => {
    const o = { ...m };
    for (const [id, e] of Object.entries(m)) {
      if (!id.startsWith(pre) || !e) continue;
      if (e.added) { const weeks = rt?.weeks ?? 39; o[id] = { ...e, type: roomType, rent: rt?.rent ?? rentFor(roomType), weeks, template: `${roomType} · ${weeks} wk` }; continue; }
      const { type: _t, rent: _r, weeks: _w, template: _tp, ...rest } = e;
      o[id] = rest;
    }
    return o;
  });
}
export function saveBlock(p: Property, bi: number, name: string, roomType: string) {
  const b = p.blocks[bi];
  if (name === b.name && roomType === b.roomType) return;
  if (roomType !== b.roomType) resetBlockUnits(p, bi, roomType);
  useInv.getState().set('properties', (ps) => ps.map((x) => (x.id !== p.id ? x : { ...x, blocks: x.blocks.map((y, i) => (i === bi ? { ...y, name, roomType } : y)) })));
  toast.success(`${name} saved`);
}
/** Several blocks at once (V3 multi-select): the same rules as one, one toast. */
export function saveBlocks(changes: { p: Property; bi: number; name: string; roomType: string }[]) {
  changes.forEach(({ p, bi, roomType }) => { if (roomType !== p.blocks[bi].roomType) resetBlockUnits(p, bi, roomType); });
  useInv.getState().set('properties', (ps) => ps.map((x) => {
    const mine = changes.filter((c) => c.p.id === x.id);
    return mine.length ? { ...x, blocks: x.blocks.map((y, bi) => { const c = mine.find((m) => m.bi === bi); return c ? { ...y, name: c.name, roomType: c.roomType } : y; }) } : x;
  }));
}
export function flatNameErr(flat: Flat, siblings: Flat[], v: string) {
  const n = v.trim();
  return !n ? 'Enter a name.' : siblings.some((f) => f.id !== flat.id && f.name.trim().toLowerCase() === n.toLowerCase()) ? `This floor already has ${n}.` : '';
}
export function saveFlatName(flat: Flat, name: string) {
  if (name === flat.name) return;
  useInv.getState().set('unitEdits', (e) => ({ ...e, [`flat|${flat.id}`]: { code: name } }));
  toast.success(`${flat.name} renamed to ${name}`);
}

/* Edit a block (2026-11-26): its name, the room type new units in it start as, and its custom fields. Field values are
   edited on a copy and kept only on Save. */
function EditBlockDialog({ p, bi, onClose }: { p: Property; bi: number; onClose: () => void }) {
  const b = p.blocks[bi];
  const [name, setName] = useState(b.name);
  const [type, setType] = useState(b.roomType);
  const fv = useDraftValues(`${p.id}|${bi}`);
  const n = name.trim();
  const err = !n ? 'Enter a name.' : p.blocks.some((x, i) => i !== bi && x.name.trim().toLowerCase() === n.toLowerCase()) ? `${p.name} already has ${n}.` : '';
  const save = () => {
    if (err) return;
    const named = n !== b.name || type !== b.roomType;
    if (named) useInv.getState().set('properties', (ps) => ps.map((x) => (x.id !== p.id ? x : { ...x, blocks: x.blocks.map((y, i) => (i === bi ? { ...y, name: n, roomType: type } : y)) })));
    if (named || fv.changed()) { fv.commit(); toast.success(`${n} saved`); }
    onClose();
  };
  return (
    <PanelModal open onClose={onClose} width={560} eyebrow="Edit block" title={b.name} icon={Buildings} meta={p.name}
      right={<><Button onClick={onClose}>Cancel</Button><Button variant="primary" onClick={save}>Save</Button></>}>
      <SheetSection title="Details">
        <div className="space-y-4">
          <Field label="Name"><Input value={name} onChange={(e) => setName(e.target.value)} /><FieldErr>{err}</FieldErr></Field>
          <Field label="Room type"><Dropdown value={type} onChange={setType} options={ROOM_TYPES.map((t) => ({ value: t, label: t }))} /></Field>
        </div>
      </SheetSection>
      <LevelFields p={p} kind="Block" id={fv.draft} />
    </PanelModal>
  );
}

/* Edit a floor (2026-11-26): it has no name of its own, so just its custom fields. */
function EditFloorDialog({ p, bi, floor, onClose }: { p: Property; bi: number; floor: number; onClose: () => void }) {
  const fv = useDraftValues(`${p.id}|${bi}|${floor}`);
  const save = () => { if (fv.changed()) { fv.commit(); toast.success(`Floor ${floor} saved`); } onClose(); };
  return (
    <PanelModal open onClose={onClose} width={560} eyebrow="Edit floor" title={`Floor ${floor}`} icon={Stack} meta={`${p.name} · ${p.blocks[bi]?.name ?? ''}`}
      right={<><Button onClick={onClose}>Cancel</Button><Button variant="primary" onClick={save}>Save</Button></>}>
      <LevelFields p={p} kind="Floor" id={fv.draft} />
    </PanelModal>
  );
}

/* Edit a flat (2026-11-26): its name, unique on its floor (stored as edits["flat|<id>"].code), and its custom fields. */
function EditFlatDialog({ p, flat, siblings, onClose }: { p: Property; flat: Flat; siblings: Flat[]; onClose: () => void }) {
  const [v, setV] = useState(flat.name);
  const fv = useDraftValues(flat.id);
  const name = v.trim();
  const err = !name ? 'Enter a name.' : siblings.some((f) => f.id !== flat.id && f.name.trim().toLowerCase() === name.toLowerCase()) ? `This floor already has ${name}.` : '';
  const save = () => {
    if (err) return;
    const renamed = name !== flat.name;
    if (renamed) useInv.getState().set('unitEdits', (e) => ({ ...e, [`flat|${flat.id}`]: { code: name } }));
    if (renamed || fv.changed()) { fv.commit(); toast.success(renamed ? `${flat.name} renamed to ${name}` : `${name} saved`); }
    onClose();
  };
  return (
    <PanelModal open onClose={onClose} width={560} eyebrow="Edit flat" title={flat.name} icon={Door} meta={p.name}
      right={<><Button onClick={onClose}>Cancel</Button><Button variant="primary" onClick={save}>Save</Button></>}>
      <SheetSection title="Details">
        <Field label="Name"><Input value={v} onChange={(e) => setV(e.target.value)} /><FieldErr>{err}</FieldErr></Field>
      </SheetSection>
      <LevelFields p={p} kind="Flat" id={fv.draft} />
    </PanelModal>
  );
}

/* A level in the unit panel (2026-11-26): its details and the custom fields that have a value, read-only; Edit opens the
   level's modal, where the fields are edited and added. */
function LevelCard({ p, kind, id, title, rows, onEdit }: { p: Property; kind: LevelKind; id: string; title: string; rows: [string, string][]; onEdit: () => void }) {
  const filled = useFilledFields(p, kind, id);
  return <SheetSection title={title} action={<EditLink onClick={onEdit}>Edit</EditLink>} rows={[...rows, ...filled]} />;
}

/* A group's header row when grouped by a field (2026-11-26): 48px on #FAFAFA, a caret that folds the group, a box that
   ticks all of it, the value (a status as its pill) and its count. The label stays put when the table scrolls sideways. */
function GroupHeadRow({ label, status, n, folded, span, checked, onCheck, onFold }: { label: string; status: boolean; n: number; folded: boolean; span: number; checked: boolean | 'indeterminate'; onCheck: () => void; onFold: () => void }) {
  return (
    <tr className="[&>td]:border-b [&>td]:border-[#E5E5E5] [&>td]:bg-[#FAFAFA]">
      <td colSpan={span} className="h-12 p-0">
        <div className="sticky left-0 w-max h-12 pl-6 pr-4 flex items-center gap-2">
          {/* The box lines up with the rows' boxes below it. */}
          <Checkbox aria-label={`Select ${label}`} className="size-4 rounded-[4px] [&_svg]:size-3" checked={checked} onCheckedChange={onCheck} />
          <button type="button" aria-label={folded ? `Show ${label}` : `Hide ${label}`} aria-expanded={!folded} onClick={onFold}
            className="ml-3 size-6 rounded-md flex items-center justify-center text-[#737373] hover:bg-[#EBEBEB] hover:text-ink">
            <CaretDown size={14} className={cx('transition-transform duration-150', folded && '-rotate-90')} />
          </button>
          <span className="text-sm font-medium text-ink">{status ? <PropStatus s={label as UStatus} /> : label}</span>
          <span className="font-mono text-xs text-[#737373] tabular-nums">{n}</span>
        </div>
      </td>
    </tr>
  );
}

/* While the table's rows are on their way: 12 grey bars per column with a shine sweeping across them, lines as the real rows draw them. */
function SkeletonRows({ cols, lead }: { cols: number; lead: boolean }) {
  const W = ['w-16', 'w-20', 'w-14', 'w-24', 'w-12', 'w-16', 'w-20', 'w-14', 'w-24'];
  return <>{Array.from({ length: 12 }, (_, r) => (
    <tr key={r} aria-hidden className="border-b border-[#F0F0F0]">
      {Array.from({ length: cols }, (_, c) => (
        <td key={c} className={cx('h-12', c === 0 ? 'pl-6 pr-3' : 'px-3')}>
          {lead && c === 0 && r > 0 ? null : <span className={cx('skel block h-3 max-w-full rounded', (lead ? c === 1 : c === 0) ? 'w-5 h-5 rounded-[5px]' : W[(c + r) % W.length])} style={{ animationDelay: `${c * 70 + r * 25}ms` }} />}
        </td>
      ))}
    </tr>
  ))}</>;
}

/* Unit row (Figma D1 4251:17819): 48px; ticked rows take a light blue; Block, Floor and Flat columns say where the unit is. */
/** A row's leading group cell: the name shows on a run's first row and opens that level's panel. `n` is its count. */
type Lead = { key: string; name: string; g?: string; /** A property's cover photo (2026-11-26). */ photo?: string; /** A Block, Floor or Flat opens its panel; a property's name is plain text (2026-11-26). */ onOpen?: () => void; first: boolean; last: boolean; n?: string };
/** How much of a group (property, block, floor) is ticked. */
type GState = 'none' | 'some' | 'all';
/** A place cell: the level's name, its panel when it has one, its group's size, and whether it repeats the row above. */
type Place = { v: string; g?: string; open?: () => void; n?: number; dim?: boolean;
  /** Named once per run, like the Property column: the first row shows the name and its count, the rest stay blank. */ once?: boolean;
  /** The run's last row, where the pinned cell draws its bottom line. */ end?: boolean;
  /** A pinned level cell's width. */ w?: number };
/** The row checkbox column (2026-11-26): 16px boxes, 8px before Unit's padding; 24px in from the edge without a lead column. */
const cbW = (leadW: number) => (leadW ? 36 : 48);
/** The pinned Block and Floor columns beside Property in All units, and their widths. */
/* Tailwind needs the selectors written out: the open row's blue bar and the hover fill start at the checkbox cell. */
const BAR: Record<number, string> = { 1: '[&>td:nth-child(1)]:shadow-[inset_2px_0_0_#2563EB]', 2: '[&>td:nth-child(2)]:shadow-[inset_2px_0_0_#2563EB]', 3: '[&>td:nth-child(3)]:shadow-[inset_2px_0_0_#2563EB]', 4: '[&>td:nth-child(4)]:shadow-[inset_2px_0_0_#2563EB]', 5: '[&>td:nth-child(5)]:shadow-[inset_2px_0_0_#2563EB]' };
const HOVER: Record<number, string> = { 1: '[&:hover>td]:bg-[#F5F5F5] [&:hover_.peek]:visible', 2: '[&:has(>td:nth-child(n+2):hover)>td]:bg-[#F5F5F5] [&:has(>td:nth-child(n+2):hover)_.peek]:visible', 3: '[&:has(>td:nth-child(n+3):hover)>td]:bg-[#F5F5F5] [&:has(>td:nth-child(n+3):hover)_.peek]:visible', 4: '[&:has(>td:nth-child(n+4):hover)>td]:bg-[#F5F5F5] [&:has(>td:nth-child(n+4):hover)_.peek]:visible', 5: '[&:has(>td:nth-child(n+5):hover)>td]:bg-[#F5F5F5] [&:has(>td:nth-child(n+5):hover)_.peek]:visible' };
const SUB_W: Record<string, number> = { Block: 104, Floor: 88, Flat: 88 };
/** The lead cell's content: name (opens its panel) over its count (no checkbox, 2026-11-26).
 *  Only a run's first row shows it; the label pins to the top while its rows scroll. A hovered row shows its own
 *  property, block, floor and flat in grey (2026-11-26), so a row deep in a run still says where it is. */
function LeadLabel({ lead, s }: { lead: Lead; s: GState }) {
  if (!lead.first) return <Peek v={lead.name} />;
  /* A property with a cover photo shows it before the name (2026-11-26), as the V2 tree does. */
  if (lead.photo) return (
    <div className="min-w-0 flex items-center gap-3">
      <img src={lead.photo} alt="" loading="lazy" className="size-9 shrink-0 rounded-lg object-cover bg-[#F5F5F5]" />
      <div className="min-w-0">
        <div title={lead.name} className="truncate text-sm leading-5 text-[#0A0A0A]">{lead.name}</div>
        {lead.n && <GroupCount n={lead.n} on={s !== 'none'} />}
      </div>
    </div>
  );
  return (
    <div className={cx('min-w-0', !lead.first && 'invisible')}>
      {lead.onOpen
        ? <button type="button" onClick={lead.onOpen} tabIndex={lead.first ? 0 : -1} title={lead.name}
          className="block max-w-full truncate text-sm leading-5 text-[#0A0A0A] hover:underline underline-offset-2">{lead.name}</button>
        : <div title={lead.name} className="truncate text-sm leading-5 text-[#0A0A0A]">{lead.name}</div>}
      {lead.n && <GroupCount n={lead.n} on={s !== 'none'} />}
    </div>
  );
}
/** A group's size under its name (2026-11-26): "395 units", or "32 of 395 selected" in blue once some are ticked. */
/* A level's name on a hovered row below its run's first: hidden until the row is hovered. */
function Peek({ v }: { v: string }) {
  return <div className="peek invisible truncate text-sm leading-5 text-[#737373]">{v}</div>;
}

/* A Block or Floor name in its pinned column: opens that level's panel. */
function SubName({ c }: { c: Place }) {
  return c.open
    ? <button type="button" onClick={(e) => { e.stopPropagation(); c.open!(); }} title={c.v} className="block max-w-full truncate text-left text-sm leading-5 text-[#0A0A0A] hover:underline underline-offset-2">{c.v}</button>
    : <div className="truncate leading-5 text-[#0A0A0A]">{c.v}</div>;
}

function GroupCount({ n, on }: { n: string | number; on?: boolean }) {
  const [a, b] = String(n).split('/');
  return <div className={cx('x-keep text-xs leading-4 tabular-nums truncate', on && b ? 'text-[#2563EB]' : 'text-[#737373]')}>{b ? `${a} of ${b} selected` : `${Number(a).toLocaleString('en-GB')} ${a === '1' ? 'unit' : 'units'}`}</div>;
}
const UnitRow = memo(UnitRowView, (a, b) => a.u === b.u && a.gs === b.gs && a.cols === b.cols && a.fv === b.fv && a.leadW === b.leadW && a.cursor === b.cursor && a.open === b.open && a.checked === b.checked
  && (a.place ?? []).map((c) => `${c.v}${c.dim ? 1 : 0}${c.once ? 1 : 0}${c.end ? 1 : 0}${c.n}`).join('|') === (b.place ?? []).map((c) => `${c.v}${c.dim ? 1 : 0}${c.once ? 1 : 0}${c.end ? 1 : 0}${c.n}`).join('|')
  && a.lead?.key === b.lead?.key && a.lead?.name === b.lead?.name && a.lead?.first === b.lead?.first && a.lead?.last === b.lead?.last && a.lead?.n === b.lead?.n);
function UnitRowView({ u, place, lead, gs, cols, fv, leadW, cursor, open, checked, onCheck, onOpen }: {
  u: Unit; place?: Place[]; lead?: Lead; gs: string; cols: string; fv?: Record<string, string>; leadW: number; cursor?: boolean; open: boolean; checked: boolean;
  onCheck: (id: string, shift?: boolean) => void; onOpen: (id: string) => void;
}) {
  const st = gs.split(',') as GState[];
  const subs = (place ?? []).filter((c) => c.once);
  const rest = subs.length ? place!.slice(subs.length) : place;
  const propW = leadW - subs.reduce((a, c) => a + (c.w ?? 0), 0);
  /* Which cell the checkbox is (1-based): after the lead and the pinned levels. */
  const cbAt = (lead ? 1 : 0) + subs.length + 1;
  const fields = useInv((s) => s.fields);
  const dash = <span className="text-[#A3A3A3]">—</span>;
  const cell = (h: string) => {
    if (h === 'Room type') return u.type;
    if (h === 'Rent') return u.rent != null ? money(u.rent) : dash;
    if (h === 'Status') return <PropStatus s={u.status} />;
    if (h === 'Template') return u.template && u.weeks ? `${u.template.split(' ')[0]} · ${u.weeks} wk` : dash;
    const id = h.slice(3);
    return fieldShown(fields.find((f) => f.id === id), fv?.[id]) || dash;
  };
  /* Cells carry the row's colour themselves, so the pinned ones cover what scrolls under them.
     With a lead column the lines are per cell: light inside a run, full #E5E5E5 where the run ends.
     Hover, ticks and the open row (2026-11-26) fill from the checkbox on; the lead cell stays white and pointing at it lights nothing, and the open row's blue bar sits on the checkbox cell. */
  return (
    <tr onClick={() => onOpen(u.id)} aria-selected={open} className={cx('group/row cursor-pointer [&>td]:border-b', !lead && '[&>td]:border-[#E5E5E5]', lead && (lead.last ? '[&>td:not(:first-child)]:border-[#E5E5E5]' : '[&>td:not(:first-child)]:border-[#F0F0F0]'),
      open ? cx('[&>td]:bg-[#F5F9FF]', BAR[cbAt])
        : checked ? '[&>td]:bg-[#F5F9FF]' : cursor ? '[&>td]:bg-[#F5F5F5]'
        : cx('[&>td]:bg-white', HOVER[cbAt]))}>
      {lead && (
        <td style={{ left: 0 }} className={cx('sticky z-[1] pl-6 pr-4 !bg-white cursor-default', lead.last ? 'border-[#E5E5E5]' : 'border-transparent')} onClick={(e) => e.stopPropagation()}>
          <LeadLabel lead={lead} s={st[0]} />
        </td>
      )}
      {/* Block and Floor beside Property (2026-11-26): pinned, named on a run's first row with its count, blank below;
          a bottom line only where the run ends. */}
      {subs.map((c, j) => (
        <td key={j} style={{ left: propW + subs.slice(0, j).reduce((a, x) => a + (x.w ?? 0), 0) }} className={cx('sticky z-[1] !pl-0 pr-3 !bg-white cursor-default text-sm whitespace-nowrap overflow-hidden text-ellipsis', c.end ? '!border-[#E5E5E5]' : '!border-transparent')} onClick={(e) => e.stopPropagation()}>
          {c.dim ? (c.v ? <Peek v={c.v} /> : null) : c.v ? <div className="min-w-0"><SubName c={c} />{c.n != null && <GroupCount n={c.n} />}</div> : dash}
        </td>
      ))}

      <td style={{ left: leadW }} className={cx('sticky z-[1] h-12', lead ? 'pl-3' : 'pl-6')} onClick={(e) => e.stopPropagation()} onMouseDown={(e) => e.shiftKey && e.preventDefault()}>
        <Checkbox aria-label={`Select ${u.code}`} className="size-4 rounded-[4px] [&_svg]:size-3" checked={checked} onClick={(e) => { e.preventDefault(); onCheck(u.id, e.shiftKey); }} />
      </td>
      <td style={{ left: leadW + cbW(leadW) }} className="sticky z-[1] pin-edge px-3 text-sm font-medium text-[#0A0A0A] whitespace-nowrap">{u.code}</td>
      {rest?.map((c, i) => (
        <td key={i} className="px-3 text-sm whitespace-nowrap overflow-hidden text-ellipsis text-[#404040]">
          {!c.v ? dash : c.open ? <button type="button" onClick={(e) => { e.stopPropagation(); c.open!(); }} className="hover:text-[#0A0A0A] hover:underline underline-offset-2">{c.v}</button> : c.v}
        </td>
      ))}
      {cols.split('|').filter(Boolean).map((h) => <td key={h} className={cx('px-3 text-sm text-[#404040] whitespace-nowrap overflow-hidden text-ellipsis', h === 'Rent' && 'tabular-nums')}>{cell(h)}</td>)}
      <td className="pr-6" />
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
export function UnitSheet({ p, unit, onClose, path, nav }: { nav?: SheetNav; p: Property; unit: (Unit & { block?: string }) | null; onClose: () => void; path: string[] }) {
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
  const [lvEdit, setLvEdit] = useState<'block' | 'floor' | 'flat' | null>(null);
  if (!unit) return null;
  const uat = parseUnit(unit.id);
  const ubi = uat?.bi ?? 0, ufl = uat?.floor ?? 1;
  const floorFlats = flatsOf(p, ubi, ufl, unitEdits);
  const uFlat = floorFlats.find((f) => +f.id.split('|')[3] === uat?.flat) ?? null;
  const ush = shapeOf(p, useInv.getState().structures);
  const ub = p.blocks[ubi];
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
        <SheetSection title="Room" action={<EditLink onClick={startEdit}>Edit</EditLink>} rows={[['Unit name', unit.code], ['Room type', unit.type], ['Size', `${unit.size} m²`], ['Amenities', amenitiesOf(unit).join(', ')], ['Status', <PropStatus s={unit.status} />]]} />
        {/* Where the unit sits, its own card (2026-11-26) so it can be moved: one row per level the layout has. */}
        {lvEdit === 'block' && <EditBlockDialog p={p} bi={ubi} onClose={() => setLvEdit(null)} />}
        {lvEdit === 'floor' && <EditFloorDialog p={p} bi={ubi} floor={ufl} onClose={() => setLvEdit(null)} />}
        {lvEdit === 'flat' && uFlat && <EditFlatDialog p={p} flat={uFlat} siblings={floorFlats} onClose={() => setLvEdit(null)} />}
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
        <LevelFields p={p} kind="Room" id={unit.id} view name={unit.code} meta={p.name} />
        {/* The levels the unit sits in, each its own card (2026-11-26): details with Edit, then that level's custom fields,
            the same as its own panel. Nearest first. */}
        {uFlat && (ush.house || ush.flats) && <LevelCard p={p} kind="Flat" id={uFlat.id} onEdit={() => setLvEdit('flat')}
          title={ush.house ? 'House' : 'Flat'} rows={[['Name', ush.house ? `House ${uat?.flat}` : uFlat.name], ['Units', String(uFlat.units.length)]]} />}
        {!ush.house && ub && <LevelCard p={p} kind="Floor" id={`${p.id}|${ubi}|${ufl}`} title="Floor" onEdit={() => setLvEdit('floor')}
          rows={[['Name', `Floor ${ufl}`], ...(ush.flats ? [['Flats', String(floorFlats.length)] as [string, string]] : []), ['Units', String(floorFlats.reduce((n, f) => n + f.units.length, 0))]]} />}
        {!ush.house && ub && <LevelCard p={p} kind="Block" id={`${p.id}|${ubi}`} title="Block" onEdit={() => setLvEdit('block')}
          rows={[['Name', ub.name], ['Room type', ub.roomType], ['Floors', String(ub.floors)], ['Units', String(ub.rooms)]]} />}
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
          <SheetRow title="2027/28" sub={`Not occupied yet${unit.rent != null ? ` · ${money(unit.rent + 8)} / ${per(p)}` : ''}`} end={<EditLink onClick={() => toast('Offers live in Allocations › Offers')}>Offer</EditLink>} />
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
    <Modal open onClose={onClose} icon={Archive} tone="red" title={`Archive ${t.name}?`} sub={`${t.name} and its ${units.length} units leave every list and can’t be occupied. You can restore them from Archived.`} width={500}
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
/** Not opened from Units any more (Add unit removed 2026-11-26); kept for when adding units comes back. */
export function AddUnitsDialog({ props, start, onClose, onAdded }: { props: Property[]; start: Sel; onClose: () => void; onAdded: (s: Sel) => void }) {
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


/* A diff's old and new values: red and struck through, green; soft 10% grounds, no border. */

/* ---------------- Bulk edit (2026-11-26): pick fields and values, review, change; Undo puts every unit back ---------------- */
type AmState = Record<string, boolean | 'mixed'>;
/* A change row. Amenities (2026-11-26) are one field: `am` holds each amenity ticked (all units get it), unticked (none
   keep it) or mixed (left as each unit has it), starting from what the units have now. */
type BulkChange = { f: string; v: string; am?: AmState };
export function BulkEditDialog({ ids, props, scope, onClose, onDone }: { ids: string[]; props: Property[]; scope: string; onClose: () => void; onDone: () => void }) {
  const edits = useInv((s) => s.unitEdits);
  const fields = useInv((s) => s.fields);
  const templates = useInv((s) => s.templates);
  const structures = useInv((s) => s.structures);
  const values = useInv((s) => s.fieldValues);
  const [step, setStep] = useState<'edit' | 'review'>('edit');
  const busy = useRef(false);
  /* The ticked units with their property, read once. */
  const [units] = useState(() => {
    const byP = new Map<string, Map<string, Unit>>();
    return ids.flatMap((id) => {
      const pp = props.find((x) => x.id === parseUnit(id)?.pid); if (!pp) return [];
      if (!byP.has(pp.id)) byP.set(pp.id, new Map(allUnits(pp, edits).map((u) => [u.id, u])));
      const u = byP.get(pp.id)!.get(id); return u ? [{ u, pp }] : [];
    });
  });
  /* Scope (2026-11-26): one bookable type (BSU) at a time, so every ticked unit is the same kind of thing. Prices,
     amenities and anything at the BSU's own level can change; fields on a flat, floor or block are edited there.
     Fields follow what the ticked units share (2026-11-26). Status is not here: the footer's Set status does it.
     Room type is org-wide. Rent needs one letting basis. A template belongs to one property, so it needs units from one.
     A custom field shows how many units have it when not all do; the rest are skipped at review. */
  const has = (f: CustomField, pp: Property) => unitFieldKeys(pp, structures).some((k) => f.attached.includes(k));
  const cfs = fields.filter((f) => units.some(({ pp }) => has(f, pp)));
  const pids = [...new Set(units.map(({ pp }) => pp.id))];
  const bsu = units[0] ? bsuOf(units[0].pp, structures) : 'Unit';
  const lettings = [...new Set(units.map(({ pp }) => pp.letting))];
  const onePid = pids.length === 1 ? pids[0] : null;
  /* A template reads as units do, name and length ("Standard single · 44 wk"), in the list, the review and on the unit. */
  const tplOf = (t: { name: string; weeks: number }) => `${t.name} · ${t.weeks} wk`;
  const tplNames = onePid ? [...new Set(templates.filter((t) => t.propertyId === onePid).map(tplOf))] : [];
  const label = (f: string) => ({ type: 'Room type', rent: 'Rent', template: 'Template', am: 'Amenities', 'am+': 'Add amenity', 'am-': 'Remove amenity' } as Record<string, string>)[f] ?? fields.find((x) => `cf:${x.id}` === f)?.name ?? f;
  const optRow = (name: string, note?: string) => <span className="flex items-center gap-3"><span className="truncate">{name}</span>{note && <span className="ml-auto shrink-0 text-xs text-[#737373]">{note}</span>}</span>;
  const opts: { value: string; label: ReactNode; disabled?: boolean }[] = [
    { value: 'type', label: 'Room type' },
    lettings.length > 1 ? { value: 'rent', label: optRow('Rent', 'Weekly and monthly mixed'), disabled: true } : { value: 'rent', label: 'Rent' },
    !onePid ? { value: 'template', label: optRow('Template', 'Pick units in one property'), disabled: true }
      : !tplNames.length ? { value: 'template', label: optRow('Template', 'No templates here'), disabled: true } : { value: 'template', label: 'Template' },
    { value: 'am', label: 'Amenities' },
    ...cfs.map((f) => { const k = units.filter(({ pp }) => has(f, pp)).length; return { value: `cf:${f.id}`, label: k < units.length ? optRow(f.name, `${k.toLocaleString('en-GB')} of ${units.length.toLocaleString('en-GB')} units`) : f.name }; }),
  ];
  const cfOf = (f: string) => fields.find((x) => `cf:${x.id}` === f);
  const choices = (f: string): string[] | null => {
    /* Only types every ticked unit's property prices (2026-11-27), so a type change always has a rent to bring. */
    if (f === 'type') { const sets = [...new Set(units.map(({ pp }) => pp))].map(roomTypesOf); const both = sets.length ? sets.reduce((a, b) => a.filter((t) => b.includes(t))) : [...ROOM_TYPES]; return both.length ? both : [...ROOM_TYPES]; }
    if (f === 'template') return tplNames;
    if (f === 'am+' || f === 'am-') return UNIT_AMENITIES;
    const c = cfOf(f); if (!c) return null;
    return c.type === 'Yes / no' ? ['Yes', 'No'] : c.choices ?? null;
  };
  const isNum = (f: string) => f === 'rent' || cfOf(f)?.type === 'Number';
  /* Each amenity as the ticked units have it now: all, none or some. */
  const [amNow] = useState<AmState>(() => Object.fromEntries(UNIT_AMENITIES.map((a) => {
    const k = units.filter(({ u }) => amenitiesOf(u).includes(a)).length;
    return [a, k === units.length && k > 0 ? true : k === 0 ? false : 'mixed'];
  })));
  const amDiff = (c: BulkChange) => {
    const st = c.am ?? amNow;
    return { add: UNIT_AMENITIES.filter((a) => st[a] === true && amNow[a] !== true), drop: UNIT_AMENITIES.filter((a) => st[a] === false && amNow[a] !== false) };
  };
  const errOf = (c: BulkChange) => (c.f === 'am' ? (() => { const d = amDiff(c); return d.add.length || d.drop.length ? '' : 'Tick or untick an amenity.'; })() : !c.f ? 'Pick a field.' : !c.v.trim() ? 'Enter a value.' : isNum(c.f) && !(Number(c.v) >= 0) ? 'Enter a number.' : c.f === 'rent' && !(Number(c.v) > 0) ? 'Rent must be above £0.' : '');
  const [tried, setTried] = useState(false);
  const usable = opts.filter((o) => !o.disabled).length;
  /* Picking a field fills its value with what the units hold now (2026-11-26), ready to change; mixed values, amenities
     and empty ones start blank, with the mix shown under the row. */
  const prefill = (f: string) => {
    if (f === 'am' || f === 'am+' || f === 'am-') return '';
    if (f === 'rent') { const rs = [...new Set(units.map(({ u }) => u.rent))]; return rs.length === 1 && rs[0] != null ? String(rs[0]) : ''; }
    const n = nowOf(f); if (n.mixed || n.text === '—') return '';
    const ch = choices(f); return !ch || ch.includes(n.text) ? n.text : '';
  };
  const set = (i: number, c: Partial<BulkChange>) => setChanges((l) => l.map((x, j) => (j === i ? { ...x, ...c, ...(c.f != null ? { v: prefill(c.f), am: c.f === 'am' ? { ...amNow } : undefined } : {}) } : x)));
  /* What the ticked units hold now (2026-11-27): a breakdown of each value with how many units hold it, most common first,
     as Jira's bulk change and Salesforce's mass update show it. `text` stays for the review and the box's placeholder. */
  type Now = { text: string; all?: string[]; mixed: boolean; dist: [string, number][] };
  const nowOf = (f: string): Now => {
    const vs = units.map(({ u }) => {
      if (f === 'type') return u.type; if (f === 'rent') return u.rent != null ? money(u.rent) : '—';
      if (f === 'template') return u.template ?? '—';
      if (f === 'am' || f === 'am+' || f === 'am-') return amenitiesOf(u).join(', ') || '—';
      const cf = cfOf(f); return cf ? fieldShown(cf, values[u.id]?.[cf.id]) || '—' : '—';
    });
    if (f === 'am' || f === 'am+' || f === 'am-') {
      /* Amenities: each one any ticked unit has, with how many have it. */
      const dist = UNIT_AMENITIES.map((a): [string, number] => [a, units.filter(({ u }) => amenitiesOf(u).includes(a)).length]).filter(([, n]) => n > 0).sort((a, b) => b[1] - a[1]);
      const all = UNIT_AMENITIES.filter((a) => amNow[a] === true), some = UNIT_AMENITIES.filter((a) => amNow[a] === 'mixed');
      const text = [all.length ? all.join(', ') : '', some.length ? `some have ${some.join(', ')}` : ''].filter(Boolean).join(' · ');
      return { text: text || 'None', mixed: some.length > 0, dist };
    }
    const count = new Map<string, number>(); vs.forEach((x) => count.set(x, (count.get(x) ?? 0) + 1));
    const dist = [...count].sort((a, b) => b[1] - a[1]);
    const d = dist.map(([x]) => x);
    if (f === 'rent') {
      /* Rent mixed: the range. */
      const ns = units.map(({ u }) => u.rent).filter((r): r is number => r != null);
      const lo = Math.min(...ns), hi = Math.max(...ns);
      if (ns.length && lo !== hi) return { text: `${money(lo)} – ${money(hi)}`, mixed: true, all: d, dist };
    }
    return d.length === 1 ? { text: d[0], mixed: false, dist } : { text: `${d[0]} +${d.length - 1} more`, all: d, mixed: true, dist };
  };
  /* One empty row to start (2026-11-27: showing every field with a value up front was tried and dropped); Add field brings more. */
  const [changes, setChanges] = useState<BulkChange[]>([{ f: '', v: '' }]);
  const ready = changes.every((c) => !errOf(c));
  /* What each change does to each unit, and why a unit is left out. */
  const stored = (c: BulkChange) => (cfOf(c.f)?.type === 'Yes / no' ? (c.v === 'Yes' ? 'yes' : 'no') : c.v.trim());
  const skipWhy = (c: BulkChange, _u: Unit, pp: Property) => {
    const cf = cfOf(c.f); if (cf && !unitFieldKeys(pp, structures).some((k) => cf.attached.includes(k))) return `not on ${layoutOf(pp)}`;
    return '';
  };
  const before = (c: BulkChange, u: Unit) => {
    if (c.f === 'type') return u.type; if (c.f === 'rent') return u.rent != null ? money(u.rent) : '—';
    if (c.f === 'template') return u.template ?? '—';
    if (c.f === 'am+' || c.f === 'am-') return amenitiesOf(u).includes(c.v) ? c.v : 'Not listed';
    const cf = cfOf(c.f)!; return fieldShown(cf, values[u.id]?.[cf.id]) || '—';
  };
  const after = (c: BulkChange) => (c.f === 'rent' ? money(Number(c.v)) : c.f === 'am-' ? 'Not listed' : c.v);
  /* Only filled rows count; an empty one waiting for a field changes nothing. */
  const valid = changes.flatMap((c): BulkChange[] => c.f === 'am'
    ? (() => { const d = amDiff(c); return [...d.add.map((v) => ({ f: 'am+', v })), ...d.drop.map((v) => ({ f: 'am-', v }))]; })()
    : c.f && c.v.trim() && !errOf(c) ? [c] : []);
  const plan = valid.map((c) => {
    const skipped = new Map<string, number>(); let n = 0;
    units.forEach(({ u, pp }) => { const w = skipWhy(c, u, pp); if (w) skipped.set(w, (skipped.get(w) ?? 0) + 1); else if (before(c, u) !== after(c)) n++; });
    return { c, n, skipped: [...skipped] };
  });
  const isAm = (c: BulkChange) => c.f === 'am+' || c.f === 'am-';
  const amPlan = plan.filter((x) => isAm(x.c) && x.n > 0);
  const amUnits = units.filter(({ u, pp }) => valid.some((c) => isAm(c) && !skipWhy(c, u, pp) && before(c, u) !== after(c))).length;
  const touched = units.filter(({ u, pp }) => valid.some((c) => !skipWhy(c, u, pp) && before(c, u) !== after(c)));
  const apply = () => {
    if (busy.current) return; busy.current = true;
    const st = useInv.getState();
    const prevE = Object.fromEntries(touched.map(({ u }) => [u.id, st.unitEdits[u.id]]));
    const prevV = Object.fromEntries(touched.map(({ u }) => [u.id, st.fieldValues[u.id]]));
    touched.forEach(({ u, pp }) => valid.forEach((c) => {
      if (skipWhy(c, u, pp) || before(c, u) === after(c)) return;
      /* A new room type brings its price and term from the property's list (2026-11-27), so a unit is never left on the
         new type at the old rent; a Rent change in the same edit still wins. */
      if (c.f === 'type') { const rt = pp.roomTypes.find((r) => r.name === c.v); const ownRent = valid.some((x) => x.f === 'rent');
        st.editUnit(u.id, rt ? { type: c.v, ...(ownRent ? {} : { rent: rt.rent }), weeks: rt.weeks ?? 39, template: `${c.v} · ${rt.weeks ?? 39} wk` } : { type: c.v }); }
      else if (c.f === 'rent') st.editUnit(u.id, { rent: Number(c.v) });
      else if (c.f === 'am+') st.editUnit(u.id, { amenities: [...amenitiesOf(u), c.v] });
      else if (c.f === 'am-') st.editUnit(u.id, { amenities: amenitiesOf(u).filter((x) => x !== c.v) });
      else if (c.f === 'template') st.editUnit(u.id, { template: c.v, weeks: templates.find((t) => t.propertyId === pp.id && tplOf(t) === c.v)?.weeks ?? u.weeks });
      else { const fid = c.f.slice(3); st.set('fieldValues', (m) => ({ ...m, [u.id]: { ...m[u.id], [fid]: stored(c) } })); }
    }));
    const undo = () => {
      const s2 = useInv.getState();
      s2.set('unitEdits', (m) => { const o = { ...m }; for (const [id, v] of Object.entries(prevE)) { if (v) o[id] = v; else delete o[id]; } return o; });
      s2.set('fieldValues', (m) => { const o = { ...m }; for (const [id, v] of Object.entries(prevV)) { if (v) o[id] = v; else delete o[id]; } return o; });
      toast.success(`${touched.length} units put back`);
    };
    const skippedN = units.length - touched.length;
    toast.success(`Changed ${touched.length} units${skippedN ? ` · ${skippedN} unchanged` : ''}`, { action: { label: 'Undo', onClick: undo } });
    onDone();
  };
  const shown = touched.slice(0, 6);
  return (
    <PanelModal open onClose={onClose} width={680} eyebrow="Edit units" pos={step === 'review' ? 'Review' : undefined} title={`${ids.length.toLocaleString('en-GB')} ${ids.length === 1 ? bsu.toLowerCase() : bsuPlural(bsu)}`} icon={PencilSimple} meta={scope ? scope[0].toUpperCase() + scope.slice(1) : undefined}
      left={step === 'review' ? <Button variant="ghost" icon={null} onClick={() => setStep('edit')}>Back</Button> : undefined}
      right={step === 'edit'
        ? <><Button onClick={onClose}>Cancel</Button><Button variant="primary" onClick={() => { setTried(true); if (ready) setStep('review'); }}>Review</Button></>
        : <><Button onClick={onClose}>Cancel</Button><Button variant="primary" disabled={!touched.length} onClick={apply}>{touched.length ? `Change ${touched.length.toLocaleString('en-GB')} ${touched.length === 1 ? 'unit' : 'units'}` : 'Nothing to change'}</Button></>}>
      {step === 'edit' ? (
        <SheetSection title="Changes" action={changes.length < usable ? <Button type="button" size="sm" variant="ghost" icon={Plus} className="-mr-2" onClick={() => setChanges((l) => [...l, { f: '', v: '' }])}>Add field</Button> : undefined}>
          {/* One row per field (2026-11-27), as multi-record inspectors lay it out: the field picker, the new value, and under it what the units hold now as value chips with counts, on one line (the top two, the rest behind +N more). */}
          <div className="divide-y divide-[#F0F0F0] -my-1">
            {changes.map((c, i) => {
              const ch = c.f ? choices(c.f) : null;
              const now = c.f ? nowOf(c.f) : null;
              const shownN = 2, extra = now ? now.dist.slice(shownN) : [];
              return (
                <div key={i} className="py-3 first:pt-1 last:pb-1 grid grid-cols-[160px_minmax(0,1fr)_36px] gap-x-3 items-start">
                  <Dropdown ariaLabel="Field" placeholder="Field" value={c.f} onChange={(f) => set(i, { f })} options={opts.filter((o) => o.value === c.f || !changes.some((x) => x.f === o.value))} />
                  <div className="min-w-0">
                    {!c.f ? <Input disabled readOnly value="" placeholder="Value" /> : c.f === 'am'
                      ? <AmenityPicker now={amNow} value={c.am ?? amNow} onChange={(am) => setChanges((l) => l.map((x, j) => (j === i ? { ...x, am } : x)))} />
                      : ch
                      ? <Dropdown ariaLabel={label(c.f)} placeholder={`Pick ${label(c.f).toLowerCase()}`} value={c.v} onChange={(v) => set(i, { v })} options={ch.map((x) => ({ value: x, label: x }))} />
                      : <Input aria-label={label(c.f)} inputMode={isNum(c.f) ? 'decimal' : undefined} placeholder={c.f === 'rent' ? `£ per ${lettings[0] === 'Monthly' ? 'month' : 'week'}` : label(c.f)} value={c.v} onChange={(e) => set(i, { v: e.target.value })} />}
                    {tried && errOf(c) && <FieldErr>{errOf(c)}</FieldErr>}
                    {now && now.dist.length > 0 && !(now.dist.length === 1 && now.dist[0][0] === '—') && (
                      <div className="mt-2 flex flex-nowrap items-center gap-1.5 min-w-0 overflow-hidden">
                        <span className="shrink-0 font-mono text-[11px] uppercase tracking-wide text-[#A3A3A3] mr-0.5">Current</span>
                        {c.f === 'rent' && now.mixed && <span className="shrink-0 h-6 px-2 rounded-md bg-[#F5F5F5] text-xs text-ink inline-flex items-center tabular-nums whitespace-nowrap">{now.text}</span>}
                        {(c.f === 'rent' && now.mixed ? [] : now.dist.slice(0, shownN)).map(([v, n]) => (
                          <span key={v} title={`${v} · ${n.toLocaleString('en-GB')} units`} className="min-w-0 shrink h-6 px-1.5 rounded-md bg-[#F5F5F5] text-xs text-ink inline-flex items-center gap-1.5">
                            <span className="truncate">{v}</span>
                            <span className="shrink-0 font-mono text-[11px] text-[#737373] tabular-nums">{n === units.length ? 'all' : n.toLocaleString('en-GB')}</span>
                          </span>
                        ))}
                        {(c.f === 'rent' && now.mixed ? now.dist.length > 0 : extra.length > 0) && (
                          <span className="shrink-0 h-6 px-1 rounded-md text-xs text-[#737373] inline-flex items-center whitespace-nowrap" title={(c.f === 'rent' && now.mixed ? now.dist : extra).slice(0, 12).map(([v, n]) => `${v} · ${n}`).join('\n')}>
                            {c.f === 'rent' && now.mixed ? `${now.dist.length} prices` : `+${extra.length} more`}
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                  {/* The ✕ is always there (2026-11-27) so every row lines up; on the only row it clears it, off while it's empty. */}
                  <button type="button" aria-label={`Remove ${c.f ? label(c.f) : 'field'}`} disabled={changes.length === 1 && !c.f}
                    onClick={() => setChanges((l) => (l.length > 1 ? l.filter((_, j) => j !== i) : [{ f: '', v: '' }]))}
                    className="size-9 rounded-lg flex items-center justify-center text-[#737373] hover:bg-[#F5F5F5] hover:text-ink disabled:text-[#D4D4D4] disabled:hover:bg-transparent disabled:cursor-default"><X size={16} /></button>
                </div>
              );
            })}
          </div>
        </SheetSection>
      ) : (
        <div className="space-y-5">
          {/* Review (2026-11-26): a diff. Old values red and struck, new values green, an arrow between; per field the old
              values are grouped with how many units hold each. The preview is a table of unit, field, old, new. */}
          <SheetSection title="What changes">
            <div className="divide-y divide-line -my-1">
              {/* Amenities read as one change (2026-11-26): what's added and what's taken off, over how many units. */}
              {amPlan.length > 0 && (
                <div className="py-3 first:pt-1 last:pb-1">
                  <div className="flex items-center gap-3">
                    <span className="font-mono text-xs font-medium uppercase tracking-wide text-[#737373]">Amenities</span>
                    <span className="ml-auto text-sm text-[#737373] tabular-nums">{amUnits.toLocaleString('en-GB')} {amUnits === 1 ? 'unit' : 'units'}</span>
                  </div>
                  {[['Add', amPlan.filter((x) => x.c.f === 'am+')], ['Remove', amPlan.filter((x) => x.c.f === 'am-')]].map(([t, xs]) => (xs as typeof amPlan).length > 0 && (
                    <div key={t as string} className="mt-2 flex items-center gap-2 flex-wrap text-sm">
                      <span className="w-16 shrink-0 text-xs text-[#737373]">{t as string}</span>
                      {(xs as typeof amPlan).map(({ c }) => (t === 'Add' ? <New key={c.v}>{c.v}</New> : <Old key={c.v}>{c.v}</Old>))}
                    </div>
                  ))}
                </div>
              )}
              {plan.filter((x) => !isAm(x.c)).map(({ c, n: k, skipped }) => {
                const from = new Map<string, number>();
                units.forEach(({ u, pp }) => { if (!skipWhy(c, u, pp) && before(c, u) !== after(c)) from.set(before(c, u), (from.get(before(c, u)) ?? 0) + 1); });
                return (
                  <div key={`${c.f}:${c.v}`} className="py-3 first:pt-1 last:pb-1">
                    <div className="flex items-center gap-3">
                      <span className="font-mono text-xs font-medium uppercase tracking-wide text-[#737373]">{c.f === 'am+' || c.f === 'am-' ? `${label(c.f)} · ${c.v}` : label(c.f)}</span>
                      <span className="ml-auto text-sm text-[#737373] tabular-nums">{k.toLocaleString('en-GB')} {k === 1 ? 'unit' : 'units'}</span>
                    </div>
                    <div className="mt-2 flex items-center gap-2 flex-wrap text-sm">
                      {[...from].slice(0, 3).map(([v, m]) => <span key={v} className="inline-flex items-center gap-1.5"><Old>{v}</Old>{from.size > 1 && <span className="text-xs text-[#A3A3A3] tabular-nums">×{m}</span>}</span>)}
                      {from.size > 3 && <span className="text-xs text-[#737373]">+{from.size - 3} more</span>}
                      <ArrowRight size={14} className="text-[#737373] shrink-0" />
                      <New>{after(c)}</New>
                    </div>
                    {skipped.map(([why, m]) => <div key={why} className="mt-2 text-xs text-[#B45309]">{m.toLocaleString('en-GB')} skipped, {why}</div>)}
                  </div>
                );
              })}
            </div>
          </SheetSection>
          {shown.length > 0 && (
            <SheetSection title="Preview">
              {/* The table fills the card edge to edge (2026-11-26): no box inside the box. */}
              <div className="-mx-4 -my-3.5 text-sm">
                <div className="h-9 px-4 grid grid-cols-[48px_112px_minmax(0,1fr)_14px_minmax(0,1fr)] items-center gap-2.5 border-b border-line font-mono text-xs uppercase tracking-wide text-[#737373]">
                  <span>Unit</span><span>Field</span><span>Now</span><span /><span>After</span>
                </div>
                <div className="divide-y divide-line">
                  {shown.map(({ u, pp }) => {
                    const all = valid.filter((c) => !skipWhy(c, u, pp) && before(c, u) !== after(c));
                    const ams = all.filter(isAm), cs: BulkChange[] = [...all.filter((c) => !isAm(c)), ...(ams.length ? [{ f: 'am', v: '' }] : [])];
                    return cs.map((c, j) => c.f === 'am' ? (
                      <div key={`${u.id}am`} className={cx('min-h-10 px-4 py-2 grid grid-cols-[48px_112px_minmax(0,1fr)_14px_minmax(0,1fr)] items-center gap-2.5', j > 0 && '!border-t-0 pt-0')}>
                        <span className="font-medium text-ink">{j === 0 ? u.code : ''}</span>
                        <span className="text-[#737373] truncate">Amenities</span>
                        <span className="min-w-0 flex flex-wrap gap-1">{ams.filter((x) => x.f === 'am-').map((x) => <Old key={x.v}>{x.v}</Old>)}{!ams.some((x) => x.f === 'am-') && <span className="text-[#A3A3A3]">—</span>}</span>
                        <ArrowRight size={14} className="text-[#A3A3A3]" />
                        <span className="min-w-0 flex flex-wrap gap-1">{ams.filter((x) => x.f === 'am+').map((x) => <New key={x.v}>{x.v}</New>)}{!ams.some((x) => x.f === 'am+') && <span className="text-[#A3A3A3]">—</span>}</span>
                      </div>
                    ) : (
                      <div key={`${u.id}${c.f}${c.v}`} className={cx('min-h-10 px-4 py-2 grid grid-cols-[48px_112px_minmax(0,1fr)_14px_minmax(0,1fr)] items-center gap-2.5', j > 0 && '!border-t-0 pt-0')}>
                        <span className="font-medium text-ink">{j === 0 ? u.code : ''}</span>
                        <span className="text-[#737373] truncate">{label(c.f)}</span>
                        <span className="min-w-0"><Old>{before(c, u)}</Old></span>
                        <ArrowRight size={14} className="text-[#A3A3A3]" />
                        <span className="min-w-0"><New>{after(c)}</New></span>
                      </div>
                    ));
                  })}
                </div>
                {touched.length > shown.length && <div className="h-10 px-4 flex items-center border-t border-line text-sm text-[#737373]">and {(touched.length - shown.length).toLocaleString('en-GB')} more units</div>}
              </div>
            </SheetSection>
          )}
        </div>
      )}
    </PanelModal>
  );
}

/* Amenities in bulk edit (2026-11-26): one list with a checkbox each, ticked where every unit has it, a dash where only
   some do. Tick to add to all, untick to take off all; a dash left alone keeps each unit as it is. A mixed amenity
   cycles mixed → all → none → mixed. The trigger names what changes. */
function AmenityPicker({ now, value, onChange }: { now: AmState; value: AmState; onChange: (v: AmState) => void }) {
  const add = UNIT_AMENITIES.filter((a) => value[a] === true && now[a] !== true);
  const drop = UNIT_AMENITIES.filter((a) => value[a] === false && now[a] !== false);
  const summary = [add.length ? `Add ${add.join(', ')}` : '', drop.length ? `Remove ${drop.join(', ')}` : ''].filter(Boolean).join(' · ');
  const next = (a: string) => { const v = value[a]; return v === 'mixed' ? true : v === true ? false : now[a] === 'mixed' ? 'mixed' : true; };
  return (
    <Popover>
      <PopoverTrigger className="h-input w-full min-w-0 flex items-center gap-2 rounded-lg border border-input bg-background pl-2.5 pr-2 text-sm text-[#0A0A0A] text-left outline-none hover:bg-gray-50 focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-primary/25 data-[state=open]:border-primary data-[state=open]:ring-2 data-[state=open]:ring-primary/25">
        {/* What changes as pills (2026-11-26): green for added, red for removed, the first two then +N more. */}
        {summary ? (
          <span className="flex-1 min-w-0 flex items-center gap-1.5" title={summary}>
            <span className="min-w-0 flex items-center gap-1.5 overflow-hidden">
              {[...add.map((a) => [a, true] as const), ...drop.map((a) => [a, false] as const)].slice(0, 2).map(([a, on]) => (
                <span key={a} className="shrink-0"><Pill tone={on ? 'green' : 'red'}>{on ? '+' : '−'} {a}</Pill></span>
              ))}
            </span>
            {add.length + drop.length > 2 && <span className="shrink-0 text-xs text-[#737373] tabular-nums">+{add.length + drop.length - 2} more</span>}
          </span>
        ) : <span className="flex-1 min-w-0 truncate text-gray-400">Tick or untick amenities</span>}
        <ChevronsUpDown size={14} className="text-gray-400 shrink-0" />
      </PopoverTrigger>
      <PopoverContent align="start" className="w-[var(--radix-popover-trigger-width)] p-1.5 rounded-[10px]">
        {UNIT_AMENITIES.map((a) => {
          const v = value[a], changed = v !== now[a];
          return (
            <button key={a} type="button" onClick={() => onChange({ ...value, [a]: next(a) })} className="w-full h-9 px-2 rounded-md flex items-center gap-2.5 text-sm text-ink hover:bg-[#F5F5F5]">
              <Checkbox tabIndex={-1} className="pointer-events-none" checked={v === 'mixed' ? 'indeterminate' : v} />
              <span className="flex-1 min-w-0 truncate text-left">{a}</span>
              {changed ? <span className={cx('shrink-0 text-xs', v === true ? 'text-[#0B8A4C]' : v === false ? 'text-[#DC2626]' : 'text-[#737373]')}>{v === true ? 'Add' : v === false ? 'Remove' : 'Keep'}</span>
                : v === 'mixed' && <span className="shrink-0 text-xs text-[#A3A3A3]">Some</span>}
            </button>
          );
        })}
      </PopoverContent>
    </Popover>
  );
}
