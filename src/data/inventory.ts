import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import type { Tone } from './seed';
import { renameFrom } from './rename';

/* ---------------- Types ---------------- */
export type PStatus = 'Active' | 'Inactive' | 'Draft' | 'Closed to allocations' | 'Archived';
export type UStatus = 'Active' | 'Draft' | 'Inactive' | 'Archived';
export type Tag = { label: string; tone: Tone };
export type Block = { name: string; floors: number; flats: number; rooms: number; roomType: string; size?: number };
export type RoomType = { name: string; rooms: number; rent: number | null; /** Contract length; unset = the undergraduate 39 weeks. */ weeks?: number; next?: { rent: number; from: string } };
export type ActivityRow = { who: string; what: string; when: string };
export type Counts = { all: number; active: number; draft: number; inactive: number; archived: number };
/** A property's own word for its block level, "Block" unless it says otherwise. */
export const blockWord = (p: { blockWord?: string }) => p.blockWord ?? 'Block';
export type Property = {
  id: string; name: string; campus: string; structure: 'Building' | 'House'; /** The Property layouts entry it was built from (seeds name theirs, 2026-11-25). */ layout?: string; tags: Tag[]; units: number; status: PStatus;
  address: string; zone: string; invNo: string; letting: 'Weekly' | 'Monthly';
  /** What this property calls its blocks (2026-11-27): Collingwood has wings. Defaults to Block. */ blockWord?: string;
  blocks: Block[]; build: { done: number; total: number } | null;
  photos: number; description: string; amenities: string[]; wardenPhone: string;
  /** The photos in their saved order, as indexes into the stock set (photoOf); unset = 0…photos-1. The first is the cover. */ photoOrder?: number[];
  createdBy: string; created: string; activity: ActivityRow[]; roomTypes: RoomType[];
  liveTenancies: number; archiveOn?: string; pendingRows?: number; counts: Counts; fees: number;
  /** The status it had when archived, so Restore can put it back. */ archivedFrom?: PStatus;
  /** false when the rooms came from a spreadsheet: they have no tenancies yet. */ tenancies?: boolean;
};
export type Template = {
  id: string; propertyId: string; name: string; weeks: number; rent: number; deposit: number; billing: 'Weekly' | 'Upfront' | 'Monthly';
  from: string; to: string; linked: number; own: number; ownNote?: string; status: 'Active' | 'Inactive';
};
export type FeeType = { id: string; name: string; calc: 'Flat' | 'Percentage' | 'Per unit'; mandatory: boolean; refundable: boolean };
export type Fee = { id: string; typeId: string; amount: string; appliesTo: string | null; chargedOn: 'Each tenancy' | 'Each room' | 'The property' };
export type ImportJob = { id: string; name: string; kind: 'Spreadsheet' | 'Bulk create' | 'New property'; status: 'Running' | 'Queued' | 'Succeeded' | 'Failed'; done: number; total: number; errors?: number; by: string; started: string; structure: string; creates: string };
export type Unit = { id: string; code: string; type: string; weeks: number | null; rent: number | null; status: UStatus; template: string | null; size: number; note?: string; accessible?: boolean; /** Made in Units › Add unit; kept whole in unitEdits. */ added?: boolean; /** Moved to another flat (Units › Location › Edit); this id is left behind and the unit lives on under the new one. */ movedTo?: string; /** What's in the room (Desk, Ensuite bathroom…); unset means the room type's usual set. */ amenities?: string[] };
export type Flat = { id: string; name: string; units: Unit[] };
export type ArchivedRow = { id: string; name: string; type: string; flat?: boolean; units?: number; who: string; when: string; parent?: string };
export type Structure = { id: string; name: string; levels: { name: string; bsu: boolean }[]; properties: number; updated: string };
export type TagDef = { id: string; label: string; tone: Tone };
/** `required`: every record on an attached level must fill it before going active. */
export type Field = { id: string; name: string; key: string; type: string; attached: string[]; required?: boolean; choices?: string[] };
/* A pick-one field's choices. Sessions saved before choices existed fall back to the seed's list for that key. */
const SEED_CHOICES: Record<string, string[]> = { ensuite_type: ['Shower room', 'Bathroom', 'Wet room'], bed_size: ['Single', 'Small double', 'Double'] };
export const choicesOf = (f: Field): string[] => f.choices ?? (f.type.startsWith('Pick one') ? SEED_CHOICES[f.key] ?? [] : []);
/** "Pick one · 3 options", counted from the choices. */
export const pickOneType = (n: number) => `Pick one · ${n} ${n === 1 ? 'option' : 'options'}`;

