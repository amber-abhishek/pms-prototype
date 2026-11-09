import { useEffect, useMemo, useRef, useState } from 'react';
import { Empty } from '../../components/ui';
import { toast } from 'sonner';
import { Buildings, CalendarBlank, CurrencyGbp, Globe, Info, PencilSimple, Plus, Receipt, Tag as TagIcon, Warning } from '../../components/icons';
import { Button, Field, Input, PageHeader, Sheet, SheetSection, Switch, Table, Tabs, cx, listNav, type SheetNav, PageHeading } from '../../components/ui';
import { invId, money, useInv, type Fee, type FeeType, type Template } from '../../data/inventory';
import { useTab } from '../hooks';
import { Modal, MoneyInput, Picker, PropStatus, RadioCard, Seg } from './common';

type TabId = 'templates' | 'fees';

export function RentFeesPage() {
  const [tab, setTab] = useTab<TabId>('templates');
  const allProps = useInv((s) => s.properties);
  const props = useMemo(() => allProps.filter((p) => p.status !== 'Archived'), [allProps]);
  const allTpl = useInv((s) => s.templates);
  const fees = useInv((s) => s.fees);
  const feeTypes = useInv((s) => s.feeTypes);
  const [pid, setPid] = useState('col');
  const [editing, setEditing] = useState<Template | null>(null);
  const [adding, setAdding] = useState(false);
  const [typesOpen, setTypesOpen] = useState(false);
  const [fresh, setFresh] = useState<string | null>(null);
  const p = props.find((x) => x.id === pid);
  const tpls = allTpl.filter((t) => t.propertyId === pid);
  const pname = (id: string | null) => (id ? props.find((x) => x.id === id)?.name ?? '—' : 'Organisation-wide');

  return (
    <>
      <PageHeader icon={CurrencyGbp} title="Rent and fees" crumbs={['Inventory']}>
        {tab === 'templates' ? <Button variant="primary" icon={Plus} onClick={() => newTemplate()}>New template</Button> : (
          <><Button icon={TagIcon} onClick={() => setTypesOpen(true)}>Fee types</Button><Button variant="primary" icon={Plus} onClick={() => setAdding(true)}>Add fee</Button></>
        )}
      </PageHeader>
      <PageHeading right={tab === 'templates' && <div className="w-64"><Picker value={pid} onChange={setPid} icon={Buildings} options={props.map((x) => ({ id: x.id, label: x.name }))} /></div>} />
      <div className="shrink-0 px-[var(--tx,16px)] pb-2 flex items-center gap-2 empty:hidden">
        <Tabs value={tab} onChange={setTab} tabs={[{ id: 'templates', label: 'Tenancy templates', count: tpls.length }, { id: 'fees', label: 'Fees', count: fees.length }]} />
      </div>
      {tab === 'templates' ? (
        <Table rows={tpls} onRow={setEditing} selected={editing?.id}
          cols={[
            { key: 'n', label: 'Template', render: (t) => <span className="font-medium">{t.name}</span> },
            { key: 'l', label: 'Length', render: (t) => <span className="text-[#646A78]">{p?.letting === 'Monthly' ? `${Math.round(t.weeks * 12 / 52)} months` : `${t.weeks} weeks`}</span> },
            { key: 'r', label: 'Rent', className: 'text-right', render: (t) => <span className="tabular-nums">{p?.letting === 'Monthly' ? `${money(Math.round(t.rent * 52 / 12 * 100) / 100, true)} / mo` : `${money(t.rent)} / wk`}</span> },
            { key: 'd', label: 'Deposit', className: 'text-right', render: (t) => money(t.deposit) },
            { key: 'b', label: 'Billing', render: (t) => <span className="text-[#646A78]">{t.billing}</span> },
            { key: 'k', label: 'Linked tenancies', className: 'text-right', render: (t) => <span className="tabular-nums">{t.linked}{t.own ? <span className="text-[#646A78]"> · {t.own} on own</span> : ''}</span> },
            { key: 's', label: 'Status', className: 'pl-6', render: (t) => <PropStatus s={t.status} /> },
            { key: 'e', label: '', className: 'w-16 text-right', render: (t) => <button type="button" onClick={(e) => { e.stopPropagation(); setEditing(t); }} className="h-7 px-2.5 rounded-full border border-transparent text-xs font-medium text-[#111827] hover:bg-[#F3F4F6] hover:border-[#E5E7EB]">Edit</button> },
          ]}
          empty={!p ? <Empty title="No properties yet" sub="Tenancy templates belong to a property. Add one first." /> : <div className="p-10 text-center text-sm text-[#646A78]">No templates for {p?.name}. <button type="button" className="text-primary" onClick={() => newTemplate()}>Make one</button></div>} />
      ) : (
        <Table rows={fees} selected={fresh ?? undefined}
          cols={[
            { key: 'f', label: 'Fee', render: (f) => <span className="flex items-center gap-2"><Receipt size={16} className="text-gray-500" /><span className="font-medium">{feeTypes.find((t) => t.id === f.typeId)?.name}</span></span> },
            { key: 'c', label: 'Calculation', render: (f) => <span className="text-[#646A78]">{feeTypes.find((t) => t.id === f.typeId)?.calc}</span> },
            { key: 'a', label: 'Amount', className: 'text-right', render: (f) => <span className="tabular-nums">{f.amount}</span> },
            { key: 'p', label: 'Applies to', className: 'pl-6', render: (f) => <span className="flex items-center gap-1.5">{f.appliesTo ? <Buildings size={14} className="text-gray-400" /> : <Globe size={14} className="text-gray-400" />}{pname(f.appliesTo)}</span> },
            { key: 'o', label: 'Charged on', render: (f) => <span className="text-[#646A78]">{f.chargedOn}</span> },
            { key: 'r', label: 'Refundable', render: (f) => (feeTypes.find((t) => t.id === f.typeId)?.refundable ? 'Yes' : 'No') },
            { key: 'm', label: 'Mandatory', render: (f) => (feeTypes.find((t) => t.id === f.typeId)?.mandatory ? 'Yes' : 'No') },
          ]} />
      )}
      <TemplateSheet key={editing?.id} t={editing} nav={listNav(tpls, (x) => x.id === editing?.id, (x) => setEditing(x))} onClose={() => setEditing(null)} />
      <AddFeeDialog open={adding} onClose={() => setAdding(false)} onAdded={(id) => { setFresh(id); window.setTimeout(() => setFresh(null), 4000); }} />
      <FeeTypesSheet open={typesOpen} onClose={() => setTypesOpen(false)} types={feeTypes} />
    </>
  );

  function newTemplate() {
    const t: Template = { id: invId('tp'), propertyId: pid, name: 'New template', weeks: 44, rent: 170, deposit: 250, billing: 'Termly', from: '19 Sep 2027', to: '24 Jul 2028', linked: 0, own: 0, status: 'Inactive' };
    useInv.getState().set('templates', (l) => [...l, t]);
    setEditing(t);
  }
}

