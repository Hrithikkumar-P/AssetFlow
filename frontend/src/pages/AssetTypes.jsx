import { useEffect, useState, useCallback } from 'react';
import api from '../api/axios';
import { useAuth } from '../context/AuthContext';
import {
  PageHeader, Modal, Field, Spinner, EmptyState, ErrorBanner, Badge,
} from '../components/ui';

const DATA_TYPES = [
  { value: 'text',     label: 'Text' },
  { value: 'number',   label: 'Number' },
  { value: 'date',     label: 'Date' },
  { value: 'boolean',  label: 'Yes / No' },
  { value: 'dropdown', label: 'Dropdown' },
];
const ICONS = ['🖥️','💻','🖱️','⌨️','🖨️','📱','📷','🎧','🪑','🔌','🛜','💾','🖲️','📺','🔋','🧩'];

const blankField = () => ({ field_label: '', data_type: 'text', is_required: false, options: '' });

/* ── Field builder row (used in create modal) ────────────────────────────── */
function FieldRow({ field, onChange, onRemove }) {
  return (
    <div className="glass rounded-2xl p-3 flex flex-col gap-2.5">
      <div className="flex gap-2.5">
        <input
          className="input flex-1" placeholder="Field name (e.g. RAM, DPI)"
          value={field.field_label} onChange={(e) => onChange({ ...field, field_label: e.target.value })}
        />
        <select
          className="input w-36" value={field.data_type}
          onChange={(e) => onChange({ ...field, data_type: e.target.value })}
        >
          {DATA_TYPES.map((d) => <option key={d.value} value={d.value}>{d.label}</option>)}
        </select>
        <button type="button" onClick={onRemove}
          className="w-10 flex-shrink-0 rounded-xl text-red-500 hover:bg-red-50 transition-colors text-lg">×</button>
      </div>
      <div className="flex items-center gap-4">
        {field.data_type === 'dropdown' && (
          <input
            className="input flex-1" placeholder="Options, comma separated (SSD, HDD, NVMe)"
            value={field.options} onChange={(e) => onChange({ ...field, options: e.target.value })}
          />
        )}
        <label className="flex items-center gap-2 text-xs text-ink-600 cursor-pointer select-none ml-auto">
          <input type="checkbox" className="accent-brand-500 w-4 h-4"
            checked={field.is_required} onChange={(e) => onChange({ ...field, is_required: e.target.checked })} />
          Required
        </label>
      </div>
    </div>
  );
}

const DATA_TYPE_LABEL = Object.fromEntries(DATA_TYPES.map((d) => [d.value, d.label]));

