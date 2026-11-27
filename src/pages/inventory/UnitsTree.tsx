import { useEffect, useState } from 'react';
import { CaretDown, CaretRight, CaretUpDown, Info, ListDashes, MapPin, type Icon } from '../../components/icons';
import { IconTile, cx } from '../../components/ui';
import { flatsOf, useInv, type Property, type Structure } from '../../data/inventory';
import { Menu, levelIcon } from './common';
import { photoOf } from './photos';
import type { LevelKind } from './LevelSheet';

/* Units V3 (2026-11-27): the left hierarchy tree first explored on 2026-11-25 (Figma 4251:17646), beside the V1 table.
   296px (room for the photos, 2026-11-27); the location picker on top, Properties: All units, a separator, then every property → blocks → floors → flats. 36px r8 rows (2026-11-27, were 32), each level 12px in (2026-11-27, was 22); counts in Geist Mono 12; the picked row is raised white with its icon in blue. Picking a row scopes the table. */
export type TreeSel = { pid: string; bi: number | null; floor: number | null; flat: number | null };
export type TreeLevel = { pid: string; kind: LevelKind; bi: number; floor: number; flat?: number };
type Shape = { house: boolean; flats: boolean };

const goneIn = (arch: string[]) => (id: string) => arch.some((a) => id === a || id.startsWith(`${a}|`));

