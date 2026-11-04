import { useState, type DragEvent, type ReactNode } from 'react';
import { create } from 'zustand';
import { toast } from 'sonner';
import {
  Buildings, ChatCircleText, Check as CheckIco, Copy, CurrencyGbp, DotsSixVertical, EnvelopeSimple, Eye, FileText, Globe,
  Image, Info, Monitor, Plus, UploadSimple, Wheelchair, type Icon,
} from '../../components/icons';
import { Button, Check, Field, Input, Note, PageHeader, Select, Switch, Tabs, Textarea, cx } from '../../components/ui';

/* On-campus booking site builder (Figma 2063:2). The Site panel rows pick the editor (Pages, Theme, Settings);
   the left column edits, the right column is a live preview of the site. Changes count up as "unpublished"
   until Publish. Halls, prices and availability come from Inventory and Cycles, so nothing here is copied. */

type SecId = 'hero' | 'halls' | 'prices' | 'apply' | 'faqs' | 'access' | 'contact';
type Section = { id: SecId; label: string; on: boolean };
const SEC_ICON: Record<SecId, Icon> = { hero: Image, halls: Buildings, prices: CurrencyGbp, apply: FileText, faqs: ChatCircleText, access: Wheelchair, contact: EnvelopeSimple };

type SiteState = {
  sections: Section[];
  sel: SecId;
  headline: string;
  intro: string;
  hallsMode: 'all' | 'pick';
  live: boolean; prices: boolean; floor: boolean;
  brand: string; corners: 'soft' | 'square'; font: string;
  name: string; seo: boolean; password: boolean; cycle: string;
  changes: number;
  set: (p: Partial<SiteState>) => void;
  publish: () => void;
};

const BRANDS = ['#5B2A86', '#2563EB', '#0B8A4C', '#B91C1C', '#111827'];

export const useSite = create<SiteState>((setS) => ({
  sections: [
    { id: 'hero', label: 'Hero & intro', on: true },
    { id: 'halls', label: 'Halls & room types', on: true },
    { id: 'prices', label: 'Prices & terms', on: true },
    { id: 'apply', label: 'Apply now (cycle 2027/28)', on: true },
    { id: 'faqs', label: 'FAQs', on: true },
    { id: 'access', label: 'Accessibility & support', on: false },
    { id: 'contact', label: 'Contact', on: true },
  ],
  sel: 'halls',
  headline: 'Find your home at Durham',
  intro: 'Applications for 2027/28 open 1 February. Pick up to three colleges and the room type you want.',
  hallsMode: 'all', live: true, prices: true, floor: false,
  brand: BRANDS[0], corners: 'soft', font: 'Geist',
  name: 'Durham University Accommodation', seo: true, password: false, cycle: '2027/28',
  changes: 3,
  /* Selecting a section isn't a change; everything else is. */
  set: (p) => setS((s) => ({ ...p, changes: Object.keys(p).every((k) => k === 'sel') ? s.changes : s.changes + 1 })),
  publish: () => setS({ changes: 0 }),
}));

const HALLS = [
  { name: 'Collingwood College', from: 168, left: 41 },
  { name: 'Ustinov College', from: 198, left: 23 },
  { name: 'Hild Bede', from: 168, left: 12 },
];

export function SiteBuilder({ tab }: { tab: 'pages' | 'theme' | 'settings' }) {
  const { changes, publish } = useSite();
  const title = { pages: 'Pages', theme: 'Theme', settings: 'Settings' }[tab];
  return (
    <>
      <PageHeader icon={Monitor} crumbs={['Site']} title={title}>
        {changes > 0 && <span className="h-[22px] px-2 rounded-md bg-[#FFF6E0] text-xs font-medium text-[#B45309] flex items-center gap-1.5 whitespace-nowrap"><span className="size-1.5 rounded-full bg-[#F59E0B]" />{changes} unpublished {changes === 1 ? 'change' : 'changes'}</span>}
        <Button size="sm" icon={Eye} onClick={() => toast('Preview opens in a new tab in the real product')}>Preview</Button>
        <Button size="sm" variant="primary" icon={UploadSimple} disabled={!changes}
          onClick={() => { publish(); toast.success('Site published', { description: 'accommodation.durham.ac.uk is up to date.' }); }}>Publish changes</Button>
      </PageHeader>
      <div className="flex-1 min-h-0 flex">
        <aside className="w-[320px] shrink-0 border-r border-line overflow-y-auto">
          {tab === 'pages' && <SectionsEditor />}
          {tab === 'theme' && <ThemeEditor />}
          {tab === 'settings' && <SettingsEditor />}
        </aside>
        <Preview />
      </div>
    </>
  );
}

