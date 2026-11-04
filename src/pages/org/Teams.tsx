// Organisation › Teams. No Figma frame; styled like Roles and access (header, toolbar, full-bleed table, sheet).
import { useRef, useState } from 'react';
import { Buildings, Plus, UsersThree } from '../../components/icons';
import { toast } from 'sonner';
import { Avatar, Button, Field, Input, SearchInput, Sheet, Table, Toolbar, cx } from '../../components/ui';
import { Checkbox } from '../../components/shadcn/checkbox';
import { HALLS, hallsLabel, oid, useOrg, type Team } from '../../data/org';
import { Header, IconSelect, RowMenu } from './parts';

export function TeamsPage() {
  const { teams, members, set, audit_ } = useOrg();
  const [q, setQ] = useState('');
  const [edit, setEdit] = useState<Team | 'new' | null>(null);
  const name = (id: string) => members.find((m) => m.id === id)?.name ?? 'Former member';
  const rows = teams.filter((t) => `${t.name} ${t.purpose}`.toLowerCase().includes(q.trim().toLowerCase()));
  return (
    <>
      <Header icon={UsersThree} crumbs={[{ label: 'Organisation' }]} title="Teams">
        <Button variant="primary" icon={Plus} onClick={() => setEdit('new')}>New team</Button>
      </Header>
      <Toolbar right={<SearchInput value={q} onChange={setQ} placeholder="Search teams" />}>
        <span className="text-sm text-[#646A78]">Group people to assign work and send notices to a whole team. Access still comes from each member’s role.</span>
      </Toolbar>
      <Table rows={rows} onRow={(t) => setEdit(t)} summary={`${rows.length} teams · ${new Set(rows.flatMap((t) => t.memberIds)).size} people`} cols={[
        { key: 'n', label: 'Team', className: 'w-[30%]', render: (t) => <div className="leading-tight"><div className="text-sm font-medium">{t.name}</div><div className="text-xs text-[#646A78]">{t.purpose}</div></div> },
        { key: 'l', label: 'Lead', render: (t) => <span className="flex items-center gap-2 text-sm"><Avatar name={name(t.leadId)} size={20} />{name(t.leadId)}</span> },
        { key: 'm', label: 'Members', render: (t) => (
          <span className="flex items-center gap-2"><span className="flex -space-x-1.5">{t.memberIds.slice(0, 5).map((id) => <span key={id} className="ring-2 ring-white rounded-full"><Avatar name={name(id)} size={24} /></span>)}</span><span className="text-sm text-[#646A78]">{t.memberIds.length}</span></span>
        ) },
        { key: 'h', label: 'Halls', render: (t) => <span className="text-sm text-gray-700">{hallsLabel(t.halls)}</span> },
        { key: 'x', label: '', className: 'w-12 text-right', render: (t) => <RowMenu items={[
          { label: 'Edit team', onClick: () => setEdit(t) },
          { label: 'Delete team', danger: true, onClick: () => {
            const before = useOrg.getState().teams;
            set('teams', (ts) => ts.filter((x) => x.id !== t.id)); audit_(`deleted the team ${t.name}`, 'Teams');
            toast.success(`${t.name} deleted`, { action: { label: 'Undo', onClick: () => useOrg.getState().restore({ teams: before }) } });
          } },
        ]} /> },
      ]} />
      {edit && <TeamSheet key={edit === 'new' ? 'new' : edit.id} team={edit === 'new' ? undefined : edit} onClose={() => setEdit(null)} />}
    </>
  );
}

function TeamSheet({ team, onClose }: { team?: Team; onClose: () => void }) {
  const { members, set, audit_ } = useOrg();
  const [n, setN] = useState(team?.name ?? '');
  const [purpose, setPurpose] = useState(team?.purpose ?? '');
  const [ids, setIds] = useState<string[]>(team?.memberIds ?? []);
  const [lead, setLead] = useState(team?.leadId ?? members[0]?.id ?? '');
  const [hall, setHall] = useState(team ? (team.halls === 'all' ? 'all' : team.halls[0]) : 'all');
  const busy = useRef(false);
  const save = () => {
    if (busy.current) return;
    if (!n.trim()) { toast.error('Name the team'); return; }
    if (!ids.length) { toast.error('Add at least one member'); return; }
    busy.current = true;
    const rec: Team = { id: team?.id ?? oid('t'), name: n.trim(), purpose: purpose.trim(), leadId: ids.includes(lead) ? lead : ids[0], memberIds: ids, halls: hall === 'all' ? 'all' : [hall] };
    set('teams', (ts) => (team ? ts.map((t) => (t.id === team.id ? rec : t)) : [...ts, rec]));
    audit_(team ? `edited the team ${rec.name}` : `created the team ${rec.name}`, 'Teams');
    toast.success(team ? `${rec.name} saved` : `${rec.name} created`);
    onClose();
  };
  return (
    <Sheet open onClose={onClose} title={team ? team.name : 'New team'} sub={team ? `${team.memberIds.length} members` : 'Group people who work together'}
      footer={<><Button onClick={onClose}>Cancel</Button><Button variant="primary" onClick={save}>{team ? 'Save' : 'Create team'}</Button></>}>
      <div className="space-y-4">
        <Field label="Name"><Input value={n} onChange={(e) => setN(e.target.value)} placeholder="e.g. Van Mildert" /></Field>
        <Field label="What it’s for"><Input value={purpose} onChange={(e) => setPurpose(e.target.value)} placeholder="One line" /></Field>
        <div><div className="text-sm font-medium text-gray-700 mb-1.5">Halls</div>
          <IconSelect ariaLabel="Halls" icon={Buildings} value={hall} onChange={setHall} options={[{ value: 'all', label: 'All halls' }, ...HALLS.map((h) => ({ value: h.id, label: h.name }))]} /></div>
        <div><div className="text-sm font-medium text-gray-700 mb-1.5">Members · {ids.length}</div>
          <div className="rounded-lg border border-line divide-y divide-line">
            {members.map((m) => { const on = ids.includes(m.id); return (
              <label key={m.id} className={cx('flex items-center gap-3 px-3 h-11 cursor-pointer', on && 'bg-[#F5F8FF]')}>
                <Checkbox checked={on} onCheckedChange={(v) => setIds((v === true) ? [...ids, m.id] : ids.filter((x) => x !== m.id))} />
                <Avatar name={m.name} size={24} /><span className="flex-1 text-sm">{m.name}</span>
                {on && <button type="button" onClick={(e) => { e.preventDefault(); setLead(m.id); }} className={cx('text-xs', lead === m.id ? 'text-[#0B8A4C] font-medium' : 'text-gray-400 hover:text-primary')}>{lead === m.id ? 'Lead' : 'Make lead'}</button>}
              </label>
            ); })}
          </div></div>
      </div>
    </Sheet>
  );
}
