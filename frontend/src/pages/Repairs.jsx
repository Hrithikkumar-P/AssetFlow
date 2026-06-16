import { useEffect, useState, useCallback } from 'react';
import api from '../api/axios';
import {
  PageHeader, Modal, Field, Spinner, EmptyState, ErrorBanner, Badge, ConfirmDialog,
  formatMoney, CURRENCIES,
} from '../components/ui';

const STATUSES = ['Open', 'In Progress', 'Completed', 'Cancelled'];
const blank = {
  asset_id: '', asset_owner_id: '', issue_description: '', reported_date: '',
  sent_date: '', returned_date: '', repair_vendor: '', repair_cost: '',
  repair_currency: 'INR', under_warranty: false, status: 'Open', resolution_notes: '',
};

export default function Repairs() {
  const [repairs, setRepairs] = useState([]);
  const [assets, setAssets] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(blank);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [deleteTarget, setDeleteTarget] = useState(null);

  const load = useCallback(() => {
    setLoading(true);
    const params = {};
    if (search) params.search = search;
    if (statusFilter) params.status = statusFilter;
    Promise.all([
      api.get('/repairs/', { params }),
      api.get('/assets/'),
      api.get('/employees/'),
    ]).then(([r, a, e]) => { setRepairs(r.data); setAssets(a.data); setEmployees(e.data); })
      .finally(() => setLoading(false));
  }, [search, statusFilter]);
  useEffect(() => { load(); }, [load]);

  const openAdd = () => { setEditing(null); setForm(blank); setError(''); setShowForm(true); };
  const openEdit = (r) => {
    setEditing(r);
    setForm({
      asset_id: r.asset_id, asset_owner_id: r.asset_owner_id ?? '', issue_description: r.issue_description || '',
      reported_date: r.reported_date || '', sent_date: r.sent_date || '', returned_date: r.returned_date || '',
      repair_vendor: r.repair_vendor || '', repair_cost: r.repair_cost ?? '', repair_currency: r.repair_currency || 'INR',
      under_warranty: r.under_warranty || false, status: r.status || 'Open', resolution_notes: r.resolution_notes || '',
    });
    setError(''); setShowForm(true);
  };

  const save = async (e) => {
    e.preventDefault();
    setSaving(true); setError('');
    try {
      const payload = {
        asset_owner_id: form.asset_owner_id === '' ? null : Number(form.asset_owner_id),
        issue_description: form.issue_description,
        reported_date: form.reported_date || null,
        sent_date: form.sent_date || null,
        returned_date: form.returned_date || null,
        repair_vendor: form.repair_vendor,
        repair_cost: form.repair_cost === '' ? null : Number(form.repair_cost),
        repair_currency: form.repair_currency,
        under_warranty: form.under_warranty,
        status: form.status,
        resolution_notes: form.resolution_notes,
      };
      if (editing) {
        await api.put(`/repairs/${editing.id}`, payload);
      } else {
        await api.post('/repairs/', { ...payload, asset_id: Number(form.asset_id) });
      }
      setShowForm(false); load();
    } catch (err) {
      setError(err.response?.data?.detail || 'Save failed.');
    } finally { setSaving(false); }
  };

  const handleDelete = async () => { await api.delete(`/repairs/${deleteTarget.id}`); setDeleteTarget(null); load(); };
  const f = (k) => (e) => setForm((p) => ({ ...p, [k]: e.target.value }));

  // when picking an asset on a new repair, default the owner to the asset's current holder
  const onPickAsset = (e) => {
    const id = e.target.value;
    const asset = assets.find((a) => String(a.id) === id);
    setForm((p) => ({ ...p, asset_id: id, asset_owner_id: asset?.employee_id ?? '' }));
  };

  return (
    <div>
      <PageHeader
        title="Repairs" icon="🛠️"
        subtitle={`${repairs.length} repair record${repairs.length !== 1 ? 's' : ''}`}
        actions={<button onClick={openAdd} disabled={assets.length === 0} className="btn-primary">+ New Repair</button>}
      />

      <div className="flex flex-wrap gap-3 mb-5">
        <input value={search} onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by repair ID, asset, vendor…" className="input w-72" />
        <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="input w-44">
          <option value="">All Statuses</option>
          {STATUSES.map((s) => <option key={s}>{s}</option>)}
        </select>
      </div>

      <div className="glass-card overflow-hidden">
        {loading ? <Spinner /> : repairs.length === 0 ? (
          <EmptyState icon="🛠️" title="No repairs logged"
            message="Track every repair here — issue, vendor, cost, owner and turnaround time."
            action={assets.length > 0 && <button onClick={openAdd} className="btn-primary">+ New Repair</button>} />
        ) : (
          <div className="overflow-x-auto scroll-thin">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-ink-900/5 text-left">
                  {['Repair ID', 'Asset', 'Owner', 'Issue', 'Cost', 'Days', 'Status', 'Actions'].map((h) => (
                    <th key={h} className="px-5 py-3.5 text-xs font-bold text-ink-500 uppercase tracking-wide whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {repairs.map((r) => (
                  <tr key={r.id} className="border-b border-ink-900/5 last:border-0 hover:bg-white/40 transition-colors">
                    <td className="px-5 py-3.5 font-mono text-xs font-semibold text-brand-700 whitespace-nowrap">{r.repair_id}</td>
                    <td className="px-5 py-3.5 whitespace-nowrap">
                      <p className="font-mono text-xs font-semibold text-ink-700">{r.asset_code}</p>
                      <p className="text-xs text-ink-400">{r.asset_type_name}</p>
                    </td>
                    <td className="px-5 py-3.5 text-ink-700 whitespace-nowrap">{r.asset_owner_name || '—'}</td>
                    <td className="px-5 py-3.5 text-ink-700 max-w-[14rem] truncate">{r.issue_description || '—'}</td>
                    <td className="px-5 py-3.5 whitespace-nowrap font-semibold text-ink-900">
                      {r.under_warranty ? <span className="text-emerald-600 font-medium">Warranty</span> : formatMoney(r.repair_cost, r.repair_currency)}
                    </td>
                    <td className="px-5 py-3.5 text-ink-700 whitespace-nowrap">{r.time_taken_days != null ? `${r.time_taken_days}d` : '—'}</td>
                    <td className="px-5 py-3.5"><Badge status={r.status} /></td>
                    <td className="px-5 py-3.5 whitespace-nowrap">
                      <button onClick={() => openEdit(r)} className="text-ink-500 hover:text-brand-600 font-semibold text-xs mr-3">Edit</button>
                      <button onClick={() => setDeleteTarget(r)} className="text-ink-500 hover:text-red-600 font-semibold text-xs">Delete</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {showForm && (
        <Modal title={editing ? `Edit Repair — ${editing.repair_id}` : 'New Repair'}
          subtitle="Asset · owner · cost · turnaround" onClose={() => setShowForm(false)}>
          <form onSubmit={save}>
            <ErrorBanner>{error}</ErrorBanner>
            <div className="grid grid-cols-2 gap-4">
              <Field label="Asset" required>
                {editing ? (
                  <div className="input bg-ink-900/5">{editing.asset_code} · {editing.asset_type_name}</div>
                ) : (
                  <select className="input" value={form.asset_id} onChange={onPickAsset} required>
                    <option value="">Select asset…</option>
                    {assets.map((a) => <option key={a.id} value={a.id}>{a.asset_id} — {a.description || a.asset_type_name}</option>)}
                  </select>
                )}
              </Field>
              <Field label="Owner (User)">
                <select className="input" value={form.asset_owner_id} onChange={f('asset_owner_id')}>
                  <option value="">—</option>
                  {employees.map((e) => <option key={e.id} value={e.id}>{e.full_name}</option>)}
                </select>
              </Field>
              <Field label="Issue Description" className="col-span-2">
                <input className="input" value={form.issue_description} onChange={f('issue_description')} placeholder="What went wrong?" />
              </Field>
              <Field label="Reported Date">
                <input className="input" type="date" value={form.reported_date} onChange={f('reported_date')} />
              </Field>
              <Field label="Repair Vendor">
                <input className="input" value={form.repair_vendor} onChange={f('repair_vendor')} placeholder="Service center" />
              </Field>
              <Field label="Sent to Repair">
                <input className="input" type="date" value={form.sent_date} onChange={f('sent_date')} />
              </Field>
              <Field label="Returned">
                <input className="input" type="date" value={form.returned_date} onChange={f('returned_date')} />
              </Field>
              <Field label="Repair Cost">
                <input className="input" type="number" min="0" step="0.01" value={form.repair_cost}
                  onChange={f('repair_cost')} disabled={form.under_warranty} placeholder={form.under_warranty ? 'Covered by warranty' : '0'} />
              </Field>
              <Field label="Currency">
                <select className="input" value={form.repair_currency} onChange={f('repair_currency')} disabled={form.under_warranty}>
                  {CURRENCIES.map((c) => <option key={c}>{c}</option>)}
                </select>
              </Field>
              <Field label="Status">
                <select className="input" value={form.status} onChange={f('status')}>
                  {STATUSES.map((s) => <option key={s}>{s}</option>)}
                </select>
              </Field>
              <div className="flex items-end pb-2.5">
                <label className="flex items-center gap-2 text-sm text-ink-700 cursor-pointer select-none">
                  <input type="checkbox" className="accent-brand-500 w-4 h-4"
                    checked={form.under_warranty}
                    onChange={(e) => setForm((p) => ({ ...p, under_warranty: e.target.checked, repair_cost: e.target.checked ? '' : p.repair_cost }))} />
                  Under warranty (no cost)
                </label>
              </div>
              <Field label="Resolution Notes" className="col-span-2">
                <textarea className="input resize-none" rows={2} value={form.resolution_notes} onChange={f('resolution_notes')} placeholder="What was done…" />
              </Field>
            </div>
            <p className="text-xs text-ink-400 mt-3">
              Turnaround days are calculated automatically from Sent → Returned. Setting status to Completed returns the asset to service.
            </p>
            <div className="flex justify-end gap-3 mt-6 pt-5 border-t border-ink-900/5">
              <button type="button" onClick={() => setShowForm(false)} className="btn-ghost">Cancel</button>
              <button type="submit" disabled={saving} className="btn-primary">{saving ? 'Saving…' : editing ? 'Save Changes' : 'Log Repair'}</button>
            </div>
          </form>
        </Modal>
      )}

      {deleteTarget && (
        <ConfirmDialog title="Delete Repair?"
          message={<>Repair <span className="font-semibold">{deleteTarget.repair_id}</span> will be removed.</>}
          onConfirm={handleDelete} onCancel={() => setDeleteTarget(null)} />
      )}
    </div>
  );
}
