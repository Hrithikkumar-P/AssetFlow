import { useEffect, useState, useCallback } from 'react';
import api from '../api/axios';
import { PageHeader, Spinner, EmptyState, Badge } from '../components/ui';

export default function Approvals() {
  const [data, setData] = useState({ types: [], fields: [], count: 0 });
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(null);

  const load = useCallback(() => {
    setLoading(true);
    api.get('/approvals/pending').then((r) => setData(r.data)).finally(() => setLoading(false));
  }, []);
  useEffect(() => { load(); }, [load]);

  const act = async (kind, id, action) => {
    setBusy(`${kind}-${id}-${action}`);
    try {
      await api.post(`/approvals/${kind}/${id}/${action}`);
      load();
    } finally { setBusy(null); }
  };

  return (
    <div>
      <PageHeader title="Approvals" icon="✅" subtitle="Review asset-type requests from IT Admins" />

      {loading ? <Spinner /> : data.count === 0 ? (
        <div className="glass-card">
          <EmptyState icon="✅" title="All caught up" message="There are no pending requests awaiting your approval." />
        </div>
      ) : (
        <div className="space-y-6">
          {data.types.length > 0 && (
            <section>
              <h3 className="font-display font-bold text-ink-900 mb-3">Pending Asset Types</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {data.types.map((t) => (
                  <div key={t.id} className="glass-card p-5 animate-slide-up">
                    <div className="flex items-start gap-3 mb-3">
                      <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-brand-100 to-brand-200 grid place-items-center text-xl">{t.icon || '🧩'}</div>
                      <div className="flex-1 min-w-0">
                        <p className="font-display font-bold text-ink-900">{t.name}</p>
                        <p className="text-xs text-ink-400">Requested by {t.created_by}</p>
                      </div>
                      <Badge status="pending">Pending</Badge>
                    </div>
                    {t.fields?.length > 0 && (
                      <div className="flex flex-wrap gap-1.5 mb-4">
                        {t.fields.map((fd) => (
                          <span key={fd.id} className="badge bg-white/70 text-ink-600 border border-white/70">{fd.field_label}</span>
                        ))}
                      </div>
                    )}
                    <div className="flex gap-2">
                      <button onClick={() => act('types', t.id, 'approve')} disabled={busy}
                        className="btn-primary flex-1 py-2">Approve</button>
                      <button onClick={() => act('types', t.id, 'reject')} disabled={busy}
                        className="btn-ghost flex-1 py-2 text-red-600">Reject</button>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}

          {data.fields.length > 0 && (
            <section>
              <h3 className="font-display font-bold text-ink-900 mb-3">Pending Fields</h3>
              <div className="glass-card divide-y divide-ink-900/5">
                {data.fields.map((fd) => (
                  <div key={fd.id} className="flex items-center gap-4 px-5 py-3.5">
                    <div className="flex-1">
                      <p className="font-semibold text-sm text-ink-900">{fd.field_label}
                        <span className="text-ink-400 font-normal"> · on {fd.asset_type_name}</span>
                      </p>
                      <p className="text-xs text-ink-400">{fd.data_type}</p>
                    </div>
                    <button onClick={() => act('fields', fd.id, 'approve')} disabled={busy} className="btn-primary py-1.5 px-4 text-xs">Approve</button>
                    <button onClick={() => act('fields', fd.id, 'reject')} disabled={busy} className="btn-ghost py-1.5 px-4 text-xs text-red-600">Reject</button>
                  </div>
                ))}
              </div>
            </section>
          )}
        </div>
      )}
    </div>
  );
}
