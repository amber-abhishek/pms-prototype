/* Units v2 (2026-11-26, Figma 4319:18110): a tree table — property › block › floor › flat — with each level's unit count
   and how much of it is let, and the picked level open in a panel beside the table (not over it): its hero, facts and
   Units / Details / Activity. Units lists the level's units under the level below, each with "Open <level>". */
import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { toast } from 'sonner';
import { Checkbox } from '../../components/shadcn/checkbox';
import { Bed, BuildingOffice, Buildings, House, CurrencyGbp, MapPin, Tag, TextT, Hash, CalendarBlank, Users, CaretDown, CaretRight, CheckCircle, Door, DotsThree, Stack, ToggleLeft, X, type Icon } from '../../components/icons';
import { Avatar, Button, Dropdown, Input, PageHeader, Pill, PIN, type Tone, SearchInput, SelectFilter, SheetHero, SheetNavButtons, SheetRow, SheetSection, cx, type Fact, type SheetNav } from '../../components/ui';
import { allUnits, flatsOf, money, useInv, type Flat, type Property, type Unit, type UStatus } from '../../data/inventory';
import { EditLink, FieldErr, LineTabs, PanelModal, Menu, MultiPicker, PropStatus, ruleMatch, type RuleField } from './common';
import { FilterChips, FilterGroupButton } from './viewFilter';
import { COMPARE_MAX, CompareTable, DetailsCard, LevelFields, MultiLevelFields, Spread, layoutOf } from './LevelSheet';
import { ColumnsMenu } from './tableKit';
import { photoOf } from './photos';
import { StatusTabsBar } from '../offcampus/parts';
import { BulkEditDialog, UnitSheet, blockNameErr, flatNameErr, saveBlock, saveFlatName, shapeOf } from './Units';

type Kind = 'P' | 'B' | 'F' | 'L';
type Node = { key: string; kind: Kind; name: string; sub: string; depth: number; p: Property; bi: number; floor: number; flat?: Flat; children: Node[]; units: Unit[] };
const ICONS: Record<Kind, Icon> = { P: Buildings, B: Buildings, F: Stack, L: Door };
const KIND_NAME: Record<Kind, string> = { P: 'Property', B: 'Block', F: 'Floor', L: 'Flat' };
const ROOM_TYPES = ['Ensuite single', 'Standard single', 'Studio', 'Ensuite double', 'Accessible ensuite'];
const TYPE_TONE: Record<string, Tone> = { 'Ensuite single': 'blue', 'Standard single': 'orange', Studio: 'purple', 'Ensuite double': 'grey', 'Accessible ensuite': 'amber' };

/* Let is prototype data: an active unit is let unless its id hashes into the free few (stable per unit). */
const hashOf = (k: string) => [...k].reduce((h, c) => (h * 31 + c.charCodeAt(0)) >>> 0, 7);
const isLet = (u: Unit) => u.status === 'Active' && hashOf(u.id) % 23 !== 0;
const LET_ORDER = ['Occupancy 90% or more', 'Occupancy 80–89%', 'Occupancy under 80%'];
const letBand = (v: number) => (v >= 90 ? LET_ORDER[0] : v >= 80 ? LET_ORDER[1] : LET_ORDER[2]);
const pct = (us: Unit[]) => (us.length ? Math.round((us.filter(isLet).length / us.length) * 100) : 0);
const plural = (n: number, one: string) => `${n} ${one}${n === 1 ? '' : 's'}`;

