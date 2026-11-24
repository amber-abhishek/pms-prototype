// Organisation › Campuses. Figma: empty state 3095:2; add campus = Journeys Flow 1 · 04–05 (2819:544, 2819:820).
import { useEffect, useRef, useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { BookOpen, ImageSquare, MagnifyingGlass, MapPin, Plus } from '../../components/icons';
import { toast } from 'sonner';
import { Button, DL, Dropdown, Input, SheetSection, Status, Table } from '../../components/ui';
import { PanelModal, PropStack } from '../inventory/common';
import { useInv } from '../../data/inventory';
import { oid, useOrg, type Campus } from '../../data/org';
import { EmptyState, Header, ODialog } from './parts';

const ICON = MapPin;
const STATUS_DOT: Record<Campus['status'], string> = { Active: '#0B8A4C', Draft: '#D97706', Inactive: '#A3A3A3' };
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
    <ODialog open={open} onClose={onClose} title="How locations work" sub="A location groups properties by place." footer={<Button variant="primary" onClick={onClose}>Got it</Button>}>
      <ul className="space-y-2.5 text-sm text-gray-700 list-disc pl-4">
        <li>Every property belongs to one location. You pick it when you add the property.</li>
        <li>The resident site lets residents browse properties by location. Only <b>Active</b> locations appear there.</li>
        <li>The address decides which partner region supplies partner listings near the location.</li>
        <li>Access on a location covers every property on it.</li>
      </ul>
    </ODialog>
  );
}