/* ---------------- Pages: sections list + the selected section's options ---------------- */
function SectionsEditor() {
  const { sections, sel, set } = useSite();
  const [drag, setDrag] = useState<SecId | null>(null);
  const move = (to: SecId) => {
    if (!drag || drag === to) return;
    const list = sections.filter((s) => s.id !== drag);
    list.splice(list.findIndex((s) => s.id === to), 0, sections.find((s) => s.id === drag)!);
    set({ sections: list });
  };
  return (
    <>
      <div className="p-3 flex flex-col gap-1.5">
        {sections.map((s) => {
          const I = SEC_ICON[s.id];
          return (
            <div key={s.id} draggable
              onDragStart={(e: DragEvent) => { e.dataTransfer.effectAllowed = 'move'; setDrag(s.id); }}
              onDragOver={(e) => { if (drag) e.preventDefault(); }}
              onDrop={(e) => { e.preventDefault(); move(s.id); setDrag(null); }}
              onDragEnd={() => setDrag(null)}
              className={cx('h-10 pl-1.5 pr-2.5 rounded-lg border flex items-center gap-2 transition-colors',
                sel === s.id ? 'border-[#93C5FD] bg-[#EFF6FF]' : 'border-line bg-white hover:border-[#D1D5DB]', drag === s.id && 'opacity-40')}>
              <DotsSixVertical size={14} className="text-gray-400 cursor-grab shrink-0" />
              <button type="button" onClick={() => set({ sel: s.id })} className="flex-1 min-w-0 h-full flex items-center gap-2 text-left focus-visible:outline-none">
                <I size={16} className={s.on ? 'text-gray-600' : 'text-gray-400'} />
                <span className={cx('text-sm truncate', s.on ? 'text-ink font-medium' : 'text-gray-500')}>{s.label}</span>
              </button>
              <Switch checked={s.on} label={`Show ${s.label}`} onChange={(v) => set({ sections: sections.map((x) => (x.id === s.id ? { ...x, on: v } : x)) })} />
            </div>
          );
        })}
        <Button size="sm" icon={Plus} onClick={() => toast('Section library opens in the real product')}>Add section</Button>
      </div>
      <div className="border-t border-line p-4">
        <div className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-3">{sections.find((s) => s.id === sel)!.label}</div>
        <SectionOptions id={sel} />
      </div>
    </>
  );
}

function SectionOptions({ id }: { id: SecId }) {
  const s = useSite();
  if (id === 'hero') return (
    <div className="flex flex-col gap-3">
      <Field label="Headline"><Input value={s.headline} onChange={(e) => s.set({ headline: e.target.value })} /></Field>
      <Field label="Intro"><Textarea rows={3} value={s.intro} onChange={(e) => s.set({ intro: e.target.value })} /></Field>
    </div>
  );
  if (id === 'halls') return (
    <div className="flex flex-col gap-3">
      <div>
        <div className="text-sm font-medium mb-2">Show</div>
        <div className="flex gap-5">
          {(['all', 'pick'] as const).map((m) => (
            <label key={m} className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
              <input type="radio" name="hallsMode" checked={s.hallsMode === m} onChange={() => s.set({ hallsMode: m })} className="size-4 accent-[#2563EB]" />
              {m === 'all' ? 'All bookable' : 'Pick halls'}
            </label>
          ))}
        </div>
      </div>
      <Check checked={s.live} onChange={(v) => s.set({ live: v })} label="Show live availability" />
      <Check checked={s.prices} onChange={(v) => s.set({ prices: v })} label="Show prices from cycle" />
      <Check checked={s.floor} onChange={(v) => s.set({ floor: v })} label="Show floor plans" />
      <Note tone="blue" icon={Info} title="Kept in sync">Rooms, prices and availability come from Inventory and Cycles.</Note>
    </div>
  );
  if (id === 'apply') return <Note tone="blue" icon={Info} title="Opens the 2027/28 cycle">Change the cycle in Settings.</Note>;
  return <p className="text-sm text-[#646A78]">Content for this section is edited in the preview in the real product.</p>;
}