export function UnitsV2({ props }: { props: Property[] }) {
  const edits = useInv((s) => s.unitEdits);
  const structures = useInv((s) => s.structures);
  const archivedFlats = useInv((s) => s.archivedFlats);
  const [q, setQ] = useState('');
  const [propF, setPropF] = useState<string[]>([]);
  const [rules, setRules] = useState<Record<string, string[]>>({});
  /* All / Inactive tabs (2026-11-26), as V1: All is every live unit, Inactive only the inactive ones. */
  const [tab, setTab] = useState<'all' | 'Inactive'>('all');
  /* No Group here (removed 2026-11-27): the tree is the table's only structure. */
  const gb = null as string | null;
  const [folded, setFolded] = useState<string[]>([]);
  const [open, setOpen] = useState<Record<string, boolean>>(() => ({ [`P:${props[0]?.id}`]: true }));
  const [sel, setSel] = useState<string | null>(null);
  /* ⌘/Ctrl-click or ⇧-click adds rows of the same level to the picked one (2026-11-27), to edit their fields together. */
  const [multi, setMulti] = useState<string[]>([]);
  const anchor = useRef<string | null>(null);
  /* Columns (2026-11-27), as V3: the shown columns in their order; Name and ⋯ stay put. Kept in this browser. */
  const [cols, setColsRaw] = useState<string[]>(() => { try { const v = JSON.parse(localStorage.getItem(COLS_KEY) ?? 'null'); return Array.isArray(v) ? v.filter((k) => COLS.some((c) => c.id === k)) : DEFAULT_COLS; } catch { return DEFAULT_COLS; } });
  const setCols = (v: string[]) => { setColsRaw(v); try { localStorage.setItem(COLS_KEY, JSON.stringify(v)); } catch { /* storage off */ } };
  const [unitOpen, setUnitOpen] = useState<{ p: Property; u: Unit; path: string[] } | null>(null);

  /* Filter (2026-11-26, trimmed to this view): what the rows show. Layout and Room type pick what's counted; Let,
     Vacant and Avg rent test each property's own figures, the same numbers as its row. Status (2026-11-26) picks which
     units count too; without it archived units are left out. Template and custom fields stay in V1. */
  const has = (id: string) => (rules[id]?.length ?? 0) > 0;
  const inact = tab === 'Inactive';
  /* A field passes when the value is one of those ticked. */
  const is = (id: string, v: string) => rules[id].includes(v);
  const keep = (u: Unit) => (inact ? u.status === 'Inactive' : has('status') ? is('status', u.status) : u.status !== 'Archived') && (!has('type') || is('type', u.type));
  const unitF = has('type') || (has('status') && !inact) || inact;
  const propOk = (p: Property) => (!has('campus') || rules.campus.includes(p.campus)) && (!has('layout') || is('layout', layoutOf(p)));
  /* Any field (2026-11-27): every column filters, as a database's properties do, and "Any field contains" finds a
     word anywhere on the property (name, place, address, layout, letting, tags, room types). Tested per property. */
  const numOk = (id: string, v: number | null) => !has(id) || ruleMatch('number', rules[id], v);
  const textOk = (id: string, v: string) => !has(id) || ruleMatch('text', rules[id], v);
  const fieldsOk = (n: Node) => {
    const p = n.p, us = n.units;
    const rents = us.map((u) => u.rent).filter((r): r is number => r != null);
    const weeks = us.map((u) => u.weeks).filter((w): w is number => w != null);
    const hay = [p.name, p.campus, p.address, layoutOf(p), p.letting, ...p.tags.map((t) => t.label), ...new Set(us.map((u) => u.type)), ...p.blocks.map((b) => b.name)].join(' ');
    return textOk('name', p.name) && textOk('address', p.address) && textOk('any', hay)
      && (!has('letting') || is('letting', p.letting)) && (!has('tags') || p.tags.some((t) => rules.tags.includes(t.label)))
      && numOk('units', us.length) && numOk('occupied', us.filter(isLet).length)
      && numOk('active', us.filter((u) => u.status === 'Active').length) && numOk('inactive', us.filter((u) => u.status === 'Inactive').length)
      && numOk('weeks', weeks.length ? Math.max(...weeks) : null)
      && numOk('minRent', rents.length ? Math.min(...rents) : null) && numOk('maxRent', rents.length ? Math.max(...rents) : null);
  };
  const figuresOk = (us: Unit[]) => {
    const rents = us.map((u) => u.rent).filter((r): r is number => r != null);
    const vac = us.filter((u) => u.status === 'Active' && !isLet(u)).length;
    return (!has('let') || is('let', letBand(pct(us))))
      && (!has('vacant') || is('vacant', vac ? 'Has vacant units' : 'Fully occupied'))
      && (!has('avgRent') || ruleMatch('number', rules.avgRent, rents.length ? Math.round(rents.reduce((x, y) => x + y, 0) / rents.length) : null));
  };
  /* A Room type or Status filter prunes the tree (2026-11-26): blocks, floors and flats with no matching unit drop out
     and each row's "n floors / n flats" counts what's left. */
  const prune = (n: Node): Node => {
    if (!unitF || !n.children.length) return n;
    const children = n.children.map(prune).filter((c) => c.units.length);
    const noun = n.kind === 'P' ? (n.sub.includes('house') ? 'house' : 'block') : n.kind === 'B' ? 'floor' : 'flat';
    return { ...n, children, sub: plural(children.length, noun) };
  };
  const gone = (id: string) => archivedFlats.some((a) => id === a || id.startsWith(`${a}|`));

  /* The whole tree, built once per data change; houses hang straight off their property. */
  const tree = useMemo(() => props.filter((p) => (!propF.length || propF.includes(p.id)) && propOk(p)).map((p): Node => {
    const sh = shapeOf(p, structures);
    const flatNode = (bi: number, floor: number, f: Flat, depth: number, name: string): Node =>
      ({ key: `L:${f.id}`, kind: 'L', name, sub: plural(f.units.filter(keep).length, 'unit'), depth, p, bi, floor, flat: f, children: [], units: f.units.filter(keep) });
    if (sh.house) {
      const houses = p.blocks.flatMap((b, bi) => Array.from({ length: b.floors }, (_, i) => flatsOf(p, bi, i + 1, edits).filter((f) => !gone(f.id)).map((f) => flatNode(bi, i + 1, f, 1, `House ${f.id.split('|')[3]}`))).flat());
      return { key: `P:${p.id}`, kind: 'P', name: p.name, sub: plural(houses.length, 'house'), depth: 0, p, bi: 0, floor: 0, children: houses, units: houses.flatMap((h) => h.units) };
    }
    const blocks = p.blocks.map((b, bi): Node | null => {
      if (gone(`${p.id}|${bi}`)) return null;
      const floors = Array.from({ length: b.floors }, (_, i): Node | null => {
        const floor = i + 1;
        if (gone(`${p.id}|${bi}|${floor}`)) return null;
        const flats = flatsOf(p, bi, floor, edits).filter((f) => !gone(f.id));
        const kids = sh.flats ? flats.map((f) => flatNode(bi, floor, f, 3, f.name)) : [];
        const units = flats.flatMap((f) => f.units.filter(keep));
        return { key: `F:${p.id}|${bi}|${floor}`, kind: 'F', name: `Floor ${floor}`, sub: sh.flats ? plural(flats.length, 'flat') : plural(units.length, 'unit'), depth: 2, p, bi, floor, children: kids, units };
      }).filter((x): x is Node => !!x);
      return { key: `B:${p.id}|${bi}`, kind: 'B', name: b.name, sub: plural(floors.length, 'floor'), depth: 1, p, bi, floor: 0, children: floors, units: floors.flatMap((f) => f.units) };
    }).filter((x): x is Node => !!x);
    return { key: `P:${p.id}`, kind: 'P', name: p.name, sub: plural(blocks.length, 'block'), depth: 0, p, bi: 0, floor: 0, children: blocks, units: blocks.flatMap((b) => b.units) };
  }).map(prune).filter((n) => (!unitF || n.units.length) && figuresOk(n.units) && fieldsOk(n)), [props, propF, edits, structures, archivedFlats, rules, tab]); // eslint-disable-line react-hooks/exhaustive-deps

  const byKey = useMemo(() => { const m = new Map<string, Node>(); const walk = (n: Node) => { m.set(n.key, n); n.children.forEach(walk); }; tree.forEach(walk); return m; }, [tree]);
  const parentOf = (key: string) => [...byKey.values()].find((n) => n.children.some((c) => c.key === key));

  /* Searching opens the path to every match; a row shows when it or something under it matches. */
  const ql = q.trim().toLowerCase();
  const hit = (n: Node): boolean => !ql || n.name.toLowerCase().includes(ql) || n.children.some(hit);
  const rows: Node[] = [];
  const walk = (n: Node) => { if (!hit(n)) return; rows.push(n); if ((ql ? n.children.some(hit) : open[n.key]) ) n.children.forEach(walk); };
  const groupOf = (n: Node) => gb === 'campus' ? n.p.campus : gb === 'layout' ? layoutOf(n.p) : letBand(pct(n.units));
  const sections: { label: string | null; items: Node[]; props: number }[] = [];
  if (!gb) { tree.forEach(walk); sections.push({ label: null, items: rows.slice(), props: tree.length }); }
  else {
    const keys = [...new Set(tree.map(groupOf))].sort((a, b) => (gb === 'let' ? LET_ORDER.indexOf(a) - LET_ORDER.indexOf(b) : a.localeCompare(b)));
    for (const k of keys) {
      const ps = tree.filter((n) => groupOf(n) === k && hit(n));
      if (!ps.length) continue;
      const start = rows.length;
      if (!folded.includes(k)) ps.forEach(walk);
      sections.push({ label: k, items: rows.slice(start), props: ps.length });
    }
  }

  /* Row ⋯ offers Expand all only while something under it is shut, Collapse all only while something is open. */
  const folds = (n: Node) => { const ks: string[] = []; const go = (x: Node) => { if (x.children.length) { ks.push(x.key); x.children.forEach(go); } }; go(n);
    return { expand: ks.some((k) => !open[k]), collapse: ks.some((k) => open[k]) }; };
  const cur = sel ? byKey.get(sel) ?? null : null;
  /* Picking a level opens the tree down to it, so its row is in view. */
  const pick = (key: string) => {
    setSel(key);
    setOpen((o) => { const n = { ...o }; let p = parentOf(key); while (p) { n[p.key] = true; p = parentOf(p.key); } return n; });
  };
  const picked = sel ? [sel, ...multi] : [];
  const pickedNodes = picked.map((k) => byKey.get(k)).filter((x): x is Node => !!x);
  const clickRow = (n: Node, e?: React.MouseEvent) => {
    const mod = !!e && (e.metaKey || e.ctrlKey || e.shiftKey);
    /* Properties have no fields to share, and levels don't mix (each has its own fields): those clicks just open. */
    if (mod && cur && cur.kind === n.kind && n.kind !== 'P') {
      /* No limit on how many (2026-11-27): Shift adds the run from the last row clicked to this one to what's already
         picked (it used to replace it, so a third block dropped the second); ⌘ / Ctrl toggles one row. */
      if (e!.shiftKey) {
        const a = rows.findIndex((r) => r.key === (anchor.current ?? sel)), b = rows.findIndex((r) => r.key === n.key);
        const [lo, hi] = a < b ? [a, b] : [b, a];
        const run = rows.slice(lo, hi + 1).filter((r) => r.kind === n.kind && r.key !== sel).map((r) => r.key);
        setMulti((m) => [...m, ...run.filter((k) => !m.includes(k))]);
      } else if (n.key === sel) { if (multi.length) { setSel(multi[0]); setMulti(multi.slice(1)); } }
      else setMulti((m) => (m.includes(n.key) ? m.filter((k) => k !== n.key) : [...m, n.key]));
      anchor.current = n.key;
      return;
    }
    setMulti([]);
    anchor.current = n.key;
    pick(n.key);
    if (n.children.length) setOpen((o) => ({ ...o, [n.key]: true }));
  };
  const i = cur ? rows.findIndex((r) => r.key === cur.key) : -1;
  const nav: SheetNav | undefined = cur && i >= 0 ? { prev: i > 0 ? () => setSel(rows[i - 1].key) : undefined, next: i < rows.length - 1 ? () => setSel(rows[i + 1].key) : undefined, pos: `${i + 1} of ${rows.length}` } : undefined;

  /* Tab counts over the properties in scope (Location, Property and Layout). */
  const counts = useMemo(() => {
    const ps = props.filter((p) => (!propF.length || propF.includes(p.id)) && propOk(p));
    const us = ps.flatMap((p) => allUnits(p, edits)).filter((u) => u.status !== 'Archived' && !gone(u.id));
    return { all: us.length, Inactive: us.filter((u) => u.status === 'Inactive').length, props: ps.length, locs: new Set(ps.map((p) => p.campus)).size };
  }, [props, propF, edits, archivedFlats, rules]); // eslint-disable-line react-hooks/exhaustive-deps
  /* Every field is a plain tick list, matching any ticked value (no is / is not, 2026-11-27); Avg rent a number. */
  const CH = { multi: true };
  const NUM = { kind: 'number' as const, options: [], ops: ['eq', 'gt', 'lt'] };
  const TXT = { kind: 'text' as const, options: [], ops: ['has', 'eq'] };
  const ruleFields: RuleField[] = [
    { id: 'layout', label: 'Layout', group: 'Property', icon: Stack, ...CH, options: [...new Set(props.map(layoutOf))].map((v) => ({ value: v, meta: props.filter((p) => layoutOf(p) === v).length })) },
    { id: 'type', label: 'Room type', group: 'Units', icon: Bed, ...CH, options: ROOM_TYPES.map((v) => ({ value: v })) },
    ...(inact ? [] : [{ id: 'status', label: 'Status', group: 'Units', icon: ToggleLeft, ...CH, options: (['Active', 'Inactive', 'Draft'] as UStatus[]).map((v) => ({ value: v })) } as RuleField]),
    { id: 'let', label: 'Occupancy', group: 'Occupancy', icon: CheckCircle, ...CH, options: LET_ORDER.map((v) => ({ value: v, label: v.replace(/^Occupancy u/, 'U').replace(/^Occupancy /, '') })) },
    { id: 'vacant', label: 'Vacant', group: 'Occupancy', icon: Door, ...CH, options: ['Has vacant units', 'Fully occupied'].map((v) => ({ value: v })) },
    { id: 'avgRent', label: 'Avg rent', group: 'Rent', icon: CurrencyGbp, ...NUM },
    { id: 'minRent', label: 'Lowest rent', group: 'Rent', icon: CurrencyGbp, ...NUM },
    { id: 'maxRent', label: 'Highest rent', group: 'Rent', icon: CurrencyGbp, ...NUM },
    { id: 'name', label: 'Name', group: 'Property', icon: TextT, ...TXT },
    { id: 'campus', label: 'Location', group: 'Property', icon: MapPin, ...CH, options: [...new Set(props.map((p) => p.campus))].map((v) => ({ value: v })) },
    { id: 'address', label: 'Address', group: 'Property', icon: MapPin, ...TXT },
    { id: 'letting', label: 'Letting', group: 'Property', icon: CalendarBlank, ...CH, options: [...new Set(props.map((p) => p.letting))].map((v) => ({ value: v })) },
    { id: 'tags', label: 'Tags', group: 'Property', icon: Tag, ...CH, options: [...new Set(props.flatMap((p) => p.tags.map((t) => t.label)))].map((v) => ({ value: v })) },
    { id: 'units', label: 'Units', group: 'Units', icon: Hash, ...NUM },
    { id: 'occupied', label: 'Occupied', group: 'Units', icon: Users, ...NUM },
    { id: 'active', label: 'Active', group: 'Units', icon: Hash, ...NUM },
    { id: 'inactive', label: 'Inactive', group: 'Units', icon: Hash, ...NUM },
    { id: 'weeks', label: 'Tenancy (weeks)', group: 'Units', icon: CalendarBlank, ...NUM },
    { id: 'any', label: 'Any field', group: 'Search', icon: TextT, ...TXT },
  ];

  /* Location has its own toolbar button, so the Filter menu and chips leave it out; Room type and Occupancy live in
     the menu (moved back from the toolbar, 2026-11-27). */
  const quick = ['campus'];
  const menuFields = ruleFields.filter((f) => !quick.includes(f.id));

  /* With the panel open the toolbar goes compact (All properties narrower, Filter icon-only, Columns gone), and it eases
     there in step with the panel's slide (2026-11-27): an instant switch made Location jump mid-slide. Same timing as
     SlidePanel: 300ms out-quint opening, 200ms ease-in closing. */
  /* Started on the panel's own frame: SlidePanel waits two frames before it widens, so the toolbar waits too. */
  const [narrow, setNarrow] = useState(!!cur);
  useEffect(() => {
    if (!cur) { setNarrow(false); return; }
    let r = requestAnimationFrame(() => { r = requestAnimationFrame(() => setNarrow(true)); });
    return () => cancelAnimationFrame(r);
  }, [!!cur]); // eslint-disable-line react-hooks/exhaustive-deps
  const ease = narrow ? 'duration-300 ease-[cubic-bezier(0.32,0.72,0,1)]' : 'duration-200 ease-in';

  /* With the panel open the table keeps Name, Units and Occupancy (2026-11-26); on its own, the picked columns. */
  const shown = cur ? cols.filter((k) => PANEL_COLS.includes(k)) : cols;

  return (
    <>
      <div className="flex-1 min-h-0 flex">
        <div className="flex-1 min-w-0 flex flex-col">
        <PageHeader title="Units" crumbs={[{ label: 'Properties', plain: true }]} />
        <div className="flex-1 min-h-0 flex bg-white">
          <section className="flex-1 min-w-0 flex flex-col">
            {/* Heading band and All / Inactive folder tabs (2026-11-26), as V1; the toolbar sits under them on white. */}
            <div className="shrink-0 px-6 pt-6 pb-2 bg-[#F5F5F5]">
              <h1 className="text-xl leading-7 font-medium text-ink">Units</h1>
              {/* The sub line of plain facts, as V1 (2026-11-26): units, properties, locations; no active count. */}
              <p className="mt-1 text-sm leading-5 text-[#737373] truncate">{[`${counts.all.toLocaleString('en-GB')} units`, `${counts.props} ${counts.props === 1 ? 'property' : 'properties'}`, ...(rules.campus?.length ? [] : [`${counts.locs} ${counts.locs === 1 ? 'location' : 'locations'}`])].join(' · ')}</p>
            </div>
            <StatusTabsBar value={tab} onChange={setTab} tabs={[{ id: 'all', label: 'All', count: counts.all }, { id: 'Inactive', label: 'Inactive', count: counts.Inactive }]} />
            <div {...PIN} className="shrink-0 px-6 pb-4">
              <div className="flex items-center gap-2 min-w-0">
                <div className="w-[280px] min-w-[160px] shrink [&>label]:!w-full"><SearchInput value={q} onChange={setQ} placeholder="Search properties, blocks, floors" /></div>
                <div className="ml-auto flex items-center gap-2">
                  <SelectFilter label="Location" value={rules.campus?.[0] ?? ''} width={220} onChange={(v) => { setRules((r) => ({ ...r, campus: v ? [v] : [] })); if (v) setPropF((f) => f.filter((id) => props.find((x) => x.id === id)?.campus === v)); }}
                    options={[...new Set(props.map((x) => x.campus))].map((c) => ({ value: c, meta: props.filter((x) => x.campus === c).reduce((n, x) => n + x.units, 0) }))} />
                  <div style={{ width: narrow ? 168 : 211 }} className={cx('shrink-0 motion-reduce:transition-none transition-[width] [&_.grid]:grid-cols-[minmax(0,1fr)] [&_.grid]:overflow-hidden', ease)}><MultiPicker icon={Buildings} all="All properties" noun={['property', 'properties']} value={propF} onChange={setPropF} options={props.filter((x) => !rules.campus?.length || rules.campus.includes(x.campus)).map((x) => ({ id: x.id, label: x.name }))} /></div>
                  <span aria-hidden className="w-px h-5 bg-[#E5E5E5] shrink-0" />
                  <FilterGroupButton compact={narrow} ease={ease} fields={menuFields} value={rules} onChange={(id, v) => setRules((r) => ({ ...r, [id]: v }))} />
                  <div inert={narrow} aria-hidden={narrow} className={cx('shrink-0 overflow-hidden motion-reduce:transition-none transition-[max-width,margin,opacity]', ease, narrow ? 'max-w-0 -ml-2 opacity-0' : 'max-w-[120px] opacity-100')}><ColumnsMenu options={COLS.map(({ id, label }) => ({ id, label }))} value={cols} onChange={setCols} /></div>
                </div>
              </div>
              {/* Applied filters as chips (2026-11-27), Notion's filter bar; only while one is on. */}
              <div className="empty:hidden mt-3"><FilterChips fields={menuFields} value={rules} onChange={(id, v) => setRules((r) => ({ ...r, [id]: v }))} /></div>
            </div>
            {/* Scrolled sideways, the pinned Name column gets V3's edge line and shadow (2026-11-27). */}
            <div className="flex-1 min-h-0 overflow-auto" onScroll={(e) => e.currentTarget.toggleAttribute('data-sx', e.currentTarget.scrollLeft > 0)}>
              <table className="w-full text-sm table-fixed border-separate border-spacing-0" style={cur ? undefined : { minWidth: NAME_W + MORE_W + shown.reduce((n, id) => n + COLS.find((c) => c.id === id)!.w, 0) }}>
                {/* With the panel open the table keeps Name, Units and Let; on its own it shows the rest too (2026-11-26). */}
                <thead className="sticky top-0 z-[2] [&_th]:sticky [&_th]:top-0 [&_th]:z-[2]"><tr className="text-left">
                  {/* Name is 300px (2026-11-27, was 420) on a wide table so Location sits near it; the ⋯ column takes the slack (2026-11-26). */}
                  <th className="pl-6 !left-0 !z-[3] pin-edge" style={cur ? { minWidth: 280 } : { width: NAME_W }}>Name</th>
                  {shown.map((id) => { const c = COLS.find((x) => x.id === id)!; return <th key={id} style={{ width: cur && c.panelW ? c.panelW : c.w }} className="px-3 whitespace-nowrap">{c.label}</th>; })}
                  <th style={cur ? { width: 64 } : { minWidth: 64 }} className="pr-6" />
                </tr></thead>
                <tbody>
                  {sections.map((sec) => [
                    sec.label != null && (
                      <tr key={`g:${sec.label}`} className="h-12 bg-[#FAFAFA] [&>td]:border-b [&>td]:border-[#E5E5E5]">
                        <td colSpan={shown.length + 2} className="pl-6 pr-6">
                          <div className="sticky left-6 w-max flex items-center gap-2">
                            <button type="button" aria-expanded={!folded.includes(sec.label)} aria-label={folded.includes(sec.label) ? `Show ${sec.label}` : `Hide ${sec.label}`}
                              onClick={() => setFolded((f) => (f.includes(sec.label!) ? f.filter((x) => x !== sec.label) : [...f, sec.label!]))}
                              className="size-6 -ml-1 rounded-md flex items-center justify-center text-[#737373] hover:bg-[#EBEBEB] hover:text-ink">
                              <CaretDown size={14} className={cx('transition-transform duration-150', folded.includes(sec.label) && '-rotate-90')} />
                            </button>
                            <span className="text-sm font-medium text-ink">{sec.label}</span>
                            <span className="flex items-center gap-1.5 text-xs text-[#A3A3A3] tabular-nums"><span aria-hidden>·</span>{plural(sec.props, 'property').replace('propertys', 'properties')}</span>
                          </div>
                        </td>
                      </tr>
                    ),
                    ...sec.items.map((n) => <TreeRow key={n.key} n={n} cols={shown} open={ql ? n.children.some(hit) : !!open[n.key]} on={picked.includes(n.key)}
                    onToggle={() => setOpen((o) => ({ ...o, [n.key]: !o[n.key] }))} onPick={(e) => clickRow(n, e)}
                    folds={folds(n)} onAll={(v) => setOpen((o) => { const m = { ...o }; const go = (x: Node) => { m[x.key] = v; x.children.forEach(go); }; go(n); return m; })} />)]).flat()}
                </tbody>
              </table>
              {!tree.some(hit) && <div className="px-6 py-10 text-sm text-[#737373]">{ql ? <>Nothing matches “{q}”.</> : 'No properties match these filters.'}</div>}
            </div>
          </section>
          {/* The side panel sits under the breadcrumb bar, inside the page (2026-11-27), and slides in and out. */}
          <SlidePanel show={!!cur}>{cur && (pickedNodes.length > 1
            ? <MultiPanel key={picked.join(',')} nodes={pickedNodes} onClose={() => { setSel(null); setMulti([]); }} />
            : <LevelPanel key={cur.key} n={cur} nav={nav} onClose={() => setSel(null)}
              onPick={(k) => { setMulti([]); pick(k); }} onUnit={(u) => setUnitOpen({ p: cur.p, u, path: pathOf(cur, byKey, parentOf) })} />)}</SlidePanel>
        </div>
        </div>
      </div>
      {unitOpen && <UnitSheet p={unitOpen.p} unit={unitOpen.u} path={unitOpen.path} onClose={() => setUnitOpen(null)} />}
    </>
  );
}

