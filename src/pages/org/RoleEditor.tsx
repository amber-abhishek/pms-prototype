// Organisation › Roles and access › New role / edit role. Figma F1 · 02 (3031:2).
import { useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Check as CheckIcon, Copy, ShieldCheck, Warning } from '../../components/icons';
import { toast } from 'sonner';
import { Button, Input, Switch, cx } from '../../components/ui';
import { Checkbox } from '../../components/shadcn/checkbox';
import { ALL_PERMS, PERMS, oid, useOrg, type Role } from '../../data/org';
import { Alert, Header, IconSelect } from './parts';

export function RoleEditor() {
  const { id } = useParams();
  const nav = useNavigate();
  const { roles, set, audit_ } = useOrg();
  const existing = id ? roles.find((r) => r.id === id) : undefined;
  const isNew = !id;
  const locked = existing?.id === 'admin';
  const base = existing ?? roles.find((r) => r.id === 'frontdesk') ?? roles[0];
  const [name, setName] = useState(existing?.name ?? '');
  const [from, setFrom] = useState(base.id);
  const [desc, setDesc] = useState(existing?.description ?? '');
  const [perms, setPerms] = useState<string[]>(base.perms);
  const [scope, setScope] = useState<Role['scope']>(isNew ? 'given' : base.scope);
  const [pd, setPd] = useState(base.personalData);
  const busy = useRef(false);

  if (id && !existing) return <><Header icon={ShieldCheck} crumbs={[{ label: 'Organisation' }, { label: 'Roles and access', to: '/org/people?tab=roles' }]} title="Role not found" /><div className="p-6 text-sm text-[#737373]">This role was deleted.</div></>;

  const startFrom = (rid: string) => {
    setFrom(rid);
    const r = roles.find((x) => x.id === rid);
    if (r) { setPerms(r.perms); setPd(r.personalData); }
  };
  const toggle = (p: string) => !locked && setPerms((ps) => (ps.includes(p) ? ps.filter((x) => x !== p) : [...ps, p]));
  const noFinance = !perms.some((p) => p.startsWith('fin.'));
  const label = name.trim() || 'This role';

  const save = () => {
    if (busy.current || locked) return;
    const n = name.trim();
    if (!n) { toast.error('Give the role a name'); return; }
    if (roles.some((r) => r.name.toLowerCase() === n.toLowerCase() && r.id !== existing?.id)) { toast.error(`There’s already a role called ${n}`); return; }
    if (!perms.length) { toast.error('Tick at least one permission'); return; }
    busy.current = true;
    const ordered = ALL_PERMS.filter((p) => perms.includes(p));
    if (existing) {
      set('roles', (rs) => rs.map((r) => (r.id === existing.id ? { ...r, name: n, description: desc, perms: ordered, scope, personalData: pd } : r)));
      audit_(`changed what ${n} can do`, 'Roles');
      toast.success(`${n} saved`, { description: 'Everyone with this role gets the change at once.' });
      nav('/org/people?tab=roles');
    } else {
      const rid = oid('r');
      set('roles', (rs) => [...rs, { id: rid, name: n, description: desc, perms: ordered, scope, personalData: pd, createdByYou: true }]);
      audit_(`created the role ${n}`, 'Roles');
      toast.success(`${n} saved`, { description: 'Invite someone with it now.' });
      nav('/org/people', { state: { invite: rid } });
    }
  };

  return (
    <>
      <Header icon={ShieldCheck} crumbs={[{ label: 'Organisation' }, { label: 'Roles and access', to: '/org/people?tab=roles' }]} title={isNew ? 'New role' : existing!.name}>
        <Button onClick={() => nav(-1)}>Cancel</Button>
        {!locked && <Button variant="primary" icon={CheckIcon} onClick={save}>Save role</Button>}
      </Header>
      <div className="flex-1 min-h-0 flex">
        <div className="flex-1 overflow-auto px-6 py-6">
          <div className="max-w-[742px] space-y-5">
            <div className="grid grid-cols-2 gap-3">
              <label className="block"><span className="block text-sm font-medium text-gray-700 mb-1.5">Role name</span>
                <Input value={name} disabled={locked} onChange={(e) => setName(e.target.value)} placeholder="e.g. Hall warden" /></label>
              <div><span className="block text-sm font-medium text-gray-700 mb-1.5">Start from</span>
                <IconSelect ariaLabel="Start from" icon={Copy} value={from} onChange={startFrom} options={roles.filter((r) => r.id !== existing?.id).map((r) => ({ value: r.id, label: r.name }))} className={locked ? 'opacity-50 pointer-events-none' : ''} /></div>
            </div>
            <label className="block"><span className="block text-sm font-medium text-gray-700 mb-1.5">Description</span>
              <Input value={desc} disabled={locked} onChange={(e) => setDesc(e.target.value)} placeholder="Who has this role and what they do" /></label>

            <div className="rounded-xl border border-line overflow-hidden">
              <div className="h-10 px-4 flex items-center justify-between bg-[#FAFAFA] border-b border-line text-sm text-[#737373]">
                <span>What they can do</span><span>{perms.length} of {ALL_PERMS.length} permissions</span>
              </div>
              {PERMS.map((a) => (
                <div key={a.area} className="flex items-center gap-4 px-4 min-h-[52px] py-2 border-b border-[#F5F5F5] last:border-0">
                  <span className="w-[120px] shrink-0 text-sm font-medium">{a.area}</span>
                  <div className="flex flex-wrap gap-2">
                    {a.perms.map((p) => { const on = perms.includes(p.id); return (
                      <label key={p.id} className={cx('h-8 px-2.5 rounded-lg border flex items-center gap-2 text-sm select-none', locked ? 'cursor-default' : 'cursor-pointer', on ? 'bg-[#EFF6FF] border-[#BFDBFE] text-ink' : 'bg-white border-line text-[#737373] hover:border-gray-300')}>
                        <Checkbox checked={on} disabled={locked} onCheckedChange={() => toggle(p.id)} />{p.label}
                      </label>
                    ); })}
                  </div>
                </div>
              ))}
            </div>
            {locked && <p className="text-sm text-[#737373]">Admin can do everything, everywhere. It can’t be changed.</p>}
          </div>
        </div>

        <aside className="w-[400px] shrink-0 border-l border-line overflow-auto px-5 py-6 space-y-5">
          <div>
            <div className="text-sm font-medium mb-2">Where</div>
            <div className="space-y-2">
              {([['given', 'Only the halls they are given', 'Pick halls when you invite someone'], ['all', 'All halls', 'Every hall in the workspace']] as const).map(([v, t, s]) => (
                <label key={v} className={cx('flex gap-3 rounded-xl border p-3.5 cursor-pointer', scope === v ? 'border-primary ring-1 ring-primary/30' : 'border-line hover:border-gray-300')}>
                  <input type="radio" name="scope" checked={scope === v} disabled={locked} onChange={() => setScope(v)} className="size-4 mt-0.5 accent-[#2563EB]" />
                  <span><span className="block text-sm font-medium">{t}</span><span className="block text-xs text-[#737373] mt-0.5">{s}</span></span>
                </label>
              ))}
            </div>
          </div>
          <div>
            <div className="text-sm font-medium mb-2">Personal data</div>
            <div className="rounded-xl border border-line p-3.5 flex items-center gap-3">
              <span className="flex-1"><span className="block text-sm font-medium">See student IDs and contacts</span><span className="block text-xs text-[#737373] mt-0.5">Needed for check-in</span></span>
              <Switch checked={pd} onChange={(v) => !locked && setPd(v)} label="See student IDs and contacts" />
            </div>
          </div>
          {noFinance && <Alert tone="amber" icon={Warning} title="No finance access">{label === 'This role' ? 'People with this role' : `${label}s`} can see if a resident is in arrears, not the amounts.</Alert>}
        </aside>
      </div>
    </>
  );
}
