// Organisation › Campuses. Figma: empty state 3095:2; add campus = Journeys Flow 1 · 04–05 (2819:544, 2819:820).
import { useEffect, useRef, useState, type ReactNode } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { ArrowLeft, BookOpen, ImageSquare, MagnifyingGlass, MapPin, Plus } from '../../components/icons';
import { toast } from 'sonner';
import { Button, Input, Pill, Status, Table, TitleH1, Toolbar, cx } from '../../components/ui';
import { useDb } from '../../data/store';
import { oid, useOrg, type Campus } from '../../data/org';
import { EmptyState, Header, IconSelect, ODialog } from './parts';

const ICON = MapPin;
/** Address search results the prototype "finds". */
const PLACES: Omit<Campus, 'id' | 'name' | 'status'>[] = [
  { address: 'Stockton Road, Durham DH1 3LE, UK', city: 'Durham', region: 'England', postcode: 'DH1 3LE', country: 'United Kingdom', amberRegion: 'North East England' },
  { address: 'University Boulevard, Stockton-on-Tees TS17 6BH, UK', city: 'Stockton-on-Tees', region: 'England', postcode: 'TS17 6BH', country: 'United Kingdom', amberRegion: 'North East England' },
  { address: 'Mountjoy Centre, Stockton Road, Durham DH1 3UP, UK', city: 'Durham', region: 'England', postcode: 'DH1 3UP', country: 'United Kingdom', amberRegion: 'North East England' },
  { address: 'Palace Green, Durham DH1 3RN, UK', city: 'Durham', region: 'England', postcode: 'DH1 3RN', country: 'United Kingdom', amberRegion: 'North East England' },
  { address: '7 Old Elvet, Durham DH1 3HL, UK', city: 'Durham', region: 'England', postcode: 'DH1 3HL', country: 'United Kingdom', amberRegion: 'North East England' },
];

function HowItWorks({ open, onClose }: { open: boolean; onClose: () => void }) {
  return (
    <ODialog open={open} onClose={onClose} title="How campuses work" sub="A campus groups halls by place." footer={<Button variant="primary" onClick={onClose}>Got it</Button>}>
      <ul className="space-y-2.5 text-sm text-gray-700 list-disc pl-4">
        <li>Every property belongs to one campus. You pick it when you add the property.</li>
        <li>The resident site lets residents browse halls by campus. Only <b>Active</b> campuses appear there.</li>
        <li>The address decides which partner region supplies partner hall listings near the campus.</li>
        <li>Access on a campus covers every hall on it.</li>
      </ul>
    </ODialog>
  );
}

