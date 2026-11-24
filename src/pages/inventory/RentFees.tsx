import { useEffect, useMemo, useRef, useState } from 'react';
import { Empty } from '../../components/ui';
import { toast } from 'sonner';
import { Bed, Buildings, CalendarBlank, CurrencyGbp, DoorOpen, Globe, Key, Money, Plus, Receipt, Shield, ShieldCheck, Shower, Sun, Tag as TagIcon, Warning, type Icon } from '../../components/icons';
import type { Tone } from '../../data/seed';
import { Button, Confirm, Field, IconTile, Input, PageHeader, Sheet, SheetHero, SheetRow, SheetSection, Switch, Table, listNav, type SheetNav } from '../../components/ui';
import { StatusTabsBar } from '../offcampus/parts';
import { invId, money, useInv, type Fee, type FeeType, type Template } from '../../data/inventory';
import { useTab } from '../hooks';
import { EditLink, FieldErr, MoneyInput, PanelModal, Picker, PropStatus, RadioCard, Seg, isMoney, moneyErr, rangeErr } from './common';

type TabId = 'templates' | 'fees';
/* Row icons, coloured (2026-11-13): a template by its room kind, a fee by what it covers. Unknown ones stay grey. */
const tplIcon = (name: string): [Icon, Tone] =>
  /ensuite/i.test(name) ? [Shower, 'blue'] : /studio/i.test(name) ? [DoorOpen, 'purple'] : /summer|short/i.test(name) ? [Sun, 'amber'] : /single|double|room/i.test(name) ? [Bed, 'green'] : [Receipt, 'grey'];
const feeIcon = (name = ''): [Icon, Tone] =>
  /insurance/i.test(name) ? [ShieldCheck, 'blue'] : /admin|booking/i.test(name) ? [Receipt, 'purple'] : /damage/i.test(name) ? [Shield, 'amber'] : /key|store/i.test(name) ? [Key, 'green'] : [Money, 'grey'];