/** Room types offered across the seed (Durham's own categories, 2026/27), for the Room type pickers. */
export const ROOM_TYPES = ['Standard single', 'Shared ensuite', 'Ensuite single', 'Ensuite plus', 'Twin ensuite', 'Townhouse room', 'Studio', 'One-bed flat', 'Accessible ensuite'];

/* ---------------- Seed ---------------- */
const T = (label: string, tone: Tone): Tag => ({ label, tone });
const counts = (n: number, s: PStatus): Counts => ({ all: n, active: s === 'Active' ? n : 0, draft: s === 'Draft' ? n : 0, inactive: s === 'Inactive' ? n : 0, archived: 0 });
const blocks3 = (n: number, type: string): Block[] => {
  const a = Math.round(n / 3 / 8) * 8; const b = Math.round(n / 3 / 8) * 8;
  return [{ name: 'Block A', floors: 4, flats: 4, rooms: a, roomType: type, size: 12 }, { name: 'Block B', floors: 4, flats: 4, rooms: b, roomType: type, size: 12 }, { name: 'Block C', floors: 4, flats: 4, rooms: n - a - b, roomType: type, size: 12 }];
};
const base = {
  zone: '', invNo: '', letting: 'Weekly' as const, build: null, photos: 12, amenities: ['Laundry', 'Bike store'], wardenPhone: '0191 334 0000',
  createdBy: 'Tom Okafor', created: '2 Sep 2024', fees: 2, roomTypes: [] as RoomType[],
};
function prop(p: Partial<Property> & Pick<Property, 'id' | 'name' | 'campus' | 'tags' | 'units' | 'status' | 'address'>): Property {
  return {
    ...base, structure: 'Building', blocks: blocks3(p.units, 'Standard single'), description: `${p.name} has ${p.units} rooms.`,
    activity: [{ who: 'Tom Okafor', what: `Created ${p.name}`, when: '2 Sep 2024' }], liveTenancies: p.status === 'Active' ? p.units : 0,
    counts: counts(p.units, p.status), ...p,
  } as Property;
}
/** At most 4 units to a flat (2026-11-26): a block gets as many flats per floor as that takes, so its room total
 *  stays the same. Houses keep their own size. */
export const FLAT_MAX = 4;
const fitFlats = (p: Property): Property => p.structure === 'House' ? p
  : { ...p, blocks: p.blocks.map((b) => ({ ...b, flats: Math.max(b.flats, Math.ceil(b.rooms / (b.floors * FLAT_MAX))) })) };

