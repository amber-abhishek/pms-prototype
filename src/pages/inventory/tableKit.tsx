/* Database-style table controls (2026-11-26), reusable by any table: a column header menu (sort, filter, hide), a
   Columns popover (show, hide and reorder) and a Group by picker. Each is controlled; the table owns the state. */
import { useRef, useState } from 'react';
import { ArrowDown, ArrowUp, CaretDown, Check, ColumnsIcon, DotsSixVertical, EyeSlash, Funnel, GroupRows } from '../../components/icons';
import { Switch, cx } from '../../components/ui';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '../../components/shadcn/dropdown-menu';
import { Popover, PopoverContent, PopoverTrigger } from '../../components/shadcn/popover';

export type SortState = { col: string; dir: 'asc' | 'desc' } | null;

/** A header cell's label as a button: it opens Sort ascending / descending (when the column sorts), Filter (when the
 *  column has a filter) and Hide (when the column can be hidden). A sorted column shows its arrow after the label. */
export function ColumnHead({ label, col, sort, onSort, onFilter, onHide }: {
  label: string; col: string; sort: SortState; onSort?: (s: SortState) => void; onFilter?: () => void; onHide?: () => void;
}) {
  const on = sort?.col === col ? sort.dir : null;
  return (
    <DropdownMenu modal={false}>
      <DropdownMenuTrigger asChild>
        <button type="button" className="group/ch -mx-1.5 max-w-[calc(100%+12px)] h-7 px-1.5 rounded-md inline-flex [text-transform:inherit] [letter-spacing:inherit] [font:inherit] items-center gap-1 text-left hover:bg-[#EBEBEB] data-[state=open]:bg-[#EBEBEB] outline-none focus-visible:ring-2 focus-visible:ring-ring">
          <span className="min-w-0 truncate">{label}</span>
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
        {onFilter && <DropdownMenuItem className="px-2.5" onSelect={() => setTimeout(onFilter, 60)}><Funnel size={16} />Filter</DropdownMenuItem>}
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
  const [drag, setDrag] = useState<string | null>(null);
  const [over, setOver] = useState<string | null>(null);
  const lab = (id: string) => options.find((o) => o.id === id)?.label ?? id;
  const shown = value.filter((id) => options.some((o) => o.id === id));
  const hidden = options.filter((o) => !shown.includes(o.id));
  const overRef = useRef<string | null>(null);
  overRef.current = over;
  const start = (id: string) => {
    setDrag(id); setOver(null);
    const up = () => { window.removeEventListener('pointerup', up); const t = overRef.current; if (t) dropOn(id, t); setDrag(null); setOver(null); };
    window.addEventListener('pointerup', up);
  };
  const dropOn = (drag: string, target: string) => {
    if (drag === target) return;
    const v = shown.filter((x) => x !== drag);
    v.splice(v.indexOf(target) + (shown.indexOf(drag) < shown.indexOf(target) ? 1 : 0), 0, drag);
    onChange(v);
  };
  return (
    <Popover>
      <PopoverTrigger asChild>
        <button type="button" className={TOOL}><ColumnsIcon size={16} strokeWidth={1.75} />Columns</button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-[280px] p-0 rounded-[10px] overflow-hidden">
        <div className="py-2 max-h-[480px] overflow-auto">
          <div className={cx(CAP, 'flex items-center')}>Shown<button type="button" onClick={() => onChange([])} className="ml-auto text-[11px] text-primary hover:underline disabled:opacity-40" disabled={!shown.length}>Hide all</button></div>
          {shown.map((id) => (
            <div key={id} onPointerEnter={() => drag && setOver(id)}
              className={cx('mx-2 h-8 px-1.5 rounded-md flex items-center gap-2 text-sm text-ink hover:bg-[#F5F5F5] select-none', drag === id && 'opacity-40', over === id && drag && drag !== id && 'ring-1 ring-primary/40 bg-[#EFF6FF]')}>
              {/* Press the handle and move over another row to drop the column there; release ends it. */}
              <span aria-hidden onPointerDown={(e) => { e.preventDefault(); start(id); }} className="cursor-grab active:cursor-grabbing text-[#A3A3A3] hover:text-[#525252] touch-none"><DotsSixVertical size={14} /></span>
              <span className="flex-1 min-w-0 truncate">{lab(id)}</span>
              <Switch label={`Show ${lab(id)}`} checked onChange={() => onChange(shown.filter((x) => x !== id))} />
            </div>
          ))}
          {!shown.length && <div className="px-3 py-1.5 text-sm text-gray-400">Only Unit is shown</div>}
          {hidden.length > 0 && <>
            <div className="border-t border-[#F5F5F5] my-2" />
            <div className={cx(CAP, 'flex items-center')}>Hidden<button type="button" onClick={() => onChange([...shown, ...hidden.map((o) => o.id)])} className="ml-auto text-[11px] text-primary hover:underline">Show all</button></div>
            {hidden.map((o) => (
              <div key={o.id} className="mx-2 h-8 px-1.5 pl-[30px] rounded-md flex items-center gap-2 text-sm text-[#525252] hover:bg-[#F5F5F5]">
                <span className="flex-1 min-w-0 truncate">{o.label}</span>
                {o.group && <span className="shrink-0 font-mono text-[11px] uppercase tracking-wide text-[#A3A3A3]">{o.group}</span>}
                <Switch label={`Show ${o.label}`} checked={false} onChange={() => onChange([...shown, o.id])} />
              </div>
            ))}
          </>}
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
