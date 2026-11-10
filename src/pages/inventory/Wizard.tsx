import { useRef, useState, type ReactNode } from 'react';
import { flushSync } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import {
  ArrowElbowDownRight, Bed, Buildings, BuildingOffice, CalendarBlank, CaretDown, CaretRight, Check, CircleDashed, DotsThree, Door, FileText, Info, MagnifyingGlass, MapPin, Minus, Plus, Stack, Trash, WarningCircle, X,
} from '../../components/icons';
import { Button, Dialog, Field, Input, cx, Pill } from '../../components/ui';
import { invId, useInv, type Property, type Template } from '../../data/inventory';
import { Menu, MoneyInput, Picker, Seg, Stepper } from './common';

type WBlock = { key: string; name: string; floors: number; flats: number; rpf: number; roomType: string; size: string; floorPat: string; flatPat: string; roomPat: string };
type Terms = { weeks: string; rent: string; deposit: string };
const ROOM_TYPES = ['Ensuite single', 'Standard single', 'Studio', 'Ensuite double', 'Accessible ensuite'];
const DEF_TERMS: Record<string, Terms> = { 'Ensuite single': { weeks: '51', rent: '212', deposit: '250' }, 'Standard single': { weeks: '44', rent: '168', deposit: '250' }, Studio: { weeks: '51', rent: '246', deposit: '300' } };
const STEPS = [
  { title: 'Basics', sub: 'Name, campus, layout' }, { title: 'Location', sub: 'Address and zone' }, { title: 'Units', sub: 'Blocks, floors and rooms' },
  { title: 'Rent & terms', sub: 'Tenancy per room type' }, { title: 'Review', sub: 'Check and create' },
];
const rooms = (b: WBlock, house: boolean) => (house ? b.rpf : b.floors * b.flats * b.rpf);
const isNum = (v: string) => /^\d+(\.\d+)?$/.test(v.trim());
const parseDate = (v: string) => { if (!/^\d{1,2} [A-Za-z]{3,9} \d{4}$/.test(v.trim())) return null; const t = Date.parse(v); return Number.isNaN(t) ? null : t; };
const fmt = (n: number) => n.toLocaleString('en-GB');
const Err = ({ children }: { children: ReactNode }) => (children ? <p className="text-xs text-[#C8102E] mt-1.5 flex items-center gap-1"><WarningCircle size={14} className="shrink-0" />{children}</p> : null);