export function makeInventorySeed() {
  /* Real Durham University college accommodation, 2026/27 (researched 27 Nov 2026 from dur.ac.uk; sources below).
     SOURCED: names, sites, addresses, catering, total rooms, room types and weekly rents (annual residence charge ÷
     contract weeks, room only; catered colleges charge £107.11/wk for food on top). ESTIMATED: how rooms split across
     buildings and floors, and some building names, which Durham doesn't publish (marked est.). Flats still hold at most
     4 rooms here (FLAT_MAX), though real Durham flats hold 5–8.
     Sources: dur.ac.uk › colleges-and-student-experience › accommodation-and-catering › residence-charges (UG + PG);
     each college's accommodation page; AccessAble and Wikipedia for wing / building names. */
  const properties: Property[] = [
    prop({
      id: 'col', blockWord: 'Wing', name: 'Collingwood College', campus: 'Durham City', tags: [T('Catered', 'orange'), T('The Hill', 'purple'), T('Arts centre', 'blue')], units: 555, status: 'Active',
      address: 'South Road, Durham DH1 3LT', zone: 'The Hill', invNo: 'COL-001', photos: 18, wardenPhone: '0191 334 5000',
      /* 555 live in; 194 en-suite + 16 twin en-suite rooms in the 1992 wings; the rest standard corridors of ~10 sharing.
         Wing names from AccessAble / Wikipedia; per-wing rooms and floors est. */
      blocks: [
        { name: 'Cumbria Wing', floors: 4, flats: 4, rooms: 104, roomType: 'Ensuite single', size: 12 },
        { name: 'Corbridge Wing', floors: 4, flats: 4, rooms: 90, roomType: 'Ensuite single', size: 12 },
        { name: 'Alnwick Wing', floors: 2, flats: 2, rooms: 16, roomType: 'Twin ensuite', size: 16 },
        { name: 'Durham Wing', floors: 3, flats: 4, rooms: 175, roomType: 'Standard single', size: 10 },
        { name: 'Northumbria Wing', floors: 3, flats: 4, rooms: 170, roomType: 'Standard single', size: 10 },
      ],
      roomTypes: [{ name: 'Standard single', rooms: 345, rent: 185.06 }, { name: 'Ensuite single', rooms: 194, rent: 217.26 }, { name: 'Twin ensuite', rooms: 16, rent: 200.16 }],
      counts: { all: 555, active: 541, draft: 6, inactive: 5, archived: 3 },
    }),
    /* 546 live in; ~500 en-suite rooms in flats of 6; a few postgraduate studios. Block names from Wikipedia (unverified); split est. */
    prop({
      id: 'jb', name: 'Josephine Butler College', campus: 'Durham City', tags: [T('Self-catered', 'green'), T('Howlands Farm', 'blue')], units: 546, status: 'Active', address: 'South Road, Durham DH1 3DF', zone: 'Howlands Farm', invNo: 'JB-001',
      blocks: [
        { name: 'Kirknewton', floors: 4, flats: 4, rooms: 133, roomType: 'Ensuite single', size: 12 },
        { name: 'Dilston', floors: 4, flats: 4, rooms: 133, roomType: 'Ensuite single', size: 12 },
        { name: 'Milfield', floors: 4, flats: 4, rooms: 132, roomType: 'Ensuite single', size: 12 },
        { name: 'Wooler', floors: 4, flats: 4, rooms: 132, roomType: 'Ensuite single', size: 12 },
        { name: 'Elm', floors: 2, flats: 2, rooms: 16, roomType: 'Studio', size: 20 },
      ],
      roomTypes: [{ name: 'Ensuite single', rooms: 530, rent: 217.26 }, { name: 'Studio', rooms: 16, rent: 242.35, weeks: 50 }],
    }),
    /* Postgraduate only, 50-week contracts. ~400 rooms at Sheraton Park + 70 family flats at Keenan House (Dryburn Court). Split est. */
    prop({
      id: 'ust', name: 'Ustinov College', campus: 'Durham City', tags: [T('Postgraduate', 'purple'), T('Self-catered', 'green'), T('Family flats', 'blue')], units: 470, status: 'Active', address: 'Sheraton Park, Neville’s Cross, Durham DH1 4FL', zone: 'Sheraton Park', invNo: 'UST-001',
      blocks: [
        { name: 'Sheraton House', floors: 4, flats: 4, rooms: 160, roomType: 'Ensuite plus', size: 14 },
        { name: 'Neville House', floors: 4, flats: 4, rooms: 240, roomType: 'Ensuite single', size: 12 },
        { name: 'Keenan House', floors: 3, flats: 6, rooms: 70, roomType: 'One-bed flat', size: 32 },
      ],
      roomTypes: [{ name: 'Ensuite single', rooms: 240, rent: 202.44, weeks: 50 }, { name: 'Ensuite plus', rooms: 160, rent: 210.99, weeks: 50 }, { name: 'One-bed flat', rooms: 70, rent: 242.35, weeks: 50 }],
    }),
    /* Moved from Stockton to Howlands Farm 2017–19. 433 bedrooms: en-suite, paired shared en-suite and standard. Only
       "Bellamy" is a known block name; the others and the split est. */
    prop({
      id: 'ste', name: 'Stephenson College', campus: 'Durham City', tags: [T('Self-catered', 'green'), T('Howlands Farm', 'blue')], units: 433, status: 'Active', address: 'Howlands Farm, South Road, Durham DH1 3DE', zone: 'Howlands Farm', invNo: 'STE-001',
      blocks: [
        { name: 'Bellamy', floors: 4, flats: 4, rooms: 200, roomType: 'Ensuite single', size: 12 },
        { name: 'Block 2', floors: 4, flats: 4, rooms: 120, roomType: 'Shared ensuite', size: 11 },
        { name: 'Block 3', floors: 4, flats: 4, rooms: 113, roomType: 'Standard single', size: 10 },
      ],
      roomTypes: [{ name: 'Ensuite single', rooms: 200, rent: 217.26 }, { name: 'Shared ensuite', rooms: 120, rent: 208.71 }, { name: 'Standard single', rooms: 113, rent: 185.06 }],
    }),
    /* Moved to Rushford Court (the 1853 County Hospital, run with Unite Students) in 2024. 358 bedrooms = 281 en-suite +
       77 studios. Harding Building is real; the en-suite block names and split est. */
    prop({
      id: 'hb', layout: 'Rooms only', name: 'College of St Hild and St Bede', campus: 'Durham City', tags: [T('Self-catered', 'green'), T('Historic building', 'grey')], units: 358, status: 'Active', address: 'Rushford Court, North Road, Durham DH1 4RY', zone: 'Viaduct', invNo: 'HB-001',
      blocks: [
        { name: 'Harding Building', floors: 4, flats: 4, rooms: 77, roomType: 'Studio', size: 20 },
        { name: 'North Block', floors: 5, flats: 4, rooms: 141, roomType: 'Ensuite plus', size: 13 },
        { name: 'South Block', floors: 5, flats: 4, rooms: 140, roomType: 'Ensuite plus', size: 13 },
      ],
      roomTypes: [{ name: 'Ensuite plus', rooms: 281, rent: 225.82 }, { name: 'Studio', rooms: 77, rent: 249.77 }],
    }),
    /* Mount Oswald since 2020. 492 rooms in 6 blocks: 348 en-suite in flats + 144 townhouse rooms (12 townhouses × 12
       over 4 floors, bathrooms shared by 2). Broadwick Street names from AccessAble; flat block names est. */
    prop({
      id: 'js', name: 'John Snow College', campus: 'Durham City', tags: [T('Self-catered', 'green'), T('Mount Oswald', 'blue')], units: 492, status: 'Active', address: 'The Approach, Mount Oswald, Durham DH1 3FR', zone: 'Mount Oswald', invNo: 'JS-001',
      blocks: [
        { name: 'Block 1', floors: 4, flats: 6, rooms: 87, roomType: 'Ensuite plus', size: 13 },
        { name: 'Block 2', floors: 4, flats: 6, rooms: 87, roomType: 'Ensuite plus', size: 13 },
        { name: 'Block 3', floors: 4, flats: 6, rooms: 87, roomType: 'Ensuite plus', size: 13 },
        { name: 'Block 4', floors: 4, flats: 6, rooms: 87, roomType: 'Ensuite plus', size: 13 },
        { name: '1–7 Broadwick Street', floors: 4, flats: 7, rooms: 84, roomType: 'Townhouse room', size: 11 },
        { name: '8–12 Broadwick Street', floors: 4, flats: 5, rooms: 60, roomType: 'Townhouse room', size: 11 },
      ],
      roomTypes: [{ name: 'Ensuite plus', rooms: 348, rent: 225.82 }, { name: 'Townhouse room', rooms: 144, rent: 207.57 }],
    }),
    /* South College's townhouses at Mount Oswald: 12 students each, a bathroom per 2 rooms. Gillard (5) + Shipley (6)
       townhouses per AccessAble = 132 rooms (est.). Kept Inactive for the prototype's Inactive tab. */
    prop({ id: 'erh', layout: 'Shared houses', name: 'South College Townhouses', campus: 'Durham City', structure: 'House', tags: [T('Self-catered', 'green'), T('Mount Oswald', 'blue')], units: 132, status: 'Inactive', address: 'The Drive, Durham DH1 3LD', zone: 'Mount Oswald', invNo: 'SCT-001',
      blocks: [{ name: 'Houses', floors: 1, flats: 11, rooms: 132, roomType: 'Townhouse room', size: 11 }],
      roomTypes: [{ name: 'Townhouse room', rooms: 132, rent: 207.57 }] }),
  ].map(fitFlats);
  /* Collingwood's 2026/27 contracts: new undergraduates 39 weeks, 26 Sep 2026 – 26 Jun 2027; a 34-week en-suite option. */
  const templates: Template[] = [
    { id: 'tp1', propertyId: 'col', name: 'Ensuite single', weeks: 39, rent: 217.26, deposit: 250, billing: 'Weekly', from: '26 Sep 2026', to: '26 Jun 2027', linked: 190, own: 2, ownNote: '3.1.D £210.00 · 4.2.B £210.00', status: 'Active' },
    { id: 'tp2', propertyId: 'col', name: 'Standard single', weeks: 39, rent: 185.06, deposit: 250, billing: 'Weekly', from: '26 Sep 2026', to: '26 Jun 2027', linked: 344, own: 1, ownNote: '1.4.D £180.00', status: 'Active' },
    { id: 'tp3', propertyId: 'col', name: 'Twin ensuite', weeks: 39, rent: 200.16, deposit: 250, billing: 'Weekly', from: '26 Sep 2026', to: '26 Jun 2027', linked: 16, own: 0, status: 'Active' },
    { id: 'tp4', propertyId: 'col', name: 'Ensuite · 34 weeks', weeks: 34, rent: 226.96, deposit: 250, billing: 'Weekly', from: '26 Sep 2026', to: '21 May 2027', linked: 0, own: 0, status: 'Inactive' },
  ];
  const feeTypes: FeeType[] = [
    { id: 'ft1', name: 'Contents insurance', calc: 'Flat', mandatory: true, refundable: false },
    { id: 'ft2', name: 'Booking admin fee', calc: 'Flat', mandatory: true, refundable: false },
    { id: 'ft3', name: 'Damage cover', calc: 'Percentage', mandatory: false, refundable: true },
    { id: 'ft4', name: 'Bike store key', calc: 'Per unit', mandatory: false, refundable: true },
  ];
  const fees: Fee[] = [
    { id: 'fe1', typeId: 'ft1', amount: '£45', appliesTo: null, chargedOn: 'Each tenancy' },
    { id: 'fe2', typeId: 'ft2', amount: '£75', appliesTo: null, chargedOn: 'Each tenancy' },
    { id: 'fe3', typeId: 'ft3', amount: '5% of rent', appliesTo: 'col', chargedOn: 'Each tenancy' },
    { id: 'fe4', typeId: 'ft4', amount: '£10 each', appliesTo: 'ust', chargedOn: 'Each room' },
  ];
  const imports: ImportJob[] = [
    { id: 'im2', name: 'ustinov-annex.csv', kind: 'Spreadsheet', status: 'Queued', done: 0, total: 60, by: 'Tom Reid', started: 'Today 11:44', structure: 'Blocks with flats', creates: '60 rooms' },
    { id: 'im3', name: 'Fenwick Block · 48 rooms', kind: 'Bulk create', status: 'Succeeded', done: 48, total: 48, by: 'Arjun Mehta', started: 'Today 10:05', structure: 'Blocks with flats', creates: '1 block · 63 entities' },
    { id: 'im4', name: 'hild-bede-flats.csv', kind: 'Spreadsheet', status: 'Failed', done: 0, total: 72, errors: 2, by: 'Tom Reid', started: 'Yesterday 16:20', structure: 'Blocks with flats', creates: '72 rooms' },
    { id: 'im5', name: 'John Snow · Block D', kind: 'Bulk create', status: 'Succeeded', done: 120, total: 120, by: 'Arjun Mehta', started: '24 Oct', structure: 'Blocks with flats', creates: '1 block · 145 entities' },
  ];
  const archived: Record<string, ArchivedRow[]> = {
    col: [
      { id: 'ar1', name: '1.2.F', type: 'Standard single', who: 'Tom Okafor', when: '12 Sep' },
      { id: 'ar2', name: '2.1.C', type: 'Studio', who: 'Tom Okafor', when: '12 Sep' },
      { id: 'ar3', name: '4.4.A', type: 'Ensuite single', who: 'Arjun Mehta', when: '3 Aug' },
    ],
  };
  const structures: Structure[] = [
    { id: 'st1', name: 'Blocks with flats', levels: [{ name: 'Building', bsu: false }, { name: 'Floor', bsu: false }, { name: 'Flat', bsu: false }, { name: 'Room', bsu: true }, { name: 'Tenancy', bsu: true }], properties: 6, updated: 'Arjun Mehta · 2 Sep' },
    { id: 'st2', name: 'Rooms only', levels: [{ name: 'Building', bsu: false }, { name: 'Floor', bsu: false }, { name: 'Room', bsu: true }, { name: 'Tenancy', bsu: true }], properties: 9, updated: 'Arjun Mehta · 2 Sep' },
    { id: 'st3', name: 'Studio block', levels: [{ name: 'Building', bsu: false }, { name: 'Floor', bsu: false }, { name: 'Studio', bsu: true }, { name: 'Tenancy', bsu: true }], properties: 2, updated: 'Tom Baker · 14 Sep' },
    { id: 'st4', name: 'Shared houses', levels: [{ name: 'House', bsu: false }, { name: 'Room', bsu: true }, { name: 'Tenancy', bsu: true }], properties: 0, updated: 'Arjun Mehta · 20 Sep' },
  ];
  const fields: Field[] = [
    { id: 'cf1', name: 'Accessible room', key: 'accessible_room', type: 'Yes / no', attached: ['Blocks with flats › Room', 'Rooms only › Room'], required: true },
    { id: 'cf2', name: 'Ensuite type', key: 'ensuite_type', type: 'Pick one · 3 options', choices: ['Shower room', 'Bathroom', 'Wet room'], attached: ['Blocks with flats › Room', 'Rooms only › Room'] },
    { id: 'cf3', name: 'Floor area (m²)', key: 'floor_area_m2', type: 'Number', attached: ['Studio block › Studio'] },
    { id: 'cf4', name: 'Bed size', key: 'bed_size', type: 'Pick one · 3 options', choices: ['Single', 'Small double', 'Double'], attached: ['Blocks with flats › Room', 'Studio block › Studio'] },
    { id: 'cf5', name: 'Kitchen shared with', key: 'kitchen_shared_with', type: 'Number', attached: ['Blocks with flats › Flat'] },
    { id: 'cf7', name: 'Fire assembly point', key: 'fire_assembly_point', type: 'Text', attached: ['Blocks with flats › Floor'], required: true },
    { id: 'cf8', name: 'Quiet floor', key: 'quiet_floor', type: 'Yes / no', attached: ['Blocks with flats › Floor'] },
    { id: 'cf6', name: 'Lift access', key: 'lift_access', type: 'Yes / no', attached: ['Blocks with flats › Building', 'Rooms only › Building'] },
  ];
  const tags: TagDef[] = [];
  for (const p of properties) for (const t of p.tags) if (!tags.some((x) => x.label === t.label)) tags.push({ id: 'tg' + (tags.length + 1), ...t });
  return { properties, templates, feeTypes, fees, imports, archived, structures, fields, tags, unitEdits: {} as Record<string, Partial<Unit>>, archivedFlats: [] as string[],
    /** Custom field values per level (block, floor or flat id) → field id → value. Prototype only. */ fieldValues: {} as Record<string, Record<string, string>> };
}
export type InvSeed = ReturnType<typeof makeInventorySeed>;