export function CampusesPage() {
  const { campuses, emptyCampuses } = useOrg();
  const properties = useDb((s) => s.properties);
  const nav = useNavigate();
  const [sp, setSp] = useSearchParams();
  const [how, setHow] = useState(false);
  useEffect(() => {
    if (sp.get('demo') === 'empty') { emptyCampuses(); setSp((p) => { const n = new URLSearchParams(p); n.delete('demo'); return n; }, { replace: true }); }
  }, [sp, setSp, emptyCampuses]);
  const rows = campuses;
  const props = (id: string) => properties.filter((p) => p.campusId === id);

  return (
    <>
      <Header icon={ICON} crumbs={[{ label: 'Organisation' }]} title="Campuses">
        {campuses.length > 0 && <Button variant="primary" icon={Plus} onClick={() => nav('/org/campuses/new')}>Add a campus</Button>}
      </Header>
      {campuses.length === 0 ? (
        <div className="flex-1 overflow-auto flex items-center justify-center">
          <EmptyState art="campuses" icon={MapPin} title="No campuses yet" sub="A campus groups halls by place.">
            <Button variant="primary" icon={Plus} onClick={() => nav('/org/campuses/new')}>Add a campus</Button>
            <Button icon={BookOpen} onClick={() => setHow(true)}>How campuses work</Button>
          </EmptyState>
        </div>
      ) : (
        <>
          <Toolbar right={<><Button variant="ghost" icon={BookOpen} onClick={() => setHow(true)}>How campuses work</Button></>} />
          <Table rows={rows} onRow={(c) => nav(`/org/campuses/${c.id}`)} cols={[
            { key: 'n', label: 'Campus', className: 'w-[34%]', render: (c) => <div className="leading-tight"><div className="text-sm font-medium">{c.name}</div><div className="text-xs text-[#737373]">{c.address || 'No address yet'}</div></div> },
            { key: 's', label: 'Status', render: (c) => <Status s={c.status} /> },
            { key: 'c', label: 'City', render: (c) => <span className="text-sm">{c.city || '—'}</span> },
            { key: 'r', label: 'Partner region', render: (c) => <span className="text-sm text-[#737373]">{c.amberRegion || '—'}</span> },
            { key: 'p', label: 'Properties', render: (c) => { const ps = props(c.id); return ps.length ? <div className="flex flex-wrap gap-1">{ps.map((p) => <Link key={p.id} to={`/inventory/properties?open=${p.id}`} onClick={(e) => e.stopPropagation()} className="relative inline-flex after:absolute after:inset-x-0 after:-inset-y-px after:content-['']"><Pill outline tone="blue">{p.name}</Pill></Link>)}</div> : <span className="text-sm text-[#737373]">None yet</span>; } },
          ]} />
        </>
      )}
      <HowItWorks open={how} onClose={() => setHow(false)} />
    </>
  );
}

function Section({ title, sub, children }: { title: string; sub?: string; children: ReactNode }) {
  return (
    <section className="rounded-xl border border-line bg-white p-6">
      <h2 className="text-sm font-semibold">{title}</h2>
      {sub && <p className="text-sm text-[#737373] mt-1">{sub}</p>}
      <div className="mt-4">{children}</div>
    </section>
  );
}

