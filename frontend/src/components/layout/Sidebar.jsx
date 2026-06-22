import { NavLink, useNavigate } from 'react-router-dom'
import {
  LayoutDashboard, TrendingUp, Package, Users, DollarSign,
  MapPin, Upload, BarChart2, Brain, LogOut, ChevronLeft,
  ChevronRight, Moon, Sun, Settings
} from 'lucide-react'
import { useAuth } from '../../store/AuthContext'
import { useTheme } from '../../store/ThemeContext'
import { cx } from '../../utils/helpers'

const NAV_ITEMS = [
  { to: '/',           icon: LayoutDashboard, label: 'Overview' },
  { to: '/sales',      icon: TrendingUp,      label: 'Sales' },
  { to: '/products',   icon: Package,         label: 'Products' },
  { to: '/customers',  icon: Users,           label: 'Customers' },
  { to: '/profit',     icon: DollarSign,      label: 'Profit' },
  { to: '/regions',    icon: MapPin,          label: 'Regions' },
  { to: '/forecast',   icon: BarChart2,       label: 'Forecast' },
  { to: '/upload',     icon: Upload,          label: 'Upload Data' },
  { to: '/reports',    icon: Brain,           label: 'Reports & AI' },
]

export default function Sidebar({ collapsed, setCollapsed }) {
  const { user, logout } = useAuth()
  const { dark, toggle } = useTheme()
  const navigate = useNavigate()

  const handleLogout = () => { logout(); navigate('/login') }

  return (
    <aside
      className={cx(
        'fixed inset-y-0 left-0 z-40 flex flex-col bg-white dark:bg-slate-900',
        'border-r border-slate-200 dark:border-slate-700 transition-all duration-200',
        collapsed ? 'w-16' : 'w-64'
      )}
    >
      {/* Logo */}
      <div className="flex items-center h-16 px-4 border-b border-slate-200 dark:border-slate-700 gap-3">
        <div className="flex-shrink-0 w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center">
          <BarChart2 className="w-4 h-4 text-white" />
        </div>
        {!collapsed && (
          <span className="font-semibold text-slate-800 dark:text-slate-100 text-sm truncate">
            Commerce Analytics
          </span>
        )}
        <button
          onClick={() => setCollapsed(c => !c)}
          className="ml-auto text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
        >
          {collapsed
            ? <ChevronRight className="w-4 h-4" />
            : <ChevronLeft  className="w-4 h-4" />}
        </button>
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto py-4 px-2 space-y-0.5 no-scrollbar">
        {NAV_ITEMS.map(({ to, icon: Icon, label }) => (
          <NavLink
            key={to}
            to={to}
            end={to === '/'}
            className={({ isActive }) =>
              cx(
                'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all',
                collapsed && 'justify-center',
                isActive
                  ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-400'
                  : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-slate-100'
              )
            }
            title={collapsed ? label : undefined}
          >
            <Icon className="w-4 h-4 flex-shrink-0" />
            {!collapsed && <span>{label}</span>}
          </NavLink>
        ))}
      </nav>

      {/* Bottom actions */}
      <div className="border-t border-slate-200 dark:border-slate-700 p-2 space-y-0.5">
        {/* Theme toggle */}
        <button
          onClick={toggle}
          className={cx(
            'w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm',
            'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-all',
            collapsed && 'justify-center'
          )}
          title="Toggle theme"
        >
          {dark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
          {!collapsed && <span>{dark ? 'Light Mode' : 'Dark Mode'}</span>}
        </button>

        {/* User */}
        {!collapsed && user && (
          <div className="flex items-center gap-2 px-3 py-2">
            <div className="w-7 h-7 rounded-full bg-blue-600 flex items-center justify-center text-white text-xs font-semibold flex-shrink-0">
              {user.full_name?.charAt(0).toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-medium text-slate-700 dark:text-slate-200 truncate">{user.full_name}</p>
              <p className="text-xs text-slate-400 dark:text-slate-500 truncate capitalize">{user.role}</p>
            </div>
          </div>
        )}

        <button
          onClick={handleLogout}
          className={cx(
            'w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm',
            'text-red-500 hover:bg-red-50 dark:hover:bg-red-900/10 transition-all',
            collapsed && 'justify-center'
          )}
          title="Logout"
        >
          <LogOut className="w-4 h-4" />
          {!collapsed && <span>Logout</span>}
        </button>
      </div>
    </aside>
  )
}