/* A draft: nothing is stored until Save, so Cancel leaves no orphan row. Shared with the property panel's Add template. */
export const draftTemplate = (propertyId: string): Template => ({ id: invId('tp'), propertyId, name: '', weeks: 44, rent: 170, deposit: 250, billing: 'Weekly', from: '19 Sep 2027', to: '24 Jul 2028', linked: 0, own: 0, status: 'Inactive' });

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
  const [feeId, setFeeId] = useState<string | null>(null);
  const fee = fees.find((f) => f.id === feeId) ?? null;
  const p = props.find((x) => x.id === pid);
  const tpls = allTpl.filter((t) => t.propertyId === pid);
  const pname = (id: string | null) => (id ? props.find((x) => x.id === id)?.name ?? '—' : 'Organisation-wide');

  return (
    <>
      <PageHeader icon={CurrencyGbp} title="Custom pricing" crumbs={['Properties']}>
        {tab === 'templates' ? <Button variant="primary" icon={Plus} onClick={() => newTemplate()}>New template</Button> : (
          <Button variant="primary" icon={Plus} onClick={() => setAdding(true)}>Add fee</Button>
        )}
      </PageHeader>
      {/* Underline tabs on the bottom rule, as Approvals (2026-11-24); on the right the property picker (Templates) or Fee types (Fees). */}
      <StatusTabsBar value={tab} onChange={setTab} tabs={[{ id: 'templates', label: 'Tenancy templates', count: tpls.length }, { id: 'fees', label: 'Fees', count: fees.length }]}
        aside={tab === 'templates' ? <div className="w-64"><Picker value={pid} onChange={setPid} icon={Buildings} options={props.map((x) => ({ id: x.id, label: x.name }))} /></div>
          : <Button icon={TagIcon} onClick={() => setTypesOpen(true)}>Fee types</Button>} />
      {tab === 'templates' ? (
        <Table rows={tpls} onRow={setEditing} selected={editing?.id}
          cols={[
            { key: 'n', label: 'Template', render: (t) => { const [I, tone] = tplIcon(t.name); return <span className="flex items-center gap-2.5"><IconTile icon={I} tone={tone} /><span className="font-medium">{t.name}</span></span>; } },
            { key: 'l', label: 'Length', render: (t) => <span className="text-[#737373]">{p?.letting === 'Monthly' ? `${Math.round(t.weeks * 12 / 52)} months` : `${t.weeks} weeks`}</span> },
            { key: 'r', label: 'Rent', render: (t) => <span className="tabular-nums">{p?.letting === 'Monthly' ? `${money(Math.round(t.rent * 52 / 12 * 100) / 100, true)} / mo` : `${money(t.rent)} / wk`}</span> },
            { key: 'd', label: 'Deposit', render: (t) => money(t.deposit) },
            { key: 'b', label: 'Billing', render: (t) => <span className="text-[#737373]">{t.billing}</span> },
            /* The count alone on the first line; tenancies on their own terms go underneath. */
            { key: 'k', label: 'Linked tenancies', render: (t) => <span className="block tabular-nums"><span className="block leading-5">{t.linked}</span>{t.own ? <span className="block text-xs leading-4 text-[#737373]">{t.own} on own terms</span> : null}</span> },
            { key: 's', label: 'Status', render: (t) => <PropStatus s={t.status} /> },
          ]}
          empty={!p ? <Empty title="No properties yet" sub="Create a property first to make templates." /> : <div className="p-10 text-center text-sm text-[#737373]">No templates for {p?.name}. <button type="button" className="text-primary" onClick={() => newTemplate()}>Make one</button></div>} />
      ) : (
        <Table rows={fees} onRow={(f) => setFeeId(f.id)} selected={feeId ?? fresh ?? undefined}
          cols={[
            { key: 'f', label: 'Fee', render: (f) => { const n = feeTypes.find((t) => t.id === f.typeId)?.name; const [I, tone] = feeIcon(n); return <span className="flex items-center gap-2.5"><IconTile icon={I} tone={tone} /><span className="font-medium">{n}</span></span>; } },
            { key: 'c', label: 'Calculation', render: (f) => <span className="text-[#737373]">{feeTypes.find((t) => t.id === f.typeId)?.calc}</span> },
            { key: 'a', label: 'Amount', render: (f) => <span className="tabular-nums">{f.amount}</span> },
            { key: 'p', label: 'Applies to', render: (f) => <span className="flex items-center gap-1.5">{f.appliesTo ? <Buildings size={14} className="text-gray-400" /> : <Globe size={14} className="text-gray-400" />}{pname(f.appliesTo)}</span> },
            { key: 'o', label: 'Charged on', render: (f) => <span className="text-[#737373]">{f.chargedOn}</span> },
            { key: 'r', label: 'Refundable', render: (f) => (feeTypes.find((t) => t.id === f.typeId)?.refundable ? 'Yes' : 'No') },
            { key: 'm', label: 'Mandatory', render: (f) => (feeTypes.find((t) => t.id === f.typeId)?.mandatory ? 'Yes' : 'No') },
          ]} empty={<Empty title="No fees yet" sub="Add a fee to charge it on tenancies." />} />
      )}
      <TemplateSheet key={editing?.id} t={editing} isNew={!!editing && !allTpl.some((x) => x.id === editing.id)} siblings={tpls} nav={listNav(tpls, (x) => x.id === editing?.id, (x) => setEditing(x))} onClose={() => setEditing(null)} />
      <AddFeeDialog open={adding} onClose={() => setAdding(false)} onAdded={(id) => { setFresh(id); window.setTimeout(() => setFresh(null), 4000); }} />
      <FeeSheet key={fee?.id} f={fee} nav={listNav(fees, (x) => x.id === feeId, (x) => setFeeId(x.id))} onClose={() => setFeeId(null)} />
      <FeeTypesSheet open={typesOpen} onClose={() => setTypesOpen(false)} types={feeTypes} />
    </>
  );

  function newTemplate() {
    setEditing(draftTemplate(pid));
  }
}

