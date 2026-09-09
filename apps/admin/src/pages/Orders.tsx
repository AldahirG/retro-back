import { useEffect, useState } from 'react'
import { getOrders, updateOrderStatus, addShipment } from '../lib/api'

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

function waPhone(raw: string) {
  // Normaliza a 52XXXXXXXXXX para wa.me
  const digits = raw.replace(/\D/g, '')
  if (digits.startsWith('52') && digits.length === 12) return digits
  if (digits.length === 10) return '52' + digits
  return digits
}

function waConfirm(o: any) {
  const addr = o.shippingAddressJson ?? o.shippingAddress ?? {}
  const items = (o.items ?? []).map((i: any) =>
    `• ${i.productName} | T:${i.size}${i.color ? ' C:'+i.color : ''} x${i.qty}`
  ).join('\n')
  const msg = [
    `¡Hola ${o.guestName}! 👋`,
    ``,
    `✅ Tu pedido *${o.orderNumber}* ha sido *CONFIRMADO*.`,
    ``,
    `📦 Artículos:`,
    items,
    ``,
    `💰 Total: $${Number(o.total).toLocaleString('es-MX')} MXN`,
    ``,
    `🚚 Enviaremos a: ${addr.street ?? ''}, ${addr.city ?? ''}, ${addr.state ?? ''} ${addr.zip ?? ''}`,
    ``,
    `En breve te compartimos tu guía de rastreo. ¡Gracias por tu compra en Retro Reeves! 🔥`,
  ].join('\n')
  return `https://wa.me/${waPhone(o.guestPhone)}?text=${encodeURIComponent(msg)}`
}

function waGuide(o: any, tracking: string, carrier: string) {
  const msg = [
    `¡Hola ${o.guestName}! 📦`,
    ``,
    `Tu pedido *${o.orderNumber}* ya fue enviado.`,
    ``,
    `🚚 Paquetería: *${carrier || 'N/A'}*`,
    `🔎 Guía de rastreo: *${tracking}*`,
    ``,
    `Puedes rastrear tu paquete en el sitio de la paquetería con ese número.`,
    `Tiempo estimado de entrega: 3 a 7 días hábiles.`,
    ``,
    `¡Cualquier duda aquí estamos! — Retro Reeves 🔥`,
  ].join('\n')
  return `https://wa.me/${waPhone(o.guestPhone)}?text=${encodeURIComponent(msg)}`
}