/* ---------------- Store ---------------- */
type InvState = InvSeed & {
  set: <K extends keyof InvSeed>(key: K, fn: (v: InvSeed[K]) => InvSeed[K]) => void;
  patchProp: (id: string, fn: (p: Property) => Partial<Property>) => void;
  editUnit: (id: string, e: Partial<Unit>) => void;
};
export const useInv = create<InvState>()(
  persist(
    (set) => ({
      ...makeInventorySeed(),
      set: (key, fn) => set((st) => ({ [key]: fn(st[key]) }) as Partial<InvState>),
      patchProp: (id, fn) => set((st) => ({ properties: st.properties.map((p) => (p.id === id ? { ...p, ...fn(p) } : p)) })),
      editUnit: (id, e) => set((st) => ({ unitEdits: { ...st.unitEdits, [id]: { ...st.unitEdits[id], ...e } } })),
    }),
    { name: 'pms-inventory', storage: createJSONStorage(() => sessionStorage), version: 5, migrate: (st, v) => (v < 5 ? {} /* v5: real Durham seed (2026-11-27) replaces the dummy one */ : termlyToWeekly(renameFrom(4)(st, v))),
      /* A tab saved before flats were capped at 4 units gets its blocks re-split on load; edits are kept. */
      merge: (saved, cur) => { const m = { ...cur, ...(saved as Partial<InvState>) }; return { ...m, properties: m.properties.map(fitFlats) }; } },
  ),
);

