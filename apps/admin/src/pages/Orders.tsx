import { useEffect, useState } from 'react'
import { getOrders, updateOrderStatus } from '../lib/api'

const STATUSES = ['pending','confirmed','preparing','shipped','delivered','cancelled']
const STATUS_LABEL: Record<string, string> = {
  pending: 'Pendiente', confirmed: 'Confirmado', preparing: 'Preparando',
  shipped: 'Enviado', delivered: 'Entregado', cancelled: 'Cancelado',
}
const STATUS_COLOR: Record<string, string> = {
  pending:   'bg-yellow-50 text-yellow-700',
  confirmed: 'bg-blue-50 text-blue-700',
  preparing: 'bg-purple-50 text-purple-700',
  shipped:   'bg-indigo-50 text-indigo-700',
  delivered: 'bg-green-100 text-green-700',
  cancelled: 'bg-red-50 text-red-600',
}

export default function Orders() {
  const [orders, setOrders]   = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter]   = useState('')
  const [expanded, setExpanded] = useState<string | null>(null)

  const load = () => {
    setLoading(true)
    const q = filter ? `&status=${filter}` : ''
    getOrders(q).then(d => setOrders(d.data ?? [])).finally(() => setLoading(false))
  }
  useEffect(load, [filter])

  const changeStatus = async (id: string, status: string) => {
    await updateOrderStatus(id, status)
    load()
  }

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-5">
        <h2 className="text-xl font-extrabold tracking-tight">Pedidos</h2>
        <select value={filter} onChange={e => setFilter(e.target.value)}
          className="border border-black/15 px-3 py-1.5 text-[11px] tracking-widest uppercase font-bold text-black/50 focus:outline-none focus:border-black">
          <option value="">Todos</option>
          {STATUSES.map(s => <option key={s} value={s}>{STATUS_LABEL[s]}</option>)}
        </select>
      </div>

      <div className="bg-white overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-black/8">
              {['Orden','Cliente','Tel','Total','Canal','Estado','Acciones'].map(h => (
                <th key={h} className="text-left px-4 py-3 text-[11px] tracking-widest uppercase text-black/35 font-semibold">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading && <tr><td colSpan={7} className="px-4 py-8 text-center text-black/25">Cargando...</td></tr>}
            {orders.map(o => (
              <>
                <tr key={o.id} className="border-b border-black/5 hover:bg-[#f5f4ef] transition-colors cursor-pointer" onClick={() => setExpanded(expanded === o.id ? null : o.id)}>
                  <td className="px-4 py-3 font-mono text-xs text-black/45">#{o.orderNumber}</td>
                  <td className="px-4 py-3 font-semibold">{o.guestName}</td>
                  <td className="px-4 py-3 text-black/50 text-xs">{o.guestPhone}</td>
                  <td className="px-4 py-3 font-mono">${Number(o.total).toLocaleString('es-MX')}</td>
                  <td className="px-4 py-3">
                    <span className="text-[10px] tracking-widest uppercase bg-[#f5f4ef] px-2 py-0.5">{o.channel}</span>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`text-[10px] tracking-widest uppercase px-2 py-0.5 font-bold ${STATUS_COLOR[o.status] ?? ''}`}>
                      {STATUS_LABEL[o.status] ?? o.status}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <select value={o.status} onChange={e => { e.stopPropagation(); changeStatus(o.id, e.target.value) }}
                      onClick={e => e.stopPropagation()}
                      className="border border-black/12 text-[11px] px-2 py-1 focus:outline-none focus:border-black">
                      {STATUSES.map(s => <option key={s} value={s}>{STATUS_LABEL[s]}</option>)}
                    </select>
                  </td>
                </tr>
                {expanded === o.id && (
                  <tr key={o.id + '-detail'} className="border-b border-black/5 bg-[#f5f4ef]">
                    <td colSpan={7} className="px-4 py-3">
                      <div className="grid grid-cols-2 gap-4 text-xs">
                        <div>
                          <p className="font-bold text-[10px] tracking-widest uppercase text-black/30 mb-1">Dirección</p>
                          <p>{o.shippingAddress?.street}</p>
                          <p>{o.shippingAddress?.city}, {o.shippingAddress?.state} {o.shippingAddress?.zip}</p>
                        </div>
                        <div>
                          <p className="font-bold text-[10px] tracking-widest uppercase text-black/30 mb-1">Artículos</p>
                          {o.items?.map((item: any) => (
                            <p key={item.id}>{item.productName} — T:{item.size} — x{item.qty} — ${Number(item.unitPrice).toLocaleString('es-MX')}</p>
                          ))}
                        </div>
                      </div>
                      {o.notes && <p className="text-xs text-black/40 mt-2"><span className="font-bold">Notas:</span> {o.notes}</p>}
                    </td>
                  </tr>
                )}
              </>
            ))}
            {!loading && !orders.length && (
              <tr><td colSpan={7} className="px-4 py-8 text-center text-black/25">Sin pedidos</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