function pathOf(n: Node, _m: Map<string, Node>, parentOf: (k: string) => Node | undefined) {
  const out: string[] = [n.name]; let p = parentOf(n.key);
  while (p) { out.unshift(p.name); p = parentOf(p.key); }
  return out;
}

/* The extra columns when the table has the page to itself (2026-11-26, trimmed): Vacant (active, not let) and the
   average weekly rent. */
/* Columns (2026-11-27): the first five show by default; the rest wait in Columns, hidden, to be added. With more than
   fit, the table scrolls sideways and Name stays pinned on the left. */
const COLS: { id: string; label: string; w: number; panelW?: number; on?: boolean }[] = [
  { id: 'location', label: 'Location', w: 150, on: true }, { id: 'units', label: 'Units', w: 120, panelW: 88, on: true }, { id: 'vacant', label: 'Vacant', w: 120, on: true },
  { id: 'rent', label: 'Avg rent', w: 150, on: true }, { id: 'occupancy', label: 'Occupancy', w: 170, on: true },
  { id: 'occupied', label: 'Occupied', w: 120 }, { id: 'active', label: 'Active', w: 110 }, { id: 'inactive', label: 'Inactive', w: 110 },
  { id: 'rentRange', label: 'Rent range', w: 160 }, { id: 'weeks', label: 'Tenancy', w: 120 }, { id: 'types', label: 'Room types', w: 260 },
  { id: 'layout', label: 'Layout', w: 180 }, { id: 'letting', label: 'Letting', w: 120 }, { id: 'address', label: 'Address', w: 280 },
];
const NAME_W = 300, MORE_W = 64;
const PANEL_COLS = ['units', 'occupancy'];
const COLS_KEY = 'pms-cols:units-v2';
const DEFAULT_COLS = COLS.filter((c) => c.on).map((c) => c.id);
/** The added columns' cells; a level's units summed or ranged, and the property's own facts on every row. */
function moreCell(id: string, n: Node): ReactNode {
  const us = n.units, dash = <span className="text-[#A3A3A3]">—</span>;
  const rents = us.map((u) => u.rent).filter((r): r is number => r != null);
  const weeks = us.map((u) => u.weeks).filter((w): w is number => w != null);
  switch (id) {
    case 'occupied': return us.filter(isLet).length || dash;
    case 'active': return us.filter((u) => u.status === 'Active').length || dash;
    case 'inactive': return us.filter((u) => u.status === 'Inactive').length || dash;
    case 'rentRange': { if (!rents.length) return dash; const lo = Math.min(...rents), hi = Math.max(...rents); return lo === hi ? `${money(lo)} / wk` : `${money(lo)}–${money(hi)}`; }
    case 'weeks': { if (!weeks.length) return dash; const lo = Math.min(...weeks), hi = Math.max(...weeks); return lo === hi ? `${lo} wks` : `${lo}–${hi} wks`; }
    /* Room types as tag pills (2026-11-27), one colour per type: the first two, then +N with the rest in its tooltip. */
    case 'types': { const t = [...new Set(us.map((u) => u.type))]; if (!t.length) return dash;
      return <span className="flex items-center gap-1.5 min-w-0" title={t.join(', ')}>{t.slice(0, 2).map((x) => <Pill key={x} tone={TYPE_TONE[x] ?? 'grey'}>{x}</Pill>)}{t.length > 2 && <span className="shrink-0 text-xs text-[#737373] tabular-nums">+{t.length - 2}</span>}</span>; }
    case 'layout': return layoutOf(n.p);
    case 'letting': return n.p.letting;
    case 'address': return n.p.address;
    default: return dash;
  }
}
function extraCells(us: Unit[]): ReactNode[] {
  const dash = <span className="text-[#A3A3A3]">—</span>;
  const rents = us.map((u) => u.rent).filter((r): r is number => r != null);
  const vacant = us.filter((u) => u.status === 'Active' && !isLet(u)).length;
  return [vacant || dash, rents.length ? `${money(Math.round(rents.reduce((a, b) => a + b, 0) / rents.length))} / wk` : dash];
}

