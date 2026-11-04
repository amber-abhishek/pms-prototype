import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import type { Tone } from './seed';

/* ---------------- Types ---------------- */
export type PStatus = 'Active' | 'Inactive' | 'Draft' | 'Closed to allocations' | 'Archived';
export type UStatus = 'Active' | 'Draft' | 'Inactive' | 'Archived';
export type Tag = { label: string; tone: Tone };
export type Block = { name: string; floors: number; flats: number; rooms: number; roomType: string; size?: number };
export type RoomType = { name: string; rooms: number; rent: number | null; next?: { rent: number; from: string } };
export type ActivityRow = { who: string; what: string; when: string };
export type Counts = { all: number; active: number; draft: number; inactive: number; archived: number };
export type Property = {
  id: string; name: string; campus: string; structure: 'College' | 'House'; tags: Tag[]; units: number; status: PStatus;
  address: string; zone: string; invNo: string; letting: 'Weekly' | 'Monthly';
  blocks: Block[]; build: { done: number; total: number } | null;
  photos: number; description: string; amenities: string[]; wardenPhone: string;
  createdBy: string; created: string; activity: ActivityRow[]; roomTypes: RoomType[];
  liveTenancies: number; archiveOn?: string; pendingRows?: number; counts: Counts; fees: number;
  /** false when the rooms came from a spreadsheet: they have no tenancies yet. */ tenancies?: boolean;
};
export type Template = {
  id: string; propertyId: string; name: string; weeks: number; rent: number; deposit: number; billing: 'Termly' | 'Upfront' | 'Monthly';
  from: string; to: string; linked: number; own: number; ownNote?: string; status: 'Active' | 'Inactive';
};
export type FeeType = { id: string; name: string; calc: 'Flat' | 'Percentage' | 'Per unit'; mandatory: boolean; refundable: boolean };
export type Fee = { id: string; typeId: string; amount: string; appliesTo: string | null; chargedOn: 'Each tenancy' | 'Each room' | 'The property' };
export type ImportJob = { id: string; name: string; kind: 'Spreadsheet' | 'Bulk create'; status: 'Running' | 'Queued' | 'Succeeded' | 'Failed'; done: number; total: number; errors?: number; by: string; started: string; structure: string; creates: string };
export type Unit = { id: string; code: string; type: string; weeks: number | null; rent: number | null; status: UStatus; template: string | null; size: number; note?: string; accessible?: boolean };
export type Flat = { id: string; name: string; units: Unit[] };
export type ArchivedRow = { id: string; name: string; type: string; flat?: boolean; units?: number; who: string; when: string; parent?: string };
export type Structure = { id: string; name: string; levels: { name: string; bsu: boolean }[]; properties: number; updated: string };
export type Field = { id: string; name: string; key: string; type: string; attached: string[] };

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
    ...base, structure: 'College', blocks: blocks3(p.units, 'Standard single'), description: `${p.name} is a Durham college with ${p.units} rooms.`,
    activity: [{ who: 'Tom Okafor', what: `${p.name} created`, when: '2 Sep 2024' }], liveTenancies: p.status === 'Active' ? p.units : 0,
    counts: counts(p.units, p.status), ...p,
  } as Property;
}