/* ---------------- F5: a template's record panel; New and Edit open the centred template dialog ---------------- */
function TemplateSheet({ t: picked, onClose, nav, isNew, siblings }: { nav?: SheetNav; t: Template | null; onClose: () => void; isNew: boolean; siblings: Template[] }) {
  const [editing, setEditing] = useState(false);
  /* The page holds the row as it was clicked; read it live so a save shows straight away. */
  const live = useInv((s) => s.templates.find((x) => x.id === picked?.id));
  const t = live ?? picked;
  if (!t) return null;
  if (isNew) return <TemplateDialog t={t} isNew open onClose={onClose} siblings={siblings} />;
  const [I] = tplIcon(t.name);
  const follow = t.linked - t.own;
  return (
    <Sheet open onClose={onClose} nav={nav} width={500} title="Tenancy template">
      <SheetHero icon={I} name={t.name} meta={`${t.weeks} weeks · ${t.billing.toLowerCase()} billing`}
        facts={[['Rent', `${money(t.rent)} / wk`], ['Deposit', money(t.deposit)], ['Linked', String(t.linked)]]}>
        <PropStatus s={t.status} />
      </SheetHero>
      <SheetSection title="Details" action={<EditLink onClick={() => setEditing(true)} />} rows={[
        ['Length', `${t.weeks} weeks`],
        ['Rent', `${money(t.rent)} / wk`],
        ['Deposit', money(t.deposit)],
        ['Billing', t.billing],
        ['Available from', t.from],
        ['Available to', t.to],
      ]} />
      <SheetSection title={`Linked tenancies · ${t.linked}`}>
        {t.linked > 0 ? <>
          <SheetRow title={`${follow} follow the template`} sub="Unsold ones pick up a new rent" />
          {t.own > 0 && <SheetRow title={`${t.own} edited on their own`} sub={`Keep their terms${t.ownNote ? ` · ${t.ownNote}` : ''}`} />}
        </> : <p className="text-sm leading-5 text-[#737373]">No tenancies use it yet.</p>}
      </SheetSection>
      <TemplateDialog t={t} isNew={false} open={editing} onClose={() => setEditing(false)} siblings={siblings} />
    </Sheet>
  );
}

