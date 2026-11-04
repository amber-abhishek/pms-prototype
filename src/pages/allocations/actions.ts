import { toast } from 'sonner';
import { ME, NOW, TODAY, addDays, available, firstName, hallFull, type App, type Data, type Offer, useAlloc } from '../../data/allocations';

/** Mutations shared by the Applications, Offers and Bookings screens. Each returns nothing and toasts with Undo. */
export function useAllocActions() {
  const up = useAlloc((s) => s.up);
  const snap = useAlloc((s) => s.snap);
  const restore = useAlloc((s) => s.restore);
  const withUndo = () => { const s = snap(); return { label: 'Undo', onClick: () => restore(s) }; };

  const setApp = (d: Data, id: string, p: Partial<App>) => d.apps.map((a) => (a.id === id ? { ...a, ...p, log: [...(p.log ?? []), ...(a.log ?? [])] } : a));

  /** Allocate a unit and send the offer (unless email is off, then the offer waits). */
  function allocate(a: App, hall: string, room: string, code: string, opt: { days: number; email: boolean; override?: string; by?: string }) {
    const undo = withUndo();
    const unit = `${hall} · ${code}`;
    const by = opt.by ?? ME;
    up((d) => {
      const offer: Offer = { id: `o${Date.now()}${a.ref}`, name: a.name, appId: a.id, hall, room, unit: code, status: 'open', sent: TODAY, expires: addDays(NOW.replace(' 10:42', ' 17:00'), opt.days), leftH: opt.days * 24, reminders: 0, next: opt.email ? 'Offer emailed · reminder at 48h' : 'Offer ready · not emailed yet', recent: true };
      return {
        apps: setApp(d, a.id, { status: 'allocated', unit, allocBy: by, allocOn: TODAY, offer: 'Offer open', override: opt.override, log: [{ t: `Allocated ${unit} and ${opt.email ? 'emailed the offer' : 'saved the offer'} · ${by}`, when: NOW.replace(' 10:42', ', 10:42'), sub: opt.override ? `override: “${opt.override}”` : undefined }] }),
        offers: [offer, ...d.offers.filter((o) => !(o.name === a.name && o.status === 'open'))],
        recent: [offer.id, ...d.recent],
        used: { ...d.used, [`${hall}|${room}`]: (d.used[`${hall}|${room}`] ?? 0) + 1 },
        usedUnits: [...d.usedUnits, unit],
        cycles: d.cycles.map((c) => (c.name === a.cycle ? { ...c, allocated: c.allocated + 1 } : c)),
      };
    });
    toast.success(`${a.name} allocated to ${hall} ${code} · offer ${opt.email ? 'sent' : 'saved'}`, { action: undo });
  }

  function reject(a: App, reason: string, email: boolean) {
    const undo = withUndo();
    up((d) => ({ apps: setApp(d, a.id, { status: 'rejected', reason, rejBy: ME, rejOn: TODAY, emailed: email, log: [{ t: `Rejected by ${ME}`, when: '27 Oct, 10:44', sub: reason }] }) }));
    toast(`${a.name}’s application rejected`, { description: `${reason}${email ? ` · ${firstName(a.name)} has been emailed` : ''}`, action: undo });
  }

  function manual(a: App) {
    const undo = withUndo();
    const why = a.tag === 'Manual review' || a.toCheck?.length ? 'Medical evidence to check' : a.tag === 'Requirements' ? 'Requirements to match by hand' : a.tag === 'No study offer' ? 'Study offer to confirm' : 'Sent by Priya Shah';
    up((d) => ({ apps: setApp(d, a.id, { status: 'manual', why, assignee: ME, log: [{ t: `Sent to manual review by ${ME}`, when: '27 Oct, 10:44', sub: why }] }) }));
    toast(`${a.name} moved to manual review`, { description: 'Assigned to you · left out of auto-allocate', action: undo });
  }

  function toQueue(a: App) {
    up((d) => ({ apps: setApp(d, a.id, { status: 'review', reason: undefined, why: undefined, log: [{ t: `Moved back to To review by ${ME}`, when: '27 Oct, 10:45' }] }) }));
    toast.success(`${a.name} is back in To review`);
  }

  function waitlist(a: App, hall: string, room: string) {
    const undo = withUndo();
    up((d) => ({
      apps: setApp(d, a.id, { status: 'waitlist', log: [{ t: `Added to the ${hall} · ${room} waitlist`, when: '27 Oct, 10:44' }] }),
      waitlist: [...d.waitlist, { id: `w${Date.now()}`, name: a.name, appId: a.id, hall, room, note: `${hallFull[hall]} full · added from review`, joined: TODAY }],
    }));
    toast(`${a.name} added to the waitlist`, { description: `${hall} · ${room}`, action: undo });
  }

  function verify(a: App, req: string) {
    up((d) => ({ apps: setApp(d, a.id, { toCheck: (a.toCheck ?? []).filter((r) => r !== req), tag: a.tag === 'Manual review' && (a.toCheck ?? []).length <= 1 ? undefined : a.tag, log: [{ t: `${ME} verified ${req.toLowerCase()}`, when: '27 Oct, 10:43' }] }) }));
    toast.success(`${req} verified`, { description: `Counted for ${a.name}’s matching from now on` });
  }

  /** Auto-allocate everything in To review that has no flag and a free unit. */
  function autoAllocate(days: number, email: boolean) {
    const undo = withUndo();
    let n = 0;
    up((d) => {
      const used = { ...d.used };
      const usedUnits = [...d.usedUnits];
      const offers: Offer[] = [];
      const apps = d.apps.map((a) => {
        if (a.status !== 'review' || a.tag || a.reqs.length) return a;
        const p = a.prefs.find(([h, r]) => available({ ...d, used }, h, r) > 0);
        if (!p) return a;
        const k = `${p[0]}|${p[1]}`;
        used[k] = (used[k] ?? 0) + 1;
        const unit = `${p[0]} · ${(+a.ref % 5) + 1}.${(+a.ref % 4) + 1}.${'ABCD'[+a.ref % 4]}`;
        usedUnits.push(unit);
        n++;
        offers.push({ id: `o${Date.now()}${a.ref}`, name: a.name, appId: a.id, hall: p[0], room: p[1], unit: unit.split(' · ')[1], status: 'open', sent: TODAY, expires: addDays(NOW.replace(' 10:42', ' 17:00'), days), leftH: days * 24, reminders: 0, next: email ? 'Offer emailed by auto-allocate' : 'Offer saved by auto-allocate · not emailed yet' });
        return { ...a, status: 'allocated' as const, unit, allocBy: 'Auto-allocate', allocOn: TODAY, offer: 'Offer open' as const };
      });
      return { apps, used, usedUnits, offers: [...offers, ...d.offers], cycles: d.cycles.map((c) => (c.name === '2027/28' ? { ...c, allocated: c.allocated + n } : c)) };
    });
    toast.success(`Auto-allocate placed ${n} applications`, { description: `${n} offers ${email ? 'emailed' : 'saved'} · expire in ${days} days. The rest need a person.`, action: undo });
  }

  return { allocate, reject, manual, toQueue, waitlist, verify, autoAllocate, withUndo };
}