export function makeInventorySeed() {
  const properties: Property[] = [
    prop({
      id: 'col', name: 'Collingwood College', campus: 'Durham City', tags: [T('Catered', 'orange'), T('Hill colleges', 'purple'), T('Undergraduate', 'blue'), T('Sports', 'amber')], units: 412, status: 'Active',
      address: 'South Road, Durham DH1 3LT', zone: 'Hill', invNo: 'COL-001', photos: 18, wardenPhone: '0191 334 5010',
      blocks: [{ name: 'Block A', floors: 4, flats: 4, rooms: 128, roomType: 'Ensuite single', size: 13 }, { name: 'Block B', floors: 4, flats: 4, rooms: 144, roomType: 'Standard single', size: 11 }, { name: 'Block C', floors: 4, flats: 4, rooms: 140, roomType: 'Standard single', size: 11 }],
      roomTypes: [{ name: 'Standard single', rooms: 186, rent: 182 }, { name: 'Ensuite single', rooms: 140, rent: 204 }, { name: 'Ensuite double', rooms: 52, rent: 214 }, { name: 'Studio', rooms: 34, rent: 246 }],
      counts: { all: 412, active: 398, draft: 6, inactive: 5, archived: 3 },
    }),
    prop({ id: 'jb', name: 'Josephine Butler', campus: 'Durham City', tags: [T('Self-catered', 'green'), T('Postgraduate', 'blue')], units: 386, status: 'Active', address: 'South Road, Durham DH1 3DF', zone: 'Hill', invNo: 'JB-001' }),
    prop({ id: 'ust', name: 'Ustinov College', campus: 'Durham City', tags: [T('Postgraduate', 'blue'), T('Self-catered', 'green'), T('Accessible', 'purple')], units: 540, status: 'Active', address: 'Howlands Farm, Durham DH1 3DZ', zone: 'Howlands', invNo: 'UST-001' }),
    prop({ id: 'ste', name: 'Stephenson College', campus: 'Queen’s Campus', tags: [T('Catered', 'orange'), T('Common room', 'red')], units: 610, status: 'Active', address: 'University Boulevard, Stockton TS17 6BH', zone: 'Stockton', invNo: 'STE-001' }),
    prop({ id: 'hb', name: 'Hild Bede', campus: 'Durham City', tags: [T('Catered', 'orange'), T('Riverside', 'green'), T('Chapel', 'grey')], units: 298, status: 'Active', address: 'Leazes Road, Durham DH1 1SZ', zone: 'Elvet', invNo: 'HB-001' }),
    prop({ id: 'js', name: 'John Snow College', campus: 'Queen’s Campus', tags: [T('Self-catered', 'green')], units: 455, status: 'Active', address: 'Ebsworth Building, Stockton TS17 6BH', zone: 'Stockton', invNo: 'JS-001' }),
    prop({ id: 'erh', name: 'Elvet Riverside Houses', campus: 'Durham City', structure: 'House', tags: [], units: 48, status: 'Inactive', address: 'New Elvet, Durham DH1 3JT', zone: 'Elvet', invNo: 'ERH-001', blocks: [{ name: 'Houses', floors: 1, flats: 8, rooms: 48, roomType: 'Standard single', size: 10 }] }),
  ];
  const templates: Template[] = [
    { id: 'tp1', propertyId: 'col', name: 'Ensuite single', weeks: 51, rent: 212, deposit: 250, billing: 'Termly', from: '19 Sep 2027', to: '8 Sep 2028', linked: 96, own: 2, ownNote: '2.3.C £205 · 4.2.B £205', status: 'Active' },
    { id: 'tp2', propertyId: 'col', name: 'Standard single', weeks: 44, rent: 168, deposit: 250, billing: 'Termly', from: '19 Sep 2027', to: '24 Jul 2028', linked: 128, own: 1, ownNote: '1.4.D £160', status: 'Active' },
    { id: 'tp3', propertyId: 'col', name: 'Studio', weeks: 51, rent: 246, deposit: 300, billing: 'Termly', from: '19 Sep 2027', to: '8 Sep 2028', linked: 48, own: 0, status: 'Active' },
    { id: 'tp4', propertyId: 'col', name: 'Summer let', weeks: 10, rent: 190, deposit: 0, billing: 'Upfront', from: '29 Jun 2027', to: '6 Sep 2027', linked: 0, own: 0, status: 'Inactive' },
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
    { id: 'im2', name: 'ustinov-annex.csv', kind: 'Spreadsheet', status: 'Queued', done: 0, total: 60, by: 'Tom Reid', started: 'Today 11:44', structure: 'College', creates: '60 rooms' },
    { id: 'im3', name: 'Fenwick Block · 48 rooms', kind: 'Bulk create', status: 'Succeeded', done: 48, total: 48, by: 'Priya Shah', started: 'Today 10:05', structure: 'College', creates: '1 block · 63 entities' },
    { id: 'im4', name: 'hild-bede-flats.csv', kind: 'Spreadsheet', status: 'Failed', done: 0, total: 72, errors: 2, by: 'Tom Reid', started: 'Yesterday 16:20', structure: 'College', creates: '72 rooms' },
    { id: 'im5', name: 'John Snow · Block D', kind: 'Bulk create', status: 'Succeeded', done: 120, total: 120, by: 'Priya Shah', started: '24 Oct', structure: 'College', creates: '1 block · 145 entities' },
  ];
  const archived: Record<string, ArchivedRow[]> = {
    col: [
      { id: 'ar1', name: '1.2.F', type: 'Standard single', who: 'Tom Okafor', when: '12 Sep' },
      { id: 'ar2', name: '2.1.C', type: 'Studio', who: 'Tom Okafor', when: '12 Sep' },
      { id: 'ar3', name: '4.4.A', type: 'Ensuite single', who: 'Priya Shah', when: '3 Aug' },
    ],
  };
  const structures: Structure[] = [
    { id: 'st1', name: 'Halls with flats', levels: [{ name: 'Building', bsu: false }, { name: 'Floor', bsu: false }, { name: 'Flat', bsu: false }, { name: 'Room', bsu: true }, { name: 'Tenancy', bsu: true }], properties: 6, updated: 'Priya Shah · 2 Sep' },
    { id: 'st2', name: 'Halls, rooms only', levels: [{ name: 'Building', bsu: false }, { name: 'Floor', bsu: false }, { name: 'Room', bsu: true }, { name: 'Tenancy', bsu: true }], properties: 9, updated: 'Priya Shah · 2 Sep' },
    { id: 'st3', name: 'Studio block', levels: [{ name: 'Building', bsu: false }, { name: 'Floor', bsu: false }, { name: 'Studio', bsu: true }, { name: 'Tenancy', bsu: true }], properties: 2, updated: 'Tom Baker · 14 Sep' },
    { id: 'st4', name: 'Shared houses', levels: [{ name: 'House', bsu: false }, { name: 'Room', bsu: true }, { name: 'Tenancy', bsu: true }], properties: 0, updated: 'Priya Shah · 20 Sep' },
  ];
  const fields: Field[] = [
    { id: 'cf1', name: 'Accessible room', key: 'accessible_room', type: 'Yes / no', attached: ['Halls with flats › Room', 'Halls, rooms only › Room'] },
    { id: 'cf2', name: 'Ensuite type', key: 'ensuite_type', type: 'Pick one · 3', attached: ['Halls with flats › Room', 'Halls, rooms only › Room'] },
    { id: 'cf3', name: 'Floor area (m²)', key: 'floor_area_m2', type: 'Number', attached: ['Studio block › Studio'] },
    { id: 'cf4', name: 'Bed size', key: 'bed_size', type: 'Pick one · 3', attached: ['Halls with flats › Room', 'Studio block › Studio'] },
    { id: 'cf5', name: 'Kitchen shared with', key: 'kitchen_shared_with', type: 'Number', attached: ['Halls with flats › Flat'] },
    { id: 'cf6', name: 'Lift access', key: 'lift_access', type: 'Yes / no', attached: ['Halls with flats › Building', 'Halls, rooms only › Building'] },
  ];
  return { properties, templates, feeTypes, fees, imports, archived, structures, fields, unitEdits: {} as Record<string, Partial<Unit>>, archivedFlats: [] as string[] };
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
    { name: 'pms-inventory', storage: createJSONStorage(() => sessionStorage) },
  ),
);

