import { Route, Routes } from 'react-router-dom';
import { ClockCounterClockwise, type Icon } from '../components/icons';
import { useDb } from '../data/store';
import { Avatar, Card, Page, PageHeader, Pill } from '../components/ui';
import { TasksPage } from './home/Tasks';

export { Overview } from './home/Overview';

/** My tasks. Mounted at `/tasks/*`; `?open=<id>` opens a task, `?case=e1|e2|e3|caughtup` loads an edge-case board. */
export function Tasks() {
  return (
    <Routes>
      <Route path="*" element={<TasksPage />} />
    </Routes>
  );
}

export function ActivityFeed({ title = 'Activity', icon = ClockCounterClockwise }: { title?: string; icon?: Icon }) {
  const activity = useDb((s) => s.activity);
  return (
    <>
      <PageHeader icon={icon} title={title} />
      <Page>
        <Card>
          {activity.map((a) => (
            <div key={a.id} className="flex items-center gap-3 px-4 h-14 border-b border-line last:border-0">
              <Avatar name={a.who === 'You' ? 'Priya Shah' : a.who} size={28} />
              <div className="flex-1 text-sm"><span className="font-medium">{a.who}</span> {a.what}</div>
              <Pill>{a.area}</Pill><span className="w-20 text-right text-xs text-gray-500">{a.when}</span>
            </div>
          ))}
        </Card>
      </Page>
    </>
  );
}
