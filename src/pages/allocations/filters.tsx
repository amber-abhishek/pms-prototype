import { useMemo, useState } from 'react';
import { AirplaneLanding, ArrowLeft, Buildings, CalendarBlank, CaretRight, Check, Clock, Funnel, GraduationCap, MagnifyingGlass, ShieldCheck, Wallet, Wheelchair, X, type Icon } from '../../components/icons';
import { Button, Dropdown, FilterIcon, cx } from '../../components/ui';
import { Checkbox } from '../../components/shadcn/checkbox';
import { HALLS, hallFull, type App } from '../../data/allocations';
import { Pop } from './common';

/* The application queue's filter (Flow 1): active filters first, each with ×, then every field grouped by where it comes from.
   Number fields take more than / less than / between; one-answer fields are a single choice; the rest tick several. */

export type FV = { op?: 'more' | 'less' | 'between'; n?: number; n2?: number; v?: string; vs?: string[] };
export type Filters = { vals: Record<string, FV>; order: string[] };
type Field = { id: string; label: string; group: 'Application' | 'Applicant' | 'Rooms'; kind: 'number' | 'single' | 'multi'; icon: Icon; options?: string[]; get?: (a: App) => string | string[]; search?: boolean; hint?: string };

export function fieldsFor(cycles: string[]): Field[] {
  return [
    { id: 'wait', label: 'Waiting time', group: 'Application', kind: 'number', icon: Clock },
    { id: 'year', label: 'Year of study', group: 'Application', kind: 'single', icon: GraduationCap, options: ['First year', 'Returning', 'Postgraduate'], get: (a) => a.year },
    { id: 'cycle', label: 'Cycle', group: 'Application', kind: 'single', icon: CalendarBlank, options: cycles, get: (a) => a.cycle },
    { id: 'fee', label: 'Fee status', group: 'Applicant', kind: 'single', icon: Wallet, options: ['Home', 'International'], get: (a) => a.fee },
    { id: 'guarantee', label: 'Guarantee', group: 'Applicant', kind: 'single', icon: ShieldCheck, options: ['Guaranteed', 'Not guaranteed'], get: (a) => (a.guarantee ? 'Guaranteed' : 'Not guaranteed') },
    { id: 'arrival', label: 'Arrival date', group: 'Applicant', kind: 'single', icon: AirplaneLanding, options: ['19 Sep 2027', '20 Sep 2027'], get: (a) => a.arrival },
    { id: 'halls', label: 'Hall preference', group: 'Rooms', kind: 'multi', icon: Buildings, options: HALLS.map((h) => hallFull[h]), get: (a) => a.prefs.map((p) => hallFull[p[0]]), search: true },
    { id: 'reqs', label: 'Requirement', group: 'Rooms', kind: 'multi', icon: Wheelchair, options: ['Step-free access', 'Medication fridge', 'Year-round stay'], get: (a) => a.reqs.filter((r) => !a.toCheck?.includes(r)), hint: 'Only requirements Disability Support has verified' },
  ];
}

export function matches(a: App, f: Field, v: FV) {
  if (f.kind === 'number') {
    const n = v.n ?? 0;
    return v.op === 'less' ? a.waiting < n : v.op === 'between' ? a.waiting >= n && a.waiting <= (v.n2 ?? n) : a.waiting > n;
  }
  const got = f.get!(a);
  if (f.kind === 'single') return got === v.v;
  const arr = Array.isArray(got) ? got : [got];
  return !(v.vs?.length) || v.vs.some((x) => arr.includes(x));
}
export function applyFilters(rows: App[], fs: Filters, fields: Field[], except?: string) {
  return rows.filter((a) => Object.entries(fs.vals).every(([k, v]) => k === except || matches(a, fields.find((f) => f.id === k)!, v)));
}
export function describe(f: Field, v: FV) {
  if (f.kind === 'number') return `Waiting ${v.op === 'less' ? 'less than' : v.op === 'between' ? `between ${v.n} and` : 'more than'} ${v.op === 'between' ? v.n2 : v.n} days`;
  if (f.kind === 'single') return `${f.label} is ${v.v}`;
  const vs = v.vs ?? [];
  return `${f.label} is ${vs.length > 2 ? `${vs[0]} +${vs.length - 1}` : vs.map((x) => x.replace(/ College$/, '')).join(', ')}`;
}

