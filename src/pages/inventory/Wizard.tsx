import { FooterZone } from '../../components/headerCtx';
import { useRef, useState, type ReactNode } from 'react';
import { flushSync } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import {
  Bed, Buildings, CalendarBlank, Info, CaretDown, Check, DotsThree, MagnifyingGlass, MapPin, Minus, Plus, Trash, WarningCircle, X, type Icon,
} from '../../components/icons';
import { Button, Confirm, Field, Input, SheetFacts, SheetRow, SheetSection, cx, toneCls } from '../../components/ui';
import { Illustration } from '../../components/Illustration';
import { Dialog as Modal, DialogContent, DialogTitle } from '../../components/shadcn/dialog';
import { Tooltip, TooltipContent, TooltipTrigger } from '../../components/shadcn/tooltip';
import { invId, useInv, type Property, type Template } from '../../data/inventory';
import { EditLink, LV, LayoutRadios, useLayout, Menu, Modal as InvConfirm, MoneyInput, Picker, Stepper, type Level } from './common';

type WBlock = { key: string; name: string; floors: number; flats: number; rpf: number; roomType: string; size: string; floorPat: string; flatPat: string; roomPat: string };
const EYEBROW = 'font-mono text-[11px] leading-4 font-medium uppercase tracking-[0.04em]';
type Terms = { weeks: string; rent: string; deposit: string };
const ROOM_TYPES = ['Ensuite single', 'Standard single', 'Studio', 'Ensuite double', 'Accessible ensuite'];
const DEF_TERMS: Record<string, Terms> = { 'Ensuite single': { weeks: '51', rent: '212', deposit: '250' }, 'Standard single': { weeks: '44', rent: '168', deposit: '250' }, Studio: { weeks: '51', rent: '246', deposit: '300' } };
/* Figma "B · Left rail" (4119:17380, 2026-11-19): a numbered step list down the left, one hint line per step, neutral ink. */
const STEPS: { title: string; sub: string }[] = [
  { title: 'Basics', sub: 'Name, location, layout' }, { title: 'Address', sub: 'Address and zone' }, { title: 'Units', sub: 'Blocks, floors, rooms' },
  { title: 'Rent & terms', sub: 'Templates and dates' }, { title: 'Review', sub: 'Check and create' },
];
/* One colour per level, from the tag-pill tones (2026-11-13): the layout cards, the previews, the Units tree and its
   counts all use it, so a level reads the same everywhere in the flow. */
/** A level's icon on its tone at 10%, as the tag pills. */
const LevelTile = ({ level, icon: I, size = 24 }: { level: Level; icon: Icon; size?: number }) => (
  <span className={cx('rounded-md flex items-center justify-center shrink-0', toneCls[LV[level]])} style={{ width: size, height: size }}><I size={Math.round(size * 0.6)} strokeWidth={1.5} /></span>
);
type Shape = { floors: boolean; flats: boolean };
const rooms = (b: WBlock, s: Shape) => (s.floors ? b.floors : 1) * (s.flats ? b.flats : 1) * b.rpf;
const isNum = (v: string) => /^\d+(\.\d+)?$/.test(v.trim());
const parseDate = (v: string) => { if (!/^\d{1,2} [A-Za-z]{3,9} \d{4}$/.test(v.trim())) return null; const t = Date.parse(v); return Number.isNaN(t) ? null : t; };
const fmt = (n: number) => n.toLocaleString('en-GB');
const Err = ({ children }: { children: ReactNode }) => (children ? <p className="text-xs text-[#C8102E] mt-1.5 flex items-center gap-1"><WarningCircle size={14} className="shrink-0" />{children}</p> : null);