/* ---------------- Theme ---------------- */
function ThemeEditor() {
  const s = useSite();
  return (
    <div className="p-4 flex flex-col gap-5">
      <Field label="Brand colour">
        <div className="flex gap-2">
          {BRANDS.map((c) => (
            <button key={c} type="button" aria-label={c} aria-pressed={s.brand === c} onClick={() => s.set({ brand: c })}
              className={cx('size-8 rounded-lg flex items-center justify-center text-white ring-offset-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring', s.brand === c && 'ring-2 ring-[#93C5FD]')} style={{ background: c }}>
              {s.brand === c && <CheckIco size={14} strokeWidth={3} />}
            </button>
          ))}
        </div>
      </Field>
      <Field label="Logo" hint="PNG or SVG, at least 128px.">
        <div className="flex items-center gap-3">
          <span className="size-10 rounded-lg text-white font-semibold flex items-center justify-center" style={{ background: s.brand }}>D</span>
          <Button size="sm" icon={UploadSimple} onClick={() => toast('File picker opens in the real product')}>Upload</Button>
        </div>
      </Field>
      <Field label="Font">
        <Select value={s.font} onChange={(e) => s.set({ font: e.target.value })}>
          {['Geist', 'Inter', 'Georgia'].map((f) => <option key={f}>{f}</option>)}
        </Select>
      </Field>
      <Field label="Corners">
        <Tabs value={s.corners} onChange={(v) => s.set({ corners: v })} tabs={[{ id: 'soft', label: 'Rounded' }, { id: 'square', label: 'Square' }]} />
      </Field>
    </div>
  );
}

/* ---------------- Settings ---------------- */
function SettingsEditor() {
  const s = useSite();
  return (
    <div className="p-4 flex flex-col gap-5">
      <Field label="Site name"><Input value={s.name} onChange={(e) => s.set({ name: e.target.value })} /></Field>
      <Field label="Address">
        <div className="h-8 px-2.5 rounded-lg border border-line bg-[#F9FAFB] flex items-center gap-2 text-sm">
          <Globe size={14} className="text-gray-400" /><span className="flex-1 truncate">accommodation.durham.ac.uk</span>
          <button type="button" aria-label="Copy address" onClick={() => toast.success('Address copied')} className="text-gray-500 hover:text-ink"><Copy size={14} /></button>
        </div>
      </Field>
      <Field label="Apply now opens">
        <Select value={s.cycle} onChange={(e) => s.set({ cycle: e.target.value })}>{['2027/28', '2026/27'].map((c) => <option key={c}>{c}</option>)}</Select>
      </Field>
      <Row title="Show in search engines" sub="Google and Bing can list the site."><Switch checked={s.seo} onChange={(v) => s.set({ seo: v })} label="Show in search engines" /></Row>
      <Row title="Password protect" sub="Only people with the password can see it."><Switch checked={s.password} onChange={(v) => s.set({ password: v })} label="Password protect" /></Row>
    </div>
  );
}
const Row = ({ title, sub, children }: { title: string; sub: string; children: ReactNode }) => (
  <div className="flex items-center gap-3"><div className="flex-1"><div className="text-sm font-medium">{title}</div><div className="text-xs text-[#646A78] mt-0.5">{sub}</div></div>{children}</div>
);

