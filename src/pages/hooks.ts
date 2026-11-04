import { useCallback, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';

/** `?open=<id>` drives the detail sheet, so deep links and ⌘K results open a record. */
export function useOpen(): [string | null, (id: string | null) => void] {
  const [sp, setSp] = useSearchParams();
  const id = sp.get('open');
  const set = useCallback((v: string | null) => {
    setSp((p) => { const n = new URLSearchParams(p); if (v) n.set('open', v); else n.delete('open'); return n; }, { replace: !v });
  }, [setSp]);
  return [id, set];
}

/** `?tab=` so a task on Home can land on the right filter tab. */
export function useTab<T extends string>(def: T): [T, (t: T) => void] {
  const [sp, setSp] = useSearchParams();
  const tab = (sp.get('tab') as T) ?? def;
  return [tab, (t: T) => setSp((p) => { const n = new URLSearchParams(p); n.set('tab', t); n.delete('open'); return n; }, { replace: true })];
}

/** Text search + filter values over a list. */
export function useFilter<T>(rows: T[], text: (r: T) => string, fields: Record<string, (r: T) => string> = {}) {
  const [q, setQ] = useState('');
  const [f, setF] = useState<Record<string, string>>({});
  const out = useMemo(() => {
    const t = q.trim().toLowerCase();
    return rows.filter((r) => (!t || text(r).toLowerCase().includes(t)) && Object.entries(f).every(([k, v]) => !v || fields[k]?.(r) === v));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rows, q, f]);
  return { q, setQ, f, setF, rows: out };
}
