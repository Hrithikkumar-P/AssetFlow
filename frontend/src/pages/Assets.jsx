import { useEffect, useState, useCallback } from 'react';
import api from '../api/axios';
import {
  PageHeader, Modal, Field, Spinner, EmptyState, ErrorBanner, Badge, ConfirmDialog,
  formatMoney, CURRENCIES,
} from '../components/ui';

const STATUSES  = ['Available', 'Assigned', 'In Repair', 'Retired', 'Lost/Stolen'];
const LOCATIONS = ['Office', 'Remote', 'Warehouse', 'Sent for Repair'];

const BLANK_PRICE = {
  purchase_price: '', currency: 'INR', purchase_date: '',
  vendor: '', invoice_number: '', warranty_start: '', warranty_end: '', notes: '',
};

/* ── Renders one dynamic field input based on its data type ──────────────── */
function DynamicInput({ field, value, onChange }) {
  if (field.data_type === 'boolean') {
    return (
      <select className="input" value={value ?? ''} onChange={(e) => onChange(e.target.value)}>
        <option value="">—</option>
        <option value="Yes">Yes</option>
        <option value="No">No</option>
      </select>
    );
  }
  if (field.data_type === 'dropdown') {
    return (
      <select className="input" value={value ?? ''} onChange={(e) => onChange(e.target.value)}>
        <option value="">Select…</option>
        {(field.dropdown_options || []).map((o) => <option key={o} value={o}>{o}</option>)}
      </select>
    );
  }
  const type = field.data_type === 'number' ? 'number' : field.data_type === 'date' ? 'date' : 'text';
  return (
    <input className="input" type={type} value={value ?? ''}
      onChange={(e) => onChange(e.target.value)}
      placeholder={field.data_type === 'number' ? '0' : ''} />
  );
}

