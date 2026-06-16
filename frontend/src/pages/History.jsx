import { useEffect, useState, useCallback } from 'react';
import api from '../api/axios';
import { PageHeader, Spinner, EmptyState, Badge } from '../components/ui';

const ACTIVITY_ICON = {
  'Asset Created': '➕', 'Asset Modified': '✏️', 'Asset Assigned': '👤',
  'Asset Returned': '↩️', 'Asset Deleted': '🗑️', 'Price Added': '💰',
  'Price Updated': '💰', 'Repair Added': '🛠️', 'Repair Updated': '🛠️',
  'Asset Type Created': '🧩', 'Asset Type Requested': '🧩', 'Asset Type Approved': '✅',
  'Asset Type Rejected': '🚫', 'Field Added to Type': '➕', 'Field Hidden': '🙈',
  'Field Shown': '👁', 'Field Approved': '✅',
};

export default function History() {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  const load = useCallback(() => {
    setLoading(true);
    api.get('/history/', { params: search ? { search } : {} })
      .then((r) => setRows(r.data)).finally(() => setLoading(false));
  }, [search]);
  useEffect(() => { load(); }, [load]);

  return (
    <div>
      <PageHeader title="Activity History" icon="🕘" subtitle="Every change, tracked and timestamped" />

      <div className="mb-5">
        <input value={search} onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by asset, user, activity…" className="input w-80" />
      </div>

      <div className="glass-card overflow-hidden">
        {loading ? <Spinner /> : rows.length === 0 ? (
          <EmptyState icon="🕘" title="No activity yet" message="Actions across the system will appear here as they happen." />
        ) : (
          <div className="divide-y divide-ink-900/5">
            {rows.map((h) => (
              <div key={h.id} className="flex items-center gap-4 px-5 py-3.5 hover:bg-white/40 transition-colors">
                <span className="w-9 h-9 rounded-xl bg-white/70 border border-white/70 grid place-items-center text-sm flex-shrink-0">
                  {ACTIVITY_ICON[h.activity_type] || '•'}
                </span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-ink-900">
                    <span className="font-semibold">{h.activity_type}</span>
                    {h.asset_code && <span className="font-mono text-xs text-brand-700 ml-2">{h.asset_code}</span>}
                  </p>
                  <p className="text-xs text-ink-500 truncate">
                    {h.field_changed && <span className="font-medium text-ink-600">{h.field_changed}: </span>}
                    {h.old_value != null && <span className="line-through text-ink-400">{h.old_value}</span>}
                    {h.old_value != null && h.new_value != null && ' → '}
                    {h.new_value != null && <span className="text-brand-700">{h.new_value}</span>}
                    {!h.field_changed && (h.notes || '')}
                  </p>
                </div>
                <div className="text-right flex-shrink-0">
                  <p className="text-xs text-ink-600">{h.performed_by}</p>
                  <p className="text-[11px] text-ink-400">{h.timestamp ? new Date(h.timestamp).toLocaleString() : ''}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
