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
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';

const navItems = [
  { to: '/', icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/battery', icon: Battery, label: 'Battery' },
  { to: '/motor', icon: Gauge, label: 'Motor' },
  { to: '/location', icon: MapPin, label: 'Location' },
  { to: '/trips', icon: Route, label: 'Trips' },
  { to: '/firmware', icon: Cpu, label: 'Firmware' },
];

export default function Sidebar() {
  const { logout } = useAuth();

  return (
    <aside className="fixed left-0 top-0 h-screen w-64 bg-dark-800 border-r border-dark-600 flex flex-col z-50">
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
  );
}
