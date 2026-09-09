import { useEffect, useRef, useState } from 'react'
import { createProduct, updateProduct, getCategories, getDrops, uploadProductImage, deleteProductImage } from '../lib/api'
import { X, Upload, Trash2, Star } from 'lucide-react'

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
  const [step, setStep]   = useState<'form' | 'images'>('form')
  const [savedProduct, setSavedProduct] = useState<any>(product)
  const [images, setImages] = useState<any[]>(product?.images ?? [])
  const [uploadingImg, setUploadingImg] = useState(false)
  const [imgAlt, setImgAlt] = useState('')
  const [imgPrimary, setImgPrimary] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)

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
      let result: any
      if (savedProduct) {
        result = await updateProduct(savedProduct.id, payload)
      } else {
        result = await createProduct(payload)
      }
      setSavedProduct(result)
      setImages(result.images ?? [])
      setStep('images')
    } catch (e: any) {
      setErr(e.message)
    } finally {
      setSaving(false)
    }
  }

  const handleFileUpload = async (file: File) => {
    if (!savedProduct?.id) return
    setUploadingImg(true)
    try {
      const newImg = await uploadProductImage(
        savedProduct.id, file, imgAlt, imgPrimary, images.length
      )
      setImages(prev => [...prev, newImg])
      setImgAlt('')
      setImgPrimary(false)
      if (fileRef.current) fileRef.current.value = ''
    } finally {
      setUploadingImg(false)
    }
  }

  const handleDeleteImage = async (imageId: string) => {
    if (!savedProduct?.id) return
    await deleteProductImage(savedProduct.id, imageId)
    setImages(prev => prev.filter((img: any) => img.id !== imageId))
  }

  if (step === 'images') {
    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={e => e.target === e.currentTarget && onClose()}>
        <div className="bg-white w-full max-w-2xl max-h-[90vh] overflow-y-auto">
          <div className="flex items-center justify-between px-5 py-4 border-b border-black/8 sticky top-0 bg-white z-10">
            <div>
              <h3 className="font-extrabold tracking-tight">Imágenes del producto</h3>
              <p className="text-[11px] text-black/40 mt-0.5">{savedProduct?.name}</p>
            </div>
            <div className="flex items-center gap-3">
              <button onClick={() => setStep('form')} className="text-[11px] tracking-widest uppercase text-black/40 hover:text-black">← Info</button>
              <button onClick={() => { onSaved() }} className="bg-[#0d0d0d] text-white px-4 py-1.5 text-[11px] tracking-widest uppercase font-bold hover:opacity-80">Finalizar</button>
              <button onClick={onClose}><X size={18} /></button>
            </div>
          </div>

          <div className="p-5 flex flex-col gap-5">
            {/* Upload new image */}
            <div className="border border-dashed border-black/20 p-4 flex flex-col gap-3">
              <p className="text-[11px] tracking-widest uppercase text-black/40 font-semibold">Subir nueva imagen</p>

              <div className="grid grid-cols-2 gap-3">
                <Field label="Color / etiqueta (alt)">
                  <input className={inp} value={imgAlt} onChange={e => setImgAlt(e.target.value)}
                    placeholder="ej: Negro, Blanco, Gris" />
                </Field>
                <Field label="Opciones">
                  <label className="flex items-center gap-2 text-sm cursor-pointer mt-2">
                    <input type="checkbox" checked={imgPrimary} onChange={e => setImgPrimary(e.target.checked)} className="w-4 h-4" />
                    Imagen principal
                  </label>
                </Field>
              </div>

              <label className={`flex items-center justify-center gap-2 border border-black/15 py-3 cursor-pointer transition-colors ${uploadingImg ? 'opacity-40 pointer-events-none' : 'hover:border-black/40'}`}>
                <Upload size={15} className="text-black/40" />
                <span className="text-[11px] tracking-widest uppercase text-black/40">
                  {uploadingImg ? 'Subiendo...' : 'Seleccionar imagen'}
                </span>
                <input ref={fileRef} type="file" accept="image/*" className="hidden"
                  onChange={e => e.target.files?.[0] && handleFileUpload(e.target.files[0])} />
              </label>
            </div>

            {/* Hint about color mapping */}
            <div className="bg-[#f5f4ef] p-3 text-[11px] text-black/50 leading-relaxed">
              <strong className="text-black/70">Cómo funcionan los colores:</strong> El campo "Color / etiqueta" debe coincidir exactamente con los colores del producto (ej: "Negro"). Cuando el cliente seleccione ese color, la tienda mostrará automáticamente las imágenes con esa etiqueta.
            </div>

            {/* Current images */}
            {images.length > 0 && (
              <div>
                <p className="text-[11px] tracking-widest uppercase text-black/40 font-semibold mb-3">Imágenes actuales ({images.length})</p>
                <div className="grid grid-cols-3 gap-3">
                  {images.map((img: any) => (
                    <div key={img.id} className="relative group border border-black/8">
                      <img src={img.url} alt={img.alt || img.id} className="w-full aspect-[3/4] object-cover" />
                      {img.isPrimary && (
                        <div className="absolute top-1 left-1 bg-[#0d0d0d] text-white px-1.5 py-0.5 flex items-center gap-1">
                          <Star size={9} fill="currentColor" />
                          <span className="text-[9px] tracking-widest uppercase">Principal</span>
                        </div>
                      )}
                      {img.alt && (
                        <div className="absolute bottom-0 left-0 right-0 bg-black/60 text-white text-[10px] text-center py-0.5 truncate px-1">
                          {img.alt}
                        </div>
                      )}
                      <button
                        onClick={() => handleDeleteImage(img.id)}
                        className="absolute top-1 right-1 bg-[#c8382a] text-white p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                        title="Eliminar imagen"
                      >
                        <Trash2 size={11} />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {images.length === 0 && !uploadingImg && (
              <p className="text-center text-[12px] text-black/30 py-4">Sin imágenes aún. Sube la primera.</p>
            )}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="bg-white w-full max-w-xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between px-5 py-4 border-b border-black/8 sticky top-0 bg-white">
          <h3 className="font-extrabold tracking-tight">{savedProduct ? 'Editar producto' : 'Nuevo producto'}</h3>
          <div className="flex items-center gap-3">
            {savedProduct && (
              <button onClick={() => setStep('images')} className="text-[11px] tracking-widest uppercase text-black/40 hover:text-black flex items-center gap-1">
                <Upload size={12} /> Imágenes {images.length > 0 ? `(${images.length})` : ''}
              </button>
            )}
            <button onClick={onClose}><X size={18} /></button>
          </div>
        </div>
        <div className="p-5 flex flex-col gap-4">
          <Field label="Nombre">
            <input className={inp} value={form.name} onChange={e => {
              set('name', e.target.value)
              if (!savedProduct) set('slug', autoSlug(e.target.value))
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
            {saving ? 'Guardando...' : savedProduct ? 'Guardar cambios' : 'Crear y agregar imágenes →'}
          </button>
          {!savedProduct && (
            <p className="text-[10px] text-black/30 text-center -mt-2">Después de crear, podrás subir las imágenes del producto</p>
          )}
        </div>
      </div>
    </div>
  )
}
