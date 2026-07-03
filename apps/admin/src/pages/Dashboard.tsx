import { useEffect, useState } from 'react'
import { getDashboard } from '../lib/api'
import { ShoppingBag, Package, TrendingUp, DollarSign } from 'lucide-react'

function Stat({ label, value, icon: Icon, sub }: any) {
  return (
    <div className="bg-white p-5 flex items-start gap-4">
      <div className="bg-[#f5f4ef] p-2.5 rounded-sm">
        <Icon size={18} className="text-[#0d0d0d]" />
      </div>
      <div>
        <p className="text-[11px] tracking-widest uppercase text-black/35 mb-0.5">{label}</p>
        <p className="text-2xl font-extrabold tracking-tight">{value ?? '—'}</p>
        {sub && <p className="text-[11px] text-black/35 mt-0.5">{sub}</p>}
      </div>
    </div>
  )
}

export default function Dashboard() {
  const [data, setData]   = useState<any>(null)
  const [error, setError] = useState('')

  useEffect(() => {
    getDashboard().then(setData).catch(e => setError(e.message))
  }, [])

  return (
    <div className="p-6">
      <h2 className="text-xl font-extrabold tracking-tight mb-5">Dashboard</h2>
      {error && <p className="text-[#c8382a] text-sm mb-4">{error}</p>}
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-3 mb-6">
        <Stat label="Pedidos hoy"     value={data?.ordersToday}   icon={ShoppingBag} />
        <Stat label="Pedidos totales" value={data?.ordersTotal}   icon={TrendingUp}  />
        <Stat label="Productos"       value={data?.products}      icon={Package}     />
        <Stat label="Ventas mes"      value={data?.revenueMonth ? `$${Number(data.revenueMonth).toLocaleString('es-MX')}` : '—'} icon={DollarSign} />
      </div>

      <h3 className="text-sm font-bold tracking-widest uppercase text-black/30 mb-3">Últimos pedidos</h3>
      <div className="bg-white overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-black/8">
              {['Orden','Cliente','Total','Estado','Fecha'].map(h => (
                <th key={h} className="text-left px-4 py-3 text-[11px] tracking-widest uppercase text-black/35 font-semibold">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {(data?.recentOrders ?? []).map((o: any) => (
              <tr key={o.id} className="border-b border-black/5 hover:bg-[#f5f4ef] transition-colors">
                <td className="px-4 py-3 font-mono text-xs text-black/50">#{o.orderNumber}</td>
                <td className="px-4 py-3 font-semibold">{o.guestName}</td>
                <td className="px-4 py-3 font-mono">${Number(o.total).toLocaleString('es-MX')}</td>
                <td className="px-4 py-3">
                  <span className={`text-[10px] tracking-widest uppercase px-2 py-0.5 font-bold ${
                    o.status === 'delivered'  ? 'bg-green-100 text-green-700' :
                    o.status === 'cancelled'  ? 'bg-red-100 text-red-600' :
                    o.status === 'shipped'    ? 'bg-blue-100 text-blue-700' :
                    'bg-yellow-50 text-yellow-700'
                  }`}>{o.status}</span>
                </td>
                <td className="px-4 py-3 text-black/40 text-xs">{new Date(o.createdAt).toLocaleDateString('es-MX')}</td>
              </tr>
            ))}
            {!data?.recentOrders?.length && (
              <tr><td colSpan={5} className="px-4 py-8 text-center text-black/25 text-sm">Sin pedidos aún</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