export function CampusesPage() {
  const { campuses, emptyCampuses } = useOrg();
  const nav = useNavigate();
  /* /org/campuses/new and /org/campuses/:id open the campus in a centred modal over the list (2026-11-17). */
  const { id } = useParams();
  const [sp, setSp] = useSearchParams();
  const [how, setHow] = useState(false);
  useEffect(() => {
    if (sp.get('demo') === 'empty') { emptyCampuses(); setSp((p) => { const n = new URLSearchParams(p); n.delete('demo'); return n; }, { replace: true }); }
  }, [sp, setSp, emptyCampuses]);
  const rows = campuses;
  /* The Properties column reads the inventory records (they carry the cover photos), matched on the campus name. */
  const invProps = useInv((st) => st.properties);
  const q = (x: string) => x.replace(/[’']/g, "'");
  const invOf = (name: string) => invProps.filter((p) => q(p.campus) === q(name));
  const close = () => nav('/org/campuses');
  const editing = id && id !== 'new' ? campuses.find((c) => c.id === id) : undefined;

  return (
    <>
      <Header icon={ICON} crumbs={[{ label: 'Organisation' }]} title="Locations">
        {campuses.length > 0 && <Button variant="ghost" icon={BookOpen} onClick={() => setHow(true)}>How locations work</Button>}
        {campuses.length > 0 && <Button variant="primary" icon={Plus} onClick={() => nav('/org/campuses/new')}>Add a location</Button>}
      </Header>
      {campuses.length === 0 ? (
        <div className="flex-1 overflow-auto flex items-center justify-center">
          <EmptyState art="campuses" icon={MapPin} title="No locations yet" sub="A location groups properties by place.">
            <Button variant="primary" icon={Plus} onClick={() => nav('/org/campuses/new')}>Add a location</Button>
            <Button icon={BookOpen} onClick={() => setHow(true)}>How locations work</Button>
          </EmptyState>
        </div>
      ) : (
        <Table rows={rows} onRow={(c) => nav(`/org/campuses/${c.id}`)} selected={editing?.id} cols={[
          { key: 'n', label: 'Location', className: 'w-[34%]', render: (c) => <div className="leading-tight"><div className="text-sm font-medium">{c.name}</div><div className="text-xs text-[#737373]">{c.address || 'No address yet'}</div></div> },
          { key: 's', label: 'Status', className: 'w-[12%]', render: (c) => <Status s={c.status} /> },
          { key: 'c', label: 'City', className: 'w-[14%]', render: (c) => <span className="text-sm whitespace-nowrap">{c.city || '—'}</span> },
          { key: 'r', label: 'Partner region', className: 'w-[14%]', render: (c) => <span className="text-sm text-[#737373]">{c.amberRegion || '—'}</span> },
          { key: 'p', label: 'Properties', /* Cover photos and a count, as in Property layouts (2026-11-24); names show on hover. */
            render: (c) => { const ps = invOf(c.name); return ps.length ? <PropStack props={ps} label={`${ps.length} ${ps.length === 1 ? 'property' : 'properties'}`} /> : <span className="text-sm text-[#A3A3A3]">None yet</span>; } },
        ]} />
      )}
      {id === 'new' && <CampusDialog key="new" onClose={close} />}
      {editing && <CampusDialog key={editing.id} existing={editing} onClose={close} />}
      {id && id !== 'new' && !editing && <NotFoundToast onDone={close} />}
      <HowItWorks open={how} onClose={() => setHow(false)} />
    </>
  );
}

/** A stale /org/campuses/:id link: say so once and drop back to the list. */
function NotFoundToast({ onDone }: { onDone: () => void }) {
  useEffect(() => { toast.error('That location doesn’t exist'); onDone(); }, []); // eslint-disable-line react-hooks/exhaustive-deps
  return null;
}

/** Add or edit a campus in a centred modal (was its own page). */
function CampusDialog({ existing, onClose }: { existing?: Campus; onClose: () => void }) {
  const { set, audit_ } = useOrg();
  const [name, setName] = useState(existing?.name ?? '');
  const [status, setStatus] = useState<Campus['status']>(existing?.status ?? 'Draft');
  const [place, setPlace] = useState<Omit<Campus, 'id' | 'name' | 'status'> | null>(existing?.address ? existing : null);
  const [q, setQ] = useState(existing?.address ?? '');
  const [focus, setFocus] = useState(false);
  const busy = useRef(false);

  const matches = q.trim().length >= 2 && (!place || place.address !== q) ? PLACES.filter((p) => p.address.toLowerCase().includes(q.trim().toLowerCase()) || q.toLowerCase().split(/\s+/).every((w) => p.address.toLowerCase().includes(w))) : [];
  const save = () => {
    if (busy.current) return;
    const n = name.trim();
    if (!n) { toast.error('Give the location a name'); return; }
    const twin = useOrg.getState().campuses.find((c) => c.id !== existing?.id && c.name.trim().toLowerCase() === n.toLowerCase());
    if (twin) { toast.error(`There’s already a location called ${twin.name}`); return; }
    if (status === 'Active' && !place) { toast.error('An active location needs an address', { description: 'Pick it from the address search, or keep it Draft.' }); return; }
    busy.current = true;
    const rec: Campus = { id: existing?.id ?? oid('c'), name: n, status, ...(place ?? { address: '', city: '', region: '', postcode: '', country: '', amberRegion: '' }) };
    set('campuses', (cs) => (existing ? cs.map((c) => (c.id === existing.id ? rec : c)) : [...cs, rec]));
    audit_(existing ? `edited the location ${n}` : `added the location ${n}`, 'Locations');
    toast.success(existing ? `${n} saved` : `${n} added`, { description: status === 'Active' ? 'It shows on the resident site.' : status === 'Draft' ? 'Make it Active to show it on the resident site.' : 'It’s off the resident site.' });
    onClose();
  };

  return (
    <PanelModal open onClose={onClose} width={600} eyebrow={existing ? 'Edit location' : 'New location'} title={existing?.name} icon={MapPin}
      right={<><Button onClick={onClose}>Cancel</Button><Button variant="primary" icon={null} onClick={save}>{existing ? 'Save' : 'Create location'}</Button></>}>
      <SheetSection title="Location">
        <div className="grid grid-cols-[1fr_168px] gap-3">
          <div><span className="block text-sm font-medium text-[#0A0A0A] mb-1.5">Name</span><Input aria-label="Name" value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Durham City" /></div>
          <div><span className="block text-sm font-medium text-[#0A0A0A] mb-1.5">Status</span>
            <Dropdown ariaLabel="Status" className="h-8 w-full border-gray-300" value={status} onChange={(v) => setStatus(v as Campus['status'])}
              options={(['Draft', 'Active', 'Inactive'] as const).map((x) => ({ value: x, label: <span className="inline-flex items-center gap-2"><span className="size-2 rounded-full" style={{ background: STATUS_DOT[x] }} />{x}</span> }))} /></div>
        </div>
        <p className="mt-1.5 text-xs text-[#737373]">Only active locations show on the resident site.</p>
      </SheetSection>

      <SheetSection title="Address">
        <label className="relative flex items-center">
          <MagnifyingGlass size={14} className="absolute left-2.5 text-[#737373]" />
          <Input aria-label="Address" value={q} onFocus={() => setFocus(true)} onBlur={() => window.setTimeout(() => setFocus(false), 150)} onChange={(e) => { setQ(e.target.value); setPlace(null); }} placeholder="Search for the location address" className="pl-8" />
        </label>
        {/* Results sit in the flow, not floating, so the modal body never clips them. */}
        {focus && matches.length > 0 && (
          <div className="mt-1 rounded-xl border border-line bg-white shadow-pop p-1">
            {matches.map((p) => (
              <button key={p.address} type="button" onMouseDown={(e) => e.preventDefault()} onClick={() => { setPlace(p); setQ(p.address); setFocus(false); }} className="w-full text-left px-2.5 h-9 rounded-lg hover:bg-gray-50 flex items-center gap-2 text-sm"><MapPin size={14} className="text-gray-400" />{p.address}</button>
            ))}
          </div>
        )}
        {/* The picked place: where it is, then the partner region it maps to. */}
        <div className="mt-4">
          {place
            ? <DL rows={[['City', `${place.city}, ${place.region}`], ['Postcode', place.postcode], ['Country', place.country], ['Partner region', place.amberRegion]]} />
            : <p className="text-sm text-[#737373]">Pick an address to set the city and partner region.</p>}
        </div>
      </SheetSection>

      <SheetSection title="Images · optional">
        <button type="button" onClick={() => toast('Image upload is off in the prototype')} className="h-24 w-full rounded-xl border border-dashed border-[#D4D4D4] text-sm text-[#737373] flex flex-col items-center justify-center gap-2 hover:bg-[#FAFAFA] transition-colors">
          <ImageSquare size={20} className="text-[#A3A3A3]" />
          <span><span className="text-[#0A0A0A] font-medium">Click to upload</span> or drop images</span>
        </button>
      </SheetSection>
    </PanelModal>
  );
}