/* A tree row: 48px; the name indented 24px a level with its caret, the count of what's in it in grey; Units; a Let bar
   (green 90%+, orange 80%+, red below) with the percentage; ⋯. The picked row is blue with a 2px bar on its left. */
function TreeRow({ n, cols, open, on, folds, onToggle, onPick, onAll }: { n: Node; cols: string[]; open: boolean; on: boolean; folds: { expand: boolean; collapse: boolean }; onToggle: () => void; onPick: (e?: React.MouseEvent) => void; onAll: (v: boolean) => void }) {
  const let_ = pct(n.units);
  const tone = let_ >= 90 ? '#16A34A' : let_ >= 80 ? '#EA580C' : '#DC2626';
  const KindIcon = n.kind === 'P' ? Buildings : n.kind === 'B' ? BuildingOffice : n.kind === 'F' ? Stack : n.name.startsWith('House') ? House : Door;
  const photo = n.kind === 'P' ? photoOf(n.p.id) : undefined;
  return (
    <tr onClick={(e) => onPick(e)} onContextMenu={(e) => { if (e.ctrlKey) { e.preventDefault(); onPick(e); } }} onMouseDown={(e) => { if (e.shiftKey) e.preventDefault(); }} aria-selected={on} className={cx(photo ? 'h-16' : 'h-12', 'cursor-pointer [&>td]:border-b [&>td]:border-[#F0F0F0] [&>td]:align-middle', '[&>td:first-child]:bg-inherit', on ? 'bg-[#EFF6FF] shadow-[inset_2px_0_0_#2563EB]' : 'bg-white hover:bg-[#FAFAFA]')}>
      {/* Hierarchy (2026-11-26): indent, a kind icon, and weight stepping down a level (property medium ink, block ink,
         floor and flat grey); no guide lines. */}
      <td className={cx('pl-6 pr-3 sticky left-0 z-[1] pin-edge', on && 'pin-on shadow-[inset_2px_0_0_#2563EB]')}>
        <div className="flex items-center gap-2 min-w-0" style={{ paddingLeft: n.depth * 24 }}>
          {n.children.length ? (
            <button type="button" aria-label={open ? `Collapse ${n.name}` : `Expand ${n.name}`} aria-expanded={open} onClick={(e) => { e.stopPropagation(); onToggle(); }}
              className="size-6 -ml-1 shrink-0 rounded-md flex items-center justify-center text-[#737373] hover:bg-[#EBEBEB] hover:text-ink">
              {open ? <CaretDown size={14} /> : <CaretRight size={14} />}
            </button>
          ) : <span aria-hidden className="w-5 shrink-0" />}
          {/* A property with a cover photo (2026-11-26) is a 64px row: a 40px photo, the name over what's in it (and its
              location while the panel hides that column). Levels below keep their icon on one line. */}
          {photo ? <>
            <img src={photo} alt="" loading="lazy" className="size-10 shrink-0 rounded-lg object-cover bg-[#F5F5F5]" />
            <div className="min-w-0 ml-1">
              <div className="truncate font-medium text-ink">{n.name}</div>
              <div className="truncate text-xs leading-4 text-[#737373] tabular-nums">{[n.sub, ...(cols.includes('location') ? [] : [n.p.campus])].join(' · ')}</div>
            </div>
          </> : <>
          <KindIcon size={16} aria-hidden className={cx('shrink-0', n.kind === 'P' ? 'text-[#525252]' : 'text-[#A3A3A3]')} />
          <span className={cx('truncate', n.kind === 'P' || n.kind === 'B' ? 'font-medium text-ink' : 'text-[#404040]')}>{n.name}</span>
          {/* What's inside (2026-11-26): plain 12px grey after a dot, only where there's a level below; a flat's "8 units" just
             repeated the Units column, so leaf rows show none. */}
          {n.children.length > 0 && <span className="shrink-0 flex items-center gap-1.5 text-xs text-[#A3A3A3] tabular-nums"><span aria-hidden>·</span>{n.sub}</span>}
          </>}
        </div>
      </td>
      {cols.map((id) => {
        /* Location on every row (2026-11-26): a block, floor or flat is where its property is. */
        if (id === 'location') return <td key={id} className={cx('px-3 truncate', n.kind === 'P' ? 'text-[#404040]' : 'text-[#A3A3A3]')}>{n.p.campus}</td>;
        if (id === 'units') return <td key={id} className="px-3 tabular-nums text-[#404040]">{n.units.length}</td>;
        if (id === 'vacant' || id === 'rent') return <td key={id} className="px-3 tabular-nums text-[#404040] truncate">{extraCells(n.units)[id === 'vacant' ? 0 : 1]}</td>;
        if (id !== 'occupancy') return <td key={id} className={cx('px-3 truncate', n.kind !== 'P' && ['layout', 'letting', 'address'].includes(id) ? 'text-[#A3A3A3]' : 'text-[#404040]', 'tabular-nums')}>{moreCell(id, n)}</td>;
        return (
          <td key={id} className="px-3">
            <div className="flex items-center gap-2.5">
              <span aria-hidden className="w-[72px] h-1.5 rounded-full bg-[#F0F0F0] overflow-hidden"><span className="block h-full rounded-full" style={{ width: `${let_}%`, background: tone }} /></span>
              <span className="tabular-nums text-[#404040]">{let_}%</span>
            </div>
          </td>
        );
      })}
      <td className="pr-6 text-right" onClick={(e) => e.stopPropagation()}>
        <Menu width={180} trigger={(o) => <button type="button" onClick={o} aria-label={`More for ${n.name}`} className="size-7 rounded-md inline-flex items-center justify-center text-[#737373] hover:bg-[#EBEBEB] hover:text-ink"><DotsThree size={16} /></button>}
          items={[{ label: `Open ${KIND_NAME[n.kind].toLowerCase()}`, onClick: () => onPick() }, ...(folds.expand ? [{ label: 'Expand all', onClick: () => onAll(true) }] : []), ...(folds.collapse ? [{ label: 'Collapse all', onClick: () => onAll(false) }] : [])]} />
      </td>
    </tr>
  );
}

