import type { Context, Next } from 'hono'
import { auth } from '../lib/auth.ts'

export async function requireAuth(c: Context, next: Next) {
  const session = await auth.api.getSession({ headers: c.req.raw.headers })
  if (!session) return c.json({ error: 'Unauthorized' }, 401)
  c.set('user', session.user)
  c.set('session', session.session)
  await next()
}

export async function requireAdmin(c: Context, next: Next) {
  const session = await auth.api.getSession({ headers: c.req.raw.headers })
  if (!session) return c.json({ error: 'Unauthorized' }, 401)
  if (session.user.role !== 'admin') return c.json({ error: 'Forbidden' }, 403)
  c.set('user', session.user)
  await next()
}