/** New or edit a template in a centred dialog. */
export function TemplateDialog({ t, open, onClose, isNew, siblings }: { t: Template; open: boolean; onClose: () => void; isNew: boolean; siblings: Template[] }) {
  const fromT = () => ({ name: t.name, weeks: String(t.weeks), rent: String(t.rent), deposit: String(t.deposit), billing: t.billing, from: t.from, to: t.to });
  const [v, setV] = useState(fromT);
  const busy = useRef(false);
  useEffect(() => { if (open) { setV(fromT()); busy.current = false; } }, [open]); // eslint-disable-line react-hooks/exhaustive-deps
  const rentChanged = !isNew && isMoney(v.rent) && +v.rent !== t.rent;
  const follow = t.linked - t.own;
  const name = v.name.trim();
  const errs = {
    name: !name ? 'Enter a template name.' : siblings.some((x) => x.id !== t.id && x.name.trim().toLowerCase() === name.toLowerCase()) ? `This property already has a template called ${name}.` : '',
    weeks: !/^\d+$/.test(v.weeks) || +v.weeks < 1 || +v.weeks > 52 ? 'Length must be between 1 and 52 weeks.' : '',
    rent: moneyErr(v.rent, 'a rent'),
    deposit: moneyErr(v.deposit, 'a deposit, or 0 for none', { allowZero: true }),
    dates: rangeErr(v.from, v.to),
  };
  const ok = Object.values(errs).every((e) => !e);
  const save = () => {
    if (busy.current || !ok) return;
    busy.current = true;
    const next: Template = { ...t, name, weeks: +v.weeks, rent: +v.rent, deposit: +v.deposit, billing: v.billing, from: v.from.trim(), to: v.to.trim(), status: t.linked ? t.status : 'Active' };
    useInv.getState().set('templates', (l) => (isNew ? [...l, next] : l.map((x) => (x.id === t.id ? next : x))));
    onClose();
    /* The toast reports exactly what was stored. */
    toast.success(isNew ? `${name} created` : rentChanged && follow ? `${name} saved · ${follow} tenancies now ${money(next.rent)} / wk` : `${name} saved`);
  };
  return (
    <PanelModal open={open} onClose={onClose} width={560} eyebrow={isNew ? 'New template' : 'Edit template'}
      icon={tplIcon(v.name || t.name || '')[0]} title={<span className="block truncate">{isNew ? (v.name.trim() || 'New template') : t.name}</span>}
      right={<><Button onClick={onClose}>Cancel</Button><Button variant="primary" icon={null} disabled={!ok} onClick={save}>{isNew ? 'Create template' : rentChanged && follow ? `Save and update ${follow}` : 'Save'}</Button></>}>
      <>
        <SheetSection title="Template">
        <div className="space-y-4">
        <Field label="Name"><Input value={v.name} placeholder="e.g. Ensuite single" onChange={(e) => setV({ ...v, name: e.target.value })} /><FieldErr>{errs.name}</FieldErr></Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Length"><label className="h-8 flex items-center rounded-lg border border-gray-300 px-2.5 text-sm"><input aria-label="Weeks" value={v.weeks} onChange={(e) => setV({ ...v, weeks: e.target.value.replace(/\D/g, '') })} className="flex-1 min-w-0 outline-none" /><span className="text-[#737373]">weeks</span></label><FieldErr>{errs.weeks}</FieldErr></Field>
        </div>
        </div>
        </SheetSection>
        <SheetSection title="Money">
        <div className="grid grid-cols-2 gap-3">
          <Field label="Rent"><MoneyInput value={v.rent} onChange={(r) => setV({ ...v, rent: r })} suffix="/ wk" />{errs.rent ? <FieldErr>{errs.rent}</FieldErr> : rentChanged && <span className="block text-xs text-[#737373] mt-1">Was {money(t.rent)}</span>}</Field>
          <Field label="Deposit"><MoneyInput value={v.deposit} onChange={(r) => setV({ ...v, deposit: r })} /><FieldErr>{errs.deposit}</FieldErr></Field>
          <Field label="Billing"><Picker value={v.billing} onChange={(b) => setV({ ...v, billing: b })} options={[{ id: 'Weekly', label: 'Weekly' }, { id: 'Monthly', label: 'Monthly' }, { id: 'Upfront', label: 'Upfront' }]} /></Field>
        </div>
        <p className="mt-3 text-sm leading-5 text-[#737373]">Sold tenancies never change.</p>
        </SheetSection>
        <SheetSection title="Availability">
        <div className="grid grid-cols-2 gap-3">
          <Field label="Available from"><DateBox value={v.from} onChange={(x) => setV({ ...v, from: x })} /></Field>
          <Field label="Available to"><DateBox value={v.to} onChange={(x) => setV({ ...v, to: x })} /></Field>
        </div>
        <FieldErr>{errs.dates}</FieldErr>
        </SheetSection>
        {t.linked > 0 && (
          <SheetSection title="Who gets the new rent">
            <SheetRow title={`${follow} linked tenancies`} sub="Follow the template" />
            {t.own > 0 && <SheetRow title={`${t.own} edited on their own`} sub={`Keep theirs${t.ownNote ? ` · ${t.ownNote}` : ''}`} />}
          </SheetSection>
        )}
      </>
    </PanelModal>
  );
}
function DateBox({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return <label className="h-8 flex items-center gap-2 rounded-lg border border-gray-300 px-2.5 text-sm"><CalendarBlank size={14} className="text-gray-400" /><input value={value} onChange={(e) => onChange(e.target.value)} className="flex-1 min-w-0 outline-none" /></label>;
}

/* A fee's stored amount is display text ("£45", "5% of rent", "£10 each"); these two convert both ways. */
const feeAmount = (calc: FeeType['calc'], n: string) => (calc === 'Percentage' ? `${n}% of rent` : calc === 'Per unit' ? `£${n} each` : `£${n}`);
const feeNumber = (amount: string) => amount.match(/[\d.]+/)?.[0] ?? '';

/* ---------------- A fee's record panel: read-only, Edit opens the centred fee dialog, Remove sits in the control bar ---------------- */
function FeeSheet({ f, nav, onClose }: { f: Fee | null; nav?: SheetNav; onClose: () => void }) {
  const feeTypes = useInv((s) => s.feeTypes);
  const allProps = useInv((s) => s.properties);
  const [editing, setEditing] = useState(false);
  const [removing, setRemoving] = useState(false);
  const type = feeTypes.find((t) => t.id === f?.typeId);
  if (!f || !type) return null;
  const [I] = feeIcon(type.name);
  const where = f.appliesTo ? allProps.find((p) => p.id === f.appliesTo)?.name ?? '—' : 'Organisation-wide';
  const remove = () => {
    useInv.getState().set('fees', (l) => l.filter((x) => x.id !== f.id));
    setRemoving(false);
    onClose();
    toast.success(`${type.name} removed`);
  };
  return (
    <>
      <Sheet open onClose={onClose} nav={nav} width={500} title="Fee" onDelete={{ label: 'Remove fee', onClick: () => setRemoving(true) }}>
        <SheetHero icon={I} name={type.name} meta={`${type.calc} · ${type.mandatory ? 'mandatory' : 'optional'} · ${type.refundable ? 'refundable' : 'not refundable'}`}
          facts={[['Amount', f.amount], ['Charged on', f.chargedOn]]} />
        <SheetSection title="Charge" action={<EditLink onClick={() => setEditing(true)} />} rows={[
          ['Applies to', where],
          ['Charged on', f.chargedOn],
          ['Amount', f.amount],
        ]} />
        <FeeDialog f={f} type={type} open={editing} onClose={() => setEditing(false)} />
      </Sheet>
      <Confirm open={removing} onClose={() => setRemoving(false)} danger title={`Remove ${type.name}?`} sub="New tenancies won't be charged it." confirm="Remove" onConfirm={remove} />
    </>
  );
}

/** Edit a fee in a centred dialog: where it applies, what it's charged on and how much. */
function FeeDialog({ f, type, open, onClose }: { f: Fee; type: FeeType; open: boolean; onClose: () => void }) {
  const allProps = useInv((s) => s.properties);
  const props = useMemo(() => allProps.filter((p) => p.status !== 'Archived'), [allProps]);
  const [scope, setScope] = useState<'org' | 'one'>(f.appliesTo ? 'one' : 'org');
  const [pid, setPid] = useState(f.appliesTo ?? props[0]?.id ?? '');
  const [on, setOn] = useState<Fee['chargedOn']>(f.chargedOn);
  const [amount, setAmount] = useState(feeNumber(f.amount));
  const busy = useRef(false);
  useEffect(() => { if (open) { setScope(f.appliesTo ? 'one' : 'org'); setPid(f.appliesTo ?? props[0]?.id ?? ''); setOn(f.chargedOn); setAmount(feeNumber(f.amount)); busy.current = false; } }, [open]); // eslint-disable-line react-hooks/exhaustive-deps
  const amountErr = type.calc === 'Percentage' ? (!isMoney(amount) || +amount <= 0 || +amount > 100 ? 'Enter a percentage between 0 and 100.' : '') : moneyErr(amount, 'an amount');
  const save = () => {
    if (busy.current || amountErr) return;
    busy.current = true;
    const next: Fee = { ...f, amount: feeAmount(type.calc, amount), appliesTo: scope === 'org' ? null : pid, chargedOn: on };
    useInv.getState().set('fees', (l) => l.map((x) => (x.id === f.id ? next : x)));
    onClose();
    toast.success(`${type.name} saved`);
  };
  return (
    <PanelModal open={open} onClose={onClose} width={560} eyebrow="Edit fee" title={type.name} icon={feeIcon(type.name)[0]}
      right={<><Button onClick={onClose}>Cancel</Button><Button variant="primary" icon={null} disabled={!!amountErr} onClick={save}>Save</Button></>}>
        <>
          <SheetSection title="Applies to">
            <div className="grid grid-cols-2 gap-2">
              <RadioCard checked={scope === 'org'} onClick={() => setScope('org')} title="Organisation-wide" sub="Every property" />
              <RadioCard checked={scope === 'one'} onClick={() => setScope('one')} title="One property" sub="Pick it below" />
            </div>
            {scope === 'one' && <Picker className="mt-2" value={pid} onChange={setPid} icon={Buildings} options={props.map((p) => ({ id: p.id, label: p.name }))} />}
          </SheetSection>
          <SheetSection title="Charge">
            <div className="grid grid-cols-2 gap-3">
              <Field label="Charged on"><Picker value={on} onChange={setOn} options={[{ id: 'Each tenancy', label: 'Each tenancy' }, { id: 'Each room', label: 'Each room' }, { id: 'The property', label: 'The property' }]} /></Field>
              <Field label="Amount">{type.calc === 'Percentage' ? <label className="h-8 flex items-center rounded-lg border border-gray-300 px-2.5 text-sm"><input aria-label="Amount" value={amount} onChange={(e) => setAmount(e.target.value.replace(/[^0-9.]/g, ''))} className="flex-1 outline-none" /><span className="text-[#737373]">% of rent</span></label> : <MoneyInput value={amount} onChange={setAmount} suffix={type.calc === 'Per unit' ? 'each' : undefined} />}<FieldErr>{amountErr}</FieldErr></Field>
            </div>
          </SheetSection>
        </>
    </PanelModal>
  );
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
  const typeErr = !nt.name.trim() ? 'Enter a name.' : feeTypes.some((t) => t.name.trim().toLowerCase() === nt.name.trim().toLowerCase()) ? `A fee type called ${nt.name.trim()} already exists.` : '';
  const amountErr = type?.calc === 'Percentage' ? (!isMoney(amount) || +amount <= 0 || +amount > 100 ? 'Enter a percentage between 0 and 100.' : '') : moneyErr(amount, 'an amount');
  const createType = () => {
    if (busy.current || typeErr) return;
    busy.current = true;
    const id = invId('ft');
    useInv.getState().set('feeTypes', (l) => [...l, { id, ...nt, name: nt.name.trim() }]);
    setTypeId(id);
    setStage('config');
    busy.current = false;
  };
  const add = () => {
    if (busy.current || !type || amountErr) return;
    busy.current = true;
    const id = invId('fe');
    const amt = feeAmount(type.calc, amount);
    useInv.getState().set('fees', (l) => [...l, { id, typeId: type.id, amount: amt, appliesTo: scope === 'org' ? null : pid, chargedOn: on }]);
    onClose();
    onAdded(id);
    toast.success(`${type.name} added to ${scope === 'org' ? 'every property' : props.find((p) => p.id === pid)?.name}`);
  };
  return (
    <PanelModal open={open} onClose={onClose} width={560} eyebrow={stage === 'newType' ? 'New fee type' : 'New fee'}
      icon={stage === 'config' && type ? feeIcon(type.name)[0] : Receipt}
      title={stage === 'type' ? 'New fee' : stage === 'newType' ? 'New fee type' : type?.name ?? 'New fee'}
      meta={stage === 'config' && type ? `${type.calc} · ${type.mandatory ? 'mandatory' : 'optional'} · ${type.refundable ? 'refundable' : 'not refundable'}` : undefined}
      right={stage === 'type' ? <><Button onClick={onClose}>Cancel</Button><Button variant="primary" icon={null} disabled={!typeId} onClick={() => setStage('config')}>Continue</Button></>
        : stage === 'newType' ? <><Button onClick={() => setStage('type')}>Back</Button><Button variant="primary" icon={null} disabled={!!typeErr} onClick={createType}>Create fee type</Button></>
          : <><Button onClick={() => setStage('type')}>Back</Button><Button variant="primary" icon={null} disabled={!!amountErr} onClick={add}>Add fee</Button></>}>
      {stage === 'type' && (
        <SheetSection title={`Fee type · ${feeTypes.length}`} action={<EditLink onClick={() => setStage('newType')}>New fee type</EditLink>}>
          <div className="space-y-2">
            {feeTypes.map((t) => <RadioCard key={t.id} checked={typeId === t.id} onClick={() => setTypeId(t.id)} title={t.name} sub={`${t.calc} · ${t.mandatory ? 'Mandatory' : 'Optional'}${t.refundable ? ' · refundable' : ''}`} />)}
          </div>
        </SheetSection>
      )}
      {stage === 'newType' && (
        <>
          <SheetSection title="Fee type">
            <div className="space-y-4">
              <Field label="Name"><Input value={nt.name} onChange={(e) => setNt({ ...nt, name: e.target.value })} /><FieldErr>{typeErr}</FieldErr></Field>
              <div><div className="text-sm leading-5 text-[#525252] mb-1.5">Calculation</div><Seg value={nt.calc} onChange={(c) => setNt({ ...nt, calc: c })} options={['Flat', 'Percentage', 'Per unit']} className="w-full" /></div>
            </div>
          </SheetSection>
          <SheetSection title="Rules">
            <SheetRow title="Mandatory" sub="Added to every tenancy it applies to" end={<Switch checked={nt.mandatory} onChange={(m) => setNt({ ...nt, mandatory: m })} label="Mandatory" />} />
            <SheetRow title="Refundable" sub="Paid back at the end, like a deposit" end={<Switch checked={nt.refundable} onChange={(r) => setNt({ ...nt, refundable: r })} label="Refundable" />} />
          </SheetSection>
        </>
      )}
      {stage === 'config' && type && (
        <>
          <SheetSection title="Applies to">
            <div className="grid grid-cols-2 gap-2">
              <RadioCard checked={scope === 'org'} onClick={() => setScope('org')} title="Organisation-wide" sub="Every property" />
              <RadioCard checked={scope === 'one'} onClick={() => setScope('one')} title="One property" sub="Pick it below" />
            </div>
            {scope === 'one' && <Picker className="mt-2" value={pid} onChange={setPid} icon={Buildings} options={props.map((p) => ({ id: p.id, label: p.name }))} />}
            {scope === 'org' && <p className="mt-3 flex gap-2 text-sm leading-5 text-[#737373]"><Warning size={16} className="mt-0.5 text-[#A16207] shrink-0" />Applies to all {props.length} properties, drafts included.</p>}
          </SheetSection>
          <SheetSection title="Charge">
            <div className="grid grid-cols-2 gap-3">
              <Field label="Charged on"><Picker value={on} onChange={setOn} options={[{ id: 'Each tenancy', label: 'Each tenancy' }, { id: 'Each room', label: 'Each room' }, { id: 'The property', label: 'The property' }]} /></Field>
              <Field label="Amount">{type.calc === 'Percentage' ? <label className="h-8 flex items-center rounded-lg border border-gray-300 px-2.5 text-sm"><input aria-label="Amount" value={amount} onChange={(e) => setAmount(e.target.value.replace(/[^0-9.]/g, ''))} className="flex-1 outline-none" /><span className="text-[#737373]">% of rent</span></label> : <MoneyInput value={amount} onChange={setAmount} suffix={type.calc === 'Per unit' ? 'each' : undefined} />}<FieldErr>{amountErr}</FieldErr></Field>
            </div>
          </SheetSection>
        </>
      )}
    </PanelModal>
  );
}

function FeeTypesSheet({ open, onClose, types }: { open: boolean; onClose: () => void; types: FeeType[] }) {
  const set = useInv((s) => s.set);
  return (
    <Sheet open={open} onClose={onClose} title="Fee types">
      <SheetSection title={`Fee types · ${types.length}`}>
        {types.map((t) => (
          <SheetRow key={t.id} title={t.name} sub={t.calc} end={<>
            <span className="shrink-0 flex items-center gap-1.5 text-xs text-[#737373]">Mandatory<Switch checked={t.mandatory} onChange={(m) => set('feeTypes', (l) => l.map((x) => (x.id === t.id ? { ...x, mandatory: m } : x)))} label={`${t.name} mandatory`} /></span>
            <span className="shrink-0 flex items-center gap-1.5 text-xs text-[#737373]">Refundable<Switch checked={t.refundable} onChange={(r) => set('feeTypes', (l) => l.map((x) => (x.id === t.id ? { ...x, refundable: r } : x)))} label={`${t.name} refundable`} /></span>
          </>} />
        ))}
      </SheetSection>
      <p className="mt-3 text-sm leading-5 text-[#737373]">Changes apply to fees added from now on.</p>
    </Sheet>
  );
}
