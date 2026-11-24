import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { Bike, Car, DotsSixVertical, Dumbbell, Image, ImageSquare, Library, Sofa, Star, Trash, Utensils, WashingMachine } from '../../components/icons';
import { Button, SheetSection, Textarea, cx } from '../../components/ui';
import { logAct, useInv, type Property } from '../../data/inventory';
import { EditActions, EditLink, PanelModal } from './common';
import { photoOf } from './photos';

export const AMENITIES = ['Laundry', 'Bike store', 'Gym', 'Library', 'Common room', 'Parking', 'Catered option'];
export const AMENITY_ICON: Record<string, typeof Bike> = { Laundry: WashingMachine, 'Bike store': Bike, Gym: Dumbbell, Library, 'Common room': Sofa, Parking: Car, 'Catered option': Utensils };

/** The property's photos in saved order, as indexes into its stock set. The first is the cover. */
export const photoOrder = (p: Property) => p.photoOrder ?? Array.from({ length: p.photos }, (_, i) => i);
const EYEBROW = 'font-mono text-[11px] leading-4 font-medium uppercase tracking-[0.04em]';

/* ---------------- Photos tab in the side sheet (Figma "Property · Photos"): three read-only cards ---------------- */
export function PhotosCards({ p }: { p: Property }) {
  const patchProp = useInv((s) => s.patchProp);
  const order = photoOrder(p);
  const [all, setAll] = useState(false);
  const [editDesc, setEditDesc] = useState(false);
  const [desc, setDesc] = useState(p.description);
  const [editAm, setEditAm] = useState(false);
  const [am, setAm] = useState<string[]>(p.amenities);
  const saveDesc = () => { patchProp(p.id, (x) => ({ description: desc.trim(), activity: logAct(x, 'Edited the description') })); setEditDesc(false); toast.success('Description saved'); };
  const saveAm = () => { patchProp(p.id, (x) => ({ amenities: am, activity: logAct(x, 'Edited the amenities') })); setEditAm(false); toast.success('Amenities saved'); };
  return (
    <>
      <SheetSection title={`Photos · ${order.length}`} action={order.length > 0 && <EditLink onClick={() => setAll(true)}>See all</EditLink>}>
        {order.length ? (
          <>
            {/* Six in a 3-column grid; the rest are one click away in the All photos dialog. */}
            <div className="grid grid-cols-3 gap-2">
              {order.slice(0, 6).map((ix, i) => (
                <button key={ix} type="button" onClick={() => setAll(true)} className="relative aspect-[4/3] overflow-hidden rounded-lg bg-[#F5F5F5] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring" aria-label={i === 0 ? 'Cover photo' : `Photo ${i + 1}`}>
                  {photoOf(p.id, ix) ? <img src={photoOf(p.id, ix)} alt="" loading="lazy" className="absolute inset-0 size-full object-cover" /> : <Image size={20} className="m-auto text-[#A3A3A3]" />}
                  {i === 0 && <CoverBadge />}
                </button>
              ))}
            </div>
          </>
        ) : (
          <button type="button" onClick={() => patchProp(p.id, (x) => ({ photos: 7, photoOrder: undefined, activity: logAct(x, 'Added 7 photos') }))}
            className="w-full rounded-xl border-[1.5px] border-dashed border-[#D4D4D4] py-8 flex flex-col items-center gap-1.5 hover:bg-[#FAFAFA]">
            <ImageSquare size={24} className="text-[#737373]" /><span className="text-sm font-medium">Add photos</span><span className="text-xs text-[#737373]">JPG or PNG · the first one is the cover</span>
          </button>
        )}
      </SheetSection>
      {/* One editable section: its Edit link turns the section into inputs and becomes Cancel / Save (2026-11-20). */}
      <SheetSection title="Description" action={editDesc ? <EditActions onCancel={() => setEditDesc(false)} onSave={saveDesc} /> : <EditLink onClick={() => { setDesc(p.description); setEditDesc(true); }} />}>
        {editDesc ? (
          <Textarea rows={5} autoFocus={false} value={desc} onChange={(e) => setDesc(e.target.value)} placeholder={`What’s it like to live at ${p.name}?`} aria-label="Description" />
        ) : p.description ? <p className="text-sm leading-[22px] text-[#0A0A0A] whitespace-pre-line">{p.description}</p>
          : <p className="text-sm leading-5 text-[#737373]">No description yet. It shows on the booking site.</p>}
      </SheetSection>
      <SheetSection title={`Amenities · ${p.amenities.length}`} action={editAm ? <EditActions onCancel={() => setEditAm(false)} onSave={saveAm} /> : <EditLink onClick={() => { setAm(p.amenities); setEditAm(true); }} />}>
        {editAm ? (
          <div className="flex flex-wrap gap-2">
              {AMENITIES.map((a) => {
                const on = am.includes(a);
                const Ico = AMENITY_ICON[a];
                return <button key={a} type="button" aria-pressed={on} onClick={() => setAm(on ? am.filter((x) => x !== a) : [...am, a])} className={cx('h-7 px-2.5 rounded-full border text-sm flex items-center gap-1.5', on ? 'border-[#0A0A0A] bg-[#F5F5F5] text-[#0A0A0A]' : 'border-line text-[#525252] hover:bg-[#FAFAFA]')}>{Ico && <Ico size={14} className={on ? undefined : 'text-[#737373]'} />}{a}</button>;
              })}
          </div>
        ) : p.amenities.length ? (
          /* An icon list in two columns, not pills (2026-11-19). */
          <div className="grid grid-cols-3 gap-x-4">
            {p.amenities.map((a) => { const Ico = AMENITY_ICON[a]; return <div key={a} className="h-9 flex items-center gap-2.5 text-sm text-[#0A0A0A]">{Ico && <Ico size={18} className="text-[#525252] shrink-0" />}{a}</div>; })}
          </div>
        ) : <p className="text-sm leading-5 text-[#737373]">None added yet</p>}
      </SheetSection>
      <PhotosDialog p={p} open={all} onClose={() => setAll(false)} />
    </>
  );
}
const CoverBadge = () => <span className={cx(EYEBROW, 'absolute left-2 top-2 h-5 px-1.5 rounded-md bg-white text-[#0A0A0A] flex items-center')}>Cover</span>;