/* The picked level beside the table: a 56px bar (kind, ⌃ ⌄, expand, ✕), the hero with its facts, then tabs. */
/* Opens by growing from 0 to the panel width, so the list gives way as the panel slides in from the right; closing
   reverses it and keeps the last panel on screen until the slide ends. */
const PANEL_W = 520;
function SlidePanel({ show, children }: { show: boolean; children: ReactNode }) {
  const [mounted, setMounted] = useState(show);
  const [wide, setWide] = useState(show);
  const last = useRef<ReactNode>(children);
  if (show) last.current = children;
  useEffect(() => {
    if (show) {
      setMounted(true);
      let r = requestAnimationFrame(() => { r = requestAnimationFrame(() => setWide(true)); });
      return () => cancelAnimationFrame(r);
    }
    setWide(false);
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) setMounted(false);
  }, [show]);
  if (!mounted) return null;
  return (
    <div onTransitionEnd={(e) => { if (e.target === e.currentTarget && !show) setMounted(false); }}
      className={cx('shrink-0 overflow-hidden flex motion-reduce:transition-none transition-[width]', wide ? 'duration-300 ease-[cubic-bezier(0.32,0.72,0,1)]' : 'duration-200 ease-in')}
      style={{ width: wide ? PANEL_W : 0 }}>
      <div className="shrink-0 flex min-h-0" style={{ width: PANEL_W }}>{show ? children : last.current}</div>
    </div>
  );
}

/** Several blocks, floors or flats picked together (2026-11-27): their totals, and the fields they share, each record
    listed under each field with its own value and, while editing, its own control. */
