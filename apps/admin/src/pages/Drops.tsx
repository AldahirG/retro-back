import { useEffect, useState } from 'react'
import { getDrops, createDrop, updateDrop, deleteDrop } from '../lib/api'
import { Plus, Trash2, Eye, EyeOff } from 'lucide-react'

const inp = 'w-full border border-black/12 px-3 py-2 text-sm focus:outline-none focus:border-black'
function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <div><label className="block text-[10px] tracking-widest uppercase text-black/40 mb-1">{label}</label>{children}</div>
}

export default function Drops() {
  const [drops, setDrops]   = useState<any[]>([])
  const [modal, setModal]   = useState<any>(null)
  const [form, setForm]     = useState({ slug: '', name: '', subtitle: '', heroImageUrl: '', accentColor: '#e63946', endDate: '', active: true })
  const [saving, setSaving] = useState(false)

  const load = () => getDrops().then(setDrops)
  useEffect(() => { load() }, [])

  const openNew = () => { setForm({ slug:'',name:'',subtitle:'',heroImageUrl:'',accentColor:'#e63946',endDate:'',active:true }); setModal('new') }
  const openEdit = (d: any) => { setForm({ slug:d.slug,name:d.name,subtitle:d.subtitle??'',heroImageUrl:d.heroImageUrl??'',accentColor:d.accentColor,endDate:d.endDate?.slice(0,10)??'',active:d.active }); setModal(d) }
  const set = (k: string, v: any) => setForm(f => ({ ...f, [k]: v }))

  const save = async () => {
    setSaving(true)
    try {
      const payload = { ...form, endDate: form.endDate ? new Date(form.endDate).toISOString() : undefined }
      if (modal === 'new') await createDrop(payload)
      else await updateDrop(modal.id, payload)
      setModal(null); load()
    } finally { setSaving(false) }
  }

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-5">
        <h2 className="text-xl font-extrabold tracking-tight">Drops</h2>
        <button onClick={openNew} className="flex items-center gap-2 bg-[#0d0d0d] text-white px-4 py-2 text-[11px] tracking-widest uppercase font-bold hover:opacity-80 transition-opacity">
          <Plus size={14} /> Nuevo
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
        {drops.map(d => (
          <div key={d.id} className="bg-white p-4 flex gap-3" style={{ borderLeft: `3px solid ${d.accentColor}` }}>
            <div className="flex-1 min-w-0">
              <p className="font-bold truncate">{d.name}</p>
              <p className="text-[11px] text-black/40 font-mono">{d.slug}</p>
              <p className="text-xs text-black/50 mt-1 truncate">{d.subtitle}</p>
              <div className="flex items-center gap-2 mt-2">
                <span className={`text-[10px] tracking-widest uppercase font-bold px-2 py-0.5 ${d.active ? 'bg-green-100 text-green-700' : 'bg-black/5 text-black/30'}`}>
                  {d.active ? 'Activo' : 'Inactivo'}
                </span>
              </div>
            </div>
            <div className="flex flex-col gap-2 shrink-0">
              <button onClick={() => openEdit(d)} className="text-[11px] tracking-widest uppercase font-bold text-black/40 hover:text-black transition-colors">Editar</button>
              <button
                onClick={() => updateDrop(d.id, { active: !d.active }).then(load)}
                title={d.active ? 'Pasar a borrador' : 'Publicar'}
                className={`transition-colors ${d.active ? 'text-green-500 hover:text-black/40' : 'text-black/20 hover:text-green-500'}`}
              >
                {d.active ? <Eye size={15} /> : <EyeOff size={15} />}
              </button>
              <button onClick={() => { if (confirm(`¿Eliminar "${d.name}"?`)) deleteDrop(d.id).then(load) }}
                className="text-[#c8382a]/40 hover:text-[#c8382a] transition-colors"><Trash2 size={13} /></button>
            </div>
          </div>
        ))}
      </div>

      {modal !== null && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={e => e.target === e.currentTarget && setModal(null)}>
          <div className="bg-white w-full max-w-md">
            <div className="flex items-center justify-between px-5 py-4 border-b border-black/8">
              <h3 className="font-extrabold tracking-tight">{modal === 'new' ? 'Nuevo drop' : 'Editar drop'}</h3>
              <button onClick={() => setModal(null)} className="text-black/30 hover:text-black">✕</button>
            </div>
            <div className="p-5 flex flex-col gap-4">
              <div className="grid grid-cols-2 gap-3">
                <Field label="Nombre"><input className={inp} value={form.name} onChange={e => set('name',e.target.value)} /></Field>
                <Field label="Slug"><input className={inp} value={form.slug} onChange={e => set('slug',e.target.value)} /></Field>
              </div>
              <Field label="Subtítulo"><input className={inp} value={form.subtitle} onChange={e => set('subtitle',e.target.value)} /></Field>
              <Field label="URL imagen hero"><input className={inp} value={form.heroImageUrl} onChange={e => set('heroImageUrl',e.target.value)} /></Field>
              <div className="grid grid-cols-2 gap-3">
                <Field label="Color acento"><input className={inp} type="color" value={form.accentColor} onChange={e => set('accentColor',e.target.value)} style={{height:38}} /></Field>
                <Field label="Fecha fin"><input className={inp} type="date" value={form.endDate} onChange={e => set('endDate',e.target.value)} /></Field>
              </div>
              <label className="flex items-center gap-2 text-sm cursor-pointer">
                <input type="checkbox" checked={form.active} onChange={e => set('active',e.target.checked)} className="w-4 h-4" />
                Activo
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
