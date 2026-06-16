import { useEffect, useState, useCallback } from 'react';
import api from '../api/axios';
import { useAuth } from '../context/AuthContext';
import {
  PageHeader, Modal, Field, Spinner, EmptyState, ErrorBanner, ConfirmDialog,
} from '../components/ui';

const ROLES = [
  { value: 'it_admin',    label: 'IT Admin' },
  { value: 'super_admin', label: 'Super Admin' },
];
const ROLE_LABEL = { it_admin: 'IT Admin', super_admin: 'Super Admin' };

function RoleChip({ role }) {
  const cls = role === 'super_admin'
    ? 'bg-gradient-to-r from-brand-500 to-brand-600 text-white'
    : 'bg-white/70 text-ink-700 border border-white/70';
  return <span className={`badge ${cls}`}>{ROLE_LABEL[role] || role}</span>;
}

const blank = { full_name: '', username: '', email: '', password: '', role: 'it_admin', is_active: true };

export default function Users() {
  const { user: me } = useAuth();
  const isSuper = me?.role === 'super_admin';
  const roleOptions = isSuper ? ROLES : ROLES.filter((r) => r.value !== 'super_admin');

  const [users, setUsers]       = useState([]);
  const [loading, setLoading]   = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing]   = useState(null);
  const [form, setForm]         = useState(blank);
  const [saving, setSaving]     = useState(false);
  const [error, setError]       = useState('');
  const [deleteTarget, setDeleteTarget] = useState(null);

  // Password reset requests (super admin only)
  const [resetRequests, setResetRequests]           = useState([]);
  const [resetLoading, setResetLoading]             = useState(false);
  const [approveTarget, setApproveTarget]           = useState(null); // request to approve
  const [approvePassword, setApprovePassword]       = useState('');
  const [approveSaving, setApproveSaving]           = useState(false);
  const [approveError, setApproveError]             = useState('');
  const [rejectTarget, setRejectTarget]             = useState(null);

  const load = useCallback(() => {
    setLoading(true);
    api.get('/users/').then((r) => setUsers(r.data)).finally(() => setLoading(false));
  }, []);

  const loadResetRequests = useCallback(() => {
    if (!isSuper) return;
    setResetLoading(true);
    api.get('/users/password-reset-requests')
      .then((r) => setResetRequests(r.data))
      .catch(() => setResetRequests([]))
      .finally(() => setResetLoading(false));
  }, [isSuper]);

  useEffect(() => { load(); }, [load]);
  useEffect(() => { loadResetRequests(); }, [loadResetRequests]);

  const openAdd = () => { setEditing(null); setForm(blank); setError(''); setShowForm(true); };
  const openEdit = (u) => {
    setEditing(u);
    setForm({
      full_name: u.full_name,
      username: u.username || '',
      email: u.email,
      password: '',
      role: u.role,
      is_active: u.is_active,
    });
    setError(''); setShowForm(true);
  };

  const save = async (e) => {
    e.preventDefault();
    setSaving(true); setError('');
    try {
      if (editing) {
        const payload = {
          full_name: form.full_name,
          username: form.username || null,
          role: form.role,
          is_active: form.is_active,
        };
        if (form.password) payload.password = form.password;
        await api.put(`/users/${editing.id}`, payload);
      } else {
        await api.post('/users/', {
          full_name: form.full_name,
          username: form.username || undefined,
          email: form.email,
          password: form.password,
          role: form.role,
        });
      }
      setShowForm(false); load();
    } catch (err) {
      setError(err.response?.data?.detail || 'Save failed.');
    } finally { setSaving(false); }
  };

  const handleDelete = async () => {
    try {
      await api.delete(`/users/${deleteTarget.id}`);
      setDeleteTarget(null); load();
    } catch (err) {
      setError(err.response?.data?.detail || 'Delete failed.');
      setDeleteTarget(null);
    }
  };

  const handleApprove = async (e) => {
    e.preventDefault();
    setApproveSaving(true); setApproveError('');
    try {
      await api.post(`/users/password-reset-requests/${approveTarget.id}/approve`, {
        new_password: approvePassword,
      });
      setApproveTarget(null); setApprovePassword('');
      loadResetRequests();
    } catch (err) {
      setApproveError(err.response?.data?.detail || 'Failed to reset password.');
    } finally { setApproveSaving(false); }
  };

  const handleReject = async () => {
    await api.post(`/users/password-reset-requests/${rejectTarget.id}/reject`);
    setRejectTarget(null);
    loadResetRequests();
  };

  const f = (k) => (e) => setForm((p) => ({ ...p, [k]: e.target.value }));
  const canManage = (u) => (isSuper || u.role !== 'super_admin');

  return (
    <div>
      <PageHeader
        title="Users" icon="🔐"
        subtitle="Application login accounts and roles"
        actions={<button onClick={openAdd} className="btn-primary">+ Add User</button>}
      />

      {!isSuper && (
        <div className="mb-5 glass-card px-4 py-3 text-sm text-ink-600">
          As an IT Admin you can add and manage <span className="font-semibold">IT Admin</span> accounts.
          Super Admin accounts are managed by Super Admins only.
        </div>
      )}

      {/* Users table */}
      <div className="glass-card overflow-hidden">
        {loading ? <Spinner /> : users.length === 0 ? (
          <EmptyState icon="🔐" title="No users" action={<button onClick={openAdd} className="btn-primary">+ Add User</button>} />
        ) : (
          <div className="overflow-x-auto scroll-thin">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-ink-900/5 text-left">
                  {['Name', 'Username', 'Email', 'Role', 'Status', 'Actions'].map((h) => (
                    <th key={h} className="px-5 py-3.5 text-xs font-bold text-ink-500 uppercase tracking-wide whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {users.map((u) => (
                  <tr key={u.id} className="border-b border-ink-900/5 last:border-0 hover:bg-white/40 transition-colors">
                    <td className="px-5 py-3.5 font-semibold text-ink-900 whitespace-nowrap">
                      {u.full_name}
                      {u.id === me?.id && <span className="text-xs text-ink-400 font-normal ml-2">(you)</span>}
                    </td>
                    <td className="px-5 py-3.5 text-ink-500 whitespace-nowrap font-mono text-xs">
                      {u.username ? `@${u.username}` : <span className="text-ink-300">—</span>}
                    </td>
                    <td className="px-5 py-3.5 text-ink-700 whitespace-nowrap">{u.email}</td>
                    <td className="px-5 py-3.5"><RoleChip role={u.role} /></td>
                    <td className="px-5 py-3.5">
                      <span className={`badge ${u.is_active ? 'bg-emerald-100 text-emerald-700' : 'bg-ink-900/10 text-ink-500'}`}>
                        {u.is_active ? 'Active' : 'Disabled'}
                      </span>
                    </td>
                    <td className="px-5 py-3.5 whitespace-nowrap">
                      {canManage(u) ? (
                        <>
                          <button onClick={() => openEdit(u)} className="text-ink-500 hover:text-brand-600 font-semibold text-xs mr-3">Edit</button>
                          {u.id !== me?.id && (
                            <button onClick={() => setDeleteTarget(u)} className="text-ink-500 hover:text-red-600 font-semibold text-xs">Delete</button>
                          )}
                        </>
                      ) : (
                        <span className="text-xs text-ink-300">—</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Password Reset Requests — Super Admin only */}
      {isSuper && (
        <div className="mt-8">
          <div className="flex items-center gap-3 mb-4">
            <h2 className="font-display font-bold text-ink-900 text-base">Password Reset Requests</h2>
            {resetRequests.length > 0 && (
              <span className="badge bg-brand-500 text-white px-2 py-0.5 text-[10px]">{resetRequests.length} pending</span>
            )}
          </div>

          <div className="glass-card overflow-hidden">
            {resetLoading ? <Spinner /> : resetRequests.length === 0 ? (
              <div className="px-6 py-8 text-center text-sm text-ink-400">
                No pending password reset requests.
              </div>
            ) : (
              <div className="overflow-x-auto scroll-thin">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-ink-900/5 text-left">
                      {['Name', 'Username', 'Email', 'Requested At', 'Actions'].map((h) => (
                        <th key={h} className="px-5 py-3.5 text-xs font-bold text-ink-500 uppercase tracking-wide whitespace-nowrap">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {resetRequests.map((r) => (
                      <tr key={r.id} className="border-b border-ink-900/5 last:border-0 hover:bg-white/40 transition-colors">
                        <td className="px-5 py-3.5 font-semibold text-ink-900 whitespace-nowrap">{r.user_name}</td>
                        <td className="px-5 py-3.5 text-ink-500 whitespace-nowrap font-mono text-xs">
                          {r.username ? `@${r.username}` : <span className="text-ink-300">—</span>}
                        </td>
                        <td className="px-5 py-3.5 text-ink-700 whitespace-nowrap">{r.user_email}</td>
                        <td className="px-5 py-3.5 text-ink-500 whitespace-nowrap text-xs">
                          {r.requested_at ? new Date(r.requested_at).toLocaleString() : '—'}
                        </td>
                        <td className="px-5 py-3.5 whitespace-nowrap">
                          <button
                            onClick={() => { setApproveTarget(r); setApprovePassword(''); setApproveError(''); }}
                            className="text-brand-600 hover:text-brand-700 font-semibold text-xs mr-3"
                          >
                            Approve
                          </button>
                          <button
                            onClick={() => setRejectTarget(r)}
                            className="text-ink-500 hover:text-red-600 font-semibold text-xs"
                          >
                            Reject
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Add / Edit user modal */}
      {showForm && (
        <Modal
          title={editing ? `Edit User — ${editing.full_name}` : 'Add User'}
          subtitle="Login account for the manager"
          onClose={() => setShowForm(false)}
        >
          <form onSubmit={save}>
            <ErrorBanner>{error}</ErrorBanner>
            <div className="grid grid-cols-2 gap-4">
              <Field label="Full Name" required className="col-span-2">
                <input className="input" value={form.full_name} onChange={f('full_name')} required placeholder="Jane Doe" />
              </Field>
              <Field label="Username">
                <input className="input font-mono" value={form.username} onChange={f('username')}
                  placeholder="janedoe" />
              </Field>
              <Field label="Email" required>
                <input className="input" type="email" value={form.email} onChange={f('email')} required
                  disabled={!!editing} placeholder="jane@company.com" />
              </Field>
              <Field label={editing ? 'New Password' : 'Password'} required={!editing}>
                <input className="input" type="password" value={form.password} onChange={f('password')}
                  required={!editing} placeholder={editing ? 'Leave blank to keep' : '••••••••'} />
              </Field>
              <Field label="Role">
                <select className="input" value={form.role} onChange={f('role')}>
                  {roleOptions.map((r) => <option key={r.value} value={r.value}>{r.label}</option>)}
                </select>
              </Field>
              {editing && (
                <Field label="Status" className="col-span-2">
                  <label className="flex items-center gap-2 text-sm text-ink-700 cursor-pointer select-none">
                    <input type="checkbox" className="accent-brand-500 w-4 h-4"
                      checked={form.is_active}
                      onChange={(e) => setForm((p) => ({ ...p, is_active: e.target.checked }))} />
                    Account active
                  </label>
                </Field>
              )}
            </div>
            {!isSuper && (
              <p className="text-xs text-ink-400 mt-3">You can only assign the IT Admin role.</p>
            )}
            <div className="flex justify-end gap-3 mt-6 pt-5 border-t border-ink-900/5">
              <button type="button" onClick={() => setShowForm(false)} className="btn-ghost">Cancel</button>
              <button type="submit" disabled={saving} className="btn-primary">
                {saving ? 'Saving…' : editing ? 'Save Changes' : 'Create User'}
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* Approve reset request modal */}
      {approveTarget && (
        <Modal
          title={`Reset Password — ${approveTarget.user_name}`}
          subtitle={approveTarget.user_email}
          onClose={() => setApproveTarget(null)}
        >
          <form onSubmit={handleApprove}>
            <ErrorBanner>{approveError}</ErrorBanner>
            <Field label="New Password" required>
              <input className="input" type="password" value={approvePassword}
                onChange={(e) => setApprovePassword(e.target.value)} required
                placeholder="••••••••" autoFocus />
            </Field>
            <div className="flex justify-end gap-3 mt-6 pt-5 border-t border-ink-900/5">
              <button type="button" onClick={() => setApproveTarget(null)} className="btn-ghost">Cancel</button>
              <button type="submit" disabled={approveSaving} className="btn-primary">
                {approveSaving ? 'Saving…' : 'Set New Password'}
              </button>
            </div>
          </form>
        </Modal>
      )}

      {deleteTarget && (
        <ConfirmDialog title="Delete User?"
          message={<><span className="font-semibold">{deleteTarget.full_name}</span> ({deleteTarget.email})<br />They will lose access immediately.</>}
          onConfirm={handleDelete} onCancel={() => setDeleteTarget(null)} />
      )}

      {rejectTarget && (
        <ConfirmDialog title="Reject Reset Request?"
          message={<>Reject the password reset request from <span className="font-semibold">{rejectTarget.user_name}</span>?</>}
          onConfirm={handleReject} onCancel={() => setRejectTarget(null)} />
      )}
    </div>
  );
}
