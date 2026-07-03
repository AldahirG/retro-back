import { useEffect, useState } from 'react'
import { createProduct, updateProduct, getCategories, getDrops } from '../lib/api'
import { X } from 'lucide-react'

const SIZES = ['CH', 'M', 'G', 'XG', 'XXG', 'Única']
const inp = 'w-full border border-black/12 px-3 py-2 text-sm focus:outline-none focus:border-black'
function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <div><label className="block text-[10px] tracking-widest uppercase text-black/40 mb-1">{label}</label>{children}</div>
}

interface Props {
  product: any | null
  onClose: () => void
  onSaved: () => void
}

export default function ProductModal({ product, onClose, onSaved }: Props) {
  const [cats, setCats]   = useState<any[]>([])
  const [drops, setDrops] = useState<any[]>([])
  const [saving, setSaving] = useState(false)
  const [err, setErr]     = useState('')

  const [form, setForm] = useState({
    name:        product?.name        ?? '',
    slug:        product?.slug        ?? '',
    description: product?.description ?? '',
    price:       product?.price       ?? '',
    categoryId:  product?.categoryId  ?? '',
    dropId:      product?.dropId      ?? '',
    limited:     product?.limited     ?? false,
    bestseller:  product?.bestseller  ?? false,
    visible:     product?.visible     ?? true,
    sizes:       (product?.variants?.map((v: any) => v.size).filter((v: string, i: number, a: string[]) => a.indexOf(v) === i)) ?? [],
    colors:      Array.from(new Set((product?.variants ?? []).map((v: any) => v.color).filter(Boolean))).join(', '),
  })

  useEffect(() => {
    getCategories().then(setCats)
    getDrops().then(setDrops)
  }, [])

  const set = (k: string, v: any) => setForm(f => ({ ...f, [k]: v }))
  const toggleSize = (s: string) =>
    set('sizes', form.sizes.includes(s) ? form.sizes.filter((x: string) => x !== s) : [...form.sizes, s])

  const autoSlug = (name: string) =>
    name.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')

  const save = async () => {
    if (!form.name || !form.price) { setErr('Nombre y precio requeridos'); return }
    setSaving(true); setErr('')
    try {
      const payload = {
        ...form,
        price: String(form.price),
        slug: form.slug || autoSlug(form.name),
        categoryId: form.categoryId || undefined,
        dropId: form.dropId || undefined,
      }
      if (product) await updateProduct(product.id, payload)
      else await createProduct(payload)
      onSaved()
    } catch (e: any) {
      setErr(e.message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="bg-white w-full max-w-xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between px-5 py-4 border-b border-black/8 sticky top-0 bg-white">
          <h3 className="font-extrabold tracking-tight">{product ? 'Editar producto' : 'Nuevo producto'}</h3>
          <button onClick={onClose}><X size={18} /></button>
        </div>
        <div className="p-5 flex flex-col gap-4">
          <Field label="Nombre">
            <input className={inp} value={form.name} onChange={e => {
              set('name', e.target.value)
              if (!product) set('slug', autoSlug(e.target.value))
            }} />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Slug (URL)">
              <input className={inp} value={form.slug} onChange={e => set('slug', e.target.value)} />
            </Field>
            <Field label="Precio (MXN)">
              <input className={inp} type="number" value={form.price} onChange={e => set('price', e.target.value)} />
            </Field>
          </div>
          <Field label="Descripción">
            <textarea className={inp} rows={3} value={form.description} onChange={e => set('description', e.target.value)} />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Categoría">
              <select className={inp} value={form.categoryId} onChange={e => set('categoryId', e.target.value)}>
                <option value="">Sin categoría</option>
                {cats.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </Field>
            <Field label="Drop">
              <select className={inp} value={form.dropId} onChange={e => set('dropId', e.target.value)}>
                <option value="">Sin drop</option>
                {drops.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
              </select>
            </Field>
          </div>
          <Field label="Tallas disponibles">
            <div className="flex flex-wrap gap-2 mt-1">
              {SIZES.map(s => (
                <button key={s} type="button" onClick={() => toggleSize(s)}
                  className={`px-3 py-1 text-[11px] tracking-widest uppercase font-bold border transition-colors ${
                    form.sizes.includes(s) ? 'bg-[#0d0d0d] text-white border-[#0d0d0d]' : 'border-black/15 text-black/40 hover:border-black/40'
                  }`}>{s}</button>
              ))}
            </div>
          </Field>
          <Field label="Colores (separados por coma)">
            <input className={inp} value={form.colors} onChange={e => set('colors', e.target.value)} placeholder="Negro, Blanco, Gris" />
          </Field>
          <div className="flex gap-6">
            {[['limited','Edición limitada'],['bestseller','Bestseller'],['visible','Visible en tienda']].map(([k, label]) => (
              <label key={k} className="flex items-center gap-2 text-sm cursor-pointer">
                <input type="checkbox" checked={form[k as keyof typeof form] as boolean}
                  onChange={e => set(k, e.target.checked)} className="w-4 h-4" />
                {label}
              </label>
            ))}
          </div>
          {err && <p className="text-[#c8382a] text-xs">{err}</p>}
          <button onClick={save} disabled={saving}
            className="bg-[#0d0d0d] text-white py-2.5 text-[11px] tracking-widest uppercase font-bold disabled:opacity-40 hover:opacity-80 transition-opacity">
            {saving ? 'Guardando...' : product ? 'Guardar cambios' : 'Crear producto'}
          </button>
        </div>
      </div>
    </div>
  )
}
