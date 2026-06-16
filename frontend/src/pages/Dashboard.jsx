import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../api/axios';
import { Spinner, PageHeader, formatMoney } from '../components/ui';

const ACTIVITY_ICON = {
  'Asset Created': '➕', 'Asset Modified': '✏️', 'Asset Assigned': '👤',
  'Asset Returned': '↩️', 'Asset Deleted': '🗑️', 'Price Added': '💰',
  'Price Updated': '💰', 'Repair Added': '🛠️', 'Repair Updated': '🛠️',
  'Asset Type Created': '🧩', 'Asset Type Requested': '🧩', 'Field Added to Type': '➕',
};

function StatCard({ label, value, icon, accent = false, sub }) {
  return (
    <div className={`glass-card p-5 hover:-translate-y-1 transition-transform duration-300 ${accent ? 'bg-gradient-to-br from-brand-500 to-brand-600 text-white border-0 shadow-glow' : ''}`}>
      <div className="flex items-start justify-between">
        <p className={`text-xs font-semibold uppercase tracking-wide ${accent ? 'text-white/80' : 'text-ink-500'}`}>{label}</p>
        <span className="text-lg opacity-90">{icon}</span>
      </div>
      <p className={`font-display text-3xl font-extrabold mt-3 ${accent ? 'text-white' : 'text-ink-900'}`}>{value ?? 0}</p>
      {sub && <p className={`text-xs mt-1 ${accent ? 'text-white/70' : 'text-ink-400'}`}>{sub}</p>}
    </div>
  );
}

export default function Dashboard() {
  const [stats, setStats] = useState(null);
  const [activity, setActivity] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    Promise.all([api.get('/dashboard/stats'), api.get('/dashboard/recent-activity')])
      .then(([s, a]) => { setStats(s.data); setActivity(a.data); })
      .catch(() => setError('Failed to load dashboard data.'))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <Spinner label="Loading dashboard…" />;
  if (error) return <div className="glass-card p-6 text-red-600 text-sm">{error}</div>;

  const byType = stats?.assets_by_type || {};
  const maxType = Math.max(...Object.values(byType), 1);
  const purchase = stats?.purchase_by_currency || [];
  const repair = stats?.repair_by_currency || [];

  return (
    <div>
      <PageHeader title="Dashboard" subtitle="Overview of your IT asset inventory" icon="◈" />

      {/* KPI grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-5 animate-slide-up">
        <StatCard label="Total Assets"   value={stats?.total_assets}      icon="📦" accent />
        <StatCard label="Assigned"       value={stats?.assigned_assets}   icon="👤" />
        <StatCard label="Available"      value={stats?.available_assets}  icon="✅" />
        <StatCard label="In Repair"      value={stats?.in_repair_assets}  icon="🛠️" />
        <StatCard label="Asset Types"    value={stats?.total_asset_types} icon="🧩" />
        <StatCard label="Open Repairs"   value={stats?.open_repairs}      icon="⚠️" />
        <StatCard label="Employees"      value={stats?.total_employees}   icon="👥" />
        <StatCard label="Retired"        value={stats?.retired_assets}    icon="📤" />
      </div>

      {/* Spend cards */}
      {(purchase.length > 0 || repair.length > 0) && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-5">
          <div className="glass-card p-5 animate-slide-up">
            <p className="text-xs font-semibold uppercase tracking-wide text-ink-500 mb-3">Total Purchase Value</p>
            {purchase.length ? (
              <div className="flex flex-wrap gap-x-6 gap-y-2">
                {purchase.map((p) => (
                  <div key={p.currency}>
                    <p className="font-display text-2xl font-extrabold text-gradient">{formatMoney(p.total, p.currency)}</p>
                    <p className="text-xs text-ink-400">{p.currency}</p>
                  </div>
                ))}
              </div>
            ) : <p className="text-sm text-ink-400">No price records yet.</p>}
          </div>
          <div className="glass-card p-5 animate-slide-up">
            <p className="text-xs font-semibold uppercase tracking-wide text-ink-500 mb-3">Total Repair Spend</p>
            {repair.length && repair.some((r) => r.total > 0) ? (
              <div className="flex flex-wrap gap-x-6 gap-y-2">
                {repair.filter((r) => r.total > 0).map((r) => (
                  <div key={r.currency}>
                    <p className="font-display text-2xl font-extrabold text-ink-900">{formatMoney(r.total, r.currency)}</p>
                    <p className="text-xs text-ink-400">{r.currency}</p>
                  </div>
                ))}
              </div>
            ) : <p className="text-sm text-ink-400">No repair costs recorded yet.</p>}
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Assets by type */}
        <div className="glass-card p-6 animate-slide-up">
          <h3 className="font-display font-bold text-ink-900 mb-5">Assets by Type</h3>
          {Object.keys(byType).length ? (
            <div className="space-y-3.5">
              {Object.entries(byType).sort((a, b) => b[1] - a[1]).map(([type, count]) => (
                <div key={type} className="flex items-center gap-3">
                  <span className="text-sm text-ink-600 w-28 truncate">{type}</span>
                  <div className="flex-1 bg-ink-900/5 rounded-full h-2.5 overflow-hidden">
                    <div
                      className="bg-gradient-to-r from-brand-400 to-brand-600 h-full rounded-full transition-all duration-700"
                      style={{ width: `${(count / maxType) * 100}%` }}
                    />
                  </div>
                  <span className="text-sm font-bold text-ink-800 w-6 text-right">{count}</span>
                </div>
              ))}
            </div>
          ) : <p className="text-sm text-ink-400">No assets yet.</p>}
        </div>

        {/* Recent activity */}
        <div className="glass-card p-6 animate-slide-up">
          <div className="flex items-center justify-between mb-5">
            <h3 className="font-display font-bold text-ink-900">Recent Activity</h3>
            <Link to="/history" className="text-xs font-semibold text-brand-600 hover:text-brand-700">View all →</Link>
          </div>
          {activity.length ? (
            <div className="space-y-1">
              {activity.map((a) => (
                <div key={a.id} className="flex items-center gap-3 py-2">
                  <span className="w-8 h-8 rounded-xl bg-white/60 border border-white/70 grid place-items-center text-sm flex-shrink-0">
                    {ACTIVITY_ICON[a.activity_type] || '•'}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm text-ink-800 truncate">
                      <span className="font-semibold">{a.activity_type}</span>
                      {a.asset_code && <span className="text-ink-400"> · {a.asset_code}</span>}
                    </p>
                    <p className="text-xs text-ink-400 truncate">
                      {a.field_changed ? `${a.field_changed}: ${a.new_value ?? '—'}` : (a.notes || a.performed_by)}
                    </p>
                  </div>
                  <span className="text-[11px] text-ink-400 whitespace-nowrap">
                    {a.timestamp ? new Date(a.timestamp).toLocaleDateString() : ''}
                  </span>
                </div>
              ))}
            </div>
          ) : <p className="text-sm text-ink-400">No activity yet.</p>}
        </div>
      </div>
    </div>
  );
}
