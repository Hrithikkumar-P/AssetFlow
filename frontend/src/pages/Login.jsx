import { useState, useEffect } from 'react';
import { useNavigate, Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { ErrorBanner } from '../components/ui';
import api from '../api/axios';

export default function Login() {
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showForgot, setShowForgot] = useState(false);
  const { login, user } = useAuth();
  const navigate = useNavigate();

  if (user) return <Navigate to="/dashboard" replace />;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await login(identifier, password);
      navigate('/dashboard');
    } catch (err) {
      setError(err.response?.data?.detail || 'Login failed. Please check your credentials.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden">
      {/* Floating background blobs */}
      <div className="absolute -top-32 -right-24 w-96 h-96 rounded-full bg-brand-400/30 blur-3xl animate-float" />
      <div className="absolute -bottom-40 -left-24 w-[28rem] h-[28rem] rounded-full bg-brand-300/25 blur-3xl animate-float" style={{ animationDelay: '2s' }} />
      <div className="absolute top-1/3 left-1/4 w-72 h-72 rounded-full bg-amber-200/30 blur-3xl animate-float" style={{ animationDelay: '4s' }} />

      <div className="w-full max-w-md relative animate-slide-up">
        <div className="glass-strong rounded-[2rem] overflow-hidden shadow-glass-lg">
          {/* Header */}
          <div className="px-8 pt-9 pb-7 text-center">
            <div className="w-16 h-16 mx-auto mb-4 rounded-3xl bg-gradient-to-br from-brand-500 to-brand-600 grid place-items-center text-3xl font-black text-white shadow-glow">
              A
            </div>
            <h1 className="font-display text-2xl font-extrabold text-ink-900">AssetFlow</h1>
            <p className="text-sm text-ink-500 mt-1">Sign in to manage your IT assets</p>
          </div>

          {/* Form */}
          <div className="px-8 pb-8">
            <ErrorBanner>{error}</ErrorBanner>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="label">Email or Username</label>
                <input
                  type="text" value={identifier} onChange={(e) => setIdentifier(e.target.value)}
                  required placeholder="admin@itams.com or admin" className="input" autoFocus
                />
              </div>
              <div>
                <label className="label">Password</label>
                <input
                  type="password" value={password} onChange={(e) => setPassword(e.target.value)}
                  required placeholder="••••••••" className="input"
                />
              </div>
              <button type="submit" disabled={loading} className="btn-primary w-full py-3 mt-2">
                {loading ? (
                  <span className="flex items-center justify-center gap-2">
                    <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    Signing in…
                  </span>
                ) : 'Sign In'}
              </button>
            </form>

            <div className="mt-4 text-center">
              <button
                onClick={() => setShowForgot(true)}
                className="text-xs text-ink-400 hover:text-brand-600 transition-colors underline underline-offset-2"
              >
                Forgot password?
              </button>
            </div>

            <div className="mt-5 p-3.5 rounded-2xl bg-white/40 border border-white/60 text-center">
              <p className="text-[11px] text-ink-400 mb-0.5">Default credentials</p>
              <p className="text-xs font-mono text-ink-700">admin@itams.com&nbsp; / &nbsp;Admin@123</p>
            </div>
          </div>
        </div>
        <p className="text-center text-xs text-ink-400 mt-5">IT Asset Management System · v2.0</p>
      </div>

      {showForgot && <ForgotPasswordModal onClose={() => setShowForgot(false)} />}
    </div>
  );
}

