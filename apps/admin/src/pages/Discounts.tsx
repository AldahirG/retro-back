import { useEffect, useState } from 'react'
import { getDiscounts, createDiscount, toggleDiscount, deleteDiscount } from '../lib/api'
import { Plus, Trash2 } from 'lucide-react'

const inp = 'w-full border border-black/12 px-3 py-2 text-sm focus:outline-none focus:border-black'
function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <div><label className="block text-[10px] tracking-widest uppercase text-black/40 mb-1">{label}</label>{children}</div>
}

export default function Discounts() {
  const [discounts, setDiscounts] = useState<any[]>([])
  const [modal, setModal]         = useState(false)
  const [saving, setSaving]       = useState(false)
  const [form, setForm] = useState({
    code: '', type: 'percent', value: '', minOrder: '', maxUses: '', validTo: '', active: true,
  })

  const load = () => getDiscounts().then(setDiscounts)
  useEffect(() => { load() }, [])

  const set = (k: string, v: any) => setForm(f => ({ ...f, [k]: v }))

  const save = async () => {
    setSaving(true)
    try {
      await createDiscount({
        ...form,
        value:    String(form.value),
        minOrder: form.minOrder || undefined,
        maxUses:  form.maxUses ? parseInt(form.maxUses) : undefined,
        validTo:  form.validTo ? new Date(form.validTo).toISOString() : undefined,
      })
      setModal(false); load()
    } finally { setSaving(false) }
  }

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-5">
        <h2 className="text-xl font-extrabold tracking-tight">Descuentos / Cupones</h2>
        <button onClick={() => setModal(true)} className="flex items-center gap-2 bg-[#0d0d0d] text-white px-4 py-2 text-[11px] tracking-widest uppercase font-bold hover:opacity-80 transition-opacity">
          <Plus size={14} /> Nuevo
        </button>
      </div>

      <div className="bg-white overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-black/8">
              {['Código','Tipo','Valor','Mín. orden','Usos','Válido hasta','Estado','Acciones'].map(h => (
                <th key={h} className="text-left px-4 py-3 text-[11px] tracking-widest uppercase text-black/35 font-semibold">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {discounts.map(d => (
              <tr key={d.id} className="border-b border-black/5 hover:bg-[#f5f4ef] transition-colors">
                <td className="px-4 py-3 font-mono font-bold">{d.code}</td>
                <td className="px-4 py-3 text-black/50">{d.type === 'percent' ? '%' : d.type === 'fixed' ? '$' : 'Envío gratis'}</td>
                <td className="px-4 py-3 font-mono">{d.type === 'percent' ? `${d.value}%` : `$${Number(d.value).toLocaleString('es-MX')}`}</td>
                <td className="px-4 py-3 text-black/50">{d.minOrder ? `$${Number(d.minOrder).toLocaleString('es-MX')}` : '—'}</td>
                <td className="px-4 py-3 text-black/50">{d.usedCount}{d.maxUses ? `/${d.maxUses}` : ''}</td>
                <td className="px-4 py-3 text-xs text-black/40">{d.validTo ? new Date(d.validTo).toLocaleDateString('es-MX') : '—'}</td>
                <td className="px-4 py-3">
                  <button onClick={() => toggleDiscount(d.id, !d.active).then(load)}
                    className={`text-[10px] tracking-widest uppercase font-bold px-2 py-0.5 ${d.active ? 'bg-green-100 text-green-700' : 'bg-black/5 text-black/30'}`}>
                    {d.active ? 'Activo' : 'Inactivo'}
                  </button>
                </td>
                <td className="px-4 py-3">
                  <button onClick={() => { if (confirm(`¿Eliminar "${d.code}"?`)) deleteDiscount(d.id).then(load) }}
                    className="text-[#c8382a]/40 hover:text-[#c8382a] transition-colors"><Trash2 size={13} /></button>
                </td>
              </tr>
            ))}
            {!discounts.length && <tr><td colSpan={8} className="px-4 py-8 text-center text-black/25">Sin descuentos</td></tr>}
          </tbody>
        </table>
      </div>

      {modal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={e => e.target === e.currentTarget && setModal(false)}>
          <div className="bg-white w-full max-w-sm">
            <div className="flex items-center justify-between px-5 py-4 border-b border-black/8">
              <h3 className="font-extrabold">Nuevo cupón</h3>
              <button onClick={() => setModal(false)} className="text-black/30 hover:text-black">✕</button>
            </div>
            <div className="p-5 flex flex-col gap-4">
              <div className="grid grid-cols-2 gap-3">
                <Field label="Código"><input className={inp} value={form.code} onChange={e => set('code',e.target.value.toUpperCase())} placeholder="RETRO20" /></Field>
                <Field label="Tipo">
                  <select className={inp} value={form.type} onChange={e => set('type',e.target.value)}>
                    <option value="percent">Porcentaje (%)</option>
                    <option value="fixed">Monto fijo ($)</option>
                    <option value="free_shipping">Envío gratis</option>
                  </select>
                </Field>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <Field label="Valor"><input className={inp} type="number" value={form.value} onChange={e => set('value',e.target.value)} /></Field>
                <Field label="Mín. orden ($)"><input className={inp} type="number" value={form.minOrder} onChange={e => set('minOrder',e.target.value)} /></Field>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <Field label="Usos máximos"><input className={inp} type="number" value={form.maxUses} onChange={e => set('maxUses',e.target.value)} /></Field>
                <Field label="Válido hasta"><input className={inp} type="date" value={form.validTo} onChange={e => set('validTo',e.target.value)} /></Field>
              </div>
              <button onClick={save} disabled={saving}
                className="bg-[#0d0d0d] text-white py-2.5 text-[11px] tracking-widest uppercase font-bold disabled:opacity-40 hover:opacity-80 transition-opacity">
                {saving ? 'Guardando...' : 'Crear cupón'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