/* ---------------- Live preview ---------------- */
function Preview() {
  const s = useSite();
  const [device, setDevice] = useState<'desktop' | 'mobile'>('desktop');
  const r = s.corners === 'soft' ? 'rounded-lg' : 'rounded-none';
  const font = s.font === 'Georgia' ? 'Georgia, serif' : s.font === 'Inter' ? 'Inter, sans-serif' : undefined;
  const on = (id: SecId) => s.sections.find((x) => x.id === id)?.on;
  const mobile = device === 'mobile';
  const block = (id: SecId, body: ReactNode) => (
    <section key={id} onClick={() => s.set({ sel: id })}
      className={cx('relative px-6 py-5 cursor-pointer', s.sel === id ? 'shadow-[inset_0_0_0_1.5px_#93C5FD]' : 'hover:shadow-[inset_0_0_0_1px_#E5E7EB]')}>
      {s.sel === id && <span className="absolute right-3 top-3 h-5 px-1.5 rounded-md bg-[#EFF6FF] text-[11px] font-medium text-[#2563EB] flex items-center">Editing</span>}
      {body}
    </section>
  );
  const body: Record<SecId, ReactNode> = {
    hero: (
      <div className="py-3">
        <h1 className={cx('font-semibold text-[#111827]', mobile ? 'text-xl' : 'text-[28px] leading-9')}>{s.headline}</h1>
        <p className="text-sm text-[#646A78] mt-2 max-w-[520px]">{s.intro}</p>
      </div>
    ),
    halls: (
      <>
        <h2 className="text-base font-semibold mb-3">Halls & room types</h2>
        <div className={cx('grid gap-3', mobile ? 'grid-cols-1' : 'grid-cols-3')}>
          {HALLS.map((h) => (
            <div key={h.name} className={cx('border border-line overflow-hidden bg-white', r)}>
              <div className="h-16 bg-[#F3F4F6] flex items-center justify-center text-gray-400"><Buildings size={20} /></div>
              <div className="p-3">
                <div className="text-sm font-semibold">{h.name}</div>
                {s.prices && <div className="text-xs text-[#646A78] mt-0.5">From £{h.from}/wk · 44 or 51 weeks</div>}
                {s.live && <div className="mt-2 h-6 px-2 rounded-md bg-[#E8F7EE] text-xs font-medium text-[#0B8A4C] flex items-center gap-1.5"><span className="size-1.5 rounded-full bg-[#0B8A4C]" />{h.left} rooms left</div>}
                {s.floor && <div className="mt-2 text-xs font-medium" style={{ color: s.brand }}>View floor plan</div>}
              </div>
            </div>
          ))}
        </div>
      </>
    ),
    prices: <><h2 className="text-base font-semibold mb-1">Prices & terms</h2><p className="text-sm text-[#646A78]">44-week and 51-week contracts. Bills included. £250 deposit, refunded at the end of your stay.</p></>,
    apply: (
      <div className={cx('p-4 flex items-center gap-4 text-white', r, mobile && 'flex-col items-start')} style={{ background: s.brand }}>
        <div className="flex-1"><div className="text-sm font-semibold">Applications for {s.cycle} open 1 February</div><div className="text-xs opacity-80 mt-0.5">Choose up to three colleges.</div></div>
        {/* Inline white, not bg-white: the button sits on the brand colour, so dark mode mustn't darken it. */}
        <span className={cx('h-8 px-3 text-sm font-medium flex items-center', r)} style={{ background: '#fff', color: s.brand }}>Apply now</span>
      </div>
    ),
    faqs: <><h2 className="text-base font-semibold mb-2">FAQs</h2>{['When will I hear back?', 'Can I live with friends?', 'Is there parking?'].map((q) => <div key={q} className="py-2 border-b border-[#F3F4F6] text-sm">{q}</div>)}</>,
    access: <><h2 className="text-base font-semibold mb-1">Accessibility & support</h2><p className="text-sm text-[#646A78]">Adapted rooms in every college. Tell us what you need when you apply.</p></>,
    contact: <><h2 className="text-base font-semibold mb-1">Contact</h2><p className="text-sm text-[#646A78]">accommodation@durham.ac.uk · 0191 334 2000</p></>,
  };
  return (
    <div className="flex-1 min-w-0 bg-[#F9FAFB] overflow-y-auto p-5 flex flex-col gap-3">
      <div className="flex items-center">
        <Tabs value={device} onChange={setDevice} tabs={[{ id: 'desktop', label: 'Desktop' }, { id: 'mobile', label: 'Mobile' }]} />
        <span className="ml-auto text-xs text-[#646A78]">Preview · not live</span>
      </div>
      <div className={cx('shrink-0 mx-auto w-full rounded-xl border border-line bg-white shadow-card overflow-hidden', mobile ? 'max-w-[390px]' : 'max-w-[1040px]')} style={{ fontFamily: font }}>
        <div className="h-9 px-3 border-b border-line bg-[#F9FAFB] flex items-center gap-1.5">
          <span className="size-2.5 rounded-full bg-[#F87171]" /><span className="size-2.5 rounded-full bg-[#FBBF24]" /><span className="size-2.5 rounded-full bg-[#34D399]" />
          <span className="ml-3 h-6 px-2.5 rounded-md border border-line bg-white text-xs text-[#646A78] flex items-center truncate">accommodation.durham.ac.uk</span>
        </div>
        <header className="h-14 px-6 border-b border-line flex items-center gap-3">
          <span className={cx('size-7 text-white text-sm font-semibold flex items-center justify-center shrink-0', r)} style={{ background: s.brand }}>D</span>
          <span className="text-sm font-semibold truncate">{s.name}</span>
          {!mobile && <nav className="ml-auto flex items-center gap-4 text-sm text-[#646A78]"><span>Halls</span><span>Prices</span><span>FAQs</span>
            {on('apply') && <span className={cx('h-8 px-3 text-white font-medium flex items-center', r)} style={{ background: s.brand }}>Apply now</span>}</nav>}
        </header>
        <div className="pb-4" style={{ background: `linear-gradient(180deg, ${s.brand}0D 0, transparent 160px)` }}>
          {s.sections.filter((x) => x.on).map((x) => block(x.id, body[x.id]))}
          {!s.sections.some((x) => x.on) && <div className="py-16 text-center text-sm text-[#646A78]">Turn on a section to see it here.</div>}
        </div>
      </div>
    </div>
  );
}