function MultiPanel({ nodes, onClose }: { nodes: Node[]; onClose: () => void }) {
  const kind = nodes[0].kind;
  const noun = KIND_NAME[kind].toLowerCase();
  const units = nodes.flatMap((n) => n.units);
  const letP = pct(units);
  const facts: Fact[] = [['Units', String(units.length)], ['Active', String(units.filter((u) => u.status === 'Active').length), 'green'],
    ['Occupancy', `${letP}%`, letP >= 90 ? 'green' : letP >= 80 ? 'orange' : 'red']];
  const props = [...new Set(nodes.map((n) => n.p.name))];
  /* Picked across properties, two blocks can both be "Block A": name each with its property then (2026-11-27). */
  const label = (n: Node) => (props.length > 1 ? `${n.name} · ${n.p.name}` : n.name);
  const names = nodes.map((n) => n.name);
  const meta = [names.length > 3 ? `${names.slice(0, 3).join(', ')} +${names.length - 3}` : names.join(', '), props.length === 1 ? props[0] : `${props.length} properties`].join(' · ');
  const idOf = (n: Node) => (n.kind === 'B' ? `${n.p.id}|${n.bi}` : n.kind === 'F' ? `${n.p.id}|${n.bi}|${n.floor}` : n.flat?.id ?? '');
  const levelKind = kind === 'B' ? 'Block' : kind === 'F' ? 'Floor' : 'Flat';
  /* Blocks also share Room type; read live so a change shows straight away. */
  const allProps = useInv((s) => s.properties);
  const rts = kind === 'B' ? [...new Set(nodes.map((n) => allProps.find((x) => x.id === n.p.id)?.blocks[n.bi]?.roomType ?? ''))] : [];
  /* Details edit (2026-11-27): each picked block or flat gets its own Name box (and, for blocks, Room type); a pattern
   * fills every name in one go ("Flat 1.#" from 1 → Flat 1.1, Flat 1.2 …). Save writes only what changed. */
  const rtOf = (n: Node) => allProps.find((x) => x.id === n.p.id)?.blocks[n.bi]?.roomType ?? '';
  const nameable = kind === 'B' || (kind === 'L' && nodes.every((n) => n.flat));
  const edits = useInv((s) => s.unitEdits);
  const [dd, setDd] = useState<Record<number, { name?: string; rt?: string }> | null>(null);
  const [pat, setPat] = useState('');
  const [start, setStart] = useState('1');
  const nameAt = (i: number) => dd?.[i]?.name ?? nodes[i].name;
  const nameFor = (i: number) => { const t = pat.trim(), k = String((parseInt(start, 10) || 1) + i); return t.includes('#') ? t.replace('#', k) : `${t} ${k}`; };
  const preview = nodes.slice(0, 3).map((_, i) => nameFor(i));
  const applyPattern = () => {
    if (!pat.trim()) return;
    setDd((d) => { const n = { ...d }; nodes.forEach((_, i) => { n[i] = { ...n[i], name: nameFor(i) }; }); return n; });
  };
  /* Names must be unique where they sit: blocks within their property, flats within their floor, counting the others
     being renamed and the ones that aren't. */
  const groupOf = (n: Node) => (kind === 'B' ? n.p.id : `${n.p.id}|${n.bi}|${n.floor}`);
  const errOf = (i: number) => {
    const v = nameAt(i).trim();
    if (!v) return 'Enter a name.';
    const n = nodes[i], g = groupOf(n), low = v.toLowerCase();
    if (nodes.some((m, j) => j !== i && groupOf(m) === g && nameAt(j).trim().toLowerCase() === low)) return 'Used twice here.';
    const pickedKeys = new Set(nodes.map((m) => m.key));
    const others = kind === 'B'
      ? (allProps.find((x) => x.id === n.p.id)?.blocks ?? []).filter((_, bi) => !pickedKeys.has(nodes.find((m) => m.p.id === n.p.id && m.bi === bi)?.key ?? '-')).map((x) => x.name)
      : flatsOf(n.p, n.bi, n.floor, edits).filter((f) => !nodes.some((m) => m.flat?.id === f.id)).map((f) => f.name);
    return others.some((o) => o.trim().toLowerCase() === low) ? (kind === 'B' ? `${n.p.name} already has ${v}.` : `This floor already has ${v}.`) : '';
  };
  const [tried, setTried] = useState(false);
  const closeEdit = () => { setDd(null); setPat(''); setStart('1'); setTried(false); };
  const saveDetails = () => {
    if (nodes.some((_, i) => errOf(i))) { setTried(true); return; }
    const changed = nodes.map((n, i) => ({ n, name: nameAt(i).trim(), rt: dd?.[i]?.rt ?? rtOf(n) })).filter(({ n, name, rt }) => name !== n.name || (kind === 'B' && rt !== rtOf(n)));
    if (kind === 'B') useInv.getState().set('properties', (ps) => ps.map((x) => {
      const mine = changed.filter((c) => c.n.p.id === x.id);
      return mine.length ? { ...x, blocks: x.blocks.map((y, bi) => { const c = mine.find((m) => m.n.bi === bi); return c ? { ...y, name: c.name, roomType: c.rt } : y; }) } : x;
    }));
    else useInv.getState().set('unitEdits', (e) => { const n = { ...e }; changed.forEach((c) => { n[`flat|${c.n.flat!.id}`] = { code: c.name }; }); return n; });
    if (changed.length) toast.success(`${changed.length === 1 ? changed[0].name : `${changed.length} ${noun}s`} saved`);
    closeEdit();
  };
  /* Flats (2026-11-27): their Block (grouped where they differ), then every name listed, so Edit plainly covers renaming
     them. Floor and Property are left out: the tree already shows them. */
  const one = (vals: string[], names: string[]): ReactNode => (new Set(vals).size === 1 ? vals[0]
    : <Spread entries={vals.map((v, i) => ({ name: names[i], key: v, value: v }))} />);
  const flatRows: [string, ReactNode][] = kind !== 'L' ? [] : [
    ['Block', one(nodes.map((n) => n.p.blocks[n.bi]?.name ?? ''), nodes.map((n) => n.name))],
    ['Names', <div className="flex flex-col gap-1">{nodes.slice(0, COMPARE_MAX).map((n) => <span key={n.key} className="truncate">{label(n)}</span>)}
      {nodes.length > COMPARE_MAX && <span className="text-[#737373]">+{nodes.length - COMPARE_MAX} more</span>}</div>],
  ];
  return (
    <aside className="shrink-0 w-[520px] flex flex-col border-l border-[#E5E5E5] bg-white min-h-0">
      <div className="h-14 shrink-0 px-5 flex items-center gap-3 border-b border-[#E5E5E5]">
        <span className="font-mono text-[11px] uppercase tracking-wide text-[#737373]">{nodes.length} {noun}s</span>
        <button type="button" aria-label="Close" title="Close" onClick={onClose} className="ml-auto size-8 shrink-0 rounded-lg flex items-center justify-center text-[#404040] hover:bg-[#F5F5F5] hover:text-ink transition-colors outline-none focus-visible:ring-2 focus-visible:ring-ring"><X size={18} strokeWidth={1.75} /></button>
      </div>
      {/* Spaced as the single panel (2026-11-27): the summary's own space under it, then the cards 12px apart (their own margin). */}
      <div className="flex-1 min-h-0 overflow-auto p-5">
        <SheetHero icon={ICONS[kind]} name={`${nodes.length} ${noun}s`} meta={meta} facts={facts} />
        <div>
        {nameable && (
          <>
          {/* Edit opens the centre modal, as Custom fields does (2026-11-27): rename each one, blocks also their Room type. */}
          <SheetSection title="Details" action={<EditLink onClick={() => setDd({})}>Edit</EditLink>}
            rows={kind === 'L' ? flatRows
              : nodes.length > COMPARE_MAX ? [['Room type', rts.length === 1 ? rts[0] : <Spread entries={nodes.map((n) => { const v = rtOf(n); return { name: label(n), key: v, value: v || '—' }; })} />]] : undefined}>
            {kind === 'B' && nodes.length <= COMPARE_MAX && <CompareTable cols={nodes.map(label)} rows={[{ label: 'Room type', values: nodes.map((n) => rtOf(n) || '—') }]} />}
          </SheetSection>
          <PanelModal open={dd != null} onClose={closeEdit} width={kind === 'B' ? 640 : 560} eyebrow="Edit details" title={`${nodes.length} ${noun}s`} meta={meta} icon={ICONS[kind]}
            right={<><Button onClick={closeEdit}>Cancel</Button><Button variant="primary" onClick={saveDetails}>Save</Button></>}>
            <SheetSection title="Rename all">
              {/* Plain words (2026-11-27): say where the number goes, and show the names it will make before Apply. */}
              <div className="flex items-end gap-2">
                <label className="flex-1 min-w-0 flex flex-col gap-1.5">
                  <span className="text-sm leading-5 text-[#737373]">Name format</span>
                  <Input value={pat} onChange={(e) => setPat(e.target.value)} placeholder={kind === 'B' ? 'Block #' : 'Flat 1.#'} onKeyDown={(e) => { if (e.key === 'Enter') applyPattern(); }} />
                </label>
                <label className="w-[104px] shrink-0 flex flex-col gap-1.5">
                  <span className="text-sm leading-5 text-[#737373]">First number</span>
                  <Input value={start} inputMode="numeric" onChange={(e) => setStart(e.target.value.replace(/[^0-9]/g, ''))} />
                </label>
                <Button type="button" onClick={applyPattern} disabled={!pat.trim()}>Apply</Button>
              </div>
              <p className="mt-2 text-xs leading-4 text-[#737373] truncate">{pat.trim()
                ? <>Makes {preview.join(', ')}{nodes.length > 3 ? ' …' : ''}</>
                : <>Type # where the number goes. {kind === 'B' ? '“Block #”' : '“Flat 1.#”'} makes {kind === 'B' ? 'Block 1, Block 2, Block 3' : 'Flat 1.1, Flat 1.2, Flat 1.3'} …</>}</p>
            </SheetSection>
            <SheetSection title={kind === 'B' ? 'Names and room types' : 'Names'}>
              <div className={cx('grid gap-x-3 pb-2 font-mono text-[11px] leading-4 uppercase tracking-[0.04em] text-[#737373]', kind === 'B' ? 'grid-cols-[minmax(0,1fr)_200px_160px]' : 'grid-cols-[minmax(0,1fr)_220px]')}>
                <span>Now</span><span>New name</span>{kind === 'B' && <span>Room type</span>}
              </div>
              <div className="flex flex-col gap-1.5">
                {nodes.map((n, i) => {
                  const err = tried || dd?.[i]?.name != null ? errOf(i) : '';
                  return (
                    <div key={n.key}>
                      <div className={cx('grid gap-x-3 items-center', kind === 'B' ? 'grid-cols-[minmax(0,1fr)_200px_160px]' : 'grid-cols-[minmax(0,1fr)_220px]')}>
                        <span className="min-w-0 truncate text-sm leading-5 text-[#737373]" title={label(n)}>{label(n)}</span>
                        <Input aria-label={`New name, ${label(n)}`} value={nameAt(i)} aria-invalid={!!err || undefined}
                          onChange={(e) => setDd((d) => ({ ...d, [i]: { ...d?.[i], name: e.target.value } }))} />
                        {kind === 'B' && <Dropdown ariaLabel={`Room type, ${label(n)}`} value={dd?.[i]?.rt ?? rtOf(n)} placeholder="Choose"
                          onChange={(v) => setDd((d) => ({ ...d, [i]: { ...d?.[i], rt: v } }))} options={ROOM_TYPES.map((t) => ({ value: t, label: t }))} />}
                      </div>
                      {err && <div className={cx('grid gap-x-3', kind === 'B' ? 'grid-cols-[minmax(0,1fr)_360px]' : 'grid-cols-[minmax(0,1fr)_220px]')}><span /><FieldErr>{err}</FieldErr></div>}
                    </div>
                  );
                })}
              </div>
            </SheetSection>
          </PanelModal>
          </>
        )}
        <MultiLevelFields kind={levelKind} items={nodes.map((n) => ({ p: n.p, id: idOf(n), name: label(n) }))} name={`${nodes.length} ${noun}s`} meta={meta} />
        </div>
      </div>
    </aside>
  );
}

function LevelPanel({ n, nav, onClose, onPick, onUnit }: { n: Node; nav?: SheetNav; onClose: () => void; onPick: (k: string) => void; onUnit: (u: Unit) => void }) {
  const [tab, setTab] = useState<string>('units');
  const [shut, setShut] = useState<string[]>([]);
  /* Bulk (2026-11-26): tick units (or a whole group from its header) and the panel's footer offers Set status and Edit
     units. One property, so one bookable type: the edit always applies. */
  const [checked, setChecked] = useState<string[]>([]);
  const [bulkEdit, setBulkEdit] = useState(false);
  const tri = (ids: string[]): boolean | 'indeterminate' => { const k = ids.filter((id) => checked.includes(id)).length; return !k ? false : k === ids.length ? true : 'indeterminate'; };
  const toggleIds = (ids: string[]) => setChecked((c) => (ids.every((id) => c.includes(id)) ? c.filter((x) => !ids.includes(x)) : [...new Set([...c, ...ids])]));
  const bulkStatus = (st: UStatus) => {
    const ed = useInv.getState().editUnit; let skipped = 0;
    checked.forEach((id) => { const u = n.units.find((x) => x.id === id); if (st === 'Active' && u && u.rent == null) { skipped++; return; } ed(id, { status: st }); });
    toast.success(`${checked.length - skipped} units set to ${st}${skipped ? ` · ${skipped} skipped, no tenancy` : ''}`);
    setChecked([]);
  };
  const sh = shapeOf(n.p, useInv.getState().structures);
  const kidName = n.kind === 'P' ? (sh.house ? 'House' : 'Block') : n.kind === 'B' ? 'Floor' : 'Flat';
  const active = n.units.filter((u) => u.status === 'Active').length;
  /* Facts in colour (2026-11-26): Active green; Let by its band, as the tree's bar (green 90%+, orange 80%+, red below). */
  const letP = pct(n.units);
  const facts: Fact[] = [
    ...(n.children.length ? [[`${kidName}s`, String(n.children.length)] as Fact] : []),
    ['Units', String(n.units.length)], ['Active', String(active), 'green'], ['Occupancy', `${letP}%`, letP >= 90 ? 'green' : letP >= 80 ? 'orange' : 'red'],
  ];
  const meta = n.kind === 'P' ? n.p.campus : [n.kind === 'L' && !sh.house ? `Floor ${n.floor}` : '', n.kind !== 'B' && !sh.house ? n.p.blocks[n.bi]?.name : '', n.p.name].filter(Boolean).join(' · ');
  const tabs = { units: 'Units', details: 'Details', activity: 'Activity' } as const;
  /* Units under the level below, each group with Open <level>; a flat's units are one list. */
  const groups: { key?: string; name: string; units: Unit[] }[] = n.children.length ? n.children.map((c) => ({ key: c.key, name: c.name, units: c.units })).filter((g) => g.units.length) : [{ name: '', units: n.units }];
  const levelKind = n.kind === 'B' ? 'Block' : n.kind === 'F' ? 'Floor' : n.kind === 'L' ? 'Flat' : null;
  const levelId = n.kind === 'B' ? `${n.p.id}|${n.bi}` : n.kind === 'F' ? `${n.p.id}|${n.bi}|${n.floor}` : n.flat?.id ?? '';
  return (
    <aside className={'shrink-0 w-[520px] flex flex-col border-l border-[#E5E5E5] bg-white min-h-0'}>
      <div className="h-14 shrink-0 px-5 flex items-center gap-3 border-b border-[#E5E5E5]">
        <span className="font-mono text-[11px] uppercase tracking-wide text-[#737373]">{sh.house && n.kind === 'L' ? 'House' : KIND_NAME[n.kind]}</span>
        <div className="ml-auto flex items-center gap-3">
          <SheetNavButtons nav={nav} />
          {/* As the other sheets (2026-11-27): a thin line after the chevrons, then a plain × with no outline. */}
          {nav && <span aria-hidden className="w-px h-5 bg-[#E5E5E5] shrink-0" />}
          <button type="button" aria-label="Close" title="Close" onClick={onClose} className="size-8 shrink-0 rounded-lg flex items-center justify-center text-[#404040] hover:bg-[#F5F5F5] hover:text-ink transition-colors outline-none focus-visible:ring-2 focus-visible:ring-ring"><X size={18} strokeWidth={1.75} /></button>
        </div>
      </div>
      <div className="flex-1 min-h-0 overflow-auto">
        <div className="px-5 pt-5">
          <SheetHero icon={ICONS[n.kind]} name={n.name} meta={meta} facts={facts}
            lead={n.kind === 'P' && photoOf(n.p.id) ? <img src={photoOf(n.p.id)} alt="" className="size-14 shrink-0 rounded-xl object-cover bg-[#F5F5F5]" /> : undefined} />
        </div>
        {/* Tabs as on every record panel (2026-11-26): LineTabs, the ink underline on a full-width rule. */}
        <LineTabs value={tab} onChange={setTab} tabs={Object.entries(tabs).map(([id, label]) => ({ id, label }))} />
        {tab === 'units' && (
          /* One table, edge to edge under the tabs (2026-11-26, not boxed): a single column header with select-all across every unit here, and the level
             below as group rows inside it (caret folds, tick selects the group, Open <level>), so units on different floors
             can be ticked together. The column header and group rows stick while scrolling. */
          <div className="pt-4">
            {n.units.length ? (
              <section className="border-t border-[#EBEBEB]">
                <div className="sticky top-0 z-[2] h-9 px-5 flex items-center gap-4 bg-white border-b border-[#EBEBEB] font-mono text-[11px] uppercase tracking-wide text-[#737373]">
                  <span className="w-4 shrink-0 flex"><Checkbox aria-label="Select all units" className="size-4 rounded-[4px] [&_svg]:size-3" checked={tri(n.units.map((u) => u.id))} onCheckedChange={() => toggleIds(n.units.map((u) => u.id))} /></span>
                  <span aria-hidden className="w-12 shrink-0">Unit</span><span aria-hidden className="flex-1 min-w-0">Room type</span><span aria-hidden className="w-20 shrink-0">Rent</span><span aria-hidden className="w-20 shrink-0">Status</span><span className="w-3.5 shrink-0" />
                </div>
                {groups.map((g, gi) => {
                  const id = g.key ?? 'all'; const isShut = shut.includes(id);
                  return (
                    <div key={id}>
                      {/* The line above a later group is a 1px shadow, not a border (2026-11-26): stuck under the column header it lands on
                          the header's own bottom line instead of doubling it. */}
                      {g.name && (
                        <div className={cx('sticky top-9 z-[1] h-10 px-5 flex items-center gap-2 bg-[#FAFAFA] text-sm', gi > 0 && 'shadow-[0_-1px_0_#EBEBEB]', !isShut && 'border-b border-[#F0F0F0]')}>
                          <span className="w-4 shrink-0 flex"><Checkbox aria-label={`Select all in ${g.name}`} className="size-4 rounded-[4px] [&_svg]:size-3" checked={tri(g.units.map((u) => u.id))} onCheckedChange={() => toggleIds(g.units.map((u) => u.id))} /></span>
                          <button type="button" aria-expanded={!isShut} onClick={() => setShut((v) => (isShut ? v.filter((x) => x !== id) : [...v, id]))}
                            className="-ml-0.5 min-w-0 flex items-center gap-1.5 rounded-md pl-1 pr-1.5 h-7 hover:bg-[#EBEBEB]">
                            {isShut ? <CaretRight size={14} className="shrink-0 text-[#737373]" /> : <CaretDown size={14} className="shrink-0 text-[#737373]" />}
                            <span className="truncate font-medium text-ink">{g.name}</span>
                          </button>
                          <span className="flex-1 text-[#737373] tabular-nums">{plural(g.units.length, 'unit')}</span>
                          {g.key && <button type="button" onClick={() => onPick(g.key!)} className="shrink-0 text-primary font-medium hover:underline underline-offset-2">Open {kidName.toLowerCase()}</button>}
                        </div>
                      )}
                      {!isShut && g.units.map((u, k) => (
                        <div key={u.id} role="button" tabIndex={0} onClick={() => onUnit(u)} onKeyDown={(e) => { if (e.key === 'Enter') onUnit(u); }}
                          className={cx('w-full h-12 px-5 flex items-center gap-4 text-sm text-left cursor-pointer outline-none focus-visible:bg-[#FAFAFA]', checked.includes(u.id) ? 'bg-[#EFF6FF]' : 'hover:bg-[#FAFAFA]', k > 0 && 'border-t border-[#F0F0F0]')}>
                          <span className="w-4 shrink-0 flex" onClick={(e) => e.stopPropagation()}><Checkbox aria-label={`Select ${u.code}`} className="size-4 rounded-[4px] [&_svg]:size-3" checked={checked.includes(u.id)} onCheckedChange={() => toggleIds([u.id])} /></span>
                          <span className="w-12 shrink-0 font-medium text-ink">{u.code}</span>
                          <span className="flex-1 min-w-0 truncate text-[#404040]">{u.type}</span>
                          <span className="w-20 shrink-0 tabular-nums text-[#404040]">{u.rent != null ? `${money(u.rent)} / wk` : '—'}</span>
                          <span className="w-20 shrink-0 flex"><PropStatus s={u.status} /></span>
                          <CaretRight size={14} className="shrink-0 text-[#A3A3A3]" />
                        </div>
                      ))}
                    </div>
                  );
                })}
              </section>
            ) : <div className="px-5 py-3 text-sm text-[#737373]">No units here.</div>}
          </div>
        )}
        {tab === 'details' && (
          <div className="p-5">
            {/* Block and flat details edit in place, the same card as V1 (2026-11-26); property and floor stay read-only. */}
            {n.kind === 'B' ? <DetailsCard rows={[['Name', n.name], ['Room type', n.p.blocks[n.bi]?.roomType ?? ''], ['Property', n.p.name]]} edit={{
                fields: [{ label: 'Name' }, { label: 'Room type', options: [...ROOM_TYPES] }],
                validate: (v) => blockNameErr(n.p, n.bi, v.Name),
                save: (v) => saveBlock(n.p, n.bi, v.Name.trim(), v['Room type']) }} />
            : n.kind === 'L' && n.flat && !sh.house ? <DetailsCard rows={[['Name', n.name], ['Block', n.p.blocks[n.bi]?.name ?? ''], ['Floor', `Floor ${n.floor}`], ['Property', n.p.name]]} edit={{
                fields: [{ label: 'Name' }],
                validate: (v) => flatNameErr(n.flat!, flatsOf(n.p, n.bi, n.floor, useInv.getState().unitEdits), v.Name),
                save: (v) => saveFlatName(n.flat!, v.Name.trim()) }} />
            : <SheetSection title="Details" rows={n.kind === 'P'
              ? [['Name', n.p.name], ['Location', n.p.campus], ['Address', n.p.address], ['Letting', n.p.letting]]
              : [['Name', n.name], ...(!sh.house ? [['Block', n.p.blocks[n.bi]?.name ?? ''] as [string, ReactNode]] : []), ...(n.kind === 'L' && !sh.house ? [['Floor', `Floor ${n.floor}`] as [string, ReactNode]] : []), ['Property', n.p.name]]} />}
            {levelKind && <LevelFields p={n.p} kind={levelKind} id={levelId} view name={n.name} meta={meta} />}
          </div>
        )}
        {tab === 'activity' && (
          <div className="p-5">
            {/* As every other panel's Activity (2026-11-26): avatar, "Name did something", the time under it in grey. */}
            <SheetSection title="Activity">
              {[['Arjun Mehta', 'set rents for 2026/27', '18 Nov'], ['Priya Shah', `marked ${n.units[0]?.code ?? 'a unit'} Draft`, '3 Nov'], ['Arjun Mehta', `imported ${n.name}`, '12 Sep']].map(([who, what, when], k) => (
                <SheetRow key={k} lead={<Avatar name={who} size={24} />} title={<><span className="font-medium">{who}</span> <span className="text-[#525252]">{what}</span></>} sub={when} />
              ))}
            </SheetSection>
          </div>
        )}
      </div>
      {/* Bulk footer (64px) while units are ticked: the count and Clear on the left, Set status and Edit units on the right. */}
      {tab === 'units' && checked.length > 0 && (
        <div className="h-16 shrink-0 px-5 flex items-center gap-2 border-t border-[#E5E5E5] text-sm">
          <span className="font-medium text-ink">{checked.length} selected</span>
          <Button size="sm" variant="ghost" icon={null} onClick={() => setChecked([])}>Clear</Button>
          <span className="ml-auto flex items-center gap-2">
            <Menu align="right" width={160} trigger={(o) => <Button size="sm" onClick={o}>Set status</Button>} items={(['Active', 'Inactive', 'Draft'] as UStatus[]).map((st) => ({ label: st, onClick: () => bulkStatus(st) }))} />
            <Button size="sm" variant="primary" icon={null} onClick={() => setBulkEdit(true)}>Edit units</Button>
          </span>
        </div>
      )}
      {bulkEdit && <BulkEditDialog ids={checked} props={[n.p]} scope={`in ${n.kind === 'P' ? n.p.name : `${n.name}, ${n.p.name}`}`} onClose={() => setBulkEdit(false)} onDone={() => { setBulkEdit(false); setChecked([]); }} />}
    </aside>
  );
}

/* The V1 / V2 / V3 switch (2026-11-26; V3 2026-11-27): a floating segmented pill at the bottom centre of the page; the pick is remembered. */
const VKEY = 'pms.units.version.v2';
const OLD_VKEY = 'pms.units.version';
export type UnitsVersion = 1 | 2 | 3;
export function useUnitsVersion(): [UnitsVersion, (v: UnitsVersion) => void] {
  /* V2 and V3 swapped (2026-11-27): a pick saved before then is read the other way round, so the same design stays open. */
  const [v, setV] = useState<UnitsVersion>(() => { try { const s = localStorage.getItem(VKEY); if (s) return s === '2' ? 2 : s === '3' ? 3 : 1; const o = localStorage.getItem(OLD_VKEY); return o === '2' ? 3 : o === '3' ? 2 : 1; } catch { return 1; } });
  return [v, (x) => { setV(x); try { localStorage.setItem(VKEY, String(x)); } catch { /* private mode */ } }];
}
export function VersionToggle({ value, onChange }: { value: UnitsVersion; onChange: (v: UnitsVersion) => void }) {
  return (
    <div role="radiogroup" aria-label="Units design" className="fixed bottom-5 left-1/2 -translate-x-1/2 z-40 p-1 rounded-full bg-[#0A0A0A] shadow-[0_8px_24px_rgba(0,0,0,0.18)] flex items-center gap-1">
      {([1, 2, 3] as const).map((x) => (
        <button key={x} type="button" role="radio" aria-checked={value === x} onClick={() => onChange(x)}
          className={cx('h-7 px-3.5 rounded-full font-mono text-[11px] uppercase tracking-wide transition-colors', value === x ? 'bg-white text-ink' : 'text-[#A3A3A3] hover:text-white')}>V{x}</button>
      ))}
    </div>
  );
}
