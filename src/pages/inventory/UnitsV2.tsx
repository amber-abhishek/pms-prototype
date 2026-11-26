/* Units v2 (2026-11-26, Figma 4319:18110): a tree table — property › block › floor › flat — with each level's unit count
   and how much of it is let, and the picked level open in a panel beside the table (not over it): its hero, facts and
   Units / Details / Activity. Units lists the level's units under the level below, each with "Open <level>". */
import { useMemo, useState, type ReactNode } from 'react';
import { toast } from 'sonner';
import { Checkbox } from '../../components/shadcn/checkbox';
import { Bed, BuildingOffice, Buildings, House, CurrencyGbp, CaretDown, CaretRight, CheckCircle, Door, DotsThree, Stack, ToggleLeft, X, type Icon } from '../../components/icons';
import { Avatar, Button, PageHeader, PIN, SearchInput, SelectFilter, SheetHero, SheetNavButtons, SheetRow, SheetSection, cx, type Fact, type SheetNav } from '../../components/ui';
import { allUnits, flatsOf, money, useInv, type Flat, type Property, type Unit, type UStatus } from '../../data/inventory';
import { LineTabs, Menu, MultiPicker, PropStatus, RuleFilter, ruleMatch, type RuleField } from './common';
import { DetailsCard, LevelFields, layoutOf } from './LevelSheet';
import { GroupByMenu } from './tableKit';
import { photoOf } from './photos';
import { StatusTabsBar } from '../offcampus/parts';
import { BulkEditDialog, UnitSheet, blockNameErr, flatNameErr, saveBlock, saveFlatName, shapeOf } from './Units';

type Kind = 'P' | 'B' | 'F' | 'L';
type Node = { key: string; kind: Kind; name: string; sub: string; depth: number; p: Property; bi: number; floor: number; flat?: Flat; children: Node[]; units: Unit[] };
const ICONS: Record<Kind, Icon> = { P: Buildings, B: Buildings, F: Stack, L: Door };
const KIND_NAME: Record<Kind, string> = { P: 'Property', B: 'Block', F: 'Floor', L: 'Flat' };
const ROOM_TYPES = ['Ensuite single', 'Standard single', 'Studio', 'Ensuite double', 'Accessible ensuite'];