export const invId = (p: string) => `${p}${Math.random().toString(36).slice(2, 8)}`;
export const logAct = (p: Property, what: string): ActivityRow[] => [{ who: 'Priya Shah', what, when: 'Just now' }, ...p.activity];

/* ---------------- Hierarchy: blocks → floors → flats → units ---------------- */
const L = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
const u = (pid: string, bi: number, code: string, type: string, weeks: number | null, rent: number | null, status: UStatus, size: number, extra: Partial<Unit> = {}): Unit => ({
  id: `${pid}:${bi}:${code}`, code, type, weeks, rent, status, template: weeks ? `${type} · ${weeks} wk` : null, size, ...extra,
});
/** Hand-specified flats the designs show; everything else is generated from the block's counts. */
function special(p: Property, bi: number, floor: number): Flat[] | null {
  if (p.id === 'col' && bi === 0 && floor === 3) {
    const f1: Unit[] = [
      u('col', 0, '3.1.A', 'Ensuite single', 51, 212, 'Active', 13), u('col', 0, '3.1.B', 'Ensuite single', 51, 212, 'Active', 13), u('col', 0, '3.1.C', 'Ensuite single', 51, 212, 'Active', 13),
      u('col', 0, '3.1.D', 'Ensuite single', 51, 212, 'Inactive', 13), u('col', 0, '3.1.E', 'Standard single', 44, 168, 'Active', 11), u('col', 0, '3.1.F', 'Standard single', 44, 168, 'Active', 11),
    ];
    const f2: Unit[] = [
      u('col', 0, '3.2.A', 'Studio', 51, 289, 'Inactive', 20), u('col', 0, '3.2.B', 'Studio', 51, 289, 'Active', 20), u('col', 0, '3.2.C', 'Ensuite single', 51, 212, 'Active', 13),
      u('col', 0, '3.2.D', 'Accessible ensuite', 51, 212, 'Active', 16, { accessible: true }), u('col', 0, '3.2.E', 'Ensuite single', null, null, 'Draft', 13),
    ];
    return [{ id: 'col|0|3|1', name: 'Flat 3.1', units: f1 }, { id: 'col|0|3|2', name: 'Flat 3.2', units: f2 }];
  }
  return null;
}
function weeksFor(type: string) { return type.startsWith('Ensuite') || type === 'Studio' ? 51 : 44; }
function rentFor(type: string) { return type === 'Studio' ? 246 : type.startsWith('Ensuite') ? 212 : 168; }

