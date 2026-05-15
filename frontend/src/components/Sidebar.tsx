import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard,
  Battery,
  Gauge,
  MapPin,
  Route,
  Cpu,
  LogOut,
  Zap,
  Lightbulb,
  Menu,
  X,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useState } from 'react';

const navItems = [
  { to: '/', icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/battery', icon: Battery, label: 'Battery' },
  { to: '/motor', icon: Gauge, label: 'Motor' },
  { to: '/location', icon: MapPin, label: 'Location' },
  { to: '/trips', icon: Route, label: 'Trips' },
  { to: '/firmware', icon: Cpu, label: 'Firmware' },
  { to: '/lighting', icon: Lightbulb, label: 'Lighting' },
];

export default function Sidebar() {
  const { logout } = useAuth();
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <>
      {/* Mobile bottom nav bar */}
      <nav className="fixed bottom-0 left-0 right-0 bg-dark-800 border-t border-dark-600 flex md:hidden z-50 safe-area-bottom">
        {navItems.slice(0, 5).map(({ to, icon: Icon, label }) => (
          <NavLink
            key={to}
            to={to}
            end={to === '/'}
            className={({ isActive }) =>
              `flex-1 flex flex-col items-center gap-0.5 py-2 text-[10px] font-medium transition-colors ${
                isActive ? 'text-niu-red' : 'text-text-secondary'
              }`
            }
          >
            <Icon className="w-5 h-5" />
            {label}
          </NavLink>
        ))}
        <button
          onClick={() => setMobileOpen(!mobileOpen)}
          className="flex-1 flex flex-col items-center gap-0.5 py-2 text-[10px] font-medium text-text-secondary"
        >
          <Menu className="w-5 h-5" />
          More
        </button>
      </nav>

      {/* Mobile "More" drawer */}
      {mobileOpen && (
        <div className="fixed inset-0 z-[60] md:hidden">
          <div className="absolute inset-0 bg-black/60" onClick={() => setMobileOpen(false)} />
          <div className="absolute bottom-0 left-0 right-0 bg-dark-800 rounded-t-2xl p-4 pb-8 safe-area-bottom">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-text-primary font-semibold">More</h2>
              <button onClick={() => setMobileOpen(false)} className="text-text-secondary">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="space-y-1">
              {navItems.slice(5).map(({ to, icon: Icon, label }) => (
                <NavLink
                  key={to}
                  to={to}
                  onClick={() => setMobileOpen(false)}
                  className={({ isActive }) =>
                    `flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all ${
                      isActive
                        ? 'bg-niu-red/15 text-niu-red'
                        : 'text-text-secondary hover:bg-dark-700'
                    }`
                  }
                >
                  <Icon className="w-5 h-5" />
                  {label}
                </NavLink>
              ))}
              <button
                onClick={() => {
                  setMobileOpen(false);
                  logout();
                }}
                className="flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium text-text-secondary hover:bg-dark-700 hover:text-niu-red w-full"
              >
                <LogOut className="w-5 h-5" />
                Logout
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Desktop sidebar */}
      <aside className="fixed left-0 top-0 h-screen w-64 bg-dark-800 border-r border-dark-600 hidden md:flex flex-col z-50">
        <div className="p-6 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-niu-red to-niu-cyan flex items-center justify-center">
            <Zap className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-text-primary">NIU Control</h1>
            <p className="text-xs text-text-muted">Vehicle Dashboard</p>
          </div>
        </div>

        <nav className="flex-1 px-3 py-4 space-y-1">
          {navItems.map(({ to, icon: Icon, label }) => (
            <NavLink
              key={to}
              to={to}
              end={to === '/'}
              className={({ isActive }) =>
                `flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all duration-200 ${
                  isActive
                    ? 'bg-niu-red/15 text-niu-red shadow-lg shadow-niu-red/5'
                    : 'text-text-secondary hover:bg-dark-700 hover:text-text-primary'
                }`
              }
            >
              <Icon className="w-5 h-5" />
              {label}
            </NavLink>
          ))}
        </nav>

        <div className="p-3">
          <button
            onClick={logout}
            className="flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium text-text-secondary hover:bg-dark-700 hover:text-niu-red transition-all duration-200 w-full"
          >
            <LogOut className="w-5 h-5" />
            Logout
          </button>
        </div>
      </aside>
    </>
  );
}
