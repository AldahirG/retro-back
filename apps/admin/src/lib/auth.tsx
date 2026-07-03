import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import { me } from './api'

interface User { id: string; name: string; email: string; role: string }
interface AuthCtx { user: User | null; loading: boolean; refetch: () => Promise<void> }

const Ctx = createContext<AuthCtx>({ user: null, loading: true, refetch: async () => {} })

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser]     = useState<User | null>(null)
  const [loading, setLoading] = useState(true)

  const refetch = async () => {
    setLoading(true)
    try {
      const s = await me()
      setUser((s as any)?.user ?? null)
    } catch {
      setUser(null)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { refetch() }, [])
  return <Ctx.Provider value={{ user, loading, refetch }}>{children}</Ctx.Provider>
}

export const useAuth = () => useContext(Ctx)