export function AddPropertyWizard() {
  const nav = useNavigate();
  const existing = useInv((s) => s.properties);
  const [step, setStep] = useState(0);
  const [name, setName] = useState('');
  const [nameTouched, setNameTouched] = useState(false);
  const [invNo, setInvNo] = useState('');
  const [campus, setCampus] = useState<'Durham City' | 'Queen’s Campus'>('Durham City');
  const [letting, setLetting] = useState<'Weekly' | 'Monthly'>('Weekly');
  const [layoutName, setStructure] = useState('Blocks with flats');
  const shape = useLayout(layoutName);
  const structure = shape.kind;
  const unitLc = shape.unit.toLowerCase();
  const [query, setQuery] = useState('');
  const [picked, setPicked] = useState(false);
  const [zone, setZone] = useState('');
  const [blocks, setBlocks] = useState<WBlock[]>([
    { key: 'b1', name: 'Main House', floors: 4, flats: 4, rpf: 6, roomType: 'Ensuite single', size: '14', floorPat: 'Floor {n}', flatPat: 'Flat {n}', roomPat: 'Room {n}' },
    { key: 'b2', name: 'Fenwick Block', floors: 2, flats: 4, rpf: 6, roomType: 'Standard single', size: '12', floorPat: 'Floor {n}', flatPat: 'Flat {n}', roomPat: 'Room {n}' },
  ]);
  const [openBlock, setOpenBlock] = useState('b1');
  const [terms, setTerms] = useState<Record<string, Terms>>({});
  const [from, setFrom] = useState('19 Sep 2027');
  const [to, setTo] = useState('4 Aug 2028');
  const [billing, setBilling] = useState<'Weekly' | 'Monthly' | 'Upfront'>('Weekly');
  const creating = useRef(false);
  /* Creating is instant, so the review ends in a confirmation popup, not a "what happens next" list (2026-11-19). */
  const [done, setDone] = useState<Property | null>(null);
  const nameRefs = useRef<Record<string, HTMLInputElement | null>>({});

  const house = !shape.floors;
  const total = blocks.reduce((a, b) => a + rooms(b, shape), 0);
  const floors = house ? 0 : blocks.reduce((a, b) => a + b.floors, 0);
  const flats = !shape.flats ? 0 : blocks.reduce((a, b) => a + b.floors * b.flats, 0);
  const types = [...new Set(blocks.map((b) => b.roomType))].map((t) => ({ name: t, rooms: blocks.filter((b) => b.roomType === t).reduce((a, b) => a + rooms(b, shape), 0), ...(terms[t] ?? DEF_TERMS[t] ?? { weeks: '44', rent: '150', deposit: '250' }) }));
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
    if (shape.flats && b.flats > 1 && !b.flatPat.includes('{n}')) return 'Add {n} to the flat pattern so each flat gets its own number.';
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
  const leave = () => (step > 0 || name.trim() || invNo.trim() ? setLeaving(true) : nav('/inventory/properties'));

  const create = () => {
    if (creating.current) return;
    creating.current = true;
    const id = name.trim() === 'St Mary’s College' && !existing.some((p) => p.id === 'stm') ? 'stm' : invId('p');
    const extra = id === 'stm' ? 1 : 0;
    const tpls: Template[] = types.map((t) => ({ id: invId('tp'), propertyId: id, name: t.name, weeks: +t.weeks, rent: +t.rent, deposit: +t.deposit, billing, from, to, linked: t.rooms, own: 0, status: 'Active' }));
    const p: Property = {
      id, name: name.trim(), campus, structure, layout: shape.name, tags: [], units: total, status: 'Draft', address: 'Elvet Hill Road, Durham DH1 3LR', zone, invNo, letting,
      blocks: blocks.map((b) => ({ name: b.name, floors: house ? 1 : b.floors, flats: shape.flats ? b.flats : 1, rooms: rooms(b, shape), roomType: b.roomType, size: +b.size })),
      build: total ? { done: 0, total } : null, photos: 0, description: '', amenities: [], wardenPhone: '', createdBy: 'Arjun Mehta', created: '27 Oct',
      activity: [{ who: 'Arjun Mehta', what: `${name.trim()} created · building its rooms`, when: 'Just now' }],
      roomTypes: types.map((t) => ({ name: t.name, rooms: t.rooms, rent: +t.rent })), liveTenancies: 0, fees: 1,
      counts: { all: total + extra, active: 0, draft: total + extra, inactive: 0, archived: 0 },
    };
    const st = useInv.getState();
    st.set('properties', (ps) => [...ps.filter((x) => x.id !== id), p]);
    st.set('templates', (ts) => [...ts.filter((x) => x.propertyId !== id), ...tpls]);
    if (total) st.set('imports', (l) => [{ id: invId('im'), name: `${p.name} · ${total} rooms`, kind: 'New property', status: 'Running', done: 0, total, by: 'Arjun Mehta', started: 'Just now', structure: shape.name, creates: `1 property · ${total + flats + floors + blocks.length} entities` }, ...l]);
    setDone(p);
  };


  const i9 = 'h-9';
  return (
    <>
      {/* Centred modal over the Properties list (Figma "Modal · Add property": 960×840, r16, 40% #0A0A0A dim). */}
      <Modal open={!done} onOpenChange={(o) => { if (!o && !leaving) leave(); }}>
        {/* Keep focus on the modal itself on open, so the ✕ doesn't open with a focus ring. */}
        <DialogContent aria-describedby={undefined} onOpenAutoFocus={(e) => { e.preventDefault(); (e.currentTarget as HTMLElement | null)?.focus(); }} className="max-w-[960px] h-[min(840px,calc(100vh-32px))] max-h-none">
          {/* Control bar, as the side panels (2026-11-19): 61px, the flow in 11px mono caps with "STEP 1 OF 5", then close. */}
          <div className="h-[61px] shrink-0 border-b border-[#E5E5E5] pl-6 pr-5 flex items-center gap-2">
            <DialogTitle className={cx(EYEBROW, 'flex-none w-auto text-[#737373] shrink-0')}>Create property</DialogTitle>
            <span aria-hidden className="text-xs text-[#A3A3A3]">·</span>
            <span className={cx(EYEBROW, 'text-[#A3A3A3] tabular-nums')}>Step {step + 1} of {STEPS.length}</span>
            <span aria-hidden className="flex-1" />
            <button type="button" aria-label="Close" onClick={leave} className="size-7 shrink-0 rounded-lg border border-[#E5E5E5] bg-white shadow-[0_1px_2px_rgba(0,0,0,0.05)] text-[#0A0A0A] hover:bg-[#F5F5F5] flex items-center justify-center outline-none focus-visible:ring-2 focus-visible:ring-ring"><X size={16} strokeWidth={1.5} /></button>
          </div>

          <div className="flex-1 min-h-0 flex">
            {/* Rail: 240px #FAFAFA. Current = white raised row with a green (#0B8A4C) number; done = grey disc with a check, clickable
                to go back; upcoming = outlined grey number. */}
            <nav aria-label="Steps" className="w-[240px] shrink-0 bg-[#FAFAFA] border-r border-[#E5E5E5] overflow-auto px-4 py-6">
              <ol className="flex flex-col gap-1">
                {STEPS.map((s, i) => {
                  const done = i < step, cur = i === step;
                  return (
                    <li key={s.title}>
                      <button type="button" disabled={i > step} onClick={() => setStep(i)} aria-current={cur ? 'step' : undefined}
                        className={cx('w-full text-left rounded-[10px] p-2.5 flex items-start gap-3 outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-default border',
                          cur ? 'bg-white border-[#E5E5E5] shadow-[0_1px_2px_rgba(0,0,0,0.05)]' : 'border-transparent', done && 'hover:bg-[#F0F0F0]')}>
                        <span className={cx('size-6 shrink-0 rounded-full flex items-center justify-center text-xs font-medium tabular-nums',
                          cur ? 'bg-[#0B8A4C] text-white' : done ? 'bg-[#E5E5E5] text-[#0A0A0A]' : 'bg-white border border-[#D4D4D4] text-[#737373]')}>
                          {done ? <Check size={12} strokeWidth={2} /> : i + 1}
                        </span>
                        <span className="min-w-0">
                          <span className={cx('block text-sm leading-5 font-medium', cur || done ? 'text-[#0A0A0A]' : 'text-[#737373]')}>{s.title}</span>
                          <span className={cx('block text-xs leading-4', cur ? 'text-[#737373]' : 'text-[#A3A3A3]')}>{s.sub}</span>
                        </span>
                      </button>
                    </li>
                  );
                })}
              </ol>
            </nav>
            <section className="flex-1 min-w-0 overflow-auto px-8 py-6">
              {/* Hero, as the side panels: the step name at 20px Medium and one grey line under it; then r16 section cards
                  with a 48px #FAFAFA strip (SheetSection). */}
              <div className="mb-5">
                <h2 className="text-xl leading-7 font-medium text-[#0A0A0A]">{STEPS[step].title}</h2>
                <p className="text-sm leading-5 text-[#737373]">{STEPS[step].sub}</p>
              </div>

              {step === 0 && (
                <>
                  <SheetSection title="Property">
                    <div className="flex flex-col gap-4">
                      <Field label="Property name"><Input className={i9} value={name} onChange={(e) => setName(e.target.value)} onBlur={() => setNameTouched(true)} placeholder="e.g. St Mary’s College" aria-invalid={nameTouched && !!nameErr} /><Err>{nameTouched ? nameErr : ''}</Err></Field>
                      <div className="grid grid-cols-2 gap-4">
                        <Field label="Inventory number" hint="Optional · your own reference"><Input className={cx(i9, 'font-mono')} value={invNo} onChange={(e) => setInvNo(e.target.value)} placeholder="e.g. SMC-001" /></Field>
                        <Field label="Location"><Picker className={i9} value={campus} onChange={setCampus} options={[{ id: 'Durham City', label: 'Durham City' }, { id: 'Queen’s Campus', label: 'Queen’s Campus' }]} /></Field>
                      </div>
                    </div>
                  </SheetSection>
                  <SheetSection title="Letting period">
                    <div role="radiogroup" aria-label="Letting period" className="flex items-center gap-6">
                      {(['Weekly', 'Monthly'] as const).map((v) => (
                        <button key={v} type="button" role="radio" aria-checked={letting === v} onClick={() => setLetting(v)} className="h-9 flex items-center gap-2 text-sm text-[#0A0A0A] outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-md">
                          <span className={cx('size-4 rounded-full border flex items-center justify-center shrink-0', letting === v ? 'border-[#2563EB] bg-[#2563EB]' : 'border-[#D4D4D4] bg-white')}>{letting === v && <span className="size-1.5 rounded-full bg-white" />}</span>{v}
                        </button>
                      ))}
                    </div>
                    <p className="text-[13px] leading-5 text-[#737373] mt-1">Rent and tenancy length use this unit.</p>
                  </SheetSection>
                  <SheetSection title="Layout" action={<EditLink onClick={() => nav('/inventory/structures')}>New layout</EditLink>}>
                    <LayoutRadios value={shape.name} onChange={setStructure} />
                  </SheetSection>
                </>
              )}

              {step === 1 && (
                <>
                  <SheetSection title="Address">
                    <div className="flex flex-col gap-4">
                    <div className="relative">
                      <span className="h-9 flex items-center gap-2 rounded-lg border border-input bg-white px-3 text-sm shadow-[0_1px_2px_rgba(0,0,0,0.04)] focus-within:border-primary focus-within:ring-2 focus-within:ring-primary/25">
                        <MagnifyingGlass size={16} strokeWidth={1.5} className="text-[#737373]" />
                        <input value={query} onChange={(e) => { setQuery(e.target.value); setPicked(false); }} placeholder="Search a place or postcode" className="flex-1 min-w-0 outline-none bg-transparent placeholder:text-[#A3A3A3]" />
                        {query && <button type="button" aria-label="Clear" onClick={() => { setQuery(''); setPicked(false); }} className="-mr-1.5 size-6 rounded-md flex items-center justify-center text-[#A3A3A3] hover:bg-[#F5F5F5]"><X size={12} /></button>}
                      </span>
                      {!picked && query.length > 1 && (
                        <div className="absolute left-0 right-0 top-11 z-20 rounded-xl border border-[#E5E5E5] bg-white shadow-menu p-1">
                          <button type="button" onClick={() => { setQuery('St Mary’s College, Elvet Hill Road'); setPicked(true); }} className="w-full px-2.5 py-2 rounded-lg hover:bg-[#F5F5F5] flex items-start gap-2 text-left">
                            <MapPin size={16} strokeWidth={1.5} className="text-[#2563EB] mt-0.5" /><span><span className="block text-sm font-medium">St Mary’s College, Elvet Hill Road</span><span className="block text-xs text-[#737373]">Durham DH1 3LR, United Kingdom</span></span>
                          </button>
                        </div>
                      )}
                    </div>
                      <MapArt picked={picked} />
                  {picked && (
                    <div className="rounded-xl border border-[#E5E5E5] px-4 py-3 flex items-center gap-3">
                      <MapPin size={16} strokeWidth={1.5} className="text-[#2563EB] shrink-0" />
                      <div className="flex-1 min-w-0"><div className="text-sm font-medium text-[#0A0A0A]">St Mary’s College, Elvet Hill Road</div><div className="text-xs text-[#737373]">Durham DH1 3LR, United Kingdom</div></div>
                      <button type="button" onClick={() => { setPicked(false); setQuery(''); }} className="text-sm text-[#2563EB] hover:underline underline-offset-2">Change</button>
                    </div>
                  )}
                    </div>
                  </SheetSection>
                  <SheetSection title="Zone">
                    <div className="w-[241px]"><Input className={i9} aria-label="Zone" value={zone} onChange={(e) => setZone(e.target.value)} placeholder="e.g. Elvet" /></div>
                    <p className="text-[13px] leading-5 text-[#737373] mt-1.5">Optional · groups nearby properties</p>
                  </SheetSection>
                </>
              )}

              {step === 2 && (
                <>
                  <SheetSection title={`Blocks · ${blocks.length} · ${fmt(total)} rooms`} action={<EditLink onClick={addBlock}>Add block</EditLink>}>
                    <div className="-my-3.5">
                  {blocks.map((b) => openBlock === b.key ? (
                    <div key={b.key} className="border-t border-[#EBEBEB] first:border-t-0 -mx-4">
                      <div className="h-[52px] pl-4 pr-3 flex items-center gap-2.5">
                        <LevelTile level="Block" icon={Buildings} />
                        <Input aria-label="Block name" ref={(el: HTMLInputElement | null) => { nameRefs.current[b.key] = el; }} value={b.name} onChange={(e) => upd(b.key, { name: e.target.value })} className="h-8 w-[200px]" />
                        <span className="ml-auto font-mono uppercase text-xs font-medium tracking-[0.48px] text-[#0A0A0A] whitespace-nowrap">{fmt(rooms(b, shape))} rooms</span>
                        <Menu width={160} trigger={(o) => <button type="button" aria-label="Block menu" onClick={o} className="size-7 rounded-md hover:bg-[#F5F5F5] flex items-center justify-center text-[#737373]"><DotsThree size={16} /></button>}
                          items={[{ label: 'Remove block', icon: Trash, danger: true, disabled: blocks.length < 2, onClick: () => setBlocks((bs) => bs.filter((x) => x.key !== b.key)) }]} />
                      </div>
                      <div className="px-4 pb-4 grid grid-cols-[120px_auto_minmax(0,1fr)] gap-3 items-center text-sm text-[#0A0A0A]">
                        {/* Column heads, so "Floor {n}" reads as a naming pattern, with a tooltip on what {n} does (2026-11-19). */}
                        <span /><span className="text-xs leading-4 text-[#737373]">How many</span>
                        <span className="text-xs leading-4 text-[#737373] flex items-center gap-1">Names
                          <Tooltip><TooltipTrigger asChild><button type="button" aria-label="How naming works" className="size-4 rounded-full flex items-center justify-center text-[#A3A3A3] hover:text-[#0A0A0A]"><Info size={13} strokeWidth={1.5} /></button></TooltipTrigger>
                            <TooltipContent side="top" className="max-w-[260px]">{'{n}'} becomes 1, 2, 3… under each parent. “Floor {'{n}'}” makes Floor 1, Floor 2. Type your own words around it, e.g. “Level {'{n}'}” or “{'{n}'}F”.</TooltipContent></Tooltip>
                        </span>
                        {!house && <><span>Floors</span><Stepper value={b.floors} onChange={(n) => upd(b.key, { floors: n })} /><Input className="h-8 font-mono" value={b.floorPat} onChange={(e) => upd(b.key, { floorPat: e.target.value })} aria-label="Floor name pattern" /></>}
                        {shape.flats && <><span>Flats per floor</span><Stepper value={b.flats} onChange={(n) => upd(b.key, { flats: n })} /><Input className="h-8 font-mono" value={b.flatPat} onChange={(e) => upd(b.key, { flatPat: e.target.value })} aria-label="Flat name pattern" /></>}
                        <span>{house ? `${shape.unit}s` : `${shape.unit}s per ${shape.flats ? 'flat' : 'floor'}`}</span><Stepper value={b.rpf} onChange={(n) => upd(b.key, { rpf: n })} /><Input className="h-8 font-mono" value={b.roomPat} onChange={(e) => upd(b.key, { roomPat: e.target.value })} aria-label="Room name pattern" />
                        <span>Room type</span><div className="col-span-2"><Picker value={b.roomType} onChange={(v) => upd(b.key, { roomType: v })} icon={Bed} options={ROOM_TYPES.map((t) => ({ id: t, label: t }))} /></div>
                        <span>Room size</span>
                        <label className="h-8 w-[104px] flex items-center rounded-lg border border-input bg-white px-2.5 shadow-[0_1px_2px_rgba(0,0,0,0.04)] focus-within:border-primary focus-within:ring-2 focus-within:ring-primary/25"><input aria-label="Room size" value={b.size} onChange={(e) => upd(b.key, { size: e.target.value.replace(/[^0-9.]/g, '') })} className="flex-1 min-w-0 outline-none bg-transparent" /><span className="text-[#A3A3A3] text-xs">m²</span></label>
                        <span className="text-xs text-[#737373]">Set on all {fmt(rooms(b, shape))} rooms</span>
                      </div>
                      {blockErr(b) && <div className="px-4 pb-4 -mt-2"><Err>{blockErr(b)}</Err></div>}
                    </div>
                  ) : (
                    <button key={b.key} type="button" onClick={() => setOpenBlock(b.key)} className="-mx-4 w-[calc(100%+32px)] h-[52px] px-4 flex items-center gap-2.5 text-left hover:bg-[#FAFAFA] border-t border-[#EBEBEB] first:border-t-0">
                      <LevelTile level="Block" icon={Buildings} />
                      <span className="text-sm font-medium text-[#0A0A0A] whitespace-nowrap">{b.name}</span>
                      <span className="flex-1 min-w-0 text-xs text-[#737373] truncate">{blockErr(b) ? <span className="text-[#DC2626]">Needs a fix</span> : <>{house ? `${b.rpf} ${unitLc}s` : shape.flats ? `${b.floors} floors × ${b.flats} flats × ${b.rpf} ${unitLc}s` : `${b.floors} floors × ${b.rpf} ${unitLc}s`} · {b.roomType}</>}</span>
                      <span className="font-mono uppercase text-xs font-medium tracking-[0.48px] text-[#0A0A0A] whitespace-nowrap">{fmt(rooms(b, shape))} rooms</span><CaretDown size={16} strokeWidth={1.5} className="text-[#737373] shrink-0" />
                    </button>
                  ))}
                    </div>
                  </SheetSection>
                  {total > BIG && (
                    <label className="rounded-xl border border-[#D97706]/40 p-3.5 flex gap-3 items-start cursor-pointer">
                      <input type="checkbox" checked={bigOk} onChange={(e) => setBigOk(e.target.checked)} className="mt-0.5 size-4 accent-primary" />
                      <span><span className="block text-sm font-medium text-[#D97706]">That’s {fmt(total)} rooms</span><span className="block text-xs text-[#737373] mt-0.5">Far more than a typical property. Check the counts, or tick to confirm.</span></span>
                    </label>
                  )}
                  <p className="mt-3 text-sm leading-5 text-[#737373]">Every room already in a spreadsheet? <button type="button" onClick={() => nav('/inventory/properties?import=1')} className="text-[#2563EB] font-medium hover:underline underline-offset-2">Import CSV</button></p>
                </>
              )}

              {step === 3 && (
                <>
                  <SheetSection title={`Room types · ${types.length}`}>
                    <div className="-mx-4 -my-3.5">
                      <table className="w-full text-sm table-fixed">
                        <colgroup><col /><col className="w-[68px]" /><col className="w-[72px]" /><col className="w-[108px]" /><col className="w-[116px]" /></colgroup>
                        <thead><tr className="text-left border-b border-[#EBEBEB] text-sm text-[#737373] [&>th]:font-normal [&>th]:h-10">
                          <th className="pl-4">Room type</th><th className="px-1">Rooms</th><th className="px-1">Weeks</th><th className="px-1">Rent / {letting === 'Weekly' ? 'wk' : 'mo'}</th><th className="px-1 pr-4">Deposit</th>
                        </tr></thead>
                        <tbody>
                          {types.map((t) => (
                            <tr key={t.name} className="border-b border-[#EBEBEB] last:border-0">
                              <td className="h-14 pl-4"><span className="flex items-center gap-2 font-medium text-[#0A0A0A]"><LevelTile level="Room" icon={Bed} /><span className="truncate">{t.name}</span></span></td>
                              <td className="px-1 text-[#404040] tabular-nums">{fmt(t.rooms)}</td>
                              <td className="px-1"><Input className="h-8" aria-label={`${t.name} weeks`} value={t.weeks} onChange={(e) => setTerm(t.name, 'weeks', e.target.value.replace(/\D/g, ''))} /></td>
                              <td className="px-1"><MoneyInput value={t.rent} onChange={(v) => setTerm(t.name, 'rent', v)} /></td>
                              <td className="px-1 pr-4"><MoneyInput value={t.deposit} onChange={(v) => setTerm(t.name, 'deposit', v)} /></td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                    {termErrs.filter((e) => e !== dateErr).map((e) => <Err key={e}>{e}</Err>)}
                  </SheetSection>
                  <SheetSection title="Dates and billing">
                    <div className="grid grid-cols-3 gap-4">
                      <Field label="Available from"><DateInput value={from} onChange={setFrom} /></Field>
                      <Field label="Available to"><DateInput value={to} onChange={setTo} /></Field>
                      <Field label="Billing"><Picker className={i9} value={billing} onChange={setBilling} options={[{ id: 'Weekly', label: 'Weekly' }, { id: 'Monthly', label: 'Monthly' }, { id: 'Upfront', label: 'Upfront' }]} /></Field>
                    </div>
                    <Err>{dateErr}</Err>
                  </SheetSection>
                  <SheetSection title="Fees" action={<EditLink onClick={() => nav('/inventory/rent-fees?tab=fees')}>Custom pricing</EditLink>}>
                    <SheetRow title="Organisation-wide fees apply" sub="Contents insurance · £45 per tenancy" />
                  </SheetSection>
                </>
              )}

              {step === 4 && (
                <>
                  <SheetSection title="Summary">
                    {([
                      ['Basics', name, `${campus} · ${shape.name} · ${letting.toLowerCase()} · ${invNo || 'no ref'}`, 0],
                      ['Address', 'Elvet Hill Road, Durham DH1 3LR', zone ? `Zone ${zone}` : 'No zone', 1],
                      ['Units', `${fmt(total)} rooms`, blocks.map((b) => `${b.name} ${fmt(rooms(b, shape))}`).join(' · '), 2],
                      ['Rent & terms', `${types.length} templates · ${fmt(total)} draft tenancies`, types.map((t) => `${t.name.split(' ')[0]} £${t.rent} · ${t.weeks} wk`).join(' · '), 3],
                    ] as const).map(([k, a, b, s]) => (
                      <div key={k} className="py-3 first:pt-0 last:pb-0 border-t border-[#EBEBEB] first:border-t-0 grid grid-cols-[120px_minmax(0,1fr)_auto] gap-3 items-center">
                        <span className="text-sm text-[#737373]">{k}</span>
                        <span className="min-w-0"><span className="block text-sm font-medium text-[#0A0A0A] truncate">{a}</span><span className="block text-[13px] leading-5 text-[#737373] truncate">{b}</span></span>
                        <EditLink onClick={() => setStep(s)}>Edit</EditLink>
                      </div>
                    ))}
                  </SheetSection>
                  <p className="mt-3 text-sm leading-5 text-[#737373]">Created as a draft. Nobody can book it until you make it active.</p>
                </>
              )}
            </section>

          </div>

          <FooterZone.Provider value><div className="h-16 shrink-0 border-t border-[#E5E5E5] px-6 flex items-center">
            {step === 0 ? <Button variant="ghost" onClick={leave}>Cancel</Button> : <Button variant="ghost" onClick={() => setStep(step - 1)}>Back</Button>}
            <div className="ml-auto">
              {step < 4 ? <Button variant="primary" icon={null} disabled={!canNext} onClick={() => setStep(step + 1)}>Continue</Button>
                : <Button variant="primary" icon={Check} onClick={create}>Create property</Button>}
            </div>
          </div></FooterZone.Provider>
        </DialogContent>
      </Modal>
      <Created p={done} onView={() => done && nav(`/inventory/properties/${done.id}`, { replace: true })} onClose={() => nav('/inventory/properties', { replace: true })} />
      <Confirm open={leaving} onClose={() => setLeaving(false)} danger title="Discard this property?" sub="Nothing has been created yet. What you entered will be lost."
        cancel="Keep editing" confirm="Discard" onConfirm={() => nav('/inventory/properties')}>
        {/* What goes: the draft, and how far it got. */}
        <div className="rounded-xl border border-[#E5E5E5] px-3 py-2.5 flex items-center gap-3">
          <LevelTile level="Property" icon={Buildings} size={28} />
          <span className="flex-1 min-w-0 text-sm font-medium text-[#0A0A0A] truncate">{name.trim() || 'Untitled property'}</span>
          <span className="font-mono uppercase text-xs font-medium tracking-[0.48px] text-[#737373]">Step 0{step + 1} / 05</span>
        </div>
      </Confirm>
    </>
  );
}

/** Shown once the property exists: what was made, then View property. */
function Created({ p, onView, onClose }: { p: Property | null; onView: () => void; onClose: () => void }) {
  return (
    <InvConfirm open={!!p} onClose={onClose} width={440} title="Property created"
      footer={<><Button icon={null} onClick={onClose}>Done</Button><Button variant="primary" icon={null} onClick={onView}>View property</Button></>}>
      {p && (
        <div className="flex flex-col items-center text-center">
          <Illustration name="created" className="block w-[203px] h-[160px]" />
          <div className="mt-4 text-xl leading-7 font-medium text-[#0A0A0A]">{p.name}</div>
          <div className="mt-1 text-sm leading-5 text-[#737373]">Saved as a draft. Make it active when it’s ready to book.</div>
          <div className="mt-5 w-full text-left"><SheetFacts facts={[['Rooms', p.units.toLocaleString('en-GB')], ['Room types', p.roomTypes.length], ['Status', 'Draft', 'amber']]} /></div>
        </div>
      )}
    </InvConfirm>
  );
}


function DateInput({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return <label className="h-9 flex items-center gap-2 rounded-lg border border-input bg-white px-3 text-sm shadow-[0_1px_2px_rgba(0,0,0,0.04)] focus-within:border-primary focus-within:ring-2 focus-within:ring-primary/25"><CalendarBlank size={16} strokeWidth={1.5} className="text-[#737373]" /><input value={value} onChange={(e) => onChange(e.target.value)} className="flex-1 min-w-0 outline-none bg-transparent" /></label>;
}

/** Flat map (Figma "Map"): parks, blocks, roads, the river, a blue pin and the zoom pair. */
function MapArt({ picked }: { picked: boolean }) {
  return (
    <div className="relative h-[232px] shrink-0 rounded-xl border border-[#E5E5E5] overflow-hidden bg-[#F2F1EC]">
      <svg className="absolute inset-0 size-full" viewBox="0 0 498 232" preserveAspectRatio="none" aria-hidden>
        <rect x="20" y="24" width="150" height="88" rx="8" fill="#DCE8D2" />
        <rect x="210" y="20" width="90" height="58" rx="6" fill="#E2DFD7" />
        <rect x="370" y="30" width="100" height="70" rx="6" fill="#E2DFD7" />
        <rect x="60" y="150" width="110" height="60" rx="6" fill="#E2DFD7" />
        <path d="M330 140 L498 120 L498 232 L330 232 Z" fill="#DCE8D2" />
        <path d="M0 200 C80 210 140 190 200 196 C280 204 320 160 400 136 C440 124 470 124 498 124" fill="none" stroke="#C7DCF5" strokeWidth="14" />
        <path d="M200 0 V232" stroke="#fff" strokeWidth="8" />
        <path d="M0 70 L498 170" stroke="#fff" strokeWidth="6" />
        <path d="M0 126 H498" stroke="#fff" strokeWidth="8" />
        <path d="M170 232 L295 0" stroke="#fff" strokeWidth="6" />
      </svg>
      {picked && (
        <svg className="absolute left-[234px] top-[78px] drop-shadow-[0_2px_3px_rgba(0,0,0,0.25)]" width="28" height="36" viewBox="0 0 28 36" aria-hidden>
          <path d="M14 1C6.8 1 1 6.6 1 13.6 1 23 14 35 14 35s13-12 13-21.4C27 6.6 21.2 1 14 1Z" fill="#2563EB" stroke="#fff" strokeWidth="1.5" />
          <circle cx="14" cy="13.5" r="4.5" fill="#fff" />
        </svg>
      )}
      <div className="absolute right-3 bottom-3 rounded-lg bg-white border border-[#E5E5E5] shadow-[0_1px_2px_rgba(0,0,0,0.05)] flex flex-col">
        <button type="button" aria-label="Zoom in" className="size-7 flex items-center justify-center border-b border-[#E5E5E5] text-[#404040]"><Plus size={14} strokeWidth={1.5} /></button>
        <button type="button" aria-label="Zoom out" className="size-7 flex items-center justify-center text-[#404040]"><Minus size={14} strokeWidth={1.5} /></button>
      </div>
    </div>
  );
}