/* Rent templates bill Weekly, not Termly (2026-11-23); a tab saved before that gets its templates switched once. */
function termlyToWeekly<T>(st: T): T { return JSON.parse(JSON.stringify(st).split('"billing":"Termly"').join('"billing":"Weekly"')) as T; }
export const invId = (p: string) => `${p}${Math.random().toString(36).slice(2, 8)}`;
export const logAct = (p: Property, what: string): ActivityRow[] => [{ who: 'Arjun Mehta', what, when: 'Just now' }, ...p.activity];

/* ---------------- Hierarchy: blocks → floors → flats → units ---------------- */
const L = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
const u = (pid: string, bi: number, code: string, type: string, weeks: number | null, rent: number | null, status: UStatus, size: number, extra: Partial<Unit> = {}): Unit => ({
  id: `${pid}:${bi}:${code}`, code, type, weeks, rent, status, template: weeks ? `${type} · ${weeks} wk` : null, size, ...extra,
});
/** Hand-specified flats the designs show; everything else is generated from the block's counts. */
function special(p: Property, bi: number, floor: number): Flat[] | null {
  if (p.id === 'col' && bi === 0 && floor === 3) {
    const E = 217.26;
    const f1: Unit[] = [
      u('col', 0, '3.1.A', 'Ensuite single', 39, E, 'Active', 12), u('col', 0, '3.1.B', 'Ensuite single', 39, E, 'Active', 12), u('col', 0, '3.1.C', 'Ensuite single', 39, E, 'Active', 12),
      u('col', 0, '3.1.D', 'Ensuite single', 39, E, 'Inactive', 12),
    ];
    const f2: Unit[] = [
      u('col', 0, '3.2.A', 'Ensuite single', 39, E, 'Inactive', 12), u('col', 0, '3.2.B', 'Ensuite single', 39, E, 'Active', 12), u('col', 0, '3.2.C', 'Ensuite single', 39, E, 'Active', 12),
      u('col', 0, '3.2.D', 'Accessible ensuite', 39, E, 'Active', 16, { accessible: true }),
    ];
    const f3: Unit[] = [
      u('col', 0, '3.3.A', 'Ensuite single', 39, E, 'Active', 12), u('col', 0, '3.3.B', 'Ensuite single', 39, E, 'Active', 12), u('col', 0, '3.3.C', 'Ensuite single', null, null, 'Draft', 12), u('col', 0, '3.3.D', 'Ensuite single', 39, E, 'Active', 12),
    ];
    return [{ id: 'col|0|3|1', name: 'Flat 3.1', units: f1 }, { id: 'col|0|3|2', name: 'Flat 3.2', units: f2 }, { id: 'col|0|3|3', name: 'Flat 3.3', units: f3 }];
  }
  return null;
}
/* Fallbacks when a property lists no rent for a type: Durham's 2026/27 undergraduate rates over 39 weeks. */
function weeksFor(_type: string) { return 39; }
export function rentFor(type: string) { return type === 'Studio' ? 249.77 : type.startsWith('Ensuite') || type === 'Accessible ensuite' ? 217.26 : type === 'Townhouse room' ? 207.57 : 185.06; }

