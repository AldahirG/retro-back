import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider, useAuth } from './lib/auth'
import Layout     from './components/Layout'
import Login      from './pages/Login'
import Dashboard  from './pages/Dashboard'
import Products   from './pages/Products'
import Orders     from './pages/Orders'
import Drops      from './pages/Drops'
import Categories from './pages/Categories'
import Discounts  from './pages/Discounts'

function Guard({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth()
  if (loading) return <div className="min-h-screen flex items-center justify-center text-sm text-black/30">Cargando...</div>
  if (!user || user.role !== 'admin') return <Navigate to="/login" replace />
  return <>{children}</>
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/" element={<Guard><Layout /></Guard>}>
            <Route index          element={<Dashboard />} />
            <Route path="products"   element={<Products />} />
            <Route path="orders"     element={<Orders />} />
            <Route path="drops"      element={<Drops />} />
            <Route path="categories" element={<Categories />} />
            <Route path="discounts"  element={<Discounts />} />
          </Route>
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  )
}