export function UnitsTree({ props, all, structures, shapeOf, sel, go, loc, setLoc, onInfo }: {
  props: Property[]; all: string; structures: Structure[]; shapeOf: (p: Property, s: Structure[]) => Shape;
  sel: TreeSel; go: (s: TreeSel) => void; loc: string; setLoc: (v: string) => void; onInfo: (l: TreeLevel) => void;
}) {
  const edits = useInv((s) => s.unitEdits);
  const archivedFlats = useInv((s) => s.archivedFlats);
  const gone = goneIn(archivedFlats);
  const [open, setOpen] = useState<Record<string, boolean>>({});
  /* The picked place stays in view: its property, block and floor open when it changes (from the table or the toolbar too). */
  useEffect(() => {
    if (sel.pid === all) return;
    const ks = [sel.pid, ...(sel.bi != null ? [`${sel.pid}|${sel.bi}`] : []), ...(sel.floor != null && sel.flat != null ? [`${sel.pid}|${sel.bi}|${sel.floor}`] : [])];
    setOpen((o) => ({ ...o, ...Object.fromEntries(ks.map((k) => [k, true])) }));
  }, [sel.pid, sel.bi, sel.floor, sel.flat, all]);
  const tog = (k: string) => setOpen((o) => ({ ...o, [k]: !o[k] }));
  const expand = (...ks: string[]) => setOpen((o) => ({ ...o, ...Object.fromEntries(ks.map((k) => [k, true])) }));
  const campuses = [...new Set(props.map((x) => x.campus))];
  const shown = loc ? props.filter((x) => x.campus === loc) : props;
  /* Counts are the units actually there (archived levels left out), not the seed totals, so they match the table. */
  const blockN = (p: Property, bi: number) => gone(`${p.id}|${bi}`) ? 0 : Array.from({ length: p.blocks[bi].floors }, (_, i) => flatsOf(p, bi, i + 1, edits).filter((f) => !gone(f.id)).reduce((s, f) => s + f.units.length, 0)).reduce((a, b) => a + b, 0);
  const propN = (p: Property) => p.blocks.reduce((n, _, bi) => n + blockN(p, bi), 0);
  const total = shown.reduce((n, x) => n + propN(x), 0);
  /* Under All units: how many properties and locations it spans (2026-11-27). */
  const nLoc = new Set(shown.map((x) => x.campus)).size;
  const allSub = `${shown.length} ${shown.length === 1 ? 'property' : 'properties'} · ${nLoc} ${nLoc === 1 ? 'location' : 'locations'}`;
  /* Under each property: where it is and what it's made of, e.g. "Durham City · 3 blocks" or "Queen's Campus · 8 houses". */
  const subOf = (p: Property, sh: Shape) => {
    const n = sh.house ? flatsOf(p, 0, 1, edits).filter((f) => !gone(f.id)).length : p.blocks.filter((_, bi) => !gone(`${p.id}|${bi}`)).length;
    return `${p.campus} · ${n} ${sh.house ? (n === 1 ? 'house' : 'houses') : n === 1 ? 'block' : 'blocks'}`;
  };

  const row = (depth: number, k: string, I: Icon | null, label: string, n: number | null, active: boolean, onClick: () => void, leaf = false, info?: () => void, /** A property's photo (or, for All units, a toned icon tile) in place of an icon; the row grows to 52px with a 32px picture (2026-11-27, was 44 and 28). */ img?: string | Icon, /** A second line under the label (a property's place and size, 2026-11-27). */ sub?: string) => (
    <div key={k} role="treeitem" aria-selected={active} aria-expanded={leaf ? undefined : !!open[k]} style={{ paddingLeft: 8 + depth * 12 }} onClick={onClick}
      className={cx('group shrink-0 flex items-center rounded-lg border pr-2', img ? 'h-[52px] gap-2.5' : 'h-9 gap-1.5', ' text-sm leading-5 cursor-pointer transition-colors',
        depth === 0 || active ? 'font-medium' : 'font-normal',
        active ? 'bg-white border-[#E5E5E5] shadow-[0_1px_2px_rgba(10,13,20,0.06)] text-ink' : 'border-transparent text-ink hover:bg-black/[0.03]')}>
      {img && typeof img !== 'string' ? null : leaf ? <span className="w-4 shrink-0" /> : (
        <button type="button" aria-label={open[k] ? `Collapse ${label}` : `Expand ${label}`} onClick={(e) => { e.stopPropagation(); tog(k); }}
          className="size-4 shrink-0 rounded flex items-center justify-center text-[#737373] hover:text-ink">
          {open[k] ? <CaretDown size={14} strokeWidth={1.5} /> : <CaretRight size={14} strokeWidth={1.5} />}
        </button>
      )}
      {typeof img === 'string' ? <img src={img} alt="" className="size-8 shrink-0 rounded-md object-cover bg-[#F5F5F5]" /> : img ? <IconTile icon={img} tone="blue" size={32} /> : null}
      {I && <I size={16} strokeWidth={1.5} className={cx('shrink-0', active ? 'text-[#2563EB]' : 'text-[#404040]')} />}
      {sub ? (
        <span className="flex-1 min-w-0 flex flex-col gap-0.5">
          <span className="truncate">{label}</span>
          <span className="truncate text-xs leading-4 font-normal text-[#737373]">{sub}</span>
        </span>
      ) : <span className="truncate flex-1">{label}</span>}
      {/* Blocks, floors and flats open their own panel, on hover or when it's the picked one. */}
      {info && (
        <button type="button" aria-label={`${label} details`} title="Details" onClick={(e) => { e.stopPropagation(); info(); }}
          className={cx('size-5 shrink-0 rounded flex items-center justify-center text-[#737373] hover:text-ink hover:bg-black/[0.05]', active ? 'opacity-100' : 'opacity-0 group-hover:opacity-100 focus-visible:opacity-100')}>
          <Info size={14} strokeWidth={1.5} />
        </button>
      )}
      {n != null && <span className={cx('font-mono text-xs tabular-nums', active ? 'text-[#737373]' : 'text-[#A3A3A3]')}>{n.toLocaleString('en-GB')}</span>}
    </div>
  );

  return (
    <aside aria-label="Properties" className="w-[296px] shrink-0 border-r border-[#E5E5E5] bg-white overflow-auto px-3 pt-3 pb-16 flex flex-col">
      <Menu align="left" width={240} trigger={(o) => (
        <button type="button" onClick={o} className="w-full h-9 shrink-0 px-2.5 rounded-lg border border-[#E5E5E5] bg-white shadow-[0_1px_2px_rgba(0,0,0,0.05)] flex items-center gap-2 text-sm font-medium text-ink hover:bg-[#FAFAFA]">
          <MapPin size={16} strokeWidth={1.5} className="text-[#404040] shrink-0" /><span className="flex-1 text-left truncate">{loc || 'All locations'}</span><CaretUpDown size={16} strokeWidth={1.5} className="text-[#737373]" />
        </button>
      )} items={[{ label: 'All locations', icon: MapPin, onClick: () => setLoc('') }, ...campuses.map((c) => ({ label: c, icon: MapPin, onClick: () => { setLoc(c); if (sel.pid !== all && props.find((x) => x.id === sel.pid)?.campus !== c) go({ pid: all, bi: null, floor: null, flat: null }); } }))]} />
      <div role="tree" aria-label="Properties" className="flex flex-col gap-0.5">
        <div className="h-9 shrink-0 px-2 pt-3.5 pb-1.5 flex items-center font-mono uppercase text-xs leading-4 font-medium tracking-[0.48px] text-[#737373]">Properties</div>
        {/* Going to All units folds the whole tree back up (2026-11-27). */}
        {row(0, 'all', null, 'All units', total, sel.pid === all, () => { setOpen({}); go({ pid: all, bi: null, floor: null, flat: null }); }, true, undefined, ListDashes, allSub)}
        <div role="separator" className="h-px shrink-0 my-1.5 mx-2 bg-[#E5E5E5]" />
        {shown.map((p) => {
          const sh = shapeOf(p, structures);
          const pActive = sel.pid === p.id && sel.bi == null;
          return (
            <div key={p.id} className="flex flex-col gap-0.5 mt-1 first-of-type:mt-0">
              {row(0, p.id, null, p.name, propN(p), pActive, () => { expand(p.id); go({ pid: p.id, bi: null, floor: null, flat: null }); }, false, undefined, photoOf(p.id), subOf(p, sh))}
              {/* A houses layout (House › Room): the houses sit straight under the property. */}
              {open[p.id] && sh.house && flatsOf(p, 0, 1, edits).filter((f) => !gone(f.id)).map((f) => {
                const fn = +f.id.split('|')[3];
                return row(1, f.id, levelIcon('House'), `House ${fn}`, f.units.length, sel.pid === p.id && sel.flat === fn, () => go({ pid: p.id, bi: 0, floor: 1, flat: fn }), true, () => onInfo({ pid: p.id, kind: 'Flat', bi: 0, floor: 1, flat: fn }));
              })}
              {open[p.id] && !sh.house && p.blocks.map((b, bi) => {
                const bk = `${p.id}|${bi}`;
                if (gone(bk)) return null;
                const bActive = sel.pid === p.id && sel.bi === bi && sel.floor == null;
                return (
                  <div key={bk} className="flex flex-col gap-0.5">
                    {row(1, bk, levelIcon('Building'), b.name, blockN(p, bi), bActive, () => { expand(p.id, bk); go({ pid: p.id, bi, floor: null, flat: null }); }, false, () => onInfo({ pid: p.id, kind: 'Block', bi, floor: 1 }))}
                    {open[bk] && Array.from({ length: b.floors }, (_, i) => {
                      const fk = `${bk}|${i + 1}`;
                      if (gone(fk)) return null;
                      const isFloor = sel.pid === p.id && sel.bi === bi && sel.floor === i + 1;
                      const fl = flatsOf(p, bi, i + 1, edits).filter((f) => !gone(f.id));
                      const n = fl.reduce((s, f) => s + f.units.length, 0);
                      return (
                        <div key={fk} className="flex flex-col gap-0.5">
                          {row(2, fk, levelIcon('Floor'), `Floor ${i + 1}`, n, isFloor && sel.flat == null, () => { if (sh.flats) expand(fk); go({ pid: p.id, bi, floor: i + 1, flat: null }); }, !sh.flats, () => onInfo({ pid: p.id, kind: 'Floor', bi, floor: i + 1 }))}
                          {open[fk] && sh.flats && fl.map((f) => {
                            const fn = +f.id.split('|')[3];
                            return row(3, f.id, levelIcon('Flat'), f.name, f.units.length, isFloor && sel.flat === fn, () => go({ pid: p.id, bi, floor: i + 1, flat: fn }), true, () => onInfo({ pid: p.id, kind: 'Flat', bi, floor: i + 1, flat: fn }));
                          })}
                        </div>
                      );
                    })}
                  </div>
                );
              })}
            </div>
          );
        })}
      </div>
    </aside>
  );
}
