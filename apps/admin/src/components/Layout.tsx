import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import { useAuth } from '../lib/auth'
import { logout } from '../lib/api'
import {
  LayoutDashboard, Package, ShoppingBag, Layers, Tag, Percent, LogOut,
} from 'lucide-react'

const nav = [
  { to: '/',           label: 'Dashboard',  icon: LayoutDashboard },
  { to: '/products',   label: 'Productos',  icon: Package },
  { to: '/orders',     label: 'Pedidos',    icon: ShoppingBag },
  { to: '/drops',      label: 'Drops',      icon: Layers },
  { to: '/categories', label: 'Categorías', icon: Tag },
  { to: '/discounts',  label: 'Descuentos', icon: Percent },
]

export default function Layout() {
  const { user, refetch } = useAuth()
  const navigate = useNavigate()

  const handleLogout = async () => {
    await logout()
    refetch()
    navigate('/login')
  }

  return (
    <div className="flex h-screen bg-[#f5f4ef]">
      {/* Sidebar */}
      <aside className="w-56 bg-[#0d0d0d] flex flex-col shrink-0">
        <div className="px-5 py-5 border-b border-white/10">
          <p className="font-bold text-white text-sm tracking-widest uppercase">Retro Reeves</p>
          <p className="text-white/30 text-[10px] tracking-widest uppercase mt-0.5">Admin Panel</p>
        </div>
        <nav className="flex-1 py-3">
          {nav.map(({ to, label, icon: Icon }) => (
            <NavLink
              key={to}
              to={to}
              end={to === '/'}
              className={({ isActive }) =>
                `flex items-center gap-3 px-5 py-2.5 text-[13px] transition-colors ${
                  isActive
                    ? 'bg-white/10 text-white font-semibold'
                    : 'text-white/45 hover:text-white hover:bg-white/5'
                }`
              }
            >
              <Icon size={15} />
              {label}
            </NavLink>
          ))}
        </nav>
        <div className="px-5 py-4 border-t border-white/10">
          <p className="text-white/40 text-[11px] truncate mb-2">{user?.email}</p>
          <button
            onClick={handleLogout}
            className="flex items-center gap-2 text-white/40 hover:text-white text-[12px] transition-colors"
          >
            <LogOut size={13} /> Salir
          </button>
        </div>
      </aside>

      {/* Content */}
      <main className="flex-1 overflow-auto">
        <Outlet />
      </main>
    </div>
  )
}