export function flatsOf(p: Property, bi: number, floor: number, edits: Record<string, Partial<Unit>>): Flat[] {
  const b = p.blocks[bi];
  const hand = special(p, bi, floor);
  let flats: Flat[];
  {
    const per = Math.max(1, Math.min(p.structure === 'House' ? Infinity : FLAT_MAX, Math.ceil(b.rooms / (b.floors * b.flats))));
    const built = p.build ? p.build.done : Infinity;
    const st: UStatus = p.status === 'Active' || p.status === 'Closed to allocations' ? 'Active' : p.status === 'Inactive' ? 'Inactive' : 'Draft';
    const priorRooms = p.blocks.slice(0, bi).reduce((a, x) => a + x.rooms, 0);
    flats = Array.from({ length: b.flats }, (_, fi) => {
      const units: Unit[] = [];
      for (let k = 0; k < per; k++) {
        const local = ((floor - 1) * b.flats + fi) * per + k;
        const idx = priorRooms + local;
        if (idx >= built || local >= b.rooms) break;
        const code = `${floor}.${fi + 1}.${L[k] ?? k}`;
        const has = p.tenancies !== false;
        const rt = p.roomTypes.find((r) => r.name === b.roomType);
        units.push(u(p.id, bi, code, b.roomType, has ? (rt?.weeks ?? weeksFor(b.roomType)) : null, has ? (rt?.rent ?? rentFor(b.roomType)) : null, st, b.size ?? 12, { accessible: (idx * 7) % 23 === 0 }));
      }
      if (p.id === 'stm' && bi === 1 && floor === 2 && fi === 3) units.push(u(p.id, bi, '2.4.G', b.roomType, null, null, 'Draft', 12, { note: 'added by hand, not in a group' }));
      return { id: `${p.id}|${bi}|${floor}|${fi + 1}`, name: `Flat ${floor}.${fi + 1}`, units };
    });
  }
  /* The hand-made flats stand in for the first few of their floor; the rest of the floor stays generated, so the
     property's room total still matches its real count. */
  if (hand) flats = [...hand, ...flats.slice(hand.length)];
  /* A renamed flat is stored as edits["flat|<flat id>"].code (Units › Rename). */
  /* Units added by hand (Units › Add unit) are stored whole in the edits, keyed by an id inside their flat. */
  return flats.map((f) => {
    const [, , fl, fn] = f.id.split('|');
    const pre = `${p.id}:${bi}:${fl}.${fn}.`;
    const added = Object.entries(edits).filter(([k, v]) => v.added && k.startsWith(pre) && !f.units.some((x) => x.id === k)).map(([, v]) => v as Unit);
    return { ...f, name: edits[`flat|${f.id}`]?.code ?? f.name, units: [...f.units.map((x) => ({ ...x, ...edits[x.id] })), ...added].filter((x) => !x.movedTo) };
  });
}
export const floorRooms = (b: Block) => Math.round(b.rooms / b.floors);

