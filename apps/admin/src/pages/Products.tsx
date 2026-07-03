import { useEffect, useState } from 'react'
import { getProducts, deleteProduct, uploadProductImage } from '../lib/api'
import { Plus, Trash2, Upload, Eye, EyeOff } from 'lucide-react'
import ProductModal from '../components/ProductModal'

export default function Products() {
  const [products, setProducts] = useState<any[]>([])
  const [loading, setLoading]   = useState(true)
  const [modal, setModal]       = useState<any>(null) // null | 'new' | product
  const [uploading, setUploading] = useState<string | null>(null)

  const load = () => {
    setLoading(true)
    getProducts().then(d => setProducts(d.data ?? [])).finally(() => setLoading(false))
  }
  useEffect(load, [])

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`¿Eliminar "${name}"?`)) return
    await deleteProduct(id)
    load()
  }

  const handleImageUpload = async (productId: string, file: File) => {
    setUploading(productId)
    await uploadProductImage(productId, file)
    setUploading(null)
    load()
  }

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-5">
        <h2 className="text-xl font-extrabold tracking-tight">Productos</h2>
        <button
          onClick={() => setModal('new')}
          className="flex items-center gap-2 bg-[#0d0d0d] text-white px-4 py-2 text-[11px] tracking-widest uppercase font-bold hover:opacity-80 transition-opacity"
        >
          <Plus size={14} /> Nuevo
        </button>
      </div>

      <div className="bg-white overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-black/8">
              {['Imagen','Nombre','Categoría','Precio','Stock','Visible','Acciones'].map(h => (
                <th key={h} className="text-left px-4 py-3 text-[11px] tracking-widest uppercase text-black/35 font-semibold">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading && (
              <tr><td colSpan={7} className="px-4 py-8 text-center text-black/25">Cargando...</td></tr>
            )}
            {products.map(p => {
              const totalStock = p.variants?.reduce((s: number, v: any) => s + v.stock, 0) ?? 0
              return (
                <tr key={p.id} className="border-b border-black/5 hover:bg-[#f5f4ef] transition-colors">
                  <td className="px-4 py-2">
                    {p.images?.[0]
                      ? <img src={p.images[0].url} alt={p.name} className="w-10 h-12 object-cover bg-[#f5f4ef]" />
                      : <div className="w-10 h-12 bg-[#f5f4ef] flex items-center justify-center">
                          <label className="cursor-pointer">
                            <Upload size={12} className="text-black/30" />
                            <input type="file" accept="image/*" className="hidden"
                              onChange={e => e.target.files?.[0] && handleImageUpload(p.id, e.target.files[0])} />
                          </label>
                        </div>
                    }
                  </td>
                  <td className="px-4 py-2">
                    <p className="font-semibold">{p.name}</p>
                    <p className="text-[11px] text-black/35">{p.slug}</p>
                  </td>
                  <td className="px-4 py-2 text-black/50">{p.category?.name ?? '—'}</td>
                  <td className="px-4 py-2 font-mono">${Number(p.price).toLocaleString('es-MX')}</td>
                  <td className="px-4 py-2">
                    <span className={`text-[11px] font-bold ${totalStock === 0 ? 'text-red-500' : totalStock < 5 ? 'text-yellow-600' : 'text-green-600'}`}>
                      {totalStock}
                    </span>
                  </td>
                  <td className="px-4 py-2">
                    {p.visible ? <Eye size={15} className="text-green-500" /> : <EyeOff size={15} className="text-black/20" />}
                  </td>
                  <td className="px-4 py-2">
                    <div className="flex items-center gap-2">
                      <button onClick={() => setModal(p)} className="text-[11px] tracking-widest uppercase font-bold text-black/40 hover:text-black transition-colors">Editar</button>
                      <button onClick={() => handleDelete(p.id, p.name)} className="text-[#c8382a]/50 hover:text-[#c8382a] transition-colors">
                        <Trash2 size={13} />
                      </button>
                      {uploading === p.id && <span className="text-[10px] text-black/30">Subiendo...</span>}
                    </div>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {modal !== null && (
        <ProductModal
          product={modal === 'new' ? null : modal}
          onClose={() => setModal(null)}
          onSaved={() => { setModal(null); load() }}
        />
      )}
    </div>
  )
}