export function AddPropertyWizard() {
  const nav = useNavigate();
  const existing = useInv((s) => s.properties);
  const [step, setStep] = useState(0);
  const [name, setName] = useState('St Mary’s College');
  const [invNo, setInvNo] = useState('SMC-001');
  const [campus, setCampus] = useState<'Durham City' | 'Queen’s Campus'>('Durham City');
  const [letting, setLetting] = useState<'Weekly' | 'Monthly'>('Weekly');
  const [structure, setStructure] = useState<'College' | 'House'>('College');
  const [query, setQuery] = useState('St Mary’s College, Elvet Hill Road');
  const [picked, setPicked] = useState(true);
  const [zone, setZone] = useState('Elvet');
  const [blocks, setBlocks] = useState<WBlock[]>([
    { key: 'b1', name: 'Main House', floors: 4, flats: 4, rpf: 6, roomType: 'Ensuite single', size: '14', floorPat: 'Floor {n}', flatPat: 'Flat {n}', roomPat: 'Room {n}' },
    { key: 'b2', name: 'Fenwick Block', floors: 2, flats: 4, rpf: 6, roomType: 'Standard single', size: '12', floorPat: 'Floor {n}', flatPat: 'Flat {n}', roomPat: 'Room {n}' },
  ]);
  const [openBlock, setOpenBlock] = useState('b1');
  const [terms, setTerms] = useState<Record<string, Terms>>({});
  const [from, setFrom] = useState('19 Sep 2027');
  const [to, setTo] = useState('4 Aug 2028');
  const [billing, setBilling] = useState<'Termly' | 'Monthly' | 'Upfront'>('Termly');
  const creating = useRef(false);
  const nameRefs = useRef<Record<string, HTMLInputElement | null>>({});

  const house = structure === 'House';
  const short = name.replace(/ College$/, '') || 'the property';
  const total = blocks.reduce((a, b) => a + rooms(b, house), 0);
  const floors = house ? 0 : blocks.reduce((a, b) => a + b.floors, 0);
  const flats = house ? 0 : blocks.reduce((a, b) => a + b.floors * b.flats, 0);
  const types = [...new Set(blocks.map((b) => b.roomType))].map((t) => ({ name: t, rooms: blocks.filter((b) => b.roomType === t).reduce((a, b) => a + rooms(b, house), 0), ...(terms[t] ?? DEF_TERMS[t] ?? { weeks: '44', rent: '150', deposit: '250' }) }));
  const setTerm = (t: string, k: keyof Terms, v: string) => setTerms((x) => ({ ...x, [t]: { ...(x[t] ?? DEF_TERMS[t] ?? { weeks: '44', rent: '150', deposit: '250' }), [k]: v } }));
  const upd = (key: string, p: Partial<WBlock>) => setBlocks((bs) => bs.map((b) => (b.key === key ? { ...b, ...p } : b)));
  const addBlock = () => {
    const key = invId('b');
    flushSync(() => {
      setBlocks((bs) => [...bs, { key, name: `Block ${bs.length + 1}`, floors: 2, flats: 4, rpf: 6, roomType: 'Standard single', size: '12', floorPat: 'Floor {n}', flatPat: 'Flat {n}', roomPat: 'Room {n}' }]);
      setOpenBlock(key);
    });
    nameRefs.current[key]?.focus();
  };
  /* ---- Checks (molades-attack, 2026-11-10): every field that feeds money, dates or room counts is validated
     before Continue, and the reason shows in words under the field, never as a grey button alone. ---- */
  const nameErr = !name.trim() ? 'Enter a property name.' : existing.some((p) => p.name.trim().toLowerCase() === name.trim().toLowerCase()) ? `A property called ${name.trim()} already exists.` : '';
  const blockErr = (b: WBlock): string => {
    if (!b.name.trim()) return 'Enter a block name.';
    if (blocks.some((x) => x.key !== b.key && x.name.trim().toLowerCase() === b.name.trim().toLowerCase())) return `Another block is already called ${b.name.trim()}.`;
    if (!isNum(b.size) || +b.size <= 0) return 'Enter a room size in m², e.g. 14.';
    if (!house && b.floors > 1 && !b.floorPat.includes('{n}')) return 'Add {n} to the floor pattern so each floor gets its own number.';
    if (!house && b.flats > 1 && !b.flatPat.includes('{n}')) return 'Add {n} to the flat pattern so each flat gets its own number.';
    if (b.rpf > 1 && !b.roomPat.includes('{n}')) return 'Add {n} to the room pattern so each room gets its own number.';
    return '';
  };
  const BIG = 2000;
  const [bigOk, setBigOk] = useState(false);
  const unitsOk = blocks.length > 0 && blocks.every((b) => !blockErr(b)) && (total <= BIG || bigOk);
  const termErr = (t: { name: string; weeks: string; rent: string; deposit: string }): string => {
    if (!isNum(t.rent) || +t.rent <= 0) return `${t.name}: enter a rent.`;
    if (!/^\d+$/.test(t.weeks) || +t.weeks < 1 || +t.weeks > 52) return `${t.name}: weeks must be between 1 and 52.`;
    if (!isNum(t.deposit)) return `${t.name}: enter a deposit, or 0 for none.`;
    return '';
  };
  const fromD = parseDate(from), toD = parseDate(to);
  const dateErr = !fromD ? 'Enter Available from as a date, e.g. 19 Sep 2027.' : !toD ? 'Enter Available to as a date, e.g. 4 Aug 2028.' : toD <= fromD ? 'Available to must be after Available from.' : '';
  const termErrs = [...types.map(termErr).filter(Boolean), dateErr].filter(Boolean);
  const canNext = step === 0 ? !nameErr : step === 1 ? picked : step === 2 ? unitsOk : step === 3 ? termErrs.length === 0 : true;
  /* Leaving loses every step, so ask first (✕ and Cancel). */
  const [leaving, setLeaving] = useState(false);
  const leave = () => (step > 0 ? setLeaving(true) : nav('/inventory/properties'));

  const create = () => {
    if (creating.current) return;
    creating.current = true;
    const id = name.trim() === 'St Mary’s College' && !existing.some((p) => p.id === 'stm') ? 'stm' : invId('p');
    const extra = id === 'stm' ? 1 : 0;
    const tpls: Template[] = types.map((t) => ({ id: invId('tp'), propertyId: id, name: t.name, weeks: +t.weeks, rent: +t.rent, deposit: +t.deposit, billing, from, to, linked: t.rooms, own: 0, status: 'Active' }));
    const p: Property = {
      id, name: name.trim(), campus, structure, tags: [], units: total, status: 'Draft', address: 'Elvet Hill Road, Durham DH1 3LR', zone, invNo, letting,
      blocks: blocks.map((b) => ({ name: b.name, floors: house ? 1 : b.floors, flats: house ? 1 : b.flats, rooms: rooms(b, house), roomType: b.roomType, size: +b.size })),
      build: total ? { done: 0, total } : null, photos: 0, description: '', amenities: [], wardenPhone: '', createdBy: 'Priya Shah', created: '27 Oct',
      activity: [{ who: 'Priya Shah', what: `${name.trim()} created · building its rooms`, when: 'Just now' }],
      roomTypes: types.map((t) => ({ name: t.name, rooms: t.rooms, rent: +t.rent })), liveTenancies: 0, fees: 1,
      counts: { all: total + extra, active: 0, draft: total + extra, inactive: 0, archived: 0 },
    };
    const st = useInv.getState();
    st.set('properties', (ps) => [...ps.filter((x) => x.id !== id), p]);
    st.set('templates', (ts) => [...ts.filter((x) => x.propertyId !== id), ...tpls]);
    if (total) st.set('imports', (l) => [{ id: invId('im'), name: `${p.name} · ${total} rooms`, kind: 'Bulk create', status: 'Running', done: 0, total, by: 'Priya Shah', started: 'Just now', structure, creates: `1 property · ${total + flats + floors + blocks.length} entities` }, ...l]);
    nav(`/inventory/properties/${id}`, { replace: true });
    toast.success(total ? `${p.name} created · building its rooms` : `${p.name} created as a draft`);
  };

  const done = (i: number) => i < step;
  const summary = [`${name || 'Untitled'} · ${structure} · ${letting.toLowerCase()}`, 'Elvet Hill Road · DH1 3LR', `${total} rooms in ${blocks.length} ${blocks.length === 1 ? 'block' : 'blocks'}`, `${types.length} tenancy templates`, ''];

  return (
    <>
      <div data-page-head className="h-[52px] shrink-0 border-b border-line bg-white flex items-center gap-2 px-4">
        <Buildings size={16} className="text-[#646A78]" />
        <span className="flex items-center gap-2 text-sm text-[#646A78]">Inventory<CaretRight size={12} /></span>
        <button type="button" onClick={() => nav('/inventory/properties')} className="flex items-center gap-2 text-sm text-[#646A78] hover:text-ink">Properties<CaretRight size={12} /></button>
        <h1 className="text-sm font-medium">New property</h1>
        <button type="button" aria-label="Close" onClick={leave} className="ml-auto size-8 rounded-lg hover:bg-gray-100 flex items-center justify-center"><X size={16} /></button>
      </div>
      <div data-wizard className="flex-1 min-h-0 flex">
        {/* Steps. One left edge (16px) shared with the header icon: aside 8 + row border 1 + row padding 7. */}
        <aside className="hidden lg:flex w-[248px] shrink-0 border-r border-line bg-[#FAFAFB] flex-col px-2 py-3">
          <div className="px-2 pt-2 pb-4"><div className="text-xs text-[#646A78]">New property</div><div className="text-sm font-semibold mt-0.5 truncate">{name.trim() || 'Untitled property'}</div></div>
          <ol className="space-y-1">
            {STEPS.map((s, i) => (
              <li key={s.title}>
                <button type="button" disabled={i > step} onClick={() => setStep(i)} className={cx('w-full text-left rounded-xl border px-[7px] py-2.5 flex gap-3 items-start', i === step ? 'bg-white border-line shadow-tile' : 'border-transparent')}>
                  {done(i) ? <span className="size-[22px] rounded-full bg-[#16A34A] text-white flex items-center justify-center shrink-0"><Check size={12} weight="bold" /></span>
                    : <span className={cx('size-[22px] rounded-full text-xs font-semibold flex items-center justify-center shrink-0', i === step ? 'bg-ink text-white' : 'border border-gray-300 text-[#646A78] bg-white')}>{i + 1}</span>}
                  <span className="min-w-0"><span className={cx('block text-sm', i <= step ? 'text-ink font-medium' : 'text-[#646A78]')}>{s.title}</span><span className="block text-xs text-[#646A78] truncate">{done(i) ? summary[i] : s.sub}</span></span>
                </button>
              </li>
            ))}
          </ol>
          <p className="mt-auto px-2 pb-1 text-xs text-[#646A78] flex gap-1.5"><Info size={14} className="shrink-0 mt-px" />Nothing is created until you click Create property on the last step.</p>
        </aside>

        {/* Form */}
        <section className="flex-1 min-w-0 flex flex-col">
          <div className="flex-1 overflow-auto px-6 py-7">
            <div className={cx(step === 1 ? 'max-w-[860px]' : 'max-w-[528px]')}>
              <div className="text-sm text-[#646A78]">Step {step + 1} of 5</div>
              <h2 className="text-xl font-medium tracking-tight mt-1">{STEPS[step].title}</h2>
              <p className="text-sm text-[#646A78] mt-1 mb-6">{[
                'What the property is called and how its units are organised.', 'Pick the place from the search. Its address and pin come from the result.',
                'Build the blocks, floors and rooms. Each room becomes a unit you can let.', 'Make a tenancy template for each room type. Every room gets a draft tenancy from it.', 'Check everything, then create the property.',
              ][step]}</p>

              {step === 0 && (
                <div className="space-y-5">
                  <Field label="Property name"><Input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. St Mary’s College" aria-invalid={!!nameErr} /><Err>{nameErr}</Err></Field>
                  <div className="grid grid-cols-2 gap-4">
                    <Field label="Inventory number" hint="Optional · your own reference"><Input className="font-mono" value={invNo} onChange={(e) => setInvNo(e.target.value)} /></Field>
                    <Field label="Campus"><Picker value={campus} onChange={setCampus} icon={BuildingOffice} options={[{ id: 'Durham City', label: 'Durham City' }, { id: 'Queen’s Campus', label: 'Queen’s Campus' }]} /></Field>
                  </div>
                  <div>
                    <div className="text-sm font-medium text-gray-700 mb-1.5">Letting period</div>
                    <Seg value={letting} onChange={setLetting} options={['Weekly', 'Monthly']} className="w-80" />
                    <p className="text-xs text-[#646A78] mt-1.5">Rent and tenancy length use this unit. You can switch later.</p>
                  </div>
                  <div>
                    <div className="text-sm font-medium text-gray-700 mb-1.5">Property layout</div>
                    <div className="space-y-2">
                      {([['College', 6, ['Property', 'Block', 'Floor', 'Flat', 'Room']], ['House', 2, ['Property', 'Room']]] as const).map(([s, n, lv]) => (
                        <div key={s} role="radio" aria-checked={structure === s} tabIndex={0} onClick={() => setStructure(s)} onKeyDown={(e) => e.key === ' ' && setStructure(s)}
                          className={cx('rounded-xl border p-3.5 flex gap-3 cursor-pointer', structure === s ? 'border-primary bg-[#F5F9FF] ring-2 ring-primary/15' : 'border-line hover:bg-gray-50')}>
                          <span className={cx('size-4 mt-0.5 rounded-full border flex items-center justify-center shrink-0', structure === s ? 'border-primary bg-primary' : 'border-gray-300')}>{structure === s && <span className="size-1.5 rounded-full bg-white" />}</span>
                          <div><div className="text-sm"><span className="font-semibold">{s}</span><span className="text-sm text-[#646A78] ml-2">Used by {n} properties</span></div>
                            <div className="flex items-center gap-1.5 mt-2">{lv.map((l, i) => <span key={l} className="flex items-center gap-1.5">{i > 0 && <CaretRight size={10} className="text-gray-400" />}<span className="h-[22px] px-2 rounded-md border border-line bg-white text-xs flex items-center">{l}</span></span>)}</div></div>
                        </div>
                      ))}
                    </div>
                    <button type="button" onClick={() => nav('/inventory/structures')} className="mt-2.5 text-sm text-primary flex items-center gap-1.5"><Plus size={13} />New property layout</button>
                  </div>
                </div>
              )}

              {step === 1 && (
                <div className="space-y-5">
                  <Field label="Find the address">
                    <div className="relative">
                      <label className="h-8 flex items-center gap-2 rounded-lg border border-gray-300 px-2.5 text-sm focus-within:border-primary focus-within:ring-2 focus-within:ring-primary/25">
                        <MagnifyingGlass size={14} className="text-gray-400" />
                        <input value={query} onChange={(e) => { setQuery(e.target.value); setPicked(false); }} placeholder="Search a place or postcode" className="flex-1 outline-none" />
                        {query && <button type="button" aria-label="Clear" onClick={() => { setQuery(''); setPicked(false); }} className="-mr-1.5 size-6 rounded-md flex items-center justify-center text-[#646A78] hover:bg-gray-100"><X size={12} /></button>}
                      </label>
                      {!picked && query.length > 1 && (
                        <div className="absolute left-0 right-0 top-10 z-20 rounded-xl border border-line bg-white shadow-pop p-1">
                          <button type="button" onClick={() => { setQuery('St Mary’s College, Elvet Hill Road'); setPicked(true); }} className="w-full px-2.5 py-2 rounded-lg hover:bg-gray-50 flex items-start gap-2 text-left">
                            <MapPin size={15} className="text-primary mt-0.5" /><span><span className="block text-sm font-medium">St Mary’s College, Elvet Hill Road</span><span className="block text-xs text-[#646A78]">Durham DH1 3LR, United Kingdom</span></span>
                          </button>
                        </div>
                      )}
                    </div>
                  </Field>
                  <MapArt picked={picked} />
                  {picked && (
                    <div className="rounded-xl border border-line p-3.5 flex items-center gap-3">
                      <MapPin size={18} className="text-primary" />
                      <div className="flex-1"><div className="text-sm font-medium">St Mary’s College, Elvet Hill Road</div><div className="text-xs text-[#646A78]">Durham DH1 3LR, United Kingdom</div></div>
                      <button type="button" onClick={() => { setPicked(false); setQuery(''); }} className="text-sm text-primary">Change</button>
                    </div>
                  )}
                  <div className="max-w-80"><Field label="Zone" hint="Optional · groups nearby properties"><Input value={zone} onChange={(e) => setZone(e.target.value)} /></Field></div>
                </div>
              )}

              {step === 2 && (
                <div className="space-y-4">
                  <div className="relative rounded-xl border-[1.5px] border-dashed border-gray-300 p-3.5 flex items-center gap-3">
                    <FileText size={16} className="text-[#646A78]" />
                    <span className="flex-1 text-sm">Already have every room in a spreadsheet? Import the whole property from a CSV instead.</span>
                    <button type="button" onClick={() => nav('/inventory/properties?import=1')} className="text-sm text-primary">Import instead</button>
                    <span className="absolute -top-2.5 right-3"><Pill outline icon={ArrowElbowDownRight}>Flow 2</Pill></span>
                  </div>
                  {blocks.map((b) => openBlock === b.key ? (
                    <div key={b.key} className="rounded-xl border border-line bg-white">
                      <div className="h-14 px-3.5 flex items-center gap-3 border-b border-line">
                        <Buildings size={16} className="text-[#646A78]" />
                        <label className="flex items-center gap-2 text-sm text-[#646A78]">Block name
                          <Input ref={(el: HTMLInputElement | null) => { nameRefs.current[b.key] = el; }} value={b.name} onChange={(e) => upd(b.key, { name: e.target.value })} className="w-48 text-ink" /></label>
                        <span className="ml-auto text-sm font-medium whitespace-nowrap">{fmt(rooms(b, house))} rooms</span>
                        {blocks.length > 1 && <Menu width={160} trigger={(o) => <button type="button" aria-label="Block menu" onClick={o} className="size-8 rounded-md hover:bg-gray-100 flex items-center justify-center text-[#646A78]"><DotsThree size={18} weight="bold" /></button>}
                          items={[{ label: 'Remove block', icon: Trash, danger: true, onClick: () => { setBlocks((bs) => bs.filter((x) => x.key !== b.key)); } }]} />}
                      </div>
                      <div className="p-3.5 grid grid-cols-[120px_auto_1fr] gap-x-4 gap-y-3 items-center text-sm">
                        <span /><span className="text-xs text-[#646A78]">Count</span><span className="text-xs text-[#646A78]">Name pattern</span>
                        {!house && <><span>Floors</span><Stepper value={b.floors} onChange={(n) => upd(b.key, { floors: n })} /><Input className="font-mono" value={b.floorPat} onChange={(e) => upd(b.key, { floorPat: e.target.value })} aria-label="Floor name pattern" /></>}
                        {!house && <><span>Flats per floor</span><Stepper value={b.flats} onChange={(n) => upd(b.key, { flats: n })} /><Input className="font-mono" value={b.flatPat} onChange={(e) => upd(b.key, { flatPat: e.target.value })} aria-label="Flat name pattern" /></>}
                        <span>{house ? 'Rooms' : 'Rooms per flat'}</span><Stepper value={b.rpf} onChange={(n) => upd(b.key, { rpf: n })} /><Input className="font-mono" value={b.roomPat} onChange={(e) => upd(b.key, { roomPat: e.target.value })} aria-label="Room name pattern" />
                        <span>Room type</span><div className="col-span-2"><Picker value={b.roomType} onChange={(v) => upd(b.key, { roomType: v })} icon={Bed} options={ROOM_TYPES.map((t) => ({ id: t, label: t }))} /></div>
                        <span>Room size <span className="text-[#E0243A]">*</span></span>
                        <label className="h-8 w-[152px] flex items-center rounded-lg border border-gray-300 px-2.5 focus-within:border-primary focus-within:ring-2 focus-within:ring-primary/25"><input aria-label="Room size" value={b.size} onChange={(e) => upd(b.key, { size: e.target.value.replace(/[^0-9.]/g, '') })} className="flex-1 min-w-0 outline-none" /><span className="text-gray-400 text-xs">m²</span></label>
                        <span className="text-xs text-[#646A78]">Set on all {fmt(rooms(b, house))} rooms</span>
                      </div>
                      {blockErr(b) && <div className="px-3.5 pb-3.5 -mt-1.5"><Err>{blockErr(b)}</Err></div>}
                    </div>
                  ) : (
                    <button key={b.key} type="button" onClick={() => setOpenBlock(b.key)} className="w-full h-14 rounded-xl border border-line bg-white px-3.5 flex items-center gap-3 text-left hover:bg-gray-50">
                      <Buildings size={16} className="text-[#646A78]" />
                      <span className="text-sm font-medium whitespace-nowrap">{b.name}</span>
                      <span className="min-w-0 text-xs text-[#646A78] truncate">{blockErr(b) ? <span className="text-[#C8102E]">Needs a fix</span> : <>{house ? `${b.rpf} rooms` : `${b.floors} floors × ${b.flats} flats × ${b.rpf} rooms`} · {b.roomType}</>}</span>
                      <span className="ml-auto text-sm font-medium whitespace-nowrap">{fmt(rooms(b, house))} rooms</span><CaretDown size={14} className="text-gray-400 shrink-0" />
                    </button>
                  ))}
                  <button type="button" onClick={addBlock} className="w-full h-10 rounded-xl border border-dashed border-gray-300 text-sm flex items-center justify-center gap-2 hover:bg-gray-50"><Plus size={14} />Add block</button>
                  {total > BIG && (
                    <label className="rounded-xl border border-[#F5C26B] p-3.5 flex gap-3 items-start cursor-pointer">
                      <input type="checkbox" checked={bigOk} onChange={(e) => setBigOk(e.target.checked)} className="mt-0.5 size-4 accent-primary" />
                      <span><span className="block text-sm font-medium text-[#B45309]">That’s {fmt(total)} rooms</span><span className="block text-xs text-[#646A78] mt-0.5">Far more than a typical hall. Check the counts, or tick to confirm.</span></span>
                    </label>
                  )}
                </div>
              )}

              {step === 3 && (
                <div className="space-y-5">
                  <div className="rounded-xl border border-line overflow-hidden">
                    <table className="w-full text-sm table-fixed">
                      <colgroup><col /><col className="w-16" /><col className="w-[72px]" /><col className="w-[108px]" /><col className="w-[116px]" /></colgroup>
                      <thead><tr className="text-left text-xs text-[#646A78] bg-[#F9FAFB] border-b border-line"><th className="font-medium h-9 px-4">New template</th><th className="font-medium text-right px-2">Rooms</th><th className="font-medium px-2">Weeks</th><th className="font-medium px-2">Rent / {letting === 'Weekly' ? 'wk' : 'mo'}</th><th className="font-medium px-2 pr-3">Deposit</th></tr></thead>
                      <tbody>
                        {types.map((t) => (
                          <tr key={t.name} className="border-b border-[#F3F4F6] last:border-0">
                            <td className="h-12 px-4"><span className="flex items-center gap-2 text-sm"><Bed size={15} className="text-[#646A78]" />{t.name}</span></td>
                            <td className="text-right px-2 text-sm">{fmt(t.rooms)}</td>
                            <td className="px-2"><Input aria-label={`${t.name} weeks`} value={t.weeks} onChange={(e) => setTerm(t.name, 'weeks', e.target.value.replace(/\D/g, ''))} /></td>
                            <td className="px-2"><MoneyInput value={t.rent} onChange={(v) => setTerm(t.name, 'rent', v)} /></td>
                            <td className="px-2 pr-3"><MoneyInput value={t.deposit} onChange={(v) => setTerm(t.name, 'deposit', v)} /></td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  {termErrs.length > (dateErr ? 1 : 0) && <div className="-mt-2">{termErrs.filter((e) => e !== dateErr).map((e) => <Err key={e}>{e}</Err>)}</div>}
                  <div>
                    <div className="grid grid-cols-3 gap-4">
                      <Field label="Available from"><DateInput value={from} onChange={setFrom} /></Field>
                      <Field label="Available to"><DateInput value={to} onChange={setTo} /></Field>
                      <Field label="Billing"><Picker value={billing} onChange={setBilling} options={[{ id: 'Termly', label: 'Termly' }, { id: 'Monthly', label: 'Monthly' }, { id: 'Upfront', label: 'Upfront' }]} /></Field>
                    </div>
                    <Err>{dateErr}</Err>
                  </div>
                  <div className="rounded-xl border border-line p-3.5 flex items-center">
                    <div><div className="text-sm font-medium">Organisation-wide fees apply</div><div className="text-xs text-[#646A78]">Contents insurance · £45 per tenancy</div></div>
                    <button type="button" onClick={() => nav('/inventory/rent-fees?tab=fees')} className="ml-auto text-sm text-primary">Rent and fees</button>
                  </div>
                </div>
              )}

              {step === 4 && (
                <div className="space-y-4">
                  <div className="rounded-xl border border-line divide-y divide-line">
                    {([
                      ['Basics', name, `${campus} · ${structure} layout · ${letting.toLowerCase()} · Inventory no. ${invNo || '—'}`, 0],
                      ['Location', 'Elvet Hill Road, Durham DH1 3LR', zone ? `Zone ${zone}` : 'No zone', 1],
                      ['Units', `${fmt(total)} rooms`, `${blocks.map((b) => `${b.name} ${fmt(rooms(b, house))}`).join(' · ')}`, 2],
                      ['Rent & terms', `${types.length} new tenancy templates · ${fmt(total)} draft tenancies`, `${types.map((t) => `${t.name} £${t.rent} · ${t.weeks} wk`).join(' · ')} · ${from} to ${to} · ${billing.toLowerCase()}`, 3],
                    ] as const).map(([k, a, b, s]) => (
                      <div key={k} className="px-3.5 py-3 grid grid-cols-[132px_1fr_auto] gap-3 items-center">
                        <span className="text-sm text-[#646A78]">{k}</span>
                        <span><span className="block text-sm font-medium">{a}</span><span className="block text-xs text-[#646A78]">{b}</span></span>
                        <button type="button" onClick={() => setStep(s)} className="text-sm text-primary">Edit</button>
                      </div>
                    ))}
                  </div>
                  <div className="rounded-xl border border-line bg-[#FAFAFB] p-3.5 flex gap-2.5 text-sm">
                    <CircleDashed size={16} className="text-[#646A78] shrink-0 mt-px" />
                    <span>Everything is created as Draft. Nobody can book it until you make it active (Flow 4). Photos and a description are added on the property page.</span>
                  </div>
                </div>
              )}
            </div>
          </div>
          <div className="h-16 shrink-0 border-t border-line px-6 flex items-center">
            {step === 0 ? <Button variant="ghost" onClick={leave}>Cancel</Button> : <Button variant="ghost" onClick={() => setStep(step - 1)}>Back</Button>}
            <div className="ml-auto">
              {step < 4 ? <Button variant="primary" icon={null} disabled={!canNext} onClick={() => setStep(step + 1)}>Continue</Button>
                : <Button variant="primary" icon={Check} onClick={create}>Create property</Button>}
            </div>
          </div>
        </section>

        {/* Right panel */}
        <aside className="hidden xl:block w-[336px] shrink-0 border-l border-line overflow-auto p-5">
          {step <= 1 && step === 0 && (
            <>
              <PanelHead title="Preview" sub={`How ${short} will look in Inventory`} />
              <div className="rounded-xl border border-line p-3.5 space-y-3 text-sm">
                {(structure === 'College' ? [['Property', name || 'Untitled', Buildings], ['Block', 'e.g. Main House', BuildingOffice], ['Floor', 'e.g. Floor 1', Stack], ['Flat', 'e.g. Flat 1', Door], ['Room', 'e.g. Room 1 · the unit you let', Bed]] as const
                  : [['Property', name || 'Untitled', Buildings], ['Room', 'e.g. Room 1 · the unit you let', Bed]] as const).map(([l, ex, I], i) => (
                  <div key={l} className="flex items-start gap-2" style={{ paddingLeft: i * 16 }}>
                    <I size={15} className={cx('mt-0.5', l === 'Room' ? 'text-primary' : 'text-[#646A78]')} /><span className="font-medium">{l}</span><span className="text-xs text-[#646A78] mt-0.5">{ex}</span>
                  </div>
                ))}
              </div>
              <Hint>You’ll build these levels in Units. The structure can’t change once rooms exist.</Hint>
            </>
          )}
          {step === 1 && (
            <>
              <PanelHead title="Preview" sub={`How ${short} will look in Inventory`} />
              <div className="rounded-xl border border-line p-3.5 text-sm space-y-2">
                <div className="flex items-center gap-2"><Buildings size={15} className="text-[#646A78]" /><span className="font-medium">{name}</span></div>
                <div className="flex items-start gap-2 text-[#646A78]"><MapPin size={15} className="text-[#646A78] mt-px" />{picked ? 'Elvet Hill Road, Durham DH1 3LR' : 'No address yet'}</div>
                {zone && <div className="text-[#646A78] pl-6">Zone {zone}</div>}
              </div>
              <Hint>The pin is used for distances on the student site.</Hint>
            </>
          )}
          {step === 2 && (
            <>
              <div className="flex items-start justify-between"><PanelHead title="Preview" sub="Nothing is created until the last step" /><span className="text-sm font-semibold whitespace-nowrap">{fmt(total)} rooms</span></div>
              <div className="rounded-xl border border-line p-2"><PreviewTree blocks={blocks} house={house} /></div>
              <div className="flex flex-wrap gap-1.5 mt-3">
                {[[blocks.length, 'blocks'], ...(house ? [] : [[floors, 'floors'], [flats, 'flats']]), [total, 'rooms']].map(([n, l]) => <span key={l} className="h-6 px-2 rounded-md border border-line text-xs flex items-center gap-1"><b className="font-semibold">{n}</b><span className="text-[#646A78]">{l}</span></span>)}
              </div>
              <Hint>{'{n}'} counts up from 1 under each parent. Rename or change a single room later, in Inventory.</Hint>
            </>
          )}
          {step === 3 && (
            <>
              <PanelHead title="What gets created" sub="When you click Create property" />
              <div className="rounded-xl border border-line divide-y divide-line">
                {types.map((t) => <div key={t.name} className="px-3.5 py-3 flex items-center"><div><div className="text-sm font-medium">{t.name} · {t.weeks} wk</div><div className="text-xs text-[#646A78]">New template · {short}</div></div><span className="ml-auto text-sm font-medium">{fmt(t.rooms)} tenancies</span></div>)}
              </div>
              <Hint>Templates belong to one property. A later edit to a template is copied to its linked tenancies (Flow 5).</Hint>
            </>
          )}
          {step === 4 && (
            <>
              <PanelHead title="What happens next" sub="In this order" />
              <ol className="space-y-4">
                {[['Property', `${short} is saved as a draft with its address and zone.`], ['Templates', `The ${types.length === 2 ? 'two' : types.length} tenancy templates are made for ${short}.`], ['Rooms and tenancies', `${blocks.length} blocks, ${floors} floors, ${fmt(flats)} flats and ${fmt(total)} rooms are built in the background, each room with a draft tenancy. All or nothing; you get an email.`]].map(([a, b], i) => (
                  <li key={a} className="flex gap-3"><span className={cx('size-[22px] rounded-full text-xs font-semibold flex items-center justify-center shrink-0', i === 0 ? 'bg-ink text-white' : 'border border-gray-300 text-[#646A78]')}>{i + 1}</span><span><span className="block text-sm font-medium">{a}</span><span className="block text-xs text-[#646A78] mt-0.5">{b}</span></span></li>
                ))}
              </ol>
            </>
          )}
        </aside>
      </div>
      <Dialog open={leaving} onClose={() => setLeaving(false)} title="Discard this property?" sub="Nothing has been created yet. What you entered in these steps will be lost."
        footer={<><Button variant="ghost" onClick={() => setLeaving(false)}>Keep editing</Button><Button variant="danger" icon={null} onClick={() => nav('/inventory/properties')}>Discard</Button></>}>{null}</Dialog>
    </>
  );
}

const PanelHead = ({ title, sub }: { title: string; sub: string }) => <div className="mb-4"><div className="text-sm font-semibold">{title}</div><div className="text-xs text-[#646A78] mt-0.5">{sub}</div></div>;
const Hint = ({ children }: { children: ReactNode }) => <p className="text-xs text-[#646A78] mt-4 flex gap-1.5"><Info size={14} className="shrink-0 mt-px" />{children}</p>;

function DateInput({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return <label className="h-8 flex items-center gap-2 rounded-lg border border-gray-300 px-2.5 text-sm focus-within:border-primary focus-within:ring-2 focus-within:ring-primary/25"><CalendarBlank size={14} className="text-gray-400" /><input value={value} onChange={(e) => onChange(e.target.value)} className="flex-1 min-w-0 outline-none" /></label>;
}

function MapArt({ picked }: { picked: boolean }) {
  return (
    <div className="relative h-[216px] rounded-xl border border-line overflow-hidden bg-[#EEF0EB]">
      <div className="absolute inset-y-0 left-[196px] w-2 bg-white" /><div className="absolute inset-y-0 left-[412px] w-2 bg-white" />
      <div className="absolute inset-x-0 top-16 h-2 bg-white" /><div className="absolute inset-x-0 top-[176px] h-2 bg-white" />
      <div className="absolute inset-x-0 top-32 h-5 bg-[#DBE6F6]" />
      <div className="absolute left-9 top-4 w-28 h-9 rounded-md bg-[#DDEFD9]" /><div className="absolute left-[440px] top-[84px] w-20 h-8 rounded-md bg-[#DDEFD9]" />
      <span className="absolute left-[400px] top-5"><Pill outline icon={BuildingOffice}>Durham City campus</Pill></span>
      {picked && <span className="absolute left-[232px] top-[74px] size-9 rounded-full bg-primary text-white ring-4 ring-primary/20 flex items-center justify-center"><Buildings size={16} /></span>}
      <div className="absolute right-3 bottom-3 rounded-lg bg-white border border-line flex flex-col"><button type="button" aria-label="Zoom in" className="size-7 flex items-center justify-center border-b border-line"><Plus size={12} /></button><button type="button" aria-label="Zoom out" className="size-7 flex items-center justify-center"><Minus size={12} /></button></div>
    </div>
  );
}

function PreviewTree({ blocks, house }: { blocks: WBlock[]; house: boolean }) {
  const [open, setOpen] = useState<Record<string, boolean>>({ [`${blocks[0]?.key}`]: true, [`${blocks[0]?.key}-1`]: true, [`${blocks[0]?.key}-1-1`]: true });
  const tog = (k: string) => setOpen((o) => ({ ...o, [k]: !o[k] }));
  const pat = (p: string, n: number) => p.replace('{n}', String(n));
  const Row = ({ depth, k, icon: I, label, n, leaf, sub }: { depth: number; k?: string; icon: typeof Bed; label: string; n?: number | string; leaf?: boolean; sub?: string }) => (
    <div className="h-7 flex items-center gap-1.5 text-sm rounded-md hover:bg-gray-50 cursor-pointer" style={{ paddingLeft: depth * 14 }} onClick={() => k && tog(k)}>
      {leaf ? <span className="w-3" /> : open[k ?? ''] ? <CaretDown size={11} className="text-gray-400" /> : <CaretRight size={11} className="text-gray-400" />}
      <I size={14} className={leaf ? 'text-primary' : 'text-[#646A78]'} /><span className={depth === 0 ? 'font-medium' : ''}>{label}</span>
      {sub && <span className="ml-auto text-xs text-gray-400 pr-1.5">{sub}</span>}{n !== undefined && !sub && <span className="ml-auto text-xs text-gray-400 pr-1.5">{n}</span>}
    </div>
  );
  return (
    <div>
      {blocks.map((b) => (
        <div key={b.key}>
          <Row depth={0} k={b.key} icon={Buildings} label={b.name} n={fmt(rooms(b, house))} />
          {open[b.key] && (house ? <Row depth={1} icon={Bed} leaf label={`Rooms 1–${b.rpf}`} sub={b.roomType} /> : Array.from({ length: b.floors }, (_, f) => (
            <div key={f}>
              <Row depth={1} k={`${b.key}-${f + 1}`} icon={Stack} label={pat(b.floorPat, f + 1)} n={fmt(b.flats * b.rpf)} />
              {open[`${b.key}-${f + 1}`] && Array.from({ length: b.flats }, (_, t) => (
                <div key={t}>
                  <Row depth={2} k={`${b.key}-${f + 1}-${t + 1}`} icon={Door} label={pat(b.flatPat, t + 1)} n={b.rpf} />
                  {open[`${b.key}-${f + 1}-${t + 1}`] && <Row depth={3} icon={Bed} leaf label={`${b.roomPat.replace(' {n}', 's').replace('{n}', '')} 1–${b.rpf}`} sub={b.roomType} />}
                </div>
              ))}
            </div>
          )))}
        </div>
      ))}
    </div>
  );
}
