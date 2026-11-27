/* Database-style table controls (2026-11-26), reusable by any table: a column header menu (sort, filter, hide), a
   Columns popover (show, hide and reorder) and a Group by picker. Each is controlled; the table owns the state. */
import { useState, type KeyboardEvent } from 'react';
import { ArrowDown, ArrowUp, CaretDown, Check, ColumnsIcon, DotsSixVertical, Eye, EyeSlash, Funnel, GroupRows, X } from '../../components/icons';
import { cx } from '../../components/ui';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '../../components/shadcn/dropdown-menu';
import { Popover, PopoverContent, PopoverTrigger } from '../../components/shadcn/popover';

export type SortState = { col: string; dir: 'asc' | 'desc' } | null;

/** A header cell's label as a button: it opens Sort ascending / descending (when the column sorts), Filter (when the
 *  column has a filter) and Hide (when the column can be hidden). A sorted column shows its arrow after the label. */
export function ColumnHead({ label, col, sort, onSort, onFilter, onHide, filtered, onClearFilter }: {
  label: string; col: string; sort: SortState; onSort?: (s: SortState) => void; onFilter?: () => void; onHide?: () => void;
  /** The column's filter is applied (2026-11-27): a blue 6px dot after the label (as on the Filter button), and the menu offers Edit / Clear filter. */ filtered?: boolean; onClearFilter?: () => void;
}) {
  const on = sort?.col === col ? sort.dir : null;
  return (
    <DropdownMenu modal={false}>
      <DropdownMenuTrigger asChild>
        <button type="button" className="group/ch -mx-1.5 max-w-[calc(100%+12px)] h-7 px-1.5 rounded-md inline-flex [text-transform:inherit] [letter-spacing:inherit] [font:inherit] items-center gap-1 text-left hover:bg-[#EBEBEB] data-[state=open]:bg-[#EBEBEB] outline-none focus-visible:ring-2 focus-visible:ring-ring">
          <span className="min-w-0 truncate">{label}</span>
          {filtered && <span role="img" aria-label="Filtered" className="shrink-0 size-1.5 rounded-full bg-[#2563EB]" />}
          {on === 'asc' ? <ArrowUp size={12} className="shrink-0 text-ink" /> : on === 'desc' ? <ArrowDown size={12} className="shrink-0 text-ink" />
            : <CaretDown size={12} className="shrink-0 opacity-0 group-hover/ch:opacity-100 group-data-[state=open]/ch:opacity-100 text-[#737373]" />}
        </button>
      </DropdownMenuTrigger>
      {/* No focus back to the header on close: it would land outside the Filter panel this menu opens and shut it. */}
      <DropdownMenuContent align="start" style={{ width: 200 }} onCloseAutoFocus={(e) => e.preventDefault()}>
        {onSort && <>
          <DropdownMenuItem className="px-2.5" onSelect={() => onSort(on === 'asc' ? null : { col, dir: 'asc' })}><ArrowUp size={16} />Sort ascending{on === 'asc' && <Check size={14} className="ml-auto text-primary" />}</DropdownMenuItem>
          <DropdownMenuItem className="px-2.5" onSelect={() => onSort(on === 'desc' ? null : { col, dir: 'desc' })}><ArrowDown size={16} />Sort descending{on === 'desc' && <Check size={14} className="ml-auto text-primary" />}</DropdownMenuItem>
        </>}
        {/* A rule between sorting and filtering (2026-11-27). */}
        {onSort && onFilter && <DropdownMenuSeparator />}
        {onFilter && <DropdownMenuItem className="px-2.5" onSelect={() => setTimeout(onFilter, 60)}><Funnel size={16} />{filtered ? 'Edit filter' : 'Filter'}</DropdownMenuItem>}
        {filtered && onClearFilter && <DropdownMenuItem className="px-2.5" onSelect={onClearFilter}><X size={16} />Clear filter</DropdownMenuItem>}
        {onHide && <>{(onSort || onFilter) && <DropdownMenuSeparator />}<DropdownMenuItem className="px-2.5" onSelect={onHide}><EyeSlash size={16} />Hide column</DropdownMenuItem></>}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

const TOOL = 'shrink-0 h-8 px-3 rounded-lg border border-[#E5E5E5] bg-white text-sm font-medium text-[#404040] flex items-center gap-1.5 shadow-[0_1px_2px_rgba(0,0,0,0.03)] hover:bg-[#F5F5F5] data-[state=open]:bg-[#F5F5F5] transition-colors outline-none focus-visible:ring-2 focus-visible:ring-ring';
const CAP = 'px-3 pt-1 pb-1 text-[11px] font-medium text-gray-400';

/** Columns: the shown columns in order, each with a drag handle and a switch; hidden ones below, switch off.
 *  Dragging a shown row moves its column. `options` is every column that can be shown, `value` the shown ones in order. */
export function ColumnsMenu({ options, value, onChange }: { options: { id: string; label: string; group?: string }[]; value: string[]; onChange: (v: string[]) => void }) {
  /* Same picker as every other table (components/columns.tsx, 2026-11-27): one list, a handle to drag (or ↑ ↓ on it),
     the name, and an eye to show or hide. Shown columns come first in their order; hidden ones follow, greyed. */
  const [drag, setDrag] = useState<string | null>(null);
  const [over, setOver] = useState<string | null>(null);
  const shown = value.filter((id) => options.some((o) => o.id === id));
  const hidden = options.filter((o) => !shown.includes(o.id));
  const list = [...shown.map((id) => options.find((o) => o.id === id)!), ...hidden];
  const move = (from: string, to: number) => {
    const next = shown.filter((k) => k !== from);
    next.splice(Math.max(0, Math.min(to, next.length)), 0, from);
    onChange(next);
  };
  const onKey = (e: KeyboardEvent, k: string) => {
    const i = shown.indexOf(k);
    if (e.key === 'ArrowUp' && i > 0) { e.preventDefault(); move(k, i - 1); requestAnimationFrame(() => document.getElementById(`ucolgrip-${k}`)?.focus()); }
    if (e.key === 'ArrowDown' && i < shown.length - 1) { e.preventDefault(); move(k, i + 1); requestAnimationFrame(() => document.getElementById(`ucolgrip-${k}`)?.focus()); }
  };
  const changed = shown.length !== options.length;
  return (
    <Popover>
      <PopoverTrigger asChild>
        <button type="button" className={TOOL}><ColumnsIcon size={16} strokeWidth={1.75} />Columns</button>
      </PopoverTrigger>
      <PopoverContent align="end" className="p-0 overflow-hidden" style={{ width: 264 }}>
        <div className="h-10 px-3 flex items-center justify-between border-b border-[#E5E5E5]">
          <span className="font-mono text-[11px] leading-4 font-medium uppercase tracking-[0.04em] text-[#737373]">Columns</span>
          {changed && <button type="button" onClick={() => onChange([...shown, ...hidden.map((o) => o.id)])} className="-mx-1.5 h-6 px-1.5 rounded-md text-sm font-medium text-primary hover:bg-[#EFF6FF]">Show all</button>}
        </div>
        <div className="p-1.5 max-h-[420px] overflow-y-auto">
          <ul onDragLeave={() => setOver(null)}>
            {list.map((o) => {
              const off = !shown.includes(o.id);
              return (
                <li key={o.id} draggable={!off}
                  onDragStart={(e) => { setDrag(o.id); e.dataTransfer.effectAllowed = 'move'; }}
                  onDragEnd={() => { setDrag(null); setOver(null); }}
                  onDragOver={(e) => { if (off || !drag) return; e.preventDefault(); if (over !== o.id) setOver(o.id); }}
                  onDrop={(e) => { e.preventDefault(); if (drag && drag !== o.id && !off) move(drag, shown.indexOf(o.id)); setDrag(null); setOver(null); }}
                  className={cx('h-9 px-2 rounded-md flex items-center gap-2 text-sm group/col hover:bg-[#F5F5F5]', drag === o.id && 'opacity-40', 'relative')}>
                  {/* The drop line: a square-ended 2px bar across the row's top, not an inset shadow that follows the rounded corners (2026-11-27). */}
                  {over === o.id && drag && drag !== o.id && <span aria-hidden className="pointer-events-none absolute inset-x-0 -top-px h-0.5 bg-[#2563EB]" />}
                  <button type="button" id={`ucolgrip-${o.id}`} disabled={off} aria-label={`Move ${o.label}`} title={off ? undefined : 'Drag, or use ↑ ↓'} onKeyDown={(e) => onKey(e, o.id)}
                    className="w-4 h-6 shrink-0 -ml-0.5 rounded flex items-center justify-center text-[#A3A3A3] cursor-grab active:cursor-grabbing group-hover/col:text-[#525252] disabled:cursor-default disabled:text-[#E5E5E5] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2563EB]/30">
                    <DotsSixVertical size={14} strokeWidth={1.75} />
                  </button>
                  <span className={cx('flex-1 truncate', off ? 'text-[#A3A3A3]' : 'text-[#0A0A0A]')}>{o.label}</span>
                  {o.group && <span className="shrink-0 font-mono text-[11px] uppercase tracking-wide text-[#A3A3A3]">{o.group}</span>}
                  <button type="button" aria-label={off ? `Show ${o.label}` : `Hide ${o.label}`} aria-pressed={!off} onClick={() => onChange(off ? [...shown, o.id] : shown.filter((x) => x !== o.id))}
                    className={cx('size-6 shrink-0 rounded-md flex items-center justify-center hover:bg-black/[0.05] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2563EB]/30', off ? 'text-[#A3A3A3]' : 'text-[#525252]')}>
                    {off ? <EyeSlash size={16} strokeWidth={1.5} /> : <Eye size={16} strokeWidth={1.5} />}
                  </button>
                </li>
              );
            })}
          </ul>
        </div>
      </PopoverContent>
    </Popover>
  );
}

/** Group by: None (the table's own layout) or one field; the button names the field while one is picked. */
export function GroupByMenu({ options, value, onChange, none = 'None', title = 'Group units by', compact }: { options: { id: string; label: string; group?: string }[]; value: string | null; onChange: (v: string | null) => void; none?: string; title?: string;
  /** Icon only (32px square) when a side panel squeezes the toolbar; the dot still marks a picked grouping. */ compact?: boolean }) {
  const [open, setOpen] = useState(false);
  const cur = options.find((o) => o.id === value);
  const groups = [...new Set(options.map((o) => o.group ?? ''))];
  const pick = (v: string | null) => { onChange(v); setOpen(false); };
  const row = (id: string | null, label: string) => (
    <button key={id ?? '-'} type="button" onClick={() => pick(id)} className="w-[calc(100%-16px)] mx-2 h-8 px-2 rounded-md hover:bg-[#F5F5F5] flex items-center gap-2 text-sm text-ink">
      <span className="flex-1 min-w-0 truncate text-left">{label}</span>{value === id && <Check size={14} className="shrink-0 text-primary" />}
    </button>
  );
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button type="button" aria-label={compact ? (cur ? `Group: ${cur.label}` : 'Group') : undefined} title={compact ? (cur ? `Group: ${cur.label}` : 'Group') : undefined} className={compact ? `${TOOL} !w-8 !px-0 justify-center` : TOOL}>
          <span className="relative flex"><GroupRows size={16} strokeWidth={1.75} />{cur && <span aria-hidden className="absolute -top-0.5 -right-0.5 size-1.5 rounded-full bg-[#2563EB] ring-2 ring-white" />}</span>
          {!compact && (cur ? <span className="max-w-[160px] truncate">Group: {cur.label}</span> : 'Group')}
        </button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-[240px] p-0 rounded-[10px] overflow-hidden">
        <div className="py-2 max-h-[420px] overflow-auto">
          <div className={CAP}>{title}</div>
          {row(null, none)}
          {groups.map((g) => (
            <div key={g} className={g ? 'mt-1' : undefined}>
              {g && <div className={CAP}>{g}</div>}
              {options.filter((o) => (o.group ?? '') === g).map((o) => row(o.id, o.label))}
            </div>
          ))}
        </div>
      </PopoverContent>
    </Popover>
  );
}