/* ---------------- All photos (Figma "Property · All photos (dialog)"): reorder, make cover, remove; saved on Save ---------------- */
export function PhotosDialog({ p, open, onClose }: { p: Property; open: boolean; onClose: () => void }) {
  const patchProp = useInv((s) => s.patchProp);
  const [order, setOrder] = useState<number[]>(() => photoOrder(p));
  const [changes, setChanges] = useState(0);
  const [drag, setDrag] = useState<number | null>(null);
  const [over, setOver] = useState<number | null>(null);
  useEffect(() => { if (open) { setOrder(photoOrder(p)); setChanges(0); } }, [open]); // eslint-disable-line react-hooks/exhaustive-deps
  const edit = (next: number[]) => { setOrder(next); setChanges((c) => c + 1); };
  const move = (from: number, to: number) => { if (from === to) return; const n = [...order]; const [x] = n.splice(from, 1); n.splice(to > from ? to - 1 : to, 0, x); edit(n); };
  const cover = (i: number) => move(i, 0);
  const remove = (i: number) => edit(order.filter((_, k) => k !== i));
  const add = () => { const used = new Set(order); let ix = 0; while (used.has(ix)) ix++; edit([...order, ix]); };
  const save = () => {
    patchProp(p.id, (x) => ({ photoOrder: order, photos: order.length, activity: logAct(x, 'Updated the photos') }));
    toast.success('Photos saved');
    onClose();
  };
  return (
    <PanelModal open={open} onClose={onClose} width={880} eyebrow="Edit photos" title={p.name} icon={Image} meta="Drag to reorder · the first is the cover"
      left={changes ? <span className="text-sm text-[#737373]">{changes} {changes === 1 ? 'change' : 'changes'}</span> : undefined}
      right={<><Button onClick={onClose}>Cancel</Button><Button variant="primary" icon={null} disabled={!changes} onClick={save}>Save</Button></>}>
      <SheetSection title={`Photos · ${order.length}`} action={<EditLink onClick={add}>Add photos</EditLink>}>
        {order.length ? (
          <div className="grid grid-cols-4 gap-3" onDragOver={(e) => e.preventDefault()}>
            {order.map((ix, i) => (
              <div key={ix} draggable onDragStart={(e) => { setDrag(i); e.dataTransfer.effectAllowed = 'move'; }}
                onDragEnd={() => { setDrag(null); setOver(null); }}
                onDragOver={(e) => { e.preventDefault(); const r = e.currentTarget.getBoundingClientRect(); setOver(e.clientX > r.left + r.width / 2 ? i + 1 : i); }}
                onDrop={(e) => { e.preventDefault(); if (drag != null && over != null) move(drag, over); setDrag(null); setOver(null); }}
                className={cx('group relative aspect-[4/3] rounded-[10px] bg-[#F5F5F5] cursor-grab active:cursor-grabbing', drag === i && 'opacity-40 outline-dashed outline-[1.5px] outline-[#A3A3A3]')}>
                <div className="absolute inset-0 overflow-hidden rounded-[10px]">
                  {photoOf(p.id, ix) ? <img src={photoOf(p.id, ix)} alt="" draggable={false} className="size-full object-cover" /> : <Image size={24} className="m-auto text-[#A3A3A3]" />}
                </div>
                {/* Where the dragged photo lands: a blue line in the gap. */}
                {drag != null && over === i && drag !== i && drag !== i - 1 && <span aria-hidden className="absolute -left-[7.5px] inset-y-0 w-[3px] rounded-full bg-primary" />}
                {drag != null && over === i + 1 && i === order.length - 1 && drag !== i && <span aria-hidden className="absolute -right-[7.5px] inset-y-0 w-[3px] rounded-full bg-primary" />}
                {i === 0 && <CoverBadge />}
                {/* Hover: a drag handle, then make cover and remove. */}
                <div className="pointer-events-none absolute inset-0 rounded-[10px] bg-gradient-to-b from-black/35 to-transparent to-50% opacity-0 group-hover:opacity-100 transition-opacity" />
                <span aria-hidden className={cx('absolute left-2 top-2 size-7 rounded-lg bg-white text-[#0A0A0A] items-center justify-center hidden', i > 0 && 'group-hover:flex')}><DotsSixVertical size={16} /></span>
                <div className="absolute right-2 top-2 hidden group-hover:flex gap-1.5">
                  {i > 0 && <button type="button" title="Make cover" aria-label="Make cover" onClick={() => cover(i)} className="size-7 rounded-lg bg-white text-[#0A0A0A] hover:bg-[#F5F5F5] flex items-center justify-center"><Star size={16} /></button>}
                  <button type="button" title="Remove" aria-label="Remove photo" onClick={() => remove(i)} className="size-7 rounded-lg bg-white text-[#DC2626] hover:bg-[#FEF2F2] flex items-center justify-center"><Trash size={16} /></button>
                </div>
              </div>
            ))}
          </div>
        ) : <p className="py-10 text-center text-sm text-[#737373]">No photos yet</p>}
      </SheetSection>
    </PanelModal>
  );
}

