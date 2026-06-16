import { useEffect, useState, useCallback } from 'react';
import api from '../api/axios';
import {
  PageHeader, Modal, Field, Spinner, EmptyState, ErrorBanner, Badge, ConfirmDialog,
} from '../components/ui';

/* ── Assets held by one employee ─────────────────────────────────────────── */
function EmployeeAssets({ employee, onClose }) {
  const [assets, setAssets] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/assets/', { params: { employee_id: employee.id } })
      .then((r) => setAssets(r.data)).finally(() => setLoading(false));
  }, [employee.id]);

  return (
    <Modal title={employee.full_name} subtitle={`${employee.employee_id} · assets held`} onClose={onClose}>
      {loading ? <Spinner /> : assets.length === 0 ? (
        <EmptyState icon="🖥️" title="No assets assigned" message={`${employee.full_name} doesn't hold any assets yet.`} />
      ) : (
        <div className="space-y-2">
          <p className="text-sm text-ink-500 mb-2">{assets.length} asset{assets.length !== 1 ? 's' : ''}</p>
          {assets.map((a) => (
            <div key={a.id} className="glass rounded-2xl px-4 py-3 flex items-center gap-3">
              <span className="text-xl">{a.asset_type_icon || '🧩'}</span>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-ink-900">
                  <span className="font-mono text-brand-700">{a.asset_id}</span>
                  <span className="text-ink-400 font-normal"> · {a.asset_type_name}</span>
                </p>
                <p className="text-xs text-ink-400 truncate">{a.description || '—'}</p>
              </div>
              <Badge status={a.status} />
            </div>
          ))}
        </div>
      )}
    </Modal>
  );
}

const DEPARTMENTS = ['Engineering', 'Design', 'HR', 'Finance', 'Sales', 'Marketing', 'Operations', 'IT', 'Legal', 'Other'];
const LOCATIONS = ['Office', 'Remote', 'Hybrid'];
const STATUSES = ['Active', 'On Leave', 'Resigned'];

const BLANK = {
  full_name: '', email: '', department: '', designation: '',
  work_location: 'Office', phone: '', status: 'Active',
};