export default function Assets() {
  const [assets, setAssets] = useState([]);
  const [types, setTypes] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);

  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [typeFilter, setTypeFilter] = useState('');

  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);
  const [viewing, setViewing] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);

  const load = useCallback(() => {
    setLoading(true);
    const params = {};
    if (statusFilter) params.status = statusFilter;
    if (typeFilter) params.asset_type_id = typeFilter;
    if (search) params.search = search;
    Promise.all([
      api.get('/assets/', { params }),
      api.get('/asset-types/', { params: { only_active: true } }),
      api.get('/employees/'),
    ]).then(([a, t, e]) => {
      setAssets(a.data); setTypes(t.data); setEmployees(e.data);
    }).finally(() => setLoading(false));
  }, [search, statusFilter, typeFilter]);
  useEffect(() => { load(); }, [load]);

  const openAdd = () => { setEditing(null); setShowForm(true); };
  const openEdit = (a) => { setEditing(a); setShowForm(true); };

  const handleDelete = async () => {
    await api.delete(`/assets/${deleteTarget.id}`);
    setDeleteTarget(null); load();
  };

  return (
    <div>
      <PageHeader
        title="Assets" icon="🖥️"
        subtitle={`${assets.length} asset${assets.length !== 1 ? 's' : ''} registered`}
        actions={
          <button onClick={openAdd} disabled={types.length === 0} className="btn-primary"
            title={types.length === 0 ? 'Create an asset type first' : ''}>
            + New Asset
          </button>
        }
      />

      {/* Filters */}
      <div className="flex flex-wrap gap-3 mb-5">
        <input value={search} onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by ID or description…" className="input w-72" />
        <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="input w-44">
          <option value="">All Statuses</option>
          {STATUSES.map((s) => <option key={s}>{s}</option>)}
        </select>
        <select value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)} className="input w-44">
          <option value="">All Types</option>
          {types.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
        </select>
      </div>

      {/* Table */}
      <div className="glass-card overflow-hidden">
        {loading ? <Spinner /> : assets.length === 0 ? (
          <EmptyState
            icon="🖥️" title="No assets found"
            message={types.length === 0
              ? 'Create an asset type first, then register assets under it.'
              : 'Register your first asset to get started.'}
            action={types.length > 0 && <button onClick={openAdd} className="btn-primary">+ New Asset</button>}
          />
        ) : (
          <div className="overflow-x-auto scroll-thin">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-ink-900/5 text-left">
                  {['Asset ID', 'Type', 'Description', 'Status', 'Owner', 'Actions'].map((h) => (
                    <th key={h} className="px-5 py-3.5 text-xs font-bold text-ink-500 uppercase tracking-wide whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {assets.map((a) => (
                  <tr key={a.id} className="border-b border-ink-900/5 last:border-0 hover:bg-white/40 transition-colors">
                    <td className="px-5 py-3.5 font-mono text-xs font-semibold text-brand-700 whitespace-nowrap">{a.asset_id}</td>
                    <td className="px-5 py-3.5 whitespace-nowrap">
                      <span className="inline-flex items-center gap-1.5">
                        <span>{a.asset_type_icon || '🧩'}</span>{a.asset_type_name}
                      </span>
                    </td>
                    <td className="px-5 py-3.5 text-ink-700 max-w-xs truncate">{a.description || <span className="text-ink-300">—</span>}</td>
                    <td className="px-5 py-3.5"><Badge status={a.status} /></td>
                    <td className="px-5 py-3.5 text-ink-700 whitespace-nowrap">{a.employee_name || <span className="text-ink-300">—</span>}</td>
                    <td className="px-5 py-3.5 whitespace-nowrap">
                      <button onClick={() => setViewing(a)} className="text-ink-500 hover:text-brand-600 font-semibold text-xs mr-3">View</button>
                      <button onClick={() => openEdit(a)} className="text-ink-500 hover:text-brand-600 font-semibold text-xs mr-3">Edit</button>
                      <button onClick={() => setDeleteTarget(a)} className="text-ink-500 hover:text-red-600 font-semibold text-xs">Delete</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {showForm && (
        <AssetForm
          editing={editing} types={types} employees={employees}
          onClose={() => setShowForm(false)} onSaved={() => { setShowForm(false); load(); }}
        />
      )}
      {viewing && <AssetDetail asset={viewing} onClose={() => setViewing(null)} />}
      {deleteTarget && (
        <ConfirmDialog
          title="Delete Asset?"
          message={<><span className="font-semibold">{deleteTarget.asset_id}</span> — {deleteTarget.description || deleteTarget.asset_type_name}<br />This cannot be undone.</>}
          onConfirm={handleDelete} onCancel={() => setDeleteTarget(null)}
        />
      )}
    </div>
  );
}

/* ── Create / edit form with dynamic fields ──────────────────────────────── */
function AssetForm({ editing, types, employees, onClose, onSaved }) {
  const [typeId, setTypeId] = useState(editing?.asset_type_id || '');
  const [typeFields, setTypeFields] = useState([]);
  const [core, setCore] = useState({
    description: editing?.description || '',
    status: editing?.status || 'Available',
    location: editing?.location || 'Office',
    employee_id: editing?.employee_id ?? '',
    notes: editing?.notes || '',
  });
  const [values, setValues] = useState({});
  const [loadingFields, setLoadingFields] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (editing) {
      api.get(`/assets/${editing.id}`).then((r) => {
        setTypeFields(r.data.fields || []);
        const v = {};
        (r.data.fields || []).forEach((f) => { v[f.field_id] = f.value ?? ''; });
        setValues(v);
      });
      return;
    }
    if (!typeId) { setTypeFields([]); setValues({}); return; }
    setLoadingFields(true);
    api.get(`/asset-types/${typeId}`).then((r) => {
      const flds = (r.data.fields || []).filter((f) => f.is_visible).map((f) => ({
        field_id: f.id, field_label: f.field_label, data_type: f.data_type,
        dropdown_options: f.dropdown_options, is_required: f.is_required,
      }));
      setTypeFields(flds);
      const v = {}; flds.forEach((f) => { v[f.field_id] = ''; }); setValues(v);
    }).finally(() => setLoadingFields(false));
  }, [typeId, editing]);

  const submit = async (e) => {
    e.preventDefault();
    setSaving(true); setError('');
    try {
      const field_values = Object.entries(values).map(([fid, val]) => ({ field_id: Number(fid), value: val }));
      const payload = {
        description: core.description,
        status: core.status,
        location: core.location,
        employee_id: core.employee_id === '' ? null : Number(core.employee_id),
        notes: core.notes,
        field_values,
      };
      if (editing) {
        await api.put(`/assets/${editing.id}`, payload);
      } else {
        await api.post('/assets/', { ...payload, asset_type_id: Number(typeId) });
      }
      onSaved();
    } catch (err) {
      setError(err.response?.data?.detail || 'Save failed.');
    } finally { setSaving(false); }
  };

  const setV = (fid, val) => setValues((p) => ({ ...p, [fid]: val }));
  const setC = (k) => (e) => setCore((p) => ({ ...p, [k]: e.target.value }));

  return (
    <Modal
      title={editing ? `Edit Asset — ${editing.asset_id}` : 'Register New Asset'}
      subtitle={editing ? editing.asset_type_name : 'Pick a type, then fill its fields'}
      onClose={onClose}
    >
      <form onSubmit={submit}>
        <ErrorBanner>{error}</ErrorBanner>

        <div className="grid grid-cols-2 gap-4">
          <Field label="Asset Type" required>
            {editing ? (
              <div className="input bg-ink-900/5 flex items-center gap-1.5">
                {editing.asset_type_icon} {editing.asset_type_name}
              </div>
            ) : (
              <select className="input" value={typeId} required
                onChange={(e) => setTypeId(e.target.value)}>
                <option value="">Select type…</option>
                {types.map((t) => <option key={t.id} value={t.id}>{t.icon} {t.name}</option>)}
              </select>
            )}
          </Field>
          <Field label="Status">
            <select className="input" value={core.status} onChange={setC('status')}>
              {STATUSES.map((s) => <option key={s}>{s}</option>)}
            </select>
          </Field>
          <Field label="Description (owner & product)" className="col-span-2">
            <input className="input" value={core.description} onChange={setC('description')}
              placeholder="e.g. Ravi Kumar — Dell XPS 15 Laptop" />
          </Field>
          <Field label="Assigned To">
            <select className="input" value={core.employee_id} onChange={setC('employee_id')}>
              <option value="">Unassigned</option>
              {employees.map((e) => <option key={e.id} value={e.id}>{e.full_name} ({e.employee_id})</option>)}
            </select>
          </Field>
          <Field label="Location">
            <select className="input" value={core.location} onChange={setC('location')}>
              {LOCATIONS.map((l) => <option key={l}>{l}</option>)}
            </select>
          </Field>
        </div>

        {(typeId || editing) && (
          <div className="mt-5 pt-5 border-t border-ink-900/5">
            <p className="label mb-3">{editing?.asset_type_name || types.find((t) => t.id === Number(typeId))?.name} Details</p>
            {loadingFields ? (
              <p className="text-sm text-ink-400">Loading fields…</p>
            ) : typeFields.length === 0 ? (
              <p className="text-sm text-ink-400">This type has no custom fields.</p>
            ) : (
              <div className="grid grid-cols-2 gap-4">
                {typeFields.map((f) => (
                  <Field key={f.field_id} label={f.field_label} required={f.is_required}>
                    <DynamicInput field={f} value={values[f.field_id]} onChange={(v) => setV(f.field_id, v)} />
                  </Field>
                ))}
              </div>
            )}
          </div>
        )}

        <Field label="Notes" className="mt-4">
          <textarea className="input resize-none" rows={2} value={core.notes} onChange={setC('notes')}
            placeholder="Any additional notes…" />
        </Field>

        <div className="flex justify-end gap-3 mt-6 pt-5 border-t border-ink-900/5">
          <button type="button" onClick={onClose} className="btn-ghost">Cancel</button>
          <button type="submit" disabled={saving || (!editing && !typeId)} className="btn-primary">
            {saving ? 'Saving…' : editing ? 'Save Changes' : 'Register Asset'}
          </button>
        </div>
      </form>
    </Modal>
  );
}

/* ── Purchase price panel shown in the Pricing tab of AssetDetail ────────── */
function PricingPanel({ asset }) {
  const [price, setPrice] = useState(undefined); // undefined = loading, null = no record
  const [editMode, setEditMode] = useState(false);
  const [form, setForm] = useState(BLANK_PRICE);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const load = useCallback(() => {
    api.get('/prices/', { params: { search: asset.asset_id } })
      .then((r) => {
        const p = r.data.find((x) => x.asset_id === asset.id) || null;
        setPrice(p);
        if (p) {
          setForm({
            purchase_price: p.purchase_price ?? '',
            currency: p.currency || 'INR',
            purchase_date: p.purchase_date || '',
            vendor: p.vendor || '',
            invoice_number: p.invoice_number || '',
            warranty_start: p.warranty_start || '',
            warranty_end: p.warranty_end || '',
            notes: p.notes || '',
          });
        } else {
          setForm(BLANK_PRICE);
        }
      });
  }, [asset.id, asset.asset_id]);

  useEffect(() => { load(); }, [load]);

  const f = (k) => (e) => setForm((prev) => ({ ...prev, [k]: e.target.value }));

  const save = async (e) => {
    e.preventDefault();
    setSaving(true); setError('');
    try {
      const payload = {
        ...form,
        purchase_price: form.purchase_price === '' ? null : Number(form.purchase_price),
        purchase_date: form.purchase_date || null,
        warranty_start: form.warranty_start || null,
        warranty_end: form.warranty_end || null,
      };
      if (price) {
        const { asset_id, ...rest } = payload;
        await api.put(`/prices/${price.id}`, rest);
      } else {
        await api.post('/prices/', { ...payload, asset_id: asset.id });
      }
      setEditMode(false);
      load();
    } catch (err) {
      setError(err.response?.data?.detail || 'Save failed.');
    } finally { setSaving(false); }
  };

  if (price === undefined) return <Spinner />;

  if (editMode || price === null) {
    return (
      <form onSubmit={save}>
        <ErrorBanner>{error}</ErrorBanner>
        <div className="grid grid-cols-2 gap-4">
          <Field label="Purchase Price" required>
            <input className="input" type="number" min="0" step="0.01"
              value={form.purchase_price} onChange={f('purchase_price')} required placeholder="0" />
          </Field>
          <Field label="Currency">
            <select className="input" value={form.currency} onChange={f('currency')}>
              {CURRENCIES.map((c) => <option key={c}>{c}</option>)}
            </select>
          </Field>
          <Field label="Vendor / Supplier">
            <input className="input" value={form.vendor} onChange={f('vendor')} placeholder="Dell India, Amazon…" />
          </Field>
          <Field label="Invoice Number">
            <input className="input" value={form.invoice_number} onChange={f('invoice_number')} />
          </Field>
          <Field label="Purchase Date">
            <input className="input" type="date" value={form.purchase_date} onChange={f('purchase_date')} />
          </Field>
          <Field label="Warranty Start">
            <input className="input" type="date" value={form.warranty_start} onChange={f('warranty_start')} />
          </Field>
          <Field label="Warranty End">
            <input className="input" type="date" value={form.warranty_end} onChange={f('warranty_end')} />
          </Field>
          <Field label="Notes" className="col-span-2">
            <input className="input" value={form.notes} onChange={f('notes')} />
          </Field>
        </div>
        <div className="flex justify-end gap-3 mt-6 pt-5 border-t border-ink-900/5">
          {price && (
            <button type="button" onClick={() => setEditMode(false)} className="btn-ghost">Cancel</button>
          )}
          <button type="submit" disabled={saving} className="btn-primary">
            {saving ? 'Saving…' : price ? 'Save Changes' : 'Add Price'}
          </button>
        </div>
      </form>
    );
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
        <Info label="Purchase Price" value={formatMoney(price.purchase_price, price.currency)} />
        <Info label="Vendor" value={price.vendor || '—'} />
        <Info label="Invoice" value={price.invoice_number || '—'} />
        <Info label="Purchase Date" value={price.purchase_date || '—'} />
        <Info label="Warranty Start" value={price.warranty_start || '—'} />
        <Info label="Warranty End" value={price.warranty_end || '—'} />
      </div>
      {price.notes && <Info label="Notes" value={price.notes} />}
      <div className="flex justify-end pt-2">
        <button onClick={() => setEditMode(true)} className="btn-primary">Edit Price</button>
      </div>
    </div>
  );
}

/* ── Detail view with Details / Pricing / History tabs ───────────────────── */
function AssetDetail({ asset, onClose }) {
  const [tab, setTab] = useState('details');
  const [detail, setDetail] = useState(null);
  const [history, setHistory] = useState([]);

  useEffect(() => {
    api.get(`/assets/${asset.id}`).then((r) => setDetail(r.data));
    api.get(`/assets/${asset.id}/history`).then((r) => setHistory(r.data));
  }, [asset.id]);

  return (
    <Modal title={`${asset.asset_type_icon || '🧩'}  ${asset.asset_id}`} subtitle={asset.description} onClose={onClose}>
      <div className="flex gap-2 mb-5">
        {['details', 'pricing', 'history'].map((t) => (
          <button key={t} onClick={() => setTab(t)}
            className={`px-4 py-1.5 rounded-xl text-sm font-semibold capitalize transition-all ${tab === t ? 'bg-brand-500 text-white shadow-glow-sm' : 'bg-white/60 text-ink-600 hover:bg-white'}`}>
            {t}
          </button>
        ))}
      </div>

      {tab === 'details' && (
        !detail ? <Spinner /> : (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <Info label="Type" value={`${detail.asset_type_icon || ''} ${detail.asset_type_name}`} />
              <Info label="Status"><Badge status={detail.status} /></Info>
              <Info label="Owner" value={detail.employee_name || '—'} />
              <Info label="Location" value={detail.location} />
            </div>
            {detail.fields?.length > 0 && (
              <div>
                <p className="label">Custom Fields</p>
                <div className="grid grid-cols-2 gap-3">
                  {detail.fields.map((f) => (
                    <Info key={f.field_id} label={f.field_label} value={f.value || '—'} />
                  ))}
                </div>
              </div>
            )}
            {detail.notes && <Info label="Notes" value={detail.notes} />}
          </div>
        )
      )}

      {tab === 'pricing' && <PricingPanel asset={asset} />}

      {tab === 'history' && (
        history.length === 0
          ? <p className="text-sm text-ink-400 py-4">No history yet.</p>
          : (
            <div className="relative pl-5">
              <div className="absolute left-[7px] top-1 bottom-1 w-px bg-ink-900/10" />
              {history.map((h) => (
                <div key={h.id} className="relative pb-4">
                  <div className="absolute -left-[13px] top-1 w-3.5 h-3.5 rounded-full bg-brand-500 border-2 border-white shadow" />
                  <p className="text-sm font-semibold text-ink-900">{h.activity_type}</p>
                  <p className="text-xs text-ink-500">
                    {h.field_changed && <span className="font-medium">{h.field_changed}: </span>}
                    {h.old_value != null && <span className="line-through text-ink-400">{h.old_value}</span>}
                    {h.old_value != null && h.new_value != null && ' → '}
                    {h.new_value != null && <span className="text-brand-700">{h.new_value}</span>}
                    {!h.field_changed && h.notes}
                  </p>
                  <p className="text-[11px] text-ink-400 mt-0.5">
                    {h.performed_by} · {new Date(h.timestamp).toLocaleString()}
                  </p>
                </div>
              ))}
            </div>
          )
      )}
    </Modal>
  );
}

function Info({ label, value, children }) {
  return (
    <div className="glass rounded-2xl px-4 py-3">
      <p className="text-[11px] font-semibold uppercase tracking-wide text-ink-400 mb-0.5">{label}</p>
      {children || <p className="text-sm text-ink-900 break-words">{value}</p>}
    </div>
  );
}
