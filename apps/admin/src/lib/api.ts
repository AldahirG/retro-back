const BASE = import.meta.env.VITE_API_URL ?? 'http://localhost:3000'

async function req<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    credentials: 'include',
    headers: { 'Content-Type': 'application/json', ...init?.headers },
    ...init,
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }))
    throw new Error(err.error ?? res.statusText)
  }
  return res.json()
}

// ── Auth ─────────────────────────────────────────────────────────────────────
export const login  = (email: string, password: string) =>
  req('/api/auth/sign-in/email', { method: 'POST', body: JSON.stringify({ email, password }) })
export const logout = () =>
  fetch(`${BASE}/api/auth/sign-out`, { method: 'POST', credentials: 'include' }).then(() => {})
export const me = () =>
  req<{ user: { id: string; name: string; email: string; role: string } }>('/api/auth/get-session')

// ── Dashboard ────────────────────────────────────────────────────────────────
export const getDashboard = () => req<any>('/api/v1/admin/dashboard')

// ── Products ─────────────────────────────────────────────────────────────────
export const getProducts = (params = '') => req<any>(`/api/v1/products?limit=100${params}`)
export const getProduct  = (slug: string) => req<any>(`/api/v1/products/${slug}`)
export const createProduct = (data: any) =>
  req('/api/v1/products', { method: 'POST', body: JSON.stringify(data) })
export const updateProduct = (id: string, data: any) =>
  req(`/api/v1/products/${id}`, { method: 'PATCH', body: JSON.stringify(data) })
export const deleteProduct = (id: string) =>
  req(`/api/v1/products/${id}`, { method: 'DELETE' })
export const uploadProductImage = (productId: string, file: File) => {
  const fd = new FormData()
  fd.append('image', file)
  return fetch(`${BASE}/api/v1/products/${productId}/images`, {
    method: 'POST', credentials: 'include', body: fd,
  }).then(r => r.json())
}
export const deleteProductImage = (productId: string, imageId: string) =>
  req(`/api/v1/products/${productId}/images/${imageId}`, { method: 'DELETE' })

// ── Orders ───────────────────────────────────────────────────────────────────
export const getOrders = (params = '') => req<any>(`/api/v1/orders?limit=50${params}`)
export const updateOrderStatus = (id: string, status: string, note?: string) =>
  req(`/api/v1/orders/${id}/status`, { method: 'PATCH', body: JSON.stringify({ status, note }) })

// ── Admin: Drops ─────────────────────────────────────────────────────────────
export const getDrops  = () => req<any[]>('/api/v1/drops')
export const createDrop = (data: any) =>
  req('/api/v1/admin/drops', { method: 'POST', body: JSON.stringify(data) })
export const updateDrop = (id: string, data: any) =>
  req(`/api/v1/admin/drops/${id}`, { method: 'PATCH', body: JSON.stringify(data) })
export const deleteDrop = (id: string) =>
  req(`/api/v1/admin/drops/${id}`, { method: 'DELETE' })

// ── Admin: Categories ─────────────────────────────────────────────────────────
export const getCategories  = () => req<any[]>('/api/v1/categories')
export const createCategory = (data: any) =>
  req('/api/v1/admin/categories', { method: 'POST', body: JSON.stringify(data) })
export const updateCategory = (id: string, data: any) =>
  req(`/api/v1/admin/categories/${id}`, { method: 'PATCH', body: JSON.stringify(data) })

// ── Admin: Discounts ──────────────────────────────────────────────────────────
export const getDiscounts  = () => req<any[]>('/api/v1/admin/discounts')
export const createDiscount = (data: any) =>
  req('/api/v1/admin/discounts', { method: 'POST', body: JSON.stringify(data) })
export const toggleDiscount = (id: string, active: boolean) =>
  req(`/api/v1/admin/discounts/${id}`, { method: 'PATCH', body: JSON.stringify({ active }) })
export const deleteDiscount = (id: string) =>
  req(`/api/v1/admin/discounts/${id}`, { method: 'DELETE' })
