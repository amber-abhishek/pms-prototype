import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Buildings, Storefront, Tray, User, type Icon } from '../components/icons';
import { allPages } from '../nav';
import { useDb } from '../data/store';
import { useInv } from '../data/inventory';
import { useAlloc } from '../data/allocations';
import { useRms } from '../data/residents';
import { useOc } from '../data/offcampus';
import { Dialog, DialogClose, DialogContent, DialogTitle } from '../components/shadcn/dialog';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '../components/shadcn/command';

type Hit = { group: string; label: string; sub?: string; to: string; icon: Icon };

export function Palette({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [q, setQ] = useState('');
  const db = useDb();
  const inv = useInv(); const alloc = useAlloc(); const rms = useRms(); const oc = useOc();
  const nav = useNavigate();
  useEffect(() => { if (open) setQ(''); }, [open]);

  const hits = useMemo<Hit[]>(() => {
    const t = q.trim().toLowerCase();
    const has = (s: string) => s.toLowerCase().includes(t);
    const pages: Hit[] = allPages.filter((p) => p.roles.includes(db.role) && (!t || has(p.label) || has(p.module))).map((p) => ({ group: 'Pages', label: p.label, sub: p.module, to: p.to, icon: p.icon }));
    if (!t) return pages.slice(0, 8);
    const admin = db.role === 'admin';
    return [
      ...pages.slice(0, 6),
      ...(admin ? inv.properties.filter((p) => has(p.name)).slice(0, 4).map((p) => ({ group: 'Properties', label: p.name, sub: p.address, to: `/inventory/properties/${p.id}`, icon: Buildings })) : []),
      ...(admin ? alloc.apps.filter((a) => has(a.name) || has(a.ref)).slice(0, 5).map((a) => ({ group: 'Applications', label: a.name, sub: `${a.ref} · ${a.hall}`, to: `/allocations/applications?open=${a.id}`, icon: Tray })) : []),
      ...(admin ? rms.residents.filter((r) => has(r.name)).slice(0, 4).map((r) => ({ group: 'Residents', label: r.name, sub: `${r.hall} · ${r.room}`, to: `/residents/${r.id}`, icon: User })) : []),
      ...oc.reviews.filter((l) => l.status === 'Under review' && (has(l.title) || has(l.landlord))).slice(0, 3).map((l) => ({ group: 'Listings', label: l.title, sub: `${l.landlord} · Under review`, to: `/offcampus/reviews?open=${l.id}`, icon: Storefront })),
      ...oc.hmos.filter((l) => has(l.title) || has(l.landlord)).slice(0, 3).map((l) => ({ group: 'Listings', label: l.title, sub: `${l.landlord} · ${l.status}`, to: `/offcampus/listings?tab=hmo`, icon: Storefront })),
    ];
  }, [q, db, inv, alloc, rms, oc]);

  const go = (h: Hit) => { nav(h.to); onClose(); };
  const groups = [...new Set(hits.map((h) => h.group))];
  /* shadcn Command (cmdk) in a Dialog: arrow keys, Enter, Escape and focus come from cmdk and Radix. We filter the hits
     ourselves (records as well as pages), so cmdk's own filter is off. */
  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      {/* Opened from ⌘K dozens of times a day, so it appears and disappears instantly (no animation). */}
      <DialogContent instant aria-describedby={undefined} className="top-[12vh] bottom-auto mt-0 max-w-xl">
        <DialogTitle className="sr-only">Search</DialogTitle>
        <Command shouldFilter={false} loop className="[&_[cmdk-input-wrapper]]:h-12 [&_[cmdk-input-wrapper]]:px-4 [&_[cmdk-input-wrapper]_svg]:opacity-100 [&_[cmdk-input-wrapper]_svg]:text-gray-400">
          <CommandInput value={q} onValueChange={setQ} placeholder="Search pages, students, listings…" className="placeholder:text-gray-400"
            trailing={<DialogClose aria-label="Close search (Esc)" className="ml-2 shrink-0 h-5 px-1.5 rounded border border-line bg-white text-[11px] leading-4 font-medium text-[#646A78] font-sans hover:bg-gray-50 hover:text-ink">Esc</DialogClose>} />
          <CommandList className="max-h-[50vh] p-1.5">
            <CommandEmpty className="py-10 text-center text-sm text-gray-500">No results for “{q}”</CommandEmpty>
            {groups.map((g) => (
              <CommandGroup key={g} heading={g} className="[&_[cmdk-group-heading]]:px-2 [&_[cmdk-group-heading]]:pt-2 [&_[cmdk-group-heading]]:pb-1 [&_[cmdk-group-heading]]:text-xs [&_[cmdk-group-heading]]:text-gray-500">
                {hits.filter((h) => h.group === g).map((h, k) => {
                  const I = h.icon;
                  return (
                    <CommandItem key={h.label + k} value={`${g} ${h.label} ${h.to}`} onSelect={() => go(h)} className="h-9 gap-2.5 data-[selected=true]:bg-[#F3F4F6]">
                      <I size={16} className="text-gray-500" /><span className="truncate">{h.label}</span>{h.sub && <span className="text-xs text-gray-400 truncate">{h.sub}</span>}
                    </CommandItem>
                  );
                })}
              </CommandGroup>
            ))}
          </CommandList>
        </Command>
      </DialogContent>
    </Dialog>
  );
}