/* ── Forgot Password modal ───────────────────────────────────────────────── */
function ForgotPasswordModal({ onClose }) {
  const [tab, setTab] = useState('otp');      // 'otp' | 'admin'
  const [step, setStep] = useState(1);         // 1=enter email, 2=enter OTP, 3=done
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [newPwd, setNewPwd] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [countdown, setCountdown] = useState(0);

  useEffect(() => {
    if (countdown <= 0) return;
    const t = setInterval(() => setCountdown((c) => Math.max(0, c - 1)), 1000);
    return () => clearInterval(t);
  }, [countdown]);

  const switchTab = (t) => {
    setTab(t); setStep(1); setError(''); setMessage('');
    setOtp(''); setNewPwd('');
  };

  const handleOtpRequest = async (e) => {
    e.preventDefault();
    setLoading(true); setError('');
    try {
      const r = await api.post('/auth/request-otp', { email });
      setMessage(r.data.message);
      setStep(2);
      setCountdown(60);
    } catch (err) {
      setError(err.response?.data?.detail || 'Request failed.');
    } finally { setLoading(false); }
  };

  const handleOtpReset = async (e) => {
    e.preventDefault();
    setLoading(true); setError('');
    try {
      const r = await api.post('/auth/reset-password-otp', { email, otp, new_password: newPwd });
      setMessage(r.data.message);
      setStep(3);
    } catch (err) {
      setError(err.response?.data?.detail || 'Invalid OTP or expired.');
    } finally { setLoading(false); }
  };

  const handleAdminRequest = async (e) => {
    e.preventDefault();
    setLoading(true); setError('');
    try {
      const r = await api.post('/auth/forgot-password-admin', { email });
      setMessage(r.data.message);
      setStep(3);
    } catch (err) {
      setError(err.response?.data?.detail || 'Request failed.');
    } finally { setLoading(false); }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/30 backdrop-blur-sm animate-fade-in">
      <div className="glass-strong rounded-[2rem] w-full max-w-md shadow-glass-lg animate-scale-in">
        <div className="px-7 py-6">
          {/* Header */}
          <div className="flex items-start justify-between mb-5">
            <div>
              <h2 className="font-display text-lg font-extrabold text-ink-900">Forgot Password</h2>
              <p className="text-xs text-ink-500 mt-0.5">Choose how you'd like to reset your password</p>
            </div>
            <button onClick={onClose} className="text-ink-400 hover:text-ink-700 text-2xl leading-none mt-0.5">×</button>
          </div>

          {/* Tab switcher */}
          <div className="flex gap-2 mb-5">
            {[['otp', 'Get OTP'], ['admin', 'Ask Admin']].map(([key, label]) => (
              <button key={key} onClick={() => switchTab(key)}
                className={`flex-1 px-4 py-2 rounded-xl text-sm font-semibold transition-all ${tab === key ? 'bg-brand-500 text-white shadow-glow-sm' : 'bg-white/60 text-ink-600 hover:bg-white'}`}>
                {label}
              </button>
            ))}
          </div>

          {/* ── Done state ── */}
          {step === 3 ? (
            <div className="text-center py-6">
              <p className="text-4xl mb-3">✅</p>
              <p className="text-sm text-ink-700 font-medium leading-relaxed">{message}</p>
              <button onClick={onClose} className="btn-primary mt-5 px-8">Back to Sign In</button>
            </div>

          /* ── OTP flow ── */
          ) : tab === 'otp' ? (
            step === 1 ? (
              <form onSubmit={handleOtpRequest} className="space-y-4">
                <div className="glass rounded-xl px-4 py-3 text-sm text-ink-600 leading-relaxed">
                  A 6-digit OTP will be written to the <strong>server logs</strong>. Enter it below within <strong>60 seconds</strong> to reset your password.
                </div>
                {error && <p className="text-sm text-red-600 bg-red-50 rounded-xl px-3 py-2">{error}</p>}
                <div>
                  <label className="label">Email or Username</label>
                  <input className="input" type="text" value={email}
                    onChange={(e) => setEmail(e.target.value)} required autoFocus
                    placeholder="your@email.com or username" />
                </div>
                <div className="flex gap-3 pt-1">
                  <button type="button" onClick={onClose} className="btn-ghost flex-1">Cancel</button>
                  <button type="submit" disabled={loading} className="btn-primary flex-1">
                    {loading ? 'Generating…' : 'Generate OTP'}
                  </button>
                </div>
              </form>
            ) : (
              <form onSubmit={handleOtpReset} className="space-y-4">
                {message && <p className="text-sm text-emerald-700 bg-emerald-50 rounded-xl px-3 py-2 leading-relaxed">{message}</p>}
                {error && <p className="text-sm text-red-600 bg-red-50 rounded-xl px-3 py-2">{error}</p>}

                {/* Countdown */}
                <div className="glass rounded-xl px-4 py-2.5 flex items-center justify-between">
                  <span className="text-xs text-ink-500">OTP expires in</span>
                  <span className={`font-mono font-bold text-base tabular-nums ${countdown <= 15 ? 'text-red-600' : 'text-brand-600'}`}>
                    {countdown}s
                  </span>
                </div>

                <div>
                  <label className="label">6-Digit OTP (from server logs)</label>
                  <input className="input font-mono tracking-[0.5em] text-center text-xl"
                    maxLength={6} value={otp} required
                    onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))}
                    placeholder="• • • • • •" />
                </div>
                <div>
                  <label className="label">New Password</label>
                  <input className="input" type="password" value={newPwd}
                    onChange={(e) => setNewPwd(e.target.value)} required placeholder="••••••••" />
                </div>
                <div className="flex gap-3 pt-1">
                  <button type="button" onClick={() => { setStep(1); setOtp(''); setError(''); }} className="btn-ghost flex-1">Back</button>
                  <button type="submit" disabled={loading || countdown === 0} className="btn-primary flex-1">
                    {loading ? 'Resetting…' : 'Reset Password'}
                  </button>
                </div>
                {countdown === 0 && (
                  <p className="text-xs text-red-500 text-center">
                    OTP expired.{' '}
                    <button type="button" className="underline font-medium"
                      onClick={() => { setStep(1); setOtp(''); setError(''); setMessage(''); }}>
                      Request a new one
                    </button>
                  </p>
                )}
              </form>
            )

          /* ── Admin request flow ── */
          ) : (
            <form onSubmit={handleAdminRequest} className="space-y-4">
              <div className="glass rounded-xl px-4 py-3 text-sm text-ink-600 leading-relaxed">
                A <strong>Super Admin</strong> will be notified and can set a new password for your account. This may take some time.
              </div>
              {error && <p className="text-sm text-red-600 bg-red-50 rounded-xl px-3 py-2">{error}</p>}
              <div>
                <label className="label">Email or Username</label>
                <input className="input" type="text" value={email}
                  onChange={(e) => setEmail(e.target.value)} required autoFocus
                  placeholder="your@email.com or username" />
              </div>
              <div className="flex gap-3 pt-1">
                <button type="button" onClick={onClose} className="btn-ghost flex-1">Cancel</button>
                <button type="submit" disabled={loading} className="btn-primary flex-1">
                  {loading ? 'Sending…' : 'Request Reset'}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