export function CampusForm() {
  const { id } = useParams();
  const nav = useNavigate();
  const { campuses, set, audit_ } = useOrg();
  const existing = id ? campuses.find((c) => c.id === id) : undefined;
  const [name, setName] = useState(existing?.name ?? '');
  const [status, setStatus] = useState<Campus['status']>(existing?.status ?? 'Draft');
  const [place, setPlace] = useState<Omit<Campus, 'id' | 'name' | 'status'> | null>(existing?.address ? existing : null);
  const [q, setQ] = useState(existing?.address ?? '');
  const [focus, setFocus] = useState(false);
  const busy = useRef(false);
  if (id && !existing) return <><Header icon={ICON} crumbs={[{ label: 'Organisation' }, { label: 'Campuses', to: '/org/campuses' }]} title="Not found" /><div className="p-6 text-sm text-[#737373]">This campus doesn’t exist.</div></>;

  const matches = q.trim().length >= 2 && (!place || place.address !== q) ? PLACES.filter((p) => p.address.toLowerCase().includes(q.trim().toLowerCase()) || q.toLowerCase().split(/\s+/).every((w) => p.address.toLowerCase().includes(w))) : [];
  const save = () => {
    if (busy.current) return;
    const n = name.trim();
    if (!n) { toast.error('Give the campus a name'); return; }
    const twin = useOrg.getState().campuses.find((c) => c.id !== existing?.id && c.name.trim().toLowerCase() === n.toLowerCase());
    if (twin) { toast.error(`There’s already a campus called ${twin.name}`); return; }
    if (status === 'Active' && !place) { toast.error('An active campus needs an address', { description: 'Pick it from the address search, or keep it Draft.' }); return; }
    busy.current = true;
    const rec: Campus = { id: existing?.id ?? oid('c'), name: n, status, ...(place ?? { address: '', city: '', region: '', postcode: '', country: '', amberRegion: '' }) };
    set('campuses', (cs) => (existing ? cs.map((c) => (c.id === existing.id ? rec : c)) : [...cs, rec]));
    audit_(existing ? `edited the campus ${n}` : `added the campus ${n}`, 'Campuses');
    toast.success(existing ? `${n} saved` : `${n} added`, { description: status === 'Active' ? 'It shows on the resident site.' : status === 'Draft' ? 'It’s a draft: make it Active to show it on the resident site.' : 'It’s off the resident site.' });
    nav('/org/campuses');
  };

  return (
    <>
      <Header icon={ICON} crumbs={[{ label: 'Organisation' }, { label: 'Campuses', to: '/org/campuses' }]} title={existing ? existing.name : 'Add campus'} />
      <div className="flex-1 overflow-auto px-6 py-5">
        <Link to="/org/campuses" className="relative inline-flex items-center gap-1.5 text-sm text-[#737373] hover:text-ink after:absolute after:inset-x-0 after:-inset-y-0.5 after:content-['']"><ArrowLeft size={13} />All campuses</Link>
        <div className="flex items-start gap-4 mt-4 mb-4">
          <div className="flex-1"><TitleH1 className="text-xl font-medium tracking-tight">{existing ? 'Edit campus' : 'Add campus'}</TitleH1></div>
          <Button variant="primary" onClick={save}>{existing ? 'Save campus' : 'Add campus'}</Button>
        </div>
        <div className="max-w-[768px] space-y-6 pb-10">
          <Section title="Campus">
            <label className="block"><span className="block text-sm font-medium text-gray-700 mb-1.5">Name</span><Input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Durham City" /></label>
            <div className="mt-4"><span className="block text-sm font-medium text-gray-700 mb-1.5">Status</span>
              <IconSelect ariaLabel="Status" className="w-48" value={status} onChange={(v) => setStatus(v as Campus['status'])} options={['Draft', 'Active', 'Inactive'].map((s) => ({ value: s, label: s }))} /></div>
            <p className="text-sm text-[#737373] mt-4 leading-5">Only active campuses show on the resident site. Active needs an address.</p>
          </Section>
          <Section title="Address" sub="Sets the partner region for partner hall listings.">
            <span className="block text-sm font-medium text-gray-700 mb-1.5">Address</span>
            <div className="relative">
              <label className="relative flex items-center">
                <MagnifyingGlass size={14} className="absolute left-2.5 text-[#737373]" />
                <Input value={q} onFocus={() => setFocus(true)} onBlur={() => window.setTimeout(() => setFocus(false), 150)} onChange={(e) => { setQ(e.target.value); setPlace(null); }} placeholder="Search for the campus address" className="pl-8" />
              </label>
              {focus && matches.length > 0 && (
                <div className="absolute left-0 right-0 top-10 z-20 rounded-xl border border-line bg-white shadow-pop p-1">
                  {matches.map((p) => (
                    <button key={p.address} type="button" onMouseDown={(e) => e.preventDefault()} onClick={() => { setPlace(p); setQ(p.address); setFocus(false); }} className="w-full text-left px-2.5 h-9 rounded-lg hover:bg-gray-50 flex items-center gap-2 text-sm"><MapPin size={14} className="text-gray-400" />{p.address}</button>
                  ))}
                </div>
              )}
            </div>
            <div className="grid grid-cols-4 gap-4 mt-4">
              {([['City', place?.city], ['Region', place?.region], ['Postcode', place?.postcode], ['Country', place?.country]] as const).map(([k, v]) => (
                <div key={k}><div className="text-sm text-[#737373]">{k}</div><div className={cx('text-sm mt-1', !v && 'text-[#737373]')}>{v || '—'}</div></div>
              ))}
            </div>
            {place && <p className="text-xs text-[#737373] mt-4">Partner region: <span className="text-ink font-medium">{place.amberRegion}</span></p>}
          </Section>
          <Section title="Images" sub="Optional.">
            <button type="button" onClick={() => toast('Image upload is off in the prototype')} className="h-24 w-full rounded-lg border border-dashed border-gray-300 text-sm text-[#737373] flex flex-col items-center justify-center gap-1 hover:bg-gray-50"><ImageSquare size={20} />Drop images or click to upload</button>
          </Section>
        </div>
      </div>
    </>
  );
}
