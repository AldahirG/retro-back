import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { login } from '../lib/api'
import { useAuth } from '../lib/auth'

export default function Login() {
  const [email, setEmail]     = useState('')
  const [password, setPassword] = useState('')
  const [error, setError]     = useState('')
  const [loading, setLoading] = useState(false)
  const navigate = useNavigate()
  const { refetch } = useAuth()

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      await login(email, password)
      await refetch()
      navigate('/')
    } catch (err: any) {
      setError(err.message ?? 'Credenciales incorrectas')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-[#0d0d0d] flex items-center justify-center p-4">
      <div className="bg-white w-full max-w-sm p-8">
        <p className="font-bold text-[11px] tracking-widest uppercase text-black/30 mb-1">Retro Reeves</p>
        <h1 className="text-2xl font-extrabold tracking-tight mb-6">Admin Panel</h1>
        <form onSubmit={submit} className="flex flex-col gap-4">
          <div>
            <label className="block text-[11px] tracking-widest uppercase text-black/40 mb-1">Email</label>
            <input
              type="email" required value={email} onChange={e => setEmail(e.target.value)}
              className="w-full border border-black/15 px-3 py-2 text-sm focus:outline-none focus:border-black"
            />
          </div>
          <div>
            <label className="block text-[11px] tracking-widest uppercase text-black/40 mb-1">Contraseña</label>
            <input
              type="password" required value={password} onChange={e => setPassword(e.target.value)}
              className="w-full border border-black/15 px-3 py-2 text-sm focus:outline-none focus:border-black"
            />
          </div>
          {error && <p className="text-[#c8382a] text-xs">{error}</p>}
          <button
            type="submit" disabled={loading}
            className="bg-[#0d0d0d] text-white py-2.5 text-[12px] tracking-widest uppercase font-bold disabled:opacity-40 hover:opacity-80 transition-opacity"
          >
            {loading ? 'Entrando...' : 'Entrar'}
          </button>
        </form>
      </div>
    </div>
  )
}
