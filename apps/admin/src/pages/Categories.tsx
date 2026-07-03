import { useEffect, useState } from 'react'
import { getCategories, createCategory, updateCategory } from '../lib/api'
import { Plus, Eye, EyeOff } from 'lucide-react'

const inp = 'w-full border border-black/12 px-3 py-2 text-sm focus:outline-none focus:border-black'
function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <div><label className="block text-[10px] tracking-widest uppercase text-black/40 mb-1">{label}</label>{children}</div>
}

export default function Categories() {
  const [cats, setCats]     = useState<any[]>([])
  const [modal, setModal]   = useState<any>(null)
  const [form, setForm]     = useState({ slug:'', name:'', description:'', visible:true, order:0 })
  const [saving, setSaving] = useState(false)

  const load = () => getCategories().then(setCats)
  useEffect(() => { load() }, [])

  const openNew  = () => { setForm({ slug:'',name:'',description:'',visible:true,order:0 }); setModal('new') }
  const openEdit = (c: any) => { setForm({ slug:c.slug,name:c.name,description:c.description??'',visible:c.visible,order:c.order }); setModal(c) }
  const set = (k: string, v: any) => setForm(f => ({ ...f, [k]: v }))

  const save = async () => {
    setSaving(true)
    try {
      if (modal === 'new') await createCategory(form)
      else await updateCategory(modal.id, form)
      setModal(null); load()
    } finally { setSaving(false) }
  }

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-5">
        <h2 className="text-xl font-extrabold tracking-tight">Categorías</h2>
        <button onClick={openNew} className="flex items-center gap-2 bg-[#0d0d0d] text-white px-4 py-2 text-[11px] tracking-widest uppercase font-bold hover:opacity-80 transition-opacity">
          <Plus size={14} /> Nueva
        </button>
      </div>

      <div className="bg-white overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-black/8">
              {['Nombre','Slug','Descripción','Orden','Visible','Acciones'].map(h => (
                <th key={h} className="text-left px-4 py-3 text-[11px] tracking-widest uppercase text-black/35 font-semibold">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {cats.map(c => (
              <tr key={c.id} className="border-b border-black/5 hover:bg-[#f5f4ef] transition-colors">
                <td className="px-4 py-3 font-semibold">{c.name}</td>
                <td className="px-4 py-3 font-mono text-xs text-black/45">{c.slug}</td>
                <td className="px-4 py-3 text-black/50 text-xs">{c.description ?? '—'}</td>
                <td className="px-4 py-3 text-black/50">{c.order}</td>
                <td className="px-4 py-3">
                  {c.visible ? <Eye size={15} className="text-green-500" /> : <EyeOff size={15} className="text-black/20" />}
                </td>
                <td className="px-4 py-3">
                  <button onClick={() => openEdit(c)} className="text-[11px] tracking-widest uppercase font-bold text-black/40 hover:text-black transition-colors">Editar</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {modal !== null && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={e => e.target === e.currentTarget && setModal(null)}>
          <div className="bg-white w-full max-w-sm">
            <div className="flex items-center justify-between px-5 py-4 border-b border-black/8">
              <h3 className="font-extrabold">{modal === 'new' ? 'Nueva categoría' : 'Editar categoría'}</h3>
              <button onClick={() => setModal(null)} className="text-black/30 hover:text-black">✕</button>
            </div>
            <div className="p-5 flex flex-col gap-4">
              <div className="grid grid-cols-2 gap-3">
                <Field label="Nombre"><input className={inp} value={form.name} onChange={e => set('name',e.target.value)} /></Field>
                <Field label="Slug"><input className={inp} value={form.slug} onChange={e => set('slug',e.target.value)} /></Field>
              </div>
              <Field label="Descripción"><input className={inp} value={form.description} onChange={e => set('description',e.target.value)} /></Field>
              <Field label="Orden (número)"><input className={inp} type="number" value={form.order} onChange={e => set('order',parseInt(e.target.value)||0)} /></Field>
              <label className="flex items-center gap-2 text-sm cursor-pointer">
                <input type="checkbox" checked={form.visible} onChange={e => set('visible',e.target.checked)} className="w-4 h-4" />
                Visible en tienda
              </label>
              <button onClick={save} disabled={saving}
                className="bg-[#0d0d0d] text-white py-2.5 text-[11px] tracking-widest uppercase font-bold disabled:opacity-40 hover:opacity-80 transition-opacity">
                {saving ? 'Guardando...' : 'Guardar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