export function flatsOf(p: Property, bi: number, floor: number, edits: Record<string, Partial<Unit>>): Flat[] {
  const b = p.blocks[bi];
  let flats = special(p, bi, floor);
  if (!flats) {
    const per = Math.max(1, Math.round(b.rooms / (b.floors * b.flats)));
    const built = p.build ? p.build.done : Infinity;
    const st: UStatus = p.status === 'Active' || p.status === 'Closed to allocations' ? 'Active' : p.status === 'Inactive' ? 'Inactive' : 'Draft';
    const priorRooms = p.blocks.slice(0, bi).reduce((a, x) => a + x.rooms, 0);
    flats = Array.from({ length: b.flats }, (_, fi) => {
      const units: Unit[] = [];
      for (let k = 0; k < per; k++) {
        const idx = priorRooms + ((floor - 1) * b.flats + fi) * per + k;
        if (idx >= built) break;
        const code = `${floor}.${fi + 1}.${L[k] ?? k}`;
        const has = p.tenancies !== false;
        const rt = p.roomTypes.find((r) => r.name === b.roomType);
        units.push(u(p.id, bi, code, b.roomType, has ? weeksFor(b.roomType) : null, has ? (rt?.rent ?? rentFor(b.roomType)) : null, st, b.size ?? 12, { accessible: (idx * 7) % 23 === 0 }));
      }
      if (p.id === 'stm' && bi === 1 && floor === 2 && fi === 3) units.push(u(p.id, bi, '2.4.G', b.roomType, null, null, 'Draft', 12, { note: 'added by hand, not in a group' }));
      return { id: `${p.id}|${bi}|${floor}|${fi + 1}`, name: `Flat ${floor}.${fi + 1}`, units };
    });
  }
  return flats.map((f) => ({ ...f, units: f.units.map((x) => ({ ...x, ...edits[x.id] })) }));
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