/* Let is prototype data: an active unit is let unless its id hashes into the free few (stable per unit). */
const hashOf = (k: string) => [...k].reduce((h, c) => (h * 31 + c.charCodeAt(0)) >>> 0, 7);
const isLet = (u: Unit) => u.status === 'Active' && hashOf(u.id) % 23 !== 0;
const LET_ORDER = ['Let 90% or more', 'Let 80–89%', 'Let under 80%'];
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
  /* Group (2026-11-26): properties under Location, Layout or Let band headers, each folding with its count; Location by default. */
  const [gb, setGb] = useState<string | null>(null);
  const [folded, setFolded] = useState<string[]>([]);
  const [open, setOpen] = useState<Record<string, boolean>>(() => ({ [`P:${props[0]?.id}`]: true }));
  const [sel, setSel] = useState<string | null>(null);
  const [unitOpen, setUnitOpen] = useState<{ p: Property; u: Unit; path: string[] } | null>(null);

  /* Filter (2026-11-26, trimmed to this view): what the rows show. Layout and Room type pick what's counted; Let,
     Vacant and Avg rent test each property's own figures, the same numbers as its row. Status (2026-11-26) picks which
     units count too; without it archived units are left out. Template and custom fields stay in V1. */
  const has = (id: string) => (rules[id]?.length ?? 0) > 0;
  const inact = tab === 'Inactive';
  const keep = (u: Unit) => (inact ? u.status === 'Inactive' : has('status') ? rules.status.includes(u.status) : u.status !== 'Archived') && (!has('type') || rules.type.includes(u.type));
  const unitF = has('type') || (has('status') && !inact) || inact;
  const propOk = (p: Property) => (!has('campus') || rules.campus.includes(p.campus)) && (!has('layout') || rules.layout.includes(layoutOf(p)));
  const figuresOk = (us: Unit[]) => {
    const rents = us.map((u) => u.rent).filter((r): r is number => r != null);
    const vac = us.filter((u) => u.status === 'Active' && !isLet(u)).length;
    return (!has('let') || rules.let.includes(letBand(pct(us))))
      && (!has('vacant') || rules.vacant.includes(vac ? 'Has vacant units' : 'Fully let'))
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
  }).map(prune).filter((n) => (!unitF || n.units.length) && figuresOk(n.units)), [props, propF, edits, structures, archivedFlats, rules, tab]); // eslint-disable-line react-hooks/exhaustive-deps

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
  const i = cur ? rows.findIndex((r) => r.key === cur.key) : -1;
  const nav: SheetNav | undefined = cur && i >= 0 ? { prev: i > 0 ? () => setSel(rows[i - 1].key) : undefined, next: i < rows.length - 1 ? () => setSel(rows[i + 1].key) : undefined, pos: `${i + 1} of ${rows.length}` } : undefined;

  /* Tab counts over the properties in scope (Location, Property and Layout). */
  const counts = useMemo(() => {
    const ps = props.filter((p) => (!propF.length || propF.includes(p.id)) && propOk(p));
    const us = ps.flatMap((p) => allUnits(p, edits)).filter((u) => u.status !== 'Archived' && !gone(u.id));
    return { all: us.length, Inactive: us.filter((u) => u.status === 'Inactive').length, props: ps.length, locs: new Set(ps.map((p) => p.campus)).size };
  }, [props, propF, edits, archivedFlats, rules]); // eslint-disable-line react-hooks/exhaustive-deps
  const ruleFields: RuleField[] = [
    { id: 'layout', label: 'Layout', group: 'Property', icon: Stack, multi: true, options: [...new Set(props.map(layoutOf))].map((v) => ({ value: v, meta: props.filter((p) => layoutOf(p) === v).length })) },
    { id: 'type', label: 'Room type', group: 'Property', icon: Bed, multi: true, options: ROOM_TYPES.map((v) => ({ value: v })) },
    ...(inact ? [] : [{ id: 'status', label: 'Status', group: 'Property', icon: ToggleLeft, multi: true, options: (['Active', 'Inactive', 'Draft'] as UStatus[]).map((v) => ({ value: v })) } as RuleField]),
    { id: 'let', label: 'Let', group: 'Occupancy', icon: CheckCircle, multi: true, options: LET_ORDER.map((v) => ({ value: v })) },
    { id: 'vacant', label: 'Vacant', group: 'Occupancy', icon: Door, multi: true, options: ['Has vacant units', 'Fully let'].map((v) => ({ value: v })) },
    { id: 'avgRent', label: 'Avg rent', group: 'Occupancy', icon: CurrencyGbp, kind: 'number', options: [] },
  ];

  return (
    <>
      {/* The side panel runs the full height (2026-11-26), beside the breadcrumb bar too: the bar and the list share the
          left column. */}
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
              <div className="flex items-center gap-2">
                <div className="w-[280px] min-w-[160px] shrink [&>label]:!w-full"><SearchInput value={q} onChange={setQ} placeholder="Search properties, blocks, floors" /></div>
                <div className="ml-auto flex items-center gap-2">
                  <SelectFilter label="Location" value={rules.campus?.[0] ?? ''} width={220} onChange={(v) => { setRules((r) => ({ ...r, campus: v ? [v] : [] })); if (v) setPropF((f) => f.filter((id) => props.find((x) => x.id === id)?.campus === v)); }}
                    options={[...new Set(props.map((x) => x.campus))].map((c) => ({ value: c, meta: props.filter((x) => x.campus === c).reduce((n, x) => n + x.units, 0) }))} />
                  <div className={cx('shrink-0', cur && 'w-[168px] [&_.grid]:grid-cols-[minmax(0,1fr)] [&_.grid]:overflow-hidden')}><MultiPicker icon={Buildings} all="All properties" noun={['property', 'properties']} value={propF} onChange={setPropF} options={props.filter((x) => !rules.campus?.length || rules.campus.includes(x.campus)).map((x) => ({ id: x.id, label: x.name }))} /></div>
                  <span aria-hidden className="w-px h-5 bg-[#E5E5E5] shrink-0" />
                  <RuleFilter compact={!!cur} fields={ruleFields} value={rules} onChange={(id, v) => setRules((r) => ({ ...r, [id]: v }))} />
                  <GroupByMenu compact={!!cur} title="Group properties by" value={gb} onChange={(v) => { setGb(v); setFolded([]); }} options={[{ id: 'campus', label: 'Location' }, { id: 'layout', label: 'Layout' }, { id: 'let', label: 'Let' }]} />
                </div>
              </div>
            </div>
            <div className="flex-1 min-h-0 overflow-auto">
              <table className="w-full text-sm table-fixed">
                {/* With the panel open the table keeps Name, Units and Let; on its own it shows the rest too (2026-11-26). */}
                <thead className="sticky top-0 z-[1]"><tr className="text-left">
                  {/* Name is capped at 420px on a wide table so Location sits near it; the ⋯ column takes the slack (2026-11-26). */}
                  <th className="pl-6" style={cur ? { minWidth: 280 } : { width: 420 }}>Name</th>
                  {!cur && <th style={{ width: 150 }} className="px-3">Location</th>}
                  <th style={{ width: cur ? 88 : 120 }} className="px-3">Units</th>
                  {!cur && EXTRA.map(([h, w]) => <th key={h} style={{ width: w }} className="px-3 whitespace-nowrap">{h}</th>)}
                  <th style={{ width: 170 }} className="px-3">Let</th><th style={cur ? { width: 64 } : { minWidth: 64 }} className="pr-6" />
                </tr></thead>
                <tbody>
                  {sections.map((sec) => [
                    sec.label != null && (
                      <tr key={`g:${sec.label}`} className="h-12 bg-[#FAFAFA] border-b border-[#E5E5E5]">
                        <td colSpan={cur ? 4 : 4 + 1 + EXTRA.length} className="pl-6 pr-6">
                          <div className="flex items-center gap-2">
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
                    ...sec.items.map((n) => <TreeRow key={n.key} n={n} full={!cur} open={ql ? n.children.some(hit) : !!open[n.key]} on={sel === n.key}
                    onToggle={() => setOpen((o) => ({ ...o, [n.key]: !o[n.key] }))} onPick={() => { pick(n.key); if (n.children.length) setOpen((o) => ({ ...o, [n.key]: true })); }}
                    folds={folds(n)} onAll={(v) => setOpen((o) => { const m = { ...o }; const go = (x: Node) => { m[x.key] = v; x.children.forEach(go); }; go(n); return m; })} />)]).flat()}
                </tbody>
              </table>
              {!tree.some(hit) && <div className="px-6 py-10 text-sm text-[#737373]">{ql ? <>Nothing matches “{q}”.</> : 'No properties match these filters.'}</div>}
            </div>
          </section>
        </div>
        </div>
        {cur && <LevelPanel key={cur.key} n={cur} nav={nav} onClose={() => setSel(null)}
          onPick={pick} onUnit={(u) => setUnitOpen({ p: cur.p, u, path: pathOf(cur, byKey, parentOf) })} />}
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
const EXTRA: [string, number][] = [['Vacant', 120], ['Avg rent', 150]];
function extraCells(us: Unit[]): ReactNode[] {
  const dash = <span className="text-[#A3A3A3]">—</span>;
  const rents = us.map((u) => u.rent).filter((r): r is number => r != null);
  const vacant = us.filter((u) => u.status === 'Active' && !isLet(u)).length;
  return [vacant || dash, rents.length ? `${money(Math.round(rents.reduce((a, b) => a + b, 0) / rents.length))} / wk` : dash];
}

/* A tree row: 48px; the name indented 24px a level with its caret, the count of what's in it in grey; Units; a Let bar
   (green 90%+, orange 80%+, red below) with the percentage; ⋯. The picked row is blue with a 2px bar on its left. */
function TreeRow({ n, full, open, on, folds, onToggle, onPick, onAll }: { n: Node; full: boolean; open: boolean; on: boolean; folds: { expand: boolean; collapse: boolean }; onToggle: () => void; onPick: () => void; onAll: (v: boolean) => void }) {
  const let_ = pct(n.units);
  const tone = let_ >= 90 ? '#16A34A' : let_ >= 80 ? '#EA580C' : '#DC2626';
  const KindIcon = n.kind === 'P' ? Buildings : n.kind === 'B' ? BuildingOffice : n.kind === 'F' ? Stack : n.name.startsWith('House') ? House : Door;
  const photo = n.kind === 'P' ? photoOf(n.p.id) : undefined;
  return (
    <tr onClick={onPick} aria-selected={on} className={cx(photo ? 'h-16' : 'h-12', 'cursor-pointer border-b border-[#F0F0F0] [&>td]:align-middle', on ? 'bg-[#EFF6FF] shadow-[inset_2px_0_0_#2563EB]' : 'hover:bg-[#FAFAFA]')}>
      {/* Hierarchy (2026-11-26): indent, a kind icon, and weight stepping down a level (property medium ink, block ink,
         floor and flat grey); no guide lines. */}
      <td className="pl-6 pr-3">
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
              <div className="truncate text-xs leading-4 text-[#737373] tabular-nums">{[n.sub, ...(full ? [] : [n.p.campus])].join(' · ')}</div>
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
      {/* Location on every row (2026-11-26): a block, floor or flat is where its property is. */}
      {full && <td className={cx('px-3 truncate', n.kind === 'P' ? 'text-[#404040]' : 'text-[#A3A3A3]')}>{n.p.campus}</td>}
      <td className="px-3 tabular-nums text-[#404040]">{n.units.length}</td>
      {full && extraCells(n.units).map((v, k) => <td key={k} className="px-3 tabular-nums text-[#404040] truncate">{v}</td>)}
      <td className="px-3">
        <div className="flex items-center gap-2.5">
          <span aria-hidden className="w-[72px] h-1.5 rounded-full bg-[#F0F0F0] overflow-hidden"><span className="block h-full rounded-full" style={{ width: `${let_}%`, background: tone }} /></span>
          <span className="tabular-nums text-[#404040]">{let_}%</span>
        </div>
      </td>
      <td className="pr-6 text-right" onClick={(e) => e.stopPropagation()}>
        <Menu width={180} trigger={(o) => <button type="button" onClick={o} aria-label={`More for ${n.name}`} className="size-7 rounded-md inline-flex items-center justify-center text-[#737373] hover:bg-[#EBEBEB] hover:text-ink"><DotsThree size={16} /></button>}
          items={[{ label: `Open ${KIND_NAME[n.kind].toLowerCase()}`, onClick: onPick }, ...(folds.expand ? [{ label: 'Expand all', onClick: () => onAll(true) }] : []), ...(folds.collapse ? [{ label: 'Collapse all', onClick: () => onAll(false) }] : [])]} />
      </td>
    </tr>
  );
}

/* The picked level beside the table: a 56px bar (kind, ⌃ ⌄, expand, ✕), the hero with its facts, then tabs. */
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
    ['Units', String(n.units.length)], ['Active', String(active), 'green'], ['Let', `${letP}%`, letP >= 90 ? 'green' : letP >= 80 ? 'orange' : 'red'],
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
          <IconBtn label="Close" icon={X} onClick={onClose} />
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
            {levelKind && <LevelFields p={n.p} kind={levelKind} id={levelId} />}
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

function IconBtn({ label, icon: I, onClick }: { label: string; icon: Icon; onClick: () => void }) {
  return <button type="button" aria-label={label} title={label} onClick={onClick} className="size-8 rounded-lg border border-[#E5E5E5] bg-white flex items-center justify-center text-[#525252] hover:bg-[#F5F5F5] hover:text-ink"><I size={16} strokeWidth={1.75} /></button>;
}

/* The V1 / V2 switch (2026-11-26): a floating segmented pill at the bottom centre of the page; the pick is remembered. */
const VKEY = 'pms.units.version';
export function useUnitsVersion(): [1 | 2, (v: 1 | 2) => void] {
  const [v, setV] = useState<1 | 2>(() => { try { return localStorage.getItem(VKEY) === '2' ? 2 : 1; } catch { return 1; } });
  return [v, (x) => { setV(x); try { localStorage.setItem(VKEY, String(x)); } catch { /* private mode */ } }];
}
export function VersionToggle({ value, onChange }: { value: 1 | 2; onChange: (v: 1 | 2) => void }) {
  return (
    <div role="radiogroup" aria-label="Units design" className="fixed bottom-5 left-1/2 -translate-x-1/2 z-40 p-1 rounded-full bg-[#0A0A0A] shadow-[0_8px_24px_rgba(0,0,0,0.18)] flex items-center gap-1">
      {([1, 2] as const).map((x) => (
        <button key={x} type="button" role="radio" aria-checked={value === x} onClick={() => onChange(x)}
          className={cx('h-7 px-3.5 rounded-full font-mono text-[11px] uppercase tracking-wide transition-colors', value === x ? 'bg-white text-ink' : 'text-[#A3A3A3] hover:text-white')}>V{x}</button>
      ))}
    </div>
  );
}
