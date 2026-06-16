import { useEffect, useState } from 'react';
import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../api/axios';

const NAV = [
  { to: '/dashboard',   label: 'Dashboard',   icon: '◈' },
  { to: '/assets',      label: 'Assets',      icon: '🖥️' },
  { to: '/asset-types', label: 'Asset Types', icon: '🧩' },
  { to: '/repairs',     label: 'Repairs',     icon: '🛠️' },
  { to: '/employees',   label: 'Employees',   icon: '👥' },
  { to: '/users',       label: 'Users',       icon: '🔐' },
  { to: '/history',     label: 'History',     icon: '🕘' },
];

export default function Layout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [pending, setPending] = useState(0);

  const isSuper = user?.role === 'super_admin';

  useEffect(() => {
    if (!isSuper) return;
    let alive = true;
    const fetchPending = () =>
      api.get('/approvals/pending')
        .then((r) => alive && setPending(r.data.count || 0))
        .catch(() => {});
    fetchPending();
    const id = setInterval(fetchPending, 20000);
    return () => { alive = false; clearInterval(id); };
  }, [isSuper]);

  const handleLogout = () => { logout(); navigate('/login'); };

  const initials = (user?.full_name || 'U')
    .split(' ').map((w) => w[0]).slice(0, 2).join('').toUpperCase();

  return (
    <div className="flex h-screen overflow-hidden p-3 gap-3">
      {/* Sidebar */}
      <aside className="glass-dark rounded-3xl w-64 flex-shrink-0 flex flex-col text-white animate-slide-up">
        {/* Brand */}
        <div className="px-5 py-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-brand-400 to-brand-600 grid place-items-center text-lg font-black shadow-glow-sm">
              A
            </div>
            <div>
              <p className="font-display font-extrabold text-[15px] leading-none">AssetFlow</p>
              <p className="text-[11px] text-white/40 mt-1">ITAM · v2.0</p>
            </div>
          </div>
        </div>

        {/* Nav */}
        <nav className="flex-1 px-3 space-y-1 overflow-y-auto scroll-thin">
          {NAV.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) => `nav-link ${isActive ? 'nav-link-active' : ''}`}
            >
              <span className="text-base w-5 text-center">{item.icon}</span>
              {item.label}
            </NavLink>
          ))}

          {isSuper && (
            <NavLink
              to="/approvals"
              className={({ isActive }) => `nav-link ${isActive ? 'nav-link-active' : ''}`}
            >
              <span className="text-base w-5 text-center">✅</span>
              <span className="flex-1">Approvals</span>
              {pending > 0 && (
                <span className="badge bg-brand-500 text-white px-2 py-0.5 text-[10px]">{pending}</span>
              )}
            </NavLink>
          )}
        </nav>

        {/* User */}
        <div className="m-3 p-3 rounded-2xl bg-white/5 border border-white/10">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-9 h-9 rounded-full bg-gradient-to-br from-brand-400 to-brand-600 grid place-items-center text-xs font-bold flex-shrink-0">
              {initials}
            </div>
            <div className="min-w-0">
              <p className="text-sm font-semibold truncate">{user?.full_name}</p>
              <p className="text-[11px] text-white/40 capitalize truncate">
                {user?.role?.replace(/_/g, ' ')}
              </p>
            </div>
          </div>
          <button
            onClick={handleLogout}
            className="w-full py-2 rounded-xl text-sm font-medium text-white/80 bg-white/5 hover:bg-red-500/80 hover:text-white transition-colors"
          >
            Sign Out
          </button>
        </div>
      </aside>

      {/* Main */}
      <main className="flex-1 overflow-y-auto scroll-thin rounded-3xl">
        <div className="p-6 md:p-8 min-h-full">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
