import { useEffect } from 'react';

/* ── Status / badge color maps ───────────────────────────────────────────── */
export const STATUS_BADGE = {
  Available:     'bg-emerald-100 text-emerald-700',
  Assigned:      'bg-brand-100 text-brand-700',
  'In Repair':   'bg-amber-100 text-amber-700',
  Retired:       'bg-ink-900/10 text-ink-600',
  'Lost/Stolen': 'bg-red-100 text-red-700',
  Active:        'bg-emerald-100 text-emerald-700',
  'On Leave':    'bg-amber-100 text-amber-700',
  Resigned:      'bg-ink-900/10 text-ink-600',
  Open:          'bg-brand-100 text-brand-700',
  'In Progress': 'bg-amber-100 text-amber-700',
  Completed:     'bg-emerald-100 text-emerald-700',
  Cancelled:     'bg-ink-900/10 text-ink-600',
  active:        'bg-emerald-100 text-emerald-700',
  pending:       'bg-amber-100 text-amber-700',
};

export function Badge({ status, children, className = '' }) {
  const cls = STATUS_BADGE[status] || 'bg-ink-900/10 text-ink-600';
  return <span className={`badge ${cls} ${className}`}>{children ?? status}</span>;
}

/* ── Page header ─────────────────────────────────────────────────────────── */
export function PageHeader({ title, subtitle, icon, actions }) {
  return (
    <div className="flex items-end justify-between gap-4 mb-7 animate-slide-up">
      <div className="flex items-center gap-3">
        {icon && (
          <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-brand-500 to-brand-600 text-white grid place-items-center text-xl shadow-glow-sm">
            {icon}
          </div>
        )}
        <div>
          <h1 className="font-display text-2xl font-extrabold text-ink-900 leading-tight">{title}</h1>
          {subtitle && <p className="text-sm text-ink-500 mt-0.5">{subtitle}</p>}
        </div>
      </div>
      {actions && <div className="flex items-center gap-3">{actions}</div>}
    </div>
  );
}

/* ── Field wrapper ───────────────────────────────────────────────────────── */
export function Field({ label, required, children, className = '' }) {
  return (
    <div className={className}>
      <label className="label">
        {label} {required && <span className="text-brand-500">*</span>}
      </label>
      {children}
    </div>
  );
}

/* ── Modal ───────────────────────────────────────────────────────────────── */
export function Modal({ title, subtitle, onClose, children, size = 'lg' }) {
  useEffect(() => {
    const h = (e) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, [onClose]);

  const widths = { sm: 'max-w-sm', md: 'max-w-lg', lg: 'max-w-2xl', xl: 'max-w-4xl' };
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-ink-900/40 backdrop-blur-sm animate-fade-in"
      onMouseDown={onClose}
    >
      <div
        className={`glass-strong rounded-3xl w-full ${widths[size]} max-h-[92vh] flex flex-col animate-scale-in`}
        onMouseDown={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between px-6 py-5 border-b border-ink-900/5">
          <div>
            <h3 className="font-display text-lg font-bold text-ink-900">{title}</h3>
            {subtitle && <p className="text-xs text-ink-500 mt-0.5">{subtitle}</p>}
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 grid place-items-center rounded-full text-ink-500 hover:bg-ink-900/5 hover:text-ink-900 transition-colors text-xl leading-none"
          >
            &times;
          </button>
        </div>
        <div className="overflow-y-auto scroll-thin flex-1 px-6 py-5">{children}</div>
      </div>
    </div>
  );
}

/* ── Confirm dialog ──────────────────────────────────────────────────────── */
export function ConfirmDialog({ title, message, confirmLabel = 'Delete', onConfirm, onCancel, danger = true }) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-ink-900/40 backdrop-blur-sm animate-fade-in"
      onMouseDown={onCancel}
    >
      <div
        className="glass-strong rounded-3xl w-full max-w-sm p-6 text-center animate-scale-in"
        onMouseDown={(e) => e.stopPropagation()}
      >
        <div className={`w-14 h-14 mx-auto mb-4 rounded-2xl grid place-items-center text-2xl ${danger ? 'bg-red-100 text-red-600' : 'bg-brand-100 text-brand-600'}`}>
          {danger ? '🗑️' : '❓'}
        </div>
        <h3 className="font-display text-lg font-bold text-ink-900 mb-1">{title}</h3>
        <div className="text-sm text-ink-500 mb-6">{message}</div>
        <div className="flex gap-3 justify-center">
          <button onClick={onCancel} className="btn-ghost flex-1">Cancel</button>
          <button onClick={onConfirm} className={`${danger ? 'btn-danger' : 'btn-primary'} flex-1`}>
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ── Spinner / loading ───────────────────────────────────────────────────── */
export function Spinner({ label = 'Loading…' }) {
  return (
    <div className="flex items-center justify-center h-56 text-ink-400">
      <div className="text-center">
        <div className="w-9 h-9 border-[3px] border-brand-500 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
        <p className="text-sm text-ink-500">{label}</p>
      </div>
    </div>
  );
}

/* ── Empty state ─────────────────────────────────────────────────────────── */
export function EmptyState({ icon = '📦', title, message, action }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <div className="text-5xl mb-3 opacity-80">{icon}</div>
      <p className="font-semibold text-ink-700">{title}</p>
      {message && <p className="text-sm text-ink-500 mt-1 max-w-sm">{message}</p>}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}

/* ── Error banner ────────────────────────────────────────────────────────── */
export function ErrorBanner({ children }) {
  if (!children) return null;
  return (
    <div className="mb-4 bg-red-50 border border-red-200 text-red-700 px-4 py-2.5 rounded-xl text-sm">
      {children}
    </div>
  );
}

/* ── Currency formatting ─────────────────────────────────────────────────── */
const CURRENCY_SYMBOL = { INR: '₹', USD: '$', EUR: '€', GBP: '£', AED: 'AED ' };
export const CURRENCIES = ['INR', 'USD', 'EUR', 'GBP', 'AED'];

export function formatMoney(amount, currency = 'INR') {
  if (amount == null) return '—';
  const sym = CURRENCY_SYMBOL[currency] ?? '';
  const n = Number(amount).toLocaleString('en-IN', { maximumFractionDigits: 2 });
  return `${sym}${n}`;
}
