import { useState } from 'react';
import { Route, Routes } from 'react-router-dom';
import { ClockCounterClockwise, type Icon } from '../components/icons';
import { useDb } from '../data/store';
import { Avatar, Empty, PageHeader, Pill, SearchInput, Table, Tabs, Toolbar } from '../components/ui';
import { TasksPage } from './home/Tasks';
import { HomeBand } from './home/parts';

export { Overview } from './home/Overview';

/** My tasks. Mounted at `/tasks/*`; `?open=<id>` opens a task, `?case=e1|e2|e3|caughtup` loads an edge-case board. */
export function Tasks() {
  return (
    <Routes>
      <Route path="*" element={<TasksPage />} />
    </Routes>
  );
}

/** "09:12" is today; "Today, 09:40" splits into day and time; "Yesterday" or "28 Aug 2025" is a day with no time. */
const dayOf = (w: string) => (/^\d{1,2}:\d{2}$/.test(w) ? 'Today' : w === 'Just now' ? 'Today' : w.split(',')[0]);
const timeOf = (w: string) => (/^\d{1,2}:\d{2}$/.test(w) ? w : w === 'Just now' ? w : w.split(', ')[1] ?? '');

export function ActivityFeed({ title = 'Activity', icon = ClockCounterClockwise }: { title?: string; icon?: Icon }) {
  /* Home's Activity tab carries the greeting band; the Organisation log doesn't. */
  const band = title === 'Activity';
  const activity = useDb((s) => s.activity);
  const [area, setArea] = useState('All');
  const [q, setQ] = useState('');
  const areas = ['All', ...new Set(activity.map((a) => a.area))];
  const query = q.trim().toLowerCase();
  const rows = activity.filter((a) => (area === 'All' || a.area === area) && (!query || `${a.who} ${a.what}`.toLowerCase().includes(query)));
  return (
    <>
      <PageHeader icon={icon} title={title} search={band} />
      {band && <HomeBand />}
      <Toolbar right={<SearchInput value={q} onChange={setQ} placeholder="Person or action" />}>
        <Tabs value={area} onChange={setArea} tabs={areas.map((x) => ({ id: x, label: x, count: x === 'All' ? activity.length : activity.filter((a) => a.area === x).length }))} />
      </Toolbar>
      <Table rows={rows} summary="Last 30 days" group={{ label: 'Date', get: (a) => dayOf(a.when) }}
        empty={activity.length ? <Empty icon={icon} title="No activity" sub="Nothing matches. Try another area or clear the search." /> : <Empty art="caughtUp" icon={icon} title="No activity yet" sub="What you and your team change shows here." />}
        cols={[
          { key: 'w', label: 'Activity', render: (a) => (
            <span className="flex items-center gap-2.5 min-w-0">
              <Avatar name={a.who === 'You' ? 'Priya Shah' : a.who} size={24} />
              <span className="truncate"><span className="font-medium">{a.who}</span> <span className="text-gray-600">{a.what}</span></span>
            </span>
          ) },
          { key: 'a', label: 'Area', className: 'w-[160px]', render: (a) => <Pill>{a.area}</Pill> },
          { key: 't', label: 'Time', className: 'w-[120px] text-right', render: (a) => <span className="text-gray-500 tabular-nums">{timeOf(a.when)}</span> },
        ]} />
    </>
  );
}