export default function AssetTypes() {
  const { user } = useAuth();
  const isSuper = user?.role === 'super_admin';

  const [types, setTypes] = useState([]);
  const [loading, setLoading] = useState(true);

  // create modal
  const [showCreate, setShowCreate] = useState(false);
  const [name, setName] = useState('');
  const [icon, setIcon] = useState('🧩');
  const [description, setDescription] = useState('');
  const [fields, setFields] = useState([blankField()]);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState('');

  // manage drawer
  const [managing, setManaging] = useState(null); // asset type object

  const load = useCallback(() => {
    setLoading(true);
    api.get('/asset-types/').then((r) => setTypes(r.data)).finally(() => setLoading(false));
  }, []);
  useEffect(() => { load(); }, [load]);

  const openCreate = () => {
    setName(''); setIcon('🧩'); setDescription(''); setFields([blankField()]);
    setFormError(''); setShowCreate(true);
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    setSaving(true); setFormError('');
    try {
      const payload = {
        name, icon, description,
        fields: fields
          .filter((f) => f.field_label.trim())
          .map((f, i) => ({
            field_label: f.field_label.trim(),
            data_type: f.data_type,
            is_required: f.is_required,
            display_order: i,
            dropdown_options: f.data_type === 'dropdown'
              ? f.options.split(',').map((o) => o.trim()).filter(Boolean)
              : null,
          })),
      };
      await api.post('/asset-types/', payload);
      setShowCreate(false);
      load();
    } catch (err) {
      setFormError(err.response?.data?.detail || 'Failed to create asset type.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div>
      <PageHeader
        title="Asset Types" icon="🧩"
        subtitle="Define categories and their custom fields"
        actions={<button onClick={openCreate} className="btn-primary">+ New Asset Type</button>}
      />

      {loading ? <Spinner /> : types.length === 0 ? (
        <div className="glass-card">
          <EmptyState
            icon="🧩" title="No asset types yet"
            message="Create your first asset type — like Laptop or Mouse — and define the custom fields it should track."
            action={<button onClick={openCreate} className="btn-primary">+ New Asset Type</button>}
          />
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {types.map((t) => (
            <button
              key={t.id} onClick={() => setManaging(t)}
              className="glass-card p-5 text-left hover:-translate-y-1 transition-transform duration-300 animate-slide-up"
            >
              <div className="flex items-start justify-between mb-3">
                <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-brand-100 to-brand-200 grid place-items-center text-2xl">
                  {t.icon || '🧩'}
                </div>
                {t.status !== 'active'
                  ? <Badge status="pending">Pending</Badge>
                  : <Badge status="active">Active</Badge>}
              </div>
              <p className="font-display font-bold text-ink-900">{t.name}</p>
              <p className="text-xs text-ink-400 line-clamp-2 mt-0.5 min-h-[2rem]">{t.description || 'No description'}</p>
              <div className="mt-3 pt-3 border-t border-ink-900/5 flex items-center justify-between">
                <span className="text-xs text-ink-500">{t.field_count} field{t.field_count !== 1 ? 's' : ''}</span>
                <span className="text-xs font-semibold text-brand-600">Manage →</span>
              </div>
            </button>
          ))}
        </div>
      )}

      {/* ── Create modal ── */}
      {showCreate && (
        <Modal title="New Asset Type" subtitle="Name it, then add the fields it should track" onClose={() => setShowCreate(false)}>
          <form onSubmit={handleCreate}>
            <ErrorBanner>{formError}</ErrorBanner>
            {!isSuper && (
              <div className="mb-4 bg-amber-50 border border-amber-200 text-amber-700 px-4 py-2.5 rounded-xl text-sm">
                As an IT Admin, this type will be submitted for Super Admin approval before it becomes usable.
              </div>
            )}

            <div className="grid grid-cols-3 gap-4 mb-4">
              <Field label="Type Name" required className="col-span-2">
                <input className="input" value={name} onChange={(e) => setName(e.target.value)}
                  required placeholder="Laptop, Mouse, Chair…" autoFocus />
              </Field>
              <Field label="Icon">
                <div className="input flex items-center justify-center text-2xl">{icon}</div>
              </Field>
            </div>

            <div className="flex flex-wrap gap-1.5 mb-4">
              {ICONS.map((ic) => (
                <button type="button" key={ic} onClick={() => setIcon(ic)}
                  className={`w-9 h-9 rounded-xl text-lg grid place-items-center transition-all ${icon === ic ? 'bg-brand-500 scale-110 shadow-glow-sm' : 'bg-white/60 hover:bg-white'}`}>
                  {ic}
                </button>
              ))}
            </div>

            <Field label="Description" className="mb-5">
              <input className="input" value={description} onChange={(e) => setDescription(e.target.value)}
                placeholder="Optional short description" />
            </Field>

            <div className="flex items-center justify-between mb-2">
              <label className="label mb-0">Custom Fields</label>
              <button type="button" onClick={() => setFields([...fields, blankField()])}
                className="text-xs font-semibold text-brand-600 hover:text-brand-700">+ Add field</button>
            </div>
            <div className="space-y-2.5">
              {fields.map((f, i) => (
                <FieldRow
                  key={i} field={f}
                  onChange={(nf) => setFields(fields.map((x, j) => (j === i ? nf : x)))}
                  onRemove={() => setFields(fields.filter((_, j) => j !== i))}
                />
              ))}
              {fields.length === 0 && <p className="text-xs text-ink-400 py-2">No fields — add at least one to describe this asset type.</p>}
            </div>

            <div className="flex justify-end gap-3 mt-6 pt-5 border-t border-ink-900/5">
              <button type="button" onClick={() => setShowCreate(false)} className="btn-ghost">Cancel</button>
              <button type="submit" disabled={saving} className="btn-primary">
                {saving ? 'Saving…' : isSuper ? 'Create Type' : 'Submit for Approval'}
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* ── Manage fields drawer ── */}
      {managing && (
        <ManageType type={managing} onClose={() => setManaging(null)} onChanged={load} />
      )}
    </div>
  );
}

/* ── Manage existing type: add fields, toggle visibility ─────────────────── */
function ManageType({ type, onClose, onChanged }) {
  const [tab, setTab] = useState('fields');
  const [fields, setFields] = useState([]);
  const [loading, setLoading] = useState(true);
  const [adding, setAdding] = useState(false);
  const [newField, setNewField] = useState(blankField());
  const [busy, setBusy] = useState(false);

  const [assets, setAssets] = useState([]);
  const [assetsLoading, setAssetsLoading] = useState(false);

  const reload = useCallback(() => {
    setLoading(true);
    api.get(`/asset-types/${type.id}`).then((r) => setFields(r.data.fields || [])).finally(() => setLoading(false));
  }, [type.id]);
  useEffect(() => { reload(); }, [reload]);

  useEffect(() => {
    if (tab !== 'assets') return;
    setAssetsLoading(true);
    api.get('/assets/', { params: { asset_type_id: type.id } })
      .then((r) => setAssets(r.data)).finally(() => setAssetsLoading(false));
  }, [tab, type.id]);

  // group this type's assets by owner (users with their items of this type)
  const groups = (() => {
    const map = new Map();
    assets.forEach((a) => {
      const key = a.employee_id ?? 'unassigned';
      if (!map.has(key)) map.set(key, { name: a.employee_name || 'Unassigned', items: [] });
      map.get(key).items.push(a);
    });
    return [...map.values()].sort((x, y) => (x.name === 'Unassigned') - (y.name === 'Unassigned') || x.name.localeCompare(y.name));
  })();

  const addField = async () => {
    if (!newField.field_label.trim()) return;
    setBusy(true);
    try {
      await api.post(`/asset-types/${type.id}/fields`, {
        field_label: newField.field_label.trim(),
        data_type: newField.data_type,
        is_required: newField.is_required,
        dropdown_options: newField.data_type === 'dropdown'
          ? newField.options.split(',').map((o) => o.trim()).filter(Boolean) : null,
      });
      setNewField(blankField()); setAdding(false);
      reload(); onChanged();
    } finally { setBusy(false); }
  };

  const toggleVisibility = async (f) => {
    await api.patch(`/asset-types/fields/${f.id}/visibility`);
    reload(); onChanged();
  };

  return (
    <Modal title={`${type.icon || '🧩'}  ${type.name}`} subtitle={`${type.name} type`} onClose={onClose} size="lg">
      <div className="flex gap-2 mb-5">
        {[['fields', 'Fields'], ['assets', 'Users & Assets']].map(([key, lbl]) => (
          <button key={key} onClick={() => setTab(key)}
            className={`px-4 py-1.5 rounded-xl text-sm font-semibold transition-all ${tab === key ? 'bg-brand-500 text-white shadow-glow-sm' : 'bg-white/60 text-ink-600 hover:bg-white'}`}>
            {lbl}
          </button>
        ))}
      </div>

      {tab === 'assets' ? (
        assetsLoading ? <Spinner /> : assets.length === 0 ? (
          <EmptyState icon="🖥️" title="No assets of this type"
            message={`No ${type.name} assets have been registered yet.`} />
        ) : (
          <div className="space-y-4">
            <p className="text-sm text-ink-500">
              {assets.length} {type.name} asset{assets.length !== 1 ? 's' : ''} · {groups.filter((g) => g.name !== 'Unassigned').length} user{groups.filter((g) => g.name !== 'Unassigned').length !== 1 ? 's' : ''}
            </p>
            {groups.map((g) => (
              <div key={g.name} className="glass rounded-2xl p-4">
                <div className="flex items-center gap-2 mb-2.5">
                  <span className="w-7 h-7 rounded-full bg-gradient-to-br from-brand-400 to-brand-600 text-white grid place-items-center text-xs font-bold">
                    {g.name === 'Unassigned' ? '—' : g.name.split(' ').map((w) => w[0]).slice(0, 2).join('')}
                  </span>
                  <p className="font-semibold text-sm text-ink-900">{g.name}</p>
                  <span className="badge bg-white/70 text-ink-600 border border-white/70 ml-auto">{g.items.length}</span>
                </div>
                <div className="space-y-1.5">
                  {g.items.map((a) => (
                    <div key={a.id} className="flex items-center gap-2 text-sm pl-9">
                      <span className="font-mono text-xs text-brand-700">{a.asset_id}</span>
                      <span className="text-ink-400 truncate flex-1">{a.description || '—'}</span>
                      <Badge status={a.status} />
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )
      ) : loading ? <Spinner /> : (
        <>
          <div className="space-y-2 mb-5">
            {fields.length === 0 && <p className="text-sm text-ink-400">No fields defined yet.</p>}
            {fields.map((f) => (
              <div key={f.id}
                className={`glass rounded-2xl px-4 py-3 flex items-center gap-3 ${!f.is_visible ? 'opacity-55' : ''}`}>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-sm text-ink-900 truncate">
                    {f.field_label}
                    {f.is_required && <span className="text-brand-500 ml-1">*</span>}
                    {f.status === 'pending' && <Badge status="pending" className="ml-2">Pending</Badge>}
                  </p>
                  <p className="text-xs text-ink-400">
                    {DATA_TYPE_LABEL[f.data_type]}
                    {f.dropdown_options ? ` · ${f.dropdown_options.join(', ')}` : ''}
                  </p>
                </div>
                <button onClick={() => toggleVisibility(f)}
                  className={`badge ${f.is_visible ? 'bg-emerald-100 text-emerald-700' : 'bg-ink-900/10 text-ink-500'}`}>
                  {f.is_visible ? '👁 Visible' : '🚫 Hidden'}
                </button>
              </div>
            ))}
          </div>

          {adding ? (
            <div className="glass rounded-2xl p-3 space-y-2.5">
              <div className="flex gap-2.5">
                <input className="input flex-1" placeholder="New field name" autoFocus
                  value={newField.field_label} onChange={(e) => setNewField({ ...newField, field_label: e.target.value })} />
                <select className="input w-36" value={newField.data_type}
                  onChange={(e) => setNewField({ ...newField, data_type: e.target.value })}>
                  {DATA_TYPES.map((d) => <option key={d.value} value={d.value}>{d.label}</option>)}
                </select>
              </div>
              {newField.data_type === 'dropdown' && (
                <input className="input" placeholder="Options, comma separated"
                  value={newField.options} onChange={(e) => setNewField({ ...newField, options: e.target.value })} />
              )}
              <div className="flex items-center justify-between">
                <label className="flex items-center gap-2 text-xs text-ink-600 cursor-pointer">
                  <input type="checkbox" className="accent-brand-500 w-4 h-4"
                    checked={newField.is_required} onChange={(e) => setNewField({ ...newField, is_required: e.target.checked })} />
                  Required
                </label>
                <div className="flex gap-2">
                  <button onClick={() => setAdding(false)} className="btn-ghost py-1.5 px-3 text-xs">Cancel</button>
                  <button onClick={addField} disabled={busy} className="btn-primary py-1.5 px-3 text-xs">
                    {busy ? 'Adding…' : 'Add Field'}
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <button onClick={() => setAdding(true)} className="btn-ghost w-full">+ Add a new field</button>
          )}
        </>
      )}
    </Modal>
  );
}