export default function Employees() {
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(BLANK);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [viewing, setViewing] = useState(null);

  const load = useCallback(() => {
    setLoading(true);
    api.get('/employees/').then((r) => setEmployees(r.data)).finally(() => setLoading(false));
  }, []);
  useEffect(() => { load(); }, [load]);

  const openAdd = () => { setEditing(null); setForm(BLANK); setError(''); setShowModal(true); };
  const openEdit = (emp) => {
    setEditing(emp);
    setForm({
      full_name: emp.full_name || '', email: emp.email || '', department: emp.department || '',
      designation: emp.designation || '', work_location: emp.work_location || 'Office',
      phone: emp.phone || '', status: emp.status || 'Active',
    });
    setError(''); setShowModal(true);
  };

  const save = async (e) => {
    e.preventDefault();
    setSaving(true); setError('');
    try {
      if (editing) await api.put(`/employees/${editing.id}`, form);
      else await api.post('/employees/', form);
      setShowModal(false); load();
    } catch (err) {
      setError(err.response?.data?.detail || 'Save failed.');
    } finally { setSaving(false); }
  };

  const handleDelete = async () => { await api.delete(`/employees/${deleteTarget.id}`); setDeleteTarget(null); load(); };
  const f = (k) => (e) => setForm((p) => ({ ...p, [k]: e.target.value }));

  return (
    <div>
      <PageHeader title="Employees" icon="👥"
        subtitle={`${employees.length} employee${employees.length !== 1 ? 's' : ''}`}
        actions={<button onClick={openAdd} className="btn-primary">+ Add Employee</button>} />

      <div className="glass-card overflow-hidden">
        {loading ? <Spinner /> : employees.length === 0 ? (
          <EmptyState icon="👥" title="No employees yet"
            message="Add employees so you can assign assets to them."
            action={<button onClick={openAdd} className="btn-primary">+ Add Employee</button>} />
        ) : (
          <div className="overflow-x-auto scroll-thin">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-ink-900/5 text-left">
                  {['Employee ID', 'Name', 'Department', 'Designation', 'Location', 'Status', 'Actions'].map((h) => (
                    <th key={h} className="px-5 py-3.5 text-xs font-bold text-ink-500 uppercase tracking-wide whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {employees.map((emp) => (
                  <tr key={emp.id} className="border-b border-ink-900/5 last:border-0 hover:bg-white/40 transition-colors">
                    <td className="px-5 py-3.5 font-mono text-xs font-semibold text-brand-700 whitespace-nowrap">{emp.employee_id}</td>
                    <td className="px-5 py-3.5">
                      <p className="font-semibold text-ink-900">{emp.full_name}</p>
                      <p className="text-xs text-ink-400">{emp.email}</p>
                    </td>
                    <td className="px-5 py-3.5 text-ink-700">{emp.department || '—'}</td>
                    <td className="px-5 py-3.5 text-ink-700">{emp.designation || '—'}</td>
                    <td className="px-5 py-3.5 text-ink-700">{emp.work_location}</td>
                    <td className="px-5 py-3.5"><Badge status={emp.status} /></td>
                    <td className="px-5 py-3.5 whitespace-nowrap">
                      <button onClick={() => setViewing(emp)} className="text-ink-500 hover:text-brand-600 font-semibold text-xs mr-3">View</button>
                      <button onClick={() => openEdit(emp)} className="text-ink-500 hover:text-brand-600 font-semibold text-xs mr-3">Edit</button>
                      <button onClick={() => setDeleteTarget(emp)} className="text-ink-500 hover:text-red-600 font-semibold text-xs">Delete</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {showModal && (
        <Modal title={editing ? `Edit — ${editing.employee_id}` : 'Add Employee'} onClose={() => setShowModal(false)} size="md">
          <form onSubmit={save}>
            <ErrorBanner>{error}</ErrorBanner>
            <div className="grid grid-cols-2 gap-4">
              <Field label="Full Name" required className="col-span-2">
                <input className="input" value={form.full_name} onChange={f('full_name')} required placeholder="Ravi Kumar" />
              </Field>
              <Field label="Email">
                <input className="input" type="email" value={form.email} onChange={f('email')} placeholder="ravi@company.com" />
              </Field>
              <Field label="Phone">
                <input className="input" value={form.phone} onChange={f('phone')} placeholder="+91 98765 43210" />
              </Field>
              <Field label="Department">
                <select className="input" value={form.department} onChange={f('department')}>
                  <option value="">Select…</option>
                  {DEPARTMENTS.map((d) => <option key={d}>{d}</option>)}
                </select>
              </Field>
              <Field label="Designation">
                <input className="input" value={form.designation} onChange={f('designation')} placeholder="Senior Developer" />
              </Field>
              <Field label="Work Location">
                <select className="input" value={form.work_location} onChange={f('work_location')}>
                  {LOCATIONS.map((l) => <option key={l}>{l}</option>)}
                </select>
              </Field>
              <Field label="Status">
                <select className="input" value={form.status} onChange={f('status')}>
                  {STATUSES.map((s) => <option key={s}>{s}</option>)}
                </select>
              </Field>
            </div>
            <div className="flex justify-end gap-3 mt-6 pt-5 border-t border-ink-900/5">
              <button type="button" onClick={() => setShowModal(false)} className="btn-ghost">Cancel</button>
              <button type="submit" disabled={saving} className="btn-primary">{saving ? 'Saving…' : editing ? 'Save Changes' : 'Add Employee'}</button>
            </div>
          </form>
        </Modal>
      )}

      {viewing && <EmployeeAssets employee={viewing} onClose={() => setViewing(null)} />}

      {deleteTarget && (
        <ConfirmDialog title="Delete Employee?"
          message={<><span className="font-semibold">{deleteTarget.full_name}</span> ({deleteTarget.employee_id})<br />Their assigned assets will be unassigned.</>}
          onConfirm={handleDelete} onCancel={() => setDeleteTarget(null)} />
      )}
    </div>
  );
}