export default function Orders() {
  const [orders, setOrders]     = useState<any[]>([])
  const [loading, setLoading]   = useState(true)
  const [filter, setFilter]     = useState('')
  const [expanded, setExpanded] = useState<string | null>(null)
  const [guideModal, setGuideModal] = useState<any>(null)
  const [trackingNum, setTrackingNum] = useState('')
  const [carrier, setCarrier]   = useState('DHL')

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

  const confirmAndWA = async (o: any) => {
    await updateOrderStatus(o.id, 'confirmed')
    window.open(waConfirm(o), '_blank')
    load()
  }

  const openGuideModal = (o: any) => {
    setTrackingNum(''); setCarrier('DHL'); setGuideModal(o)
  }

  const sendGuide = async () => {
    if (!trackingNum.trim()) return
    await addShipment(guideModal.id, carrier, trackingNum)
    window.open(waGuide(guideModal, trackingNum, carrier), '_blank')
    setGuideModal(null)
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
                <tr key={o.id}
                  className="border-b border-black/5 hover:bg-[#f5f4ef] transition-colors cursor-pointer"
                  onClick={() => setExpanded(expanded === o.id ? null : o.id)}>
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
                  <td className="px-4 py-3 flex items-center gap-2" onClick={e => e.stopPropagation()}>
                    {/* Confirmar y notificar — solo en pending */}
                    {o.status === 'pending' && (
                      <button
                        onClick={() => confirmAndWA(o)}
                        title="Confirmar pedido y notificar al cliente por WhatsApp"
                        className="bg-[#25d366] text-white text-[10px] tracking-widest uppercase font-bold px-2 py-1 hover:opacity-80 transition-opacity whitespace-nowrap">
                        ✓ Confirmar + WA
                      </button>
                    )}
                    {/* Enviar guía — solo en confirmed/preparing */}
                    {(o.status === 'confirmed' || o.status === 'preparing') && (
                      <button
                        onClick={() => openGuideModal(o)}
                        title="Registrar guía y notificar al cliente"
                        className="bg-[#0d0d0d] text-white text-[10px] tracking-widest uppercase font-bold px-2 py-1 hover:opacity-80 transition-opacity whitespace-nowrap">
                        📦 Enviar guía
                      </button>
                    )}
                    {/* Cambio manual de estado */}
                    <select value={o.status}
                      onChange={e => changeStatus(o.id, e.target.value)}
                      className="border border-black/12 text-[11px] px-2 py-1 focus:outline-none focus:border-black">
                      {STATUSES.map(s => <option key={s} value={s}>{STATUS_LABEL[s]}</option>)}
                    </select>
                  </td>
                </tr>

                {expanded === o.id && (
                  <tr key={o.id + '-detail'} className="border-b border-black/5 bg-[#f5f4ef]">
                    <td colSpan={7} className="px-4 py-4">
                      <div className="grid grid-cols-3 gap-4 text-xs">
                        <div>
                          <p className="font-bold text-[10px] tracking-widest uppercase text-black/30 mb-1">Cliente</p>
                          <p className="font-semibold">{o.guestName}</p>
                          <p className="text-black/50">{o.guestPhone}</p>
                          {o.guestEmail && <p className="text-black/50">{o.guestEmail}</p>}
                        </div>
                        <div>
                          <p className="font-bold text-[10px] tracking-widest uppercase text-black/30 mb-1">Dirección</p>
                          {(() => { const a = o.shippingAddressJson ?? o.shippingAddress ?? {}; return (
                            <>
                              <p>{a.street}</p>
                              <p>{a.city}, {a.state} {a.zip}</p>
                              {a.references && <p className="text-black/40">Ref: {a.references}</p>}
                            </>
                          )})()}
                        </div>
                        <div>
                          <p className="font-bold text-[10px] tracking-widest uppercase text-black/30 mb-1">Artículos</p>
                          {o.items?.map((item: any) => (
                            <p key={item.id} className="mb-0.5">
                              {item.productName} — T:{item.size}{item.color ? ' C:'+item.color : ''} — x{item.qty}
                              <span className="text-black/40 ml-1">${Number(item.unitPrice).toLocaleString('es-MX')}</span>
                            </p>
                          ))}
                          <p className="mt-2 font-bold">Total: ${Number(o.total).toLocaleString('es-MX')} MXN</p>
                        </div>
                      </div>
                      {o.notes && (
                        <p className="text-xs text-black/40 mt-3 pt-3 border-t border-black/8">
                          <span className="font-bold">Notas:</span> {o.notes}
                        </p>
                      )}
                      {/* Botón WA libre */}
                      <div className="mt-3 pt-3 border-t border-black/8">
                        <a
                          href={`https://wa.me/${waPhone(o.guestPhone)}`}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-1.5 text-[10px] tracking-widest uppercase font-bold text-[#25d366] hover:opacity-70 transition-opacity">
                          <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor">
                            <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
                          </svg>
                          Escribir al cliente
                        </a>
                      </div>
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

      {/* Modal guía de envío */}
      {guideModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
          onClick={e => e.target === e.currentTarget && setGuideModal(null)}>
          <div className="bg-white w-full max-w-sm">
            <div className="flex items-center justify-between px-5 py-4 border-b border-black/8">
              <h3 className="font-extrabold tracking-tight">Enviar guía — #{guideModal.orderNumber}</h3>
              <button onClick={() => setGuideModal(null)} className="text-black/30 hover:text-black">✕</button>
            </div>
            <div className="p-5 flex flex-col gap-4">
              <p className="text-xs text-black/40">
                Cliente: <span className="font-bold text-black">{guideModal.guestName}</span> · {guideModal.guestPhone}
              </p>
              <div>
                <label className="block text-[10px] tracking-widest uppercase text-black/40 mb-1">Paquetería</label>
                <select value={carrier} onChange={e => setCarrier(e.target.value)}
                  className="w-full border border-black/12 px-3 py-2 text-sm focus:outline-none focus:border-black">
                  {['DHL','FedEx','Estafeta','Redpack','Paquetexpress','J&T','otro'].map(c =>
                    <option key={c} value={c}>{c}</option>
                  )}
                </select>
              </div>
              <div>
                <label className="block text-[10px] tracking-widest uppercase text-black/40 mb-1">Número de guía</label>
                <input
                  className="w-full border border-black/12 px-3 py-2 text-sm focus:outline-none focus:border-black font-mono"
                  value={trackingNum}
                  onChange={e => setTrackingNum(e.target.value)}
                  placeholder="1Z9999W90310776882"
                  autoFocus
                />
              </div>
              <div className="bg-[#f0fdf4] border border-green-200 px-3 py-2 text-xs text-green-700 rounded-sm">
                Al confirmar: el pedido cambia a <strong>Enviado</strong> y se abre WhatsApp con la guía para el cliente.
              </div>
              <button
                onClick={sendGuide}
                disabled={!trackingNum.trim()}
                className="bg-[#25d366] text-white py-2.5 text-[11px] tracking-widest uppercase font-bold disabled:opacity-40 hover:opacity-80 transition-opacity">
                Enviar guía por WhatsApp
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