/** Every unit of a property, for occupancy and the units tab. */
export function allUnits(p: Property, edits: Record<string, Partial<Unit>>) {
  const out: (Unit & { block: string; flat: string })[] = [];
  p.blocks.forEach((b, bi) => {
    for (let f = 1; f <= b.floors; f++) flatsOf(p, bi, f, edits).forEach((fl) => fl.units.forEach((x) => out.push({ ...x, block: b.name, flat: fl.name })));
  });
  return out;
}

/** Weekly → monthly maths the backend uses: rent × 52 ÷ 12 to the penny, length × 12 ÷ 52 to a whole month. */
export const toMonthly = (rent: number, weeks: number) => ({ rent: Math.round((rent * 52 / 12) * 100) / 100, months: Math.round(weeks * 12 / 52) });
export const money = (n: number, dp = false) => `£${dp ? n.toLocaleString('en-GB', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : n.toLocaleString('en-GB')}`;
export const per = (p: Property | undefined) => (p?.letting === 'Monthly' ? 'mo' : 'wk');
export function templateRent(t: Template, p: Property | undefined) {
  if (p?.letting === 'Monthly') { const m = toMonthly(t.rent, t.weeks); return `${money(m.rent, true)} / mo · ${m.months} mo`; }
  return `${money(t.rent)} / wk · ${t.weeks} wk`;
}
