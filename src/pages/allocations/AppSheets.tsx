import { useRef, useState } from 'react';
import { CalendarX, Check, MagicWand, WarningCircle, XCircle } from '../../components/icons';
import { Button, Input, Note, Pill, Sheet, SheetSection, Switch, Tabs, cx } from '../../components/ui';
import { available, firstName, hallFull, unitsFor, useAlloc, type App } from '../../data/allocations';
import { Modal, Radio } from './common';
import { useAllocActions } from './actions';
import { ordinal, type Pref } from './AppDetail';

const DAYS = ['3 days', '5 days', '7 days'] as const;

/** Flow 2 · 06 and edge case E1: pick a unit, override overlaps with a reason, send the offer. */
export function AllocateSheet({ a, pref, onClose, onDone }: { a: App; pref: Pref; onClose: () => void; onDone: () => void }) {
  const d = useAlloc();
  const act = useAllocActions();
  const units = unitsFor(d, a, pref.hall, pref.room);
  const [taken, setTaken] = useState<string | null>(null);
  const [sel, setSel] = useState(units[0]?.code ?? '');
  const [reason, setReason] = useState('');
  const [days, setDays] = useState<(typeof DAYS)[number]>('5 days');
  const [email, setEmail] = useState(true);
  const busy = useRef(false);
  const u = units.find((x) => x.code === sel);
  const takenUnit = units.find((x) => x.code === taken);
  const needReason = !!u?.overlap && !reason.trim();
  const submit = () => {
    if (!u || busy.current) return;
    if (u.takenBy && !taken) {
      // Re-check at save: someone else took it while the sheet was open.
      setTaken(u.code);
      setSel(units.find((x) => !x.takenBy)?.code ?? '');
      return;
    }
    busy.current = true;
    act.allocate(a, pref.hall, pref.room, u.code, { days: +days[0], email, override: u.overlap ? reason.trim() : undefined });
    onDone();
  };
  return (
    <Sheet open onClose={onClose} width={520}
      title={`Allocate ${a.name}`}
      footer={units.length ? <>
        <Button onClick={onClose}>Cancel</Button>
        <Button variant="primary" icon={Check} disabled={!u || needReason} onClick={submit}>{taken ? `Allocate ${sel}` : email ? 'Allocate & send offer' : 'Allocate'}</Button>
      </> : <>
        <Button onClick={onClose}>Cancel</Button>
        <Button variant="primary" onClick={() => { act.waitlist(a, pref.hall, pref.room); onDone(); }}>Add to waitlist</Button>
      </>}>
      {!units.length ? (
        <Note tone="amber" icon={WarningCircle} title={`${hallFull[pref.hall]} has no free ${pref.room.toLowerCase()}`}>
          Every matching unit is allocated or held. Add {firstName(a.name)} to the waitlist for this room type and they get the next one that frees up, or close this and pick another hall.
        </Note>
      ) : (
        <div className="[&>section:first-child]:border-t-0 [&>section:first-child]:pt-0">
          <SheetSection title="Preference" rows={[['Choice', `${ordinal(pref.rank)} preference`], ['Hall', hallFull[pref.hall]], ['Room type', `${pref.room} · ${pref.weeks} weeks`]]} />
          {takenUnit?.takenBy && (<div className="mb-5">
            <Note tone="red" icon={XCircle} title={`${pref.hall} ${takenUnit.code} is taken`}>
              {takenUnit.takenBy.who} allocated it to {takenUnit.takenBy.to} 4 minutes ago. Pick another room for {firstName(a.name)}.
            </Note>
          </div>)}
          <SheetSection title={`Unit · ${units.length} match`}>
          <div className="space-y-2.5" role="radiogroup" aria-label="Unit">
            {units.map((x) => {
              const on = x.code === sel;
              const gone = x.code === taken;
              return (
                <div key={x.code} className={cx('rounded-xl border p-3', on ? 'border-primary bg-[#EFF6FF]' : 'border-line hover:bg-[#F9FAFB]', gone && 'opacity-60')}>
                  <label className={cx('flex items-start gap-3', gone ? 'cursor-not-allowed' : 'cursor-pointer')}>
                    <input type="radio" name="unit" checked={on} disabled={gone} onChange={() => setSel(x.code)} className="mt-1 size-4 accent-[#2563EB]" />
                    <div className="flex-1">
                      <div className="flex items-center gap-2"><span className="text-sm font-semibold">{x.code}</span><span className="text-xs text-gray-500">{x.where}</span><span className="ml-auto text-xs text-gray-500">{gone ? <Pill tone="red">Taken</Pill> : `Match ${x.match}%`}</span></div>
                      <div className="flex flex-wrap gap-1.5 mt-2">{x.tags.map((t) => <Pill key={t.label} tone={t.tone} outline>{t.label}</Pill>)}</div>
                    </div>
                  </label>
                  {on && x.overlap && (
                    <div className="mt-3 space-y-3">
                      <div className="rounded-lg border border-[#C47A00]/35 bg-white p-3 flex gap-2.5">
                        <CalendarX size={16} className="text-[#C47A00] shrink-0 mt-0.5" />
                        <div><div className="text-sm font-medium text-[#C47A00]">{x.overlap.title}</div><div className="text-xs text-gray-500 mt-0.5">{x.overlap.body}</div></div>
                      </div>
                      <label className="block">
                        <span className="block text-sm font-medium mb-1.5">Reason for the override</span>
                        <Input value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Jae Park leaves on 18 Sep · agreed with the Ustinov office" />
                      </label>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
          </SheetSection>
          <SheetSection title="Offer">
          <div className="flex items-center justify-between">
            <div><div className="text-sm font-medium">Email the offer to {firstName(a.name)}</div><div className="text-xs text-gray-500">Template: Offer · {a.reqs.includes('Step-free access') ? 'accessible room' : 'standard'}</div></div>
            <Switch checked={email} onChange={setEmail} label="Email the offer" />
          </div>
          <div className="flex items-center justify-between mt-4">
            <span className="text-sm font-medium">Offer expires in</span>
            <Tabs value={days} onChange={setDays} tabs={DAYS.map((x) => ({ id: x, label: x }))} />
          </div>
          </SheetSection>
        </div>
      )}
    </Sheet>
  );
}

const REASONS = [
  { r: 'No offer to study at Durham', sub: 'They can apply again if they get one', tpl: 'no study offer' },
  { r: 'Not eligible for this cycle', tpl: 'not eligible' },
  { r: 'Duplicate application', tpl: 'duplicate' },
  { r: 'Withdrawn by the applicant', tpl: 'withdrawn' },
  { r: 'Other', sub: 'Needs a note', tpl: 'other' },
];
/** Flow 2 · 07: reject with a structured reason, email, count it in the cycle report. */
export function RejectDialog({ a, onClose, onDone }: { a: App; onClose: () => void; onDone: () => void }) {
  const act = useAllocActions();
  const [reason, setReason] = useState(a.tag === 'No study offer' ? REASONS[0].r : '');
  const [note, setNote] = useState('');
  const [email, setEmail] = useState(true);
  const busy = useRef(false);
  const fn = firstName(a.name);
  const ok = reason && (reason !== 'Other' || note.trim());
  return (
    <Modal open onClose={onClose} icon={XCircle} title={`Reject ${a.name}’s application`} sub={`Pick the reason. ${fn} sees it in the email and on the portal, and it’s counted in the cycle report.`}
      footer={<><Button onClick={onClose}>Cancel</Button><Button variant="danger" disabled={!ok} onClick={() => {
        if (busy.current) return; busy.current = true;
        act.reject(a, reason === 'Other' ? `Other · ${note.trim()}` : reason, email); onDone();
      }}>Reject application</Button></>}>
      <div className="space-y-2">
        {REASONS.map((x) => <Radio key={x.r} checked={reason === x.r} onChange={() => setReason(x.r)} title={x.r} sub={x.sub} />)}
      </div>
      <label className="block mt-4">
        <span className="block text-sm font-medium mb-1.5">Note to {fn}</span>
        <Input value={note} onChange={(e) => setNote(e.target.value)} placeholder={reason === 'Other' ? 'Required for Other' : 'Optional'} />
      </label>
      <div className="flex items-center justify-between mt-4">
        <div><div className="text-sm">Email {fn}</div><div className="text-xs text-gray-500">Template: Rejected · {REASONS.find((x) => x.r === reason)?.tpl ?? 'pick a reason'}</div></div>
        <Switch checked={email} onChange={setEmail} label={`Email ${fn}`} />
      </div>
    </Modal>
  );
}

/** Auto-allocate…: places every unflagged application that has a free unit in one of its choices. */
export function AutoAllocateDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const d = useAlloc();
  const act = useAllocActions();
  const [days, setDays] = useState<(typeof DAYS)[number]>('5 days');
  const [email, setEmail] = useState(true);
  const busy = useRef(false);
  if (!open) return null;
  const queue = d.apps.filter((a) => a.status === 'review' && a.cycle === '2027/28'); // the dialog is for 2027/28 only
  const flagged = queue.filter((a) => a.tag || a.reqs.length);
  const free = queue.filter((a) => !a.tag && !a.reqs.length && a.prefs.some(([h, r]) => available(d, h, r) > 0));
  const none = queue.length - flagged.length - free.length;
  return (
    <Modal open onClose={onClose} tone="blue" icon={MagicWand} title="Auto-allocate 2027/28" width={520}
      sub="Offers each application its best free unit. Anything flagged waits for a person."
      footer={<><Button onClick={onClose}>Cancel</Button><Button variant="primary" icon={MagicWand} disabled={!free.length} onClick={() => {
        if (busy.current) return; busy.current = true;
        act.autoAllocate(+days[0], email); onClose(); busy.current = false;
      }}>Auto-allocate {free.length}</Button></>}>
      <div className="grid grid-cols-3 gap-2 mt-1">
        {[[free.length, 'can be allocated now', 'text-[#0B8A4C]'], [flagged.length, 'need a person', 'text-[#B45309]'], [none, 'have no free unit', 'text-gray-500']].map(([n, l, c]) => (
          <div key={l as string} className="rounded-xl border border-line p-3"><div className={cx('text-xl font-semibold', c as string)}>{n}</div><div className="text-xs text-gray-500 mt-0.5">{l}</div></div>
        ))}
      </div>
      <div className="flex items-center justify-between mt-4"><span className="text-sm">Offers expire in</span><Tabs value={days} onChange={setDays} tabs={DAYS.map((x) => ({ id: x, label: x }))} /></div>
      <div className="flex items-center justify-between mt-4">
        <div><div className="text-sm">Email the offers</div><div className="text-xs text-gray-500">Template: Offer · standard</div></div>
        <Switch checked={email} onChange={setEmail} label="Email the offers" />
      </div>
    </Modal>
  );
}