export function FilterPanel({ rows, fs, setFs, fields }: { rows: App[]; fs: Filters; setFs: (f: Filters) => void; fields: Field[] }) {
  const n = fs.order.length;
  return (
    <Pop width={300} button={(open, t) => (
      <Button variant="control" onClick={t} className={cx(open && 'bg-gray-50')}>
        <FilterIcon on={n > 0} size={16} icon={Funnel} />
        Filter{n > 0 && <span className="sr-only">, {n} applied</span>}
      </Button>
    )}>
      {(close) => <Panel rows={rows} fs={fs} setFs={setFs} fields={fields} close={close} />}
    </Pop>
  );
}

function Panel({ rows, fs, setFs, fields, close }: { rows: App[]; fs: Filters; setFs: (f: Filters) => void; fields: Field[]; close: () => void }) {
  const [edit, setEdit] = useState<string | null>(null);
  const [q, setQ] = useState('');
  const field = fields.find((f) => f.id === edit);
  const remove = (id: string) => { const vals = { ...fs.vals }; delete vals[id]; setFs({ vals, order: fs.order.filter((o) => o !== id) }); };
  if (field) return <Editor field={field} rows={rows} fs={fs} fields={fields} fromActive={fs.order.includes(field.id)} onBack={() => setEdit(null)} onApply={(v) => { setFs({ vals: { ...fs.vals, [field.id]: v }, order: fs.order.includes(field.id) ? fs.order : [...fs.order, field.id] }); setEdit(null); close(); }} />;
  const groups = (['Application', 'Applicant', 'Rooms'] as const).map((g) => ({ g, items: fields.filter((f) => f.group === g && f.label.toLowerCase().includes(q.toLowerCase())) })).filter((x) => x.items.length);
  return (
    <div className="py-2 max-h-[520px] overflow-auto">
      <div className="px-3 pb-1 text-[11px] font-medium text-gray-400">Active filters</div>
      {fs.order.length === 0 && <div className="px-3 py-1.5 text-sm text-gray-400">None · showing every cycle</div>}
      {fs.order.map((id) => {
        const f = fields.find((x) => x.id === id)!;
        return (
          <div key={id} className="mx-2 flex items-center gap-2 h-8 px-2 rounded-md hover:bg-[#F3F4F6] group">
            <button type="button" className="flex-1 text-left text-sm text-ink truncate flex items-center gap-2" onClick={() => setEdit(id)}><f.icon size={16} className="text-gray-500" />{describe(f, fs.vals[id])}</button>
            <button type="button" aria-label={`Remove ${f.label}`} onClick={() => remove(id)} className="size-6 rounded hover:bg-gray-200 flex items-center justify-center text-gray-500"><X size={12} /></button>
          </div>
        );
      })}
      <div className="border-t border-[#F3F4F6] my-2" />
      <label className="mx-3 h-8 flex items-center gap-2 px-2 rounded-lg border border-line text-sm">
        <MagnifyingGlass size={14} className="text-gray-400" />
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Filter by…" className="flex-1 outline-none bg-transparent placeholder:text-gray-400" />
      </label>
      {groups.map(({ g, items }) => (
        <div key={g} className="mt-2">
          <div className="px-3 py-1 text-[11px] font-medium text-gray-400">{g === 'Application' ? 'Add a filter · Application' : g}</div>
          {items.map((f) => (
            <button key={f.id} type="button" onClick={() => setEdit(f.id)} className="w-[calc(100%-16px)] mx-2 h-8 px-2 rounded-md hover:bg-[#F3F4F6] flex items-center gap-2 text-sm text-ink">
              <f.icon size={16} className="text-gray-500" />{f.label}{fs.order.includes(f.id) ? <Check size={14} className="ml-auto text-primary" /> : <CaretRight size={12} className="ml-auto text-gray-400" />}
            </button>
          ))}
        </div>
      ))}
    </div>
  );
}