/* ---------------- F5: edit a template ---------------- */
function TemplateSheet({ t, onClose , nav }: { nav?: SheetNav;  t: Template | null; onClose: () => void }) {
  const [v, setV] = useState({ name: '', weeks: '', rent: '', deposit: '', billing: 'Termly' as Template['billing'], from: '', to: '' });
  const busy = useRef(false);
  useEffect(() => { if (t) { setV({ name: t.name, weeks: String(t.weeks), rent: String(t.rent), deposit: String(t.deposit), billing: t.billing, from: t.from, to: t.to }); busy.current = false; } }, [t]);
  if (!t) return null;
  const rentChanged = +v.rent !== t.rent;
  const follow = t.linked - t.own;
  const save = () => {
    if (busy.current) return;
    busy.current = true;
    useInv.getState().set('templates', (l) => l.map((x) => (x.id === t.id ? { ...x, name: v.name || x.name, weeks: +v.weeks || x.weeks, rent: +v.rent || x.rent, deposit: +v.deposit, billing: v.billing, from: v.from, to: v.to, status: x.linked ? x.status : 'Active' } : x)));
    onClose();
    toast.success(rentChanged && follow ? `${v.name} saved · ${follow} tenancies now ${money(+v.rent)} / wk` : `${v.name} saved`);
  };
  return (
    <Sheet open onClose={onClose} nav={nav} width={500} title={`Edit ${t.name}`} sub={`${t.linked} linked tenancies`}
      footer={<><Button onClick={onClose}>Cancel</Button><Button variant="primary" onClick={save}>{rentChanged && follow ? `Save and update ${follow}` : 'Save'}</Button></>}>
      <div className="[&>section:first-child]:border-t-0 [&>section:first-child]:pt-0">
        <SheetSection title="Template">
        <div className="space-y-4">
        <Field label="Name"><Input value={v.name} onChange={(e) => setV({ ...v, name: e.target.value })} /></Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Length"><label className="h-8 flex items-center rounded-lg border border-gray-300 px-2.5 text-sm"><input aria-label="Weeks" value={v.weeks} onChange={(e) => setV({ ...v, weeks: e.target.value.replace(/\D/g, '') })} className="flex-1 min-w-0 outline-none" /><span className="text-gray-400">weeks</span></label></Field>
        </div>
        </div>
        </SheetSection>
        <SheetSection title="Money">
        <div className="grid grid-cols-2 gap-3">
          <Field label="Rent"><MoneyInput value={v.rent} onChange={(r) => setV({ ...v, rent: r })} suffix="/ wk" />{rentChanged && <span className="block text-xs text-[#646A78] mt-1">Was {money(t.rent)}</span>}</Field>
          <Field label="Deposit"><MoneyInput value={v.deposit} onChange={(r) => setV({ ...v, deposit: r })} /></Field>
          <Field label="Billing"><Picker value={v.billing} onChange={(b) => setV({ ...v, billing: b })} options={[{ id: 'Termly', label: 'Termly' }, { id: 'Monthly', label: 'Monthly' }, { id: 'Upfront', label: 'Upfront' }]} /></Field>
        </div>
        <div className="mt-4 rounded-xl border border-[#3B82F64D] p-3 flex gap-2.5 text-sm"><Info size={17} weight="fill" className="text-[#3B82F6] shrink-0" /><span className="text-[#646A78]">Sold tenancies never change. Only tenancies nobody has booked yet pick up the new rent.</span></div>
        </SheetSection>
        <SheetSection title="Availability">
        <div className="grid grid-cols-2 gap-3">
          <Field label="Available from"><DateBox value={v.from} onChange={(x) => setV({ ...v, from: x })} /></Field>
          <Field label="Available to"><DateBox value={v.to} onChange={(x) => setV({ ...v, to: x })} /></Field>
        </div>
        </SheetSection>
        {t.linked > 0 && (
          <SheetSection title="Who gets the new rent">
            <div className="space-y-2.5 text-sm">
              <div className="flex items-center gap-2"><span className="size-2 rounded-full bg-primary" /><b className="font-medium">{follow} linked tenancies</b><span className="text-[#646A78]">follow the template</span></div>
              {t.own > 0 && <div className="flex items-center gap-2"><span className="size-2 rounded-full bg-gray-300" /><b className="font-medium">{t.own} edited on their own</b><span className="text-[#646A78]">keep theirs{t.ownNote ? ` · ${t.ownNote}` : ''}</span></div>}
            </div>
          </SheetSection>
        )}
      </div>
    </Sheet>
  );
}
function DateBox({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return <label className="h-8 flex items-center gap-2 rounded-lg border border-gray-300 px-2.5 text-sm"><CalendarBlank size={14} className="text-gray-400" /><input value={value} onChange={(e) => onChange(e.target.value)} className="flex-1 min-w-0 outline-none" /></label>;
}

/* ---------------- F8: add a fee (with a new fee type) ---------------- */
function AddFeeDialog({ open, onClose, onAdded }: { open: boolean; onClose: () => void; onAdded: (id: string) => void }) {
  const feeTypes = useInv((s) => s.feeTypes);
  const allProps = useInv((s) => s.properties);
  const props = useMemo(() => allProps.filter((p) => p.status !== 'Archived'), [allProps]);
  const [stage, setStage] = useState<'type' | 'newType' | 'config'>('type');
  const [typeId, setTypeId] = useState('');
  const [nt, setNt] = useState({ name: 'Laundry card', calc: 'Flat' as FeeType['calc'], mandatory: false, refundable: false });
  const [scope, setScope] = useState<'org' | 'one'>('one');
  const [pid, setPid] = useState('stm');
  const [on, setOn] = useState<Fee['chargedOn']>('Each tenancy');
  const [amount, setAmount] = useState('60');
  const busy = useRef(false);
  useEffect(() => { if (open) { setStage('type'); setTypeId(''); setScope('one'); setPid(props.some((p) => p.id === 'stm') ? 'stm' : 'col'); setAmount('60'); busy.current = false; } }, [open]); // eslint-disable-line react-hooks/exhaustive-deps
  const type = feeTypes.find((t) => t.id === typeId);
  const createType = () => {
    if (busy.current || !nt.name.trim()) return;
    busy.current = true;
    const id = invId('ft');
    useInv.getState().set('feeTypes', (l) => [...l, { id, ...nt, name: nt.name.trim() }]);
    setTypeId(id);
    setStage('config');
    busy.current = false;
  };
  const add = () => {
    if (busy.current || !type || !amount) return;
    busy.current = true;
    const id = invId('fe');
    const amt = type.calc === 'Percentage' ? `${amount}% of rent` : type.calc === 'Per unit' ? `£${amount} each` : `£${amount}`;
    useInv.getState().set('fees', (l) => [...l, { id, typeId: type.id, amount: amt, appliesTo: scope === 'org' ? null : pid, chargedOn: on }]);
    onClose();
    onAdded(id);
    toast.success(`${type.name} added to ${scope === 'org' ? 'every property' : props.find((p) => p.id === pid)?.name}`);
  };
  return (
    <Modal open={open} onClose={onClose} icon={Receipt} width={520}
      title={stage === 'type' ? 'Add a fee' : stage === 'newType' ? 'New fee type' : `Add ${type?.name ?? 'fee'}`}
      sub={stage === 'type' ? 'Pick what kind of fee it is.' : stage === 'newType' ? 'A fee type is reused across properties.' : `${type?.calc} · ${type?.mandatory ? 'mandatory' : 'optional'} · ${type?.refundable ? 'refundable' : 'not refundable'}`}
      footer={stage === 'type' ? <><Button onClick={onClose}>Cancel</Button><Button variant="primary" disabled={!typeId} onClick={() => setStage('config')}>Continue</Button></>
        : stage === 'newType' ? <><Button onClick={() => setStage('type')}>Back</Button><Button variant="primary" disabled={!nt.name.trim()} onClick={createType}>Create fee type</Button></>
          : <><Button onClick={() => setStage('type')}>Back</Button><Button variant="primary" disabled={!amount} onClick={add}>Add fee</Button></>}>
      {stage === 'type' && (
        <div className="space-y-2">
          {feeTypes.map((t) => <RadioCard key={t.id} checked={typeId === t.id} onClick={() => setTypeId(t.id)} title={t.name} sub={`${t.calc} · ${t.mandatory ? 'Mandatory' : 'Optional'}${t.refundable ? ' · refundable' : ''}`} />)}
          <button type="button" onClick={() => setStage('newType')} className="w-full h-11 rounded-xl border border-dashed border-gray-300 text-sm flex items-center justify-center gap-2 hover:bg-gray-50"><Plus size={14} />New fee type…</button>
        </div>
      )}
      {stage === 'newType' && (
        <div className="space-y-4">
          <Field label="Name"><Input value={nt.name} onChange={(e) => setNt({ ...nt, name: e.target.value })} /></Field>
          <div><div className="text-sm font-medium text-gray-700 mb-1.5">Calculation</div><Seg value={nt.calc} onChange={(c) => setNt({ ...nt, calc: c })} options={['Flat', 'Percentage', 'Per unit']} className="w-full" /></div>
          <div className="rounded-xl border border-line divide-y divide-line">
            <div className="h-12 px-3.5 flex items-center"><span className="flex-1"><span className="block text-sm">Mandatory</span><span className="block text-xs text-[#646A78]">Added to every tenancy it applies to</span></span><Switch checked={nt.mandatory} onChange={(m) => setNt({ ...nt, mandatory: m })} label="Mandatory" /></div>
            <div className="h-12 px-3.5 flex items-center"><span className="flex-1"><span className="block text-sm">Refundable</span><span className="block text-xs text-[#646A78]">Paid back at the end, like a deposit</span></span><Switch checked={nt.refundable} onChange={(r) => setNt({ ...nt, refundable: r })} label="Refundable" /></div>
          </div>
        </div>
      )}
      {stage === 'config' && type && (
        <div className="space-y-4">
          <div><div className="text-sm font-medium text-gray-700 mb-1.5">Applies to</div>
            <div className="grid grid-cols-2 gap-2">
              <RadioCard checked={scope === 'org'} onClick={() => setScope('org')} title="Organisation-wide" sub="Every property" />
              <RadioCard checked={scope === 'one'} onClick={() => setScope('one')} title="One property" sub="Pick it below" />
            </div>
            {scope === 'one' && <Picker className="mt-2" value={pid} onChange={setPid} icon={Buildings} options={props.map((p) => ({ id: p.id, label: p.name }))} />}
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Charged on"><Picker value={on} onChange={setOn} options={[{ id: 'Each tenancy', label: 'Each tenancy' }, { id: 'Each room', label: 'Each room' }, { id: 'The property', label: 'The property' }]} /></Field>
            <Field label="Amount">{type.calc === 'Percentage' ? <label className="h-8 flex items-center rounded-lg border border-gray-300 px-2.5 text-sm"><input aria-label="Amount" value={amount} onChange={(e) => setAmount(e.target.value.replace(/[^0-9.]/g, ''))} className="flex-1 outline-none" /><span className="text-gray-400">% of rent</span></label> : <MoneyInput value={amount} onChange={setAmount} suffix={type.calc === 'Per unit' ? 'each' : undefined} />}</Field>
          </div>
          {scope === 'org' && <div className="flex gap-2 text-xs text-[#646A78]"><Warning size={14} className="text-[#F59E0B] shrink-0" />Applies to all {props.length} properties, including new tenancies already in draft.</div>}
        </div>
      )}
    </Modal>
  );
}

function FeeTypesSheet({ open, onClose, types }: { open: boolean; onClose: () => void; types: FeeType[] }) {
  const set = useInv((s) => s.set);
  return (
    <Sheet open={open} onClose={onClose} title="Fee types" sub={`${types.length} types`}>
      <div className="rounded-xl border border-line divide-y divide-line">
        {types.map((t) => (
          <div key={t.id} className="px-3.5 py-3 flex items-center gap-3">
            <Receipt size={16} className="text-[#646A78]" />
            <div className="flex-1"><div className="text-sm font-medium">{t.name}</div><div className="text-xs text-[#646A78]">{t.calc}</div></div>
            <span className="flex items-center gap-1.5 text-xs text-[#646A78]">Mandatory<Switch checked={t.mandatory} onChange={(m) => set('feeTypes', (l) => l.map((x) => (x.id === t.id ? { ...x, mandatory: m } : x)))} label={`${t.name} mandatory`} /></span>
            <span className={cx('flex items-center gap-1.5 text-xs text-[#646A78]')}>Refundable<Switch checked={t.refundable} onChange={(r) => set('feeTypes', (l) => l.map((x) => (x.id === t.id ? { ...x, refundable: r } : x)))} label={`${t.name} refundable`} /></span>
          </div>
        ))}
      </div>
      <p className="text-xs text-[#646A78] mt-3 flex gap-1.5"><PencilSimple size={13} />Changes apply to fees added from now on.</p>
    </Sheet>
  );
}
