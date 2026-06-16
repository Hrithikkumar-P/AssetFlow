import { useEffect, useState, useCallback } from 'react';
import api from '../api/axios';
import {
  PageHeader, Modal, Field, Spinner, EmptyState, ErrorBanner, ConfirmDialog,
  formatMoney, CURRENCIES,
} from '../components/ui';

const blank = {
  asset_id: '', purchase_price: '', currency: 'INR', purchase_date: '',
  vendor: '', invoice_number: '', warranty_start: '', warranty_end: '', notes: '',
};

export default function Pricing() {
  const [prices, setPrices] = useState([]);
  const [assets, setAssets] = useState([]);
  const [summary, setSummary] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(blank);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [deleteTarget, setDeleteTarget] = useState(null);

  const load = useCallback(() => {
    setLoading(true);
    Promise.all([
      api.get('/prices/', { params: search ? { search } : {} }),
      api.get('/assets/'),
      api.get('/prices/summary'),
    ]).then(([p, a, s]) => {
      setPrices(p.data); setAssets(a.data); setSummary(s.data.by_currency || []);
    }).finally(() => setLoading(false));
  }, [search]);
  useEffect(() => { load(); }, [load]);

  const pricedAssetIds = new Set(prices.map((p) => p.asset_id));
  const availableAssets = assets.filter((a) => !pricedAssetIds.has(a.id));

  const openAdd = () => { setEditing(null); setForm(blank); setError(''); setShowForm(true); };
  const openEdit = (p) => {
    setEditing(p);
    setForm({
      asset_id: p.asset_id, purchase_price: p.purchase_price ?? '', currency: p.currency || 'INR',
      purchase_date: p.purchase_date || '', vendor: p.vendor || '', invoice_number: p.invoice_number || '',
      warranty_start: p.warranty_start || '', warranty_end: p.warranty_end || '', notes: p.notes || '',
    });
    setError(''); setShowForm(true);
  };

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
      if (editing) {
        const { asset_id, ...rest } = payload;
        await api.put(`/prices/${editing.id}`, rest);
      } else {
        await api.post('/prices/', { ...payload, asset_id: Number(form.asset_id) });
      }
      setShowForm(false); load();
    } catch (err) {
      setError(err.response?.data?.detail || 'Save failed.');
    } finally { setSaving(false); }
  };

  const handleDelete = async () => { await api.delete(`/prices/${deleteTarget.id}`); setDeleteTarget(null); load(); };
  const f = (k) => (e) => setForm((p) => ({ ...p, [k]: e.target.value }));

  return (
    <div>
      <PageHeader
        title="Pricing" icon="💰"
        subtitle="Purchase cost of each asset"
        actions={<button onClick={openAdd} disabled={availableAssets.length === 0} className="btn-primary"
          title={availableAssets.length === 0 ? 'All assets already have a price' : ''}>+ Add Price</button>}
      />

      {/* Summary */}
      {summary.length > 0 && (
        <div className="flex flex-wrap gap-4 mb-5">
          {summary.map((s) => (
            <div key={s.currency} className="glass-card px-5 py-4 animate-slide-up">
              <p className="text-xs font-semibold uppercase tracking-wide text-ink-500">{s.currency} Total</p>
              <p className="font-display text-2xl font-extrabold text-gradient mt-1">{formatMoney(s.total, s.currency)}</p>
              <p className="text-xs text-ink-400">{s.count} asset{s.count !== 1 ? 's' : ''}</p>
            </div>
          ))}
        </div>
      )}

      <div className="mb-5">
        <input value={search} onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by asset, vendor, invoice…" className="input w-80" />
      </div>

      <div className="glass-card overflow-hidden">
        {loading ? <Spinner /> : prices.length === 0 ? (
          <EmptyState icon="💰" title="No price records"
            message="Add the purchase price for your assets here. Repair costs are tracked separately under Repairs."
            action={availableAssets.length > 0 && <button onClick={openAdd} className="btn-primary">+ Add Price</button>} />
        ) : (
          <div className="overflow-x-auto scroll-thin">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-ink-900/5 text-left">
                  {['Asset', 'Price', 'Vendor', 'Invoice', 'Purchase Date', 'Warranty End', 'Actions'].map((h) => (
                    <th key={h} className="px-5 py-3.5 text-xs font-bold text-ink-500 uppercase tracking-wide whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {prices.map((p) => (
                  <tr key={p.id} className="border-b border-ink-900/5 last:border-0 hover:bg-white/40 transition-colors">
                    <td className="px-5 py-3.5 whitespace-nowrap">
                      <p className="font-mono text-xs font-semibold text-brand-700">{p.asset_code}</p>
                      <p className="text-xs text-ink-400 max-w-[12rem] truncate">{p.asset_description}</p>
                    </td>
                    <td className="px-5 py-3.5 font-semibold text-ink-900 whitespace-nowrap">{formatMoney(p.purchase_price, p.currency)}</td>
                    <td className="px-5 py-3.5 text-ink-700 whitespace-nowrap">{p.vendor || '—'}</td>
                    <td className="px-5 py-3.5 text-ink-700 whitespace-nowrap">{p.invoice_number || '—'}</td>
                    <td className="px-5 py-3.5 text-ink-700 whitespace-nowrap">{p.purchase_date || '—'}</td>
                    <td className="px-5 py-3.5 text-ink-700 whitespace-nowrap">{p.warranty_end || '—'}</td>
                    <td className="px-5 py-3.5 whitespace-nowrap">
                      <button onClick={() => openEdit(p)} className="text-ink-500 hover:text-brand-600 font-semibold text-xs mr-3">Edit</button>
                      <button onClick={() => setDeleteTarget(p)} className="text-ink-500 hover:text-red-600 font-semibold text-xs">Delete</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {showForm && (
        <Modal title={editing ? `Edit Price — ${editing.asset_code}` : 'Add Price Record'}
          subtitle="Purchase cost only" onClose={() => setShowForm(false)}>
          <form onSubmit={save}>
            <ErrorBanner>{error}</ErrorBanner>
            <div className="grid grid-cols-2 gap-4">
              <Field label="Asset" required className="col-span-2">
                {editing ? (
                  <div className="input bg-ink-900/5">{editing.asset_code} — {editing.asset_description}</div>
                ) : (
                  <select className="input" value={form.asset_id} onChange={f('asset_id')} required>
                    <option value="">Select asset…</option>
                    {availableAssets.map((a) => (
                      <option key={a.id} value={a.id}>{a.asset_id} — {a.description || a.asset_type_name}</option>
                    ))}
                  </select>
                )}
              </Field>
              <Field label="Purchase Price" required>
                <input className="input" type="number" min="0" step="0.01" value={form.purchase_price} onChange={f('purchase_price')} required placeholder="0" />
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
              <button type="button" onClick={() => setShowForm(false)} className="btn-ghost">Cancel</button>
              <button type="submit" disabled={saving} className="btn-primary">{saving ? 'Saving…' : editing ? 'Save Changes' : 'Add Price'}</button>
            </div>
          </form>
        </Modal>
      )}

      {deleteTarget && (
        <ConfirmDialog title="Delete Price Record?"
          message={<>Price for <span className="font-semibold">{deleteTarget.asset_code}</span> will be removed.</>}
          onConfirm={handleDelete} onCancel={() => setDeleteTarget(null)} />
      )}
    </div>
  );
}