function Editor({ field, rows, fs, fields, fromActive, onBack, onApply }: { field: Field; rows: App[]; fs: Filters; fields: Field[]; fromActive: boolean; onBack: () => void; onApply: (v: FV) => void }) {
  const cur = fs.vals[field.id];
  const [op, setOp] = useState<FV['op']>(cur?.op ?? 'more');
  const [n, setN] = useState(String(cur?.n ?? 5));
  const [n2, setN2] = useState(String(cur?.n2 ?? 10));
  const [v, setV] = useState(cur?.v ?? '');
  const [vs, setVs] = useState<string[]>(cur?.vs ?? []);
  const [q, setQ] = useState('');
  const base = useMemo(() => applyFilters(rows, fs, fields, field.id), [rows, fs, fields, field.id]);
  const count = (o: string) => base.filter((a) => matches(a, field, field.kind === 'single' ? { v: o } : { vs: [o] })).length;
  const draft: FV = field.kind === 'number' ? { op, n: +n || 0, n2: +n2 || 0 } : field.kind === 'single' ? { v } : { vs };
  const left = base.filter((a) => matches(a, field, draft)).length;
  return (
    <div>
      <div className="h-11 px-3 flex items-center gap-2 border-b border-[#F3F4F6] text-sm">
        <button type="button" aria-label="Back" onClick={onBack} className="size-6 rounded hover:bg-gray-100 flex items-center justify-center text-gray-500"><ArrowLeft size={13} /></button>
        {fromActive && <span className="text-gray-500">Active filters /</span>}
        <field.icon size={16} className="text-gray-500" /><span className="font-medium">{field.label}</span>
      </div>
      {field.kind === 'number' && (
        <div className="p-3 space-y-2">
          <Dropdown value={op ?? 'more'} onChange={(v) => setOp(v as FV['op'])} ariaLabel="Comparison" className="h-8 border-gray-300"
            options={[{ value: 'more', label: 'more than' }, { value: 'less', label: 'less than' }, { value: 'between', label: 'between' }]} />
          <div className="flex items-center gap-2 text-sm text-gray-500">
            <input autoComplete="off" inputMode="numeric" aria-label="Days" value={n} onChange={(e) => setN(e.target.value.replace(/\D/g, ''))} className="w-20 h-8 rounded-lg border border-gray-300 px-2 text-ink outline-none focus:border-primary focus:ring-2 focus:ring-primary/25" />
            {op === 'between' && <>and<input inputMode="numeric" aria-label="Up to days" value={n2} onChange={(e) => setN2(e.target.value.replace(/\D/g, ''))} className="w-20 h-8 rounded-lg border border-gray-300 px-2 text-ink outline-none" /></>}
            days
          </div>
        </div>
      )}
      {field.kind !== 'number' && (
        <div className="py-2 max-h-[300px] overflow-auto">
          {field.search && (
            <label className="mx-3 mb-1 h-8 flex items-center gap-2 px-2 rounded-lg border border-line text-sm">
              <MagnifyingGlass size={14} className="text-gray-400" /><input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search halls" className="flex-1 outline-none bg-transparent placeholder:text-gray-400" />
            </label>
          )}
          {field.options!.filter((o) => o.toLowerCase().includes(q.toLowerCase())).map((o) => (
            <label key={o} className="mx-2 h-8 px-2 rounded-md hover:bg-[#F3F4F6] flex items-center gap-2.5 text-sm cursor-pointer">
              {field.kind === 'single'
                ? <input type="radio" name={field.id} checked={v === o} onChange={() => setV(o)} className="size-4 rounded accent-primary" />
                : <Checkbox checked={vs.includes(o)} onCheckedChange={(v) => setVs((v === true) ? [...vs, o] : vs.filter((x) => x !== o))} />}
              <span className="flex-1">{o}</span><span className="text-xs text-gray-400 tabular-nums">{count(o)}</span>
            </label>
          ))}
          {field.hint && <div className="px-4 pt-1 text-xs text-gray-500">{field.hint}</div>}
        </div>
      )}
      <div className="h-12 px-3 flex items-center gap-2 border-t border-[#F3F4F6]">
        <span className="text-xs text-gray-500">
          {field.kind === 'multi' ? `${vs.length} selected · ${left} match` : field.kind === 'single' ? (v ? (left ? `${left} match` : 'None match') : 'Pick one') : `${left} match`}
        </span>
        <div className="ml-auto flex gap-1.5">
          {field.kind === 'number' && <Button size="sm" onClick={onBack}>Cancel</Button>}
          <Button size="sm" variant="primary" disabled={field.kind === 'single' ? !v : field.kind === 'multi' ? !vs.length : !n} onClick={() => onApply(draft)}>Apply</Button>
        </div>
      </div>
    </div>
  );
}
